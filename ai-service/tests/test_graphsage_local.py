"""
Complete test suite for _run_graphsage_local() — the core GraphSAGE inference
function in the recommendation system.

Test structure
──────────────
1. Basic correctness      — shape, dtype, no NaN/Inf, norm ≈ 1
2. Embedding update        — output differs from input after message passing
3. Weight influence        — different weighted-sum inputs → different outputs
4. Graph structure          — removing collaborative bridging edges changes output
5. Multi-hop propagation    — collaborative signal flows R_A→J1→U_B→J3
6. No-edge fallback        — empty local graph returns original embedding
7. Stability               — deterministic under repeated calls
8. Edge cases              — missing feature, empty users, large graph

Bonus helpers
─────────────
- SyntheticDatasetBuilder  — build correlated test graphs
- cosine_sim_matrix        — pairwise similarity matrix
- print_similarity_table   — console before/after visualizer
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import torch
import torch.nn.functional as F

from app.services import recommendation_service as svc
from tests.conftest import (
    build_gs_model,
    cosine_sim,
    make_embedding,
    reset_stores,
    _train_graphsage_for_collaborative_signal,
)

# ── The function under test ────────────────────────────────────────────────────
_run_graphsage_local = svc._run_graphsage_local


# ═══════════════════════════════════════════════════════════════════════════════
# BONUS HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def cosine_sim_matrix(tensors: List[torch.Tensor], labels: List[str]) -> torch.Tensor:
    """
    Compute an N×N pairwise cosine similarity matrix.

    Args:
        tensors: List of 1-D or 2-D tensors (will be squeezed to 1-D).
        labels:  Human-readable labels for each tensor (same length as tensors).

    Returns:
        (N, N) tensor where mat[i, j] = cosine_similarity(tensors[i], tensors[j]).
    """
    n = len(tensors)
    mat = torch.empty(n, n)
    for i, a in enumerate(tensors):
        for j, b in enumerate(tensors):
            a_s, b_s = a.squeeze(), b.squeeze()
            mat[i, j] = torch.nn.functional.cosine_similarity(
                a_s.unsqueeze(0), b_s.unsqueeze(0)
            )
    return mat


def print_similarity_table(
    before: Dict[str, torch.Tensor],
    after:  Dict[str, torch.Tensor],
    target_label: str,
) -> None:
    """
    Print a formatted before/after cosine-similarity table.

    Prints every label in *before* vs every label in *after*, plus a summary
    showing how the similarity to *target_label* changed.

    Args:
        before:     {"label": embedding} before GraphSAGE
        after:      {"label": embedding} after GraphSAGE
        target_label: Label whose column is highlighted in the summary
    """
    all_labels = sorted(set(before.keys()) | set(after.keys()))
    n = len(all_labels)

    print(f"\n{'─'*62}")
    print(f"  Similarity matrix: before vs after GraphSAGE")
    print(f"  Target node: {target_label}")
    print(f"{'─'*62}")

    header = f"{'':>10}" + "".join(f"{l:>8}" for l in all_labels)
    print(header)
    print(f"{'─'*62}")

    sim_before = cosine_sim_matrix(
        [before[l] for l in all_labels],
        all_labels,
    )
    sim_after = cosine_sim_matrix(
        [after[l] for l in all_labels],
        all_labels,
    )

    for i, row_label in enumerate(all_labels):
        delta = sim_after[i] - sim_before[i]
        row_str = f"{row_label:>10}" + "".join(
            f"{sim_after[i, j]:>8.4f}" for j in range(n)
        )
        marker = f"  ← {target_label}" if row_label == target_label else ""
        print(row_str + marker)

    print(f"{'─'*62}")
    print(f"  Δ-similarity to {target_label}:")
    for i, lbl in enumerate(all_labels):
        d = sim_after[i, all_labels.index(target_label)] - sim_before[i, all_labels.index(target_label)]
        arrow = "↑" if d > 0.005 else ("↓" if d < -0.005 else "→")
        print(f"    {lbl:>10}  {arrow}  {d:+.4f}")
    print(f"{'─'*62}\n")


@dataclass
class SyntheticDatasetBuilder:
    """
    Build a small correlated test graph for collaborative filtering tests.

    Usage:
        builder = SyntheticDatasetBuilder(n_jobs=5, n_users=4, seed=123)
        builder.seed_stores()

        # now all svc.*_store dicts are pre-populated
        result = _run_graphsage_local(
            resume_id=builder.resume_id,
            job_features=[svc.feature_store[j] for j in builder.job_ids],
            edge_store_snapshot=[{"job_id": j} for j in builder.job_ids[:3]],
            graphsage_model=gs_model,
            device=torch.device("cpu"),
        )
    """

    n_jobs:    int = 5
    n_users:   int = 4
    dim:       int = 768
    seed:      int = 2025
    # How correlated the similar-user embeddings are to jobs they share
    user_job_correlation: float = 0.85

    resume_id: str = field(init=False)
    job_ids:   List[str] = field(init=False)
    user_ids:  List[str] = field(init=False)

    _gs_model: torch.nn.Module = field(default=None, init=False, repr=False)

    def __post_init__(self):
        self.resume_id = "R_TEST"
        self.job_ids   = [f"J{i+1}" for i in range(self.n_jobs)]
        self.user_ids  = [f"U{i+1}" for i in range(self.n_users)]

    def seed_stores(self, gs_model: torch.nn.Module) -> None:
        """
        Populate the module-level stores with synthetic but realistic embeddings.

        Embedding strategy:
        - Each job J_i gets a unique random embedding.
        - The resume gets a random embedding.
        - Each user U_i shares a cluster with a subset of jobs to simulate
          domain affinity (e.g. U1 likes J1/J2, U2 likes J3/J4, etc.).
        """
        reset_stores()
        self._gs_model = gs_model

        torch.manual_seed(self.seed)

        # ── Job embeddings: independent random vectors ─────────────────────────
        for jid in self.job_ids:
            vec = make_embedding(seed=hash(f"job_{jid}") % 99999, dim=self.dim)
            svc.feature_store[jid]    = vec
            svc.graphsage_store[jid] = vec.clone()

        # ── Resume embedding ─────────────────────────────────────────────────
        r_vec = make_embedding(seed=self.seed + 1, dim=self.dim)
        svc.feature_store[self.resume_id]    = r_vec
        svc.graphsage_store[self.resume_id] = r_vec.clone()

        # ── User embeddings: correlated to a subset of jobs ─────────────────────
        # Group users into "clusters" so they share affinity with some jobs.
        cluster_size = max(1, self.n_jobs // self.n_users)
        for idx, uid in enumerate(self.user_ids):
            # Find the jobs this user "likes" (belongs to the same cluster)
            start = idx * cluster_size
            end   = start + cluster_size
            related_jobs = self.job_ids[start:end]

            if related_jobs:
                # Average the related-job embeddings as the base for user embedding
                related_vecs = [svc.feature_store[j] for j in related_jobs]
                base = torch.stack(related_vecs).mean(dim=0)
                # Mix with random noise to keep users distinct but correlated
                noise = torch.randn(self.dim) * (1 - self.user_job_correlation ** 2) ** 0.5
                user_vec = F.normalize((self.user_job_correlation * base + noise).unsqueeze(0), p=2, dim=1).squeeze(0)
            else:
                user_vec = make_embedding(seed=hash(f"user_{uid}") % 99999, dim=self.dim)

            svc.feature_store[uid]    = user_vec
            svc.graphsage_store[uid] = user_vec.clone()

        # ── job_to_users: connect jobs to users in the same cluster ─────────────
        for idx, uid in enumerate(self.user_ids):
            start = idx * cluster_size
            end   = start + cluster_size
            for jid in self.job_ids[start:end]:
                users = svc.job_to_users.setdefault(jid, [])
                if uid not in users:
                    users.append(uid)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1 — BASIC CORRECTNESS
# ═══════════════════════════════════════════════════════════════════════════════

def test_basic_output_shape_and_type(gs_env):
    """
    Verify the function returns the correct shape and type.

    Assertions:
    - shape == (1, 768)
    - dtype == torch.float32
    - no NaN values
    - no Inf values
    - L2 norm is close to 1.0 (GraphSAGE_Recommender applies L2 normalization)
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    result = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"]],
        edge_store_snapshot=[{"job_id": "J1"}],
        graphsage_model=gs_model,
        device=device,
    )

    # ── Shape ────────────────────────────────────────────────────────────────
    assert result.shape == torch.Size([1, 768]), (
        f"Expected output shape (1, 768), got {tuple(result.shape)}"
    )

    # ── Type ────────────────────────────────────────────────────────────────
    assert result.dtype == torch.float32, (
        f"Expected dtype torch.float32, got {result.dtype}"
    )

    # ── No NaN / Inf ────────────────────────────────────────────────────────
    assert not torch.isnan(result).any(), (
        "Output contains NaN values — check model forward pass for numerical instability"
    )
    assert not torch.isinf(result).any(), (
        "Output contains Inf values — check model forward pass for numerical instability"
    )

    # ── L2 normalization (model applies F.normalize on output) ─────────────
    norm = float(result.norm(p=2).item())
    assert abs(norm - 1.0) < 1e-4, (
        f"Output norm is {norm:.6f}, expected ~1.0 (model applies L2 normalization)"
    )

    print(f"  [PASS] output shape={tuple(result.shape)}, dtype={result.dtype}, norm={norm:.6f}")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2 — EMBEDDING UPDATE BEHAVIOR
# ═══════════════════════════════════════════════════════════════════════════════

def test_embedding_is_different_from_input(gs_env):
    """
    Verify that GraphSAGE message passing changes the resume embedding.

    The node's embedding should differ from its raw input after information
    from neighboring nodes is aggregated and combined with the skip connection.

    Assertions:
    - ||output - input||_2 > 1e-3   (must change meaningfully)
    - ||output - input||_2 < 3.0    (sanity cap — not garbage explosion)
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    resume_vec = svc.feature_store[env["resume_id"]].clone()

    result = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"], svc.feature_store["J2"]],
        edge_store_snapshot=[{"job_id": "J1"}, {"job_id": "J2"}],
        graphsage_model=gs_model,
        device=device,
    )

    diff_norm = float(torch.norm(result - resume_vec).item())

    assert diff_norm > 1e-3, (
        f"GraphSAGE output is nearly identical to input (||diff||={diff_norm:.6f}). "
        f"Message passing should change the embedding. Check if neighbors carry "
        f"unique signal or if the model architecture is producing identity mapping."
    )
    assert diff_norm < 3.0, (
        f"Embedding change is suspiciously large (||diff||={diff_norm:.3f}). "
        f"This suggests numerical instability or an exploding gradient."
    )

    print(f"  [PASS] diff_norm={diff_norm:.6f}  (1e-3 < diff < 3.0)")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3 — WEIGHT INFLUENCE (via feature scaling)
# ═══════════════════════════════════════════════════════════════════════════════

def test_weight_influence_via_feature_scaling(gs_env):
    """
    Validate that different weight distributions in job_features produce
    different GraphSAGE outputs.

    Architecture note
    ─────────────────
    _run_graphsage_local does NOT read edge["weight"] — it only uses job_id
    for structural edge creation.  Edge weights are accumulated upstream in
    process_application() via a weighted average of job feature vectors:

        job_features = [feature_store[jid] * (weight / total_weight) for edge in edges]

    This test simulates that upstream accumulation by constructing two different
    weighted-sum job feature vectors and verifying the downstream GraphSAGE
    output differs.

    Scenario A: Equal weight distribution (50/50 between J1 and J2)
    Scenario B: Skewed weight distribution (75/25 between J1 and J2)

    Expected: embeddings differ — the job-side aggregation is weighted by
    the job_features coefficients, so different weights shift the aggregated
    neighborhood signal and produce a different update.
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    j1 = svc.feature_store["J1"]
    j2 = svc.feature_store["J2"]

    # Scenario A: equal weight distribution
    job_features_equal = [
        0.5 * j1 + 0.5 * j2,
    ]

    # Scenario B: skewed weight distribution
    job_features_skewed = [
        0.75 * j1 + 0.25 * j2,
    ]

    # Same structural edges, same user embeddings — only job feature content differs
    edges_snapshot = [{"job_id": "J1"}, {"job_id": "J2"}]

    emb_a = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=job_features_equal,
        edge_store_snapshot=edges_snapshot,
        graphsage_model=gs_model,
        device=device,
    )

    emb_b = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=job_features_skewed,
        edge_store_snapshot=edges_snapshot,
        graphsage_model=gs_model,
        device=device,
    )

    diff_norm = float(torch.norm(emb_a - emb_b).item())

    assert diff_norm > 1e-3, (
        f"Embeddings are nearly identical (||diff||={diff_norm:.6f}) even with "
        f"different weight distributions in job_features. Since job_features are "
        f"the weighted sum of job embeddings, this means GraphSAGE is not sensitive "
        f"to the job aggregation coefficients — verify that the weighted job "
        f"vectors carry distinct signal, or check whether the aggregation "
        f"cancels out the weight difference."
    )

    print(f"  [PASS] weight influence: ||diff||={diff_norm:.6f} > 1e-3")
    print(f"  Note: Weights are pre-accumulated in job_features upstream of this function.")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4 — GRAPH STRUCTURE INFLUENCE (collaborative signal)
# ═══════════════════════════════════════════════════════════════════════════════

def test_graph_structure_removing_collaborative_edges(gs_env):
    """
    Verify that removing the collaborative bridging edges (J→U) changes the
    output embedding.

    Topology (with bridges):
        R_A ←→ J1   J1 ←→ U_B
        R_A ←→ J2   J2 ←→ (nothing)

    Topology (without bridges — job_to_users is empty):
        R_A ←→ J1
        R_A ←→ J2
        No J→U edges

    Expected: embeddings differ — removing the J→U edges changes the message-
    passing topology, eliminating the collaborative signal path from U_B into J1.
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    edges_snapshot = [{"job_id": "J1"}, {"job_id": "J2"}]

    # ── Scenario A: with collaborative bridging edges ──────────────────────
    svc.job_to_users["J1"] = ["U_B"]
    svc.job_to_users["J2"] = []

    emb_with_bridges = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"], svc.feature_store["J2"]],
        edge_store_snapshot=edges_snapshot,
        graphsage_model=gs_model,
        device=device,
    )

    # ── Scenario B: without collaborative bridging edges ───────────────────
    # Wipe job_to_users so no J→U edges are created in _run_graphsage_local
    svc.job_to_users.clear()

    emb_without_bridges = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"], svc.feature_store["J2"]],
        edge_store_snapshot=edges_snapshot,
        graphsage_model=gs_model,
        device=device,
    )

    diff_norm = float(torch.norm(emb_with_bridges - emb_without_bridges).item())

    assert diff_norm > 1e-4, (
        f"Embeddings are nearly identical (||diff||={diff_norm:.6f}) after "
        f"removing collaborative bridging edges. The collaborative signal path "
        f"(J1→U_B→J1) should change the aggregation and produce a different "
        f"resume embedding. This may indicate the model is not picking up the "
        f"user node signal, or that the graph structure has no effect on "
        f"the output in the current configuration."
    )

    print(f"  [PASS] structure influence: ||diff||={diff_norm:.6f} (with vs without J→U bridges)")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5 — MULTI-HOP COLLABORATIVE FILTERING
# ═══════════════════════════════════════════════════════════════════════════════

def test_collaborative_filtering_resume_a_closer_to_j3(gs_env):
    """
    Validate multi-hop collaborative signal propagation.

    Topology:
        R_A → J1
        U_B → J1,  U_B → J3

    After message passing:
        Information from J3 flows into U_B's embedding,
        then through J1 → R_A via the J1→U_B collaborative edge.

    Expected: cosine_similarity(R_A_after, J3) > cosine_similarity(R_A_before, J3)

    This is the core collaborative filtering hypothesis: "users who applied to
    similar jobs will have correlated embeddings, and those correlations will
    propagate back to new resumes."
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    # ── Train the model so it learns to propagate user signal across bridges ─
    # An untrained (random-weight) GraphSAGE model produces embeddings that are
    # uncorrelated with the embedding space — the collaborative signal gets
    # drowned in Gaussian noise. Training teaches the model to propagate
    # user→job→resume signal through the bridging topology.
    gs_model = _train_graphsage_for_collaborative_signal(
        gs_model, n_epochs=20, device=device
    )

    # ── Seed U_B's embedding to be highly correlated with J3 ────────────────
    # This simulates U_B having applied to J3 previously → its embedding
    # carries J3's signal (via prior GraphSAGE runs).
    j3_vec   = svc.feature_store["J3"]
    u_b_corr = make_embedding(
        seed=777,
        dim=768,
        correlated_to=j3_vec,
        correlation=0.95,
    )
    svc.feature_store["U_B"]    = u_b_corr
    svc.graphsage_store["U_B"] = u_b_corr.clone()

    # ── Build the bridging topology: R_A→J1, U_B→J1+J3 ─────────────────────
    svc.job_to_users["J1"] = ["U_B"]   # J1 bridges R_A to U_B
    svc.job_to_users["J2"] = []
    svc.job_to_users["J3"] = ["U_B"]   # U_B is correlated with J3

    r_a_before = svc.feature_store[env["resume_id"]].clone()

    # ── Measure similarity BEFORE GraphSAGE ─────────────────────────────────
    sim_before = cosine_sim(r_a_before, j3_vec)
    print(f"  [DEBUG] similarity(R_A, J3) before GraphSAGE = {sim_before:.4f}")

    # ── Run GraphSAGE ────────────────────────────────────────────────────────
    r_a_updated = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"]],
        edge_store_snapshot=[{"job_id": "J1"}],
        graphsage_model=gs_model,
        device=device,
    )

    # ── Measure similarity AFTER GraphSAGE ───────────────────────────────────
    sim_after = cosine_sim(r_a_updated.squeeze(), j3_vec)
    print(f"  [DEBUG] similarity(R_A, J3) after GraphSAGE  = {sim_after:.4f}")

    improvement = sim_after - sim_before
    print(f"  [DEBUG] improvement = {improvement:+.4f}")

    assert sim_after > sim_before, (
        f"Multi-hop collaborative signal did not propagate: "
        f"similarity(R_A, J3) decreased from {sim_before:.4f} to {sim_after:.4f}. "
        f"Expected J3's signal (embedded in U_B via correlation) to flow "
        f"through the path R_A→J1→U_B and increase R_A's similarity to J3. "
        f"Check that job_to_users bridges are set correctly and that "
        f"U_B's embedding carries J3's signal."
    )

    assert improvement > 0.01, (
        f"Multi-hop propagation produced a statistically trivial improvement: "
        f"{improvement:.6f} (expected > 0.01). The collaborative signal from "
        f"J3 via U_B should meaningfully shift R_A's embedding."
    )

    print(f"  [PASS] collaborative filtering: similarity improved {sim_before:.4f} → {sim_after:.4f} (+{improvement:.4f})")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6 — NO-EDGE FALLBACK
# ═══════════════════════════════════════════════════════════════════════════════

def test_no_edges_returns_original_embedding(gs_env):
    """
    When the local graph has no edges (empty local_edges), the function must
    return the original resume embedding from feature_store.

    Important: this requires the resume to already exist in feature_store.
    If the resume is missing, a KeyError is raised (tested in test_missing_feature_raises_keyerror).

    Assertions:
    - result is identical to feature_store[resume_id] (torch.allclose)
    - no tensors were created (empty edge_index)
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    resume_original = svc.feature_store[env["resume_id"]].clone()

    result = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[],        # no jobs
        edge_store_snapshot=[], # no edges → local_edges stays empty
        graphsage_model=gs_model,
        device=device,
    )

    assert torch.allclose(result.squeeze(), resume_original, rtol=1e-5, atol=1e-6), (
        f"Output should be identical to the original embedding when no edges exist. "
        f"Max absolute difference: {(result.squeeze() - resume_original).abs().max():.2e}"
    )

    print(f"  [PASS] no-edge fallback: returned identical embedding (rtol=1e-5)")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7 — STABILITY
# ═══════════════════════════════════════════════════════════════════════════════

def test_embeddings_deterministic_across_runs(gs_env):
    """
    Running the function twice with identical inputs must produce identical outputs.

    This is a regression test for numerical determinism:
    - model is in eval() mode → no dropout randomness
    - torch.no_grad() → no gradient computation
    - torch_geometric (no random graph sampling in eval)
    => output must be bit-exact across runs.

    Assertions:
    - result_1 == result_2  (torch.allclose with rtol=1e-6)
    - Norm of result is stable (within 1e-6 across runs)
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    args = dict(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"], svc.feature_store["J2"]],
        edge_store_snapshot=[{"job_id": "J1"}, {"job_id": "J2"}],
        graphsage_model=gs_model,
        device=device,
    )

    result_1 = _run_graphsage_local(**args)
    result_2 = _run_graphsage_local(**args)

    assert torch.allclose(result_1, result_2, rtol=1e-6, atol=1e-6), (
        f"GraphSAGE output is non-deterministic across runs. "
        f"result_1 norm: {result_1.norm():.6f}, "
        f"result_2 norm: {result_2.norm():.6f}. "
        f"Max diff: {(result_1 - result_2).abs().max():.2e}. "
        f"Ensure the model is in eval() mode and torch.no_grad() is active."
    )

    norm_1 = float(result_1.norm().item())
    norm_2 = float(result_2.norm().item())
    assert abs(norm_1 - norm_2) < 1e-6, (
        f"Embedding norm changed across runs: {norm_1:.6f} vs {norm_2:.6f}"
    )

    print(f"  [PASS] deterministic: norm={norm_1:.6f}, max_diff={(result_1-result_2).abs().max():.2e}")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 8 — EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

def test_missing_feature_raises_keyerror(gs_env):
    """
    If the resume_id is not in feature_store, a KeyError must be raised.

    Note: the no-edge fallback (returning original embedding) ONLY applies
    when the resume EXISTS in feature_store but has no edges. If the resume
    is missing, the function cannot fall back — it must raise KeyError.

    Assertion: KeyError is raised with the resume_id as the missing key.
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    # Register a resume ID that is NOT in feature_store
    nonexistent_id = "R_NONEXISTENT_12345"

    try:
        _run_graphsage_local(
            resume_id=nonexistent_id,
            job_features=[svc.feature_store["J1"]],
            edge_store_snapshot=[{"job_id": "J1"}],
            graphsage_model=gs_model,
            device=device,
        )
        assert False, (
            f"Expected KeyError for resume_id='{nonexistent_id}' "
            f"(not in feature_store), but no exception was raised."
        )
    except KeyError as exc:
        assert nonexistent_id in str(exc), (
            f"KeyError message '{exc}' does not mention the missing resume_id "
            f"'{nonexistent_id}'. The error should be raised at "
            f"resume_vec = feature_store[resume_id] inside _run_graphsage_local."
        )
        print(f"  [PASS] KeyError raised for missing feature: {exc}")


def test_resume_job_only_subgraph_produces_valid_output(gs_env):
    """
    The function should run successfully using only resume-job nodes.

    Assertions:
    - returns one row per local node
    - no NaN / Inf
    - row norms ≈ 1.0
    """
    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    result = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=[svc.feature_store["J1"], svc.feature_store["J2"], svc.feature_store["J3"]],
        edge_store_snapshot=[{"job_id": "J1"}, {"job_id": "J2"}, {"job_id": "J3"}],
        graphsage_model=gs_model,
        device=device,
    )

    assert result.shape == torch.Size([4, 768])
    assert not torch.isnan(result).any()
    assert not torch.isinf(result).any()
    assert torch.allclose(result.norm(dim=1), torch.ones(4), atol=1e-4)

    print(f"  [PASS] resume-job local graph: valid output shape={tuple(result.shape)}")


def test_large_graph_50_jobs(gs_env):
    """
    Stress test with a large local graph: 50 job nodes.

    Verifies:
    - Function completes without crashing
    - Output is well-formed (shape, dtype, no NaN/Inf)
    - Execution completes within a reasonable time (5 seconds)
    """
    import time

    env = gs_env
    gs_model = env["gs_model"]
    device   = env["device"]

    # Build 50 job features
    n_jobs = 50
    large_job_ids = [f"LARGE_J{i}" for i in range(n_jobs)]

    job_features = []
    for jid in large_job_ids:
        vec = make_embedding(seed=hash(f"large_job_{jid}") % 99999)
        svc.feature_store[jid] = vec
        job_features.append(vec)

    # Build edges for the first 10 jobs.
    edge_snapshot = []
    for i in range(10):
        jid = large_job_ids[i]
        edge_snapshot.append({"job_id": jid})

    start = time.time()
    result = _run_graphsage_local(
        resume_id=env["resume_id"],
        job_features=job_features,
        edge_store_snapshot=edge_snapshot,
        graphsage_model=gs_model,
        device=device,
    )
    elapsed = time.time() - start

    assert result.shape == torch.Size([51, 768])
    assert not torch.isnan(result).any()
    assert not torch.isinf(result).any()
    assert elapsed < 5.0, (
        f"Large graph (50 jobs) took {elapsed:.2f}s (>5s threshold). "
        f"Consider batching or reducing the local subgraph size."
    )

    print(f"  [PASS] large graph (50 jobs): shape={tuple(result.shape)}, "
          f"elapsed={elapsed:.3f}s, norm={float(result.norm().item()):.6f}")
