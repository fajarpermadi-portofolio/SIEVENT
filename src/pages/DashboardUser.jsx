import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function DashboardUser() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingReg, setLoadingReg] = useState(false);

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    await loadUser();
    await loadEvents();
  };

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user || null);

    if (data.user) {
      const reg = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", data.user.id);

      setRegistered(reg.data || []);
    }
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });

    setEvents(data || []);
  };

  const handleRegister = async (eventId) => {
    if (!user) return toast.error("Harap login terlebih dahulu");
    if (registered.some(r => r.event_id === eventId))
      return toast("Anda sudah terdaftar");

    setLoadingReg(true);

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: eventId,
      payment_status: "free",
    });

    if (error) {
      toast.error("Gagal mendaftar");
      setLoadingReg(false);
      return;
    }

    toast.success("Berhasil mendaftar event!");
    await loadUser();
    setLoadingReg(false);
  };

  return (
    <div className="min-h-screen px-3 py-1">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Event & Workshop
          </h1>
          <p className="mt-2 text-lg text-slate-500 max-w-4xl">
            Pusat informasi seminar dan workshop yang dapat kamu ikuti
            untuk meningkatkan wawasan dan keterampilan.
          </p>
        </header>

{/* EVENT LIST */}
<section className="border-t border-slate-300">
  {events.map((ev, index) => {
    const isRegistered = registered.some(
      r => r.event_id === ev.id
    );

    return (
      <div
        key={ev.id}
        className="
          grid grid-cols-12 gap-6
          py-4
          border-b border-slate-300
          items-start
        "
      >
        {/* INDEX */}
        <div className="hidden md:block col-span-1 font-mono text-slate-400 text-sm">
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* IMAGE */}
        <div className="col-span-12 md:col-span-2">
          <img
            src={ev.pamphlet_url || "/no-pamphlet.png"}
            alt={ev.name}
            className="w-full aspect-[3/4] object-contain"
          />
        </div>

        {/* CONTENT */}
        <div className="col-span-12 md:col-span-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {ev.name}
          </h2>

          <div className="mt-3 text-sm text-slate-600 space-y-1">
            <p>{ev.date}</p>
            <p>{ev.location}</p>
            {ev.start_time && <p>{ev.start_time}</p>}
          </div>

          <p className="mt-4 text-slate-700 leading-relaxed max-w-xl">
            {ev.description || "-"}
          </p>
        </div>

        {/* ACTION */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-3 text-sm">
          <button
            onClick={() => navigate(`/event/${ev.id}`)}
            className="px-4 py-2 font-semibold underline underline-offset-4 text-left hover:text-slate-500 transition"
          >
            Lihat Detail / Presensi
          </button>

          {isRegistered ? (
            <div className="px-2 py-2 border border-green-600 text-green-700 font-semibold text-center">
              Sudah Terdaftar
            </div>
          ) : (
            <button
              onClick={() => handleRegister(ev.id)}
              disabled={loadingReg}
              className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loadingReg ? "Memproses..." : "Daftar Event"}
            </button>
          )}
        </div>
      </div>
    );
  })}
</section>
      </div>
    </div>
  );
}
