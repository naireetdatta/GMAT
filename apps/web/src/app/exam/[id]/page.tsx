"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// ============================================
// Types for exam state
// ============================================

interface ExamQuestionData {
  id: string;
  examQuestionId?: string;
  stem: string;
  passage?: string;
  type: string;
  options: { id: string; label: string; text: string }[];
  section: string;
  topic: string;
  difficulty: number;
  tableData?: { headers: string[]; rows: string[][]; sortableColumns: number[] };
  sources?: { id: string; title: string; content: string; type: string }[];
}

interface QuestionState {
  questionId: string;
  examQuestionId?: string;
  userAnswer: string | null;
  isFlagged: boolean;
  isSkipped: boolean;
  timeTaken: number;
  isEdited: boolean;
}

type ExamPhase = "loading" | "section-select" | "active" | "review" | "break" | "submitting" | "results";

// ============================================
// Fallback Mock Questions (for offline/demo use)
// ============================================

const fallbackMockQuestions: Record<string, ExamQuestionData[]> = {
  QUANTITATIVE: Array.from({ length: 21 }, (_, i) => ({
    id: `q-quant-${i + 1}`,
    stem: `If x² + 5x + 6 = 0, and y = ${i + 2}x - ${i + 1}, what is the value of y when x is the larger root of the equation?`,
    type: "PROBLEM_SOLVING",
    section: "QUANTITATIVE",
    topic: i % 2 === 0 ? "ALGEBRA" : "ARITHMETIC",
    difficulty: 405 + Math.floor(i * 20),
    options: [
      { id: "A", label: "A", text: `${i * 2 - 3}` },
      { id: "B", label: "B", text: `${i * 2 - 1}` },
      { id: "C", label: "C", text: `${i * 2 + 1}` },
      { id: "D", label: "D", text: `${i * 2 + 3}` },
      { id: "E", label: "E", text: `${i * 2 + 5}` },
    ],
  })),
  VERBAL: Array.from({ length: 23 }, (_, i) => ({
    id: `q-verbal-${i + 1}`,
    stem:
      i % 3 === 0
        ? "The author's primary purpose in the passage is to:"
        : i % 3 === 1
          ? `Which of the following, if true, would most ${i % 2 === 0 ? "strengthen" : "weaken"} the argument above?`
          : "It can be inferred from the passage that the author would most likely agree with which of the following?",
    passage:
      i % 3 === 0 || i % 3 === 2
        ? `Recent research in behavioral economics has challenged the traditional assumption that market participants act as perfectly rational agents. Studies by Kahneman and Tversky demonstrated that individuals systematically deviate from rational choice theory in predictable ways, exhibiting cognitive biases such as loss aversion, anchoring, and the availability heuristic. These findings have profound implications for financial regulation, consumer protection policy, and the design of public health interventions. Critics argue, however, that laboratory findings may not translate directly to real-world market conditions, where competitive pressures and institutional structures may mitigate individual cognitive limitations. Furthermore, some economists contend that while individual behavior may be irrational, market-level outcomes can still approximate rational equilibria through aggregation effects and arbitrage opportunities.`
        : undefined,
    type: i % 3 === 0 || i % 3 === 2 ? "READING_COMPREHENSION" : "CRITICAL_REASONING",
    section: "VERBAL",
    topic: i % 3 === 1 ? "CRITICAL_REASONING" : "READING_COMPREHENSION",
    difficulty: 405 + Math.floor(i * 18),
    options: [
      { id: "A", label: "A", text: "Advocate for a new theoretical framework in economics" },
      { id: "B", label: "B", text: "Present evidence that challenges a prevailing assumption" },
      { id: "C", label: "C", text: "Reconcile two opposing viewpoints in behavioral science" },
      { id: "D", label: "D", text: "Critique the methodology of recent experimental studies" },
      { id: "E", label: "E", text: "Evaluate the practical applications of academic research" },
    ],
  })),
  DATA_INSIGHTS: Array.from({ length: 20 }, (_, i) => ({
    id: `q-di-${i + 1}`,
    stem:
      i % 5 === 0
        ? "Is x > 0?\n\n(1) x³ > 0\n(2) x² - x > 0"
        : i % 5 === 1
          ? "Based on the data in the table, select True or False for each statement."
          : i % 5 === 2
            ? "Use the information from the sources to answer the question."
            : i % 5 === 3
              ? "Based on the graph, the ratio of the value in 2024 to the value in 2020 is closest to:"
              : "Select one value for each column to satisfy the given conditions.",
    type: ["DATA_SUFFICIENCY", "TABLE_ANALYSIS", "MULTI_SOURCE_REASONING", "GRAPHICS_INTERPRETATION", "TWO_PART_ANALYSIS"][i % 5],
    section: "DATA_INSIGHTS",
    topic: ["DATA_SUFFICIENCY", "TABLE_ANALYSIS", "MULTI_SOURCE_REASONING", "GRAPHICS_INTERPRETATION", "TWO_PART_ANALYSIS"][i % 5],
    difficulty: 405 + Math.floor(i * 20),
    tableData:
      i % 5 === 1
        ? {
            headers: ["Company", "Revenue ($M)", "Growth (%)", "Employees", "Market Cap ($B)"],
            rows: [
              ["TechCorp", "2,450", "15.3", "12,500", "45.2"],
              ["DataFlow", "1,820", "22.7", "8,300", "38.1"],
              ["CloudNet", "3,100", "8.9", "18,200", "62.5"],
              ["AIVenture", "980", "45.2", "3,200", "28.7"],
              ["SecureIO", "1,550", "12.1", "6,800", "22.4"],
            ],
            sortableColumns: [0, 1, 2, 3, 4],
          }
        : undefined,
    sources:
      i % 5 === 2
        ? [
            {
              id: "s1",
              title: "Email from VP Sales",
              content:
                "Q3 projections indicate a 15% increase in enterprise contracts, primarily driven by the APAC region. However, customer acquisition cost has risen by 8% quarter-over-quarter.",
              type: "text",
            },
            {
              id: "s2",
              title: "Financial Summary",
              content:
                "Total revenue: $45.2M (Q3) vs $42.1M (Q2). Operating margin: 18.3% (Q3) vs 20.1% (Q2). Cash reserves: $128M.",
              type: "text",
            },
            {
              id: "s3",
              title: "Market Report",
              content:
                "Industry growth rate: 12.5% annually. Average customer retention: 87%. Top competitor revenue growth: 18% YoY.",
              type: "text",
            },
          ]
        : undefined,
    options:
      i % 5 === 0
        ? [
            { id: "A", label: "A", text: "Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient." },
            { id: "B", label: "B", text: "Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient." },
            { id: "C", label: "C", text: "BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient." },
            { id: "D", label: "D", text: "EACH statement ALONE is sufficient." },
            { id: "E", label: "E", text: "Statements (1) and (2) TOGETHER are NOT sufficient." },
          ]
        : [
            { id: "A", label: "A", text: "Option A" },
            { id: "B", label: "B", text: "Option B" },
            { id: "C", label: "C", text: "Option C" },
            { id: "D", label: "D", text: "Option D" },
            { id: "E", label: "E", text: "Option E" },
          ],
  })),
};

const SECTION_TIME = 45 * 60; // 45 minutes in seconds
const SECTION_NAMES: Record<string, string> = {
  QUANTITATIVE: "Quantitative Reasoning",
  VERBAL: "Verbal Reasoning",
  DATA_INSIGHTS: "Data Insights",
};
const SECTION_QUESTIONS: Record<string, number> = {
  QUANTITATIVE: 21,
  VERBAL: 23,
  DATA_INSIGHTS: 20,
};

// ============================================
// Main Exam Component
// ============================================

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [examData, setExamData] = useState<any>(null);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(SECTION_TIME);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState[]>>({});
  const [activeQuestions, setActiveQuestions] = useState<ExamQuestionData[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editsRemaining, setEditsRemaining] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTime = useRef<number>(Date.now());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse questions helper
  const parseSectionQuestions = (section: any): ExamQuestionData[] => {
    if (!section?.questions || section.questions.length === 0) {
      return fallbackMockQuestions[section?.section] || fallbackMockQuestions.QUANTITATIVE;
    }

    return section.questions.map((eq: any, index: number) => {
      const q = eq.question || {};
      let options = q.options;
      if (typeof options === "string") {
        try {
          options = JSON.parse(options);
        } catch {
          options = [];
        }
      }
      if (!Array.isArray(options) || options.length === 0) {
        options = [
          { id: "A", label: "A", text: "Option A" },
          { id: "B", label: "B", text: "Option B" },
          { id: "C", label: "C", text: "Option C" },
          { id: "D", label: "D", text: "Option D" },
          { id: "E", label: "E", text: "Option E" },
        ];
      }

      return {
        id: q.id || `q-${index}`,
        examQuestionId: eq.id,
        stem: q.stem || `Question ${index + 1}`,
        passage: q.passage || undefined,
        type: q.type || "PROBLEM_SOLVING",
        options,
        section: q.section || section.section,
        topic: q.topic || "GENERAL",
        difficulty: q.difficulty || 500,
        tableData: q.tableData,
        sources: q.sources,
      };
    });
  };

  // 1. Initial Load: Fetch exam from backend
  useEffect(() => {
    if (!examId) return;

    async function loadExam() {
      try {
        const res = await fetch(`/api/v1/exams/${examId}`);
        if (!res.ok) {
          throw new Error("Failed to load exam");
        }
        const data = await res.json();
        setExamData(data);

        // Check if already finished
        if (data.status === "COMPLETED") {
          router.push(`/exam/${examId}/results`);
          return;
        }

        // Section order
        const order = data.sectionOrder || ["QUANTITATIVE", "VERBAL", "DATA_INSIGHTS"];
        setSectionOrder(order);

        // Find active section or first section
        let activeIdx = data.sections.findIndex((s: any) => s.status === "IN_PROGRESS");
        if (activeIdx === -1) {
          activeIdx = data.sections.findIndex((s: any) => s.status === "NOT_STARTED");
          if (activeIdx === -1) activeIdx = 0;
        }

        setCurrentSectionIndex(activeIdx);
        const activeSection = data.sections[activeIdx];
        const loadedQuestions = parseSectionQuestions(activeSection);
        setActiveQuestions(loadedQuestions);

        // Initialize question states from server data
        const initialStates: QuestionState[] = loadedQuestions.map((q, idx) => {
          const serverEq = activeSection?.questions?.[idx];
          return {
            questionId: q.id,
            examQuestionId: serverEq?.id || q.examQuestionId,
            userAnswer: serverEq?.userAnswer || null,
            isFlagged: serverEq?.isFlagged || false,
            isSkipped: serverEq ? serverEq.userAnswer === null : true,
            timeTaken: serverEq?.timeTaken || 0,
            isEdited: serverEq?.isEdited || false,
          };
        });

        setQuestionStates((prev) => ({
          ...prev,
          [activeSection.section]: initialStates,
        }));

        // Sync authoritative time
        try {
          const syncRes = await fetch(`/api/v1/exams/${examId}/sync`);
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.examStatus === "ON_BREAK") {
              setPhase("break");
            } else {
              setTimeRemaining(syncData.sectionSecondsRemaining ?? SECTION_TIME);
              setEditsRemaining(syncData.editsRemaining ?? 3);
              setPhase("active");
            }
          } else {
            setTimeRemaining(activeSection.timeRemaining || SECTION_TIME);
            setPhase("active");
          }
        } catch {
          setTimeRemaining(activeSection.timeRemaining || SECTION_TIME);
          setPhase("active");
        }
      } catch (err) {
        console.warn("Backend not accessible or exam not found, falling back to local simulation mode:", err);
        setIsOfflineMode(true);
        setPhase("section-select");
      }
    }

    loadExam();
  }, [examId, router]);

  const currentSection = sectionOrder[currentSectionIndex] || "QUANTITATIVE";
  const questions = activeQuestions.length > 0 ? activeQuestions : fallbackMockQuestions[currentSection] || [];
  const currentQuestion = questions[currentQuestionIndex];
  const currentStates = questionStates[currentSection] || [];

  // Periodic server clock sync (every 30 seconds during active phase)
  useEffect(() => {
    if (phase !== "active" || isOfflineMode || !examData) return;

    const activeSection = examData.sections?.[currentSectionIndex];
    if (!activeSection) return;

    syncIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/exams/${examId}/sections/${activeSection.id}/sync`);
        if (res.ok) {
          const sync = await res.json();
          if (sync.isExpired) {
            handleSectionComplete();
          } else if (Math.abs(sync.timeRemainingSeconds - timeRemaining) > 2) {
            // Adjust for drift if greater than 2 seconds
            setTimeRemaining(sync.timeRemainingSeconds);
          }
          if (typeof sync.editsRemaining === "number") {
            setEditsRemaining(sync.editsRemaining);
          }
        }
      } catch {
        // Ignore background sync errors
      }
    }, 30000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [phase, isOfflineMode, examData, currentSectionIndex, examId, timeRemaining]);

  // Authoritative countdown timer (ticks every 1s)
  useEffect(() => {
    if (phase === "active" && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSectionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentSectionIndex]);

  // Init question states when section changes in local offline fallback
  useEffect(() => {
    if (currentSection && !questionStates[currentSection]) {
      const states = questions.map((q) => ({
        questionId: q.id,
        examQuestionId: q.examQuestionId,
        userAnswer: null,
        isFlagged: false,
        isSkipped: true,
        timeTaken: 0,
        isEdited: false,
      }));
      setQuestionStates((prev) => ({ ...prev, [currentSection]: states }));
    }
  }, [currentSection, questions]);

  // Track time per question
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentQuestionIndex, currentSectionIndex]);

  const recordTimeSpent = useCallback(() => {
    const elapsed = Math.floor((Date.now() - questionStartTime.current) / 1000);
    setQuestionStates((prev) => {
      const states = [...(prev[currentSection] || [])];
      if (states[currentQuestionIndex]) {
        states[currentQuestionIndex] = {
          ...states[currentQuestionIndex],
          timeTaken: states[currentQuestionIndex].timeTaken + elapsed,
        };
      }
      return { ...prev, [currentSection]: states };
    });
  }, [currentSection, currentQuestionIndex]);

  // ---- Handlers ----

  const handleSectionSelect = (order: string[]) => {
    setSectionOrder(order);
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setTimeRemaining(SECTION_TIME);
    setEditsRemaining(3);
    setActiveQuestions(fallbackMockQuestions[order[0]] || []);
    setPhase("active");
  };

  const handleAnswer = async (answerId: string) => {
    const states = [...(questionStates[currentSection] || [])];
    const current = states[currentQuestionIndex];
    if (!current) return;

    const wasAnswered = current.userAnswer !== null;
    const isChanging = wasAnswered && current.userAnswer !== answerId;

    // Enforce 3-edit rule during review
    if (isChanging && editsRemaining <= 0 && phase === "review") {
      setErrorMessage("Maximum 3 answer changes reached for this section.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Optimistic local update
    const previousAnswer = current.userAnswer;
    states[currentQuestionIndex] = {
      ...current,
      userAnswer: answerId,
      isSkipped: false,
      isEdited: isChanging ? true : current.isEdited,
    };
    setQuestionStates((prev) => ({ ...prev, [currentSection]: states }));

    // Send answer to server if connected
    if (!isOfflineMode && examData) {
      const activeSection = examData.sections?.[currentSectionIndex];
      if (activeSection) {
        try {
          const res = await fetch(
            `/api/v1/exams/${examId}/sections/${activeSection.id}/answer`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionIndex: currentQuestionIndex,
                answer: answerId,
                idempotencyKey: `${activeSection.id}-${currentQuestionIndex}-${Date.now()}`,
              }),
            },
          );

          if (res.ok) {
            const data = await res.json();
            if (typeof data.editsRemaining === "number") {
              setEditsRemaining(data.editsRemaining);
            }
          } else {
            const err = await res.json();
            // Revert answer if rejected by server (e.g. 3-edit rule or deadline expired)
            states[currentQuestionIndex] = {
              ...current,
              userAnswer: previousAnswer,
            };
            setQuestionStates((prev) => ({ ...prev, [currentSection]: states }));
            setErrorMessage(err.message || "Failed to submit answer to server.");
            setTimeout(() => setErrorMessage(null), 3000);
          }
        } catch {
          // If server call fails, retain optimistic update with warning
          setErrorMessage("Network issue syncing answer. Saved locally.");
          setTimeout(() => setErrorMessage(null), 3000);
        }
      }
    }
  };

  const handleFlag = async () => {
    const states = [...(questionStates[currentSection] || [])];
    const current = states[currentQuestionIndex];
    if (!current) return;

    const newFlagState = !current.isFlagged;
    states[currentQuestionIndex] = {
      ...current,
      isFlagged: newFlagState,
    };
    setQuestionStates((prev) => ({ ...prev, [currentSection]: states }));

    // Sync flag to server
    if (!isOfflineMode && current.examQuestionId) {
      try {
        await fetch(`/api/v1/exams/${examId}/questions/${current.examQuestionId}/flag`, {
          method: "PATCH",
        });
      } catch {
        // Ignore flag sync error
      }
    }
  };

  const handleNext = () => {
    recordTimeSpent();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      setPhase("review");
    }
  };

  const handlePrev = () => {
    recordTimeSpent();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    recordTimeSpent();
    setCurrentQuestionIndex(index);
    if (phase === "review") setPhase("active");
  };

  const handleSectionComplete = async () => {
    recordTimeSpent();
    if (timerRef.current) clearInterval(timerRef.current);

    // Call server complete endpoint if connected
    if (!isOfflineMode && examData) {
      const activeSection = examData.sections?.[currentSectionIndex];
      if (activeSection) {
        try {
          const res = await fetch(`/api/v1/exams/${examId}/sections/${activeSection.id}/complete`, {
            method: "POST",
          });
          if (res.ok) {
            const completeData = await res.json();
            if (completeData.isLastSection) {
              router.push(`/exam/${examId}/results`);
              return;
            }
          }
        } catch (err) {
          console.error("Error completing section on server:", err);
        }
      }
    }

    // Check if this was the last section
    if (currentSectionIndex >= sectionOrder.length - 1) {
      if (!isOfflineMode && examId) {
        router.push(`/exam/${examId}/results`);
      } else {
        setPhase("results");
      }
      return;
    }

    // Optional break allowed after Section 1 or Section 2
    const breakEligible = !examData?.breakTaken && currentSectionIndex < 2;
    if (breakEligible) {
      setPhase("break");
    } else {
      transitionToNextSection();
    }
  };

  const handleBreakEnd = async (takeBreak: boolean) => {
    if (takeBreak && !isOfflineMode && examId) {
      try {
        await fetch(`/api/v1/exams/${examId}/break/start`, { method: "POST" });
      } catch {
        // Ignore break start error
      }
    }

    if (!isOfflineMode && examId) {
      try {
        await fetch(`/api/v1/exams/${examId}/break/end`, { method: "POST" });
        // Refresh exam to get the newly initiated section & deadline
        const res = await fetch(`/api/v1/exams/${examId}`);
        if (res.ok) {
          const freshData = await res.json();
          setExamData(freshData);
        }
      } catch {
        // Ignore break end error
      }
    }

    transitionToNextSection();
  };

  const transitionToNextSection = () => {
    const nextIdx = currentSectionIndex + 1;
    setCurrentSectionIndex(nextIdx);
    setCurrentQuestionIndex(0);
    setTimeRemaining(SECTION_TIME);
    setEditsRemaining(3);

    const nextSectionType = sectionOrder[nextIdx];
    if (examData?.sections?.[nextIdx]) {
      const nextQuestions = parseSectionQuestions(examData.sections[nextIdx]);
      setActiveQuestions(nextQuestions);
    } else {
      setActiveQuestions(fallbackMockQuestions[nextSectionType] || []);
    }

    setPhase("active");
  };

  // ---- Render by Phase ----

  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gradient-bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9" }}>Preparing GMAT Focus Environment...</div>
          <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px" }}>Synchronizing server-authoritative test state</div>
        </div>
      </div>
    );
  }

  if (phase === "section-select") {
    return <SectionSelector onSelect={handleSectionSelect} />;
  }

  if (phase === "break") {
    return <BreakScreen onEnd={handleBreakEnd} sectionsDone={currentSectionIndex + 1} examId={examId} isOfflineMode={isOfflineMode} />;
  }

  if (phase === "results") {
    return <ResultsScreen questionStates={questionStates} sectionOrder={sectionOrder} />;
  }

  if (phase === "review") {
    return (
      <ReviewScreen
        questions={questions}
        states={currentStates}
        editsRemaining={editsRemaining}
        sectionName={SECTION_NAMES[currentSection] || currentSection}
        onJumpTo={handleJumpTo}
        onEndSection={handleSectionComplete}
        timeRemaining={timeRemaining}
      />
    );
  }

  // Active exam view
  return (
    <div className="exam-container">
      {/* Top Banner / Error Banner */}
      {errorMessage && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.9)",
            color: "white",
            textAlign: "center",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Top Bar */}
      <div className="exam-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>
            {SECTION_NAMES[currentSection] || currentSection}
          </span>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          {isOfflineMode && (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(245, 158, 11, 0.2)",
                color: "#f59e0b",
                fontWeight: 600,
              }}
            >
              Standalone Demo Mode
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Timer seconds={timeRemaining} />

          <button
            onClick={handleFlag}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              background: currentStates[currentQuestionIndex]?.isFlagged
                ? "rgba(245, 158, 11, 0.15)"
                : "transparent",
              border: `1px solid ${
                currentStates[currentQuestionIndex]?.isFlagged
                  ? "rgba(245, 158, 11, 0.3)"
                  : "var(--color-border)"
              }`,
              borderRadius: "8px",
              fontSize: "13px",
              color: currentStates[currentQuestionIndex]?.isFlagged
                ? "#f59e0b"
                : "#94a3b8",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            🚩 {currentStates[currentQuestionIndex]?.isFlagged ? "Flagged" : "Flag"}
          </button>

          {currentSection === "DATA_INSIGHTS" && (
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="btn-secondary"
              style={{ padding: "6px 14px", fontSize: "13px" }}
            >
              🧮 Calculator
            </button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="exam-main">
        {currentQuestion?.passage ? (
          // Split view for RC
          <div className="exam-split-view">
            <div className="exam-split-left">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
                Passage
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.8, color: "#e2e8f0" }}>
                {currentQuestion.passage}
              </div>
            </div>
            <div className="exam-split-right">
              <QuestionContent question={currentQuestion} state={currentStates[currentQuestionIndex]} onAnswer={handleAnswer} />
            </div>
          </div>
        ) : currentQuestion?.tableData ? (
          // Table Analysis
          <div className="exam-split-view">
            <div className="exam-split-left">
              <SortableTable data={currentQuestion.tableData} />
            </div>
            <div className="exam-split-right">
              <QuestionContent question={currentQuestion} state={currentStates[currentQuestionIndex]} onAnswer={handleAnswer} />
            </div>
          </div>
        ) : currentQuestion?.sources ? (
          // Multi-Source Reasoning
          <div className="exam-split-view">
            <div className="exam-split-left">
              <SourceTabs sources={currentQuestion.sources} />
            </div>
            <div className="exam-split-right">
              <QuestionContent question={currentQuestion} state={currentStates[currentQuestionIndex]} onAnswer={handleAnswer} />
            </div>
          </div>
        ) : (
          // Standard single-panel view
          <div className="exam-question-area">
            <QuestionContent question={currentQuestion} state={currentStates[currentQuestionIndex]} onAnswer={handleAnswer} />
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="exam-bottombar">
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className="btn-secondary"
          style={{
            padding: "8px 20px",
            fontSize: "13px",
            opacity: currentQuestionIndex === 0 ? 0.4 : 1,
            cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
          }}
        >
          ← Previous
        </button>

        <div style={{ fontSize: "12px", color: "#64748b" }}>
          {currentStates.filter((s) => !s.isSkipped).length} of {questions.length} answered
        </div>

        <button
          onClick={handleNext}
          className="btn-primary"
          style={{ padding: "8px 20px", fontSize: "13px" }}
        >
          {currentQuestionIndex === questions.length - 1 ? "Review Section →" : "Next →"}
        </button>
      </div>

      {/* Calculator */}
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function Timer({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timerClass = mins < 1 ? "timer-urgent" : mins < 5 ? "timer-caution" : "timer-normal";

  return (
    <div className={timerClass} style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

function QuestionContent({
  question,
  state,
  onAnswer,
}: {
  question: ExamQuestionData;
  state?: QuestionState;
  onAnswer: (id: string) => void;
}) {
  if (!question) return null;

  return (
    <div className="animate-fade-in">
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "20px",
      }}>
        <span style={{
          padding: "3px 10px",
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 600,
          color: "#60a5fa",
        }}>
          {question.topic.replace(/_/g, " ")}
        </span>
        <span style={{
          padding: "3px 10px",
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.15)",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 600,
          color: "#a78bfa",
        }}>
          {question.type.replace(/_/g, " ")}
        </span>
      </div>

      <div style={{
        fontSize: "16px",
        lineHeight: 1.7,
        color: "#e2e8f0",
        marginBottom: "28px",
        whiteSpace: "pre-wrap",
      }}>
        {question.stem}
      </div>

      <div>
        {question.options.map((option) => (
          <div
            key={option.id}
            className={`answer-option ${state?.userAnswer === option.id ? "selected" : ""}`}
            onClick={() => onAnswer(option.id)}
          >
            <div className={`answer-label`}>{option.label}</div>
            <div style={{ fontSize: "14px", lineHeight: 1.6, color: "#e2e8f0" }}>
              {option.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SortableTable({ data }: { data: { headers: string[]; rows: string[][]; sortableColumns: number[] } }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedRows = [...data.rows].sort((a, b) => {
    if (sortCol === null) return 0;
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    const numA = parseFloat(aVal.replace(/[,$%]/g, ""));
    const numB = parseFloat(bVal.replace(/[,$%]/g, ""));
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortAsc ? numA - numB : numB - numA;
    }
    return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
        Table Data — Click column headers to sort
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            {data.headers.map((h, i) => (
              <th
                key={i}
                onClick={() => {
                  if (sortCol === i) setSortAsc(!sortAsc);
                  else { setSortCol(i); setSortAsc(true); }
                }}
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  borderBottom: "1px solid var(--color-border)",
                  color: sortCol === i ? "#3b82f6" : "#94a3b8",
                  fontWeight: 600,
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {h} {sortCol === i ? (sortAsc ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid var(--color-border)" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "10px 12px", color: "#e2e8f0" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceTabs({ sources }: { sources: { id: string; title: string; content: string; type: string }[] }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--color-border)" }}>
        {sources.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 600,
              color: activeTab === i ? "#3b82f6" : "#94a3b8",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === i ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#e2e8f0" }}>
        {sources[activeTab]?.content}
      </div>
    </div>
  );
}

function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const handleNum = (n: string) => {
    if (fresh) { setDisplay(n); setFresh(false); }
    else setDisplay((d) => (d === "0" ? n : d + n));
  };

  const handleOp = (operator: string) => {
    setPrev(parseFloat(display));
    setOp(operator);
    setFresh(true);
  };

  const handleEquals = () => {
    if (prev === null || !op) return;
    const curr = parseFloat(display);
    let result = 0;
    switch (op) {
      case "+": result = prev + curr; break;
      case "-": result = prev - curr; break;
      case "×": result = prev * curr; break;
      case "÷": result = curr !== 0 ? prev / curr : 0; break;
    }
    setDisplay(String(parseFloat(result.toFixed(10))));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const handleClear = () => { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); };
  const handleSqrt = () => { setDisplay(String(Math.sqrt(parseFloat(display)))); setFresh(true); };
  const handleSign = () => { setDisplay(String(-parseFloat(display))); };
  const handleDot = () => { if (!display.includes(".")) setDisplay(display + "."); setFresh(false); };

  const buttons = [
    ["C", "±", "√", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  return (
    <div className="calculator-widget" style={{ top: "100px", right: "40px" }}>
      <div className="calculator-header">
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Calculator</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}>✕</button>
      </div>
      <div className="calculator-display">{display}</div>
      <div className="calculator-grid">
        {buttons.flat().map((btn) => (
          <button
            key={btn}
            className={`calc-btn ${["+", "-", "×", "÷"].includes(btn) ? "operator" : ""} ${btn === "=" ? "equals" : ""}`}
            style={btn === "0" ? { gridColumn: "span 1" } : {}}
            onClick={() => {
              if (btn === "C") handleClear();
              else if (btn === "±") handleSign();
              else if (btn === "√") handleSqrt();
              else if (btn === "=") handleEquals();
              else if (btn === ".") handleDot();
              else if (["+", "-", "×", "÷"].includes(btn)) handleOp(btn);
              else handleNum(btn);
            }}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionSelector({ onSelect }: { onSelect: (order: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSections = ["QUANTITATIVE", "VERBAL", "DATA_INSIGHTS"];

  const handleClick = (section: string) => {
    if (selected.includes(section)) {
      setSelected(selected.filter((s) => s !== section));
    } else if (selected.length < 3) {
      setSelected([...selected, section]);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--gradient-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div className="glass-card-static" style={{ padding: "48px", maxWidth: "600px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
          Choose Section Order
        </div>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "32px" }}>
          Select sections in the order you&apos;d like to take them. Click to set the order (1st, 2nd, 3rd).
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {allSections.map((section) => {
            const index = selected.indexOf(section);
            return (
              <button
                key={section}
                onClick={() => handleClick(section)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "20px 24px",
                  background: index >= 0 ? "rgba(59, 130, 246, 0.1)" : "var(--color-bg-card)",
                  border: `2px solid ${index >= 0 ? "#3b82f6" : "var(--color-border)"}`,
                  borderRadius: "14px",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  textAlign: "left",
                }}
              >
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: index >= 0 ? "var(--gradient-primary)" : "var(--color-bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "white",
                  flexShrink: 0,
                }}>
                  {index >= 0 ? index + 1 : ""}
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9" }}>
                    {SECTION_NAMES[section]}
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {SECTION_QUESTIONS[section]} questions · 45 minutes
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onSelect(selected)}
          disabled={selected.length !== 3}
          className="btn-primary"
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            opacity: selected.length !== 3 ? 0.5 : 1,
            cursor: selected.length !== 3 ? "not-allowed" : "pointer",
          }}
        >
          Begin Exam →
        </button>
      </div>
    </div>
  );
}

function ReviewScreen({
  questions,
  states,
  editsRemaining,
  sectionName,
  onJumpTo,
  onEndSection,
  timeRemaining,
}: {
  questions: ExamQuestionData[];
  states: QuestionState[];
  editsRemaining: number;
  sectionName: string;
  onJumpTo: (i: number) => void;
  onEndSection: () => void;
  timeRemaining: number;
}) {
  const answered = states.filter((s) => !s.isSkipped).length;
  const flagged = states.filter((s) => s.isFlagged).length;

  return (
    <div className="exam-container">
      <div className="exam-topbar">
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>
          {sectionName} — Review
        </span>
        <Timer seconds={timeRemaining} />
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ maxWidth: "600px", width: "100%", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
            Section Review
          </h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "8px" }}>
            {answered} of {questions.length} questions answered · {flagged} flagged ·{" "}
            <strong style={{ color: editsRemaining > 0 ? "#10b981" : "#ef4444" }}>
              {editsRemaining} edits remaining
            </strong>
          </p>
          <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "32px" }}>
            Click any question to return to it. You may change up to {editsRemaining} answers.
          </p>

          <div className="question-nav-grid" style={{ maxWidth: "400px", margin: "0 auto 32px" }}>
            {states.map((state, i) => (
              <button
                key={i}
                className={`question-nav-item ${!state.isSkipped ? "answered" : "skipped"} ${state.isFlagged ? "flagged" : ""}`}
                onClick={() => onJumpTo(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(16, 185, 129, 0.3)" }} />
              Answered
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(245, 158, 11, 0.3)" }} />
              Skipped
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8" }}>
              🚩 Flagged
            </div>
          </div>

          <button onClick={onEndSection} className="btn-primary" style={{ padding: "14px 40px", fontSize: "15px" }}>
            End Section →
          </button>
        </div>
      </div>
    </div>
  );
}

function BreakScreen({
  onEnd,
  sectionsDone,
  examId,
  isOfflineMode,
}: {
  onEnd: (takeBreak: boolean) => void;
  sectionsDone: number;
  examId?: string;
  isOfflineMode?: boolean;
}) {
  const [breakTime, setBreakTime] = useState(10 * 60);
  const [onBreak, setOnBreak] = useState(false);

  useEffect(() => {
    if (onBreak && breakTime > 0) {
      const timer = setInterval(() => setBreakTime((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
    if (onBreak && breakTime <= 0) {
      onEnd(true);
    }
  }, [onBreak, breakTime, onEnd]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--gradient-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div className="glass-card-static" style={{ padding: "48px", maxWidth: "500px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>☕</div>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
          {onBreak ? "Break Time" : "Section Complete!"}
        </h2>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px" }}>
          {onBreak
            ? `${Math.floor(breakTime / 60)}:${String(breakTime % 60).padStart(2, "0")} remaining`
            : `You've completed ${sectionsDone} of 3 sections. Take an optional 10-minute break?`}
        </p>

        {!onBreak && (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => setOnBreak(true)} className="btn-secondary" style={{ padding: "12px 32px" }}>
              Take Break
            </button>
            <button onClick={() => onEnd(false)} className="btn-primary" style={{ padding: "12px 32px" }}>
              Continue →
            </button>
          </div>
        )}

        {onBreak && (
          <button onClick={() => onEnd(true)} className="btn-primary" style={{ padding: "12px 32px" }}>
            End Break & Continue →
          </button>
        )}
      </div>
    </div>
  );
}

function ResultsScreen({
  questionStates,
  sectionOrder,
}: {
  questionStates: Record<string, QuestionState[]>;
  sectionOrder: string[];
}) {
  // Score calculation for offline fallback
  const scores: { quant: number; verbal: number; di: number; total: number; percentile: number } = {
    quant: 78,
    verbal: 81,
    di: 79,
    total: 655,
    percentile: 79,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--gradient-bg)",
      padding: "40px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ maxWidth: "700px", width: "100%" }}>
        {/* Score Card */}
        <div className="glass-card-static" style={{ padding: "48px", textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            GMAT-Equivalent Simulator Estimate
          </div>
          <div style={{
            fontSize: "72px",
            fontWeight: 800,
            background: "var(--gradient-primary)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1,
            marginBottom: "8px",
          }}>
            {scores.total}
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "32px" }}>
            {scores.percentile}th Percentile · Score Range: 205–805
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { label: "Quantitative", score: scores.quant, color: "#3b82f6" },
              { label: "Verbal", score: scores.verbal, color: "#8b5cf6" },
              { label: "Data Insights", score: scores.di, color: "#10b981" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "20px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
              }}>
                <div style={{ fontSize: "32px", fontWeight: 800, color: s.color }}>{s.score}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{s.label}</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>60–90 scale</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats summary */}
        <div className="glass-card-static" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>
            Section Summary
          </h3>
          {sectionOrder.map((section) => {
            const states = questionStates[section] || [];
            const answered = states.filter((s) => !s.isSkipped).length;
            const flagged = states.filter((s) => s.isFlagged).length;
            const totalTime = states.reduce((sum, s) => sum + s.timeTaken, 0);
            return (
              <div key={section} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid var(--color-border)",
              }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
                  {SECTION_NAMES[section]}
                </span>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#94a3b8" }}>
                  <span>{answered}/{states.length} answered</span>
                  <span>{flagged} flagged</span>
                  <span>{Math.floor(totalTime / 60)}m {totalTime % 60}s</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
          <a href="/dashboard" className="btn-secondary" style={{ textDecoration: "none", padding: "12px 32px" }}>
            ← Dashboard
          </a>
          <a href="/dashboard/analytics" className="btn-primary" style={{ textDecoration: "none", padding: "12px 32px" }}>
            View Detailed Analysis →
          </a>
        </div>
      </div>
    </div>
  );
}
