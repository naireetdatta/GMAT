"use client";

import { useEffect } from "react";

export default function FetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const token = localStorage.getItem("gmat_jwt_token");
      
      // If we have a token and the url is relative or matches the API path
      if (token && typeof input === "string" && (input.startsWith("/api/v1") || input.startsWith("http://localhost:3000/api/v1"))) {
        init = init || {};
        init.headers = init.headers || {};
        
        if (init.headers instanceof Headers) {
          if (!init.headers.has("Authorization")) {
            init.headers.set("Authorization", `Bearer ${token}`);
          }
        } else if (Array.isArray(init.headers)) {
          const hasAuth = init.headers.some(([key]) => key.toLowerCase() === "authorization");
          if (!hasAuth) {
            init.headers.push(["Authorization", `Bearer ${token}`]);
          }
        } else {
          const headersRecord = init.headers as Record<string, string>;
          if (!headersRecord["Authorization"] && !headersRecord["authorization"]) {
            headersRecord["Authorization"] = `Bearer ${token}`;
          }
        }
      }
      
      return originalFetch(input, init);
    };
  }, []);

  return null;
}
