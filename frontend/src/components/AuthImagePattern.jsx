import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { CheckCheck, SendHorizontal } from "lucide-react";

// Right half of the auth pages (lg and up): a static chat-card mockup, pure markup,
// with a serif hero line underneath. On mount it plays once like a live conversation.
const MOCK_MESSAGES = [
  { id: 1, isMine: false, text: "Are we still on for Saturday?", time: "18:02" },
  { id: 2, isMine: true, text: "Yes! Booked a table for eight", time: "18:03", isRead: true },
  { id: 3, isMine: false, text: "Perfect. I'll bring the photos from the trip", time: "18:04", reaction: "❤️" },
  { id: 4, isMine: true, text: "Can't wait to see them", time: "18:04", isRead: true },
];

// Timeline, in seconds. Hidden items keep their space (opacity only), so nothing shifts.
const FIRST_MESSAGE_AT = 0.5;
const MESSAGE_GAP = 0.6;
const REACTION_AFTER_MESSAGE = 0.35;
const TYPING_AT = FIRST_MESSAGE_AT + MOCK_MESSAGES.length * MESSAGE_GAP;
const CALM_EASE = [0.22, 1, 0.36, 1];

// With reduced motion, `initial: false` renders the end state on the very first paint
const riseIn = (isInstant, delay, distance = 7, duration = 0.45) => ({
  initial: isInstant ? false : { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration, ease: CALM_EASE },
});

const TypingIndicator = ({ isInstant }) => (
  <m.div className="flex justify-start" {...riseIn(isInstant, TYPING_AT)}>
    <div className="flex items-center gap-1 rounded-2xl bg-base-200 px-3.5 py-3" aria-label="Priya is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 rounded-full bg-base-content/60 motion-safe:animate-typing-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </m.div>
);

const AuthImagePattern = ({ headline, supportingText }) => {
  const isInstant = Boolean(useReducedMotion());

  return (
    <div className="relative hidden flex-col items-center justify-center overflow-hidden border-l border-base-content/10 bg-base-200 px-12 py-16 lg:flex">
      {/* Very soft primary glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, oklch(var(--p) / 0.16), transparent)" }}
      />

      {/* Slow ±4px float; with reduced motion MotionConfig skips it */}
      <m.div
        className="relative w-full max-w-sm"
        aria-hidden="true"
        animate={{ y: [0, -4, 0, 4, 0] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, delay: TYPING_AT }}
      >
        {/* Second conversation peeking out behind, for depth */}
        <m.div
          className="absolute -right-8 -top-10 w-[78%] rotate-[4deg] rounded-2xl border border-base-content/10 bg-base-100/70 p-4"
          initial={isInstant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.9, ease: CALM_EASE }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-base-content/75">
              S
            </span>
            <div className="space-y-1.5">
              <div className="h-2 w-20 rounded-full bg-base-content/15" />
              <div className="h-2 w-32 rounded-full bg-base-content/10" />
            </div>
          </div>
          <div className="mt-6 h-2 w-3/4 rounded-full bg-base-content/10" />
        </m.div>

        {/* Main chat card */}
        <m.div
          className="relative overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-2xl shadow-base-content/5"
          {...riseIn(isInstant, 0, 10, 0.6)}
        >
          <div className="flex items-center gap-3 border-b border-base-content/10 px-4 py-3">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary-ink">
              P
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Priya</p>
              <p className="text-xs text-base-content/75">online</p>
            </div>
          </div>

          <div className="space-y-2 px-4 py-4">
            {MOCK_MESSAGES.map((message, index) => {
              const appearsAt = FIRST_MESSAGE_AT + index * MESSAGE_GAP;
              return (
                <div key={message.id} className={`flex flex-col ${message.isMine ? "items-end" : "items-start"}`}>
                  <m.div
                    className={`flex max-w-[80%] flex-wrap items-end gap-x-2.5 rounded-2xl px-3 py-1.5 text-[14px] leading-snug ${
                      message.isMine ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"
                    }`}
                    {...riseIn(isInstant, appearsAt)}
                  >
                    <span>{message.text}</span>
                    <span
                      className={`ml-auto flex items-center gap-0.5 text-[10.5px] leading-4 ${
                        message.isMine ? "text-primary-content" : "text-base-content/75"
                      }`}
                    >
                      {message.time}
                      {message.isRead && <CheckCheck className="size-3.5" strokeWidth={2.75} />}
                    </span>
                  </m.div>
                  {message.reaction && (
                    <m.span
                      className="-mt-1.5 ml-2 flex h-6 items-center rounded-full border border-base-content/10 bg-base-100 px-1.5 text-xs"
                      initial={isInstant ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: appearsAt + REACTION_AFTER_MESSAGE,
                        opacity: { delay: appearsAt + REACTION_AFTER_MESSAGE, duration: 0.2 },
                        scale: { type: "spring", visualDuration: 0.35, bounce: 0.3, delay: appearsAt + REACTION_AFTER_MESSAGE },
                      }}
                    >
                      {message.reaction}
                    </m.span>
                  )}
                </div>
              );
            })}

            <TypingIndicator isInstant={isInstant} />
          </div>

          <div className="px-3 pb-3">
            <div className="flex h-10 items-center gap-2 rounded-full border border-base-content/10 bg-base-200 pl-4 pr-1.5">
              <span className="flex-1 text-[13px] text-base-content/75">Write a message…</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-content">
                <SendHorizontal className="size-4" />
              </span>
            </div>
          </div>
        </m.div>
      </m.div>

      <div className="relative mt-14 max-w-md text-center">
        <m.h2
          className="text-balance font-display text-5xl leading-[1.05] tracking-tight"
          {...riseIn(isInstant, 0.3, 6, 0.9)}
        >
          {headline}
        </m.h2>
        <m.p
          className="mt-4 text-balance text-[15px] leading-relaxed text-base-content/75"
          {...riseIn(isInstant, 0.5, 6, 0.9)}
        >
          {supportingText}
        </m.p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
