"use server";

export interface AzureChatResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
}

interface MessagePayload {
  role: string;
  content: string;
}

export async function callAzureFoundry(messages: MessagePayload[]) {
  const endpoint = process.env.NEXT_PUBLIC_AZURE_AI_FOUNDRY_ENDPOINT || process.env.AZURE_AI_FOUNDRY_ENDPOINT;
  const key = process.env.AZURE_AI_FOUNDRY_KEY;
  const deploymentName = process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME;

  if (!endpoint || !key) {
    throw new Error('Azure AI Foundry configuration missing. Check your .env.local file.');
  }

  const systemMessage = {
    role: "system",
    content: `You are "Foundry Finance Advisor," a Senior Certified Financial Planner (CFP) and Investment Strategist with 20+ years of experience. 

# OPERATIONAL PRINCIPLES
1. **Fiduciary Excellence:** Always provide objective, data-driven, and highly professional financial guidance.
2. **Niche Focus:** Expertise in personal finance, wealth management, tax optimization, stock market analysis, and retirement planning.
3. **Accuracy:** Base advice on established financial theories (e.g., Modern Portfolio Theory).
4. **Clarity:** Use tables for comparisons and markdown for structure.

# MANDATORY DISCLAIMER
You MUST include this brief disclaimer in your very first response of a session: "I am an AI, not a licensed financial advisor. This information is for educational purposes only."

# RESPONSE FORMATTING
- Use **Bold Headers** for sections.
- Use \`Tables\` for comparing data or investment options.
- Use \`Bullet points\` for actionable steps.

If the user asks about anything unrelated to finance, politely steer the conversation back to financial topics.`
  };

  const payload = {
    model: deploymentName || "gpt-4",
    messages: [systemMessage, ...messages],
    temperature: 1,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': key,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure API Call Error:", errorText);
    throw new Error(`Azure API Error: ${response.status}`);
  }

  return response.json() as Promise<AzureChatResponse>;
}

export async function generateChatTitle(firstMessage: string) {
  try {
    const endpoint = process.env.NEXT_PUBLIC_AZURE_AI_FOUNDRY_ENDPOINT || process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    const key = process.env.AZURE_AI_FOUNDRY_KEY;
    const deploymentName = process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME;

    if (!endpoint || !key) return "New Financial Chat";

    const payload = {
      model: deploymentName || "gpt-4",
      messages: [
        { role: "developer", content: "Generate a short chat title (3-5 words max). Reply with ONLY the title. No quotes, no period, no explanation." },
        { role: "user", content: `Generate a title for a chat that starts with: "${firstMessage.slice(0, 200)}"` }
      ],
    };

    console.log("[AI] Generating chat title for:", firstMessage.slice(0, 50));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.choices?.[0]?.message?.content?.trim() || "New Financial Chat";
      console.log("[AI] Generated title:", title);
      return title.length > 50 ? title.slice(0, 47) + "..." : title;
    } else {
      const errorText = await response.text();
      console.error("[AI] Title generation API error:", response.status, errorText);
    }
  } catch (e) {
    console.error("[AI] Error generating title:", e);
  }
  return "New Financial Chat";
}
