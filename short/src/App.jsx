import { useState, useEffect } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [page, setPage] = useState("home");
  const [token, setToken] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);

  function handleLogin(t) { setToken(t); setPage("dashboard"); }
  function handleLogout() { setToken(null); setPage("home"); setSelectedCode(null); }

  if (page === "login") return <Login onSuccess={handleLogin} />;
  if (page === "dashboard" && token) return (
    <Dashboard token={token} selectedCode={selectedCode} onSelectCode={setSelectedCode} onLogout={handleLogout} />
  );
  return <Shortener onAdminClick={() => setPage("login")} />;
}

function Shortener({ onAdminClick }) {
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function shorten() {
    if (!url.trim()) return;
    const input = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(`${API}/shorten`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: input }) });
    const data = await res.json();
    if (data.short) { setCode(data.short); setUrl(""); }
  }

  async function copy() {
    await navigator.clipboard.writeText(`https://z-short.vercel.app/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main>
      <div className="row">
        <input placeholder="Paste a URL…" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && shorten()} />
        <button onClick={shorten}>Shorten</button>
      </div>
      {code && (
        <div className="result">
          <span>z-short.vercel.app/{code}</span>
          <button onClick={copy}>{copied ? "you did it hooray" : "Copy"}</button>
        </div>
      )}
      <p className="admin-link" onClick={onAdminClick}>Admin</p>
    </main>
  );
}

function Login({ onSuccess }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);

  async function login() {
    const res = await fetch(`${API}/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, pass }) });
    const data = await res.json();
    if (data.token) onSuccess(data.token);
    else setError(true);
  }

  return (
    <main>
      <div className="col">
        <input placeholder="Username" value={user} onChange={e => { setUser(e.target.value); setError(false); }} />
        <input placeholder="Password" type="password" value={pass} onChange={e => { setPass(e.target.value); setError(false); }} onKeyDown={e => e.key === "Enter" && login()} />
        <button onClick={login}>Login</button>
        {error && <p className="error">Invalid credentials.</p>}
      </div>
    </main>
  );
}

function Dashboard({ token, selectedCode, onSelectCode, onLogout }) {
  return selectedCode
    ? <LinkStats token={token} code={selectedCode} onBack={() => onSelectCode(null)} onLogout={onLogout} />
    : <LinkList token={token} onSelectCode={onSelectCode} onLogout={onLogout} />;
}

function authFetch(url, token) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function LinkList({ token, onSelectCode, onLogout }) {
  const [links, setLinks] = useState([]);
  const [global, setGlobal] = useState(null);

  useEffect(() => {
    authFetch(`${API}/admin/links`, token).then(setLinks);
    authFetch(`${API}/admin/global`, token).then(setGlobal);
  }, [token]);

  return (
    <main className="wide">
      <div className="row">
        <span className="admin-title">Dashboard</span>
        <button onClick={onLogout}>Logout</button>
      </div>

      <p className="admin-title">All Links</p>
      <table>
        <thead><tr><th>Code</th><th>Original URL</th><th>Clicks</th></tr></thead>
        <tbody>
          {links.map(l => (
            <tr key={l.code} className="clickable" onClick={() => onSelectCode(l.code)}>
              <td>{l.code}</td>
              <td className="url-cell">{l.url}</td>
              <td>{l.totalClicks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {global && (
        <>
          <p className="admin-title">Global Stats</p>
          <div className="tables-row">
            <StatTable title="Clicks per Day" data={global.perDay} />
            <StatTable title="Top Referrers" data={global.referrers} />
            <StatTable title="Devices" data={global.devices} />
            <StatTable title="Browsers" data={global.browsers} />
          </div>
        </>
      )}
    </main>
  );
}

function LinkStats({ token, code, onBack, onLogout }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    authFetch(`${API}/admin/links/${code}`, token).then(setStats);
  }, [code, token]);

  if (!stats) return <main><p>Loading…</p></main>;

  return (
    <main className="wide">
      <div className="row">
        <button onClick={onBack}>← Back</button>
        <button onClick={onLogout}>Logout</button>
      </div>
      <div className="stat-header">
        <p className="admin-title">{stats.code}</p>
        <p className="url-muted">{stats.url}</p>
        <p>Total clicks: <strong>{stats.totalClicks}</strong></p>
      </div>
      <div className="tables-row">
        <StatTable title="Clicks per Day" data={stats.perDay} />
        <StatTable title="Referrers" data={stats.referrers} />
        <StatTable title="Devices" data={stats.devices} />
        <StatTable title="Browsers" data={stats.browsers} />
      </div>
    </main>
  );
}

function StatTable({ title, data }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="stat-table">
      <p className="admin-title">{title}</p>
      <table>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={2}>No data</td></tr>
            : rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)
          }
        </tbody>
      </table>
    </div>
  );
}