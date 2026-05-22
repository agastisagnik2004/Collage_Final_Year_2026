import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { adminApi } from "../services/api";
import api from "../services/api";
import CameraCard from "../components/CameraCard";
import AnalyticsModal from "../components/AnalyticsModal";
import CameraSourcesModal from "../components/CameraSourcesModal";

interface MonitoringSession {
  id: string;
  floor_no: string;
  room_no: string;
  start_time: string;
  end_time: string;
  started_at: string;
  status: string;
}

interface CameraStatusRow { camera_number: number; status: "focused" | "not_focused"; }
type StatusMap = Record<number, "focused" | "not_focused">;
type UrlMap = Record<number, string>;

const CAMERAS = [1, 2, 3, 4];
const DELAY: Record<number, string> = { 1: "delay-1", 2: "delay-2", 3: "delay-3", 4: "delay-4" };
const STREAMS_KEY = "admin_camera_stream_urls";

function loadSavedUrls(): UrlMap {
  try { return { 1:"",2:"",3:"",4:"", ...JSON.parse(localStorage.getItem(STREAMS_KEY) ?? "{}") }; }
  catch { return { 1:"",2:"",3:"",4:"" }; }
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch { return iso; }
}

export default function AdminDashboard() {
  // Session panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  // Session form
  const [date, setDate] = useState("");
  const [floorNo, setFloorNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Sessions list
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Camera monitoring
  const [statuses, setStatuses] = useState<StatusMap>({ 1:"focused",2:"focused",3:"focused",4:"focused" });
  const [streamUrls, setStreamUrls] = useState<UrlMap>(loadSavedUrls);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  const [, setLocation] = useLocation();
  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("admin_user") ?? "{}"); } catch { return {}; }
  })();

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    api.get<{ camera_number: number; url: string }[]>("/camera-sources").then(r => {
      if (r.data.length > 0) {
        const fromServer: UrlMap = { 1: "", 2: "", 3: "", 4: "" };
        r.data.forEach(s => { fromServer[s.camera_number] = s.url; });
        setStreamUrls(prev => ({ ...prev, ...fromServer }));
        try { localStorage.setItem(STREAMS_KEY, JSON.stringify({ ...loadSavedUrls(), ...fromServer })); } catch {}
      }
    }).catch(() => {});
  }, []);

  // Poll camera status every 5 s so YOLO auto-detection updates appear live
  useEffect(() => {
    function fetchStatuses() {
      api.get<CameraStatusRow[]>("/camera-status").then(r => {
        setStatuses(prev => { const n = { ...prev }; r.data.forEach(row => { n[row.camera_number] = row.status; }); return n; });
      }).catch(() => {});
    }
    fetchStatuses();
    const t = setInterval(fetchStatuses, 5000);
    return () => clearInterval(t);
  }, []);

  async function loadSessions() {
    setSessionsLoading(true);
    try { const r = await adminApi.get<MonitoringSession[]>("/sessions"); setSessions(r.data); }
    catch { /* silent */ } finally { setSessionsLoading(false); }
  }

  function openSessions() { setSessionsOpen(true); loadSessions(); }

  async function handleStartMonitoring(e: React.FormEvent) {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    if (!floorNo.trim() || !roomNo.trim() || !startTime || !endTime) { setFormError("Please fill in all fields"); return; }
    if (endTime <= startTime) { setFormError("End time must be after start time"); return; }
    setFormLoading(true);
    try {
      await adminApi.post("/start-monitoring", { floor_no: floorNo.trim(), room_no: roomNo.trim(), start_time: startTime, end_time: endTime });
      setFormSuccess(`Session started — Floor ${floorNo}, Room ${roomNo}`);
      setFloorNo(""); setRoomNo(""); setStartTime(""); setEndTime(""); setDate("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(typeof detail === "string" ? detail : "Could not start monitoring session");
    } finally { setFormLoading(false); }
  }

  async function toggleStatus(cam: number) {
    const cur = statuses[cam] ?? "focused";
    const next = cur === "focused" ? "not_focused" : "focused";
    setStatuses(prev => ({ ...prev, [cam]: next }));
    try { await api.post("/camera-status", { camera_number: cam, status: next }); }
    catch { setStatuses(prev => ({ ...prev, [cam]: cur })); }
  }

  function handleSaveUrls(newUrls: UrlMap) {
    setStreamUrls(newUrls);
    try { localStorage.setItem(STREAMS_KEY, JSON.stringify(newUrls)); } catch {}
    setSourcesOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("admin_token"); localStorage.removeItem("admin_user");
    setLocation("/select-role");
  }

  const focused = CAMERAS.filter(n => (statuses[n] ?? "focused") === "focused").length;
  const focusPct = Math.round((focused / CAMERAS.length) * 100);

  return (
    <div className="app-bg min-h-screen">
      <div className="blob blob-fuchsia w-[500px] h-[500px] top-[-150px] right-[-200px]" style={{ animationDelay: "-4s" }} />
      <div className="blob blob-indigo w-[500px] h-[500px] bottom-[-200px] left-[-200px]" />
      <div className="shimmer-bar h-1 w-full relative z-10" style={{ background: "linear-gradient(90deg, #d946ef 0%, #f43f5e 35%, #fb923c 70%, #d946ef 100%)" }} />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-[0_8px_20px_-4px_rgba(217,70,239,0.6)]">🛡️</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white">Admin Dashboard</h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300 bg-fuchsia-500/12 border border-fuchsia-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {now.toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" })}
                {" · "}
                <span className="font-mono">{now.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {adminUser?.email && <span className="hidden sm:inline text-sm text-slate-400">{adminUser.email}</span>}
            <button onClick={() => setSourcesOpen(true)} className="nav-link press">📡 Sources</button>
            <button onClick={openSessions} className="nav-link press">📋 Sessions</button>
            <button
              onClick={() => setPanelOpen(true)}
              className="press px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #d946ef 0%, #f43f5e 100%)", boxShadow: "0 6px 20px -4px rgba(217,70,239,0.5)" }}
            >
              + New Session
            </button>
            <button onClick={handleLogout} className="nav-link press">Log out</button>
          </div>
        </div>
      </header>

      {/* Main — always show camera grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-tile rounded-xl p-5 hover-lift animate-fade-in-up delay-1">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Focus rate</div>
            <div className="mt-1 text-3xl font-bold bg-gradient-to-r from-fuchsia-300 to-rose-300 bg-clip-text text-transparent">{focusPct}%</div>
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-fuchsia-400 to-rose-400 transition-all duration-700" style={{ width: `${focusPct}%` }} />
            </div>
          </div>
          <div className="glass-tile rounded-xl p-5 hover-lift animate-fade-in-up delay-2">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Total Cameras</div>
            <div className="mt-1 text-3xl font-bold text-white">{CAMERAS.length}</div>
            <div className="mt-2 text-xs text-slate-500">Active feeds</div>
          </div>
          <div className="glass-tile rounded-xl p-5 hover-lift animate-fade-in-up delay-3">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Focused</div>
            <div className="mt-1 text-3xl font-bold text-emerald-400">{focused}</div>
            <div className="mt-2 text-xs text-slate-500">Camera zones</div>
          </div>
          <div className="glass-tile rounded-xl p-5 hover-lift animate-fade-in-up delay-4">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Not Focused</div>
            <div className="mt-1 text-3xl font-bold text-rose-400">{CAMERAS.length - focused}</div>
            <div className="mt-2 text-xs text-slate-500">Camera zones</div>
          </div>
        </div>

        {/* Camera grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CAMERAS.map(n => (
            <CameraCard
              key={n}
              cameraNumber={n}
              status={statuses[n] ?? "focused"}
              streamUrl={streamUrls[n] ?? ""}
              onToggle={() => toggleStatus(n)}
              onSetupSource={() => setSourcesOpen(true)}
              delayClass={DELAY[n]}
              topRight={n === 4 ? (
                <button
                  onClick={() => setAnalyticsOpen(true)}
                  className="press text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white px-2.5 py-1 rounded-md shadow-lg"
                >
                  📊 Analytics
                </button>
              ) : undefined}
            />
          ))}
        </div>
      </main>

      {/* ── New Session slide-over panel ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-fade-in">
            <div className="border-b border-white/10 px-6 py-4 bg-gradient-to-r from-fuchsia-600/20 via-rose-600/15 to-orange-500/15 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">📡</span>
                  New Monitoring Session
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Configure floor, room, and time window</p>
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-white transition-colors text-xl leading-none press">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form className="space-y-4" onSubmit={handleStartMonitoring}>
                <div>
                  <label className="form-label">📆 Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
                </div>
                <div>
                  <label className="form-label">🏢 Floor Number</label>
                  <input type="text" required value={floorNo} onChange={e => setFloorNo(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" placeholder="e.g. 3" />
                </div>
                <div>
                  <label className="form-label">🚪 Room Number</label>
                  <input type="text" required value={roomNo} onChange={e => setRoomNo(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" placeholder="e.g. 301" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">⏰ Start Time</label>
                    <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
                  </div>
                  <div>
                    <label className="form-label">⏱️ End Time</label>
                    <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
                  </div>
                </div>
                {formError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{formError}</p>}
                {formSuccess && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">✓ {formSuccess}</p>}
                <button
                  type="submit" disabled={formLoading}
                  className="press w-full rounded-lg py-3 font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #d946ef 0%, #f43f5e 50%, #fb923c 100%)", boxShadow: "0 10px 30px -8px rgba(217,70,239,0.65)" }}
                >
                  {formLoading ? "Starting session..." : "Start Monitoring →"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Sessions history drawer ── */}
      {sessionsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSessionsOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-fade-in">
            <div className="border-b border-white/10 px-6 py-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-cyan-500/20 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">📋</span>
                  Monitoring Sessions
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Your session history</p>
              </div>
              <button onClick={() => setSessionsOpen(false)} className="text-slate-400 hover:text-white transition-colors text-xl leading-none press">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {sessionsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-tile rounded-xl h-16 animate-pulse" />)}</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-400 text-sm">No monitoring sessions yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Use "+ New Session" to create one.</p>
                </div>
              ) : (
                sessions.map((s, i) => (
                  <div key={s.id} className={`glass-tile rounded-xl px-4 py-3 animate-fade-in-up delay-${Math.min(i+1,5)}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">Floor {s.floor_no} · Room {s.room_no}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          {s.start_time && <span>⏰ {s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}</span>}
                          <span>·</span>
                          <span>{formatDate(s.started_at)}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ml-2 flex-shrink-0 ${
                        s.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <AnalyticsModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <CameraSourcesModal open={sourcesOpen} initialUrls={streamUrls} onSave={handleSaveUrls} onClose={() => setSourcesOpen(false)} />
    </div>
  );
}
