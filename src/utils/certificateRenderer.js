// src/utils/certificateRenderer.js
import { supabase } from "../supabase";
const fabric = window.fabric;

export async function generateCertificateForUser(template, userData) {
  // Load font jika ada
  if (template.font_url && template.font_name) {
    try {
      const exists = Array.from(document.fonts).some(
        (f) => f.family === template.font_name
      );
      if (!exists) {
        const ff = new FontFace(
          template.font_name,
          `url(${template.font_url})`
        );
        await ff.load();
        document.fonts.add(ff);
        await document.fonts.ready;
      }
    } catch (err) {
      console.warn("Font load failed:", err);
    }
  }

  return new Promise((resolve, reject) => {
    if (!fabric) return reject(new Error("Fabric belum terload"));

    const el = document.createElement("canvas");
    const canvas = new fabric.Canvas(el, {
      enableRetinaScaling: true,
      preserveObjectStacking: true,
    });

    fabric.Image.fromURL(
      template.image_url,
      async (img) => {
        try {
          canvas.setWidth(img.width);
          canvas.setHeight(img.height);
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

          for (const c of template.config || []) {
            let value = "";
            switch (c.key) {
              case "name":
                value = userData.name || "";
                break;
              case "npm":
                value = userData.npm || "";
                break;
              case "event":
                value = userData.eventName || "";
                break;
              case "date":
                value = userData.date || "";
                break;
              default:
                value = userData[c.key] ?? "";
            }

            const textbox = new fabric.Textbox(value, {
              left: c.x,
              top: c.y,

              width: c.width,
              height: c.height,

              originX: c.originX || "left",
              originY: c.originY || "top",

              fontSize: c.fontSize,
              fontFamily: c.fontFamily || template.font_name || "Poppins",
              fill: c.color,
              textAlign: c.textAlign || "left",
              lineHeight: c.lineHeight || 1.1,
              charSpacing: c.charSpacing || 0,

              selectable: false,
              editable: false,
            });

            textbox.scaleX = c.scaleX || 1;
            textbox.scaleY = c.scaleY || 1;

            canvas.add(textbox);
          }

          canvas.renderAll();

          const dataUrl = canvas.toDataURL({
            format: "png",
            multiplier: 1,
          });

          const blob = await (await fetch(dataUrl)).blob();
          const filename = `certificate_${template.event_id}_${userData.id}_${Date.now()}.png`;

          const { error: upErr } = await supabase.storage
            .from("certificates")
            .upload(filename, blob, { contentType: "image/png" });

          if (upErr) return reject(upErr);

          const { data: urlData } = supabase.storage
            .from("certificates")
            .getPublicUrl(filename);

          const publicUrl = urlData.publicUrl || urlData.public_url;

          const { error: dbErr } = await supabase
            .from("certificates")
            .upsert(
              {
                event_id: template.event_id,
                user_id: userData.id,
                template_id: template.id,
                file_url: publicUrl,
              },
              { onConflict: "event_id,user_id" }
            );

          if (dbErr) return reject(dbErr);

          canvas.dispose();
          resolve(publicUrl);
        } catch (err) {
          try {
            canvas.dispose();
          } catch {}
          reject(err);
        }
      },
      { crossOrigin: "anonymous" }
    );
  });
}
