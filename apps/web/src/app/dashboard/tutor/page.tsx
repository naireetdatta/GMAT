"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bot, User, Sparkles, Send, Brain, GraduationCap, Compass, HelpCircle, LayoutGrid
} from "lucide-react";

enum TutorMode {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  EXPERT = "EXPERT",
  VISUAL = "VISUAL",
  COACH = "COACH",
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface TutorSession {
  id: string;
  mode: TutorMode;
  title: string;
  messages: Message[];
  startedAt: string;
}

export default function TutorPage() {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [activeSession, setActiveSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TutorMode>(TutorMode.INTERMEDIATE);
  const [sessionTitle, setSessionTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/v1/tutor/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          selectSession(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tutor sessions:", err);
    }
  };

  const selectSession = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/tutor/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const handleCreateSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/tutor/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          title: sessionTitle || `GMAT Focus Tutor — ${selectedMode.toLowerCase()}`,
        }),
      });

      if (res.ok) {
        const newSession = await res.json();
        setSessions([newSession, ...sessions]);
        setActiveSession(newSession);
        setMessages([]);
        setSessionTitle("");
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSession || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/tutor/sessions/${activeSession.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      if (res.ok) {
        const updatedSession = await res.json();
        setActiveSession(updatedSession);
        setMessages(updatedSession.messages || []);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
    }
  };

  const modeConfigs = {
    [TutorMode.BEGINNER]: {
      icon: <GraduationCap size={18} />,
      label: "Beginner",
      desc: "Step-by-step math setups & logical foundations",
      color: "rgba(59, 130, 246, 0.2)",
      borderColor: "#3b82f6",
    },
    [TutorMode.INTERMEDIATE]: {
      icon: <Compass size={18} />,
      label: "Intermediate",
      desc: "Pacing advice, elimination tips & formula shortcuts",
      color: "rgba(139, 92, 246, 0.2)",
      borderColor: "#8b5cf6",
    },
    [TutorMode.EXPERT]: {
      icon: <Brain size={18} />,
      label: "Expert Focus",
      desc: "Advanced logic analysis and 700+ sub-concept drills",
      color: "rgba(245, 158, 11, 0.2)",
      borderColor: "#f59e0b",
    },
    [TutorMode.VISUAL]: {
      icon: <LayoutGrid size={18} />,
      label: "Visual Block",
      desc: "Concept diagrams, formula layouts & structured charts",
      color: "rgba(6, 182, 212, 0.2)",
      borderColor: "#06b6d4",
    },
    [TutorMode.COACH]: {
      icon: <Sparkles size={18} />,
      label: "Personal Coach",
      desc: "Study habits, timing guides & stress management",
      color: "rgba(16, 185, 129, 0.2)",
      borderColor: "#10b981",
    },
  };

  // Helper to format text with LaTeX math blocks
  const renderMessageContent = (text: string) => {
    // Basic text parsing for headers, math, lists, bold elements
    const lines = text.split("\n");
    return lines.map((line, index) => {
      let content: React.ReactNode = line;

      // Handle simple bold formatting
      if (line.includes("**")) {
        const parts = line.split("**");
        content = parts.map((part, i) => (i % 2 === 1 ? <strong key={i} style={{ color: "#fff" }}>{part}</strong> : part));
      }

      // Handle bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={index} style={{ marginLeft: "20px", marginBottom: "4px", listStyleType: "disc" }}>
            {line.substring(2)}
          </li>
        );
      }

      // Handle LaTeX inline math approximation (e.g. $x^2 + y = 5$)
      if (line.includes("$")) {
        const parts = line.split("$");
        content = parts.map((part, i) => (
          i % 2 === 1 ? (
            <code key={i} style={{ 
              fontFamily: "var(--font-mono)", 
              background: "rgba(255,255,255,0.06)", 
              padding: "2px 6px", 
              borderRadius: "4px",
              color: "#60a5fa"
            }}>{part}</code>
          ) : part
        ));
      }

      // Headers
      if (line.startsWith("### ")) {
        return <h4 key={index} style={{ fontSize: "15px", fontWeight: 700, marginTop: "16px", marginBottom: "8px", color: "#fff" }}>{line.substring(4)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={index} style={{ fontSize: "17px", fontWeight: 700, marginTop: "20px", marginBottom: "10px", color: "#fff" }}>{line.substring(3)}</h3>;
      }

      return <p key={index} style={{ marginBottom: "8px", lineHeight: "1.6" }}>{content}</p>;
    });
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: "20px" }}>
      {/* Sidebar - past sessions and mode selector */}
      <div style={{ width: "320px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Create Session Card */}
        <div className="glass-card-static" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>New Tutor Session</h3>
          <div>
            <label style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Tutor Mode</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
              {(Object.keys(modeConfigs) as TutorMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${selectedMode === mode ? modeConfigs[mode].borderColor : "var(--color-border)"}`,
                    background: selectedMode === mode ? modeConfigs[mode].color : "transparent",
                    color: selectedMode === mode ? "#f1f5f9" : "#94a3b8",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {modeConfigs[mode].icon}
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>{modeConfigs[mode].label}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {modeConfigs[mode].desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "6px" }}>
            <input
              type="text"
              placeholder="Session Title (optional)..."
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#f1f5f9",
                outline: "none",
              }}
            />
          </div>

          <button 
            onClick={handleCreateSession}
            disabled={loading}
            className="btn-primary" 
            style={{ width: "100%", padding: "10px" }}
          >
            {loading ? "Creating..." : "✨ Start Session"}
          </button>
        </div>

        {/* Previous Sessions list */}
        <div className="glass-card-static" style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>Recent Sessions</h3>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: activeSession?.id === s.id ? "rgba(255,255,255,0.04)" : "transparent",
                  border: `1px solid ${activeSession?.id === s.id ? "var(--color-border-accent)" : "transparent"}`,
                  borderRadius: "8px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: activeSession?.id === s.id ? "#f1f5f9" : "#94a3b8",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: modeConfigs[s.mode]?.borderColor || "#3b82f6" 
                  }} />
                  <div style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", marginLeft: "16px" }}>
                  Mode: {s.mode.toLowerCase()}
                </div>
              </button>
            ))}
            {sessions.length === 0 && (
              <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", marginTop: "24px" }}>
                No active tutor sessions. Start one above!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="glass-card-static" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "24px" }}>
        {activeSession ? (
          <>
            {/* Header info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "16px", borderBottom: "1px solid var(--color-border)", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  padding: "8px",
                  borderRadius: "10px",
                  background: modeConfigs[activeSession.mode]?.color,
                  color: modeConfigs[activeSession.mode]?.borderColor
                }}>
                  <Bot size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9" }}>{activeSession.title}</h2>
                  <p style={{ fontSize: "12px", color: "#94a3b8" }}>Focus: GMAT Focus Exam Tutoring ({activeSession.mode.toLowerCase()} assistance)</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "16px" }}>
              {/* Welcome message */}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ padding: "8px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                  <Bot size={16} />
                </div>
                <div className="glass" style={{ padding: "12px 16px", maxWidth: "80%", fontSize: "14px", color: "#cbd5e1" }}>
                  <p>Hello! I am your AI GMAT Focus Edition Tutor. I am operating in <strong>{activeSession.mode.toLowerCase()} mode</strong>.</p>
                  <p style={{ marginTop: "6px" }}>How can I help you today? You can ask me to explain algebra equations, critical reasoning topics, or review specific traps.</p>
                </div>
              </div>

              {messages.map((m, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: "flex", 
                    gap: "12px", 
                    alignItems: "flex-start",
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    flexDirection: m.role === "user" ? "row-reverse" : "row"
                  }}
                >
                  <div style={{ 
                    padding: "8px", 
                    borderRadius: "50%", 
                    background: m.role === "user" ? "rgba(139, 92, 246, 0.1)" : "rgba(59, 130, 246, 0.1)",
                    color: m.role === "user" ? "#8b5cf6" : "#3b82f6"
                  }}>
                    {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div 
                    className="glass" 
                    style={{ 
                      padding: "14px 18px", 
                      maxWidth: "80%", 
                      fontSize: "14px", 
                      color: m.role === "user" ? "#f1f5f9" : "#cbd5e1",
                      background: m.role === "user" ? "rgba(139, 92, 246, 0.08)" : "var(--color-bg-glass)",
                      border: m.role === "user" ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid var(--color-border)"
                    }}
                  >
                    {renderMessageContent(m.content)}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ padding: "8px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                    <Bot size={16} />
                  </div>
                  <div className="glass" style={{ padding: "12px 16px", display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className="skeleton" style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
                    <span className="skeleton" style={{ width: "8px", height: "8px", borderRadius: "50%", animationDelay: "0.2s" }} />
                    <span className="skeleton" style={{ width: "8px", height: "8px", borderRadius: "50%", animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask me anything about GMAT Focus (${activeSession.mode.toLowerCase()} level)...`}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className="btn-primary" 
                style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <Brain size={48} style={{ color: "#3b82f6", marginBottom: "16px" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>Select or Start a Session</h2>
            <p style={{ fontSize: "14px", textAlign: "center", maxWidth: "340px" }}>
              Please select an existing session from the list, or choose a tutor mode and start a new session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
