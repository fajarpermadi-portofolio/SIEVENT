import { useNavigate, useLocation } from "react-router-dom";
import { toastTriangle } from "lucide-react";

export default function AuthError() {
  const navigate = useNavigate();
  const location = useLocation();

  // Pesan error bisa dikirim dari navigate(), jika tidak ada pakai default
  const message =
    location.state?.message ||
    "Terjadi kesalahan saat memproses autentikasi.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg text-center space-y-6 border">

        <div className="flex justify-center">
          <toastTriangle size={60} className="text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-purple-700">
          Gagal Memproses Login
        </h1>

        <p className="text-gray-700 text-lg">
          {message}
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate("/auth/register")}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 shadow"
          >
            Kembali ke Halaman Daftar
          </button>

          <button
            onClick={() => navigate("/auth/login")}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 shadow"
          >
            Pergi ke Halaman Login
          </button>
        </div>
      </div>
    </div>
  );
}
