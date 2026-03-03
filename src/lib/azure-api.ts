"use server";

export interface AzureChatResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
}

export async function callAzureFoundry(prompt: string) {
  const endpoint = process.env.NEXT_PUBLIC_AZURE_AI_FOUNDRY_ENDPOINT || process.env.AZURE_AI_FOUNDRY_ENDPOINT;
  const key = process.env.AZURE_AI_FOUNDRY_KEY;
  const deploymentName = process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME;

  if (!endpoint || !key) {
    throw new Error('Azure AI Foundry configuration missing. Check your .env.local file.');
  }

  // Standard OpenAI-compatible chat completion endpoint format for Azure
  // Often looks like: https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-02-15-preview
  // Or specific AI Foundry inference endpoints.
  
  // Standard Azure OpenAI or AI Foundry inference call
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': key,
    },
    body: JSON.stringify({
      model: deploymentName || "gpt-5.2-chat",
      messages: [
        { role: 'developer', content: 'You talk like a pirate.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure API Error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<AzureChatResponse>;
}
