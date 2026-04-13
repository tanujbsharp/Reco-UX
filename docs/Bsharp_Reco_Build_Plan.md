# Bsharp Reco -- Comprehensive Build Plan

**Version:** 1.0  
**Date:** April 2026  
**Purpose:** Step-by-step build plan for MVP implementation using the RALPH loop method of automated agentic development.  
**Source Docs:** Architecture v5.0 Final, FSD v3.0 Final  
**Reference Codebases:** `Reco-Frontend/` (React), `converse-ref/` (Angular login)

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Build Phases Overview](#2-build-phases-overview)
3. [Phase 0 -- Project Scaffolding and Configuration](#3-phase-0----project-scaffolding-and-configuration)
4. [Phase 1 -- Angular Login Gateway](#4-phase-1----angular-login-gateway)
5. [Phase 2 -- Django Backend Foundation](#5-phase-2----django-backend-foundation)
6. [Phase 3 -- Session and Customer APIs](#6-phase-3----session-and-customer-apis)
7. [Phase 4 -- Voice Discovery Pipeline](#7-phase-4----voice-discovery-pipeline)
8. [Phase 5 -- Question Orchestrator](#8-phase-5----question-orchestrator)
9. [Phase 6 -- Recommendation Engine](#9-phase-6----recommendation-engine)
10. [Phase 7 -- Comparison Engine](#10-phase-7----comparison-engine)
11. [Phase 8 -- Product Chat Widget Backend](#11-phase-8----product-chat-widget-backend)
12. [Phase 9 -- Feedback and Learning System](#12-phase-9----feedback-and-learning-system)
13. [Phase 10 -- Lead Capture, Handoff, and Email Share](#13-phase-10----lead-capture-handoff-and-email-share)
14. [Phase 11 -- React Frontend API Integration](#14-phase-11----react-frontend-api-integration)
15. [Phase 12 -- Admin Setup (Packet Builder)](#15-phase-12----admin-setup-packet-builder)
16. [Phase 13 -- Analytics and Dashboard](#16-phase-13----analytics-and-dashboard)
17. [Phase 14 -- OpenSearch Integration](#17-phase-14----opensearch-integration)
18. [Phase 15 -- Web Crawling and Content Enrichment](#18-phase-15----web-crawling-and-content-enrichment)
19. [Phase 16 -- End-to-End Integration and Polish](#19-phase-16----end-to-end-integration-and-polish)
20. [Dependency Graph](#20-dependency-graph)
21. [Technology Reference](#21-technology-reference)
22. [Mock Data Replacement Map](#22-mock-data-replacement-map)

---

## 1. Project Structure

The final monorepo structure after all phases are complete:

```
Bsharp_Reco_Implementation/
|
|-- docs/                                   # Architecture, FSD, build plan, test cases
|   |-- Bsharp_Reco_Architecture_v5_Final.md
|   |-- Bsharp_Reco_FSD_v3_Final.md
|   |-- Bsharp_Reco_Build_Plan.md           # THIS FILE
|   +-- Bsharp_Reco_Test_Cases.md           # TO BE GENERATED
|
|-- converse-ref/                           # Reference only -- Converse Angular login codebase
|   +-- converse-src/                       # Unzipped for reference
|
|-- reco-login/                             # NEW -- Angular login gateway app
|   |-- angular.json
|   |-- package.json
|   |-- tsconfig.json
|   +-- src/
|       |-- main.ts
|       |-- index.html
|       |-- environments/
|       |   |-- environment.ts              # Dev: localhost:8000
|       |   +-- environment.prod.ts         # Prod: reco.bsharpcorp.com
|       |-- styles.scss
|       +-- app/
|           |-- app.module.ts               # Root module (no Firebase, no MSAL for MVP)
|           |-- app-routing.module.ts        # Routes: signin, redirect to React
|           |-- app.component.ts/html/scss   # Shell: router-outlet
|           |-- config/
|           |   +-- api.ts                   # Hostname-based URL resolution for Reco
|           |-- services/
|           |   |-- auth.service.ts          # isLoggedIn() check via GET /users/loginUserDetails
|           |   +-- reco-auth.service.ts     # HTTP calls: login_user, getLoggedInUserStatus, logout
|           |-- guards/
|           |   |-- signin.guard.ts          # If logged in -> redirect to React app
|           |   +-- auth.guard.ts            # If NOT logged in -> redirect to /signin
|           +-- modules/
|               +-- auth/
|                   |-- auth.module.ts
|                   |-- auth-routing.module.ts
|                   +-- login-signin/
|                       |-- login-signin.component.ts    # Email check + password login
|                       |-- login-signin.component.html  # Reco-branded login form
|                       +-- login-signin.component.scss  # Reco styling (brand colors)
|
|-- reco-backend/                           # NEW -- Django backend
|   |-- manage.py
|   |-- requirements.txt
|   |-- reco_project/                       # Django project settings
|   |   |-- __init__.py
|   |   |-- settings/
|   |   |   |-- __init__.py
|   |   |   |-- base.py                     # Shared settings
|   |   |   |-- dev.py                      # Local development
|   |   |   +-- prod.py                     # Production
|   |   |-- urls.py                         # Root URL conf
|   |   |-- wsgi.py
|   |   +-- asgi.py
|   |-- db_router.py                        # Routes auth models to Converse DB, rest to Reco DB
|   +-- apps/
|       |-- converse_auth/                  # Read-only models for Converse DB
|       |   |-- models.py                   # CelebrateUsers, CelebrateCompanies, UserRoles
|       |   |-- serializers.py
|       |   |-- views.py                    # login_user, getLoggedInUserStatus, loginUserDetails, logout
|       |   |-- urls.py
|       |   |-- auth_backend.py             # Custom auth backend for CelebrateUsers
|       |   +-- admin.py
|       |-- sessions_app/                   # Session lifecycle
|       |   |-- models.py                   # CustomerSessions, SessionAnswers
|       |   |-- serializers.py
|       |   |-- views.py
|       |   +-- urls.py
|       |-- customers/                      # Customer PII and consent
|       |   |-- models.py                   # CustomerProfiles
|       |   |-- serializers.py
|       |   |-- views.py
|       |   +-- urls.py
|       |-- voice/                          # Whisper STT + tag extraction
|       |   |-- models.py
|       |   |-- views.py                    # transcribe, analyze_text
|       |   |-- whisper_service.py          # Whisper model loading + inference
|       |   |-- tag_extractor.py            # Bedrock tag extraction
|       |   +-- urls.py
|       |-- questions/                      # LLM question orchestrator
|       |   |-- models.py
|       |   |-- views.py                    # answer endpoint (submit + get next question)
|       |   |-- orchestrator.py             # LLM question generation logic
|       |   +-- urls.py
|       |-- recommendations/               # Scoring + recommendation engine
|       |   |-- models.py                   # RecommendationResults
|       |   |-- views.py                    # get_recommendations
|       |   |-- scoring.py                  # Weighted scoring algorithm
|       |   |-- explanation.py              # LLM explanation generation
|       |   +-- urls.py
|       |-- comparisons/                    # Comparison engine with caching
|       |   |-- models.py                   # ComparisonCache
|       |   |-- views.py                    # compare endpoint
|       |   |-- comparator.py              # LLM comparison + cache logic
|       |   +-- urls.py
|       |-- product_chat/                   # Product chatbot (RAG)
|       |   |-- models.py
|       |   |-- views.py                    # ask endpoint
|       |   |-- rag_service.py             # OpenSearch query + Bedrock answer
|       |   +-- urls.py
|       |-- feedback/                       # Star ratings + learning
|       |   |-- models.py                   # Feedback, FeedbackPatterns
|       |   |-- views.py                    # submit_feedback
|       |   |-- pattern_analyzer.py         # Nightly batch analysis
|       |   |-- tasks.py                    # Django Q scheduled tasks
|       |   +-- urls.py
|       |-- leads/                          # Lead capture, handoff, share
|       |   |-- models.py                   # Leads, HandoffRequests, ShareEvents
|       |   |-- views.py                    # handoff, share_email
|       |   |-- email_service.py            # Amazon SES integration
|       |   +-- urls.py
|       |-- packets/                        # Packet Builder (admin config)
|       |   |-- models.py                   # Packets, Products, Features, FeatureValues, etc.
|       |   |-- serializers.py
|       |   |-- views.py                    # packet_config, upload_products
|       |   |-- excel_importer.py           # openpyxl Excel parsing
|       |   |-- admin.py                    # Django Admin registration
|       |   +-- urls.py
|       |-- analytics/                      # Events + dashboard metrics
|       |   |-- models.py                   # InteractionEvents
|       |   |-- views.py                    # overview endpoint
|       |   |-- event_tracker.py            # Utility for logging events
|       |   +-- urls.py
|       |-- moderation/                     # Moderation docs + business overrides
|       |   |-- models.py                   # ModerationRules
|       |   |-- views.py                    # upload_doc
|       |   |-- opensearch_indexer.py       # Chunk + index to OpenSearch
|       |   +-- urls.py
|       |-- crawl/                          # Web crawling for product content
|       |   |-- models.py                   # CrawledProductContent, CrawlConfigs
|       |   |-- views.py                    # trigger_crawl
|       |   |-- crawler.py                  # BeautifulSoup + LLM fallback
|       |   |-- tasks.py                    # Async crawl tasks
|       |   +-- urls.py
|       +-- common/                         # Shared utilities
|           |-- bedrock_client.py           # Amazon Bedrock (Claude Sonnet) wrapper
|           |-- opensearch_client.py        # OpenSearch connection + helpers
|           |-- s3_client.py               # S3 upload/download helpers
|           |-- ses_client.py              # SES email helpers
|           |-- permissions.py             # DRF permission classes
|           +-- pagination.py             # Standard pagination
|
|-- Reco-Frontend/                          # EXISTING -- React frontend (to be modified)
|   |-- package.json
|   |-- vite.config.ts
|   |-- tsconfig.json
|   +-- src/
|       |-- main.tsx
|       +-- app/
|           |-- App.tsx                     # Add AuthProvider, remove mock login
|           |-- routes.tsx                  # Update: remove LandingScreen login, add auth redirect
|           |-- context/
|           |   |-- JourneyContext.tsx       # Keep structure, wire to API responses
|           |   +-- AuthContext.tsx          # NEW: auth state from loginUserDetails
|           |-- services/                   # NEW FOLDER
|           |   |-- api.ts                  # Axios/fetch wrapper with credentials: include
|           |   |-- authApi.ts              # loginUserDetails, logout calls
|           |   |-- sessionApi.ts           # Session CRUD
|           |   |-- voiceApi.ts             # Transcribe, analyze-text
|           |   |-- questionApi.ts          # Submit answer, get next question
|           |   |-- recommendationApi.ts    # Get recommendations
|           |   |-- comparisonApi.ts        # Compare products
|           |   |-- chatApi.ts             # Product chat ask
|           |   |-- feedbackApi.ts          # Submit rating
|           |   |-- leadApi.ts             # Handoff, share email
|           |   +-- productApi.ts          # Product detail, packet config
|           |-- data/
|           |   +-- mockData.ts             # KEEP for fallback/dev, but screens use API
|           |-- screens/                    # Modify each to call real APIs
|           +-- components/                 # Keep all existing, minimal changes
|
+-- Agents/                                 # RALPH loop agent definitions
    |-- builder.md
    |-- validator.md
    +-- orchestrator.md
```

---

## 2. Build Phases Overview

| Phase | Name | Steps | Dependencies | Scope |
|-------|------|-------|-------------|-------|
| 0 | Project Scaffolding | 6 | None | Set up all three project skeletons and configs |
| 1 | Angular Login Gateway | 8 | Phase 0 | Build Reco-branded Angular login from Converse reference |
| 2 | Django Backend Foundation | 9 | Phase 0 | Django project, two-DB setup, Converse auth models, auth endpoints |
| 3 | Session and Customer APIs | 5 | Phase 2 | Session lifecycle, customer PII, consent |
| 4 | Voice Discovery Pipeline | 5 | Phase 2 | Whisper STT, Bedrock tag extraction |
| 5 | Question Orchestrator | 5 | Phases 3, 4 | LLM question generation, answer processing |
| 6 | Recommendation Engine | 7 | Phase 5 | Scoring algorithm, moderation, explanations, top 3 |
| 7 | Comparison Engine | 4 | Phase 6 | LLM comparison, learn-once caching |
| 8 | Product Chat Widget Backend | 4 | Phase 14 (OpenSearch) | RAG pipeline: OpenSearch + Bedrock |
| 9 | Feedback and Learning System | 5 | Phase 6 | Star ratings, nightly pattern analysis, LLM injection |
| 10 | Lead Capture, Handoff, Email Share | 5 | Phase 3 | Customer leads, handoff records, SES emails |
| 11 | React Frontend API Integration | 12 | Phases 1-10 | Replace mock data with API calls across all screens |
| 12 | Admin Setup (Packet Builder) | 6 | Phase 2 | Django Admin models, Excel upload, product content |
| 13 | Analytics and Dashboard | 4 | Phase 3 | Event tracking, dashboard metrics by role |
| 14 | OpenSearch Integration | 5 | Phase 2 | Indexes, indexing pipelines, RAG query helpers |
| 15 | Web Crawling | 4 | Phase 12 | BeautifulSoup crawling, LLM fallback, async tasks |
| 16 | End-to-End Integration | 6 | All | Full flow testing, cookie domain setup, polish |

**Total: ~100 discrete build steps**

---

## 3. Phase 0 -- Project Scaffolding and Configuration

**Goal:** Set up all three project skeletons so subsequent phases can build on clean foundations.

### Step 0.1 -- Initialize Angular Login Project

**What:** Create a new Angular 19 project for `reco-login/` using Angular CLI. Minimal setup -- no Firebase, no MSAL, no Material. Only what's needed for MVP login.

**Actions:**
- Run `ng new reco-login --routing --style=scss --skip-tests`
- Install dependencies: `ngx-cookie-service`, `@angular/forms`, `@angular/common/http`
- Remove default boilerplate (app.component default content, default styles)
- Set up `angular.json` build output to `dist/reco-login`

**Output:** Empty Angular project that compiles and serves.

**Reference:** `converse-ref/converse-src/.../celebrate-angular/angular.json` for Angular 19 config patterns.

### Step 0.2 -- Initialize Django Backend Project

**What:** Create Django project `reco-backend/` with split settings and DRF.

**Actions:**
- Run `django-admin startproject reco_project reco-backend/`
- Create `reco_project/settings/` directory with `base.py`, `dev.py`, `prod.py`
- Move settings into `base.py`, add environment-specific overrides
- Install and configure DRF in `base.py`:
  ```python
  INSTALLED_APPS = [
      'django.contrib.admin',
      'django.contrib.auth',
      'django.contrib.contenttypes',
      'django.contrib.sessions',
      'django.contrib.messages',
      'django.contrib.staticfiles',
      'rest_framework',
      'corsheaders',
      'django_ratelimit',
      'django_q',
  ]
  ```
- Configure CORS:
  ```python
  CORS_ALLOW_CREDENTIALS = True
  CORS_ALLOWED_ORIGINS = [
      'http://localhost:4200',    # Angular login (dev)
      'http://localhost:5173',    # React app (dev)
  ]
  ```
- Configure session and CSRF cookie settings:
  ```python
  # Dev settings
  SESSION_COOKIE_DOMAIN = None  # localhost
  CSRF_COOKIE_DOMAIN = None
  CSRF_COOKIE_HTTPONLY = False   # JS must read csrftoken
  SESSION_ENGINE = 'django.contrib.sessions.backends.db'
  ```

**Output:** Django project that runs `manage.py runserver`.

### Step 0.3 -- Create requirements.txt

**What:** Pin all Python dependencies for the backend.

**File: `reco-backend/requirements.txt`**
```
Django>=4.2,<5.0
djangorestframework>=3.14
django-cors-headers>=4.3
django-ratelimit>=4.1
django-q2>=1.6
mysqlclient>=2.2
boto3>=1.34
opensearch-py>=2.4
openai-whisper>=20231117
ffmpeg-python>=0.2
gunicorn>=21.2
django-storages>=1.14
Pillow>=10.2
openpyxl>=3.1
pydantic>=2.5
requests>=2.31
beautifulsoup4>=4.12
lxml>=5.1
python-json-logger>=2.0
django-health-check>=3.18
```

**Output:** Installable via `pip install -r requirements.txt`.

### Step 0.4 -- Configure Two-Database Setup

**What:** Set up Django to connect to two MySQL databases: Converse (read-only) and Reco (read-write).

**File: `reco-backend/reco_project/settings/dev.py`**
```python
DATABASES = {
    'default': {  # Reco DB
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'reco_db',
        'USER': 'reco_user',
        'PASSWORD': 'reco_pass',
        'HOST': 'localhost',
        'PORT': '3306',
    },
    'converse': {  # Converse DB (read-only)
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'converse_db',
        'USER': 'converse_readonly',
        'PASSWORD': 'converse_pass',
        'HOST': 'localhost',
        'PORT': '3306',
    },
}
```

**File: `reco-backend/db_router.py`**
```python
class ConverseRouter:
    """Route auth models to Converse DB, everything else to Reco DB."""
    converse_apps = {'converse_auth'}
    
    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.converse_apps:
            return 'converse'
        return 'default'
    
    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.converse_apps:
            return 'converse'  # Will be read-only in practice
        return 'default'
    
    def allow_relation(self, obj1, obj2, **hints):
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.converse_apps:
            return db == 'converse'
        return db == 'default'
```

**Setting:**
```python
DATABASE_ROUTERS = ['db_router.ConverseRouter']
```

**Output:** Django can read from Converse DB and write to Reco DB.

### Step 0.5 -- Configure React Frontend for API Mode

**What:** Add an API service layer to the existing React frontend without changing the UI.

**Actions:**
- Create `Reco-Frontend/src/app/services/api.ts` -- base fetch/axios wrapper
- Add `VITE_API_BASE_URL` to `.env` and `vite.config.ts` env handling
- Add proxy config to `vite.config.ts` for local development:
  ```typescript
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/login': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
    }
  }
  ```
- Create `.env.development`:
  ```
  VITE_API_BASE_URL=http://localhost:8000
  VITE_LOGIN_URL=http://localhost:4200
  ```

**Output:** React app can proxy API requests to Django in development.

### Step 0.6 -- Set Up Local Development MySQL Databases

**What:** Create SQL scripts for initializing both databases locally.

**File: `reco-backend/scripts/init_databases.sql`**
```sql
CREATE DATABASE IF NOT EXISTS reco_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS converse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reco user (full access to reco_db)
CREATE USER IF NOT EXISTS 'reco_user'@'localhost' IDENTIFIED BY 'reco_pass';
GRANT ALL PRIVILEGES ON reco_db.* TO 'reco_user'@'localhost';

-- Read-only Converse user
CREATE USER IF NOT EXISTS 'converse_readonly'@'localhost' IDENTIFIED BY 'converse_pass';
GRANT SELECT ON converse_db.* TO 'converse_readonly'@'localhost';

FLUSH PRIVILEGES;
```

**File: `reco-backend/scripts/seed_converse.sql`**
- Create `celebrate_users`, `celebrate_companies`, `user_roles` tables matching Converse schema
- Insert seed data: 1 company (test brand), 2 users (1 admin, 1 staff)

**Output:** Local databases ready for development.

---

## 4. Phase 1 -- Angular Login Gateway

**Goal:** Build a standalone Angular login app that authenticates against Django and redirects to the React app. Modeled on Converse's `LoginSigninComponent` but stripped down for Reco MVP (email + password only).

**Reference files from Converse:**
- `converse-ref/converse-src/.../celebrate-angular/src/app/modules/auth/login-signin/login-signin.component.ts`
- `converse-ref/converse-src/.../celebrate-angular/src/app/services/celebrate-management.service.ts`
- `converse-ref/converse-src/.../celebrate-angular/src/app/config/api.ts`
- `converse-ref/converse-src/.../celebrate-angular/src/app/auth.service.ts`
- `converse-ref/converse-src/.../celebrate-angular/src/app/celebrate-guard.guard.ts`
- `converse-ref/converse-src/.../celebrate-angular/src/app/signin.guard.ts`

### Step 1.1 -- Create API Config

**What:** Create hostname-based URL resolution for Reco.

**File: `reco-login/src/app/config/api.ts`**

**Logic:**
- `localhost` -> `http://localhost:8000` (API), `http://localhost:5173` (React app)
- `login.reco.bsharpcorp.com` -> `https://api.reco.bsharpcorp.com` (API), `https://app.reco.bsharpcorp.com` (React app)

**Exports:** `baseUrl`, `appUrl`, `reactAppUrl`

**Reference:** Converse's `api.ts` uses `window.location.hostname` checks.

### Step 1.2 -- Create RecoAuthService

**What:** HTTP service for all auth API calls. Modeled on Converse's `CelebrateManagementService` but only the auth methods.

**File: `reco-login/src/app/services/reco-auth.service.ts`**

**Methods:**
- `loginUser(data: {mail, password, remember_me})` -> `POST /login/login_user`
- `getLoggedInUserStatus(data: {mail})` -> `POST /login/getLoggedInUserStatus`
- `loginUserDetails()` -> `GET /users/loginUserDetails`
- `logout()` -> `GET /login/user_logout`

**HTTP config (from Converse pattern):**
```typescript
httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-CSRFToken': this.cookieService.get('csrftoken'),
  }),
  withCredentials: true,
};
```

### Step 1.3 -- Create AuthService (Login Status Check)

**What:** Simple service that checks if user is logged in by calling `loginUserDetails()`.

**File: `reco-login/src/app/services/auth.service.ts`**

**Method:** `isLoggedIn(): Observable<boolean>` -- calls `GET /users/loginUserDetails`, returns `true` if 200, `false` otherwise.

**Reference:** Converse's `auth.service.ts` uses `loginUserCanActive()`.

### Step 1.4 -- Create Auth Guards

**What:** Two route guards, same pattern as Converse.

**File: `reco-login/src/app/guards/signin.guard.ts`**
- If user IS logged in -> redirect to React app (`reactAppUrl`) via `window.location.href`
- If NOT logged in -> allow access to login page

**File: `reco-login/src/app/guards/auth.guard.ts`**
- If user IS logged in -> allow access
- If NOT logged in -> redirect to `/signin`

### Step 1.5 -- Create Auth Module and Routing

**What:** Auth module with a single route: `/signin`.

**File: `reco-login/src/app/modules/auth/auth.module.ts`**
- Declares: `LoginSigninComponent`
- Imports: `FormsModule`, `ReactiveFormsModule`, `HttpClientModule`, `CommonModule`

**File: `reco-login/src/app/modules/auth/auth-routing.module.ts`**
- `''` -> redirect to `signin`
- `'signin'` -> `LoginSigninComponent` with `SigninGuard`

**File: `reco-login/src/app/app-routing.module.ts`**
- `''` -> lazy load `AuthModule`
- `'**'` -> redirect to `signin`

### Step 1.6 -- Build LoginSigninComponent (TypeScript)

**What:** The core login form logic. Simplified from Converse's 1161-line component to only handle email + password.

**File: `reco-login/src/app/modules/auth/login-signin/login-signin.component.ts`**

**Flow (from FSD Section 3.7):**
1. On page load: check if already logged in via `authService.isLoggedIn()`. If yes, redirect to React app.
2. User enters email -> call `getLoggedInUserStatus({mail})`:
   - Status `1` (active) -> show password field
   - Status `7` (blocked) -> show "Account blocked" error
   - Status `5` (generic domain) -> show "Domain not registered" error
   - Status `6` (new user) -> show "Contact admin" message
   - Other -> show appropriate error
3. User enters password -> call `loginUser({mail, password, remember_me})`:
   - `'success'` -> redirect to React app: `window.location.href = reactAppUrl`
   - `'Unauthorized'` -> show "Invalid credentials" error, increment attempt counter
   - Max 5 attempts -> show "Too many attempts" message

**State variables:** `email`, `password`, `rememberMe`, `currentStep` (email|password), `errorMessage`, `loading`, `loginAttemptCount`

**Reference:** Converse's `LoginSigninComponent.signInWithNewPassword()` method.

### Step 1.7 -- Build LoginSigninComponent (Template + Styles)

**What:** Reco-branded login UI. Clean, modern look matching the React app's aesthetic.

**File: `reco-login/src/app/modules/auth/login-signin/login-signin.component.html`**

**Layout:**
- Full-screen centered card (similar to `LandingScreen`'s right panel in React)
- Top: Bsharp Reco logo (BrandMark equivalent)
- Title: "Welcome to Bsharp Reco"
- Subtitle: Brand name (fetched from tenant context or hardcoded for MVP)
- Step 1: Email input + "Continue" button
- Step 2: Password input + "Sign In" button + "Back to email" link
- Error message display area
- Loading spinner during API calls

**File: `reco-login/src/app/modules/auth/login-signin/login-signin.component.scss`**

**Styling guidance:**
- Match the Converse login's existing look and feel from `converse-ref/` codebase. The Angular login should look like a Converse login page, re-branded for Reco (different logo, title text) but same layout, colors, and UI patterns.
- Reference: `converse-ref/converse-src/.../celebrate-angular/src/app/modules/auth/login-signin/login-signin.component.scss` and `signin-main` styles.
- Keep the Converse login's color scheme, input field styling, button styles, and layout structure.
- Replace only the branding: Bsharp Reco logo, "Welcome to Bsharp Reco" title.
- The React app (Reco-Frontend) has its own distinct premium styling (GlowCards, mesh gradients, etc.) -- the Angular login does NOT need to match that. It is a separate gateway with Converse's visual identity.

### Step 1.8 -- Set Up App Shell and Build Config

**What:** Wire everything together in `AppModule` and configure production build.

**File: `reco-login/src/app/app.module.ts`**
```typescript
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CookieModule.forRoot(),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
```

**File: `reco-login/src/app/app.component.html`**
```html
<router-outlet></router-outlet>
```

**Production config in `angular.json`:**
- Output: `dist/reco-login`
- Optimization: enabled
- Source maps: disabled for prod

**Test locally:** `ng serve --port 4200` -- should show login page and be able to authenticate against Django running on port 8000.

---

## 5. Phase 2 -- Django Backend Foundation

**Goal:** Set up Django with Converse auth models, auth endpoints, and the base infrastructure for all subsequent phases.

### Step 2.1 -- Create Converse Auth App (Read-Only Models)

**What:** Define Django models that mirror the Converse database tables. These are `managed = False` models -- Django reads from them but never creates/migrates them.

**File: `reco-backend/apps/converse_auth/models.py`**

**Models (from FSD Section 3.2-3.4):**

```python
class CelebrateUsers(AbstractBaseUser):
    class Meta:
        managed = False
        db_table = 'celebrate_users'
        app_label = 'converse_auth'
    
    id = models.AutoField(primary_key=True)
    cmid = models.IntegerField()
    email_id = models.TextField(unique=True)
    mobile_no = models.CharField(max_length=225, blank=True, null=True)
    first_name = models.CharField(max_length=225)
    last_name = models.CharField(max_length=225)
    password = models.TextField()
    user_role = models.IntegerField(default=2)
    status = models.IntegerField(default=1)
    designation = models.TextField(blank=True, null=True)
    manager_email = models.TextField(blank=True, null=True)
    access_key = models.CharField(max_length=255, blank=True, null=True)
    azure_id = models.TextField(blank=True, null=True)
    first_login = models.IntegerField(default=0)
    profile_file_name = models.TextField(blank=True, null=True)
    
    USERNAME_FIELD = 'email_id'

class CelebrateCompanies(models.Model):
    class Meta:
        managed = False
        db_table = 'celebrate_companies'
        app_label = 'converse_auth'
    
    cmid = models.AutoField(primary_key=True)
    cm_name = models.CharField(max_length=255)
    cm_domain = models.TextField(blank=True, null=True)
    cm_color = models.CharField(max_length=255, blank=True, null=True)
    logo_image_url = models.TextField(blank=True, null=True)
    bsharp_token = models.CharField(max_length=255, blank=True, null=True)
    allow_access = models.PositiveIntegerField(default=0)

class UserRoles(models.Model):
    class Meta:
        managed = False
        db_table = 'user_roles'
        app_label = 'converse_auth'
    
    uid = models.IntegerField()
    rid = models.IntegerField()  # 1=admin, 2=user
    cmid = models.IntegerField()
    status = models.IntegerField(default=0)
```

### Step 2.2 -- Create Custom Auth Backend

**What:** Custom authentication backend that authenticates against `CelebrateUsers`.

**File: `reco-backend/apps/converse_auth/auth_backend.py`**

```python
class ConverseAuthBackend:
    def authenticate(self, request, email_id=None, password=None):
        try:
            user = CelebrateUsers.objects.using('converse').get(email_id=email_id)
            if user.check_password(password) and user.is_active:
                return user
        except CelebrateUsers.DoesNotExist:
            return None
    
    def get_user(self, user_id):
        try:
            return CelebrateUsers.objects.using('converse').get(pk=user_id)
        except CelebrateUsers.DoesNotExist:
            return None
```

**Setting:**
```python
AUTHENTICATION_BACKENDS = [
    'apps.converse_auth.auth_backend.ConverseAuthBackend',
]
AUTH_USER_MODEL = 'converse_auth.CelebrateUsers'
```

### Step 2.3 -- Create Auth View: login_user

**What:** Implement `POST /login/login_user` matching Converse behavior.

**File: `reco-backend/apps/converse_auth/views.py`**

**Endpoint:** `POST /login/login_user`
- Decorators: `@csrf_exempt`, `@ratelimit(key='ip', rate='3/m', method='POST', block=True)`
- Request body: `{"mail": "...", "password": "...", "remember_me": 0|1}`
- Logic:
  1. Filter user: `CelebrateUsers.objects.using('converse').filter(~Q(status=4), email_id=email)`
  2. Authenticate: `authenticate(request, email_id=email, password=password)`
  3. If `user.is_active`: call `login(request, user)`, return `JsonResponse('success', safe=False)`
  4. Else: return `JsonResponse('Unauthorized', safe=False)`

**Reference:** FSD Section 3.5, "MVP: Email + Password Login".

### Step 2.4 -- Create Auth View: getLoggedInUserStatus

**What:** Implement `POST /login/getLoggedInUserStatus`.

**Endpoint:** `POST /login/getLoggedInUserStatus`
- Request body: `{"mail": "user@brand.com"}`
- Logic:
  1. Extract email domain
  2. Check if user exists with this email in CelebrateUsers
  3. Return status code: 1 (active), 2 (invited), 5 (generic domain), 6 (new), 7 (blocked)

**Reference:** FSD Section 3.5.

### Step 2.5 -- Create Auth View: loginUserDetails

**What:** Implement `GET /users/loginUserDetails` -- the auth probe used by React.

**Endpoint:** `GET /users/loginUserDetails`
- Auth: `SessionAuthentication` + `IsAuthenticated`
- Returns JSON:
  ```json
  {
    "uid": 1,
    "cmid": 861,
    "email_id": "staff@lenovo.com",
    "first_name": "Store",
    "last_name": "Staff",
    "role": 2,
    "cm_color": "#E2231A",
    "logo_image_url": "https://s3.../lenovo-logo.png",
    "cm_name": "Lenovo"
  }
  ```
- Query `UserRoles` to get `rid` for the user
- Query `CelebrateCompanies` to get brand info

**Reference:** FSD Section 3.5, "MVP: Get Logged-In User Details".

### Step 2.6 -- Create Auth View: user_logout

**What:** Implement `GET /login/user_logout`.

**Endpoint:** `GET /login/user_logout`
- Logic: `logout(request)` -- clears Django session
- Returns: `JsonResponse('logged_out', safe=False)`

### Step 2.7 -- Wire Auth URLs

**What:** Set up URL routing for auth endpoints.

**File: `reco-backend/apps/converse_auth/urls.py`**
```python
urlpatterns = [
    path('login/login_user', views.login_user),
    path('login/getLoggedInUserStatus', views.get_logged_in_user_status),
    path('login/user_logout', views.user_logout),
]
```

**File: `reco-backend/apps/converse_auth/user_urls.py`**
```python
urlpatterns = [
    path('users/loginUserDetails', views.login_user_details),
]
```

**File: `reco-backend/reco_project/urls.py`**
```python
urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.converse_auth.urls')),
    path('', include('apps.converse_auth.user_urls')),
    # ... more apps added in later phases
]
```

### Step 2.8 -- Create Common Utility Modules (Stubs)

**What:** Create stub files for shared services that will be fleshed out in later phases. This prevents import errors as apps reference each other.

**Files to create (stubs with TODO markers):**
- `reco-backend/apps/common/bedrock_client.py` -- Bedrock client class with placeholder `invoke()` method
- `reco-backend/apps/common/opensearch_client.py` -- OpenSearch client class with placeholder `search()` / `index()` methods
- `reco-backend/apps/common/s3_client.py` -- S3 helper with placeholder `upload()` / `get_url()` methods
- `reco-backend/apps/common/ses_client.py` -- SES helper with placeholder `send_email()` method
- `reco-backend/apps/common/permissions.py` -- DRF permission classes: `IsAuthenticatedReco`, `IsBrandAdmin`

### Step 2.9 -- Create Django App Registrations and Migrations

**What:** Register all apps in `INSTALLED_APPS` and run initial migrations.

**Setting in `base.py`:**
```python
INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'django_ratelimit',
    'django_q',
    # Reco apps
    'apps.converse_auth',
    'apps.sessions_app',
    'apps.customers',
    'apps.voice',
    'apps.questions',
    'apps.recommendations',
    'apps.comparisons',
    'apps.product_chat',
    'apps.feedback',
    'apps.leads',
    'apps.packets',
    'apps.analytics',
    'apps.moderation',
    'apps.crawl',
    'apps.common',
]
```

**Action:** Run `python manage.py makemigrations` and `python manage.py migrate` for the `default` (Reco) database. The `converse` database has `managed = False` models, so no migrations run against it.

---

## 6. Phase 3 -- Session and Customer APIs

**Goal:** Create session lifecycle management and customer PII capture.

### Step 3.1 -- Create Session Models

**File: `reco-backend/apps/sessions_app/models.py`**

**Models (from FSD Section 17.2):**

```python
class CustomerSession(models.Model):
    session_id = models.AutoField(primary_key=True)
    conversation_id = models.UUIDField(unique=True, default=uuid.uuid4)
    cmid = models.IntegerField()           # Tenant (from CelebrateCompanies)
    outlet_id = models.IntegerField(null=True)
    user_id = models.IntegerField()         # Store staff (from CelebrateUsers)
    packet_id = models.IntegerField(null=True)
    discovery_mode = models.CharField(max_length=20, choices=[('voice','Voice'),('text','Text'),('guided','Guided')])
    status = models.CharField(max_length=20, default='active')
    recommendation_feedback_stars = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SessionAnswer(models.Model):
    answer_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(CustomerSession, on_delete=models.CASCADE)
    question_text = models.TextField()
    answer_value = models.TextField()
    from_voice = models.BooleanField(default=False)
    score_effect = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 3.2 -- Create Session API Views

**File: `reco-backend/apps/sessions_app/views.py`**

**Endpoints:**
- `POST /api/sessions/` -- Create a new session. Requires authenticated user. Generates `conversation_id`. Returns session object.
- `GET /api/sessions/{id}/` -- Get session details and current state.
- `PATCH /api/sessions/{id}/` -- Update session status (e.g., mark as complete).

**Auth:** `SessionAuthentication` + `IsAuthenticated`. Extract `cmid` and `user_id` from the authenticated user.

### Step 3.3 -- Create Customer Profile Models

**File: `reco-backend/apps/customers/models.py`**

```python
class CustomerProfile(models.Model):
    customer_id = models.AutoField(primary_key=True)
    session = models.OneToOneField('sessions_app.CustomerSession', on_delete=models.CASCADE)
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    consent_given = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 3.4 -- Create Customer API Views

**File: `reco-backend/apps/customers/views.py`**

**Endpoint:** `POST /api/customers/` -- Capture customer PII + consent. Links to active session.

**Request body:**
```json
{
  "session_id": 1,
  "name": "Customer Name",
  "phone": "+919876543210",
  "email": "optional@email.com",
  "consent_given": true
}
```

### Step 3.5 -- Wire Session and Customer URLs

**File: `reco-backend/apps/sessions_app/urls.py`** and **`reco-backend/apps/customers/urls.py`**

Add to root `urls.py`:
```python
path('api/', include('apps.sessions_app.urls')),
path('api/', include('apps.customers.urls')),
```

---

## 7. Phase 4 -- Voice Discovery Pipeline

**Goal:** Implement Whisper STT and Bedrock-powered tag extraction.

### Step 4.1 -- Set Up Whisper Service

**File: `reco-backend/apps/voice/whisper_service.py`**

**Logic:**
- Load Whisper `base` model on first call (lazy singleton)
- Accept audio bytes (WebM/Opus from browser MediaRecorder)
- Use `ffmpeg` to convert to WAV
- Run Whisper inference
- Return: `{"transcript": "...", "language": "en"}`

**Performance note:** ~15-30 seconds for 2 min audio on CPU (per Architecture doc).

### Step 4.2 -- Create Tag Extraction via Bedrock

**File: `reco-backend/apps/voice/tag_extractor.py`**

**Logic:**
- Take transcript text as input
- Call Amazon Bedrock (Claude Sonnet) with prompt:
  ```
  Extract customer preference tags from this retail conversation transcript.
  Return JSON array of tags, each with: tag (short label), category (one of: usage, portability, screen-size, priority, features, budget), confidence (0-1).
  ```
- Parse LLM response into structured tags

**File: `reco-backend/apps/common/bedrock_client.py`** (flesh out stub from Phase 2)
- Initialize `boto3.client('bedrock-runtime')`
- Method: `invoke(prompt, max_tokens=1024)` -> calls `invoke_model` with Claude Sonnet model ID
- Handle response parsing

### Step 4.3 -- Create Voice Transcribe View

**File: `reco-backend/apps/voice/views.py`**

**Endpoint:** `POST /api/voice/transcribe`
- Auth: `SessionAuthentication` + `IsAuthenticated`
- Request: `multipart/form-data` with audio file (max 2 min)
- Logic:
  1. Save temp audio file
  2. Whisper transcribe
  3. Bedrock extract tags
  4. Return `{"transcript": "...", "language": "en", "tags": [...]}`

### Step 4.4 -- Create Text Analysis View

**File: `reco-backend/apps/voice/views.py` (add to same file)**

**Endpoint:** `POST /api/voice/analyze-text`
- Request body: `{"text": "I need a laptop for..."}`
- Logic: Skip Whisper, go directly to Bedrock tag extraction
- Return: `{"tags": [...]}`

### Step 4.5 -- Wire Voice URLs

**File: `reco-backend/apps/voice/urls.py`**
```python
urlpatterns = [
    path('voice/transcribe', views.transcribe),
    path('voice/analyze-text', views.analyze_text),
]
```

---

## 8. Phase 5 -- Question Orchestrator

**Goal:** Implement LLM-powered adaptive question generation.

### Step 5.1 -- Create Question Orchestrator Logic

**File: `reco-backend/apps/questions/orchestrator.py`**

**Logic (from FSD Section 8):**
- Input: session state (voice tags, previous answers, product catalog summary, moderation rules)
- Call Bedrock with prompt that includes:
  - Current session context (what we know so far)
  - Available product dimensions (from packet config)
  - Moderation rules retrieved from OpenSearch (RAG)
  - Instruction: Generate the next question, or signal `done` if confidence >= 0.85
- Output:
  ```json
  {
    "question": "What will you primarily use this laptop for?",
    "type": "single-choice",
    "options": [
      {"label": "Work & Productivity", "description": "Office apps, emails", "icon": "briefcase"},
      ...
    ],
    "question_number": 1,
    "total_estimated": 5,
    "confidence": 0.45,
    "done": false
  }
  ```
- Stopping condition: `confidence >= 0.85` or `question_number > max_questions` (configurable per packet, default 5)

### Step 5.2 -- Create Prompt Templates Model

**File: `reco-backend/apps/questions/models.py`**

```python
class PromptTemplate(models.Model):
    template_id = models.AutoField(primary_key=True)
    template_name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=50)  # question_generation, tag_extraction, etc.
    template_content = models.TextField()
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
```

### Step 5.3 -- Create Answer Submission View

**File: `reco-backend/apps/questions/views.py`**

**Endpoint:** `POST /api/sessions/{id}/answer`
- Request body:
  ```json
  {
    "question_text": "What will you primarily use this laptop for?",
    "answer_value": "Work & Productivity",
    "from_voice": false
  }
  ```
- Logic:
  1. Save `SessionAnswer` to database
  2. Update session scoring state
  3. Call `orchestrator.generate_next_question()` with updated context
  4. Return next question OR `{"done": true, "message": "Ready for recommendations"}`

### Step 5.4 -- Create LLM Call Logging

**File: `reco-backend/apps/questions/models.py`** (add)

```python
class LLMCallLog(models.Model):
    call_id = models.AutoField(primary_key=True)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE, null=True)
    call_type = models.CharField(max_length=50)  # question_gen, tag_extraction, explanation, etc.
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    latency_ms = models.IntegerField(default=0)
    cache_hit = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 5.5 -- Wire Question URLs

```python
urlpatterns = [
    path('sessions/<int:session_id>/answer', views.submit_answer),
]
```

---

## 9. Phase 6 -- Recommendation Engine

**Goal:** Implement the weighted scoring algorithm, moderation overrides, and LLM explanations.

### Step 6.1 -- Create Scoring Algorithm

**File: `reco-backend/apps/recommendations/scoring.py`**

**Algorithm (from FSD Section 9, Architecture Section 11):**

```
Score = SUM(Feature_Weight * Feature_Fit) for all features

Where:
- Feature_Weight: base weight from packet config, adjusted by voice tags and answer mappings
- Feature_Fit: how well product's feature value matches what customer wants (0-1)

Pipeline:
1. Start with default weights from scoring_configs
2. Voice tags adjust weights (e.g., "portability" boosts weight on "weight" feature)
3. Each answer adjusts weights via benefit_mappings
4. Calculate base score per product
5. Apply hard filters (e.g., "must have Thunderbolt") -- disqualify products
6. Apply geography modifiers (from outlet zone)
7. Apply moderation overrides (campaign boosts, suppression rules)
8. Apply feedback pattern context (from feedback_patterns table)
9. Rank, apply diversity rules (avoid all 3 from same family)
10. Return top 3
```

**Input:** Session ID (has voice tags, answers)
**Output:** Ranked product list with scores

### Step 6.2 -- Create Recommendation Results Model

**File: `reco-backend/apps/recommendations/models.py`**

```python
class RecommendationResult(models.Model):
    result_id = models.AutoField(primary_key=True)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE)
    product_id = models.IntegerField()
    rank = models.IntegerField()
    final_score = models.FloatField()
    match_percentage = models.IntegerField()
    explanation_text = models.TextField(blank=True)
    scoring_breakdown = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 6.3 -- Create Explanation Engine

**File: `reco-backend/apps/recommendations/explanation.py`**

**Logic (from FSD Section 11):**
- For each of the top 3 products, call Bedrock:
  ```
  Given this customer's preferences [voice tags + answers] and this product [features],
  explain why this product is recommended. Be specific about feature matches.
  Include: whyRecommended, fitSummary, keyHighlights, matchedBenefits, tradeOffs, pros, cons.
  ```
- Cache result in `RecommendationResult.explanation_text`
- Cache key: product_id + answer_hash (same answers + same product = same explanation)

### Step 6.4 -- Create Moderation Override Logic

**File: `reco-backend/apps/recommendations/scoring.py`** (add to scoring pipeline)

**Two sources of moderation (from FSD Section 10):**
1. **Knowledge docs from OpenSearch** -- RAG retrieval of rule chunks, injected into LLM prompts
2. **Business overrides from MySQL** -- `moderation_rules` table: campaign boosts, SKU pushes, suppression

**Logic:**
- Before scoring: query OpenSearch `reco_moderation_docs` for relevant rules based on packet/category
- After base scoring: apply MySQL overrides:
  - Boost: multiply score by `boost_strength` if product meets `min_fit_threshold`
  - Suppress: set score to 0
  - Push: guarantee inclusion in top 3 if `min_fit_threshold` met

### Step 6.5 -- Create Recommendations View

**File: `reco-backend/apps/recommendations/views.py`**

**Endpoint:** `GET /api/sessions/{id}/recommendations`
- Auth: `SessionAuthentication` + `IsAuthenticated`
- Logic:
  1. Load session, voice tags, answers
  2. Load packet products and features
  3. Run scoring pipeline
  4. Generate LLM explanations for top 3
  5. Save `RecommendationResult` records
  6. Return top 3 with full detail:
    ```json
    {
      "recommendations": [
        {
          "rank": 1,
          "product": { ...full product data... },
          "match_percentage": 96,
          "explanation": {
            "whyRecommended": "...",
            "fitSummary": "...",
            "keyHighlights": [...],
            "matchedBenefits": [...],
            "tradeOffs": [...],
            "pros": [...],
            "cons": [...]
          }
        },
        ...
      ]
    }
    ```

### Step 6.6 -- Create Product Detail View

**File: `reco-backend/apps/recommendations/views.py`** (add)

**Endpoint:** `GET /api/products/{id}`
- Returns merged product data: manual content + crawled content
- Includes: specs, gallery, documents, accessories, finance, salesperson tips
- Merges from `products`, `product_content`, `crawled_product_content`, `accessories`, `finance_schemes` tables

### Step 6.7 -- Wire Recommendation URLs

```python
urlpatterns = [
    path('sessions/<int:session_id>/recommendations', views.get_recommendations),
    path('products/<int:product_id>', views.get_product_detail),
]
```

---

## 10. Phase 7 -- Comparison Engine

**Goal:** Implement two-product comparison with learn-once caching.

### Step 7.1 -- Create Comparison Cache Model

**File: `reco-backend/apps/comparisons/models.py`**

```python
class ComparisonCache(models.Model):
    cache_id = models.AutoField(primary_key=True)
    product_pair_key = models.CharField(max_length=100, db_index=True)  # "123-456" sorted
    feature_set_hash = models.CharField(max_length=64)  # SHA-256 of feature values
    cmid = models.IntegerField()
    commentary = models.JSONField()        # Per-feature commentary
    implications = models.JSONField()       # Trade-off narratives per product
    winner_by_feature = models.JSONField()  # Which product wins each feature
    hit_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Step 7.2 -- Create Comparator Service

**File: `reco-backend/apps/comparisons/comparator.py`**

**Logic (from FSD Section 12, Architecture Section 7.2):**
1. Receive two product IDs
2. Generate `product_pair_key` (sorted: `min(id1,id2)-max(id1,id2)`)
3. Generate `feature_set_hash` from both products' feature values
4. Check cache: `ComparisonCache.objects.filter(product_pair_key=key, feature_set_hash=hash)`
5. If cache HIT:
   - Increment `hit_count`
   - Return cached commentary + implications
6. If cache MISS:
   - Call Bedrock with both products' features
   - Prompt: Compare these two products feature by feature. For each comparable feature, declare a winner and explain why. Generate implications (trade-off narratives) for each product.
   - Save to `ComparisonCache`
   - Return fresh result

**Cache is global within tenant** -- a comparison at one outlet benefits all outlets.  
**Invalidation:** Only when product features change (feature_set_hash changes).

### Step 7.3 -- Create Comparison View

**File: `reco-backend/apps/comparisons/views.py`**

**Endpoint:** `POST /api/comparisons/`
- Request body: `{"product_id_1": 123, "product_id_2": 456}`
- Returns:
  ```json
  {
    "product_1": { ...product data... },
    "product_2": { ...product data... },
    "feature_comparison": [
      {
        "feature": "Battery Life",
        "product_1_value": "18 hours",
        "product_2_value": "12 hours",
        "winner": "product_1",
        "commentary": "The Yoga Slim offers 50% more battery..."
      },
      ...
    ],
    "implications": {
      "product_1": ["Best for all-day portability...", ...],
      "product_2": ["Best for raw performance...", ...]
    },
    "cache_hit": true
  }
  ```

### Step 7.4 -- Wire Comparison URLs

```python
urlpatterns = [
    path('comparisons/', views.compare_products),
]
```

---

## 11. Phase 8 -- Product Chat Widget Backend

**Goal:** Implement the RAG-powered product chatbot.

**Dependency:** Phase 14 (OpenSearch) must be at least partially complete for the `reco_product_kb` index.

### Step 8.1 -- Create RAG Service

**File: `reco-backend/apps/product_chat/rag_service.py`**

**Logic (from FSD Section 13):**
1. Receive: customer question, product_id(s), cmid
2. Query OpenSearch `reco_product_kb` index:
   - Filter by `product_id` (single product) or `product_id IN [id1, id2]` (comparison context)
   - Full-text search on `chunk_text` with customer's question
   - Return top 5 relevant chunks
3. Call Bedrock with prompt:
   ```
   You are a product expert. Answer the customer's question using ONLY the following product information.
   If the information doesn't cover the question, say so honestly.
   
   Product Knowledge:
   [retrieved chunks]
   
   Customer Question: [question]
   ```
4. Return grounded answer

### Step 8.2 -- Create Chat View

**File: `reco-backend/apps/product_chat/views.py`**

**Endpoint:** `POST /api/chat/ask`
- Request body:
  ```json
  {
    "question": "How long does the battery last?",
    "product_ids": [123],
    "session_id": 1
  }
  ```
- Returns:
  ```json
  {
    "answer": "Based on the specifications, the Yoga Slim 7i offers up to 18 hours of battery life...",
    "sources": ["product_specs", "crawled_review"]
  }
  ```

### Step 8.3 -- Create Chat History Model (Optional for MVP)

**File: `reco-backend/apps/product_chat/models.py`**

```python
class ChatMessage(models.Model):
    message_id = models.AutoField(primary_key=True)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE)
    product_ids = models.JSONField()
    question = models.TextField()
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 8.4 -- Wire Chat URLs

```python
urlpatterns = [
    path('chat/ask', views.ask),
]
```

---

## 12. Phase 9 -- Feedback and Learning System

**Goal:** Implement star ratings and the nightly feedback pattern analysis loop.

### Step 9.1 -- Create Feedback Models

**File: `reco-backend/apps/feedback/models.py`**

```python
class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE)
    rating = models.IntegerField()  # 1-5
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    recommended_products = models.JSONField()  # [product_id, product_id, product_id]
    customer_answers = models.JSONField()       # Full answer context
    voice_tags = models.JSONField(null=True)
    scoring_weights = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class FeedbackPattern(models.Model):
    pattern_id = models.AutoField(primary_key=True)
    cmid = models.IntegerField()
    packet_id = models.IntegerField()
    input_profile_hash = models.CharField(max_length=64)
    product_combination_hash = models.CharField(max_length=64)
    avg_rating = models.FloatField()
    session_count = models.IntegerField()
    pattern_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Step 9.2 -- Create Feedback Submission View

**File: `reco-backend/apps/feedback/views.py`**

**Endpoint:** `POST /api/feedback/`
- Request body:
  ```json
  {
    "session_id": 1,
    "rating": 4
  }
  ```
- Logic:
  1. Load session, get top 3 recommendation results, answers, voice tags
  2. Save `Feedback` record with full context
  3. Update `CustomerSession.recommendation_feedback_stars`
  4. Index to OpenSearch `reco_feedback` for analytics
  5. Return success

### Step 9.3 -- Create Pattern Analyzer

**File: `reco-backend/apps/feedback/pattern_analyzer.py`**

**Logic (from FSD Section 14):**
- Nightly batch job via Django Q
- Groups feedback by: `cmid + packet_id + input_profile_hash + product_combination_hash`
- For each group with >= 3 sessions:
  - Calculate average rating
  - If avg < 2.5: flag as "poor pattern" -- LLM should avoid this combination
  - If avg > 4.0: flag as "strong pattern" -- LLM should favor this combination
  - Store in `FeedbackPattern` table
- These patterns are queried during recommendation generation (Phase 6) and injected into the LLM prompt

### Step 9.4 -- Create Django Q Task

**File: `reco-backend/apps/feedback/tasks.py`**

```python
from django_q.tasks import schedule

# Schedule nightly pattern analysis
schedule(
    'apps.feedback.pattern_analyzer.analyze_patterns',
    schedule_type='D',  # Daily
    next_run=datetime.combine(date.today() + timedelta(days=1), time(2, 0)),  # 2 AM
)
```

### Step 9.5 -- Wire Feedback URLs

```python
urlpatterns = [
    path('feedback/', views.submit_feedback),
]
```

---

## 13. Phase 10 -- Lead Capture, Handoff, and Email Share

**Goal:** Implement the lead/handoff/share pipeline.

### Step 10.1 -- Create Lead and Handoff Models

**File: `reco-backend/apps/leads/models.py`**

```python
class Lead(models.Model):
    lead_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey('customers.CustomerProfile', on_delete=models.CASCADE)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE)
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    lead_status = models.CharField(max_length=20, default='new')
    selected_product_id = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class HandoffRequest(models.Model):
    handoff_id = models.AutoField(primary_key=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE)
    outlet_id = models.IntegerField()
    product_id = models.IntegerField()
    status = models.CharField(max_length=20, default='pending')
    discussion_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ShareEvent(models.Model):
    share_id = models.AutoField(primary_key=True)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE)
    share_method = models.CharField(max_length=20, default='email')
    recipient = models.CharField(max_length=255)
    ses_message_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Step 10.2 -- Create Email Service

**File: `reco-backend/apps/leads/email_service.py`**

**Logic:**
- Use `reco-backend/apps/common/ses_client.py`
- Build email from template:
  - Subject: "Your product recommendations from [Brand Name]"
  - Body: Product names, match percentages, key highlights, prices, fit summaries
- Send via Amazon SES
- Return SES message ID

### Step 10.3 -- Create Handoff View

**File: `reco-backend/apps/leads/views.py`**

**Endpoint:** `POST /api/handoff/`
- Request body:
  ```json
  {
    "session_id": 1,
    "product_id": 123,
    "discussion_note": "Customer interested in Yoga Slim 7i"
  }
  ```
- Logic: Create `Lead` + `HandoffRequest`. No SMS in MVP.

**Endpoint:** `GET /api/handoff/pending`
- Returns pending handoffs for the authenticated user's outlet
- Filtered by `outlet_id` from session context

### Step 10.4 -- Create Share Email View

**File: `reco-backend/apps/leads/views.py`** (add)

**Endpoint:** `POST /api/share/email`
- Request body:
  ```json
  {
    "session_id": 1,
    "recipient_email": "customer@email.com"
  }
  ```
- Logic:
  1. Load session recommendations
  2. Build email content
  3. Send via SES
  4. Save `ShareEvent` record

**Endpoint:** `POST /api/share/whatsapp`
- Returns `501 Not Implemented` (Phase 2)

### Step 10.5 -- Wire Lead URLs

```python
urlpatterns = [
    path('handoff/', views.create_handoff),
    path('handoff/pending', views.pending_handoffs),
    path('share/email', views.share_email),
    path('share/whatsapp', views.share_whatsapp),
]
```

---

## 14. Phase 11 -- React Frontend API Integration

**Goal:** Replace all mock data in the React frontend with real API calls. Keep the exact same look and feel -- no UI changes, only data source changes.

**Important:** The `LandingScreen` currently has a mock login form. This will be replaced by an auth check that redirects to the Angular login gateway if not authenticated.

### Step 11.1 -- Create API Service Layer

**What:** Create a centralized API client with `credentials: 'include'` for cookie-based auth.

**File: `Reco-Frontend/src/app/services/api.ts`**

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    window.location.href = import.meta.env.VITE_LOGIN_URL || '/';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

### Step 11.2 -- Create AuthContext and Auth Check

**File: `Reco-Frontend/src/app/context/AuthContext.tsx`**

**What:** Context provider that calls `GET /users/loginUserDetails` on mount.

**State:**
```typescript
interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  user: {
    uid: number;
    cmid: number;
    email: string;
    firstName: string;
    lastName: string;
    role: number;  // 1=admin, 2=staff
  } | null;
  brand: {
    cmName: string;
    cmColor: string;
    logoImageUrl: string;
  } | null;
}
```

**Logic:**
- On mount: call `GET /users/loginUserDetails`
- If 200: populate user + brand state, set `isAuthenticated = true`
- If 401: redirect to Angular login app
- Expose `logout()` method that calls `GET /login/user_logout` then redirects

### Step 11.3 -- Update App.tsx and Routes

**File: `Reco-Frontend/src/app/App.tsx`**
- Wrap with `AuthProvider`
- Show loading spinner while auth check in progress

**File: `Reco-Frontend/src/app/routes.tsx`**
- Remove `LandingScreen` route at `/` (login is now Angular)
- Make `/consent` the default route for authenticated users
- Add auth guard: if not authenticated, redirect to login URL
- Keep all other routes the same

### Step 11.4 -- Create Per-Screen API Service Files

**Files to create:**

| File | Methods | Backend Endpoint |
|------|---------|-----------------|
| `services/sessionApi.ts` | `createSession(data)` | `POST /api/sessions/` |
| `services/customerApi.ts` | `captureCustomer(data)` | `POST /api/customers/` |
| `services/voiceApi.ts` | `transcribe(audioBlob)`, `analyzeText(text)` | `POST /api/voice/transcribe`, `POST /api/voice/analyze-text` |
| `services/questionApi.ts` | `submitAnswer(sessionId, data)` | `POST /api/sessions/{id}/answer` |
| `services/recommendationApi.ts` | `getRecommendations(sessionId)` | `GET /api/sessions/{id}/recommendations` |
| `services/comparisonApi.ts` | `compareProducts(id1, id2)` | `POST /api/comparisons/` |
| `services/chatApi.ts` | `askQuestion(question, productIds, sessionId)` | `POST /api/chat/ask` |
| `services/feedbackApi.ts` | `submitFeedback(sessionId, rating)` | `POST /api/feedback/` |
| `services/leadApi.ts` | `createHandoff(data)`, `shareEmail(data)` | `POST /api/handoff/`, `POST /api/share/email` |
| `services/productApi.ts` | `getProduct(id)` | `GET /api/products/{id}` |

Each file uses the `apiFetch` wrapper from `api.ts`.

### Step 11.5 -- Update ConsentScreen

**File: `Reco-Frontend/src/app/screens/ConsentScreen.tsx`**

**Changes:**
- On "Continue": call `createSession()` then `captureCustomer()` with form data
- Store `session_id` and `conversation_id` in JourneyContext
- Brand name in header comes from `AuthContext.brand.cmName` instead of hardcoded
- Use `AuthContext.brand.cmColor` for accent color theming

### Step 11.6 -- Update VoiceDiscoveryScreen and VoiceResultsScreen

**File: `Reco-Frontend/src/app/screens/VoiceDiscoveryScreen.tsx`**

**Changes:**
- Voice mode: send recorded audio blob to `POST /api/voice/transcribe`
- Text mode: send text to `POST /api/voice/analyze-text`
- Replace mock transcript with real API response
- Replace mock tags with real extracted tags
- Store real tags in JourneyContext.voiceTags

**File: `Reco-Frontend/src/app/screens/VoiceResultsScreen.tsx`**
- Tags are now from API (already in JourneyContext)
- Keep editable tag UI -- user edits are sent with session data

### Step 11.7 -- Update GuidedQuestionsScreen

**File: `Reco-Frontend/src/app/screens/GuidedQuestionsScreen.tsx`**

**Changes:**
- Instead of using static `mockQuestions` array, fetch first question from API
- On each answer submission: call `POST /api/sessions/{id}/answer`
- API returns the next question dynamically (LLM-generated)
- If API returns `{done: true}`: navigate to `/processing`
- Keep the same card-based UI, slide animations, auto-advance behavior
- Pre-fill from voice tags still works (backend handles this)

### Step 11.8 -- Update RecommendationsScreen

**File: `Reco-Frontend/src/app/screens/RecommendationsScreen.tsx`**

**Changes:**
- Call `GET /api/sessions/{id}/recommendations` on mount
- Map API response to the same product shape the UI expects
- Replace `mockProducts` data with real products from API
- Star feedback: call `POST /api/feedback/` on submit
- Keep all animations, glow effects, comet borders, comparison selection logic

### Step 11.9 -- Update ComparisonScreen

**File: `Reco-Frontend/src/app/screens/ComparisonScreen.tsx`**

**Changes:**
- Call `POST /api/comparisons/` with selected product IDs
- Map API comparison response to the feature comparison table
- Replace mock implications with real LLM-generated implications
- Winner highlighting uses `winner_by_feature` from API

### Step 11.10 -- Update ProductDetailScreen

**File: `Reco-Frontend/src/app/screens/ProductDetailScreen.tsx`**

**Changes:**
- Call `GET /api/products/{id}` on mount
- Populate all 6 tabs from API data instead of mock data
- Gallery images from S3 URLs (via CloudFront)
- Documents from API (real brochure links)

### Step 11.11 -- Update ProductChatWidget

**File: `Reco-Frontend/src/app/components/ProductChatWidget.tsx`**

**Changes:**
- Replace mock keyword matching with real API call: `POST /api/chat/ask`
- Send product IDs as context (single product on detail page, both on comparison page)
- Show real LLM-generated answers from Bedrock
- Keep the same chat bubble UI, FAB button, message history

### Step 11.12 -- Update LeadCaptureScreen, ShareSaveScreen, ConfirmationScreen

**File: `Reco-Frontend/src/app/screens/LeadCaptureScreen.tsx`**
- "Send alert" calls `POST /api/handoff/`
- Pre-fill customer info from JourneyContext (captured at consent)

**File: `Reco-Frontend/src/app/screens/ShareSaveScreen.tsx`**
- "Send email" calls `POST /api/share/email`
- WhatsApp button stays present but shows "Coming soon" toast

**File: `Reco-Frontend/src/app/screens/ConfirmationScreen.tsx`**
- "Start new session" calls `resetJourney()` in context + clears session_id
- No API call needed

---

## 15. Phase 12 -- Admin Setup (Packet Builder)

**Goal:** Set up Django Admin for brand configuration, product management, and Excel upload.

### Step 12.1 -- Create Packet and Product Models

**File: `reco-backend/apps/packets/models.py`**

**Models (from FSD Section 17.2):**

```python
class Packet(models.Model):
    packet_id = models.AutoField(primary_key=True)
    cmid = models.IntegerField(db_index=True)
    category = models.CharField(max_length=100)
    brand = models.CharField(max_length=100)
    launch_status = models.CharField(max_length=20, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE)
    product_code = models.CharField(max_length=50, unique=True)
    model = models.CharField(max_length=255)
    family = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    product_url = models.URLField(blank=True)
    crawl_status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

class Feature(models.Model):
    feature_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE)
    feature_code = models.CharField(max_length=50)
    feature_name = models.CharField(max_length=100)
    feature_type = models.CharField(max_length=50)
    is_comparable = models.BooleanField(default=True)
    is_scoreable = models.BooleanField(default=True)

class FeatureValue(models.Model):
    value_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE)
    value = models.TextField()
    normalized_value = models.FloatField(null=True)

class BenefitMapping(models.Model):
    mapping_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE)
    benefit_name = models.CharField(max_length=100)
    feature_code = models.CharField(max_length=50)
    weight_impact = models.FloatField()

class Dimension(models.Model):
    dimension_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE)
    dimension_name = models.CharField(max_length=100)
    priority = models.IntegerField(default=1)
    seed_questions = models.JSONField()

class ScoringConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE)
    default_weights = models.JSONField()
    hard_filters = models.JSONField(null=True)
    stopping_rules = models.JSONField(null=True)

class ProductContent(models.Model):
    content_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    hero_image_url = models.URLField(blank=True)
    gallery_urls = models.JSONField(default=list)
    fit_summary = models.TextField(blank=True)
    key_highlights = models.JSONField(default=list)
    best_for = models.CharField(max_length=255, blank=True)
    salesperson_tips = models.JSONField(default=list)

class Accessory(models.Model):
    accessory_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    accessory_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    image_url = models.URLField(blank=True)

class FinanceScheme(models.Model):
    scheme_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    scheme_name = models.CharField(max_length=255)
    valid_from = models.DateField(null=True)
    valid_until = models.DateField(null=True)
```

### Step 12.2 -- Create Retail Outlets Model

**File: `reco-backend/apps/packets/models.py`** (add)

```python
class RetailOutlet(models.Model):
    outlet_id = models.AutoField(primary_key=True)
    cmid = models.IntegerField(db_index=True)
    outlet_name = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    geography_zone = models.CharField(max_length=50, blank=True)
    assigned_packets = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
```

### Step 12.3 -- Create Moderation and Lead Config Models

**File: `reco-backend/apps/moderation/models.py`**

```python
class ModerationRule(models.Model):
    rule_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey('packets.Packet', on_delete=models.CASCADE)
    target_type = models.CharField(max_length=50)   # boost, suppress, push
    target_product_id = models.IntegerField(null=True)
    boost_strength = models.FloatField(default=1.0)
    min_fit_threshold = models.FloatField(default=0.3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**File: `reco-backend/apps/leads/models.py`** (add)

```python
class LeadCaptureConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey('packets.Packet', on_delete=models.CASCADE)
    required_fields = models.JSONField(default=list)
    consent_text = models.TextField()
    email_template_id = models.CharField(max_length=100, blank=True)
```

### Step 12.4 -- Register Django Admin

**File: `reco-backend/apps/packets/admin.py`**

Register all models with Django Admin. Add inline editing for related models:
- `PacketAdmin` with inline `ProductInline`, `FeatureInline`, `DimensionInline`
- `ProductAdmin` with inline `FeatureValueInline`, `ProductContentInline`, `AccessoryInline`, `FinanceSchemeInline`
- `RetailOutletAdmin` with filters by `cmid`, `city`

### Step 12.5 -- Create Excel Upload Endpoint

**File: `reco-backend/apps/packets/excel_importer.py`**

**Logic:**
- Accept `.xlsx` file upload via Django Admin or API
- Parse columns: product_code, model, family, price, product_url, feature columns (dynamic)
- Create/update `Product` and `FeatureValue` records
- For rows with `product_url`: mark `crawl_status = 'pending'` for async crawl

**File: `reco-backend/apps/packets/views.py`**

**Endpoint:** `POST /api/packets/{id}/upload-products`
- Auth: Brand admin only (rid=1)
- Request: `multipart/form-data` with Excel file
- Returns: `{"created": N, "updated": N, "errors": [...]}`

### Step 12.6 -- Create Packet Config Endpoint

**Endpoint:** `GET /api/packets/{id}`
- Returns full packet configuration:
  - Products with features
  - Dimensions with seed questions
  - Scoring config
  - Moderation rules

---

## 16. Phase 13 -- Analytics and Dashboard

**Goal:** Track interaction events and provide role-based dashboard metrics.

### Step 13.1 -- Create Event Tracking Model and Utility

**File: `reco-backend/apps/analytics/models.py`**

```python
class InteractionEvent(models.Model):
    event_id = models.AutoField(primary_key=True)
    session = models.ForeignKey('sessions_app.CustomerSession', on_delete=models.CASCADE, null=True)
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    user_id = models.IntegerField(null=True)
    event_type = models.CharField(max_length=50, db_index=True)
    event_data = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**File: `reco-backend/apps/analytics/event_tracker.py`**

Utility function called throughout the backend:
```python
def track_event(session_id, cmid, outlet_id, user_id, event_type, event_data=None):
    InteractionEvent.objects.create(...)
    # Also index to OpenSearch reco_journey_trails
```

**Event types:**
- `session_started`, `consent_given`, `voice_recorded`, `text_submitted`
- `question_answered`, `recommendations_generated`, `feedback_submitted`
- `comparison_viewed`, `product_detail_viewed`, `chat_question_asked`
- `handoff_created`, `email_shared`, `session_completed`

### Step 13.2 -- Instrument All Backend Views

**What:** Add `track_event()` calls to every view in phases 3-10.

Examples:
- `sessions_app/views.py`: `track_event(session_id, ..., 'session_started')`
- `voice/views.py`: `track_event(session_id, ..., 'voice_recorded', {'language': 'en'})`
- `feedback/views.py`: `track_event(session_id, ..., 'feedback_submitted', {'rating': 4})`

### Step 13.3 -- Create Dashboard Metrics View

**File: `reco-backend/apps/analytics/views.py`**

**Endpoint:** `GET /api/analytics/overview`
- Auth: `SessionAuthentication` + `IsAuthenticated`
- Query params: `period=7d|30d|90d`
- Logic:
  - If user is admin (rid=1): aggregate across all outlets for tenant
  - If user is staff (rid=2): filter to user's outlet only
- Returns:
  ```json
  {
    "total_sessions": 1234,
    "completed_sessions": 987,
    "avg_feedback_rating": 4.2,
    "top_recommended_products": [...],
    "comparison_count": 456,
    "email_shares": 234,
    "sessions_by_day": [...],
    "avg_questions_per_session": 4.1,
    "discovery_mode_split": {"voice": 45, "text": 35, "guided": 20}
  }
  ```

### Step 13.4 -- Wire Analytics URLs

```python
urlpatterns = [
    path('analytics/overview', views.analytics_overview),
]
```

---

## 17. Phase 14 -- OpenSearch Integration

**Goal:** Set up all OpenSearch indexes and the indexing/querying pipelines.

### Step 14.1 -- Create OpenSearch Client

**File: `reco-backend/apps/common/opensearch_client.py`** (flesh out stub)

```python
from opensearchpy import OpenSearch

class OpenSearchClient:
    def __init__(self):
        self.client = OpenSearch(
            hosts=[{'host': settings.OPENSEARCH_HOST, 'port': settings.OPENSEARCH_PORT}],
            http_auth=(settings.OPENSEARCH_USER, settings.OPENSEARCH_PASS),
            use_ssl=True,
            verify_certs=True,
        )
    
    def create_index(self, index_name, mapping):
        ...
    
    def index_document(self, index_name, doc_id, body):
        ...
    
    def search(self, index_name, query, size=10):
        ...
    
    def bulk_index(self, index_name, documents):
        ...
```

### Step 14.2 -- Create Index Definitions

**File: `reco-backend/apps/common/opensearch_indexes.py`**

Four indexes (from Architecture Section 9):

```python
JOURNEY_TRAILS_MAPPING = {
    "properties": {
        "conversation_id": {"type": "keyword"},
        "timestamp": {"type": "date"},
        "event_type": {"type": "keyword"},
        "event_data": {"type": "object", "enabled": True},
        "cmid": {"type": "integer"},
        "outlet_id": {"type": "integer"},
    }
}

MODERATION_DOCS_MAPPING = {
    "properties": {
        "doc_id": {"type": "keyword"},
        "chunk_id": {"type": "keyword"},
        "packet_id": {"type": "integer"},
        "cmid": {"type": "integer"},
        "chunk_text": {"type": "text", "analyzer": "standard"},
        "is_active": {"type": "boolean"},
    }
}

PRODUCT_KB_MAPPING = {
    "properties": {
        "chunk_id": {"type": "keyword"},
        "product_id": {"type": "integer"},
        "cmid": {"type": "integer"},
        "content_type": {"type": "keyword"},  # specs, fab, description, crawled
        "chunk_text": {"type": "text", "analyzer": "standard"},
    }
}

FEEDBACK_MAPPING = {
    "properties": {
        "feedback_id": {"type": "integer"},
        "session_id": {"type": "integer"},
        "cmid": {"type": "integer"},
        "product_ids": {"type": "integer"},
        "rating": {"type": "integer"},
        "created_at": {"type": "date"},
    }
}
```

### Step 14.3 -- Create Index Management Command

**File: `reco-backend/apps/common/management/commands/setup_opensearch.py`**

Django management command: `python manage.py setup_opensearch`
- Creates all 4 indexes if they don't exist
- Updates mappings if indexes exist

### Step 14.4 -- Create Product KB Indexer

**File: `reco-backend/apps/common/opensearch_indexer.py`**

**Logic:**
- Called after product creation/update and after crawl completion
- Chunks product data into OpenSearch documents:
  - Specs: one chunk per feature group
  - Description: chunked by paragraph
  - FAB (features-advantages-benefits): one chunk
  - Crawled content: chunked by section
- Indexes into `reco_product_kb`

### Step 14.5 -- Create Moderation Doc Indexer

**File: `reco-backend/apps/moderation/opensearch_indexer.py`**

**Logic (from FSD Section 10):**
- Admin uploads moderation doc (plain text or file: Word/PDF)
- File stored on S3
- Content extracted (text from doc, PDF parsed)
- Content chunked (by paragraph/section, ~500 tokens per chunk)
- Each chunk indexed to `reco_moderation_docs` with `packet_id` and `cmid`

**Endpoint:** `POST /api/moderation/docs/`
- Auth: Brand admin only
- Request: `multipart/form-data` with file OR `{"text": "..."}`
- Returns: `{"doc_id": "...", "chunks_indexed": N}`

---

## 18. Phase 15 -- Web Crawling and Content Enrichment

**Goal:** Crawl product URLs for content enrichment.

### Step 15.1 -- Create Crawl Models

**File: `reco-backend/apps/crawl/models.py`**

```python
class CrawledProductContent(models.Model):
    crawl_id = models.AutoField(primary_key=True)
    product = models.ForeignKey('packets.Product', on_delete=models.CASCADE)
    crawl_url = models.URLField()
    crawl_status = models.CharField(max_length=20, default='pending')
    crawled_description = models.TextField(blank=True)
    crawled_highlights = models.JSONField(default=list)
    crawled_images = models.JSONField(default=list)
    raw_html = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class CrawlConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    brand_domain = models.CharField(max_length=255, unique=True)
    description_selector = models.CharField(max_length=255, blank=True)  # CSS selector
    gallery_selector = models.CharField(max_length=255, blank=True)
    highlights_selector = models.CharField(max_length=255, blank=True)
    use_llm_fallback = models.BooleanField(default=True)
```

### Step 15.2 -- Create Crawler Service

**File: `reco-backend/apps/crawl/crawler.py`**

**Logic:**
1. Fetch product page HTML via `requests.get(product_url)`
2. Check if `CrawlConfig` exists for this domain
3. If CSS selectors configured: use BeautifulSoup to extract:
   - Description text
   - Highlight bullet points
   - Gallery images (download to S3)
4. If selectors fail or `use_llm_fallback = True`:
   - Send raw HTML to Bedrock:
     ```
     Extract the product description, key highlights, and image URLs from this HTML.
     Return structured JSON.
     ```
5. Save to `CrawledProductContent`
6. Update `Product.crawl_status = 'completed'`
7. Re-index product to OpenSearch `reco_product_kb`

### Step 15.3 -- Create Async Crawl Task

**File: `reco-backend/apps/crawl/tasks.py`**

```python
from django_q.tasks import async_task

def trigger_product_crawl(product_id):
    async_task('apps.crawl.crawler.crawl_product', product_id)
```

**Endpoint:** `POST /api/crawl/product/{id}`
- Auth: Brand admin only
- Queues async crawl via Django Q
- Returns: `{"status": "queued"}`

### Step 15.4 -- Create Bulk Crawl After Excel Upload

**What:** After Excel upload (Phase 12), automatically queue crawl for all products with `product_url` and `crawl_status = 'pending'`.

**Modify:** `reco-backend/apps/packets/excel_importer.py` to call `trigger_product_crawl()` for each new product with a URL.

---

## 19. Phase 16 -- End-to-End Integration and Polish

**Goal:** Wire everything together, test the full flow, fix edge cases.

### Step 16.1 -- Cookie Domain Configuration

**What:** Ensure cookies work across Angular login and React app.

**Django production settings:**
```python
SESSION_COOKIE_DOMAIN = '.reco.bsharpcorp.com'
CSRF_COOKIE_DOMAIN = '.reco.bsharpcorp.com'
CSRF_COOKIE_HTTPONLY = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'https://login.reco.bsharpcorp.com',
    'https://app.reco.bsharpcorp.com',
]
```

**Local dev:** No domain needed (both apps use `localhost` with different ports).

### Step 16.2 -- Angular -> React Redirect Flow

**What:** Verify the complete login flow:

1. User visits `app.reco.bsharpcorp.com`
2. React calls `GET /users/loginUserDetails`
3. 401 -> redirect to `login.reco.bsharpcorp.com`
4. Angular shows login form
5. User logs in -> Django sets `sessionid` cookie on `.reco.bsharpcorp.com`
6. Angular redirects to `app.reco.bsharpcorp.com`
7. React calls `GET /users/loginUserDetails` again -> 200
8. React loads consent screen with brand info

**Test locally:**
- Angular on `localhost:4200`
- React on `localhost:5173`
- Django on `localhost:8000`
- Vite proxy forwards `/login` and `/users` to Django

### Step 16.3 -- Brand Theming Integration

**What:** Apply `cm_color` from `CelebrateCompanies` throughout the React app.

**Logic in `AuthContext`:**
- On successful auth, set CSS custom property: `document.documentElement.style.setProperty('--brand-color', brand.cmColor)`
- Update `BrandMark` to use `brand.logoImageUrl` from auth context
- Top bar shows `brand.cmName`

### Step 16.4 -- Journey Audit Trail

**What:** Ensure every step of the customer journey is logged to OpenSearch `reco_journey_trails`.

**Events to verify:**
- Session created, consent given, discovery mode chosen
- Voice recorded / text submitted, tags confirmed
- Each question answered
- Recommendations generated, feedback given
- Comparison viewed, product detail viewed
- Chat questions asked, handoff created, email shared
- Session completed

### Step 16.5 -- Error Handling and Edge Cases

**What:** Handle gracefully:
- Network errors during voice recording
- Whisper timeout on long audio
- Bedrock rate limiting / throttling
- Session expiry mid-journey
- Browser back button behavior
- Empty recommendation results (no products match)
- Comparison of products with missing features

### Step 16.6 -- Performance Optimization

**What:**
- Verify comparison cache hit rates
- Ensure Whisper model stays loaded (not re-loaded per request)
- Check OpenSearch query latency
- Verify LLM response times for question generation
- Add loading states for all API calls in React
- Ensure the 2.2s processing screen covers actual recommendation generation time

---

## 20. Dependency Graph

```
Phase 0 (Scaffolding)
  |
  +---> Phase 1 (Angular Login)
  |
  +---> Phase 2 (Django Foundation)
          |
          +---> Phase 3 (Session/Customer APIs)
          |       |
          |       +---> Phase 10 (Lead/Handoff/Email)
          |       +---> Phase 13 (Analytics)
          |
          +---> Phase 4 (Voice Pipeline)
          |       |
          |       +---> Phase 5 (Question Orchestrator)
          |               |
          |               +---> Phase 6 (Recommendation Engine)
          |                       |
          |                       +---> Phase 7 (Comparison Engine)
          |                       +---> Phase 9 (Feedback/Learning)
          |
          +---> Phase 12 (Packet Builder / Admin)
          |       |
          |       +---> Phase 15 (Web Crawling)
          |
          +---> Phase 14 (OpenSearch Integration)
                  |
                  +---> Phase 8 (Product Chat Backend)
  
  Phases 1-15 ---> Phase 11 (React Frontend API Integration)
                         |
                         +---> Phase 16 (End-to-End Integration)
```

**Critical path:** 0 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 11 -> 16

**Parallel tracks:**
- Phase 1 (Angular) can be built in parallel with Phases 2-10 (backend)
- Phase 12 (Admin) can be built in parallel with Phases 4-10 (runtime services)
- Phase 14 (OpenSearch) can be built in parallel with Phases 3-7, but must complete before Phase 8
- Phase 11 (React integration) can start incrementally as each backend phase completes

---

## 21. Technology Reference

### Backend Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Django | 4.2+ | Web framework |
| djangorestframework | 3.14+ | REST API |
| django-cors-headers | 4.3+ | CORS for cross-origin cookies |
| django-ratelimit | 4.1+ | Rate limiting on login endpoint |
| django-q2 | 1.6+ | Async task queue (DB-backed, no Redis) |
| mysqlclient | 2.2+ | MySQL connector |
| boto3 | 1.34+ | AWS SDK (Bedrock, S3, SES) |
| opensearch-py | 2.4+ | OpenSearch client |
| openai-whisper | 20231117 | Speech-to-text |
| ffmpeg-python | 0.2+ | Audio format conversion |
| openpyxl | 3.1+ | Excel parsing |
| beautifulsoup4 | 4.12+ | HTML parsing for crawling |
| lxml | 5.1+ | Fast HTML/XML parser |
| gunicorn | 21.2+ | WSGI server |

### Frontend Stack (Existing)

| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 6.3 | Build tool |
| Tailwind CSS 4.1 | Utility CSS |
| Motion (Framer Motion) | Animations |
| shadcn/ui + Radix | Component library |
| Recharts | Charts (analytics) |
| Lucide React | Icons |

### Angular Login Stack (New, Minimal)

| Package | Purpose |
|---------|---------|
| Angular 19 | Framework (matching Converse version) |
| ngx-cookie-service | Read CSRF token from cookies |
| @angular/forms | Login form |
| @angular/common/http | HTTP client with withCredentials |

---

## 22. Mock Data Replacement Map

This table maps every piece of mock data in the React frontend to its real data source.

### Products (`mockData.ts` -> `mockProducts`)

| Mock Field | API Source | Endpoint |
|-----------|-----------|----------|
| `id` | `Product.product_id` | `GET /api/products/{id}` |
| `brand` | `Packet.brand` | `GET /api/packets/{id}` |
| `model` | `Product.model` | `GET /api/products/{id}` |
| `family` | `Product.family` | `GET /api/products/{id}` |
| `image` | `ProductContent.hero_image_url` (S3/CloudFront) | `GET /api/products/{id}` |
| `gallery` | `ProductContent.gallery_urls` + `CrawledProductContent.crawled_images` | `GET /api/products/{id}` |
| `price` | `Product.price` | `GET /api/products/{id}` |
| `emiFrom` | `FinanceScheme` data | `GET /api/products/{id}` |
| `chip, memory, storage, display, ...` | `FeatureValue.value` per feature | `GET /api/products/{id}` |
| `bestFor` | `ProductContent.best_for` | `GET /api/products/{id}` |
| `fitSummary` | `RecommendationResult.explanation_text` (LLM) | `GET /api/sessions/{id}/recommendations` |
| `whyRecommended` | `RecommendationResult.explanation_text` (LLM) | `GET /api/sessions/{id}/recommendations` |
| `matchScore` | `RecommendationResult.match_percentage` | `GET /api/sessions/{id}/recommendations` |
| `keyHighlights` | `ProductContent.key_highlights` | `GET /api/products/{id}` |
| `matchedBenefits` | LLM explanation | `GET /api/sessions/{id}/recommendations` |
| `tradeOffs` | LLM explanation | `GET /api/sessions/{id}/recommendations` |
| `pros` / `cons` | LLM explanation | `GET /api/sessions/{id}/recommendations` |
| `implications` | LLM comparison | `POST /api/comparisons/` |
| `specs` | `FeatureValue` records | `GET /api/products/{id}` |
| `accessories` | `Accessory` records | `GET /api/products/{id}` |
| `finance` | `FinanceScheme` records | `GET /api/products/{id}` |
| `documents` | `ProductContent` + S3 brochure links | `GET /api/products/{id}` |
| `salespersonTips` | `ProductContent.salesperson_tips` | `GET /api/products/{id}` |

### Questions (`mockData.ts` -> `mockQuestions`)

| Mock Field | API Source | Endpoint |
|-----------|-----------|----------|
| `id` | Generated by orchestrator | `POST /api/sessions/{id}/answer` response |
| `question` | LLM-generated text | `POST /api/sessions/{id}/answer` response |
| `type` | LLM determines (single/multi-choice) | `POST /api/sessions/{id}/answer` response |
| `options` | LLM-generated based on product catalog | `POST /api/sessions/{id}/answer` response |
| `prefillFromTags` | Orchestrator maps voice tags | `POST /api/sessions/{id}/answer` response |
| `autoAdvance` | Backend decision | `POST /api/sessions/{id}/answer` response |

### Voice Data (`mockData.ts` -> `mockVoiceTranscriptions`, `mockExtractedTags`)

| Mock Field | API Source | Endpoint |
|-----------|-----------|----------|
| `transcript` | Whisper STT output | `POST /api/voice/transcribe` |
| `language` | Whisper detected language | `POST /api/voice/transcribe` |
| `tags[].tag` | Bedrock extraction | `POST /api/voice/transcribe` or `POST /api/voice/analyze-text` |
| `tags[].category` | Bedrock extraction | Same |

### Commentary (`mockData.ts` -> `mockCommentary`)

| Mock Field | API Source | Notes |
|-----------|-----------|-------|
| Per-screen commentary text | Generated client-side based on context | Commentary is contextual guidance, not API-driven. Can remain partially hardcoded with dynamic data interpolation (e.g., "We extracted {tags.length} preferences from your input"). |

### Chat (`ProductChatWidget.tsx` -> mock keyword matching)

| Mock Behavior | API Source | Endpoint |
|--------------|-----------|----------|
| Keyword match on "battery", "weight", etc. | OpenSearch RAG + Bedrock answer | `POST /api/chat/ask` |
| Context from `contextProducts` prop | `product_ids` sent to API | `POST /api/chat/ask` |

### Landing/Login (`LandingScreen.tsx` -> mock Retail ID login)

| Mock Behavior | Replacement | Notes |
|--------------|-------------|-------|
| Local Retail ID + password form | Angular login gateway at separate URL | `LandingScreen` removed from React routes. Auth handled by `AuthContext` + Angular redirect. |

---

*End of Build Plan v1.0*
