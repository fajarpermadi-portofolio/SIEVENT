import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { supabase } from "../supabase";
import Logo from "../assets/logo.png";

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-slate-100 border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-3 h-16 flex items-center justify-between">

        {/* BRAND */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={Logo}
            alt="Logo"
            className="w-37 h-37 object-contain"
          />
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-700">

          <Link
            to="/"
            className="hover:text-slate-900 transition"
          >
            Event
          </Link>

          {user && (
            <>
              <Link
                to="/my-certificates"
                className="hover:text-slate-900 transition"
              >
                Sertifikat
              </Link>

              <Link
                to="/admin/dashboard"
                className="hover:text-slate-900 transition"
              >
                Admin
              </Link>

              <button
                onClick={logout}
                className="text-red-600 hover:text-red-700 transition"
              >
                Logout
              </button>
            </>
          )}

          {!user && (
            <Link
              to="/auth/login"
              className="underline underline-offset-4 hover:text-slate-900 transition"
            >
              Login
            </Link>
          )}
        </div>

        {/* MOBILE BUTTON */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-slate-800"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden border-t border-slate-300 bg-slate-100 px-6 py-6 space-y-6 text-slate-800 font-medium">

          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="block"
          >
            Event
          </Link>

          {user && (
            <>
              <Link
                to="/my-certificates"
                onClick={() => setOpen(false)}
                className="block"
              >
                Sertifikat
              </Link>

              <Link
                to="/admin/dashboard"
                onClick={() => setOpen(false)}
                className="block"
              >
                Admin
              </Link>

              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="text-red-600"
              >
                Logout
              </button>
            </>
          )}

          {!user && (
            <Link
              to="/auth/login"
              onClick={() => setOpen(false)}
              className="underline underline-offset-4"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
