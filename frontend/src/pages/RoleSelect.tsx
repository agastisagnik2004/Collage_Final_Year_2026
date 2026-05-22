import { useLocation } from "wouter";

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <div className="app-bg flex items-center justify-center px-4 py-10 min-h-screen">
      <div className="blob blob-indigo w-[500px] h-[500px] top-[-150px] left-[-200px]" />
      <div className="blob blob-cyan w-[500px] h-[500px] bottom-[-200px] right-[-200px]" style={{ animationDelay: "-8s" }} />
      <div className="blob blob-fuchsia w-[350px] h-[350px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ animationDelay: "-14s" }} />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="brand-logo w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-[0_0_50px_rgba(99,102,241,0.5)]">
            🎓
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Classroom Monitor</h1>
          <p className="mt-2 text-slate-400 text-base">Real-time classroom focus monitoring system</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <p className="text-center text-sm uppercase tracking-widest text-slate-400 font-semibold mb-6">
            Select your role to continue
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <button
              onClick={() => setLocation("/login")}
              className="press group relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-cyan-500/15 p-7 text-left hover:border-indigo-400/60 transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(99,102,241,0.5)] animate-fade-in-up delay-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl mb-4 shadow-[0_8px_20px_-4px_rgba(99,102,241,0.6)]">
                  👩‍🏫
                </div>
                <h2 className="text-xl font-bold text-white">Teacher</h2>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                  Access live CCTV dashboard, monitor focus levels, and manage classroom sessions.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-indigo-300 text-sm font-medium">
                  <span>Enter as Teacher</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLocation("/admin/login")}
              className="press group relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/15 via-rose-500/10 to-orange-500/15 p-7 text-left hover:border-fuchsia-400/60 transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(217,70,239,0.5)] animate-fade-in-up delay-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center text-2xl mb-4 shadow-[0_8px_20px_-4px_rgba(217,70,239,0.6)]">
                  🛡️
                </div>
                <h2 className="text-xl font-bold text-white">Admin</h2>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                  Manage monitoring sessions, configure rooms, and oversee the entire system.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-fuchsia-300 text-sm font-medium">
                  <span>Enter as Admin</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <span className="online-badge">System Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
