from core.pipeline import run_pipeline
from core.config import Config
from pathlib import Path

def test_run_pipeline_smoke():
    input_path = Path(__file__).parent.parent / 'data' / 'test_list.csv'
    out = run_pipeline(input_path, output_dir=str(Path(__file__).parent.parent / 'results'), config=Config())
    assert 'ordered_points' in out or 'yandex_payload' in out
