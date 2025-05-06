import os
import uvicorn
from fastapi import FastAPI, Request, Response # Import Response
from google.adk.cli.fast_api import get_fast_api_app
import json

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Example session DB URL (e.g., SQLite)
SESSION_DB_URL = "sqlite:///./sessions.db"
# Example allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]
# Set web=True if you intend to serve a web interface, False otherwise
SERVE_WEB_INTERFACE = True # <-- Disable web interface

# Call the function to get the FastAPI app instance
app: FastAPI = get_fast_api_app(
    agent_dir=AGENT_DIR,
    session_db_url=SESSION_DB_URL,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# --- Keep endpoint to inspect routes for debugging ---
@app.get("/routes", tags=["Admin"], summary="List all registered API routes")
async def get_registered_routes():
    """Returns a JSON list of all routes registered in the FastAPI application."""
    route_list = []
    for route in app.routes:
        route_info = {
            "path": getattr(route, "path", "N/A"),
            "name": getattr(route, "name", "N/A"),
            "methods": sorted(list(getattr(route, "methods", {}))) if hasattr(route, "methods") else "N/A",
        }
        if hasattr(route, "endpoint"):
             route_info["endpoint"] = f"{getattr(route.endpoint, '__module__', '')}.{getattr(route.endpoint, '__name__', '')}"
        route_list.append(route_info)
    
    # Return as JSON response
    return Response(
        content=json.dumps(route_list, indent=2, default=str),
        media_type="application/json"
    )
# -------------------------------------

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    print(f"Starting Uvicorn on 0.0.0.0:{os.environ.get('PORT', 8080)}")
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
