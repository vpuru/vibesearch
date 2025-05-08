from flask import Flask, jsonify
from flask_cors import CORS
from app.routes import search_bp

def create_app():
    app = Flask(__name__)
    # Enable CORS for all origins
    CORS(
        app,
        origins="*",
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Accept"],
        methods=["GET", "POST", "OPTIONS"]
    )

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify the API is running"""
        return jsonify({"status": "ok", "message": "API is running"})

    # Register the search blueprint
    app.register_blueprint(search_bp)

    return app
