import { Pencil, Reply, Smile, Trash2 } from "lucide-react";
import DoubleForwardIcon from "../DoubleForwardIcon";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const actionButtonClassName =
  "btn btn-circle btn-ghost btn-xs size-7 min-h-0 text-base-content/75 hover:bg-base-200 hover:text-base-content";

// daisyUI dropdowns open while focus is inside them; blurring closes the menu after a pick
const closeDropdown = () => document.activeElement?.blur();

// Small floating pill beside a bubble (above it on phones). Shown on hover, on keyboard focus,
// and on touch through the sticky :hover a tap leaves behind, same as before the redesign.
// The scroll area clips menus at its edges, so ChatContainer tells the rows at either end which way
// has room: the first row opens its reaction row downward, the last rows open the delete menu upward.
const MessageActions = ({
  message,
  isMine,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReact,
  reactionMenuOpensDown = false,
  deleteMenuOpensUp = false,
}) => {
  const canEdit = isMine && message.text && !message.isDeletedForEveryone;
  const canReact = !message.isDeletedForEveryone;

  const positionClassName = isMine
    ? "right-0 bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:right-full sm:mr-2 sm:top-1"
    : "left-0 bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:left-full sm:ml-2 sm:top-1";

  return (
    <div
      className={`pointer-events-none absolute z-20 flex items-center gap-0.5 rounded-full border border-base-content/10 bg-base-100 p-0.5 opacity-0 shadow-sm transition-opacity has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100 has-[.dropdown:focus-within]:pointer-events-auto has-[.dropdown:focus-within]:opacity-100 group-hover/message:pointer-events-auto group-hover/message:opacity-100 ${positionClassName}`}
    >
      <button
        type="button"
        onClick={onReply}
        aria-label="Reply"
        title="Reply"
        className={`${actionButtonClassName} hidden sm:inline-flex`}
      >
        <Reply className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onForward}
        aria-label="Forward"
        title="Forward"
        className={`${actionButtonClassName} hidden sm:inline-flex`}
      >
        <DoubleForwardIcon className="size-4" />
      </button>

      {canEdit && (
        <button type="button" onClick={onEdit} aria-label="Edit message" title="Edit message" className={actionButtonClassName}>
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {canReact && (
        <div className={`dropdown ${reactionMenuOpensDown ? "dropdown-bottom" : "dropdown-top"} ${isMine ? "dropdown-end" : ""}`}>
          <div tabIndex={0} role="button" aria-label="Add reaction" title="Add reaction" className={actionButtonClassName}>
            <Smile className="size-4" aria-hidden="true" />
          </div>
          <ul
            tabIndex={0}
            className={`dropdown-content z-50 flex flex-row gap-0.5 rounded-full border border-base-content/10 bg-base-100 p-1 shadow-lg ${
              reactionMenuOpensDown ? "mt-1.5" : "mb-1.5"
            }`}
          >
            {EMOJIS.map((emoji) => (
              <li key={emoji}>
                <button
                  type="button"
                  aria-label={`React with ${emoji}`}
                  title={`React with ${emoji}`}
                  onClick={() => { onReact(emoji); closeDropdown(); }}
                  className="flex size-8 items-center justify-center rounded-full text-lg transition-transform hover:bg-base-200 motion-safe:hover:scale-110"
                >
                  {emoji}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`dropdown ${deleteMenuOpensUp ? "dropdown-top" : ""} ${isMine ? "dropdown-end" : ""}`}>
        <div
          tabIndex={0}
          role="button"
          aria-label="Delete message"
          title="Delete message"
          className={`${actionButtonClassName} hover:!text-error`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </div>
        <ul
          tabIndex={0}
          className={`menu dropdown-content z-50 w-48 rounded-xl border border-base-content/10 bg-base-100 p-1.5 text-sm shadow-lg ${
            deleteMenuOpensUp ? "mb-1.5" : "mt-1.5"
          }`}
        >
          <li>
            <button type="button" onClick={() => { onDelete("me"); closeDropdown(); }} className="rounded-lg">
              Delete for me
            </button>
          </li>
          {isMine && !message.isDeletedForEveryone && (
            <li>
              <button type="button" onClick={() => { onDelete("everyone"); closeDropdown(); }} className="rounded-lg text-error">
                Delete for everyone
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MessageActions;
