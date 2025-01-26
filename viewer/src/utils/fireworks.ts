export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export async function callFireworksAI(
  apiKey: string,
  messages: Message[]
): Promise<string> {
  const body = {
    model: "accounts/sentientfoundation/models/dobby-mini-leashed-llama-3-1-8b#accounts/sentientfoundation/deployments/22e7b3fd",
    messages,
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
