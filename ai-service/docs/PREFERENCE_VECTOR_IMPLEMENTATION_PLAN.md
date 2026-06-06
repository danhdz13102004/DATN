# Implementation Plan — Recency-Weighted Preference Vector

> Replace the per-candidate behavioral boost with a single preference vector that
> blends with the GNN structural embedding at query time. See
> [PREFERENCE_VECTOR_APPROACH.md](PREFERENCE_VECTOR_APPROACH.md) for design rationale.

---

## Current State Inventory

What already exists in the codebase that we will reuse:

| Item | Location | Notes |
|------|----------|-------|
| `feature_store` (raw NLP) | [recommendation_service.py](../app/services/recommendation_service.py) | Module-level dict, populated in `add_node` |
| `graphsage_store` (GNN output) | same file | Updated in `process_application` via local subgraph |
| `edge_store` with `updated_at` | same file | Already added in previous step — every edge dict now has a timestamp |
| `MAX_EDGE_WEIGHT`, `RECENCY_HALF_LIFE_DAYS` | same file | Already defined |
| `get_recommendations` | line ~837 | Currently scores via `cos × _compute_behavioral_boost` |
| `_compute_behavioral_boost` | line ~780 | The O(I × N) per-candidate boost — to be **deleted** |
| `BEHAVIORAL_BOOST_ALPHA = 0.5` | line ~52 | Used only by the boost — to be **deleted** |
| `SMOOTHING_ALPHA = 0.7` (EMA) | line ~46 | Used in `process_application` for resume embedding update |

What is missing and must be added:

- A function to compute the preference vector from `edge_store`
- A function to compute dynamic α from interaction count
- A function to build the query vector from GNN embedding + preference vector
- Constants: `MAX_PREFERENCE_INTERACTIONS`, `BLEND_ALPHA_BASE`, `BLEND_ALPHA_STEP`, `BLEND_ALPHA_MIN`
- Persistence of `updated_at` to Redis (currently only `weight` is persisted)

What must NOT change:

- GraphSAGE model architecture, weights, or forward pass
- `add_node` (no schema changes needed)
- `_run_graphsage_local` (still uses pure `cos²` edge weights as fixed earlier)
- `run_graphsage_global` (same)
- API contract of `get_recommendations` — same input/output shape

---

## Step-by-Step Plan

### Step 1 — Add constants

In [recommendation_service.py](../app/services/recommendation_service.py), replace the
post-GNN re-ranking constants block:

```python
# ── Post-GNN behavioral re-ranking ───────────────────────────────────────────
BEHAVIORAL_BOOST_ALPHA    = 0.5
RECENCY_HALF_LIFE_DAYS    = 30.0
```

with:

```python
# ── Recency-weighted preference vector blending ──────────────────────────────
# Behavioral intent is computed fresh at query time from edge_store.
# query_vec = α·graphsage_store[R] + (1-α)·preference_vec
RECENCY_HALF_LIFE_DAYS      = 30.0   # behavioral recency halves every 30 days
MAX_PREFERENCE_INTERACTIONS = 10     # cap to N most recent edges to avoid drift toward center
BLEND_ALPHA_BASE            = 1.0    # α when n=0 (pure structural)
BLEND_ALPHA_STEP            = 0.07   # α decreases by this per interaction
BLEND_ALPHA_MIN             = 0.30   # floor — preference_vec never fully replaces structural
```

Keep `RECENCY_HALF_LIFE_DAYS` (already used by recency formula).

---

### Step 2 — Delete the old boost function

Remove `_compute_behavioral_boost` (~50 lines) entirely. It is replaced by the new helpers.

---

### Step 3 — Add three new helper functions

Place these immediately above `get_recommendations`:

#### 3a. `_compute_preference_vector(resume_id, device) -> Optional[torch.Tensor]`

Returns the L2-normalized weighted mean of NLP embeddings of interacted jobs,
or `None` if the resume has zero interactions.

Pseudocode:
```python
def _compute_preference_vector(resume_id, device):
    edges = edge_store.get(resume_id, [])
    if not edges:
        return None

    # Cap to N most recent by updated_at to bound diversity drift
    sorted_edges = sorted(edges, key=lambda e: e.get("updated_at", 0), reverse=True)
    recent = sorted_edges[:MAX_PREFERENCE_INTERACTIONS]

    now = time.time()
    weighted_sum = None
    total_weight = 0.0

    for edge in recent:
        job_vec = feature_store.get(edge["job_id"])
        if job_vec is None:
            continue
        norm_w   = min(edge["weight"] / MAX_EDGE_WEIGHT, 1.0)
        days_old = (now - edge.get("updated_at", now)) / 86400.0
        recency  = math.exp(-math.log(2) * days_old / RECENCY_HALF_LIFE_DAYS)
        w        = norm_w * recency
        if w <= 0:
            continue

        contribution = w * job_vec
        weighted_sum = contribution if weighted_sum is None else weighted_sum + contribution
        total_weight += w

    if weighted_sum is None or total_weight <= 0:
        return None

    pref = weighted_sum / total_weight
    return F.normalize(pref.unsqueeze(0), p=2, dim=1).squeeze(0)
```

#### 3b. `_compute_blend_alpha(num_interactions) -> float`

```python
def _compute_blend_alpha(num_interactions):
    n = min(num_interactions, MAX_PREFERENCE_INTERACTIONS)
    return max(BLEND_ALPHA_MIN, BLEND_ALPHA_BASE - BLEND_ALPHA_STEP * n)
```

#### 3c. `_build_query_vector(resume_id, device) -> torch.Tensor`

```python
def _build_query_vector(resume_id, device):
    structural = graphsage_store.get(resume_id)
    if structural is None:
        raise ValueError(f"Resume '{resume_id}' not found in graphsage_store.")

    preference = _compute_preference_vector(resume_id, device)
    if preference is None:
        return structural   # cold-start: pure structural

    n = len(edge_store.get(resume_id, []))
    alpha = _compute_blend_alpha(n)
    blended = alpha * structural + (1.0 - alpha) * preference
    return F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)
```

---

### Step 4 — Rewire `get_recommendations`

Replace the scoring loop in [recommendation_service.py](../app/services/recommendation_service.py)
around line 909:

**Before:**
```python
sim_raw = torch.nn.functional.cosine_similarity(resume_vec, job_vec, dim=0)
score   = float(sim_raw.item()) * _compute_behavioral_boost(resume_id, job_id)
```

**After:**
```python
sim_raw = torch.nn.functional.cosine_similarity(query_vec, job_vec, dim=0)
score   = float(sim_raw.item())
```

And at the top of the function, replace:
```python
resume_vec = graphsage_store.get(resume_id)
if resume_vec is None:
    raise ValueError(f"Resume '{resume_id}' not found in graphsage_store.")
```

with:
```python
query_vec = _build_query_vector(resume_id, device)
# Diagnostic: log alpha and whether preference_vec was used
n_edges = len(edge_store.get(resume_id, []))
used_preference = n_edges > 0
alpha_used = _compute_blend_alpha(n_edges) if used_preference else 1.0
logger.info(
    "[get_recommendations] resume_id=%s n_edges=%d used_preference=%s alpha=%.2f",
    resume_id, n_edges, used_preference, alpha_used,
)
```

Update the diagnostic logging block accordingly (remove `resume_vec.norm()` → use `query_vec.norm()`).

---

### Step 5 — Persist `updated_at` to Redis

The current `persist_edge` in [graph_store.py](../app/services/graph_store.py)
only stores weight via `HINCRBYFLOAT`. Recency requires `updated_at` to survive restarts.

Add a parallel hash for timestamps:

```python
def persist_edge(resume_id, job_id, weight):
    try:
        r = get_redis()
        r.hincrbyfloat(_edges_key(resume_id), job_id, weight)
        r.hincrbyfloat(_job_edges_key(job_id), resume_id, weight)
        # NEW: timestamp the most recent update
        now = time.time()
        r.hset(_edges_ts_key(resume_id), job_id, now)
    except Exception as exc:
        logger.warning("graph_store.persist_edge(%s→%s) failed: %s", resume_id, job_id, exc)
```

Add helper:
```python
def _edges_ts_key(resume_id):
    return f"{_PFX}edges_ts:{resume_id}"
```

Update `load_edges_into_memory` to merge timestamps:
```python
ts_raw = r.hgetall(_edges_ts_key(resume_id))   # {job_id: timestamp_str}
for edge in edges:
    ts = ts_raw.get(edge["job_id"])
    edge["updated_at"] = float(ts) if ts else time.time()
```

For legacy edges with no recorded timestamp, default to `time.time()` (treat as fresh).
This is safer than treating them as old (which would zero out the recency weight on restart).

---

### Step 6 — Optional: Skip EMA on first interaction

In `process_application`, the EMA dilutes Job A's signal on the very first apply.
Replace:
```python
old_vec = graphsage_store.get(resume_id, updated_resume_vec)
blended = SMOOTHING_ALPHA * old_vec + (1 - SMOOTHING_ALPHA) * updated_resume_vec
smoothed_vec = F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)
graphsage_store[resume_id] = smoothed_vec
```

with:
```python
if len(edges) <= 1:
    # First interaction: trust the GNN fully, no smoothing
    smoothed_vec = F.normalize(updated_resume_vec.unsqueeze(0), p=2, dim=1).squeeze(0)
else:
    old_vec = graphsage_store.get(resume_id, updated_resume_vec)
    blended = SMOOTHING_ALPHA * old_vec + (1 - SMOOTHING_ALPHA) * updated_resume_vec
    smoothed_vec = F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)
graphsage_store[resume_id] = smoothed_vec
```

This addresses the weakness identified in the previous discussion (1 apply → only 21% Job A
influence). With this fix, 1 apply gives ~53% Job A influence on `query_vec`.

---

### Step 7 — Tests

Add to [test_graphsage_local.py](../tests/test_graphsage_local.py):

1. **`test_preference_vector_cold_start`**: resume with no edges → `_compute_preference_vector` returns `None`, `_build_query_vector` returns `graphsage_store[R]` unchanged.

2. **`test_preference_vector_single_interaction`**: resume with one edge to Job A → preference vector equals `feature_store[Job_A]` (after L2 normalization).

3. **`test_preference_vector_recency`**: resume with two edges, one fresh and one 60 days old → fresh job dominates the weighted mean (>80%).

4. **`test_preference_vector_cap`**: resume with 15 edges → only the 10 most recent contribute.

5. **`test_blend_alpha_decreases_with_interactions`**: assert `_compute_blend_alpha(0) == 1.0`, `_compute_blend_alpha(10) == 0.3`, monotonically decreasing.

6. **`test_get_recommendations_uses_query_vec`**: mock `graphsage_store` and `edge_store`; verify the top-ranked job changes when an interaction is added (proves preference_vec affects ranking).

7. **`test_first_interaction_no_ema`** (if Step 6 done): verify that after one `process_application` call, `graphsage_store[R]` is closer to Job A than the old EMA-blended version.

8. **`test_redis_timestamp_round_trip`**: persist an edge, restart `edge_store`, reload via `load_edges_into_memory`, verify `updated_at` is preserved within a second.

---

### Step 8 — Documentation cleanup

After implementation:

- Update [GRAPHSAGE_LOCAL_INFERENCE_GAPS.md](GRAPHSAGE_LOCAL_INFERENCE_GAPS.md) — mark behavioral fusion gap as resolved by the preference vector approach.
- Add a short note at the top of [PREFERENCE_VECTOR_APPROACH.md](PREFERENCE_VECTOR_APPROACH.md) confirming it is now the implemented strategy (currently it describes the design only).

---

## Order of Execution

| # | Task | Risk | Reversible? |
|---|------|------|-------------|
| 1 | Add new constants | None | Yes |
| 2 | Add 3 helper functions (`_compute_preference_vector`, `_compute_blend_alpha`, `_build_query_vector`) | None | Yes |
| 3 | Wire `get_recommendations` to use `query_vec` | Behavioral change for users with edges | Yes — keep boost function as fallback initially |
| 4 | Delete `_compute_behavioral_boost` and `BEHAVIORAL_BOOST_ALPHA` | None after Step 3 lands | Yes (git revert) |
| 5 | Persist `updated_at` to Redis | Schema additive, backward compatible | Yes |
| 6 | Skip EMA on first interaction (optional) | Stronger GNN signal on cold-start, may require eval | Yes |
| 7 | Add tests | None | N/A |
| 8 | Update docs | None | N/A |

---

## Validation

Manual smoke test after Step 4:

```bash
make up
# Register a resume R
curl -X POST .../api/v1/add_node -d '{"node_id":"R1","text":"Python backend dev","node_type":"resume"}'
# Register two jobs A (similar to R), B (frontend, dissimilar)
curl -X POST .../api/v1/add_node -d '{"node_id":"JA","text":"Backend Python Django","node_type":"job"}'
curl -X POST .../api/v1/add_node -d '{"node_id":"JB","text":"Frontend React TypeScript","node_type":"job"}'
# Get recommendations BEFORE any interaction → JA should rank above JB by NLP similarity
curl .../api/v1/recommendations?resume_id=R1
# Apply to JB
curl -X POST .../api/v1/handle_interaction -d '{"resume_id":"R1","job_id":"JB","action_type":"apply"}'
# Get recommendations AFTER interaction → JB should now rank #1, even though semantically less similar
curl .../api/v1/recommendations?resume_id=R1
```

Expected: the rank of JB rises significantly after the apply, confirming `preference_vec`
is influencing the `query_vec`. Check the new log line `n_edges=1 used_preference=True alpha=0.93`.

---
# Recency-Weighted Preference Vector — Design & Explanation

## Why This Exists

The standard GraphSAGE recommendation system has one embedding per node stored in
`graphsage_store`. For a resume node R, that embedding captures who R is structurally
in the graph — which jobs they applied to, which other users share similar jobs, and
how their NLP features relate to their neighborhood.

The problem: **structural profile ≠ current intent**.

If a user spent 6 months applying to Backend jobs, then this week starts applying to
ML Engineer roles, their `graphsage_store` embedding still leans heavily toward Backend
because of accumulated history. EMA smoothing (`0.7 × old + 0.3 × new`) makes this
even stickier — it takes many new interactions to shift the structural embedding.

The preference vector solves this by computing **what the user wants right now**
separately, fresh at every query, without modifying any stored embeddings.

---

## Three Stores, Three Purposes

```
feature_store[R]      — WHO you are (content)
                        NLP embedding of your resume text.
                        Computed once at add_node, never changes.

graphsage_store[R]    — WHO you are (structurally, collaboratively)
                        GNN output after message passing over your neighborhood.
                        Changes slowly, updated per interaction or via daily global refresh.

edge_store[R]         — WHAT you did
                        [{job_id, weight, updated_at}, ...]
                        Grows with every interaction. Source of behavioral truth.
```

At query time, a fourth thing is computed and **immediately discarded**:

```
preference_vec        — WHAT you want right now
                        Weighted average of NLP embeddings of interacted jobs.
                        Computed fresh every call to get_recommendations.
                        Never stored anywhere.

query_vec             — WHAT to search for
                        Blend of graphsage_store[R] and preference_vec.
                        Used for cosine scoring. Never stored.
```

---

## The Math

### Step 1 — Compute preference vector

For each job A that resume R has interacted with:

$$w_A = \text{norm\_weight}_A \times \text{recency}_A$$

$$\text{norm\_weight}_A = \frac{\text{edge\_weight}_A}{\text{MAX\_EDGE\_WEIGHT}} \in [0, 1]$$

$$\text{recency}_A = e^{-\ln 2 \cdot \frac{\text{days\_old}}{T_{1/2}}}$$

where $T_{1/2}$ = 30 days (halves every 30 days).

Then the preference vector is the weighted mean of NLP job embeddings:

$$\mathbf{p}_R = \text{L2\_normalize}\!\left( \frac{\sum_A w_A \cdot \mathbf{v}_A^{\text{NLP}}}{\sum_A w_A} \right)$$

**Why NLP embeddings (`feature_store`), not GNN embeddings (`graphsage_store`)?**

`graphsage_store[Job_A]` shifts every time any other user interacts with Job A. If
User2 applies to Job A, Job A's GNN embedding absorbs User2's features. Building your
preference vector from GNN job embeddings would silently encode strangers' behavior
into your own intent vector. `feature_store[Job_A]` is the raw MPNet encoding of the
job description — stable, content-only, yours to interpret.

---

### Step 2 — Compute α (blend ratio)

$$\alpha = \max(0.3,\; 1.0 - 0.07 \times \min(n, 10))$$

| # Interactions | α    | Meaning                                   |
|----------------|------|-------------------------------------------|
| 0 (cold-start) | 1.00 | Pure GNN structural profile               |
| 1              | 0.93 | Almost all structural, slight intent hint |
| 5              | 0.65 | Balanced                                  |
| 10+            | 0.30 | Intent dominates, structure is secondary  |

With no interactions, `preference_vec` doesn't exist, so `query_vec = graphsage_store[R]`
automatically (α = 1.0, no blend needed).

---

### Step 3 — Build query vector

$$\mathbf{q}_R = \text{L2\_normalize}\!\left( \alpha \cdot \mathbf{g}_R + (1-\alpha) \cdot \mathbf{p}_R \right)$$

where $\mathbf{g}_R$ = `graphsage_store[R]`.

---

### Step 4 — Score all jobs

$$\text{score}(R, C) = \cos(\mathbf{q}_R,\; \mathbf{g}_C)$$

where $\mathbf{g}_C$ = `graphsage_store[job_C]`.

---

## Worked Examples

### Example 1 — New user, first interaction

**Setup:**
- Resume R: "Python Backend Developer, 3 years experience, FastAPI, PostgreSQL"
- R applies to **Job A**: "Backend Engineer — Python, Django, REST APIs"

**Before the interaction (cold-start):**
```
feature_store[R]    = NLP("Python Backend Developer, 3 years...")
graphsage_store[R]  = same (no GNN update yet)
edge_store[R]       = []
preference_vec      = None
query_vec           = graphsage_store[R]   (α = 1.0)
```

**After the interaction:**
```
edge_store[R] = [{job_id: A, weight: 1.0, updated_at: now}]

GNN local subgraph: [R, Job_A]
graphsage_store[R] = GNN([R, Job_A])
  → R's structural embedding now blends R's NLP + Job A's NLP

At next query:
  norm_weight_A = 1.0 / 3.0 = 0.33
  recency_A     = exp(0) = 1.0          (applied today)
  w_A           = 0.33

  preference_vec = normalize(0.33 × NLP(Job_A)) = normalize(NLP(Job_A))
                 = NLP(Job_A)   (single interaction = preference_vec points exactly at Job A)

  α = max(0.3, 1.0 - 0.07 × 1) = 0.93

  query_vec = normalize(0.93 × graphsage_store[R]  +  0.07 × NLP(Job_A))
```

**Scoring outcome:**

| Candidate         | Why score is high/low                                       |
|-------------------|-------------------------------------------------------------|
| Job B (Python Django, similar to A) | High: query_vec points near A, B is near A |
| Job C (Python ML Engineer)          | Medium: same language, different domain    |
| Job D (Java Backend)                | Low: different language, different stack   |
| Job E (Frontend React)              | Very low: unrelated domain                 |

---

### Example 2 — Recency effect with multiple interactions

**Setup:** Resume R has these interactions:

| Job | Description                  | Weight | Days ago | norm_w | recency | $w_i$ | Share of pref_vec |
|-----|------------------------------|--------|----------|--------|---------|--------|-------------------|
| A   | Backend Python, Django       | 1.0    | 0        | 0.33   | 1.00    | 0.330  | **55%**           |
| B   | Backend Python, FastAPI      | 0.7    | 14       | 0.23   | 0.72    | 0.166  | **28%**           |
| C   | Data Engineer, PySpark       | 0.7    | 45       | 0.23   | 0.35    | 0.081  | **13%**           |
| D   | DevOps, Kubernetes           | 0.1    | 7        | 0.03   | 0.85    | 0.026  | **4%**            |

```
preference_vec ≈ 0.55 × NLP(A) + 0.28 × NLP(B) + 0.13 × NLP(C) + 0.04 × NLP(D)
```

Job A and B are both Backend Python → their NLP embeddings point in a similar direction.
Together they contribute **83%** of the preference vector. The vector clearly points at
"Python backend work" even though R also touched Data Engineering and DevOps.

**Without recency** (uniform weights), each job contributes 25% each → the vector
would be pulled equally toward Data Engineering and DevOps, losing the clear intent signal.

---

### Example 3 — Diversity problem and the cap

**Setup:** R has applied to 10 completely different jobs (Backend, Frontend, ML, Data,
DevOps, Product, Design, Marketing, Finance, Legal).

**Without capping:**
```
preference_vec = average of 10 embeddings spanning all directions
              ≈ near the center of embedding space
              ≈ pointing at nothing specific
```

**With capping to the 5 most recent:**
```
preference_vec = average of the 5 most recent interactions only
              → at least reflects current intent phase
```

This is why in production you should cap to the N most recent interactions by `updated_at`
before computing the preference vector. The recency weight already diminishes old
interactions, but capping removes their small contributions entirely.

---

### Example 4 — Cold-start job vs cold-start user

**Cold-start user (no interactions):**
```
edge_store[R] = []
preference_vec = None
query_vec = graphsage_store[R]   ← falls back to pure NLP/structural profile
```
Recommendations are based entirely on resume content. This is correct — the system
knows nothing about intent yet, so content profile is the best signal available.

**Cold-start job (just registered, no one applied):**
```
graphsage_store[Job_New] = feature_store[Job_New]   ← raw NLP embedding
```
The job scores purely by content similarity to `query_vec`. As users start interacting
with it, the global GNN refresh will propagate collaborative signal into its embedding.
Until then, content similarity is the right fallback.

---

## What GraphSAGE Still Does

The preference vector handles **explicit behavioral intent**. GraphSAGE handles
**implicit collaborative signal** — things the user never directly expressed.

```
R applied to Job A
User2 also applied to Job A  (2-hop neighbor)
User2 also applied to Job B  (Job B is semantically different from A)

GNN message passing:
  Job A aggregates from R and User2
  R aggregates from Job A
  → graphsage_store[R] absorbs a hint of User2's behavior via Job A
```

This means `graphsage_store[R]` may score Job B slightly higher than pure NLP would
predict, because User2 (structurally similar to R) went to B. This is the classic
collaborative filtering signal — "users like you also looked at this."

The preference vector knows nothing about User2 or Job B. GraphSAGE knows nothing
about how old your interactions are. **They are complementary, not redundant.**

---

## Data Flow Summary

```
Registration:
  add_node(R, text)
  → feature_store[R]   = L2_norm(MPNet(text))
  → graphsage_store[R] = feature_store[R].clone()

Interaction (apply/save/click):
  handle_interaction(R, Job_A, action)
  → edge_store[R].append({job_id: A, weight: ..., updated_at: now})
  → _run_graphsage_local(R)   [GNN subgraph update]
  → graphsage_store[R] = GNN output   [structural update]
  ← preference_vec NOT computed here, NOT stored

Query (get_recommendations):
  → preference_vec = weighted_mean(feature_store[A_i] for A_i in edge_store[R])
                     weighted by norm_weight × recency
  → α = dynamic_alpha(len(edge_store[R]))
  → query_vec = normalize(α × graphsage_store[R] + (1-α) × preference_vec)
  → for each job C: score = cos(query_vec, graphsage_store[C])
  → sort by score descending → return top-k
  ← query_vec and preference_vec are discarded after the call
```

---

## Comparison to the Previous Approach

The previous code used a **per-candidate boost** at scoring time:

```python
# Old (O(I × N)):
for each candidate job C:
    score = cos(graphsage_store[R], graphsage_store[C])
    for each interacted job A:
        signal += cos(feature_store[C], feature_store[A]) × norm_w × recency
    score *= (1 + 0.5 × signal)
```

Problems with the old approach:
1. **O(I × N) cost**: 10 interactions × 10,000 jobs = 100,000 cosine similarity
   calculations per query
2. **Redundancy**: the GNN already shifted `graphsage_store[R]` toward Job A, so
   `cos(R, C)` already benefits from the A→C similarity; the boost double-counts it
3. **Not interpretable**: it's hard to explain why a job was recommended — is it the
   cosine score or the boost that made it rank high?

The preference vector approach:
1. **O(I + N) cost**: I cosines to build preference_vec, then N cosines to score
2. **No redundancy**: GNN provides structural/collaborative signal; preference_vec
   provides behavioral intent; they are combined once via α blend
3. **Interpretable**: `query_vec` is a single vector with clear geometric meaning

---

## Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Diverse history degrades preference_vec | Vector points at center of space | Cap to N most recent interactions |
| Fixed α doesn't adapt perfectly | Over/under-weights intent at boundaries | Use dynamic α formula |
| No cross-user signal in preference_vec | Misses "users like you also want X" | GraphSAGE covers this |
| GNN still uses EMA (slow to update) | Recent apply takes time to influence structural embedding | OK — preference_vec handles fast-moving intent; GNN handles slow-moving structure |

## Rollback

If the preference vector approach degrades recommendation quality:

1. Revert Steps 3, 4, 6 in `recommendation_service.py` (single git revert)
2. Keep Step 5 (Redis timestamp persistence) — harmless and useful for future
3. Keep tests if still relevant; remove preference-vector-specific ones

The old boost code is small enough to re-add if needed, or restored from git history.
