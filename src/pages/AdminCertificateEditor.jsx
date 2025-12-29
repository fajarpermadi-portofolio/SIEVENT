// src/pages/AdminCertificateEditor.jsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";

// pakai fabric dari global window (pastikan fabric.js sudah di-include di index.html)
const fabric = window.fabric;

export default function AdminCertificateEditor() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedObj, setSelectedObj] = useState(null);

  const [uploadedFontUrl, setUploadedFontUrl] = useState(null);
  const [uploadedFontName, setUploadedFontName] = useState(null);
  const [templateId, setTemplateId] = useState(null); // untuk upsert id yang sama

  // ============================================
  // INIT CANVAS
  // ============================================
  useEffect(() => {
    if (!fabric) {
      console.error("fabric.js belum terload di window");
      return;
    }

    const c = new fabric.Canvas("cert-canvas", {
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = c;

    c.on("selection:created", (e) => setSelectedObj(e.target));
    c.on("selection:updated", (e) => setSelectedObj(e.target));
    c.on("selection:cleared", () => setSelectedObj(null));

    const keyHandler = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        c.getActiveObject()
      ) {
        c.remove(c.getActiveObject());
        c.discardActiveObject();
        c.renderAll();
      }
    };
    window.addEventListener("keydown", keyHandler);

    return () => {
      window.removeEventListener("keydown", keyHandler);
      try {
        c.dispose();
      } catch (err) {
        console.warn("Canvas dispose error", err);
      }
    };
  }, []);

  // ============================================
  // HELPER: load font (FontFace API)
  // ============================================
  async function loadAndRegisterFont(fontUrl, fontName) {
    if (!fontUrl || !fontName) return;
    try {
      const exists = Array.from(document.fonts).some(
        (f) => f.family === fontName
      );
      if (exists) return;

      const fontFace = new FontFace(fontName, `url(${fontUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      await document.fonts.ready;
      setUploadedFontName(fontName);
    } catch (err) {
      console.error("Font load failed", err);
      throw err;
    }
  }

  // ============================================
  // LOAD TEMPLATE (ambil 1 template terbaru)
  // ============================================
  useEffect(() => {
    if (!eventId || !fabricRef.current) return;

    const loadTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from("certificate_templates")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("loadTemplate error", error);
          return;
        }

        const tpl = data?.[0];
        if (!tpl) return;

        const c = fabricRef.current;

        setTemplateId(tpl.id);
        setImageUrl(tpl.image_url || "");
        setTemplateName(tpl.name || "");

        // load font kalau ada
        if (tpl.font_url && tpl.font_name) {
          await loadAndRegisterFont(tpl.font_url, tpl.font_name);
          setUploadedFontUrl(tpl.font_url);
          setUploadedFontName(tpl.font_name);
        }

        // background
        if (tpl.image_url) {
          fabric.Image.fromURL(
            tpl.image_url,
            (img) => {
              c.clear();
              c.setWidth(img.width);
              c.setHeight(img.height);
              c.setBackgroundImage(img, c.renderAll.bind(c));
            },
            { crossOrigin: "anonymous" }
          );
        }

        // fields
        (tpl.config || []).forEach((cfg) => {
          const txt = new fabric.Textbox(cfg.placeholder || `{{${cfg.key}}}`, {
            left: cfg.x ?? 50,
            top: cfg.y ?? 50,
            width: cfg.width ?? 400,
            originX: cfg.originX || "left",
            originY: cfg.originY || "top",
            fontSize: cfg.fontSize ?? 36,
            fontFamily:
              cfg.fontFamily ||
              tpl.font_name ||
              uploadedFontName ||
              "Poppins",
            fill: cfg.color || "#111827",
            textAlign: cfg.textAlign || "center",
            lineHeight: cfg.lineHeight || 1.1,
            editable: false,
            selectable: true,
          });
          txt.set({ data: { key: cfg.key } });
          c.add(txt);
        });

        c.renderAll();
      } catch (err) {
        console.error("loadTemplate exception", err);
      }
    };

    loadTemplate();
  }, [eventId]);

  // ============================================
  // UPLOAD BACKGROUND IMAGE
  // ============================================
  const handleUploadImage = async (file) => {
    if (!file || !fabricRef.current) return;

    setLoading(true);
    try {
      const fileName = `templates/${eventId}/${Date.now()}_${file.name}`;

      const { error: upErr } = await supabase.storage
        .from("certificates")
        .upload(fileName, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("certificates")
        .getPublicUrl(fileName);

      const publicUrl =
        urlData.publicUrl || urlData.public_url || urlData.publicUrl;

      setImageUrl(publicUrl);

      const c = fabricRef.current;

      fabric.Image.fromURL(
        publicUrl,
        (img) => {
          c.clear();
          c.setWidth(img.width);
          c.setHeight(img.height);
          c.setBackgroundImage(img, c.renderAll.bind(c));
        },
        { crossOrigin: "anonymous" }
      );

      toast.success("Background berhasil diupload");
    } catch (err) {
      console.error(err);
      toast.error("Upload background gagal: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // UPLOAD FONT
  // ============================================
  const handleUploadFont = async (file) => {
    if (!file || !fabricRef.current) return;

    setLoading(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["ttf", "otf", "woff", "woff2"].includes(ext)) {
        toast.error("Format font tidak didukung");
        setLoading(false);
        return;
      }

      const path = `fonts/${eventId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("certificates")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("certificates")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl || urlData.public_url;
      const friendlyName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/\s+/g, "_");

      await loadAndRegisterFont(publicUrl, friendlyName);

      setUploadedFontUrl(publicUrl);
      setUploadedFontName(friendlyName);

      const c = fabricRef.current;
      c.getObjects().forEach((o) => {
        if (o.type === "textbox" || o.type === "text") {
          o.set({ fontFamily: friendlyName });
        }
      });
      c.renderAll();

      toast.success("Font berhasil diupload & diterapkan");
    } catch (err) {
      console.error(err);
      toast.error("Upload font gagal: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADD FIELD
  // ============================================
  const addField = (key) => {
    const c = fabricRef.current;
    if (!c) return;

    const centerX = c.getWidth() / 2 || 400;
    const centerY = c.getHeight() / 2 || 300;

    const txt = new fabric.Textbox(`{{${key}}}`, {
      left: centerX,
      top: centerY,
      width: c.getWidth() * 0.6 || 600,
      originX: "center",
      originY: "top",
      fontSize: 36,
      fontFamily: uploadedFontName || "Poppins",
      fill: "#111827",
      textAlign: "center",
      lineHeight: 1.1,
      editable: false,
      selectable: true,
    });

    txt.set({ data: { key } });
    c.add(txt).setActiveObject(txt);
    c.renderAll();
  };

  // ============================================
  // UPDATE SELECTED STYLE
  // ============================================
  const updateSelected = (patch) => {
    const c = fabricRef.current;
    if (!c) return;
    const obj = c.getActiveObject();
    if (!obj) return;

    obj.set(patch);
    c.renderAll();
  };

  // ============================================
  // SAVE TEMPLATE
  // ============================================
const saveTemplate = async () => {
  if (!imageUrl) return toast.error("Upload background dulu");
  if (!templateName) return toast.error("Isi nama template");

  const c = fabricRef.current;
  if (!c) return;

  setLoading(true);
  try {
    const fields = c.getObjects()
      .filter((o) => o.type === "text" || o.type === "textbox")
      .map((o) => ({
        key: o.data?.key || null,
        placeholder: o.text,

        x: Math.round(o.left || 0),
        y: Math.round(o.top || 0),

        width: Math.round((o.width || 0) * (o.scaleX || 1)),
        height: Math.round((o.height || 0) * (o.scaleY || 1)),

        scaleX: o.scaleX || 1,
        scaleY: o.scaleY || 1,

        originX: o.originX || "left",
        originY: o.originY || "top",

        fontSize: Math.round(o.fontSize || 36),
        fontFamily: o.fontFamily || uploadedFontName || "Poppins",

        color: o.fill || "#000000",
        textAlign: o.textAlign || "left",
        lineHeight: o.lineHeight || 1.1,
        charSpacing: o.charSpacing || 0,
      }));

    const payload = {
      event_id: eventId,
      name: templateName,
      image_url: imageUrl,
      config: fields,
      font_url: uploadedFontUrl || null,
      font_name: uploadedFontName || null,
    };

    const { error } = await supabase
      .from("certificate_templates")
      .upsert(payload, { onConflict: "event_id" });

    if (error) throw error;

    toast.success("Template tersimpan 🎉");
    navigate(`/admin/event/${eventId}`);
  } catch (err) {
    console.error("saveTemplate err", err);
    toast.error("Gagal menyimpan template: " + (err.message || err));
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // UI
  // ============================================
  return (
    <div className="min-h-screen bg-[#F4F2FA] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-700">
              Certificate Template Editor
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Atur posisi field sertifikat, upload background, dan font khusus.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-purple-200 text-purple-700 text-sm hover:bg-purple-50"
          >
            Kembali
          </button>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <div className="bg-white rounded-2xl shadow p-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Nama Template
              </p>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Contoh: Sertifikat Workshop AI"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Tambah Field
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "name", label: "Nama" },
                  { key: "npm", label: "NPM" },
                  { key: "event", label: "Event" },
                  { key: "date", label: "Tanggal" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => addField(f.key)}
                    className="w-full px-2 py-2 rounded-lg text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Background Sertifikat
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs"
                  onChange={(e) => handleUploadImage(e.target.files?.[0])}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Font (ttf/otf/woff)
                </p>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="text-xs"
                  onChange={(e) => handleUploadFont(e.target.files?.[0])}
                />
                {uploadedFontName && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Font aktif: <b>{uploadedFontName}</b>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={saveTemplate}
              disabled={loading}
              className="w-full mt-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Menyimpan..." : "Simpan Template"}
            </button>
          </div>

          {/* CANVAS */}
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-500 mb-2">
              Tips: drag untuk memindahkan field, resize pojok field untuk ubah
              lebar area teks, tekan <span className="font-mono">Delete</span>{" "}
              untuk menghapus.
            </p>
            <div className="w-full overflow-auto border rounded-xl bg-gray-50 flex items-center justify-center">
              <canvas
                id="cert-canvas"
                ref={canvasRef}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  margin: "0 auto",
                }}
              />
            </div>
          </div>
        </div>

        {/* EDITOR PANEL */}
        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="font-semibold mb-2 text-gray-800">
            Properti Field (klik teks di canvas)
          </h3>

          {!selectedObj ? (
            <p className="text-gray-500 text-sm">
              Pilih salah satu field teks pada canvas untuk mengubah isi, ukuran
              font, warna, dan lebar area teks.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-500">
                  Text
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={selectedObj.text}
                  onChange={(e) => {
                    selectedObj.text = e.target.value;
                    fabricRef.current.renderAll();
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Font Size
                </label>
                <input
                  type="number"
                  min={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={selectedObj.fontSize}
                  onChange={(e) =>
                    updateSelected({
                      fontSize: parseInt(e.target.value || "1", 10),
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Warna
                </label>
                <input
                  type="color"
                  className="w-full border border-gray-200 rounded-lg p-1"
                  value={selectedObj.fill || "#000000"}
                  onChange={(e) =>
                    updateSelected({ fill: e.target.value || "#000000" })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Lebar Area (px)
                </label>
                <input
                  type="number"
                  min={50}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={Math.round(
                    (selectedObj.width || 0) * (selectedObj.scaleX || 1)
                  )}
                  onChange={(e) => {
                    const val = parseInt(e.target.value || "0", 10);
                    if (!Number.isNaN(val) && val > 0) {
                      selectedObj.set({ width: val, scaleX: 1 });
                      fabricRef.current.renderAll();
                    }
                  }}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-500 block">
                  Font Upload
                </label>
                <button
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg w-full text-sm disabled:opacity-60"
                  disabled={!uploadedFontName}
                  onClick={() => {
                    if (!uploadedFontName)
                      return toast.error("Upload font dulu");
                    updateSelected({ fontFamily: uploadedFontName });
                  }}
                >
                  Terapkan ke Field Ini
                  {uploadedFontName ? ` (${uploadedFontName})` : ""}
                </button>

                <button
                  className="px-3 py-2 bg-gray-100 rounded-lg w-full text-sm disabled:opacity-60"
                  disabled={!uploadedFontName}
                  onClick={() => {
                    if (!uploadedFontName)
                      return toast.error("Upload font dulu");
                    const c = fabricRef.current;
                    c.getObjects().forEach((o) => {
                      if (o.type === "textbox" || o.type === "text") {
                        o.set({ fontFamily: uploadedFontName });
                      }
                    });
                    c.renderAll();
                    toast.success("Font diterapkan ke semua field");
                  }}
                >
                  Terapkan ke Semua Field
                  {uploadedFontName ? ` (${uploadedFontName})` : ""}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
