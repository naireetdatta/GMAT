"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Lock, Eye, EyeOff, Bot } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Save token to localStorage for fetch authorization headers
        localStorage.setItem("gmat_jwt_token", data.accessToken);
        router.push("/dashboard");
      } else {
        const errData = await res.json();
        setError(errData.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", background: "var(--gradient-bg)" }}>
      <div className="glass-card-static animate-scale-in" style={{ padding: "40px 32px", width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "var(--gradient-primary)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: "20px",
            color: "white",
            margin: "0 auto 16px"
          }}>
            G
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>Sign in to continue your GMAT Focus prep.</p>
        </div>

        {error && (
          <div className="glass" style={{ padding: "12px 14px", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", color: "#94a3b8" }}>Email Address</label>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px 14px", marginTop: "6px" }}>
              <Mail size={16} style={{ color: "#64748b", marginRight: "10px" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ background: "transparent", border: "none", color: "#f1f5f9", outline: "none", fontSize: "14px", width: "100%" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", color: "#94a3b8" }}>Password</label>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px 14px", marginTop: "6px" }}>
              <Lock size={16} style={{ color: "#64748b", marginRight: "10px" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ background: "transparent", border: "none", color: "#f1f5f9", outline: "none", fontSize: "14px", width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary animate-glow"
            style={{ width: "100%", padding: "12px", fontSize: "14px", marginTop: "8px" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "center", fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
          <span>Don't have an account? </span>
          <Link href="/auth/register" style={{ color: "#3b82f6", textDecoration: "none", marginLeft: "4px", fontWeight: 600 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
