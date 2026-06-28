"""Resume-job matching logic using hybrid overlap + cosine similarity."""

import re
from typing import Dict, List, Optional, Set

# ── Default scoring weights ────────────────────────────────────────────────────
DEFAULT_WEIGHTS: Dict[str, float] = {
    "skills":             0.40,
    "experience":         0.20,
    "role":               0.10,
    "seniority":          0.15,
    "industry":           0.10,
    "nice_to_have_skills": 0.05,
}

# ── Seniority order & minimum years mapping ───────────────────────────────────
_SENIORITY_ORDER = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEADER"]
_SENIORITY_MIN_YEARS = {
    "INTERN":  0,
    "FRESHER": 0,
    "JUNIOR":  1,
    "MIDDLE":  3,
    "SENIOR":  5,
    "LEADER":  8,
}

# ── Skill alias normalisation ─────────────────────────────────────────────────
# Maps common abbreviations / variant spellings to a canonical name (uppercase).
_SKILL_ALIASES: Dict[str, str] = {
    # Programming languages
    "JS": "JAVASCRIPT",
    "ECMASCRIPT": "JAVASCRIPT",
    "ES6": "JAVASCRIPT",
    "ES2015": "JAVASCRIPT",
    "TS": "TYPESCRIPT",
    "PY": "PYTHON",
    "GOLANG": "GO",
    "CSHARP": "C#",
    "C SHARP": "C#",
    "DOTNET": ".NET",
    "ASP.NET CORE": "ASP.NET",

    # Frontend
    "HTML5": "HTML",
    "CSS3": "CSS",
    "SASS": "SCSS",
    "REACTJS": "REACT",
    "REACT JS": "REACT",
    "VUE": "VUE.JS",
    "VUEJS": "VUE.JS",
    "VUE JS": "VUE.JS",
    "ANGULARJS": "ANGULAR",
    "ANGULAR JS": "ANGULAR",
    "NEXTJS": "NEXT.JS",
    "NEXT JS": "NEXT.JS",
    "NUXTJS": "NUXT.JS",
    "NUXT JS": "NUXT.JS",

    # Backend / frameworks
    "NODE": "NODE.JS",
    "NODEJS": "NODE.JS",
    "NODE JS": "NODE.JS",
    "EXPRESSJS": "EXPRESS",
    "EXPRESS JS": "EXPRESS",
    "NESTJS": "NEST.JS",
    "NEST JS": "NEST.JS",
    "SPRINGBOOT": "SPRING BOOT",
    "SPRING-BOOT": "SPRING BOOT",
    "LARAVEL PHP": "LARAVEL",
    "DJANGO REST FRAMEWORK": "DRF",
    "REST API": "RESTFUL API",
    "RESTFUL": "RESTFUL API",

    # Database
    "POSTGRES": "POSTGRESQL",
    "PSQL": "POSTGRESQL",
    "MONGO": "MONGODB",
    "MONGO DB": "MONGODB",
    "MYSQL SERVER": "SQL SERVER",
    "MSSQL": "SQL SERVER",
    "MICROSOFT SQL SERVER": "SQL SERVER",
    "REDIS CACHE": "REDIS",

    # DevOps / Cloud
    "K8S": "KUBERNETES",
    "K8": "KUBERNETES",
    "DOCKER-COMPOSE": "DOCKER COMPOSE",
    "DOCKER COMPOSE": "DOCKER COMPOSE",
    "CI/CD": "CI CD",
    "CICD": "CI CD",
    "GITHUB ACTION": "GITHUB ACTIONS",
    "GITHUB WORKFLOW": "GITHUB ACTIONS",
    "AWS CLOUD": "AWS",
    "AMAZON WEB SERVICES": "AWS",
    "GCP": "GOOGLE CLOUD",
    "GOOGLE CLOUD PLATFORM": "GOOGLE CLOUD",
    "AZURE CLOUD": "AZURE",

    # Testing
    "UNIT TEST": "UNIT TESTING",
    "UNIT TESTS": "UNIT TESTING",
    "E2E": "END TO END TESTING",
    "E2E TEST": "END TO END TESTING",
    "E2E TESTING": "END TO END TESTING",

    # AI / Data
    "ML": "MACHINE LEARNING",
    "AI": "ARTIFICIAL INTELLIGENCE",
    "NLP": "NATURAL LANGUAGE PROCESSING",
    "LLM": "LARGE LANGUAGE MODEL",
    "GENAI": "GENERATIVE AI",
    "GEN AI": "GENERATIVE AI",
}
# ── Industry taxonomy normalization ──────────────────────────────────────────
_INDUSTRY_TAXONOMY: Dict[str, str] = {
    "technology & it": "Technology",
    "information technology": "Technology",
    "software": "Technology",
    "software development": "Technology",
    "it": "Technology",
    "finance": "Finance",
    "financial services": "Finance",
    "banking": "Finance",
    "healthcare": "Healthcare",
    "medical": "Healthcare",
    "health": "Healthcare",
    "education": "Education",
    "retail": "Retail",
    "e-commerce": "Retail",
    "ecommerce": "Retail",
    "manufacturing": "Manufacturing",
    "logistics": "Logistics",
    "supply chain": "Logistics",
    "marketing": "Marketing",
    "advertising": "Marketing",
    "real estate": "Real Estate",
    "construction": "Construction",
    "energy": "Energy",
    "oil & gas": "Energy",
    "telecommunications": "Telecommunications",
    "telecom": "Telecommunications",
    "media": "Media",
    "entertainment": "Media",
    "government": "Government",
    "public sector": "Government",
    "legal": "Legal",
    "consulting": "Consulting",
    "hr": "Human Resources",
    "human resources": "Human Resources",
}

_SENIORITY_ALIASES: Dict[str, str] = {
    "MID-LEVEL": "MIDDLE",
    "MID": "MIDDLE",
    "ENTRY": "FRESHER",
    "ENTRY-LEVEL": "FRESHER",
    "STAFF": "MIDDLE",
    "PRINCIPAL": "LEADER",
    "MANAGER": "LEADER",
    "LEAD": "LEADER",
}


# ── Normalization helpers ─────────────────────────────────────────────────────

def _resolve_alias(skill: str) -> str:
    """Return the canonical form of a skill token (alias map → fallback to itself)."""
    return _SKILL_ALIASES.get(skill, skill)


def normalize_skills(skills_input) -> List[str]:
    """Split comma-separated skills (or list), uppercase, apply aliases.

    Parenthesised qualifiers are extracted as *additional* skills rather than
    dropped, so "PHP(Laravel)" yields both "PHP" and "LARAVEL".
    Deduplication preserves first-seen order.
    """
    if not skills_input:
        return []
    # Accept both string and list input (item 5)
    if isinstance(skills_input, list):
        skills_str = ", ".join(skills_input)
    else:
        skills_str = skills_input
    result: List[str] = []
    for part in skills_str.split(","):
        # Base skill (outside parentheses)
        base = re.sub(r"\(.*?\)", "", part).strip().upper()
        if base:
            result.append(_resolve_alias(base))
        # Skills inside parentheses become separate entries
        for inner in re.findall(r"\(([^)]+)\)", part):
            token = inner.strip().upper()
            if token:
                result.append(_resolve_alias(token))
    # Deduplicate while preserving order (item 3)
    return list(dict.fromkeys(result))


def _skill_coverage_score(resume_skills: List[str], required_skills: List[str]) -> float:
    """Fraction of *required* skills that appear in the resume (coverage ratio).

    Uses alias-normalised exact matching, so JS == JAVASCRIPT, etc.
    Score = |resume ∩ required| / |required|  (range 0–1).
    """
    if not required_skills:
        return 0.0
    resume_set: Set[str] = {_resolve_alias(s.strip().upper()) for s in resume_skills}
    required_set: Set[str] = {_resolve_alias(s.strip().upper()) for s in required_skills}
    matched = len(resume_set & required_set)
    return matched / len(required_set)


def normalize_seniority(raw: Optional[str]) -> Optional[str]:
    """Map raw seniority string to the canonical enum value."""
    if not raw:
        return None
    key = raw.strip().upper()
    canonical = _SENIORITY_ALIASES.get(key, key)
    return canonical if canonical in _SENIORITY_ORDER else None


def normalize_industry(raw: Optional[str]) -> str:
    """Map industry string to shared taxonomy; return as-is if unknown."""
    if not raw:
        return ""
    return _INDUSTRY_TAXONOMY.get(raw.lower().strip(), raw.strip())


def join_bullets(bullets) -> str:
    """Flatten a list of bullet strings into one sentence string."""
    if isinstance(bullets, list):
        return ". ".join(str(b).strip() for b in bullets if b and str(b).strip())
    return str(bullets or "").strip()


def _word_count(text: str) -> int:
    return len(text.split())


def _enough_words(text: str, min_words: int = 5) -> bool:
    return _word_count(text) >= min_words


def _cosine_sim(text_a: str, text_b: str, model) -> float:
    """Compute cosine similarity between two plain-text strings."""
    import torch
    emb_a = model.encode(text_a, convert_to_tensor=True)
    emb_b = model.encode(text_b, convert_to_tensor=True)
    sim = torch.nn.functional.cosine_similarity(
        emb_a.unsqueeze(0), emb_b.unsqueeze(0)
    )
    # clamp to [0, 1] — cosine can technically be negative for orthogonal vectors
    return float(max(0.0, sim.item()))


# ── Main matching function ────────────────────────────────────────────────────

def match_resume_job(resume: dict, job: dict, model) -> dict:
    """
    Compare a resume against a job description and return per-dimension scores.
    
    resume keys (all optional):
        skills (str | list), experience_bullets (str | list), seniority (str),
        industry (str), yearsExperience (int), role (str), summary (str)

    job keys (all optional):
        must_have_skills (list[str]), nice_to_have_skills (list[str]),
        responsibilities (list[str]), requirements (str),
        seniority (list[str] | str), industry (str), job_title (str)

    Returns a dict with keys:
        overall_score, skills, experience, role, seniority, industry,
        nice_to_have_skills
    """
    # Guard: require a valid model (item 6)
    if model is None:
        raise ValueError("A sentence-transformer model must be provided.")

    weights = DEFAULT_WEIGHTS.copy()
    scores: Dict[str, float] = {}

    # ── Normalise resume side ────────────────────────────────────────────────
    resume_skills_list = normalize_skills(resume.get("skills"))
    resume_skills_text = " ".join(resume_skills_list)

    exp_raw = resume.get("experience_bullets", "")
    # Merge resume summary into experience text (item 12)
    summary = resume.get("summary") or ""
    bullets_text = join_bullets(exp_raw) if isinstance(exp_raw, list) else (exp_raw or "").strip()
    resume_exp_text = (summary + ". " + bullets_text).strip() if summary else bullets_text

    resume_seniority     = normalize_seniority(resume.get("seniority"))
    resume_industry      = normalize_industry(resume.get("industry"))
    resume_years_exp     = resume.get("yearsExperience")
    resume_role          = resume.get("role") or ""

    # ── Normalise job side ───────────────────────────────────────────────────
    must_have_raw      = job.get("must_have_skills") or []
    nice_to_have_raw   = job.get("nice_to_have_skills") or []
    responsibilities   = job.get("responsibilities") or []

    # seniority may arrive as List[str] (["FRESHER","INTERN"]) or as a
    # comma-separated string ("FRESHER, INTERN") — handle both robustly.
    seniority_raw = job.get("seniority") or []
    if isinstance(seniority_raw, str):
        seniority_raw = [s.strip() for s in seniority_raw.split(",") if s.strip()]

    job_seniority_list = [normalize_seniority(s) for s in seniority_raw]
    job_seniority_list = [s for s in job_seniority_list if s]
    job_industry  = normalize_industry(job.get("industry"))
    job_title     = job.get("job_title") or ""

    # Canonical skill lists for must_have — normalise to catch parenthesis
    # expansion so both sides are symmetric (item 4)
    must_have_normalised: List[str] = []
    for s in must_have_raw:
        must_have_normalised.extend(normalize_skills(s))

    # Canonical text representations for cosine-based dimensions
    must_have_text    = " ".join(_resolve_alias(s.strip().upper()) for s in must_have_raw if s)
    nice_to_have_text = " ".join(_resolve_alias(s.strip().upper()) for s in nice_to_have_raw if s)

    # Merge requirements into experience text (item 11)
    resp_text = join_bullets(responsibilities)
    req_text  = (job.get("requirements") or "").strip()
    job_exp_text = resp_text + (". " + req_text if req_text else "")

    # ── 1. skills ↔ must_have_skills  (weight 0.40, highest) ───────────────
    # Use hybrid scoring: 70 % intersection coverage + 30 % semantic cosine.
    if resume_skills_list and must_have_normalised:
        coverage = _skill_coverage_score(resume_skills_list, must_have_normalised)
        if _enough_words(resume_skills_text) and _enough_words(must_have_text):
            cosine = _cosine_sim(resume_skills_text, must_have_text, model)
        else:
            cosine = coverage
        scores["skills"] = 0.70 * coverage + 0.30 * cosine

    # ── 2. experience_bullets ↔ responsibilities+requirements  (weight 0.20) ─
    if job_exp_text and _enough_words(resume_exp_text) and _enough_words(job_exp_text):
        scores["experience"] = _cosine_sim(resume_exp_text, job_exp_text, model)

    # ── 3. role ↔ job_title  (weight 0.10) ──────────────────────────────────
    # Catches fundamental role-category mismatches (item 8)
    if resume_role and job_title and _enough_words(resume_role) and _enough_words(job_title):
        scores["role"] = _cosine_sim(resume_role, job_title, model)

    # ── 4. seniority ↔ seniority  (proximity + years experience, weight 0.15) ─
    # Proximity scoring using index distance (item 2) blended with years exp (item 9)
    if resume_seniority and job_seniority_list:
        resume_idx = _SENIORITY_ORDER.index(resume_seniority)

        # Best proximity score across all allowed seniority levels
        best_proximity = 0.0
        for job_sen in job_seniority_list:
            job_idx = _SENIORITY_ORDER.index(job_sen)
            prox = 1.0 - abs(resume_idx - job_idx) / len(_SENIORITY_ORDER)
            best_proximity = max(best_proximity, prox)

        # Years-of-experience score
        if resume_years_exp is not None:
            best_years_score = 0.0
            for job_sen in job_seniority_list:
                min_years = _SENIORITY_MIN_YEARS.get(job_sen, 1)
                years_score = min(1.0, resume_years_exp / max(min_years, 1))
                best_years_score = max(best_years_score, years_score)
            # 50% label proximity + 50% years-vs-minimum check
            scores["seniority"] = 0.5 * best_proximity + 0.5 * best_years_score
        else:
            scores["seniority"] = best_proximity

    # ── 5. industry ↔ industry  (exact match only, weight 0.10) ─────────────
    # Remove cosine fallback — semantic proximity is misleading for industry
    # labels (item 1)
    if resume_industry and job_industry:
        scores["industry"] = 1.0 if resume_industry.lower() == job_industry.lower() else 0.0

    # ── 6. skills ↔ nice_to_have_skills  (bonus only, weight 0.05) ──────────
    if resume_skills_list and nice_to_have_raw:
        scores["nice_to_have_skills"] = _skill_coverage_score(
            resume_skills_list, nice_to_have_raw
        )

    # ── Weighted overall ─────────────────────────────────────────────────────
    total_weight = sum(weights.get(k, 0.0) for k in scores)
    if total_weight == 0:
        return {k: 0.0 for k in (
            "overall_score", "skills", "experience", "role",
            "seniority", "industry", "nice_to_have_skills"
        )}

    # Rebalance weights across dimensions that were actually scored.
    # Otherwise missing optional fields would drag the final score down.
    overall = sum(scores[k] * weights[k] for k in scores) / total_weight

    return {
        "overall_score":      round(overall, 4),
        "skills":             round(scores.get("skills", 0.0), 4),
        "experience":         round(scores.get("experience", 0.0), 4),
        "role":               round(scores.get("role", 0.0), 4),
        "seniority":          round(scores.get("seniority", 0.0), 4),
        "industry":           round(scores.get("industry", 0.0), 4),
        "nice_to_have_skills": round(scores.get("nice_to_have_skills", 0.0), 4),
    }
