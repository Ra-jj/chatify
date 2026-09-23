import { useRef, useState } from "react";
import { Reply } from "lucide-react";

// Swipe a bubble toward the centre to reply; hold it to forward.
// Gesture logic is unchanged from the original ChatContainer; only the markup is restyled.
const SwipeableBubble = ({ children, isMine, onReply, onLongPress, className = "" }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const longPressTimerRef = useRef(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    longPressTimerRef.current = setTimeout(() => {
      if (onLongPress) onLongPress();
    }, 500); // 500ms hold triggers long press
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    let diff = currentX - startXRef.current;

    if (Math.abs(diff) > 10) {
      clearLongPress();
    }

    // isMine: swipe left (negative diff)
    // not mine: swipe right (positive diff)
    if (isMine) {
      if (diff > 0) diff = 0;
      if (diff < -80) diff = -80;
    } else {
      if (diff < 0) diff = 0;
      if (diff > 80) diff = 80;
    }

    // add some friction
    setOffsetX(diff * 0.5);
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (Math.abs(offsetX) > 25) { // Threshold
      onReply();
    }
    setOffsetX(0);
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    longPressTimerRef.current = setTimeout(() => {
      if (onLongPress) onLongPress();
    }, 500);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const currentX = e.clientX;
    let diff = currentX - startXRef.current;

    if (Math.abs(diff) > 10) {
      clearLongPress();
    }

    if (isMine) {
      if (diff > 0) diff = 0;
      if (diff < -80) diff = -80;
    } else {
      if (diff < 0) diff = 0;
      if (diff > 80) diff = 80;
    }
    setOffsetX(diff * 0.5);
  };

  const handleMouseUp = () => {
    clearLongPress();
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (Math.abs(offsetX) > 25) {
      onReply();
    }
    setOffsetX(0);
  };

  const handleMouseLeave = () => {
    clearLongPress();
    if (isDraggingRef.current) {
      handleMouseUp();
    }
  };

  // The reply hint sits in the gap the bubble slides away from, so it is never clipped
  const replyHint = (isVisible, isArmed, positionClassName) => (
    <div
      aria-hidden="true"
      className={`absolute ${positionClassName} flex items-center justify-center transition-all duration-200`}
      style={{ opacity: isVisible ? 1 : 0, transform: `scale(${isArmed ? 1 : 0.5})` }}
    >
      <div className="rounded-full border border-base-content/10 bg-base-100 p-1.5">
        <Reply className="size-4 text-primary-ink" />
      </div>
    </div>
  );

  return (
    <div
      className="relative flex w-full items-center"
      style={{ justifyContent: isMine ? 'flex-end' : 'flex-start' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reply icon for incoming messages (left side) */}
      {!isMine && replyHint(offsetX > 10, offsetX > 20, "left-0")}

      {/* Bubble */}
      <div
        style={{ transform: `translateX(${offsetX}px)` }}
        className={`relative flex min-w-0 flex-col ${className} ${!isDraggingRef.current ? "transition-transform duration-300 ease-out" : "transition-none"}`}
      >
        {children}
      </div>

      {/* Reply icon for outgoing messages (right side) */}
      {isMine && replyHint(offsetX < -10, offsetX < -20, "right-0")}
    </div>
  );
};

export default SwipeableBubble;
