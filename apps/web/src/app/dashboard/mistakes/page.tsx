"use client";

import { useState, useEffect } from "react";
import { 
  BookOpen, Sparkles, Filter, AlertCircle, FileText, CheckCircle, HelpCircle, FileCheck, Edit, ArrowRight
} from "lucide-react";

enum ErrorType {
  CONCEPTUAL = "CONCEPTUAL",
  CALCULATION = "CALCULATION",
  READING = "READING",
  TIME_PRESSURE = "TIME_PRESSURE",
  CARELESS = "CARELESS",
}

interface Question {
  stem: string;
  options: { id: string; label: string; text: string }[];
  correctAnswer: string;
  explanation: {
    stepByStep: string;
    fasterMethod?: string;
    alternativeMethod?: string;
    wrongOptionExplanations: Record<string, string>;
  };
}

interface MistakeEntry {
  id: string;
  questionId: string;
  errorType: ErrorType;
  notes: string;
  tags: string[];
  section: string;
  topic: string;
  difficulty: number;
  question: Question;
}

export default function MistakesPage() {
  const [entries, setEntries] = useState<MistakeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<MistakeEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MistakeEntry | null>(null);
  const [flashcardGeneratingId, setFlashcardGeneratingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [sectionFilter, setSectionFilter] = useState("");
  const [errorFilter, setErrorFilter] = useState("");

  // Update note form
  const [notesInput, setNotesInput] = useState("");
  const [selectedErrorType, setSelectedErrorType] = useState<ErrorType>(ErrorType.CONCEPTUAL);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, sectionFilter, errorFilter]);

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/v1/mistakes");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const applyFilters = () => {
    let list = [...entries];
    if (sectionFilter) {
      list = list.filter((e) => e.section === sectionFilter);
    }
    if (errorFilter) {
      list = list.filter((e) => e.errorType === errorFilter);
    }
    setFilteredEntries(list);
  };

  const handleGenerateFlashcard = async (mistakeId: string) => {
    setFlashcardGeneratingId(mistakeId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/v1/flashcards/generate-from-mistake/${mistakeId}`, {
        method: "POST",
      });
      if (res.ok) {
        setStatusMessage("✨ Flashcard generated and added to your deck!");
      } else {
        setStatusMessage("⚠️ Failed to generate card. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("⚠️ Failed to connect to server.");
    } finally {
      setFlashcardGeneratingId(null);
    }
  };

  const handleSelectEntry = (entry: MistakeEntry) => {
    setSelectedEntry(entry);
    setNotesInput(entry.notes || "");
    setSelectedErrorType(entry.errorType);
    setStatusMessage(null);
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setUpdatingId(selectedEntry.id);

    try {
      const res = await fetch(`/api/v1/mistakes/${selectedEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesInput,
          errorType: selectedErrorType,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Update local list state
        setEntries(entries.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
        setSelectedEntry({ ...selectedEntry, ...updated });
        setStatusMessage("✅ Notes saved successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const errorLabels = {
    [ErrorType.CONCEPTUAL]: { label: "Conceptual Error", color: "rgba(239, 68, 68, 0.15)", border: "#ef4444" },
    [ErrorType.CALCULATION]: { label: "Calculation Error", color: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" },
    [ErrorType.READING]: { label: "Reading Comprehension Gap", color: "rgba(139, 92, 246, 0.15)", border: "#8b5cf6" },
    [ErrorType.TIME_PRESSURE]: { label: "Pacing/Time Pressure", color: "rgba(6, 182, 212, 0.15)", border: "#06b6d4" },
    [ErrorType.CARELESS]: { label: "Careless Slip", color: "rgba(16, 185, 129, 0.15)", border: "#10b981" },
  };

  return (
    <div style={{ display: "flex", gap: "24px", minHeight: "calc(100vh - 120px)" }}>
      {/* Sidebar Filters & Entries */}
      <div style={{ width: "380px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Filter Card */}
        <div className="glass-card-static" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Filter size={16} style={{ color: "#3b82f6" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>Filters</h3>
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
              <label style={{ fontSize: "11px", color: "#64748b" }}>Error Type</label>
              <select
                value={errorFilter}
                onChange={(e) => setErrorFilter(e.target.value)}
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
                <option value="">All Errors</option>
                {(Object.keys(errorLabels) as ErrorType[]).map((err) => (
                  <option key={err} value={err}>
                    {errorLabels[err].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="glass-card-static" style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>Mistakes ({filteredEntries.length})</h3>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleSelectEntry(entry)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: selectedEntry?.id === entry.id ? "rgba(255,255,255,0.04)" : "transparent",
                  border: `1px solid ${selectedEntry?.id === entry.id ? "var(--color-border-accent)" : "var(--color-border)"}`,
                  borderRadius: "8px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#94a3b8",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, marginBottom: "6px" }}>
                  <span style={{ color: "#3b82f6" }}>{entry.section}</span>
                  <span style={{ color: "#f59e0b" }}>Diff: {entry.difficulty}</span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.question?.stem || "GMAT Question"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                  <span style={{ 
                    fontSize: "9px", 
                    padding: "2px 6px", 
                    borderRadius: "6px", 
                    background: errorLabels[entry.errorType]?.color, 
                    border: `1px solid ${errorLabels[entry.errorType]?.border}`,
                    color: errorLabels[entry.errorType]?.border 
                  }}>
                    {errorLabels[entry.errorType]?.label}
                  </span>
                  <ChevronRight size={14} style={{ opacity: selectedEntry?.id === entry.id ? 1 : 0.4 }} />
                </div>
              </button>
            ))}
            {filteredEntries.length === 0 && (
              <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", marginTop: "24px" }}>
                No mistake entries found matching filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Panel - Detail view and notes editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedEntry ? (
          <div className="glass-card-static" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", flex: 1 }}>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "4px 8px", borderRadius: "6px", textTransform: "uppercase" }}>
                  {selectedEntry.section}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginLeft: "10px" }}>
                  Topic: {selectedEntry.topic}
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginTop: "10px" }}>
                  Mistake Review
                </h2>
              </div>

              {/* Generate Flashcard Button */}
              <button
                onClick={() => handleGenerateFlashcard(selectedEntry.id)}
                disabled={flashcardGeneratingId !== null}
                className="btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--gradient-success)" }}
              >
                <Sparkles size={16} />
                <span>{flashcardGeneratingId ? "Generating..." : "Generate AI Flashcard"}</span>
              </button>
            </div>

            {/* Notification alert */}
            {statusMessage && (
              <div className="glass" style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--color-border-accent)", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                <AlertCircle size={16} style={{ color: "#3b82f6" }} />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Question Stem and Options */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <HelpCircle size={16} />
                Question Stem
              </h3>
              <div className="glass" style={{ padding: "20px", borderRadius: "10px", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                {selectedEntry.question?.stem}
              </div>
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedEntry.question?.options?.map((opt) => (
                  <div 
                    key={opt.id}
                    className={`answer-option ${opt.id === selectedEntry.question?.correctAnswer ? "correct" : ""}`}
                    style={{ cursor: "default", margin: 0 }}
                  >
                    <span className="answer-label" style={{
                      background: opt.id === selectedEntry.question?.correctAnswer ? "var(--color-accent-success)" : "transparent",
                      borderColor: opt.id === selectedEntry.question?.correctAnswer ? "var(--color-accent-success)" : "var(--color-border)",
                      color: opt.id === selectedEntry.question?.correctAnswer ? "white" : "inherit"
                    }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "14px" }}>{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanations block */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCheck size={16} />
                Answer Explanations
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="glass" style={{ padding: "16px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>Step-by-Step Explanation</div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {selectedEntry.question?.explanation?.stepByStep}
                  </div>
                </div>

                {selectedEntry.question?.explanation?.fasterMethod && (
                  <div className="glass" style={{ padding: "16px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#10b981", marginBottom: "6px" }}>Faster / Alternative Method</div>
                    <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                      {selectedEntry.question?.explanation?.fasterMethod}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes and Error Type Form */}
            <form onSubmit={handleUpdateEntry} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Edit size={16} />
                  My Analysis & Notes
                </h3>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginRight: "10px" }}>Error Category:</label>
                  <select
                    value={selectedErrorType}
                    onChange={(e) => setSelectedErrorType(e.target.value as ErrorType)}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      color: "#f1f5f9",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    {(Object.keys(errorLabels) as ErrorType[]).map((err) => (
                      <option key={err} value={err}>
                        {errorLabels[err].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                rows={4}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Write down what went wrong... e.g. Missed the fact that x could be negative, or made a simple algebra division slip."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  outline: "none",
                  fontSize: "14px",
                  resize: "none",
                }}
              />

              <button
                type="submit"
                disabled={updatingId !== null}
                className="btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-end" }}
              >
                <span>{updatingId ? "Saving..." : "Save Analysis"}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card-static" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <BookOpen size={48} style={{ color: "#3b82f6", marginBottom: "16px" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Select an Entry</h2>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>Select a question mistake from the list on the left to review explanations and write notes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
