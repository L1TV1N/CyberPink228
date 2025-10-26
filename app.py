import os
from pathlib import Path
from flask import Flask, request, send_from_directory
from werkzeug.utils import secure_filename
from core.pipeline import run_pipeline

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RESULTS_DIR = BASE_DIR / "results"
WEB_DIR = BASE_DIR / "web"
ALLOWED_EXTENSIONS = {"csv", "xls", "xlsx"}

app = Flask(
    __name__,
    static_folder=str(WEB_DIR / "static"),
    template_folder=str(WEB_DIR)
)

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return "No file part", 400
    file = request.files["file"]
    if file.filename == "":
        return "No selected file", 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        file_path = DATA_DIR / filename
        file.save(file_path)
        try:
            run_pipeline(file_path)
        except Exception as e:
            return f"Error while running pipeline: {e}", 500
        url_file = RESULTS_DIR / "URL.txt"
        if not url_file.exists():
            return "Pipeline completed, but URL.txt not found", 500
        return "OK", 200
    return "File type not allowed", 400

@app.route("/last_url", methods=["GET"])
def last_url():
    url_file = RESULTS_DIR / "URL.txt"
    if not url_file.exists():
        return ("", 204)
    with open(url_file, "r", encoding="utf-8") as f:
        url = f.read().strip()
    if not url:
        return ("", 204)
    return url

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(WEB_DIR / "static", filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
