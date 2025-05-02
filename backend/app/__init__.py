from flask import Flask, request, jsonify
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    
    # Define allowed origins
    allowed_origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080", 
        "http://localhost:3000",
        "http://localhost:5173",
        "https://vibesearch-ui.vercel.app",
    ]
    
    # Configure CORS properly with a single declaration
    CORS(
        app,
        origins=allowed_origins,
        supports_credentials=True,
        resources={r"/api/*": {"origins": allowed_origins}},
        allow_headers=["Content-Type", "Authorization", "Accept"],
        methods=["GET", "POST", "OPTIONS"],
        max_age=3600
    )

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify the API is running"""
        return {"status": "ok", "message": "API is running"}
    
    # Import and register blueprints
    from app.routes import search_bp
    app.register_blueprint(search_bp)

    return app
