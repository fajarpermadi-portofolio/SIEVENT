// src/pages/AdminEventDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import QRCode from "react-qr-code";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { generateCertificateForUser } from "../utils/certificateRenderer";

export default function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [template, setTemplate] = useState(null);
  const [certificates, setCertificates] = useState([]);

  // ================= LOAD ALL =================
  const loadAll = async () => {
    // EVENT
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    setEvent(ev);

    // REGISTRATIONS
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("id, user_id, payment_status, users(name, npm, email)")
      .eq("event_id", id);

    setRegistrations(regs || []);

    // ATTENDANCE
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

    const toWIB = (ts) => {
  if (!ts) return "—";

  const d = new Date(ts);
  d.setHours(d.getHours() + 7); // konversi ke WIB

  return d.toLocaleString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

    // TEMPLATE
    const { data: tpl } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setTemplate(tpl || null);

    // CERTIFICATES (PAID ONLY)
    const paidUserIds = regs
      ?.filter((r) => r.payment_status === "paid")
      .map((r) => r.user_id);

    const { data: cert } = await supabase
      .from("certificates")
      .select("id, user_id, file_url, users(name, email)")
      .eq("event_id", id);

    setCertificates(
      cert?.filter((c) => paidUserIds?.includes(c.user_id)) || []
    );
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  // ================= CERTIFICATE =================
  const generateSingle = async (reg) => {
    if (!template) return toast.error("Template sertifikat belum ada");
    if (reg.payment_status !== "paid")
      return toast.error("Peserta belum lunas");

    try {
      toast.loading("Membuat sertifikat...", { id: "gen" });
      await generateCertificateForUser(template, {
        id: reg.user_id,
        name: reg.users?.name,
        npm: reg.users?.npm,
        email: reg.users?.email,
        eventName: event.name,
        date: event.date,
      });
      toast.success("Sertifikat dibuat", { id: "gen" });
      loadAll();
    } catch (e) {
      toast.error(e.message, { id: "gen" });
    }
  };

  // ================= EXCEL =================
  const downloadExcel = () => {
    const rows = registrations.map((r) => ({
      Nama: r.users?.name,
      NPM: r.users?.npm,
      Email: r.users?.email,
      CheckIn: checkins.some((c) => c.user_id === r.user_id)
        ? "Sudah"
        : "Belum",
      CheckOut: checkouts.some((c) => c.user_id === r.user_id)
        ? "Sudah"
        : "Belum",
      Pembayaran: r.payment_status,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Rekap");
    XLSX.writeFile(book, `Rekap_${event.name}.xlsx`);
  };

  if (!event) return <p className="p-6">Memuat event...</p>;

  // ================= UI =================
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

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => navigate(`/admin/dynamicqr/${id}/checkin`)}
                className="btn"
              >
                QR Check-In
              </button>
              <button
                onClick={() => navigate(`/admin/dynamicqr/${id}/checkout`)}
                className="btn"
              >
                QR Check-Out
              </button>
              <button onClick={downloadExcel} className="btn-outline">
                <Download size={16} /> Export Excel
              </button>
            </div>
          </div>
        </section>

        {/* QR STATIK */}
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
          <h2 className="text-2xl font-bold mb-4">Rekap Peserta</h2>
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
              {registrations.map((r) => (
                <tr key={r.id} className="border-t text-center">
                  <td>{r.users?.name}</td>
                  <td>{r.users?.npm}</td>
<td className="text-center">
  {(() => {
    const ci = checkins.find(c => c.user_id === r.user_id);
    return ci ? toWIB(ci.timestamp) : "—";
  })()}
</td>

<td className="text-center">
  {(() => {
    const co = checkouts.find(c => c.user_id === r.user_id);
    return co ? toWIB(co.timestamp) : "—";
  })()}
</td>
                  <td>{r.payment_status}</td>
                  <td>
                    <button
                      onClick={() => generateSingle(r)}
                      className="underline text-blue-600"
                    >
                      Generate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* PREVIEW SERTIFIKAT */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Preview Sertifikat</h2>

          {certificates.length === 0 && (
            <p className="text-slate-500">Belum ada sertifikat</p>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {certificates.map((c) => (
              <div key={c.id} className="border bg-white p-4">
                <p className="font-semibold text-center mb-2">
                  {c.users?.name}
                </p>
                <img src={c.file_url} className="h-40 w-full object-cover" />
                <div className="text-center mt-3 text-sm">
                  <a href={c.file_url} target="_blank" className="underline">
                    Lihat / Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
