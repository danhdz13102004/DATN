# `recommendation_service.py` — Deep Dive

> **File path:** `ai-service/app/services/recommendation_service.py`
>
> This module is the **core brain** of the AI service. It owns:
> - An in-memory graph (nodes, embeddings, edges)
> - The soft-attribution pipeline for noisy click/save events
> - Local and global GraphSAGE inference
> - Job recommendation scoring

---

## Table of Contents

1. [Module-level In-Memory Stores](#1-module-level-in-memory-stores)
2. [Constants and Configuration](#2-constants-and-configuration)
3. [\_store\_edge\_metadata()](#3-_store_edge_metadata)
4. [Soft Attribution Helpers](#4-soft-attribution-helpers)
   - [compute\_similarity()](#41-compute_similarity)
   - [softmax()](#42-softmax)
   - [compute\_confidence()](#43-compute_confidence)
   - [get\_confidence\_level() and get\_weight\_multiplier()](#44-get_confidence_level-and-get_weight_multiplier)
   - [compute\_attributions()](#45-compute_attributions)
5. [add\_node()](#5-add_node)
6. [process\_application()](#6-process_application)
7. [handle\_interaction()](#7-handle_interaction)
8. [handle\_multi\_resume\_interaction()](#8-handle_multi_resume_interaction)
9. [\_run\_graphsage\_local()](#9-_run_graphsage_local)
10. [run\_graphsage\_global()](#10-run_graphsage_global)
11. [get\_recommendations()](#11-get_recommendations)
12. [Data Flow Summary](#12-data-flow-summary)

---

## 1. Module-level In-Memory Stores

```python
raw_node_store:    Dict[str, dict]         = {}
feature_store:     Dict[str, torch.Tensor] = {}
graphsage_store:   Dict[str, torch.Tensor] = {}
edge_store:        Dict[str, List[dict]]   = {}
edge_metadata:     Dict[str, dict]        = {}
job_to_users:      Dict[str, List[str]]    = {}
job_catalog:       List[str]               = []
job_catalog_index: Dict[str, int]          = {}
```

These are **module-level globals** (not class attributes). Because Python caches imported modules, a single copy of each dictionary is shared across **all requests** within one process. They act as an in-memory graph database.

| Variable | Key | Value | Purpose |
|---|---|---|---|
| `raw_node_store` | `node_id` | `{node_type, text_snippet, encoded}` | Metadata for every registered node. Always written first, before NLP encoding finishes. |
| `feature_store` | `node_id` | `torch.Tensor` shape `(768,)` | Raw NLP embeddings (MPNet output, L2-normalized). These are always the **GNN input**. |
| `graphsage_store` | `node_id` | `torch.Tensor` shape `(768,)` | GraphSAGE **output** embeddings. Used for recommendation scoring. Never fed back into the GNN. |
| `edge_store` | `resume_id` | `[{"job_id": str, "weight": float}, ...]` | Directed resume → job edges with accumulated behavioral weights. |
| `edge_metadata` | `"resume_id__job_id"` | `{confidence, action_type, ...}` | Metadata about how each edge was created (used for graph visualization). |
| `job_to_users` | `job_id` | `[resume_id, ...]` | Reverse index: which resumes have interacted with a job. Used to gather 2-hop neighbors during GraphSAGE inference. |
| `job_catalog` | _(list index)_ | `job_id` | Ordered list of all job node IDs. Allows iterating all jobs during scoring. |
| `job_catalog_index` | `job_id` | `int` | Maps job\_id → index in `job_catalog` for O(1) deduplication checks. |

**Why `raw_node_store` exists separately from `feature_store`:**
NLP encoding takes time (~50–200 ms). `raw_node_store` is written *immediately* so the graph snapshot API can show the node even before encoding finishes. `feature_store` is written only after the tensor is ready.

---

## 2. Constants and Configuration

### Edge Weight Mechanics

```python
MAX_EDGE_WEIGHT = 3.0   # hard cap per edge
DECAY           = 0.9   # applied before adding new weight
SMOOTHING_ALPHA = 0.7   # EMA blend ratio
```

- **`DECAY = 0.9`**: Every time a new interaction arrives on an existing edge, the current weight is multiplied by 0.9 first. This makes older interactions gradually less important than new ones (exponential decay).
- **`MAX_EDGE_WEIGHT = 3.0`**: After decay + increment, the weight is capped to prevent a single edge from becoming disproportionately large if a user interacts many times.
- **`SMOOTHING_ALPHA = 0.7`**: Exponential Moving Average (EMA) applied to resume embeddings after each GNN update. The formula is:

$$\text{smoothed} = 0.7 \times \text{old\_embedding} + 0.3 \times \text{new\_embedding}$$

### Interaction Weight Map

```python
ACTION_WEIGHT_MAP: Dict[str, float] = {
    "apply": 1.0,
    "save":  0.7,
    "click": 0.1,
}
```

Assigns a base edge weight to each user action. `apply` is the strongest signal (explicit intent), `click` is the weakest (implicit curiosity). To add a new action type, simply add an entry here — everything downstream picks it up automatically.

### Confidence Gating Thresholds

```python
CONFIDENCE_HIGH   = 0.7   # use weight normally
CONFIDENCE_MEDIUM = 0.4   # reduce weight by 50%
CONFIDENCE_LOW    = 0.0   # ignore the interaction

WEIGHT_MULTIPLIER_HIGH   = 1.0
WEIGHT_MULTIPLIER_MEDIUM = 0.5
WEIGHT_MULTIPLIER_LOW    = 0.0
```

These thresholds gate the **soft attribution** system. When a job-seeker account has multiple resumes, we don't know *which* resume caused a click. Confidence measures how clearly one resume stands out from the others. If confidence is too low, we discard the noisy signal entirely.

---

## 3. `_store_edge_metadata()`

```python
def _store_edge_metadata(resume_id: str, job_id: str, metadata: dict) -> None:
    key = f"{resume_id}__{job_id}"
    edge_metadata[key] = {
        **metadata,
        "resume_id": resume_id,
        "job_id": job_id,
    }
```

Builds a composite key `resume_id__job_id` and stores a metadata dict. The `**metadata` spread merges all fields from the caller, then appends the IDs. This is used purely for **graph visualization** — it does not affect scoring or GNN inference.

---

## 4. Soft Attribution Helpers

These helpers implement the **soft attribution pipeline**: given that a user clicked a job and has multiple resumes on their account, how do we distribute credit?

### 4.1 `compute_similarity()`

```python
def compute_similarity(resume_ids: List[str], job_id: str) -> List[float]:
```

**What it does:** Computes the cosine similarity between each resume's raw NLP embedding and the job's raw NLP embedding.

**Key implementation details:**

```python
sim = torch.nn.functional.cosine_similarity(resume_vec, job_vec, dim=0)
```

- Both `resume_vec` and `job_vec` are **1D tensors** of shape `(768,)`. The `dim=0` argument tells PyTorch to compute dot-product similarity along the embedding dimension (treating each tensor as a single vector, not a batch).
- Vectors stored in `feature_store` are **L2-normalized** (done in `add_node()`), so cosine similarity equals the dot product directly. The result is always in `[−1, 1]`, but since all vectors are positive in MPNet space, it's practically always in `[0, 1]`.
- `max(0.0, sim_val)` clamps any rare negative values to 0.

```python
if sim.numel() == 1:
    sim_val = sim.item()
else:
    sim_val = sim.mean().item()
```

`.numel()` returns the number of elements in the tensor. For 1D inputs with `dim=0`, `cosine_similarity` should always return a scalar, but this guard handles edge cases where the tensor has an unexpected extra dimension.

### 4.2 `softmax()`

```python
def softmax(similarities: List[float], temperature: float = 1.0) -> List[float]:
    sim_tensor = torch.tensor(similarities, dtype=torch.float32) / temperature
    max_val = sim_tensor.max()
    exp_scores = torch.exp(sim_tensor - max_val)
    probabilities = exp_scores / exp_scores.sum()
    return probabilities.tolist()
```

**Softmax formula:**

$$P(i) = \frac{e^{s_i / T}}{\sum_j e^{s_j / T}}$$

where $s_i$ is the similarity score for resume $i$ and $T$ is the temperature.

**Why subtract `max_val` before `exp()`?**
This is the standard **numerical stability trick**. Without it, large similarity values would cause `exp()` to overflow to `inf`. Subtracting the maximum does not change the result (the constant cancels in numerator and denominator) but keeps all exponent inputs ≤ 0, so `exp()` never exceeds 1.

**Temperature effect:** Higher temperature (e.g. 2.0) makes the distribution more uniform (all resumes get similar probability). Lower temperature (e.g. 0.1) sharpens it (winner-takes-all). Default 1.0 is standard softmax.

### 4.3 `compute_confidence()`

```python
def compute_confidence(probabilities: List[float]) -> float:
    return float(max(probabilities))
```

Confidence is defined as the **maximum probability** in the softmax output. Intuition: if one resume has probability 0.95, we're very confident it's the relevant one. If all resumes have equal probability (e.g. 0.25 each for 4 resumes), confidence is only 0.25 — we have no idea which resume caused the click.

### 4.4 `get_confidence_level()` and `get_weight_multiplier()`

Simple threshold functions that convert a raw float confidence into a categorical level and its corresponding multiplier:

```
confidence >= 0.7  →  "high"   →  multiplier 1.0  (full weight)
confidence >= 0.4  →  "medium" →  multiplier 0.5  (half weight)
confidence <  0.4  →  "low"    →  multiplier 0.0  (ignore)
```

### 4.5 `compute_attributions()`

```python
def compute_attributions(resume_ids, job_id, event_weight) -> tuple[List[dict], float, float]:
```

**The full pipeline:**

```
resume_ids  →  compute_similarity()  →  softmax()  →  compute_confidence()
                                                              │
                                              get_weight_multiplier()
                                                              │
                               for each resume:
                               final_weight = event_weight × weight_multiplier × prob_i
```

**Special case — single resume:**

```python
if len(resume_ids) == 1:
    single_prob = 1.0
    confidence = 1.0
```

When there's only one resume, skip the similarity computation entirely and assign confidence = 1.0 with full weight. This avoids unnecessary computation and always results in the edge being created.

**Low confidence short-circuit:**

```python
if confidence_level == "low":
    # return all attributions with final_weight=0.0, edge_created=False
    return attributions, 0.0, confidence
```

If confidence is too low, return immediately with zero weights. No edges are created, no GNN update is run. This is a deliberate early exit to avoid polluting the graph with noisy signals.

**Output structure per attribution:**

```python
{
    "resume_id": str,
    "attribution_probability": float,   # softmax prob for this resume
    "confidence": float,                # max prob across all resumes
    "final_weight": float,              # the actual edge weight increment
    "edge_created": bool,               # True if final_weight > 0
}
```

---

## 5. `add_node()`

```python
def add_node(node_id: str, text: str, node_type: str, nlp_model, device) -> dict:
```

Registers a resume or job node into the in-memory graph. This is a two-phase operation:

### Phase 1: Register metadata immediately

```python
raw_node_store[node_id] = {
    "node_type":    node_type,
    "text_snippet": text_snippet,
    "encoded":      False,
}
if node_type == "job" and node_id not in job_catalog_index:
    job_catalog_index[node_id] = len(job_catalog)
    job_catalog.append(node_id)
    graph_store.persist_job_catalog(node_id)

graph_store.persist_node(node_id, node_type, text_snippet)
```

The node is visible to the graph snapshot API immediately. If it's a job, it's added to `job_catalog` and `job_catalog_index` and persisted to Redis. The check `node_id not in job_catalog_index` prevents duplicates from multiple add calls.

### Phase 2: NLP encoding

```python
vec_np = nlp_model.encode([text], convert_to_numpy=True)
vec = torch.tensor(vec_np, dtype=torch.float32).squeeze(0).to(device)
vec = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)
```

Step by step:

1. `nlp_model.encode([text], convert_to_numpy=True)` — Runs the sentence transformer (MPNet) on the text. Returns a numpy array of shape `(1, 768)` (batch size 1, embedding dim 768).
2. `torch.tensor(...).squeeze(0)` — Converts to a PyTorch tensor and removes the batch dimension → shape `(768,)`.
3. `.to(device)` — Moves the tensor to CPU or GPU.
4. `F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)` — L2-normalizes the vector:
   - `unsqueeze(0)` adds a batch dim back → `(1, 768)` so `F.normalize` can work along `dim=1`
   - `p=2` means L2 norm (Euclidean norm)
   - `squeeze(0)` removes the batch dim again → back to `(768,)`
   - After this, `‖vec‖ = 1.0`, making cosine similarity equal to the dot product

```python
feature_store[node_id]   = vec
graphsage_store[node_id] = vec.clone()
raw_node_store[node_id]["encoded"] = True
```

Both stores are initialized to the same raw NLP embedding. `graphsage_store` will be overwritten by GNN output after the first interaction; until then, recommendations fall back to pure NLP similarity. `.clone()` ensures the two stores hold independent tensors (modifying one won't affect the other).

---

## 6. `process_application()`

```python
def process_application(resume_id, job_id, weight, graphsage_model, device) -> dict:
```

Updates the in-memory graph after an interaction and re-runs GraphSAGE for the affected resume.

### Step 1: Accumulate edge weight

```python
edges = edge_store.setdefault(resume_id, [])
for edge in edges:
    if edge["job_id"] == job_id:
        edge["weight"] *= DECAY
        edge["weight"] = min(edge["weight"] + weight, MAX_EDGE_WEIGHT)
        break
else:
    edges.append({"job_id": job_id, "weight": weight})
```

The `for...else` construct: the `else` block runs only if the loop finished **without hitting a `break`**. So if the job was not found in existing edges, a new edge is created. If found, the existing edge is decayed then incremented.

Why decay before adding? If a user applied to a job 10 times, the 10th application should contribute less than the 1st — the information value diminishes. The sequence for repeated interactions:

```
Start:        0.0
After 1st:    0.0 × 0.9 + 1.0 = 1.0
After 2nd:    1.0 × 0.9 + 1.0 = 1.9
After 3rd:    1.9 × 0.9 + 1.0 = 2.71  (capped at 3.0)
```

### Step 2: Update reverse index

```python
users_for_job = job_to_users.setdefault(job_id, [])
if resume_id not in users_for_job:
    users_for_job.append(resume_id)
    graph_store.persist_job_users(job_id, resume_id)
```

`job_to_users` is used during GraphSAGE inference to find **2-hop neighbors**: other resumes that applied to the same job. Checked for existence before adding to avoid duplicates.

### Step 3: Gather job features (1-hop neighbors)

```python
job_features = [
    feature_store[e["job_id"]]
    for e in edges
    if e["job_id"] in feature_store
]
```

Collect raw NLP embeddings (`feature_store`, NOT `graphsage_store`) for all jobs this resume has applied to. This is the **1-hop neighborhood** of the resume node.

**Critical design decision:** Always use `feature_store` (raw NLP) as GNN input, never `graphsage_store` (GNN output). Feeding GNN outputs back as GNN inputs would cause the embeddings to drift further and further from the training distribution with every update — a form of **embedding collapse**.

### Step 4: Gather 2-hop neighbors (similar users)

```python
MAX_USERS_PER_JOB = 3
similar_users: List[str] = []
similar_users_per_job: List[List[str]] = []
seen: set = set()
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

For each job the current resume applied to, find up to 3 other resumes that also applied. These are **2-hop neighbors** — resumes connected to ours through shared job interests.

- `seen` prevents the same resume from appearing twice in `similar_users` even if it applied to multiple shared jobs.
- `similar_users_per_job` preserves the per-job grouping, needed to build correct `job ↔ user` edges (rather than `resume ↔ user` edges, which don't exist in the training graph).
- The cap of 3 per job limits subgraph size to prevent quadratic blowup when popular jobs have thousands of applicants.

### Step 5: Run local GraphSAGE

```python
updated_all = _run_graphsage_local(...)
updated_resume_vec = updated_all[0]
```

See [section 9](#9-_run_graphsage_local) for details. Returns a `(N, 768)` tensor where row 0 is the updated resume embedding.

### Step 6: Write job embeddings

```python
valid_job_edges = [e for e in edges if e["job_id"] in feature_store]
for j_idx, edge in enumerate(valid_job_edges):
    if j_idx + 1 < updated_all.shape[0]:
        graphsage_store[edge["job_id"]] = updated_all[1 + j_idx]
```

The GNN also produces updated embeddings for job nodes. Written to `graphsage_store` for future recommendation scoring. Index `1 + j_idx` maps to the correct row because the subgraph node layout is `[resume, job_0, job_1, ..., user_0, ...]`.

### Step 7: EMA smoothing on resume embedding

```python
old_vec = graphsage_store.get(resume_id, updated_resume_vec)
blended = SMOOTHING_ALPHA * old_vec + (1 - SMOOTHING_ALPHA) * updated_resume_vec
smoothed_vec = F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)
graphsage_store[resume_id] = smoothed_vec
```

The new GNN output is blended with the previous embedding:

$$\text{smoothed} = 0.7 \times \text{old} + 0.3 \times \text{new}$$

After blending, the vector is **re-normalized** to unit length. This is important because the EMA of two unit vectors is generally not a unit vector. Re-normalizing ensures all embeddings in `graphsage_store` have consistent magnitude, so cosine similarity scores remain meaningful.

---

## 7. `handle_interaction()`

```python
def handle_interaction(resume_id, job_id, action_type, graphsage_model, device) -> dict:
```

The single-resume interaction handler. Used for **apply events** where the exact resume is always known (the user explicitly submitted a resume to a job).

**Steps:**

1. Validate `action_type` is in `ACTION_WEIGHT_MAP`, raise `ValueError` if not.
2. Look up `weight = ACTION_WEIGHT_MAP[action_type]`.
3. `graph_store.persist_edge(resume_id, job_id, weight)` — write edge increment to Redis.
4. `_store_edge_metadata(...)` — record confidence = 1.0 (apply is a ground-truth signal, always attributed to the explicit resume).
5. Call `process_application()` to update in-memory graph and run GNN.
6. Return a dict with `action_type` and `weight` appended to the result.

---

## 8. `handle_multi_resume_interaction()`

```python
def handle_multi_resume_interaction(resume_ids, job_id, action_type, graphsage_model, device) -> dict:
```

The multi-resume handler. Used for **click and save events** where the platform knows the user but may have multiple resumes.

### Guard clauses

```python
if action_type == "apply":
    raise ValueError("Use handle_interaction() for apply events.")
if action_type not in ACTION_WEIGHT_MAP:
    raise ValueError(...)
for resume_id in resume_ids:
    if resume_id not in feature_store:
        raise ValueError(f"Resume '{resume_id}' not found in feature store.")
```

Fail fast with clear error messages. Apply events are rejected because they must never go through soft attribution.

### High-confidence strategy

```python
if confidence_level == "high":
    best_attr = max(attributions, key=lambda a: a["attribution_probability"])
    for attr in attributions:
        if attr["resume_id"] == best_resume_id:
            attr["final_weight"] = event_weight   # full weight for winner
            attr["edge_created"] = True
        else:
            attr["final_weight"] = 0.0
            attr["edge_created"] = False
    attributions = [best_attr]
```

When confidence ≥ 0.7, one resume clearly stands out. Instead of splitting the weight proportionally, the system assigns the **full** `event_weight` to the winning resume (winner-takes-all). This avoids dilution — e.g. `0.8 × 0.1 = 0.08` stored instead of the full `0.1`.

### Processing attributed edges

```python
for attr in attributions:
    if attr["edge_created"]:
        graph_store.persist_edge(resume_id, job_id, final_weight)
        _store_edge_metadata(...)
        process_application(...)
```

Only edges where `edge_created = True` go through the full pipeline. Low-confidence interactions have all `edge_created = False` and are silently dropped.

---

## 9. `_run_graphsage_local()`

```python
def _run_graphsage_local(
    resume_id, job_features, user_features, edge_store_snapshot,
    similar_users, similar_users_per_job, graphsage_model, device
) -> torch.Tensor:
```

Builds a **local 2-hop subgraph** around a single resume and runs one GNN forward pass. This is an approximation of full-graph inference but runs in milliseconds per request.

### Node layout

```
x_local index:    [0]          [1 .. num_jobs]       [num_jobs+1 .. N-1]
                  resume        1-hop jobs              2-hop other resumes
```

```python
resume_vec = feature_store[resume_id]
all_nodes  = [resume_vec] + job_features + user_features
x_local = torch.stack(all_nodes, dim=0).to(device)  # (N, 768)
```

`torch.stack` takes a list of 1D tensors of shape `(768,)` and stacks them into a 2D tensor of shape `(N, 768)`. Each row is a node.

### Edge index format

PyTorch Geometric (PyG) represents graphs as an `edge_index` tensor of shape `(2, num_edges)`:
- Row 0: source node indices
- Row 1: destination node indices

```python
edge_index = (
    torch.tensor(local_edges, dtype=torch.long)
    .t()
    .contiguous()
    .to(device)
)
```

`local_edges` is a Python list of `[src, dst]` pairs — shape `(num_edges, 2)`. `.t()` transposes it to `(2, num_edges)`. `.contiguous()` ensures the memory layout is C-contiguous (required by PyG).

### Fused edge weight formula — resume ↔ job

```python
cos_sim = float(F.cosine_similarity(resume_vec.unsqueeze(0), job_vec.unsqueeze(0)).item())
sem_w   = cos_sim ** 2
beh_w   = min(edge["weight"] / MAX_EDGE_WEIGHT, 1.0)
w       = max(sem_w * beh_w, 1e-4)
```

**Semantic weight (`sem_w`):** Squared cosine similarity. Squaring has a **sharpening effect**: values near 1 stay near 1, but weak similarities near 0 are pushed even lower. For example:

- `cos_sim = 0.9` → `sem_w = 0.81` (strong signal preserved)
- `cos_sim = 0.3` → `sem_w = 0.09` (weak signal strongly suppressed)

**Behavioral weight (`beh_w`):** The accumulated interaction weight normalized to `[0, 1]`.

**Fused weight:** `sem_w × beh_w`. An edge is only strong if *both* the resume semantically matches the job *and* the user has actually interacted with it.

**Floor `1e-4`:** Prevents isolated nodes from receiving zero attention in GNN aggregation. Without this, a zero-weight edge would mean the node receives no information from its neighbor.

Edges are bidirectional: `[[0, j], [j, 0]]` adds both directions.

### Edge weight formula — job ↔ user (2-hop)

```python
cos_sim = float(F.cosine_similarity(job_vec.unsqueeze(0), user_vec.unsqueeze(0)).item())
w = max(cos_sim ** 2, 1e-4)
```

No behavioral weight here — 2-hop edges use **semantic weight only**. There is no direct interaction signal between the target resume and these 2-hop users; semantic similarity between the job and the other user's resume is the best available proxy.

### Why no resume ↔ user edges?

The GNN was trained on a bipartite graph: resumes and jobs, with edges only between them (no resume–resume or user–user edges). Adding resume ↔ user edges at inference time would put the GNN into an out-of-distribution input regime, producing unreliable embeddings.

### Forward pass

```python
graphsage_model.eval()
with torch.no_grad():
    updated = graphsage_model(x_local, edge_index, edge_weight)
```

- `model.eval()` disables dropout and batch normalization's training behavior.
- `torch.no_grad()` disables gradient computation, reducing memory usage and speeding up inference.
- Returns `(N, 768)` — updated embeddings for all nodes in the subgraph.

### Cold-start (no neighbors)

```python
if len(all_nodes) == 1:
    return resume_vec.unsqueeze(0)   # (1, 768)
```

If a resume has no edges yet (first interaction is being processed), the subgraph has only the resume itself. The GNN is skipped entirely and the raw NLP embedding is returned wrapped in a 2D tensor. The caller always accesses `updated_all[0]`, so this is compatible.

---

## 10. `run_graphsage_global()`

```python
def run_graphsage_global(graphsage_model, device) -> int:
```

Unlike `_run_graphsage_local()` which only updates one resume at a time, this function runs **one forward pass over the entire graph**, updating all node embeddings simultaneously.

**When it runs:**

- `POST /api/v1/graph/refresh` (on-demand)
- 24-hour background scheduler in `main.py`

**Why it's needed:**

- **Cold-start jobs**: A newly added job has never been in a local subgraph. Without global refresh, its `graphsage_store` embedding is just the raw NLP vector. After a global refresh, it gets a GNN-updated embedding that reflects the full graph structure.
- **Consistency**: Local updates create embeddings in slightly different subgraph contexts. A global refresh brings all nodes into the same GNN output space.

**Implementation pattern:**

```python
node_ids = list(feature_store.keys())
node_idx = {nid: i for i, nid in enumerate(node_ids)}
x = torch.stack([feature_store[nid] for nid in node_ids], dim=0).to(device)
```

All nodes are indexed and stacked into a single `(N, 768)` tensor. Edges are built from `edge_store` using the same fused semantic × behavioral formula as the local version.

```python
for i, nid in enumerate(node_ids):
    graphsage_store[nid] = updated[i]
```

After the forward pass, **all** `graphsage_store` entries are overwritten with globally-consistent embeddings.

---

## 11. `get_recommendations()`

```python
def get_recommendations(resume_id, top_k, device, excluded_job_ids=None) -> dict:
```

Scores all jobs in `job_catalog` against the resume and returns the top-k.

### Embedding retrieval

```python
resume_vec = graphsage_store.get(resume_id)
if resume_vec is None:
    raise ValueError(...)
```

Uses `graphsage_store`, not `feature_store`. Recommendations reflect the graph-informed embedding, not just raw text similarity. For a new resume with no interactions, `graphsage_store` contains the same vector as `feature_store` (initialized in `add_node`).

### Diagnostic logging

```python
resume_norm = float(resume_vec.norm().item())
has_edges   = resume_id in edge_store and len(edge_store[resume_id]) > 0
```

Logs the L2 norm and edge status before scoring. A `resume_norm` significantly different from 1.0 would indicate a normalization bug. Logging `has_edges` distinguishes cold-start (pure NLP similarity) from graph-informed recommendations.

### Deduplication loop

```python
seen: set = set()
for job_id in job_catalog:
    if job_id in seen:
        continue
    seen.add(job_id)
    if job_id in excluded_set:
        skipped_excluded += 1
        continue
    ...
```

`job_catalog` is a list that could theoretically contain duplicates (e.g. if the same job was registered twice via the sync script). The `seen` set deduplicates before scoring, ensuring each job is scored at most once.

### Scoring

```python
sim_raw = torch.nn.functional.cosine_similarity(resume_vec, job_vec, dim=0)
score   = float(sim_raw.item())
```

Both `resume_vec` and `job_vec` are 1D `(768,)` tensors. `dim=0` computes a single cosine similarity scalar. Both are L2-normalized, so scores are in `[−1, 1]` theoretically, but practically in `[0, 1]` for MPNet embeddings.

### Sorting and output

```python
scored_jobs.sort(key=lambda x: x[1], reverse=True)
recommendations = [
    {"job_id": jid, "score": score}
    for jid, score in scored_jobs[:top_k]
]
```

Standard descending sort. Top-k slicing is O(1) since the list is already sorted. The score is returned as-is (not rounded) to give the caller full precision.

---

## 12. Data Flow Summary

```
User Action (click / save / apply)
         │
         ▼
handle_interaction()  OR  handle_multi_resume_interaction()
         │
         ├── Soft Attribution (multi-resume only)
         │     ├── compute_similarity()    → raw NLP cosine sims
         │     ├── softmax()              → probability distribution
         │     └── compute_confidence()   → gating decision
         │
         ├── graph_store.persist_edge()  → write to Redis
         │
         └── process_application()
               ├── Accumulate edge weight (decay + cap)
               ├── Update job_to_users (reverse index)
               ├── Gather job features from feature_store  (1-hop)
               ├── Gather user features from feature_store (2-hop)
               ├── _run_graphsage_local()
               │     ├── Build x_local (stack node vectors)
               │     ├── Build edge_index + edge_weight (fused formula)
               │     └── GNN forward pass → (N, 768)
               ├── Write job embeddings  → graphsage_store
               └── EMA smooth + renormalize resume → graphsage_store


User Request: "show me jobs"
         │
         ▼
get_recommendations()
         ├── Load resume_vec from graphsage_store
         ├── For each job_id in job_catalog:
         │     └── cosine_similarity(resume_vec, job_vec)
         ├── Sort descending
         └── Return top-k
```

### Store roles recap

| Store | Written by | Read by | Must NEVER be |
|---|---|---|---|
| `feature_store` | `add_node()` | GNN input code | Fed back to GNN as output |
| `graphsage_store` | `process_application()`, `run_graphsage_global()`, `add_node()` (init) | `get_recommendations()`, EMA smoothing | Used as GNN input |
| `edge_store` | `process_application()` | `_run_graphsage_local()`, `run_graphsage_global()` | — |
| `job_to_users` | `process_application()` | `process_application()` (2-hop gathering) | — |
