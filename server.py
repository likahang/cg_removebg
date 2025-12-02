from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
from withoutbg import WithoutBG

app = FastAPI()

# CORS 設定：允許所有來源（生產環境建議限制為特定網域）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

print("Initializing WithoutBG model (may download resources on first run)...")
wbg = WithoutBG.opensource()
print("Model ready")


@app.post("/remove")
async def remove_bg(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1] or '.jpg'
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
            tmp_path = tmp_in.name
            content = await file.read()
            tmp_in.write(content)

        result_image = wbg.remove_background(tmp_path)

        out_fd, out_path = tempfile.mkstemp(suffix='.png')
        os.close(out_fd)
        result_image.save(out_path)

        # Use original filename (replace extension with .png) when returning
        orig_name = file.filename or 'result'
        base, _ = os.path.splitext(orig_name)
        out_name = f"{base}.png"
        return FileResponse(out_path, media_type='image/png', filename=out_name)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    print("Starting server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
