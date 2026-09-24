"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface DashboardData {
  user?: { name?: string; email?: string };
  targetScore?: number;
  totalExams: number;
  avgScore: number;
  scoreHistory: { date: string; score: number }[];
  topicPerformance: {
    topic: string;
    section: string;
    accuracy: number;
    questionsAttempted: number;
    avgTime: number;
  }[];
  recentExams: {
    id: string;
    type: string;
    totalScore: number;
    completedAt: string;
    duration: number;
  }[];
  streakDays: number;
  questionsToday: number;
  accuracyToday: number;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    async function loadDashboard() {
      try {
        const [userRes, dashRes] = await Promise.all([
          fetch("/api/v1/auth/me"),
          fetch("/api/v1/analytics/dashboard"),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setData(dashData);
        }
      } catch (err) {
        console.error("Failed to load user-specific dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalExams = data?.totalExams ?? 0;
  const avgScore = data?.avgScore && data.avgScore > 0 ? data.avgScore : 0;
  const targetScore = data?.targetScore || 705; // User target score or standard 705
  const streakDays = data?.streakDays ?? 0;
  const questionsToday = data?.questionsToday ?? 0;
  const accuracyToday = data?.accuracyToday ?? 0;
  const recentExams = data?.recentExams || [];

  // Weak areas calculated from actual question attempts
  const weakAreas = (data?.topicPerformance || [])
    .filter((t) => t.accuracy < 75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4);

  const predictedScore = avgScore > 0 ? Math.min(avgScore + 20, 805) : "—";
  const scoreProgress = avgScore > 0 ? ((avgScore - 205) / (805 - 205)) * 100 : 0;
  const targetProgress = ((targetScore - 205) / (805 - 205)) * 100;

  const displayName = user?.name || data?.user?.name || user?.email?.split("@")[0] || "Student";

  return (
    <div style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.5s" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
          Welcome back, {displayName} 👋
        </h1>
        <p style={{ fontSize: "14px", color: "#94a3b8" }}>
          Your personalized GMAT Focus preparation dashboard. {streakDays > 0 ? `${streakDays}-day streak! 🔥` : "Let's build your study momentum today!"}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card animate-glow">
          <div className="stat-label">Current Score</div>
          <div className="stat-value">{avgScore > 0 ? avgScore : "—"}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            Target: {targetScore} {totalExams > 0 ? `(${totalExams} mock${totalExams > 1 ? "s" : ""} completed)` : "(Take 1st mock)"}
          </div>
          <div style={{
            marginTop: "12px",
            height: "4px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "2px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              height: "100%",
              width: `${scoreProgress}%`,
              background: "var(--gradient-primary)",
              borderRadius: "2px",
              transition: "width 1s ease-out",
            }} />
            <div style={{
              position: "absolute",
              height: "100%",
              width: "2px",
              left: `${targetProgress}%`,
              background: "var(--color-accent-warning)",
              borderRadius: "1px",
            }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Predicted Score</div>
          <div className="stat-value" style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {predictedScore}
          </div>
          <div style={{ fontSize: "12px", color: "#10b981", marginTop: "8px" }}>
            {avgScore > 0 ? `GMAT Focus CAT Est.` : "Complete diagnostic exam"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Today's Progress</div>
          <div className="stat-value">{questionsToday}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            questions · {questionsToday > 0 ? `${accuracyToday}% accuracy` : "No questions yet today"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Study Streak</div>
          <div className="stat-value" style={{
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {streakDays}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            {streakDays > 0 ? "consecutive days 🔥" : "Practice daily to start streak"}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        marginBottom: "24px",
      }}>
        {[
          { label: "Full Mock", icon: "📝", href: "/exam/new?type=mock", color: "#3b82f6" },
          { label: "Quick Practice", icon: "⚡", href: "/exam/new?type=practice", color: "#8b5cf6" },
          { label: "Weak Area Drill", icon: "🎯", href: "/exam/new?type=retest", color: "#f59e0b" },
          { label: "AI Tutor", icon: "🤖", href: "/dashboard/tutor", color: "#10b981" },
        ].map((action, i) => (
          <Link
            key={i}
            href={action.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 20px",
              background: `rgba(${action.color === "#3b82f6" ? "59,130,246" : action.color === "#8b5cf6" ? "139,92,246" : action.color === "#f59e0b" ? "245,158,11" : "16,185,129"}, 0.08)`,
              border: `1px solid rgba(${action.color === "#3b82f6" ? "59,130,246" : action.color === "#8b5cf6" ? "139,92,246" : action.color === "#f59e0b" ? "245,158,11" : "16,185,129"}, 0.15)`,
              borderRadius: "12px",
              textDecoration: "none",
              transition: "all var(--transition-fast)",
              cursor: "pointer",
            }}
            className="glass-card"
          >
            <span style={{ fontSize: "24px" }}>{action.icon}</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Recent Exams */}
        <div className="glass-card-static" style={{ padding: "24px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9" }}>
              Recent Exams
            </h2>
            <Link
              href="/dashboard/exams"
              style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "none" }}
            >
              View All →
            </Link>
          </div>

          {recentExams.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentExams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/exam/${exam.id}/results`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
                      {exam.type === "MOCK" ? "Full-Length Mock Exam" : exam.type === "PRACTICE" ? "Practice Session" : "Adaptive Drill"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      {new Date(exam.completedAt).toLocaleDateString()} · {Math.round(exam.duration / 60)} mins
                    </div>
                  </div>
                  <div style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    background: exam.totalScore >= 650 ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    {exam.totalScore}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📝</div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>
                No Exams Completed Yet
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "320px", margin: "0 auto 16px" }}>
                Take your first full-length GMAT Focus mock exam (64 questions / 2h 15m) to establish your score baseline.
              </p>
              <Link
                href="/exam/new"
                className="btn-primary"
                style={{ padding: "8px 20px", textDecoration: "none", fontSize: "13px", display: "inline-block" }}
              >
                Start Full Mock Exam →
              </Link>
            </div>
          )}
        </div>

        {/* Weak Areas */}
        <div className="glass-card-static" style={{ padding: "24px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9" }}>
              Areas to Improve
            </h2>
            <Link
              href="/dashboard/analytics"
              style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "none" }}
            >
              Full Analysis →
            </Link>
          </div>

          {weakAreas.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {weakAreas.map((area, i) => (
                <div key={i}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>
                      {area.topic}
                    </span>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: area.accuracy < 50 ? "#ef4444" : "#f59e0b",
                    }}>
                      {area.accuracy}%
                    </span>
                  </div>
                  <div style={{
                    height: "6px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${area.accuracy}%`,
                      background: area.accuracy < 50
                        ? "linear-gradient(90deg, #ef4444, #dc2626)"
                        : "linear-gradient(90deg, #f59e0b, #d97706)",
                      borderRadius: "3px",
                      transition: "width 1s ease-out",
                    }} />
                  </div>
                  <div style={{
                    fontSize: "11px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}>
                    {area.section} · {area.questionsAttempted} attempted
                  </div>
                </div>
              ))}
              <Link
                href="/exam/new?type=retest"
                className="btn-primary"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: "16px",
                  textDecoration: "none",
                  fontSize: "13px",
                  padding: "10px",
                }}
              >
                🎯 Practice Weak Areas
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📊</div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>
                Diagnostic in Progress
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "320px", margin: "0 auto 16px" }}>
                Solve questions in practice sessions or mock exams to reveal your specific strengths and priority areas.
              </p>
              <Link
                href="/dashboard/questions"
                className="btn-secondary"
                style={{ padding: "8px 20px", textDecoration: "none", fontSize: "13px", display: "inline-block" }}
              >
                Explore Question Bank →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
