// src/pages/AdminCertificateGenerate.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { generateCertificateForUser } from "../utils/certificateRenderer";



export default function AdminCertificateGenerate() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Load template dan peserta ---
  useEffect(() => {
    loadTemplate();
    loadParticipants();
  }, [eventId]);

  const loadTemplate = async () => {
    const { data } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", eventId)
      .single();

    setTemplate(data);
  };

  const loadParticipants = async () => {
    const { data } = await supabase.rpc("get_eligible_participants", {
      event_id_input: eventId,
    });
    setParticipants(data || []);
  };

  const generateAll = async () => {
    if (!template) {
      toast.error("Template belum dibuat");
      return;
    }

    setLoading(true);

    for (let p of participants) {
      try {
        await generateCertificateForUser(template, {
          id: p.user_id,
          name: p.name,
          npm: p.npm,
          email: p.email,
          eventName: p.event_name,
          date: p.event_date,
        });

      } catch (err) {
        console.error(err);
      }
    }

    setLoading(false);
    toast.success("Sertifikat berhasil digenerate semua!");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">
        Generate Sertifikat — Event {eventId}
      </h1>

      {!template && (
        <p className="text-red-600 mb-4">
          ⚠️ Template belum dibuat — buka Certificate Editor dahulu.
        </p>
      )}

      <button
        onClick={generateAll}
        className="bg-purple-700 text-white px-6 py-3 rounded-xl shadow mb-6"
      >
        {loading ? "Menggenerate..." : "Generate Sertifikat Semua Peserta"}
      </button>

      <div className="bg-white rounded-xl p-4 border shadow">
        <h2 className="font-semibold text-lg mb-3">Peserta Eligible</h2>

        <ul className="divide-y">
          {participants.map((p) => (
            <li key={p.user_id} className="py-3">
              {p.name} — {p.npm}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
