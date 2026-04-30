#!/usr/bin/env python3
"""seed_graph.py — Insert synthetic data into PostgreSQL, then sync graph to AI service.

Phase 1 (DB):  Insert 5 companies, 105+ jobs, 105+ job seekers, resumes,
               job_interactions, and applications into PostgreSQL.
Phase 2 (AI):  POST every job/resume as add_node, then POST every
               interaction as /interact to build the graph state.

Usage:
    # Run both phases (default)
    python seed_graph.py

    # Only insert into DB (skip AI sync)
    python seed_graph.py --skip-sync

    # Custom endpoints
    python seed_graph.py --db-url postgresql://user:pass@localhost:5432/recruitpro \\
                         --ai-url http://localhost:8000 --delay 0.05

Environment vars (used when --db-url is not given):
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
"""

import argparse
import json
import logging
import os
import random
import time
import uuid
from datetime import timezone, datetime

import psycopg2
import psycopg2.extras
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SEED = 42
random.seed(SEED)

# ── Bcrypt placeholder (pre-hashed "Password1!" — safe for dev/test) ──────────
_BCRYPT_PLACEHOLDER = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y"

SENIORITY_ORDER = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEADER"]

# ── Industry / skill / job-title / role pools ─────────────────────────────────
INDUSTRIES: dict = {
    "Technology & IT": {
        "skills": [
            "Python", "Java", "JavaScript", "React", "Node.js", "Docker",
            "Kubernetes", "AWS", "PostgreSQL", "Redis", "Spring Boot",
            "TypeScript", "Go", "GraphQL", "Microservices",
        ],
        "job_titles": [
            ("Backend Engineer",          ["JUNIOR", "MIDDLE", "SENIOR"]),
            ("Frontend Engineer",          ["JUNIOR", "MIDDLE"]),
            ("Full Stack Developer",       ["MIDDLE", "SENIOR"]),
            ("DevOps Engineer",            ["MIDDLE", "SENIOR"]),
            ("Data Engineer",              ["JUNIOR", "MIDDLE", "SENIOR"]),
            ("Cloud Architect",            ["SENIOR", "LEADER"]),
            ("Software Engineer Intern",   ["INTERN", "FRESHER"]),
            ("Platform Engineer",          ["MIDDLE", "SENIOR"]),
            ("QA Engineer",                ["JUNIOR", "MIDDLE"]),
            ("Security Engineer",          ["MIDDLE", "SENIOR"]),
            ("Mobile Developer",           ["JUNIOR", "MIDDLE"]),
        ],
        "roles": [
            "Backend Developer", "Frontend Developer", "Full Stack Developer",
            "DevOps Engineer", "Data Engineer", "Software Engineer",
        ],
        "responsibilities": [
            "Design and develop scalable microservices",
            "Write clean, maintainable code with unit tests",
            "Collaborate with cross-functional teams on product features",
            "Optimize database queries and caching strategies",
            "Participate in code reviews and architecture discussions",
            "Maintain and improve CI/CD pipelines",
            "Monitor production systems and resolve incidents",
            "Document APIs and system architecture",
        ],
        "requirements": [
            "Bachelor's degree in Computer Science or equivalent",
            "Strong proficiency in at least one backend language",
            "Experience with RESTful API design",
            "Familiarity with containerization technologies",
            "Analytical and problem-solving mindset",
        ],
    },
    "Finance & Banking": {
        "skills": [
            "Excel", "Python", "SQL", "Risk Management", "Bloomberg",
            "SAP", "Power BI", "Financial Modeling", "VBA", "Tableau",
            "R", "MATLAB", "Portfolio Management", "Compliance", "Quantitative Analysis",
        ],
        "job_titles": [
            ("Financial Analyst",          ["JUNIOR", "MIDDLE", "SENIOR"]),
            ("Risk Manager",               ["MIDDLE", "SENIOR"]),
            ("Investment Banker",          ["MIDDLE", "SENIOR"]),
            ("Credit Analyst",             ["JUNIOR", "MIDDLE"]),
            ("Quantitative Analyst",       ["MIDDLE", "SENIOR"]),
            ("Compliance Officer",         ["MIDDLE", "SENIOR"]),
            ("Finance Intern",             ["INTERN", "FRESHER"]),
            ("Portfolio Manager",          ["SENIOR", "LEADER"]),
            ("Actuarial Analyst",          ["JUNIOR", "MIDDLE"]),
            ("Treasury Analyst",           ["JUNIOR", "MIDDLE"]),
            ("Chief Financial Officer",    ["LEADER"]),
        ],
        "roles": [
            "Financial Analyst", "Risk Analyst", "Credit Analyst",
            "Investment Analyst", "Compliance Analyst",
        ],
        "responsibilities": [
            "Analyze financial statements and market trends",
            "Build financial models and forecasts",
            "Monitor regulatory compliance requirements",
            "Prepare investment reports and presentations",
            "Assess credit risk and recommend mitigation actions",
            "Manage trading book and portfolio exposure",
            "Implement risk controls and hedging strategies",
        ],
        "requirements": [
            "Bachelor's in Finance, Economics, or Accounting",
            "Strong quantitative and analytical skills",
            "Proficiency in Excel and financial modeling",
            "Knowledge of financial regulations",
            "High attention to detail",
        ],
    },
    "Healthcare & Medical": {
        "skills": [
            "Patient Care", "EHR", "Clinical Research", "Medical Coding",
            "HIPAA Compliance", "Nursing", "Pharmacology", "Surgery",
            "Telemedicine", "EMR", "Radiology", "Pathology", "Diagnostics",
            "Healthcare IT", "Medical Billing",
        ],
        "job_titles": [
            ("Clinical Nurse",              ["JUNIOR", "MIDDLE", "SENIOR"]),
            ("Medical Doctor",              ["MIDDLE", "SENIOR"]),
            ("Healthcare IT Analyst",       ["JUNIOR", "MIDDLE"]),
            ("Clinical Research Coordinator", ["JUNIOR", "MIDDLE"]),
            ("Pharmacist",                  ["MIDDLE", "SENIOR"]),
            ("Medical Billing Specialist",  ["JUNIOR", "MIDDLE"]),
            ("Healthcare Intern",           ["INTERN", "FRESHER"]),
            ("Chief Medical Officer",       ["LEADER"]),
            ("Radiologist",                 ["MIDDLE", "SENIOR"]),
            ("Health Data Analyst",         ["JUNIOR", "MIDDLE"]),
            ("Hospital Administrator",      ["MIDDLE", "SENIOR"]),
        ],
        "roles": [
            "Clinical Nurse", "Healthcare Analyst", "Clinical Researcher",
            "Medical Coder", "Health Data Analyst",
        ],
        "responsibilities": [
            "Provide high-quality patient care and clinical support",
            "Maintain accurate electronic health records",
            "Coordinate with physicians and multidisciplinary care teams",
            "Ensure HIPAA and regulatory compliance across operations",
            "Analyze clinical data for continuous quality improvement",
            "Assist in clinical trials and research protocols",
        ],
        "requirements": [
            "Degree or certification in a healthcare field",
            "Knowledge of EHR/EMR systems",
            "Strong communication and interpersonal skills",
            "Ability to perform in fast-paced environments",
            "Compliance with healthcare regulatory standards",
        ],
    },
    "Education": {
        "skills": [
            "Curriculum Design", "E-learning", "LMS", "Python", "Data Analysis",
            "Teaching", "Research", "Assessment", "EdTech", "Instructional Design",
            "Moodle", "Blackboard", "SCORM", "Content Development", "Training",
        ],
        "job_titles": [
            ("Instructional Designer",          ["JUNIOR", "MIDDLE", "SENIOR"]),
            ("E-learning Developer",            ["JUNIOR", "MIDDLE"]),
            ("Education Data Analyst",          ["MIDDLE", "SENIOR"]),
            ("Curriculum Developer",            ["MIDDLE", "SENIOR"]),
            ("Teacher",                         ["JUNIOR", "MIDDLE"]),
            ("Education Technology Specialist", ["MIDDLE", "SENIOR"]),
            ("Education Intern",                ["INTERN", "FRESHER"]),
            ("School Principal",                ["LEADER"]),
            ("Academic Researcher",             ["MIDDLE", "SENIOR"]),
            ("Training Coordinator",            ["JUNIOR", "MIDDLE"]),
            ("Online Tutor",                    ["FRESHER", "JUNIOR"]),
        ],
        "roles": [
            "Instructional Designer", "E-learning Developer", "Curriculum Developer",
            "Education Analyst", "Training Specialist",
        ],
        "responsibilities": [
            "Design and develop course materials and curricula",
            "Create engaging e-learning content using LMS platforms",
            "Analyze learner performance data to drive improvements",
            "Conduct training sessions and interactive workshops",
            "Collaborate with subject matter experts on content accuracy",
            "Evaluate and iterate on learning effectiveness metrics",
        ],
        "requirements": [
            "Degree in Education, Instructional Design, or related field",
            "Experience with e-learning authoring tools",
            "Strong communication and presentation skills",
            "Familiarity with LMS platforms (Moodle, Blackboard)",
            "Passion for learning and teaching",
        ],
    },
    "Marketing & Advertising": {
        "skills": [
            "SEO", "Google Analytics", "Facebook Ads", "Content Marketing",
            "Copywriting", "HubSpot", "Email Marketing", "A/B Testing",
            "Branding", "Social Media", "Google Ads", "CRM",
            "Market Research", "Canva", "Adobe Creative Suite",
        ],
        "job_titles": [
            ("Digital Marketing Specialist",    ["JUNIOR", "MIDDLE", "SENIOR"]),
            ("SEO Specialist",                  ["JUNIOR", "MIDDLE"]),
            ("Content Creator",                 ["JUNIOR", "MIDDLE"]),
            ("Brand Manager",                   ["MIDDLE", "SENIOR"]),
            ("Marketing Analyst",               ["JUNIOR", "MIDDLE"]),
            ("Social Media Manager",            ["JUNIOR", "MIDDLE"]),
            ("Marketing Intern",                ["INTERN", "FRESHER"]),
            ("Chief Marketing Officer",         ["LEADER"]),
            ("Performance Marketing Manager",   ["MIDDLE", "SENIOR"]),
            ("Creative Director",               ["SENIOR", "LEADER"]),
            ("Marketing Automation Specialist", ["MIDDLE", "SENIOR"]),
        ],
        "roles": [
            "Digital Marketer", "SEO Specialist", "Content Creator",
            "Brand Strategist", "Marketing Analyst",
        ],
        "responsibilities": [
            "Plan and execute digital marketing campaigns across channels",
            "Optimize SEO and paid advertising strategies for ROI",
            "Create and manage social media content calendars",
            "Analyze campaign performance metrics and report insights",
            "Develop brand identity guidelines and messaging frameworks",
            "Conduct competitive market research and audience analysis",
        ],
        "requirements": [
            "Degree in Marketing, Communications, or related field",
            "Experience with digital marketing platforms and tools",
            "Strong analytical and creative problem-solving skills",
            "Knowledge of SEO, SEM, and content best practices",
            "Excellent written and verbal communication",
        ],
    },
}

COMPANIES_DATA = [
    {"name": "TechNova Solutions",  "industry": "Technology & IT",        "city": "Ho Chi Minh City"},
    {"name": "VietFinance Capital", "industry": "Finance & Banking",       "city": "Hanoi"},
    {"name": "MedCare Vietnam",     "industry": "Healthcare & Medical",    "city": "Da Nang"},
    {"name": "EduBright Academy",   "industry": "Education",               "city": "Ho Chi Minh City"},
    {"name": "AdSpark Agency",      "industry": "Marketing & Advertising", "city": "Hanoi"},
]

SEEKERS_PER_INDUSTRY = 21   # 5 × 21 = 105 job seekers


# ── Helpers ───────────────────────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def pick(pool: list, n: int) -> list:
    return random.sample(pool, min(n, len(pool)))


def make_job_text(title: str, industry: str, skills: list, levels: list, responsibilities: list) -> str:
    return (
        f"Title: {title} | Industry: {industry} | "
        f"Skills: {', '.join(skills)} | "
        f"Seniority: {', '.join(levels)} | "
        f"Responsibilities: {'. '.join(responsibilities[:3])}"
    )


def make_resume_text(role: str, industry: str, seniority: str, skills: list,
                     summary: str, bullets: list) -> str:
    return (
        f"Role: {role} | Industry: {industry} | Seniority: {seniority} | "
        f"Skills: {', '.join(skills)} | Summary: {summary} | "
        f"Experience: {'. '.join(bullets[:2])}"
    )


# ── Phase 1: PostgreSQL inserts ───────────────────────────────────────────────

def phase_db(conn) -> tuple:
    """Insert all synthetic data.  Returns (job_records, seeker_records, stats)."""
    cur = conn.cursor()
    stats = {k: 0 for k in ("companies", "jobs", "job_seekers", "resumes", "interactions", "applications")}

    # ── 1. Load industries (seeded by V36 migration) ──────────────────────────
    cur.execute("SELECT name, id FROM industries")
    industry_map: dict = {row[0]: row[1] for row in cur.fetchall()}
    logger.info("Loaded %d industries from DB", len(industry_map))

    # ── 2. Upsert all skills ──────────────────────────────────────────────────
    all_skills: set = set()
    for pool in INDUSTRIES.values():
        all_skills.update(pool["skills"])

    skill_map: dict = {}
    for name in sorted(all_skills):
        sid = new_id()
        cur.execute(
            "INSERT INTO skills (id, name) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
            (sid, name),
        )
        cur.execute("SELECT id FROM skills WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            skill_map[name] = row[0]
    conn.commit()
    logger.info("Skill map ready: %d skills", len(skill_map))

    # ── 3. Companies + addresses + staff ──────────────────────────────────────
    company_ids: dict = {}
    address_ids: dict = {}

    for c in COMPANIES_DATA:
        cname      = c["name"]
        slug       = cname.lower().replace(" ", "").replace("&", "")
        user_id    = new_id()
        company_id = new_id()
        address_id = new_id()
        staff_id   = new_id()

        cur.execute(
            """INSERT INTO users (id, email, password_hash, full_name, role, status, created_at)
               VALUES (%s, %s, %s, %s, 'COMPANY', 'ACTIVE', NOW())
               ON CONFLICT DO NOTHING""",
            (user_id, f"owner.{slug}@seed.local", _BCRYPT_PLACEHOLDER, f"Owner {cname}"),
        )
        cur.execute(
            """INSERT INTO companies (id, name, description, website, is_verified, created_at)
               VALUES (%s, %s, %s, %s, true, NOW())""",
            (company_id, cname, f"Leading company in {c['industry']}",
             f"https://{slug}.example.com"),
        )
        cur.execute(
            """INSERT INTO company_addresses
               (id, company_id, label, address_line, city, country, is_default, created_at)
               VALUES (%s, %s, 'Headquarters', %s, %s, 'Vietnam', true, NOW())""",
            (address_id, company_id, f"123 Main Street", c["city"]),
        )
        cur.execute(
            "INSERT INTO staff (id, user_id, company_id, role, created_at) VALUES (%s, %s, %s, 'OWNER', NOW())",
            (staff_id, user_id, company_id),
        )
        company_ids[cname] = company_id
        address_ids[cname] = address_id
        stats["companies"] += 1

    conn.commit()
    logger.info("Inserted %d companies", stats["companies"])

    # ── 4. Jobs (11 per company = 55 total, each with levels/skills) ──────────
    job_records: list = []

    for c in COMPANIES_DATA:
        industry_name = c["industry"]
        industry_id   = industry_map.get(industry_name)
        if not industry_id:
            logger.warning("Industry '%s' not found in DB — skipping", industry_name)
            continue

        pool       = INDUSTRIES[industry_name]
        company_id = company_ids[c["name"]]
        address_id = address_ids[c["name"]]

        for (title, levels) in pool["job_titles"]:
            job_id      = new_id()
            must_skills = pick(pool["skills"], random.randint(4, 7))
            nice_skills = pick(
                [s for s in pool["skills"] if s not in must_skills],
                random.randint(2, 4),
            )
            responsibilities = random.sample(pool["responsibilities"], min(4, len(pool["responsibilities"])))
            requirements     = random.sample(pool["requirements"],     min(3, len(pool["requirements"])))
            salary_min       = random.choice([800, 1000, 1200, 1500, 2000])
            salary_max       = salary_min + random.choice([500, 700, 1000, 1500])
            job_type         = random.choice(["FULLTIME", "REMOTE", "HYBRID"])

            cur.execute(
                """INSERT INTO jobs
                   (id, company_id, company_address_id, industry_id,
                    title, description, location, salary_min, salary_max,
                    job_type, status, responsibilities, requirements, nice_to_have_skills,
                    created_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::job_type,'PUBLISHED',%s,%s,%s,NOW())""",
                (
                    job_id, company_id, address_id, industry_id,
                    title,
                    f"{title} at {c['name']} in the {industry_name} sector.",
                    c["city"], salary_min, salary_max, job_type,
                    responsibilities, requirements, nice_skills,
                ),
            )

            for level in levels:
                cur.execute(
                    "INSERT INTO job_experience_levels (job_id, level) VALUES (%s, %s::experience_level) ON CONFLICT DO NOTHING",
                    (job_id, level),
                )

            # job_skills — composite PK (job_id, skill_id), no id column (V32)
            for skill_name in must_skills:
                skill_id = skill_map.get(skill_name)
                if skill_id:
                    cur.execute(
                        "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (job_id, skill_id),
                    )

            job_records.append({
                "job_id":          job_id,
                "title":           title,
                "industry":        industry_name,
                "must_skills":     must_skills,
                "nice_skills":     nice_skills,
                "levels":          levels,
                "responsibilities": responsibilities,
            })
            stats["jobs"] += 1

        conn.commit()

    logger.info("Inserted %d jobs", stats["jobs"])

    # ── 5. Job seekers + resumes ──────────────────────────────────────────────
    seeker_records: list = []

    for idx, (industry_name, pool) in enumerate(INDUSTRIES.items()):
        for j in range(SEEKERS_PER_INDUSTRY):
            user_id   = new_id()
            seeker_id = new_id()
            resume_id = new_id()

            role      = random.choice(pool["roles"])
            seniority = random.choice(SENIORITY_ORDER[1:5])   # FRESHER–SENIOR
            skills    = pick(pool["skills"], random.randint(4, 8))
            years_exp = SENIORITY_ORDER.index(seniority) * random.randint(1, 2)
            full_name = f"Seeker {industry_name[:3]}{idx:02d}{j:02d}"
            email     = f"seeker.{industry_name[:3].lower()}{idx:02d}{j:02d}@seed.local"

            summary = (
                f"Experienced {role} with {years_exp} years in {industry_name}. "
                f"Skilled in {', '.join(skills[:3])}."
            )
            bullets = [
                f"Led {role.lower()} initiatives delivering measurable results",
                f"Worked with {skills[0]} and {skills[1] if len(skills) > 1 else skills[0]} in production",
                f"Collaborated with cross-functional teams in {industry_name}",
            ]
            resume_ds = {
                "role": role, "seniority": seniority, "yearsExperience": years_exp,
                "industry": industry_name, "skills": skills,
                "summary": summary, "experienceBullets": bullets,
            }
            parsed_text = make_resume_text(role, industry_name, seniority, skills, summary, bullets)

            cur.execute(
                """INSERT INTO users (id, email, password_hash, full_name, role, status, created_at)
                   VALUES (%s, %s, %s, %s, 'JOBSEEKER', 'ACTIVE', NOW())
                   ON CONFLICT DO NOTHING""",
                (user_id, email, _BCRYPT_PLACEHOLDER, full_name),
            )
            cur.execute(
                """INSERT INTO job_seekers (id, user_id, bio, location, experience_years, created_at)
                   VALUES (%s, %s, %s, 'Vietnam', %s, NOW())""",
                (seeker_id, user_id, summary[:200], years_exp),
            )
            for skill_name in skills:
                skill_id = skill_map.get(skill_name)
                if skill_id:
                    cur.execute(
                        "INSERT INTO job_seeker_skills (job_seeker_id, skill_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (seeker_id, skill_id),
                    )
            cur.execute(
                """INSERT INTO resumes
                   (id, job_seeker_id, file_url, label, file_size, is_primary,
                    parsed_text, resume_data_structure, created_at)
                   VALUES (%s,%s,%s,%s,%s,true,%s,%s::jsonb,NOW())""",
                (
                    resume_id, seeker_id,
                    f"https://storage.example.com/resumes/{resume_id}.pdf",
                    f"{role} Resume",
                    random.randint(50_000, 500_000),
                    parsed_text,
                    json.dumps(resume_ds),
                ),
            )

            seeker_records.append({
                "resume_id": resume_id,
                "seeker_id": seeker_id,
                "industry":  industry_name,
                "skills":    skills,
                "role":      role,
                "seniority": seniority,
                "summary":   summary,
                "bullets":   bullets,
            })
            stats["job_seekers"] += 1
            stats["resumes"]     += 1

        conn.commit()

    logger.info("Inserted %d job seekers + %d resumes", stats["job_seekers"], stats["resumes"])

    # ── 6. Interactions and applications ─────────────────────────────────────
    jobs_by_industry: dict = {}
    for jr in job_records:
        jobs_by_industry.setdefault(jr["industry"], []).append(jr)

    for sr in seeker_records:
        seeker_skills  = set(sr["skills"])
        candidate_jobs = jobs_by_industry.get(sr["industry"], [])
        if not candidate_jobs:
            continue

        ranked = sorted(
            candidate_jobs,
            key=lambda j: len(set(j["must_skills"]) & seeker_skills),
            reverse=True,
        )

        applied_jobs: set = set()

        for rank, jr in enumerate(ranked):
            overlap = len(set(jr["must_skills"]) & seeker_skills)
            if overlap < 1:
                continue
            if rank < 3:
                event_type = "apply"
            elif rank < 6:
                event_type = "save"
            elif rank < 11:
                event_type = "click"
            else:
                break

            cur.execute(
                """INSERT INTO job_interactions (job_seeker_id, job_id, event_type, created_at)
                   VALUES (%s, %s, %s::interaction_event_type, NOW())""",
                (sr["seeker_id"], jr["job_id"], event_type),
            )
            stats["interactions"] += 1

            if event_type == "apply" and jr["job_id"] not in applied_jobs:
                cur.execute("SAVEPOINT sp_app")
                try:
                    cur.execute(
                        """INSERT INTO applications (id, job_id, job_seeker_id, resume_id, status, created_at)
                           VALUES (%s, %s, %s, %s, 'APPLIED', NOW())
                           ON CONFLICT DO NOTHING""",
                        (new_id(), jr["job_id"], sr["seeker_id"], sr["resume_id"]),
                    )
                    applied_jobs.add(jr["job_id"])
                    stats["applications"] += 1
                    cur.execute("RELEASE SAVEPOINT sp_app")
                except Exception as exc:
                    cur.execute("ROLLBACK TO SAVEPOINT sp_app")
                    logger.debug("Application skipped (%s→%s): %s", sr["resume_id"], jr["job_id"], exc)

        conn.commit()

    logger.info(
        "Inserted %d interactions, %d applications",
        stats["interactions"], stats["applications"],
    )
    cur.close()
    return job_records, seeker_records, stats


# ── Phase 2: AI service sync ──────────────────────────────────────────────────

def phase_sync(job_records: list, seeker_records: list, ai_url: str, delay: float) -> dict:
    """POST every node and interaction to the AI service."""
    base    = ai_url.rstrip("/")
    session = requests.Session()
    stats   = {"nodes": 0, "interactions": 0, "errors": 0}

    # ── 2a. Job nodes ─────────────────────────────────────────────────────────
    logger.info("Syncing %d job nodes...", len(job_records))
    for jr in job_records:
        text = make_job_text(jr["title"], jr["industry"], jr["must_skills"],
                             jr["levels"], jr["responsibilities"])
        try:
            r = session.post(f"{base}/api/v1/add_node",
                             json={"node_id": jr["job_id"], "text": text, "node_type": "job"},
                             timeout=30)
            r.raise_for_status()
            stats["nodes"] += 1
        except Exception as exc:
            logger.warning("add_node job %s: %s", jr["job_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)

    # ── 2b. Resume nodes ──────────────────────────────────────────────────────
    logger.info("Syncing %d resume nodes...", len(seeker_records))
    for sr in seeker_records:
        text = make_resume_text(sr["role"], sr["industry"], sr["seniority"],
                                sr["skills"], sr["summary"], sr["bullets"])
        try:
            r = session.post(f"{base}/api/v1/add_node",
                             json={"node_id": sr["resume_id"], "text": text, "node_type": "resume"},
                             timeout=30)
            r.raise_for_status()
            stats["nodes"] += 1
        except Exception as exc:
            logger.warning("add_node resume %s: %s", sr["resume_id"], exc)
            stats["errors"] += 1
        time.sleep(delay)

    # ── 2c. Interactions ──────────────────────────────────────────────────────
    logger.info("Replaying interactions...")
    jobs_by_industry: dict = {}
    for jr in job_records:
        jobs_by_industry.setdefault(jr["industry"], []).append(jr)

    for sr in seeker_records:
        seeker_skills  = set(sr["skills"])
        candidate_jobs = jobs_by_industry.get(sr["industry"], [])
        ranked = sorted(
            candidate_jobs,
            key=lambda j: len(set(j["must_skills"]) & seeker_skills),
            reverse=True,
        )
        for rank, jr in enumerate(ranked):
            overlap = len(set(jr["must_skills"]) & seeker_skills)
            if overlap < 1:
                continue
            if rank < 3:
                action_type = "apply"
            elif rank < 6:
                action_type = "save"
            elif rank < 11:
                action_type = "click"
            else:
                break
            try:
                r = session.post(
                    f"{base}/api/v1/interact",
                    json={"resume_id": sr["resume_id"], "job_id": jr["job_id"], "action_type": action_type},
                    timeout=30,
                )
                r.raise_for_status()
                stats["interactions"] += 1
            except Exception as exc:
                logger.warning("interact %s→%s: %s", sr["resume_id"], jr["job_id"], exc)
                stats["errors"] += 1
            time.sleep(delay)

    logger.info(
        "AI sync complete — nodes=%d  interactions=%d  errors=%d",
        stats["nodes"], stats["interactions"], stats["errors"],
    )
    return stats


# ── DB connection ─────────────────────────────────────────────────────────────

def get_conn(db_url: str | None = None):
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
    parser = argparse.ArgumentParser(description="Seed PostgreSQL then sync to AI service graph")
    parser.add_argument("--db-url",    default=None,
                        help="PostgreSQL DSN (overrides POSTGRES_* env vars)")
    parser.add_argument("--ai-url",    default="http://localhost:8000",
                        help="AI service base URL (default: http://localhost:8000)")
    parser.add_argument("--delay",     type=float, default=0.05,
                        help="Delay in seconds between AI HTTP calls (default: 0.05)")
    parser.add_argument("--skip-sync", action="store_true",
                        help="Insert into DB only; skip AI service sync")
    args = parser.parse_args()

    conn = get_conn(args.db_url)
    try:
        logger.info("=== Phase 1: Inserting synthetic data into PostgreSQL ===")
        job_records, seeker_records, db_stats = phase_db(conn)
        logger.info("DB totals: %s", db_stats)

        if not args.skip_sync:
            logger.info("=== Phase 2: Syncing to AI service at %s ===", args.ai_url)
            ai_stats = phase_sync(job_records, seeker_records, args.ai_url, args.delay)
            logger.info("AI totals: %s", ai_stats)
        else:
            logger.info("--skip-sync set; skipping AI service sync.")
    finally:
        conn.close()

    logger.info("Done.")


if __name__ == "__main__":
    main()
