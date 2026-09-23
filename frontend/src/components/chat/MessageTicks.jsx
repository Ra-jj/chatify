// Delivery ticks for own messages: one muted check when sent, two muted checks when delivered,
// two blue checks when read. Read is also drawn with a heavier stroke, so the states can be told
// apart without relying on colour (count separates Sent from the rest, weight separates Read).
//
// The double tick is compact: the second check overlaps the first, and its short arm stops just
// clear of the first check's long arm so it reads as tucked behind it, not as two separate
// side-by-side checks. Every state uses the same 16x11 box, so a status change never moves the
// timestamp beside it.

const REGULAR_STROKE_WIDTH = 1.5;
const READ_STROKE_WIDTH = 2;
// The halo is only painted in themes that set --read-tick-halo (see index.css); elsewhere it is transparent
const READ_HALO_WIDTH = READ_STROKE_WIDTH + 2;

const SINGLE_CHECK_PATH = "M3.25 6l3 3 6.5-7";
const FRONT_CHECK_PATH = "M1 6l3 3 6.5-7";
// The back check's short arm starts later for the heavier Read stroke, to keep the same gap
const BACK_CHECK_PATH_REGULAR = "M7.65 8.15l.85.85 6.5-7";
const BACK_CHECK_PATH_READ = "M8 8.5l.5.5 6.5-7";

const STATUS_LABELS = { sent: "Sent", delivered: "Delivered", read: "Read" };

// Own bubbles are bg-primary; a message deleted for everyone drops to an outlined bg-base-100 bubble.
// 70% primary-content is the lowest opacity that measured >= 3:1 against primary in all 10 themes
// (tightest: chatify at 3.08:1).
const PRIMARY_COLOR_CLASS_NAMES = { muted: "text-primary-content/70", read: "text-read-tick" };
const BASE_COLOR_CLASS_NAMES = { muted: "text-base-content/60", read: "text-read-tick-on-base" };

// surface: "primary" (own bubble, the default) or "base" (deleted-for-everyone bubble)
const MessageTicks = ({ status, surface = "primary" }) => {
  // Anything that is not yet delivered or read shows as sent, as before
  const normalizedStatus = status === "read" || status === "delivered" ? status : "sent";
  const isRead = normalizedStatus === "read";
  const isOnBase = surface === "base";
  const colorClassNames = isOnBase ? BASE_COLOR_CLASS_NAMES : PRIMARY_COLOR_CLASS_NAMES;
  const doubleCheckPath = `${FRONT_CHECK_PATH}${isRead ? BACK_CHECK_PATH_READ : BACK_CHECK_PATH_REGULAR}`;

  return (
    <span className="inline-flex shrink-0 items-center" data-tick-status={normalizedStatus}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 11"
        width="16"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        overflow="visible"
        aria-hidden="true"
        className={isRead ? colorClassNames.read : colorClassNames.muted}
      >
        {normalizedStatus === "sent" ? (
          <path d={SINGLE_CHECK_PATH} strokeWidth={REGULAR_STROKE_WIDTH} />
        ) : (
          <>
            {isRead && !isOnBase && (
              <path d={doubleCheckPath} strokeWidth={READ_HALO_WIDTH} className="stroke-read-tick-halo" />
            )}
            <path d={doubleCheckPath} strokeWidth={isRead ? READ_STROKE_WIDTH : REGULAR_STROKE_WIDTH} />
          </>
        )}
      </svg>
      <span className="sr-only">{STATUS_LABELS[normalizedStatus]}</span>
    </span>
  );
};

export default MessageTicks;
