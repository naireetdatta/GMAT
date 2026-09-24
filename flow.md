# System Execution & Control Flow Documentation

This document provides an exhaustive, chronological trace of execution flows across the **GMAT Focus Edition Platform**. It illustrates exactly what is called, in what order, across all major runtime subsystems.

---

## 📑 Table of Contents

1. [System Startup & Bootstrapping Flow](#1-system-startup--bootstrapping-flow)
2. [Authentication & Request Interception Flow](#2-authentication--request-interception-flow)
3. [Full GMAT Focus Exam Execution Lifecycle](#3-full-gmat-focus-exam-execution-lifecycle)
   - [Phase 3.1: Exam Configuration & Initiation](#phase-31-exam-configuration--initiation)
   - [Phase 3.2: Question Allocation & Initial IRT Selection](#phase-32-question-allocation--initial-irt-selection)
   - [Phase 3.3: Live Test Interface Rendering](#phase-33-live-test-interface-rendering)
   - [Phase 3.4: Answering & Dynamic IRT Ability Recalibration](#phase-34-answering--dynamic-irt-ability-recalibration)
   - [Phase 3.5: Navigation, Pacing & Bookmarking](#phase-35-navigation-pacing--bookmarking)
   - [Phase 3.6: Section Review Screen & 3-Edit Limit Enforcement](#phase-36-section-review-screen--3-edit-limit-enforcement)
   - [Phase 3.7: Section Completion & Scaled Scoring](#phase-37-section-completion--scaled-scoring)
   - [Phase 3.8: Optional 10-Minute Break Management](#phase-38-optional-10-minute-break-management)
   - [Phase 3.9: Final Exam Scoring & Auto-Mistake Capture](#phase-39-final-exam-scoring--auto-mistake-capture)
   - [Phase 3.10: Results & Diagnostic Report Presentation](#phase-310-results--diagnostic-report-presentation)
4. [AI Multi-Agent Generation & Validation Pipeline](#4-ai-multi-agent-generation--validation-pipeline)
5. [Error Log to Spaced Repetition Conversion Pipeline](#5-error-log-to-spaced-repetition-conversion-pipeline)
6. [Spaced Repetition Review Lifecycle (SM-2 + Leitner)](#6-spaced-repetition-review-lifecycle-sm-2--leitner)
7. [Socratic AI Tutor Interactive Session Flow](#7-socratic-ai-tutor-interactive-session-flow)
8. [Analytics Aggregation & Coach Report Generation Flow](#8-analytics-aggregation--coach-report-generation-flow)

---

## 1. System Startup & Bootstrapping Flow

When running `pnpm dev`, Turborepo starts the backend API gateway and frontend web server in parallel:

```mermaid
sequenceDiagram
    autonumber
    participant Turbo as Turborepo
    participant Nest as apps/api (NestJS)
    participant Prisma as PrismaClient
    participant Next as apps/web (Next.js 16)
    participant Browser as Client Browser

    Turbo->>Nest: pnpm --filter api start:dev
    Turbo->>Next: pnpm --filter web dev

    Note over Nest: NestJS Bootstrapping
    Nest->>Nest: main.ts: NestFactory.create(AppModule)
    Nest->>Nest: app.setGlobalPrefix('api/v1')
    Nest->>Nest: app.enableCors({ origin: 'http://localhost:3000', credentials: true })
    Nest->>Nest: app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    Nest->>Prisma: PrismaService.$connect() (SQLite dev.db / PostgreSQL)
    Nest->>Nest: app.listen(3001)
    Note over Nest: 🚀 GMAT API running on http://localhost:3001

    Note over Next: Next.js App Router Compilation
    Next->>Next: Load next.config.ts & compile layout.tsx
    Browser->>Next: HTTP GET http://localhost:3000
    Next-->>Browser: HTML / CSS bundle with root layout
    Browser->>Browser: Mount FetchInterceptor.tsx
    Browser->>Browser: Monkey-patch window.fetch to auto-inject Bearer tokens
```

### Detailed Order of Execution:
1. **Turborepo** resolves dependencies and launches both `apps/api` and `apps/web`.
2. **NestJS (`apps/api/src/main.ts`)**:
   - Initializes `AppModule` which loads `ConfigModule` (`.env` file).
   - Instantiates database connection via `PrismaService.onModuleInit()`.
   - Sets global API route prefix to `/api/v1`.
   - Binds global `ValidationPipe` for automatic DTO transformation and whitelist validation.
   - Enables CORS for `http://localhost:3000`.
   - Listens on `API_PORT` (default 3001).
3. **Next.js (`apps/web`)**:
   - Boots Next.js 16 development server on `WEB_PORT` (default 3000).
   - Compiles server layout [`apps/web/src/app/layout.tsx`](file:///d:/GMAT/apps/web/src/app/layout.tsx).
   - Sends client bundle including [`FetchInterceptor.tsx`](file:///d:/GMAT/apps/web/src/components/FetchInterceptor.tsx).
   - `FetchInterceptor` executes in browser `useEffect()`, monkey-patching `window.fetch` to intercept any URL matching `/api/v1/*` or `http://localhost:3000/api/v1/*` and append `Authorization: Bearer <gmat_jwt_token>` from `localStorage`.

---

## 2. Authentication & Request Interception Flow

```mermaid
sequenceDiagram
    autonumber
    participant UI as Login Page (Client)
    participant Interceptor as FetchInterceptor
    participant API as AuthController
    participant Service as AuthService
    participant DB as Prisma (User)
    participant Guard as JwtAuthGuard

    UI->>API: POST /api/v1/auth/login { email, password }
    API->>Service: authService.login(dto)
    Service->>DB: prisma.user.findUnique({ where: { email } })
    DB-->>Service: User record (with passwordHash)
    Service->>Service: bcrypt.compare(password, user.passwordHash)
    alt Password Valid
        Service->>Service: jwtService.sign({ sub: user.id, email, role })
        Service-->>API: { accessToken, user }
        API-->>UI: 200 OK + JWT accessToken
        UI->>UI: localStorage.setItem("gmat_jwt_token", accessToken)
        UI->>UI: router.push("/dashboard")
    else Invalid Credentials
        Service-->>UI: 401 Unauthorized
    end

    Note over UI,API: Subsequent Protected Requests (e.g. GET /api/v1/analytics/dashboard)
    UI->>Interceptor: fetch("/api/v1/analytics/dashboard")
    Interceptor->>Interceptor: Read token from localStorage
    Interceptor->>API: HTTP GET with header "Authorization: Bearer <token>"
    API->>Guard: JwtAuthGuard intercepts
    Guard->>Guard: JwtStrategy.validate(payload)
    Guard->>API: Injects user into Request object (request.user)
    API-->>UI: Protected Dashboard Data JSON
```

---

## 3. Full GMAT Focus Exam Execution Lifecycle

The exam lifecycle represents the most critical, complex path in the application.

```mermaid
graph TD
    A[Start: /exam/new] --> B[Select Section Order from 6 Permutations]
    B --> C[POST /api/v1/exams]
    C --> D[Allocate Section 1 via IRT MFI]
    D --> E[Live Test: /exam/id]
    E --> F[Answer Question]
    F --> G[POST /answer -> Recalibrate Ability Theta]
    G --> H{More Questions in Section?}
    H -- Yes --> E
    H -- No --> I[Section Review Screen]
    I --> J{Edits Remaining <= 3?}
    J -- Edit Answer --> E
    J -- Submit Section --> K[Calculate Section Scaled Score 60-90]
    K --> L{More Sections?}
    L -- Yes --> M[10-Minute Optional Break Screen]
    M --> N[Advance to Next Section] --> D
    L -- No --> O[Calculate Total Score 205-805 & Percentile]
    O --> P[Auto-Capture Errors to Mistake Book]
    P --> Q[Render /exam/id/results]
```

### Step-by-Step Breakdown:

#### Phase 3.1: Exam Configuration & Initiation
1. Student navigates to `/exam/new`.
2. Student selects exam type (`ADAPTIVE`, `MOCK`, or `PRACTICE`) and chooses their preferred section order from the 6 official permutations (e.g. `QUANTITATIVE` $\rightarrow$ `VERBAL` $\rightarrow$ `DATA_INSIGHTS`).
3. Client dispatches `POST /api/v1/exams` with `{ type, sectionOrder }`.
4. [`ExamController.createExam()`](file:///d:/GMAT/apps/api/src/modules/exam/exam.controller.ts) delegates to [`ExamService.createExam()`](file:///d:/GMAT/apps/api/src/modules/exam/exam.service.ts).
5. `ExamService` initializes the `Exam` entity in Prisma with 3 `ExamSection` records:
   - Section 1: `status = IN_PROGRESS`, `timeRemaining = 2700` (45 min), `editsRemaining = 3`.
   - Section 2 & 3: `status = NOT_STARTED`, `timeRemaining = 2700`.

#### Phase 3.2: Question Allocation & Initial IRT Selection
1. `ExamService.allocateQuestionsForSection()` is invoked for Section 1 with initial ability $\theta = 0.0$.
2. It fetches all validated questions for the target section from Prisma.
3. It passes available questions to [`IrtService.selectQuestions()`](file:///d:/GMAT/apps/api/src/modules/irt/irt.service.ts):
   - Computes Fisher Information $I(\theta)$ for each item candidate at $\theta$.
   - Applies topic balancing constraints (e.g. balanced distribution between Arithmetic, Algebra, Word Problems).
   - Returns the optimal question sequence.
4. `ExamService` batch-inserts `ExamQuestion` records referencing the selected question IDs with ascending `orderIndex` (0 to 20 for Quant, 0 to 22 for Verbal, 0 to 19 for DI).
5. Returns exam payload to client; client navigates to `/exam/[id]`.

#### Phase 3.3: Live Test Interface Rendering & Server Clock Sync
1. [`apps/web/src/app/exam/[id]/page.tsx`](file:///d:/GMAT/apps/web/src/app/exam/[id]/page.tsx) mounts and reads `params.id`.
2. Fetches `GET /api/v1/exams/:id` and `/api/v1/exams/:id/sync`.
3. Sets authoritative `timeRemaining` based on `sectionDeadlineAt` and server timestamp delta.
4. Spawns a periodic 30-second synchronization heartbeat (`GET /api/v1/exams/:id/sections/:sectionId/sync`) to detect drift. If client drift exceeds 2 seconds, client timer re-aligns to the server deadline.
5. If the section deadline has passed on the server (`isExpired = true`), `handleSectionComplete()` is automatically triggered.

#### Phase 3.4: Answering & Dynamic IRT Ability Recalibration
1. Student selects an answer choice (e.g. Option "C").
2. Client sends `PATCH /api/v1/exams/:id/sections/:sectionId/answer` with `{ questionIndex, answer, idempotencyKey }`.
3. In `ExamService.submitAnswer()`:
   - Validates that `now <= sectionDeadlineAt`. Late submissions are rejected.
   - If this is an answer change, checks `editsRemaining > 0`. If 0, rejects the edit with HTTP 400.
   - Compares student answer with `Question.correctAnswer`.
   - Sets `ExamQuestion.userAnswer`, `isCorrect`, `isSkipped = false`, `answeredAt = new Date()`.
   - If changed, marks `isEdited = true` and decrements `ExamSection.editsRemaining`.
   - Compiles historical responses for all answered questions in the section.
   - Calls `IrtService.estimateAbility(responses)`:
     - Runs 61-point Gaussian quadrature integration between $-3.0$ and $+3.0$ with prior $\mathcal{N}(0, 1)$.
     - Evaluates 3PL likelihood:
       $$L(\theta|\mathbf{u}) = \prod [P_i(\theta)]^{u_i} [1 - P_i(\theta)]^{1 - u_i}$$
     - Calculates new Expected A Posteriori ability estimate $\hat{\theta}_{EAP}$.
   - Updates `ExamSection.abilityEstimate` with $\hat{\theta}_{EAP}$ in database.
   - Records an `ANSWER_SUBMITTED` event in `ExamEvent` ledger.
   - Returns `{ success: true, editsRemaining, isCorrect, userAnswer }` to client.

#### Phase 3.5: Navigation, Pacing & Bookmarking
1. Clicking **Next**: Computes elapsed time on current question via `Date.now() - questionStartTime`, updates accumulated `timeTaken`, and advances `currentQuestionIndex`.
2. Clicking **Bookmark / Flag**: Dispatches `PATCH /api/v1/exams/questions/:examQuestionId/flag`, toggling `isFlagged` for review filtering in both UI and database.
3. Reaching the last question in the section transitions the interface to `phase = "review"`.

#### Phase 3.6: Section Review Screen & 3-Edit Limit Enforcement
1. The **Review Screen** displays a complete grid of all questions in the section with their status: `Answered`, `Skipped`, or `Flagged`.
2. Displays prominent counter: **"Edits Remaining: X of 3"** (synchronized with server `editsRemaining`).
3. Student clicks on any question to inspect or change their response.
4. If the student changes an already-submitted answer:
   - Client and server enforce `editsRemaining > 0`.
   - If allowed, updates answer, marks `isEdited = true`, and decrements `editsRemaining`.
   - If `editsRemaining === 0`, answer modifications are rejected both on client and server.
5. Student clicks **"End Section"** to finalize.

#### Phase 3.7: Section Completion & Scaled Scoring
1. Client dispatches `POST /api/v1/exams/:id/sections/:sectionId/complete`.
2. `ExamService.completeSection()`:
   - Reads final $\hat{\theta}_{EAP}$ for the section.
   - Calls [`ScoringService.calculateSectionScore(theta)`](file:///d:/GMAT/apps/api/src/modules/exam/scoring.service.ts):
     - Linearly maps clamped $\theta \in [-3.0, 3.0]$ to official GMAT scaled range $[60, 90]$.
     - Rounds to nearest integer.
   - Marks section as `SectionStatus.COMPLETED` with timestamp and score.
   - If more sections remain in the chosen order:
     - Sets up next section (`status = IN_PROGRESS`).
     - Allocates questions for the next section via IRT.
     - Returns `{ nextSectionId, isLastSection: false }`.
   - If this was the final section, triggers `completeExam(examId)`.

#### Phase 3.8: Optional 10-Minute Break Management
1. When moving between Section 1 & 2 or Section 2 & 3, if `!exam.breakTaken`, the UI transitions to `phase = "break"`.
2. If student takes the break, client calls `POST /api/v1/exams/:id/break/start`:
   - Server updates `exam.status = ON_BREAK`, `breakTaken = true`, `breakDeadlineAt = now + 600s`.
   - Records `BREAK_STARTED` in `ExamEvent` ledger.
3. 10-minute (600 seconds) countdown runs, bound by `breakDeadlineAt`.
4. Student clicks **"End Break & Continue"** or timer reaches 0:
   - Client calls `POST /api/v1/exams/:id/break/end`.
   - Server clears `breakDeadlineAt`, updates `exam.status = IN_PROGRESS`, sets next section's `sectionDeadlineAt = now + 45m`.
   - Next section begins (`phase = "active"`).

#### Phase 3.9: Final Exam Scoring & Auto-Mistake Capture
1. In `ExamService.completeExam(examId)`:
   - Retrieves all three scaled section scores ($S_Q, S_V, S_{DI} \in [60, 90]$).
   - Computes average section score: $\bar{S} = \frac{S_Q + S_V + S_{DI}}{3}$.
   - Maps $\bar{S} \in [60, 90]$ to GMAT total scale $[205, 805]$:
     $$\text{Raw} = 205 + \left(\frac{\bar{S} - 60}{90 - 60}\right) \times (805 - 205)$$
   - Rounds to nearest 10-point increment (e.g. 680, 690, 705).
   - Queries percentile lookup table via `ScoringService.calculatePercentile(totalScore)`.
   - Creates a permanent `Score` entity in Prisma linked to the exam.
2. **Auto-Capture into Mistake Book**:
   - Queries all `ExamQuestion` entries for this exam where `isCorrect === false` or `isSkipped === true`.
   - Iterates through incorrect questions:
     - Checks if already logged in `MistakeEntry`.
     - Creates new `MistakeEntry` with:
       - `errorType = isSkipped ? 'TIME_PRESSURE' : 'CONCEPTUAL'`
       - `tags = ['auto-captured']`
       - Associated question metadata (section, topic, subtopic, difficulty).
3. Marks `Exam.status = COMPLETED` and returns results payload.

#### Phase 3.10: Results & Diagnostic Report Presentation
1. Client routes to `/exam/[id]/results`.
2. Triggers celebratory confetti (`canvas-confetti`) if total score $\ge 655$.
3. Displays scaled section scores (Quant 60–90, Verbal 60–90, DI 60–90), total score (205–805), and percentile.
4. Renders question-by-question post-mortem with filterable tabs (All, Incorrect, Flagged, Edited) and full explanations.

---

## 4. AI Multi-Agent Generation & Validation Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin / Seed Trigger
    participant QService as QuestionGeneratorService
    participant Orchestrator as AiOrchestratorService
    participant DeepSeek as DeepSeek-V3 (Gen)
    participant VService as ValidationAgentService
    participant Nemotron as Nemotron (Val)
    participant EService as ExplanationGeneratorService
    participant GLM as GLM-4 (Expl)
    participant DB as Prisma (Question)

    Admin->>QService: generateQuestion({ section, topic, difficulty, type })
    QService->>Orchestrator: chat('questionGeneration', prompt)
    Orchestrator->>DeepSeek: HTTP POST /v1/chat/completions (JSON format)
    DeepSeek-->>Orchestrator: Generated question JSON (stem, options, draft answer)
    Orchestrator-->>QService: Raw question object

    Note over QService,Nemotron: Psychometric Validation Gate
    QService->>VService: validate(question)
    VService->>Orchestrator: chat('validation', rubricPrompt)
    Orchestrator->>Nemotron: HTTP POST /v1/chat/completions (Strict 7-criteria audit)
    Nemotron-->>Orchestrator: { scores: {...}, overallScore: 88, passed: true }
    Orchestrator-->>VService: ValidationResult

    alt Passed (overallScore >= 70 && correctness >= 8)
        VService-->>QService: Approved
        QService->>EService: generateExplanation(question)
        EService->>Orchestrator: chat('explanation', explanationPrompt)
        Orchestrator->>GLM: HTTP POST /v1/chat/completions
        GLM-->>Orchestrator: Multi-part explanation (step-by-step, fast method, wrong option reasons)
        Orchestrator-->>EService: Full Explanation JSON
        EService-->>QService: Enriched Explanation
        QService->>DB: prisma.question.create({ ...question, validated: true })
        DB-->>Admin: Question successfully persisted to active pool
    else Failed Validation
        VService-->>QService: Rejected with issues list
        QService->>QService: Log warning and discard / retry
    end
```

---

## 5. Error Log to Spaced Repetition Conversion Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant UI as Mistakes Page (/dashboard/mistakes)
    participant FController as FlashcardsController
    participant FService as FlashcardService
    participant Orchestrator as AiOrchestratorService
    participant Kimi as Moonshot Kimi / Tutor Provider
    participant DB as Prisma (Flashcard)

    UI->>FController: POST /api/v1/flashcards/generate-from-mistake { mistakeId }
    FController->>FService: generateFromMistake(userId, mistakeId)
    FService->>DB: prisma.mistakeEntry.findFirst({ where: { id: mistakeId }, include: { question } })
    DB-->>FService: Mistake record + question details + student notes
    FService->>Orchestrator: chat('tutor', prompt: "Convert question & mistake context into conceptual flashcard")
    Orchestrator->>Kimi: HTTP POST /v1/chat/completions
    Kimi-->>Orchestrator: JSON { front: "...", back: "...", type: "TRAP" }
    Orchestrator-->>FService: Flashcard content payload
    FService->>DB: prisma.flashcard.create({ box: 1, easeFactor: 2.5, interval: 1, nextReview: today })
    DB-->>FService: Created Flashcard
    FService-->>UI: 201 Created Flashcard JSON
    UI->>UI: Show success toast: "Flashcard added to Box 1 for review!"
```

---

## 6. Spaced Repetition Review Lifecycle (SM-2 + Leitner)

```mermaid
sequenceDiagram
    autonumber
    participant UI as Flashcards Deck (/dashboard/flashcards)
    participant API as FlashcardsController
    participant Service as FlashcardService
    participant DB as Prisma (Flashcard)

    UI->>API: GET /api/v1/flashcards/due
    API->>Service: getDue(userId)
    Service->>DB: prisma.flashcard.findMany({ where: { nextReview: { lte: now } } })
    DB-->>UI: Array of due flashcards

    Note over UI: Student flips card, reveals answer & formula, selects rating 0-5
    UI->>API: POST /api/v1/flashcards/:id/review { quality: 4 }
    API->>Service: processReview(id, userId, quality = 4)
    Service->>DB: prisma.flashcard.findFirst({ where: { id } })
    DB-->>Service: Current card state (box, easeFactor, interval, repetitions)

    Note over Service: SM-2 & Leitner Hybrid Computation
    alt quality >= 3 (Correct Recall)
        Service->>Service: interval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : round(interval * easeFactor)
        Service->>Service: repetitions += 1
        Service->>Service: box = min(box + 1, 5) (Advance Leitner Box)
    else quality < 3 (Incorrect Recall)
        Service->>Service: repetitions = 0
        Service->>Service: interval = 1
        Service->>Service: box = 1 (Reset to Leitner Box 1)
    end
    Service->>Service: easeFactor = max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
    Service->>Service: nextReview = now + interval days

    Service->>DB: prisma.flashcard.update({ where: { id }, data: { box, easeFactor, interval, nextReview } })
    DB-->>UI: Updated Flashcard state
```

---

## 7. Socratic AI Tutor Interactive Session Flow

```mermaid
sequenceDiagram
    autonumber
    participant UI as Tutor Chat (/dashboard/tutor)
    participant TController as TutorController
    participant TService as TutorService
    participant Orchestrator as AiOrchestratorService
    participant AI as AI Model (Kimi / Moonshot)
    participant DB as Prisma (TutorSession)

    UI->>TController: POST /api/v1/tutor/sessions { mode: "VISUAL", title: "Probability" }
    TController->>TService: createSession(userId, mode, title)
    TService->>DB: prisma.tutorSession.create(...)
    DB-->>UI: Created session with id

    UI->>TController: POST /api/v1/tutor/sessions/:id/messages { content: "Why is P(A or B) = P(A)+P(B)-P(A and B)?" }
    TController->>TService: sendMessage(userId, sessionId, content)
    TService->>DB: prisma.tutorSession.findFirst({ where: { id: sessionId } })
    DB-->>TService: Session record with message history & mode

    TService->>TService: Build mode-specific system prompt (Visual: ASCII Venn diagrams & markdown tables)
    TService->>TService: Compile messages payload: [System, ...History, UserMessage]
    TService->>Orchestrator: chat('tutor', messages, { temperature: 0.7 })
    Orchestrator->>AI: HTTP POST /v1/chat/completions
    AI-->>Orchestrator: Markdown response with KaTeX math formatting ($...$)
    Orchestrator-->>TService: AI assistant response content

    TService->>DB: prisma.tutorSession.update({ where: { id }, data: { messages: [...updated] } })
    DB-->>TController: Updated session entity
    TController-->>UI: 200 OK + AI message
    UI->>UI: Render Markdown and KaTeX math formulas in chat thread
```

---

## 8. Analytics Aggregation & Coach Report Generation Flow

```mermaid
sequenceDiagram
    autonumber
    participant UI as Analytics Dashboard (/dashboard/analytics)
    participant AController as AnalyticsController
    participant AService as AnalyticsService
    participant DB as Prisma
    participant Reports as Reports Page (/dashboard/reports)

    UI->>AController: GET /api/v1/analytics/dashboard
    AController->>AService: getDashboardData(userId)
    
    par Aggregate Core Metrics
        AService->>DB: prisma.score.findMany({ where: { userId } })
        AService->>DB: prisma.exam.findMany({ where: { userId, status: 'COMPLETED' }, take: 5 })
        AService->>DB: prisma.examQuestion.findMany({ where: { answeredAt >= today } })
    end

    Note over AService: Streak Calculation
    AService->>DB: prisma.examQuestion.findMany({ distinct: ['answeredAt'] })
    AService->>AService: Calculate consecutive calendar days with activity

    Note over AService: Topic Performance
    AService->>DB: prisma.examQuestion.findMany({ include: { question: true } })
    AService->>AService: Group by Section & Topic -> calculate accuracy % and avgTime
    AService-->>UI: DashboardData JSON (Exams, AvgScore, Streak, ScoreHistory, Strengths, Weaknesses)

    Note over Reports: On-Demand AI Coach Report
    Reports->>AController: POST /api/v1/analytics/reports
    AController->>AService: generateCoachReport(userId)
    AService->>AService: Identify weak topics (<70%) and strong topics (>=70%)
    AService->>AService: Project score based on recent performance curve
    AService->>AService: Synthesize weekly improvement timeline & milestones
    AService->>DB: prisma.coachReport.create({ reportData: {...} })
    DB-->>Reports: New CoachReport entity rendered with target trajectory
```
