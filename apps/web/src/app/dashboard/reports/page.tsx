"use client";

import { useState, useEffect } from "react";
import { 
  FileText, Sparkles, TrendingUp, Calendar, AlertCircle, Compass, Target, ArrowRight
} from "lucide-react";

interface CoachReport {
  id: string;
  generatedAt: string;
  reportData: {
    currentScore: number;
    predictedScore: number;
    targetScore: number;
    weakAreas: { topic: string; section: string; accuracy: number }[];
    strongAreas: { topic: string; section: string; accuracy: number }[];
    improvementTimeline: { weekNumber: number; expectedScore: number; focus: string }[];
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<CoachReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CoachReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/v1/analytics/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const newReport = await res.json();
        setReports([newReport, ...reports]);
        setSelectedReport(newReport);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
        <div style={{ height: "40px", width: "200px" }} className="skeleton" />
        <div style={{ height: "200px" }} className="skeleton" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "24px", minHeight: "calc(100vh - 120px)" }}>
      {/* Sidebar - list of reports */}
      <div style={{ width: "320px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="glass-card-static" style={{ padding: "20px" }}>
          <button 
            onClick={handleGenerateReport}
            disabled={generating}
            className="btn-primary animate-glow" 
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}
          >
            <Sparkles size={16} />
            <span>{generating ? "Analyzing..." : "Generate AI Diagnosis"}</span>
          </button>
        </div>

        <div className="glass-card-static" style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>Diagnostics History</h3>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: selectedReport?.id === r.id ? "rgba(255,255,255,0.04)" : "transparent",
                  border: `1px solid ${selectedReport?.id === r.id ? "var(--color-border-accent)" : "transparent"}`,
                  borderRadius: "8px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: selectedReport?.id === r.id ? "#f1f5f9" : "#94a3b8",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={16} style={{ color: "#3b82f6" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>Coach Report</div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                      Generated: {new Date(r.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {reports.length === 0 && (
              <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", marginTop: "24px" }}>
                No diagnostics report found. Generate one above!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Panel - details */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedReport ? (
          <div className="glass-card-static" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "28px", overflowY: "auto", flex: 1 }}>
            {/* Header */}
            <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>AI Coach Diagnosis</div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#f1f5f9", marginTop: "6px" }}>
                Study Performance & Trajectory Report
              </h2>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Generated on {new Date(selectedReport.generatedAt).toLocaleString()}
              </div>
            </div>

            {/* Score Band Comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <div className="glass" style={{ padding: "20px", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Current Score</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#cbd5e1", marginTop: "8px" }}>
                  {selectedReport.reportData.currentScore}
                </div>
              </div>

              <div className="glass border-glow" style={{ padding: "20px", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#3b82f6", textTransform: "uppercase" }}>Predicted Score</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#3b82f6", marginTop: "8px" }}>
                  {selectedReport.reportData.predictedScore}
                </div>
              </div>

              <div className="glass" style={{ padding: "20px", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase" }}>Target Goal</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#f59e0b", marginTop: "8px" }}>
                  {selectedReport.reportData.targetScore}
                </div>
              </div>
            </div>

            {/* Strengths / Weaknesses summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="glass" style={{ padding: "20px", borderRadius: "12px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#10b981", marginBottom: "12px" }}>Top Core Strength Topics</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedReport.reportData.strongAreas.map((area, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <span style={{ color: "#f1f5f9" }}>{area.topic}</span>
                      <span style={{ fontWeight: 700, color: "#10b981" }}>{area.accuracy}%</span>
                    </div>
                  ))}
                  {selectedReport.reportData.strongAreas.length === 0 && (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>More exam attempts needed to pinpoint strengths.</div>
                  )}
                </div>
              </div>

              <div className="glass" style={{ padding: "20px", borderRadius: "12px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444", marginBottom: "12px" }}>Weak Areas Targeting Study</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedReport.reportData.weakAreas.map((area, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <span style={{ color: "#f1f5f9" }}>{area.topic}</span>
                      <span style={{ fontWeight: 700, color: "#ef4444" }}>{area.accuracy}%</span>
                    </div>
                  ))}
                  {selectedReport.reportData.weakAreas.length === 0 && (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>No weak areas identified. Good standing!</div>
                  )}
                </div>
              </div>
            </div>

            {/* Improvement Timeline milestones */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp size={16} style={{ color: "#3b82f6" }} />
                Target Score Progression Plan
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedReport.reportData.improvementTimeline.map((milestone, idx) => (
                  <div key={idx} className="glass" style={{ padding: "16px 20px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#3b82f6" }}>Week {milestone.weekNumber} Milestone</div>
                      <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 600, marginTop: "4px" }}>{milestone.focus}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>Target Score:</span>
                      <span style={{ fontSize: "18px", fontWeight: 800, color: "#f59e0b" }}>{milestone.expectedScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card-static" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <FileText size={48} style={{ color: "#3b82f6", marginBottom: "16px" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Select a Report</h2>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>Select an entry from the history log to read the AI coach recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
