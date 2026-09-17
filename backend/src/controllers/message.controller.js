import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { fetchLinkPreview } from "../lib/linkPreview.js";
import { PUBLIC_USER_FIELDS, isAllowedAudioInput, isAllowedImageInput, isValidObjectId } from "../lib/utils.js";
import webpush from "web-push";

// Configure web-push with VAPID keys.
// index.js imports "dotenv/config" before any other module, so process.env is populated here.
webpush.setVapidDetails(
  "mailto:contact@chatify.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const MAX_MESSAGE_TEXT_LENGTH = 5000;
const MAX_MESSAGES_PAGE_SIZE = 100;
const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 5;
const MAX_PUSH_ENDPOINT_LENGTH = 2048;
const MAX_PUSH_KEY_LENGTH = 512;
// Must match EMOJIS in frontend/src/components/ChatContainer.jsx
const ALLOWED_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const isProvided = (value) => value !== undefined && value !== null && value !== "";

const isGroupMember = (group, userId) =>
  group.members.some((memberId) => memberId.toString() === userId.toString());

// Resolves a chat :id to a group the requester belongs to, or to another existing user.
// Returns { group } or { receiver } on success, { status, error } otherwise.
const resolveChatTarget = async (targetId, requesterId) => {
  if (!isValidObjectId(targetId)) {
    return { status: 400, error: "Invalid id" };
  }

  const group = await Group.findById(targetId);
  if (group) {
    return isGroupMember(group, requesterId)
      ? { group }
      : { status: 403, error: "You are not a member of this group" };
  }

  const receiver = await User.findById(targetId).select("_id");
  if (!receiver) {
    return { status: 404, error: "User not found" };
  }

  if (receiver._id.toString() === requesterId.toString()) {
    return { status: 400, error: "Cannot open a chat with yourself" };
  }

  return { receiver };
};

// DM messages belong to their sender and receiver; group messages to the group's current members.
// The group is returned so callers can notify its members without loading it again.
const checkMessageAccess = async (message, userId) => {
  if (message.groupId) {
    const group = await Group.findById(message.groupId);
    return { isAllowed: Boolean(group) && isGroupMember(group, userId), group };
  }

  const userIdString = userId.toString();
  const isParticipant =
    message.senderId?.toString() === userIdString || message.receiverId?.toString() === userIdString;
  return { isAllowed: isParticipant, group: null };
};

const isMessageInConversation = (messageId, { groupId, userId, otherUserId }) => {
  const conversationFilter = groupId
    ? { groupId }
    : {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      };

  return Message.exists({ _id: messageId, ...conversationFilter });
};

const isHttpsUrl = (value) => {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const isBoundedString = (value, maxLength) =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

const isValidPushSubscription = (subscription) =>
  isHttpsUrl(subscription?.endpoint) &&
  subscription.endpoint.length <= MAX_PUSH_ENDPOINT_LENGTH &&
  isBoundedString(subscription.keys?.p256dh, MAX_PUSH_KEY_LENGTH) &&
  isBoundedString(subscription.keys?.auth, MAX_PUSH_KEY_LENGTH);

const removePushSubscription = async (userId, endpoint) => {
  try {
    await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
    console.log("Removed a push subscription that returned 404/410 for user", userId.toString());
  } catch (error) {
    console.error("Error removing push subscription:", error.message);
  }
};

// Fetches the preview for a message that has already been saved and sent, stores it, and
// pushes the updated message to everyone in the conversation (sender included) as
// "messageEdited", which the frontend already handles by replacing the message by _id.
// Never throws.
const attachLinkPreview = async (messageId, text, conversationUserIds) => {
  try {
    const linkPreview = await fetchLinkPreview(text);
    if (!linkPreview) return;

    const updatedMessage = await Message.findOneAndUpdate(
      { _id: messageId, isDeletedForEveryone: false },
      { $set: { linkPreview } },
      { new: true }
    ).populate("replyTo", "text image audio senderId");

    if (!updatedMessage) return;

    conversationUserIds.forEach((userId) => {
      const socketId = getReceiverSocketId(userId);
      if (socketId) io.to(socketId).emit("messageEdited", updatedMessage);
    });
  } catch (error) {
    console.log("Error saving link preview:", error.message);
  }
};

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
    }).select(PUBLIC_USER_FIELDS);

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
    const allUsers = await User.find({ _id: { $ne: loggedInUserId } }).select(PUBLIC_USER_FIELDS);
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), MAX_MESSAGES_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const target = await resolveChatTarget(userToChatId, myId);
    if (target.error) {
      return res.status(target.status).json({ error: target.error });
    }

    let query = { deletedFor: { $ne: myId } };

    if (target.group) {
      query.groupId = target.group._id;
    } else {
      query.$or = [
        { senderId: myId, receiverId: target.receiver._id },
        { senderId: target.receiver._id, receiverId: myId },
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

    if (isProvided(text) && typeof text !== "string") {
      return res.status(400).json({ error: "Message text must be a string" });
    }

    if (typeof text === "string" && text.length > MAX_MESSAGE_TEXT_LENGTH) {
      return res.status(400).json({ error: `Message text must be at most ${MAX_MESSAGE_TEXT_LENGTH} characters` });
    }

    if (isProvided(image) && !isAllowedImageInput(image)) {
      return res.status(400).json({ error: "Image must be an image data URI or an uploaded image URL" });
    }

    if (isProvided(audio) && !isAllowedAudioInput(audio)) {
      return res.status(400).json({ error: "Audio must be an audio data URI or an uploaded audio URL" });
    }

    const hasText = typeof text === "string" && text.trim().length > 0;
    if (!hasText && !isProvided(image) && !isProvided(audio)) {
      return res.status(400).json({ error: "Message must include text, an image or audio" });
    }

    const target = await resolveChatTarget(targetId, senderId);
    if (target.error) {
      return res.status(target.status).json({ error: target.error });
    }

    const group = target.group ?? null;
    const groupId = group?._id ?? null;
    const receiverId = target.receiver?._id ?? null;

    let replyToId;
    if (isProvided(replyTo)) {
      const isValidReply =
        isValidObjectId(replyTo) &&
        (await isMessageInConversation(replyTo, { groupId, userId: senderId, otherUserId: receiverId }));

      if (!isValidReply) {
        return res.status(400).json({ error: "Reply target must be a message in this conversation" });
      }
      replyToId = replyTo;
    }

    let imageUrl;
    if (isProvided(image)) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (isProvided(audio)) {
      const uploadResponse = await cloudinary.uploader.upload(audio, {
        resource_type: "video",
      });
      audioUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      groupId,
      replyTo: replyToId,
      text,
      image: imageUrl,
      audio: audioUrl,
      status: "sent",
      isForwarded: isForwarded === true,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id).populate("replyTo", "text image audio senderId");

    const sendPushToUser = async (userIdToPush, pushMessage) => {
      try {
        const userToPush = await User.findById(userIdToPush).select("pushSubscriptions");
        if (userToPush && userToPush.pushSubscriptions && userToPush.pushSubscriptions.length > 0) {
          const payload = JSON.stringify({
            title: "New Message",
            body: pushMessage,
          });

          userToPush.pushSubscriptions.forEach((sub) => {
            webpush.sendNotification(sub, payload).catch((err) => {
              // Push services answer 404/410 for subscriptions that have expired or been unsubscribed
              if (err.statusCode === 404 || err.statusCode === 410) {
                return removePushSubscription(userIdToPush, sub.endpoint);
              }
              console.error("Error sending push notification", err);
            });
          });
        }
      } catch (error) {
        console.error("Error loading push subscriptions:", error.message);
      }
    };

    if (groupId) {
      // Group message: emit to all members except sender
      group.members.forEach((memberId) => {
        if (memberId.toString() !== senderId.toString()) {
          const socketId = getReceiverSocketId(memberId);
          if (socketId) {
            io.to(socketId).emit("newMessage", populatedMessage);
          } else {
            sendPushToUser(memberId, `New message in ${group.name}`);
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
      } else {
        const sender = await User.findById(senderId);
        sendPushToUser(receiverId, `New message from ${sender.fullName}`);
      }
    }

    res.status(201).json(populatedMessage);

    // Runs after the response so a slow or hostile preview host cannot delay sending
    if (hasText) {
      const conversationUserIds = group ? group.members : [senderId, receiverId];
      attachLinkPreview(newMessage._id, text, conversationUserIds);
    }
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

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const { isAllowed, group } = await checkMessageAccess(message, userId);
    if (!isAllowed) {
      return res.status(403).json({ error: "You are not a participant in this conversation" });
    }

    if (type === "everyone") {
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ error: "You can only delete for everyone if you sent the message" });
      }

      message.isDeletedForEveryone = true;
      message.text = "";
      message.image = "";
      message.audio = "";
      message.linkPreview = undefined;
      message.reactions = [];
      await message.save();

      // Notify receivers
      if (message.groupId) {
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

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }

    if (text.length > MAX_MESSAGE_TEXT_LENGTH) {
      return res.status(400).json({ error: `Message text must be at most ${MAX_MESSAGE_TEXT_LENGTH} characters` });
    }

    const message = await Message.findById(messageId).populate("replyTo", "text image audio senderId");
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ error: "Deleted messages cannot be edited" });
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
    const { id: chatId } = req.params;
    const myId = req.user._id;

    const target = await resolveChatTarget(chatId, myId);
    if (target.error) {
      return res.status(target.status).json({ error: target.error });
    }

    // Groups don't have read receipts built in yet, skip for now.
    if (target.group) {
      return res.status(200).json({ message: "Skipped for group" });
    }

    const senderId = target.receiver._id;

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

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    if (!ALLOWED_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: "Unsupported reaction emoji" });
    }

    const message = await Message.findById(messageId).populate("replyTo", "text image audio senderId");
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const { isAllowed, group } = await checkMessageAccess(message, userId);
    if (!isAllowed) {
      return res.status(403).json({ error: "You are not a participant in this conversation" });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ error: "Deleted messages cannot be reacted to" });
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

export const subscribeToPush = async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user._id;

    if (!isValidPushSubscription(subscription)) {
      return res.status(400).json({ error: "Push subscription must include an https endpoint and p256dh/auth keys" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if subscription already exists to avoid duplicates
    const exists = user.pushSubscriptions.some(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (!exists) {
      // Only the fields web-push needs are stored, never the raw request body
      const subscriptionToStore = {
        endpoint: subscription.endpoint,
        expirationTime: typeof subscription.expirationTime === "number" ? subscription.expirationTime : null,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      };

      // $slice keeps the newest MAX_PUSH_SUBSCRIPTIONS_PER_USER entries and drops the oldest
      await User.updateOne(
        { _id: userId },
        { $push: { pushSubscriptions: { $each: [subscriptionToStore], $slice: -MAX_PUSH_SUBSCRIPTIONS_PER_USER } } }
      );
    }

    res.status(201).json({ message: "Subscription added successfully" });
  } catch (error) {
    console.error("Error in subscribeToPush: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
