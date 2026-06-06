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
