# =====================================
# Sheltie - Multi-stage Docker Build
# =====================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
COPY border-collie/ ./border-collie/
RUN cd frontend && npm run build

# Stage 2: Build Backend
FROM golang:1.22-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -o sheltie-server .

# Stage 3: Final Image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=backend-builder /app/backend/sheltie-server .
COPY --from=frontend-builder /app/frontend/dist ./static

RUN mkdir -p /app/data

ENV PORT=8080
ENV DB_PATH=/app/data/sheltie.db
ENV ADMIN_PASSWORD=admin123
ENV BASE_PATH=

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
