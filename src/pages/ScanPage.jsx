import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { toast } from "react-hot-toast";

export default function ScanPage() {
  const { eventId, type } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("Menyiapkan kamera...");
  const [showSuccess, setShowSuccess] = useState(false); // ANIMASI SUKSES

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras().then(async (devices) => {
      if (!devices || devices.length === 0) {
        setStatus("Tidak ada kamera ditemukan");
        return;
      }

      const cameraId = devices[0].id;

      html5QrCode.start(
        cameraId,
        { fps: 10, qrbox: 250 },
        async (qrText) => {
          setStatus("QR terdeteksi, memproses...");

          // ==========================
          // 1️⃣ QR DYNAMIC TOKEN
          // ==========================
          if (qrText.length === 36 && qrText.includes("-")) {
            await processDynamicToken(qrText, html5QrCode);
            return;
          }

          // ==========================
          // 2️⃣ QR STATIC FALLBACK
          // ==========================
          if (!qrText.startsWith("HIROSI_EVENT:")) {
            toast.error("Format QR tidak dikenal");
            return;
          }

          const parts = qrText.split(":");
          const scannedEventId = parts[1];
          const scannedType = parts[2];

          if (String(scannedEventId) !== String(eventId)) {
            toast.error("QR ini bukan untuk event ini");
            return;
          }

          if (scannedType !== type) {
            toast.error("Jenis QR tidak sesuai");
            return;
          }

          await saveAttendance(type);
          await html5QrCode.stop();
          navigate("/");
        },
        () => {}
      );
    });

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, []);

  // =====================================================
  // 🔐 VALIDASI TOKEN DINAMIS
  // =====================================================
  const processDynamicToken = async (token, html5QrCode) => {
    setStatus("Memvalidasi token...");

    const { data, error } = await supabase
      .from("dynamic_qr")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!data) {
      toast.error("Token tidak valid / sudah expired");
      return;
    }

    // cek expired
    const now = new Date();
    const expires = new Date(data.expires_at);
    if (expires < now) {
      toast.error("Token expired");
      return;
    }

    // cek event cocok
    if (String(data.event_id) !== String(eventId)) {
      toast.error("Token bukan untuk event ini");
      return;
    }

    // cek type
    if (data.type !== type) {
      toast.error("Token tidak sesuai untuk jenis ini");
      return;
    }

    // OK → simpan absensi
    await saveAttendance(type);

    await html5QrCode.stop();
    navigate("/");
  };

  // =====================================================
  // 📌 SIMPAN ABSENSI
  // =====================================================
  const saveAttendance = async (scannedType) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Anda belum login");
      navigate("/auth/login");
      return;
    }

    const { error } = await supabase.from("attendance").insert({
      user_id: auth.user.id,
      event_id: eventId,
      type: scannedType,
    });

    if (error) {
      toast.error("Gagal menyimpan absensi: " + error.message);
    } else {
      // 🎉 TAMPILKAN ANIMASI SUKSES
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1300);

      toast.success(`Berhasil ${scannedType.toUpperCase()}!`);
    }
  };
const { data: reg } = await supabase
  .from("event_registrations")
  .select("payment_status")
  .eq("event_id", eventId)
  .eq("user_id", user.id)
  .single();

if (!reg) {
  return toast.error("Anda belum terdaftar");
}

if (event.is_paid && reg.payment_status !== "paid") {
  return toast.error("Pembayaran belum lunas");
}

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-purple-100 to-purple-200 p-6">

      {/* ================= ANIMASI SUKSES ================= */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-full shadow-2xl animate-[fadeInOut_1.2s_ease]">
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          {/* CSS Keyframes */}
          <style>{`
            @keyframes fadeInOut {
              0% { opacity: 0; transform: scale(0.5); }
              20% { opacity: 1; transform: scale(1); }
              80% { opacity: 1; transform: scale(1); }
              100% { opacity: 0; transform: scale(0.5); }
            }
            .animate-[fadeInOut_1.2s_ease] {
              animation: fadeInOut 1.2s ease forwards;
            }
          `}</style>
        </div>
      )}

      {/* TITLE */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-purple-700">
          Scan untuk {type.toUpperCase()}
        </h1>
        <p className="text-gray-600 mt-2">{status}</p>
      </div>

      {/* QR CAMERA SCANNER */}
      <div
        id="reader"
        className="rounded-2xl shadow-xl border border-purple-300 bg-white overflow-hidden"
        style={{ width: "320px" }}
      />
    </div>
  );
}
