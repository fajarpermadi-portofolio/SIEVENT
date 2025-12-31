import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import QRCode from "react-qr-code";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { generateCertificateForUser } from "../utils/certificateRenderer";

/* ======================
   HELPER FUNCTIONS
====================== */
const hasCheckIn = (uid, checkins) =>
  checkins.some(c => c.user_id === uid);

const hasCheckOut = (uid, checkouts) =>
  checkouts.some(c => c.user_id === uid);

const isEligibleForCertificate = (reg, checkins, checkouts, isPaidEvent) => {
  if (isPaidEvent && reg.payment_status !== "paid") return false;
  if (!hasCheckIn(reg.user_id, checkins)) return false;
  if (!hasCheckOut(reg.user_id, checkouts)) return false;
  return true;
};

export default function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [template, setTemplate] = useState(null);
  const [certificates, setCertificates] = useState([]);

  /* ======================
     LOAD ALL DATA
  ====================== */
  const loadAll = async () => {
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    setEvent(ev);

    const { data: regs } = await supabase
      .from("event_registrations")
      .select("id, user_id, payment_status, users(name, npm, email)")
      .eq("event_id", id);
    setRegistrations(regs || []);

    const { data: ci } = await supabase
      .from("attendance")
      .select("user_id, timestamp")
      .eq("event_id", id)
      .eq("attendance_type", "checkin");

    const { data: co } = await supabase
      .from("attendance")
      .select("user_id, timestamp")
      .eq("event_id", id)
      .eq("attendance_type", "checkout");

    setCheckins(ci || []);
    setCheckouts(co || []);

    const { data: tpl } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setTemplate(tpl || null);

    const paidUserIds = regs
      ?.filter(r => r.payment_status === "paid")
      .map(r => r.user_id);

    const { data: cert } = await supabase
      .from("certificates")
      .select("id, user_id, file_url, users(name, email)")
      .eq("event_id", id);

    setCertificates(
      cert?.filter(c => paidUserIds?.includes(c.user_id)) || []
    );
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  if (!event) return <p className="p-6">Memuat event...</p>;

  const isPaidEvent = Number(event.price) > 0;

  /* ======================
     CERTIFICATE ACTIONS
  ====================== */
  const generateSingle = async (reg) => {
    if (!template) return toast.error("Template sertifikat belum ada");

    if (!isEligibleForCertificate(reg, checkins, checkouts, isPaidEvent))
      return toast.error("Peserta belum memenuhi syarat");

    toast.loading("Membuat sertifikat...", { id: "gen" });
    try {
      await generateCertificateForUser(template, {
        id: reg.user_id,
        name: reg.users?.name,
        npm: reg.users?.npm,
        email: reg.users?.email,
        eventName: event.name,
        date: event.date,
      });
      toast.success("Sertifikat berhasil dibuat", { id: "gen" });
      loadAll();
    } catch (e) {
      toast.error("Gagal generate sertifikat", { id: "gen" });
    }
  };

  const generateAllCertificates = async () => {
    if (!template) return toast.error("Template sertifikat belum tersedia");

    const eligible = registrations.filter(r =>
      isEligibleForCertificate(r, checkins, checkouts, isPaidEvent)
    );

    if (eligible.length === 0)
      return toast.error("Tidak ada peserta yang memenuhi syarat");

    toast.loading(`Membuat ${eligible.length} sertifikat...`, { id: "genall" });

    try {
      for (const r of eligible) {
        await generateCertificateForUser(template, {
          id: r.user_id,
          name: r.users?.name,
          npm: r.users?.npm,
          email: r.users?.email,
          eventName: event.name,
          date: event.date,
        });
      }
      toast.success("Semua sertifikat berhasil dibuat", { id: "genall" });
      loadAll();
    } catch (err) {
      toast.error("Gagal generate sertifikat massal", { id: "genall" });
    }
  };

  /* ======================
     EXPORT EXCEL
  ====================== */
  const downloadExcel = () => {
    const rows = registrations.map(r => ({
      Nama: r.users?.name,
      NPM: r.users?.npm,
      Email: r.users?.email,
      CheckIn: hasCheckIn(r.user_id, checkins) ? "Sudah" : "Belum",
      CheckOut: hasCheckOut(r.user_id, checkouts) ? "Sudah" : "Belum",
      Pembayaran: r.payment_status,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Rekap");
    XLSX.writeFile(book, `Rekap_${event.name}.xlsx`);
  };

  /* ======================
     UI
  ====================== */
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* HEADER */}
        <section className="grid md:grid-cols-12 gap-8 border-b pb-10">
          <div className="md:col-span-4">
            {event.pamphlet_url && (
              <img src={event.pamphlet_url} className="rounded-xl" />
            )}
          </div>

          <div className="md:col-span-8 space-y-4">
            <h1 className="text-4xl font-extrabold">{event.name}</h1>
            <p className="text-slate-600">{event.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 text-sm">
              <div><b>Tanggal</b><br />{event.date}</div>
              <div><b>Jam</b><br />{event.start_time || "-"}</div>
              <div><b>Lokasi</b><br />{event.location}</div>
              <div><b>ID</b><br />{event.id}</div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => navigate(`/admin/dynamicqr/${id}/checkin`)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
              >
                📲 QR Check-In
              </button>

              <button
                onClick={() => navigate(`/admin/dynamicqr/${id}/checkout`)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                🚪 QR Check-Out
              </button>

              <button
                onClick={downloadExcel}
                className="px-4 py-2 rounded-lg border border-slate-900 font-semibold hover:bg-slate-900 hover:text-white"
              >
                <Download size={16} /> Export Excel
              </button>
            </div>
          </div>
        </section>

        {/* QR STATIS */}
        <section className="grid md:grid-cols-2 gap-10 text-center">
          <div>
            <p className="font-semibold mb-2">QR Check-In (Statis)</p>
            <QRCode value={`HIROSI_EVENT:${id}:checkin`} size={220} />
          </div>
          <div>
            <p className="font-semibold mb-2">QR Check-Out (Statis)</p>
            <QRCode value={`HIROSI_EVENT:${id}:checkout`} size={220} />
          </div>
        </section>

        {/* REKAP */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Rekap Peserta</h2>
            <button
              onClick={generateAllCertificates}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              ⚡ Generate Semua Sertifikat
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Sertifikat hanya dibuat untuk peserta yang
            {isPaidEvent && " sudah bayar dan"} sudah check-in & check-out
          </p>

          <table className="w-full bg-white border">
            <thead className="bg-slate-200">
              <tr>
                <th>Nama</th>
                <th>NPM</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Pembayaran</th>
                <th>Sertifikat</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(r => (
                <tr key={r.id} className="border-t text-center">
                  <td>{r.users?.name}</td>
                  <td>{r.users?.npm}</td>
                  <td>{hasCheckIn(r.user_id, checkins) ? "✔" : "—"}</td>
                  <td>{hasCheckOut(r.user_id, checkouts) ? "✔" : "—"}</td>
                  <td>{r.payment_status}</td>
                  <td>
                    {isEligibleForCertificate(r, checkins, checkouts, isPaidEvent) ? (
                      <button
                        onClick={() => generateSingle(r)}
                        className="underline text-blue-600"
                      >
                        Generate
                      </button>
                    ) : (
                      <span className="text-slate-400 text-sm">
                        Belum memenuhi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      </div>
    </div>
  );
}
