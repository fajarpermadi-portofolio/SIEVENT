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

  // =====================================================
  // LOAD EVENT
  // =====================================================
  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Event tidak ditemukan");
      navigate("/admin/dashboard");
      return;
    }

    setEventData(data);
    setLoading(false);
  };

  // =====================================================
  // SAVE CHANGES
  // =====================================================
  const handleSave = async () => {
    if (!eventData.name || !eventData.date || !eventData.location) {
      toast.error("Nama, tanggal, dan lokasi wajib diisi!");
      return;
    }

    setSaving(true);

    let newPamphletUrl = eventData.pamphlet_url;

    // Jika admin upload pamflet baru
    if (pamphlet) {
      const ext = pamphlet.name.split(".").pop();
      const fileName = `pamphlet_${id}.${ext}`;

      await supabase.storage
        .from("pamphlets")
        .upload(fileName, pamphlet, { upsert: true });

      newPamphletUrl = supabase.storage
        .from("pamphlets")
        .getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase
      .from("events")
      .update({
        name: eventData.name,
        date: eventData.date,
        location: eventData.location,
        start_time: eventData.start_time,
        description: eventData.description,
        pamphlet_url: newPamphletUrl,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      toast.error("Gagal menyimpan perubahan");
      return;
    }

    toast.success("Event berhasil diperbarui!");
    navigate("/admin/dashboard");
  };

  // =====================================================
  // LOADER
  // =====================================================
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-purple-700 text-xl">
        Memuat data event...
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-xl border">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-purple-700">
          Edit Event
        </h1>
        <p className="text-gray-600 mt-1">
          Perbarui informasi lengkap mengenai event HIROSI.
        </p>
      </div>

      {/* FORM GRID */}
      <div className="space-y-8">

        {/* Nama Event */}
        <div>
          <label className="font-semibold text-gray-800">Nama Event *</label>
          <input
            value={eventData.name}
            onChange={(e) =>
              setEventData({ ...eventData, name: e.target.value })
            }
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
            placeholder="Contoh: Seminar Cyber Security"
          />
        </div>

        {/* Tanggal */}
        <div>
          <label className="font-semibold text-gray-800">Tanggal *</label>
          <input
            type="date"
            value={eventData.date}
            onChange={(e) =>
              setEventData({ ...eventData, date: e.target.value })
            }
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
          />
        </div>

        {/* Waktu */}
        <div>
          <label className="font-semibold text-gray-800">Jam Mulai</label>
          <input
            type="time"
            value={eventData.start_time || ""}
            onChange={(e) =>
              setEventData({ ...eventData, start_time: e.target.value })
            }
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
          />
        </div>

        {/* Lokasi */}
        <div>
          <label className="font-semibold text-gray-800">Lokasi *</label>
          <input
            value={eventData.location}
            onChange={(e) =>
              setEventData({ ...eventData, location: e.target.value })
            }
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
            placeholder="Contoh: Aula Kampus 2"
          />
        </div>

        {/* Deskripsi */}
        <div>
          <label className="font-semibold text-gray-800">Deskripsi</label>
          <textarea
            value={eventData.description || ""}
            onChange={(e) =>
              setEventData({ ...eventData, description: e.target.value })
            }
            className="mt-2 w-full p-4 border border-gray-300 rounded-xl shadow-sm rounded-2xl resize-none h-36 focus:ring-2 focus:ring-purple-400 outline-none"
            placeholder="Jelaskan detail event..."
          />
        </div>

        {/* Pamflet */}
        <div>
          <label className="font-semibold text-gray-800">
            Pamflet Event (opsional)
          </label>

          {eventData.pamphlet_url && (
            <img
              src={eventData.pamphlet_url}
              className="w-56 rounded-xl mt-3 border shadow-md"
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

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
