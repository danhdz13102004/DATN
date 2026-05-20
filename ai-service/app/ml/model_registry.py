"""Model registry — singleton model store loaded once at startup via FastAPI lifespan."""

import logging
import os
import time
from typing import Any, Dict, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import MessagePassing
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768


# ── GraphSAGE architecture (must match training config — v2.4) ────────────────
#
# WeightedSAGEConv replaces the standard SAGEConv used in earlier checkpoints.
# Key differences from torch_geometric SAGEConv:
#   • Parameter names: lin_self / lin_neigh  (SAGEConv uses lin_l / lin_r)
#   • forward() accepts an optional edge_weight tensor  (per-edge float in [0,1])
#   • Aggregation: epsilon-normalised weighted mean instead of uniform mean
#
# This class must be kept in sync with the notebook definition so that
# load_state_dict() succeeds with the v2.4 checkpoint.

class WeightedSAGEConv(MessagePassing):
    """SAGEConv with weighted mean neighbour aggregation (epsilon-normalised).

    During inference, edge_weight fuses two signals:
        semantic_weight  = cos²(feature_store[src], feature_store[dst])
        behavioral_weight = ACTION_WEIGHT_MAP[action_type]  (apply=1.0, save=0.7, click=0.1)
        final_weight     = semantic_weight × behavioral_weight

    When edge_weight is None (e.g. cold-start, no edges) the layer falls back
    to a uniform mean — identical behaviour to standard SAGEConv.
    """

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__(aggr="add")
        self.lin_self  = nn.Linear(in_channels, out_channels)
        self.lin_neigh = nn.Linear(in_channels, out_channels, bias=False)

    def reset_parameters(self):
        self.lin_self.reset_parameters()
        self.lin_neigh.reset_parameters()

    def forward(
        self,
        x:           torch.Tensor,
        edge_index:  torch.Tensor,
        edge_weight: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        N = x.size(0)
        if edge_weight is None:
            edge_weight = torch.ones(edge_index.size(1), device=x.device)

        # Denominator: sum of incoming weights per destination node
        dst   = edge_index[1]
        w_sum = torch.zeros(N, device=x.device)
        w_sum.scatter_add_(0, dst, edge_weight)
        w_sum = w_sum.unsqueeze(1)  # (N, 1)

        # Numerator: weighted sum of neighbour features
        agg = self.propagate(edge_index, x=x, edge_weight=edge_weight)  # (N, C)

        # Epsilon-normalised weighted mean — ε only fires for isolated nodes
        neigh_mean = agg / (w_sum + 1e-8)  # (N, C)

        return self.lin_self(x) + self.lin_neigh(neigh_mean)

    def message(self, x_j: torch.Tensor, edge_weight: torch.Tensor) -> torch.Tensor:
        return edge_weight.view(-1, 1) * x_j


class GraphSAGE_Recommender(nn.Module):
    """Two-layer GraphSAGE with semantic-confidence weighted mean aggregation.

    Architecture matches the v2.4 training notebook exactly:
    - Input/hidden/output: 768-d throughout (no compression)
    - Residual connection: preserves pre-trained NLP signal across GNN layers
    - edge_weight: optional per-edge confidence score; falls back to uniform mean when None
    """

    def __init__(self, in_channels: int, hidden_channels: int):
        super().__init__()
        self.conv1 = WeightedSAGEConv(in_channels, hidden_channels)
        self.conv2 = WeightedSAGEConv(hidden_channels, hidden_channels)

    def forward(
        self,
        x:           torch.Tensor,
        edge_index:  torch.Tensor,
        edge_weight: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        x0 = x
        x  = self.conv1(x, edge_index, edge_weight)
        x  = F.relu(x)
        x  = F.dropout(x, p=0.1, training=self.training)
        x  = self.conv2(x, edge_index, edge_weight)
        x  = x + x0
        return F.normalize(x, p=2, dim=1)


# ── Registry ──────────────────────────────────────────────────────────────────

class ModelRegistry:
    """Holds all loaded ML models. Loaded once at startup, shared across requests."""

    def __init__(self):
        self._models:    Dict[str, Any] = {}
        self._is_loaded: bool           = False
        self._version:   str            = settings.model_version
        self._device:    torch.device   = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

    @property
    def version(self) -> str:
        return self._version

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def device(self) -> torch.device:
        return self._device

    def load_models(self):
        """Load GraphSAGE + NLP models from configured paths.

        In development, missing model artifacts are logged as warnings and the
        service continues to start (is_loaded stays False). In production you
        should ensure the model volume is properly mounted before starting.
        """
        start = time.time()
        logger.info(
            "Loading models from '%s' (version: %s, device: %s)",
            settings.model_path, self._version, self._device,
        )

        graphsage_path = os.path.join(settings.model_path, "graphsage_recommender_v2.4.pt")
        nlp_path       = os.path.join(settings.model_path, "finetuned_mpnet_job_matcher")

        # ── Validate paths exist ──────────────────────────────────────────────
        nlp_missing       = not os.path.exists(nlp_path)
        graphsage_missing = not os.path.exists(graphsage_path)

        if nlp_missing or graphsage_missing:
            if nlp_missing:
                logger.warning(
                    "Fine-tuned NLP model not found at '%s'. "
                    "Set AI_SERVICE_MODEL_PATH and mount the models volume. "
                    "Service will start in DEGRADED mode — inference endpoints will return 503.",
                    nlp_path,
                )
            if graphsage_missing:
                logger.warning(
                    "GraphSAGE checkpoint not found at '%s'. "
                    "Set AI_SERVICE_MODEL_PATH and mount the models volume. "
                    "Service will start in DEGRADED mode — inference endpoints will return 503.",
                    graphsage_path,
                )
            self._is_loaded = False
            return

        # ── Load NLP (SentenceTransformer) ────────────────────────────────────
        logger.info("Loading NLP model from '%s' ...", nlp_path)
        self._models["nlp"] = SentenceTransformer(nlp_path, device=str(self._device))
        logger.info("NLP model loaded.")

        # ── Load GraphSAGE ────────────────────────────────────────────────────
        logger.info("Loading GraphSAGE checkpoint from '%s' ...", graphsage_path)
        checkpoint = torch.load(graphsage_path, map_location=self._device)
        gs_model = GraphSAGE_Recommender(
            in_channels=EMBEDDING_DIM,
            hidden_channels=EMBEDDING_DIM,
        ).to(self._device)
        gs_model.load_state_dict(checkpoint["model_state_dict"])
        gs_model.eval()
        self._models["graphsage"] = gs_model

        elapsed = time.time() - start
        logger.info(
            "All models loaded in %.2fs — num_users=%s, num_items=%s",
            elapsed,
            checkpoint.get("num_users"),
            checkpoint.get("num_items"),
        )
        self._is_loaded = True

    def unload_models(self):
        """Release model resources on shutdown."""
        self._models.clear()
        self._is_loaded = False
        logger.info("Models unloaded.")

    def get(self, name: str) -> Any:
        """Retrieve a loaded model by name ('nlp' or 'graphsage')."""
        if not self._is_loaded:
            raise RuntimeError("Models are not yet loaded.")
        model = self._models.get(name)
        if model is None:
            raise KeyError(f"No model registered under name '{name}'.")
        return model


model_registry = ModelRegistry()
