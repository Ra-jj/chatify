import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Trash2, X, Edit2, Check, CheckCheck, Loader2, Ban } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    editMessage,
    searchQuery,
    hasMore,
    page,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const [previousScrollHeight, setPreviousScrollHeight] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    // Only auto-scroll to bottom on initial load (page 1)
    if (messageEndRef.current && messages && page === 1) {
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, page]);

  // Handle scroll position preservation when prepending older messages
  useEffect(() => {
    if (scrollRef.current && page > 1) {
      const currentScrollHeight = scrollRef.current.scrollHeight;
      const heightDifference = currentScrollHeight - previousScrollHeight;
      scrollRef.current.scrollTop = heightDifference;
    }
  }, [messages, page, previousScrollHeight]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight } = scrollRef.current;
      // Fetch more if scrolled to top, there are more messages, and not currently loading
      if (scrollTop === 0 && hasMore && !isMessagesLoading) {
        setPreviousScrollHeight(scrollHeight);
        getMessages(selectedUser._id, page + 1);
      }
    }
  };

  if (isMessagesLoading && page === 1) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
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

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      <div className="flex-1 relative overflow-hidden">
        {/* Fixed Background Layer */}
        <div 
          className="absolute inset-0 z-0"
          style={{ 
            backgroundImage: "url('/doodle-bg.png')", 
            backgroundRepeat: "repeat",
            backgroundSize: "400px",
          }}
        >
          <div className="absolute inset-0 bg-base-100/50 mix-blend-overlay"></div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 space-y-4 z-10"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {isMessagesLoading && page > 1 && (
            <div className="flex justify-center my-4 relative z-20">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}

          {filteredMessages.length === 0 && searchQuery && (
            <div className="text-center text-zinc-500 mt-4 relative z-20">
            No messages match &quot;{searchQuery}&quot;
          </div>
        )}

        {filteredMessages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"} group relative z-10`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1 flex justify-end gap-2 h-5">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {message.senderId === authUser._id && message.text && !message.isDeletedForEveryone && (
                  <button
                    onClick={() => {
                      setEditingMessageId(message._id);
                      setEditText(message.text);
                    }}
                    className="text-zinc-500 hover:text-emerald-500"
                  >
                    <Edit2 className="size-4" />
                  </button>
                )}
                
                <div className={`dropdown ${message.senderId === authUser._id ? "dropdown-end" : ""}`}>
                  <div tabIndex={0} role="button" className="text-error hover:text-red-600 flex items-center justify-center p-1">
                    <Trash2 className="size-4" />
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-300 rounded-box w-48 ml-1">
                    <li>
                      <button onClick={() => { deleteMessage(message._id, "me"); document.activeElement.blur(); }} className="text-sm">
                        Delete for me
                      </button>
                    </li>
                    {message.senderId === authUser._id && !message.isDeletedForEveryone && (
                      <li>
                        <button onClick={() => { deleteMessage(message._id, "everyone"); document.activeElement.blur(); }} className="text-error text-sm">
                          Delete for everyone
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            <div className="chat-bubble flex flex-col relative overflow-visible">
              {message.isDeletedForEveryone ? (
                <div className="italic text-zinc-400 flex items-center gap-2 py-1">
                  <Ban className="size-4" /> 
                  <span className="text-sm">This message was deleted</span>
                </div>
              ) : (
                <>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(message.image)}
                    />
                  )}
                  {editingMessageId === message._id ? (
                    <form 
                      onSubmit={(e) => handleEditSubmit(e, message._id)}
                      className="flex items-center gap-2 mt-1"
                    >
                      <input 
                        type="text" 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="input input-sm input-bordered w-full text-base-content bg-base-100"
                        autoFocus
                      />
                      <button type="submit" className="btn btn-sm btn-circle btn-success btn-outline">
                        <Check className="size-4" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingMessageId(null)}
                        className="btn btn-sm btn-circle btn-error btn-outline"
                      >
                        <X className="size-4" />
                      </button>
                    </form>
                  ) : (
                    message.text && <p className="mb-1">{message.text}</p>
                  )}
                </>
              )}


              {/* Timestamp and Ticks */}
              <div className="flex items-center justify-end gap-1 text-[10px] opacity-70 mt-1 self-end ml-4">
                <time>
                  {formatMessageTime(message.createdAt)}
                  {message.isEdited && <span className="italic ml-1">(edited)</span>}
                </time>
                {message.senderId === authUser._id && (
                  <div className="flex items-center ml-1">
                    {message.status === "read" ? (
                      <CheckCheck className="size-4 text-blue-400" />
                    ) : message.status === "delivered" ? (
                      <CheckCheck className="size-4 text-base-content/70" />
                    ) : (
                      <Check className="size-4 text-base-content/70" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      <MessageInput />

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full flex items-center justify-center h-full">
            <button 
              className="absolute top-4 right-4 p-2 bg-base-100 rounded-full hover:bg-base-200 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="size-6" />
            </button>
            <img 
              src={selectedImage} 
              alt="Full screen attachment" 
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatContainer;
