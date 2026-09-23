import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { ImagePlus, SendHorizontal, X, Smile, Mic, Square } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from 'emoji-picker-react';
import { DARK_THEMES } from "../constants";
import IconButton from "./IconButton";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ENTER_TRANSITION } from "../lib/motionTransitions";

const CHIP_MOTION = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: ENTER_TRANSITION },
  exit: { height: 0, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const { sendMessage, selectedUser, replyingTo, setReplyingTo } = useChatStore();
  const { socket } = useAuthStore();
  const { theme } = useThemeStore();
  const prefersReducedMotion = useReducedMotion();
  const chipMotion = prefersReducedMotion ? { ...CHIP_MOTION, initial: false } : CHIP_MOTION;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAudio = () => {
    setAudioUrl(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto stop after 2 mins (120000 ms)
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          stopRecording();
          toast.success("Voice note stopped automatically after 2 minutes.");
        }
      }, 120000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);

    if (socket && selectedUser) {
      socket.emit("typing", { receiverId: selectedUser._id });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
      }, 2000);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setText(prev => prev + emojiObject.emoji);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioUrl) return;

    // Clear typing timeout when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socket && selectedUser) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        audio: audioUrl,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      setAudioUrl(null);
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const isSendDisabled = (!text.trim() && !imagePreview && !audioUrl) || isRecording;
  const hasAttachmentRow = imagePreview || audioUrl;

  return (
    <div className="relative w-full shrink-0 bg-base-100 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      {/* Chips grow open and fold shut; the padding lives inside so it animates with the height.
          initial={false}: a chip already present when the composer mounts just appears. */}
      <AnimatePresence initial={false}>
        {replyingTo && (
          <m.div key="reply-chip" className="overflow-hidden" {...chipMotion}>
            <div className="pb-2">
              <div className="flex items-center gap-3 rounded-xl border border-base-content/10 bg-base-200 py-2 pl-3 pr-1.5">
                <span aria-hidden="true" className="w-0.5 self-stretch rounded-full bg-primary" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs font-semibold text-primary-ink">Replying to message</span>
                  <div className="mt-0.5 truncate text-[13px] text-base-content/75">
                    {replyingTo.text || (replyingTo.image ? "Photo" : replyingTo.audio ? "Voice Note" : "Message")}
                  </div>
                </div>
                <IconButton label="Cancel reply" icon={X} onClick={() => setReplyingTo(null)} iconClassName="size-4" />
              </div>
            </div>
          </m.div>
        )}

        {hasAttachmentRow && (
          <m.div key="attachment-chips" className="overflow-hidden" {...chipMotion}>
            {/* pt-1.5/pr-1.5 leave room for the remove buttons that poke out of each chip's corner */}
            <div className="flex flex-wrap items-end gap-2 pb-2 pr-1.5 pt-1.5">
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Image to send"
                    className="size-20 rounded-xl border border-base-content/10 object-cover"
                  />
                  <button
                    onClick={removeImage}
                    aria-label="Remove image"
                    title="Remove image"
                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-base-content/10 bg-base-100 text-base-content/80 shadow-sm hover:text-base-content"
                    type="button"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {audioUrl && (
                <div className="relative max-w-full rounded-xl border border-base-content/10 bg-base-200 p-1.5 pr-3">
                  <audio src={audioUrl} controls className="h-9 max-w-full" />
                  <button
                    onClick={removeAudio}
                    aria-label="Remove voice note"
                    title="Remove voice note"
                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-base-content/10 bg-base-100 text-base-content/80 shadow-sm hover:text-base-content"
                    type="button"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {showEmojiPicker && (
        <div className="absolute bottom-full left-3 z-50 max-w-[calc(100vw-1.5rem)] sm:left-4">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={DARK_THEMES.includes(theme) ? "dark" : "light"}
            width={Math.min(350, window.innerWidth - 24)}
          />
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-0.5 rounded-full border border-base-content/10 bg-base-200 p-1 transition-colors focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 sm:gap-1"
      >
        <IconButton
          label={showEmojiPicker ? "Close emoji picker" : "Open emoji picker"}
          icon={Smile}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`size-9 min-h-0 shrink-0 ${showEmojiPicker ? "text-primary-ink" : ""}`}
          iconClassName="size-5"
          aria-expanded={showEmojiPicker}
        />

        {isRecording ? (
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 px-2 text-sm font-medium" role="status">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full rounded-full bg-error opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2.5 rounded-full bg-error" />
            </span>
            <span className="truncate">Recording…</span>
          </div>
        ) : (
          <input
            type="text"
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-base-content outline-none placeholder:text-base-content/75"
            placeholder="Write a message…"
            aria-label="Message"
            value={text}
            onChange={handleTyping}
            onFocus={() => setShowEmojiPicker(false)}
            disabled={isRecording}
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />

        <IconButton
          label="Attach image"
          icon={ImagePlus}
          onClick={() => fileInputRef.current?.click()}
          className={`size-9 min-h-0 shrink-0 ${imagePreview ? "text-primary-ink" : ""}`}
          iconClassName="size-5"
        />

        <IconButton
          label={isRecording ? "Stop recording" : "Record voice note"}
          icon={isRecording ? Square : Mic}
          onClick={isRecording ? stopRecording : startRecording}
          className={`size-9 min-h-0 shrink-0 ${isRecording ? "bg-error/15 !text-error hover:bg-error/25" : ""}`}
          iconClassName={isRecording ? "size-4 fill-current" : "size-5"}
        />

        <button
          type="submit"
          aria-label="Send message"
          title="Send message"
          className="btn btn-circle btn-primary size-9 min-h-0 shrink-0 disabled:bg-base-content/10 disabled:text-base-content/40"
          disabled={isSendDisabled}
        >
          <SendHorizontal className="size-[18px]" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
