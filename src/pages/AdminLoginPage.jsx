import { useState } from "react";
import { Building2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginAdmin } from "../data/adminAuth";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const redirectPath = location.state?.from?.pathname || "/admin";

  const submitLogin = (event) => {
    event.preventDefault();

    const isLoggedIn = loginAdmin(username, password);
    if (isLoggedIn) {
      navigate(redirectPath, { replace: true });
      return;
    }

    setError("Incorrect admin credentials.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f1] p-6 text-[#102426]">
      <form
        onSubmit={submitLogin}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[#d7e6df] bg-white shadow-xl shadow-[#102426]/10"
      >
        <div className="bg-[#102426] p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f2b84b] p-3 text-[#102426]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black text-[#f2b84b]">
                Below Market Apartments
              </p>
              <h1 className="mt-1 text-3xl font-black text-[#fff7df]">
                Admin Login
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold leading-6 text-[#d7ece6]">
            Enter your admin credentials to manage properties, renter leads, and recommendations.
          </p>
        </div>

        <div className="p-6">
          <label className="block rounded-2xl bg-[#f5f8f1] p-4 text-sm font-bold text-[#526260]">
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-4 py-3 font-black text-[#102426] outline-none placeholder:text-[#78908a] focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
              placeholder="Enter username"
            />
          </label>

          <label className="mt-4 block rounded-2xl bg-[#f5f8f1] p-4 text-sm font-bold text-[#526260]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-4 py-3 font-black text-[#102426] outline-none placeholder:text-[#78908a] focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
              placeholder="Enter password"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-2xl bg-[#fde8df] px-4 py-3 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Log In
          </button>
        </div>
      </form>
    </main>
  );
}
