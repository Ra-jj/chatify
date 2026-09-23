import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { PUBLIC_USER_FIELDS, isValidObjectId } from "../lib/utils.js";

const MAX_GROUP_NAME_LENGTH = 50;

export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const adminId = req.user._id;

    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ error: "Group name is required" });
    }

    if (trimmedName.length > MAX_GROUP_NAME_LENGTH) {
      return res.status(400).json({ error: `Group name must be at most ${MAX_GROUP_NAME_LENGTH} characters` });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Group must have members" });
    }

    if (!members.every((memberId) => isValidObjectId(memberId))) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const uniqueMemberIds = [...new Set(members.map((memberId) => memberId.toLowerCase()))];
    const existingMemberCount = await User.countDocuments({ _id: { $in: uniqueMemberIds } });

    if (existingMemberCount !== uniqueMemberIds.length) {
      return res.status(400).json({ error: "All members must be existing users" });
    }

    // Include the admin in the members array if not already present
    const allMembers = [...new Set([...uniqueMemberIds, adminId.toString()])];

    const group = new Group({
      name: trimmedName,
      admin: adminId,
      members: allMembers,
    });

    await group.save();

    // Fetch the full group with populated members
    const populatedGroup = await Group.findById(group._id).populate("members", PUBLIC_USER_FIELDS);

    // Emit event to all members so their sidebar updates in real-time
    allMembers.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) {
        io.to(socketId).emit("newGroup", populatedGroup);
      }
    });

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error creating group:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId }).populate("members", PUBLIC_USER_FIELDS);

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
