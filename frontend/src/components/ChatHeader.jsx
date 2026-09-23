import { useState } from "react";
import { X, Search, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen, formatMemberCount } from "../lib/utils";
import Avatar from "./Avatar";
import IconButton from "./IconButton";
import SearchField from "./SearchField";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers, searchQuery, setSearchQuery, setSelectedProfileUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  // Below the sm breakpoint the search field collapses to an icon and expands over the header
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const isTyping = typingUsers?.includes(selectedUser._id);
  const isOnline = onlineUsers.includes(selectedUser._id);

  let statusText;
  if (isTyping) statusText = <span className="text-primary-ink">typing…</span>;
  else if (selectedUser.isGroup) statusText = formatMemberCount(selectedUser.members);
  else if (isOnline) statusText = "Online";
  else statusText = formatLastSeen(selectedUser.lastSeen);

  const closeMobileSearch = () => {
    setSearchQuery("");
    setIsMobileSearchOpen(false);
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-1 border-b border-base-content/10 bg-base-100 px-2 sm:gap-3 sm:px-4">
      {/* Mobile back button */}
      <IconButton
        label="Back to chats"
        icon={ArrowLeft}
        onClick={() => setSelectedUser(null)}
        className="md:hidden"
        iconClassName="size-5"
      />

      {/* Clickable profile info */}
      <button
        type="button"
        onClick={() => setSelectedProfileUser(selectedUser)}
        title={selectedUser.isGroup ? "View group info" : "View profile"}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-base-200 sm:flex-none"
      >
        <Avatar
          src={selectedUser.profilePic}
          isGroup={selectedUser.isGroup}
          className="size-10"
          iconClassName="size-[18px]"
        />
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold leading-tight">{selectedUser.fullName}</h3>
          <p className="truncate text-[13px] leading-tight text-base-content/75">{statusText}</p>
        </div>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Inline search from sm up */}
        <SearchField
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in chat"
          className="hidden h-9 w-44 sm:flex lg:w-60"
        />

        <IconButton
          label="Search in chat"
          icon={Search}
          onClick={() => setIsMobileSearchOpen(true)}
          className={`sm:hidden ${searchQuery ? "text-primary-ink" : ""}`}
        />

        {/* Close button */}
        <IconButton
          label="Close chat"
          icon={X}
          onClick={() => setSelectedUser(null)}
          className="hidden md:inline-flex"
          iconClassName="size-5"
        />
      </div>

      {isMobileSearchOpen && (
        <div className="absolute inset-0 flex items-center gap-1 bg-base-100 px-2 sm:hidden">
          <IconButton label="Close search" icon={ArrowLeft} onClick={closeMobileSearch} iconClassName="size-5" />
          <SearchField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in chat"
            autoFocus
            className="flex-1"
          />
        </div>
      )}
    </header>
  );
};
export default ChatHeader;
