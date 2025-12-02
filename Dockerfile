# Python 後端 Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安裝系統依賴（WithoutBG 可能需要）
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt 並安裝 Python 套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製後端程式碼（只複製必要檔案，不包含 frontend）
COPY server.py .
COPY run.py .

# 暴露端口
EXPOSE 8000

# 啟動 FastAPI 伺服器（使用環境變數 PORT，Zeabur 會注入）
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
