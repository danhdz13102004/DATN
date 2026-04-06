"""Download base models for local development.

Run this script ONCE to populate ai-service/models/ with:
  - finetuned_mpnet_job_matcher/  (base sentence-transformers model)
  - graphsage_recommender.pt      (initial untrained checkpoint)

Usage:
    python ai-service/scripts/download_base_models.py
"""

import os
import sys

# Ensure project root imports work
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ── 1. Download SentenceTransformer base model ────────────────────────────────
NLP_DIR = os.path.join(MODELS_DIR, "finetuned_mpnet_job_matcher")

print(f"[1/2] Downloading 'all-mpnet-base-v2' → {NLP_DIR}")
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-mpnet-base-v2")
model.save(NLP_DIR)
print(f"  ✓ NLP model saved to {NLP_DIR}")

# ── 2. Create initial GraphSAGE checkpoint ────────────────────────────────────
GRAPHSAGE_PATH = os.path.join(MODELS_DIR, "graphsage_recommender.pt")

print(f"[2/2] Creating initial GraphSAGE checkpoint → {GRAPHSAGE_PATH}")

import torch
import torch.nn as nn
import torch.nn.functional as F

# Import SAGEConv — must match the architecture in model_registry.py
from torch_geometric.nn import SAGEConv

EMBEDDING_DIM = 768


class GraphSAGE_Recommender(nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)

    def forward(self, x, edge_index):
        x0 = x
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.1, training=self.training)
        x = self.conv2(x, edge_index)
        x = x + x0
        return F.normalize(x, p=2, dim=1)


gs_model = GraphSAGE_Recommender(
    in_channels=EMBEDDING_DIM,
    hidden_channels=EMBEDDING_DIM,
)

torch.save(
    {
        "model_state_dict": gs_model.state_dict(),
        "num_users": 0,
        "num_items": 0,
    },
    GRAPHSAGE_PATH,
)
print(f"  ✓ GraphSAGE checkpoint saved to {GRAPHSAGE_PATH}")

print("\n✅ All models ready. Restart the ai-service container to load them.")
