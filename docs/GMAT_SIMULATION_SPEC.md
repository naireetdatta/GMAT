# GMAT Focus Edition Simulation Engine Specification

**Document Version**: 1.0.0  
**Status**: Canonical Technical Specification  
**Authority**: Ground Truth for Simulator Implementation  

---

## 1. Purpose & Core Principles

### 1.1 Scope & Mission
The GMAT Simulation Engine is a deterministic, server-authoritative, psychometrically grounded test delivery platform. Its primary goal is to reproduce the observable exam mechanics, cognitive pacing, and adaptive behavior of the official **GMAT Focus Edition** with maximum fidelity.

### 1.2 Clear Disclaimers & Non-Goals
1. **No Claim to Proprietary Algorithms**: The simulator does **NOT** claim to replicate or access GMAC’s proprietary scoring algorithms, confidential item parameters, or official question banks.
2. **Score Distinction**: Every score displayed by the platform is strictly identified as a **"GMAT-Equivalent Simulator Estimate"** accompanied by confidence intervals and measurement error (SEM), never as an "Official GMAT Score."
3. **No Copyright Infringement**: Questions are synthetically generated and independently certified; no official GMAC copyrighted questions are stored or reproduced.

### 1.3 Mode Separation: Simulation vs. Preparation
* **Simulation Mode**: A sterile, high-stakes, low-distraction environment. No explanations, no AI tutor, no performance badges, strict server-side timers, linear progression, and full event logging.
* **Preparation Mode**: An interactive, supportive learning environment with on-demand Socratic AI tutoring, step-by-step explanations, error categorization, flashcard synthesis, and untimed practice.

---

## 2. Centralized Exam Configuration

Exam parameters must never be hardcoded across components. They are defined centrally:

```typescript
export interface SectionSpecification {
  questionCount: number;
  durationSeconds: number;
  allowedQuestionTypes: QuestionType[];
  calculatorAllowed: boolean;
  adaptive: boolean;
}

export interface GMATExamConfig {
  totalDurationSeconds: number; // 8100 seconds (135 minutes)
  optionalBreakDurationSeconds: number; // 600 seconds (10 minutes)
  maxAnswerEditsPerSection: number; // Exactly 3 edits
  allowedBreakSlots: number[]; // After section index 0 or 1
  sections: {
    QUANTITATIVE: SectionSpecification;
    VERBAL: SectionSpecification;
    DATA_INSIGHTS: SectionSpecification;
  };
}

export const OFFICIAL_GMAT_CONFIG: GMATExamConfig = {
  totalDurationSeconds: 8100,
  optionalBreakDurationSeconds: 600,
  maxAnswerEditsPerSection: 3,
  allowedBreakSlots: [0, 1], // After section 1 or section 2
  sections: {
    QUANTITATIVE: {
      questionCount: 21,
      durationSeconds: 2700,
      allowedQuestionTypes: [QuestionType.PROBLEM_SOLVING],
      calculatorAllowed: false,
      adaptive: true,
    },
    VERBAL: {
      questionCount: 23,
      durationSeconds: 2700,
      allowedQuestionTypes: [
        QuestionType.READING_COMPREHENSION,
        QuestionType.CRITICAL_REASONING,
      ],
      calculatorAllowed: false,
      adaptive: true,
    },
    DATA_INSIGHTS: {
      questionCount: 20,
      durationSeconds: 2700,
      allowedQuestionTypes: [
        QuestionType.DATA_SUFFICIENCY,
        QuestionType.TABLE_ANALYSIS,
        QuestionType.MULTI_SOURCE_REASONING,
        QuestionType.GRAPHICS_INTERPRETATION,
        QuestionType.TWO_PART_ANALYSIS,
      ],
      calculatorAllowed: true,
      adaptive: true,
    },
  },
};
```

---

## 3. Exam Modes

| Mode | Questions | Timing | Adaptive | AI Tutor | Explanations | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FULL_SIMULATION` | 64 (21Q, 23V, 20DI) | Strict 45m / section | Yes (3PL IRT) | Disabled | After exam only | Benchmark readiness |
| `SECTION_SIMULATION` | Single section | Strict 45m | Yes (3PL IRT) | Disabled | After section | Pacing practice |
| `MINI_CAT` | 10–12 questions | Scaled 20m | Yes (3PL IRT) | Disabled | After exam | Quick diagnostic |
| `DIAGNOSTIC` | 30 questions | Uncapped / loose | Yes (Broad) | Disabled | After exam | Baseline skill audit |
| `PRACTICE` | User defined | Untimed / custom | Optional | Available | Instant | Study sessions |
| `DRILL` | Filtered topic | Optional timer | No | Available | Instant | Weakness drilling |
| `ERROR_RECOVERY` | Mistake Book pool | Optional timer | No | Available | Instant | Remediating traps |
| `TUTOR_MODE` | Dynamic | Untimed | No | Active | Instant | Guided Socratic study |

---

## 4. Exam State Machine

### 4.1 Exam States (`ExamState`)
```typescript
export enum ExamState {
  NOT_STARTED = 'NOT_STARTED',
  SECTION_INTRO = 'SECTION_INTRO',
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  SECTION_REVIEW = 'SECTION_REVIEW',
  BREAK_AVAILABLE = 'BREAK_AVAILABLE',
  BREAK_ACTIVE = 'BREAK_ACTIVE',
  SECTION_TRANSITION = 'SECTION_TRANSITION',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  ABANDONED = 'ABANDONED',
}
```

### 4.2 Question States (`QuestionState`)
```typescript
export enum QuestionState {
  UNSEEN = 'UNSEEN',
  ACTIVE = 'ACTIVE',
  ANSWERED = 'ANSWERED',
  BOOKMARKED = 'BOOKMARKED',
  REVIEWED = 'REVIEWED',
  EDITED = 'EDITED',
}
```

### 4.3 State Transition Graph
```text
NOT_STARTED
    ↓ (startExam)
SECTION_INTRO
    ↓ (beginSectionQuestions)
QUESTION_ACTIVE ←────────┐ (nextQuestion / prevQuestion in review)
    ↓ (all questions seen)│
SECTION_REVIEW ──────────┘
    ↓ (submitSection / timeExpired)
[Is there another section?]
    ├── Yes:
    │     ├── [Break eligible and chosen?]
    │     │      ├── Yes: BREAK_ACTIVE → (endBreak / timeout) → SECTION_TRANSITION → SECTION_INTRO
    │     │      └── No:  SECTION_TRANSITION → SECTION_INTRO
    └── No:
          ↓
      COMPLETED
```

*Server Enforcement*: If a client sends an action invalid for the current state (e.g. attempting to answer a question while in `BREAK_ACTIVE` or `SECTION_REVIEW`), the server strictly rejects the request with `400 Bad Request`.

---

## 5. Server-Authoritative Clock

### 5.1 Architecture & Schema
The server is the **sole authority** of time. Client clocks are treated as untrusted display units.
```prisma
model ExamSection {
  startedAt        DateTime?
  sectionDeadlineAt DateTime? // StartedAt + 2700 seconds
  completedAt      DateTime?
}

model Exam {
  breakStartedAt   DateTime?
  breakDeadlineAt  DateTime? // breakStartedAt + 600 seconds
}
```

### 5.2 Server Time Synchronization Protocol
The client periodically computes local clock skew against the server:
$$\Delta_{\text{skew}} = T_{\text{server}} - \left(T_{\text{client\_recv}} - \frac{\text{RTT}}{2}\right)$$
The display timer counts down to `sectionDeadlineAt` adjusted by $\Delta_{\text{skew}}$.

### 5.3 Hard Deadline Enforcement
When any answer or edit request arrives at `apps/api`:
```typescript
const now = new Date();
if (section.sectionDeadlineAt && now > section.sectionDeadlineAt) {
  // Automatically transition section to COMPLETED and reject payload
  await this.expireSection(examId, sectionId);
  throw new BadRequestException('Section time has expired.');
}
```
*Resilience*: Laptop sleep, browser refresh, or tab closure does not stop the server clock. When the user reconnects, the remaining time is accurately recalculated from `sectionDeadlineAt - now()`.

---

## 6. Event-Sourced Exam Session

Every meaningful interaction during an exam produces an immutable, sequence-numbered event stored in the database:

```prisma
model ExamEvent {
  id             String        @id @default(cuid())
  examId         String
  sectionId      String?
  sequenceNumber Int
  type           ExamEventType
  timestamp      DateTime      @default(now())
  idempotencyKey String        @unique
  payload        Json

  exam Exam @relation(fields: [examId], references: [id], onDelete: Cascade)
  @@index([examId, sequenceNumber])
}
```

### 6.1 Event Types
* `EXAM_STARTED`, `SECTION_STARTED`, `QUESTION_PRESENTED`
* `ANSWER_SELECTED`, `ANSWER_CHANGED`
* `QUESTION_BOOKMARKED`, `QUESTION_UNBOOKMARKED`
* `SECTION_REVIEW_STARTED`, `ANSWER_EDITED`, `SECTION_SUBMITTED`
* `BREAK_STARTED`, `BREAK_ENDED`
* `EXAM_EXPIRED`, `EXAM_COMPLETED`
* `TELEMETRY_BLUR`, `TELEMETRY_FOCUS`, `TELEMETRY_RECONNECT`

### 6.2 Idempotency
Clients generate a UUID v4 `idempotencyKey` for every action. If network retries resend the same event, the server deduplicates it without applying state changes twice.

---

## 7. Offline / Network Recovery

```text
User Selects Answer
       ↓
Save to IndexedDB / localStorage Local Event Queue
       ↓
Update Optimistic UI
       ↓
POST /api/v1/exams/:id/events (Background Sync)
       ├── Success: Acknowledge & purge from local queue
       └── Offline: Retain in queue, display non-blocking "Syncing..." badge
```

On reconnection, the client flushes its queue in strict sequence. If `now() > sectionDeadlineAt`, the server gracefully terminates the section without losing previously acknowledged events.

---

## 8. Question Navigation & Section Review

### 8.1 Active Question Phase
* Questions are presented linearly.
* Students cannot freely navigate backward to earlier questions until the section review phase, mirroring official CAT constraints.
* Bookmarking is supported at any time.

### 8.2 Section Review Phase
Triggered when the candidate completes the last question or selects "Review":
* Displays a matrix of all questions in the section.
* Columns: Question Number, Answer Status (Answered / Incomplete), Bookmark Indicator, Current Selected Option.
* Remaining Edit Counter: **"Edits Remaining: X of 3"**.
* Clicking a question navigates to that question in review mode.
* Changing an answer consumes one edit slot ($3 \rightarrow 2 \rightarrow 1 \rightarrow 0$).
* **Rule**: Once `editsRemaining === 0`, further answer modifications are disabled in UI and strictly rejected by the server.

---

## 9. Break Engine

* **Allowance**: Exactly one optional **10-minute (600s)** break.
* **Eligible Positions**: Permitted only after Section 1 or Section 2.
* **Enforcement**:
  1. Once taken (`breakTaken = true`), no second break can ever be initiated.
  2. If the 600 seconds expire, the engine automatically terminates the break and begins the next section.
  3. Candidates can skip the break at any time to immediately begin the next section.

---

## 10. Data Insights Dedicated Renderers

Generic multiple-choice components are insufficient for Data Insights. The simulator must provide dedicated rendering engines:

### 10.1 Data Sufficiency (`DataSufficiencyRenderer`)
* Renders Question Stem followed by Statement (1) and Statement (2).
* Standardized 5-choice evaluation buttons ($A$: Statement 1 alone, $B$: Statement 2 alone, $C$: Both together, $D$: Each alone, $E$: Neither).

### 10.2 Table Analysis (`TableAnalysisRenderer`)
* Clean data grid with interactive column sorting (numerical, alphabetical, date).
* Sticky table headers and horizontal scrolling.
* Underlying data array remains immutable.

### 10.3 Multi-Source Reasoning (`MultiSourceReasoningRenderer`)
* Tabbed multi-source viewer (Tab 1, Tab 2, Tab 3) supporting text, tables, and memos.
* Split-screen layout: persistent source tabs on left, questions and radio options on right.

### 10.4 Graphics Interpretation (`GraphicsInterpretationRenderer`)
* SVG/Recharts rendered charts (scatter, bar, line, pie) with explicit axes, labels, and legends.
* In-line text dropdown selectors or radio answer sets tied to chart inferences.

### 10.5 Two-Part Analysis (`TwoPartAnalysisRenderer`)
* Matrix grid layout with two response columns (e.g. "Column 1" and "Column 2") and mutually exclusive or concurrent row selectors.

---

## 11. Psychometric Engine (3PL IRT & CAT)

### 11.1 Mathematical Formulation
$$\text{Probability of Correct Response: } P_i(\theta) = c_i + \frac{1 - c_i}{1 + e^{-a_i(\theta - b_i)}}$$
$$\text{Fisher Information: } I_i(\theta) = a_i^2 \frac{(P_i(\theta) - c_i)^2}{(1 - c_i)^2 P_i(\theta) (1 - P_i(\theta))}$$

### 11.2 Ability Estimation (EAP)
Numerical quadrature over 61 evaluation points $X_k \in [-3.0, 3.0]$ with prior $\pi(\theta) \sim \mathcal{N}(0, 1)$:
$$\hat{\theta}_{EAP} = \frac{\sum_{k=1}^{61} X_k \cdot L(X_k|\mathbf{u}) \cdot W(X_k)}{\sum_{k=1}^{61} L(X_k|\mathbf{u}) \cdot W(X_k)}$$
$$\text{Standard Error (SEM)} = \sqrt{\frac{\sum_{k=1}^{61} (X_k - \hat{\theta}_{EAP})^2 L(X_k|\mathbf{u}) W(X_k)}{\sum_{k=1}^{61} L(X_k|\mathbf{u}) W(X_k)}}$$

### 11.3 CAT Selection Pipeline
```text
Question Pool
    ↓ (Filter by Section & Validated Status)
Blueprint Filter (Exclude recently tested topics if quota met)
    ↓
Exposure Control (Penalize over-served items)
    ↓
Exclude items already served in current exam
    ↓
Target Difficulty Neighborhood: b_i \in [\hat{\theta} - 0.8, \hat{\theta} + 0.8]
    ↓
Rank by Maximum Fisher Information I_i(\hat{\theta})
    ↓
Select Top Item
```

---

## 12. Score Engine & Mapping

### 12.1 Section Scaled Scores ($60 - 90$)
$$\text{Section Score} = \text{round}\left(60 + \frac{\text{clamp}(\hat{\theta}, -3, 3) - (-3)}{6} \times (90 - 60)\right)$$

### 12.2 Total Scaled Score ($205 - 805$)
All three sections contribute with equal weighting:
$$\bar{S} = \frac{S_{\text{Quant}} + S_{\text{Verbal}} + S_{\text{DI}}}{3}$$
$$\text{Raw Total} = 205 + \left(\frac{\bar{S} - 60}{30}\right) \times 600$$
$$\text{Total Score} = \text{clamp}\left(205, 805, \text{round}\left(\frac{\text{Raw Total}}{10}\right) \times 10\right)$$

### 12.3 Score Uncertainty Reporting
Always report simulator score with standard error bounds:
$$\text{Score Interval} = [\text{Total} - 1.96 \times \text{SEM}_{\text{scaled}}, \text{Total} + 1.96 \times \text{SEM}_{\text{scaled}}]$$

---

## 13. Integrity Telemetry

Capture client telemetry events without making subjective cheating claims:
* `WINDOW_BLUR`: Window lost focus.
* `TAB_SWITCH`: Document visibility changed to hidden.
* `FULLSCREEN_EXIT`: Fullscreen terminated.
* `COPY_ATTEMPT`: Clipboard copy blocked or attempted.

Report factual audit summaries to the candidate:
> *"During this mock, 3 window focus changes were recorded."*

---

## 14. Non-Negotiable System Invariants

1. **AI Independence**: The entire simulation engine (delivery, timing, CAT, scoring) must function perfectly when no AI API keys are configured.
2. **Server Authority**: The client cannot alter the remaining time, grant extra edits, or manipulate ability estimates.
3. **Data Immutability**: Historical completed exams and scores cannot be mutated by subsequent question edits or parameter recalibrations.
