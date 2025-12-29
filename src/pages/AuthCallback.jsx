import { useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const processLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast("Login gagal. Silakan coba lagi.");
        navigate("/auth/login");
        return;
      }

      // ambil metadata
      const meta = user.user_metadata || {};

      // cek apakah sudah ada profil
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      // jika belum ada → buat manual (fallback trigger)
      if (!profile) {
        await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          name: meta.name || "",
          npm: meta.npm || "",
          phone: meta.phone || "",
          role: meta.role || "user"
        });
      }

      navigate("/");
    };

    processLogin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-purple-700 text-lg">
      Menyelesaikan login...
    </div>
  );
}
