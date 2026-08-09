import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  allUsers: [],
  groups: [],
  selectedUser: null, // this will hold either a user or a pseudo-user group object
  selectedProfileUser: null,
  typingUsers: [],
  replyingTo: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  searchQuery: "",
  hasMore: true,
  page: 1,

  setReplyingTo: (message) => set({ replyingTo: message }),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const [usersRes, allUsersRes, groupsRes] = await Promise.all([
        axiosInstance.get("/messages/users"),
        axiosInstance.get("/messages/all-users"),
        axiosInstance.get("/groups"),
      ]);
      set({ users: usersRes.data, allUsers: allUsersRes.data, groups: groupsRes.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  createGroup: async (name, members) => {
    try {
      const res = await axiosInstance.post("/groups", { name, members });
      set((state) => ({ groups: [...state.groups, res.data] }));
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    }
  },

  getMessages: async (userId, page = 1) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}?page=${page}&limit=50`);
      set((state) => ({ 
        messages: page === 1 ? res.data.messages : [...res.data.messages, ...state.messages],
        hasMore: res.data.hasMore,
        page: page
      }));
      // Automatically mark as read when fetching messages
      get().markMessagesAsRead(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.post(`/messages/mark-read/${userId}`);
      set((state) => ({
        users: state.users.map((u) =>
          u._id === userId ? { ...u, unreadCount: 0 } : u
        ),
      }));
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, replyingTo } = get();
    try {
      if (replyingTo) {
        messageData.replyTo = replyingTo._id;
      }
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data], replyingTo: null });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  deleteMessage: async (messageId, type) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}?type=${type}`);
      if (type === "me") {
        set((state) => ({
          messages: state.messages.filter((message) => message._id !== messageId),
        }));
      } else {
        set((state) => ({
          messages: state.messages.map((message) =>
            message._id === messageId ? { ...message, isDeletedForEveryone: true, text: "", image: "", audio: "" } : message
          ),
        }));
      }
      toast.success(type === "me" ? "Message deleted for you" : "Message deleted for everyone");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}`, { text });
      set((state) => ({
        messages: state.messages.map((message) =>
          message._id === messageId ? res.data : message
        ),
      }));
      toast.success("Message edited");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map((message) =>
          message._id === messageId ? res.data : message
        ),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to react to message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      
      const isGroupMessage = !!newMessage.groupId;
      const isCurrentChat = isGroupMessage 
        ? selectedUser?._id === newMessage.groupId 
        : selectedUser?._id === newMessage.senderId;
      
      if (!isCurrentChat) {
        if (!isGroupMessage) {
          const { users, getUsers } = get();
          const userExists = users.some(u => u._id === newMessage.senderId);
          if (!userExists) {
            getUsers(); // Refresh sidebar to show the new chat
          } else {
            set((state) => ({
              users: state.users.map((u) =>
                u._id === newMessage.senderId
                  ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
                  : u
              ),
            }));
          }
        }
        return;
      }

      set({
        messages: [...get().messages, newMessage],
      });
      if (!isGroupMessage) {
        get().markMessagesAsRead(newMessage.senderId);
      }
    });

    socket.on("messageDeletedForEveryone", (messageId) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, isDeletedForEveryone: true, text: "", image: "", audio: "" } : msg
        ),
      }));
    });

    socket.on("messageEdited", (editedMessage) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg
        ),
      }));
    });

    socket.on("messageReacted", (reactedMessage) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === reactedMessage._id ? reactedMessage : msg
        ),
      }));
    });

    socket.on("messagesRead", ({ readerId }) => {
      const { selectedUser } = get();
      if (selectedUser?._id === readerId) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.receiverId === readerId ? { ...msg, status: "read" } : msg
          ),
        }));
      }
    });

    socket.on("newGroup", (newGroup) => {
      set((state) => {
        // Prevent duplicate if creator already added it locally
        if (state.groups.find(g => g._id === newGroup._id)) return state;
        return { groups: [...state.groups, newGroup] };
      });
    });

    socket.on("userTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: [...state.typingUsers, userId],
      }));
    });

    socket.on("userStoppedTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: state.typingUsers.filter((id) => id !== userId),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeletedForEveryone");
    socket.off("messageEdited");
    socket.off("messageReacted");
    socket.off("messagesRead");
    socket.off("newGroup");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, searchQuery: "", page: 1, hasMore: true, replyingTo: null }),
  setSelectedProfileUser: (selectedProfileUser) => set({ selectedProfileUser }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
