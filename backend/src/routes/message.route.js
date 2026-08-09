import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, getAllUsers, sendMessage, deleteMessage, editMessage, markMessagesAsRead, reactToMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/all-users", protectRoute, getAllUsers);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/mark-read/:id", protectRoute, markMessagesAsRead);
router.delete("/:id", protectRoute, deleteMessage);
router.put("/:id", protectRoute, editMessage);
router.post("/react/:id", protectRoute, reactToMessage);

export default router;
