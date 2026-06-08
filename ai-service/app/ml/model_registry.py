"""Model registry — singleton model store loaded once at startup via FastAPI lifespan."""

import logging
import os
import time
from typing import Any, Dict

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768


class GraphSAGE_Recommender(nn.Module):
    """Two-layer homogeneous GraphSAGE on a resume-job bipartite graph.

    - input = MPNet/SentenceTransformer node features
    - GraphSAGE message passing over candidate-job edges
    - residual connection keeps pretrained semantic signal
    """

    def __init__(
        self,
        in_channels: int,
        hidden_channels: int | None = None,
        dropout: float = 0.25,
    ):
        super().__init__()
        if hidden_channels is None:
            hidden_channels = in_channels

        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, in_channels)
        self.dropout = nn.Dropout(dropout)
        self.norm1 = nn.LayerNorm(hidden_channels)
        self.norm2 = nn.LayerNorm(in_channels)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        h = self.conv1(x, edge_index)
        h = self.norm1(h)
        h = F.relu(h)
        h = self.dropout(h)

        h = self.conv2(h, edge_index)
        h = self.norm2(h)

        return F.normalize(x + h, p=2, dim=1)


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

        graphsage_path = os.path.join(settings.model_path, "graphsage_2node_new_dataset.pt")
        nlp_path       = os.path.join(settings.model_path, "finetuned_mpnet_v2_hard_neg")

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
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        gs_model.load_state_dict(state_dict)
        gs_model.eval()
        self._models["graphsage"] = gs_model

        elapsed = time.time() - start
        logger.info(
            "All models loaded in %.2fs — num_users=%s, num_items=%s",
            elapsed,
            checkpoint.get("num_users") if isinstance(checkpoint, dict) else None,
            checkpoint.get("num_items") if isinstance(checkpoint, dict) else None,
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
