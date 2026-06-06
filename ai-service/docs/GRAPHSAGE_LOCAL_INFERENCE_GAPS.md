# GraphSAGE Local Inference — Training vs Service Gaps

This document explains the differences between how GraphSAGE is used in the
training notebook and how it is applied in the production service
(`recommendation_service.py`), why each difference matters, and the exact fix
applied to each one.

---

## Background: How GraphSAGE Works

### During Training (the notebook)

```python
# All nodes + all edges are in memory at once
x_features = cat([resume_embeddings, job_embeddings])   # shape: (N_total, 768)
out = model(x_features, full_edge_index)                # one forward pass on entire graph
```

Inside `SAGEConv`, for every node `v`:

```
h_v^(1) = W_self · h_v^(0)  +  W_neigh · mean( h_u^(0)  for u in neighbors(v) )
```

- `h_v^(0)` is the **raw, L2-normalised NLP embedding** of node `v`.
- `W_self` and `W_neigh` are the **learned weight matrices** stored in the checkpoint.
- With 2 layers, every node's final embedding encodes up to **2-hop** structural information.

### At Inference (the service)

Running the full graph on every API request is impractical. Instead the service
builds a small **local subgraph** around the target resume and runs the same model
on it. This is the standard *inductive* inference pattern for GraphSAGE — the
model weights generalise to any subgraph because they learned aggregation
functions, not per-node embeddings.

The problem is that the original implementation had **4 gaps** between what the
model was trained to expect and what the service actually fed it.

---

## Gap 1 — Spurious Resume↔User Edges

### What the training graph looks like

```
resume_A ──── job_X ──── resume_B
resume_A ──── job_Y ──── resume_C
```

Only **resume↔job** edges exist. There are no direct resume↔resume edges.

### What the old service built

```python
# ✓ correct — resume↔job edges
for i in range(num_jobs):
    local_edges += [[0, j], [j, 0]]

# ✗ WRONG — resume↔user edges that never existed during training
for i in range(num_users):
    local_edges += [[0, u], [u, 0]]   # ← this loop

# ✓ correct — job↔user edges
local_edges += [[j, u], [u, j]]
```

### Why it matters

`SAGEConv` for the resume node averages over **all** its neighbours in the
edge list. During training, a resume's neighbours were exclusively jobs.  Adding
similar-user nodes as direct neighbours changes the mean that `W_neigh` operates
on. `W_neigh` was never optimised to handle other resumes as direct neighbours of
the target resume — the result is a wrong direction in the hidden space after
Layer 1, which propagates and worsens through Layer 2.

### Fix applied

Removed the spurious `for i in range(num_users)` loop.  The local graph now
only has the two edge types that exist in the training graph:

```
resume ↔ job     (1-hop)
job    ↔ user    (2-hop)
```

---

## Gap 2 — GNN Outputs Recycled as GNN Inputs (Compounding Drift)

### What the old service did (introduced in a previous fix)

```python
# Building job features for the GNN forward pass:
job_features = [
    graphsage_store.get(job_id, feature_store[job_id]) ...  # ← pulls GNN output!
]

# After the forward pass, the GNN output is stored:
graphsage_store[job_id] = updated_all[1 + j_idx]   # GNN output

# Next interaction for any resume that applied to this job:
# the stored GNN output becomes the next GNN input ↑
```

### Why it matters

Think of the GNN as a function:

```
f(raw_NLP) → GNN_embedding
```

The model was trained so that:
- **input space**  = raw L2-normalised NLP embeddings (768-d unit vectors)
- **output space** = GNN embeddings (different distribution, not unit vectors)

When you feed `GNN_embedding` back as input on the next call:

```
Interaction 1:  f(NLP)              → GNN_out_1
Interaction 2:  f(GNN_out_1)        → GNN_out_2   ← input is now wrong space
Interaction 3:  f(GNN_out_2)        → GNN_out_3   ← drift is worse
...
```

The weight matrices `W_self` and `W_neigh` were tuned for unit-norm NLP
vectors.  GNN outputs have a different norm and different angular distribution.
Each call amplifies the error because the output drifts further from the
distribution the model was calibrated on.

### The rule

| Store | Purpose | Used as GNN input? |
|---|---|---|
| `feature_store` | Raw NLP embeddings — the source of truth | **Always** |
| `graphsage_store` | GNN outputs — used only for scoring | **Never** |

### Fix applied

Both `job_features` and `user_features` now exclusively pull from `feature_store`:

```python
job_features = [
    feature_store[e["job_id"]]    # raw NLP — always
    for e in edges
    if e["job_id"] in feature_store
]

user_features = [
    feature_store[u]              # raw NLP — always
    for u in similar_users
    if u in feature_store
]
```

`graphsage_store` is still written to after inference (for recommendation scoring),
but it is never read as a GNN input again.

---

## Gap 3 — Pre-Weighted Node Features Distort the Input Distribution

### What SAGEConv actually does with node features

```
mean( h_u  for u in neighbors(v) )
```

The mean is over the **raw node feature vectors**. Edge weights do not exist in
the original GraphSAGE formulation and were not used during training.

### What the old service did

```python
total_weight = sum(e["weight"] for e in edges) or 1.0
job_features = [
    feature_store[job_id] * (edge["weight"] / total_weight)   # ← scales down!
    for e in edges
]
```

For example, if a resume applied to 3 jobs with equal weights, each job vector
was multiplied by `0.33`.  The L2 norm of the input dropped from `1.0` to
`0.33`.

### Why it matters

The learned matrices `W_neigh` expect inputs with norm ≈ 1.0 (unit-norm
NLP vectors). When the input norm is `0.33`, the linear activation
`W_neigh · h_u` is also scaled down by `0.33`. After the ReLU and the residual
connection the magnitude mismatch cascades through both layers. The final
embedding ends up in a different region of the output space than what the model
was trained to produce, which hurts cosine similarity scoring at recommendation
time.

### Fix applied

Raw, unscaled embeddings are passed:

```python
job_features = [
    feature_store[e["job_id"]]    # unit-norm, no scaling
    for e in edges
    if e["job_id"] in feature_store
]
```

Edge weights are still accumulated in `edge_store` (for interaction history and
persistence) but they no longer touch the GNN input features.

---

## Gap 4 — 2-Hop Neighbors Were Not Correctly Scoped Per Job

### How a 2-layer GraphSAGE uses 2-hop neighbors

```
Layer 1:  job_X aggregates from  { resume_A, resume_B, resume_C }
Layer 2:  resume_A aggregates from { job_X (which already encoded B and C) }
```

This is why 2-layer GraphSAGE captures structural patterns two hops away.  For
this to work, each **job** node needs to see the resumes that are *its own
neighbours* — not a mixed pool of all similar users across all jobs.

### What the old service did

```python
# All similar users collected into one flat list, no ownership information
similar_users: List[str] = []
for edge in edges:
    for other in job_to_users.get(edge["job_id"], []):
        similar_users.append(other)

# In _run_graphsage_local: job↔user edges re-checked at runtime
for k, u_id in enumerate(similar_users):
    if u_id in job_to_users.get(eid, []):   # ← runtime lookup, brittle
        local_edges += [[j, u], [u, j]]
```

Problems with this approach:
1. The runtime `job_to_users` lookup and the `similar_users` list could get out
   of sync if the data changed between collection and edge building.
2. Users at the cap limit might belong to the wrong job, silently giving a job
   node the wrong 2-hop neighbourhood.
3. There was no per-job cap, so popular jobs dominated the pool.

### Fix applied

`similar_users_per_job` is now built alongside `similar_users` as a
list-of-lists where index `i` holds exactly the neighbours of job `i`:

```python
MAX_USERS_PER_JOB = 3
similar_users_per_job: List[List[str]] = []

for edge in edges:
    job_neighbors: List[str] = []
    for other in job_to_users.get(edge["job_id"], []):
        if other != resume_id and other not in seen:
            seen.add(other)
            similar_users.append(other)
            job_neighbors.append(other)
            if len(job_neighbors) >= MAX_USERS_PER_JOB:
                break
    similar_users_per_job.append(job_neighbors)
```

In `_run_graphsage_local`, edges are built by zipping:

```python
for i, (edge, job_neighbors) in enumerate(zip(valid_job_edges, similar_users_per_job)):
    j = 1 + i
    for u_id in job_neighbors:
        if u_id in user_local_idx:
            u = user_local_idx[u_id]
            local_edges += [[j, u], [u, j]]
```

Each job now connects to exactly the users the service collected for it.

---

## Summary

| Gap | Root Cause | Impact | Fixed By |
|---|---|---|---|
| **1** Spurious resume↔user edges | Wrong edge types in local graph | Layer 1 aggregation in wrong direction | Removed the loop adding `[0, u]` edges |
| **2** GNN output recycled as GNN input | `graphsage_store` used as GNN input | Compounding drift worsens every interaction | Always read `feature_store` for GNN inputs |
| **3** Pre-weighted node features | Edge weights applied to node vectors | Input norm ≠ 1.0; activations in wrong range | Pass raw unscaled `feature_store` vectors |
| **4** Unsorted 2-hop pool | Global `similar_users` list, no per-job ownership | Jobs see wrong neighbours in Layer 2 | `similar_users_per_job` list-of-lists, zipped |

---

## The Two-Store Contract (Key Rule Going Forward)

```
feature_store[node_id]   = raw NLP embedding  →  GNN INPUT  (read-only, never modified after add_node)
graphsage_store[node_id] = GNN output         →  SCORING    (written after every GNN pass, never fed back as input)
```

Breaking this contract is the single most damaging mistake possible in this
architecture because it causes silent, hard-to-debug drift that compounds with
every user interaction.

---

## Remaining Known Approximation (Not a Bug)

The local subgraph will always be smaller than the full training graph. During
training, job nodes saw **all** resumes that ever applied to them. In the service
they see at most `MAX_USERS_PER_JOB = 3`. This is an unavoidable production
trade-off — running the full graph on every request is not feasible. The EMA
smoothing (`SMOOTHING_ALPHA = 0.7`) on the resume embedding reduces the variance
introduced by this approximation.
