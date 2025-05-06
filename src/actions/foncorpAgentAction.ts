// src/actions/foncorpAgentAction.ts
'use server';

interface FoncorpResponse {
    response?: string;
    error?: string;
    session_id?: string; // Add session_id from ADK response
}

// Force using the deployed Cloud Function URL
const CLOUD_FUNCTION_URL = 'https://europe-west1-fon-test-project.cloudfunctions.net/foncorp_cff_gateway';

/**
 * Calls the Foncorp AI Agent via the Cloud Function gateway.
 * @param message The user's message.
 * @param agentId The ID of the selected agent.
 * @param sessionId The current conversation session ID (optional).
 * @returns The AI's response, potential error, and the session ID.
 */
export async function callFoncorpAgent(
    message: string,
    agentId: string, // agentId is now the second parameter
    sessionId: string | null // Accept sessionId instead of history
): Promise<FoncorpResponse> {

    console.log(`Using CFF URL: ${CLOUD_FUNCTION_URL}`); // Log the URL being used
    console.log(`Selected Agent ID: ${agentId}, Session ID: ${sessionId}`); // Log agent and session

    // Removed the check for placeholder URL and simulation logic
    // Now it will always try to call the real CFF URL

    try {
        const requestBody = {
            message: message,
            agentId: agentId,
            // Only include sessionId if it exists
            ...(sessionId && { sessionId: sessionId })
        };

        console.log(`Sending to CFF (Agent: ${agentId}, Session: ${sessionId}):`, requestBody); // Log before sending

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            // Consider adding cache: 'no-store' if you suspect caching issues
            // cache: 'no-store',
        });

        console.log(`CFF Response Status: ${response.status}`); // Log status

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Error from Cloud Function (Agent: ${agentId}, Session: ${sessionId}): ${response.status} ${response.statusText}`, errorBody);
            // Attempt to parse error JSON from CFF/ADK if possible
            try {
                const errorJson = JSON.parse(errorBody);
                return { error: errorJson.error || `Request failed: ${response.statusText} (${response.status})` };
            } catch (parseError) {
                // Fallback if error body is not JSON
                return { error: `Request failed: ${response.statusText} (${response.status}) - ${errorBody.substring(0, 100)}` };
            }
        }

        const data: FoncorpResponse = await response.json();
        console.log(`Received from CFF (Agent: ${agentId}, Session: ${data.session_id}):`, data); // Log received data

        return data;

    } catch (error) {
        console.error(`Error calling Cloud Function (Agent: ${agentId}, Session: ${sessionId}):`, error);
        // Check if the error is a TypeError related to fetch, often happens in server components if fetch fails unexpectedly
        if (error instanceof TypeError) {
            return { error: `Network error or issue reaching the gateway: ${error.message}` };
        }
        return { error: 'Failed to communicate with the AI agent gateway.' };
    }
}
