# Bsharp Reco -- Comprehensive Test Cases Document

**Version:** 1.0  
**Date:** April 2026  
**Purpose:** Positive and negative test cases for every build step. Used by the RALPH loop validator agent to verify each step is correctly implemented.  
**Source:** Build Plan v1.0, Architecture v5.0, FSD v3.0

---

## Test Case ID Convention

`TC-{Phase}.{Step}.{Number}{P|N}` where P = Positive, N = Negative.

Example: `TC-2.3.1P` = Phase 2, Step 3, Test 1, Positive.

---

## Phase 0 -- Project Scaffolding and Configuration

### Step 0.1 -- Initialize Angular Login Project

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-0.1.1P | Positive | Angular project compiles | Run `ng build` in `reco-login/` | Build succeeds with zero errors, output in `dist/reco-login` |
| TC-0.1.2P | Positive | Angular dev server starts | Run `ng serve --port 4200` | App accessible at `http://localhost:4200`, default page renders |
| TC-0.1.3P | Positive | Required dependencies installed | Check `package.json` for `ngx-cookie-service`, `@angular/forms`, `@angular/common` | All three packages listed in dependencies |
| TC-0.1.4P | Positive | No boilerplate content | Open `app.component.html` | Default Angular boilerplate content has been removed |
| TC-0.1.5N | Negative | No Firebase or MSAL dependencies | Check `package.json` | `@azure/msal-angular`, `@angular/fire` are NOT present |
| TC-0.1.6N | Negative | No Material dependencies | Check `package.json` | `@angular/material` is NOT present |

### Step 0.2 -- Initialize Django Backend Project

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-0.2.1P | Positive | Django project runs | Run `python manage.py runserver` in `reco-backend/` | Server starts at `http://127.0.0.1:8000` with no errors |
| TC-0.2.2P | Positive | Split settings structure exists | Check `reco_project/settings/base.py`, `dev.py`, `prod.py` | All three files exist and `base.py` contains shared `INSTALLED_APPS` |
| TC-0.2.3P | Positive | DRF is installed and configured | Check `INSTALLED_APPS` for `rest_framework` | `rest_framework` is listed |
| TC-0.2.4P | Positive | CORS configured with credentials | Check `base.py` for `CORS_ALLOW_CREDENTIALS = True` | Setting is present and `corsheaders` middleware is in `MIDDLEWARE` |
| TC-0.2.5P | Positive | Session and CSRF cookie settings correct | Check `CSRF_COOKIE_HTTPONLY = False` | Setting is `False` so JavaScript can read the CSRF token |
| TC-0.2.6N | Negative | Server rejects unknown settings module | Set `DJANGO_SETTINGS_MODULE=reco_project.settings.nonexistent`, run `manage.py check` | ImportError or ModuleNotFoundError |

### Step 0.3 -- Create requirements.txt

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-0.3.1P | Positive | All dependencies install | Run `pip install -r requirements.txt` in a clean venv | All packages install without errors |
| TC-0.3.2P | Positive | Key packages present | Grep `requirements.txt` for Django, djangorestframework, boto3, openai-whisper, opensearch-py, mysqlclient | All present with version pins |
| TC-0.3.3N | Negative | No unpinned packages | Check every line has a version constraint (`>=`, `==`, `<`) | No bare package names without version constraints |

### Step 0.4 -- Configure Two-Database Setup

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-0.4.1P | Positive | Two databases defined | Check `DATABASES` in `dev.py` | Both `default` (reco_db) and `converse` (converse_db) entries exist |
| TC-0.4.2P | Positive | Database router file exists | Check `reco-backend/db_router.py` | File exists with `ConverseRouter` class |
| TC-0.4.3P | Positive | Router routes converse_auth to converse DB | Call `router.db_for_read(CelebrateUsers, **{})` | Returns `'converse'` |
| TC-0.4.4P | Positive | Router routes other models to default DB | Call `router.db_for_read(CustomerSession, **{})` | Returns `'default'` |
| TC-0.4.5P | Positive | Router registered in settings | Check `DATABASE_ROUTERS` | Contains `'db_router.ConverseRouter'` |
| TC-0.4.6N | Negative | Router prevents converse_auth migration on default DB | Call `router.allow_migrate('default', 'converse_auth')` | Returns `False` |
| TC-0.4.7N | Negative | Router prevents reco models migration on converse DB | Call `router.allow_migrate('converse', 'sessions_app')` | Returns `False` |

### Step 0.5 -- Configure React Frontend for API Mode

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-0.5.1P | Positive | API service file exists | Check `Reco-Frontend/src/app/services/api.ts` | File exists with `apiFetch` or equivalent function |
| TC-0.5.2P | Positive | Vite proxy configured | Check `vite.config.ts` for `server.proxy` | `/api`, `/login`, `/users` proxied to `http://localhost:8000` |
| TC-0.5.3P | Positive | Environment file exists | Check `.env.development` | `VITE_API_BASE_URL` and `VITE_LOGIN_URL` defined |
| TC-0.5.4P | Positive | React app still builds | Run `npm run build` in `Reco-Frontend/` | Build succeeds |
| TC-0.5.5N | Negative | API call without backend returns error | Start React only (no Django), call `/api/sessions/` via fetch | Fetch throws or returns error (proxy connection refused) |

### Step 0.6 -- Set Up Local Development MySQL Databases

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-0.6.1P | Positive | Init SQL script creates both databases | Run `init_databases.sql` against MySQL | `reco_db` and `converse_db` databases exist |
| TC-0.6.2P | Positive | Reco user has full privileges on reco_db | Connect as `reco_user`, run `CREATE TABLE test_table(id INT)` in `reco_db` | Succeeds |
| TC-0.6.3P | Positive | Converse user is read-only | Connect as `converse_readonly`, run `SELECT 1` | Succeeds |
| TC-0.6.4P | Positive | Seed data creates test company and users | Run `seed_converse.sql`, query `celebrate_companies` | At least 1 company record exists |
| TC-0.6.5P | Positive | Seed data creates admin and staff users | Query `celebrate_users` | At least 2 users exist (1 with rid=1, 1 with rid=2 in user_roles) |
| TC-0.6.6N | Negative | Converse user cannot write | Connect as `converse_readonly`, run `INSERT INTO celebrate_users ...` | Permission denied error |
| TC-0.6.7N | Negative | Converse user cannot drop tables | Connect as `converse_readonly`, run `DROP TABLE celebrate_users` | Permission denied error |

---

## Phase 1 -- Angular Login Gateway

### Step 1.1 -- Create API Config

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.1.1P | Positive | Config file exports baseUrl, appUrl, reactAppUrl | Import from `config/api.ts` | All three exports are defined |
| TC-1.1.2P | Positive | Localhost resolves to localhost:8000 | Set `window.location.hostname = 'localhost'`, read `baseUrl` | `http://localhost:8000` |
| TC-1.1.3P | Positive | Production hostname resolves correctly | Set hostname to `login.reco.bsharpcorp.com`, read `baseUrl` | `https://api.reco.bsharpcorp.com` |
| TC-1.1.4P | Positive | reactAppUrl resolves for localhost | Set hostname `localhost`, read `reactAppUrl` | `http://localhost:5173` |
| TC-1.1.5N | Negative | Unknown hostname uses sensible default | Set hostname to `randomhost.example.com`, read `baseUrl` | Returns a defined fallback (not `undefined`) |

### Step 1.2 -- Create RecoAuthService

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.2.1P | Positive | Service is injectable | Inject `RecoAuthService` in a test component | No injection errors |
| TC-1.2.2P | Positive | loginUser sends correct request | Spy on HttpClient.post, call `loginUser({mail, password, remember_me})` | POST to `/login/login_user` with body `{mail, password, remember_me}`, `withCredentials: true` |
| TC-1.2.3P | Positive | getLoggedInUserStatus sends correct request | Call `getLoggedInUserStatus({mail: 'test@test.com'})` | POST to `/login/getLoggedInUserStatus` |
| TC-1.2.4P | Positive | loginUserDetails sends GET | Call `loginUserDetails()` | GET to `/users/loginUserDetails` with `withCredentials: true` |
| TC-1.2.5P | Positive | X-CSRFToken header included | Inspect headers of any request | `X-CSRFToken` header present (from cookie) |
| TC-1.2.6N | Negative | Request without cookie service still sends request | Remove csrftoken cookie, call `loginUser()` | Request still sent (header may be empty string), no crash |

### Step 1.3 -- Create AuthService (Login Status Check)

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.3.1P | Positive | isLoggedIn returns true on 200 | Mock `loginUserDetails()` to return 200 | `isLoggedIn()` emits `true` |
| TC-1.3.2P | Positive | isLoggedIn returns false on 401 | Mock `loginUserDetails()` to return 401 | `isLoggedIn()` emits `false` |
| TC-1.3.3N | Negative | isLoggedIn handles network error | Mock `loginUserDetails()` to throw network error | `isLoggedIn()` emits `false`, no unhandled error |

### Step 1.4 -- Create Auth Guards

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.4.1P | Positive | SigninGuard allows unauthenticated user | Mock `isLoggedIn()` to return false, navigate to `/signin` | Navigation allowed, login page renders |
| TC-1.4.2P | Positive | SigninGuard redirects authenticated user | Mock `isLoggedIn()` to return true, navigate to `/signin` | Redirect to `reactAppUrl` (React app) |
| TC-1.4.3P | Positive | AuthGuard allows authenticated user | Mock `isLoggedIn()` to return true | Navigation allowed |
| TC-1.4.4N | Negative | AuthGuard blocks unauthenticated user | Mock `isLoggedIn()` to return false, navigate to protected route | Redirect to `/signin` |

### Step 1.5 -- Create Auth Module and Routing

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.5.1P | Positive | Root path redirects to signin | Navigate to `/` | Redirected to `/signin` |
| TC-1.5.2P | Positive | Auth module lazy-loads | Check router config for `loadChildren` | AuthModule loaded lazily |
| TC-1.5.3P | Positive | Wildcard routes to signin | Navigate to `/nonexistent` | Redirected to `/signin` |
| TC-1.5.4P | Positive | LoginSigninComponent declared in AuthModule | Check `AuthModule.declarations` | `LoginSigninComponent` is listed |

### Step 1.6 -- Build LoginSigninComponent (TypeScript)

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.6.1P | Positive | Email step: active user proceeds to password | Enter valid email, mock status API returns `1` | Password field appears, email field hidden/disabled |
| TC-1.6.2P | Positive | Password step: valid credentials redirect | Enter correct password, mock login API returns `'success'` | `window.location.href` set to `reactAppUrl` |
| TC-1.6.3P | Positive | Already logged-in user redirected on load | Mock `isLoggedIn()` returns true | Component redirects to React app immediately |
| TC-1.6.4P | Positive | Loading state shown during API calls | Click "Continue" with valid email | Loading spinner/indicator visible while API resolves |
| TC-1.6.5N | Negative | Blocked user sees error | Mock status API returns `7` | Error message: "Account blocked" or similar |
| TC-1.6.6N | Negative | Generic domain rejected | Mock status API returns `5` | Error message: "Domain not registered" or similar |
| TC-1.6.7N | Negative | New user shows contact admin | Mock status API returns `6` | Message: "Contact admin" or similar |
| TC-1.6.8N | Negative | Wrong password shows error | Mock login API returns `'Unauthorized'` | Error message: "Invalid credentials", attempt count incremented |
| TC-1.6.9N | Negative | Max 5 attempts enforced | Submit wrong password 5 times | After 5th attempt, "Too many attempts" message shown, form disabled or rate-limited |
| TC-1.6.10N | Negative | Empty email rejected | Click "Continue" with empty email field | Validation error, API not called |
| TC-1.6.11N | Negative | Invalid email format rejected | Enter `notanemail`, click "Continue" | Validation error shown |
| TC-1.6.12N | Negative | Empty password rejected | On password step, click "Sign In" with empty password | Validation error, API not called |
| TC-1.6.13N | Negative | Network error handled | Mock API to throw network error | User-friendly error message, no crash |

### Step 1.7 -- Build LoginSigninComponent (Template + Styles)

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.7.1P | Positive | Logo visible | Load login page | Bsharp Reco logo/brand image renders (Reco branding, not Converse branding) |
| TC-1.7.2P | Positive | Title and subtitle present | Load login page | "Welcome to Bsharp Reco" title visible |
| TC-1.7.3P | Positive | Email step shows email input and Continue button | Load login page | Email input field and "Continue" button visible |
| TC-1.7.4P | Positive | Password step shows password input and Sign In button | Proceed past email step | Password field and "Sign In" button visible |
| TC-1.7.5P | Positive | Back to email link works | On password step, click "Back to email" | Returns to email step, email preserved |
| TC-1.7.6P | Positive | Error messages display | Trigger an error (wrong password) | Error message area shows text in visible color |
| TC-1.7.7P | Positive | Responsive layout | Resize browser to 375px width | Card layout adapts, no horizontal scroll, inputs usable |
| TC-1.7.8N | Negative | Password not visible by default | Load password step | Password input has `type="password"` |
| TC-1.7.9P | Positive | Visual parity with Converse login | Compare login page side-by-side with Converse reference login | Layout structure, input styles, button styles, color scheme match the Converse login -- only logo and title text differ |
| TC-1.7.10N | Negative | Login does NOT use React app styling | Inspect login page CSS | No GlowCards, mesh gradients, comet borders, or Tailwind utility classes from Reco-Frontend -- Angular login uses Converse's visual identity |

### Step 1.8 -- Set Up App Shell and Build Config

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-1.8.1P | Positive | AppModule bootstraps correctly | Run `ng serve` | No bootstrap errors |
| TC-1.8.2P | Positive | app.component.html has router-outlet | Check template | `<router-outlet></router-outlet>` present |
| TC-1.8.3P | Positive | Production build succeeds | Run `ng build --configuration production` | Build succeeds, output in `dist/reco-login`, no source maps |
| TC-1.8.4P | Positive | Full login flow works locally | Start Angular (4200) + Django (8000), attempt login with seed user | Login succeeds, redirect to React app URL |
| TC-1.8.5N | Negative | App shows error when Django is down | Start Angular only, attempt login | Connection error handled, user-friendly message shown |

---

## Phase 2 -- Django Backend Foundation

### Step 2.1 -- Create Converse Auth App (Read-Only Models)

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.1.1P | Positive | CelebrateUsers model has managed=False | Inspect `CelebrateUsers._meta.managed` | Returns `False` |
| TC-2.1.2P | Positive | CelebrateUsers.USERNAME_FIELD is email_id | Inspect model | `USERNAME_FIELD == 'email_id'` |
| TC-2.1.3P | Positive | CelebrateCompanies model exists with correct fields | Inspect model fields | `cmid`, `cm_name`, `cm_domain`, `cm_color`, `logo_image_url` all present |
| TC-2.1.4P | Positive | UserRoles model has uid, rid, cmid, status | Inspect model fields | All four fields present |
| TC-2.1.5P | Positive | All models have app_label = converse_auth | Check `_meta.app_label` | `'converse_auth'` |
| TC-2.1.6P | Positive | All models have correct db_table | Check `_meta.db_table` | `celebrate_users`, `celebrate_companies`, `user_roles` |
| TC-2.1.7N | Negative | No migrations generated for converse_auth | Run `python manage.py makemigrations converse_auth` | "No changes detected" (managed=False) |

### Step 2.2 -- Create Custom Auth Backend

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.2.1P | Positive | Valid credentials authenticate | Create seed user with known password, call `authenticate(email_id=email, password=password)` | Returns user object |
| TC-2.2.2P | Positive | Backend registered in settings | Check `AUTHENTICATION_BACKENDS` | Contains `'apps.converse_auth.auth_backend.ConverseAuthBackend'` |
| TC-2.2.3P | Positive | get_user retrieves user by PK | Call `backend.get_user(user_id)` with valid ID | Returns correct user |
| TC-2.2.4P | Positive | AUTH_USER_MODEL set | Check `settings.AUTH_USER_MODEL` | `'converse_auth.CelebrateUsers'` |
| TC-2.2.5N | Negative | Wrong password returns None | Call `authenticate(email_id=valid_email, password='wrong')` | Returns `None` |
| TC-2.2.6N | Negative | Nonexistent email returns None | Call `authenticate(email_id='nobody@nope.com', password='x')` | Returns `None` |
| TC-2.2.7N | Negative | Blocked user (status=4) excluded | Create user with status=4, attempt authenticate | Returns `None` (filter excludes status=4) |
| TC-2.2.8N | Negative | get_user with invalid ID returns None | Call `backend.get_user(999999)` | Returns `None` |

### Step 2.3 -- Create Auth View: login_user

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.3.1P | Positive | Valid login returns success | POST `/login/login_user` with valid `{mail, password, remember_me: 0}` | Response: `"success"`, status 200, `sessionid` cookie set |
| TC-2.3.2P | Positive | Session cookie set after login | Check response cookies after valid login | `sessionid` cookie present |
| TC-2.3.3P | Positive | Rate limit decorator present | Check view for `@ratelimit` | Decorated with `key='ip', rate='3/m'` |
| TC-2.3.4P | Positive | csrf_exempt applied | Check view for `@csrf_exempt` | Decorator present |
| TC-2.3.5N | Negative | Wrong password returns Unauthorized | POST with valid email, wrong password | Response: `"Unauthorized"`, status 200 (matching Converse behavior) |
| TC-2.3.6N | Negative | Nonexistent user returns Unauthorized | POST with unknown email | Response: `"Unauthorized"` |
| TC-2.3.7N | Negative | Blocked user (status=4) cannot login | POST with blocked user's credentials | Response: `"Unauthorized"` |
| TC-2.3.8N | Negative | Missing email field returns error | POST with `{password: 'x'}` only | 400 or appropriate error |
| TC-2.3.9N | Negative | GET method rejected | GET `/login/login_user` | 405 Method Not Allowed or appropriate error |
| TC-2.3.10N | Negative | Rate limit enforced | POST 4 times in 1 minute from same IP | 4th request returns 429 or is blocked |
| TC-2.3.11N | Negative | Empty body returns error | POST with empty body `{}` | Error response, no server crash |

### Step 2.4 -- Create Auth View: getLoggedInUserStatus

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.4.1P | Positive | Active user returns status 1 | POST with active user email | Response body contains `1` |
| TC-2.4.2P | Positive | Blocked user returns status 7 | POST with blocked user email | Response contains `7` |
| TC-2.4.3P | Positive | Generic domain returns status 5 | POST with `user@gmail.com` (no company) | Response contains `5` |
| TC-2.4.4P | Positive | New user returns status 6 | POST with `user@unknowndomain.com` | Response contains `6` |
| TC-2.4.5N | Negative | Empty email returns error | POST with `{mail: ''}` | Error response |
| TC-2.4.6N | Negative | Missing mail field returns error | POST with `{}` | Error response |

### Step 2.5 -- Create Auth View: loginUserDetails

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.5.1P | Positive | Authenticated user gets details | Login first, then GET `/users/loginUserDetails` with session cookie | 200, JSON with uid, cmid, email_id, first_name, last_name, role, cm_color, logo_image_url, cm_name |
| TC-2.5.2P | Positive | Response includes brand info | Check response JSON | `cm_color`, `logo_image_url`, `cm_name` present from CelebrateCompanies |
| TC-2.5.3P | Positive | Role from UserRoles table | Check `role` in response | Matches `rid` from UserRoles for this user |
| TC-2.5.4N | Negative | Unauthenticated request returns 401/403 | GET `/users/loginUserDetails` without session cookie | 401 or 403 |
| TC-2.5.5N | Negative | Expired session returns 401/403 | Use an expired/invalid sessionid cookie | 401 or 403 |
| TC-2.5.6N | Negative | POST method rejected | POST `/users/loginUserDetails` | 405 Method Not Allowed |

### Step 2.6 -- Create Auth View: user_logout

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.6.1P | Positive | Logout clears session | Login, then GET `/login/user_logout` | Response: `"logged_out"`, session invalidated |
| TC-2.6.2P | Positive | After logout, loginUserDetails returns 401 | Logout, then GET `/users/loginUserDetails` | 401 or 403 |
| TC-2.6.3N | Negative | Logout without session doesn't crash | GET `/login/user_logout` without being logged in | No server error, returns gracefully |

### Step 2.7 -- Wire Auth URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.7.1P | Positive | All auth URLs resolve | Run `python manage.py show_urls` or test each path | `/login/login_user`, `/login/getLoggedInUserStatus`, `/login/user_logout`, `/users/loginUserDetails` all resolve |
| TC-2.7.2P | Positive | Root URLconf includes auth URLs | Check `reco_project/urls.py` | Includes `apps.converse_auth.urls` and `apps.converse_auth.user_urls` |
| TC-2.7.3N | Negative | Non-existent URL returns 404 | GET `/login/nonexistent` | 404 response |

### Step 2.8 -- Create Common Utility Modules (Stubs)

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.8.1P | Positive | bedrock_client.py exists with invoke method | Import `BedrockClient`, check `invoke` method exists | Importable, method exists (may raise NotImplementedError) |
| TC-2.8.2P | Positive | opensearch_client.py exists | Import `OpenSearchClient` | Importable |
| TC-2.8.3P | Positive | s3_client.py exists | Import `S3Client` or equivalent | Importable |
| TC-2.8.4P | Positive | ses_client.py exists | Import `SESClient` or equivalent | Importable |
| TC-2.8.5P | Positive | permissions.py has IsAuthenticatedReco and IsBrandAdmin | Import both classes | Both importable |
| TC-2.8.6N | Negative | Stub methods raise or return placeholder | Call `BedrockClient().invoke('test')` | Raises `NotImplementedError` or returns placeholder (not a real Bedrock call) |

### Step 2.9 -- Create Django App Registrations and Migrations

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-2.9.1P | Positive | All apps in INSTALLED_APPS | Check settings for all 14 Reco apps | All listed: converse_auth, sessions_app, customers, voice, questions, recommendations, comparisons, product_chat, feedback, leads, packets, analytics, moderation, crawl, common |
| TC-2.9.2P | Positive | Migrations run without error | `python manage.py migrate --database=default` | All migrations applied, no errors |
| TC-2.9.3P | Positive | System check passes | `python manage.py check` | "System check identified no issues" |
| TC-2.9.4N | Negative | No migration attempts against converse DB | `python manage.py migrate --database=converse` | No Reco app migrations run against converse DB |

---

## Phase 3 -- Session and Customer APIs

### Step 3.1 -- Create Session Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-3.1.1P | Positive | CustomerSession creates with UUID | Create a `CustomerSession` object | `conversation_id` is auto-generated UUID, unique |
| TC-3.1.2P | Positive | SessionAnswer links to session | Create a `SessionAnswer` with valid session FK | Saves successfully |
| TC-3.1.3P | Positive | Default status is 'active' | Create session without specifying status | `status == 'active'` |
| TC-3.1.4P | Positive | Discovery mode choices enforced | Create session with `discovery_mode='voice'` | Saves successfully |
| TC-3.1.5N | Negative | Duplicate conversation_id rejected | Create two sessions with same conversation_id | IntegrityError (unique constraint) |
| TC-3.1.6N | Negative | SessionAnswer without session FK fails | Create SessionAnswer with `session=None` | IntegrityError |

### Step 3.2 -- Create Session API Views

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-3.2.1P | Positive | POST /api/sessions/ creates session | Authenticated POST with valid data | 201, returns session with `session_id` and `conversation_id` |
| TC-3.2.2P | Positive | Session auto-populates cmid and user_id from auth | POST without specifying cmid/user_id | Session created with cmid and user_id from authenticated user |
| TC-3.2.3P | Positive | GET /api/sessions/{id}/ retrieves session | GET with valid session_id | 200, returns full session object |
| TC-3.2.4P | Positive | PATCH updates session status | PATCH with `{status: 'completed'}` | Session status updated |
| TC-3.2.5N | Negative | Unauthenticated request rejected | POST `/api/sessions/` without session cookie | 401 or 403 |
| TC-3.2.6N | Negative | GET nonexistent session returns 404 | GET `/api/sessions/99999/` | 404 |
| TC-3.2.7N | Negative | User cannot access another tenant's session | Login as tenant A, try to GET session from tenant B | 404 or 403 |

### Step 3.3 -- Create Customer Profile Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-3.3.1P | Positive | CustomerProfile links to session | Create profile with valid session FK | Saves successfully |
| TC-3.3.2P | Positive | Email is optional | Create profile without email | Saves successfully |
| TC-3.3.3P | Positive | Consent field stored | Create with `consent_given=True` | Field stored correctly |
| TC-3.3.4N | Negative | Duplicate session FK rejected (OneToOne) | Create two profiles for same session | IntegrityError |
| TC-3.3.5N | Negative | Name cannot be empty | Create profile with `name=''` and max_length check | Validation error or DB constraint failure |

### Step 3.4 -- Create Customer API Views

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-3.4.1P | Positive | POST /api/customers/ creates profile | POST with `{session_id, name, phone, consent_given: true}` | 201, profile created |
| TC-3.4.2P | Positive | Optional email accepted | POST without email field | Profile created with email=null |
| TC-3.4.3P | Positive | Phone stored correctly | POST with `phone: '+919876543210'` | Stored with correct format |
| TC-3.4.4N | Negative | Missing session_id rejected | POST without session_id | 400 error |
| TC-3.4.5N | Negative | Missing name rejected | POST without name | 400 error |
| TC-3.4.6N | Negative | Missing consent rejected | POST with `consent_given: false` or missing | 400 error or stored as false (depending on business rule) |
| TC-3.4.7N | Negative | Invalid session_id rejected | POST with `session_id: 99999` | 400 or 404 |
| TC-3.4.8N | Negative | Unauthenticated request rejected | POST without session cookie | 401 or 403 |

### Step 3.5 -- Wire Session and Customer URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-3.5.1P | Positive | Session and customer URLs in root URLconf | Check `reco_project/urls.py` | Both included under `api/` prefix |
| TC-3.5.2P | Positive | All endpoints accessible | Hit each endpoint with correct HTTP method | No 404 on valid paths |

---

## Phase 4 -- Voice Discovery Pipeline

### Step 4.1 -- Set Up Whisper Service

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-4.1.1P | Positive | Whisper model loads | Call whisper service initialization | Model loaded without error (base model) |
| TC-4.1.2P | Positive | Lazy singleton pattern | Call service twice | Model loaded only once (same instance) |
| TC-4.1.3P | Positive | WAV conversion works | Pass WebM audio bytes to service | ffmpeg converts to WAV without error |
| TC-4.1.4P | Positive | Transcript returned | Pass valid audio | Returns `{"transcript": "...", "language": "..."}` with non-empty transcript |
| TC-4.1.5N | Negative | Empty audio handled | Pass 0-byte audio file | Returns empty transcript or appropriate error, no crash |
| TC-4.1.6N | Negative | Corrupt audio handled | Pass random bytes as audio | Returns error message, no crash |
| TC-4.1.7N | Negative | ffmpeg missing handled | Remove ffmpeg from PATH, call service | Clear error message about missing ffmpeg |

### Step 4.2 -- Create Tag Extraction via Bedrock

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-4.2.1P | Positive | Tags extracted from English text | Pass "I need a lightweight laptop for travel with long battery" | Returns tags with categories like `portability`, `features` |
| TC-4.2.2P | Positive | Tags have required fields | Check each tag | Each has `tag`, `category`, `confidence` |
| TC-4.2.3P | Positive | Confidence is between 0 and 1 | Check tag confidence values | All between 0.0 and 1.0 |
| TC-4.2.4P | Positive | Categories are from allowed set | Check tag categories | Each is one of: usage, portability, screen-size, priority, features, budget |
| TC-4.2.5P | Positive | Bedrock client invoke works | Call `BedrockClient().invoke()` with valid prompt | Returns response from Bedrock |
| TC-4.2.6N | Negative | Empty transcript returns empty tags | Pass `""` to tag extractor | Returns empty array `[]` |
| TC-4.2.7N | Negative | Gibberish text returns empty or minimal tags | Pass `"asdfgh jklqwerty"` | Returns `[]` or tags with low confidence |
| TC-4.2.8N | Negative | Bedrock API error handled | Mock Bedrock to throw `ThrottlingException` | Returns error, no crash |
| TC-4.2.9N | Negative | Malformed LLM response handled | Mock Bedrock to return non-JSON text | Parser handles gracefully, returns empty tags |

### Step 4.3 -- Create Voice Transcribe View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-4.3.1P | Positive | Transcribe endpoint accepts audio | POST `/api/voice/transcribe` with multipart audio file | 200, returns `{transcript, language, tags}` |
| TC-4.3.2P | Positive | Tags included in response | Check response | `tags` array present with extracted tags |
| TC-4.3.3P | Positive | Temp file cleaned up | After request completes, check temp directory | No orphaned temp files |
| TC-4.3.4N | Negative | Unauthenticated rejected | POST without session cookie | 401 or 403 |
| TC-4.3.5N | Negative | No file attached returns error | POST without file | 400 error |
| TC-4.3.6N | Negative | Non-audio file rejected | POST with a `.txt` file | 400 error or handled gracefully |
| TC-4.3.7N | Negative | Oversized file rejected | POST with audio > 2 minutes / configured max | 400 with size limit message |

### Step 4.4 -- Create Text Analysis View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-4.4.1P | Positive | Text analysis returns tags | POST `/api/voice/analyze-text` with `{text: "I need a laptop for gaming"}` | 200, returns `{tags: [...]}` |
| TC-4.4.2P | Positive | No Whisper involved | Verify Whisper service not called | Only Bedrock tag extraction is called |
| TC-4.4.3N | Negative | Empty text returns empty tags | POST with `{text: ""}` | Returns `{tags: []}` |
| TC-4.4.4N | Negative | Missing text field | POST with `{}` | 400 error |
| TC-4.4.5N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 4.5 -- Wire Voice URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-4.5.1P | Positive | Both endpoints accessible | Check `/api/voice/transcribe` and `/api/voice/analyze-text` | Both resolve (not 404) |

---

## Phase 5 -- Question Orchestrator

### Step 5.1 -- Create Question Orchestrator Logic

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-5.1.1P | Positive | First question generated | Call orchestrator with new session (no answers yet) | Returns question with `question_number: 1`, `done: false` |
| TC-5.1.2P | Positive | Question has options | Check returned question | Has `options` array with at least 2 items, each with `label` and `description` |
| TC-5.1.3P | Positive | Question type is valid | Check `type` field | One of `single-choice`, `multi-choice` |
| TC-5.1.4P | Positive | Confidence increases with answers | Submit 3 answers, check confidence | Confidence increases across successive questions |
| TC-5.1.5P | Positive | Stops when confidence >= 0.85 | Mock high confidence scenario | Returns `{done: true}` |
| TC-5.1.6P | Positive | Stops at max questions | Submit max questions (default 5) | Returns `{done: true}` after 5th question |
| TC-5.1.7P | Positive | Voice tags influence questions | Provide voice tags about "portability", generate question | Question is relevant to portability/related topics (not asking what they already said) |
| TC-5.1.8N | Negative | Missing session context handled | Call with invalid session_id | Error returned, no crash |
| TC-5.1.9N | Negative | Bedrock failure handled | Mock Bedrock timeout | Returns error to caller, no unhandled exception |
| TC-5.1.10N | Negative | Empty product catalog handled | Session with packet having 0 products | Returns appropriate error or generic question |

### Step 5.2 -- Create Prompt Templates Model

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-5.2.1P | Positive | PromptTemplate creates | Create template with `template_name`, `template_type`, `template_content` | Saves successfully |
| TC-5.2.2P | Positive | Active filter works | Create active and inactive templates, filter `is_active=True` | Only active template returned |
| TC-5.2.3P | Positive | Version field works | Create template with `version=2` | Stored correctly |

### Step 5.3 -- Create Answer Submission View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-5.3.1P | Positive | Answer saved to DB | POST `/api/sessions/{id}/answer` with valid data | SessionAnswer record created in DB |
| TC-5.3.2P | Positive | Next question returned | POST answer | Response includes next question object OR `{done: true}` |
| TC-5.3.3P | Positive | Voice-prefilled answer marked | POST with `from_voice: true` | SessionAnswer.from_voice is True |
| TC-5.3.4P | Positive | Score effect calculated | POST answer | `score_effect` field populated (JSON showing weight adjustments) |
| TC-5.3.5N | Negative | Invalid session_id returns 404 | POST to `/api/sessions/99999/answer` | 404 |
| TC-5.3.6N | Negative | Empty answer_value rejected | POST with `{question_text: "...", answer_value: ""}` | 400 error |
| TC-5.3.7N | Negative | Answer to completed session rejected | Mark session as completed, then POST answer | 400 with "session already completed" message |
| TC-5.3.8N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 5.4 -- Create LLM Call Logging

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-5.4.1P | Positive | LLM call logged | Make any Bedrock call (question gen, tag extraction) | LLMCallLog record created with call_type, input_tokens, output_tokens, latency_ms |
| TC-5.4.2P | Positive | Session FK linked | Log a call tied to a session | `session_id` correctly references the session |
| TC-5.4.3P | Positive | Latency tracked | Check latency_ms | Positive integer representing actual call time |
| TC-5.4.4N | Negative | Log creation doesn't fail on missing session | Create log with `session=None` | Saves (null=True) |

### Step 5.5 -- Wire Question URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-5.5.1P | Positive | Answer endpoint accessible | POST `/api/sessions/1/answer` | Not 404 (may be 401 if unauthenticated, but route resolves) |

---

## Phase 6 -- Recommendation Engine

### Step 6.1 -- Create Scoring Algorithm

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.1.1P | Positive | Base score calculated | Run scoring with default weights and known feature values | Score = SUM(weight * fit) matches manual calculation |
| TC-6.1.2P | Positive | Voice tags adjust weights | Add "portability" voice tag, run scoring | Weight for "weight" feature increased compared to no-tag scenario |
| TC-6.1.3P | Positive | Answers adjust weights via benefit mappings | Submit answer matching a benefit mapping | Corresponding feature weights adjusted |
| TC-6.1.4P | Positive | Hard filters eliminate products | Set hard filter "must have Thunderbolt", one product lacks it | Product without Thunderbolt excluded from results |
| TC-6.1.5P | Positive | Top 3 returned | Run scoring with 5+ products | Exactly 3 products returned, ranked by score |
| TC-6.1.6P | Positive | Diversity rule applied | If top 3 are all same family, diversity rule activates | At least 2 different product families in top 3 |
| TC-6.1.7P | Positive | Geography modifier applied | Set outlet zone, run scoring | Products with matching geography get score boost |
| TC-6.1.8N | Negative | All products filtered out | Set hard filter that no product satisfies | Returns empty list or fewer than 3 with appropriate message |
| TC-6.1.9N | Negative | Zero weights don't cause division by zero | Set all weights to 0 | Returns valid scores (all 0 or handled), no crash |
| TC-6.1.10N | Negative | Missing feature values handled | Product missing some feature values | Score calculated with available features, no crash |

### Step 6.2 -- Create Recommendation Results Model

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.2.1P | Positive | RecommendationResult saves | Create with session FK, product_id, rank, score, match_percentage | Saves successfully |
| TC-6.2.2P | Positive | Explanation text stored | Create with `explanation_text = "..."` | Text stored and retrievable |
| TC-6.2.3P | Positive | Scoring breakdown stored as JSON | Create with `scoring_breakdown = {feature_scores: [...]}` | JSON stored and retrievable |

### Step 6.3 -- Create Explanation Engine

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.3.1P | Positive | Explanation generated for each product | Call with top 3 products | Each product gets explanation with whyRecommended, fitSummary, keyHighlights, pros, cons |
| TC-6.3.2P | Positive | Explanation cached | Request explanation for same product+answers twice | Second call returns cached result (no Bedrock call) |
| TC-6.3.3P | Positive | Explanation references customer preferences | Check explanation text | Mentions customer's voice tags or answers |
| TC-6.3.4N | Negative | Bedrock failure returns graceful error | Mock Bedrock error | Explanation field set to fallback text or empty, request doesn't fail entirely |
| TC-6.3.5N | Negative | Product with no features gets generic explanation | Product with 0 feature values | Returns a generic but valid explanation |

### Step 6.4 -- Create Moderation Override Logic

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.4.1P | Positive | Boost rule increases score | Create boost moderation rule for product A, run scoring | Product A's score multiplied by boost_strength |
| TC-6.4.2P | Positive | Suppress rule zeroes score | Create suppress rule for product B | Product B excluded from results (score=0) |
| TC-6.4.3P | Positive | Push rule guarantees inclusion | Create push rule for product C (above min_fit_threshold) | Product C appears in top 3 |
| TC-6.4.4P | Positive | min_fit_threshold respected | Create push rule with threshold=0.5, product fit=0.3 | Product NOT pushed (below threshold) |
| TC-6.4.5N | Negative | Inactive rules ignored | Create moderation rule with `is_active=False` | Rule has no effect on scoring |
| TC-6.4.6N | Negative | No moderation rules = no effect | Run scoring with 0 moderation rules | Scoring runs normally with base algorithm only |

### Step 6.5 -- Create Recommendations View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.5.1P | Positive | GET returns top 3 | GET `/api/sessions/{id}/recommendations` (session with answers) | 200, `recommendations` array with 3 items |
| TC-6.5.2P | Positive | Each recommendation has product data | Check response structure | Each item has `rank`, `product` (full data), `match_percentage`, `explanation` |
| TC-6.5.3P | Positive | Explanation object has required fields | Check explanation | Has `whyRecommended`, `fitSummary`, `keyHighlights`, `matchedBenefits`, `tradeOffs`, `pros`, `cons` |
| TC-6.5.4P | Positive | Results saved to DB | After GET, check RecommendationResult table | 3 records created for this session |
| TC-6.5.5P | Positive | Ranked correctly | Check ranks | Rank 1 has highest match_percentage, rank 3 has lowest |
| TC-6.5.6N | Negative | Session without answers returns error | GET recommendations for session with 0 answers | 400 with "insufficient data" message |
| TC-6.5.7N | Negative | Invalid session_id returns 404 | GET `/api/sessions/99999/recommendations` | 404 |
| TC-6.5.8N | Negative | Unauthenticated rejected | GET without cookie | 401 or 403 |

### Step 6.6 -- Create Product Detail View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.6.1P | Positive | Product detail returns merged data | GET `/api/products/{id}` | 200, includes specs, gallery, documents, accessories, finance, salesperson_tips |
| TC-6.6.2P | Positive | Crawled content merged | Product with both manual and crawled content | Both present in response |
| TC-6.6.3P | Positive | Gallery combines manual + crawled images | Product with gallery_urls and crawled_images | Both sets in response |
| TC-6.6.4N | Negative | Nonexistent product returns 404 | GET `/api/products/99999` | 404 |
| TC-6.6.5N | Negative | Product with no content still returns | Product exists but has no ProductContent record | Returns product basic data, content fields empty/null |

### Step 6.7 -- Wire Recommendation URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-6.7.1P | Positive | Both endpoints accessible | Test `/api/sessions/{id}/recommendations` and `/api/products/{id}` | Routes resolve correctly |

---

## Phase 7 -- Comparison Engine

### Step 7.1 -- Create Comparison Cache Model

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-7.1.1P | Positive | Cache entry saves | Create ComparisonCache with all fields | Saves successfully |
| TC-7.1.2P | Positive | product_pair_key indexed | Check DB index | Index on `product_pair_key` exists |
| TC-7.1.3P | Positive | hit_count defaults to 0 | Create without specifying hit_count | `hit_count == 0` |

### Step 7.2 -- Create Comparator Service

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-7.2.1P | Positive | Cache miss generates comparison | Compare two products not in cache | Bedrock called, result saved to ComparisonCache, `cache_hit=False` in response |
| TC-7.2.2P | Positive | Cache hit returns cached result | Compare same two products again | No Bedrock call, `cache_hit=True`, `hit_count` incremented |
| TC-7.2.3P | Positive | product_pair_key is sorted | Compare product 456 vs 123 | Key is `"123-456"` (sorted ascending) |
| TC-7.2.4P | Positive | Reverse order is same cache entry | Compare (A, B) then (B, A) | Both use same cache entry |
| TC-7.2.5P | Positive | Cache is global within tenant | Compare products at outlet 1, then at outlet 2 (same tenant) | Second request is cache hit |
| TC-7.2.6P | Positive | Feature change invalidates cache | Change product feature, compare again | feature_set_hash differs, new LLM call made |
| TC-7.2.7N | Negative | Bedrock failure handled | Mock Bedrock error on cache miss | Returns error response, no cache entry saved |
| TC-7.2.8N | Negative | Nonexistent product handled | Compare product 123 with product 99999 | 404 or error for missing product |

### Step 7.3 -- Create Comparison View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-7.3.1P | Positive | Comparison returns full data | POST `/api/comparisons/` with two valid product IDs | 200, returns product_1, product_2, feature_comparison array, implications, cache_hit |
| TC-7.3.2P | Positive | Feature comparison has winners | Check `feature_comparison` array | Each feature has `winner` field (`product_1`, `product_2`, or `tie`) |
| TC-7.3.3P | Positive | Implications are per-product | Check `implications` | Has keys for both products with trade-off narrative arrays |
| TC-7.3.4N | Negative | Same product twice rejected | POST with `product_id_1 == product_id_2` | 400 error |
| TC-7.3.5N | Negative | Missing product IDs rejected | POST with `{product_id_1: 123}` only | 400 error |
| TC-7.3.6N | Negative | Non-integer product IDs rejected | POST with `{product_id_1: "abc"}` | 400 error |
| TC-7.3.7N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 7.4 -- Wire Comparison URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-7.4.1P | Positive | Comparison endpoint accessible | POST `/api/comparisons/` | Route resolves |

---

## Phase 8 -- Product Chat Widget Backend

### Step 8.1 -- Create RAG Service

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-8.1.1P | Positive | RAG retrieves relevant chunks | Query "battery life" for a laptop product | Returns chunks containing battery-related content |
| TC-8.1.2P | Positive | Answer grounded in retrieved data | Check Bedrock answer against retrieved chunks | Answer references information from chunks, not hallucinated |
| TC-8.1.3P | Positive | Single product context works | Pass one product_id | Only chunks for that product retrieved |
| TC-8.1.4P | Positive | Comparison context works | Pass two product_ids | Chunks from both products retrieved |
| TC-8.1.5N | Negative | Unanswerable question handled | Ask about something not in product data | Response says "I don't have that information" or similar |
| TC-8.1.6N | Negative | OpenSearch down handled | Mock OpenSearch connection failure | Returns error, no crash |
| TC-8.1.7N | Negative | No chunks found handled | Product with no indexed data | Returns "No information available" or similar |

### Step 8.2 -- Create Chat View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-8.2.1P | Positive | Chat returns answer | POST `/api/chat/ask` with question and product_ids | 200, returns `{answer, sources}` |
| TC-8.2.2P | Positive | Sources listed | Check `sources` in response | Non-empty array indicating data origin |
| TC-8.2.3N | Negative | Empty question rejected | POST with `{question: "", product_ids: [1]}` | 400 error |
| TC-8.2.4N | Negative | Missing product_ids rejected | POST with `{question: "..."}` | 400 error |
| TC-8.2.5N | Negative | Invalid product_ids handled | POST with `{product_ids: [99999]}` | Error or answer stating no data available |
| TC-8.2.6N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 8.3 -- Create Chat History Model

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-8.3.1P | Positive | Chat message saved | After ask endpoint, check ChatMessage table | Record created with question, answer, product_ids, session |
| TC-8.3.2P | Positive | Messages ordered by created_at | Create multiple messages | Retrievable in chronological order |

### Step 8.4 -- Wire Chat URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-8.4.1P | Positive | Chat endpoint accessible | POST `/api/chat/ask` | Route resolves |

---

## Phase 9 -- Feedback and Learning System

### Step 9.1 -- Create Feedback Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-9.1.1P | Positive | Feedback saves with all fields | Create Feedback with rating, session, recommended_products, customer_answers | Saves successfully |
| TC-9.1.2P | Positive | FeedbackPattern saves | Create FeedbackPattern with hashes and avg_rating | Saves successfully |
| TC-9.1.3N | Negative | Rating outside 1-5 should be validated | Create Feedback with rating=0 or rating=6 | Validation error (if validator added) or stores (if relying on view-level validation) |

### Step 9.2 -- Create Feedback Submission View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-9.2.1P | Positive | Feedback submitted successfully | POST `/api/feedback/` with `{session_id: 1, rating: 4}` | 201, Feedback record created |
| TC-9.2.2P | Positive | Full context saved | Check created Feedback | `recommended_products`, `customer_answers`, `voice_tags`, `scoring_weights` all populated |
| TC-9.2.3P | Positive | Session updated | Check `CustomerSession.recommendation_feedback_stars` | Set to submitted rating |
| TC-9.2.4P | Positive | Indexed to OpenSearch | Check `reco_feedback` index | Document indexed with feedback data |
| TC-9.2.5N | Negative | Rating 0 rejected | POST with `{rating: 0}` | 400 error |
| TC-9.2.6N | Negative | Rating 6 rejected | POST with `{rating: 6}` | 400 error |
| TC-9.2.7N | Negative | Missing session_id rejected | POST with `{rating: 4}` only | 400 error |
| TC-9.2.8N | Negative | Session without recommendations rejected | POST feedback for session that hasn't generated recommendations | 400 error |
| TC-9.2.9N | Negative | Duplicate feedback for same session handled | Submit feedback twice for same session | Either updates existing or returns 409 conflict |
| TC-9.2.10N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 9.3 -- Create Pattern Analyzer

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-9.3.1P | Positive | Patterns detected from feedback | Create 5 feedback records with same input profile + product combo, avg rating 4.5 | FeedbackPattern created with avg_rating ~4.5, flagged as "strong" |
| TC-9.3.2P | Positive | Poor patterns flagged | Create 5 records with avg rating 1.5 | Pattern flagged as "poor" (avg < 2.5) |
| TC-9.3.3P | Positive | Minimum session threshold | Create 2 feedback records (below threshold of 3) | No FeedbackPattern created |
| TC-9.3.4P | Positive | Patterns grouped by tenant | Create feedback for two different cmids | Separate patterns per cmid |
| TC-9.3.5N | Negative | No feedback = no patterns | Run analyzer with 0 feedback records | No patterns created, no errors |
| TC-9.3.6N | Negative | Existing patterns updated | Run analyzer when FeedbackPattern already exists | Existing record updated (not duplicated) |

### Step 9.4 -- Create Django Q Task

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-9.4.1P | Positive | Task scheduled | Check Django Q schedule table | `analyze_patterns` task scheduled with schedule_type='D' |
| TC-9.4.2P | Positive | Task callable | Manually call `analyze_patterns()` | Executes without error |
| TC-9.4.3N | Negative | Task handles empty DB | Run on empty feedback table | Completes without error |

### Step 9.5 -- Wire Feedback URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-9.5.1P | Positive | Feedback endpoint accessible | POST `/api/feedback/` | Route resolves |

---

## Phase 10 -- Lead Capture, Handoff, and Email Share

### Step 10.1 -- Create Lead and Handoff Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-10.1.1P | Positive | Lead creates with FK to customer and session | Create Lead with valid FKs | Saves successfully |
| TC-10.1.2P | Positive | HandoffRequest links to Lead | Create HandoffRequest with valid lead FK | Saves successfully |
| TC-10.1.3P | Positive | ShareEvent links to session | Create ShareEvent with session FK | Saves successfully |
| TC-10.1.4P | Positive | Default lead_status is 'new' | Create Lead without status | `lead_status == 'new'` |
| TC-10.1.5P | Positive | Default handoff status is 'pending' | Create HandoffRequest without status | `status == 'pending'` |

### Step 10.2 -- Create Email Service

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-10.2.1P | Positive | Email built with product data | Build email for session with recommendations | Subject contains brand name, body contains product names, prices, highlights |
| TC-10.2.2P | Positive | SES send returns message ID | Send test email | SES message ID returned |
| TC-10.2.3N | Negative | Invalid email address handled | Send to `notanemail` | SES error caught, user-friendly message returned |
| TC-10.2.4N | Negative | SES credentials missing handled | Remove AWS credentials | Error caught and reported, no crash |
| TC-10.2.5N | Negative | Session without recommendations handled | Build email for session with no recommendations | Error returned or email with "no recommendations" message |

### Step 10.3 -- Create Handoff View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-10.3.1P | Positive | Handoff created | POST `/api/handoff/` with valid data | 201, Lead + HandoffRequest created |
| TC-10.3.2P | Positive | Discussion note saved | POST with `discussion_note: "Interested in Yoga"` | Note stored in HandoffRequest |
| TC-10.3.3P | Positive | Pending handoffs listed | GET `/api/handoff/pending` | Returns handoffs for user's outlet |
| TC-10.3.4P | Positive | Pending filtered by outlet | Login as outlet A staff, GET pending | Only outlet A handoffs returned |
| TC-10.3.5N | Negative | Invalid session_id rejected | POST with `session_id: 99999` | 400 or 404 |
| TC-10.3.6N | Negative | Missing product_id rejected | POST without `product_id` | 400 error |
| TC-10.3.7N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 10.4 -- Create Share Email View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-10.4.1P | Positive | Email sent via SES | POST `/api/share/email` with valid `{session_id, recipient_email}` | 200, ShareEvent created, SES message sent |
| TC-10.4.2P | Positive | ShareEvent recorded | After email sent, check ShareEvent table | Record with `share_method='email'`, `ses_message_id` populated |
| TC-10.4.3P | Positive | WhatsApp returns 501 | POST `/api/share/whatsapp` | 501 Not Implemented |
| TC-10.4.4N | Negative | Invalid email rejected | POST with `recipient_email: "invalid"` | 400 error |
| TC-10.4.5N | Negative | Missing session_id rejected | POST with `{recipient_email: "a@b.com"}` only | 400 error |
| TC-10.4.6N | Negative | Unauthenticated rejected | POST without cookie | 401 or 403 |

### Step 10.5 -- Wire Lead URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-10.5.1P | Positive | All lead endpoints accessible | Check `/api/handoff/`, `/api/handoff/pending`, `/api/share/email`, `/api/share/whatsapp` | All routes resolve |

---

## Phase 11 -- React Frontend API Integration

### Step 11.1 -- Create API Service Layer

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.1.1P | Positive | apiFetch sends credentials | Inspect fetch call | `credentials: 'include'` is set |
| TC-11.1.2P | Positive | Content-Type header set | Inspect fetch call | `Content-Type: application/json` default header |
| TC-11.1.3P | Positive | Successful response parsed | Mock 200 response with JSON | Returns parsed JSON |
| TC-11.1.4N | Negative | 401 triggers redirect to login | Mock 401 response | `window.location.href` set to login URL |
| TC-11.1.5N | Negative | Non-OK response throws error | Mock 500 response | Throws error with status code |
| TC-11.1.6N | Negative | Network error handled | Mock fetch to reject | Error thrown (no silent failure) |

### Step 11.2 -- Create AuthContext and Auth Check

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.2.1P | Positive | Auth check on mount | Render AuthProvider | `GET /users/loginUserDetails` called on mount |
| TC-11.2.2P | Positive | Authenticated state populated | Mock 200 with user data | `isAuthenticated=true`, `user` and `brand` populated |
| TC-11.2.3P | Positive | Brand info available | Check `brand` in context | `cmName`, `cmColor`, `logoImageUrl` populated |
| TC-11.2.4P | Positive | Loading state during check | Render AuthProvider, check before API resolves | `loading=true` initially |
| TC-11.2.5P | Positive | Logout clears state | Call `logout()` | `GET /login/user_logout` called, redirect to login URL |
| TC-11.2.6N | Negative | 401 redirects to login | Mock 401 from loginUserDetails | Redirect to Angular login URL |
| TC-11.2.7N | Negative | Network failure shows error | Mock network failure | Appropriate error state (not infinite loading) |

### Step 11.3 -- Update App.tsx and Routes

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.3.1P | Positive | AuthProvider wraps app | Check App.tsx component tree | JourneyProvider and AuthProvider both present |
| TC-11.3.2P | Positive | Loading spinner during auth check | Render app before auth resolves | Spinner or loading state shown |
| TC-11.3.3P | Positive | /consent is default route for authenticated users | Navigate to `/` while authenticated | Redirected to `/consent` |
| TC-11.3.4P | Positive | LandingScreen removed from routes | Check routes.tsx | No route for `/` pointing to LandingScreen |
| TC-11.3.5N | Negative | Unauthenticated user redirected | Navigate to any route while unauthenticated | Redirected to login URL |

### Step 11.4 -- Create Per-Screen API Service Files

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.4.1P | Positive | All 10 service files exist | Check `services/` directory | sessionApi.ts, customerApi.ts, voiceApi.ts, questionApi.ts, recommendationApi.ts, comparisonApi.ts, chatApi.ts, feedbackApi.ts, leadApi.ts, productApi.ts all exist |
| TC-11.4.2P | Positive | Each service uses apiFetch | Grep for `apiFetch` in each service file | All import and use the shared API wrapper |
| TC-11.4.3P | Positive | Each service calls correct endpoint | Check method implementations | Endpoint paths match build plan specification |
| TC-11.4.4P | Positive | TypeScript types defined | Check for interface/type exports | Each service exports request/response types |

### Step 11.5 -- Update ConsentScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.5.1P | Positive | Session created on continue | Fill form, click Continue | `POST /api/sessions/` called, session_id stored in JourneyContext |
| TC-11.5.2P | Positive | Customer captured | After session creation | `POST /api/customers/` called with name, phone, email, consent |
| TC-11.5.3P | Positive | Brand name from AuthContext | Check top bar or UI text | Brand name from `AuthContext.brand.cmName`, not hardcoded |
| TC-11.5.4P | Positive | UI unchanged | Visual comparison | Same layout, animations, styling as before API integration |
| TC-11.5.5N | Negative | API failure shows error | Mock session creation failure | Error toast/message, user can retry |
| TC-11.5.6N | Negative | Validation still works | Submit with empty name | Validation error, API not called |

### Step 11.6 -- Update VoiceDiscoveryScreen and VoiceResultsScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.6.1P | Positive | Voice recording sends to API | Record audio, submit | `POST /api/voice/transcribe` called with audio blob |
| TC-11.6.2P | Positive | Text input sends to API | Type text, submit | `POST /api/voice/analyze-text` called |
| TC-11.6.3P | Positive | Tags from API stored in context | After API response | `JourneyContext.voiceTags` contains API tags |
| TC-11.6.4P | Positive | Voice results shows API tags | Navigate to voice results | Tags from API displayed (editable) |
| TC-11.6.5P | Positive | UI unchanged | Visual comparison | Same mic button, waveform, text area, tag chips |
| TC-11.6.6N | Negative | Transcription failure handled | Mock API error | Error message shown, option to retry |
| TC-11.6.7N | Negative | Empty recording handled | Submit 0-length recording | Error shown, not sent to API |

### Step 11.7 -- Update GuidedQuestionsScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.7.1P | Positive | First question from API | Load questions screen | API call made, first LLM-generated question displayed |
| TC-11.7.2P | Positive | Answer submission calls API | Select an answer | `POST /api/sessions/{id}/answer` called |
| TC-11.7.3P | Positive | Next question from API response | After answer submission | New question from API response rendered |
| TC-11.7.4P | Positive | Done signal navigates to processing | API returns `{done: true}` | Navigates to `/processing` |
| TC-11.7.5P | Positive | Auto-advance still works | Select single-choice answer | 320ms delay then auto-advance to next question |
| TC-11.7.6P | Positive | Slide animations preserved | Navigate between questions | Left/right slide transitions still work |
| TC-11.7.7N | Negative | API error shows retry | Mock answer submission failure | Error message, answer not lost, can retry |
| TC-11.7.8N | Negative | Network timeout handled | Mock slow API response | Loading indicator shown during wait |

### Step 11.8 -- Update RecommendationsScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.8.1P | Positive | Recommendations from API | Load recommendations screen | `GET /api/sessions/{id}/recommendations` called, products displayed |
| TC-11.8.2P | Positive | Match score bars animate | Check score bar animations | Bars animate from 0 to API match_percentage |
| TC-11.8.3P | Positive | Star feedback calls API | Click 4 stars | `POST /api/feedback/` called with `{session_id, rating: 4}` |
| TC-11.8.4P | Positive | Product selection still works | Click "Add to compare" on 2 products | Both selected, "Compare now" button appears |
| TC-11.8.5P | Positive | UI unchanged | Visual comparison | Same glow cards, comet borders, layout |
| TC-11.8.6N | Negative | Loading state while fetching | Before API responds | Loading indicator or skeleton shown |
| TC-11.8.7N | Negative | API error handled | Mock recommendation failure | Error message, option to retry |

### Step 11.9 -- Update ComparisonScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.9.1P | Positive | Comparison data from API | Load comparison screen with 2 selected products | `POST /api/comparisons/` called |
| TC-11.9.2P | Positive | Feature comparison table populated | Check table | Features, values, winners from API data |
| TC-11.9.3P | Positive | Implications from API | Check implications section | Real LLM-generated trade-off narratives |
| TC-11.9.4P | Positive | Winner highlighting works | Check feature rows | Winner product has emerald highlight and "Stronger" badge |
| TC-11.9.5N | Negative | Loading state shown | Before API responds | Loading indicator |

### Step 11.10 -- Update ProductDetailScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.10.1P | Positive | Product data from API | Navigate to `/product/{id}` | `GET /api/products/{id}` called |
| TC-11.10.2P | Positive | All 6 tabs populated | Check each tab (Overview, Specs, Gallery, Documents, Accessories, Finance) | Data from API displayed in each |
| TC-11.10.3P | Positive | Gallery shows S3 images | Check gallery tab | Images load from S3/CloudFront URLs |
| TC-11.10.4N | Negative | Missing product shows error | Navigate to `/product/99999` | 404 or error state shown |

### Step 11.11 -- Update ProductChatWidget

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.11.1P | Positive | Chat sends to API | Type question, submit | `POST /api/chat/ask` called with question and product_ids |
| TC-11.11.2P | Positive | API answer displayed | After API responds | LLM-generated answer shown in chat bubble |
| TC-11.11.3P | Positive | Context-aware (single product) | Chat on product detail page | Only that product's ID sent to API |
| TC-11.11.4P | Positive | Context-aware (comparison) | Chat on comparison page | Both product IDs sent to API |
| TC-11.11.5P | Positive | Chat UI unchanged | Visual comparison | Same FAB button, bubble UI, message history |
| TC-11.11.6N | Negative | API error shows error in chat | Mock chat API failure | Error message in chat bubble, not crash |

### Step 11.12 -- Update LeadCaptureScreen, ShareSaveScreen, ConfirmationScreen

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-11.12.1P | Positive | Handoff calls API | Click "Send alert" on LeadCaptureScreen | `POST /api/handoff/` called |
| TC-11.12.2P | Positive | Customer info pre-filled | Load LeadCaptureScreen | Name, phone, email from JourneyContext |
| TC-11.12.3P | Positive | Share email calls API | Click "Send email" on ShareSaveScreen | `POST /api/share/email` called |
| TC-11.12.4P | Positive | WhatsApp shows "Coming soon" | Click WhatsApp button | Toast notification, no API call |
| TC-11.12.5P | Positive | New session resets state | Click "Start new session" on ConfirmationScreen | `resetJourney()` called, session_id cleared, navigates to `/consent` |
| TC-11.12.6N | Negative | Handoff failure handled | Mock API error | Error message, can retry |
| TC-11.12.7N | Negative | Email send failure handled | Mock SES error | Error message shown |

---

## Phase 12 -- Admin Setup (Packet Builder)

### Step 12.1 -- Create Packet and Product Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-12.1.1P | Positive | Packet creates with all fields | Create Packet with cmid, category, brand | Saves successfully |
| TC-12.1.2P | Positive | Product links to Packet | Create Product with valid packet FK | Saves successfully |
| TC-12.1.3P | Positive | Product code unique | Check unique constraint on product_code | Constraint exists |
| TC-12.1.4P | Positive | Feature links to Packet | Create Feature with packet FK | Saves |
| TC-12.1.5P | Positive | FeatureValue links to Product and Feature | Create FeatureValue with both FKs | Saves |
| TC-12.1.6P | Positive | BenefitMapping saves | Create with packet FK, benefit_name, feature_code, weight_impact | Saves |
| TC-12.1.7P | Positive | All content models save | Create ProductContent, Accessory, FinanceScheme | All save |
| TC-12.1.8N | Negative | Duplicate product_code rejected | Create two products with same product_code | IntegrityError |
| TC-12.1.9N | Negative | Negative price handled | Create Product with price=-100 | Validation error or stored (depends on if validator added) |

### Step 12.2 -- Create Retail Outlets Model

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-12.2.1P | Positive | Outlet creates | Create RetailOutlet with cmid, name, city | Saves |
| TC-12.2.2P | Positive | assigned_packets stores JSON array | Create with `assigned_packets=[1, 2, 3]` | Retrieved correctly as list |
| TC-12.2.3P | Positive | cmid indexed | Check DB index on cmid | Index exists |
| TC-12.2.4N | Negative | Empty outlet name handled | Create with `outlet_name=''` | Validation error or empty string stored |

### Step 12.3 -- Create Moderation and Lead Config Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-12.3.1P | Positive | ModerationRule creates | Create with packet FK, target_type, boost_strength | Saves |
| TC-12.3.2P | Positive | LeadCaptureConfig creates | Create with packet FK, required_fields, consent_text | Saves |
| TC-12.3.3P | Positive | required_fields stores JSON | Create with `required_fields=['name', 'phone']` | Retrieved as list |

### Step 12.4 -- Register Django Admin

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-12.4.1P | Positive | Django Admin accessible | Navigate to `/admin/` | Admin login page renders |
| TC-12.4.2P | Positive | Packet model in admin | Login to admin, check sidebar | Packet model listed |
| TC-12.4.3P | Positive | Product inline in PacketAdmin | Open Packet in admin | ProductInline shown |
| TC-12.4.4P | Positive | FeatureValue inline in ProductAdmin | Open Product in admin | FeatureValueInline shown |
| TC-12.4.5P | Positive | RetailOutlet admin has filters | Open RetailOutlet list | Filter sidebar with cmid and city |
| TC-12.4.6P | Positive | All Reco models registered | Check admin site | All packet-related models visible |

### Step 12.5 -- Create Excel Upload Endpoint

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-12.5.1P | Positive | Valid Excel uploaded | POST `/api/packets/{id}/upload-products` with valid .xlsx | 200, returns `{created: N, updated: N, errors: []}` |
| TC-12.5.2P | Positive | Products created from rows | Check Product table after upload | Records match Excel rows |
| TC-12.5.3P | Positive | Feature values populated | Check FeatureValue table | Values match Excel feature columns |
| TC-12.5.4P | Positive | product_url triggers pending crawl | Upload row with product_url | Product.crawl_status = 'pending' |
| TC-12.5.5P | Positive | Existing products updated (not duplicated) | Upload same Excel twice | Same number of products (updated, not duplicated) |
| TC-12.5.6N | Negative | Non-Excel file rejected | Upload .txt file | 400 error |
| TC-12.5.7N | Negative | Missing required columns reported | Upload Excel without 'product_code' column | Error in response `errors` array |
| TC-12.5.8N | Negative | Malformed Excel handled | Upload corrupted .xlsx | Error response, no server crash |
| TC-12.5.9N | Negative | Non-admin user rejected | Upload as rid=2 (staff) user | 403 Forbidden |
| TC-12.5.10N | Negative | Empty Excel handled | Upload .xlsx with header only, no data rows | Returns `{created: 0, updated: 0, errors: []}` |

### Step 12.6 -- Create Packet Config Endpoint

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-12.6.1P | Positive | Full config returned | GET `/api/packets/{id}` | Returns products, features, dimensions, scoring config, moderation rules |
| TC-12.6.2N | Negative | Nonexistent packet returns 404 | GET `/api/packets/99999` | 404 |
| TC-12.6.3N | Negative | Packet from different tenant rejected | Login as tenant A, GET packet owned by tenant B | 404 or 403 |

---

## Phase 13 -- Analytics and Dashboard

### Step 13.1 -- Create Event Tracking Model and Utility

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-13.1.1P | Positive | InteractionEvent creates | Call `track_event(session_id, cmid, outlet_id, user_id, 'session_started')` | Record created with correct fields |
| TC-13.1.2P | Positive | event_data stores JSON | Track event with `event_data={'language': 'en'}` | JSON stored and retrievable |
| TC-13.1.3P | Positive | event_type indexed | Check DB index on event_type | Index exists |
| TC-13.1.4N | Negative | Null session_id allowed | Track event with `session_id=None` | Saves (nullable FK) |
| TC-13.1.5N | Negative | track_event doesn't crash on OpenSearch failure | Mock OpenSearch connection failure in event_tracker | MySQL record created, OpenSearch failure logged, no crash |

### Step 13.2 -- Instrument All Backend Views

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-13.2.1P | Positive | session_started event logged | Create a session via API | InteractionEvent with `event_type='session_started'` exists |
| TC-13.2.2P | Positive | voice_recorded event logged | Submit voice transcription | Event with `event_type='voice_recorded'` exists |
| TC-13.2.3P | Positive | question_answered event logged | Submit answer | Event logged |
| TC-13.2.4P | Positive | recommendations_generated event logged | Get recommendations | Event logged |
| TC-13.2.5P | Positive | feedback_submitted event logged | Submit feedback | Event logged with rating in event_data |
| TC-13.2.6P | Positive | All event types covered | Run full journey, check events | Events for: session_started, consent_given, voice_recorded, question_answered, recommendations_generated, feedback_submitted, comparison_viewed, product_detail_viewed, handoff_created, email_shared, session_completed |

### Step 13.3 -- Create Dashboard Metrics View

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-13.3.1P | Positive | Admin sees all outlets | Login as admin (rid=1), GET `/api/analytics/overview` | Metrics aggregated across all outlets for tenant |
| TC-13.3.2P | Positive | Staff sees own outlet only | Login as staff (rid=2), GET `/api/analytics/overview` | Metrics filtered to user's outlet |
| TC-13.3.3P | Positive | Period filter works | GET with `?period=7d` | Metrics for last 7 days only |
| TC-13.3.4P | Positive | Response has expected fields | Check response | `total_sessions`, `completed_sessions`, `avg_feedback_rating`, `top_recommended_products`, `sessions_by_day`, `discovery_mode_split` present |
| TC-13.3.5N | Negative | No data returns zeroes | GET on tenant with no sessions | Returns zeroes/empty arrays, not errors |
| TC-13.3.6N | Negative | Invalid period handled | GET with `?period=invalid` | 400 error or defaults to 7d |
| TC-13.3.7N | Negative | Unauthenticated rejected | GET without cookie | 401 or 403 |

### Step 13.4 -- Wire Analytics URLs

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-13.4.1P | Positive | Analytics endpoint accessible | GET `/api/analytics/overview` | Route resolves |

---

## Phase 14 -- OpenSearch Integration

### Step 14.1 -- Create OpenSearch Client

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-14.1.1P | Positive | Client connects to OpenSearch | Initialize OpenSearchClient | No connection error |
| TC-14.1.2P | Positive | create_index works | Call `create_index('test_index', mapping)` | Index created |
| TC-14.1.3P | Positive | index_document works | Index a test document | Document retrievable |
| TC-14.1.4P | Positive | search works | Search after indexing | Matching documents returned |
| TC-14.1.5P | Positive | bulk_index works | Bulk index 10 documents | All 10 indexable |
| TC-14.1.6N | Negative | Connection failure handled | Initialize with wrong host | Connection error caught, clear message |
| TC-14.1.7N | Negative | Auth failure handled | Initialize with wrong credentials | Auth error caught |

### Step 14.2 -- Create Index Definitions

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-14.2.1P | Positive | All 4 mappings defined | Check opensearch_indexes.py | JOURNEY_TRAILS_MAPPING, MODERATION_DOCS_MAPPING, PRODUCT_KB_MAPPING, FEEDBACK_MAPPING exist |
| TC-14.2.2P | Positive | Mappings have correct field types | Inspect each mapping | Fields match Architecture Section 9 specification |
| TC-14.2.3P | Positive | chunk_text uses text type with analyzer | Check MODERATION_DOCS and PRODUCT_KB mappings | `chunk_text` has `type: text, analyzer: standard` |

### Step 14.3 -- Create Index Management Command

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-14.3.1P | Positive | Command creates all 4 indexes | Run `python manage.py setup_opensearch` | `reco_journey_trails`, `reco_moderation_docs`, `reco_product_kb`, `reco_feedback` created |
| TC-14.3.2P | Positive | Idempotent | Run command twice | No errors on second run |
| TC-14.3.3N | Negative | Handles OpenSearch down | Run with OpenSearch offline | Clear error message |

### Step 14.4 -- Create Product KB Indexer

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-14.4.1P | Positive | Product indexed to KB | Create product with features, run indexer | Documents in `reco_product_kb` for that product |
| TC-14.4.2P | Positive | Content chunked properly | Index product with long description | Multiple chunks created (~500 tokens each) |
| TC-14.4.3P | Positive | Searchable | Index product, search for a feature keyword | Relevant chunks returned |
| TC-14.4.4N | Negative | Product with no data creates no chunks | Index empty product | No documents indexed, no error |

### Step 14.5 -- Create Moderation Doc Indexer

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-14.5.1P | Positive | Text doc indexed | POST `/api/moderation/docs/` with `{text: "Never recommend product X..."}` | 200, chunks indexed to `reco_moderation_docs` |
| TC-14.5.2P | Positive | File uploaded and indexed | POST with Word/PDF file | File stored on S3, content extracted, chunks indexed |
| TC-14.5.3P | Positive | chunks_indexed count returned | Check response | `{doc_id: "...", chunks_indexed: N}` where N > 0 |
| TC-14.5.4P | Positive | Searchable | Index doc, search for keyword | Relevant chunks returned from OpenSearch |
| TC-14.5.5N | Negative | Non-admin rejected | Upload as staff user | 403 Forbidden |
| TC-14.5.6N | Negative | Empty text handled | POST with `{text: ""}` | 400 error or 0 chunks indexed |
| TC-14.5.7N | Negative | Unsupported file type handled | Upload .exe file | 400 error |

---

## Phase 15 -- Web Crawling and Content Enrichment

### Step 15.1 -- Create Crawl Models

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-15.1.1P | Positive | CrawledProductContent creates | Create with product FK, crawl_url | Saves |
| TC-15.1.2P | Positive | CrawlConfig creates with unique domain | Create with brand_domain, selectors | Saves |
| TC-15.1.3N | Negative | Duplicate brand_domain rejected | Create two CrawlConfig with same domain | IntegrityError |

### Step 15.2 -- Create Crawler Service

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-15.2.1P | Positive | CSS selector extraction works | Configure CrawlConfig with valid selectors, crawl a URL | Description, highlights, images extracted |
| TC-15.2.2P | Positive | LLM fallback works | Set `use_llm_fallback=True`, use invalid selectors | Bedrock extracts content from raw HTML |
| TC-15.2.3P | Positive | Product crawl_status updated | After successful crawl | `Product.crawl_status = 'completed'` |
| TC-15.2.4P | Positive | Product re-indexed to OpenSearch | After crawl completion | New chunks in `reco_product_kb` from crawled content |
| TC-15.2.5P | Positive | Images downloaded to S3 | Crawl page with images | Images stored in S3, URLs in `crawled_images` |
| TC-15.2.6N | Negative | 404 URL handled | Crawl a URL that returns 404 | `crawl_status = 'failed'`, error logged |
| TC-15.2.7N | Negative | Timeout handled | Crawl a very slow URL | Timeout after configured limit, no hang |
| TC-15.2.8N | Negative | Malformed HTML handled | Crawl page with broken HTML | BeautifulSoup handles it, no crash |
| TC-15.2.9N | Negative | SSL error handled | Crawl URL with invalid SSL cert | Error logged, crawl_status = 'failed' |

### Step 15.3 -- Create Async Crawl Task

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-15.3.1P | Positive | Crawl queued via Django Q | POST `/api/crawl/product/{id}` | Returns `{status: "queued"}`, task appears in Django Q |
| TC-15.3.2P | Positive | Async crawl executes | Start Django Q worker, queue crawl | Crawl completes asynchronously |
| TC-15.3.3N | Negative | Invalid product_id returns error | POST `/api/crawl/product/99999` | 404 |
| TC-15.3.4N | Negative | Non-admin rejected | POST as staff user | 403 Forbidden |

### Step 15.4 -- Create Bulk Crawl After Excel Upload

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-15.4.1P | Positive | Crawl queued for products with URLs | Upload Excel with product_url columns | `trigger_product_crawl()` called for each product with URL |
| TC-15.4.2P | Positive | Products without URLs not crawled | Upload Excel with some rows missing product_url | Only rows with URLs get crawl tasks |
| TC-15.4.3N | Negative | Crawl failure doesn't block upload | One crawl task fails | Upload still reports success, crawl failure logged separately |

---

## Phase 16 -- End-to-End Integration and Polish

### Step 16.1 -- Cookie Domain Configuration

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-16.1.1P | Positive | Production cookie settings correct | Check prod.py | `SESSION_COOKIE_DOMAIN = '.reco.bsharpcorp.com'`, `CSRF_COOKIE_DOMAIN = '.reco.bsharpcorp.com'` |
| TC-16.1.2P | Positive | CORS origins include both subdomains | Check prod.py | `login.reco.bsharpcorp.com` and `app.reco.bsharpcorp.com` in CORS_ALLOWED_ORIGINS |
| TC-16.1.3P | Positive | Dev settings use None (localhost) | Check dev.py | `SESSION_COOKIE_DOMAIN = None` |
| TC-16.1.4N | Negative | Cross-origin request without credentials rejected | Send request from unknown origin | Blocked by CORS |

### Step 16.2 -- Angular -> React Redirect Flow

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-16.2.1P | Positive | Full login flow works end-to-end | Open React app -> redirected to Angular login -> log in -> redirected back to React -> consent screen loads | All steps succeed with brand info populated |
| TC-16.2.2P | Positive | Cookie shared across subdomains | Login via Angular, check cookie | `sessionid` set on `.reco.bsharpcorp.com` parent domain |
| TC-16.2.3P | Positive | React reads loginUserDetails after redirect | After Angular redirect to React | `GET /users/loginUserDetails` returns 200 with user data |
| TC-16.2.4N | Negative | Expired session triggers re-login | Let session expire, then try to navigate in React app | Redirected to Angular login |
| TC-16.2.5N | Negative | Cleared cookies trigger re-login | Clear browser cookies, navigate in React | Redirected to Angular login |
| TC-16.2.6N | Negative | Wrong domain cookie not accepted | Set sessionid on `.wrong.domain.com` | React's loginUserDetails returns 401 |

### Step 16.3 -- Brand Theming Integration

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-16.3.1P | Positive | CSS variable set from cm_color | Login with brand cm_color="#E2231A" | `document.documentElement.style.getPropertyValue('--brand-color')` returns `#E2231A` |
| TC-16.3.2P | Positive | Brand logo from auth context | Check BrandMark component | Uses `AuthContext.brand.logoImageUrl` |
| TC-16.3.3P | Positive | Brand name in top bar | Check top bar | Shows `AuthContext.brand.cmName` |
| TC-16.3.4N | Negative | Missing cm_color uses default | Brand with `cm_color=null` | Default color (#2563eb) applied, no crash |
| TC-16.3.5N | Negative | Missing logo_image_url handled | Brand with `logo_image_url=null` | Fallback image or text shown |

### Step 16.4 -- Journey Audit Trail

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-16.4.1P | Positive | Full journey logged | Complete entire flow (consent -> questions -> recommendations -> comparison -> handoff -> share -> complete) | All events in OpenSearch `reco_journey_trails` with correct `conversation_id` |
| TC-16.4.2P | Positive | Events have timestamps | Check journey trail documents | All have `timestamp` field |
| TC-16.4.3P | Positive | Events searchable by conversation_id | Query OpenSearch with conversation_id | All events for that journey returned |
| TC-16.4.4N | Negative | OpenSearch outage doesn't break journey | Disconnect OpenSearch, run a session | Session works, MySQL events saved, OpenSearch indexing fails silently |

### Step 16.5 -- Error Handling and Edge Cases

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-16.5.1N | Negative | Network error during voice recording | Disconnect network mid-recording | Error toast, recording data preserved locally |
| TC-16.5.2N | Negative | Whisper timeout on long audio | Send 3-minute audio (over 2-min limit) | Timeout handled, error message to user |
| TC-16.5.3N | Negative | Bedrock rate limiting | Trigger many LLM calls rapidly | 429 error caught, retry with backoff or user-friendly message |
| TC-16.5.4N | Negative | Session expiry mid-journey | Let Django session expire during active journey | Next API call returns 401, user redirected to login |
| TC-16.5.5N | Negative | Browser back button works | Navigate forward 3 screens, press back twice | Returns to correct screen, state preserved |
| TC-16.5.6N | Negative | Empty recommendation results | Session where no products pass hard filters | "No matching products" message, not crash |
| TC-16.5.7N | Negative | Comparison with missing features | Compare two products where one has missing feature values | Table shows "N/A" for missing values, no crash |
| TC-16.5.8N | Negative | Concurrent sessions handled | Same user starts two sessions in two tabs | Both sessions function independently |
| TC-16.5.9N | Negative | XSS in text input | Enter `<script>alert(1)</script>` in text discovery | Script NOT executed, text escaped/sanitized |
| TC-16.5.10N | Negative | SQL injection in search | Enter `'; DROP TABLE products; --` in chat question | No SQL injection, query parameterized |

### Step 16.6 -- Performance Optimization

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-16.6.1P | Positive | Comparison cache hit rate | Compare same products from 2 different outlets | Second comparison is a cache hit (no LLM call) |
| TC-16.6.2P | Positive | Whisper model stays loaded | Submit two transcriptions in sequence | Second transcription doesn't re-load model (faster) |
| TC-16.6.3P | Positive | Loading states for all API calls | Navigate through all screens | Every screen shows loading indicator while API call is in progress |
| TC-16.6.4P | Positive | Processing screen covers recommendation time | Time the recommendation API call | Processing screen (2.2s min) covers actual API latency |
| TC-16.6.5N | Negative | Slow Bedrock doesn't hang UI | Mock Bedrock with 10s delay | Loading indicator shown, no frozen UI |
| TC-16.6.6N | Negative | Large product catalog doesn't slow scoring | Load 500 products, run scoring | Completes in < 5 seconds |

---

## Cross-Cutting Test Cases

These test cases span multiple phases and verify system-wide behavior.

### Security

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-SEC.1N | Negative | All API endpoints require authentication | Call every `/api/*` endpoint without session cookie | All return 401 or 403 |
| TC-SEC.2N | Negative | Tenant isolation | Login as tenant A, try to access tenant B's sessions/products/packets | 404 or 403 for all cross-tenant requests |
| TC-SEC.3N | Negative | Role enforcement (admin endpoints) | Login as staff (rid=2), try Excel upload, moderation upload, crawl trigger | 403 Forbidden for all admin-only endpoints |
| TC-SEC.4N | Negative | CSRF protection on non-exempt endpoints | POST to `/api/sessions/` without CSRF token | 403 CSRF failure |
| TC-SEC.5N | Negative | Rate limit on login | POST `/login/login_user` 4 times in 1 minute | 4th request blocked |
| TC-SEC.6N | Negative | Password not in API responses | GET `/users/loginUserDetails` | Response does NOT contain password field |
| TC-SEC.7N | Negative | Customer PII not leaked | GET session details as different staff member | PII not included or access denied |

### Data Integrity

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-DI.1P | Positive | Session -> Customer -> Lead chain | Create session, add customer, create lead | All FK relationships valid |
| TC-DI.2P | Positive | Cascade deletes work | Delete a session | SessionAnswers, CustomerProfile, Feedback, RecommendationResults for that session also deleted |
| TC-DI.3P | Positive | cmid consistent throughout | Check session, customer, feedback, lead for same journey | All have same cmid |
| TC-DI.4N | Negative | Orphaned references impossible | Try to create SessionAnswer for non-existent session | FK constraint prevents it |

### Multi-Tenancy

| ID | Type | Description | Steps | Expected Result |
|----|------|-------------|-------|-----------------|
| TC-MT.1P | Positive | Different brands see different data | Login as Lenovo admin, then login as Samsung admin | Each sees only their packets, products, sessions, analytics |
| TC-MT.2P | Positive | Comparison cache per-tenant | Brand A and Brand B both have products | Cache entries filtered by cmid |
| TC-MT.3P | Positive | Moderation rules per-tenant | Brand A has "Never recommend X" rule | Rule only affects Brand A's recommendations |
| TC-MT.4N | Negative | Cross-tenant product access | Tenant A tries `GET /api/products/{tenant_B_product_id}` | 404 |
| TC-MT.5N | Negative | Cross-tenant analytics | Staff from tenant A tries analytics for tenant B | Only sees own tenant data |

---

*End of Test Cases Document v1.0*

**Total test cases: ~380 (Positive: ~200, Negative: ~180)**
