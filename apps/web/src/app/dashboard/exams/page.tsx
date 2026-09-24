"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, Award, Calendar, ChevronRight, Play } from "lucide-react";

interface Score {
  totalScore: number;
  quantScore: number;
  verbalScore: number;
  diScore: number;
}

interface ExamSection {
  section: string;
  sectionScore: number;
}

interface ExamSummary {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  totalScore?: number;
  scores: Score[];
  sections: ExamSection[];
}

export default function ExamsListPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/v1/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
        <div style={{ height: "40px", width: "200px" }} className="skeleton" />
        <div style={{ height: "120px" }} className="skeleton" />
        <div style={{ height: "120px" }} className="skeleton" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
            My Practice Exams
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8" }}>
            History of all mock tests and practice attempts completed on this platform.
          </p>
        </div>
        <Link 
          href="/exam/new"
          className="btn-primary animate-glow" 
          style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
        >
          <Play size={16} fill="white" />
          <span>Start New Test</span>
        </Link>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {exams.map((exam) => {
          const completed = exam.status === "COMPLETED";
          const score = exam.scores[0]?.totalScore || exam.totalScore || 205;
          const dateStr = new Date(exam.completedAt || exam.createdAt).toLocaleDateString();

          return (
            <div 
              key={exam.id}
              className="glass-card-static" 
              style={{ 
                padding: "24px", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "4px 8px", borderRadius: "6px" }}>
                    {exam.type}
                  </span>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Attempted on {dateStr}
                  </span>
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginTop: "12px" }}>
                  {completed ? "Completed Exam Simulation" : "Incomplete Attempt"}
                </h3>

                {completed && (
                  <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12px", color: "#94a3b8" }}>
                    <span>Quant: <strong style={{ color: "#fff" }}>Q{exam.scores[0]?.quantScore || 60}</strong></span>
                    <span>Verbal: <strong style={{ color: "#fff" }}>V{exam.scores[0]?.verbalScore || 60}</strong></span>
                    <span>Data Insights: <strong style={{ color: "#fff" }}>DI{exam.scores[0]?.diScore || 60}</strong></span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                {completed ? (
                  <>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Focus Score</div>
                      <div style={{ fontSize: "28px", fontWeight: 800, color: "#10b981" }}>
                        {score}
                      </div>
                    </div>
                    <Link
                      href={`/exam/${exam.id}/results`}
                      className="btn-secondary"
                      style={{ textDecoration: "none", fontSize: "13px", padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>Review Answers</span>
                      <ChevronRight size={14} />
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/exam/${exam.id}`}
                    className="btn-primary"
                    style={{ textDecoration: "none", fontSize: "13px", padding: "10px 18px" }}
                  >
                    Resume Test
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {exams.length === 0 && (
          <div className="glass-card-static" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <ClipboardList size={48} style={{ color: "#3b82f6", margin: "0 auto 16px" }} />
            <h3>No Exams Found</h3>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>You haven't launched any practice GMAT Focus attempts yet. Click "Start New Test" above to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
