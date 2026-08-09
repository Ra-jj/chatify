import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ogs from "open-graph-scraper";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    const unreadMessages = await Message.aggregate([
      { $match: { receiverId: loggedInUserId, status: { $ne: "read" } } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } }
    ]);

    const unreadMap = {};
    unreadMessages.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    const usersWithUnread = filteredUsers.map((user) => ({
      ...user.toObject(),
      unreadCount: unreadMap[user._id.toString()] || 0,
    }));

    res.status(200).json(usersWithUnread);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $ne: myId },
    };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Get newest first
      .skip(skip)
      .limit(limit);

    // Reverse to return in chronological order (top to bottom)
    messages.reverse();

    // Check if more messages exist
    const totalMessages = await Message.countDocuments(query);
    const hasMore = skip + messages.length < totalMessages;

    res.status(200).json({ messages, hasMore, page });
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      // Upload base64 audio to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(audio, {
        resource_type: "video",
      });
      audioUrl = uploadResponse.secure_url;
    }

    let linkPreview = null;
    if (text) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        try {
          const { result } = await ogs({ url: urls[0] });
          if (result.success) {
            linkPreview = {
              title: result.ogTitle,
              description: result.ogDescription,
              image: result.ogImage?.[0]?.url,
              url: result.ogUrl || urls[0],
            };
          }
        } catch (error) {
          console.log("Error fetching link preview:", error.message);
        }
      }
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    const status = receiverSocketId ? "delivered" : "sent";

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      audio: audioUrl,
      linkPreview,
      status,
    });

    await newMessage.save();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { type } = req.query; // "everyone" or "me"
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (type === "everyone") {
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ error: "You can only delete for everyone if you sent the message" });
      }

      message.isDeletedForEveryone = true;
      message.text = "";
      message.image = "";
      await message.save();

      // Notify receiver
      const receiverId = message.receiverId.toString();
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeletedForEveryone", messageId);
      }

      res.status(200).json({ message: "Message deleted for everyone", messageId, isDeletedForEveryone: true });
    } else {
      // Delete for me
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
      res.status(200).json({ message: "Message deleted for you", messageId });
    }
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const senderId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const receiverId = message.receiverId.toString();

    // Notify receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId: myId, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { readerId: myId });
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user already reacted
    const existingUserReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingUserReactionIndex !== -1) {
      if (message.reactions[existingUserReactionIndex].emoji === emoji) {
        // If clicking the same emoji, remove it (toggle off)
        message.reactions.splice(existingUserReactionIndex, 1);
      } else {
        // If clicking a different emoji, replace the old one
        message.reactions[existingUserReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Emit event to notify users
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);

    if (receiverSocketId) io.to(receiverSocketId).emit("messageReacted", message);
    if (senderSocketId) io.to(senderSocketId).emit("messageReacted", message);

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
