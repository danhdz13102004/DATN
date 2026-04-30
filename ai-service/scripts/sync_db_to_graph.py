#!/usr/bin/env python3
"""sync_db_to_graph.py — Replay real PostgreSQL data into the AI service graph.

Reads PUBLISHED jobs, active resumes (with resume_data_structure), job_interactions,
and applications from the database, then POSTs them to the AI service HTTP API.

Safe to re-run — the AI service accumulates edge weights idempotently and the
graph store uses HINCRBYFLOAT in Redis, so repeated runs only strengthen signals.

Phases (run all by default, or select with --phase):
    jobs          → POST /api/v1/add_node  (node_type="job")
    resumes       → POST /api/v1/add_node  (node_type="resume")
    interactions  → POST /api/v1/interact  (from job_interactions table,
                                            joined to primary resume)
    applications  → POST /api/v1/interact  action_type="apply"
                                            (from applications table)

Usage:
    python sync_db_to_graph.py
    python sync_db_to_graph.py --phase jobs resumes
    python sync_db_to_graph.py --db-url postgresql://user:pass@localhost:5432/recruitpro \\
                               --ai-url http://localhost:8000 --delay 0.05

Environment vars (used when --db-url is not given):
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
"""

import argparse
import json
import logging
import os
import time
from typing import Optional

import psycopg2
import psycopg2.extras
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

INTERACTION_EVENT_MAP = {
    "click":  "click",
    "save":   "save",
    "apply":  "apply",
}

ALL_PHASES = ["jobs", "resumes", "interactions", "applications"]


# ── SQL ───────────────────────────────────────────────────────────────────────

SQL_JOBS = """
SELECT
    j.id::text                                AS job_id,
    j.title,
    COALESCE(i.name, '')                      AS industry,
    COALESCE(j.responsibilities, ARRAY[]::text[]) AS responsibilities,
    COALESCE(j.requirements,     ARRAY[]::text[]) AS requirements,
    COALESCE(j.nice_to_have_skills, ARRAY[]::text[]) AS nice_to_have,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name ORDER BY s.name), NULL) AS must_skills,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT el.level::text), NULL)         AS levels
FROM jobs j
LEFT JOIN industries   i  ON i.id   = j.industry_id
LEFT JOIN job_skills   js ON js.job_id = j.id
LEFT JOIN skills       s  ON s.id   = js.skill_id
LEFT JOIN job_experience_levels el ON el.job_id = j.id
WHERE j.deleted_at IS NULL
  AND j.status = 'PUBLISHED'
GROUP BY j.id, j.title, i.name, j.responsibilities, j.requirements, j.nice_to_have_skills
ORDER BY j.created_at ASC
"""

SQL_RESUMES = """
SELECT
    r.id::text                        AS resume_id,
    r.resume_data_structure           AS rds
FROM resumes r
WHERE r.deleted_at IS NULL
  AND r.resume_data_structure IS NOT NULL
ORDER BY r.created_at ASC
"""

# Join job_interactions → primary resume (is_primary = true) so we can
# send resume_id to the AI service.  Falls back to most-recently created
# resume if no primary exists.
SQL_INTERACTIONS = """
SELECT
    ji.job_id::text   AS job_id,
    r.id::text        AS resume_id,
    ji.event_type::text AS event_type
FROM job_interactions ji
JOIN LATERAL (
    SELECT id
    FROM   resumes
    WHERE  job_seeker_id = ji.job_seeker_id
      AND  deleted_at IS NULL
    ORDER  BY is_primary DESC, created_at DESC
    LIMIT  1
) r ON true
WHERE ji.job_seeker_id IS NOT NULL
ORDER BY ji.created_at ASC
"""

SQL_APPLICATIONS = """
SELECT
    a.resume_id::text AS resume_id,
    a.job_id::text    AS job_id
FROM applications a
WHERE a.deleted_at IS NULL
  AND a.status != 'WITHDRAWN'
  AND a.resume_id IS NOT NULL
ORDER BY a.created_at ASC
"""


# ── Text builders ─────────────────────────────────────────────────────────────

def build_job_text(row: dict) -> str:
    must_skills = row.get("must_skills") or []
    levels      = row.get("levels")      or []
    resp        = row.get("responsibilities") or []
    return (
        f"Title: {row['title']} | "
        f"Industry: {row['industry']} | "
        f"Skills: {', '.join(must_skills)} | "
        f"Seniority: {', '.join(levels)} | "
        f"Responsibilities: {'. '.join(resp[:3])}"
    )


def build_resume_text(rds: dict) -> str:
    skills  = rds.get("skills")            or []
    bullets = rds.get("experienceBullets") or []
    if isinstance(skills, list):
        skills_str = ", ".join(skills)
    else:
        skills_str = str(skills)
    return (
        f"Role: {rds.get('role', '')} | "
        f"Industry: {rds.get('industry', '')} | "
        f"Seniority: {rds.get('seniority', '')} | "
        f"Skills: {skills_str} | "
        f"Summary: {rds.get('summary', '')} | "
        f"Experience: {'. '.join(str(b) for b in bullets[:2])}"
    )


# ── Phase runners ─────────────────────────────────────────────────────────────

def run_jobs(cur, session: requests.Session, base: str, delay: float, stats: dict) -> None:
    cur.execute(SQL_JOBS)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    logger.info("Syncing %d published jobs...", len(rows))

    for row in rows:
        r = dict(zip(cols, row))
        text = build_job_text(r)
        try:
            resp = session.post(
                f"{base}/api/v1/add_node",
                json={"node_id": r["job_id"], "text": text, "node_type": "job"},
                timeout=30,
            )
            resp.raise_for_status()
            stats["nodes"] += 1
        except Exception as exc:
            logger.warning("add_node job %s: %s", r["job_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)


def run_resumes(cur, session: requests.Session, base: str, delay: float, stats: dict) -> None:
    cur.execute(SQL_RESUMES)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    logger.info("Syncing %d resumes...", len(rows))

    for row in rows:
        r   = dict(zip(cols, row))
        rds = r["rds"]
        if isinstance(rds, str):
            try:
                rds = json.loads(rds)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in resume_data_structure for %s", r["resume_id"])
                stats["errors"] += 1
                continue

        text = build_resume_text(rds)
        try:
            resp = session.post(
                f"{base}/api/v1/add_node",
                json={"node_id": r["resume_id"], "text": text, "node_type": "resume"},
                timeout=30,
            )
            resp.raise_for_status()
            stats["nodes"] += 1
        except Exception as exc:
            logger.warning("add_node resume %s: %s", r["resume_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)


def run_interactions(cur, session: requests.Session, base: str, delay: float, stats: dict) -> None:
    cur.execute(SQL_INTERACTIONS)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    logger.info("Replaying %d job_interactions...", len(rows))

    for row in rows:
        r           = dict(zip(cols, row))
        action_type = INTERACTION_EVENT_MAP.get(r["event_type"])
        if not action_type:
            logger.debug("Unknown event_type '%s', skipping", r["event_type"])
            continue
        try:
            resp = session.post(
                f"{base}/api/v1/interact",
                json={
                    "resume_id":   r["resume_id"],
                    "job_id":      r["job_id"],
                    "action_type": action_type,
                },
                timeout=30,
            )
            resp.raise_for_status()
            stats["interactions"] += 1
        except Exception as exc:
            logger.warning("interact %s→%s: %s", r["resume_id"], r["job_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)


def run_applications(cur, session: requests.Session, base: str, delay: float, stats: dict) -> None:
    cur.execute(SQL_APPLICATIONS)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    logger.info("Replaying %d applications as 'apply' interactions...", len(rows))

    for row in rows:
        r = dict(zip(cols, row))
        try:
            resp = session.post(
                f"{base}/api/v1/interact",
                json={
                    "resume_id":   r["resume_id"],
                    "job_id":      r["job_id"],
                    "action_type": "apply",
                },
                timeout=30,
            )
            resp.raise_for_status()
            stats["interactions"] += 1
        except Exception as exc:
            logger.warning("apply interact %s→%s: %s", r["resume_id"], r["job_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)


# ── DB connection ─────────────────────────────────────────────────────────────

def get_conn(db_url: Optional[str] = None):
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host     = os.getenv("POSTGRES_HOST",     "localhost"),
        port     = int(os.getenv("POSTGRES_PORT", "5432")),
        dbname   = os.getenv("POSTGRES_DB",       "recruitpro"),
        user     = os.getenv("POSTGRES_USER",     "recruitpro"),
        password = os.getenv("POSTGRES_PASSWORD", "changeme"),
    )


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sync real PostgreSQL data into the AI service graph (idempotent)."
    )
    parser.add_argument("--db-url",  default=None,
                        help="PostgreSQL DSN (overrides POSTGRES_* env vars)")
    parser.add_argument("--ai-url",  default="http://localhost:8000",
                        help="AI service base URL (default: http://localhost:8000)")
    parser.add_argument("--delay",   type=float, default=0.05,
                        help="Delay in seconds between AI HTTP calls (default: 0.05)")
    parser.add_argument("--phase",   nargs="+", choices=ALL_PHASES, default=ALL_PHASES,
                        help=f"Phases to run (default: all). Choices: {ALL_PHASES}")
    args = parser.parse_args()

    base    = args.ai_url.rstrip("/")
    session = requests.Session()
    stats   = {"nodes": 0, "interactions": 0, "errors": 0}

    conn = get_conn(args.db_url)
    cur  = conn.cursor()

    try:
        if "jobs" in args.phase:
            run_jobs(cur, session, base, args.delay, stats)

        if "resumes" in args.phase:
            run_resumes(cur, session, base, args.delay, stats)

        if "interactions" in args.phase:
            run_interactions(cur, session, base, args.delay, stats)

        if "applications" in args.phase:
            run_applications(cur, session, base, args.delay, stats)

    finally:
        cur.close()
        conn.close()

    logger.info(
        "Sync complete — nodes=%d  interactions=%d  errors=%d",
        stats["nodes"], stats["interactions"], stats["errors"],
    )


if __name__ == "__main__":
    main()
