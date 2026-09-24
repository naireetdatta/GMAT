"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Clipboard, Award, Shield, AlertTriangle } from "lucide-react";

enum SectionType {
  QUANTITATIVE = "QUANTITATIVE",
  VERBAL = "VERBAL",
  DATA_INSIGHTS = "DATA_INSIGHTS",
}

enum ExamType {
  PRACTICE = "PRACTICE",
  MOCK = "MOCK",
  ADAPTIVE = "ADAPTIVE",
  RETEST = "RETEST",
}

export default function NewExamPage() {
  const router = useRouter();
  const [examType, setExamType] = useState<ExamType>(ExamType.ADAPTIVE);
  const [selectedOrder, setSelectedOrder] = useState<SectionType[]>([
    SectionType.QUANTITATIVE,
    SectionType.VERBAL,
    SectionType.DATA_INSIGHTS,
  ]);
  const [loading, setLoading] = useState(false);

  const orders = [
    [SectionType.QUANTITATIVE, SectionType.VERBAL, SectionType.DATA_INSIGHTS],
    [SectionType.QUANTITATIVE, SectionType.DATA_INSIGHTS, SectionType.VERBAL],
    [SectionType.VERBAL, SectionType.QUANTITATIVE, SectionType.DATA_INSIGHTS],
    [SectionType.VERBAL, SectionType.DATA_INSIGHTS, SectionType.QUANTITATIVE],
    [SectionType.DATA_INSIGHTS, SectionType.QUANTITATIVE, SectionType.VERBAL],
    [SectionType.DATA_INSIGHTS, SectionType.VERBAL, SectionType.QUANTITATIVE],
  ];

  const handleStartExam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: examType,
          sectionOrder: selectedOrder,
        }),
      });

      if (res.ok) {
        const exam = await res.json();
        router.push(`/exam/${exam.id}`);
      } else {
        alert("Failed to initialize exam. Please ensure you have generated a seed question pool.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting api gateway.");
    } finally {
      setLoading(false);
    }
  };

  const sectionLabels = {
    [SectionType.QUANTITATIVE]: "Quant Reasoning (21 Q / 45m)",
    [SectionType.VERBAL]: "Verbal Reasoning (23 Q / 45m)",
    [SectionType.DATA_INSIGHTS]: "Data Insights (20 Q / 45m)",
  };

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", padding: "0 20px" }}>
      <div className="glass-card-static" style={{ padding: "40px" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Play size={40} style={{ color: "#3b82f6", margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>GMAT Focus Simulation Wizard</h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
            Configure your section ordering permutation and testing modes.
          </p>
        </div>

        {/* Info alerts */}
        <div className="glass" style={{ padding: "16px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)", display: "flex", gap: "12px", marginBottom: "28px" }}>
          <AlertTriangle size={20} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
            <strong>Exam Simulation Mode:</strong> You will be launched into a full-screen, timed, section-adaptive exam environment. No explanations will be visible during testing. Anti-cheat features will monitor focus status.
          </div>
        </div>

        {/* Config Groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Exam Type */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "10px" }}>
              Testing Mode
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { type: ExamType.ADAPTIVE, label: "Adaptive Mock", desc: "Full item-adaptive (IRT) mock with section grading.", icon: <Award size={16} /> },
                { type: ExamType.PRACTICE, label: "Standard Practice", desc: "Static pool evaluation without adaptive loops.", icon: <Clipboard size={16} /> },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setExamType(item.type)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "10px",
                    border: `1px solid ${examType === item.type ? "#3b82f6" : "var(--color-border)"}`,
                    background: examType === item.type ? "rgba(59,130,246,0.08)" : "transparent",
                    color: "#f1f5f9",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
                    {item.icon}
                    {item.label}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section Ordering */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "10px" }}>
              Choose Section Order (Permutations allowed by GMAC)
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {orders.map((ord, idx) => {
                const isSelected = selectedOrder.join("-") === ord.join("-");
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOrder(ord)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: `1px solid ${isSelected ? "#3b82f6" : "var(--color-border)"}`,
                      background: isSelected ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.01)",
                      color: isSelected ? "#3b82f6" : "#cbd5e1",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all var(--transition-fast)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span>{idx + 1}.</span>
                      <span>{ord.map(s => s === SectionType.QUANTITATIVE ? "Quant" : s === SectionType.VERBAL ? "Verbal" : "DI").join(" → ")}</span>
                    </div>
                    {isSelected && <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700 }}>Selected</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={handleStartExam}
            disabled={loading}
            className="btn-primary animate-glow"
            style={{ width: "100%", padding: "14px", fontSize: "14px", marginTop: "16px" }}
          >
            {loading ? "Launching Simulator..." : "🚀 Launch Exam Simulation"}
          </button>
        </div>
      </div>
    </div>
  );
}
