import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function DashboardUser() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null); // eventId

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
      const { data: reg } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", data.user.id);

      setRegistered(reg || []);
    }
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });

    setEvents(data || []);
  };

  // =============================
  // FREE EVENT
  // =============================
  const handleRegisterFree = async (eventId) => {
    if (!user) return toast.error("Harap login terlebih dahulu");

    setLoadingAction(eventId);

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: eventId,
      payment_status: "paid",
    });

    if (error) {
      toast.error("Gagal mendaftar");
    } else {
      toast.success("Berhasil mendaftar event!");
      await loadUser();
    }

    setLoadingAction(null);
  };

  // =============================
  // PAID EVENT
  // =============================
  const handleRegisterPaid = async (eventId) => {
    if (!user) return toast.error("Harap login terlebih dahulu");

    setLoadingAction(eventId);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-payment",
        {
          body: { event_id: eventId },
        }
      );

      if (error || !data?.payment_url) {
        throw error || new Error("Payment URL tidak tersedia");
      }

      window.location.href = data.payment_url;
    } catch (err) {
      console.error(err);
      toast.error("Gagal memulai pembayaran");
      setLoadingAction(null);
    }
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
          </p>
        </header>

        {/* EVENT LIST */}
        <section className="border-t border-slate-300">
          {events.map((ev, index) => {
            const isRegistered = registered.some(
              (r) => r.event_id === ev.id
            );

            const isPaidEvent = Number(ev.price) > 0;

            return (
              <div
                key={ev.id}
                className="grid grid-cols-12 gap-6 py-4 border-b border-slate-300"
              >
                {/* INDEX */}
                <div className="hidden md:block col-span-1 text-slate-400 font-mono">
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
                  <h2 className="text-2xl font-bold">{ev.name}</h2>

                  <div className="mt-2 text-sm text-slate-600">
                    <p>{ev.date}</p>
                    <p>{ev.location}</p>
                    {ev.start_time && <p>{ev.start_time}</p>}
                  </div>

                  <p className="mt-3 text-slate-700 max-w-xl">
                    {ev.description || "-"}
                  </p>

                  {isPaidEvent && (
                    <p className="mt-2 font-semibold text-green-700">
                      Harga: Rp {Number(ev.price).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>

                {/* ACTION */}
                <div className="col-span-12 md:col-span-3 flex flex-col gap-3">
                  <button
                    onClick={() => navigate(`/event/${ev.id}`)}
                    className="underline text-left hover:text-slate-500"
                  >
                    Lihat Detail / Presensi
                  </button>

                  {isRegistered ? (
                    <div className="border border-green-600 text-green-700 py-2 text-center font-semibold">
                      Sudah Terdaftar
                    </div>
                  ) : isPaidEvent ? (
                    <button
                      onClick={() => handleRegisterPaid(ev.id)}
                      disabled={loadingAction === ev.id}
                      className="bg-green-700 text-white py-2 font-semibold hover:bg-green-800 disabled:opacity-50"
                    >
                      {loadingAction === ev.id
                        ? "Memproses..."
                        : "Daftar & Bayar"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegisterFree(ev.id)}
                      disabled={loadingAction === ev.id}
                      className="bg-slate-900 text-white py-2 font-semibold hover:bg-slate-800 disabled:opacity-50"
                    >
                      {loadingAction === ev.id
                        ? "Memproses..."
                        : "Daftar Event"}
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
