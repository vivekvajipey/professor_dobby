export type DobbyModel = 'leashed' | 'unhinged';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  modelUsed?: DobbyModel;
};

const MODEL_IDS = {
  leashed: "accounts/sentientfoundation/models/dobby-mini-leashed-llama-3-1-8b#accounts/sentientfoundation/deployments/22e7b3fd",
  unhinged: "accounts/sentientfoundation/models/dobby-mini-unhinged-llama-3-1-8b#accounts/sentientfoundation/deployments/81e155fc"
};

// Strip HTML tags from text
export function stripHtml(htmlString: string): string {
  return htmlString.replace(/<[^>]*>/g, "");
}

// Strip modelUsed from messages before sending to API
function stripModelUsed(messages: Message[]): { role: string; content: string }[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

export async function callFireworksAI(
  apiKey: string,
  messages: Message[],
  model: DobbyModel = 'leashed'
): Promise<string> {
  const body = {
    model: MODEL_IDS[model],
    messages: stripModelUsed(messages),
  };

  try {
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Fireworks API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '(No response)';
  } catch (error) {
    console.error('Error calling Fireworks AI:', error);
    throw error;
  }
}
