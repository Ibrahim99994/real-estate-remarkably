import { createOpenAI } from "@ai-sdk/openai";

/**
 * Lovable AI Gateway provider using the OpenAI Responses API.
 * The bare callable posts to /v1/responses.
 */
export function createLovableResponsesProvider(lovableApiKey: string) {
  return createOpenAI({
    apiKey: "unused",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
