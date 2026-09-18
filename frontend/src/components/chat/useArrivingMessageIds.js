import { useEffect, useRef } from "react";

const NO_MESSAGE_IDS = new Set();

// Ids of messages that arrived (sent here or received over the socket) after the open chat
// finished loading. Only these animate in. Excluded, on purpose:
// - messages from the chat's initial load (and the stale list briefly shown while switching chats)
// - older pages prepended by infinite scroll, which land before the newest known message
//
// Refs are only read during render and only written in effects, so StrictMode's double render
// cannot mark a message as "seen" before the render that should animate it has committed.
// Call it after ChatContainer's getMessages effect: on a chat switch that effect flips
// isMessagesLoading first, and this hook waits for that load to finish before tracking arrivals.
export const useArrivingMessageIds = (messages, chatId, isMessagesLoading) => {
  const knownMessageIdsRef = useRef(new Set());
  const isTrackingArrivalsRef = useRef(false);
  const hasSeenLoadForChatRef = useRef(false);

  useEffect(() => {
    isTrackingArrivalsRef.current = false;
    hasSeenLoadForChatRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (isMessagesLoading) {
      hasSeenLoadForChatRef.current = true;
      return;
    }
    knownMessageIdsRef.current = new Set(messages.map((message) => message._id));
    if (hasSeenLoadForChatRef.current) isTrackingArrivalsRef.current = true;
  }, [messages, isMessagesLoading]);

  if (!isTrackingArrivalsRef.current) return NO_MESSAGE_IDS;

  let lastKnownIndex = -1;
  messages.forEach((message, index) => {
    if (knownMessageIdsRef.current.has(message._id)) lastKnownIndex = index;
  });
  return new Set(messages.slice(lastKnownIndex + 1).map((message) => message._id));
};
