export const T = {
  root: { minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#1a1a1a" },
  card: { background: "#fff", borderRadius: 16, border: "1px solid #e8e6e0", padding: "1.5rem" },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 4, display: "block" },
  input: { width: "100%", padding: "9px 14px", border: "1.5px solid #e8e6e0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fafaf8", color: "#1a1a2e", fontFamily: "inherit" },
  select: { padding: "8px 14px", border: "1px solid #e8e6e0", borderRadius: 10, fontSize: 13, background: "#fff", cursor: "pointer", color: "#1a1a2e", fontFamily: "inherit" },
  btn: (v = "ghost") => ({
    padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid", fontFamily: "inherit",
    ...(v === "primary" ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" } :
        v === "success" ? { background: "#1b4332", color: "#fff", borderColor: "#1b4332" } :
        v === "danger"  ? { background: "#fff0f3", color: "#e94560", borderColor: "#e9456033" } :
        v === "warning" ? { background: "#fff8ee", color: "#a05800", borderColor: "#fac77555" } :
                          { background: "#fff", color: "#555", borderColor: "#e8e6e0" }),
  }),
  pill: (bg, color, border) => ({ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: bg, color, border: `1px solid ${border || "transparent"}` }),
  sideNav: { width: 220, flexShrink: 0, background: "#fff", borderRight: "1px solid #e8e6e0", minHeight: "100vh", padding: "1.5rem 0", display: "flex", flexDirection: "column" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#1a1a2e" : "#888", cursor: "pointer", background: active ? "#f5f4f0" : "transparent", borderLeft: active ? "3px solid #1a1a2e" : "3px solid transparent", transition: "all 0.15s" }),
};
