import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import admin from "firebase-admin";
import "dotenv/config";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore().collection("urls");
const app = express();

app.use(cors());
app.use(express.json());

const getCode = async (url) => {
  const snap = await db.where("url", "==", url).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
};

const saveUrl = async (url) => {
  const existing = await getCode(url);
  if (existing) return existing;
  const code = nanoid(6);
  await db.doc(code).set({ url });
  return code;
};

app.post("/shorten", async (req, res) => {
  const code = await saveUrl(req.body.url.trim());
  res.json({ short: code });
});

app.get("/:code", async (req, res) => {
  const doc = await db.doc(req.params.code).get();
  res.redirect(302, doc.data().url);
});

app.listen(process.env.PORT || 3001);