# Azure AI Foundry API Tester (Next.js 15)

A premium, glassmorphic web application built with **Next.js 15**, **Tailwind CSS**, and **Framer Motion** to help developers quickly test and validate their Azure AI Foundry model deployments.

## 🚀 Quick Start Guide

### 1. Clone & Install
```bash
git clone https://github.com/developerkaushalkishor/test-foundry-api.git 
cd test-foundry-api
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
AZURE_AI_FOUNDRY_ENDPOINT="https://your-resource-name.openai.azure.com/openai/v1/chat/completions"
AZURE_AI_FOUNDRY_KEY="your-api-key"
AZURE_AI_FOUNDRY_DEPLOYMENT_NAME="gpt-5.2-chat"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start testing.

---

## ⚠️ The "Max Tokens" Trap (Crucial for Developers)

One of the most common mistakes when integrating newer Azure AI Foundry models (like **gpt-5.2-chat**) is following older documentation or the standard OpenAI API format for token limits.

### The Problem
If you use `max_tokens` in your request body, you might receive a `400 Bad Request`:
> `Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`

### The Solution
For newer preview models, the API schema has changed. You **must** use `max_completion_tokens` or omit it entirely to use the default.

**Correct implementation (Server Action):**
```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: "gpt-5.2-chat",
    messages: [...],
    // Use this instead of max_tokens
    max_completion_tokens: 800 
  }),
});
```

---

## ✨ Features

- **Next.js 15 + Turbopack**: Blazing fast development.
- **Server Actions**: Securely handles API keys on the server side (no `NEXT_PUBLIC` exposure needed).
- **Premium UI**: 
  - Glassmorphism effects via Tailwind utilities.
  - Smooth animations with **Framer Motion**.
  - **Lucide React** icons for a polished look.
- **UX Enhancements**:
  - Send message with **Enter** (Shift+Enter for newline).
  - Auto-clears input after successful send.
  - Raw JSON response viewer for debugging.

## 🛠 Tech Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript

## 📄 License
MIT
