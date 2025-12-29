import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import toast from "react-hot-toast";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [attendance, setAttendance] = useState({
    checkin: null,
    checkout: null,
  });
  const [registered, setRegistered] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingReg, setLoadingReg] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    await loadUser();
    await loadEvent();
    await loadRegistration();
    await loadAttendance();
  };

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user || null);
  };

  const loadEvent = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    setEvent(data);
  };

  const loadRegistration = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setRegistered(false);

    const { data: reg } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("event_id", id)
      .single();

    setRegistered(!!reg);
  };

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

  const handleRegister = async () => {
    if (!user) return toast.error("Harap login terlebih dahulu");

    setLoadingReg(true);

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: id,
      payment_status: "free",
    });

    setLoadingReg(false);

    if (error) {
      toast.error("Anda sudah terdaftar pada event ini.");
      return;
    }

    toast.success("Berhasil mendaftar event!");
    setRegistered(true);
    loadAttendance();
  };

  if (!event) {
    return (
      <div className="py-32 text-center text-slate-500">
        Memuat data event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* HERO IMAGE */}
        {event.pamphlet_url && (
          <div className="w-full">
            <img
              src={event.pamphlet_url}
              alt={event.name}
              className="w-full max-h-[520px] object-contain"
            />
          </div>
        )}

        {/* HEADER */}
        <header className="space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            {event.name}
          </h1>

          <div className="text-lg text-slate-600 space-y-1">
            <p>{event.date}</p>
            <p>{event.location}</p>
            {event.start_time && <p>{event.start_time}</p>}
          </div>
        </header>

        {/* DESCRIPTION */}
        {event.description && (
          <section className="max-w-3xl">
            <p className="text-lg text-slate-700 leading-relaxed">
              {event.description}
            </p>
          </section>
        )}

        {/* USER STATUS */}
        {registered && (
          <section className="border-t border-slate-300 pt-10 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Status Kehadiran Anda
            </h2>

            <p className="text-slate-700">
              <span className="font-medium">Check-In:</span>{" "}
              {attendance.checkin ? (
                <span className="text-green-700 font-semibold">
                  {new Date(attendance.checkin.created_at).toLocaleString()}
                </span>
              ) : (
                <span className="text-red-600 font-semibold">
                  Belum Check-In
                </span>
              )}
            </p>

            <p className="text-slate-700">
              <span className="font-medium">Check-Out:</span>{" "}
              {attendance.checkout ? (
                <span className="text-green-700 font-semibold">
                  {new Date(attendance.checkout.created_at).toLocaleString()}
                </span>
              ) : (
                <span className="text-red-600 font-semibold">
                  Belum Check-Out
                </span>
              )}
            </p>
          </section>
        )}

        {/* ACTION */}
        <section className="border-t border-slate-300 pt-10 space-y-6">

          {!registered && (
            <>
              <p className="text-slate-600 text-lg">
                Anda belum terdaftar pada event ini.
              </p>
              <button
                onClick={handleRegister}
                disabled={loadingReg}
                className="
                  px-8 py-4
                  bg-slate-900
                  text-white
                  font-semibold
                  hover:bg-slate-800
                  transition
                  disabled:opacity-50
                "
              >
                {loadingReg ? "Memproses..." : "Daftar Event"}
              </button>
            </>
          )}

          {registered && (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate(`/scan/${id}/checkin`)}
                className="
                  px-8 py-4
                  bg-green-700
                  hover:bg-green-800
                  text-white
                  font-semibold
                  transition
                "
              >
                Scan Check-In
              </button>

              <button
                onClick={() => navigate(`/scan/${id}/checkout`)}
                className="
                  px-8 py-4
                  bg-red-700
                  hover:bg-red-800
                  text-white
                  font-semibold
                  transition
                "
              >
                Scan Check-Out
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
