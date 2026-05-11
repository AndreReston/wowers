import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { T } from '../lib/styles';
import { Field } from '../components/UI';
import { ROLES, COURSES, YEAR_LEVELS, ROLE_META } from '../lib/constants';

export default function AuthScreen({ onBack }) {
  const { signIn, signUp, fetchProfile } = useAuth();
  const [mode, setMode] = useState("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({ name: "", email: "", password: "", role: "Student", course: "BSIT", year: "1st Year" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn(loginData.email, loginData.password);
    } catch (e) {
      setError(e.message === "Invalid login credentials" ? "Invalid email or password." : e.message);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError("");
    if (!regData.name || !regData.email || !regData.password) { setError("All fields are required."); return; }
    if (regData.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const result = await signUp(regData.email, regData.password, {
        name: regData.name, role: regData.role, course: regData.course, year: regData.year,
      });
      const authUser = result?.user;
      if (authUser) {
        const initials = regData.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authUser.id,
          name: regData.name,
          email: regData.email,
          role: regData.role,
          status: regData.role === "Applicant" ? "Pending" : "Active",
          avatar: initials,
          course: regData.course,
          year: regData.year,
          section: "",
        });
        if (profileError) {
          setError("Account created but profile setup failed: " + profileError.message);
        } else {
          await fetchProfile(authUser.id);
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const demos = [
    { label: "Admin", email: "admin@school.edu", password: "admin123" },
    { label: "Teacher", email: "juan@school.edu", password: "teach123" },
    { label: "Student", email: "ana@school.edu", password: "stud123" },
  ];

  const handleDemoLogin = async (d) => {
    setLoginData({ email: d.email, password: d.password });
    setError("");
    setLoading(true);
    try {
      await signIn(d.email, d.password);
    } catch (e) {
      setError(e.message === "Invalid login credentials" ? "Invalid email or password." : e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ ...T.root, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          {onBack && (
            <button onClick={onBack} style={{ ...T.btn("ghost"), fontSize: 11, padding: "4px 12px", marginBottom: "1rem" }}>
              ← Back to Directory
            </button>
          )}
          <div style={{ fontSize: 28, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>SchoolOS</div>
          <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>Integrated School Management System</p>
        </div>

        <div style={T.card}>
          <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", background: "#f5f4f0", borderRadius: 10, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1a1a2e" : "#aaa", boxShadow: mode === m ? "0 1px 4px #00000010" : "none" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {error && <div style={{ marginBottom: "1rem", padding: "8px 14px", background: "#fff0f3", border: "1px solid #e9456033", borderRadius: 8, fontSize: 12, color: "#e94560" }}>{error}</div>}

          {mode === "login" ? (
            <>
              <Field label="Email"><input style={T.input} value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} placeholder="you@school.edu" /></Field>
              <Field label="Password"><input style={T.input} type="password" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••" /></Field>
              <button onClick={handleLogin} disabled={loading} style={{ ...T.btn("primary"), width: "100%", marginTop: 4, opacity: loading ? 0.6 : 1 }}>{loading ? "Signing in..." : "Sign In"}</button>
              <div style={{ marginTop: "1.25rem", borderTop: "1px solid #f5f4f0", paddingTop: "1rem" }}>
                <p style={{ ...T.label, marginBottom: 8 }}>Quick demo logins</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {demos.map(d => (
                    <button key={d.label} onClick={() => handleDemoLogin(d)} style={{ ...T.btn("ghost"), padding: "5px 12px", fontSize: 12 }}>{d.label}</button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="Full Name"><input style={T.input} value={regData.name} onChange={e => setRegData(p => ({ ...p, name: e.target.value }))} placeholder="Juan dela Cruz" /></Field>
              <Field label="Email"><input style={T.input} value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" /></Field>
              <Field label="Password"><input style={T.input} type="password" value={regData.password} onChange={e => setRegData(p => ({ ...p, password: e.target.value }))} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Register as">
                  <select style={{ ...T.select, width: "100%" }} value={regData.role} onChange={e => setRegData(p => ({ ...p, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Course">
                  <select style={{ ...T.select, width: "100%" }} value={regData.course} onChange={e => setRegData(p => ({ ...p, course: e.target.value }))}>
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <button onClick={handleRegister} disabled={loading} style={{ ...T.btn("primary"), width: "100%", marginTop: 4, opacity: loading ? 0.6 : 1 }}>{loading ? "Creating account..." : "Create Account"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}