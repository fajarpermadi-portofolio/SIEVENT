// /supabase/functions/generateCertificate/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// NOTE: deno canvas module and registerFont - availability might vary.
// We'll try using 'canvas' from deno.land/x which is commonly used.
import { Canvas, loadImage, registerFont } from "https://deno.land/x/canvas@1.4.0/mod.ts";

serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("PROJECT_URL")!, Deno.env.get("SERVICE_ROLE")!);

    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const body = await req.json();
    const { event_id, user_id, name, npm } = body;
    if (!event_id || !user_id || !name) {
      return new Response("Missing params", { status: 400 });
    }

    // Load event configuration (template url, font url, positions)
    const { data: e, error: eErr } = await supabase
      .from("events")
      .select("certificate_template_url,certificate_font_url,certificate_font_name,certificate_name_x,certificate_name_y,certificate_npm_x,certificate_npm_y")
      .eq("id", event_id)
      .single();

    if (eErr) {
      console.error("failed read event:", eErr);
      return new Response("Event read failed", { status: 500 });
    }

    const templateUrl = e.certificate_template_url;
    if (!templateUrl) {
      return new Response("Template not configured", { status: 400 });
    }

    // load template image
    const img = await loadImage(templateUrl);
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // draw template
    ctx.drawImage(img, 0, 0);

    // register font if present
    const fontName = e.certificate_font_name || "PoppinsLocal";
    if (e.certificate_font_url) {
      try {
        const fontResp = await fetch(e.certificate_font_url);
        const fontBuf = new Uint8Array(await fontResp.arrayBuffer());
        const tmpPath = `/tmp/${fontName}`;
        await Deno.writeFile(tmpPath, fontBuf);
        registerFont(tmpPath, { family: fontName });
      } catch (err) {
        console.warn("register font failed", err);
        // continue with default font
      }
    }

    // draw name
    const nameX = e.certificate_name_x || Math.round(img.width / 2);
    const nameY = e.certificate_name_y || Math.round(img.height * 0.55);
    const npmX = e.certificate_npm_x || nameX;
    const npmY = e.certificate_npm_y || (nameY + Math.round(img.height * 0.06));

    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(img.height * 0.06)}px "${fontName}"`;
    ctx.fillText(name, nameX, nameY);

    ctx.font = `${Math.round(img.height * 0.04)}px "${fontName}"`;
    ctx.fillText(npm || "", npmX, npmY);

    // export PNG buffer
    const buffer = canvas.toBuffer("image/png");

    // upload to storage
    const destPath = `generated/${event_id}/${user_id}.png`;
    const { error: upErr } = await supabase.storage.from("certificates").upload(destPath, buffer, {
      upsert: true,
      contentType: "image/png",
    });

    if (upErr) {
      console.error("upload error:", upErr);
      return new Response("Upload failed", { status: 500 });
    }

    const publicUrl = supabase.storage.from("certificates").getPublicUrl(destPath).data.publicUrl;

    // optionally upsert into certificates_generated table if exists
    try {
      await supabase.from("certificates_generated").upsert({
        event_id,
        user_id,
        file_url: publicUrl,
      });
    } catch (err) {
      console.warn("upsert cert record failed", err);
    }

    return new Response(JSON.stringify({ url: publicUrl }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    console.error("function error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
