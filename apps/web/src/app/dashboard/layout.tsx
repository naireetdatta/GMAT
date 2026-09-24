"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    section: "Prepare",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/dashboard/exams", label: "Practice Exams", icon: "📝" },
      { href: "/dashboard/questions", label: "Question Bank", icon: "❓" },
    ],
  },
  {
    section: "Learn",
    items: [
      { href: "/dashboard/tutor", label: "AI Tutor", icon: "🤖" },
      { href: "/dashboard/flashcards", label: "Flashcards", icon: "🗂️" },
      { href: "/dashboard/mistakes", label: "Mistake Book", icon: "📕" },
    ],
  },
  {
    section: "Track",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
      { href: "/dashboard/study-plan", label: "Study Plan", icon: "📅" },
      { href: "/dashboard/reports", label: "Coach Reports", icon: "🎯" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      {/* Sidebar */}
      <aside
        className="sidebar"
        style={{
          width: sidebarOpen ? "260px" : "72px",
          transition: "width var(--transition-base)",
        }}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "14px",
              color: "white",
              flexShrink: 0,
            }}
          >
            G
          </div>
          {sidebarOpen && (
            <span
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#f1f5f9",
                whiteSpace: "nowrap",
              }}
            >
              GMAT Focus <span style={{ color: "#3b82f6" }}>AI</span>
            </span>
          )}
        </div>

        {/* Quick Exam Button */}
        <div style={{ padding: "12px" }}>
          <Link
            href="/exam/new"
            className="btn-primary"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "10px",
              fontSize: "13px",
            }}
          >
            {sidebarOpen ? "⚡ Start Exam" : "⚡"}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((group) => (
            <div key={group.section}>
              {sidebarOpen && (
                <div className="sidebar-section-title">{group.section}</div>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${
                    pathname === item.href ? "active" : ""
                  }`}
                  style={{ textDecoration: "none" }}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div
          style={{
            padding: "12px",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {sidebarOpen ? "← Collapse" : "→"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: sidebarOpen ? "260px" : "72px",
          transition: "margin-left var(--transition-base)",
          padding: "24px 32px",
          minHeight: "100vh",
          background: "var(--gradient-bg)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
