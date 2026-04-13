# Bsharp Reco: End-to-End User Journey and Technical Flow

## 1. What Reco is

Bsharp Reco is a tenant-aware recommendation application built to help a store associate or guided customer journey move from broad customer needs to a shortlist of products, explanations, comparisons, and finally a handoff or share action. In practical terms, it is an assisted-selling flow for laptops and similar products.

At a business level, Reco is trying to do four things in one flow:

1. identify who the user belongs to and which tenant or brand context applies
2. capture customer intent in natural language or voice
3. convert that intent into structured recommendation logic
4. produce a trustworthy shortlist that a salesperson can explain, compare, and hand off

The repo shows an MVP implementation of that vision. The `docs/` folder describes the fuller target architecture. The important thing is that the current codebase and the final documents are not identical. Some parts are fully wired today, some are partially wired, and some are clearly planned but not yet implemented end to end.

This document explains both:

- what the current MVP actually does in code
- what the final architecture documents say it is supposed to become

## 2. The major systems involved

The current implementation is made up of these main pieces:

- `reco-login`: Angular login app
- `Reco-Frontend`: React application for the actual recommendation journey
- `reco-backend`: Django backend with REST APIs and admin
- MySQL databases:
  - Reco database for recommendation data
  - Converse database for shared user and tenant identity data
- Amazon Bedrock for LLM tasks
- Whisper for speech-to-text
- OpenSearch for indexed knowledge and retrieval
- SES for email sending
- S3 as a planned storage layer in the architecture, but not meaningfully used in the current MVP code paths

## 3. The top-level product story

From the user point of view, the intended journey is:

1. open Reco
2. authenticate once through Bsharp Converse or a central login layer
3. enter customer needs through text or voice
4. let the system infer the important dimensions
5. answer follow-up questions
6. receive top recommendations
7. compare products and ask deeper product questions
8. capture a lead or handoff to a salesperson
9. optionally share the recommendation
10. close the journey and preserve enough data for learning and analytics

That is the business flow. The next sections explain how the current MVP and the target architecture each realize it.

## 4. Login and session flow

## 4.1 What the current MVP is actually doing

The current code is primarily set up for a shared Django session and cookie model, not a true OAuth-style auth-code and token-exchange model.

### Current login sequence

1. The user opens the React Reco app.
2. The React app checks authentication by calling `/users/loginUserDetails`.
3. If that request fails, the user is redirected to the Angular login application.
4. The Angular app first checks whether the user exists and whether a password prompt should be shown through `/login/getLoggedInUserStatus`.
5. The user enters credentials.
6. Angular calls `/login/login_user` on the Django backend using `withCredentials`.
7. Django authenticates against the Converse user tables and creates a server-side Django session.
8. The browser receives the Django session cookie and CSRF cookie.
9. Angular redirects the browser to the React app URL.
10. The React app again calls `/users/loginUserDetails`, now succeeds, and builds the authenticated frontend context.

### What is being persisted during login

- Identity source: Converse MySQL database
- Session state: Django session mechanism, which typically stores rows in the Reco database's `django_session` table
- Browser state:
  - `sessionid` cookie for authenticated session
  - `csrftoken` cookie for API safety

### Important technical detail

The architecture docs often describe Converse data as read-only from Reco. In the current code, that is not fully true. The login path updates fields like `first_login` and `access_key` on the Converse user record during successful login. So the current MVP is reading identity from Converse and also writing some login metadata back into it.

## 4.2 What the current Angular-to-React setup is primed for

The current Angular login app is primed for this pattern:

- one login surface owned by Converse or a related shared service
- shared session cookies across related subdomains
- redirect into the React app once the Django session already exists
- reuse of that same session by another Bsharp application if the cookie domain and backend trust model are aligned

So conceptually it is already moving toward central login and cross-app SSO, but the mechanism today is still "shared authenticated server session plus redirect", not "redirect with auth code, app exchanges code for tokens".

## 4.3 The manager's target login flow

The manager-described flow is:

1. user opens Reco
2. app checks for a valid local session or token
3. if absent, app redirects to central auth service, Bsharp Converse
4. user logs in once
5. central auth service performs:
   - credential validation
   - tenant lookup
   - dependent dropdown selection if needed
   - MFA or biometric if enabled
6. auth service redirects back with an auth code
7. app exchanges code for tokens
8. user uses app
9. another Bsharp app reuses the central SSO session and does not ask for credentials again

That is a proper centralized SSO flow with an authorization-code style handshake.

## 4.4 Difference between current MVP and target login

Current MVP:

- session cookie based
- React app probes backend to know if session exists
- no local access token or refresh token handling
- no code exchange
- no explicit MFA flow in the Reco codebase
- no full central auth protocol implemented in Reco itself

Target architecture:

- central auth service is the source of truth
- Reco becomes a relying application
- redirect back carries a temporary code, not a ready-made app session
- Reco or its backend exchanges code for tokens
- SSO becomes cleaner across multiple Bsharp apps

So the current Angular login is a good precursor to central SSO, but it is not yet the same thing.

## 5. End-to-end user journey in the current MVP

This section walks one user from first open to final completion.

## 5.1 App entry

The user opens Reco. Authentication is checked immediately through the backend. If not authenticated, the user is sent to the Angular login application. After successful login, the React app mounts with the authenticated user context.

The backend returns user and tenant details such as:

- `uid`: user ID
- `cmid`: tenant or company ID
- `cm_name`: tenant/company name
- `cm_color`: tenant theme color
- `role`: user role
- logo fields and related brand information

This tenant context matters because the rest of the journey is supposed to be tenant-scoped.

## 5.2 What the user sees first after login

In the architecture docs, the authenticated user should move into the recommendation journey immediately. In the current React MVP, the root route still lands on a lightweight landing screen and then moves into consent. So even though authentication is real, the first screen behavior still has some MVP/demo characteristics.

## 5.3 Consent and session creation

The next meaningful step is consent.

When the user accepts and continues, the frontend creates:

- a `customer_sessions` row through `POST /api/sessions/`
- a `customer_profiles` row through `POST /api/customers/`

### What gets saved

In `customer_sessions`, the system stores values such as:

- `session_id`
- `conversation_id`
- `cmid`
- `outlet_id`
- `user_id`
- `packet_id`
- `discovery_mode`
- `status`

In `customer_profiles`, the system stores values such as:

- customer name
- phone
- email
- consent flag

### Where else session state exists

- browser `sessionStorage`: `reco_session_id`
- browser cookies: Django auth session
- MySQL Reco DB: the durable journey records

This is the first real handoff from frontend state into persistent backend state.

## 5.4 Need capture: text or voice discovery

The customer or salesperson describes needs. This can happen by text or by recorded speech.

### Voice path

1. frontend uploads an audio blob to `/api/voice/transcribe`
2. backend stores the upload as a temporary local file
3. backend converts audio with `ffmpeg`
4. Whisper transcribes speech to text
5. Bedrock receives the transcript and extracts tags
6. frontend receives transcript plus inferred tags

### Text path

1. frontend sends typed text to `/api/voice/analyze-text`
2. backend skips Whisper
3. Bedrock extracts tags directly from the text
4. frontend receives inferred tags

### What the tags represent

These tags are the bridge between unstructured language and recommendation logic. Examples include ideas such as:

- portability
- gaming
- battery life
- coding
- office use
- student use
- travel
- content creation

### What gets saved

The frontend eventually stores the discovery outcome as a session answer, marked with `from_voice = true` when it originated from the discovery stage. The answer payload also carries structured `score_effect` data containing items like:

- discovery mode
- original discovery text
- extracted tags

### Important MVP reality

The current code does not persist raw audio to S3. It uses temporary local files for transcription and removes them. So the final documents talk more broadly about cloud storage, but the implemented MVP transcription path is local-temp-file based.

## 5.5 Dynamic question generation

Once the initial intent is known, the system moves into guided questioning.

### What the docs intend

The final architecture says Reco should use:

- discovery output
- packet dimensions
- business moderation rules
- product knowledge
- LLM orchestration

to generate relevant and minimal follow-up questions.

### What the current MVP actually does

The current orchestrator:

1. reads the session and prior answers
2. checks whether a discovery signal already exists
3. builds product and feature context from the catalog
4. calls Bedrock to generate the next question as JSON
5. validates the output and enforces guardrails
6. logs the LLM call into `llm_call_logs`

If the system does not have enough discovery data or the LLM path fails, it falls back to a deterministic question bank.

### Important implementation nuance

The `Dimension` model exists in admin and is clearly intended to drive question generation, but in the current MVP orchestrator the dimensions are not deeply wired into the live question-generation logic. The code relies more on prior answers, discovery tags, and catalog summaries than on a strong dimension-driven questioning engine.

### What gets saved

Every answer to a generated question is saved into `session_answers`, including:

- question text
- answer text
- whether it came from the voice/discovery stage
- `score_effect` JSON for structured impact

This answer history is the main recommendation input.

## 5.6 Recommendation scoring

After enough answers are collected, the system calculates recommendations.

### Actual scoring flow in MVP

1. load session answers
2. read baseline scoring configuration from `scoring_configs`
3. apply discovery-tag adjustments
4. apply answer-based preference inference
5. apply benefit mappings
6. calculate product scores across scoreable features
7. apply hard filters
8. apply moderation and pattern logic where available
9. enforce diversity or ranking rules
10. produce a shortlist
11. send the shortlist to Bedrock for conservative reranking
12. generate explanation text for the final products
13. save the final results

### What gets saved

Final shortlisted recommendations are stored in `recommendation_results`.

The exact stored payload includes product IDs, ranks, scores, and explanation data for the recommendation set associated with the session.

### Why Bedrock is involved here

Bedrock is not replacing the whole scoring engine. The MVP uses deterministic scoring first, then uses the LLM more narrowly for:

- next-question generation
- shortlist reranking
- explanation generation
- product chat and comparison commentary

That is a sensible hybrid design. It keeps final ranking anchored in business logic rather than allowing the model to score everything from scratch.

## 5.7 Recommendation presentation and feedback

The user sees the top recommendations, usually a top three experience from the React app.

The user can also leave star feedback. That feedback is posted to `/api/feedback/`, which stores a feedback record that includes:

- recommended products
- captured answers
- voice tags
- scoring weights used at the time

The session record also stores recommendation feedback stars.

This is the start of the learning loop. The backend has a pattern analyzer that can aggregate feedback into reusable patterns.

## 5.8 Comparison

If the user wants to compare products, the app calls `/api/comparisons/`.

The comparison service:

1. loads the two products and their normalized feature values
2. checks for a cached comparison
3. if there is no cache hit, calls Bedrock to generate commentary and implications
4. stores the generated comparison in `comparison_cache`
5. returns a structured side-by-side result to the frontend

This is intended to save cost and improve consistency over repeated comparisons.

## 5.9 Product detail and chat

On a product detail page, the user can ask follow-up questions.

### Current product-chat flow

1. frontend calls `/api/chat/ask`
2. backend loads structured product data from MySQL
3. backend queries OpenSearch index `reco_product_kb`
4. backend constructs the RAG prompt
5. Bedrock generates the answer
6. backend stores the exchange in `chat_messages`

This is one of the clearest current uses of OpenSearch in the MVP.

## 5.10 Lead capture / salesperson handoff

The architecture docs treat handoff as a real operational step. The backend also has real endpoints for this:

- `/api/handoff/`
- `/api/handoff/pending`

Those endpoints create `Lead` and `HandoffRequest` records.

### MVP reality

The current React handoff screen is mostly UI state. It validates fields and marks alert sent in the browser, but it does not actually call the backend handoff endpoint in the shipped frontend flow.

So the backend capability exists, but the frontend is not fully wired to it yet.

## 5.11 Share and save

The backend has email-share capability through SES and stores `ShareEvent` records.

There is also a WhatsApp share endpoint stub, but it returns not implemented.

### MVP reality

The current React share screen is also mostly presentational. It does not actually call the backend email share endpoint in the normal screen flow.

Again, the backend capability exists, but the frontend integration is incomplete.

## 5.12 Completion

At the end of the flow, the confirmation screen clears the local journey state and returns the UI to a fresh state for the next recommendation journey.

## 6. What is saved where in the current MVP

## 6.1 Reco MySQL database

This is the main system-of-record database for the recommendation application.

It stores:

- Django sessions
- customer sessions
- customer profiles
- session answers
- recommendation results
- products
- feature values
- packet configuration
- scoring configuration
- benefit mappings
- product content
- comparison cache
- chat messages
- feedback
- leads and handoff requests
- share events
- crawl outputs
- analytics tables

## 6.2 Converse MySQL database

This holds shared identity and tenant information, including user, company, and role mappings used during login and user context construction.

In the current implementation it is not purely read-only, because login success writes some metadata back to the Converse user record.

## 6.3 OpenSearch

The code defines and uses OpenSearch indexes for:

- `reco_product_kb`: product knowledge retrieval for product chat
- `reco_moderation_docs`: indexed moderation or business policy content
- `reco_journey_trails`: intended journey analytics trail
- `reco_feedback`: intended feedback indexing

### What OpenSearch is actually used for today

Current meaningful use:

- product knowledge retrieval for chat
- moderation document indexing support

Planned or only partially wired use:

- journey trail analytics
- feedback retrieval and analytics
- moderation-aware recommendation influence

So when someone says "Elastic", the actual repo is using the OpenSearch client and OpenSearch-style indexes. Functionally it fills the same search and retrieval role, but the current implementation is OpenSearch-oriented.

## 6.4 S3

The final architecture expects S3 to hold product media, ingested documents, or other durable assets. The current MVP code includes an S3 client wrapper, but there is little real usage in live MVP flows.

Current MVP reality:

- product media is mostly stored as URLs in MySQL
- crawled content is stored in MySQL
- moderation document ingestion does not perform a real file-upload-to-S3 flow
- voice uploads are handled as temporary local files, not S3 objects

So S3 is part of the target architecture more than a fully realized MVP dependency.

## 6.5 SES

SES is used for the backend email-share service. This is real backend functionality, but the current frontend share screen is not fully wired to it.

## 6.6 Bedrock

Bedrock is the primary LLM service in the current design.

It is used for:

- extracting tags from discovery text or transcript
- generating next questions
- reranking recommendation candidates
- generating product explanations
- generating comparison commentary
- answering product chat questions
- fallback extraction in some crawl/content enrichment paths

## 6.7 Whisper

Whisper is used only for speech-to-text in the voice discovery path. It converts recorded user speech into text before Bedrock extracts structured tags from that text.

## 6.8 Is this definitely Amazon RDS MySQL?

The repo confirms MySQL. The docs also describe MySQL 8+ as the database platform. What the repo does not prove is the exact managed hosting layer. So it is safe to say:

- MySQL is definitely used
- Amazon RDS MySQL is a plausible deployment target
- the checked-in code does not itself prove that production must be RDS specifically

## 7. Django admin and packet-builder data model

This is the part your manager or ops team will care about because it defines what business users configure.

## 7.1 Packet

`Packet` is the top-level recommendation bundle or tenant/category package.

Think of it as: "for this tenant and this product family, which catalog and rules should Reco use?"

Typical fields and meaning:

- tenant linkage, such as `cmid`
- packet name
- category context
- active state

## 7.2 Product

Each product row represents a recommendable item.

Important fields:

- product identity, SKU, or model code
- family
- brand
- price
- URL
- crawl status

`crawl_status` indicates whether content enrichment from product pages still needs to happen or has already been processed.

## 7.3 Feature

A `Feature` defines a dimension that can appear on products, such as RAM, weight, processor tier, battery, portability, graphics, or display characteristics.

Important fields:

- `feature_code`: stable machine-facing identifier
- `feature_name`: readable label
- `feature_type`: numeric, categorical, boolean, etc.
- `is_comparable`: whether it should appear in comparison UI
- `is_scoreable`: whether it should affect ranking

## 7.4 FeatureValue

`FeatureValue` is the actual value of a feature for a specific product.

Important fields:

- raw value
- normalized value

`normalized_value` matters because ranking and comparison usually need standardized values rather than messy scraped strings.

## 7.5 BenefitMapping

This is where business meaning connects to scoring.

Example:

- customer says "I travel a lot"
- system interprets this as portability
- benefit mapping increases the importance of weight and battery-related features

Important field:

- `weight_impact`

`weight_impact` means how strongly a detected benefit should change a feature's importance in the scoring engine.

## 7.6 Dimension

`Dimension` represents a higher-level questioning or preference axis, such as portability, performance, battery, office work, creative work, gaming, or budget sensitivity.

The model also includes seed-question ideas. In the final architecture this should drive dynamic questioning more strongly than it does today.

## 7.7 ScoringConfig

This is one of the most important admin objects.

Important JSON fields:

- `default_weights`
- `hard_filters`
- `stopping_rules`

### `default_weights`

These are the baseline importance values for each scoreable feature before the customer's answers change anything.

Example meaning:

- processor = 0.66
- weight = 0.70
- price = 0.64

This does not mean the customer explicitly asked for those things. It means the packet starts with a default belief about which attributes matter in that category.

### `hard_filters`

These are non-negotiable constraints.

Examples:

- maximum budget
- minimum RAM
- must include dedicated graphics

If a product fails a hard filter, it should not survive the shortlist no matter how good its weighted score is.

### `stopping_rules`

These are the intended rules for deciding when enough information has been collected and the system should stop asking more questions. The concept exists in admin and docs, though the current MVP uses more hard-coded orchestration logic than a fully admin-driven stopping engine.

## 7.8 ProductContent

This stores customer-facing content for each product.

Important fields:

- `hero_image_url`
- `gallery_urls`
- `fit_summary`
- `key_highlights`
- `best_for`
- `salesperson_tips`

These fields are what make the recommendation feel explainable and retail-friendly.

## 7.9 FinanceScheme, Accessory, RetailOutlet

These support commerce and store operations.

- `FinanceScheme`: financing or installment options
- `Accessory`: related upsell items
- `RetailOutlet`: store-specific context and operational scope

## 7.10 What FAB means here

You asked specifically about FAB.

FAB usually means:

- Feature
- Advantage
- Benefit

In the current MVP schema, FAB is not a single explicit database field. Instead, the idea is spread across several places:

- `Feature` and `FeatureValue` hold the feature facts
- `BenefitMapping` and answer inference encode the benefit logic
- `ProductContent.best_for`, `fit_summary`, `key_highlights`, and `salesperson_tips` hold the explainable customer-facing positioning

So FAB is conceptually present, but not modeled as one dedicated admin column named `FAB`.

## 8. What the final documents say should be saved where

The final docs describe a cleaner, more cloud-structured storage model than the MVP currently enforces.

### Intended long-term storage picture

- Converse DB:
  - user auth and tenant identity
  - read-only from Reco in principle
- Reco DB:
  - sessions, answers, profiles, recommendations, feedback, leads, shares, admin data
- OpenSearch:
  - journey trails
  - moderation docs
  - product knowledge
  - feedback analytics
- S3:
  - product assets
  - uploaded moderation documents
  - possibly other ingested artifacts
- SES:
  - outgoing share mail

That target model is cleaner because each storage layer has a clearer responsibility.

## 9. Current MVP versus final-document target

This is the most important reconciliation section.

| Area | Current MVP in code | Final docs target |
| --- | --- | --- |
| Login | Shared Django session and redirect | Central auth service with auth code and token exchange |
| Converse DB usage | Read plus some writes on login metadata | Read-only identity source |
| React app start | Authenticated app still lands on MVP-style landing route | Cleaner direct journey entry |
| Voice storage | Temporary local files | More cloud-managed storage story |
| S3 usage | Barely used | Durable asset/document store |
| Dynamic questions | LLM plus fallback, limited dimension usage | Strong dimension- and moderation-aware orchestration |
| Moderation docs | Indexing exists | Fully integrated business-rule retrieval during orchestration and scoring |
| OpenSearch | Strongest use is product chat RAG | Broader use across analytics, moderation, feedback |
| Lead handoff | Backend exists, frontend not fully wired | Full operational handoff flow |
| Share | Backend email exists, frontend not fully wired | Full share and save experience |
| Analytics | Tables and index helpers exist, not deeply wired into runtime | Full journey trail and learning loop |

## 10. One practical example journey

This example ties everything together.

### Example user

A salesperson at a Bsharp tenant store opens Reco to help a customer who says:

"I need a lightweight laptop for travel, coding, and some casual gaming. Battery life matters. Budget is around the mid range."

### Flow

1. The salesperson opens Reco.
2. Reco checks whether the Django session already exists.
3. If not logged in, the browser goes to the Angular Converse login screen.
4. The user enters credentials.
5. Django validates against Converse user tables, creates a session cookie, and redirects back to React.
6. React loads user details and tenant context.
7. The salesperson starts the journey and gives consent.
8. A `customer_sessions` row and `customer_profiles` row are created in the Reco database.
9. The user types the need statement above.
10. Backend sends the text to Bedrock tag extraction.
11. Bedrock returns signals like portability, coding, battery, gaming, and value sensitivity.
12. The frontend shows editable tags.
13. On continue, the discovery result is saved into `session_answers` with structured scoring context.
14. The question engine decides what is still ambiguous, for example screen size preference or how important gaming really is.
15. Bedrock generates the next question.
16. The answer is saved into `session_answers`.
17. This repeats until the backend decides enough signal has been collected.
18. The scoring engine loads products for the packet, reads `default_weights`, applies answer and benefit adjustments, and removes products that fail hard filters.
19. A top candidate set is produced.
20. Bedrock reranks the shortlist conservatively and writes human-friendly explanation text.
21. The final recommendation set is saved in `recommendation_results`.
22. The React app shows the top three products with fit summaries and highlights.
23. The user opens a comparison between two of them.
24. Backend either returns a cached comparison or calls Bedrock and then stores the result in `comparison_cache`.
25. The user opens one product detail page and asks, "Will this handle coding plus occasional gaming while traveling?"
26. Backend combines MySQL product facts with OpenSearch product KB context and uses Bedrock to answer.
27. The answer is stored in `chat_messages`.
28. The user leaves a star rating on the recommendation quality.
29. Backend stores a feedback record for later analysis.
30. If the operational handoff path were fully wired, the user would then create a lead or send an alert to a salesperson and that would persist through the leads APIs.
31. If the share flow were fully wired, the user could email the recommendation through SES and a `ShareEvent` would be stored.
32. The journey ends and the UI resets for the next customer.

## 11. Bottom line

Reco today is a real hybrid system, not just a mockup. Authentication is real. Session creation is real. Voice and text discovery are real. Bedrock-based question generation and recommendation explanation are real. Recommendation scoring is real. Product chat with OpenSearch retrieval is real.

At the same time, several pieces are still MVP-grade or only partially integrated:

- login is not yet the manager's full central auth-code SSO flow
- S3 is more architectural intent than live runtime dependency
- dimensions and moderation are not as deeply wired into orchestration as the docs suggest
- lead handoff and email share backend pieces exist, but the frontend is not fully connected to them
- analytics and feedback indexing are not fully operational end to end

So the cleanest way to describe the system is:

Reco MVP already has a functioning end-to-end recommendation core built on Django, React, Angular login, MySQL, Bedrock, Whisper, and OpenSearch. The final documents describe the next step: stronger central SSO, cleaner storage separation, fuller admin-driven orchestration, and fully wired operational handoff and analytics.
