import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import ogs from "open-graph-scraper";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Find all messages involving the logged-in user
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
      groupId: null // Only 1-on-1 chats
    });

    const userIdsWithHistory = new Set();
    messages.forEach((msg) => {
      if (msg.senderId && msg.senderId.toString() !== loggedInUserId.toString()) {
        userIdsWithHistory.add(msg.senderId.toString());
      }
      if (msg.receiverId && msg.receiverId.toString() !== loggedInUserId.toString()) {
        userIdsWithHistory.add(msg.receiverId.toString());
      }
    });

    const filteredUsers = await User.find({ 
      _id: { $in: Array.from(userIdsWithHistory) } 
    }).select("-password");

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

export const getAllUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const allUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error in getAllUsers: ", error.message);
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

    let query = { deletedFor: { $ne: myId } };
    
    // Check if it's a group
    const group = await Group.findById(userToChatId).catch(() => null);
    if (group) {
      query.groupId = group._id;
    } else {
      query.$or = [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ];
    }

    const messages = await Message.find(query)
      .populate("replyTo", "text image audio senderId")
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
    const { text, image, audio, replyTo, isForwarded } = req.body;
    const { id: targetId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
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

    let receiverId = null;
    let groupId = null;
    const group = await Group.findById(targetId).catch(() => null);

    if (group) {
      groupId = group._id;
    } else {
      receiverId = targetId;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      groupId,
      replyTo,
      text,
      image: imageUrl,
      audio: audioUrl,
      linkPreview,
      status: "sent",
      isForwarded: isForwarded || false,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id).populate("replyTo", "text image audio senderId");

    if (groupId) {
      // Group message: emit to all members except sender
      group.members.forEach((memberId) => {
        if (memberId.toString() !== senderId.toString()) {
          const socketId = getReceiverSocketId(memberId);
          if (socketId) {
            io.to(socketId).emit("newMessage", populatedMessage);
          }
        }
      });
    } else {
      // 1-on-1 message
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        newMessage.status = "delivered";
        await newMessage.save();
        populatedMessage.status = "delivered";
        io.to(receiverSocketId).emit("newMessage", populatedMessage);
      }
    }

    res.status(201).json(populatedMessage);
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
      message.audio = "";
      await message.save();

      // Notify receivers
      if (message.groupId) {
        const group = await Group.findById(message.groupId);
        if (group) {
          group.members.forEach((memberId) => {
            if (memberId.toString() !== userId.toString()) {
              const socketId = getReceiverSocketId(memberId);
              if (socketId) io.to(socketId).emit("messageDeletedForEveryone", messageId);
            }
          });
        }
      } else {
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageDeletedForEveryone", messageId);
        }
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

    const message = await Message.findById(messageId).populate("replyTo", "text image audio senderId");
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    // Notify receivers
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (group) {
        group.members.forEach((memberId) => {
          if (memberId.toString() !== senderId.toString()) {
            const socketId = getReceiverSocketId(memberId);
            if (socketId) io.to(socketId).emit("messageEdited", message);
          }
        });
      }
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", message);
      }
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
    
    // Check if it's a group, groups don't have read receipts built in yet, skip for now.
    const group = await Group.findById(senderId).catch(() => null);
    if (group) {
      return res.status(200).json({ message: "Skipped for group" });
    }

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

    const message = await Message.findById(messageId).populate("replyTo", "text image audio senderId");
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.groupId) {
      // Group chat: multiple reactions allowed (1 per user)
      const existingUserReactionIndex = message.reactions.findIndex(
        (r) => r.userId.toString() === userId.toString()
      );

      if (existingUserReactionIndex !== -1) {
        if (message.reactions[existingUserReactionIndex].emoji === emoji) {
          message.reactions.splice(existingUserReactionIndex, 1);
        } else {
          message.reactions[existingUserReactionIndex].emoji = emoji;
        }
      } else {
        message.reactions.push({ userId, emoji });
      }
    } else {
      // 1-on-1 chat: only one reaction allowed on the entire message
      if (
        message.reactions.length > 0 &&
        message.reactions[0].emoji === emoji &&
        message.reactions[0].userId.toString() === userId.toString()
      ) {
        message.reactions = [];
      } else {
        message.reactions = [{ userId, emoji }];
      }
    }

    await message.save();

    // Emit event to notify users
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (group) {
        group.members.forEach((memberId) => {
          if (memberId.toString() !== userId.toString()) {
            const socketId = getReceiverSocketId(memberId);
            if (socketId) io.to(socketId).emit("messageReacted", message);
          }
        });
      }
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      const senderSocketId = getReceiverSocketId(message.senderId);

      if (receiverSocketId && message.receiverId?.toString() !== userId.toString()) io.to(receiverSocketId).emit("messageReacted", message);
      if (senderSocketId && message.senderId?.toString() !== userId.toString()) io.to(senderSocketId).emit("messageReacted", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
