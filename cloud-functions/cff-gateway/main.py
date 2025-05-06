# -*- coding: utf-8 -*-
import functions_framework
import flask
import requests
import os
import json
import logging
import uuid # Import uuid for fallback session ID generation
import re # Import regex for error parsing

# Configure logging
logging.basicConfig(level=logging.INFO)

# --- Agent Backend Configuration ---
AGENT_CONFIG = {
    "foncorp-travel-agent": {
        "url": os.environ.get("TRAVEL_AGENT_URL"),
        "app_name": "travel-agent"
    },
}
# -----------------------------------------

# --- Authentication --- 
def get_google_id_token(target_audience_url):
    # ... (existing function body, no changes here) ...
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
        response = requests.Session().send(prepped, timeout=3)
        response.raise_for_status()
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

# --- Helper to format response for frontend --- 
def format_response_for_frontend(adk_response_data, session_id_override=None):
    """Adapts the ADK response JSON (from /run or create_session)
       to the simple { response: string, session_id: string, error: string } format
       expected by the frontend action.
       Prioritizes extracting text from the last OUTPUT event after potential function calls.
       session_id_override allows passing the id from the create_session call.
    """
    logging.debug(f"Formatting ADK response: {adk_response_data}")
    final_response = {"response": None, "error": None, "session_id": session_id_override}

    if not isinstance(adk_response_data, dict):
        final_response["error"] = "Internal Gateway Error: ADK response structure was not a dictionary."
        logging.error(f"Format helper received non-dict data: {type(adk_response_data)} - {str(adk_response_data)[:200]}")
        return final_response

    # --- Extract Session ID --- 
    if final_response["session_id"] is None:
        if "session_id" in adk_response_data: final_response["session_id"] = adk_response_data["session_id"]
        elif "id" in adk_response_data: final_response["session_id"] = adk_response_data["id"]

    # --- Extract Agent's Text Response (Prioritize last OUTPUT event) --- 
    agent_text_response = None

    # 1. Look in events (specifically the last relevant OUTPUT event)
    if "events" in adk_response_data and isinstance(adk_response_data["events"], list):
        logging.debug(f"Looking for response in events: {adk_response_data['events']}")
        for event in reversed(adk_response_data["events"]):
             if isinstance(event, dict) and event.get("type") == "OUTPUT" and "data" in event:
                 output_data = event["data"]
                 candidate_text = None
                 if isinstance(output_data, dict):
                     if "response" in output_data: candidate_text = output_data["response"]
                     elif "text" in output_data: candidate_text = output_data["text"]
                 elif isinstance(output_data, str): candidate_text = output_data
                 
                 if candidate_text is not None: # Found text in an OUTPUT event
                      agent_text_response = candidate_text
                      logging.info(f"Extracted response from OUTPUT event: {str(agent_text_response)[:100]}...")
                      break # Stop after finding the latest relevant text

    # 2. Fallback: Check top-level content.parts (often contains initial agent text before tool use)
    if agent_text_response is None: 
        logging.debug("No text found in OUTPUT events, checking content.parts")
        if "content" in adk_response_data and isinstance(adk_response_data["content"], dict):
             content_data = adk_response_data["content"]
             if "parts" in content_data and isinstance(content_data["parts"], list) and len(content_data["parts"]) > 0:
                 if isinstance(content_data["parts"][0], dict) and "text" in content_data["parts"][0]:
                      agent_text_response = content_data["parts"][0]["text"]
                      logging.info("Extracted response from fallback content.parts[0].text")

    # 3. Fallback: Check other potential locations (less common for final response)
    if agent_text_response is None:
        logging.debug("No text found yet, checking output/response fields")
        if "output" in adk_response_data and isinstance(adk_response_data["output"], dict):
            output_data = adk_response_data["output"]
            if "response" in output_data: agent_text_response = output_data["response"]
            elif "text" in output_data: agent_text_response = output_data["text"]
        elif "response" in adk_response_data: agent_text_response = adk_response_data["response"]
        if agent_text_response: 
             logging.info("Extracted response from fallback output/response fields")

    # --- Assign final response or error --- 
    if agent_text_response is not None:
         if not isinstance(agent_text_response, str):
             logging.warning(f"Agent response was not a string, converting: {agent_text_response}")
             final_response["response"] = json.dumps(agent_text_response)
         else: final_response["response"] = agent_text_response
    else:
        # Avoid setting error if it's just a session creation response without text
        is_session_creation_response = session_id_override is not None and not adk_response_data.get("events") and not adk_response_data.get("content")
        if not is_session_creation_response and "error" not in adk_response_data:
            final_response["error"] = "Agent response text not found in ADK output structure."
            logging.warning(f"Could not find agent response text in ADK output: {adk_response_data}")

    if "error" in adk_response_data:
        error_val = adk_response_data['error']
        error_msg = f"ADK Error: {error_val}"
        # Try to extract specific message if error is a dict
        if isinstance(error_val, dict) and 'message' in error_val:
            error_msg = f"ADK Error: {error_val['message']}"
        final_response["error"] = error_msg
        # Clear response if error occurred
        if final_response["error"]: 
            final_response["response"] = None 

    logging.info(f"Formatted response for frontend: session_id={final_response.get('session_id')}, has_response={final_response.get('response') is not None}, has_error={final_response.get('error') is not None}")
    return final_response
# --------------------------------------------------

# --- Helper to call ADK endpoint --- 
def call_adk_endpoint(target_url, payload, auth_token):
    # ... (existing function body, no changes here) ...
    headers = {'Content-Type': 'application/json'}
    if auth_token: headers['Authorization'] = f'Bearer {auth_token}'
    logging.info(f"Sending payload to {target_url}: {json.dumps(payload)}")
    response_text = None
    response_status_code = None
    try:
        response = requests.post(target_url, headers=headers, json=payload, timeout=45)
        response_text = response.text 
        response_status_code = response.status_code
        logging.info(f"Backend response ({target_url}): Status {response_status_code}")
        response.raise_for_status()
        if response_status_code == 204 or not response.content: 
             logging.info(f"Backend ({target_url}) returned empty response body (Status {response_status_code})")
             return {} 
        return response.json()
    except requests.exceptions.Timeout:
        logging.error(f"Timeout calling {target_url}")
        raise ValueError("Backend agent timed out")
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error calling {target_url}: {e}")
        error_detail = str(e); status_code = response_status_code if response_status_code else 502
        if e.response is not None:
             status_code = e.response.status_code
             response_text = e.response.text
             try: 
                 error_json = e.response.json()
                 if isinstance(error_json.get('detail'), list): error_detail = json.dumps(error_json['detail'][0])
                 else: error_detail = json.dumps(error_json.get('detail', response_text))
             except json.JSONDecodeError: error_detail = response_text
        logging.error(f"Backend error detail ({status_code}): {error_detail[:1000]}")
        raise ValueError(f"Backend error ({status_code}): {error_detail}") from e
    except json.JSONDecodeError as e:
         logging.error(f"Backend ({target_url}) did not return valid JSON. Status: {response_status_code}. Text: {response_text[:500]}") 
         return None # Return None instead of raising an error
# --------------------------------------------------

@functions_framework.http
def foncorp_cff_gateway(request: flask.Request) -> flask.Response:
    cors_headers = {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
    if request.method == 'OPTIONS': return ('', 204, cors_headers)
    response_headers = cors_headers.copy()
    response_headers['Content-Type'] = 'application/json'
    if request.method != 'POST': return flask.make_response(json.dumps({'error': 'Method Not Allowed'}), 405, response_headers)

    processed_adk_data = None 
    session_id_to_return = None

    try:
        data = request.get_json(silent=True)
        if not data: return flask.make_response(json.dumps({'error': 'Request body must be valid JSON'}), 400, response_headers)
        message_from_frontend = data.get('message')
        agent_id_from_frontend = data.get('agentId')
        session_id_from_frontend = data.get('sessionId')
        logging.info(f"Received request for agentId: {agent_id_from_frontend}, sessionId: {session_id_from_frontend}")
        if not message_from_frontend or not agent_id_from_frontend:
            missing_fields = []
            if not message_from_frontend: missing_fields.append('message')
            if not agent_id_from_frontend: missing_fields.append('agentId')
            if missing_fields:
                error_msg = f"Missing required fields: {', '.join(missing_fields)}"
                logging.error(error_msg)
                return flask.make_response(json.dumps({'error': error_msg}), 400, response_headers)

        agent_conf = AGENT_CONFIG.get(agent_id_from_frontend)
        if not agent_conf or not agent_conf.get("url") or not agent_conf.get("app_name"):
            error_msg = f"AgentId '{agent_id_from_frontend}' not recognized or misconfigured."
            logging.error(error_msg)
            return flask.make_response(json.dumps({'error': error_msg}), 404, response_headers)
        
        target_base_url = agent_conf["url"]
        adk_app_name = agent_conf["app_name"]
        adk_user_id = "gateway_user" # Keep using gateway_user unless proven problematic

        auth_token = get_google_id_token(target_base_url)
        if not auth_token: logging.warning(f"Could not obtain ID token for {target_base_url}. Calling without auth.")

        if session_id_from_frontend:
            # --- Case 1: Existing Session --- 
            session_id_to_return = session_id_from_frontend
            target_url = f"{target_base_url.rstrip('/')}/run"
            # Payload for /run - MATCHING ADK WEB UI PAYLOAD
            payload = {
                "app_name": adk_app_name,
                "user_id": adk_user_id, # Using gateway_user ID
                "session_id": session_id_to_return,
                "new_message": { 
                    "role": "user", # Added role
                    "parts": [{"text": message_from_frontend}] 
                },
                "streaming": False # Added streaming flag
            }
            logging.info(f"Calling ADK /run for existing session {session_id_to_return}")
            raw_adk_response = call_adk_endpoint(target_url, payload, auth_token)

        else:
            # --- Case 2: New Session (Two-step process) --- 
            # 1. Call create_session endpoint with empty payload
            create_session_url = f"{target_base_url.rstrip('/')}/apps/{adk_app_name}/users/{adk_user_id}/sessions"
            create_payload = {} 
            logging.info(f"Calling ADK create_session...")
            create_response_data = call_adk_endpoint(create_session_url, create_payload, auth_token)
            
            if not isinstance(create_response_data, dict):
                 logging.error(f"Create session call returned non-dict: {type(create_response_data)}")
                 raise ValueError("Failed to create session: Invalid response from ADK.")
            new_session_id = create_response_data.get("id")
            if not new_session_id:
                 logging.error(f"Could not get session ID from create_session response: {create_response_data}")
                 raise ValueError("Failed to create session: No ID returned.")
            session_id_to_return = new_session_id
            logging.info(f"Created new session: {session_id_to_return}")

            # 2. Call /run endpoint with the new session ID - MATCHING ADK WEB UI PAYLOAD
            run_url = f"{target_base_url.rstrip('/')}/run"
            run_payload = {
                "app_name": adk_app_name,
                "user_id": adk_user_id, # Using gateway_user ID
                "session_id": session_id_to_return, 
                "new_message": { 
                    "role": "user", # Added role
                    "parts": [{"text": message_from_frontend}] 
                },
                "streaming": False # Added streaming flag
            }
            logging.info(f"Calling ADK /run for newly created session {session_id_to_return}")
            raw_adk_response = call_adk_endpoint(run_url, run_payload, auth_token)
        
        # --- Handle list/dict response from ADK call --- 
        logging.info(f"Raw data received from call_adk_endpoint: type={type(raw_adk_response)}, value={str(raw_adk_response)[:500]}")
        if isinstance(raw_adk_response, list):
            if len(raw_adk_response) > 0 and isinstance(raw_adk_response[0], dict):
                logging.info("ADK response was a list, using the first element.")
                processed_adk_data = raw_adk_response[0]
            else:
                logging.error(f"ADK response was a list but empty or first element not a dict: {raw_adk_response}")
                raise ValueError("Internal Gateway Error: Received invalid list structure from ADK.")
        elif isinstance(raw_adk_response, dict):
             processed_adk_data = raw_adk_response
        elif raw_adk_response is None: # Handle None returned by call_adk_endpoint on JSONDecodeError
             raise ValueError("Internal Gateway Error: ADK did not return valid JSON.")
        else:
             logging.error(f"Unexpected data type received from call_adk_endpoint: {type(raw_adk_response)}")
             raise ValueError("Internal Gateway Error: Unexpected response type from ADK.")

        formatted_data = format_response_for_frontend(processed_adk_data, session_id_to_return)
        logging.info(f"Final data being sent to frontend: {formatted_data}") # Enhanced logging

        if formatted_data["error"] and not formatted_data["response"]:
             logging.error(f"Error formatting ADK response: {formatted_data['error']}")
             error_msg = formatted_data["error"]
             if "ADK Error:" in error_msg: pass
             else: error_msg = "Gateway could not process agent response."
             return flask.make_response(json.dumps({"error": error_msg}), 502, response_headers)
        
        # Ensure we always send a valid JSON structure back
        final_payload_to_frontend = {
            "response": formatted_data.get("response"),
            "error": formatted_data.get("error"),
            "session_id": formatted_data.get("session_id")
        }
        response = flask.make_response(json.dumps(final_payload_to_frontend), 200)
        response.headers = response_headers
        return response

    # --- Global Error Handling --- 
    except ValueError as ve:
        logging.error(f"ValueError during ADK interaction: {ve}")
        status_match_backend = re.search(r"Backend error \((\d{3})\):", str(ve))
        status_match_non_json = re.search(r"\(Status (\d{3})\)\.", str(ve))
        status_code = 502
        if status_match_backend: status_code = int(status_match_backend.group(1))
        elif status_match_non_json: status_code = int(status_match_non_json.group(1))
        elif "timed out" in str(ve): status_code = 504
        return flask.make_response(json.dumps({'error': str(ve)}), status_code, response_headers)
    except Exception as e:
        logging.exception(f"Unexpected error processing request: {e}")
        return flask.make_response(json.dumps({'error': 'Internal server error in gateway'}), 500, response_headers)
