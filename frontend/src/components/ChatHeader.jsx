import { X, Search, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers, searchQuery, setSearchQuery, setSelectedProfileUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <button 
            className="sm:hidden text-base-content/70 hover:text-base-content" 
            onClick={() => setSelectedUser(null)}
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Clickable Profile Info */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-base-300 p-2 rounded-lg transition-colors"
            onClick={() => setSelectedProfileUser(selectedUser)}
          >
            {/* Avatar */}
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              </div>
            </div>

            {/* User info */}
            <div>
              <h3 className="font-medium">{selectedUser.fullName}</h3>
              <p className="text-sm text-base-content/70">
                {typingUsers?.includes(selectedUser._id) 
                  ? <span className="text-emerald-500 italic">typing...</span> 
                  : onlineUsers.includes(selectedUser._id) 
                    ? "Online" 
                    : formatLastSeen(selectedUser.lastSeen)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative hidden sm:flex items-center">
            <Search className="size-4 absolute left-3 text-base-content/50" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered pl-9 w-40 sm:w-64 rounded-full"
            />
          </div>

          {/* Close button */}
          <button onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
