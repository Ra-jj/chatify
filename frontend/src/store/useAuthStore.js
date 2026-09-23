import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { subscribeUserToPush } from "../lib/push.js";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

// True while this tab's own logout is in flight. The server drops the account's sockets while
// handling it, and that must not be taken for a logout that happened somewhere else.
let isLoggingOut = false;

// Bumped every time a session is cleared. Each request carries the value from when it was
// sent, so a late 401 to the previous user's request cannot end the next user's session.
let authSessionEpoch = 0;

// useChatStore imports this store, so it is loaded lazily here, as in the socket handlers below
const resetChatStore = async () => {
  const { useChatStore } = await import("./useChatStore.js");
  useChatStore.getState().reset();
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
      subscribeUserToPush();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      await resetChatStore();
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
      subscribeUserToPush();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
      subscribeUserToPush();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    isLoggingOut = true;
    try {
      await axiosInstance.post("/auth/logout");
      await get().clearSession();
      toast.success("Logged out successfully");
    } catch (error) {
      if (error.response?.status === 401) {
        // The server had already ended this session; only this tab still showed it
        await get().clearSession();
        toast.success("Logged out successfully");
      } else {
        toast.error(error.response?.data?.message || "Something went wrong");
      }
    } finally {
      isLoggingOut = false;
    }
  },

  // Everything the signed-in user could see is cleared before authUser is, so whoever logs in
  // next on this tab never gets a frame of their open chat, messages or drafts.
  clearSession: async () => {
    authSessionEpoch += 1;
    await resetChatStore();
    get().disconnectSocket();
    set({ authUser: null, onlineUsers: [] });
  },

  // The server ended this session: the account logged out in another tab, or the session
  // cookie stopped being accepted (protectRoute answers 401, the socket is refused).
  endSession: async () => {
    if (isLoggingOut || !get().authUser) return;

    await get().clearSession();
    toast.error("You were logged out", { id: "session-ended" });
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket: existingSocket } = get();
    // `active` stays true while a socket is still connecting or reconnecting, where `connected`
    // is still false. StrictMode runs checkAuth twice in development, and the second call
    // lands in exactly that window.
    if (!authUser || existingSocket?.active) return;

    // The server identifies the user from the httpOnly jwt cookie, so it must be sent cross-origin in dev
    const socket = io(BASE_URL, {
      withCredentials: true,
    });
    socket.connect();

    set({ socket: socket });

    // The chat store listens for the whole session, not only while a chat is open, so the
    // sidebar keeps updating with nothing selected. Imported here rather than at the top,
    // because useChatStore imports this store.
    import("./useChatStore.js").then((module) => {
      module.useChatStore.getState().subscribeToMessages(socket);
    });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("userOffline", ({ userId, lastSeen }) => {
      import("./useChatStore.js").then((module) => {
        module.useChatStore.setState((state) => ({
          users: state.users.map((u) => (u._id === userId ? { ...u, lastSeen } : u)),
          selectedUser:
            state.selectedUser?._id === userId
              ? { ...state.selectedUser, lastSeen }
              : state.selectedUser,
        }));
      });
    });

    // The server drops every socket of an account when it logs out anywhere, and refuses a
    // socket whose session has ended. A socket this tab already replaced is ignored.
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect" && socket === get().socket) get().endSession();
    });
    socket.on("connect_error", (error) => {
      if (error.message === "Unauthorized" && socket === get().socket) get().endSession();
    });
  },
  disconnectSocket: () => {
    const { socket } = get();
    if (!socket) return;

    import("./useChatStore.js").then((module) => {
      module.useChatStore.getState().unsubscribeFromMessages();
    });

    // Also stops a socket that is still connecting, which would otherwise connect afterwards
    socket.disconnect();
    set({ socket: null });
  },
}));

axiosInstance.interceptors.request.use((config) => {
  config.authSessionEpoch = authSessionEpoch;
  return config;
});

// protectRoute answers 401 once this session has ended, for example after the account signed
// in on another device. The tab then logs out instead of carrying on with a dead session.
// checkAuth handles its own 401, which is the normal answer when nobody is logged in.
axiosInstance.interceptors.response.use(undefined, (error) => {
  const isSessionEndedResponse =
    error.response?.status === 401 &&
    error.config?.url !== "/auth/check" &&
    error.config?.authSessionEpoch === authSessionEpoch;

  if (isSessionEndedResponse) useAuthStore.getState().endSession();
  return Promise.reject(error);
});
