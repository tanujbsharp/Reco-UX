# Bsharp Reco — Final Architecture & End-to-End Flow

**Version:** 5.0 (Final)  
**Classification:** Confidential  
**Date:** April 2026

> Single architecture document with MVP and Phase 2+ clearly marked throughout.

---

## 1. Purpose

Bsharp Reco guides in-store customers from lack of clarity to a confident product choice through voice discovery, LLM-powered adaptive questioning, explainable recommendations, product comparison with chatbot, and lead capture.

Each brand/tenant has its own implementation. The Converse login system acts as the authentication gateway.

---

## 2. System at a Glance

Four layers:

| Layer | Modules | MVP? |
|-------|---------|------|
| **Auth (Converse Gateway)** | Angular login module (from Converse codebase), Django session auth, CelebrateUsers model, sessionid + csrftoken cookies | ✅ MVP: email+password. Phase 2: OTP, SSO. |
| **Admin Setup (Packet Builder)** | Django Admin: packets, Excel upload (with product_url for crawling), moderation docs (OpenSearch), product content (S3), crawl configs | ✅ MVP via Django Admin. Phase 2: custom UI. |
| **Runtime Backend** | Whisper STT (base, CPU), LLM question orchestrator, recommendation engine, moderation RAG (OpenSearch), comparison engine (cached), explanation engine, product chatbot (OpenSearch RAG), feedback learning, email (SES), analytics | ✅ All MVP except SNS/WhatsApp/real-time alerting. |
| **Frontend (React)** | 13 screens, two-zone layout (68/32), ProductChatWidget, star feedback, email share | ✅ MVP. Handoff UI works but no SMS. WhatsApp button present but inactive. |

---

## 3. Authentication — Converse Login Gateway

### 3.1 From the Actual Converse Codebase

Bsharp Reco reuses the existing Converse/Celebrate login system. No new auth system is built.

**Django backend:**
- User model: `CelebrateUsers` (AbstractBaseUser) — id, cmid, email_id, password, first_name, last_name, user_role, status, manager_email, access_key, azure_id
- Company model: `CelebrateCompanies` — cmid, cm_name, cm_domain, cm_color, logo_image_url, bsharp_token
- Roles: `UserRoles` — uid, rid (1=admin, 2=user), cmid
- Auth backend: `django.contrib.auth.backends.ModelBackend` + `customised_auth.auth_backend.customAuth`

**Key endpoints (from `login/views.py`):**

| Endpoint | What It Does | MVP? |
|----------|-------------|------|
| `POST /login/login_user` | Email+password login. `@csrf_exempt`, `@ratelimit(3/m)`. Returns "success"/"Unauthorized". Sets sessionid. | ✅ |
| `POST /login/getLoggedInUserStatus` | Check email status (1=active, 2=invited, 5=generic, 6=new, 7=blocked). | ✅ |
| `GET /users/loginUserDetails` | SessionAuth + IsAuthenticated. Returns uid, cmid, email, name, role, cm_color, logo_url, cm_name. **React uses this as "am I logged in?" probe.** | ✅ |
| `GET /login/user_logout` | Calls `logout(request)`. Clears session. | ✅ |
| `POST /login/converse_login` | Returns `{authenticated, SessionKey, csrf_token, user_details}`. Alternative to login_user. | ✅ Optional |
| `POST /login/sent_login_otp` | Mobile OTP via 2Factor.in. | ❌ Phase 2 |
| `GET /login/create_sso_login` | SSO redirect flow. | ❌ Phase 2 |

**Angular frontend (from `modules/auth/login-signin/`):**
- `LoginSigninComponent` handles email check → password login
- `CelebrateManagementService` sends `withCredentials: true` + `X-CSRFToken` header
- `AuthService.isLoggedIn()` calls `GET /users/loginUserDetails`
- API base URL resolved per hostname in `config/api.ts`

### 3.2 Login Flow for Bsharp Reco

1. User opens login page (Angular, Converse module with Reco branding)
2. Angular POSTs to `/login/login_user` with `{mail, password, remember_me}`
3. Django authenticates against CelebrateUsers, calls `login(request, user)`, sets sessionid cookie on `.reco.bsharpcorp.com`
4. Angular redirects to React app (full page navigation)
5. React calls `GET /users/loginUserDetails` with `credentials: 'include'`
6. 200 → reads cmid (tenant), cm_name (brand), cm_color (accent), logo_image_url → proceeds to consent screen
7. 401 → redirect to login

### 3.3 Converse Models → Reco Concepts

| Converse | Reco Concept |
|----------|-------------|
| CelebrateCompanies.cmid | Tenant ID |
| CelebrateCompanies.cm_name | Brand name (shown in top bar) |
| CelebrateCompanies.cm_color | Brand accent color |
| CelebrateCompanies.logo_image_url | Brand logo (top bar) |
| CelebrateUsers.id | Store user ID |
| CelebrateUsers.email_id | Login credential |
| UserRoles.rid=1 | Brand admin |
| UserRoles.rid=2 | Store staff |
| CelebrateUsers.manager_email | Manager hierarchy (Phase 2) |

---

## 4. Tenant and Access Model

**Tenant (CelebrateCompanies)** → **Outlets (new retail_outlets table)** → **Store Login (CelebrateUsers email+password)**

Each tenant has its own packets. Config differs per brand.

**MVP roles:** Brand admin (rid=1) = full config + analytics. Store staff (rid=2) = run sessions, view own leads.

**Phase 2:** Regional/country managers via manager_email hierarchy.

---

## 5. Admin Setup (Packet Builder)

**MVP: Django Admin.** Phase 2: Custom UI.

Seven config areas: Category & scope, Products & features (Excel + web crawl), Benefit mappings, Dimensions (seed questions for LLM), Scoring rules, Product content (S3 + crawled), Moderation docs (OpenSearch RAG), Lead capture config (SES template).

**Moderation docs:** Admin pastes text or uploads file (Word/PDF) in Django Admin → file stored on S3 → content extracted, chunked, indexed into OpenSearch `reco_moderation_docs` index → at runtime, RAG retrieval pulls relevant rule chunks into LLM prompts.

---

## 6. Runtime Backend Services

| Service | What It Does | MVP? |
|---------|-------------|------|
| Session Manager | Create session, generate conversation_id, track state | ✅ |
| Whisper STT | Audio → WAV → Whisper (base, CPU) → transcript + language | ✅ |
| Question Orchestrator | LLM generates questions freely. Moderation rules from OpenSearch RAG. | ✅ |
| Recommendation Engine | Weighted scoring + hard filters + geography + moderation overrides + feedback patterns → top 3 | ✅ |
| Moderation Engine | OpenSearch RAG for knowledge docs. MySQL for business overrides. | ✅ |
| Comparison Engine | LLM commentary. Learn-once cache in MySQL. Global within tenant. | ✅ |
| Explanation Engine | LLM generates "Why this product?" per recommendation. Cached. | ✅ |
| Product Chatbot | RAG: question → OpenSearch product KB → Bedrock → grounded answer | ✅ |
| Feedback Service | Store star ratings (top 3 as group). Nightly pattern analysis. LLM prompt injection. | ✅ |
| Email Service | Amazon SES for share emails | ✅ |
| Lead Service | Customer PII, lead records, handoff records (DB only) | ✅ |
| Analytics Service | Events to MySQL + OpenSearch. Dashboard metrics by role. | ✅ |
| SMS Notification | Amazon SNS for handoff alerts | ❌ Phase 2 |
| WhatsApp Share | wa.me link or Business API | ❌ Phase 2 |
| Real-time Alerting | WebSocket/push notifications for staff | ❌ Phase 2 |

---

## 7. Product Chat and Comparison

### 7.1 Product Chat Widget (MVP)

Floating chat on product detail (single product KB) and comparison page (both products' KB). RAG pattern: question → OpenSearch `reco_product_kb` → Bedrock → grounded answer.

### 7.2 Comparison Caching (MVP)

Two-product comparison only. LLM generates commentary once → cached in MySQL (`comparison_cache`). Global within tenant. Next time same pair is compared at any outlet → served from cache, zero LLM cost. Invalidated only when product features change.

---

## 8. Feedback Learning (MVP)

5-star rating for the top 3 as a group. Rating = recommendation accuracy, not individual product quality. Stored with full context. Nightly batch analyzes input-output patterns. Relevant patterns injected into LLM prompt during future recommendations.

---

## 9. Data Architecture

| Store | Technology | Contents |
|-------|-----------|----------|
| Auth data | MySQL — **Converse DB** (read-only) | CelebrateUsers, CelebrateCompanies, UserRoles. Reco connects with read-only access. |
| Structured data (Reco) | MySQL — **Reco DB** (separate database) | Outlets, packets, products, features, sessions, answers, recommendations, feedback, comparison cache, leads, handoffs, shares, events, moderation rules. Django database router directs queries to the correct DB. |
| Document/Search | Amazon OpenSearch | Journey audit trail, moderation docs (RAG), product chatbot KB, feedback index |
| Media | Amazon S3 + CloudFront | Product images, brochures, gallery, crawled images, audio temp |

### OpenSearch Indexes

| Index | Purpose |
|-------|---------|
| reco_journey_trails | Journey audit trail (append-only events per conversation_id) |
| reco_moderation_docs | Moderation knowledge docs (chunked for RAG) |
| reco_product_kb | Product chatbot KB (specs, FAB, descriptions, crawled content) |
| reco_feedback | Feedback events for learning pipeline |

---

## 10. End-to-End Customer Flow

| # | Stage | What Happens | MVP? |
|---|-------|-------------|------|
| 1 | Login | Converse Angular login → Django sets sessionid → redirect to React | ✅ |
| 2 | Auth check | React calls `GET /users/loginUserDetails` → hydrates tenant context (cmid, brand name, logo, color) | ✅ |
| 3 | Consent | Customer provides name, phone, consent. PII → MySQL. conversation_id generated. | ✅ |
| 4 | Voice/Text | Audio → Whisper (base, CPU) → transcript → Bedrock extracts tags → customer confirms | ✅ |
| 5 | Questions | LLM generates freely. Moderation rules from OpenSearch RAG. Each answer updates scores. | ✅ |
| 6 | Recommendations | Top 3 with scoring + moderation + feedback patterns. LLM explains each. Customer rates 1-5 stars. | ✅ |
| 7 | Comparison | 2 products side by side. LLM commentary (cached). Product chat widget available. | ✅ |
| 8 | Product Detail | Tabbed view. Chat widget. Content merged from manual + crawled data. | ✅ |
| 9 | Handoff | UI works. DB record created. **No SMS notification.** | ⚠️ Partial |
| 10 | Share | **Email works (SES).** WhatsApp button present but inactive. | ⚠️ Partial |
| 11 | Complete | Session marked done. Journey finalized in OpenSearch. Start new session. | ✅ |

---

## 11. Scoring Path

Customer consent → Voice/text → Tag extraction → Answers → Mapped benefits → Feature weight adjustment → Hard filters → Product fit score → Geography modifiers → Moderation override → Feedback pattern context → Final rank → LLM explanation → Comparison (cached) → Product chat → Email share

---

## 12. Analytics by Role

| Role | Converse rid | Scope | MVP? |
|------|-------------|-------|------|
| Brand admin | 1 | All outlets across tenant | ✅ |
| Store staff | 2 | Own outlet only | ✅ |
| Regional manager | (Phase 2) | Outlets in region | ❌ Phase 2 |
| Country manager | (Phase 2) | All outlets in country | ❌ Phase 2 |

---

## 13. Technology Stack

| Layer | Technology |
|-------|-----------|
| Login | Angular (Converse login module, actual codebase) |
| Frontend | React 18 + TypeScript + Vite + Tailwind + Framer Motion + shadcn/ui |
| Backend | Django 4.2+ + DRF (two-database setup) |
| Async | Django Q (database-backed) |
| LLM | Amazon Bedrock (Claude Sonnet 4.6) |
| STT | Whisper (base, CPU, no GPU) |
| DB | MySQL 8.0+ — two databases: (1) Converse DB read-only for auth, (2) Reco DB for all Reco data |
| Search | Amazon OpenSearch |
| Storage | Amazon S3 |
| Email | Amazon SES |
| CDN | CloudFront |
| Compute | ECS Fargate or EC2 (all CPU) |
| Security | Sysadmin-configured: encryption, HTTPS, VPC, IAM |

---

## 14. Architecture Summary

| # | System | Responsibility | MVP? |
|---|--------|---------------|------|
| 1 | Auth | Converse login gateway. CelebrateUsers + CelebrateCompanies. Email+password (MVP). OTP/SSO (Phase 2). | ✅ |
| 2 | Setup | Packet Builder via Django Admin. Per-brand config. Excel + crawl + moderation docs. | ✅ |
| 3 | Decision | LLM questions, weighted scoring, recommendations, explanations, moderation RAG | ✅ |
| 4 | Engagement | Guided UX, product chatbot, comparison (cached), star feedback, email share | ✅ |
| 5 | Learning | Comparison cache (learn once), feedback patterns, journey audit trail | ✅ |

---

## 15. Key Differentiators

- **Guided selling, not search.** Customer doesn't browse. System guides.
- **LLM with guardrails.** Moderation documents via OpenSearch RAG constrain the LLM.
- **Product chatbot.** Floating chat on detail + comparison pages. Grounded in product data.
- **Self-optimizing comparator.** Compare once, cache forever. Cross-outlet learning.
- **Feedback loop.** Star ratings feed back into LLM prompts via input-output pattern analysis.
- **Converse auth out of the box.** Login, users, companies, roles — all from the existing system. No auth rebuilding.
- **Per-brand customization.** Each tenant's packets differ. Platform adapts to the brand.
- **Hybrid content.** Manual uploads for control + web crawling for richness. All indexed for chatbot.

---

*End of Final Architecture v5.0*
