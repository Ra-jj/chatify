import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  selectedProfileUser: null,
  typingUsers: [],
  isUsersLoading: false,
  isMessagesLoading: false,
  searchQuery: "",
  hasMore: true,
  page: 1,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isUsersLoading: false });
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
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
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
            message._id === messageId ? { ...message, isDeletedForEveryone: true, text: "", image: "" } : message
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

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;
      
      if (!isMessageSentFromSelectedUser) {
        set((state) => ({
          users: state.users.map((u) =>
            u._id === newMessage.senderId
              ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
              : u
          ),
        }));
        return;
      }

      set({
        messages: [...get().messages, newMessage],
      });
      get().markMessagesAsRead(newMessage.senderId);
    });

    socket.on("messageDeletedForEveryone", (messageId) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, isDeletedForEveryone: true, text: "", image: "" } : msg
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
    socket.off("messagesRead");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, searchQuery: "", page: 1, hasMore: true }),
  setSelectedProfileUser: (selectedProfileUser) => set({ selectedProfileUser }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
