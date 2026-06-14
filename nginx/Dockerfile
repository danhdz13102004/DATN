# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build: Job Seeker frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS jobseeker-build
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend-jobseeker/package*.json ./
RUN npm ci
COPY frontend-jobseeker/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build: Company frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS company-build
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend-company/package*.json ./
RUN npm ci
COPY frontend-company/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Build: Admin frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS admin-build
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend-admin/package*.json ./
RUN npm ci
COPY frontend-admin/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — Runtime: Central Nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built frontend assets into separate directories
COPY --from=jobseeker-build /app/dist /usr/share/nginx/html/jobseeker
COPY --from=company-build  /app/dist /usr/share/nginx/html/company
COPY --from=admin-build    /app/dist /usr/share/nginx/html/admin

# Copy Nginx config
COPY nginx/nginx.prod.conf /etc/nginx/nginx.conf

EXPOSE 80 8081 8082
CMD ["nginx", "-g", "daemon off;"]
