import { useState } from "react";
import { Link, useLocation } from "wouter";
import api from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await api.post("/login", { email, password });
      localStorage.setItem("token", resp.data.access_token);
      localStorage.setItem("user", JSON.stringify(resp.data.user));
      setLocation("/schedule");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg flex items-center justify-center px-4 py-10">
      <div className="blob blob-indigo w-[420px] h-[420px] top-[-120px] left-[-120px]" />
      <div className="blob blob-cyan w-[420px] h-[420px] bottom-[-120px] right-[-120px]" style={{ animationDelay: "-6s" }} />
      <div className="blob blob-fuchsia w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" style={{ animationDelay: "-12s" }} />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden glass-card animate-fade-in-up">
        <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-cyan-500/30 border-r border-white/10">
          <div className="flex items-center gap-3 z-10">
            <div className="brand-logo w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl">🎓</div>
            <span className="text-base font-semibold tracking-wide text-white">Classroom Monitor</span>
          </div>
          <div className="relative flex items-center justify-center my-10">
            <div className="absolute w-72 h-72 rounded-full border border-indigo-300/20 animate-spin-slow" />
            <div className="absolute w-56 h-56 rounded-full border border-cyan-300/20 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "20s" }} />
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-5xl shadow-[0_0_60px_rgba(139,92,246,0.6)]">📡</div>
          </div>
          <div className="z-10">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Your classroom,<br/>
              <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">in perfect focus.</span>
            </h2>
            <p className="mt-3 text-sm text-slate-300 max-w-xs">Real-time CCTV monitoring with smart focus analytics — built for teachers who care.</p>
            <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Live 4-camera grid view</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Smart focus analytics</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Bring your own IP webcams</li>
            </ul>
          </div>
        </div>

        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="brand-logo w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg">🎓</div>
            <span className="text-sm font-semibold text-slate-200 tracking-wide">Classroom Monitor</span>
          </div>
          <span className="online-badge w-fit mb-5">System Online</span>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to access your live dashboard.</p>
          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <div className="animate-fade-in-up delay-1">
              <label className="form-label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" placeholder="teacher@example.com" />
            </div>
            <div className="animate-fade-in-up delay-2">
              <label className="form-label">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" placeholder="••••••••" />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 animate-fade-in">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn-primary press w-full rounded-lg py-3 animate-fade-in-up delay-3">
              {loading ? "Signing in..." : "Log in →"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400 animate-fade-in-up delay-3">
            <Link href="/select-role" className="text-slate-500 hover:text-slate-300 transition-colors">← Back to role selection</Link>
          </p>
          <p className="mt-3 text-center text-sm text-slate-400 animate-fade-in-up delay-4">
            New here?{" "}
            <Link href="/register" className="text-indigo-300 hover:text-indigo-200 font-medium hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
