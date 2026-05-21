// Pluggable AI provider abstraction.
// Default: Lovable AI Gateway (LOVABLE_API_KEY).
// Override via env var AI_PROVIDER = "lovable" | "openai" | "anthropic" | "gemini" | "openrouter" | "custom"
// Each provider reads its own API key env var; "custom" reads AI_BASE_URL + AI_API_KEY (OpenAI-compatible).
//
// This file is meant to be imported by edge functions:
//   import { callAI, streamAI } from "../_shared/ai-provider.ts";
//
// The interface mirrors OpenAI chat-completions to keep portability simple.

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AICallOptions {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  stream?: boolean;
  signal?: AbortSignal;
}

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  authHeader: "bearer" | "x-api-key" | "lovable";
  defaultModel: string;
  // anthropic uses a different request shape
  shape?: "openai" | "anthropic";
  extraHeaders?: Record<string, string>;
}

function envOrThrow(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}. Configure-a em Lovable Cloud > Secrets.`);
  return v;
}

export function getProviderConfig(): ProviderConfig {
  const provider = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase();
  switch (provider) {
    case "openai":
      return {
        baseURL: "https://api.openai.com/v1",
        apiKey: envOrThrow("OPENAI_API_KEY"),
        authHeader: "bearer",
        defaultModel: Deno.env.get("AI_DEFAULT_MODEL") || "gpt-4o-mini",
        shape: "openai",
      };
    case "anthropic":
      return {
        baseURL: "https://api.anthropic.com/v1",
        apiKey: envOrThrow("ANTHROPIC_API_KEY"),
        authHeader: "x-api-key",
        defaultModel: Deno.env.get("AI_DEFAULT_MODEL") || "claude-3-5-sonnet-latest",
        shape: "anthropic",
        extraHeaders: { "anthropic-version": "2023-06-01" },
      };
    case "gemini":
      // Use OpenAI-compatible endpoint for Gemini
      return {
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: envOrThrow("GEMINI_API_KEY"),
        authHeader: "bearer",
        defaultModel: Deno.env.get("AI_DEFAULT_MODEL") || "gemini-2.0-flash",
        shape: "openai",
      };
    case "openrouter":
      return {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: envOrThrow("OPENROUTER_API_KEY"),
        authHeader: "bearer",
        defaultModel: Deno.env.get("AI_DEFAULT_MODEL") || "openai/gpt-4o-mini",
        shape: "openai",
      };
    case "custom":
      return {
        baseURL: envOrThrow("AI_BASE_URL"),
        apiKey: envOrThrow("AI_API_KEY"),
        authHeader: "bearer",
        defaultModel: Deno.env.get("AI_DEFAULT_MODEL") || "default",
        shape: "openai",
      };
    case "lovable":
    default:
      return {
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey: envOrThrow("LOVABLE_API_KEY"),
        authHeader: "lovable",
        defaultModel: Deno.env.get("AI_DEFAULT_MODEL") || "google/gemini-2.5-flash",
        shape: "openai",
      };
  }
}

function buildHeaders(cfg: ProviderConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...(cfg.extraHeaders || {}) };
  if (cfg.authHeader === "bearer") h["Authorization"] = `Bearer ${cfg.apiKey}`;
  else if (cfg.authHeader === "x-api-key") h["x-api-key"] = cfg.apiKey;
  else if (cfg.authHeader === "lovable") h["Authorization"] = `Bearer ${cfg.apiKey}`;
  return h;
}

/**
 * Call AI and return the assistant text content.
 * Throws on non-2xx with the response text for easy debugging.
 */
export async function callAI(opts: AICallOptions): Promise<string> {
  const cfg = getProviderConfig();
  const model = opts.model || cfg.defaultModel;

  if (cfg.shape === "anthropic") {
    const sys = opts.messages.find((m) => m.role === "system")?.content;
    const messages = opts.messages.filter((m) => m.role !== "system");
    const body = {
      model,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
      ...(sys ? { system: sys } : {}),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    const res = await fetch(`${cfg.baseURL}/messages`, {
      method: "POST",
      headers: buildHeaders(cfg),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json?.content?.[0]?.text ?? "";
  }

  // OpenAI-compatible (includes Lovable, OpenAI, Gemini OpenAI-compat, OpenRouter, custom)
  const body: any = {
    model,
    messages: opts.messages,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(cfg),
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

/**
 * Returns a Response with a streaming chat completion (OpenAI-compatible SSE).
 * Useful to pipe directly back to the client.
 */
export async function streamAI(opts: AICallOptions): Promise<Response> {
  const cfg = getProviderConfig();
  if (cfg.shape !== "openai") {
    // Fallback: non-streaming
    const text = await callAI(opts);
    return new Response(text, { headers: { "Content-Type": "text/plain" } });
  }
  const model = opts.model || cfg.defaultModel;
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(cfg),
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream: true,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
    signal: opts.signal,
  });
  return res;
}
