# Bsharp Reco — Final Functional Specification Document

**Version:** 3.0 (Final)  
**Status:** Draft  
**Classification:** Confidential  
**Date:** April 2026  

> This is the single source of truth for Bsharp Reco. Every section clearly marks what is **MVP** and what is **Phase 2+**. The Converse login integration is documented from the actual codebase.

---

## Table of Contents

1. Purpose and Scope
2. System Overview
3. Authentication — Converse Login Gateway (from actual codebase)
4. Tenant and Access Model
5. Admin Setup — Packet Builder
6. Customer Journey — Frontend UX (MVP)
7. Voice Discovery Pipeline (MVP)
8. Question Orchestrator (MVP)
9. Recommendation Engine (MVP)
10. Moderation Engine (MVP)
11. Explanation Engine (MVP)
12. Comparison Engine with Caching (MVP)
13. Product Chat Widget (MVP)
14. Customer Feedback — Star Rating + LLM Learning (MVP)
15. Lead Capture and Email Share (MVP)
16. Deferred Features (Phase 2+)
17. Database Schema — MySQL
18. OpenSearch Schema
19. API Endpoints
20. LLM Integration Layer
21. Technology Stack
22. Deployment and Security

---

## 1. Purpose and Scope

### 1.1 What Bsharp Reco Does

Bsharp Reco is a retail product recommendation, assisted selling, and lead capture platform. It guides in-store customers from lack of clarity to a confident product choice through voice-based open discovery, LLM-generated adaptive questioning, explainable recommendations, structured product comparison with an in-context product chatbot, and recording of customer details for CRM purposes.

Every interaction is attributed to a specific brand (tenant) and retail outlet. Each tenant/brand has its own implementation — products, scoring rules, moderation documents, and UX configuration differ between brands.

### 1.2 Positioning

> Bsharp Reco guides customers from lack of clarity to confident choice, while turning every interaction into a qualified retail lead through a consultative selling process.

### 1.3 MVP Focus

The MVP focuses on: **login → take customer input → understand input → create questions → generate recommendations → allow comparisons → answer product questions via chat → send emails.**

### 1.4 Key Design Decisions

| Decision | Choice |
|----------|--------|
| Product name | Bsharp Reco (standalone, independent of Converse) |
| UX model | Guided step-by-step cards (not chat). Cards appear/disappear in place. |
| LLM | Amazon Bedrock (Claude Sonnet 4.6). Powers question flow, explanations, comparator, product chatbot. |
| Speech-to-text | OpenAI Whisper (whisper-base, self-hosted, CPU — no GPU required) |
| Login | Converse login gateway (Angular login module + Django session auth from existing Celebrate/Converse codebase) |
| Frontend | React 18 (main app) + Angular (login only, from Converse) |
| Backend | Django 4.2+ with DRF (standalone project, connects to two MySQL databases) |
| Primary DB | MySQL 8.0+ — two databases: Converse DB (read-only, for auth) + Reco DB (all Reco data) |
| Semantic/Document store | Amazon OpenSearch (journey trails, moderation docs, product KB, feedback) |
| Async tasks | Django Q (database-backed, no Redis) |
| Object storage | Amazon S3 |
| Email | Amazon SES (practically free) |
| Feedback | 5-star rating for top 3 recommendations as a group. LLM learns from input-output patterns. |
| Product chatbot | Floating chat widget on product detail + comparison pages. OpenSearch RAG + Bedrock. |
| Moderation | Knowledge docs in OpenSearch (RAG). Admin uploads via Django Admin. |
| Security | Infrastructure-level (sysadmin-configured): encryption at rest, HTTPS, VPC, IAM roles |

---

## 2. System Overview

### 2.1 Four Layers

**Layer 1 — Auth (Converse Gateway):** Angular login module from the Converse/Celebrate codebase. Django session auth with CelebrateUsers model. Sessionid + csrftoken cookies shared across domains.

**Layer 2 — Admin Setup:** Packet Builder via Django Admin. Excel upload for products/features. Moderation doc upload to OpenSearch. Product content to S3. Web crawling for content enrichment.

**Layer 3 — Runtime:** Whisper STT (CPU), LLM question orchestrator, recommendation engine, moderation RAG, comparison engine (cached), explanation engine, product chatbot (RAG), feedback learning, email (SES).

**Layer 4 — Frontend:** React two-zone layout (68/32). 13 screens. ProductChatWidget. Star feedback. Email share.

### 2.2 Five Systems

| # | System | MVP? |
|---|--------|------|
| 1 | Tenant & Access (Converse auth gateway) | ✅ MVP |
| 2 | Setup System (Packet Builder via Django Admin) | ✅ MVP |
| 3 | Decision System (LLM questions, scoring, recommendations, explanations) | ✅ MVP |
| 4 | Engagement System (guided UX, chatbot, comparison, feedback, email share) | ✅ MVP |
| 5 | Learning System (comparison cache, feedback patterns, journey audit) | ✅ MVP |

---

## 3. Authentication — Converse Login Gateway

### 3.1 How It Works (From Actual Codebase)

Bsharp Reco uses the **existing Converse/Celebrate login system** as its authentication gateway. The Angular login module and Django auth backend are from the Converse codebase. Bsharp Reco does NOT build its own auth system.

### 3.2 Converse User Model (Actual: `CelebrateUsers`)

The user table is `user_management.CelebrateUsers` (custom `AbstractBaseUser`):

| Field | Type | Relevant to Reco? |
|-------|------|-------------------|
| id | AutoField (PK) | Yes — user identifier |
| cmid | IntegerField | Yes — maps to tenant/company. FK to CelebrateCompanies. |
| email_id | TextField (unique) | Yes — login credential |
| mobile_no | CharField(225) | Yes — for OTP login (Phase 2) |
| first_name | CharField(225) | Yes — display name |
| last_name | CharField(225) | Yes — display name |
| password | TextField | Yes — hashed via set_password() |
| user_role | IntegerField | Yes — 1=admin, 2=user (via UserRoles table) |
| status | IntegerField | Yes — 5=active, 4=blocked, 1=invited |
| designation | TextField | Available |
| manager_email | TextField | Available for future hierarchy |
| access_key | CharField | Used by saveAccessToken() for API-key flows |
| azure_id | TextField | Available for Microsoft SSO (Phase 2) |
| bsharp_uid | IntegerField | Available for SSO flows |
| whatsapp_opt | IntegerField | Available for WhatsApp consent |
| first_login | IntegerField | Tracks first login time |
| profile_file_name | TextField | Profile image |
| USERNAME_FIELD | 'email_id' | Login by email |

### 3.3 Converse Company Model (Actual: `CelebrateCompanies`)

This is the **tenant** equivalent:

| Field | Type | Relevant to Reco? |
|-------|------|-------------------|
| cmid | AutoField (PK) | Yes — tenant/company ID |
| cm_name | CharField(255) | Yes — company/brand name |
| cm_domain | TextField | Yes — email domain (e.g., "lenovo.com") |
| cm_color | CharField(255) | Yes — brand accent color |
| logo_image_url | TextField | Yes — brand logo (S3 path) |
| bsharp_token | CharField(255) | Used for SSO/API login flows |
| allow_access | PositiveIntegerField | Admin approval setting |
| emp_count | IntegerField | Company size |

### 3.4 Role Model (Actual: `UserRoles`)

| Field | Type | Description |
|-------|------|-------------|
| uid | IntegerField | FK to CelebrateUsers.id |
| rid | IntegerField | 1 = admin, 2 = regular user |
| cmid | IntegerField | FK to CelebrateCompanies.cmid |
| status | IntegerField | 0 = active |

### 3.5 Login Endpoints (From Actual `login/views.py`)

#### MVP: Email + Password Login

**Endpoint:** `POST /login/login_user`  
**Decorators:** `@csrf_exempt`, `@ratelimit(key='ip', rate='3/m', method='POST', block=True)`  
**Request body:** `{"mail": "user@brand.com", "password": "xxx", "remember_me": 0|1}`  
**Logic:**
1. Look up user: `CelebrateUsers.objects.filter(~Q(status=4), email_id=email)`
2. Authenticate: `authenticate(email_id=email, password=password)`
3. On first login: sets `first_login` timestamp, sends welcome bot message, saves to Freshsales
4. If `user.is_active`: calls `saveAccessToken(user.id)` (generates SHA-256 access_key), calls `login(request, user)` (sets sessionid cookie)
5. Returns `JsonResponse('success', safe=False)` or `JsonResponse('Unauthorized', safe=False)`

#### MVP: Check User Status

**Endpoint:** `POST /login/getLoggedInUserStatus`  
**Request body:** `{"mail": "user@brand.com"}`  
**Returns:** Numeric status code:
- `1` = active user, can log in
- `2` = invited user, needs to complete setup
- `5` = generic domain (gmail, yahoo, etc.)
- `6` = new user, domain not registered
- `7` = blocked user
- `8` = admin approval required

#### MVP: Get Logged-In User Details (Auth Probe)

**Endpoint:** `GET /users/loginUserDetails`  
**Auth:** `@authentication_classes([SessionAuthentication])`, `@permission_classes([IsAuthenticated])`  
**Returns:** JSON with: uid, cmid, email_id, first_name, last_name, role (from UserRoles), cm_color, logo_image_url (S3 path), cm_name, profile_file_name, super_user, badge/certi/home onboarding flags.

This is the endpoint React uses to check "am I logged in?" on mount.

#### MVP: Logout

**Endpoint:** `GET /login/user_logout`  
**Logic:** `logout(request)` — clears session.

#### Alternative: Converse Login (Returns Structured JSON)

**Endpoint:** `POST /login/converse_login`  
**Returns:** `{"authenticated": true, "SessionKey": "...", "csrf_token": "...", "message": "Success", "user_details": {...}}`  
This endpoint returns the session key and CSRF token explicitly in the response body, which can be useful if Bsharp Reco needs to handle cookies differently.

#### Phase 2: OTP Login

**Endpoints:** `POST /login/sent_login_otp`, `POST /login/confirm_user_login_otp`  
Supports mobile OTP via 2Factor.in SMS gateway. Available in the Converse codebase but NOT used in Reco MVP.

#### Phase 2: SSO Login

**Endpoints:** `GET /login/create_sso_login`, Microsoft SSO via MSAL, Google SSO  
Available in the Converse codebase. NOT used in Reco MVP.

### 3.6 Angular Login Module (From Actual Codebase)

**Component:** `LoginSigninComponent` at `modules/auth/login-signin/`  
**Service:** `CelebrateManagementService` handles HTTP calls with:
```typescript
httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-CSRFToken': this.cookieService.get('csrftoken'),
  }),
  withCredentials: true
};
```

**Auth check:** `AuthService.isLoggedIn()` calls `GET /users/loginUserDetails` via `loginUserCanActive()`.

**Guards:**
- `SigninGuard`: If already logged in → redirect to dashboard
- `CelebrateGuardGuard`: If NOT logged in → redirect to signin

**API base URL:** Resolved per hostname in `config/api.ts`. For Bsharp Reco, a new entry would be added:
```typescript
if (host.includes('reco.bsharpcorp.com')) {
  resolvedBaseUrl = 'https://reco.bsharpcorp.com/api';
  resolvedAppUrl = 'https://reco.bsharpcorp.com';
}
```

### 3.7 How Bsharp Reco Consumes the Login

**MVP flow:**
1. User navigates to Bsharp Reco login page (Angular login module, modified for Reco branding).
2. Angular calls `POST /login/login_user` with `{mail, password, remember_me}` using `withCredentials: true` and `X-CSRFToken`.
3. Django authenticates against `CelebrateUsers`, calls `login(request, user)`, sets `sessionid` cookie.
4. Angular redirects to the React app (full page navigation).
5. React calls `GET /users/loginUserDetails` with `credentials: 'include'`.
6. If 200: User is authenticated. React reads: `uid`, `cmid` (tenant ID), `cm_name` (brand name), `cm_color` (accent color), `logo_image_url`, `role`, `first_name`, `last_name`. Proceeds to consent screen.
7. If 401/403: Redirect back to login.

**Cookie domain:** Both Angular login and React app must share the same parent domain (e.g., `.reco.bsharpcorp.com`) so the `sessionid` cookie is valid across both. Django settings:
```python
SESSION_COOKIE_DOMAIN = '.reco.bsharpcorp.com'  # production
CSRF_COOKIE_DOMAIN = '.reco.bsharpcorp.com'
CSRF_COOKIE_HTTPONLY = False  # JS must read it
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = ['https://login.reco.bsharpcorp.com', 'https://app.reco.bsharpcorp.com']
```

### 3.8 Mapping Converse Models to Reco Concepts

| Converse Model | Reco Concept | Mapping |
|---------------|-------------|---------|
| CelebrateCompanies.cmid | Tenant ID | Each brand (e.g., Lenovo) is a CelebrateCompanies record |
| CelebrateCompanies.cm_name | Brand name | Shown in top bar |
| CelebrateCompanies.cm_color | Brand accent color | Used for UI theming |
| CelebrateCompanies.logo_image_url | Brand logo | Shown in top bar |
| CelebrateUsers.id | Store user ID | The logged-in staff member |
| CelebrateUsers.cmid | User's tenant | Links user to brand |
| CelebrateUsers.email_id | Login credential | Retail ID equivalent (email-based in Converse) |
| CelebrateUsers.user_role / UserRoles.rid | Role | 1=admin (brand_admin), 2=user (store_staff) |
| CelebrateUsers.manager_email | Manager hierarchy | Available for Phase 2 |

**Note:** Converse uses email-based login (`email_id`), not a separate "Retail ID." For Reco MVP, store staff log in with their email + password. If a separate Retail ID login is needed, it would be a Phase 2 extension to the Converse login flow.

---

## 4. Tenant and Access Model

### 4.1 Hierarchy

**Tenant (Brand = CelebrateCompanies record)** → **Outlets (Retail Stores = new Reco table)** → **Store Login (CelebrateUsers with email+password)**

Example: Lenovo (cmid=861 in CelebrateCompanies) → 8,000 retail stores (in Reco's `retail_outlets` table) → each store staff member logs in with their Converse email.

### 4.2 What Comes from Converse vs What Reco Adds

| Data | Source | Table |
|------|--------|-------|
| User identity, auth, password | Converse | CelebrateUsers |
| Company/brand, logo, color | Converse | CelebrateCompanies |
| User roles | Converse | UserRoles |
| Retail outlets, geography, kiosk codes | **Reco (new)** | retail_outlets |
| Packets, products, features, scoring | **Reco (new)** | Reco-specific tables |
| Sessions, leads, feedback, analytics | **Reco (new)** | Reco-specific tables |

### 4.3 Roles

**MVP:**
| Role | Converse rid | Can Do |
|------|-------------|--------|
| Brand admin | rid=1 | Full Packet Builder, moderation docs, all analytics |
| Store staff | rid=2 | Run customer sessions, view own outlet leads |

**Phase 2:** Regional manager, country manager (requires extending UserRoles or using Converse's manager_email hierarchy).

---

## 5. Admin Setup — Packet Builder

**MVP: Via Django Admin.**

Each brand/tenant has its own packets. Packets define: category, products (Excel upload with `product_url` for web crawling), features, benefit mappings, dimensions (seed questions for LLM), scoring rules, product content (S3), moderation documents (OpenSearch), lead capture config (SES template).

Hybrid content strategy: manual uploads take priority; crawled content from brand site fills gaps. All content indexed to OpenSearch for the product chatbot KB.

**Phase 2:** Custom admin UI replacing Django Admin.

---

## 6. Customer Journey — Frontend UX (MVP)

### 6.1 Screen Flow

```
Login (Converse Angular) → Consent & PII → Discovery Mode → Voice/Text → 
Voice Results → Guided Questions → Processing → Recommendations (⭐ feedback) → 
Comparison (💬 chat) → Product Detail (💬 chat) → Handoff (DB only) → 
Email Share → Session Complete
```

### 6.2 Layout

68/32 two-zone split: engagement area (left) + commentary panel (right). Mobile: commentary as bottom drawer. Top bar: brand logo (from CelebrateCompanies.logo_image_url), outlet name, progress dots, back/start-over.

### 6.3 All 13 Screens

| # | Screen | Route | MVP Status | Key Features |
|---|--------|-------|-----------|-------------|
| 0 | Login | Angular module | ✅ MVP | Converse email+password login |
| 1 | Consent | `/consent` | ✅ MVP | Name, phone, email (optional), T&C checkbox |
| 2 | Discovery Mode | `/discover-mode` | ✅ MVP | Voice / Text / Skip to questions |
| 3 | Voice Discovery | `/voice-discovery` | ✅ MVP | Mic + live transcription OR text input |
| 4 | Voice Results | `/voice-results` | ✅ MVP | Editable preference tags |
| 5 | Guided Questions | `/questions` | ✅ MVP | Single card, auto-advance, voice pre-fill |
| 6 | Processing | `/processing` | ✅ MVP | Thinking state (2-4 sec) |
| 7 | Recommendations | `/recommendations` | ✅ MVP | Top 3 + ⭐ 5-star feedback widget |
| 8 | Comparison | `/comparison` | ✅ MVP | Side-by-side 2 products + 💬 chat widget |
| 9 | Product Detail | `/product/{id}` | ✅ MVP | Tabbed (overview/specs/gallery/docs/accessories/finance) + 💬 chat widget |
| 10 | Handoff | `/handoff` | ⚠️ Partial | UI works. DB record created. **No SMS notification.** |
| 11 | Share | `/share` | ⚠️ Partial | **Email works (SES).** WhatsApp button present but non-functional. |
| 12 | Complete | `/complete` | ✅ MVP | Thank you + start new session |

---

## 7. Voice Discovery Pipeline (MVP)

Browser MediaRecorder (WebM/Opus, max 2 min) → `POST /api/voice/transcribe` → Django → ffmpeg → Whisper (base model, CPU, ~15-30 sec inference) → transcript + detected language → Bedrock extracts preference tags → JSON response → React shows editable tags.

Whisper-base runs on CPU. No GPU required. Runs on the same server as Django.

---

## 8. Question Orchestrator (MVP)

LLM generates questions freely based on session state, product catalog, dimensions, and moderation rules retrieved from OpenSearch (RAG). No pre-authored question bank. Stops when confidence ≥ 0.85 or max questions reached.

---

## 9. Recommendation Engine (MVP)

Weighted scoring: `Score = Σ (Feature_Weight × Feature_Fit)`. Weights adjusted by voice tags, answers, benefit mappings. Hard filters → geography modifiers → moderation overrides → feedback pattern context → top 3 composed with diversity rules. LLM generates explanation for each.

---

## 10. Moderation Engine (MVP)

**Knowledge documents** in OpenSearch: admin uploads plain English rules via Django Admin (text paste or file upload → S3 → content extracted, chunked, indexed). At runtime, RAG retrieval pulls only relevant rule chunks into LLM prompts.

**Business overrides** in MySQL: campaign boosts, SKU pushes, suppression rules. Applied after base scoring. Minimum fit threshold required.

---

## 11. Explanation Engine (MVP)

LLM generates per-product "Why this product?" explanation. Cached in recommendation_results table.

---

## 12. Comparison Engine with Caching (MVP)

Two-product comparison. LLM generates commentary on first comparison → cached in MySQL (keyed by product pair + feature hash). **Learn once, serve forever.** Cache is global within tenant — a comparison at one outlet benefits all outlets. Invalidated only when product features change.

---

## 13. Product Chat Widget (MVP)

Floating chat button on product detail page (single product KB) and comparison page (both products' KB). RAG pattern: customer question → OpenSearch query (`reco_product_kb` index) → retrieve relevant chunks → Bedrock generates grounded answer → chat bubble response.

KB includes: specs, features, FAB, uploaded content, crawled content, brochure text, accessories, finance schemes.

---

## 14. Customer Feedback — Star Rating + LLM Learning (MVP)

5-star rating for the top 3 recommendations **as a group** (not per product). Rating measures recommendation accuracy for that input-output combination.

**Learning loop:**
1. Rating stored in MySQL + OpenSearch with full context (3 products, customer answers, voice tags, scoring weights).
2. Nightly Django Q batch analyzes patterns: which input profiles lead to high/low ratings for which product combinations.
3. Patterns stored in `feedback_patterns` table and indexed to OpenSearch.
4. During recommendation generation, relevant feedback patterns injected into LLM prompt to avoid repeating poorly-rated combinations.

---

## 15. Lead Capture and Email Share (MVP)

**Customer PII:** Name, phone, email (optional), consent → MySQL.  
**Lead record:** Selected product, recommended products, journey summary → MySQL.  
**Handoff:** UI works, DB record created. **No SMS notification in MVP.** Staff check dashboard manually.  
**Email share:** Amazon SES. Product details + recommendation reasoning sent to customer. Practically free.

---

## 16. Deferred Features (Phase 2+)

| Feature | Current State | Phase |
|---------|-------------|-------|
| SMS handoff notification (Amazon SNS) | UI exists. DB record only. No SMS. | Phase 2 |
| WhatsApp sharing | UI button present. Non-functional. | Phase 2 |
| Real-time staff alerting (push/WebSocket) | Staff check dashboard manually. | Phase 2 |
| OTP login (mobile) | Available in Converse codebase. Not integrated. | Phase 2 |
| SSO / Google / Microsoft login | Available in Converse codebase. Not integrated. | Phase 2 |
| Custom Packet Builder admin UI | Django Admin used. | Phase 2 |
| Manager hierarchy enforcement | manager_email field exists in CelebrateUsers. Not used for access control. | Phase 2 |
| Regional/country manager roles | UserRoles supports it. Analytics filtering not built. | Phase 2 |
| AI-led closing conversation | Not started. | Phase 3 |
| Deep personalization from journey data | Journey data in OpenSearch. Analysis not built. | Phase 3 |
| Offline PWA mode | Not started. | Phase 3 |
| A/B testing for LLM prompts | Not started. | Phase 3 |

---

## 17. Database Schema — MySQL

### 17.1 Database 1: Converse MySQL (Read-Only for Reco)

Reco connects to the existing Converse MySQL database with **read-only access**. The Django database router directs all auth queries to this database. Reco never writes to these tables.

| Table | Purpose | Reco Access |
|-------|---------|------------|
| celebrate_users (CelebrateUsers) | User identity, auth, password | Read-only (login, session attribution, role check) |
| celebrate_companies (CelebrateCompanies) | Company/brand identity, logo, color | Read-only (tenant info, UI theming) |
| user_roles (UserRoles) | Role assignments (rid: 1=admin, 2=user) | Read-only (access control) |

### 17.2 Database 2: Reco MySQL (Reco's Own Database)

All Reco-specific data lives in a separate MySQL database. This is the `default` database in Django settings.

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| retail_outlets | outlet_id, cmid (FK→CelebrateCompanies), outlet_name, city, geography_zone, assigned_packets | Store registration under tenant |
| packets | packet_id, cmid, category, brand, launch_status | Packet config per brand |
| products | product_id, packet_id, product_code, model, family, price, product_url, crawl_status | Product catalog |
| features | feature_id, packet_id, feature_code, feature_name, feature_type, is_comparable, is_scoreable | Feature definitions |
| feature_values | value_id, product_id, feature_id, value, normalized_value | Product-feature matrix |
| benefit_mappings | mapping_id, packet_id, benefit_name, feature_code, weight_impact | Benefit → feature mapping |
| dimensions | dimension_id, packet_id, dimension_name, priority, seed_questions | Discovery dimensions |
| scoring_configs | config_id, packet_id, default_weights, hard_filters, stopping_rules | Scoring rules |
| product_content | content_id, product_id, hero_image_url, gallery_urls, fit_summary, key_highlights, best_for, salesperson_tips | Product content |
| accessories | accessory_id, product_id, accessory_name, price, image_url | Accessories |
| finance_schemes | scheme_id, product_id, scheme_name, valid_from, valid_until | Finance options |
| crawled_product_content | crawl_id, product_id, crawl_url, crawl_status, crawled_description, crawled_highlights | Crawled data |
| crawl_configs | config_id, brand_domain, description_selector, gallery_selector, use_llm_fallback | Per-brand crawl config |
| customer_sessions | session_id, conversation_id (unique), cmid, outlet_id, user_id, packet_id, discovery_mode, status, recommendation_feedback_stars | Session lifecycle |
| session_answers | answer_id, session_id, question_text, answer_value, from_voice, score_effect | Answers |
| customer_profiles | customer_id, session_id, cmid, outlet_id, name, phone, email, consent_given | Customer PII |
| recommendation_results | result_id, session_id, product_id, rank, final_score, match_percentage, explanation_text | Recommendations |
| feedback | feedback_id, session_id, rating (1-5), cmid, outlet_id, recommended_products (JSON), customer_answers (JSON) | Star ratings |
| feedback_patterns | pattern_id, cmid, packet_id, input_profile_hash, product_combination_hash, avg_rating, session_count, pattern_data (JSON) | Learned feedback patterns |
| comparison_cache | cache_id, product_pair_key, feature_set_hash, cmid, commentary, implications, hit_count | Cached comparisons |
| leads | lead_id, customer_id, session_id, cmid, outlet_id, lead_status, selected_product_id | Lead records |
| handoff_requests | handoff_id, lead_id, outlet_id, product_id, status, discussion_note | Handoff (DB only in MVP) |
| share_events | share_id, session_id, share_method ('email'), recipient, ses_message_id | Email shares |
| interaction_events | event_id, session_id, cmid, outlet_id, event_type, event_data (JSON) | Analytics events |
| moderation_rules | rule_id, packet_id, target_type, boost_strength, min_fit_threshold, is_active | Business overrides |
| lead_capture_configs | config_id, packet_id, required_fields, consent_text, email_template_id | Lead config |
| prompt_templates | template_id, template_name, template_type, template_content, version, is_active | LLM prompts |
| llm_call_logs | call_id, session_id, call_type, input_tokens, output_tokens, latency_ms, cache_hit | LLM tracking |

**Important:** Reco tables use `cmid` (IntegerField) as the tenant foreign key, matching the Converse CelebrateCompanies.cmid. This is a plain integer reference, not a Django ForeignKey constraint, since the tables are in separate databases. The Django database router ensures auth queries go to the Converse DB and all other queries go to the Reco DB.

---

## 18. OpenSearch Schema

| Index | Purpose | Key Fields |
|-------|---------|-----------|
| reco_journey_trails | Journey audit trail | conversation_id, timestamp, event_type, event_data, cmid, outlet_id |
| reco_moderation_docs | Moderation rules (RAG) | doc_id, chunk_id, packet_id, cmid, chunk_text (analyzed), is_active |
| reco_product_kb | Product chatbot KB | chunk_id, product_id, cmid, content_type, chunk_text (analyzed) |
| reco_feedback | Feedback analytics | feedback_id, session_id, cmid, product_ids, rating, created_at |

---

## 19. API Endpoints

### 19.1 Auth (From Converse — Used As-Is)

| Method | Path | Purpose | MVP? |
|--------|------|---------|------|
| POST | /login/getLoggedInUserStatus | Check email status | ✅ |
| POST | /login/login_user | Email+password login | ✅ |
| GET | /users/loginUserDetails | Auth probe + user details | ✅ |
| GET | /login/user_logout | Logout | ✅ |
| POST | /login/converse_login | Alt login (returns structured JSON) | ✅ (optional) |
| POST | /login/sent_login_otp | OTP login | ❌ Phase 2 |
| POST | /login/confirm_user_login_otp | OTP verify | ❌ Phase 2 |
| GET | /login/create_sso_login | SSO redirect | ❌ Phase 2 |

### 19.2 Reco-Specific (New)

| Method | Path | Purpose | MVP? |
|--------|------|---------|------|
| POST | /api/sessions/ | Create session | ✅ |
| POST | /api/customers/ | Capture PII + consent | ✅ |
| POST | /api/voice/transcribe | Voice → transcript + tags | ✅ |
| POST | /api/voice/analyze-text | Text → tags | ✅ |
| POST | /api/sessions/{id}/answer | Submit answer, get next question | ✅ |
| GET | /api/sessions/{id}/recommendations | Get top 3 | ✅ |
| POST | /api/comparisons/ | Compare 2 products (cached or LLM) | ✅ |
| POST | /api/chat/ask | Product chat (RAG + Bedrock) | ✅ |
| POST | /api/feedback/ | Submit star rating | ✅ |
| POST | /api/handoff/ | Create handoff record (DB only) | ✅ |
| GET | /api/handoff/pending | View pending handoffs | ✅ |
| POST | /api/share/email | Email via SES | ✅ |
| POST | /api/share/whatsapp | WhatsApp share | ❌ Returns 501 |
| GET | /api/products/{id} | Product detail (merged content) | ✅ |
| GET | /api/packets/{id} | Packet config | ✅ |
| POST | /api/packets/{id}/upload-products | Excel upload | ✅ |
| POST | /api/moderation/docs/ | Upload moderation doc | ✅ |
| GET | /api/analytics/overview | Dashboard metrics | ✅ |
| POST | /api/crawl/product/{id} | Trigger crawl | ✅ |

---

## 20. LLM Integration Layer

### 20.1 Bedrock (Claude Sonnet 4.6)

| Call Type | Trigger | Caching | MVP? |
|-----------|---------|---------|------|
| Tag extraction | After voice/text transcription | No | ✅ |
| Question generation | After each answer | No | ✅ |
| Recommendation explanation | Top 3 generated | By product + answer hash | ✅ |
| Comparison commentary | 2 products compared | By product pair — learn once, serve forever | ✅ |
| Product chat | Customer asks question | No (conversational) | ✅ |
| Crawl content extraction | When brand page selectors fail | Cached in crawled_product_content | ✅ |
| Feedback pattern analysis | Nightly batch | Stored in feedback_patterns | ✅ |

### 20.2 Whisper (Base Model, CPU)

| Aspect | Detail |
|--------|--------|
| Model | whisper-base (CPU-friendly, no GPU required) |
| Inference | ~15-30 seconds for 2 minutes of audio on CPU |
| Hosting | Same server as Django (ECS Fargate or EC2) |
| Languages | 90+ languages supported |

---

## 21. Technology Stack

| Layer | Technology |
|-------|-----------|
| Login | Angular (Converse login module from existing codebase) |
| Frontend | React 18 + TypeScript + Vite + Tailwind + Framer Motion + shadcn/ui |
| Backend | Django 4.2+ + DRF (standalone project, two-database setup) |
| Async | Django Q (database-backed) |
| LLM | Amazon Bedrock (Claude Sonnet 4.6) |
| STT | OpenAI Whisper (base, CPU) |
| DB | MySQL 8.0+ — two databases: (1) Converse DB read-only for auth, (2) Reco DB for all Reco data. Django database router directs queries. |
| Search/Docs | Amazon OpenSearch |
| Storage | Amazon S3 |
| Email | Amazon SES |
| CDN | Amazon CloudFront |
| Compute | ECS Fargate (all on CPU) or EC2 |
| Monitoring | CloudWatch |
| Security | Infrastructure-level (sysadmin): encryption at rest, HTTPS, VPC, IAM |

**Python packages:** Django, djangorestframework, django-cors-headers, django-ratelimit, django-q2, mysqlclient, boto3, opensearch-py, openai-whisper, ffmpeg-python, gunicorn, django-storages, Pillow, openpyxl, pydantic, requests, beautifulsoup4, lxml, python-json-logger, django-health-check.

**Frontend packages:** react, react-router, typescript, vite, tailwindcss, motion, @radix-ui/*, lucide-react, js-cookie, clsx, tailwind-merge.

---

## 22. Deployment and Security

### 22.1 Domain Structure

| Subdomain | Serves |
|-----------|--------|
| login.reco.bsharpcorp.com | Angular login (Converse module) |
| app.reco.bsharpcorp.com | React main app |
| api.reco.bsharpcorp.com | Django backend |

Shared cookie domain: `.reco.bsharpcorp.com`

### 22.2 Security (Sysadmin-Configured)

| Control | Implementation |
|---------|---------------|
| PII encryption at rest | MySQL encryption enabled by sysadmin |
| S3 encryption | SSE-S3 or SSE-KMS enabled by sysadmin |
| OpenSearch encryption | Node-to-node + at-rest enabled by sysadmin |
| HTTPS | ALB SSL termination with ACM certificate |
| VPC isolation | Private subnets for backend services |
| IAM roles | Instance roles for Bedrock, S3, SES, OpenSearch |
| Rate limiting | Django `@ratelimit` on login (3/min per IP, from Converse) and LLM endpoints |

---

*End of Final FSD v3.0*
