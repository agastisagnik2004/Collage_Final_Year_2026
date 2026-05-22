import os
import asyncio
import threading
from pathlib import Path
from typing import Optional

_model = None
_fallback_model = None
_model_lock = threading.Lock()
_fallback_lock = threading.Lock()
_detection_task: Optional[asyncio.Task] = None

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    str(Path(__file__).parent.parent.parent / "runs/detect/merged_yolo_runs/brainware_v8v12v26/weights/best.pt"),
)
DETECT_INTERVAL = float(os.getenv("DETECT_INTERVAL", "5"))
CONF_THRESHOLD = float(os.getenv("DETECT_CONF", "0.05"))
FALLBACK_CONF = 0.40  # yolov8n person detection threshold


def _load_model():
    global _model
    with _model_lock:
        if _model is not None:
            return _model
        path = Path(MODEL_PATH)
        if not path.exists():
            print(f"[WARN] Custom model not found at {path} -- will use fallback detection")
            return None
        try:
            from ultralytics import YOLO
            import numpy as np
            _model = YOLO(str(path))
            try:
                _model(np.zeros((640, 640, 3), dtype=np.uint8), verbose=False)
            except Exception:
                pass
            print(f"[OK] YOLO model loaded ({path.name})")
            return _model
        except Exception as e:
            print(f"[WARN] YOLO model load failed: {e}")
            return None


def _load_fallback_model():
    """Load yolov8n pretrained on COCO for reliable person detection."""
    global _fallback_model
    with _fallback_lock:
        if _fallback_model is not None:
            return _fallback_model
        try:
            from ultralytics import YOLO
            _fallback_model = YOLO("yolov8n.pt")
            print("[OK] Fallback yolov8n model ready (person detection)")
            return _fallback_model
        except Exception as e:
            print(f"[WARN] Fallback model load failed: {e}")
            return None


def _infer(frame) -> dict:
    """Run custom model; fall back to yolov8n person detection if needed."""
    model = _load_model()
    if model is not None:
        try:
            results = model(frame, conf=CONF_THRESHOLD, verbose=False)
            focus = sum(1 for r in results for cls in r.boxes.cls.tolist() if int(cls) == 0)
            not_focus = sum(1 for r in results for cls in r.boxes.cls.tolist() if int(cls) == 1)
            if focus + not_focus > 0:
                return {"focus": focus, "not_focus": not_focus}
        except Exception as e:
            print(f"[WARN] Custom model inference error: {e}")

    # Fallback: yolov8n COCO person detector (class 0 = person)
    fb = _load_fallback_model()
    if fb is not None:
        try:
            results = fb(frame, conf=FALLBACK_CONF, classes=[0], verbose=False)
            persons = sum(1 for r in results for _ in r.boxes.cls.tolist())
            print(f"[DET] fallback yolov8n: {persons} person(s) detected")
            # person present = focused; nobody visible = not focused
            return {"focus": persons, "not_focus": 0} if persons > 0 else {"focus": 0, "not_focus": 1}
        except Exception as e:
            print(f"[WARN] Fallback inference error: {e}")

    return {"focus": 0, "not_focus": 0}


def _infer_annotated(frame) -> tuple:
    """Run inference, draw bounding boxes, return (jpeg_bytes, counts)."""
    import cv2

    model = _load_model()

    # Try custom focus/not-focus model first
    if model is not None:
        try:
            results = model(frame, conf=CONF_THRESHOLD, verbose=False)
            focus = sum(1 for r in results for cls in r.boxes.cls.tolist() if int(cls) == 0)
            not_focus = sum(1 for r in results for cls in r.boxes.cls.tolist() if int(cls) == 1)
            if focus + not_focus > 0:
                annotated = results[0].plot(conf=True, labels=True, line_width=2)
                _, jpg = cv2.imencode(".jpg", annotated)
                return jpg.tobytes(), {
                    "focus": focus, "not_focus": not_focus,
                    "model_ready": True, "detected": True,
                }
        except Exception as e:
            print(f"[WARN] Custom model inference error: {e}")

    # Fallback: yolov8n person detection
    fb = _load_fallback_model()
    if fb is not None:
        try:
            results = fb(frame, conf=FALLBACK_CONF, classes=[0], verbose=False)
            persons = sum(1 for r in results for _ in r.boxes.cls.tolist())
            annotated = frame.copy()
            GREEN = (0, 200, 0)
            RED = (0, 0, 200)

            if persons > 0:
                for box in results[0].boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    score = float(box.conf[0])
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), GREEN, 2)
                    label = f"Focused {score:.2f}"
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
                    cv2.rectangle(annotated, (x1, y1 - th - 6), (x1 + tw + 4, y1), GREEN, -1)
                    cv2.putText(annotated, label, (x1 + 2, y1 - 4),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
                _, jpg = cv2.imencode(".jpg", annotated)
                return jpg.tobytes(), {
                    "focus": persons, "not_focus": 0,
                    "model_ready": True, "detected": True,
                }
            else:
                cv2.putText(annotated, "No student detected", (16, 36),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, RED, 2)
                _, jpg = cv2.imencode(".jpg", annotated)
                return jpg.tobytes(), {
                    "focus": 0, "not_focus": 1,
                    "model_ready": True, "detected": True,
                }
        except Exception as e:
            print(f"[WARN] Fallback inference error: {e}")

    _, jpg = cv2.imencode(".jpg", frame)
    return jpg.tobytes(), {"focus": 0, "not_focus": 0, "model_ready": False, "detected": False}


async def grab_and_annotate(url: str) -> tuple:
    """Grab frame from camera URL, run YOLO, return (annotated_jpeg_bytes, counts)."""
    frame = await _grab_frame(url)
    if frame is None:
        return None, {}
    loop = asyncio.get_event_loop()
    annotated_bytes, counts = await loop.run_in_executor(None, _infer_annotated, frame)
    return annotated_bytes, counts


def _to_shot_url(url: str) -> str:
    """Convert any IP-Webcam URL to the /shot.jpg single-frame endpoint."""
    import re
    base = re.sub(r"/(video|shot\.jpg|jpeg|photo\.jpg)\s*$", "", url).rstrip("/")
    return f"{base}/shot.jpg"


async def _grab_frame(url: str):
    try:
        import httpx
        import numpy as np
        import cv2

        shot_url = _to_shot_url(url)
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(shot_url)
        if r.status_code == 200:
            arr = np.frombuffer(r.content, dtype=np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        pass
    return None


async def _detect_all() -> None:
    from app.database import get_db
    from datetime import datetime, timezone

    try:
        db = get_db()
    except Exception:
        return

    sources = await db["camerasources"].find().to_list(None)
    if not sources:
        return

    # Group cameras by URL — if multiple cameras share the same URL we fetch
    # and infer only once, then write the same result to all of them.
    url_to_cams: dict = {}
    for src in sources:
        url = (src.get("url") or "").strip()
        cam = src.get("cameraNumber")
        if not url or not cam:
            continue
        url_to_cams.setdefault(url, []).append(cam)

    loop = asyncio.get_event_loop()
    for url, cams in url_to_cams.items():
        frame = await _grab_frame(url)
        if frame is None:
            continue

        counts = await loop.run_in_executor(None, _infer, frame)
        total = counts["focus"] + counts["not_focus"]
        if total == 0:
            continue  # both models failed entirely — skip

        status = "focused" if counts["focus"] >= counts["not_focus"] else "not_focused"
        now = datetime.now(timezone.utc)
        print(f"[DET] cams={cams} url=...{url[-20:]} → {status} (focus={counts['focus']} not_focus={counts['not_focus']})")
        for cam in cams:
            await db["camerastatuses"].find_one_and_update(
                {"cameraNumber": cam},
                {"$set": {
                    "status": status,
                    "cameraNumber": cam,
                    "updatedAt": now,
                    "detection": counts,
                }},
                upsert=True,
            )


async def _loop() -> None:
    print(f"[OK] Auto-detection started (interval: {DETECT_INTERVAL}s)")
    while True:
        try:
            await _detect_all()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[WARN] Detection error: {e}")
        try:
            await asyncio.sleep(DETECT_INTERVAL)
        except asyncio.CancelledError:
            break
    print("[OK] Auto-detection stopped")


async def start_detection() -> None:
    global _detection_task
    threading.Thread(target=_load_model, daemon=True).start()
    threading.Thread(target=_load_fallback_model, daemon=True).start()
    _detection_task = asyncio.create_task(_loop())


def stop_detection() -> None:
    global _detection_task
    if _detection_task:
        _detection_task.cancel()
        _detection_task = None
