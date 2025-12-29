// src/pages/MyCertificates.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { toast } from "react-hot-toast";

export default function MyCertificates() {
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        toast.error("Session tidak ditemukan");
        return;
      }

      const userId = session.user.id;

      const { data: user } = await supabase
        .from("users")
        .select("name, npm")
        .eq("id", userId)
        .single();

      setUserInfo(user);

      const { data: certificates } = await supabase
        .from("certificates")
        .select("id, file_url, events(name)")
        .eq("user_id", userId);

      setCerts(certificates || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat sertifikat");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* HEADER */}
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Sertifikat Saya
          </h1>
          {userInfo && (
            <p className="mt-3 text-slate-500 text-lg">
              {userInfo.name} — {userInfo.npm}
            </p>
          )}
        </header>

        {/* CONTENT */}
        {loading && (
          <p className="text-slate-500">Memuat sertifikat...</p>
        )}

        {!loading && certs.length === 0 && (
          <p className="text-slate-500">
            Anda belum memiliki sertifikat dari event manapun.
          </p>
        )}

        {!loading && certs.length > 0 && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {certs.map((c) => (
              <div
                key={c.id}
                className="
                  border border-slate-300
                  rounded-2xl
                  overflow-hidden
                  hover:border-slate-400
                  hover:shadow-md
                  transition
                  bg-slate-50
                "
              >
                {/* IMAGE */}
                <div className="aspect-[4/3] bg-white flex items-center justify-center">
                  <img
                    src={c.file_url}
                    alt="Sertifikat"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* INFO */}
                <div className="p-4 space-y-3">
                  <p className="font-semibold text-slate-800 line-clamp-2">
                    {c.events?.name}
                  </p>

                  <div className="flex gap-3 text-sm">
                    <a
                      href={c.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                    >
                      Lihat
                    </a>

                    <a
                      href={c.file_url}
                      download
                      className="flex-1 text-center py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
