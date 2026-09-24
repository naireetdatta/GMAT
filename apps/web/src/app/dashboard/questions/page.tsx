"use client";

import { useState, useEffect } from "react";
import { 
  Database, Filter, Search, Award, HelpCircle, FileCheck, ChevronRight
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

export default function QuestionsBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filtered, setFiltered] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sectionFilter, setSectionFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [questions, sectionFilter, difficultyFilter, topicFilter, searchQuery]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/v1/questions?take=100");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let list = [...questions];
    if (sectionFilter) {
      list = list.filter((q) => q.section === sectionFilter);
    }
    if (difficultyFilter) {
      const diffVal = parseInt(difficultyFilter);
      list = list.filter((q) => {
        if (diffVal === 400) return q.difficulty < 500;
        if (diffVal === 600) return q.difficulty >= 500 && q.difficulty < 700;
        if (diffVal === 700) return q.difficulty >= 700;
        return true;
      });
    }
    if (topicFilter) {
      list = list.filter((q) => q.topic.toLowerCase().includes(topicFilter.toLowerCase()));
    }
    if (searchQuery) {
      list = list.filter((q) => q.stem.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFiltered(list);
  };

  return (
    <div style={{ display: "flex", gap: "24px", minHeight: "calc(100vh - 120px)" }}>
      {/* Sidebar - list and filters */}
      <div style={{ width: "380px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Filter Card */}
        <div className="glass-card-static" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Filter size={16} style={{ color: "#3b82f6" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>Filters</h3>
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#64748b" }}>Search Question Text</label>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", borderRadius: "6px", padding: "6px 10px", marginTop: "4px" }}>
              <Search size={14} style={{ color: "#64748b", marginRight: "8px" }} />
              <input
                type="text"
                placeholder="Search stem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "transparent", border: "none", color: "#f1f5f9", outline: "none", fontSize: "12px", width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "#64748b" }}>Section</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "12px",
                  outline: "none",
                  marginTop: "4px",
                }}
              >
                <option value="">All Sections</option>
                <option value="QUANTITATIVE">Quantitative</option>
                <option value="VERBAL">Verbal</option>
                <option value="DATA_INSIGHTS">Data Insights</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#64748b" }}>Difficulty Band</label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "12px",
                  outline: "none",
                  marginTop: "4px",
                }}
              >
                <option value="">All Difficulties</option>
                <option value="400">Easy (&lt;500)</option>
                <option value="600">Medium (500-700)</option>
                <option value="700">Hard (700+)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#64748b" }}>Topic</label>
            <input
              type="text"
              placeholder="e.g. Algebra..."
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "12px",
                marginTop: "4px",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Question List */}
        <div className="glass-card-static" style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>Questions ({filtered.length})</h3>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelected(q)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: selected?.id === q.id ? "rgba(255,255,255,0.04)" : "transparent",
                  border: `1px solid ${selected?.id === q.id ? "var(--color-border-accent)" : "var(--color-border)"}`,
                  borderRadius: "8px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#94a3b8",
                  transition: "all var(--transition-fast)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, marginBottom: "6px" }}>
                  <span style={{ color: "#3b82f6" }}>{q.section}</span>
                  <span style={{ color: "#10b981" }}>Difficulty: {q.difficulty}</span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.stem}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "11px", color: "#64748b" }}>
                  <span>Topic: {q.topic}</span>
                  <ChevronRight size={14} style={{ opacity: selected?.id === q.id ? 1 : 0.4 }} />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", marginTop: "24px" }}>
                No questions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main detail view */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selected ? (
          <div className="glass-card-static" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", flex: 1 }}>
            {/* Header */}
            <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "4px 8px", borderRadius: "6px" }}>
                  {selected.section}
                </span>
                <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 700 }}>
                  Difficulty Scale: {selected.difficulty}
                </span>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginTop: "12px" }}>
                Question Viewer
              </h2>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Topic: {selected.topic} · Subtype: {selected.type.toLowerCase().replace("_", " ")}
              </div>
            </div>

            {/* Question Stem and Options */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <HelpCircle size={16} />
                Question
              </h3>
              <div className="glass" style={{ padding: "20px", borderRadius: "10px", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                {selected.stem}
              </div>
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selected.options?.map((opt) => (
                  <div 
                    key={opt.id}
                    className={`answer-option ${opt.id === selected.correctAnswer ? "correct" : ""}`}
                    style={{ cursor: "default", margin: 0 }}
                  >
                    <span className="answer-label" style={{
                      background: opt.id === selected.correctAnswer ? "var(--color-accent-success)" : "transparent",
                      borderColor: opt.id === selected.correctAnswer ? "var(--color-accent-success)" : "var(--color-border)",
                      color: opt.id === selected.correctAnswer ? "white" : "inherit"
                    }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "14px" }}>{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanations */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCheck size={16} />
                Explanation
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="glass" style={{ padding: "16px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>Step-by-Step Explanation</div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {selected.explanation?.stepByStep}
                  </div>
                </div>

                {selected.explanation?.fasterMethod && (
                  <div className="glass" style={{ padding: "16px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#10b981", marginBottom: "6px" }}>Faster / Alternative Method</div>
                    <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                      {selected.explanation?.fasterMethod}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card-static" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <Database size={48} style={{ color: "#3b82f6", marginBottom: "16px" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Select a Question</h2>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>Select a GMAT Focus question from the list on the left to review math/verbal explanations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
