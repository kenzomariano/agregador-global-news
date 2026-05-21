import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, KeyRound, Server, BookOpenCheck } from "lucide-react";

const PROVIDERS = [
  {
    id: "lovable",
    name: "Lovable AI (padrão)",
    badge: "default",
    description: "Já configurado. Sem chave necessária. Modelos Gemini e GPT-5 via gateway.",
    envVars: ["LOVABLE_API_KEY (auto)"],
    defaultModel: "google/gemini-2.5-flash",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, GPT-5 etc. diretamente da OpenAI.",
    envVars: ["OPENAI_API_KEY"],
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Opus, Haiku.",
    envVars: ["ANTHROPIC_API_KEY"],
    defaultModel: "claude-3-5-sonnet-latest",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Direto pela API Google AI Studio (compat OpenAI).",
    envVars: ["GEMINI_API_KEY"],
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Gateway com centenas de modelos (OpenAI, Anthropic, Meta, etc.).",
    envVars: ["OPENROUTER_API_KEY"],
    defaultModel: "openai/gpt-4o-mini",
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatível)",
    description: "Qualquer endpoint OpenAI-compat: Ollama, LM Studio, vLLM, Together, Groq...",
    envVars: ["AI_BASE_URL", "AI_API_KEY"],
    defaultModel: "(defina em AI_DEFAULT_MODEL)",
  },
];

export function AISettingsManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Provedor de IA
        </h2>
        <p className="text-sm text-muted-foreground">
          As Edge Functions usam Lovable AI por padrão. Para trocar, configure os secrets abaixo em{" "}
          <strong>Cloud → Secrets</strong> e defina <code>AI_PROVIDER</code>.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" /> Como ativar outro provedor
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra <strong>Cloud → Secrets</strong> e adicione o secret correspondente (ex.: <code>OPENAI_API_KEY</code>).</li>
            <li>
              Adicione o secret <code>AI_PROVIDER</code> com um dos valores:{" "}
              <code>lovable</code>, <code>openai</code>, <code>anthropic</code>, <code>gemini</code>,{" "}
              <code>openrouter</code>, <code>custom</code>.
            </li>
            <li>
              (Opcional) Adicione <code>AI_DEFAULT_MODEL</code> para sobrescrever o modelo padrão.
            </li>
            <li>
              Para <code>custom</code> também adicione <code>AI_BASE_URL</code> e <code>AI_API_KEY</code> (compatível OpenAI).
            </li>
          </ol>
          <p className="text-xs text-muted-foreground pt-2 flex items-start gap-2">
            <BookOpenCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
            Novas funções devem importar de <code>_shared/ai-provider.ts</code> em vez de chamar Lovable AI diretamente.
            Assim o site fica plugável a qualquer IA.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                {p.name}
                {p.badge === "default" && <Badge>Ativo</Badge>}
              </CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div>
                <span className="text-muted-foreground">AI_PROVIDER:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">{p.id}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo padrão:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">{p.defaultModel}</code>
              </div>
              <div className="flex items-start gap-1.5">
                <KeyRound className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {p.envVars.map((v) => (
                    <code key={v} className="block bg-muted px-1.5 py-0.5 rounded">{v}</code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
