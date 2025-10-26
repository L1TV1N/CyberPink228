"""Lightweight GNN implemented with PyTorch.

This GNN is intentionally simple and dependency-free (only torch).
It computes node embeddings via message passing where messages are
distance-weighted average of neighbor features.

The model expects a dense adjacency matrix (N x N) and node features (N x F).
It returns a scalar score per node which we interpret as a priority score.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class SimpleGNN(nn.Module):
    def __init__(self, in_dim, hidden_dim=32):
        super().__init__()
        self.lin1 = nn.Linear(in_dim, hidden_dim)
        self.lin2 = nn.Linear(hidden_dim, hidden_dim)
        self.readout = nn.Linear(hidden_dim, 1)

    def forward(self, x, adj):
        # x: [N, F], adj: [N, N] (torch tensor)
        h = F.relu(self.lin1(x))
        # message passing: h' = D^{-1} A h
        deg = adj.sum(dim=1, keepdim=True) + 1e-6
        msg = torch.matmul(adj, h) / deg
        h = F.relu(self.lin2(msg))
        scores = self.readout(h).squeeze(-1)
        return scores
