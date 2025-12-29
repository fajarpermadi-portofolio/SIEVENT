import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { toast } from "react-hot-toast";

export default function AdminEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    date: "",
    start_time: "",
    location: "",
    description: "",
  });

  const [pamphlet, setPamphlet] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(false);

  // ======================================================
  // CREATE EVENT
  // ======================================================
  const handleCreate = async () => {
    if (!form.name || !form.date || !form.location) {
      toast.error("Harap mengisi semua data wajib!");
      return;
    }

    setLoading(true);

    // Insert event awal
    const { data: inserted, error: errInsert } = await supabase
      .from("events")
      .insert({
        name: form.name,
        date: form.date,
        location: form.location,
        start_time: form.start_time || null,
        description: form.description || null,
      })
      .select()
      .single();

    if (errInsert) {
      toast.error("Gagal membuat event: " + errInsert.message);
      setLoading(false);
      return;
    }

    const eid = inserted.id;

    // Upload pamphlet
    let pamphlet_url = null;

    if (pamphlet) {
      const ext = pamphlet.name.split(".").pop();
      const fileName = `pamphlet_${eid}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("pamphlets")
        .upload(fileName, pamphlet, { upsert: true });

      if (uploadErr) toast.error("Pamflet gagal diupload!");
      else {
        pamphlet_url = supabase.storage
          .from("pamphlets")
          .getPublicUrl(fileName).data.publicUrl;
      }
    }

    // Generate QR
    const qrCheckIn = `HIROSI_EVENT:${eid}:checkin`;
    const qrCheckOut = `HIROSI_EVENT:${eid}:checkout`;

    // Update event
    await supabase
      .from("events")
      .update({
        qr_checkin_code: qrCheckIn,
        qr_checkout_code: qrCheckOut,
        pamphlet_url,
      })
      .eq("id", eid);

    setEventId(eid);
    setLoading(false);
    toast.success("Event berhasil dibuat!");
  };

  // ======================================================
  // SUCCESS PAGE
  // ======================================================
  if (eventId) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-xl border">

        <h1 className="text-4xl font-extrabold text-purple-700 text-center">
          Event Berhasil Dibuat!
        </h1>

        <p className="text-center text-gray-700 text-lg mt-3 mb-10">
          {form.name}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-center">

          <div className="bg-purple-50 p-5 rounded-2xl shadow border">
            <p className="font-semibold text-purple-700 mb-3">QR Check-In</p>
            <QRCode value={`HIROSI_EVENT:${eventId}:checkin`} size={220} />
          </div>

          <div className="bg-purple-50 p-5 rounded-2xl shadow border">
            <p className="font-semibold text-purple-700 mb-3">QR Check-Out</p>
            <QRCode value={`HIROSI_EVENT:${eventId}:checkout`} size={220} />
          </div>

        </div>

        <button
          onClick={() => navigate("/admin/dashboard")}
          className="mt-12 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xl transition active:scale-95"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  // ======================================================
  // FORM PAGE
  // ======================================================
  return (
    <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-xl border">

      {/* HEADER */}
      <h1 className="text-4xl font-extrabold text-purple-700 mb-6">
        Buat Event Baru
      </h1>
      <p className="text-gray-600 mb-10">
        Lengkapi detail berikut untuk membuat event seminar atau workshop HIROSI.
      </p>

      {/* FORM */}
      <div className="space-y-8">

        {/* Nama Event */}
        <div>
          <label className="font-semibold text-gray-800">Nama Event *</label>
          <input
            placeholder="Contoh: Seminar Teknologi AI 2025"
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Tanggal */}
        <div>
          <label className="font-semibold text-gray-800">Tanggal *</label>
          <input
            type="date"
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        {/* Jam Mulai */}
        <div>
          <label className="font-semibold text-gray-800">Jam Mulai</label>
          <input
            type="time"
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
        </div>

        {/* Lokasi */}
        <div>
          <label className="font-semibold text-gray-800">Lokasi *</label>
          <input
            placeholder="Contoh: Aula Lt. 3 Kampus 2"
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        {/* Deskripsi */}
        <div>
          <label className="font-semibold text-gray-800">Deskripsi Event</label>
          <textarea
            placeholder="Contoh: Seminar membahas perkembangan AI modern..."
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm h-36 resize-none focus:ring-2 focus:ring-purple-400 outline-none"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Upload Pamflet */}
        <div>
          <label className="font-semibold text-gray-800">Upload Pamflet</label>

          <div className="mt-3 border border-dashed border-gray-400 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPamphlet(e.target.files[0])}
              className="w-full"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="mt-4 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xl transition active:scale-95 disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Buat Event"}
        </button>

      </div>
    </div>
  );
}
