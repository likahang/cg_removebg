# RemoveBG Frontend

Run locally:

1. Install dependencies (in PowerShell or cmd):

```
cd frontend
npm install
npm run dev
```

2. Start backend (from repo root):

```
python -m pip install -r requirements.txt
uvicorn server:app --reload
```

Frontend calls `http://127.0.0.1:8000/remove` to upload an image and receive a PNG with transparent background.
