"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, CheckSquare, Square, Target, Hourglass, ArrowRight, BookOpen, AlertCircle, Plus, Check
} from "lucide-react";

interface StudyTask {
  type: "practice" | "review" | "flashcards" | "tutor" | "mock";
  topic: string;
  section: string;
  description: string;
  durationMinutes: number;
  priority: "high" | "medium" | "low";
}

interface StudyDay {
  day: number;
  date: string;
  estimatedHours: number;
  tasks: StudyTask[];
}

interface StudyPlan {
  id: string;
  currentScore: number;
  targetScore: number;
  examDate: string;
  hoursPerDay: number;
  plan: StudyDay[];
}

export default function StudyPlanPage() {
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup form states
  const [currentScore, setCurrentScore] = useState(555);
  const [targetScore, setTargetScore] = useState(705);
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  // Completed task ids to simulate checking off tasks locally
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  useEffect(() => {
    fetchActivePlan();
  }, []);

  const fetchActivePlan = async () => {
    try {
      const res = await fetch("/api/v1/study-plan/active");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        setActivePlan(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentScore,
          targetScore,
          examDate,
          hoursPerDay,
        }),
      });

      if (res.ok) {
        const text = await res.text();
        const newPlan = text ? JSON.parse(text) : null;
        setActivePlan(newPlan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = (taskId: string) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter((id) => id !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
        <div style={{ height: "40px", width: "200px" }} className="skeleton" />
        <div style={{ height: "240px" }} className="skeleton" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ height: "300px" }} className="skeleton" />
          <div style={{ height: "300px" }} className="skeleton" />
        </div>
      </div>
    );
  }

  const taskTypeIcons = {
    practice: "🎯",
    review: "📖",
    flashcards: "⚡",
    tutor: "🤖",
    mock: "📝",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
          Study Planner
        </h1>
        <p style={{ fontSize: "14px", color: "#94a3b8" }}>
          Your personalized, adaptive path to hitting your target GMAT Focus score.
        </p>
      </div>

      {!activePlan ? (
        /* Configuration wizard */
        <div className="glass-card-static animate-scale-in" style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <Calendar size={48} style={{ color: "#3b82f6", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9" }}>Build Study Program</h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
              Formulate a structured daily timetable mapped directly to your deadline and scores.
            </p>
          </div>

          <form onSubmit={handleCreatePlan} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Current Score Band (205-805)</label>
                <input
                  type="number"
                  required
                  min={205}
                  max={805}
                  value={currentScore}
                  onChange={(e) => setCurrentScore(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "6px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Target Score (205-805)</label>
                <input
                  type="number"
                  required
                  min={205}
                  max={805}
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "6px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Exam Target Date</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "6px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Hours / Day Study</label>
                <input
                  type="number"
                  required
                  step={0.5}
                  min={0.5}
                  max={12}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "6px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary animate-glow"
              style={{ width: "100%", padding: "12px", marginTop: "10px", fontSize: "14px" }}
            >
              {submitting ? "Formulating Program..." : "✨ Formulate Study Program"}
            </button>
          </form>
        </div>
      ) : (
        /* Active calendar view */
        <div style={{ display: "flex", gap: "24px" }}>
          {/* Left details panel */}
          <div style={{ width: "300px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="glass-card-static" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>Goal Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>Score Gap:</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>
                    {activePlan.currentScore} <ArrowRight size={12} style={{ display: "inline", margin: "0 4px" }} /> {activePlan.targetScore}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>Pace Constraint:</span>
                  <span style={{ fontSize: "13px", color: "#fff", fontWeight: 600 }}>{activePlan.hoursPerDay} hrs/day</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>Deadline:</span>
                  <span style={{ fontSize: "13px", color: "#fff", fontWeight: 600 }}>
                    {new Date(activePlan.examDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActivePlan(null)}
                className="btn-secondary" 
                style={{ width: "100%", marginTop: "20px", padding: "8px", fontSize: "12px" }}
              >
                Reset & Create New Plan
              </button>
            </div>
          </div>

          {/* Right tasks lists */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Study Schedule</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {activePlan.plan.map((day) => (
                <div key={day.day} className="glass-card-static" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "10px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#3b82f6" }}>Day {day.day}</span>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{new Date(day.date).toLocaleDateString()} · {day.estimatedHours} hrs study</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {day.tasks.map((task, taskIdx) => {
                      const taskId = `${day.day}-${taskIdx}`;
                      const isDone = completedTasks.includes(taskId);

                      return (
                        <div 
                          key={taskIdx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            background: isDone ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                            opacity: isDone ? 0.6 : 1,
                            transition: "all var(--transition-fast)"
                          }}
                        >
                          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                            <button
                              onClick={() => toggleTask(taskId)}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: isDone ? "#10b981" : "#64748b",
                                marginTop: "2px",
                              }}
                            >
                              {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>{taskTypeIcons[task.type]} {task.topic}</span>
                                <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", textTransform: "uppercase" }}>
                                  {task.section.replace("_", " ")}
                                </span>
                              </div>
                              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>{task.description}</p>
                            </div>
                          </div>
                          <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 500 }}>{task.durationMinutes} mins</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
