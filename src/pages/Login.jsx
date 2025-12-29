import { useState } from "react";
import { supabase } from "../supabase";
import { Link } from "react-router-dom";
import Logo from "../assets/logo.png";
import { toast } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async () => {
    if (!email.trim()) return toast("Harap isi email!");

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) return toast.error("Gagal mengirim magic link: " + error.message);

    toast.success("Link login telah dikirim ke email Anda!");
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center px-8 py-15">

      {/* LOGO DI LUAR CARD, SAMA SEPERTI REGISTER */}
      <div className="mb-0 flex justify-center">
        <img
          src={Logo}
          alt="Logo HIROSI"
          className="w-200 h-60 object-contain drop-shadow-md"
        />
      </div>

      {/* CARD LOGIN — SAMA DENGAN REGISTER */}
      <div className="bg-white shadow-xl rounded-2xl p-12 w-full max-w-3xl border border-gray-200">

        {/* HEADER */}
        <h1 className="text-4xl font-bold text-gray-800 text-center">
          Login Akun SIEVENT
        </h1>

        <p className="text-gray-500 text-center mt-1 mb-3">
          Masukkan email Anda untuk menerima magic link login.
        </p>

        {/* EMAIL INPUT */}
        <div>
          <label className="text-sm font-semibold text-gray-700">Email</label>
          <input
            type="email"
            placeholder="Email Anda"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-400 focus:border-blue-400 
                       outline-none transition"
          />
        </div>

        {/* BUTTON */}
        <button
          onClick={loginUser}
          disabled={loading}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg 
                     font-semibold text-lg transition active:scale-95 disabled:opacity-50"
        >
          {loading ? "Mengirim link..." : "Login dengan Magic Link"}
        </button>

        {/* FOOTER */}
        <p className="text-center text-gray-600 mt-4">
          Belum punya akun?
          <Link className="ml-1 font-semibold text-blue-600" to="/auth/register">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
