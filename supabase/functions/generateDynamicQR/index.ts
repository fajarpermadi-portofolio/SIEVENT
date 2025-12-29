import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ROUTE HANDLER
serve(async (req) => {
  // OPTIONS → untuk CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { event_id, type } = await req.json();

    if (!event_id || !type) {
      return new Response("Missing params", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Ambil secret environment Supabase
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE");

    if (!supabaseUrl || !serviceKey) {
      return new Response("Missing SERVICE_ROLE or PROJECT_URL", {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 10_000).toISOString();

    const { error } = await supabase.from("dynamic_qr").insert({
      event_id,
      type,
      token,
      expires_at,
    });

    if (error) {
      console.error(error);
      return new Response("Insert failed", {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ token }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });

  } catch (e) {
    console.error(e);
    return new Response("Internal error", {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
