import "dotenv/config";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  ),
});

const db = admin.firestore();
const urls = db.collection("urls");
const clicks = db.collection("clicks");
const app = express();

app.use(cors());
app.use(express.json());

function parseUserAgent(ua = "") {
  const device = /mobile/i.test(ua) ? "Mobile" : "Desktop";
  const browser =
    /chrome/i.test(ua) && !/edg/i.test(ua) ? "Chrome" :
    /safari/i.test(ua) && !/chrome/i.test(ua) ? "Safari" :
    /firefox/i.test(ua) ? "Firefox" :
    /edg/i.test(ua) ? "Edge" : "Other";
  return { device, browser };
}

async function findExistingCode(url) {
  const snap = await urls.where("url", "==", url).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

async function saveUrl(url) {
  const existing = await findExistingCode(url);
  if (existing) return existing;
  const code = nanoid(6);
  await urls.doc(code).set({ url, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return code;
}

async function logClick(code, req) {
  const { device, browser } = parseUserAgent(req.headers["user-agent"]);
  await clicks.add({
    code,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    referrer: req.headers["referer"] || "Direct",
    device,
    browser,
  });
}

// ROUTES

app.post("/shorten", async (req, res) => {
  const code = await saveUrl(req.body.url.trim());
  res.json({ short: code });
});

app.get("/admin/links", async (req, res) => {
  const snap = await urls.get();
  const links = await Promise.all(snap.docs.map(async doc => {
    const clickSnap = await clicks.where("code", "==", doc.id).get();
    return { code: doc.id, url: doc.data().url, totalClicks: clickSnap.size };
  }));
  res.json(links);
});

app.get("/admin/links/:code", async (req, res) => {
  const { code } = req.params;
  const urlDoc = await urls.doc(code).get();
  const clickSnap = await clicks.where("code", "==", code).get();

  const clicksData = clickSnap.docs.map(d => d.data());

  // clicks per day
  const perDay = {};
  clicksData.forEach(c => {
    const day = c.timestamp?.toDate().toISOString().slice(0, 10) ?? "unknown";
    perDay[day] = (perDay[day] || 0) + 1;
  });

  // top referrers
  const referrers = {};
  clicksData.forEach(c => {
    referrers[c.referrer] = (referrers[c.referrer] || 0) + 1;
  });

  // device breakdown
  const devices = {};
  clicksData.forEach(c => {
    devices[c.device] = (devices[c.device] || 0) + 1;
  });

  // browser breakdown
  const browsers = {};
  clicksData.forEach(c => {
    browsers[c.browser] = (browsers[c.browser] || 0) + 1;
  });

  res.json({
    code,
    url: urlDoc.data().url,
    totalClicks: clicksData.length,
    perDay,
    referrers,
    devices,
    browsers,
  });
});

app.get("/:code", async (req, res) => {
  const doc = await urls.doc(req.params.code).get();
  if (!doc.exists) return res.status(404).json({ error: "Not found." });
  await logClick(req.params.code, req);
  res.redirect(302, doc.data().url);
});

app.listen(process.env.PORT || 3001);