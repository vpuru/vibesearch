from flask import Flask, send_from_directory
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__, static_folder="../dist", static_url_path="/")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return {"status": "ok", "message": "API is running"}

    # Serve static files and index.html for all non-API routes
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return ("Not Found", 404)
        static_folder = app.static_folder
        file_path = os.path.join(static_folder, path)
        if path != "" and os.path.exists(file_path):
            return send_from_directory(static_folder, path)
        return send_from_directory(static_folder, "index.html")

    return app
