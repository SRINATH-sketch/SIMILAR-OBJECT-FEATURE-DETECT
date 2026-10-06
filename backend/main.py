import torch
import cv2
import numpy as np
import torchvision.transforms as T
import torch.nn.functional as F
import os
import base64
import sqlite3
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator

# =========================================================
# DEVICE
# =========================================================
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Device:", device)

# =========================================================
# LOAD DINOv2
# =========================================================
dino = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
dino.to(device)
dino.eval()

# =========================================================
# LOAD SAM
# =========================================================
if not os.path.exists("sam_vit_b_01ec64.pth"):
    os.system("wget -q https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth")

sam = sam_model_registry["vit_b"](checkpoint="sam_vit_b_01ec64.pth")
sam.to(device)

predictor = SamPredictor(sam)

mask_generator = SamAutomaticMaskGenerator(
    sam,
    points_per_side=16,
    pred_iou_thresh=0.9,
    stability_score_thresh=0.92,
    min_mask_region_area=500
)

# =========================================================
# IMAGE TRANSFORM
# =========================================================
transform = T.Compose([
    T.ToPILImage(),
    T.Resize((224,224)),
    T.ToTensor(),
    T.Normalize(mean=[0.5]*3, std=[0.5]*3)
])

def get_embedding(img):
    img = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        feat = dino(img)
    feat = F.normalize(feat, dim=1)
    return feat

# =========================================================
# FASTAPI APP SETUP
# =========================================================
app = FastAPI(title="PCB Feature Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# DB SETUP
# =========================================================
def init_db():
    conn = sqlite3.connect("history.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image TEXT,
            count TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class SaveRequest(BaseModel):
    image: str
    count: str

# Helper function to convert cv2 image to base64
def cv2_to_base64(img):
    # img is RGB, imencode expects BGR by default, but since we just encode the bytes,
    # let's convert back to BGR for standard jpeg encoding
    img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.jpg', img_bgr)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    # Dummy login for demonstration
    if username and password:
        return {"status": "success", "message": "Login successful", "token": "dummy-token-123"}
    return {"status": "error", "message": "Invalid credentials"}

@app.post("/signup")
async def signup(username: str = Form(...), password: str = Form(...), email: str = Form(...)):
    # Dummy signup for demonstration
    if username and password and email:
        return {"status": "success", "message": "Signup successful"}
    return {"status": "error", "message": "Missing fields"}

@app.post("/save")
async def save_history(request: SaveRequest):
    try:
        conn = sqlite3.connect("history.db")
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("INSERT INTO history (image, count, timestamp) VALUES (?, ?, ?)", 
                       (request.image, request.count, timestamp))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Saved successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/history")
async def get_history():
    try:
        conn = sqlite3.connect("history.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM history ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        return {"status": "success", "history": [dict(row) for row in rows]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/detect")
async def detect_similar(
    file: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    top_k: int = Form(5),
    min_sim: float = Form(0.75)
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        return {"error": "Invalid image"}

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    predictor.set_image(image)

    output = image.copy()

    # Draw clicked point
    cv2.circle(output, (x, y), 8, (255, 0, 0), -1)

    input_point = np.array([[x, y]])
    input_label = np.array([1])

    masks_click, _, _ = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=False,
    )

    selected_mask = masks_click[0]
    ys, xs = np.where(selected_mask)

    if len(xs) == 0 or len(ys) == 0:
        return {"error": "No object detected at clicked point"}

    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()

    selected_crop = image[y_min:y_max, x_min:x_max]
    masked_selected = selected_crop.copy()
    mask_crop = selected_mask[y_min:y_max, x_min:x_max]
    masked_selected[~mask_crop] = 0

    selected_emb = get_embedding(masked_selected)

    masks = mask_generator.generate(image)

    similarities = []
    gallery_images = []

    for mask_data in masks:
        mask = mask_data['segmentation']
        x_box, y_box, w, h = mask_data['bbox']

        # Skip same region using IoU
        intersection = np.logical_and(mask, selected_mask).sum()
        union = np.logical_or(mask, selected_mask).sum()
        iou = intersection / union if union != 0 else 0

        if iou > 0.8:
            continue

        ys2, xs2 = np.where(mask)
        if len(xs2) == 0 or len(ys2) == 0:
            continue

        x_min2, x_max2 = xs2.min(), xs2.max()
        y_min2, y_max2 = ys2.min(), ys2.max()

        crop = image[y_min2:y_max2, x_min2:x_max2]

        if crop.shape[0] < 20 or crop.shape[1] < 20:
            continue

        masked_crop = crop.copy()
        mask_crop2 = mask[y_min2:y_max2, x_min2:x_max2]
        masked_crop[~mask_crop2] = 0

        emb = get_embedding(masked_crop)
        sim = F.cosine_similarity(selected_emb, emb).item()

        similarities.append((sim, mask, (x_box, y_box, w, h), crop))

    similarities.sort(reverse=True, key=lambda x: x[0])

    found_count = 0

    for sim, mask, (x_box, y_box, w, h), crop in similarities[:top_k]:
        if sim < min_sim:
            continue

        found_count += 1

        # Highlight region
        overlay = output.copy()
        overlay[mask] = (0, 255, 0)
        output = cv2.addWeighted(overlay, 0.4, output, 0.6, 0)

        cv2.rectangle(output,
                      (x_box, y_box),
                      (x_box + w, y_box + h),
                      (0, 255, 0),
                      2)

        cv2.putText(output,
                    f"{sim:.2f}",
                    (x_box, y_box - 8),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2)

        gallery_images.append({
            "image": cv2_to_base64(crop),
            "similarity": f"{sim:.2f}"
        })

    annotated_base64 = cv2_to_base64(output)

    return {
        "annotated_image": annotated_base64,
        "gallery": gallery_images,
        "message": f"Similar Components Found: {found_count}"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)