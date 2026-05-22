import { useState } from "react";
import { useLocation } from "wouter";
import api, { getStoredUser } from "../services/api";

function getDayName(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
}

export default function Schedule() {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const user = getStoredUser();
  const day = getDayName(date);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (startTime && endTime && endTime <= startTime) {
      setError("End time must be after start time");
      return;
    }
    setLoading(true);
    try {
      await api.post("/schedule", { date, day, time: `${startTime} - ${endTime}`, room_no: roomNo });
      setLocation("/dashboard");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not save schedule");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/select-role");
  }

  return (
    <div className="app-bg">
      <div className="blob blob-indigo w-[400px] h-[400px] top-[-100px] left-[-100px]" />
      <div className="blob blob-cyan w-[400px] h-[400px] bottom-[-100px] right-[-100px]" style={{ animationDelay: "-8s" }} />
      <div className="shimmer-bar h-1 w-full relative z-10" />
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-slate-950/40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-logo w-9 h-9 rounded-lg flex items-center justify-center text-white">🎓</div>
            <h1 className="text-base font-semibold text-white">Classroom Monitor</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="hidden sm:inline text-sm text-slate-400">Hi, <span className="font-medium text-slate-200">{user.name}</span></span>}
            <button onClick={handleLogout} className="nav-link press">Log out</button>
          </div>
        </div>
      </header>
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-10">
        <div className="glass-card rounded-2xl p-8 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="brand-logo w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl">📅</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Schedule a class</h2>
              <p className="text-sm text-slate-400">Fill in the details to start a monitoring session.</p>
            </div>
          </div>
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="animate-fade-in-up delay-1">
              <label className="form-label">📆 Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
            </div>
            <div className="animate-fade-in-up delay-2">
              <label className="form-label">📍 Day</label>
              <input type="text" value={day} readOnly placeholder="Auto-detected from date" className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
            </div>
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up delay-3">
              <div>
                <label className="form-label">⏰ Start time</label>
                <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
              </div>
              <div>
                <label className="form-label">⏱️ End time</label>
                <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
              </div>
            </div>
            <div className="animate-fade-in-up delay-4">
              <label className="form-label">🚪 Room number</label>
              <input type="text" required value={roomNo} onChange={e => setRoomNo(e.target.value)} placeholder="e.g. 204" className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 animate-fade-in">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary press w-full rounded-lg py-3 animate-fade-in-up delay-5">
              {loading ? "Starting session..." : "Start monitoring →"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
