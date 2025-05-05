import functions_framework
import flask
import requests
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

# --- Agent Backend Configuration ---
# Load Cloud Run service URLs from environment variables.
# Make sure to set these variables in your Cloud Function!
AGENT_URLS = {
    "foncorp-travel-agent": os.environ.get("TRAVEL_AGENT_URL"),
    "foncorp-it-support-agent": os.environ.get("IT_SUPPORT_AGENT_URL"),
    "foncorp-hr-agent": os.environ.get("HR_AGENT_URL"),
    # Add more agents here if needed
}
# -----------------------------------------

# --- Optional: Authentication for Cloud Run (if private) ---
def get_google_id_token(target_audience_url):
    """Gets a Google ID token for the specified audience."""
    if not target_audience_url:
        logging.warning("Target audience URL is empty, cannot get ID token.")
        return None
    try:
        metadata_server_url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity"
        auth_req = requests.Request(
            "GET",
            metadata_server_url,
            params={"audience": target_audience_url},
            headers={"Metadata-Flavor": "Google"},
        )
        prepped = auth_req.prepare()
        # Use a short timeout as the metadata server should be fast
        response = requests.Session().send(prepped, timeout=3)
        response.raise_for_status() # Raise exception for HTTP errors
        return response.text
    except requests.exceptions.Timeout:
        logging.error(f"Timeout getting ID token for {target_audience_url} from metadata server.")
        return None
    except requests.exceptions.RequestException as e:
        logging.error(f"Error getting ID token for {target_audience_url}: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error getting ID token: {e}")
        return None
# -------------------------------------------------------------

@functions_framework.http
def foncorp_cff_gateway(request: flask.Request) -> flask.Response:
    """
    Cloud Function HTTP gateway for Foncorp agents.
    Receives JSON { message: string, history: [], agentId: string }
    and forwards it to the corresponding ADK agent on Cloud Run.
    """

    # Set CORS headers for all responses
    headers = {
        'Access-Control-Allow-Origin': '*', # Adjust for production if needed
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json' # Default Content-Type for responses
    }

    # Handle OPTIONS preflight request for CORS
    if request.method == 'OPTIONS':
        return ('', 204, headers)

    # Ensure it's a POST request
    if request.method != 'POST':
        return flask.make_response(json.dumps({'error': 'Method Not Allowed'}), 405, headers)

    # Get JSON data from the request body
    try:
        data = request.get_json(silent=True)
        if not data:
            logging.error("Request body is not valid JSON or is empty.")
            return flask.make_response(json.dumps({'error': 'Request body must be valid JSON'}), 400, headers)

        message = data.get('message')
        history = data.get('history', []) # History might be empty
        agent_id = data.get('agentId')

        logging.info(f"Received request for agentId: {agent_id}")

        # Validate required fields
        if not message or not agent_id:
            missing_fields = []
            if not message: missing_fields.append('message')
            if not agent_id: missing_fields.append('agentId')
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logging.error(error_msg)
            return flask.make_response(json.dumps({'error': error_msg}), 400, headers)

    except Exception as e:
        logging.error(f"Error parsing request JSON: {e}")
        return flask.make_response(json.dumps({'error': 'Internal error parsing request'}), 500, headers)

    # --- Routing Logic ---
    target_url = AGENT_URLS.get(agent_id)

    if not target_url:
        error_msg = f"AgentId '{agent_id}' not recognized or URL not configured."
        logging.error(error_msg)
        return flask.make_response(json.dumps({'error': error_msg}), 404, headers)
    # -------------------

    logging.info(f"Forwarding request to agent {agent_id} at {target_url}")

    # --- Prepare and Send Request to Backend Agent (Cloud Run) ---
    backend_payload = {
        "message": message,
        "history": history,
        # Add other fields if your ADK agent expects them
    }

    backend_headers = {
        'Content-Type': 'application/json',
    }

    # Obtain authentication token if the service requires it
    id_token = get_google_id_token(target_url)
    if id_token:
        backend_headers['Authorization'] = f'Bearer {id_token}'
        logging.info(f"Using auth token to call {target_url}")
    else:
        logging.warning(f"Could not obtain ID token for {target_url}. Calling without auth (is it public?).")
        # If the service MUST be private and no token, consider returning a 500 error here.

    try:
        backend_response = requests.post(
            target_url,
            headers=backend_headers,
            json=backend_payload,
            timeout=45  # Increased timeout (e.g., 45 seconds)
        )

        # Log backend response status
        logging.info(f"Backend response ({agent_id} @ {target_url}): Status {backend_response.status_code}")

        # Propagate error if backend failed
        backend_response.raise_for_status() # Raise exception for 4xx/5xx codes

        # Return backend response to the frontend
        # Assume backend returns JSON with 'response' or 'error'
        try:
            response_data = backend_response.json()
        except json.JSONDecodeError:
            logging.error(f"Backend ({agent_id}) did not return valid JSON. Response text: {backend_response.text[:500]}") # Log snippet
            return flask.make_response(json.dumps({'error': 'Backend returned non-JSON response'}), 502, headers)

        # Ensure response format is consistent for the frontend
        if 'response' not in response_data and 'error' not in response_data:
             logging.warning(f"Backend response for {agent_id} lacks 'response'/'error'. Returning raw: {response_data}")
             # Decide how to handle: wrap it or return as is
             # final_response_data = {'response': json.dumps(response_data)} # Example: wrap
             final_response_data = response_data # Example: return raw
        else:
            final_response_data = response_data

        # Use Flask's jsonify to correctly format the JSON response and set Content-Type
        return flask.jsonify(final_response_data)
        # return flask.make_response(json.dumps(final_response_data), backend_response.status_code, headers)

    except requests.exceptions.Timeout:
        logging.error(f"Timeout calling backend {agent_id} at {target_url}")
        return flask.make_response(json.dumps({'error': 'Backend agent timed out'}), 504, headers) # Gateway Timeout
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error calling backend {agent_id} at {target_url}: {e}")
        error_detail = str(e)
        if e.response is not None:
            try:
                error_detail = e.response.text # Or e.response.json() if JSON expected
            except json.JSONDecodeError:
                error_detail = e.response.text
            logging.error(f"Backend error detail: {error_detail[:500]}") # Log snippet
        return flask.make_response(json.dumps({'error': f'Error communicating with backend agent: {error_detail}'}), 502, headers) # Bad Gateway
    except Exception as e:
        logging.exception(f"Unexpected error processing request for {agent_id}: {e}") # Log stack trace
        return flask.make_response(json.dumps({'error': 'Internal server error in gateway'}), 500, headers)
