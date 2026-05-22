import { useState, useEffect } from "react";
import api from "../services/api";

interface Props {
  open: boolean;
  initialUrls: Record<number, string>;
  onSave: (urls: Record<number, string>) => void;
  onClose: () => void;
}

const CAMERAS = [1, 2, 3, 4];

export default function CameraSourcesModal({ open, initialUrls, onSave, onClose }: Props) {
  const [urls, setUrls] = useState<Record<number, string>>(initialUrls);

  useEffect(() => {
    if (open) setUrls(initialUrls);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  function handleChange(num: number, value: string) {
    setUrls((prev) => ({ ...prev, [num]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned: Record<number, string> = {};
    for (const num of CAMERAS) cleaned[num] = (urls[num] || "").trim();
    // Sync each URL to the backend so the detection loop can use them
    await Promise.allSettled(
      CAMERAS.map((num) =>
        api.post("/camera-sources", { camera_number: num, url: cleaned[num] })
      )
    );
    onSave(cleaned);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-cyan-500/20">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-base">📡</span>
            Camera sources
          </h3>
          <button onClick={onClose} className="press text-slate-400 hover:text-white text-2xl leading-none transition-colors" aria-label="Close">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Paste an IP webcam stream URL for each camera. With the{" "}
            <span className="font-semibold text-indigo-300">IP Webcam</span> Android app, use the address it shows followed by{" "}
            <code className="bg-slate-800/80 text-cyan-300 px-1.5 py-0.5 rounded text-xs">/video</code>{" "}
            for a live MJPEG feed.
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            {CAMERAS.map((num, idx) => (
              <div key={num} className={`animate-fade-in-up delay-${idx + 1}`}>
                <label className="form-label flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">{num}</span>
                  Camera {num} URL
                </label>
                <input type="text" value={urls[num] || ""} onChange={(e) => handleChange(num, e.target.value)} placeholder="http://192.168.1.42:8080/video" className="input-pretty w-full rounded-lg px-3.5 py-2.5" />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="btn-primary press flex-1 rounded-lg py-2.5">Save</button>
              <button type="button" onClick={onClose} className="btn-ghost press rounded-lg px-4 py-2.5">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
