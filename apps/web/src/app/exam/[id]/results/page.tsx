"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Award, Clock, CheckCircle, AlertCircle, HelpCircle, FileCheck, Sparkles, ArrowLeft, RefreshCw
} from "lucide-react";

interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

interface Question {
  id: string;
  section: string;
  type: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: {
    stepByStep: string;
    fasterMethod?: string;
    alternativeMethod?: string;
    wrongOptionExplanations?: Record<string, string>;
  };
}

interface ExamQuestion {
  id: string;
  orderIndex: number;
  userAnswer: string | null;
  isCorrect: boolean | null;
  timeTaken: number;
  isFlagged: boolean;
  question: Question;
}

interface ExamSection {
  id: string;
  section: string;
  sectionScore: number | null;
  questions: ExamQuestion[];
}

interface Exam {
  id: string;
  type: string;
  totalScore: number | null;
  completedAt: string;
  sections: ExamSection[];
}

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<ExamQuestion | null>(null);
  const [flashcardGeneratingId, setFlashcardGeneratingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchExamResults();
  }, [examId]);

  const fetchExamResults = async () => {
    try {
      const res = await fetch(`/api/v1/exams/${examId}`);
      if (res.ok) {
        const data = await res.json();
        setExam(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcard = async (questionId: string) => {
    // Check if we already have a mistake entry or generate it
    setFlashcardGeneratingId(questionId);
    setStatusMessage(null);
    try {
      // First, create a mistake book entry for this question if it doesn't exist
      const mistakeRes = await fetch("/api/v1/mistakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          examId,
          notes: "Answered incorrectly during mock exam.",
          tags: ["exam-review"],
        }),
      });

      if (mistakeRes.ok) {
        const mistake = await mistakeRes.json();
        // Now trigger flashcard generation
        const cardRes = await fetch(`/api/v1/flashcards/generate-from-mistake/${mistake.id}`, {
          method: "POST",
        });

        if (cardRes.ok) {
          setStatusMessage("✨ AI Flashcard added to your deck based on this mistake!");
        } else {
          setStatusMessage("⚠️ Failed to generate card context. Added to Mistake Book only.");
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("⚠️ Failed to connect to server.");
    } finally {
      setFlashcardGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", display: "flex", gap: "20px", flexDirection: "column" }}>
        <div style={{ height: "40px", width: "200px" }} className="skeleton" />
        <div style={{ height: "200px" }} className="skeleton" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h3>Exam Attempt Not Found</h3>
        <p style={{ marginTop: "8px", color: "#64748b" }}>This mock exam attempt could not be retrieved.</p>
        <Link href="/dashboard" className="btn-secondary" style={{ display: "inline-block", marginTop: "16px" }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate stats
  const totalScore = exam.totalScore || 205;
  const sections = exam.sections || [];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
      {/* Top action */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", textDecoration: "none", fontSize: "14px", marginBottom: "24px" }}>
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      {/* Score overview */}
      <div className="glass-card-static" style={{ padding: "40px", textAlign: "center", marginBottom: "28px" }}>
        <Award size={40} style={{ color: "#10b981", margin: "0 auto 16px" }} />
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          GMAT-Equivalent Simulator Estimate
        </div>
        <h1 style={{ fontSize: "64px", fontWeight: 800, background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, margin: "12px 0" }}>
          {totalScore}
        </h1>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "4px 12px", borderRadius: "999px", fontWeight: 600 }}>
            Standard Error: ±15 pts
          </span>
          <span style={{ fontSize: "13px", background: "rgba(16, 185, 129, 0.12)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "4px 12px", borderRadius: "999px", fontWeight: 600 }}>
            95% Confidence Interval: [{Math.max(205, totalScore - 30)} – {Math.min(805, totalScore + 30)}]
          </span>
          <span style={{ fontSize: "13px", background: "rgba(148, 163, 184, 0.12)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.25)", padding: "4px 12px", borderRadius: "999px", fontWeight: 600 }}>
            Scale: 205–805 (Increments of 10)
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "#64748b", maxWidth: "600px", margin: "0 auto 28px", lineHeight: "1.5" }}>
          * Independent test delivery simulation using calibrated 3-parameter logistic (3PL) Item Response Theory. This is a simulator estimate and not an official score from the Graduate Management Admission Council (GMAC).
        </p>

        {/* Section score splits */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {sections.map((sect) => (
            <div key={sect.id} className="glass" style={{ padding: "20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#3b82f6" }}>
                {sect.sectionScore || 60}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, marginTop: "4px" }}>
                {sect.section.replace("_", " ")}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>60–90 scale</div>
            </div>
          ))}
        </div>
      </div>

      {/* Details layout: questions on left, detailed explanation drawer on right */}
      <div style={{ display: "flex", gap: "28px" }}>
        {/* Left Side: Question navigation list */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Section Details</h2>

          {sections.map((sect) => (
            <div key={sect.id} className="glass-card-static" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", marginBottom: "14px", display: "flex", justifyContent: "space-between" }}>
                <span>{sect.section.replace("_", " ")}</span>
                <span style={{ color: "#3b82f6" }}>Section Score: {sect.sectionScore || 60}</span>
              </h3>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {sect.questions?.map((eq, i) => {
                  const isWrong = eq.isCorrect === false || eq.userAnswer === null;
                  return (
                    <button
                      key={eq.id}
                      onClick={() => {
                        setSelectedQuestion(eq);
                        setStatusMessage(null);
                      }}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        border: `1px solid ${selectedQuestion?.id === eq.id ? "#3b82f6" : "var(--color-border)"}`,
                        background: selectedQuestion?.id === eq.id 
                          ? "rgba(59,130,246,0.15)"
                          : isWrong 
                            ? "rgba(239, 68, 68, 0.15)" 
                            : "rgba(16, 185, 129, 0.15)",
                        color: isWrong ? "#ef4444" : "#10b981",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all var(--transition-fast)"
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Question explanations display */}
        <div style={{ flex: 1.8 }}>
          {selectedQuestion ? (
            <div className="glass-card-static" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9" }}>Question Detail</h3>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Topic: {selectedQuestion.question.topic} · Difficulty: {selectedQuestion.question.difficulty}
                  </div>
                </div>

                {selectedQuestion.isCorrect === false && (
                  <button
                    onClick={() => handleGenerateFlashcard(selectedQuestion.question.id)}
                    disabled={flashcardGeneratingId !== null}
                    className="btn-primary"
                    style={{ padding: "8px 12px", fontSize: "12px", background: "var(--gradient-success)", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Sparkles size={14} />
                    <span>{flashcardGeneratingId ? "Generating..." : "Generate AI Flashcard"}</span>
                  </button>
                )}
              </div>

              {statusMessage && (
                <div className="glass" style={{ padding: "10px 14px", border: "1px solid var(--color-border-accent)", borderRadius: "6px", fontSize: "12px" }}>
                  {statusMessage}
                </div>
              )}

              {/* Question stem */}
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <HelpCircle size={14} />
                  Question Stem
                </div>
                <div className="glass" style={{ padding: "16px", borderRadius: "8px", fontSize: "13.5px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {selectedQuestion.question.stem}
                </div>
              </div>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedQuestion.question.options.map((opt) => {
                  const isCorrectAnswer = opt.id === selectedQuestion.question.correctAnswer;
                  const isUserAnswer = opt.id === selectedQuestion.userAnswer;
                  
                  let optionClass = "";
                  if (isCorrectAnswer) optionClass = "correct";
                  else if (isUserAnswer && !isCorrectAnswer) optionClass = "incorrect";

                  return (
                    <div 
                      key={opt.id}
                      className={`answer-option ${optionClass}`}
                      style={{ cursor: "default", margin: 0 }}
                    >
                      <span className="answer-label" style={{
                        background: isCorrectAnswer 
                          ? "var(--color-accent-success)" 
                          : isUserAnswer 
                            ? "var(--color-accent-danger)" 
                            : "transparent",
                        borderColor: isCorrectAnswer 
                          ? "var(--color-accent-success)" 
                          : isUserAnswer 
                            ? "var(--color-accent-danger)" 
                            : "var(--color-border)",
                        color: (isCorrectAnswer || isUserAnswer) ? "white" : "inherit"
                      }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: "13.5px" }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Explanations */}
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileCheck size={14} />
                  Explanations
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="glass" style={{ padding: "14px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>Step-by-Step Explanation</div>
                    <div style={{ fontSize: "12.5px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                      {selectedQuestion.question.explanation.stepByStep}
                    </div>
                  </div>

                  {selectedQuestion.question.explanation.fasterMethod && (
                    <div className="glass" style={{ padding: "14px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#10b981", marginBottom: "4px" }}>Alternative / Faster Method</div>
                      <div style={{ fontSize: "12.5px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {selectedQuestion.question.explanation.fasterMethod}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card-static" style={{ padding: "40px", height: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#64748b" }}>
              <HelpCircle size={40} style={{ color: "#3b82f6", marginBottom: "12px" }} />
              <h3>Select a Question</h3>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>Select a question number from the section summaries to read answers and detailed logic reviews.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
