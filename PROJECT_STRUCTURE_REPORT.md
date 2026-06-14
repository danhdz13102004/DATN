# RecruitPro — Project Structure Report

> Generated: June 8, 2026
> System: AI-Powered Job Recruitment Platform

---

## 1. Project Overview

**RecruitPro** is a full-stack, AI-powered job recruitment platform built with a microservices-style architecture. It enables three distinct user roles — job seekers, companies, and administrators — to interact through separate front-end applications, all backed by a unified Java REST API, an AI/ML recommendation service, and shared infrastructure services.

### Technology Stack at a Glance

| Component | Technology | Port |
|---|---|---|
| Backend API | Java 17 + Spring Boot 3.2.3 | 8080 |
| Frontend — Job Seeker | React 18 + Vite + TypeScript | 3000 |
| Frontend — Company | React 18 + Vite + TypeScript | 3001 |
| Frontend — Admin | React 18 + Vite + TypeScript | 3002 |
| AI / ML Service | Python 3.11 + FastAPI | 8000 |
| Database | PostgreSQL 16 + pgvector | 5432 |
| Cache / Pub-Sub | Redis 7 | 6379 |
| Object Storage | MinIO (S3-compatible) | 9000 / 9001 |
| AI Embeddings | Sentence Transformers (MPNet) + GraphSAGE (PyG) | — |

---

## 2. General Folder Structure

```
Design DB/
├── backend/                      # Java 17 Spring Boot REST API
├── frontend-admin/              # React SPA — Admin dashboard
├── frontend-company/            # React SPA — Company management portal
├── frontend-jobseeker/          # React SPA — Job seeker portal
├── ai-service/                  # Python FastAPI ML recommendation service
├── Design/                      # Database schema, API specs, UI mockups
├── docker-compose.yml           # Production compose file
├── docker-compose.dev.yml       # Development compose overrides (hot reload)
├── Makefile                     # Development shortcuts (make up, make logs, etc.)
├── justfile                     # Alternative task runner (prod commands)
├── .env.example                 # Environment variable template
├── .github/                    # GitHub workflows and PR templates
├── production_architecture.py   # GraphSAGE training pipeline documentation
└── README.md                   # Quick start guide
```

### Purpose of Each Top-Level Directory

- **`backend/`** — The core REST API server. Handles authentication, business logic, database operations, file storage, real-time chat, and integrations with AI and payment services.
- **`frontend-admin/`** — An internal dashboard for platform administrators to manage users, companies, jobs, applications, and subscriptions.
- **`frontend-company/`** — A portal for companies to post jobs, manage staff, review applications, conduct interviews, and chat with candidates.
- **`frontend-jobseeker/`** — A public-facing portal for job seekers to browse and search jobs, apply, save jobs, view recommendations, and manage their profile.
- **`ai-service/`** — A Python microservice that provides job recommendations using GraphSAGE graph neural networks and sentence-transformer embeddings, along with PDF OCR and matching scoring.
- **`Design/`** — Contains DBML schema files (database design), API specification markdown, and UI/UX design assets.

---

## 3. Detailed Explanation of Main Folders

---

### 3.1 `backend/` — Java Spring Boot API

This is the central hub of the entire platform. Every frontend communicates with it through REST endpoints (and WebSocket for real-time features).

#### Key Files at Root

- `pom.xml` — Maven build configuration; declares all Spring Boot starters, JWT libraries, MapStruct, Stripe SDK, PostgreSQL drivers, Redis, and Testcontainers.
- `Dockerfile` — Multi-stage production build: Maven builder stage → JRE runtime stage.
- `Dockerfile.dev` — Development build with source bind-mounts for hot reload.
- `entrypoint-dev.sh` — Development startup script.

#### `src/main/resources/`

- **`application.yml`** — Main configuration: database pool (HikariCP, max 20 connections), JPA/Flyway settings, Redis host, mail SMTP, JWT secrets, CORS origins, AI service URL, MinIO credentials, Stripe keys, Google OAuth2, and OpenAI settings.
- **`application-dev.yml`** — Development overrides enabling SQL logging, Spring DevTools, and seed data.
- **`db/migration/`** — 46 Flyway SQL migration files (V1 through V46) that define the entire PostgreSQL schema: table creation, indexes, constraints, JSONB columns, and enum types.

#### Package: `controller/` — 28 REST Controllers

| Controller | Role | Base Path |
|---|---|---|
| `AuthController` | Login, register, OTP, refresh tokens | `/api/v1/auth` |
| `JobController` | Public job listing and search | `/api/v1/jobs` |
| `SkillController` | Public skill listing | `/api/v1/skills` |
| `IndustryController` | Public industry listing | `/api/v1/industries` |
| `CompanyController` | Public company profile | `/api/v1/companies` |
| `JobSeekerController` | Job seeker profile management | `/api/v1/jobseeker` |
| `JobSeekerApplicationController` | Applications, recommendations, saved jobs | `/api/v1/jobseeker` |
| `JobSeekerDashboardController` | Dashboard stats for job seekers | `/api/v1/jobseeker` |
| `JobSeekerInterviewController` | Job seeker interview listing | `/api/v1/jobseeker` |
| `SavedJobController` | Save/unsave jobs | `/api/v1/jobseeker` |
| `ResumeController` | Resume upload and management | `/api/v1/resumes` |
| `NotificationController` | User notifications | `/api/v1/notifications` |
| `CompanyJobController` | Company job CRUD (create, update, publish) | `/api/v1/company` |
| `CompanyProfileController` | Company profile and address management | `/api/v1/company` |
| `CompanySubscriptionController` | Company subscription and plans | `/api/v1/company` |
| `ApplicationController` | Company view of received applications | `/api/v1/company` |
| `InterviewController` | Interview scheduling and management | `/api/v1/company` |
| `ChatController` | Chat message history | `/api/v1/company` |
| `JobInteractionController` | Track job view/save/apply events | `/api/v1/company` |
| `AdminUserController` | Admin: manage users | `/api/v1/admin/users` |
| `AdminCompanyController` | Admin: manage companies | `/api/v1/admin/companies` |
| `AdminJobController` | Admin: view/delete jobs | `/api/v1/admin/jobs` |
| `AdminApplicationController` | Admin: view applications | `/api/v1/admin/applications` |
| `AdminStatsController` | Admin: platform statistics | `/api/v1/admin/stats` |
| `AdminSubscriptionController` | Admin: manage subscriptions | `/api/v1/admin/subscriptions` |
| `DashboardController` | Admin: dashboard data | `/api/v1/admin/dashboard` |
| `StripeWebhookController` | Stripe payment webhooks | `/api/v1/stripe` |
| `HealthController` | Health check endpoint | `/api/v1/health` |

#### Package: `model/` — 21 JPA Entities + 16 Enums

Core entities and their key fields:

| Entity | Table | Key Fields |
|---|---|---|
| `User` | `users` | id (UUID), email, passwordHash, role, fullName, status, googleId, avatarUrl, soft-delete |
| `Company` | `companies` | name, description, website, logoUrl, verified, blocked, employeeCountMin/Max, benefits, foundedAt |
| `CompanyAddress` | `company_addresses` | companyId, label, addressLine, city, country, isDefault |
| `Staff` | `staff` | userId, companyId, role (OWNER / HR / RECRUITER) |
| `JobSeeker` | `job_seekers` | userId (@OneToOne), avatarUrl, bio, location, experienceYears, skills (@ManyToMany) |
| `Job` | `jobs` | companyId, title, description, industry, responsibilities[], requirements[], niceToHaveSkills[], jobDataStructure (JSONB), experienceLevels (@ElementCollection), salaryMin/Max, jobType, status, skills (@ManyToMany), soft-delete |
| `Application` | `applications` | jobId, jobSeekerId, resumeId, aiScore, jsonMatching (JSONB), status, coverLetter, soft-delete |
| `Resume` | `resumes` | jobSeekerId, fileUrl, parsedText, label, fileSize, isPrimary, resumeDataStructure (JSONB), soft-delete |
| `Interview` | `interviews` | applicationId, interviewerId (Staff), scheduledTime, meetingType, meetingLink, status, note |
| `Conversation` | `conversations` | applicationId, staffId, jobSeekerId, isInitiated |
| `Message` | `messages` | conversationId, senderId, content, type (TEXT/FILE), fileKey, idempotencyKey |
| `MessageRead` | `message_reads` | conversationId, userId, lastReadMessageId, readAt |
| `Notification` | `notifications` | userId, type, title, content, isRead, referenceId, referenceType |
| `SavedJob` | `saved_jobs` | jobSeekerId, jobId (unique) |
| `JobInteraction` | `job_interactions` | jobSeekerId (nullable), jobId, eventType (click/save/apply), metadata (JSONB) |
| `Plan` | `plans` | name, price, jobPostLimit, durationDays, allowUseAiMatching, autoFillLimit |
| `Subscription` | `subscriptions` | companyId, planId, startDate, endDate, status, jobsPostedCount, allowUseAiMatching, autoFillUsageCount |
| `Payment` | `payments` | companyId, subscriptionId (nullable), amount, currency, gateway, status, transactionId, stripeSessionId |
| `Otp` | `otps` | email, code, type, used, attempts, expiresAt |
| `Skill` | `skills` | name (unique) |
| `Industry` | `industries` | name (unique) |

Key enums: `UserRole` (ADMIN / COMPANY / JOBSEEKER), `JobStatus` (DRAFT / PUBLISHED / CLOSED / ARCHIVED), `JobType` (FULLTIME / PARTTIME / REMOTE / HYBRID), `ExperienceLevel` (INTERN / FRESHER / JUNIOR / MIDDLE / SENIOR / LEADER), `ApplicationStatus`, `InterviewStatus`, `MeetingType` (ONLINE / OFFLINE), `NotificationType` (JOB_APPLIED / INTERVIEW_INVITE / MESSAGE / APPLICATION_UPDATE / JOB_DELETED), `SubscriptionStatus`, `PaymentGateway` (VNPAY / MOMO / STRIPE), `InteractionEventType`.

#### Package: `service/` — 28 Service Classes

Business logic is organized by domain. Key services include:

- **`JobService`** — Job CRUD, search/filter, soft-delete (notifies company on admin deletion)
- **`ApplicationService`** — Application submission, status updates, AI matching score retrieval
- **`AuthService`** — Login, registration, OTP generation/verification, JWT refresh, Google OAuth
- **`ResumeService`** — Resume upload to MinIO, PDF parsing via `ResumePdfParser`, OpenAI structuring via `OpenAiResumeStructuringService`
- **`AiServiceClient`** — HTTP client that calls the AI service at `http://ai-service:8000` for recommendations and matching
- **`JobAutoFillService`** — Uses OCR + OpenAI to extract structured job data from uploaded files
- **`NotificationService`** — Creates and delivers notifications (in-app + Redis pub/sub for real-time)
- **`MessageService` / `ConversationService`** — Chat message persistence and conversation management
- **`CompanyService`** / **`StaffService`** — Company profile and staff management with role-based access
- **`JobInteractionService`** — Logs click/save/apply events with JSONB metadata
- **`CompanySubscriptionService`** / **`AdminSubscriptionService`** — Subscription lifecycle and plan management
- **`DashboardService`** / **`JobSeekerDashboardService`** — Aggregated statistics for dashboards

#### Package: `security/`

- **`JwtUtil.java`** — Generates and validates HS256 JWTs (access token: 15 min, refresh token: 7 days). Includes `companyId` and `companyRole` claims for COMPANY role tokens.
- **`JwtAuthenticationFilter.java`** — `OncePerRequestFilter` that extracts the Bearer token from the `Authorization` header, validates it, sets the Spring Security context, and blocks requests from blocked companies.
- **`UserPrincipal.java`** — Immutable value object holding `id`, `email`, `role`, `companyId`, `companyRole`.

#### Package: `config/`

- **`SecurityConfig.java`** — Stateless JWT authentication, public endpoints (`/api/v1/auth/**`, `/api/v1/health`, `/api/v1/jobs/**`), CORS configuration, role-based access rules (ADMIN role required for `/api/v1/admin/**`), custom 401/403 error handlers.
- **`WebSocketConfig.java`** — STOMP broker at `/ws` (SockJS fallback) and `/ws-native`, user destination prefix `/user`.
- **`RedisConfig.java`** — `StringRedisTemplate` bean.
- **`RedisPubSubConfig.java`** — Subscribes to channels `redis:channel:chat:*`, `redis:channel:read-receipt:*`, `redis:channel:notification:*`.
- **`AiServiceConfig.java`** — Two `RestTemplate` beans: `aiRestTemplate` (5s connect, 30s read) for recommendations; `ocrRestTemplate` (10s connect, 120s read) for PDF parsing.
- **`OpenAiConfig.java`** — `RestTemplate` with OpenAI API key header.
- **`StripeConfig.java`** — Initializes `Stripe.apiKey` at startup.
- **`GoogleOAuth2Config.java`** — Google REST client at `https://oauth2.googleapis.com`.
- **`DataSeeder.java`** — Seeds 52 skills and 3 plans (Free / Pro / Premium) on dev/test profiles.
- **`AsyncConfig.java`** — `@EnableAsync` for background job processing.
- **`JacksonConfig.java`** — Registers Hibernate6Module + JavaTimeModule; disables `FAIL_ON_EMPTY_BEANS`.

#### Package: `cache/`

- **`CacheService.java`** — Generic Redis string cache with namespaced keys and configurable TTL.
- **`ChatCacheService.java`** — Idempotency slots (SETNX with 24h TTL) and user presence tracking (30s TTL).
- **`RedisPublisher.java`** — Serializes objects to JSON and publishes to Redis channels.

#### Package: `chat/`

Real-time messaging using WebSocket (STOMP) + Redis fan-out:

- **`ChatMessageHandler.java`** — `@MessageMapping("/chat.send")` and `/chat.read`. Only COMPANY users can initiate conversations. Publishes to Redis, creates a notification.
- **`JwtChannelInterceptor.java`** — STOMP `ChannelInterceptor` for CONNECT (JWT auth) and SUBSCRIBE (validates user is a conversation participant).
- **`ChatRedisSubscriber.java`** — Listens on Redis `chat:*` channels and forwards messages to STOMP `/topic/chat.{conversationId}`.
- **`NotificationRedisSubscriber.java`** — Listens on Redis `notification:*` channels and forwards to STOMP `/user/{userId}/queue/notification`.

#### Package: `dto/`

- **`AiMatchingResult.java`** — Score breakdown (`overallScore`, `skills`, `experience`, `seniority`, `industry`, `niceToHaveSkills`) stored as JSONB in `Application.jsonMatching`.
- **`ResumeDataStructure.java`** — Structured resume data (`role`, `seniority`, `yearsExperience`, `industry`, `skills`, `summary`, `experienceBullets`) extracted from PDF via OpenAI.
- **`JobAutoFillDto.java`** — Job field data extracted from uploaded files via OCR + OpenAI.
- 8 chat DTOs, 17 request DTOs, 32 response DTOs organized into `chat/`, `request/`, `response/` subpackages.

#### Package: `storage/`

- **`StorageService.java`** — MinIO/S3-compatible object storage. Methods: `upload()`, `getDownloadUrl()` (1-hour pre-signed URL), `downloadAsBytes()`, `delete()`, `exists()`, `getPublicUrl()`.

#### Package: `util/`

- **`JsonbConverter.java`** — JPA `AttributeConverter` that serializes PostgreSQL JSONB columns to/from Java objects using Jackson.

#### Package: `exception/`

Custom exceptions handled by `@ControllerAdvice`:

`ResourceNotFoundException` (404), `DuplicateResourceException` (409), `UnauthorizedException` (401), `ForbiddenException` (403), `BadRequestException` (400), `RateLimitException` (429), `AiServiceException` (503), `GlobalExceptionHandler`.

---

### 3.2 `ai-service/` — Python FastAPI ML Service

The AI service provides three core capabilities: **job recommendations** (GraphSAGE graph neural network), **candidate-job matching scoring**, and **resume parsing / OCR**.

#### Directory Structure

```
ai-service/
├── Dockerfile
├── Dockerfile.dev
├── requirements.txt
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── core/
│   │   └── config.py              # Environment variable settings
│   ├── api/
│   │   ├── health.py              # GET /api/v1/health
│   │   ├── recommendations.py    # GET /api/v1/recommendations/{user_id}
│   │   ├── matching.py            # POST /api/v1/matching/score
│   │   ├── graph.py               # Graph management endpoints
│   │   └── parse_pdf.py           # POST /api/v1/parse/pdf
│   ├── ml/
│   │   ├── model_registry.py      # Model loading and version management
│   │   └── matching.py            # Matching score computation
│   ├── services/
│   │   ├── recommendation_service.py  # GraphSAGE + cosine similarity
│   │   ├── graph_store.py         # Graph data management
│   │   └── ocr_service.py         # PDF text extraction
│   ├── models/
│   │   └── schemas.py             # Pydantic request/response models
│   └── docs/
│       └── MATCHING_RECOMMENDATION_SYSTEM.md  # System design document
├── scripts/
│   ├── seed_graph.py              # Populate the graph from DB data
│   └── ... (other scripts)
├── tests/
│   ├── conftest.py
│   ├── test_graphsage_local.py
│   └── ... (other tests)
└── models/                        # Pre-trained model weights (gitignored)
```

#### Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/recommendations/{user_id}` | Top-K job recommendations for a user (GraphSAGE + cosine similarity) |
| POST | `/api/v1/matching/score` | Score a candidate against a job (feature-based + optional GNN) |
| POST | `/api/v1/matching/batch` | Batch score multiple candidates for a job |
| GET | `/api/v1/graph/stats` | Graph statistics |
| POST | `/api/v1/graph/rebuild` | Rebuild the entire graph from database |
| POST | `/api/v1/graph/add-node` | Add a new node (user or job) to the graph |
| POST | `/api/v1/parse/pdf` | Extract text from PDF via OCR |

#### Recommendation Algorithm

The system uses a **two-phase approach**:

1. **Offline / Training Phase** (runs daily/weekly): Loads the full bipartite graph of users and jobs, runs **GraphSAGE** (via PyTorch Geometric) to learn node embeddings that capture both user/job features and relational structure from application edges. All embeddings are stored in PostgreSQL (via pgvector).

2. **Online / Serving Phase** (real-time): Loads the user's pre-computed embedding from the database, computes **cosine similarity** against all job embeddings, filters out already-applied jobs, and returns the top-K results. This phase does **not** require the graph and completes in milliseconds.

**New users** without graph history are handled with **MPNet sentence-transformer** embeddings directly from their resume text. As they accumulate application history, their embeddings are refined by the graph model during the next batch retraining.

#### `production_architecture.py`

Located at the project root, this file documents the complete GraphSAGE training pipeline in detail, including how to handle new users, new jobs, and periodic batch retraining.

---

### 3.3 `frontend-jobseeker/` — Job Seeker React SPA

A public-facing SPA for job seekers. Runs on port 3000.

#### Tech Stack

- **React 18** + TypeScript
- **Vite** build tool
- **React Router v6** — routing with lazy-loaded pages
- **TanStack React Query v5** — server state management (staleTime: 5 min, retry: 1)
- **Zustand** — auth state persisted to localStorage
- **Tailwind CSS** — styling
- **React Hook Form** — form handling
- **Axios** — HTTP client with JWT interceptors
- **STOMP.js + SockJS-client** — real-time chat and notifications

#### Directory Structure

```
frontend-jobseeker/src/
├── App.tsx                       # Root: lazy-loaded routes, auth-aware layout switching
├── main.tsx                      # QueryClientProvider, BrowserRouter, ToastProvider
├── index.css
├── components/
│   ├── common/                   # 14 shared components (Badge, EmptyState, DataTable, etc.)
│   ├── jobs/                     # Job-related components
│   │   ├── JobCard.tsx           # Standard job card with hover animations
│   │   ├── RecommendedJobCard.tsx # AI-recommended card with match score badge
│   │   ├── JobFilterPanel.tsx      # Filter controls (type, level, salary, location)
│   │   ├── BrowseJobsHeader.tsx   # Hero header with total job count
│   │   ├── JobTabs.tsx            # Tab switcher (All / Recommended / Saved)
│   │   ├── MatchScoreBadge.tsx     # AI match percentage display
│   │   └── ...
│   ├── layout/
│   │   ├── MainLayout.tsx         # Authenticated layout (sidebar + topbar)
│   │   ├── PublicLayout.tsx        # Guest layout (minimal header)
│   │   ├── Sidebar.tsx             # Left navigation sidebar
│   │   └── Topbar.tsx              # Top navigation bar
│   └── ui/                        # Modals (LogoutModal, ChangePasswordModal)
├── constants/
│   └── index.ts                  # Route constants
├── contexts/
│   └── ToastContext.tsx           # Toast notification context
├── hooks/
│   ├── useWebSocket.ts            # STOMP WebSocket connection management
│   └── useChangePassword.ts       # Change password mutation hook
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   └── VerifyOtpPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── jobs/
│   │   ├── JobsPage.tsx           # Three-tab view: browse, recommended, saved
│   │   └── JobDetailPage.tsx      # Full job detail (1390 lines): apply, save, share
│   ├── applications/
│   │   ├── ApplicationsPage.tsx
│   │   └── ApplicationDetailPage.tsx
│   ├── interviews/
│   │   └── InterviewsPage.tsx
│   ├── resumes/
│   │   └── ResumesPage.tsx
│   ├── profile/
│   │   └── ProfilePage.tsx
│   ├── chat/
│   │   ├── ChatListPage.tsx
│   │   └── ChatRoomPage.tsx
│   └── notifications/
│       └── NotificationsPage.tsx
├── routes/
│   └── PrivateRoute.tsx           # Redirects to /login if not authenticated
├── services/
│   ├── api.ts                    # Axios instance with JWT + refresh interceptors
│   ├── authService.ts
│   ├── jobService.ts             # listJobs, getJobById, saveJob, unsaveJob, getRecommendations, logInteraction
│   ├── applicationService.ts
│   ├── resumeService.ts
│   ├── dashboardService.ts
│   ├── interviewService.ts
│   └── chatService.ts
├── store/
│   └── authStore.ts              # Zustand store: user, tokens, isAuthenticated
└── types/
    ├── job.ts                    # Job, Skill, Industry, JobFilter, SavedJobDto
    ├── auth.ts
    ├── application.ts
    ├── chat.ts
    ├── interview.ts
    ├── resume.ts
    ├── jobseeker.ts
    └── common.ts
```

#### `JobsPage.tsx` — Three-Tab Architecture

The jobs page (`JobsPage.tsx`, 818 lines) operates in three modes:

1. **All Jobs** — Standard grid with filter panel, keyword search, pagination.
2. **Recommended** — AI-powered job recommendations. Supports two recommendation modes:
   - `resume` mode: Uses the job seeker's uploaded resume to find matching jobs.
   - `activity` mode: Uses application/interaction history for personalized recommendations.
3. **Saved** — Jobs the user bookmarked, with inline unsave toggle.

#### `JobDetailPage.tsx` — Feature Highlights (1390 lines)

- Debounced visibility-timer click interaction logging (5s after element becomes visible)
- Apply workflow: resume selection, optional cover letter, `applicationService.apply()`
- Save/unsave with optimistic UI
- Share link (clipboard copy)
- Company card sidebar with external website link
- Mobile sticky apply button
- Loading skeleton state

---

### 3.4 `frontend-company/` — Company Portal React SPA

A portal for company staff (OWNER, HR, RECRUITER) to manage their company's presence on the platform. Runs on port 3001.

#### Tech Stack

Same as `frontend-jobseeker`: React 18, TypeScript, Vite, React Router v6, TanStack Query v5, Zustand, Tailwind CSS, React Hook Form, Axios, STOMP.js.

#### Directory Structure (Key Files)

```
frontend-company/src/
├── App.tsx
├── main.tsx
├── components/
│   ├── layout/                    # MainLayout, Sidebar, Topbar
│   ├── common/                    # Shared UI components
│   └── ui/                        # Modals and utility components
├── constants/
│   └── index.ts                  # Route constants and string literals
├── contexts/
│   └── ToastContext.tsx
├── hooks/
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx        # Company registration
│   ├── company/
│   │   ├── CompanyProfilePage.tsx # Edit company profile, addresses, benefits
│   │   └── staff/
│   │       └── StaffManagementPage.tsx  # Invite/manage staff with roles
│   ├── jobs/
│   │   ├── JobListPage.tsx       # Company's posted jobs
│   │   ├── JobFormPage.tsx       # Create/edit job with AI auto-fill
│   │   └── JobDetailPage.tsx
│   ├── applications/
│   │   ├── ApplicationsPage.tsx   # Received applications with AI scoring
│   │   └── ApplicationDetailPage.tsx
│   ├── interviews/
│   │   └── InterviewsPage.tsx    # Schedule and manage interviews
│   ├── chat/
│   │   └── ChatPage.tsx          # Real-time chat with candidates
│   ├── notifications/
│   │   └── NotificationsPage.tsx
│   └── subscriptions/
│       └── SubscriptionPage.tsx   # View/upgrade subscription plan
├── routes/
│   └── PrivateRoute.tsx
├── services/
│   ├── api.ts                   # Axios with JWT + auto-refresh
│   ├── companyService.ts         # Profile, addresses, benefits CRUD
│   ├── authService.ts
│   ├── jobService.ts
│   ├── applicationService.ts
│   ├── interviewService.ts
│   └── chatService.ts
├── store/
│   └── authStore.ts
└── types/
    ├── auth.ts
    ├── company.ts
    ├── chat.ts
    └── ...
```

#### `StaffManagementPage.tsx` — Role-Based Staff System

Companies can invite staff members with three roles:
- **OWNER** — Full access, can manage billing and delete the company
- **HR** — Can post jobs, manage applications, conduct interviews
- **RECRUITER** — Can view applications and chat with candidates

---

### 3.5 `frontend-admin/` — Admin Dashboard React SPA

An internal tool for platform administrators. Runs on port 3002.

#### Tech Stack

Same core stack as the other frontends: React 18, TypeScript, Vite, React Router v6, TanStack Query v5, Zustand, Tailwind CSS, React Hook Form, Axios.

#### Directory Structure

```
frontend-admin/src/
├── App.tsx                       # Lazy-loaded routes under DashboardLayout
├── main.tsx                      # QueryClientProvider, BrowserRouter, ToastProvider
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx   # Sidebar + outlet
│   │   ├── Sidebar.tsx           # Admin navigation
│   │   └── Topbar.tsx
│   └── ui/
│       ├── StatusBadge.tsx        # Color-coded status badges
│       ├── Pagination.tsx         # Table pagination
│       └── LogoutModal.tsx
├── constants/
│   └── index.ts                 # Route constants and auth string literals
├── contexts/
│   └── ToastContext.tsx
├── hooks/                        # One hook per domain
│   ├── useAdminJobs.ts           # listJobs, getJobDetail, deleteJob
│   ├── useAdminUsers.ts
│   ├── useAdminCompanies.ts
│   ├── useAdminApplications.ts
│   ├── useAdminSubscriptions.ts
│   ├── useAdminStats.ts
│   ├── useAdminSkills.ts
│   └── useAdminIndustries.ts
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx    # Platform-wide statistics
│   ├── users/
│   │   └── UsersPage.tsx        # User management with status filters
│   ├── companies/
│   │   ├── CompaniesPage.tsx    # Company list with verify/block actions
│   │   └── CompanyDetailPage.tsx # Company detail with staff and job lists
│   ├── jobs/
│   │   ├── JobsPage.tsx          # Job list with status filters
│   │   └── JobDetailPage.tsx     # Job detail with delete action
│   ├── applications/
│   │   └── ApplicationsPage.tsx # Application list with status filters
│   ├── subscriptions/
│   │   └── SubscriptionsPage.tsx # Subscription and plan management
│   └── skills/
│       └── SkillsIndustriesPage.tsx # Manage skills and industries
├── routes/
│   └── PrivateRoute.tsx         # Redirects to /login if not authenticated
├── services/                     # One service per domain
│   ├── api.ts                   # Axios with JWT + auto-refresh
│   ├── adminJobService.ts
│   ├── adminUserService.ts
│   ├── adminCompanyService.ts
│   ├── adminApplicationService.ts
│   ├── adminSubscriptionService.ts
│   ├── adminSkillService.ts
│   ├── adminIndustryService.ts
│   ├── adminStatsService.ts
│   └── authService.ts
├── store/
│   └── authStore.ts
└── types/
    ├── admin.ts                 # All admin-facing TypeScript interfaces
    └── auth.ts
```

#### `JobDetailPage.tsx` — Admin View

- Displays full job details including company info, skills, responsibilities, requirements
- **Delete Job** button — triggers a confirmation dialog and deletes the job, which sends a `JOB_DELETED` notification to the company
- Loading skeleton and "not found" states

---

### 3.6 `Design/` — Documentation and Schemas

```
Design/
├── DB.dbml                       # Database schema in DBML format (Database Markup Language)
├── api-specification.md           # Detailed API endpoint documentation
├── activity-register-candidate.html # (new file) Activity/register flow diagram
└── ... (other design assets, mockups, diagrams)
```

- **`DB.dbml`** — The authoritative database schema, written in DBML notation. It defines all tables, columns, types, constraints, indexes, and relationships. This file can be rendered visually using tools like [dbdiagram.io](https://dbdiagram.io) or used to generate documentation.
- **`api-specification.md`** — Documents all REST API endpoints with request/response schemas, authentication requirements, and example payloads.

---

## 4. How the Main Components Work Together

### 4.1 User Authentication Flow

```
Job Seeker/Company/Admin → Frontend SPA
                          → POST /api/v1/auth/login  (or /auth/register)
                          ← { accessToken, refreshToken, user }
Frontend stores tokens in Zustand (persisted to localStorage)
Axios interceptor attaches Bearer token to every request

On 401 response:
  → Axios interceptor calls POST /api/v1/auth/refresh
  → Stores new tokens in Zustand
  → Retries original request
  → On refresh failure → logout and redirect to login
```

Companies also receive a `companyId` and `companyRole` in the JWT claims, which the backend uses to authorize staff access.

### 4.2 Job Application Flow

```
Job Seeker browses jobs → GET /api/v1/jobs (paginated, filterable)
  ↓
Job Seeker clicks job → GET /api/v1/jobs/{id} (full details)
  ↓
Job Seeker applies → POST /api/v1/jobseeker/applications
  Backend:
    1. Creates Application record
    2. Calls AI service: POST /api/v1/matching/score
    3. Stores AiMatchingResult as JSONB in Application.jsonMatching
    4. Creates Notification (JOB_APPLIED) for company staff
    5. Sends real-time notification via Redis Pub/Sub
  ← { applicationId, aiScore }
```

### 4.3 AI Recommendation Flow

```
Job Seeker requests recommendations → GET /api/v1/jobseeker/applications/recommendations
Backend:
  1. Calls AI service: GET /api/v1/recommendations/{user_id}?resumeId=X&topK=12&mode=resume
AI Service:
  1. Loads user's pre-computed embedding from PostgreSQL (pgvector)
  2. Loads all job embeddings
  3. Computes cosine similarity
  4. Filters out already-applied jobs
  5. Returns top-K jobs with scores
← { recommendations: [{ job, score }], meta }
Frontend displays RecommendedJobCard with MatchScoreBadge
```

### 4.4 Real-Time Chat Flow

```
Company initiates chat → POST /api/v1/company/conversations
  (WebSocket STOMP session already established)

Company sends message:
  STOMP: /app/chat.send
  Backend: validates sender is COMPANY staff, persists message
  Backend: publishes to Redis channel redis:channel:chat:{conversationId}
  ChatRedisSubscriber: receives from Redis, forwards to /topic/chat.{conversationId}
  Job Seeker's STOMP client: receives message, updates UI

Job Seeker reads message:
  STOMP: /app/chat.read
  Backend: updates MessageRead record
  Backend: publishes to Redis redis:channel:read-receipt:{conversationId}
  Company receives read receipt
```

### 4.5 Subscription and Payment Flow

```
Company selects plan → POST /api/v1/company/subscriptions/checkout
  Backend: creates Stripe Checkout Session
  ← { checkoutUrl }
Company pays on Stripe → Stripe redirects with session_id
Stripe sends webhook → POST /api/v1/stripe/webhook
  Backend: verifies Stripe signature
  Backend: creates Payment record (SUCCESS)
  Backend: creates/activates Subscription
  Backend: creates Notification for company
```

### 4.6 MinIO File Upload Flow

```
Job Seeker uploads resume → Frontend sends file to backend
Backend: calls StorageService.upload(file)
  → MinIO stores file, returns object key
  → Resume record saved with fileUrl pointing to MinIO
  → Backend optionally calls AI service for PDF parsing
Frontend displays uploaded resume with download link
```

---

## 5. Key Points for Development, Deployment, and Maintenance

### 5.1 Development with Hot Reload

The project uses Docker Compose with development override profiles. All services bind-mount their source code directories into the containers:

```bash
# Start with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or using Make
make build && make up
```

Volume mounts ensure that editing a file on the host immediately reflects inside the container without rebuilding.

### 5.2 Database Migrations

The backend uses **Flyway** to manage schema changes. Migration files in `backend/src/main/resources/db/migration/` are numbered sequentially (V1 through V46). New features that require schema changes must add a new migration file. `ddl-auto: validate` ensures the JPA entities match the migrations — never use `ddl-auto: update` in production.

### 5.3 Environment Variables

All secrets and configuration are externalized via environment variables. Copy `.env.example` to `.env` and fill in real values before running. Key variables include:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | 256-bit key for signing JWTs (change in production) |
| `POSTGRES_*` | Database connection |
| `REDIS_*` | Redis connection |
| `MINIO_*` | Object storage credentials |
| `OPENAI_API_KEY` | For resume structuring and job auto-fill |
| `STRIPE_SECRET_KEY` | Payment processing |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth2 login |
| `AI_SERVICE_URL` | Internal URL of the AI service |

### 5.4 Docker Production Build

Production builds use multi-stage Dockerfiles:
- **Backend**: Maven builder stage compiles the JAR; JRE runtime stage runs it
- **AI Service**: Python builder stage installs dependencies; runtime stage serves the API
- **Frontends**: Node builder stage compiles with Vite; nginx serves the static files

### 5.5 AI Model Management

- Pre-trained model weights are stored in `ai-service/models/` (gitignored)
- At startup, `ModelRegistry` loads the GraphSAGE checkpoint and MPNet model
- If no trained model exists, the system falls back to pure feature-based matching using MPNet embeddings
- `scripts/seed_graph.py` populates the graph from existing database data

### 5.6 Security Considerations

- JWT tokens are stateless; refresh token rotation is implemented
- Blocked companies are rejected at the `JwtAuthenticationFilter` level
- Admin routes are protected by Spring Security role checks
- CORS is restricted to known frontend origins
- File uploads go through MinIO (not stored in the database)
- Stripe webhook signatures are verified before processing

### 5.7 Scalability Notes

- **Stateless backend**: Multiple instances can run behind a load balancer; Redis handles session/state sharing
- **Redis pub/sub**: Fan-out for WebSocket messages across multiple backend instances
- **Connection pooling**: HikariCP limits database connections to 20 per instance
- **AI service**: Pre-computed embeddings enable sub-millisecond recommendation serving

---

## 6. Summary

RecruitPro is a comprehensive, full-stack recruitment platform with the following architectural highlights:

1. **Three separate frontends** serve the three distinct user roles (job seekers, companies, administrators), each as an independent React SPA with its own state management and UI patterns.

2. **A unified Java/Spring Boot backend** handles all business logic, database operations, authentication, and integrations. Its clean layered architecture (Controller → Service → Repository) makes it easy to maintain and extend.

3. **A dedicated Python/FastAPI AI service** powers the platform's intelligent features: job recommendations using GraphSAGE graph neural networks, candidate-job matching scoring, and resume parsing with OCR and OpenAI.

4. **Real-time features** (chat, notifications) are implemented using WebSocket (STOMP) over SockJS with Redis pub/sub for horizontal scaling across multiple backend instances.

5. **Modern infrastructure** includes PostgreSQL with pgvector for embedding storage, Redis for caching and pub/sub, MinIO for object storage, and Stripe for payments.

6. **Developer experience** is prioritized through Docker Compose with hot-reload profiles, automated database migrations, and clear environment variable configuration.

7. **Production readiness** features include health check endpoints, graceful shutdown, structured API responses with error wrappers, rate limiting hooks, and a clean separation between development and production configurations.

---

*Report generated from codebase analysis — June 8, 2026*
