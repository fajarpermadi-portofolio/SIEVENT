import { useState } from "react";
import { supabase } from "../supabase";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/logo-hirosi.png";
import { toast } from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    npm: "",
    phone: "",
    email: "",
  });

  const registerUser = async () => {
    const { name, npm, phone, email } = form;
    if (!name || !npm || !phone || !email) {
      return toast("Harap mengisi semua data!");
    }

    const emailClean = email.trim().toLowerCase();
    const phoneClean = phone.replace(/[^0-9]/g, "");

    setLoading(true);

const { error } = await supabase.auth.signInWithOtp({
  email: emailClean,
  options: {
    emailRedirectTo: "http://localhost:5173/auth/callback",
    data: {
      name: name.trim(),
      npm: npm.trim(),
      phone: phoneClean,
      role: "user"
    }
  }
});

    setLoading(false);

    if (error) {
      toast.error("Gagal mengirim magic link: " + error.message);
      return;
    }

    toast("Magic link telah dikirim! Cek email Anda.");
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center px-8 py-10">

      {/* LOGO DI LUAR CARD */}
      <div className="mb-5 flex justify-center">
        <img
          src={Logo}
          alt="Logo HIROSI"
          className="w-35 h-35 object-contain drop-shadow-md"
        />
      </div>

      {/* CONTAINER FORM */}
      <div className="bg-white shadow-xl rounded-2xl p-12 w-full max-w-3xl border border-gray-200">

        <h1 className="text-4xl font-bold text-gray-800 text-center">
          SI.EVENT HIROSI
        </h1>

        <p className="text-gray-500 text-center mt-1 mb-4">
          Sistem Event Seminar dan Workshop HIROSI.
        </p>

        <div className="grid md:grid-cols-2 gap-2">
          {["Nama Lengkap", "NPM", "Nomor HP", "Email"].map((label, i) => (
            <div key={i}>
              <label className="text-sm font-semibold text-gray-700">{label}</label>
              <input
                type={label === "Email" ? "email" : "text"}
                onChange={(e) =>
                  setForm({ ...form, [Object.keys(form)[i]]: e.target.value })
                }
                className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
              />
            </div>
          ))}
        </div>

        <button
          onClick={registerUser}
          disabled={loading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-4
            rounded-lg font-semibold text-lg transition active:scale-95 disabled:opacity-50"
        >
          {loading ? "Mengirim magic link..." : "Daftar Sekarang"}
        </button>

        <p className="text-center text-gray-600 mt-6">
          Sudah punya akun?
          <Link className="ml-1 font-semibold text-blue-600" to="/auth/login">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
