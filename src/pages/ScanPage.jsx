import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { toast } from "react-hot-toast";

export default function ScanPage() {
  const { eventId, type } = useParams(); // type = checkin / checkout
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  const [status, setStatus] = useState("Menyiapkan kamera...");
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);

  // ===============================
  // 🔐 INIT USER & EVENT
  // ===============================
  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Silakan login terlebih dahulu");
        navigate("/auth/login");
        return;
      }
      setUser(auth.user);

      const { data: ev } = await supabase
        .from("events")
        .select("id, name, is_paid")
        .eq("id", eventId)
        .single();

      if (!ev) {
        toast.error("Event tidak ditemukan");
        navigate("/");
        return;
      }

      setEvent(ev);
      setLoading(false);
    };

    init();
  }, [eventId, navigate]);

  // ===============================
  // 🎥 START SCANNER (REAR CAMERA)
  // ===============================
  useEffect(() => {
    if (loading || !user || !event) return;

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const startCamera = async () => {
      try {
        // ✅ PRIORITY: BACK CAMERA (HP)
        await scanner.start(
          { facingMode: { exact: "environment" } },
          { fps: 10, qrbox: 260 },
          async (qrText) => {
            scanner.pause();
            setStatus("QR terdeteksi, memproses...");
            await handleScan(qrText);
          }
        );
      } catch {
        // 🔁 FALLBACK (Laptop / unsupported device)
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) {
          setStatus("Kamera tidak ditemukan");
          return;
        }

        await scanner.start(
          cameras[0].id,
          { fps: 10, qrbox: 260 },
          async (qrText) => {
            scanner.pause();
            setStatus("QR terdeteksi, memproses...");
            await handleScan(qrText);
          }
        );
      }
    };

    startCamera();

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [loading, user, event]);

  // ===============================
  // 🧠 HANDLE QR
  // ===============================
  const handleScan = async (qrText) => {
    // QR DINAMIS (UUID)
    if (qrText.length === 36 && qrText.includes("-")) {
      return processDynamicToken(qrText);
    }

    // QR STATIS
    if (!qrText.startsWith("HIROSI_EVENT:")) {
      return fail("QR tidak valid");
    }

    const [, scannedEventId, scannedType] = qrText.split(":");

    if (scannedEventId !== eventId)
      return fail("QR bukan untuk event ini");

    if (scannedType !== type)
      return fail("Jenis QR tidak sesuai");

    await validateAndSave();
  };

  // ===============================
  // 🔐 VALIDASI TOKEN DINAMIS
  // ===============================
  const processDynamicToken = async (token) => {
    const { data } = await supabase
      .from("dynamic_qr")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!data) return fail("Token tidak valid");

    if (new Date(data.expires_at) < new Date())
      return fail("Token sudah expired");

    if (String(data.event_id) !== String(eventId))
      return fail("Token bukan untuk event ini");

    if (data.attendance_type !== type)
      return fail("Token tidak sesuai");

    await validateAndSave();
  };

  // ===============================
  // 🔒 VALIDASI REGISTRASI & PAYMENT
  // ===============================
  const validateAndSave = async () => {
    const { data: reg } = await supabase
      .from("event_registrations")
      .select("payment_status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!reg) return fail("Anda belum terdaftar");

    if (event.is_paid && reg.payment_status !== "paid")
      return fail("Pembayaran belum lunas");

    await saveAttendance();
  };

  // ===============================
  // 📝 SIMPAN ABSENSI (FIX COLUMN)
  // ===============================
  const saveAttendance = async () => {
    const { error } = await supabase.from("attendance").insert({
      user_id: user.id,
      event_id: eventId,
      attendance_type: type, // ✅ FIX
    });

    if (error) {
      toast.error(error.message);
      resume();
    } else {
      setShowSuccess(true);
      toast.success(`Berhasil ${type.toUpperCase()}`);
      setTimeout(() => navigate("/"), 1300);
    }
  };

  // ===============================
  // UTIL
  // ===============================
  const fail = (msg) => {
    toast.error(msg);
    resume();
  };

  const resume = () => {
    scannerRef.current?.resume();
    setStatus("Siap scan ulang");
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-purple-100 to-purple-200 p-6">
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-full shadow-2xl animate-[fadeInOut_1.2s_ease]">
            <svg
              width="120"
              height="120"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-purple-700 mb-2">
        Scan untuk {type.toUpperCase()}
      </h1>
      <p className="text-gray-600 mb-4">{status}</p>

      <div
        id="reader"
        className="rounded-2xl shadow-xl border bg-white"
        style={{ width: 320 }}
      />
    </div>
  );
}
