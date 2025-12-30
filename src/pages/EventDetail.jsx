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
  const [registered, setRegistered] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [attendance, setAttendance] = useState({
    checkin: null,
    checkout: null,
  });
  const [loadingReg, setLoadingReg] = useState(false);

  // =====================================================
  // INIT
  // =====================================================
  useEffect(() => {
    initPage();
  }, []);

  const initPage = async () => {
    await loadUser();
    await loadEvent();
  };

  // =====================================================
  // LOAD USER
  // =====================================================
  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user || null);
  };

  // =====================================================
  // LOAD EVENT + REGISTRATION
  // =====================================================
  const loadEvent = async () => {
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    setEvent(ev);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: reg } = await supabase
      .from("event_registrations")
      .select("payment_status")
      .eq("user_id", auth.user.id)
      .eq("event_id", id)
      .maybeSingle();

    if (reg) {
      setRegistered(true);
      setPaymentStatus(reg.payment_status);
      await loadAttendance(auth.user.id);
    }
  };

  // =====================================================
  // LOAD ATTENDANCE
  // =====================================================
  const loadAttendance = async (userId) => {
    const { data: ci } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", id)
      .eq("type", "checkin")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: co } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", id)
      .eq("type", "checkout")
      .order("created_at", { ascending: false })
      .limit(1);

    setAttendance({
      checkin: ci?.[0] || null,
      checkout: co?.[0] || null,
    });
  };

  // =====================================================
  // REGISTER (FREE EVENT)
  // =====================================================
  const handleRegisterFree = async () => {
    if (!user) return toast.error("Harap login terlebih dahulu");

    setLoadingReg(true);

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: id,
      payment_status: "free",
    });

    setLoadingReg(false);

    if (error) {
      toast.error("Anda sudah terdaftar.");
      return;
    }

    toast.success("Berhasil mendaftar event!");
    setRegistered(true);
    setPaymentStatus("free");
  };

  // =====================================================
  // PAY & REGISTER (PAID EVENT)
  // =====================================================
  const payAndRegister = async () => {
    if (!user) return toast.error("Harap login terlebih dahulu");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          event_id: event.id,
        }),
      }
    );

    const data = await res.json();

    if (!data.snapToken) {
      toast.error("Gagal memulai pembayaran");
      return;
    }

    window.snap.pay(data.snapToken, {
      onSuccess: () => {
        toast.success("Pembayaran berhasil");
        setRegistered(true);
        setPaymentStatus("paid");
      },
      onPending: () => toast("Menunggu pembayaran"),
      onError: () => toast.error("Pembayaran gagal"),
    });
  };

  // =====================================================
  // UI
  // =====================================================
  if (!event) {
    return (
      <div className="py-32 text-center text-slate-500">
        Memuat data event...
      </div>
    );
  }

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
        <h1 className="text-5xl font-extrabold">{event.name}</h1>
        <p className="text-lg text-slate-600">
          {event.date} • {event.start_time} • {event.location}
        </p>

        {event.description && (
          <p className="text-lg text-slate-700 max-w-3xl">
            {event.description}
          </p>
        )}

        {/* STATUS */}
        {registered && (
          <div className="border-t pt-6 space-y-2">
            <p>
              <b>Status Pembayaran:</b>{" "}
              <span className="font-semibold text-green-700">
                {paymentStatus}
              </span>
            </p>

            <p>
              <b>Check-In:</b>{" "}
              {attendance.checkin
                ? new Date(attendance.checkin.created_at).toLocaleString()
                : "Belum"}
            </p>

            <p>
              <b>Check-Out:</b>{" "}
              {attendance.checkout
                ? new Date(attendance.checkout.created_at).toLocaleString()
                : "Belum"}
            </p>
          </div>
        )}
{event.is_paid && (
  <p className="text-lg font-semibold text-red-700">
    Biaya Pendaftaran: Rp {event.price.toLocaleString("id-ID")}
  </p>
)}

        {/* ACTION */}
        {!registered && (
          <div className="pt-6">
            {event.is_paid ? (
              <button
                onClick={payAndRegister}
                className="px-8 py-4 bg-indigo-700 text-white font-semibold"
              >
                Bayar & Daftar Event
              </button>
            ) : (
              <button
                onClick={handleRegisterFree}
                disabled={loadingReg}
                className="px-8 py-4 bg-slate-900 text-white font-semibold"
              >
                {loadingReg ? "Memproses..." : "Daftar Event"}
              </button>
            )}
          </div>
        )}

        {registered && (
          <div className="flex gap-4 pt-6">
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
  );
}
