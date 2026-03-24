---
trigger: model_decision
description: Apply when working on authentication, authorization, or security — covers JWT tokens, refresh flow, password hashing, OTP verification, RBAC, Spring Security config, CORS policy, and frontend token handling.
---

# authentication.md — Authentication & Authorization Rules

## Authentication Strategy

- MUST use **JWT (JSON Web Token)** based stateless authentication
- MUST NOT use server-side sessions — the system MUST be stateless per request
- MUST issue two tokens on successful login:
  - **Access Token**: short-lived (15 minutes), used for API authorization
  - **Refresh Token**: long-lived (7 days), used to obtain a new access token
- MUST store refresh tokens in the database (or Redis) to enable revocation
- MUST NOT store access tokens server-side — they are validated by signature only

## JWT Token Rules

- MUST sign all JWTs using **HS256** (HMAC-SHA256) with a secret key, or **RS256** (RSA-SHA256) with a key pair for multi-service verification
- MUST read the signing key/secret from environment variables (`JWT_SECRET` / `JWT_PRIVATE_KEY`) — MUST NOT hardcode
- MUST include the following claims in the access token payload:
  ```json
  {
    "sub": "<user_id (UUID)>",
    "email": "<user_email>",
    "role": "ADMIN | COMPANY | JOBSEEKER",
    "iat": 1234567890,
    "exp": 1234568790
  }
  ```
- MUST include `companyId` and `companyRole` (OWNER/HR/RECRUITER) in the token for users with role `COMPANY`
- MUST set `iss` (issuer) claim to identify the backend service
- MUST validate `exp`, `iss`, and signature on every request — MUST reject expired or tampered tokens immediately
- MUST NOT store sensitive data (password hashes, PII beyond email) in token claims

## Token Refresh Flow

- MUST expose a `POST /api/v1/auth/refresh` endpoint that accepts a refresh token and returns a new access token
- MUST validate the refresh token against the stored copy (database/Redis) before issuing a new access token
- MUST implement **refresh token rotation**: issue a new refresh token on each refresh and invalidate the old one
- MUST reject reuse of an already-rotated refresh token — treat it as a potential token theft and revoke all tokens for that user
- MUST delete all refresh tokens for a user on logout (`POST /api/v1/auth/logout`)
- MUST delete all refresh tokens for a user on password change

## Password Rules

- MUST hash passwords using **BCrypt** with a work factor of at least **10**
- MUST NEVER store plaintext passwords
- MUST NEVER log passwords, even in `DEBUG` level
- MUST enforce minimum password requirements:
  - Minimum 8 characters
  - At least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character
- MUST validate password requirements on the backend — MUST NOT rely solely on frontend validation
- MUST use `PasswordEncoder` bean (Spring Security) for all hash/verify operations — MUST NOT call BCrypt directly

## OTP (One-Time Password) Rules

- MUST generate OTPs as **6-digit numeric codes**
- MUST set OTP expiry to **5 minutes** from creation
- MUST limit OTP verification attempts to **5** per code — MUST lock after exceeding
- MUST rate-limit OTP send requests to **1 per 60 seconds** per email address
- MUST mark OTP as `is_used = true` after successful verification — MUST NOT allow reuse
- MUST support two OTP types: `VERIFY_ACCOUNT` and `RESET_PASSWORD` (matching the `otp_type` enum)
- MUST send OTPs via email only — MUST use an email service abstraction (MUST NOT call SMTP directly from controllers)
- MUST NOT include the OTP code in any API response — MUST send it exclusively via the email channel

## Role-Based Access Control (RBAC)

- MUST enforce authorization at the **controller layer** using Spring Security annotations (`@PreAuthorize`)
- MUST define the following role hierarchy:
  ```
  ADMIN > COMPANY > JOBSEEKER
  ```
- MUST enforce the following access rules:

  | Resource | ADMIN | COMPANY | JOBSEEKER |
  |---|---|---|---|
  | User management | Full CRUD | Own profile only | Own profile only |
  | Company management | Full CRUD | Own company only | Read only (public info) |
  | Job management | Full CRUD | Own company jobs | Read only (published) |
  | Applications | Read all | Own company apps | Own applications |
  | Resumes | Read all | Matched applicants | Own resumes |
  | Subscriptions/Payments | Full CRUD | Own company | No access |
  | Audit logs | Read all | No access | No access |
  | Skills (master list) | Full CRUD | Read only | Read only |
  | Plans (master list) | Full CRUD | Read only | Read only |

- MUST enforce **company-level** scoping for COMPANY users: a staff member MUST only access data belonging to their `company_id`
- MUST enforce **company role** permissions within a company:
  - `OWNER`: full company management including staff
  - `HR`: manage jobs, applications, interviews
  - `RECRUITER`: view jobs and applications, schedule interviews
- MUST return `403 Forbidden` when a user attempts to access a resource outside their role permissions
- MUST return `401 Unauthorized` when no valid token is provided

## Spring Security Configuration

- MUST configure Spring Security using a `SecurityFilterChain` bean — MUST NOT extend `WebSecurityConfigurerAdapter` (deprecated)
- MUST implement a custom `JwtAuthenticationFilter` that extracts and validates the JWT from the `Authorization: Bearer <token>` header
- MUST register the `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter` in the filter chain
- MUST disable CSRF protection for stateless JWT APIs (`csrf.disable()`)
- MUST configure endpoint security rules matching the RBAC table above
- MUST allow unauthenticated access to:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/verify-otp`
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
  - `GET /api/v1/jobs` (public job listing)
  - `GET /api/v1/jobs/{id}` (public job detail)
  - Health check and Swagger endpoints

## CORS Policy

- MUST configure CORS in the Spring Security filter chain — MUST NOT use `@CrossOrigin` annotations on individual controllers
- MUST whitelist only the frontend origin(s) — MUST NOT use `allowedOrigins("*")` in production
- MUST read allowed origins from environment variable `CORS_ALLOWED_ORIGINS` (comma-separated)
- MUST allow methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- MUST allow headers: `Authorization`, `Content-Type`, `X-Requested-With`
- MUST expose headers: `Authorization` (for token refresh in response)
- MUST set `allowCredentials(true)` to support cookies if needed in the future
- MUST set `maxAge` to 3600 seconds to reduce preflight requests

## Frontend Token Handling

- MUST store the access token in **memory** (JavaScript variable / React state / Zustand store) — MUST NOT store in `localStorage`
- MUST store the refresh token in an **HttpOnly secure cookie** or as a fallback in `localStorage` with XSS mitigation
- MUST attach the access token to every API request via an `axios` interceptor as `Authorization: Bearer <token>`
- MUST implement an `axios` response interceptor that:
  1. Detects a `401` response
  2. Calls the `/auth/refresh` endpoint with the refresh token
  3. Retries the original failed request with the new access token
  4. Redirects to login if refresh also fails
- MUST clear all tokens and redirect to login on logout
- MUST NOT expose token values in URL query parameters or browser history
