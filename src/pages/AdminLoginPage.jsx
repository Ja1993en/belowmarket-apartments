import { useState } from "react";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950">
      <form
        onSubmit={submitLogin}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-bold text-slate-500">
          Below Market Apartments
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-900">
          Admin Login
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Enter the admin username and password to continue.
        </p>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            autoComplete="username"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-slate-400"
            placeholder="Enter username"
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-slate-400"
            placeholder="Enter password"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Log In
        </button>
      </form>
    </main>
  );
}
