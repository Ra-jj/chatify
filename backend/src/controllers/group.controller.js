import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const adminId = req.user._id;

    if (!name) {
      return res.status(400).json({ error: "Group name is required" });
    }

    if (!members || members.length === 0) {
      return res.status(400).json({ error: "Group must have members" });
    }

    // Include the admin in the members array if not already present
    const allMembers = [...new Set([...members, adminId.toString()])];

    const group = new Group({
      name,
      admin: adminId,
      members: allMembers,
    });

    await group.save();

    // Fetch the full group with populated members
    const populatedGroup = await Group.findById(group._id).populate("members", "-password");

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

    const groups = await Group.find({ members: userId }).populate("members", "-password");

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
