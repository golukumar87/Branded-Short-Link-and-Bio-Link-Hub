import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import linkRoutes from "./routes/links.js";
import bioRoutes from "./routes/bio.js";
import { redirectLimiter } from "./middleware/rateLimits.js";
import Link from "./models/Link.js";
import ClickEvent from "./models/ClickEvent.js";
import { parseClickMetadata } from "./utils/clickMetadata.js";

const app = express();
const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set("trust proxy", 1);

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.get("/", (_req, res) => {
    res.redirect(clientOrigin);
  });
}

app.get("/api/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    ok: databaseConnected,
    service: "Branded Short-Link & Bio-Link Hub",
    database: databaseConnected ? "connected" : "disconnected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/bio", bioRoutes);

app.get("/r/:shortCode", redirectLimiter, async (req, res, next) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode, archived: { $ne: true } });
    if (!link) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Short Link Not Found</title>
  <style>
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #f6f7f9; color: #16181d; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: white; border: 1px solid #dde2ea; border-radius: 12px; padding: 36px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .badge { display: inline-block; background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 10px; }
    p { color: #687082; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    a { display: inline-block; background: #2674d9; color: white; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    a:hover { background: #1c5ec4; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">404 Not Found</span>
    <h1>Short Link Inactive</h1>
    <p>The short link <code>/r/${req.params.shortCode}</code> does not exist, has expired, or was removed by its owner.</p>
    <a href="${clientOrigin}">Go to ShortLink Hub</a>
  </div>
</body>
</html>`);
    }

    const metadata = parseClickMetadata(req);
    ClickEvent.create({ link: link._id, owner: link.owner, ...metadata }).catch(console.error);
    res.redirect(302, link.destinationUrl);
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../client/dist");
  app.use(express.static(clientDist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong" });
});

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required. Copy .env.example to .env and configure MongoDB.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
