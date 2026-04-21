import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";

const app = express();
const PORT = process.env.PORT || 3001;

const store = new Map(); // replace with actual DB afterwards

app.use(cors());
app.use(express.json());

function isValidUrl(str) {
  try {
    const { protocol } = new URL(str);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function findExistingCode(url) {
  for (const [code, saved] of store.entries()) {
    if (saved === url) return code;
  }
  return null;
}

function generateUniqueCode() {
  let code;
  do { code = nanoid(6); } while (store.has(code));
  return code;
}

function saveUrl(url) {
  const existing = findExistingCode(url);
  if (existing) return existing;

  const code = generateUniqueCode();
  store.set(code, url);
  return code;
}

function resolveCode(code) {
  return store.get(code) ?? null;
}

app.post("/shorten", (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string")
    return res.status(400).json({ error: "A URL is required." });

  if (!isValidUrl(url.trim()))
    return res.status(400).json({ error: "Invalid URL. Must start with http:// or https://" });

  const code = saveUrl(url.trim());
  return res.json({ short: code });
});

app.get("/:code", (req, res) => {
  const original = resolveCode(req.params.code);
  if (!original) return res.status(404).json({ error: "Short URL not found." });
  return res.redirect(302, original);
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));