import { useState } from "react";
import { X, Search, MessagesSquare } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const NewChatModal = ({ isOpen, onClose }) => {
  const { allUsers, setSelectedUser } = useChatStore();
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filteredUsers = allUsers.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-200 w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-base-300">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessagesSquare className="size-5 text-primary" />
            New Chat
          </h2>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="form-control">
            <div className="relative mb-2">
              <Search className="size-4 absolute left-3 top-3.5 text-base-content/50" />
              <input
                type="text"
                placeholder="Search contacts..."
                className="input input-sm input-bordered w-full pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-2">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-300 transition-colors w-full text-left"
                >
                  <div className="avatar">
                    <div className="size-10 rounded-full">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-8 text-sm">
                  No contacts found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
