

import os
import sys
import pickle
import argparse
import torch
from pathlib import Path

# ─────────────────────────────────────────────
# 0. ARGUMENT PARSER
# ─────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Merged YOLO Trainer")
parser.add_argument("--mode",   default="train", choices=["download", "merge", "train", "export", "predict", "all"])
parser.add_argument("--source", default=None,    help="Image/video path for prediction mode")
parser.add_argument("--epochs", default=1,     type=int)
parser.add_argument("--batch",  default=16,      type=int)
parser.add_argument("--imgsz",  default=640,     type=int)
parser.add_argument("--device", default="0" if torch.cuda.is_available() else "cpu")
parser.add_argument("--resume", default=False,   action="store_true", help="Resume training from existing weights")
parser.add_argument("--adapter", default=False,  action="store_true", help="Use adapter mode - skip training, use existing weights")
args = parser.parse_args()

# ─────────────────────────────────────────────
# 1. INSTALL DEPENDENCIES
# ─────────────────────────────────────────────
def install_deps():
    import subprocess
    pkgs = ["ultralytics>=8.3.0", "roboflow", "onnx", "onnxruntime"]
    for pkg in pkgs:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])
    print("✅ All dependencies installed.")

# ─────────────────────────────────────────────
# 2. DOWNLOAD DATASET FROM ROBOFLOW
# ─────────────────────────────────────────────
def download_dataset():
    from roboflow import Roboflow

    print("\n📦 Downloading dataset from Roboflow...")
    rf = Roboflow(api_key="LrlGW63aDT5KVVl260QZ")
    project = rf.workspace("jadavpur-dataset-work").project("brainware_pictures-xlkci")
    version = project.version(2)

    # Download in YOLOv8 format (compatible with all Ultralytics YOLO variants)
    dataset = version.download("yolov8")

    dataset_path = Path(dataset.location)
    yaml_path    = dataset_path / "data.yaml"

    print(f"✅ Dataset downloaded to: {dataset_path}")
    print(f"✅ YAML config: {yaml_path}")

    # Fix absolute paths inside data.yaml (common Roboflow issue)
    _fix_yaml_paths(yaml_path, dataset_path)

    return str(yaml_path)


def _fix_yaml_paths(yaml_path, dataset_path):
    """Ensure data.yaml uses absolute paths so training always finds images."""
    import yaml

    with open(yaml_path, "r") as f:
        cfg = yaml.safe_load(f)

    cfg["path"] = str(dataset_path)
    for split in ["train", "val", "test"]:
        if split in cfg and cfg[split]:
            p = Path(cfg[split])
            if not p.is_absolute():
                cfg[split] = str(dataset_path / cfg[split])

    with open(yaml_path, "w") as f:
        yaml.dump(cfg, f, default_flow_style=False)

    print(f"✅ data.yaml paths fixed.")
    return cfg


# ─────────────────────────────────────────────
# 3. DOWNLOAD BASE YOLO WEIGHTS
# ─────────────────────────────────────────────
def download_base_weights():
    from ultralytics import YOLO

    print("\n⬇️  Downloading base YOLO weights (v8, v12, v26)...")
    weights = {}

    for name, pt in [("v8", "yolov8n.pt"), ("v12", "yolov12n.pt"), ("v26", "yolo26n.pt")]:
        try:
            model = YOLO(pt)
            weights[name] = model.model.state_dict()
            print(f"  ✅ {pt} loaded — {len(weights[name])} layers")
        except Exception as e:
            print(f"  ⚠️  {pt} failed: {e} — will skip during merge")
            weights[name] = None

    return weights


# ─────────────────────────────────────────────
# 4. MERGE WEIGHTS → .pkl
# ─────────────────────────────────────────────
def merge_weights(weights: dict, output_pkl: str = "merged_v8_v12_v26.pkl"):
    """
    Layer-wise merge strategy:
    ┌────────────────┬────────────────────────────────────────────┐
    │ Backbone (0-4) │ YOLOv8  — proven fast CSPDarknet + C2f     │
    │ Neck     (5-9) │ YOLOv12 — R-ELAN attention aggregation     │
    │ Head     (10+) │ YOLO26  — NMS-free, ProgLoss, faster head  │
    └────────────────┴────────────────────────────────────────────┘
    Shape mismatches fall back to YOLOv8 automatically.
    """
    sd_v8  = weights.get("v8")
    sd_v12 = weights.get("v12")
    sd_v26 = weights.get("v26")

    if sd_v8 is None:
        raise RuntimeError("YOLOv8 weights are required as the base skeleton.")

    merged = {}
    stats  = {"backbone_v8": 0, "neck_v12": 0, "head_v26": 0, "fallback_v8": 0}

    for key in sd_v8.keys():
        parts      = key.split(".")
        layer_num  = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 99
        base_shape = sd_v8[key].shape

        if layer_num <= 4:
            # ── BACKBONE: YOLOv8 ──────────────────────────
            merged[key] = sd_v8[key]
            stats["backbone_v8"] += 1

        elif layer_num <= 9:
            # ── NECK: YOLOv12 (with fallback) ────────────
            if sd_v12 and key in sd_v12 and sd_v12[key].shape == base_shape:
                merged[key] = sd_v12[key]
                stats["neck_v12"] += 1
            else:
                merged[key] = sd_v8[key]
                stats["fallback_v8"] += 1

        else:
            # ── HEAD: YOLO26 (with fallback) ─────────────
            if sd_v26 and key in sd_v26 and sd_v26[key].shape == base_shape:
                merged[key] = sd_v26[key]
                stats["head_v26"] += 1
            else:
                merged[key] = sd_v8[key]
                stats["fallback_v8"] += 1

    with open(output_pkl, "wb") as f:
        pickle.dump(merged, f)

    print(f"\n✅ Merged weights saved → {output_pkl}")
    print(f"   Backbone (YOLOv8) : {stats['backbone_v8']} layers")
    print(f"   Neck     (YOLOv12): {stats['neck_v12']} layers")
    print(f"   Head     (YOLO26) : {stats['head_v26']} layers")
    print(f"   Fallback (YOLOv8) : {stats['fallback_v8']} layers")

    return output_pkl


# ─────────────────────────────────────────────
# 5. LOAD MERGED WEIGHTS INTO MODEL
# ─────────────────────────────────────────────
def load_merged_model(pkl_path: str):
    from ultralytics import YOLO

    print(f"\n🔧 Loading merged weights from {pkl_path}...")
    model = YOLO("yolov8n.pt")  # Architecture skeleton

    with open(pkl_path, "rb") as f:
        merged_sd = pickle.load(f)

    result = model.model.load_state_dict(merged_sd, strict=False)
    print(f"  ✅ Weights loaded")
    print(f"  Missing keys  : {len(result.missing_keys)}")
    print(f"  Unexpected keys: {len(result.unexpected_keys)}")

    return model


# ─────────────────────────────────────────────
# 6. TRAIN
# ─────────────────────────────────────────────
def train(model, yaml_path: str, epochs: int, batch: int, imgsz: int, device: str):
    print(f"\n🚀 Starting training...")
    print(f"   Dataset : {yaml_path}")
    print(f"   Epochs  : {epochs}")
    print(f"   Batch   : {batch}")
    print(f"   Image   : {imgsz}px")
    print(f"   Device  : {device}\n")

    results = model.train(
        data    = yaml_path,
        epochs  = epochs,
        imgsz   = imgsz,
        batch   = batch,
        device  = device,
        workers = min(8, os.cpu_count() or 4),

        # ── Optimizer (YOLO26-style fast convergence) ──
        optimizer       = "AdamW",
        lr0             = 0.001,
        lrf             = 0.01,
        momentum        = 0.937,
        weight_decay    = 0.0005,
        warmup_epochs   = 5,
        warmup_momentum = 0.8,
        cos_lr          = True,       # Cosine LR schedule

        # ── Speed boosters ──────────────────────────────
        amp             = True,       # Mixed precision → ~2× speed
        cache           = "ram",      # Cache images in RAM (use "disk" if RAM < 16GB)
        freeze          = 10,         # Freeze backbone layers → faster

        # ── Augmentation (YOLO26-style) ─────────────────
        mosaic          = 1.0,
        mixup           = 0.1,
        copy_paste      = 0.1,
        label_smoothing = 0.1,        # ProgLoss-style regularization
        hsv_h           = 0.015,
        hsv_s           = 0.7,
        hsv_v           = 0.4,
        degrees         = 10.0,
        translate       = 0.1,
        scale           = 0.5,
        fliplr          = 0.5,

        # ── Save settings ────────────────────────────────
        save            = True,
        save_period     = 10,
        project         = "merged_yolo_runs",
        name            = "brainware_v8v12v26",
        exist_ok        = True,
        verbose         = True,
        plots           = False,      # Disable plotting to avoid matplotlib DLL issues
        show            = False,      # Disable showing plots
    )

    best_weights = Path("runs/detect/merged_yolo_runs/brainware_v8v12v26/weights/best.pt").as_posix()
    print(f"\n✅ Training complete!")
    print(f"   Best weights: {best_weights}")
    print(f"   mAP50       : {results.results_dict.get('metrics/mAP50(B)', 'N/A')}")
    print(f"   mAP50-95    : {results.results_dict.get('metrics/mAP50-95(B)', 'N/A')}")

    return str(best_weights)


# ─────────────────────────────────────────────
# 7. VALIDATE
# ─────────────────────────────────────────────
def validate(best_weights: str, yaml_path: str, device: str):
    from ultralytics import YOLO

    print(f"\n📊 Validating best model...")
    model   = YOLO(best_weights)
    metrics = model.val(data=yaml_path, device=device, verbose=True)
    print(f"  mAP50    : {metrics.box.map50:.4f}")
    print(f"  mAP50-95 : {metrics.box.map:.4f}")
    print(f"  Precision: {metrics.box.mp:.4f}")
    print(f"  Recall   : {metrics.box.mr:.4f}")
    return metrics


# ─────────────────────────────────────────────
# 8. EXPORT (multiple formats)
# ─────────────────────────────────────────────
def export_model(best_weights: str, imgsz: int):
    from ultralytics import YOLO

    print(f"\n📤 Exporting model for fast inference...")
    model = YOLO(best_weights)

    exports = {
        "onnx"     : dict(format="onnx",      dynamic=True, simplify=True),  # Universal
        "torchscript": dict(format="torchscript"),                            # PyTorch mobile
    }

    # TensorRT only on GPU
    if torch.cuda.is_available():
        exports["tensorrt"] = dict(format="engine", half=True)   # 🔥 Fastest on NVIDIA

    for name, kwargs in exports.items():
        try:
            path = model.export(imgsz=imgsz, **kwargs)
            print(f"  ✅ {name:12s} → {path}")
        except Exception as e:
            print(f"  ⚠️  {name:12s} failed: {e}")


# ─────────────────────────────────────────────
# 9. PREDICT / INFERENCE
# ─────────────────────────────────────────────
def predict(best_weights: str, source: str, device: str):
    from ultralytics import YOLO

    print(f"\n🔍 Running inference on: {source}")
    model   = YOLO(best_weights)
    results = model.predict(
        source      = source,
        device      = device,
        conf        = 0.25,
        iou         = 0.45,
        save        = True,
        save_txt    = True,
        save_conf   = True,
        project     = "merged_yolo_runs/predictions",
        name        = "brainware_pred",
        exist_ok    = True,
    )
    for r in results:
        print(f"  Detected {len(r.boxes)} objects in {Path(r.path).name}")
    print("✅ Predictions saved to merged_yolo_runs/predictions/")


# ─────────────────────────────────────────────
# 10. MAIN PIPELINE
# ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  MERGED YOLO: YOLOv8 + YOLOv12 + YOLO26")
    print("  Dataset: brainware_pictures (Jadavpur Roboflow)")
    print("=" * 60)

    mode        = args.mode
    pkl_path    = "merged_v8_v12_v26.pkl"
    best_weights = "runs/detect/merged_yolo_runs/brainware_v8v12v26/weights/best.pt"

    # ── DOWNLOAD ONLY ────────────────────────────────────
    if mode == "download":
        install_deps()
        yaml_path = download_dataset()
        print(f"\n✅ Done. YAML: {yaml_path}")
        return

    # ── MERGE ONLY ───────────────────────────────────────
    if mode == "merge":
        install_deps()
        weights = download_base_weights()
        merge_weights(weights, pkl_path)
        return

    # ── TRAIN ONLY ───────────────────────────────────────
    if mode == "train":
        install_deps()
        yaml_path = download_dataset()
        
        # Adapter mode: skip training, use existing weights
        if args.adapter and Path(best_weights).exists():
            print(f"\n🔌 Adapter mode: Using existing trained weights")
            print(f"   Skipping training, using: {best_weights}")
            validate(best_weights, yaml_path, args.device)
            return
        
        # Resume mode: continue from existing checkpoint
        if args.resume and Path(best_weights).exists():
            print(f"\n🔄 Resume mode: Continuing from {best_weights}")
            model = YOLO(best_weights)
            # Reduce epochs for resume
            resume_epochs = min(args.epochs, 20)  # Only train a few more epochs
            best = train(model, yaml_path, resume_epochs, args.batch, args.imgsz, args.device)
            validate(best, yaml_path, args.device)
            return
        
        # Normal training
        weights   = download_base_weights()
        merge_weights(weights, pkl_path)
        model     = load_merged_model(pkl_path)
        best      = train(model, yaml_path, args.epochs, args.batch, args.imgsz, args.device)
        validate(best, yaml_path, args.device)
        return

    # ── EXPORT ONLY ──────────────────────────────────────
    if mode == "export":
        if not Path(best_weights).exists():
            print(f"❌ No trained model found at {best_weights}. Run training first.")
            sys.exit(1)
        export_model(best_weights, args.imgsz)
        return

    # ── PREDICT ONLY ─────────────────────────────────────
    if mode == "predict":
        if not args.source:
            print("❌ Provide --source path/to/image.jpg for predict mode.")
            sys.exit(1)
        if not Path(best_weights).exists():
            print(f"❌ No trained model at {best_weights}. Run training first.")
            sys.exit(1)
        predict(best_weights, args.source, args.device)
        return

    # ── ALL: Full Pipeline ───────────────────────────────
    if mode == "all":
        install_deps()
        yaml_path = download_dataset()
        weights   = download_base_weights()
        merge_weights(weights, pkl_path)
        model     = load_merged_model(pkl_path)
        best      = train(model, yaml_path, args.epochs, args.batch, args.imgsz, args.device)
        validate(best, yaml_path, args.device)
        export_model(best, args.imgsz)
        print("\n🎉 Full pipeline complete!")
        print(f"   Best model : {best}")
        print(f"   ONNX model : {best.replace('.pt', '.onnx')}")
        return


if __name__ == "__main__":
    main()