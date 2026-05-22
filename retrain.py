"""
Retrain Focus/Not-Focus detector on Brainware classroom dataset.
Replaces the 1-epoch (broken) model with a properly trained one.

Usage: python retrain.py
Output: runs/detect/merged_yolo_runs/brainware_v8v12v26/weights/best.pt
"""
from pathlib import Path
from ultralytics import YOLO

DATA_YAML = str(Path(__file__).parent / "Brainware_Pictures-2" / "data.yaml")

print("=" * 60)
print("  Focus/Not-Focus Classifier — Retraining")
print(f"  Dataset : {DATA_YAML}")
print(f"  Epochs  : 100")
print(f"  Device  : CPU  (GPU not available)")
print("=" * 60)

model = YOLO("yolov8n.pt")   # clean pretrained base

results = model.train(
    data            = DATA_YAML,
    epochs          = 100,
    imgsz           = 640,
    batch           = 16,
    device          = "cpu",
    workers         = 4,

    optimizer       = "AdamW",
    lr0             = 0.001,
    lrf             = 0.01,
    momentum        = 0.937,
    weight_decay    = 0.0005,
    warmup_epochs   = 2,        # short warmup → faster real training
    cos_lr          = True,

    freeze          = 10,       # freeze backbone → faster + prevents overfitting on 165 images
    amp             = True,
    cache           = "ram",

    mosaic          = 1.0,
    mixup           = 0.1,
    copy_paste      = 0.1,
    hsv_h           = 0.015,
    hsv_s           = 0.7,
    hsv_v           = 0.4,
    degrees         = 10.0,
    translate       = 0.1,
    scale           = 0.5,
    fliplr          = 0.5,

    save            = True,
    save_period     = 20,
    project         = "merged_yolo_runs",   # YOLO prepends runs/detect/ automatically
    name            = "brainware_v8v12v26",
    exist_ok        = True,
    verbose         = True,
    plots           = False,
    show            = False,
)

d = results.results_dict
print("\n" + "=" * 60)
print("  Training Complete")
print(f"  mAP50     : {d.get('metrics/mAP50(B)', 'N/A'):.4f}")
print(f"  mAP50-95  : {d.get('metrics/mAP50-95(B)', 'N/A'):.4f}")
print(f"  Precision : {d.get('metrics/precision(B)', 'N/A'):.4f}")
print(f"  Recall    : {d.get('metrics/recall(B)', 'N/A'):.4f}")
print("  Best weights: runs/detect/merged_yolo_runs/brainware_v8v12v26/weights/best.pt")
print("  Restart the backend to load the new model.")
print("=" * 60)
