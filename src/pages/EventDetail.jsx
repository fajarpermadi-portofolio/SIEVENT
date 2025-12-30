// src/pages/EventDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import toast from "react-hot-toast";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [attendance, setAttendance] = useState({
    checkin: null,
    checkout: null,
  });

  const [loading, setLoading] = useState(true);
  const [loadingPay, setLoadingPay] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    await loadUser();
    await loadEvent();
    await loadRegistration();
    await loadAttendance();
    setLoading(false);
  };

  // ================= USER =================
  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user || null);
  };

  // ================= EVENT =================
  const loadEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Event tidak ditemukan");
      navigate("/");
      return;
    }

    setEvent(data);
  };

  // ================= REGISTRATION =================
  const loadRegistration = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { data: reg } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("event_id", id)
      .maybeSingle();

    setRegistration(reg || null);
  };

  // ================= ATTENDANCE =================
  const loadAttendance = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { data: ci } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("event_id", id)
      .eq("type", "checkin")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: co } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("event_id", id)
      .eq("type", "checkout")
      .order("created_at", { ascending: false })
      .limit(1);

    setAttendance({
      checkin: ci?.[0] || null,
      checkout: co?.[0] || null,
    });
  };

  // ================= REGISTER (FREE) =================
  const handleRegisterFree = async () => {
    if (!user) return toast.error("Silakan login terlebih dahulu");

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: id,
      payment_status: "paid",
    });

    if (error) {
      toast.error("Anda sudah terdaftar");
      return;
    }

    toast.success("Berhasil mendaftar event!");
    loadRegistration();
  };

  // ================= PAY (PAID EVENT) =================
  const handlePayment = async () => {
    if (!user) return toast.error("Silakan login");

    setLoadingPay(true);

    const { data, error } = await supabase.functions.invoke(
      "create-payment",
      {
        body: {
          event_id: id,
          amount: event.price,
        },
      }
    );

    setLoadingPay(false);

    if (error) {
      toast.error("Gagal membuat pembayaran");
      return;
    }

    window.location.href = data.payment_url;
  };

  if (loading || !event) {
    return (
      <div className="py-32 text-center text-slate-500">
        Memuat event...
      </div>
    );
  }

  const isPaidEvent = event.price && event.price > 0;
  const isRegistered = !!registration;
  const isPaid = registration?.payment_status === "paid";

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* POSTER */}
        {event.pamphlet_url && (
          <img
            src={event.pamphlet_url}
            alt={event.name}
            className="w-full max-h-[520px] object-contain"
          />
        )}

        {/* INFO */}
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold text-slate-900">
            {event.name}
          </h1>

          <p className="text-slate-600">
            {event.date} • {event.start_time} • {event.location}
          </p>

          {event.description && (
            <p className="text-slate-700 leading-relaxed">
              {event.description}
            </p>
          )}

          {isPaidEvent && (
            <p className="text-xl font-bold text-green-700">
              Harga: Rp {event.price.toLocaleString("id-ID")}
            </p>
          )}
        </div>

        {/* STATUS */}
        {isRegistered && (
          <div className="border-t pt-6 space-y-2">
            <p>
              <b>Status Pembayaran:</b>{" "}
              {isPaid ? (
                <span className="text-green-700 font-semibold">LUNAS</span>
              ) : (
                <span className="text-red-600 font-semibold">BELUM BAYAR</span>
              )}
            </p>
          </div>
        )}

        {/* ACTION */}
        <div className="border-t pt-6 space-y-4">

          {!isRegistered && !isPaidEvent && (
            <button
              onClick={handleRegisterFree}
              className="px-8 py-4 bg-slate-900 text-white font-semibold"
            >
              Daftar Event
            </button>
          )}

          {!isRegistered && isPaidEvent && (
            <button
              onClick={handlePayment}
              disabled={loadingPay}
              className="px-8 py-4 bg-green-700 text-white font-semibold"
            >
              {loadingPay ? "Memproses..." : "Bayar & Daftar"}
            </button>
          )}

          {isRegistered && !isPaid && isPaidEvent && (
            <button
              onClick={handlePayment}
              disabled={loadingPay}
              className="px-8 py-4 bg-red-700 text-white font-semibold"
            >
              {loadingPay ? "Memproses..." : "Selesaikan Pembayaran"}
            </button>
          )}

          {isRegistered && isPaid && (
            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/scan/${id}/checkin`)}
                className="px-8 py-4 bg-green-700 text-white font-semibold"
              >
                Scan Check-In
              </button>

              <button
                onClick={() => navigate(`/scan/${id}/checkout`)}
                className="px-8 py-4 bg-red-700 text-white font-semibold"
              >
                Scan Check-Out
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
