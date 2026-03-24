# RecruitPro — API Specification v1 (Foundation)

> Base path: `/api/v1`  
> Envelope: `{ "success": bool, "data": {}, "error": null, "meta": {} }`  
> Pagination: `meta: { "page": 1, "pageSize": 20, "total": 100 }`  
> Deeper features (AI recommendations, dashboard analytics, etc.) will be defined later.

---

## 1. Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register (JOBSEEKER or COMPANY) |
| POST | `/auth/login` | Public | Login → access + refresh tokens |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Bearer | Revoke refresh tokens |
| POST | `/auth/verify-otp` | Public | Verify account with OTP |
| POST | `/auth/resend-otp` | Public | Resend OTP |
| POST | `/auth/forgot-password` | Public | Send reset-password OTP |
| POST | `/auth/reset-password` | Public | Reset password with OTP |
| PUT | `/auth/change-password` | Bearer | Change password |

---

## 2. Users (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | ADMIN | List users (paginated, filter by role/status) |
| GET | `/admin/users/{id}` | ADMIN | Get user detail |
| PATCH | `/admin/users/{id}/status` | ADMIN | Suspend / activate user |

---

## 3. Companies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/companies` | Public | List companies (public) |
| GET | `/companies/{id}` | Public | Get company detail |
| PUT | `/company/profile` | COMPANY (OWNER) | Update own company profile |
| POST | `/company/logo` | COMPANY (OWNER) | Upload logo |
| PATCH | `/admin/companies/{id}/verify` | ADMIN | Verify a company |

---

## 4. Company Addresses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/addresses` | COMPANY | List own addresses |
| POST | `/company/addresses` | COMPANY | Add address |
| PUT | `/company/addresses/{id}` | COMPANY | Update address |
| DELETE | `/company/addresses/{id}` | COMPANY | Delete address |

---

## 5. Staff

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/staff` | COMPANY (OWNER) | List staff |
| POST | `/company/staff` | COMPANY (OWNER) | Add staff member |
| PUT | `/company/staff/{id}/role` | COMPANY (OWNER) | Change role |
| DELETE | `/company/staff/{id}` | COMPANY (OWNER) | Remove staff |

---

## 6. Job Seekers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobseeker/profile` | JOBSEEKER | Get own profile |
| PUT | `/jobseeker/profile` | JOBSEEKER | Update profile |
| POST | `/jobseeker/avatar` | JOBSEEKER | Upload avatar |

---

## 7. Skills (Master Data)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/skills` | Public | List all skills |
| POST | `/skills` | ADMIN | Create skill |
| PUT | `/skills/{id}` | ADMIN | Update skill |
| DELETE | `/skills/{id}` | ADMIN | Delete skill |

---

## 8. Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs` | Public | List published jobs (filter: keyword, jobType, experienceLevel, location, page) |
| GET | `/jobs/{id}` | Public | Get job detail with skills |
| GET | `/company/jobs` | COMPANY | List own company jobs (all statuses) |
| POST | `/jobs` | COMPANY (HR, OWNER) | Create job |
| PUT | `/jobs/{id}` | COMPANY (HR, OWNER) | Update job |
| PATCH | `/jobs/{id}/status` | COMPANY (HR, OWNER) | Change status (DRAFT / PUBLISHED / CLOSED) |
| DELETE | `/jobs/{id}` | COMPANY (HR, OWNER) | Soft-delete job |

---

## 9. Resumes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/resumes` | JOBSEEKER | List own resumes |
| GET | `/resumes/{id}` | JOBSEEKER / COMPANY | Get resume detail |
| POST | `/resumes` | JOBSEEKER | Upload resume (multipart) |
| GET | `/resumes/{id}/download` | JOBSEEKER / COMPANY | Get pre-signed download URL |
| DELETE | `/resumes/{id}` | JOBSEEKER | Soft-delete resume |

---

## 10. Applications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/applications` | JOBSEEKER | Apply to a job (body: jobId, resumeId) |
| GET | `/jobseeker/applications` | JOBSEEKER | List own applications (filter: status) |
| GET | `/company/applications` | COMPANY | List applications for own jobs (filter: status, jobId) |
| GET | `/applications/{id}` | JOBSEEKER / COMPANY | Get application detail |
| PATCH | `/applications/{id}/status` | COMPANY (HR, OWNER) | Update status |
| DELETE | `/applications/{id}` | JOBSEEKER | Withdraw application |

---

## 11. Interviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/interviews` | COMPANY | Schedule interview (body: applicationId, interviewerId, scheduledTime, meetingType, meetingLink) |
| GET | `/company/interviews` | COMPANY | List company interviews (filter: status, date range) |
| GET | `/jobseeker/interviews` | JOBSEEKER | List own interviews |
| GET | `/interviews/{id}` | COMPANY / JOBSEEKER | Get interview detail |
| PUT | `/interviews/{id}` | COMPANY | Update interview |
| PATCH | `/interviews/{id}/status` | COMPANY | Mark COMPLETED / CANCELLED |

---

## 12. Conversations & Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/conversations` | Bearer | List conversations |
| POST | `/conversations` | COMPANY | Start conversation (body: jobId, jobseekerId) |
| GET | `/conversations/{id}/messages` | Bearer | List messages (paginated) |
| POST | `/conversations/{id}/messages` | Bearer | Send message (text or file) |

---

## 13. Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | List notifications (paginated) |
| PATCH | `/notifications/{id}/read` | Bearer | Mark as read |
| PATCH | `/notifications/read-all` | Bearer | Mark all read |
| GET | `/notifications/unread-count` | Bearer | Get unread count |

---

## 14. Plans & Subscriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans` | Public | List subscription plans |
| POST | `/plans` | ADMIN | Create plan |
| PUT | `/plans/{id}` | ADMIN | Update plan |
| DELETE | `/plans/{id}` | ADMIN | Delete plan |
| GET | `/company/subscription` | COMPANY | Get current subscription |
| POST | `/company/subscription` | COMPANY (OWNER) | Subscribe to a plan |

---

## 15. Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/company/payments` | COMPANY (OWNER) | List payment history |
| POST | `/payments/callback/{gateway}` | Public (webhook) | Payment gateway callback |

---

## 16. Saved Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/jobs/{id}/save` | JOBSEEKER | Save a job |
| DELETE | `/jobs/{id}/save` | JOBSEEKER | Unsave a job |
| GET | `/jobseeker/saved-jobs` | JOBSEEKER | List saved jobs |

---

## 17. Audit Logs (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/audit-logs` | ADMIN | List audit logs (paginated, filter by action/entity) |
