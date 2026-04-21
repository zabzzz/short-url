import { useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [input, setInput] = useState("");
  const [shortCode, setShortCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortUrl = shortCode ? `zabzshort.com/${shortCode}` : null;
  const fullShortUrl = shortCode ? `https://zabzshort.com/${shortCode}` : null;

  async function handleShorten() {
    setError(null);
    setShortCode(null);
    setCopied(false);

    const trimmed = input.trim();
    if (!trimmed) return;

    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    setLoading(true);
    try {
      const res = await fetch(`${API}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: withProtocol }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong.");
      else { setShortCode(data.short); setInput(""); }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main>
      <div className="row">
        <input
          type="text"
          placeholder="Paste a URL…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleShorten()}
          disabled={loading}
          className={error ? "err" : ""}
        />
        <button onClick={handleShorten} disabled={loading}>
          {loading ? "…" : "Shorten"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {shortUrl && (
        <div className="result">
          <span>{shortUrl}</span>
          <button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      )}
    </main>
  );
}