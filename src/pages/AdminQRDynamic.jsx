// src/pages/AdminQRDynamic.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import { Play, StopCircle, Monitor, Copy, Download } from "lucide-react";

/**
 * AdminQRDynamic
 * - generate token dari Supabase Edge Function (generateDynamicQR)
 * - refresh otomatis setiap 10 detik saat mode ON
 * - presentasi fullscreen (clean UI)
 *
 * Requirements:
 * - set env VITE_SUPABASE_FUNCTION_URL = https://<project>.supabase.co/functions/v1
 * - function name: generateDynamicQR (POST { event_id, type }) -> { token }
 */

export default function AdminQRDynamic() {
  const { eventId } = useParams(); // route: /admin/dynamicqr/:eventId
  const navigate = useNavigate();

  const [type, setType] = useState("checkin"); // checkin | checkout
  const [token, setToken] = useState("");
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const presentRef = useRef(null);
  const [presentMode, setPresentMode] = useState(false);

  const FUNCTION_BASE = import.meta.env.VITE_SUPABASE_FUNCTION_URL?.replace(/\/+$/, "") || "";

  // helper: fetch token from Edge Function
  const fetchTokenFromServer = async () => {
    if (!FUNCTION_BASE) {
      toast.error("Env VITE_SUPABASE_FUNCTION_URL belum diset");
      return null;
    }

    try {
      setLoading(true);
      const res = await fetch(`${FUNCTION_BASE}/generateDynamicQR`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, type }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        const msg = data?.error || "Gagal generate token";
        toast.error(msg);
        return null;
      }

      if (!data?.token) {
        toast.error("Response function tidak berisi token");
        return null;
      }

      return data.token;
    } catch (e) {
      setLoading(false);
      toast.error("Gagal terhubung ke function");
      return null;
    }
  };

  // generate once and set countdown
  const generateOnce = async () => {
    const t = await fetchTokenFromServer();
    if (!t) return;
    setToken(t);
    setCountdown(10);
  };

  // start auto-refresh
  const start = async () => {
    if (running) return;
    await generateOnce();
    setRunning(true);

    // interval untuk refresh token tiap 10s (jalankan generateOnce)
    intervalRef.current = setInterval(async () => {
      await generateOnce();
    }, 10000);

    // countdown tick tiap detik
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return 10;
        return c - 1;
      });
    }, 1000);

    toast.success("Mode Dynamic QR aktif");
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRunning(false);
    setCountdown(0);
    toast("Mode Dynamic QR berhenti");
  };

  // toggle presentation fullscreen
  const enterPresent = async () => {
    setPresentMode(true);
    // open fullscreen on container
    try {
      const el = presentRef.current;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } catch (e) {
      console.warn("Fullscreen failed", e);
    }
  };

  const exitPresent = async () => {
    setPresentMode(false);
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    } catch (e) {
      console.warn("Exit fullscreen failed", e);
    }
  };

  // copy token to clipboard (for debug/admin)
  const copyToken = async () => {
    if (!token) return toast.error("Belum ada token");
    await navigator.clipboard.writeText(token);
    toast.success("Token disalin ke clipboard");
  };

  // download QR as PNG (simple approach: render SVG -> convert)
  const downloadQR = () => {
    if (!token) return toast.error("Belum ada token");
    // Serialize QR SVG produced by react-qr-code (it renders <svg>)
    const svg = document.getElementById("admin-dynqr-svg");
    if (!svg) return toast.error("QR SVG tidak ditemukan");

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const png = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = png;
      a.download = `HIROSI_DYNAMIC_${eventId}_${type}.png`;
      a.click();
    };
    img.src = url;
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      // ensure exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // quick UI: auto-start if you want (commented)
  // useEffect(() => { start(); return stop }, []);

  const qrValue = token ? token : `HIROSI_DYNAMIC:${eventId}:${type}:N/A`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-700">
              Admin — Dynamic QR
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Event ID: <span className="font-medium">{eventId}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg bg-white border hover:shadow"
            >
              Back
            </button>

            {!running ? (
              <button
                onClick={start}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
              >
                <Play size={16} /> Start
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"
              >
                <StopCircle size={16} /> Stop
              </button>
            )}
          </div>
        </div>

        {/* Controls + QR Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border">
          <div className="md:flex md:items-center md:gap-6">
            <div className="md:w-1/2 flex flex-col items-center">
              <div
                ref={presentRef}
                className="bg-white p-6 rounded-xl shadow-inner"
                style={{ transform: "translateZ(0)" }}
              >
                <div className="mx-auto w-64 h-64 flex items-center justify-center">
                  {/* render QR inside a wrapper with id for download */}
                  <div id="qr-wrapper" className="bg-white p-2 rounded-md">
                    {/* react-qr-code renders an <svg> without id; we add id attribute on container svg using prop 'id' */}
                    <QRCode id="admin-dynqr-svg" value={qrValue} size={240} />
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                    <strong className="uppercase">{type}</strong>
                    <span className="px-2">•</span>
                    <span>
                      {running ? (
                        <span className="text-green-600 font-semibold">Active</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Stopped</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* countdown */}
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-500">Next refresh in</p>
                  <div className="text-3xl font-mono text-purple-700">{countdown}s</div>
                </div>
              </div>

              {/* present / copy / download */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => (presentMode ? exitPresent() : enterPresent())}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Monitor size={16} /> {presentMode ? "Exit Present" : "Present"}
                </button>

                <button
                  onClick={copyToken}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  <Copy size={14} /> Salin Token
                </button>

                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  <Download size={14} /> Download PNG
                </button>
              </div>
            </div>

            {/* right: settings */}
            <div className="md:w-1/2 mt-6 md:mt-0">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mode</label>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => setType("checkin")}
                      className={`px-4 py-2 rounded-lg ${type === "checkin" ? "bg-purple-700 text-white" : "bg-gray-100"}`}
                    >
                      Check-In
                    </button>
                    <button
                      onClick={() => setType("checkout")}
                      className={`px-4 py-2 rounded-lg ${type === "checkout" ? "bg-purple-700 text-white" : "bg-gray-100"}`}
                    >
                      Check-Out
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status Token</label>
                  <div className="mt-2">
                    <input
                      className="w-full p-3 rounded-lg bg-gray-50 border"
                      readOnly
                      value={token || "— belum ada token —"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">QR Value (debug)</label>
                  <div className="mt-2">
                    <textarea
                      className="w-full p-3 rounded-lg bg-gray-50 border h-28"
                      readOnly
                      value={qrValue}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Catatan: Token dibuat oleh Edge Function dan hanya berlaku 10 detik.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* PRESENTATION MODE: FULLSCREEN CLEAN VIEW */}
      {presentMode && (
        // fullscreen will display the presentRef wrapper in fullscreen,
        // but we also render a clean overlay to ensure visibility in some browsers:
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none">
          <div className="text-white text-center pointer-events-none">
            <div className="mx-auto w-[min(80vw,740px)]">
              <div className="bg-transparent p-6">
                <div className="bg-white p-4 rounded-lg inline-block pointer-events-auto">
                  <QRCode value={qrValue} size={720} />
                </div>
                <div className="mt-6 text-lg">Scan untuk <strong className="uppercase">{type}</strong></div>
                <div className="mt-2 text-sm">Token refresh setiap 10 detik</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
