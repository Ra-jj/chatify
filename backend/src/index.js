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

// Production runs behind Render's proxy. Trusting one proxy hop makes req.ip the client's
// address, so rate limits are counted per client instead of once for the proxy.
// The hop count of 1 has not been checked on Render. Check it there (for example, log
// req.ip and X-Forwarded-For for one request) and set this to the real number of hops.
app.set("trust proxy", 1);

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
