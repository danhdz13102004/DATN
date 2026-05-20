"""Pytest configuration and shared fixtures for the GraphSAGE recommendation test suite."""

import sys
from pathlib import Path

import pytest
import torch
import torch.nn.functional as F

# ── Ensure ai-service package root is on sys.path ─────────────────────────────
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.ml.model_registry import GraphSAGE_Recommender
from app.services import recommendation_service as svc


# ── Helpers (reusable outside pytest context) ──────────────────────────────────

def build_gs_model(in_channels: int = 768, hidden_channels: int = 768) -> torch.nn.Module:
    """Build a lightweight 2-layer GraphSAGE model matching the production architecture."""
    return GraphSAGE_Recommender(in_channels=in_channels, hidden_channels=hidden_channels)


def make_embedding(
    seed: int,
    dim: int = 768,
    correlated_to: torch.Tensor | None = None,
    correlation: float = 0.8,
) -> torch.Tensor:
    """
    Create a deterministic L2-normalized random embedding.

    Args:
        seed:          Random seed for reproducibility.
        dim:           Embedding dimension (default 768).
        correlated_to: If provided, the new embedding will have the specified
                       cosine similarity to this tensor (for collaborative filtering tests).
        correlation:   Target cosine similarity when correlated_to is provided.
    """
    torch.manual_seed(seed)
    base = torch.randn(dim)

    if correlated_to is not None:
        base = correlation * correlated_to + torch.randn(dim) * (1 - correlation ** 2) ** 0.5

    vec = F.normalize(base.unsqueeze(0), p=2, dim=1).squeeze(0)
    return vec


def cosine_sim(a: torch.Tensor, b: torch.Tensor) -> float:
    """Compute cosine similarity between two 1-D tensors. Returns a Python float."""
    a, b = a.squeeze(), b.squeeze()
    return float(torch.nn.functional.cosine_similarity(a.unsqueeze(0), b.unsqueeze(0)).item())


def reset_stores() -> None:
    """Wipe all module-level in-memory stores used by recommendation_service."""
    svc.feature_store.clear()
    svc.graphsage_store.clear()
    svc.edge_store.clear()
    svc.job_to_users.clear()
    svc.raw_node_store.clear()
    svc.edge_metadata.clear()
    svc.job_catalog.clear()
    svc.job_catalog_index.clear()


# ── Pytest fixtures ───────────────────────────────────────────────────────────

@pytest.fixture(autouse=False)
def gs_env():
    """
    Standard test environment with pre-seeded stores and a lightweight GraphSAGE model.

    Returns a dict with:
        resume_id  – str
        job_ids    – list[str]   ["J1", "J2", "J3"]
        user_ids   – list[str]   ["U_B", "U_C"]
        gs_model   – torch.nn.Module (2-layer SAGEConv, eval mode)
        device     – torch.device (cpu)

    Example usage in a test:
        env = gs_env()
        result = _run_graphsage_local(
            resume_id=env["resume_id"],
            job_features=[svc.feature_store["J1"]],
            user_features=[svc.graphsage_store["U_B"]],
            edge_store_snapshot=[{"job_id": "J1"}],
            similar_users=["U_B"],
            graphsage_model=env["gs_model"],
            device=env["device"],
        )
    """
    reset_stores()

    device = torch.device("cpu")
    gs_model = build_gs_model().to(device)
    gs_model.eval()

    # ── Job embeddings (random, uncorrelated) ──────────────────────────────────
    job_ids = ["J1", "J2", "J3"]
    for jid in job_ids:
        svc.feature_store[jid]    = make_embedding(seed=hash(f"job_{jid}") % 99999)
        svc.graphsage_store[jid] = svc.feature_store[jid].clone()

    # ── Resume embedding ────────────────────────────────────────────────────────
    resume_id = "R_A"
    svc.feature_store[resume_id]    = make_embedding(seed=42)
    svc.graphsage_store[resume_id] = svc.feature_store[resume_id].clone()

    # ── Similar-user embeddings ────────────────────────────────────────────────
    user_ids = ["U_B", "U_C"]
    for uid in user_ids:
        svc.feature_store[uid]    = make_embedding(seed=hash(f"user_{uid}") % 99999)
        svc.graphsage_store[uid] = svc.feature_store[uid].clone()

    return {
        "resume_id": resume_id,
        "job_ids":   job_ids,
        "user_ids":  user_ids,
        "gs_model":  gs_model,
        "device":    device,
    }


@pytest.fixture(autouse=True)
def clean_stores():
    """Ensure stores are clean before and after every test."""
    reset_stores()
    yield
    reset_stores()


# ── Collaborative-filtering model trainer ──────────────────────────────────────

def _train_graphsage_for_collaborative_signal(
    model: torch.nn.Module,
    n_epochs: int = 20,
    lr: float = 0.01,
    device: torch.device = torch.device("cpu"),
) -> torch.nn.Module:
    """
    Train a GraphSAGE model so that resume embeddings move closer to jobs that
    share a collaborative bridge through a common user.

    Topology used during training (3 jobs + 1 user + 1 resume):
        R → J0   J0 ↔ U   J1 ↔ U
        R → J1

    Loss target: after message passing, ||R - J0|| decreases more than ||R - J1||
    because J0 is connected to U (which is also connected to J1, establishing
    a multi-hop path R→J0→U→J1).

    This teaches the model to propagate user signal across job→user→job bridges.
    """
    torch.manual_seed(0)
    model.train()

    dim = 768
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    # Fixed, deterministic node embeddings — rebuilt fresh for every call
    r_vec  = make_embedding(seed=42,       dim=dim)
    j0_vec = make_embedding(seed=101,      dim=dim)
    j1_vec = make_embedding(seed=202,      dim=dim)
    u_vec  = make_embedding(seed=303,      dim=dim)

    x = torch.stack([r_vec, j0_vec, j1_vec, u_vec], dim=0).to(device)
    # R(0)→J0(1), J0→R, R→J1(2), J1→R, J0↔U(3), U→J0
    edge_index = torch.tensor([
        [0, 1, 0, 2, 1, 3, 3, 1],
        [1, 0, 2, 0, 3, 1, 1, 3],
    ], dtype=torch.long, device=device)

    for _ in range(n_epochs):
        optimizer.zero_grad()
        out = model(x, edge_index)
        r_emb, j0_emb, j1_emb, u_emb = out[0], out[1], out[2], out[3]

        # Target: bring R closer to J0 (bridge-connected via U) than to J1
        pos_dist = 1 - F.cosine_similarity(r_emb.unsqueeze(0), j0_emb.unsqueeze(0))
        neg_dist = 1 - F.cosine_similarity(r_emb.unsqueeze(0), j1_emb.unsqueeze(0))
        loss = (neg_dist - pos_dist + 0.1).clamp(min=0)

        loss.backward()
        optimizer.step()

    model.eval()
    return model
