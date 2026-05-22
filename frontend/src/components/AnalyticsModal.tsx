import { useState } from "react";
import api from "../services/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Stats {
  total_students: number;
  focused_students: number;
  not_focused_students: number;
  focus_percentage: number;
  not_focus_percentage: number;
}

export default function AnalyticsModal({ open, onClose }: Props) {
  const [total, setTotal] = useState("");
  const [focused, setFocused] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const t = parseInt(total, 10);
    const f = parseInt(focused, 10);
    if (isNaN(t) || isNaN(f) || t < 0 || f < 0) {
      setError("Please enter valid non-negative numbers");
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post<Stats>("/student-stats", { total_students: t, focused_students: f });
      setStats(resp.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not compute stats");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTotal(""); setFocused(""); setStats(null); setError("");
  }

  const pieData = stats
    ? [{ name: "Focused", value: stats.focused_students }, { name: "Not Focused", value: stats.not_focused_students }]
    : [];
  const pieColors = ["#10b981", "#ef4444"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-cyan-500/20">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-base">📊</span>
            Smart Analytics
          </h3>
          <button onClick={onClose} className="press text-slate-400 hover:text-white text-2xl leading-none transition-colors" aria-label="Close">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!stats ? (
            <>
              <p className="text-sm text-slate-300">Enter the number of students in your classroom to see focus statistics.</p>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="animate-fade-in-up delay-1">
                  <label className="form-label">Total students</label>
                  <input type="number" min="0" required value={total} onChange={(e) => setTotal(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" placeholder="e.g. 30" />
                </div>
                <div className="animate-fade-in-up delay-2">
                  <label className="form-label">Focused students</label>
                  <input type="number" min="0" required value={focused} onChange={(e) => setFocused(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" placeholder="e.g. 22" />
                </div>
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 animate-fade-in">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={loading} className="btn-primary press flex-1 rounded-lg py-2.5">
                    {loading ? "Analyzing..." : "Analyze →"}
                  </button>
                  <button type="button" onClick={onClose} className="btn-ghost press rounded-lg px-4 py-2.5">Cancel</button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} students`, n]} contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, color: "#f1f5f9" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-tile rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{stats.focus_percentage}%</div>
                  <div className="text-xs text-slate-400 mt-1">Focused</div>
                  <div className="text-sm font-medium text-slate-300">{stats.focused_students} students</div>
                </div>
                <div className="glass-tile rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-rose-400">{stats.not_focus_percentage}%</div>
                  <div className="text-xs text-slate-400 mt-1">Not Focused</div>
                  <div className="text-sm font-medium text-slate-300">{stats.not_focused_students} students</div>
                </div>
              </div>
              <div className="glass-tile rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400">Total students</div>
                <div className="text-xl font-bold text-white">{stats.total_students}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleReset} className="btn-primary press flex-1 rounded-lg py-2.5">New analysis</button>
                <button onClick={onClose} className="btn-ghost press rounded-lg px-4 py-2.5">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
