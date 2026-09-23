import { useChatStore } from "../store/useChatStore";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import ForwardMessageModal from "./ForwardMessageModal";
import Avatar from "./Avatar";
import ImageLightbox from "./ImageLightbox";
import SwipeableBubble from "./chat/SwipeableBubble";
import MessageActions from "./chat/MessageActions";
import { useArrivingMessageIds } from "./chat/useArrivingMessageIds";
import { ENTER_TRANSITION } from "../lib/motionTransitions";
import {
  DeletedNotice,
  ForwardedLabel,
  LinkPreviewCard,
  MessageImage,
  MessageMeta,
  ReactionChips,
  ReplyQuote,
} from "./chat/MessageParts";

const ChatContainer = () => {
  const {
    messages,
    users,
    allUsers,
    getMessages,
    isMessagesLoading,
    isLoadingOlderMessages,
    selectedUser,
    deleteMessage,
    editMessage,
    reactToMessage,
    searchQuery,
    hasMore,
    loadedPageCount,
    setReplyingTo,
    setMessageToForward,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const scrollRef = useRef(null);
  // Set when an older page is requested: the message at the top of the view, how far it sat
  // from the top, and which message was oldest then. Cleared once that page is in place.
  const scrollAnchorRef = useRef(null);

  // The socket listeners are registered for the whole session in useAuthStore.connectSocket,
  // so this only loads the newest page of the chat being opened.
  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  // Must stay below the getMessages effect above (see the hook's comment)
  const arrivingMessageIds = useArrivingMessageIds(messages, selectedUser._id, isMessagesLoading);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Only auto-scroll to bottom while the newest page is all that is loaded
    if (messageEndRef.current && messages && loadedPageCount === 1) {
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, loadedPageCount]);

  // Keeps the reader's place when an older page is prepended: the message that was at the top
  // of the view is put back at the same distance from the top. A layout effect, so the page
  // never paints at the wrong position. It acts once per page, so later arrivals, edits and
  // reactions leave the scroll position alone.
  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    const container = scrollRef.current;
    if (!anchor || !container) return;

    // While only the spinner has appeared nothing is prepended yet, and the spinner stays in view
    const hasPrepended = messages[0]?._id !== anchor.oldestMessageId;
    if (hasPrepended) {
      const anchorElement = container.querySelector(`[data-message-id="${anchor.messageId}"]`);
      if (anchorElement) {
        const offsetFromTop = anchorElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop += offsetFromTop - anchor.offsetFromTop;
      }
    }

    // The spinner can leave in a later render than the page arrives, so the anchor is
    // applied again then, and dropped only once loading is over
    if (!isLoadingOlderMessages) scrollAnchorRef.current = null;
  }, [messages, isLoadingOlderMessages]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    // Fetch more if scrolled to top, there are more messages, and not currently loading
    if (container.scrollTop === 0 && hasMore && !isMessagesLoading && !isLoadingOlderMessages && messages.length > 0) {
      // The first rendered message, which is not messages[0] while a search filters the list
      const topMessageElement = container.querySelector("[data-message-id]");
      scrollAnchorRef.current = topMessageElement
        ? {
            messageId: topMessageElement.dataset.messageId,
            offsetFromTop: topMessageElement.getBoundingClientRect().top - container.getBoundingClientRect().top,
            oldestMessageId: messages[0]._id,
          }
        : null;

      // The oldest message held is the cursor for the page before it
      getMessages(selectedUser._id, messages[0]._id);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Filter messages based on search query
  const filteredMessages = messages.filter((msg) =>
    msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditSubmit = (e, messageId) => {
    e.preventDefault();
    if (editText.trim()) {
      editMessage(messageId, editText);
      setEditingMessageId(null);
    }
  };

  // In a group the sender often has no DM history, so `users` alone cannot name them. The
  // group's own members carry the public profile of everyone in it, then DM partners, then
  // everyone else with an account. Unknown is left for a sender found in none of them.
  const getSenderProfile = (id) => {
    if (id === authUser._id) return authUser;

    const groupMember = selectedUser.isGroup
      ? selectedUser.members?.find((member) => member._id === id)
      : null;

    return (
      groupMember ||
      users.find((u) => u._id === id) ||
      allUsers.find((u) => u._id === id) || { fullName: "Unknown", profilePic: "/avatar.png" }
    );
  };

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <ChatHeader />

      {/* Dot grid lives on the non-scrolling layer so it stays put while messages scroll */}
      <div className="bg-dot-grid relative min-h-0 flex-1 text-base-content">
        <div
          className="absolute inset-0 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-10 sm:px-6"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {isLoadingOlderMessages && (
            <div className="my-2 flex justify-center">
              <Loader2 className="size-5 text-base-content/60 motion-safe:animate-spin" aria-label="Loading older messages" />
            </div>
          )}

          {filteredMessages.length === 0 && searchQuery && (
            <div className="mx-auto mt-4 w-fit max-w-full truncate rounded-full border border-base-content/10 bg-base-100 px-4 py-1.5 text-[13px] text-base-content/75">
              No messages match &quot;{searchQuery}&quot;
            </div>
          )}

          {filteredMessages.map((message, index) => {
            const senderProfile = getSenderProfile(message.senderId);
            const isMine = message.senderId === authUser._id;
            const isFirstOfRun = index === 0 || filteredMessages[index - 1].senderId !== message.senderId;
            const showsAvatarColumn = selectedUser.isGroup && !isMine;
            const isEditing = editingMessageId === message._id;

            // The corner nearest the sender's side is tightened on the first bubble of a run
            let bubbleClassName;
            if (message.isDeletedForEveryone) {
              bubbleClassName = "border border-base-content/15 bg-base-100 text-base-content";
            } else if (isMine) {
              bubbleClassName = "bg-primary text-primary-content";
            } else {
              bubbleClassName = "bg-base-200 text-base-content";
            }
            const cornerClassName = isFirstOfRun ? (isMine ? "rounded-tr-md" : "rounded-tl-md") : "";

            return (
              <m.div
                key={message._id}
                data-message-id={message._id}
                ref={messageEndRef}
                className={`group/message ${isFirstOfRun ? "mt-4 first:mt-0" : "mt-1"}`}
                // Only live arrivals rise in; initial and prepended messages mount in place.
                // The swipe gesture moves the inner bubble, so this outer transform never fights it.
                initial={!prefersReducedMotion && arrivingMessageIds.has(message._id) ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={ENTER_TRANSITION}
              >
                {selectedUser.isGroup && !isMine && isFirstOfRun && (
                  <div className="mb-1 truncate pl-10 text-[13px] font-medium text-base-content/75">
                    {senderProfile.fullName}
                  </div>
                )}

                <div className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                  {showsAvatarColumn &&
                    (isFirstOfRun ? (
                      <Avatar src={senderProfile.profilePic} className="size-8" dotClassName="size-2.5" />
                    ) : (
                      <span className="w-8 shrink-0" aria-hidden="true" />
                    ))}

                  <div className={`flex min-w-0 max-w-[75%] flex-col sm:max-w-[65%] ${isMine ? "items-end" : "items-start"}`}>
                    <div className="relative max-w-full">
                      <SwipeableBubble
                        isMine={isMine}
                        onReply={() => setReplyingTo(message)}
                        onLongPress={() => setMessageToForward(message)}
                        className={`rounded-2xl px-3 py-2 ${cornerClassName} ${bubbleClassName}`}
                      >
                        {/* Threaded reply block. The server keeps replyTo on a message deleted
                            for everyone, so the quote is hidden here as well as dropped from
                            the local copy, and a reload looks the same as the live update. */}
                        {message.replyTo && !message.isDeletedForEveryone && (
                          <ReplyQuote
                            replyTo={message.replyTo}
                            isMine={isMine}
                            senderName={
                              message.replyTo.senderId === authUser._id
                                ? "You"
                                : getSenderProfile(message.replyTo.senderId).fullName
                            }
                          />
                        )}

                        {message.isDeletedForEveryone ? (
                          <div className="flex flex-wrap items-end gap-x-3">
                            <DeletedNotice />
                            <MessageMeta message={message} isMine={isMine} />
                          </div>
                        ) : (
                          <>
                            {message.isForwarded && <ForwardedLabel isMine={isMine} />}

                            {message.image && (
                              <MessageImage
                                src={message.image}
                                onOpen={(e) => {
                                  e.stopPropagation();
                                  setSelectedImage(message.image);
                                }}
                              />
                            )}

                            {message.audio && (
                              <audio
                                src={message.audio}
                                controls
                                className="mb-1.5 h-10 w-52 max-w-full sm:w-64"
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                              />
                            )}

                            {message.linkPreview && (
                              <LinkPreviewCard linkPreview={message.linkPreview} />
                            )}

                            {isEditing ? (
                              <form
                                onSubmit={(e) => handleEditSubmit(e, message._id)}
                                className="flex w-[min(18rem,60vw)] items-center gap-1.5 py-0.5"
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  aria-label="Edit message"
                                  className="input input-sm h-8 min-w-0 flex-1 rounded-lg border-transparent bg-base-100 text-[15px] text-base-content focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-content/60"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  aria-label="Save edit"
                                  title="Save edit"
                                  className="btn btn-circle btn-sm min-h-0 border-0 bg-primary-content text-primary hover:bg-primary-content/90"
                                >
                                  <Check className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Cancel edit"
                                  title="Cancel edit"
                                  onClick={() => setEditingMessageId(null)}
                                  className="btn btn-circle btn-ghost btn-sm min-h-0 text-primary-content hover:bg-primary-content/15"
                                >
                                  <X className="size-4" aria-hidden="true" />
                                </button>
                              </form>
                            ) : (
                              <div className="flex flex-wrap items-end gap-x-3">
                                {message.text && (
                                  <p className="pointer-events-none min-w-0 whitespace-pre-wrap text-[15px] leading-snug [overflow-wrap:anywhere]">
                                    {message.text}
                                  </p>
                                )}
                                <MessageMeta message={message} isMine={isMine} />
                              </div>
                            )}
                          </>
                        )}
                      </SwipeableBubble>

                      <MessageActions
                        message={message}
                        isMine={isMine}
                        onReply={() => setReplyingTo(message)}
                        onForward={() => setMessageToForward(message)}
                        onEdit={() => {
                          setEditingMessageId(message._id);
                          setEditText(message.text);
                        }}
                        onDelete={(type) => deleteMessage(message._id, type)}
                        onReact={(emoji) => reactToMessage(message._id, emoji)}
                        reactionMenuOpensDown={index === 0}
                        deleteMenuOpensUp={index >= 2 && index >= filteredMessages.length - 2}
                      />
                    </div>

                    {message.reactions && message.reactions.length > 0 && (
                      <ReactionChips
                        reactions={message.reactions}
                        onReact={(emoji) => reactToMessage(message._id, emoji)}
                      />
                    )}
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>
      </div>

      <MessageInput />

      {/* Full screen image viewer */}
      <ImageLightbox
        isOpen={Boolean(selectedImage)}
        src={selectedImage}
        alt="Full screen attachment"
        onClose={() => setSelectedImage(null)}
      />
      <ForwardMessageModal />
    </div>
  );
};
export default ChatContainer;
