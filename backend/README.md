# RecruitPro Backend — API Status

> Spring Boot 3.2.3 · Java 17 · PostgreSQL · Redis · JWT · MinIO

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <accessToken>` (all endpoints unless marked 🔓)

---

## ✅ Implemented (Sprint 1–3)

### 🔐 Authentication — 9 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | 🔓 | Company/JobSeeker registration |
| POST | `/auth/login` | 🔓 | Email + password login |
| POST | `/auth/refresh` | 🔓 | Rotate access + refresh tokens |
| POST | `/auth/logout` | ✅ | Revoke refresh token |
| POST | `/auth/verify-otp` | 🔓 | Verify OTP (account or reset) |
| POST | `/auth/resend-otp` | 🔓 | Resend verification OTP |
| POST | `/auth/forgot-password` | 🔓 | Request password reset OTP |
| POST | `/auth/reset-password` | 🔓 | Reset password with OTP |
| PUT | `/auth/change-password` | ✅ | Change password (logged in) |
| **GET** | **`/auth/me`** | ✅ | **Get current user info + company context** |

---

### 🏢 Company Profile — 9 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/companies` | 🔓 | Public company list |
| GET | `/companies/{id}` | 🔓 | Public company detail |
| **GET** | **`/company/profile`** | ✅ | **Own company profile** |
| PUT | `/company/profile` | ✅ | Update company info |
| POST | `/company/logo` | ✅ | Upload company logo |
| GET | `/company/addresses` | ✅ | List company addresses |
| POST | `/company/addresses` | ✅ | Add address |
| PUT | `/company/addresses/{id}` | ✅ | Edit address |
| DELETE | `/company/addresses/{id}` | ✅ | Delete address |
| **PATCH** | **`/company/addresses/{id}/default`** | ✅ | **Set default address** |
| PATCH | `/admin/companies/{id}/verify` | 🛡️ | Admin: verify company |

---

### 💼 Jobs — 8 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs` | 🔓 | Public job search (filters: keyword, type, level, location) |
| GET | `/jobs/{id}` | 🔓 | Public job detail |
| GET | `/company/jobs` | ✅ | Company's own jobs (all statuses) |
| POST | `/jobs` | ✅ | Create job |
| PUT | `/jobs/{id}` | ✅ | Edit job |
| DELETE | `/jobs/{id}` | ✅ | Soft-delete job |
| PATCH | `/jobs/{id}/status` | ✅ | Change status (DRAFT→PUBLISHED→CLOSED) |
| **GET** | **`/company/jobs/select-options`** | ✅ | **Lightweight list for filter dropdowns** |

---

### 📋 Applications — 5 endpoints *(NEW)*

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/applications` | ✅ | List with filters (status, jobId, search) + stats |
| GET | `/company/applications/{id}` | ✅ | Detail with AI score, timeline, resume URL |
| PATCH | `/company/applications/{id}/status` | ✅ | Update status (APPLIED→SCREENING→INTERVIEW→OFFER→HIRED/REJECTED) |
| GET | `/company/applications/{id}/resume` | ✅ | Resume download (presigned URL) |
| GET | `/company/applications/select-options` | ✅ | Dropdown data for interview scheduling |

---

### 📅 Interviews — 5 endpoints *(NEW)*

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/interviews` | ✅ | List with date range filter + stats |
| GET | `/company/interviews/{id}` | ✅ | Detail modal data |
| POST | `/company/interviews` | ✅ | Schedule interview (auto-updates app status) |
| PUT | `/company/interviews/{id}` | ✅ | Reschedule |
| PATCH | `/company/interviews/{id}/status` | ✅ | Complete/Cancel |

---

### 📊 Dashboard — 2 endpoints *(NEW)*

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/dashboard/stats` | ✅ | Aggregated counts + trends |
| GET | `/company/dashboard/recent-applications` | ✅ | Latest 5 applications |

---

### 🔧 Other Existing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | 🔓 | Health check |
| GET | `/skills` | 🔓 | Public skill list |

---

## 🔴 High Priority — Missing for Company FE

> These endpoints are needed by the Company Frontend but not yet implemented.
> The FE currently uses **mock data** at the hook level for these.

### 📊 Dashboard — Messages Count

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/dashboard/messages-count` | ✅ | Unread messages count for dashboard stat card |

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 12,
    "totalCount": 48
  },
  "error": null,
  "meta": null
}
```

---

## 🔜 Not Yet Implemented (Sprint 4–5)

### 💬 Messages — 6 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/company/messages/conversations` | Conversation list |
| GET | `/company/messages/conversations/{id}/messages` | Chat history |
| POST | `/company/messages/conversations` | Start conversation |
| POST | `/company/messages/conversations/{id}/messages` | Send text |
| PATCH | `/company/messages/conversations/{id}/read` | Mark read |
| POST | `/company/messages/conversations/{id}/attachments` | Send file |

### 🔔 Notifications — 3 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/company/notifications` | List with type filter |
| PATCH | `/company/notifications/read-all` | Bulk mark read |
| PATCH | `/company/notifications/{id}/read` | Single mark read |

### 👥 Staff Management — 4 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/company/staff` | List team members |
| POST | `/company/staff` | Create staff account |
| PUT | `/company/staff/{id}` | Edit name/role |
| DELETE | `/company/staff/{id}` | Remove member |

### 💳 Subscriptions & Payments — 6 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/company/subscription` | Current plan |
| GET | `/plans` | Public plan catalog |
| POST | `/company/subscription/upgrade` | Upgrade/change plan |
| GET | `/company/payments` | Payment history |
| POST | `/payments/callback/{gateway}` | Gateway webhook (VNPay/MoMo/Stripe) |

### 🔐 Auth — Remaining

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/oauth` | Social login (Google/GitHub) |

---

## Project Structure

```
src/main/java/com/recruitpro/
├── config/          # SecurityConfig, RedisConfig, AsyncConfig
├── controller/      # REST controllers (Auth, Company, Job, Application, Interview, Dashboard)
├── dto/
│   ├── request/     # Validated input DTOs
│   └── response/    # Output DTOs + ApiResponse envelope
├── exception/       # Domain exceptions + GlobalExceptionHandler
├── model/
│   └── enums/       # PostgreSQL named enums
├── repository/      # Spring Data JPA repositories (JPQL queries)
├── security/        # JWT filter, UserPrincipal
├── service/         # Business logic layer
├── storage/         # MinIO/S3 StorageService
└── cache/           # Redis CacheService
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Spring Boot 3.2.3 |
| Language | Java 17 |
| Database | PostgreSQL + Flyway migrations |
| Cache | Redis |
| Auth | JWT (jjwt 0.12.5) |
| Storage | MinIO (S3 SDK) |
| Mapping | MapStruct 1.5.5 |
| Docs | SpringDoc OpenAPI (Swagger) |
| Testing | JUnit 5 + Mockito + Testcontainers |

## Summary

| Status | Category | Endpoints |
|--------|----------|-----------|
| ✅ Done | Authentication | 10 |
| ✅ Done | Company Profile | 10 |
| ✅ Done | Jobs | 8 |
| ✅ Done | Applications | 5 |
| ✅ Done | Interviews | 5 |
| ✅ Done | Dashboard | 2 |
| 🔜 Todo | Messages | 6 |
| 🔜 Todo | Notifications | 3 |
| 🔜 Todo | Staff | 4 |
| 🔜 Todo | Subscriptions | 6 |
| | **Total** | **59** |
