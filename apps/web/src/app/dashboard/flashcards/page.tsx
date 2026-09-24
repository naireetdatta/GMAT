"use client";

import { useState, useEffect } from "react";
import { 
  Layers, Brain, Plus, Check, Clock, Sparkles, RefreshCw, AlertCircle, ChevronRight, X
} from "lucide-react";

enum FlashcardType {
  CONCEPT = "CONCEPT",
  FORMULA = "FORMULA",
  STRATEGY = "STRATEGY",
  TRAP = "TRAP",
  VOCABULARY = "VOCABULARY",
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  type: FlashcardType;
  box: number;
  nextReview: string;
}

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [activeReviewIndex, setActiveReviewIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [type, setType] = useState<FlashcardType>(FlashcardType.CONCEPT);
  const [section, setSection] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    fetchCards();
    fetchDueCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch("/api/v1/flashcards");
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDueCards = async () => {
    try {
      const res = await fetch("/api/v1/flashcards/due");
      if (res.ok) {
        const data = await res.json();
        setDueCards(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    try {
      const res = await fetch("/api/v1/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front,
          back,
          type,
          section: section || undefined,
          topic: topic || undefined,
        }),
      });

      if (res.ok) {
        const newCard = await res.json();
        setCards([newCard, ...cards]);
        fetchDueCards();
        setFront("");
        setBack("");
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReview = async (quality: number) => {
    if (activeReviewIndex === null || dueCards.length === 0) return;

    const currentCard = dueCards[activeReviewIndex];
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/flashcards/${currentCard.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });

      if (res.ok) {
        // Move to next card or end review
        setIsFlipped(false);
        setTimeout(() => {
          if (activeReviewIndex < dueCards.length - 1) {
            setActiveReviewIndex(activeReviewIndex + 1);
          } else {
            setActiveReviewIndex(null);
            fetchDueCards();
            fetchCards();
          }
          setLoading(false);
        }, 300);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const startReviewSession = () => {
    if (dueCards.length > 0) {
      setActiveReviewIndex(0);
      setIsFlipped(false);
    }
  };

  const boxColors = [
    "#ef4444", // Box 1: Red
    "#f59e0b", // Box 2: Orange
    "#3b82f6", // Box 3: Blue
    "#8b5cf6", // Box 4: Purple
    "#10b981", // Box 5: Green
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>
            Flashcards
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8" }}>
            Master core GMAT formulas, rules, and trap patterns using SM-2 spaced repetition.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary" 
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={16} />
          <span>New Flashcard</span>
        </button>
      </div>

      {/* Review Banner */}
      {activeReviewIndex === null ? (
        <div className="glass-card-static" style={{ padding: "32px", textAlign: "center", marginBottom: "28px", background: "var(--gradient-glass)" }}>
          <Brain size={48} style={{ color: "#8b5cf6", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9" }}>Due for Review</h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px", marginBottom: "20px" }}>
            You have <strong style={{ color: "#fff" }}>{dueCards.length}</strong> flashcards scheduled for review.
          </p>
          <button
            onClick={startReviewSession}
            disabled={dueCards.length === 0}
            className="btn-primary animate-glow"
            style={{ padding: "12px 32px", background: "var(--gradient-primary)", opacity: dueCards.length === 0 ? 0.5 : 1 }}
          >
            🚀 Start Review Session
          </button>
        </div>
      ) : (
        /* Review Mode */
        <div className="glass-card-static" style={{ padding: "40px 24px", maxWidth: "600px", margin: "0 auto 32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", fontSize: "13px", color: "#94a3b8" }}>
            <span>Reviewing Card {activeReviewIndex + 1} of {dueCards.length}</span>
            <button 
              onClick={() => setActiveReviewIndex(null)}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
            >
              Cancel Review
            </button>
          </div>

          {/* 3D Flashcard */}
          <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)} style={{ cursor: "pointer" }}>
            <div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
              {/* Front side */}
              <div className="flashcard-front">
                <div style={{ fontSize: "11px", textTransform: "uppercase", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "20px", marginBottom: "16px", fontWeight: 700 }}>
                  {dueCards[activeReviewIndex]?.type}
                </div>
                <div style={{ fontSize: "18px", wordBreak: "break-word" }}>
                  {dueCards[activeReviewIndex]?.front}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginTop: "24px", fontStyle: "italic" }}>
                  Click card to flip
                </div>
              </div>

              {/* Back side */}
              <div className="flashcard-back">
                <div style={{ fontSize: "11px", textTransform: "uppercase", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: "20px", marginBottom: "16px", fontWeight: 700, color: "#8b5cf6" }}>
                  Solution / Concept
                </div>
                <div style={{ fontSize: "15px", whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
                  {dueCards[activeReviewIndex]?.back}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "24px", fontStyle: "italic" }}>
                  Click card to flip back
                </div>
              </div>
            </div>
          </div>

          {/* Feedback buttons */}
          {isFlipped && (
            <div style={{ marginTop: "32px", display: "flex", gap: "10px", width: "100%", justifyContent: "center" }} className="animate-fade-in">
              <button 
                onClick={() => handleReview(1)}
                disabled={loading}
                className="btn-secondary" 
                style={{ flex: 1, borderColor: "#ef4444", color: "#ef4444", background: "rgba(239, 68, 68, 0.05)", padding: "12px" }}
              >
                Again ❌
              </button>
              <button 
                onClick={() => handleReview(2)}
                disabled={loading}
                className="btn-secondary" 
                style={{ flex: 1, borderColor: "#f59e0b", color: "#f59e0b", background: "rgba(245, 158, 11, 0.05)", padding: "12px" }}
              >
                Hard ⚠️
              </button>
              <button 
                onClick={() => handleReview(4)}
                disabled={loading}
                className="btn-secondary" 
                style={{ flex: 1, borderColor: "#3b82f6", color: "#3b82f6", background: "rgba(59, 130, 246, 0.05)", padding: "12px" }}
              >
                Good 👍
              </button>
              <button 
                onClick={() => handleReview(5)}
                disabled={loading}
                className="btn-secondary" 
                style={{ flex: 1, borderColor: "#10b981", color: "#10b981", background: "rgba(16, 185, 129, 0.05)", padding: "12px" }}
              >
                Easy 💎
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats and Deck Overview */}
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>Your Flashcard Deck</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {cards.map((card) => (
          <div key={card.id} className="glass-card-static" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "180px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", color: "#94a3b8" }}>
                {card.type}
              </span>
              <span style={{ 
                fontSize: "10px", 
                fontWeight: 700, 
                padding: "2px 8px", 
                borderRadius: "10px", 
                background: boxColors[card.box - 1], 
                color: "#0a0e1a" 
              }}>
                Box {card.box}
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", flex: 1 }}>
              {card.front}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "12px", borderTop: "1px solid var(--color-border)", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
              <span>Next review:</span>
              <span style={{ color: new Date(card.nextReview).getTime() <= Date.now() ? "#f59e0b" : "#64748b" }}>
                {new Date(card.nextReview).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "#64748b" }}>
            No cards created yet. Click "New Flashcard" above to make your first space-repetition card!
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card-static animate-scale-in" style={{ padding: "32px", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Add Flashcard</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8" }}>Card Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as FlashcardType)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                >
                  <option value={FlashcardType.CONCEPT}>Concept Card</option>
                  <option value={FlashcardType.FORMULA}>Formula</option>
                  <option value={FlashcardType.STRATEGY}>Strategy</option>
                  <option value={FlashcardType.TRAP}>Trap Recognition</option>
                  <option value={FlashcardType.VOCABULARY}>Vocabulary</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8" }}>Front (Question/Formula name)</label>
                <textarea
                  rows={2}
                  required
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="e.g. Formula for Area of Equilateral Triangle"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8" }}>Back (Answer/Explanation)</label>
                <textarea
                  rows={4}
                  required
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="e.g. A = (sqrt(3)/4) * s^2"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8" }}>Section (optional)</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="QUANTITATIVE"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      color: "#f1f5f9",
                      fontSize: "14px",
                      marginTop: "4px",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8" }}>Topic (optional)</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Algebra"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      color: "#f1f5f9",
                      fontSize: "14px",
                      marginTop: "4px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: "100%", marginTop: "10px" }}
              >
                Create Flashcard
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
