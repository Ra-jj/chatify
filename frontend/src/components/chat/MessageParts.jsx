import { useState } from "react";
import { Ban, ImageOff } from "lucide-react";
import DoubleForwardIcon from "../DoubleForwardIcon";
import MessageTicks from "./MessageTicks";
import { formatMessageTime } from "../../lib/utils";

// Presentational pieces of a message bubble. Colours depend on `isMine`, because own bubbles
// sit on bg-primary and everyone else's on bg-base-200. Text on primary stays at full
// primary-content: in the chatify theme even 80% opacity drops below 4.5:1.

// Stops a press inside the bubble from starting the swipe/long-press gesture
const stopGesture = {
  onMouseDown: (e) => e.stopPropagation(),
  onTouchStart: (e) => e.stopPropagation(),
};

const getHostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const ReplyQuote = ({ replyTo, isMine, senderName }) => {
  const snippet =
    replyTo.text || (replyTo.image ? "📷 Photo" : replyTo.audio ? "🎤 Voice Note" : "Message");

  return (
    <div
      className={`mb-1.5 min-w-0 rounded-r-lg border-l-2 px-2.5 py-1.5 text-[13px] leading-snug ${
        isMine ? "border-primary-content/60 text-primary-content" : "border-primary bg-base-100/70"
      }`}
      style={{ pointerEvents: "none" }} // Prevent dragging conflicts when clicking inside
    >
      <div className={`font-semibold ${isMine ? "" : "text-primary-ink"}`}>{senderName}</div>
      <div className={`max-w-[150px] truncate sm:max-w-[250px] ${isMine ? "" : "text-base-content/75"}`}>
        {snippet}
      </div>
    </div>
  );
};

export const ForwardedLabel = ({ isMine }) => (
  <div
    className={`pointer-events-none mb-1 flex items-center gap-1 text-xs italic ${
      isMine ? "text-primary-content" : "text-base-content/75"
    }`}
  >
    <DoubleForwardIcon className="size-3" />
    Forwarded
  </div>
);

export const DeletedNotice = () => (
  <div className="flex items-center gap-1.5 text-sm italic text-base-content/75">
    <Ban className="size-3.5" aria-hidden="true" />
    <span>This message was deleted</span>
  </div>
);

// Media in message rows must keep a fixed box from the first paint. A box that grows when the
// image loads, or collapses when it fails, moves every row below it AFTER ChatContainer has
// restored the scroll position for prepended older messages, and the view jumps.
const MediaFailedPlaceholder = ({ className }) => (
  <div className={`flex items-center justify-center bg-base-300 text-base-content/60 ${className}`}>
    <ImageOff className="size-5" aria-hidden="true" />
  </div>
);

// Image attached to a message: a fixed 4:3 box so the layout never shifts while it loads.
// object-contain letterboxes portrait images instead of cropping them.
export const MessageImage = ({ src, onOpen }) => {
  const [hasFailed, setHasFailed] = useState(false);

  return (
    <button
      type="button"
      aria-label="Open image"
      title="Open image"
      className="mb-1.5 block w-64 max-w-full overflow-hidden rounded-xl bg-base-300"
      onClick={onOpen}
    >
      {hasFailed ? (
        <MediaFailedPlaceholder className="aspect-[4/3] w-full" />
      ) : (
        <img
          src={src}
          alt="Attachment"
          className="aspect-[4/3] w-full object-contain transition-opacity hover:opacity-90"
          onError={() => setHasFailed(true)}
        />
      )}
    </button>
  );
};

// Always a base-100 card, even inside an own bubble, so its text keeps base contrast
export const LinkPreviewCard = ({ linkPreview }) => {
  const hostname = getHostname(linkPreview.url);
  const [hasImageFailed, setHasImageFailed] = useState(false);

  return (
    <a
      href={linkPreview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1.5 block w-64 max-w-full overflow-hidden rounded-xl border border-base-content/10 bg-base-100 text-base-content transition-colors hover:border-base-content/25"
      {...stopGesture}
    >
      {linkPreview.image &&
        (hasImageFailed ? (
          // Same h-32 box as the image: a scraped image URL going dead must not change the row height
          <MediaFailedPlaceholder className="h-32 w-full" />
        ) : (
          <img
            src={linkPreview.image}
            alt=""
            className="h-32 w-full bg-base-300 object-cover"
            onError={() => setHasImageFailed(true)}
          />
        ))}
      <div className="px-3 py-2.5">
        {hostname && <p className="truncate text-xs text-base-content/75">{hostname}</p>}
        <h4 className="truncate text-sm font-semibold">{linkPreview.title}</h4>
        {linkPreview.description && (
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-base-content/75">
            {linkPreview.description}
          </p>
        )}
      </div>
    </a>
  );
};

export const ReactionChips = ({ reactions, onReact }) => {
  const countsByEmoji = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative mt-1 flex flex-wrap gap-1">
      {Object.entries(countsByEmoji).map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          aria-label={`${emoji} ${count}, toggle your reaction`}
          title="Toggle your reaction"
          onClick={(e) => {
            e.stopPropagation();
            onReact(emoji);
          }}
          {...stopGesture}
          className="flex h-6 items-center gap-1 rounded-full border border-base-content/10 bg-base-100 px-2 text-xs transition-colors hover:bg-base-200"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-[11px] font-medium text-base-content/75">{count}</span>}
        </button>
      ))}
    </div>
  );
};

export const MessageMeta = ({ message, isMine }) => {
  // Deleted messages drop the primary fill, so their meta and ticks use base colours
  const isOnPrimary = isMine && !message.isDeletedForEveryone;

  return (
    <span
      className={`pointer-events-none ml-auto flex shrink-0 items-center gap-1 self-end pl-1 text-[11px] leading-4 ${
        isOnPrimary ? "text-primary-content" : "text-base-content/75"
      }`}
    >
      <time>
        {formatMessageTime(message.createdAt)}
        {message.isEdited && <span className="ml-1">(edited)</span>}
      </time>
      {isMine && <MessageTicks status={message.status} surface={isOnPrimary ? "primary" : "base"} />}
    </span>
  );
};
