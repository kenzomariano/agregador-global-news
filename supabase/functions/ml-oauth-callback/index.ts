import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mlAppId = Deno.env.get("ML_APP_ID");
    const mlClientSecret = Deno.env.get("ML_CLIENT_SECRET");

    if (!mlAppId || !mlClientSecret) {
      return new Response("ML credentials not configured", { status: 500, headers: corsHeaders });
    }

    const url = new URL(req.url);
    
    // Handle initial auth redirect (GET from admin panel)
    if (req.method === "GET" && !url.searchParams.get("code")) {
      const redirectUri = `${supabaseUrl}/functions/v1/ml-oauth-callback`;
      const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${mlAppId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: authUrl },
      });
    }

    // Handle OAuth callback with authorization code
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response("Missing authorization code", { status: 400, headers: corsHeaders });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/ml-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: mlAppId,
        client_secret: mlClientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("ML OAuth token error:", tokenData);
      return new Response(`OAuth error: ${JSON.stringify(tokenData)}`, { status: 400, headers: corsHeaders });
    }

    console.log("ML OAuth token received successfully");

    // Store tokens in site_settings
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("site_settings").upsert(
      {
        key: "ml_access_token",
        value: tokenData.access_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    await supabase.from("site_settings").upsert(
      {
        key: "ml_refresh_token",
        value: tokenData.refresh_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    await supabase.from("site_settings").upsert(
      {
        key: "ml_token_expires_at",
        value: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    // Redirect back to admin with success message
    return new Response(
      `<!DOCTYPE html><html><body><h2>✅ Mercado Livre conectado com sucesso!</h2><p>Você pode fechar esta aba e voltar ao painel admin.</p><script>window.close();</script></body></html>`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("ML OAuth error:", error);
    return new Response(`Error: ${String(error)}`, { status: 500, headers: corsHeaders });
  }
});
