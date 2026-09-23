import { useState } from "react";
import { SquarePen } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import ModalShell from "./ModalShell";
import SearchField from "./SearchField";
import Avatar from "./Avatar";

const NewChatModal = ({ isOpen, onClose }) => {
  const { allUsers, setSelectedUser } = useChatStore();
  const [search, setSearch] = useState("");

  const filteredUsers = allUsers.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="New chat"
      icon={<SquarePen className="size-[18px] text-base-content/75" aria-hidden="true" />}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm h-9 rounded-lg px-4 font-medium">
          Cancel
        </button>
      }
    >
      <div className="sticky top-0 z-10 bg-base-100 px-5 pb-2 pt-4">
        <SearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts"
          autoFocus
        />
      </div>

      <div className="flex flex-col px-3 pb-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            type="button"
            onClick={() => handleSelectUser(user)}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-base-200/60"
          >
            <Avatar src={user.profilePic} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{user.fullName}</span>
          </button>
        ))}
        {filteredUsers.length === 0 && (
          <p className="py-10 text-center text-sm text-base-content/75">No contacts found</p>
        )}
      </div>
    </ModalShell>
  );
};

export default NewChatModal;
