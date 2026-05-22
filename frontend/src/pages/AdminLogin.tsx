import { useState } from "react";
import { useLocation, Link } from "wouter";
import { adminApi } from "../services/api";

type Step = "email" | "otp";

export default function AdminLogin() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [, setLocation] = useLocation();

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminApi.post("/send-otp", { email });
      setStep("otp");
      startResendCooldown();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await adminApi.post("/verify-otp", { otp });
      localStorage.setItem("admin_token", resp.data.access_token);
      localStorage.setItem("admin_user", JSON.stringify(resp.data.admin));
      setLocation("/admin/dashboard");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      await adminApi.post("/send-otp", { email });
      startResendCooldown();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg flex items-center justify-center px-4 py-10 min-h-screen">
      <div className="blob blob-fuchsia w-[420px] h-[420px] top-[-120px] right-[-120px]" />
      <div className="blob blob-indigo w-[420px] h-[420px] bottom-[-120px] left-[-120px]" style={{ animationDelay: "-6s" }} />
      <div className="blob blob-cyan w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" style={{ animationDelay: "-12s" }} />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden glass-card animate-fade-in-up">
        {/* Left hero */}
        <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-fuchsia-600/30 via-rose-600/20 to-orange-500/20 border-r border-white/10">
          <div className="flex items-center gap-3 z-10">
            <div className="brand-logo w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl">🎓</div>
            <span className="text-base font-semibold tracking-wide text-white">Classroom Monitor</span>
          </div>
          <div className="relative flex items-center justify-center my-10">
            <div className="absolute w-72 h-72 rounded-full border border-fuchsia-300/20 animate-spin-slow" />
            <div className="absolute w-56 h-56 rounded-full border border-rose-300/20 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "20s" }} />
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-400 flex items-center justify-center text-5xl shadow-[0_0_60px_rgba(217,70,239,0.6)]">🛡️</div>
          </div>
          <div className="z-10">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Secure admin<br/>
              <span className="bg-gradient-to-r from-fuchsia-300 via-rose-300 to-orange-300 bg-clip-text text-transparent">access only.</span>
            </h2>
            <p className="mt-3 text-sm text-slate-300 max-w-xs">OTP-secured admin login — your email is verified before every session.</p>
            <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 6-digit one-time password</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Expires in 5 minutes</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> JWT-secured admin session</li>
            </ul>
          </div>
        </div>

        {/* Right form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="brand-logo w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg">🎓</div>
            <span className="text-sm font-semibold text-slate-200 tracking-wide">Classroom Monitor</span>
          </div>

          <div className="flex items-center gap-2 mb-5">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center text-white text-sm">🛡️</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">Admin Access</span>
          </div>

          {step === "email" ? (
            <>
              <h1 className="text-3xl font-bold text-white">Admin Login</h1>
              <p className="mt-2 text-sm text-slate-400">Enter your admin email to receive a secure OTP.</p>
              <form className="mt-7 space-y-4" onSubmit={handleSendOtp}>
                <div className="animate-fade-in-up delay-1">
                  <label className="form-label">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-pretty w-full rounded-lg px-3.5 py-2.5"
                    placeholder="admin@example.com"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 animate-fade-in">{error}</p>
                )}
                <button type="submit" disabled={loading} className="btn-primary press w-full rounded-lg py-3 animate-fade-in-up delay-2">
                  {loading ? "Sending OTP..." : "Send OTP →"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white">Enter OTP</h1>
              <p className="mt-2 text-sm text-slate-400">
                A 6-digit code was sent to{" "}
                <span className="text-fuchsia-300 font-medium">{email}</span>
              </p>
              <form className="mt-7 space-y-4" onSubmit={handleVerifyOtp}>
                <div className="animate-fade-in-up delay-1">
                  <label className="form-label">One-Time Password</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="input-pretty w-full rounded-lg px-3.5 py-3 text-center text-2xl font-mono tracking-[0.3em]"
                    placeholder="------"
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Code expires in 5 minutes</p>
                </div>
                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 animate-fade-in">{error}</p>
                )}
                <button type="submit" disabled={loading || otp.length < 6} className="btn-primary press w-full rounded-lg py-3 animate-fade-in-up delay-2">
                  {loading ? "Verifying..." : "Verify & Login →"}
                </button>
                <div className="flex items-center justify-between text-sm animate-fade-in-up delay-3">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="text-fuchsia-300 hover:text-fuchsia-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 animate-fade-in-up delay-4">
            Not an admin?{" "}
            <Link href="/select-role" className="text-indigo-300 hover:text-indigo-200 font-medium hover:underline">Go back</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
