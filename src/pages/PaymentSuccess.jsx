import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("order_id");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending"); // pending | success | failed
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      setMessage("Order ID tidak ditemukan");
      setLoading(false);
      return;
    }

    let attempt = 0;
    const maxAttempt = 10; // ~10 detik

    const interval = setInterval(async () => {
      attempt++;

      const { data, error } = await supabase
        .from("event_registrations")
        .select("payment_status")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      if (data?.payment_status === "paid") {
        clearInterval(interval);
        setStatus("success");
        setMessage("Pembayaran berhasil 🎉");
        setLoading(false);
      }

      if (attempt >= maxAttempt) {
        clearInterval(interval);
        setStatus("pending");
        setMessage(
          "Pembayaran sedang diproses. Silakan cek kembali beberapa saat lagi."
        );
        setLoading(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" />
        Memverifikasi pembayaran...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg text-center space-y-6">

        {status === "success" ? (
          <CheckCircle2 size={80} className="text-green-600 mx-auto" />
        ) : (
          <XCircle size={80} className="text-orange-500 mx-auto" />
        )}

        <h1 className="text-2xl font-bold text-slate-900">
          {message}
        </h1>

        <p className="text-slate-600 text-sm">
          Status pembayaran diambil langsung dari sistem.
          Jika pembayaran baru saja dilakukan, mohon tunggu beberapa saat.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 border border-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition"
          >
            Kembali ke Beranda
          </button>

          {status === "success" && (
            <button
              onClick={() => navigate("/my-certificates")}
              className="px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
            >
              Lihat Sertifikat Saya
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
