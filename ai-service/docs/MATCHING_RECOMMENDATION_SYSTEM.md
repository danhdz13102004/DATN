# AI Service — Matching & Recommendation System

> This document is the authoritative technical reference for the AI service's matching and job recommendation engine. Every algorithm, formula, data structure, and API call described here is directly traceable to the source code.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [ML Models & the Model Registry](#2-ml-models--the-model-registry)
3. [Two-Stage Architecture: Matching vs. Recommendation](#3-two-stage-architecture-matching-vs-recommendation)
4. [NLP Embeddings — How Text Becomes Vectors](#4-nlp-embeddings--how-text-becomes-vectors)
5. [Graph Structure & In-Memory Stores](#5-graph-structure--in-memory-stores)
6. [Graph Persistence Layer (Redis)](#6-graph-persistence-layer-redis)
7. [Node Registration — `POST /api/v1/add_node`](#7-node-registration--post-apiv1add_node)
8. [Interaction Tracking — `POST /api/v1/interact`](#8-interaction-tracking--post-apiv1interact)
9. [Soft Attribution Pipeline — Multi-Resume Events](#9-soft-attribution-pipeline--multi-resume-events)
10. [GraphSAGE Embedding Update — `_run_graphsage_local`](#10-graphsage-embedding-update--_run_graphsage_local)
11. [Job Recommendations — `GET /api/v1/recommend/{resume_id}`](#11-job-recommendations--get-apiv1recommendreferrer_id)
12. [Deep Matching — `POST /api/v1/match`](#12-deep-matching--post-apiv1match)
13. [Startup & Graph Restoration](#13-startup--graph-restoration)
14. [Graph Visualization API — `GET /api/v1/graph/*`](#14-graph-visualization-api--get-apiv1graph)
15. [Complete Data Flow Diagrams](#15-complete-data-flow-diagrams)
16. [API Quick Reference](#16-api-quick-reference)

---

## 1. System Overview

The AI service is a **FastAPI** microservice that provides two complementary functions for a job marketplace:

| Function | What it does | Key file |
|---|---|---|
| **Matching** | Scores a single resume against a single job description on multiple dimensions | `app/ml/matching.py` |
| **Recommendation** | Ranks all available jobs for a given resume using graph-enhanced embeddings | `app/services/recommendation_service.py` |

Both functions share the same underlying NLP embedding model but differ in how they use it. Matching is a **one-shot comparative scoring** against structured resume/job fields. Recommendation is a **collaborative-filtering-style graph propagation** that propagates user signals through a bipartite resume–job interaction graph.

The system maintains a **bipartite graph** in memory (with Redis persistence):

```
Resume Node ──(weight)──► Job Node
     ▲                       │
     │                       │
     └──── similar users ────┘
```

---

## 2. ML Models & the Model Registry

### 2.1 Model Registry Singleton

**File:** `app/ml/model_registry.py`

The `ModelRegistry` class holds all ML models as a singleton, loaded once during FastAPI's lifespan startup and shared across all HTTP requests.

```41:52:app/ml/model_registry.py
class ModelRegistry:
    """Holds all loaded ML models. Loaded once at startup, shared across requests."""

    def __init__(self):
        self._models:    Dict[str, Any] = {}
        self._is_loaded: bool           = False
        self._version:   str            = settings.model_version
        self._device:    torch.device   = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )
```

**Startup sequence** (in `main.py` lifespan):

```28:53:app/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Load ML models
    model_registry.load_models()

    # 2. Restore graph from Redis (after models loaded so we can re-encode)
    if graph_store.ping():
        graph_store.restore_graph(...)
```

### 2.2 Models Loaded

**1. NLP Model — SentenceTransformer**

Path: `settings.model_path / "finetuned_mpnet_job_matcher"`

A fine-tuned `all-mpnet-base-v2` SentenceTransformer model that maps text strings to 768-dimensional dense vectors. Used for:
- Encoding raw resume/job text into vector embeddings during node registration
- Cosine similarity scoring in the matching module
- Cosine similarity scoring in the recommendation service

**2. GraphSAGE Model — Custom PyTorch-Geometric**

Path: `settings.model_path / "graphsage_recommender.pt"`

```23:36:app/ml/model_registry.py
class GraphSAGE_Recommender(nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        x0 = x
        x  = self.conv1(x, edge_index)
        x  = F.relu(x)
        x  = F.dropout(x, p=0.1, training=self.training)
        x  = self.conv2(x, edge_index)
        x  = x + x0       # residual connection
        return F.normalize(x, p=2, dim=1)
```

- **Architecture:** Two-layer GraphSAGE with `SAGEConv` layers, ReLU activation, 10% dropout, and a residual skip connection
- **Output:** L2-normalized embeddings of the same dimension as input (768)
- **Purpose:** Propagate collaborative signals through the resume–job interaction graph

### 2.3 Graceful Degraded Mode

If model files are missing at startup, `is_loaded` stays `False`. Nodes can still be registered (metadata is stored), but all ML endpoints return HTTP 503. The Redis graph persistence continues to work.

---

## 3. Two-Stage Architecture: Matching vs. Recommendation

These two pipelines serve different use cases:

### Matching Pipeline (`/api/v1/match`)

```
Resume (structured fields) + Job (structured fields)
        │
        ▼
┌─────────────────────────────────┐
│  6-Dimension Hybrid Scoring     │
│  • skills (0.40)                │
│  • experience (0.20)            │
│  • role (0.10)                  │
│  • seniority (0.15)             │
│  • industry (0.10)              │
│  • nice_to_have (0.05, bonus)   │
└─────────────────────────────────┘
        │
        ▼
  Overall score [0, 1]
```

- Triggered when a **candidate views a specific job** (on-demand)
- Does NOT modify the graph
- Returns per-dimension breakdowns

### Recommendation Pipeline (`/api/v1/recommend/{resume_id}`)

```
Resume node + All job nodes in job_catalog
        │
        ▼
┌────────────────────────────────────┐
│  Cosine similarity scoring         │
│  using GraphSAGE-updated           │
│  resume embedding                  │
└────────────────────────────────────┘
        │
        ▼
  Ranked list of job IDs with scores
```

- Triggered when a **candidate opens their recommendation feed**
- Uses graph-enhanced embeddings (updated by past interactions)
- Scores ALL jobs in catalog, returns top-K

---

## 4. NLP Embeddings — How Text Becomes Vectors

Every node (resume or job) is encoded into a 768-dimensional dense vector using the fine-tuned SentenceTransformer.

### 4.1 During Node Registration

```273:275:app/services/recommendation_service.py
vec_np = nlp_model.encode([text], convert_to_numpy=True)
vec = torch.tensor(vec_np, dtype=torch.float32).squeeze(0).to(device)
vec = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)
```

Steps:
1. `nlp_model.encode([text])` → shape `(1, 768)` numpy array
2. Convert to PyTorch tensor → squeeze to 1D `(768,)`
3. L2-normalize to unit length

The unit-length property means **cosine similarity = dot product** — a critical invariant used throughout the scoring code.

### 4.2 Dual Embedding Stores

```14:22:app/services/recommendation_service.py
feature_store:     Dict[str, torch.Tensor] = {}   # raw NLP embeddings
graphsage_store:   Dict[str, torch.Tensor] = {}   # GraphSAGE-updated embeddings
```

| Store | Content | Updated when |
|---|---|---|
| `feature_store` | Raw NLP embedding (text → model) | Node registration only |
| `graphsage_store` | GraphSAGE-enhanced embedding | After every interaction |

The `graphsage_store` is what drives recommendations — it encodes both the resume's intrinsic content and the collaborative signals from similar users who applied to similar jobs.

---

## 5. Graph Structure & In-Memory Stores

### 5.1 Core Data Structures

```14:22:app/services/recommendation_service.py
raw_node_store:    Dict[str, dict]         = {}   # id → {type, text_snippet, encoded}
feature_store:     Dict[str, torch.Tensor] = {}   # id → raw NLP embedding (768,)
graphsage_store:   Dict[str, torch.Tensor] = {}   # id → GraphSAGE embedding (768,)
edge_store:        Dict[str, List[dict]]   = {}   # resume_id → [{job_id, weight}]
edge_metadata:     Dict[str, dict]        = {}   # "resume_id__job_id" → {confidence, action_type, ...}
job_to_users:      Dict[str, List[str]]   = {}   # job_id → [resume_ids]
job_catalog:       List[str]               = []   # ordered list of all job node IDs
job_catalog_index: Dict[str, int]          = {}   # job_id → index in job_catalog
```

### 5.2 Node Types

Each node has a `node_type` of `"resume"` or `"job"` stored in `raw_node_store`:

```14:17:app/services/recommendation_service.py
raw_node_store:    Dict[str, dict] = {}   # id → {type, text_snippet, encoded}
```

A node's text snippet is the first 120 characters of the original text. The `encoded` flag tells whether the node has an NLP embedding (visible in the graph dashboard as a solid vs. dashed node).

### 5.3 Edge Structure

Edges are directed: **resume → job**. They represent a user interaction with a job listing.

```301:308:app/services/recommendation_service.py
edges = edge_store.setdefault(resume_id, [])
for edge in edges:
    if edge["job_id"] == job_id:
        edge["weight"] *= DECAY          # time decay
        edge["weight"] = min(edge["weight"] + weight, MAX_EDGE_WEIGHT)
        break
else:
    edges.append({"job_id": job_id, "weight": weight})
```

Each edge has:
- `job_id`: target job
- `weight`: cumulative interaction strength (accumulated via `HINCRBYFLOAT` in Redis)

Edge weights are bounded by `MAX_EDGE_WEIGHT = 3.0` and decayed by `DECAY = 0.9` before each accumulation, preventing runaway growth from repeated interactions.

### 5.4 Reverse Index

```311:314:app/services/recommendation_service.py
users_for_job = job_to_users.setdefault(job_id, [])
if resume_id not in users_for_job:
    users_for_job.append(resume_id)
    graph_store.persist_job_users(job_id, resume_id)
```

`job_to_users` maps each job to the list of resumes that have interacted with it. This is used during GraphSAGE to find similar users (other resumes that share job neighbors).

---

## 6. Graph Persistence Layer (Redis)

**File:** `app/services/graph_store.py`

### 6.1 Redis Key Schema

All keys are namespaced under `graph:`:

| Redis Key Pattern | Type | Description |
|---|---|---|
| `graph:node:<node_id>` | Hash | `{node_type, text_snippet}` |
| `graph:edges:<resume_id>` | Hash | `{job_id: cumulative_weight, ...}` |
| `graph:job_edges:<job_id>` | Hash | `{resume_id: cumulative_weight, ...}` (reverse) |
| `graph:job_catalog` | List | `[job_id, ...]` ordered catalog |
| `graph:job_users:<job_id>` | Set | `{resume_id, ...}` |

### 6.2 Edge Accumulation

```96:107:app/services/graph_store.py
def persist_edge(resume_id: str, job_id: str, weight: float) -> None:
    r = get_redis()
    r.hincrbyfloat(_edges_key(resume_id), job_id, weight)        # forward
    r.hincrbyfloat(_job_edges_key(job_id), resume_id, weight)   # reverse
```

`HINCRBYFLOAT` atomically increments the edge weight, so concurrent interactions safely accumulate rather than overwrite. The bidirectional write ensures both forward and reverse lookups are consistent.

### 6.3 Legacy Migration

```134:152:app/services/graph_store.py
if ktype == "hash":
    raw = r.hgetall(key)
    edges = [{"job_id": jid, "weight": float(w)} for jid, w in raw.items()]
elif ktype == "string":   # legacy JSON blob — migrate on the fly
    try:
        edges = json.loads(r.get(key) or "[]")
    except (json.JSONDecodeError, Exception):
        edges = []
    # Migrate: write to HASH, remove old STRING key
    if edges:
        pipe = r.pipeline()
        for edge in edges:
            pipe.hset(_edges_key(resume_id), edge["job_id"], edge["weight"])
            pipe.hset(_job_edges_key(edge["job_id"]), resume_id, edge["weight"])
        pipe.delete(key)
        pipe.execute()
```

On graph restore, legacy edges stored as JSON strings are migrated in-place to the HASH format.

### 6.4 Job Catalog Persistence

```163:171:app/services/graph_store.py
def persist_job_catalog(job_id: str) -> None:
    r = get_redis()
    r.lrem(CATALOG_KEY, 0, job_id)   # remove all occurrences (dedup)
    r.rpush(CATALOG_KEY, job_id)      # append to end
```

Uses `LREM + RPUSH` to make the operation idempotent: duplicates are removed before appending, ensuring the catalog is always clean.

---

## 7. Node Registration — `POST /api/v1/add_node`

### 7.1 API Handler

**File:** `app/api/recommendations.py`

```39:103:app/api/recommendations.py
@router.post("/add_node", response_model=dict)
def add_node(req: AddNodeRequest):
    # Phase 1: register immediately, no model needed
    text_snippet = req.text[:120] if req.text else ""
    svc.raw_node_store[req.node_id] = {
        "node_type":    req.node_type,
        "text_snippet": text_snippet,
        "encoded":      False,
    }
    if req.node_type == "job" and req.node_id not in svc.job_catalog:
        svc.job_catalog.append(req.node_id)
        graph_store.persist_job_catalog(req.node_id)
    graph_store.persist_node(req.node_id, req.node_type, text_snippet)

    # Phase 2: NLP encode only when models are ready
    if model_registry.is_loaded:
        data = svc.add_node(node_id=req.node_id, text=req.text, ...)
        return {"success": True, "data": AddNodeData(**data), ...}
    else:
        # Models not loaded — deferred encoding
        return {"success": True, "data": AddNodeData(...), "meta": {"warning": "..."}}
```

### 7.2 Two-Phase Registration

**Phase 1 (always, no model required):**
1. Write to `raw_node_store` — immediately visible in graph snapshots
2. Write to Redis `graph:node:<node_id>` — persists node metadata
3. If job: append to `job_catalog` + Redis list

**Phase 2 (only when models loaded):**
1. Encode full text → 768-dim NLP embedding via SentenceTransformer
2. Store in `feature_store[node_id]` and `graphsage_store[node_id]`
3. Mark `encoded = True` in `raw_node_store`

This two-phase design means the graph dashboard shows new nodes **immediately**, even before model loading is complete.

### 7.3 Service-Level Encoding

```247:288:app/services/recommendation_service.py
def add_node(node_id: str, text: str, node_type: str, nlp_model, device) -> dict:
    # Step 1: register metadata immediately (visible in graph snapshot)
    text_snippet = text[:120] if text else ""
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

    # Step 2: NLP encoding (requires model)
    vec_np = nlp_model.encode([text], convert_to_numpy=True)
    vec = torch.tensor(vec_np, dtype=torch.float32).squeeze(0).to(device)
    vec = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)

    feature_store[node_id]          = vec
    graphsage_store[node_id]        = vec.clone()
    raw_node_store[node_id]["encoded"] = True
```

Key invariants:
- `graphsage_store` is seeded with the NLP embedding at registration time
- After first interaction, it is replaced by the GraphSAGE-updated embedding
- Both `feature_store` and `graphsage_store` hold unit-length (L2-normalized) 1D tensors of shape `(768,)`

---

## 8. Interaction Tracking — `POST /api/v1/interact`

### 8.1 Action Types & Weights

```48:55:app/services/recommendation_service.py
ACTION_WEIGHT_MAP: Dict[str, float] = {
    "apply": 1.0,
    "save":  0.7,
    "click": 0.1,
}
```

`apply` is the strongest signal (candidate took the time to submit). `click` is weakest (casual browsing). The weight map is extensible — adding a new action type here is sufficient for the whole system to pick it up.

### 8.2 Single-Resume Interactions (Apply Events)

**File:** `app/api/recommendations.py` lines 157–189

When a user explicitly applies to a job, the system:

1. Validates the `resume_id` and `job_id` exist in `feature_store`
2. Calls `svc.handle_interaction(resume_id, job_id, "apply", ...)`
3. The handler:
   - Persists the edge to Redis (`HINCRBYFLOAT`)
   - Stores edge metadata with `confidence = 1.0` (ground truth)
   - Calls `process_application()` to update the graph

```391:415:app/services/recommendation_service.py
def handle_interaction(resume_id, job_id, action_type, graphsage_model, device):
    weight = ACTION_WEIGHT_MAP[action_type]

    # Persist edge to Redis (creates or accumulates)
    graph_store.persist_edge(resume_id, job_id, weight)

    # Store edge metadata for graph visualization (apply = ground truth, 100% confidence)
    _store_edge_metadata(resume_id, job_id, {
        "confidence": 1.0,
        "confidence_level": "high",
        "action_type": action_type,
        "attribution_probability": 1.0,
        "original_weight": weight,
    })

    # Update in-memory stores + re-run GraphSAGE
    result = process_application(resume_id, job_id, weight, graphsage_model, device)
```

### 8.3 Edge Weight Accumulation with Decay

```291:308:app/services/recommendation_service.py
def process_application(resume_id: str, job_id: str, weight: float, graphsage_model, device) -> dict:
    # Accumulate edge weight with time decay then hard cap
    edges = edge_store.setdefault(resume_id, [])
    for edge in edges:
        if edge["job_id"] == job_id:
            edge["weight"] *= DECAY          # DECAY = 0.9
            edge["weight"] = min(edge["weight"] + weight, MAX_EDGE_WEIGHT)  # cap = 3.0
            break
    else:
        edges.append({"job_id": job_id, "weight": weight})
```

| Parameter | Value | Purpose |
|---|---|---|
| `DECAY` | `0.9` | Multiplicative decay before adding new weight — older interactions count less |
| `MAX_EDGE_WEIGHT` | `3.0` | Hard cap — prevents any single edge from dominating aggregation |
| `SMOOTHING_ALPHA` | `0.7` | EMA blend between old and new GraphSAGE embeddings |

---

## 9. Soft Attribution Pipeline — Multi-Resume Events

### 9.1 The Problem

When multiple resumes belong to the same user session and a `click` or `save` event fires, the system must decide **which resume(s) to attribute this signal to**, since:
- Only one resume may actually match the job
- All resumes share the same session, but they represent different candidates

### 9.2 Confidence Gating

```57:65:app/services/recommendation_service.py
CONFIDENCE_HIGH   = 0.7   # >= 0.7: use weight normally
CONFIDENCE_MEDIUM = 0.4   # >= 0.4 and < 0.7: reduce weight by 50%
CONFIDENCE_LOW    = 0.0   # < 0.4: ignore interaction

WEIGHT_MULTIPLIER_HIGH   = 1.0
WEIGHT_MULTIPLIER_MEDIUM = 0.5
WEIGHT_MULTIPLIER_LOW    = 0.0
```

**Confidence** measures how strongly the best-matching resume stands out relative to the others. It is computed as the **maximum softmax probability** of the similarity distribution.

### 9.3 Full Attribution Pipeline

```166:244:app/services/recommendation_service.py
def compute_attributions(resume_ids, job_id, event_weight):
    # 1. Compute cosine similarity between each resume and the job
    if len(resume_ids) == 1:
        single_prob = 1.0
        confidence = 1.0
    else:
        similarities = compute_similarity(resume_ids, job_id)
        probabilities = softmax(similarities)
        confidence = compute_confidence(probabilities)   # max(probabilities)

    weight_multiplier = get_weight_multiplier(confidence)

    if confidence_level == "low":
        # Ignore interaction entirely — too uncertain
        return attributions, 0.0, confidence

    for i, resume_id in enumerate(resume_ids):
        final_weight = event_weight * weight_multiplier * prob
        attributions.append({...})
```

**Step-by-step:**

```
1. Similarity computation
   cosine_sim(resume_vec_i, job_vec) for each resume → [s1, s2, ...]

2. Softmax conversion
   p_i = exp(si/T) / Σ exp(sj/T)   where T = 1.0 (default temperature)
   → [p1, p2, ...]  summing to 1.0

3. Confidence = max(p_i)
   Higher when one resume clearly dominates others

4. Confidence gating
   if confidence < 0.4  → ignore
   if 0.4 <= conf < 0.7 → ×0.5
   if conf >= 0.7       → ×1.0

5. Final weight per resume
   final_weight_i = event_weight × weight_multiplier × p_i
```

### 9.4 High-Confidence Winner-Takes-All Strategy

When `confidence >= 0.7`, the system applies a **winner-takes-all** strategy:

```490:513:app/services/recommendation_service.py
if confidence_level == "high":
    # Find the best resume (highest attribution probability)
    best_attr = max(attributions, key=lambda a: a["attribution_probability"])
    best_resume_id = best_attr["resume_id"]

    for attr in attributions:
        if attr["resume_id"] == best_resume_id:
            attr["final_weight"] = event_weight   # Full weight for best match
            attr["edge_created"] = True
        else:
            attr["final_weight"] = 0.0
            attr["edge_created"] = False

    total_weight = event_weight
    attributions = [best_attr]   # Only return the winning attribution
```

Rationale: when one resume clearly dominates (high confidence), distributing the signal dilutes it. Only the best match gets the edge.

### 9.5 Single-Resume Case

When there is only one resume in the session, the attribution is trivial:

```192:194:app/services/recommendation_service.py
if len(resume_ids) == 1:
    single_prob = 1.0
    confidence = 1.0
```

No softmax needed — the single resume gets 100% attribution at full weight.

---

## 10. GraphSAGE Embedding Update — `_run_graphsage_local`

### 10.1 Purpose

After every interaction, the resume's embedding is **updated** to incorporate:
1. The content of jobs the resume interacted with (weighted by edge strength)
2. The embeddings of similar users (other resumes that applied to the same jobs)

This is the core of the collaborative filtering component — the embedding learns that "users who applied to jobs similar to yours also applied to these other jobs."

### 10.2 Local Subgraph Construction

```579:626:app/services/recommendation_service.py
def _run_graphsage_local(
    resume_id, job_features, user_features,
    edge_store_snapshot, similar_users, graphsage_model, device,
) -> torch.Tensor:
    resume_vec  = feature_store[resume_id]
    x_local     = torch.cat([resume_vec] + job_features + user_features, dim=0)
```

The local subgraph contains:

```
Node 0:      the target resume vector  (768,)
Node 1..N:   job feature vectors      (N × 768,)  from applied jobs, weighted
Node N+1..M:  user feature vectors    (M × 768,)  from similar users
```

### 10.3 Edges in the Local Subgraph

```594:610:app/services/recommendation_service.py
# Resume ↔ each job (bidirectional)
for i in range(num_jobs):
    j = 1 + i
    local_edges += [[0, j], [j, 0]]

# Resume ↔ each similar user (bidirectional)
for i in range(num_users):
    u = user_offset + i
    local_edges += [[0, u], [u, 0]]

# Job ↔ Similar user edges (cross edges)
for i, edge in enumerate(edge_store_snapshot):
    eid = edge["job_id"]
    j   = 1 + i
    for k, u_id in enumerate(similar_users):
        if u_id in job_to_users.get(eid, []):
            u = user_offset + k
            local_edges += [[j, u], [u, j]]
```

**Three edge types:**
1. **Resume–Job edges:** Connect the target resume to each job it applied to
2. **Resume–User edges:** Connect the target resume to each similar user
3. **Job–User cross edges:** Connect each applied job to any similar user who also applied to that job — this is what propagates collaborative signals between users who share job interests

### 10.4 Model Forward Pass

```622:626:app/services/recommendation_service.py
graphsage_model.eval()
with torch.no_grad():
    updated = graphsage_model(x_local, edge_index)

return updated[0].unsqueeze(0)
```

The GraphSAGE model performs two convolution layers over the local subgraph. Node 0's updated embedding captures information from its neighbors (applied jobs and similar users).

### 10.5 EMA Smoothing

```348:353:app/services/recommendation_service.py
# EMA smoothing: blend old embedding with new to avoid sudden jumps.
old_vec = graphsage_store.get(resume_id, updated_vec)
blended = SMOOTHING_ALPHA * old_vec + (1 - SMOOTHING_ALPHA) * updated_vec
smoothed_vec = F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)
graphsage_store[resume_id] = smoothed_vec
```

`SMOOTHING_ALPHA = 0.7` means 70% old + 30% new. This prevents sudden jumps in recommendations when a user makes a single interaction.

### 10.6 Finding Similar Users

```324:334:app/services/recommendation_service.py
similar_users: List[str] = []
seen: set = set()
for edge in edges:                              # each job this resume applied to
    for other in job_to_users.get(edge["job_id"], []):  # other resumes for that job
        if other != resume_id and other not in seen:
            seen.add(other)
            similar_users.append(other)
            if len(similar_users) >= MAX_SIMILAR_USERS:   # limit = 5
                break
    if len(similar_users) >= MAX_SIMILAR_USERS:
        break
```

Algorithm:
1. For each job the current resume applied to
2. Find all other resumes that also applied to that job (`job_to_users` reverse index)
3. Collect up to `MAX_SIMILAR_USERS = 5` unique users

This 1-hop neighbor discovery is fast and provides sufficient collaborative signal.

### 10.7 Job Feature Aggregation

```316:322:app/services/recommendation_service.py
# Collect job features — normalize by total weight to prevent any single
# job from dominating the aggregation
total_weight = sum(e["weight"] for e in edges) or 1.0
job_features = [
    feature_store[e["job_id"]] * (e["weight"] / total_weight)
    for e in edges
]
```

Job features are **weighted by normalized edge weights**, so a strong repeated interaction contributes more to the resume's updated embedding.

---

## 11. Job Recommendations — `GET /api/v1/recommend/{resume_id}`

### 11.1 Retrieval Pipeline

```631:731:app/services/recommendation_service.py
def get_recommendations(resume_id, top_k, device, excluded_job_ids=None) -> dict:
    # 1. Retrieve the GraphSAGE-updated resume embedding
    resume_vec = graphsage_store.get(resume_id)

    # 2. Score every job in job_catalog using cosine similarity
    scored_jobs: List[tuple[str, float]] = []
    for job_id in job_catalog:
        job_vec = graphsage_store.get(job_id)
        sim_raw = torch.nn.functional.cosine_similarity(resume_vec, job_vec, dim=0)
        score   = float(sim_raw.item())
        scored_jobs.append((job_id, score))

    # 3. Filter out excluded job IDs
    # 4. Sort descending and return top-k
    scored_jobs.sort(key=lambda x: x[1], reverse=True)
    recommendations = [{job_id, score} for job_id, score in scored_jobs[:top_k]]
```

Since all vectors in `graphsage_store` are unit-length L2-normalized, cosine similarity equals dot product and always falls in `[0, 1]`.

### 11.2 Edge-Case: Resume with No Edges

```669:674:app/services/recommendation_service.py
if not has_edges:
    logger.warning(
        "[get_recommendations] resume_id=%s has NO graph edges — recommendations are based "
        "on raw NLP similarity. Scores will vary; no longer clamped to 1.0.",
        resume_id,
    )
```

A resume with no interactions has its `graphsage_store` entry equal to its raw NLP embedding. The system detects this and warns in the logs — it still returns results but the quality is lower (pure content-based, no collaborative signals).

### 11.3 Deduplication

```685:692:app/services/recommendation_service.py
seen: set = set()
for job_id in job_catalog:
    if job_id in seen:
        continue      # skip duplicates (e.g. from re-sync)
    seen.add(job_id)
    ...
```

The job catalog is a list that may contain duplicate entries if the same job was added multiple times (e.g. via a database re-sync). The deduplication step ensures each job appears at most once in scoring.

### 11.4 Exclusion Support

```676:678:app/services/recommendation_service.py
excluded_set = set(excluded_job_ids or [])
...
for job_id in job_catalog:
    if job_id in excluded_set:
        skipped_excluded += 1
        continue
```

Clients can exclude jobs the resume has already applied to (or saved) by passing comma-separated IDs in the `excluded_job_ids` query parameter.

### 11.5 Recommendation Scoring Formula

```
score(resume, job) = cosine_similarity(
    graphsage_store[resume_id],
    graphsage_store[job_id]
)
```

Where both vectors are L2-normalized and `graphsage_store[x]` is either:
- **For new resumes:** raw NLP embedding (no collaborative signal yet)
- **For resumes with interactions:** GraphSAGE-updated embedding (incorporates job and user neighborhood)

---

## 12. Deep Matching — `POST /api/v1/match`

### 12.1 Overview

Unlike the recommendation pipeline (which scores based on vector similarity in the graph embedding space), the matching endpoint performs **structured comparative scoring** across six distinct dimensions, each targeting specific resume and job fields.

**File:** `app/ml/matching.py`

### 12.2 Dimension Weights

```7:14:app/ml/matching.py
DEFAULT_WEIGHTS: Dict[str, float] = {
    "skills":              0.40,   # highest weight — skills are the primary signal
    "experience":          0.20,
    "role":                0.10,
    "seniority":           0.15,
    "industry":            0.10,
    "nice_to_have_skills": 0.05,  # bonus only — no penalty if absent
}
```

### 12.3 Skill Normalization

**Skill Alias Map** (partial — full list in code):

```28:61:app/ml/matching.py
_SKILL_ALIASES: Dict[str, str] = {
    "JS":            "JAVASCRIPT",
    "TS":            "TYPESCRIPT",
    "REACTJS":       "REACT",
    "VUEJS":         "VUE.JS",
    "NODEJS":        "NODE.JS",
    "K8S":           "KUBERNETES",
    "POSTGRES":      "POSTGRESQL",
    "NEXTJS":        "NEXT.JS",
    "NESTJS":        "NEST.JS",
    ...
}
```

The alias map handles common abbreviations, variant spellings, and framework naming inconsistencies (e.g., `REACTJS` → `REACT`, `NODE JS` → `NODE.JS`).

**Normalization function:**

```120:146:app/ml/matching.py
def normalize_skills(skills_input) -> List[str]:
    for part in skills_str.split(","):
        # Base skill (outside parentheses)
        base = re.sub(r"\(.*?\)", "", part).strip().upper()
        result.append(_resolve_alias(base))
        # Skills inside parentheses become separate entries
        for inner in re.findall(r"\(([^)]+)\)", part):
            result.append(_resolve_alias(inner))
    return list(dict.fromkeys(result))   # deduplicate preserving order
```

This means `"PHP(Laravel), JS"` becomes `["PHP", "LARAVEL", "JAVASCRIPT"]`.

### 12.4 Industry Taxonomy Normalization

```64:99:app/ml/matching.py
_INDUSTRY_TAXONOMY: Dict[str, str] = {
    "technology & it": "Technology",
    "information technology": "Technology",
    "software": "Technology",
    "it": "Technology",
    "finance": "Finance",
    "financial services": "Finance",
    ...
}
```

Both resume and job industry values are mapped through this taxonomy, then compared with exact string equality (no cosine fallback — industry labels have misleading semantic similarity in vector space).

### 12.5 Seniority Normalization

```17:25:app/ml/matching.py
_SENIORITY_ORDER = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEADER"]
_SENIORITY_MIN_YEARS = {
    "INTERN":  0, "FRESHER": 0, "JUNIOR": 1,
    "MIDDLE":  3, "SENIOR": 5,  "LEADER": 8,
}
```

Alias map handles variants: `"MID"` → `"MIDDLE"`, `"LEAD"` → `"LEADER"`, `"ENTRY"` → `"FRESHER"`.

### 12.6 Six Scoring Dimensions

#### Dimension 1: Skills vs. Must-Have Skills (weight = 0.40)

```282:290:app/ml/matching.py
if resume_skills_list and must_have_normalised:
    coverage = _skill_coverage_score(resume_skills_list, must_have_normalised)
    if _enough_words(resume_skills_text) and _enough_words(must_have_text):
        cosine = _cosine_sim(resume_skills_text, must_have_text, model)
    else:
        cosine = coverage
    scores["skills"] = 0.70 * coverage + 0.30 * cosine
```

**Hybrid scoring formula:**
```
skills_score = 0.70 × coverage + 0.30 × cosine
where coverage = |resume_skills ∩ must_have| / |must_have|
```
- **Coverage (70%):** Exact set overlap after alias normalization
- **Cosine (30%):** Semantic similarity of skill texts (catches synonyms the alias map misses)

#### Dimension 2: Experience Bullets vs. Responsibilities (weight = 0.20)

```293:294:app/ml/matching.py
if job_exp_text and _enough_words(resume_exp_text) and _enough_words(job_exp_text):
    scores["experience"] = _cosine_sim(resume_exp_text, job_exp_text, model)
```

**Input construction:**
```
resume_exp_text = resume.summary + ". " + resume.experience_bullets
job_exp_text    = job.responsibilities + ". " + job.requirements
```
Pure semantic cosine similarity — catches transferable experience even when exact skills don't overlap.

Requires at least 5 words in each text (`_enough_words`) to avoid meaningless cosine scores.

#### Dimension 3: Role vs. Job Title (weight = 0.10)

```297:299:app/ml/matching.py
if resume_role and job_title and _enough_words(resume_role) and _enough_words(job_title):
    scores["role"] = _cosine_sim(resume_role, job_title, model)
```

Catches fundamental role-category mismatches (e.g., "UX Designer" vs. "Backend Engineer") before they reach recommendation scoring.

#### Dimension 4: Seniority (weight = 0.15)

```302:323:app/ml/matching.py
if resume_seniority and job_seniority_list:
    # Proximity score based on index distance in seniority ladder
    resume_idx = _SENIORITY_ORDER.index(resume_seniority)
    best_proximity = 0.0
    for job_sen in job_seniority_list:
        job_idx = _SENIORITY_ORDER.index(job_sen)
        prox = 1.0 - abs(resume_idx - job_idx) / len(_SENIORITY_ORDER)
        best_proximity = max(best_proximity, prox)

    # Years-of-experience check
    if resume_years_exp is not None:
        best_years_score = 0.0
        for job_sen in job_seniority_list:
            min_years = _SENIORITY_MIN_YEARS.get(job_sen, 1)
            years_score = min(1.0, resume_years_exp / max(min_years, 1))
            best_years_score = max(best_years_score, years_score)
        scores["seniority"] = 0.5 * best_proximity + 0.5 * best_years_score
    else:
        scores["seniority"] = best_proximity
```

**Seniority score = 50% label proximity + 50% years-check:**
- **Label proximity:** `prox = 1 - |resume_level_idx - job_level_idx| / 6` (closer levels score higher)
- **Years check:** `min(1.0, resume_years / job_minimum_years)` (satisfied = 1.0, otherwise proportionally lower)

Example: Resume = "MIDDLE" (idx=3, min_years=3), Job accepts "MIDDLE" (idx=3, min_years=3), Resume has 5 years:
- proximity = `1 - |3-3|/6 = 1.0`
- years_score = `min(1.0, 5/3) = 1.0`
- seniority = `0.5 × 1.0 + 0.5 × 1.0 = 1.0`

#### Dimension 5: Industry (weight = 0.10)

```328:329:app/ml/matching.py
if resume_industry and job_industry:
    scores["industry"] = 1.0 if resume_industry.lower() == job_industry.lower() else 0.0
```

**Exact match only.** No cosine fallback — industry labels have misleading semantic similarity (e.g., "Healthcare" and "Medical" might score high in vector space but represent different job markets).

#### Dimension 6: Nice-to-Have Skills (weight = 0.05, bonus only)

```332:335:app/ml/matching.py
if resume_skills_list and nice_to_have_raw:
    scores["nice_to_have_skills"] = _skill_coverage_score(
        resume_skills_list, nice_to_have_raw
    )
```

Coverage-only (no cosine). This dimension only **adds** to the overall score — missing nice-to-have skills does not penalize the candidate.

### 12.7 Overall Score Calculation

```337:345:app/ml/matching.py
# Rebalance weights when a pair is skipped (insufficient data)
total_weight = sum(weights.get(k, 0.0) for k in scores)
if total_weight == 0:
    return {k: 0.0 for k in ("overall_score", "skills", "experience", ...)}

overall = sum(scores.get(k, 0.0) * weights[k] for k in weights)
```

**Dynamic weight rebalancing:** If a dimension is skipped (e.g., no industry data), its weight is redistributed proportionally among available dimensions.

```
effective_weight_k = DEFAULT_WEIGHT_k × (total_default_weight / actual_total_weight)
```

---

## 13. Startup & Graph Restoration

**File:** `app/services/graph_store.py` lines 184–278

On service startup (after models are loaded), the in-memory graph is rebuilt from Redis:

```184:278:app/services/graph_store.py
def restore_graph(raw_node_store, feature_store, graphsage_store,
                  edge_store, job_to_users, job_catalog, nlp_model, device) -> int:
    # 1. Scan all node keys → populate raw_node_store + texts_to_encode
    node_keys = list(r.scan_iter(f"{_PFX}node:*"))
    for key in node_keys:
        data = r.hgetall(key)
        node_id = key[len(f"{_PFX}node:"):]
        raw_node_store[node_id] = {
            "node_type":    data.get("node_type", "resume"),
            "text_snippet": data.get("text_snippet", ""),
            "encoded":      False,
        }
        texts_to_encode[node_id] = data.get("text_snippet", "")

    # 2. Batch re-encode all nodes (NLP → embeddings)
    if texts_to_encode and nlp_model is not None:
        vecs_np = nlp_model.encode(texts, convert_to_numpy=True, batch_size=32)
        for i, node_id in enumerate(node_ids):
            vec = torch.tensor(vecs_np[i], dtype=torch.float32).squeeze(0).to(device)
            vec = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)
            feature_store[node_id]    = vec
            graphsage_store[node_id]  = vec.clone()
            raw_node_store[node_id]["encoded"] = True
            restored += 1

    # 3. Restore job_catalog (ordered list)
    catalog_from_redis = r.lrange(CATALOG_KEY, 0, -1)
    for jid in catalog_from_redis:
        if jid not in job_catalog:
            job_catalog.append(jid)
    # Rebuild index
    from app.services.recommendation_service import job_catalog_index
    job_catalog_index.clear()
    for pos, jid in enumerate(job_catalog):
        job_catalog_index[jid] = pos

    # 4. Restore edges + migrate legacy format
    edge_count = load_edges_into_memory(edge_store, job_to_users)

    # 5. Restore job_to_users reverse index
    job_user_keys = list(r.scan_iter(f"{_PFX}job_users:*"))
    for key in job_user_keys:
        job_id  = key[len(f"{_PFX}job_users:"):]
        members = r.smembers(key)
        existing = set(job_to_users.get(job_id, []))
        job_to_users[job_id] = list(existing | set(members))
```

Key behaviors:
- Node metadata is restored from Redis, but embeddings are **re-computed** using the loaded NLP model (handles model version upgrades gracefully)
- `job_catalog_index` is rebuilt to prevent duplicate entries when nodes are re-added during sync
- Legacy edges (JSON strings) are migrated to HASH format on first restore
- `job_to_users` is merged (union) from both in-memory and Redis sources for robustness

---

## 14. Graph Visualization API — `GET /api/v1/graph/*`

**File:** `app/api/graph.py`

### 14.1 Full Graph Snapshot

```
GET /api/v1/graph/snapshot
→ Returns all nodes + all edges currently in memory
→ Reads from raw_node_store (visible even in DEGRADED mode)
```

### 14.2 Per-Node Subgraph

```
GET /api/v1/graph/snapshot/{node_id}
→ For resume: the resume + all jobs it applied to
→ For job: the job + all resumes that applied
```

### 14.3 Interactive Dashboard

```
GET /api/v1/graph/view          → full graph dashboard
GET /api/v1/graph/view/{node_id} → focused dashboard on one node
```

The dashboard is an auto-refreshing HTML page powered by **vis-network** that:
- Polls the snapshot endpoint every 4 seconds
- Renders nodes as circles (resumes) or diamonds (jobs)
- Dashed/dim nodes = pending embedding, solid = encoded
- Edge color reflects action type: red = click, orange = save, green = apply
- Edge thickness reflects confidence level
- Hover tooltips show confidence, attribution probability, and weight

---

## 15. Complete Data Flow Diagrams

### 15.1 Node Registration Flow

```
Client: POST /api/v1/add_node
        { node_id, node_type, text }
                  │
                  ▼
        ┌──────────────────────────┐
        │  Phase 1 (always)        │
        │  raw_node_store[id] =   │
        │    {type, snippet, False}│
        │  Redis: graph:node:id   │
        │  If job: add to catalog  │
        └────────────┬─────────────┘
                     │
              models loaded?
           yes /      \ no
              ▼              ▼
        ┌─────────┐    ┌─────────────┐
        │ Phase 2 │    │ Return 200  │
        │ NLP enc │    │ "deferred"  │
        │ 768-dim │    │ warning     │
        │ store in│    └─────────────┘
        │ feature_│
        │ +graph_ │
        │ _store  │
        └─────────┘
```

### 15.2 Apply Interaction Flow

```
Client: POST /api/v1/interact
        { resume_id, job_id, action_type: "apply" }
                  │
                  ▼
        ┌──────────────────────────────────────┐
        │ 1. Validate IDs exist in feature_store │
        │ 2. Get weight = ACTION_WEIGHT_MAP[apply] = 1.0
        │ 3. Redis: HINCRBYFLOAT graph:edges:resume_id job_id 1.0
        │ 4. Redis: HINCRBYFLOAT graph:job_edges:job_id resume_id 1.0
        │ 5. Store edge_metadata(resume__job, confidence=1.0, ...)
        └────────────────────┬───────────────────┘
                             ▼
        ┌───────────────────────────────────────────┐
        │  process_application()                   │
        │                                           │
        │ a. edge_store[resume].weight *= DECAY (0.9)│
        │ b. edge_store[resume].weight = min(w+1, 3) │
        │ c. job_to_users[job].append(resume)       │
        │ d. Find similar users (up to 5) via       │
        │    job_to_users[applied_jobs]              │
        │ e. Build local subgraph (resume + jobs +   │
        │    similar_users)                         │
        │ f. Run GraphSAGE model forward pass       │
        │ g. EMA smoothing:                        │
        │    0.7 × old + 0.3 × new → graphsage_store│
        │ h. L2-normalize graphsage_store[resume]   │
        └────────────────────┬──────────────────────┘
                             ▼
        Return: { num_applied_jobs, num_similar_users }
```

### 15.3 Click/Save Interaction (Multi-Resume) Flow

```
Client: POST /api/v1/interact
        { resume_ids: [r1, r2, r3], job_id, action_type: "click" }
                  │
                  ▼
        ┌──────────────────────────────────────────┐
        │  compute_attributions(resume_ids, job)   │
        │                                          │
        │  1. cosine_sim(resume_vec_i, job_vec)    │
        │     → [s1, s2, s3]                       │
        │  2. softmax([s1,s2,s3]) → [p1,p2,p3]     │
        │  3. confidence = max([p1,p2,p3])        │
        │  4. Get weight_multiplier from confidence│
        │  5. if conf < 0.4 → IGNORE (return)       │
        │  6. if conf >= 0.7 → winner-takes-all    │
        │     (only best resume gets full weight)   │
        │  7. final_weight_i = 0.1 × multiplier × pi│
        └────────────┬───────────────────────────────┘
                     ▼
        For each attributed resume:
          - persist_edge(..., final_weight)
          - process_application(..., final_weight)
          - store edge_metadata(...)
                     │
                     ▼
        Return: { confidence, confidence_level, attributions[], ... }
```

### 15.4 Recommendation Flow

```
Client: GET /api/v1/recommend/{resume_id}?top_k=5&excluded_job_ids=j1,j2
                  │
                  ▼
        ┌──────────────────────────────────────┐
        │  1. Get resume_vec = graphsage_store │
        │     [resume_id] (GraphSAGE-updated)  │
        │  2. For each job in job_catalog:     │
        │       job_vec = graphsage_store[job]  │
        │       score = cosine_sim(resume, job) │
        │  3. Sort by score descending         │
        │  4. Filter out excluded_job_ids       │
        │  5. Return top-k [{job_id, score}]   │
        └──────────────────────────────────────┘
```

### 15.5 Deep Matching Flow

```
Client: POST /api/v1/match
        { resume: {skills, experience_bullets, ...},
          job:    {must_have_skills, responsibilities, ...} }
                  │
                  ▼
        ┌──────────────────────────────────────────────────┐
        │  normalize all fields                             │
        │  (skill aliases, industry taxonomy, seniority)     │
        └────────────────────┬─────────────────────────────┘
                             ▼
        ┌──────────────────────────────────────────────────┐
        │  For each dimension:                             │
        │  1. skills:     0.7×coverage + 0.3×cosine        │
        │  2. experience: cosine_sim(resume_exp, job_exp)  │
        │  3. role:      cosine_sim(resume_role, job_title)│
        │  4. seniority:  0.5×proximity + 0.5×years_check  │
        │  5. industry:  1.0 if exact match else 0.0     │
        │  6. nice_to_have: coverage(resume, nice_to_have)│
        │                                                  │
        │  Rebalance weights if any dimension missing      │
        │  overall = Σ score_k × effective_weight_k         │
        └────────────────────┬─────────────────────────────┘
                             ▼
        Return: { overall_score, skills, experience,
                  role, seniority, industry, nice_to_have }
```

---

## 16. API Quick Reference

### 16.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/add_node` | Register a resume or job node |
| `POST` | `/api/v1/interact` | Record apply/click/save interaction |
| `GET` | `/api/v1/recommend/{resume_id}` | Get ranked job recommendations |
| `POST` | `/api/v1/match` | Deep matching score (resume vs job) |
| `GET` | `/api/v1/graph/snapshot` | Full graph snapshot |
| `GET` | `/api/v1/graph/snapshot/{node_id}` | Subgraph for one node |
| `GET` | `/api/v1/graph/view` | Interactive graph dashboard (HTML) |

### 16.2 Request/Response Schemas

**`POST /api/v1/add_node`**
```json
// Request
{ "node_id": "resume_123", "text": "John Doe — 5 years Python...", "node_type": "resume" }
{ "node_id": "job_456", "text": "Backend Engineer...", "node_type": "job" }

// Response
{ "success": true, "data": { "node_id": "...", "node_type": "...", "message": "..." } }
```

**`POST /api/v1/interact` (apply)**
```json
// Request
{ "resume_id": "resume_123", "job_id": "job_456", "action_type": "apply" }

// Response
{
  "success": true,
  "data": {
    "message": "Application processed. Resume embedding updated.",
    "num_applied_jobs": 3,
    "num_similar_users": 4
  }
}
```

**`POST /api/v1/interact` (click/save — multi-resume)**
```json
// Request
{ "resume_ids": ["r1", "r2", "r3"], "job_id": "job_456", "action_type": "click" }

// Response
{
  "success": true,
  "data": {
    "confidence": 0.82,
    "confidence_level": "high",
    "total_weight_distributed": 0.1,
    "num_resumes_attributed": 1,
    "num_resumes_ignored": 2,
    "attributions": [
      { "resume_id": "r2", "attribution_probability": 0.85, "final_weight": 0.1, "edge_created": true }
    ]
  }
}
```

**`GET /api/v1/recommend/{resume_id}?top_k=5`**
```json
// Response
{
  "success": true,
  "data": {
    "resume_id": "resume_123",
    "recommendations": [
      { "job_id": "job_789", "score": 0.8472 },
      { "job_id": "job_456", "score": 0.7231 },
      { "job_id": "job_101", "score": 0.6894 }
    ]
  }
}
```

**`POST /api/v1/match`**
```json
// Request
{
  "application_id": "app_uuid_001",
  "resume": {
    "skills": "Python, React, PostgreSQL",
    "experience_bullets": "Built REST APIs...",
    "seniority": "MIDDLE",
    "industry": "Technology",
    "yearsExperience": 4
  },
  "job": {
    "must_have_skills": ["Python", "FastAPI", "PostgreSQL"],
    "nice_to_have_skills": ["Docker", "AWS"],
    "responsibilities": ["Build APIs", "Optimize DB queries"],
    "seniority": ["MIDDLE", "SENIOR"],
    "industry": "Technology"
  }
}

// Response
{
  "overall_score": 0.8342,
  "skills": 0.9231,
  "experience": 0.7812,
  "role": 0.0,
  "seniority": 0.9167,
  "industry": 1.0,
  "nice_to_have_skills": 0.0
}
```

### 16.3 Configuration Constants

| Constant | Value | Location |
|---|---|---|
| `EMBEDDING_DIM` | 768 | `model_registry.py` |
| `MAX_SIMILAR_USERS` | 5 | `recommendation_service.py` |
| `MAX_RECOMMENDATIONS` | 50 | `recommendation_service.py` |
| `MAX_EDGE_WEIGHT` | 3.0 | `recommendation_service.py` |
| `DECAY` | 0.9 | `recommendation_service.py` |
| `SMOOTHING_ALPHA` | 0.7 | `recommendation_service.py` |
| `ACTION_WEIGHT_MAP.apply` | 1.0 | `recommendation_service.py` |
| `ACTION_WEIGHT_MAP.save` | 0.7 | `recommendation_service.py` |
| `ACTION_WEIGHT_MAP.click` | 0.1 | `recommendation_service.py` |
| `CONFIDENCE_HIGH` | 0.7 | `recommendation_service.py` |
| `CONFIDENCE_MEDIUM` | 0.4 | `recommendation_service.py` |
| `WEIGHT_MULTIPLIER_HIGH` | 1.0 | `recommendation_service.py` |
| `WEIGHT_MULTIPLIER_MEDIUM` | 0.5 | `recommendation_service.py` |

---

*Document generated from source code in `app/api/`, `app/ml/`, and `app/services/`. All formulas, constants, and behaviors are directly traceable to the corresponding Python files.*
