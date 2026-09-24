import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FetchInterceptor from "../components/FetchInterceptor";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GMAT Focus AI — Intelligent GMAT Preparation Platform",
  description:
    "AI-powered GMAT Focus Edition preparation with adaptive testing, personalized tutoring, and realistic exam simulation. Master Quantitative, Verbal, and Data Insights sections.",
  keywords: [
    "GMAT",
    "GMAT Focus Edition",
    "GMAT preparation",
    "adaptive testing",
    "AI tutor",
    "exam simulation",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <FetchInterceptor />
        {children}
      </body>
    </html>
  );
}
