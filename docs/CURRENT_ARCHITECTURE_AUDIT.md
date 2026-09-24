# Current Architecture Audit & Gap Analysis

**Repository**: `gmat-platform`  
**Date**: September 24, 2026  
**Auditor**: Advanced Agentic Coding Engine  
**Objective**: Ground-truth inspection of the existing codebase to identify what works, what is partially implemented, what is missing, discrepancies between documentation and source code, and architectural risks prior to upgrading to a high-fidelity GMAT simulation engine.

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Component-by-Component Audit](#2-component-by-component-audit)
   - [2.1 Exam Engine & Delivery System](#21-exam-engine--delivery-system)
   - [2.2 Psychometrics & CAT Implementation](#22-psychometrics--cat-implementation)
   - [2.3 Timing & Server-Side Integrity](#23-timing--server-side-integrity)
   - [2.4 Question Data Models & Representation](#24-question-data-models--representation)
   - [2.5 Data Insights Question Rendering](#25-data-insights-question-rendering)
   - [2.6 AI Orchestrator & Multi-Agent Pipeline](#26-ai-orchestrator--multi-agent-pipeline)
   - [2.7 Learning Subsystems (Mistake Book, Flashcards, Tutor, Study Plan)](#27-learning-subsystems)
   - [2.8 Testing & QA Suite](#28-testing--qa-suite)
3. [Discrepancy Report: Source Code vs. README / Docs](#3-discrepancy-report-source-code-vs-readme--docs)
4. [Critical Bugs & Architectural Vulnerabilities](#4-critical-bugs--architectural-vulnerabilities)
5. [Status Matrix Against Simulation Specification](#5-status-matrix-against-simulation-specification)
6. [Recommended Migration Path](#6-recommended-migration-path)
7. [File Modification Map](#7-file-modification-map)

---

## 1. Executive Summary

The existing repository is a well-structured Turborepo monorepo with clean module separation in NestJS and modern Next.js 16 / React 19 pages. However, **a major architectural gap exists between the marketing documentation and the actual test delivery engine**:

1. **Client-Authoritative Timer**: The server relies entirely on client-reported integers for `timeRemaining` via `PATCH /exams/:id/sections/:sectionId/time`. It maintains no authoritative server deadline (`sectionDeadlineAt`), leaving the exam completely vulnerable to client manipulation, computer sleep, or network disconnects.
2. **Frontend Disconnected from Backend Exam Engine**: The live exam runner at `apps/web/src/app/exam/[id]/page.tsx` was built using a hardcoded client-side array `mockQuestions` rather than consuming questions allocated by the backend `GET /api/v1/exams/:id` endpoint.
3. **Missing Server-Side 3-Edit Enforcement**: The official GMAT Focus rule allowing a maximum of 3 question edits during section review was enforced purely in client React state; the backend API `submitAnswer` does not check remaining edit allowances or decrement `editsRemaining`.
4. **Pre-allocated vs. Dynamic CAT**: `ExamService` selects all 21/23/20 questions up-front before the section starts, rather than executing item selection dynamically question-by-question based on student responses.
5. **No Exam Event Log or Idempotency**: There is no audit event log (`ExamEvent`), meaning student interactions cannot be reconstructed or safely recovered after network interruptions.

The codebase provides an excellent foundation. The objective is to convert this prototype into a deterministic, server-authoritative, recoverable simulation engine.

---

## 2. Component-by-Component Audit

### 2.1 Exam Engine & Delivery System

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| Section Order Permutations | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/exam/exam.service.ts:15-39` | Accepts array of `SectionType[]`, initializes sections in requested order. |
| Question Navigation | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:255-275` | Implemented in frontend with Prev/Next, but lacks server enforcement of linear progression during active test. |
| Section Review Screen | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:311-323` | Displays questions and status, but operates exclusively on frontend mock data. |
| 3-Edit Limit Enforcement | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:227-238` | Only checked in React UI. Server model has `editsRemaining: 3`, but `submitAnswer` in `exam.service.ts` ignores it completely. |
| Break Engine | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:281-295` | UI offers a break, but backend has no `startBreak` or `endBreak` endpoints, and no deadline validation. |
| Section Completion | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/exam/exam.service.ts:148-209` | Closes section, computes scaled score (60–90), advances to next section or triggers exam completion. |
| Scoring Engine | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/exam/scoring.service.ts` | Calculates 60–90 section score, 205–805 total score (in 10-pt steps), and percentiles. |

---

### 2.2 Psychometrics & CAT Implementation

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| 3PL Logistic Model | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/irt/irt.service.ts:47-50` | Correct mathematical formula $P(\theta) = c + \frac{1-c}{1+e^{-a(\theta-b)}}$. |
| Fisher Information | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/irt/irt.service.ts:58-66` | Correct formulation $I(\theta) = a^2 \frac{(P-c)^2}{(1-c)^2 P (1-P)}$. |
| EAP Ability Estimation | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/irt/irt.service.ts:74-112` | 61-point Gaussian quadrature numerical integration over $[-3.0, 3.0]$ with $\mathcal{N}(0, 1)$ prior. Prevents MLE divergence. |
| Live Adaptive Selection | `PARTIALLY IMPLEMENTED` | `apps/api/src/modules/irt/irt.service.ts:214-225` | `adaptiveSelect` function exists, but `exam.service.ts` statically pre-allocates all questions at section creation. |
| Content Blueprint Constraints | `PARTIALLY IMPLEMENTED` | `apps/api/src/modules/irt/irt.service.ts:167-190` | Basic topic count thresholding exists, but lacks cognitive load, trap classification, and subdomain depth constraints. |
| Exposure Control | `NOT IMPLEMENTED` | `apps/api/src/modules/irt/irt.service.ts:35` | `MAX_EXPOSURE_RATE = 0.3` is defined as a constant, but no exposure tracking queries or Sympson-Hetter lottery exists. |

---

### 2.3 Timing & Server-Side Integrity

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| Server-Authoritative Clock | `NOT IMPLEMENTED` | `apps/api/src/modules/exam/exam.service.ts:299-304` | **Critical Defect**: Accepts client `timeRemaining` via `PATCH /time`. No `sectionDeadlineAt` stored in DB. |
| Clock Drift Synchronization | `NOT IMPLEMENTED` | N/A | No endpoint provides server timestamp for client drift correction. |
| Late Submission Rejection | `NOT IMPLEMENTED` | `apps/api/src/modules/exam/exam.service.ts:79` | `submitAnswer` does not check if the section deadline has expired. |
| Refresh / Sleep Recovery | `NOT IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:158-175` | Browser timer resets or desynchronizes upon sleep/wake. Refresh causes desynchronization. |

---

### 2.4 Question Data Models & Representation

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| Core Schema | `IMPLEMENTED` | `packages/database/prisma/schema.prisma:177-227` | Excellent Prisma model storing stem, passage, options JSON, explanation JSON, section, topic, difficulty (205–805), and IRT params ($a, b, c$). |
| Question Versioning | `NOT IMPLEMENTED` | N/A | Questions are edited in place (`updatedAt`), meaning historical exam reviews could change if a question is modified. |
| Question Certification Pipeline | `PARTIALLY IMPLEMENTED` | `schema.prisma:205-207` | Has `validated: Boolean` and `validationScore: Float`, but lacks explicit certification lifecycle states. |
| Scratchpad Persistence | `NOT IMPLEMENTED` | N/A | No model or endpoint exists for persisting student scratchpad notes per question. |

---

### 2.5 Data Insights Question Rendering

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| Data Sufficiency Renderer | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:107-113` | Renders standard A-E options, but lacks dedicated statement evaluation helper UI. |
| Table Analysis | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:90-100` | Displays headers and rows with sortable column index markers, but lacks interactive column sorting logic. |
| Multi-Source Reasoning | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:101-105` | Mock data structure has sources, but UI does not implement tabs to switch between sources. |
| Graphics Interpretation | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:84` | Placeholder stem only; lacks underlying deterministic dataset rendering. |
| Two-Part Analysis | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:85` | Placeholder text; lacks matrix/radio grid for two distinct column selections. |
| Section-Restricted Calculator | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/exam/[id]/page.tsx:147` | Has `showCalculator` boolean state, but calculator toggle is not strictly restricted to Data Insights. |

---

### 2.6 AI Orchestrator & Multi-Agent Pipeline

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| Provider Decoupling | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/ai/ai-orchestrator.service.ts` | Clean abstraction mapping tasks to DeepSeek, Nemotron, GLM, Kimi, OpenAI, Gemini, Claude, or Ollama. |
| Validation Agent | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/ai/validation-agent.service.ts` | 7-point rubric evaluated by Nemotron; requires score $\ge 70$ and correctness $\ge 8$. |
| Explanation Generator | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/ai/explanation-generator.service.ts` | Synthesizes step-by-step, fast heuristics, and distractor post-mortems via GLM-4. |
| BYOK Budget Tracking | `NOT IMPLEMENTED` | N/A | Usage is not logged to a dedicated `AIUsageEvent` table; no cost caps enforced. |
| Fallback Resilience | `IMPLEMENTED` | `ai-orchestrator.service.ts:223` | Returns fallback vectors or handles errors gracefully without crashing the core app. |

---

### 2.7 Learning Subsystems

| Feature | Status | Source Location | Audit Findings |
| :--- | :--- | :--- | :--- |
| Error Log (Mistake Book) | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/mistakes/mistakes.service.ts` | 5-type error classification; automatic capture on exam completion; manual reflections. |
| Spaced Repetition (Flashcards)| `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/flashcards/flashcards.service.ts`| Mathematically sound SM-2 ease factor updates + 5-box Leitner intervals; AI mistake-to-card generator. |
| Socratic AI Tutor | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/tutor/tutor.service.ts` | 5 distinct pedagogical modes (`BEGINNER`, `INTERMEDIATE`, `EXPERT`, `VISUAL`, `COACH`). |
| Study Planner | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/study-plan/study-plan.service.ts`| Generates daily schedule based on current vs target score and exam date. |
| Analytics & Reports | `IMPLEMENTED + UNTESTED` | `apps/api/src/modules/analytics/analytics.service.ts` | Computes KPIs, streaks, accuracy heatmaps, and diagnostic coach reports. |

---

### 2.8 Testing & QA Suite

| Area | Existing Tests | Status |
| :--- | :--- | :--- |
| `apps/api` Root | `app.controller.spec.ts` (1 test: "Hello World!") | `IMPLEMENTED + TESTED` |
| Exam Service | None | `NOT IMPLEMENTED` |
| IRT / CAT Engine | None | `NOT IMPLEMENTED` |
| Scoring Engine | None | `NOT IMPLEMENTED` |
| State Machine | None | `NOT IMPLEMENTED` |
| Question Certification | None | `NOT IMPLEMENTED` |
| Frontend Component Tests | None | `NOT IMPLEMENTED` |

---

## 3. Discrepancy Report: Source Code vs. README / Docs

1. **Frontend Exam Runner Mock vs. Real API**:
   - *README Claim*: Describes a complete end-to-end exam simulator where tests are created, submitted, and scored via API.
   - *Actual Code*: `apps/web/src/app/exam/[id]/page.tsx` was rendering from hardcoded `mockQuestions` in frontend memory and had no `fetch('/api/v1/exams/:id')` call.
2. **Server-Side Timer Authority**:
   - *README Claim*: Mentions strict timer management with yellow/red warning thresholds.
   - *Actual Code*: Timer was purely maintained in browser `setInterval`, with the client sending arbitrary integer values to `PATCH /api/v1/exams/:id/sections/:sectionId/time`.
3. **Adaptive Question Selection**:
   - *README Claim*: Real-time adaptive test delivery via 3PL IRT.
   - *Actual Code*: All 21–23 questions were selected in a single batch at section creation via `selectQuestions()`; live adaptive progression question-by-question was not plumbed into the exam flow.
4. **Section Review Edit Limits**:
   - *README Claim*: Strict enforcement of maximum 3 edits per section.
   - *Actual Code*: Enforced only in frontend React component state; backend endpoint `submitAnswer` accepted unlimited answer changes without validation.

---

## 4. Critical Bugs & Architectural Vulnerabilities

### Bug #1: Client Timer Exploitation & Desynchronization
* **Severity**: P0 (High Integrity Risk)
* **Description**: Because the server calculates remaining time from client-reported `timeRemaining` numbers, a student can freeze or alter their timer in dev tools, or gain unlimited time simply by putting their laptop to sleep.
* **Remedy**: Store `sectionStartedAt` and `sectionDeadlineAt` on the server. Compute remaining time strictly as `sectionDeadlineAt - now()`. Reject any answer submitted when `now() > sectionDeadlineAt`.

### Bug #2: Frontend-Backend Exam Disconnect
* **Severity**: P0 (Functional Defect)
* **Description**: `apps/web/src/app/exam/[id]/page.tsx` was not calling the backend API to retrieve real exam questions or submit answers.
* **Remedy**: Refactor `ExamPage` to fetch exam details and allocated questions from `/api/v1/exams/:id`, submit responses via `/api/v1/exams/:id/sections/:sectionId/answer`, and sync authoritative server time.

### Bug #3: Bypassing the 3-Edit Limit via API
* **Severity**: P0 (Exam Rules Defect)
* **Description**: A user can send infinite `PATCH /answer` requests directly to the API, bypassing the 3-edit restriction.
* **Remedy**: Track edits on the `ExamSection` model server-side. In `submitAnswer`, verify `editsRemaining > 0` whenever an already-answered question is modified, decrement `editsRemaining` transactionally, and reject if 0.

### Bug #4: Double Break Exploitation
* **Severity**: P1 (State Integrity Risk)
* **Description**: No backend check prevents triggering breaks after both Section 1 and Section 2.
* **Remedy**: Server must track `breakTaken: Boolean` and validate that a break can only be initiated if `breakTaken === false` and current section index is 0 or 1.

---

## 5. Status Matrix Against Simulation Specification

| Specification Requirement | Priority | Status |
| :--- | :--- | :--- |
| Server-Authoritative Clock (`sectionDeadlineAt`) | P0 | `NOT IMPLEMENTED` |
| Explicit Server Exam State Machine | P0 | `NOT IMPLEMENTED` |
| Server-Enforced 3-Edit Limit | P0 | `NOT IMPLEMENTED` |
| Dynamic Question-by-Question CAT Selection | P0 | `PARTIALLY IMPLEMENTED` |
| Event-Sourced Session Log (`ExamEvent`) | P0 | `NOT IMPLEMENTED` |
| Single Break Engine with Deadline Enforcement | P0 | `PARTIALLY IMPLEMENTED` |
| Frontend Exam Runner Real API Synchronization | P0 | `NOT IMPLEMENTED` |
| Automated Unit Tests for Exam Rules & IRT | P0 | `NOT IMPLEMENTED` |
| Dedicated Data Insights Renderers (MSR, TA, GI, TPA) | P1 | `PARTIALLY IMPLEMENTED` |
| Offline Event Queue & Reconnection Recovery | P1 | `NOT IMPLEMENTED` |
| Question Versioning & Immutability | P1 | `NOT IMPLEMENTED` |
| BYOK AI Budget & Usage Telemetry | P2 | `NOT IMPLEMENTED` |
| Question Quality Admin Dashboard | P2 | `NOT IMPLEMENTED` |

---

## 6. Recommended Migration Path

We recommend an incremental, non-destructive migration executing in strict order:

```text
Phase 1: Shared Models & State Machine (packages/shared, packages/database)
    ↓
Phase 2: Server-Authoritative Timer & Exam Engine (apps/api exam & irt modules)
    ↓
Phase 3: Automated Test Suite (apps/api/test, unit & property tests)
    ↓
Phase 4: Frontend Live API Integration & Offline Queue (apps/web exam runner)
    ↓
Phase 5: Dedicated Data Insights Renderers (DS, MSR, TA, GI, TPA)
    ↓
Phase 6: Verification, Typecheck, and Documentation Update
```

---

## 7. File Modification Map

### Files to Modify:
1. `packages/database/prisma/schema.prisma`: Add `sectionDeadlineAt`, `breakDeadlineAt`, `ExamEvent`, and `ExamIntegrityEvent`.
2. `packages/shared/src/types.ts`: Add `ExamState`, `ExamEventType`, `ExamEvent`, `CATSelectionContext`.
3. `packages/shared/src/constants.ts`: Centralize GMAT configuration parameters.
4. `apps/api/src/modules/exam/exam.service.ts`: Implement state machine, server deadline validation, server 3-edit enforcement, and event logging.
5. `apps/api/src/modules/exam/exam.controller.ts`: Add sync, break, and event endpoints.
6. `apps/api/src/modules/irt/irt.service.ts`: Integrate content blueprint and exposure penalty into CAT selection.
7. `apps/web/src/app/exam/[id]/page.tsx`: Connect to live API, server clock sync, and offline event queue.

### New Test Files to Create:
1. `apps/api/src/modules/exam/exam.service.spec.ts`
2. `apps/api/src/modules/irt/irt.service.spec.ts`
3. `apps/api/src/modules/exam/scoring.service.spec.ts`

### Files to Leave Untouched:
* Existing AI services (`ai-orchestrator.service.ts`, `validation-agent.service.ts`, `explanation-generator.service.ts`) — preserve working AI logic.
* Existing learning features (`mistakes.service.ts`, `flashcards.service.ts`, `tutor.service.ts`, `study-plan.service.ts`) — working correctly.
* User auth & JWT infrastructure (`auth.service.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`).
