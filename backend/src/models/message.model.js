import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    audio: {
      type: String,
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
    linkPreview: {
      title: String,
      description: String,
      image: String,
      url: String,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// deletedFor lists who hid a message "for me". Queries on the server filter by it, but it never
// leaves the server: the other person could otherwise tell their message was hidden. res.json()
// and socket.io both serialize documents through toJSON, so this covers every response and emit.
messageSchema.set("toJSON", {
  transform: (_document, serializedMessage) => {
    delete serializedMessage.deletedFor;
    return serializedMessage;
  },
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
