// Must stay the first import: modules imported below read process.env while they load.
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT;
const __dirname = path.resolve();

// Production traffic reaches the app through Cloudflare and then Render's internal proxies
// (10.x addresses). req.ip must be the visitor's address or the rate limiters count everyone
// together. Trusting those proxies by address, not by hop count, makes Express walk
// X-Forwarded-For from the right and stop at the first address that is not one of them: the
// real client. Entries a client adds to the header sit further left and are never reached.
// Cloudflare ranges from https://www.cloudflare.com/ips-v4 and /ips-v6 (fetched 2026-09-24).
const CLOUDFLARE_IP_RANGES = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
  "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
];
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal", ...CLOUDFLARE_IP_RANGES]);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Cloudinary uploads, link-preview images from any https host,
        // emoji-picker-react's emoji images, and data:/blob: image previews
        "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://cdn.jsdelivr.net", "https:"],
        // Cloudinary voice notes and recordings played back before upload
        "media-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        // socket.io's websocket transport (wss://) alongside same-origin API calls
        "connect-src": ["'self'", "wss:"],
        // PWA service worker (sw.js)
        "worker-src": ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
