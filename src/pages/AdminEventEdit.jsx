// src/pages/AdminEventEdit.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { toast } from "react-hot-toast";

export default function AdminEventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [pamphlet, setPamphlet] = useState(null);

  // ==============================
  // LOAD EVENT
  // ==============================
  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("Event tidak ditemukan");
      navigate("/admin/dashboard");
      return;
    }

    // default safety
    setEventData({
      ...data,
      is_paid: data.is_paid ?? false,
      price: data.price ?? 0,
    });

    setLoading(false);
  };

  // ==============================
  // SAVE EVENT
  // ==============================
  const handleSave = async () => {
    if (!eventData.name || !eventData.date || !eventData.location) {
      toast.error("Nama, tanggal, dan lokasi wajib diisi!");
      return;
    }

    if (eventData.is_paid && (!eventData.price || eventData.price <= 0)) {
      toast.error("Harga event berbayar harus lebih dari 0");
      return;
    }

    setSaving(true);

    let newPamphletUrl = eventData.pamphlet_url;

    // Upload pamflet baru (opsional)
    if (pamphlet) {
      const ext = pamphlet.name.split(".").pop();
      const fileName = `pamphlet_${id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("pamphlets")
        .upload(fileName, pamphlet, { upsert: true });

      if (upErr) {
        toast.error("Gagal upload pamflet");
        setSaving(false);
        return;
      }

      newPamphletUrl = supabase.storage
        .from("pamphlets")
        .getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase
      .from("events")
      .update({
        name: eventData.name,
        date: eventData.date,
        start_time: eventData.start_time,
        location: eventData.location,
        description: eventData.description,
        pamphlet_url: newPamphletUrl,
        is_paid: eventData.is_paid,
        price: eventData.is_paid ? eventData.price : 0,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      toast.error("Gagal menyimpan perubahan");
      return;
    }

    toast.success("Event berhasil diperbarui!");
    navigate(`/admin/event/${id}`);
  };

  // ==============================
  // LOADING
  // ==============================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-700 text-xl">
        Memuat data event...
      </div>
    );
  }

  // ==============================
  // UI
  // ==============================
  return (
    <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-xl border">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-purple-700">
          Edit Event
        </h1>
        <p className="text-gray-600 mt-1">
          Perbarui informasi event dan pengaturan pembayaran.
        </p>
      </div>

      <div className="space-y-8">

        {/* NAMA */}
        <div>
          <label className="font-semibold text-gray-800">Nama Event *</label>
          <input
            value={eventData.name}
            onChange={(e) =>
              setEventData({ ...eventData, name: e.target.value })
            }
            className="mt-2 w-full p-4 border rounded-xl focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* TANGGAL */}
        <div>
          <label className="font-semibold text-gray-800">Tanggal *</label>
          <input
            type="date"
            value={eventData.date}
            onChange={(e) =>
              setEventData({ ...eventData, date: e.target.value })
            }
            className="mt-2 w-full p-4 border rounded-xl focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* JAM */}
        <div>
          <label className="font-semibold text-gray-800">Jam Mulai</label>
          <input
            type="time"
            value={eventData.start_time || ""}
            onChange={(e) =>
              setEventData({ ...eventData, start_time: e.target.value })
            }
            className="mt-2 w-full p-4 border rounded-xl focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* LOKASI */}
        <div>
          <label className="font-semibold text-gray-800">Lokasi *</label>
          <input
            value={eventData.location}
            onChange={(e) =>
              setEventData({ ...eventData, location: e.target.value })
            }
            className="mt-2 w-full p-4 border rounded-xl focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* DESKRIPSI */}
        <div>
          <label className="font-semibold text-gray-800">Deskripsi</label>
          <textarea
            value={eventData.description || ""}
            onChange={(e) =>
              setEventData({ ...eventData, description: e.target.value })
            }
            className="mt-2 w-full p-4 border rounded-xl h-36 resize-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* EVENT BERBAYAR */}
        <div className="border-t pt-6 space-y-4">
          <label className="flex items-center gap-3 font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={eventData.is_paid}
              onChange={(e) =>
                setEventData({
                  ...eventData,
                  is_paid: e.target.checked,
                })
              }
              className="w-5 h-5"
            />
            Event Berbayar
          </label>

          {eventData.is_paid && (
            <div>
              <label className="font-semibold text-gray-800">
                Harga Event (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={eventData.price}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    price: Number(e.target.value),
                  })
                }
                className="mt-2 w-full p-4 border rounded-xl focus:ring-2 focus:ring-purple-400"
                placeholder="Contoh: 50000"
              />
            </div>
          )}
        </div>

        {/* PAMFLET */}
        <div>
          <label className="font-semibold text-gray-800">
            Pamflet Event (opsional)
          </label>

          {eventData.pamphlet_url && (
            <img
              src={eventData.pamphlet_url}
              className="w-56 rounded-xl mt-3 border"
              alt="Pamflet"
            />
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPamphlet(e.target.files[0])}
            className="mt-4"
          />
        </div>

        {/* SAVE */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
