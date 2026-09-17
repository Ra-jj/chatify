import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

// used to store online users: Map<userId, Set<socketId>>, one socket id per open tab
export const userSocketMap = new Map();

export function isUserOnline(userId) {
  if (!userId) return false;
  return (userSocketMap.get(userId.toString())?.size ?? 0) > 0;
}

// Every socket joins a room named after its userId, so emitting to the returned
// room name reaches all of that user's open tabs.
export function getReceiverSocketId(userId) {
  return isUserOnline(userId) ? userId.toString() : undefined;
}

const getOnlineUserIds = () => Array.from(userSocketMap.keys());

const readCookie = (cookieHeader, cookieName) => {
  if (!cookieHeader) return null;

  for (const pair of cookieHeader.split(";")) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1 || pair.slice(0, separatorIndex).trim() !== cookieName) continue;

    try {
      return decodeURIComponent(pair.slice(separatorIndex + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
};

// Same rules as protectRoute: a valid jwt cookie whose sessionId matches the user's current session.
io.use(async (socket, next) => {
  try {
    const token = readCookie(socket.handshake.headers.cookie, "jwt");
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id sessionId");

    if (!user || user.sessionId !== decoded.sessionId) {
      return next(new Error("Unauthorized"));
    }

    socket.userId = user._id.toString();
    next();
  } catch (error) {
    console.log("Socket connection rejected:", error.message);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const { userId } = socket;
  console.log("A user connected", socket.id);

  socket.join(userId);
  if (!userSocketMap.has(userId)) userSocketMap.set(userId, new Set());
  userSocketMap.get(userId).add(socket.id);

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", getOnlineUserIds());

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);

    const userSockets = userSocketMap.get(userId);
    userSockets?.delete(socket.id);

    // Only the user's last open tab closing makes them offline
    if (userSockets && userSockets.size === 0) {
      userSocketMap.delete(userId);

      const lastSeen = new Date();
      try {
        await User.findByIdAndUpdate(userId, { lastSeen });
      } catch (error) {
        console.log("Error saving lastSeen on disconnect:", error.message);
      }
      io.emit("userOffline", { userId, lastSeen });
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });

  socket.on("typing", (payload) => {
    if (typeof payload?.receiverId !== "string") return;
    const receiverSocketId = getReceiverSocketId(payload.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { userId });
    }
  });

  socket.on("stopTyping", (payload) => {
    if (typeof payload?.receiverId !== "string") return;
    const receiverSocketId = getReceiverSocketId(payload.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", { userId });
    }
  });
});

export { io, app, server };
