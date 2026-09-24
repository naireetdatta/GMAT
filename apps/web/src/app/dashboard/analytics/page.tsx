"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, TrendingUp, Clock, Target, Calendar, Award, AlertTriangle, ShieldCheck
} from "lucide-react";

interface TopicAnalysis {
  topic: string;
  section: string;
  accuracy: number;
  questionsAttempted: number;
  avgTime: number;
}

interface DashboardData {
  totalExams: number;
  avgScore: number;
  scoreHistory: { date: string; score: number }[];
  topicPerformance: TopicAnalysis[];
  streakDays: number;
  questionsToday: number;
  accuracyToday: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/v1/analytics/dashboard");
      if (res.ok) {
        const result = await res.json();
        setData(result);
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: "100px" }} className="skeleton" />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ height: "300px" }} className="skeleton" />
          <div style={{ height: "300px" }} className="skeleton" />
        </div>
      </div>
    );
  }

  // Fallbacks if data is empty
  const totalExams = data?.totalExams || 0;
  const avgScore = data?.avgScore || 0;
  const streakDays = data?.streakDays || 0;
  const topicPerformance = data?.topicPerformance || [];
  const scoreHistory = data?.scoreHistory || [];

  // Sort performance into strengths and weaknesses
  const sortedTopics = [...topicPerformance].sort((a, b) => b.accuracy - a.accuracy);
  const strengths = sortedTopics.filter((t) => t.accuracy >= 70);
  const weaknesses = sortedTopics.filter((t) => t.accuracy < 70);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
          Analytics & Performance
        </h1>
        <p style={{ fontSize: "14px", color: "#94a3b8" }}>
          Detailed performance breakdown by GMAT Focus Section, scoring, and pacing.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <div className="stat-card">
          <div className="stat-label">Total Mocks Taken</div>
          <div className="stat-value">{totalExams}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>exams completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Average Score</div>
          <div className="stat-value" style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {avgScore || "N/A"}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>out of 805 GMAT scale</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Questions Solved Today</div>
          <div className="stat-value">{data?.questionsToday || 0}</div>
          <div style={{ fontSize: "12px", color: "#10b981", marginTop: "8px" }}>
            {data?.accuracyToday ? `${data.accuracyToday}% accuracy` : "No questions today"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Study Streak</div>
          <div className="stat-value" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {streakDays}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>consecutive days 🔥</div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Score History Graph */}
        <div className="glass-card-static" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={18} style={{ color: "#3b82f6" }} />
            Score Trajectory
          </h2>

          <div style={{ flex: 1, height: "260px", display: "flex", alignItems: "flex-end", gap: "20px", padding: "10px 0", borderBottom: "1px solid var(--color-border)", position: "relative" }}>
            {scoreHistory.map((pt, idx) => {
              const heightPct = ((pt.score - 200) / 600) * 100;
              return (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: "11px", color: "#fff", fontWeight: 700, marginBottom: "8px" }}>{pt.score}</div>
                  <div style={{
                    width: "100%",
                    maxWidth: "32px",
                    height: `${heightPct}%`,
                    background: "var(--gradient-primary)",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.8s ease-out",
                    position: "relative"
                  }} />
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "8px", transform: "rotate(-25deg)", whiteSpace: "nowrap" }}>
                    {pt.date.substring(5)}
                  </div>
                </div>
              );
            })}
            {scoreHistory.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "14px" }}>
                Complete adaptive tests to populate your score chart.
              </div>
            )}
          </div>
        </div>

        {/* Section Times and Pacing */}
        <div className="glass-card-static" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} style={{ color: "#8b5cf6" }} />
            Pacing & Response Times
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { section: "Quantitative Reasoning", target: "128s", avg: "122s", pct: 95, color: "#3b82f6" },
              { section: "Verbal Reasoning", target: "117s", avg: "135s", pct: 115, color: "#8b5cf6" },
              { section: "Data Insights", target: "135s", avg: "128s", pct: 94, color: "#10b981" },
            ].map((pace, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  <span>{pace.section}</span>
                  <span style={{ color: pace.pct > 100 ? "#ef4444" : "#cbd5e1" }}>Avg: {pace.avg} (Target: {pace.target})</span>
                </div>
                <div style={{ height: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(pace.pct, 100)}%`,
                    background: pace.pct > 100 ? "linear-gradient(90deg, #ef4444, #dc2626)" : `linear-gradient(90deg, ${pace.color}, #a78bfa)`,
                    borderRadius: "4px"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths and Weaknesses Detailed breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Strengths */}
        <div className="glass-card-static" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#10b981", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} />
            Mastered Concepts (&ge;70% Accuracy)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {strengths.map((str, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.1)", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>{str.topic}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Section: {str.section.toLowerCase()} · {str.questionsAttempted} attempts</div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#10b981" }}>{str.accuracy}%</div>
              </div>
            ))}
            {strengths.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "13px" }}>
                No topics mastered yet. Keep practicing!
              </div>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="glass-card-static" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#ef4444", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={18} />
            Review Required (&lt;70% Accuracy)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {weaknesses.map((weak, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>{weak.topic}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Section: {weak.section.toLowerCase()} · {weak.questionsAttempted} attempts</div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#ef4444" }}>{weak.accuracy}%</div>
              </div>
            ))}
            {weaknesses.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "13px" }}>
                Great job! No weak concepts identified.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
