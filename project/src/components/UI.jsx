import { T } from '../lib/styles';

export function Notification({ note }) {
  if (!note) return null;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, background: note.type === "warning" ? "#5c2a00" : note.type === "danger" ? "#7a1c2e" : "#1b4332", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, maxWidth: 320 }}>
      {note.msg}
    </div>
  );
}

export function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ ...T.card, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{title}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ msg, onConfirm, onCancel, danger }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "1rem" }}>
      <div style={{ ...T.card, width: "100%", maxWidth: 360, padding: "1.5rem" }}>
        <p style={{ margin: "0 0 1.25rem", fontSize: 14, color: "#333", lineHeight: 1.6 }}>{msg}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={T.btn("ghost")}>Cancel</button>
          <button onClick={onConfirm} style={T.btn(danger ? "danger" : "primary")}>{danger ? "Confirm" : "OK"}</button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={T.label}>{label}</label>
      {children}
    </div>
  );
}
