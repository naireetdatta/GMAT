"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #1a1f35 0%, #0a0e1a 50%, #050810 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background orbs */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />

      {/* Navigation */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "16px",
              color: "white",
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#f1f5f9",
              letterSpacing: "-0.02em",
            }}
          >
            GMAT Focus
            <span style={{ color: "#3b82f6" }}> AI</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href="/auth/login"
            className="btn-ghost"
            style={{ textDecoration: "none" }}
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "80px 40px 40px",
          textAlign: "center",
        }}
      >
        <div
          className={mounted ? "animate-fade-in" : ""}
          style={{ opacity: mounted ? 1 : 0 }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "100px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#60a5fa",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#3b82f6",
                animation: "pulse-timer 2s infinite",
              }}
            />
            AI-Powered Adaptive Learning
          </div>

          <h1
            style={{
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#f1f5f9",
              marginBottom: "24px",
              maxWidth: "900px",
              margin: "0 auto 24px",
            }}
          >
            Master the{" "}
            <span className="text-gradient">GMAT Focus Edition</span> with AI
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.7,
              color: "#94a3b8",
              maxWidth: "620px",
              margin: "0 auto 40px",
            }}
          >
            Realistic exam simulation, adaptive testing, AI-generated questions,
            personalized tutoring, and intelligent analytics — all in one
            platform.
          </p>

          <div
            style={{
              display: "flex",
              gap: "14px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/auth/register"
              className="btn-primary"
              style={{
                textDecoration: "none",
                padding: "14px 36px",
                fontSize: "16px",
              }}
            >
              Start Preparing — Free
            </Link>
            <Link
              href="/exam/demo"
              className="btn-secondary"
              style={{
                textDecoration: "none",
                padding: "14px 36px",
                fontSize: "16px",
              }}
            >
              Try Demo Exam →
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div
          className={mounted ? "animate-slide-up" : ""}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginTop: "80px",
            opacity: mounted ? 1 : 0,
            animationDelay: "0.2s",
          }}
        >
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: "28px 24px",
                textAlign: "left",
                animationDelay: `${0.1 * i}s`,
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  background: feature.gradient,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#f1f5f9",
                  marginBottom: "8px",
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "#94a3b8",
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Score Range */}
        <div
          style={{
            marginTop: "80px",
            padding: "40px",
          }}
          className="glass-card-static"
        >
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#f1f5f9",
              marginBottom: "8px",
            }}
          >
            GMAT Focus Edition Format
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#94a3b8",
              marginBottom: "32px",
            }}
          >
            Total Score: 205 – 805 · Section Scores: 60 – 90 · 64 Questions ·
            2h 15min
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
            }}
          >
            {sections.map((section, i) => (
              <div
                key={i}
                style={{
                  padding: "24px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    background: section.gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "4px",
                  }}
                >
                  {section.questions}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "12px",
                  }}
                >
                  questions · {section.time}
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#f1f5f9",
                    marginBottom: "8px",
                  }}
                >
                  {section.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    lineHeight: 1.5,
                  }}
                >
                  {section.topics}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: "80px",
            paddingBottom: "40px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          <p>
            GMAT Focus AI is an independent preparation platform. Not affiliated
            with GMAC.
          </p>
          <p style={{ marginTop: "4px" }}>
            All questions are AI-generated originals. © 2026 GMAT Focus AI.
          </p>
        </footer>
      </main>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }
      `}</style>
    </div>
  );
}

const features = [
  {
    icon: "📝",
    title: "Realistic Exam Simulation",
    description:
      "Full GMAT Focus Edition experience with timer, navigator, review screen, calculator, and section-adaptive difficulty.",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
  },
  {
    icon: "🧠",
    title: "Adaptive Testing (IRT)",
    description:
      "Item Response Theory with Bayesian estimation adapts question difficulty in real-time to your ability level.",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))",
  },
  {
    icon: "🤖",
    title: "AI-Generated Questions",
    description:
      "Unlimited unique, validated questions generated by AI. Every question has detailed step-by-step explanations.",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))",
  },
  {
    icon: "💬",
    title: "AI Tutor",
    description:
      "Personal AI tutor that knows your strengths, weaknesses, and learning history. Ask anything, anytime.",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
  },
  {
    icon: "📊",
    title: "Smart Analytics",
    description:
      "Accuracy heatmaps, score predictions, topic breakdowns, time analysis, and personalized coach reports.",
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))",
  },
  {
    icon: "🗂️",
    title: "Flashcards & Mistake Book",
    description:
      "Auto-generated flashcards with spaced repetition. Mistake book tracks and categorizes every error.",
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
  },
  {
    icon: "📅",
    title: "Study Planner",
    description:
      "AI generates daily, weekly, and monthly study plans dynamically adjusted to your progress and goals.",
    gradient: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))",
  },
  {
    icon: "🎯",
    title: "Adaptive Retests",
    description:
      "Personalized retests targeting your weak topics and difficulty levels. No repeated questions.",
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))",
  },
];

const sections = [
  {
    name: "Quantitative Reasoning",
    questions: 21,
    time: "45 min",
    topics: "Arithmetic · Algebra · Number Properties · Ratios · Percentages · Statistics · Word Problems",
    gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  },
  {
    name: "Verbal Reasoning",
    questions: 23,
    time: "45 min",
    topics: "Reading Comprehension · Critical Reasoning (Assumptions, Inference, Strengthen, Weaken, Evaluate)",
    gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
  },
  {
    name: "Data Insights",
    questions: 20,
    time: "45 min",
    topics: "Data Sufficiency · Table Analysis · Multi-Source Reasoning · Graphics Interpretation · Two-Part Analysis",
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
  },
];
