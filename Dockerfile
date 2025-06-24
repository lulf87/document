# 使用 Node.js 构建前端
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 使用 Python 构建后端
FROM python:3.9-slim
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 复制并安装 Python 依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./backend/
# 复制模型文件
COPY paraphrase-multilingual-MiniLM-L12-v2/ ./paraphrase-multilingual-MiniLM-L12-v2/
# 复制前端构建文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建上传文件目录
RUN mkdir -p backend/uploaded_files/chroma_db

# 设置工作目录
WORKDIR /app/backend

# 设置环境变量
ENV PYTHONPATH=/app

# 暴露端口
EXPOSE 8004

# 启动命令
CMD ["python", "app.py"] 