"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// Mock data — will be replaced with API calls
const mockStats = {
  totalExams: 12,
  avgScore: 645,
  streakDays: 7,
  questionsToday: 42,
  accuracyToday: 74,
  predictedScore: 680,
  targetScore: 720,
};

const mockRecentExams = [
  { id: "1", type: "MOCK", score: 655, date: "2026-06-12", sections: { q: 78, v: 74, di: 76 } },
  { id: "2", type: "PRACTICE", score: 630, date: "2026-06-10", sections: { q: 75, v: 72, di: 73 } },
  { id: "3", type: "ADAPTIVE", score: 640, date: "2026-06-08", sections: { q: 76, v: 73, di: 74 } },
  { id: "4", type: "MOCK", score: 620, date: "2026-06-05", sections: { q: 74, v: 71, di: 72 } },
];

const mockWeakAreas = [
  { topic: "Number Properties", section: "Quant", accuracy: 45 },
  { topic: "Critical Reasoning", section: "Verbal", accuracy: 52 },
  { topic: "Data Sufficiency", section: "DI", accuracy: 48 },
  { topic: "Word Problems", section: "Quant", accuracy: 55 },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scoreProgress = ((mockStats.avgScore - 205) / (805 - 205)) * 100;
  const targetProgress = ((mockStats.targetScore - 205) / (805 - 205)) * 100;

  return (
    <div style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.5s" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
          Welcome back 👋
        </h1>
        <p style={{ fontSize: "14px", color: "#94a3b8" }}>
          Your GMAT Focus preparation dashboard. {mockStats.streakDays}-day streak! 🔥
        </p>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card animate-glow">
          <div className="stat-label">Current Score</div>
          <div className="stat-value">{mockStats.avgScore}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            Target: {mockStats.targetScore}
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
          }}>{mockStats.predictedScore}</div>
          <div style={{ fontSize: "12px", color: "#10b981", marginTop: "8px" }}>
            ↑ +35 from last week
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Today's Progress</div>
          <div className="stat-value">{mockStats.questionsToday}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            questions · {mockStats.accuracyToday}% accuracy
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Study Streak</div>
          <div className="stat-value" style={{
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>{mockStats.streakDays}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            consecutive days 🔥
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {mockRecentExams.map((exam) => (
              <div
                key={exam.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
                    {exam.type === "MOCK" ? "Full Mock Exam" : exam.type === "PRACTICE" ? "Practice Session" : "Adaptive Drill"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    {exam.date} · Q{exam.sections.q} V{exam.sections.v} DI{exam.sections.di}
                  </div>
                </div>
                <div style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  background: exam.score >= 650 ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f59e0b, #d97706)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {exam.score}
                </div>
              </div>
            ))}
          </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {mockWeakAreas.map((area, i) => (
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
                  {area.section}
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/exam/new?type=retest"
            className="btn-primary"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "20px",
              textDecoration: "none",
              fontSize: "13px",
              padding: "10px",
            }}
          >
            🎯 Practice Weak Areas
          </Link>
        </div>
      </div>
    </div>
  );
}
