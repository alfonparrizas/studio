// src/actions/foncorpAgentAction.ts
'use server';

import type { ChatMessageProps } from '@/components/chat/ChatMessage';

interface FoncorpResponse {
    response?: string;
    error?: string;
}

// IMPORTANT: Replace this URL with your actual Cloud Function URL
const CLOUD_FUNCTION_URL = process.env.FONCORP_CFF_GATEWAY_URL || 'YOUR_CLOUD_FUNCTION_HTTP_TRIGGER_URL';

/**
 * Calls the Foncorp AI Agent via the Cloud Function gateway.
 * @param message The user's message.
 * @param history The chat history.
 * @param agentId The ID of the selected agent.
 * @returns The AI's response or an error message.
 */
export async function callFoncorpAgent(
    message: string,
    history: ChatMessageProps[] = [], // Include history
    agentId: string // Add agentId parameter
): Promise<FoncorpResponse> {

    console.log(`Selected Agent ID: ${agentId}`); // Log the selected agent ID

    if (CLOUD_FUNCTION_URL === 'YOUR_CLOUD_FUNCTION_HTTP_TRIGGER_URL') {
        console.error("Error: FONCORP_CFF_GATEWAY_URL environment variable not set.");
        // Simulate a delay and return a placeholder response for local development if URL is not set
        if (process.env.NODE_ENV === 'development') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Include agentId in the simulated response for debugging
            return { response: `Simulated response for ${agentId} to: "${message}". Configure CFF URL.` };
        }
        return { error: "Cloud Function URL not configured." };
    }

    try {
        console.log(`Sending to CFF (Agent: ${agentId}): ${message}`, history); // Log before sending
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any necessary authentication headers here
                // 'Authorization': `Bearer ${YOUR_ID_TOKEN_OR_API_KEY}`
            },
            body: JSON.stringify({
                message: message,
                history: history, // Send history to the gateway
                agentId: agentId, // Send the selected agent ID
                // Add any other parameters your agent might need
            }),
        });

        console.log(`CFF Response Status: ${response.status}`); // Log status

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Error from Cloud Function (Agent: ${agentId}): ${response.status} ${response.statusText}`, errorBody);
            return { error: `Request failed: ${response.statusText} (${response.status})` };
        }

        const data: FoncorpResponse = await response.json();
        console.log(`Received from CFF (Agent: ${agentId}):`, data); // Log received data
        // Optionally, include agentId in the response if needed downstream, although usually handled by context
        // return { ...data, agentId: agentId };
        return data;

    } catch (error) {
        console.error(`Error calling Cloud Function (Agent: ${agentId}):`, error);
        return { error: 'Failed to communicate with the AI agent gateway.' };
    }
}
