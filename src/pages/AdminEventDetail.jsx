// src/pages/AdminEventDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import QRCode from "react-qr-code";
import * as XLSX from "xlsx";
import { Download, QrCode, ClipboardList } from "lucide-react";
import { toast } from "react-hot-toast";
import { generateCertificateForUser } from "../utils/certificateRenderer";

export default function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [template, setTemplate] = useState(null);
  const [certificates, setCertificates] = useState([]);

  // ============================
  // LOAD ALL DATA
  // ============================
  const loadAll = async () => {
    const { data: e } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    setEvent(e);

    const { data: tpl } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    setTemplate(tpl || null);

    const { data: ci } = await supabase
      .from("attendance")
      .select("*, users(name, npm, email)")
      .eq("event_id", id)
      .eq("type", "checkin");
    setCheckins(ci || []);

    const { data: co } = await supabase
      .from("attendance")
      .select("*, users(name, npm, email)")
      .eq("event_id", id)
      .eq("type", "checkout");
    setCheckouts(co || []);

    const { data: regs } = await supabase
      .from("event_registrations")
      .select("id, created_at, user_id, users(name, npm, email)")
      .eq("event_id", id);
    setRegistrations(regs || []);

    const { data: cert } = await supabase
      .from("certificates")
      .select("*, users(name)")
      .eq("event_id", id);
    setCertificates(cert || []);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  // ============================
  // GENERATE SINGLE CERTIFICATE
  // ============================
  const generateSingle = async (reg) => {
    if (!template) return toast.error("Template sertifikat belum dibuat.");

    const dataUser = {
      id: reg.user_id,
      name: reg.users?.name,
      npm: reg.users?.npm,
      email: reg.users?.email,
      eventName: event.name,
      date: event.date,
    };

    try {
      toast.loading("Membuat sertifikat...", { id: "gen" });
      await generateCertificateForUser(template, dataUser);
      toast.success("Sertifikat berhasil dibuat!", { id: "gen" });
      loadAll();
    } catch (err) {
      toast.error("Gagal generate sertifikat: " + err.message, { id: "gen" });
    }
  };

  // ============================
  // GENERATE ALL CERTIFICATES
  // ============================
  const generateAll = async () => {
    if (!template) return toast.error("Template belum disiapkan.");

    toast.loading("Memproses seluruh sertifikat...", { id: "all" });

    try {
      const { data, error } = await supabase.rpc(
        "get_users_with_checkin_checkout",
        { ev_id: id }
      );

      if (error) throw error;
      if (!data || data.length === 0)
        return toast.error("Tidak ada peserta valid.", { id: "all" });

      for (const u of data) {
        await generateCertificateForUser(template, {
          id: u.user_id,
          name: u.name,
          npm: u.npm,
          email: u.email,
          eventName: event.name,
          date: event.date,
        });
      }

      toast.success("Semua sertifikat selesai dibuat!", { id: "all" });
      loadAll();
    } catch (err) {
      toast.error("Gagal generate semua: " + err.message, { id: "all" });
    }
  };

  // ============================
  // EXPORT EXCEL
  // ============================
  const downloadExcel = () => {
    const map = new Map();

    checkins.forEach((x) =>
      map.set(x.user_id, {
        name: x.users?.name,
        npm: x.users?.npm,
        email: x.users?.email,
        checkin: "Sudah",
        checkout: "Belum",
      })
    );

    checkouts.forEach((x) => {
      if (map.has(x.user_id)) {
        map.get(x.user_id).checkout = "Sudah";
      } else {
        map.set(x.user_id, {
          name: x.users?.name,
          npm: x.users?.npm,
          email: x.users?.email,
          checkin: "Belum",
          checkout: "Sudah",
        });
      }
    });

    const rows = Array.from(map.values());
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Rekap");
    XLSX.writeFile(book, `Rekap_${event?.name}.xlsx`);
  };

  if (!event)
    return (
      <div className="text-center text-purple-700 p-6">
        Memuat event...
      </div>
    );

  // ========================================================
  // UI FINAL
  // ========================================================
return (
  <div className="min-h-screen bg-slate-100 px-6 py-16">
    <div className="max-w-7xl mx-auto space-y-20">

      {/* ================= HEADER EVENT ================= */}
      <section className="grid md:grid-cols-12 gap-8 border-b border-slate-300 pb-12">
        {/* POSTER */}
        <div className="md:col-span-4">
          {event.pamphlet_url && (
            <img
              src={event.pamphlet_url}
              alt={event.name}
              className="w-full object-contain"
            />
          )}
        </div>

        {/* INFO */}
        <div className="md:col-span-8 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {event.name}
          </h1>

          <p className="text-slate-600 max-w-3xl leading-relaxed">
            {event.description}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-700">
            <p><b>Tanggal</b><br />{event.date}</p>
            <p><b>Mulai</b><br />{event.start_time}</p>
            <p><b>Lokasi</b><br />{event.location}</p>
            <p><b>ID</b><br />{event.id}</p>
          </div>

          {/* ADMIN ACTIONS */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={() => navigate(`/admin/certificate-editor/${event.id}`)}
              className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            >
              Template Sertifikat
            </button>

            <button
              onClick={downloadExcel}
              className="px-4 py-2 border border-slate-900 font-semibold hover:bg-slate-900 hover:text-white transition flex items-center gap-2"
            >
              <Download size={16} />
              Export Excel
            </button>

            <button
              onClick={() => navigate(`/admin/dynamicqr/${event.id}/checkin`)}
              className="px-4 py-2 border border-slate-900 font-semibold hover:bg-slate-900 hover:text-white transition"
            >
              QR Check-In
            </button>

            <button
              onClick={() => navigate(`/admin/dynamicqr/${event.id}/checkout`)}
              className="px-4 py-2 border border-slate-900 font-semibold hover:bg-slate-900 hover:text-white transition"
            >
              QR Check-Out
            </button>
          </div>
        </div>
      </section>

      {/* ================= REKAP KEHADIRAN ================= */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Rekap Kehadiran Peserta
        </h2>

        <div className="overflow-x-auto border border-slate-300">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-300 bg-slate-200">
              <tr>
                <th className="p-3 text-left">Nama</th>
                <th className="p-3">NPM</th>
                <th className="p-3">Email</th>
                <th className="p-3">Check-In</th>
                <th className="p-3">Check-Out</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const isCheckIn = checkins.some(c => c.user_id === r.user_id);
                const isCheckOut = checkouts.some(c => c.user_id === r.user_id);

                return (
                  <tr key={r.id} className="border-b border-slate-300">
                    <td className="p-3">{r.users?.name}</td>
                    <td className="p-3 text-center">{r.users?.npm}</td>
                    <td className="p-3 text-center">{r.users?.email}</td>
                    <td className="p-3 text-center font-semibold">
                      {isCheckIn ? "✔" : "—"}
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {isCheckOut ? "✔" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= GENERATE SERTIFIKAT ================= */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Generate Sertifikat
          </h2>

          <button
            onClick={generateAll}
            className="px-4 py-2 bg-green-700 text-white font-semibold hover:bg-green-800 transition"
          >
            Generate Semua
          </button>
        </div>

        <div className="border border-slate-300 divide-y">
          {registrations.map((r) => (
            <div key={r.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{r.users?.name}</p>
                <p className="text-sm text-slate-500">{r.users?.email}</p>
              </div>

              <button
                onClick={() => generateSingle(r)}
                className="px-4 py-2 border border-slate-900 font-semibold hover:bg-slate-900 hover:text-white transition"
              >
                Generate
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PREVIEW SERTIFIKAT ================= */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Preview Sertifikat
        </h2>

        {certificates.length === 0 && (
          <p className="text-slate-500">Belum ada sertifikat.</p>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {certificates.map((c) => (
            <div key={c.id} className="border border-slate-300 p-4">
              <p className="font-semibold text-center mb-3">
                {c.users?.name}
              </p>

              <img
                src={c.file_url}
                className="w-full h-40 object-cover border"
              />

              <div className="flex flex-col gap-2 mt-4 text-sm">
                <a
                  href={c.file_url}
                  target="_blank"
                  className="underline underline-offset-4 text-center"
                >
                  Lihat Sertifikat
                </a>

                <a
                  href={c.file_url}
                  download
                  className="underline underline-offset-4 text-center"
                >
                  Download
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.file_url);
                    toast.success("URL sertifikat disalin!");
                  }}
                  className="underline underline-offset-4"
                >
                  Copy URL
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  </div>
);

}
