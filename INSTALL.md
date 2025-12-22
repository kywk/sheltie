# 🚀 Sheltie 安裝指南

## 📋 系統需求

### 本地開發環境
- **Go**: 1.22 或更高版本
- **Node.js**: 20.x 或更高版本 (推薦使用 LTS 版本)
- **npm**: 隨 Node.js 安裝
- **Git**: 版本控制

### 生產部署環境
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.0 或更高版本

## 🛠️ Get Started - 本地開發

### 1. 克隆專案

```bash
git clone <repository-url>
cd sheltie
```

### 2. 後端設置

```bash
cd backend

# 安裝 Go 依賴
go mod tidy

# 設置環境變數 (可選)
export PORT=8080
export DB_PATH=./data/sheltie.db
export ADMIN_PASSWORD=admin123

# 啟動後端服務
go run main.go
```

後端服務將在 `http://localhost:8080` 啟動

### 3. 前端設置

開啟新的終端視窗：

```bash
cd frontend

# 安裝 npm 依賴
npm install

# 啟動開發服務器
npm run dev
```

前端開發服務器將在 `http://localhost:5173` 啟動

### 4. 開發模式訪問

- **前端開發**: http://localhost:5173
- **後端 API**: http://localhost:8080/api
- **管理介面**: http://localhost:5173/admin

### 5. 建構生產版本

```bash
# 建構前端
cd frontend
npm run build

# 建構後端
cd ../backend
go build -o sheltie-server .

# 啟動生產服務 (前端靜態檔案由後端提供)
./sheltie-server
```

## 🐳 Deploy - Docker 部署

### 1. 使用 Docker Compose (推薦)

```bash
# 設定管理員密碼
export ADMIN_PASSWORD=your_secure_password

# 啟動服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f sheltie
```

### 2. 使用 Docker 直接部署

```bash
# 建構映像檔
docker build -t sheltie .

# 建立資料目錄
mkdir -p ./data

# 啟動容器
docker run -d \
  --name sheltie \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PASSWORD=your_secure_password \
  sheltie
```

### 3. 服務管理

```bash
# 停止服務
docker-compose down

# 重啟服務
docker-compose restart

# 更新服務
docker-compose pull
docker-compose up -d

# 備份資料
cp ./data/sheltie.db ./backup/sheltie-$(date +%Y%m%d).db
```

## ⚙️ 環境變數配置

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `PORT` | `8080` | 服務埠號 |
| `DB_PATH` | `./data/sheltie.db` | SQLite 資料庫路徑 |
| `ADMIN_PASSWORD` | `admin123` | 管理員密碼 |
| `AUTO_SAVE_INTERVAL` | `30` | 自動儲存間隔 (秒) |

### 設定檔案方式

建立 `.env` 檔案：

```bash
PORT=8080
DB_PATH=./data/sheltie.db
ADMIN_PASSWORD=your_secure_password
AUTO_SAVE_INTERVAL=30
```

## 🔧 故障排除

### 常見問題

**1. 後端啟動失敗**
```bash
# 檢查 Go 版本
go version

# 檢查依賴
go mod tidy
go mod verify
```

**2. 前端建構失敗**
```bash
# 清除 node_modules 重新安裝
rm -rf node_modules package-lock.json
npm install
```

**3. 資料庫權限問題**
```bash
# 確保資料目錄存在且有寫入權限
mkdir -p ./data
chmod 755 ./data
```

**4. Docker 容器無法啟動**
```bash
# 檢查容器日誌
docker logs sheltie

# 檢查埠號是否被占用
lsof -i :8080
```

### 效能調優

**1. 生產環境建議**
- 使用 reverse proxy (nginx/traefik)
- 啟用 HTTPS
- 設定適當的資料庫備份策略

**2. 記憶體使用**
- Go 後端: ~50MB
- SQLite 資料庫: 依資料量而定
- 前端靜態檔案: ~10MB

## 🔐 安全性設定

### 1. 修改預設密碼

```bash
# 環境變數方式
export ADMIN_PASSWORD=your_strong_password

# Docker Compose 方式
echo "ADMIN_PASSWORD=your_strong_password" > .env
```

### 2. 資料庫安全

```bash
# 設定資料庫檔案權限
chmod 600 ./data/sheltie.db

# 定期備份
0 2 * * * cp /path/to/data/sheltie.db /path/to/backup/sheltie-$(date +\%Y\%m\%d).db
```

### 3. 網路安全

- 使用 HTTPS (建議透過 reverse proxy)
- 限制管理介面存取 IP
- 定期更新依賴套件

## 📊 監控與維護

### 健康檢查

```bash
# HTTP 健康檢查
curl -f http://localhost:8080/ || exit 1

# Docker 健康檢查 (已內建)
docker ps --filter "name=sheltie"
```

### 日誌管理

```bash
# Docker 日誌
docker-compose logs -f --tail=100 sheltie

# 本地開發日誌
# 後端日誌會輸出到 stdout
# 前端開發日誌在瀏覽器 console
```

### 資料備份

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp ./data/sheltie.db ./backup/sheltie_$DATE.db
echo "Backup completed: sheltie_$DATE.db"
```

## 🆙 升級指南

### 1. 本地開發升級

```bash
# 更新程式碼
git pull origin main

# 更新後端依賴
cd backend && go mod tidy

# 更新前端依賴
cd frontend && npm update
```

### 2. Docker 部署升級

```bash
# 停止服務
docker-compose down

# 備份資料
cp ./data/sheltie.db ./backup/

# 更新映像檔
docker-compose pull

# 重新啟動
docker-compose up -d
```

## 📞 技術支援

如遇到安裝或部署問題，請檢查：

1. 系統需求是否滿足
2. 環境變數是否正確設定
3. 埠號是否被其他服務占用
4. 檔案權限是否正確
5. 防火牆設定是否允許對應埠號

更多技術細節請參考 [README.md](README.md)。