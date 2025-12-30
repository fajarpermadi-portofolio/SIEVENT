// src/pages/AdminEventDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
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

  // ============================
  // LOAD ALL DATA
  // ============================
  const loadAll = async () => {
    try {
      // EVENT
      const { data: e, error: eErr } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (eErr) throw eErr;
      setEvent(e);

      // TEMPLATE
      const { data: tpl } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setTemplate(tpl || null);

      // REGISTRATIONS
      const { data: regs, error: rErr } = await supabase
        .from("event_registrations")
        .select("id, user_id, payment_status, users(name, npm, email)")
        .eq("event_id", id);

      if (rErr) throw rErr;
      setRegistrations(regs || []);

      // CHECKIN
      const { data: ci } = await supabase
        .from("attendance")
        .select("user_id")
        .eq("event_id", id)
        .eq("attendance_type", "checkin");

      setCheckins(ci || []);

      // CHECKOUT
      const { data: co } = await supabase
        .from("attendance")
        .select("user_id")
        .eq("event_id", id)
        .eq("attendance_type", "checkout");

      setCheckouts(co || []);

      // CERTIFICATES (HANYA YANG PAID)
      const paidUserIds = regs
        .filter(r => r.payment_status === "paid")
        .map(r => r.user_id);

      const { data: certs } = await supabase
        .from("certificates")
        .select("id, file_url, user_id, users(name, email)")
        .eq("event_id", id);

      const filtered = certs?.filter(c =>
        paidUserIds.includes(c.user_id)
      );

      setCertificates(filtered || []);

    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat detail event");
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  // ============================
  // GENERATE SINGLE CERTIFICATE
  // ============================
  const generateSingle = async (reg) => {
    if (!template) return toast.error("Template sertifikat belum ada");

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

      toast.success("Sertifikat berhasil dibuat", { id: "gen" });
      loadAll();
    } catch (err) {
      toast.error("Gagal generate sertifikat", { id: "gen" });
    }
  };

  // ============================
  // GENERATE ALL CERTIFICATES
  // ============================
  const generateAll = async () => {
    if (!template) return toast.error("Template belum disiapkan");

    const validUsers = registrations.filter(r =>
      checkins.some(c => c.user_id === r.user_id) &&
      checkouts.some(c => c.user_id === r.user_id) &&
      r.payment_status === "paid"
    );

    if (validUsers.length === 0)
      return toast.error("Tidak ada peserta valid");

    toast.loading("Generate semua sertifikat...", { id: "all" });

    try {
      for (const r of validUsers) {
        await generateCertificateForUser(template, {
          id: r.user_id,
          name: r.users?.name,
          npm: r.users?.npm,
          email: r.users?.email,
          eventName: event.name,
          date: event.date,
        });
      }

      toast.success("Semua sertifikat berhasil dibuat", { id: "all" });
      loadAll();
    } catch {
      toast.error("Gagal generate massal", { id: "all" });
    }
  };

  // ============================
  // EXPORT EXCEL
  // ============================
  const downloadExcel = () => {
    const rows = registrations.map(r => ({
      Nama: r.users?.name,
      NPM: r.users?.npm,
      Email: r.users?.email,
      CheckIn: checkins.some(c => c.user_id === r.user_id) ? "Ya" : "Tidak",
      CheckOut: checkouts.some(c => c.user_id === r.user_id) ? "Ya" : "Tidak",
      Payment: r.payment_status,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Rekap");
    XLSX.writeFile(book, `Rekap_${event.name}.xlsx`);
  };

  if (!event) {
    return <div className="p-10 text-center">Memuat event...</div>;
  }

  // ============================
  // UI
  // ============================
  return (
    <div className="min-h-screen bg-slate-100 px-6 py-14">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* HEADER */}
        <section className="border-b pb-10">
          <h1 className="text-4xl font-extrabold">{event.name}</h1>
          <p className="text-slate-600 mt-2">{event.description}</p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={downloadExcel}
              className="px-4 py-2 border font-semibold flex items-center gap-2"
            >
              <Download size={16} /> Export Excel
            </button>

            <button
              onClick={() => navigate(`/admin/certificate-editor/${event.id}`)}
              className="px-4 py-2 bg-slate-900 text-white font-semibold"
            >
              Template Sertifikat
            </button>
          </div>
        </section>

        {/* REKAP */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Rekap Kehadiran</h2>

          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-slate-200">
                <tr>
                  <th className="p-3">Nama</th>
                  <th className="p-3">NPM</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Check-Out</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.users?.name}</td>
                    <td className="p-3">{r.users?.npm}</td>
                    <td className="p-3">{r.users?.email}</td>
                    <td className="p-3 text-center">
                      {checkins.some(c => c.user_id === r.user_id) ? "✔" : "—"}
                    </td>
                    <td className="p-3 text-center">
                      {checkouts.some(c => c.user_id === r.user_id) ? "✔" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SERTIFIKAT */}
        <section>
          <div className="flex justify-between mb-4">
            <h2 className="text-2xl font-bold">Generate Sertifikat</h2>
            <button
              onClick={generateAll}
              className="px-4 py-2 bg-green-700 text-white font-semibold"
            >
              Generate Semua
            </button>
          </div>

          <div className="border divide-y">
            {registrations.map(r => (
              <div key={r.id} className="p-4 flex justify-between">
                <div>
                  <p className="font-semibold">{r.users?.name}</p>
                  <p className="text-sm text-slate-500">{r.users?.email}</p>
                </div>

                <button
                  onClick={() => generateSingle(r)}
                  className="px-4 py-2 border font-semibold"
                >
                  Generate
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
