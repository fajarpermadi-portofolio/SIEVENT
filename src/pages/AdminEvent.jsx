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
    is_paid: false,
    price: 0,
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

    if (form.is_paid && (!form.price || form.price <= 0)) {
      toast.error("Harga event berbayar harus lebih dari 0");
      return;
    }

    setLoading(true);

    // 1️⃣ INSERT EVENT
    const { data: inserted, error: errInsert } = await supabase
      .from("events")
      .insert({
        name: form.name,
        date: form.date,
        location: form.location,
        start_time: form.start_time || null,
        description: form.description || null,
        is_paid: form.is_paid,
        price: form.is_paid ? form.price : 0,
      })
      .select()
      .single();

    if (errInsert) {
      toast.error("Gagal membuat event: " + errInsert.message);
      setLoading(false);
      return;
    }

    const eid = inserted.id;

    // 2️⃣ UPLOAD PAMPHLET
    let pamphlet_url = null;

    if (pamphlet) {
      const ext = pamphlet.name.split(".").pop();
      const fileName = `pamphlet_${eid}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("pamphlets")
        .upload(fileName, pamphlet, { upsert: true });

      if (uploadErr) {
        toast.error("Pamflet gagal diupload!");
      } else {
        pamphlet_url = supabase.storage
          .from("pamphlets")
          .getPublicUrl(fileName).data.publicUrl;
      }
    }

    // 3️⃣ GENERATE QR
    const qrCheckIn = `HIROSI_EVENT:${eid}:checkin`;
    const qrCheckOut = `HIROSI_EVENT:${eid}:checkout`;

    // 4️⃣ UPDATE EVENT (QR + PAMPHLET)
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

        <p className="text-center text-gray-700 text-lg mt-3 mb-2">
          {form.name}
        </p>

        <p className="text-center text-sm text-gray-500 mb-10">
          {form.is_paid
            ? `Event Berbayar — Rp ${form.price.toLocaleString("id-ID")}`
            : "Event Gratis"}
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
          className="mt-12 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xl transition"
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

      <h1 className="text-4xl font-extrabold text-purple-700 mb-6">
        Buat Event Baru
      </h1>

      <div className="space-y-8">

        {/* Nama */}
        <div>
          <label className="font-semibold">Nama Event *</label>
          <input
            className="mt-2 w-full p-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Tanggal */}
        <div>
          <label className="font-semibold">Tanggal *</label>
          <input
            type="date"
            className="mt-2 w-full p-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        {/* Jam */}
        <div>
          <label className="font-semibold">Jam Mulai</label>
          <input
            type="time"
            className="mt-2 w-full p-4 border rounded-xl"
            onChange={(e) =>
              setForm({ ...form, start_time: e.target.value })
            }
          />
        </div>

        {/* Lokasi */}
        <div>
          <label className="font-semibold">Lokasi *</label>
          <input
            className="mt-2 w-full p-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        {/* Deskripsi */}
        <div>
          <label className="font-semibold">Deskripsi</label>
          <textarea
            className="mt-2 w-full p-4 border rounded-xl h-36"
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        {/* BERBAYAR */}
        <div className="border-t pt-6 space-y-4">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={(e) =>
                setForm({ ...form, is_paid: e.target.checked })
              }
            />
            Event Berbayar
          </label>

          {form.is_paid && (
            <input
              type="number"
              placeholder="Harga (Rp)"
              className="w-full p-4 border rounded-xl"
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
          )}
        </div>

        {/* Pamflet */}
        <div>
          <label className="font-semibold">Pamflet</label>
          <input
            type="file"
            accept="image/*"
            className="mt-2"
            onChange={(e) => setPamphlet(e.target.files[0])}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl"
        >
          {loading ? "Memproses..." : "Buat Event"}
        </button>
      </div>
    </div>
  );
}
