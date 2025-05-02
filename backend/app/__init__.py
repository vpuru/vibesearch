from flask import Flask, request, make_response
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow requests from the frontend
    CORS(app, origins=["https://vibesearch-ui.vercel.app"])

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify the API is running"""
        return {"status": "ok", "message": "API is running"}

    return app
