# 文档智能问答系统

这是一个基于 FastAPI 和 React 构建的文档智能问答系统，支持中英文文档的上传、管理和智能问答。

---

## 最终用户指南 (推荐)

此方法适用于希望直接运行应用的用户，无需关心代码和构建过程。

### 前置要求

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 运行应用

1.  创建一个空文件夹，例如 `my-app`。
2.  下载 `docker-compose.deploy.yml` 文件，并将其放入 `my-app` 文件夹中。
    > 您需要将该文件中的 `image` 地址 `ghcr.io/YOUR_USERNAME/YOUR_REPO_NAME:latest` 修改为发布者提供的正确镜像地址。
3.  在 `my-app` 文件夹中，再创建一个名为 `uploaded_files` 的空文件夹，用于存放您的文档数据。
4.  打开命令行（终端），进入 `my-app` 文件夹，然后运行以下命令：
    ```bash
    docker-compose -f docker-compose.deploy.yml up
    ```
5.  Docker 会自动下载应用镜像并启动。首次启动会下载镜像，之后会秒开。
6.  打开浏览器，访问 http://localhost:8004 即可开始使用。

---

## 开发者指南

此方法适用于希望自行构建或修改代码的开发者。

### 前置要求

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- 安装 Git

### 运行应用

1.  克隆项目代码：
    ```bash
    git clone <项目地址>
    cd <项目目录>
    ```
2.  启动应用：
    ```bash
    docker-compose up --build
    ```
    首次启动会下载依赖并构建镜像，可能需要几分钟时间。

3.  访问应用：
    打开浏览器，访问 http://localhost:8004

### 使用说明

1. 首次使用需要设置 DeepSeek API Key
   - 访问 [DeepSeek](https://platform.deepseek.com/) 注册账号并获取 API Key
   - 在应用中点击设置按钮，输入 API Key

2. 上传文档
   - 支持格式：.docx, .xlsx, .pdf
   - 文档会自动进行分析和索引
   - 支持文档分组管理

3. 智能问答
   - 选择要查询的文档或文档组
   - 输入问题，系统会基于选中的文档内容进行回答
   - 支持多轮对话，系统会保持上下文关联

### 数据存储

- 所有上传的文档和索引数据保存在 `backend/uploaded_files` 目录
- 该目录通过 Docker volume 映射，数据不会随容器删除而丢失

### 常用命令

```bash
# 启动应用
docker-compose up

# 在后台启动应用
docker-compose up -d

# 停止应用
docker-compose down

# 查看日志
docker-compose logs -f

# 重新构建并启动
docker-compose up --build
```

### 故障排除

1. 如果遇到端口占用问题，可以修改 `docker-compose.yml` 中的端口映射：
   ```yaml
   ports:
     - "新端口:8004"
   ```

2. 如果上传文件失败，请检查 `backend/uploaded_files` 目录权限是否正确

3. 如果遇到内存不足问题，可以在 Docker Desktop 的设置中增加容器可用内存

## 技术栈

- 后端：Python + FastAPI
- 前端：React + Vite
- 数据库：ChromaDB
- 文本处理：Tesseract OCR
- AI 模型：DeepSeek
- 容器化：Docker 