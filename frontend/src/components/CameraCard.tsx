import { useState, useEffect, useRef } from "react";

interface Props {
  cameraNumber: number;
  status: "focused" | "not_focused";
  streamUrl: string;
  onToggle: () => void;
  onSetupSource?: () => void;
  delayClass?: string;
  topRight?: React.ReactNode;
}

export default function CameraCard({ cameraNumber, status, streamUrl, onToggle, onSetupSource, delayClass = "", topRight }: Props) {
  const isFocused = status === "focused";
  const statusBg = isFocused ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-rose-500 to-red-500";
  const pulseClass = isFocused ? "pulse-good" : "pulse-warn";

  const [frameSrc, setFrameSrc] = useState<string>("");
  const [streamBroken, setStreamBroken] = useState(false);
  const failCount = useRef(0);
  const prevBlobRef = useRef<string>("");

  useEffect(() => {
    setStreamBroken(false);
    failCount.current = 0;

    if (!streamUrl) {
      setFrameSrc("");
      return;
    }

    let cancelled = false;

    async function fetchFrame() {
      const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
      try {
        const resp = await fetch(`/api/camera-frame/${cameraNumber}?t=${Date.now()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (cancelled) { URL.revokeObjectURL(blobUrl); return; }
        // Revoke previous blob to avoid memory leak
        if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
        prevBlobRef.current = blobUrl;
        setFrameSrc(blobUrl);
        failCount.current = 0;
        setStreamBroken(false);
      } catch {
        if (cancelled) return;
        failCount.current += 1;
        if (failCount.current >= 3) setStreamBroken(true);
      }
    }

    fetchFrame();
    const id = setInterval(fetchFrame, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
      if (prevBlobRef.current) { URL.revokeObjectURL(prevBlobRef.current); prevBlobRef.current = ""; }
    };
  }, [streamUrl, cameraNumber]);

  const hasUrl = !!streamUrl;
  const hasStream = hasUrl && !!frameSrc && !streamBroken;

  return (
    <div className={`cam-card animate-fade-in-up ${delayClass} relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 shadow-xl flex flex-col`}>
      <div className={`relative scanlines flex-1 min-h-[220px] flex items-center justify-center ${hasStream ? "bg-black" : "cctv-static"}`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 z-10" />

        {hasStream && (
          <img
            src={frameSrc}
            alt={`Camera ${cameraNumber}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-[10px] font-bold text-red-300 tracking-[0.2em]">REC</span>
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <span className="text-[10px] font-mono text-slate-300/80 tracking-[0.25em] bg-black/40 px-2 py-0.5 rounded">
            LIVE • CH-{cameraNumber.toString().padStart(2, "0")}
          </span>
        </div>
        {topRight && <div className="absolute top-3 right-3 z-20">{topRight}</div>}

        {!hasStream && (
          <div className="text-slate-200 text-center z-20 relative px-4">
            <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 border border-indigo-400/30 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(99,102,241,0.3)]">📹</div>
            <div className="mt-3 text-sm font-semibold tracking-wide text-slate-200">Camera {cameraNumber}</div>
            {hasUrl && streamBroken ? (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-rose-400 uppercase tracking-widest">Stream unreachable</p>
                <p className="text-[10px] text-slate-500">Check phone IP &amp; WiFi network</p>
                {onSetupSource && <button onClick={onSetupSource} className="mt-1 text-[10px] text-indigo-300 hover:text-indigo-200 underline">Change source →</button>}
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-slate-400 uppercase tracking-widest">No source configured</p>
                {onSetupSource && (
                  <button onClick={onSetupSource} className="press mt-2 text-[11px] font-semibold bg-indigo-600/70 hover:bg-indigo-500 text-white px-3 py-1 rounded-md border border-indigo-400/40 transition-colors">
                    Set up source
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className={`absolute bottom-3 left-3 ${statusBg} ${pulseClass} text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full z-20`}>
          {isFocused ? "Focused" : "Not Focused"}
        </div>
        <div className="absolute bottom-3 right-3 z-20 font-mono text-[10px] text-slate-300/70 bg-black/40 px-2 py-0.5 rounded">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div className="bg-slate-900/95 border-t border-slate-700/50 px-4 py-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-mono font-semibold">CAM {cameraNumber.toString().padStart(2, "0")}</span>
        <button onClick={onToggle} className="press text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-700/80 hover:bg-indigo-600 text-white transition-colors border border-slate-600/50 hover:border-indigo-400">
          {isFocused ? "Mark Not Focused" : "Mark Focused"}
        </button>
      </div>
    </div>
  );
}
