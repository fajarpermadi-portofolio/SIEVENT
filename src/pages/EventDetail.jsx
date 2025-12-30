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

  // ================= INIT =================
  useEffect(() => {
    init();
    // refresh saat user balik dari Midtrans / pindah tab
    window.addEventListener("focus", refreshRegistration);

    return () => {
      window.removeEventListener("focus", refreshRegistration);
    };
    // eslint-disable-next-line
  }, [id]);

  const init = async () => {
    setLoading(true);

    const currentUser = await loadUser();
    await loadEvent();

    if (currentUser) {
      await Promise.all([
        loadRegistration(currentUser.id),
        loadAttendance(currentUser.id),
      ]);
    }

    setLoading(false);
  };

  const refreshRegistration = async () => {
    if (user) {
      await loadRegistration(user.id);
    }
  };

  // ================= USER =================
  const loadUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    setUser(data.user || null);
    return data.user || null;
  };

  // ================= EVENT =================
  const loadEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("Event tidak ditemukan");
      navigate("/");
      return;
    }

    setEvent(data);
  };

  // ================= REGISTRATION =================
  const loadRegistration = async (userId) => {
    const { data } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", id)
      .maybeSingle();

    setRegistration(data || null);
  };

  // ================= ATTENDANCE =================
  const loadAttendance = async (userId) => {
    const [ci, co] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", id)
        .eq("attendance_type", "checkin")
        .order("timestamp", { ascending: false })
        .limit(1),

      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", id)
        .eq("attendance_type", "checkout")
        .order("timestamp", { ascending: false })
        .limit(1),
    ]);

    setAttendance({
      checkin: ci.data?.[0] || null,
      checkout: co.data?.[0] || null,
    });
  };

  // ================= REGISTER FREE =================
  const handleRegisterFree = async () => {
    if (!user) return toast.error("Silakan login terlebih dahulu");

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: id,
      payment_status: "paid",
    });

    if (error) return toast.error("Anda sudah terdaftar");

    toast.success("Berhasil mendaftar event!");
    await loadRegistration(user.id);
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    if (!user) return toast.error("Silakan login terlebih dahulu");
    if (!event?.price || Number(event.price) <= 0)
      return toast.error("Harga event tidak valid");

    setLoadingPay(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-payment",
        { body: { event_id: id } }
      );

      if (error || !data?.payment_url)
        throw new Error("Gagal membuat pembayaran");

      window.location.href = data.payment_url;
    } catch (err) {
      console.error(err);
      toast.error("Gagal memulai pembayaran");
    } finally {
      setLoadingPay(false);
    }
  };

  // ================= RENDER =================
  if (loading || !event) {
    return (
      <div className="py-32 text-center text-slate-500">
        Memuat event...
      </div>
    );
  }

  const isPaidEvent = Number(event.price) > 0;
  const isRegistered = !!registration;
  const isPaid = registration?.payment_status === "paid"; // ⭐ PENTING

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {event.pamphlet_url && (
          <img
            src={event.pamphlet_url}
            alt={event.name}
            className="w-full max-h-[520px] object-contain"
          />
        )}

        <div>
          <h1 className="text-4xl font-extrabold">{event.name}</h1>
          <p className="text-slate-600">
            {event.date} • {event.start_time || "-"} • {event.location}
          </p>

          {event.description && (
            <p className="mt-3 text-slate-700">{event.description}</p>
          )}

          {isPaidEvent && (
            <p className="mt-4 text-xl font-bold text-green-700">
              Harga: Rp {Number(event.price).toLocaleString("id-ID")}
            </p>
          )}
        </div>

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
