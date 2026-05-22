import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import api, { getStoredUser } from "../services/api";
import CameraCard from "../components/CameraCard";
import AnalyticsModal from "../components/AnalyticsModal";
import CameraSourcesModal from "../components/CameraSourcesModal";

interface CameraStatusRow { camera_number: number; status: "focused" | "not_focused"; }
type StatusMap = Record<number, "focused" | "not_focused">;
type UrlMap = Record<number, string>;

const CAMERAS = [1, 2, 3, 4];
const DELAY: Record<number, string> = { 1: "delay-1", 2: "delay-2", 3: "delay-3", 4: "delay-4" };
const STREAMS_KEY = "camera_stream_urls";

function loadSavedUrls(): UrlMap {
  try { return { 1:"",2:"",3:"",4:"", ...JSON.parse(localStorage.getItem(STREAMS_KEY) ?? "{}") }; }
  catch { return { 1:"",2:"",3:"",4:"" }; }
}

interface DetectStatus { model_loaded: boolean; sources_configured: number; last_detection: string | null; }

export default function Dashboard() {
  const [statuses, setStatuses] = useState<StatusMap>({ 1:"focused",2:"focused",3:"focused",4:"focused" });
  const [streamUrls, setStreamUrls] = useState<UrlMap>(loadSavedUrls);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [detectStatus, setDetectStatus] = useState<DetectStatus | null>(null);
  const [, setLocation] = useLocation();
  const user = getStoredUser();

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    // Load stream URLs saved in backend (set by detection loop / camera sources)
    api.get<{ camera_number: number; url: string }[]>("/camera-sources").then(r => {
      if (r.data.length > 0) {
        const fromServer: UrlMap = { 1: "", 2: "", 3: "", 4: "" };
        r.data.forEach(s => { fromServer[s.camera_number] = s.url; });
        setStreamUrls(prev => ({ ...prev, ...fromServer }));
        try { localStorage.setItem(STREAMS_KEY, JSON.stringify({ ...loadSavedUrls(), ...fromServer })); } catch {}
      }
    }).catch(() => {});
  }, []);

  // Poll camera status and detection status every 5 s
  useEffect(() => {
    function fetchStatuses() {
      api.get<CameraStatusRow[]>("/camera-status").then(r => {
        setStatuses(prev => { const n = { ...prev }; r.data.forEach(row => { n[row.camera_number] = row.status; }); return n; });
      }).catch(() => {});
      api.get<DetectStatus>("/detect/status").then(r => setDetectStatus(r.data)).catch(() => {});
    }
    fetchStatuses();
    const t = setInterval(fetchStatuses, 5000);
    return () => clearInterval(t);
  }, []);

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
    localStorage.removeItem("token"); localStorage.removeItem("user"); setLocation("/select-role");
  }

  const focused = CAMERAS.filter(n => (statuses[n] ?? "focused") === "focused").length;
  const focusPct = Math.round((focused / CAMERAS.length) * 100);

  return (
    <div className="app-bg">
      <div className="blob blob-indigo w-[500px] h-[500px] top-[-150px] left-[-200px]" />
      <div className="blob blob-cyan w-[500px] h-[500px] bottom-[-200px] right-[-200px]" style={{ animationDelay: "-8s" }} />
      <div className="shimmer-bar h-1 w-full relative z-10" />
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="brand-logo w-10 h-10 rounded-xl flex items-center justify-center text-white">🎓</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white">Live Dashboard</h1>
                <span className="online-badge">Live</span>
              </div>
              <p className="text-xs text-slate-400">Real-time classroom focus monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-xs text-slate-400">{now.toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" })}</span>
              <span className="text-sm font-mono text-slate-200">{now.toLocaleTimeString()}</span>
            </div>
            {user && <span className="hidden sm:inline text-sm text-slate-400">Hi, <span className="font-medium text-slate-200">{user.name}</span></span>}
            <button onClick={() => setSourcesOpen(true)} className="nav-link press">📡 Sources</button>
            <button onClick={() => setLocation("/schedule")} className="nav-link press">📅 New schedule</button>
            <button onClick={handleLogout} className="nav-link press">Log out</button>
          </div>
        </div>
      </header>
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-tile rounded-xl p-5 hover-lift animate-fade-in-up delay-1">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Focus rate</div>
            <div className="mt-1 text-3xl font-bold bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">{focusPct}%</div>
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-700" style={{ width: `${focusPct}%` }} />
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
        {/* AI detection status bar */}
        {detectStatus && (
          <div className="glass-tile rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-xs">
            <span className={`flex items-center gap-1.5 font-semibold ${detectStatus.model_loaded ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`w-2 h-2 rounded-full ${detectStatus.model_loaded ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {detectStatus.model_loaded ? "AI model active" : "AI model loading..."}
            </span>
            <span className="text-slate-500">|</span>
            <span className={detectStatus.sources_configured > 0 ? "text-slate-300" : "text-rose-400"}>
              {detectStatus.sources_configured} / 4 cameras configured
              {detectStatus.sources_configured === 0 && " — click Sources to add camera URLs"}
            </span>
            {detectStatus.last_detection && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Last detection: {new Date(detectStatus.last_detection).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CAMERAS.map(n => (
            <CameraCard key={n} cameraNumber={n} status={statuses[n] ?? "focused"} streamUrl={streamUrls[n] ?? ""} onToggle={() => toggleStatus(n)} onSetupSource={() => setSourcesOpen(true)} delayClass={DELAY[n]}
              topRight={n === 4 ? (
                <button onClick={() => setAnalyticsOpen(true)} className="press text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-2.5 py-1 rounded-md shadow-lg">
                  📊 Analytics
                </button>
              ) : undefined}
            />
          ))}
        </div>
      </main>
      <AnalyticsModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <CameraSourcesModal open={sourcesOpen} initialUrls={streamUrls} onSave={handleSaveUrls} onClose={() => setSourcesOpen(false)} />
    </div>
  );
}
