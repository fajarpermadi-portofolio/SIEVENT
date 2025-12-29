import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function RequireAdmin({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth/login");
        return;
      }

      // 🔹 Cek profile di public.users
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        alert("Profil tidak ditemukan. Silakan logout lalu register ulang.");
        navigate("/");
        return;
      }

      if (profile.role !== "admin") {
        alert("Anda tidak memiliki akses admin.");
        navigate("/");
        return;
      }

      setLoading(false);
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-purple-600 text-xl">
        Mengecek akses admin...
      </div>
    );
  }

  return children;
}
