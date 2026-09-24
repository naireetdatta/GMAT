# Architecture Decision Records (ADR) & Technology Choices

This document tracks all high-level architecture decisions, technology selections, design rationales, and library evaluations for the **GMAT Focus Edition Preparation Platform**.

---

## 📑 Table of Contents

- [ADR 001: Monorepo Architecture with Turborepo & pnpm](#adr-001-monorepo-architecture-with-turborepo--pnpm)
- [ADR 002: Backend Framework — NestJS 11 over Express / Fastify](#adr-002-backend-framework--nestjs-11-over-express--fastify)
- [ADR 003: Frontend Architecture — Next.js 16 (App Router) & React 19](#adr-003-frontend-architecture--nextjs-16-app-router--react-19)
- [ADR 004: Data Layer — Prisma 6 ORM with SQLite (Dev) and PostgreSQL (Prod)](#adr-004-data-layer--prisma-6-orm-with-sqlite-dev-and-postgresql-prod)
- [ADR 005: Psychometric Modeling — 3PL IRT with EAP over Elo / Classical Test Theory](#adr-005-psychometric-modeling--3pl-irt-with-eap-over-elo--classical-test-theory)
- [ADR 006: AI Multi-Model Task Orchestration vs. Single-Provider Lock-in](#adr-006-ai-multi-model-task-orchestration-vs-single-provider-lock-in)
- [ADR 007: Spaced Repetition — Hybrid SuperMemo SM-2 + Leitner 5-Box System](#adr-007-spaced-repetition--hybrid-supermemo-sm-2--leitner-5-box-system)
- [ADR 008: Strict GMAT Focus Exam Engine Specifications](#adr-008-strict-gmat-focus-exam-engine-specifications)
- [ADR 009: Authentication — Stateless JWT Bearer Tokens with Client Interceptor](#adr-009-authentication--stateless-jwt-bearer-tokens-with-client-interceptor)
- [ADR 010: Mathematical Typesetting — KaTeX over MathJax](#adr-010-mathematical-typesetting--katex-over-mathjax)
- [Comprehensive Library Evaluation Matrix](#comprehensive-library-evaluation-matrix)

---

## ADR 001: Monorepo Architecture with Turborepo & pnpm

### Status
Accepted

### Context
The platform consists of a student-facing web application, a backend API gateway, shared psychometric algorithms, and a shared database schema. Managing these as disjoint repositories leads to version drift, out-of-sync type definitions, duplicated DTOs, and complex multi-repo deployment pipelines.

### Decision
Adopt a **Turborepo** monorepo structure utilizing **pnpm workspaces**:
* `apps/web`: Next.js 16 frontend application.
* `apps/api`: NestJS 11 backend service.
* `packages/database`: Prisma schema, migrations, seeders, and client exports.
* `packages/shared`: Shared TypeScript types, GMAT constants, IRT formulas, and DTOs.

### Rationale & Benefits
1. **End-to-End Type Safety**: Modifying an enum (e.g. `SectionType` or `QuestionType`) in `@gmat/shared` immediately triggers compiler feedback in both the backend controller and frontend UI components.
2. **Computational Caching**: Turborepo’s remote and local hash caching prevents redundant builds, lints, and test executions for packages that haven't changed.
3. **Storage Efficiency**: `pnpm` uses a hard-linked global content-addressable store, drastically cutting disk usage and reducing `node_modules` installation overhead compared to `npm` or `yarn`.

### Alternatives Considered
* **Polyrepo**: Rejected due to high overhead in cross-service type synchronization and coordinated release management.
* **Nx**: High feature set, but introduces steep configuration complexity compared to Turborepo’s lightweight `turbo.json`.
* **Lerna**: Legacy overhead; Turborepo provides superior execution scheduling and pipeline caching.

---

## ADR 002: Backend Framework — NestJS 11 over Express / Fastify

### Status
Accepted

### Context
The backend requires complex business domains: psychometric CAT engines, multi-agent AI generation pipelines, error logging, spaced repetition algorithms, JWT authentication, and exam state machines. Unstructured Express micro-frameworks lead to inconsistent code styles, tight coupling, and difficult unit testing.

### Decision
Use **NestJS 11** with TypeScript, structured into domain modules (`exam`, `irt`, `ai`, `auth`, `flashcards`, `mistakes`, `questions`, `study-plan`, `analytics`, `tutor`).

### Rationale & Benefits
1. **Dependency Injection (DI)**: Enables modular swapping of services (e.g. replacing `IrtService` with test doubles, or swapping AI providers without touching controllers).
2. **Standardized Architecture**: Clear separation of concerns between Controllers (HTTP routing and validation), Services (business logic), and Guards/Decorators (cross-cutting concerns).
3. **First-Class Validation**: Automatic request payload validation and transformation via `class-validator` and `ValidationPipe`.
4. **Active Ecosystem**: Built-in support for `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/config`, and `@nestjs/throttler`.

### Alternatives Considered
* **Bare Express.js**: Rejected because it lacks architectural convention; larger teams inevitably write their own ad-hoc DI and route decorators.
* **Fastify (standalone)**: Extremely fast, but lacks out-of-the-box architectural structure. NestJS can run on Fastify under the hood if raw throughput becomes a bottleneck.

---

## ADR 003: Frontend Architecture — Next.js 16 (App Router) & React 19

### Status
Accepted

### Context
The frontend needs to handle two contrasting experiences:
1. Fast, SEO-optimized public landing pages and marketing content.
2. Highly interactive, state-heavy exam simulation environments with sub-second response times, timers, and client-side calculations.

### Decision
Use **Next.js 16** with the **App Router** and **React 19**.

### Rationale & Benefits
1. **Hybrid Rendering**: Marketing pages (`/`) benefit from Server-Side Rendering (SSR) and static generation for fast First Contentful Paint (FCP), while the exam runner (`/exam/[id]`) runs entirely on the client (`"use client"`) for zero-latency timer ticks and instantaneous radio button toggles.
2. **Next.js App Router Structure**: Directory-based routing allows natural nesting of dashboard layouts (`/dashboard/layout.tsx`) that persist navigation state while swapping sub-pages.
3. **React 19 Readiness**: Ready for advanced concurrency, server actions, and modern lifecycle hooks.

### Alternatives Considered
* **Vite + React SPA**: Fast client-side development, but forfeits server-side rendering for public landing pages and requires separate routing and asset optimization pipelines.
* **Remix / React Router v7**: Viable alternative, but Next.js has deeper community adoption, richer documentation, and seamless hosting compatibility with Vercel and standalone Node servers.

---

## ADR 004: Data Layer — Prisma 6 ORM with SQLite (Dev) and PostgreSQL (Prod)

### Status
Accepted

### Context
The platform requires an expressive relational data model connecting users, multi-section exams, question instances, IRT parameters, flashcards, mistake books, and analytics. Developers need an instant local setup without Docker prerequisites, while production requires rock-solid concurrency and vector capabilities.

### Decision
Adopt **Prisma 6** as the ORM, configured with:
* **SQLite (`file:./dev.db`)**: For local development, fast bootstrapping, zero configuration, and offline support.
* **PostgreSQL 15 (Docker)**: For staging/production, providing ACID compliance, concurrent transaction management, and connection pooling.

### Rationale & Benefits
1. **Single Source of Truth**: The Prisma schema file (`schema.prisma`) generates TypeScript definitions and database migrations simultaneously.
2. **Type-Safe Queries**: `prisma.exam.findUnique({ include: { sections: { include: { questions: true } } } })` guarantees compile-time validation of nested relation queries.
3. **Dual Dialect Support**: SQLite and PostgreSQL share 98% schema parity in Prisma, allowing zero-friction transition via environment variable switching.

### Alternatives Considered
* **TypeORM**: Historically common in NestJS, but suffers from active record / data mapper ambiguities, brittle migrations, and stale maintenance.
* **Drizzle ORM**: Lightweight and performant SQL-like query builder, but Prisma’s rich client generation and schema migration ecosystem provide faster initial velocity.

---

## ADR 005: Psychometric Modeling — 3PL IRT with EAP over Elo / Classical Test Theory

### Status
Accepted

### Context
Standard quiz engines simply calculate percentage accuracy ($Correct / Total$). However, the official GMAT Focus Edition uses **Computerized Adaptive Testing (CAT)** based on psychometric Item Response Theory. A student who answers 15 difficult questions correctly must score higher than a student who answers 15 easy questions correctly.

### Decision
Implement the **3-Parameter Logistic (3PL) Item Response Theory Model**:
$$P(\theta) = c + \frac{1 - c}{1 + e^{-a(\theta - b)}}$$
* $b$: Item difficulty parameter (calibrated to GMAT 205–805 scale).
* $a$: Discrimination parameter (steepness of the ICC curve).
* $c$: Pseudo-guessing parameter (0.20 for 5 options).

For ability estimation, use **Bayesian Expected A Posteriori (EAP)**:
$$\hat{\theta}_{EAP} = \frac{\int \theta L(\theta|\mathbf{u}) \pi(\theta) d\theta}{\int L(\theta|\mathbf{u}) \pi(\theta) d\theta}$$
computed via 61-point Gaussian quadrature over $[-3.0, +3.0]$ with a standard normal prior $\mathcal{N}(0, 1)$.

For item selection, use **Maximum Fisher Information (MFI)**:
$$I(\theta) = a^2 \frac{(P(\theta) - c)^2}{(1 - c)^2 P(\theta) (1 - P(\theta))}$$
combined with **Sympson-Hetter exposure control** and **topic shadow constraints**.

### Rationale & Benefits
1. **Mathematical Robustness**: EAP guarantees finite ability estimates even when a student answers all questions correctly or incorrectly (where Maximum Likelihood Estimation diverges to $\pm \infty$).
2. **Realistic CAT Experience**: Mimics the exact behavior of GMAC’s adaptive algorithm.
3. **Item Information Optimization**: MFI ensures every question served yields maximum diagnostic value about the student’s true latent ability.

### Alternatives Considered
* **Classical Test Theory (Raw Percentage)**: Inadequate for adaptive testing; treats all questions as equally informative.
* **Rasch Model (1PL IRT)**: Assumes all items have equal discrimination ($a=1$) and zero guessing ($c=0$), which is demonstrably false for multiple-choice business exam questions.
* **Elo Rating System**: Popular in chess and Duolingo, but lacks probabilistic error measurement (SEM) and item discrimination modeling required for standardized psychometrics.

---

## ADR 006: AI Multi-Model Task Orchestration vs. Single-Provider Lock-in

### Status
Accepted

### Context
Different Large Language Models excel at different cognitive tasks:
* Reasoning & Math: DeepSeek-R1 / DeepSeek-V3.
* Strict Guardrails & Verification: NVIDIA Nemotron.
* Step-by-Step Explanations: Zhipu GLM-4.
* Long-Context Socratic Dialogue: Moonshot Kimi.
* Vector Embeddings: BAAI BGE-M3.

Relying on a single proprietary vendor (e.g. exclusively OpenAI or Anthropic) introduces vendor lock-in, high inference costs, and single-point-of-failure vulnerabilities.

### Decision
Implement a **Decoupled AI Orchestrator** (`AiOrchestratorService`) mapping logical cognitive roles to configured providers via environment variables:
* `AI_QUESTION_GENERATION_PROVIDER="deepseek"`
* `AI_VALIDATION_PROVIDER="nemotron"`
* `AI_EXPLANATION_PROVIDER="glm"`
* `AI_TUTOR_PROVIDER="kimi"`
* `AI_EMBEDDING_PROVIDER="bge"`
* Fallback support for **OpenAI**, **Gemini**, **Claude**, and local **Ollama**.

### Rationale & Benefits
1. **Cost & Quality Optimization**: Utilize the most capable and cost-effective model for each domain task without code modifications.
2. **Two-Stage Validation Pipeline**: Questions generated by DeepSeek are independently audited by Nemotron against a strict 7-point psychometric rubric (correctness, clarity, difficulty, grammar, logic, distractor quality, and psychometric discrimination). Only items scoring $\ge 70\%$ overall and $\ge 8/10$ on correctness are admitted to the pool.
3. **Offline / Privacy Resilience**: Any task can be redirected to a locally hosted Ollama instance for offline or zero-cost execution.

### Alternatives Considered
* **LangChain / LlamaIndex Heavy Frameworks**: Introduce excessive abstraction layers, brittle dependency trees, and breaking API changes. A clean, native HTTP orchestration service with OpenAI-compatible endpoint compatibility is lighter, faster, and easier to maintain.

---

## ADR 007: Spaced Repetition — Hybrid SuperMemo SM-2 + Leitner 5-Box System

### Status
Accepted

### Context
GMAT candidates frequently struggle with retaining quantitative formulas, idiomatic reasoning rules, and data sufficiency traps over a 3-to-6 month study schedule. Traditional linear review leads to the forgetting curve effect.

### Decision
Implement a **Hybrid Spaced Repetition System** combining:
1. **SuperMemo SM-2 Equation**: Continuous tracking of Ease Factor ($EF$), Repetitions ($n$), and review Interval ($I$).
   $$EF' = EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02)) \quad (EF \ge 1.3)$$
   $$I_1 = 1, \quad I_2 = 6, \quad I_n = \text{round}(I_{n-1} \cdot EF)$$
2. **Leitner 5-Box Partitioning**: Visual progress representation for students (Boxes 1 to 5 with intervals: 1, 3, 7, 14, and 30 days).

### Rationale & Benefits
* Students receive mathematically proven spaced repetition scheduling while enjoying an intuitive, gamified UI showing cards graduating from Box 1 to Box 5.
* Tight integration with the **Mistake Book**: One click converts any real exam error into an actionable spaced repetition card.

---

## ADR 008: Strict GMAT Focus Exam Engine Specifications

### Status
Accepted

### Context
Third-party test prep platforms frequently retain outdated legacy GMAT formats (Sentence Correction, Geometry, AWA essay) or fail to accurately implement the Focus Edition’s review mechanics.

### Decision
Hardcode official GMAC GMAT Focus Edition exam constraints into `@gmat/shared/src/constants.ts`:
* **Sections**: 3 sections, 45 minutes each.
  * Quantitative Reasoning: Exactly 21 questions (Arithmetic & Algebra; zero geometry).
  * Verbal Reasoning: Exactly 23 questions (Reading Comprehension & Critical Reasoning only).
  * Data Insights: Exactly 20 questions (DS, Table Analysis, MSR, GI, Two-Part).
* **Section Order**: Exactly 6 selectable permutations.
* **Review Screen**: Maximum **3 question answer edits** allowed per section before final submission.
* **Breaks**: Exactly one optional **10-minute break**.
* **Scoring Scale**: Section scores $60-90$ (step 1); Total score $205-805$ (step 10, equal section weighting).

---

## ADR 009: Authentication — Stateless JWT Bearer Tokens with Client Interceptor

### Status
Accepted

### Context
The platform needs seamless API access for both web clients and potential mobile or third-party client integrations. Cross-origin requests between Next.js (port 3000) and NestJS (port 3001) must handle authorization headers cleanly without complex third-party cookie issues in modern browsers.

### Decision
Use **Stateless JWT Tokens** with:
* `@nestjs/jwt` and `passport-jwt` on the backend.
* Passwords hashed via `bcryptjs` (salt rounds: 10).
* Client-side token storage in `localStorage` (`gmat_jwt_token`).
* Transparent client-side injection via `FetchInterceptor.tsx`, monkey-patching `window.fetch` to attach `Authorization: Bearer <token>` on all requests targeting `/api/v1/*`.

### Rationale & Benefits
1. Eliminates third-party cookie blocking issues across ports.
2. Decoupled and mobile-ready for future React Native or native mobile clients.
3. Instant authorization without extra session database queries on every HTTP request.

---

## ADR 010: Mathematical Typesetting — KaTeX over MathJax

### Status
Accepted

### Context
GMAT quantitative questions, data insights formulas, and explanations require fast, reliable mathematical typesetting (e.g. quadratic formulas, exponents, roots, subscripts, and probability notations).

### Decision
Use **KaTeX** (`katex` and CSS styling) for math rendering.

### Rationale & Benefits
* **Performance**: KaTeX renders math synchronously up to 100x faster than MathJax without layout reflow jank.
* **Bundle Footprint**: Significantly smaller footprint than full MathJax distributions.
* **SSR Compatibility**: Can render LaTeX directly to static HTML during SSR or on the client without waiting for asynchronous DOM parsing scripts.

---

## 📦 Comprehensive Library Evaluation Matrix

| Library / Tool | Package | Chosen Over | Core Reason & Value Delivered |
| :--- | :--- | :--- | :--- |
| **Turborepo** | `turbo` | Nx, Lerna | Minimal configuration (`turbo.json`), blazing fast pipeline execution, native pnpm workspace integration. |
| **Prisma** | `@prisma/client`, `prisma` | TypeORM, Sequelize | Automated type-safe client generation from schema, clean declarative migrations, unified SQLite/Postgres support. |
| **Next.js** | `next` | Vite, Remix | App Router directory layout, hybrid SSR/CSR capability, optimized font loading (`next/font`), production scale. |
| **React** | `react`, `react-dom` | Vue, Svelte | Dominant ecosystem, seamless Next.js App Router synergy, deep ecosystem for UI primitives. |
| **NestJS** | `@nestjs/core`, `@nestjs/common` | Express, Koa | Enterprise-grade Dependency Injection, modular domain architecture, standard decorators and validation pipes. |
| **Passport & JWT** | `passport`, `passport-jwt`, `@nestjs/jwt` | Session cookies | Stateless, cross-origin friendly, zero database query overhead per authenticated API call. |
| **Bcryptjs** | `bcryptjs` | Native `bcrypt` | Pure JavaScript implementation avoids native C++ build tool dependencies (`node-gyp`, Python) on Windows environments. |
| **KaTeX** | `katex` | MathJax | 100x faster synchronous formula rendering, zero layout shift, compact client bundle. |
| **Recharts** | `recharts` | Chart.js, D3.js | Declarative React SVG components, responsive container auto-scaling, animations, smooth integration with dark themes. |
| **Framer Motion** | `framer-motion` | CSS-only, React Spring | Physics-based micro-interactions, modal transitions, spring-based UI responsiveness. |
| **Lucide React** | `lucide-react` | FontAwesome, Material Icons | Tree-shakeable, clean 24x24 SVG stroke aesthetic, zero unnecessary font-face overhead. |
| **Canvas Confetti** | `canvas-confetti` | Particles.js | Ultra-lightweight celebration effects on test completion and high-score milestones with zero CPU lag. |
| **Tailwind CSS v4** | `@tailwindcss/postcss`, `tailwindcss` | CSS Modules, Styled Components | High-speed utility workflow, zero-runtime CSS extraction, customized via modern CSS design variables. |
| **Throttler** | `@nestjs/throttler` | express-rate-limit | Built-in NestJS guard integration to safeguard AI generation and authentication endpoints against abuse. |
