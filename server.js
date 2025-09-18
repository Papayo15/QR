import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import fs from "fs";
import cors from "cors";
import { google } from "googleapis";
import QRCode from "qrcode";

// Configuración de entorno
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "clave_segura";

// Google Sheets config
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_CREDS_FILE = process.env.GOOGLE_CREDS_FILE || "credentials.json";

// Leer credenciales
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

// Rutas

// Prueba de vida
app.get("/", (req, res) => {
  res.json({ ok: true, service: "QR Access Backend activo 🚀" });
});

// Crear invitación
app.post("/api/invitations", async (req, res) => {
  const { visitorName, unit, hostName } = req.body || {};
  if (!visitorName || !unit || !hostName) {
    return res.status(400).json({ ok: false, error: "visitorName, unit, hostName required" });
  }

  const payload = { visitorName, unit, hostName };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

  try {
    const qrCodeImage = await QRCode.toDataURL(token);
    console.log("🎫 Invitación creada:", payload);

    res.json({ ok: true, token, qrCodeImage, expiresInHours: 24 });
  } catch (err) {
    console.error("❌ Error generando código QR:", err);
    res.status(500).json({ ok: false, error: "Error generating QR code" });
  }
});

// Validar token e ingresar registro
app.post("/api/validate", async (req, res) => {
  const { token, action, plates } = req.body || {};
  if (!token || !action || !["entry", "exit"].includes(action)) {
    return res.status(400).json({ ok: false, error: "token and action (entry|exit) required" });
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

    console.log(`✅ Validado ${action.toUpperCase()}:`, decoded);
    res.json({ ok: true, message: `Registro de ${action} guardado.` });
  } catch (err) {
    console.error("❌ Error validando token o escribiendo en Sheets:", err);
    res.status(401).json({ ok: false, error: "Token inválido o expirado" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
