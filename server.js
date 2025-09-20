import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import fs from "fs";
import cors from "cors";
import { google } from "googleapis";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "clave_segura";

// Google Sheets config
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_CREDS_FILE = process.env.GOOGLE_CREDS_FILE || "credentials.json";

let creds;
if (process.env.GOOGLE_CREDS_BASE64) {
  const jsonStr = Buffer.from(process.env.GOOGLE_CREDS_BASE64, "base64").toString("utf8");
  creds = JSON.parse(jsonStr);
} else {
  creds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_FILE, "utf8"));
}

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

app.get("/", (req, res) => {
  res.json({ ok: true, service: "QR Access Backend activo 🚀" });
});

// Generar invitación con expiración 24h
app.post("/api/invitations", (req, res) => {
  const { visitorName, unit, hostName } = req.body || {};
  if (!visitorName || !unit || !hostName) {
    return res.status(400).json({ ok: false, error: "visitorName, unit, hostName required" });
  }
  const payload = { visitorName, unit, hostName };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  res.json({ ok: true, token });
});

// Validar invitación
app.post("/api/validate", async (req, res) => {
  const { token, action, plates } = req.body || {};
  if (!token || !action || !["entry"].includes(action)) {
    return res.status(400).json({ ok: false, error: "token and action (entry) required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const now = new Date().toISOString();
    const row = [now, decoded.visitorName, decoded.unit, decoded.hostName, action, plates || ""];
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Bitacora!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return res.json({ ok: true, status: "validated", data: decoded });
  } catch (err) {
    return res.status(400).json({ ok: false, error: "invalid_or_expired" });
  }
});

// Registrar empleados con foto
app.post("/api/employees", async (req, res) => {
  const { name, unit, ineUrl } = req.body || {};
  if (!name || !unit || !ineUrl) {
    return res.status(400).json({ ok: false, error: "name, unit, ineUrl required" });
  }
  const now = new Date().toISOString();
  const row = [now, name, unit, ineUrl];
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Empleados!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return res.json({ ok: true, status: "employee_registered" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "could_not_register_employee" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en puerto ${PORT}`);
});
