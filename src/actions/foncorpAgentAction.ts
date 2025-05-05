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
 * @param history The chat history (optional).
 * @returns The AI's response or an error message.
 */
export async function callFoncorpAgent(
    message: string,
    history: ChatMessageProps[] = [] // Include history
): Promise<FoncorpResponse> {

    if (CLOUD_FUNCTION_URL === 'YOUR_CLOUD_FUNCTION_HTTP_TRIGGER_URL') {
        console.error("Error: FONCORP_CFF_GATEWAY_URL environment variable not set.");
        // Simulate a delay and return a placeholder response for local development if URL is not set
        if (process.env.NODE_ENV === 'development') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return { response: `This is a simulated response to: "${message}". Please configure your Cloud Function URL.` };
        }
        return { error: "Cloud Function URL not configured." };
    }

    try {
        // console.log(`Sending to CFF: ${message}`, history); // Log before sending
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
                // Add any other parameters your agent might need
            }),
        });

        // console.log(`CFF Response Status: ${response.status}`); // Log status

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Error from Cloud Function: ${response.status} ${response.statusText}`, errorBody);
            return { error: `Request failed: ${response.statusText} (${response.status})` };
        }

        const data: FoncorpResponse = await response.json();
        // console.log("Received from CFF:", data); // Log received data
        return data;

    } catch (error) {
        console.error('Error calling Cloud Function:', error);
        return { error: 'Failed to communicate with the AI agent gateway.' };
    }
}
