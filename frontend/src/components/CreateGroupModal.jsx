import { useState } from "react";
import { UsersRound } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import ModalShell from "./ModalShell";
import SearchField from "./SearchField";
import Avatar from "./Avatar";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { allUsers: users, createGroup } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      return toast.error("Group name is required");
    }
    if (selectedMembers.length === 0) {
      return toast.error("Select at least one member");
    }

    setIsLoading(true);
    try {
      await createGroup(groupName, selectedMembers);
      onClose();
      setGroupName("");
      setSelectedMembers([]);
    } catch {
      // createGroup reports both outcomes itself, so a group created from anywhere else
      // shows the same single toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="New group"
      icon={<UsersRound className="size-[18px] text-base-content/75" aria-hidden="true" />}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm h-9 rounded-lg px-4 font-medium">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="btn btn-primary btn-sm h-9 min-w-[7.5rem] rounded-lg px-4 font-medium"
            disabled={
              isLoading || !groupName.trim() || selectedMembers.length === 0
            }
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm" aria-label="Creating group"></span>
            ) : (
              "Create group"
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5 px-5 pt-4">
        <div>
          <label htmlFor="create-group-name" className="mb-1.5 block text-sm font-medium">
            Group name
          </label>
          <input
            id="create-group-name"
            type="text"
            placeholder="e.g. Weekend Plans"
            className="input h-10 w-full rounded-lg border-base-content/20 bg-base-100 text-[15px] placeholder:text-base-content/75 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium">Members</span>
            <span className="text-[13px] text-base-content/75">{selectedMembers.length} selected</span>
          </div>
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" />
        </div>
      </div>

      <div className="flex flex-col px-3 pb-3 pt-2">
        {filteredUsers.map((user) => {
          const isSelected = selectedMembers.includes(user._id);
          return (
            <label
              key={user._id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                isSelected ? "bg-base-200" : "hover:bg-base-200/60"
              }`}
            >
              <Avatar src={user.profilePic} ringClassName={isSelected ? "ring-base-200" : "ring-base-100"} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{user.fullName}</span>
              <input
                type="checkbox"
                className="checkbox checkbox-sm shrink-0 rounded-md border-base-content/30 [--chkbg:oklch(var(--p))] [--chkfg:oklch(var(--pc))] checked:border-primary"
                checked={isSelected}
                onChange={() => toggleMember(user._id)}
              />
            </label>
          );
        })}
        {filteredUsers.length === 0 && (
          <p className="py-8 text-center text-sm text-base-content/75">No users found</p>
        )}
      </div>
    </ModalShell>
  );
};

export default CreateGroupModal;
