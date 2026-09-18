// Placeholder bubbles in the same shapes as real messages: incoming left, own right
const SKELETON_BUBBLES = [
  { isMine: false, widthClassName: "w-48", heightClassName: "h-10", isFirstOfRun: true },
  { isMine: false, widthClassName: "w-64", heightClassName: "h-14", isFirstOfRun: false },
  { isMine: true, widthClassName: "w-40", heightClassName: "h-10", isFirstOfRun: true },
  { isMine: false, widthClassName: "w-56", heightClassName: "h-10", isFirstOfRun: true },
  { isMine: true, widthClassName: "w-60", heightClassName: "h-14", isFirstOfRun: true },
  { isMine: true, widthClassName: "w-32", heightClassName: "h-10", isFirstOfRun: false },
];

const MessageSkeleton = () => {
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-3 pb-4 pt-10 sm:px-6" aria-busy="true" aria-label="Loading messages">
      {SKELETON_BUBBLES.map((bubble, idx) => (
        <div
          key={idx}
          className={`flex ${bubble.isMine ? "justify-end" : "justify-start"} ${
            idx === 0 ? "" : bubble.isFirstOfRun ? "mt-4" : "mt-1"
          }`}
        >
          <div
            className={`skeleton max-w-[75%] rounded-2xl sm:max-w-[65%] ${bubble.widthClassName} ${bubble.heightClassName} ${
              bubble.isFirstOfRun ? (bubble.isMine ? "rounded-tr-md" : "rounded-tl-md") : ""
            }`}
          />
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
