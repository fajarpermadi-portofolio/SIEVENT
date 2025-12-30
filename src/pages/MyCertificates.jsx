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
      // =============================
      // GET SESSION
      // =============================
      const { data: { session }, error } =
        await supabase.auth.getSession();

      if (error || !session?.user) {
        toast.error("Silakan login terlebih dahulu");
        return;
      }

      const userId = session.user.id;

      // =============================
      // USER INFO
      // =============================
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("name, npm")
        .eq("id", userId)
        .single();

      if (userErr) throw userErr;
      setUserInfo(user);

      // =============================
      // STEP 1: EVENT YANG SUDAH PAID
      // =============================
      const { data: regs, error: regErr } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", userId)
        .eq("payment_status", "paid");

      if (regErr) throw regErr;

      if (!regs || regs.length === 0) {
        setCerts([]);
        return;
      }

      const eventIds = regs.map(r => r.event_id);

      // =============================
      // STEP 2: LOAD CERTIFICATES
      // =============================
      const { data: certificates, error: certErr } = await supabase
        .from("certificates")
        .select(`
          id,
          file_url,
          created_at,
          events (
            name,
            date
          )
        `)
        .eq("user_id", userId)
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });

      if (certErr) throw certErr;

      setCerts(certificates || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat sertifikat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-20">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* HEADER */}
        <header>
          <h1 className="text-4xl font-extrabold text-slate-900">
            Sertifikat Saya
          </h1>

          {userInfo && (
            <p className="mt-3 text-slate-500 text-lg">
              {userInfo.name} — {userInfo.npm}
            </p>
          )}
        </header>

        {/* LOADING */}
        {loading && (
          <p className="text-slate-500 text-lg">
            Memuat sertifikat Anda...
          </p>
        )}

        {/* EMPTY */}
        {!loading && certs.length === 0 && (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
            <p className="text-lg font-medium">
              Belum ada sertifikat tersedia
            </p>
            <p className="mt-2 text-sm">
              Sertifikat akan muncul setelah pembayaran lunas dan kehadiran lengkap.
            </p>
          </div>
        )}

        {/* LIST */}
        {!loading && certs.length > 0 && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {certs.map((c) => (
              <div
                key={c.id}
                className="border rounded-2xl overflow-hidden bg-white hover:shadow-lg transition"
              >
                <div className="aspect-[4/3] bg-slate-50">
                  <img
                    src={c.file_url}
                    alt="Sertifikat"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-4 space-y-3">
                  <p className="font-semibold">{c.events?.name}</p>
                  <p className="text-sm text-slate-500">{c.events?.date}</p>

                  <div className="flex gap-3">
                    <a
                      href={c.file_url}
                      target="_blank"
                      className="flex-1 text-center py-2 rounded-lg bg-slate-900 text-white"
                    >
                      Lihat
                    </a>
                    <a
                      href={c.file_url}
                      download
                      className="flex-1 text-center py-2 rounded-lg bg-slate-200"
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
