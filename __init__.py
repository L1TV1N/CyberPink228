"""Package entry for route_gnn_project.

Expose a single function `run_pipeline(input_path, output_dir, config)` which:
 - loads input xlsx/csv,
 - runs GNN inference to compute priority scores,
 - computes an optimized route (via Yandex Routing if API key provided, else heuristic),
 - writes results JSON and an HTML interactive map to output_dir.

This package is intended as a backend structure: data/, core/, results/.
"""

from core.pipeline import run_pipeline

__all__ = ["run_pipeline"]
