import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const MESSAGES_PAGE_SIZE = 50;

// The socket listeners below live for the whole session, so they are registered once and
// removed by reference. socket.off(event) without a handler would also drop listeners other
// modules registered for the same event.
let registeredSocketListeners = null;

// Only the newest getMessages request may write its result or clear the loading flags. A fast
// chat switch (or StrictMode's double effect in development) can land an older request's
// response after a newer one was sent.
let latestMessagesRequestId = 0;

// Bumped by reset() when the signed-in user changes. A request started before that compares
// its own epoch on landing and writes nothing, so the previous user's data never reaches the
// next user's store.
let sessionEpoch = 0;

const getAuthUserId = () => useAuthStore.getState().authUser?._id;

const compareMessages = (a, b) => {
  const byTime = new Date(a.createdAt) - new Date(b.createdAt);
  if (byTime !== 0) return byTime;
  if (a._id === b._id) return 0;
  return a._id < b._id ? -1 : 1;
};

// Every path that adds messages goes through here, so no message can be held twice: the
// initial load, an older page, a socket arrival and an own send all merge by _id. Later
// lists win, which keeps the freshest copy of a message the client already had.
const mergeMessages = (...lists) => {
  const messagesById = new Map();
  lists.forEach((list) => list.forEach((message) => messagesById.set(message._id, message)));
  return Array.from(messagesById.values()).sort(compareMessages);
};

// A group message carries its groupId. A DM belongs to the chat named after the other person,
// and only when the signed-in user is its other side: a message between two other people that
// involves the same partner is never part of this chat.
const isMessageInChat = (message, chatId, authUserId) => {
  if (!chatId) return false;
  if (message.groupId) return message.groupId === chatId;

  const participantIds = [message.senderId, message.receiverId];
  return Boolean(authUserId) && participantIds.includes(chatId) && participantIds.includes(authUserId);
};

// Matches what the server keeps after a delete for everyone: no text, media, link preview,
// reactions or reply.
const asDeletedForEveryone = (message) => ({
  ...message,
  isDeletedForEveryone: true,
  text: "",
  image: "",
  audio: "",
  reactions: [],
  linkPreview: null,
  replyTo: null,
});

const withoutKey = (object, keyToRemove) =>
  Object.fromEntries(Object.entries(object).filter(([key]) => key !== keyToRemove));

// A function, so reset() always gets fresh arrays and objects
const createInitialChatState = () => ({
  messages: [],
  users: [],
  allUsers: [],
  groups: [],
  // Unread messages per group id, counted on this device since the page loaded. The server
  // keeps no unread state for groups.
  groupUnread: {},
  selectedUser: null, // this will hold either a user or a pseudo-user group object
  selectedProfileUser: null,
  typingUsers: [],
  replyingTo: null,
  messageToForward: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  // Kept apart from isMessagesLoading: an older page shows a spinner above the list, while
  // opening a chat replaces the whole view with the skeleton
  isLoadingOlderMessages: false,
  searchQuery: "",
  hasMore: true,
  // How many pages of history the open chat holds; 1 is the newest page. It drives
  // ChatContainer's scroll behaviour only; the server pages by cursor, not by number.
  loadedPageCount: 1,
});

export const useChatStore = create((set, get) => ({
  ...createInitialChatState(),

  // Called before the signed-in user changes (logout, a session the server ended, a failed
  // checkAuth), so nothing of theirs can render for whoever logs in next on this tab: open
  // chat, messages, reply draft, search text, sidebar lists, unread counts. Responses to
  // requests they started are dropped when they land.
  reset: () => {
    sessionEpoch += 1;
    latestMessagesRequestId += 1;
    set(createInitialChatState());
  },

  setReplyingTo: (message) => set({ replyingTo: message }),
  setMessageToForward: (message) => set({ messageToForward: message }),

  getUsers: async () => {
    const epoch = sessionEpoch;
    set({ isUsersLoading: true });
    try {
      const [usersRes, allUsersRes, groupsRes] = await Promise.all([
        axiosInstance.get("/messages/users"),
        axiosInstance.get("/messages/all-users"),
        axiosInstance.get("/groups"),
      ]);
      if (epoch !== sessionEpoch) return;
      set({ users: usersRes.data, allUsers: allUsersRes.data, groups: groupsRes.data });
    } catch (error) {
      if (epoch === sessionEpoch) {
        toast.error(error.response?.data?.message || error.response?.data?.error || "Something went wrong");
      }
    } finally {
      if (epoch === sessionEpoch) set({ isUsersLoading: false });
    }
  },

  // Gives a DM partner a sidebar row once a message exists between you, sent or received.
  // The server lists them from then on, so the row is still there after a reload.
  addConversation: (user, unreadCount = 0) =>
    set((state) =>
      state.users.some((existingUser) => existingUser._id === user._id)
        ? state
        : { users: [...state.users, { ...user, unreadCount }] }
    ),

  createGroup: async (name, members) => {
    const epoch = sessionEpoch;
    try {
      const res = await axiosInstance.post("/groups", { name, members });
      if (epoch !== sessionEpoch) return res.data;

      // The newGroup socket event can add this group before the HTTP response arrives
      set((state) =>
        state.groups.some((group) => group._id === res.data._id)
          ? state
          : { groups: [...state.groups, res.data] }
      );
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to create group");
      throw error;
    }
  },

  // `before` is the _id of the oldest message already held; leave it out for the newest page.
  getMessages: async (chatId, before = null) => {
    const requestId = ++latestMessagesRequestId;
    const isLatestRequest = () => requestId === latestMessagesRequestId;
    // What the list held when this request started: the previous chat, or a previous visit to
    // this one. Only messages added after this moment can be kept on top of the page.
    const messageIdsHeldAtStart = new Set(get().messages.map((message) => message._id));

    set(before ? { isLoadingOlderMessages: true } : { isMessagesLoading: true });
    try {
      const params = new URLSearchParams({ limit: String(MESSAGES_PAGE_SIZE) });
      if (before) params.set("before", before);

      const res = await axiosInstance.get(`/messages/${chatId}?${params.toString()}`);

      if (!isLatestRequest() || get().selectedUser?._id !== chatId) return;

      set((state) => {
        if (before) {
          return {
            messages: mergeMessages(res.data.messages, state.messages),
            hasMore: res.data.hasMore,
            loadedPageCount: state.loadedPageCount + 1,
          };
        }

        // The composer and the socket stay live while the page loads, so a message sent or
        // received meanwhile can be newer than anything in the page. Those are kept.
        const authUserId = getAuthUserId();
        const newestInPage = res.data.messages[res.data.messages.length - 1];
        const arrivedDuringLoad = state.messages.filter(
          (message) =>
            !messageIdsHeldAtStart.has(message._id) &&
            isMessageInChat(message, chatId, authUserId) &&
            (!newestInPage || compareMessages(message, newestInPage) > 0)
        );

        return {
          messages: mergeMessages(res.data.messages, arrivedDuringLoad),
          hasMore: res.data.hasMore,
          loadedPageCount: 1,
        };
      });

      // Automatically mark as read when opening the chat
      if (!before) get().markMessagesAsRead(chatId);
    } catch (error) {
      if (isLatestRequest()) {
        toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to load messages");
      }
    } finally {
      if (isLatestRequest()) {
        set(before ? { isLoadingOlderMessages: false } : { isMessagesLoading: false });
      }
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

  // Resolves to true when the server accepted the message, so the composer only clears then.
  // On failure the toast shows the server's reason and the reply being written stays attached.
  sendMessage: async (messageData) => {
    const { selectedUser, replyingTo } = get();
    if (!selectedUser) return false;

    const epoch = sessionEpoch;
    try {
      const payload = replyingTo ? { ...messageData, replyTo: replyingTo._id } : messageData;
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
      if (epoch !== sessionEpoch) return true;

      set((state) => ({
        // The chat can be switched while a message is uploading; it belongs only in its own
        messages: isMessageInChat(res.data, state.selectedUser?._id, getAuthUserId())
          ? mergeMessages(state.messages, [res.data])
          : state.messages,
        replyingTo: state.replyingTo === replyingTo ? null : state.replyingTo,
      }));
      if (!selectedUser.isGroup) get().addConversation(selectedUser);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to send message");
      return false;
    }
  },

  forwardMessage: async (recipientIds, message) => {
    const epoch = sessionEpoch;
    try {
      const promises = recipientIds.map(id =>
        axiosInstance.post(`/messages/send/${id}`, {
          text: message.text,
          image: message.image,
          audio: message.audio,
          isForwarded: true,
        })
      );
      const responses = await Promise.all(promises);
      if (epoch !== sessionEpoch) return;

      toast.success("Message forwarded");

      // A forward is a send: each person forwarded to gets a sidebar row, as after a first
      // message, and a copy forwarded into the open chat shows there straight away
      const { allUsers, selectedUser } = get();
      recipientIds.forEach((recipientId) => {
        const recipient = allUsers.find((user) => user._id === recipientId);
        if (recipient) get().addConversation(recipient);
      });

      const authUserId = getAuthUserId();
      const forwardedIntoOpenChat = responses
        .map((response) => response.data)
        .filter((forwarded) => isMessageInChat(forwarded, selectedUser?._id, authUserId));
      if (forwardedIntoOpenChat.length > 0) {
        set((state) => ({ messages: mergeMessages(state.messages, forwardedIntoOpenChat) }));
      }

      set({ messageToForward: null });
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to forward message");
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
            message._id === messageId ? asDeletedForEveryone(message) : message
          ),
        }));
      }
      toast.success(type === "me" ? "Message deleted for you" : "Message deleted for everyone");
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to delete message");
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
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to edit message");
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
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to react to message");
    }
  },

  // A DM from someone with no sidebar row yet inserts that row, so a first message shows up
  // even while no conversation is open.
  bumpUnreadCount: (senderId) => {
    const { users, allUsers } = get();

    if (users.some((user) => user._id === senderId)) {
      set((state) => ({
        users: state.users.map((user) =>
          user._id === senderId ? { ...user, unreadCount: (user.unreadCount || 0) + 1 } : user
        ),
      }));
      return;
    }

    const sender = allUsers.find((user) => user._id === senderId);
    if (sender) {
      get().addConversation(sender, 1);
    } else {
      // Somebody who signed up after this sidebar was loaded
      get().getUsers();
    }
  },

  bumpGroupUnreadCount: (groupId) =>
    set((state) => ({
      groupUnread: { ...state.groupUnread, [groupId]: (state.groupUnread[groupId] || 0) + 1 },
    })),

  // Registered once per socket, from useAuthStore.connectSocket, and not per open chat: with
  // no chat selected there would otherwise be no listener at all, and nothing would update.
  // Every handler reads the current selectedUser at event time.
  subscribeToMessages: (providedSocket) => {
    const socket = providedSocket || useAuthStore.getState().socket;
    if (!socket) return;

    // A second connect must not leave two sets of listeners behind
    get().unsubscribeFromMessages();

    const listeners = {
      newMessage: (newMessage) => {
        const { selectedUser } = get();

        const isGroupMessage = Boolean(newMessage.groupId);
        const isOpenChat = isGroupMessage
          ? selectedUser?._id === newMessage.groupId
          : selectedUser?._id === newMessage.senderId;

        if (!isOpenChat) {
          if (!isGroupMessage) {
            // A DM bumps (or creates) its sidebar row
            get().bumpUnreadCount(newMessage.senderId);
          } else if (newMessage.senderId !== getAuthUserId()) {
            get().bumpGroupUnreadCount(newMessage.groupId);
            // newGroup only reaches members who were online, so a group this tab never heard of
            // is fetched here; getUsers also reloads the groups
            if (!get().groups.some((group) => group._id === newMessage.groupId)) get().getUsers();
          }
          return;
        }

        set((state) => ({ messages: mergeMessages(state.messages, [newMessage]) }));
        if (!isGroupMessage) {
          // A chat opened from New chat gets its row now that a message exists
          get().addConversation(selectedUser);
          get().markMessagesAsRead(newMessage.senderId);
        }
      },

      messageDeletedForEveryone: (messageId) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === messageId ? asDeletedForEveryone(msg) : msg
          ),
        }));
      },

      messageEdited: (editedMessage) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === editedMessage._id ? editedMessage : msg
          ),
        }));
      },

      messageReacted: (reactedMessage) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === reactedMessage._id ? reactedMessage : msg
          ),
        }));
      },

      messagesRead: ({ readerId }) => {
        const { selectedUser } = get();
        if (selectedUser?._id === readerId) {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.receiverId === readerId ? { ...msg, status: "read" } : msg
            ),
          }));
        }
      },

      newGroup: (newGroup) => {
        set((state) => {
          // Prevent duplicate if creator already added it locally
          if (state.groups.find(g => g._id === newGroup._id)) return state;
          return { groups: [...state.groups, newGroup] };
        });
      },

      userTyping: ({ userId }) => {
        set((state) =>
          state.typingUsers.includes(userId)
            ? state
            : { typingUsers: [...state.typingUsers, userId] }
        );
      },

      userStoppedTyping: ({ userId }) => {
        set((state) => ({
          typingUsers: state.typingUsers.filter((id) => id !== userId),
        }));
      },
    };

    Object.entries(listeners).forEach(([event, listener]) => socket.on(event, listener));
    registeredSocketListeners = { socket, listeners };
  },

  unsubscribeFromMessages: () => {
    if (!registeredSocketListeners) return;

    const { socket, listeners } = registeredSocketListeners;
    Object.entries(listeners).forEach(([event, listener]) => socket.off(event, listener));
    registeredSocketListeners = null;
  },

  setSelectedUser: (selectedUser) =>
    set((state) => ({
      selectedUser,
      searchQuery: "",
      loadedPageCount: 1,
      hasMore: true,
      // An older page still loading for the previous chat is dropped when it lands
      isLoadingOlderMessages: false,
      replyingTo: null,
      // Opening a group reads its unread messages
      groupUnread: selectedUser?.isGroup
        ? withoutKey(state.groupUnread, selectedUser._id)
        : state.groupUnread,
    })),
  setSelectedProfileUser: (selectedProfileUser) => set({ selectedProfileUser }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
