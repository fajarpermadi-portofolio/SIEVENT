// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import {
  Trash2,
  Edit3,
  BarChart3,
  Users,
  CheckCircle2,
  LogOut,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);

    const { data: eventsData, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      toast.error("Gagal memuat event");
      setLoading(false);
      return;
    }

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      eventsData.map(async (ev) => {
        const { count: regCount } = await supabase
          .from("event_registrations")
          .select("id", { count: "exact", head: true })
          .eq("event_id", ev.id);

        const { count: ciCount } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("event_id", ev.id)
          .eq("attendance_type", "checkin");

        const { count: coCount } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("event_id", ev.id)
          .eq("attendance_type", "checkout");

        return {
          ...ev,
          reg_count: regCount || 0,
          ci_count: ciCount || 0,
          co_count: coCount || 0,
        };
      })
    );

    setEvents(enriched);
    setLoading(false);
  };

  const deleteEvent = async (id) => {
    if (!confirm("Yakin ingin menghapus event ini?")) return;

    await supabase.from("attendance").delete().eq("event_id", id);
    await supabase.from("event_registrations").delete().eq("event_id", id);
    const { error } = await supabase.from("events").delete().eq("id", id);

    error
      ? toast.error("Gagal menghapus event")
      : toast.success("Event berhasil dihapus");

    loadEvents();
  };

  const getStatus = (date) => {
    const today = new Date().toISOString().slice(0, 10);
    if (date < today)
      return { text: "Selesai", color: "bg-slate-200 text-slate-700" };
    if (date === today)
      return { text: "Hari Ini", color: "bg-green-100 text-green-700" };
    return { text: "Akan Datang", color: "bg-blue-100 text-blue-700" };
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Admin Dashboard
          </h1>
          <p className="text-slate-500">
            Kelola event, peserta, dan kehadiran
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/event")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Buat Event
        </button>
      </header>

      {/* EVENT LIST */}
      {events.length === 0 ? (
        <div className="text-center text-slate-500">
          Belum ada event
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((ev) => {
            const status = getStatus(ev.date);

            return (
              <div
                key={ev.id}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition"
              >
                {/* TOP */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">
                      {ev.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      📅 {ev.date} • 📍 {ev.location}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}
                  >
                    {status.text}
                  </span>
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <Metric icon={<Users size={18} />} label="Pendaftar" value={ev.reg_count} />
                  <Metric icon={<CheckCircle2 size={18} />} label="Check-In" value={ev.ci_count} />
                  <Metric icon={<LogOut size={18} />} label="Check-Out" value={ev.co_count} />
                </div>

                {/* ACTION */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <ActionBtn
                    icon={<BarChart3 size={16} />}
                    label="Detail"
                    onClick={() => navigate(`/admin/event/${ev.id}`)}
                  />
                  <ActionBtn
                    icon={<Edit3 size={16} />}
                    label="Edit"
                    onClick={() => navigate(`/admin/event/edit/${ev.id}`)}
                  />
                  <ActionBtn
                    danger
                    icon={<Trash2 size={16} />}
                    label="Hapus"
                    onClick={() => deleteEvent(ev.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================
   COMPONENT KECIL
========================= */

function Metric({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
      <div className="text-slate-600">{icon}</div>
      <div>
        <p className="text-lg font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
        ${
          danger
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
