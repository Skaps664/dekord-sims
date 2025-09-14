"use client"

import React, { useEffect, useState } from "react"

const CORRECT_USERNAME = "skaps"
const CORRECT_PASSWORD = "YOutuber123!@#"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("dekord_auth")
      if (s === "true") setAuthenticated(true)
    } catch (e) {
      // ignore sessionStorage errors
    }
  }, [])

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
      try {
        sessionStorage.setItem("dekord_auth", "true")
      } catch (e) {
        // ignore
      }
      setAuthenticated(true)
    } else {
      setError("Invalid username or password")
    }
  }

  if (authenticated) return <>{children}</>

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", zIndex: 9999 }}>
      <div style={{ width: 360, background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Welcome</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: "#444" }}>Please sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#333", marginBottom: 6 }}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#333", marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" }} />
          </div>
          {error ? <div style={{ color: "#c0392b", marginBottom: 12 }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={{ flex: 1, padding: "8px 12px", background: "#0b74ff", color: "#fff", border: "none", borderRadius: 6 }}>Sign in</button>
            <button type="button" onClick={() => { setUsername(CORRECT_USERNAME); setPassword(CORRECT_PASSWORD); handleSubmit() }} style={{ padding: "8px 12px", border: "1px solid #ddd", background: "#fff", borderRadius: 6 }}>Auto-fill</button>
          </div>
        </form>
      </div>
    </div>
  )
}
