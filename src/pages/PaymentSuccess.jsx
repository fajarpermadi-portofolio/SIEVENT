import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { CheckCircle2, XCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const orderId = params.get("order_id");
    const transactionStatus = params.get("transaction_status");

    if (!orderId) {
      setMessage("Order ID tidak ditemukan");
      setLoading(false);
      return;
    }

    // Status yang dianggap berhasil
    if (
      transactionStatus === "settlement" ||
      transactionStatus === "capture"
    ) {
      setValid(true);
      setMessage("Pembayaran berhasil 🎉");
    } else if (transactionStatus === "pending") {
      setMessage("Pembayaran sedang diproses");
    } else {
      setMessage("Pembayaran gagal atau dibatalkan");
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Memeriksa status pembayaran...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg text-center space-y-6">

        {valid ? (
          <CheckCircle2 size={80} className="text-green-600 mx-auto" />
        ) : (
          <XCircle size={80} className="text-red-600 mx-auto" />
        )}

        <h1 className="text-2xl font-bold text-slate-900">
          {message}
        </h1>

        <p className="text-slate-600 text-sm">
          Status pembayaran Anda sedang disinkronkan dengan sistem.
          Jika sudah berhasil, Anda dapat langsung mengikuti event.
        </p>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => navigate("/my-events")}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Lihat Event Saya
          </button>

          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 border border-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
