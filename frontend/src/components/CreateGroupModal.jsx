import { useState } from "react";
import { X, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { allUsers: users, createGroup } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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
    } catch (error) {
      // Error handled in store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-200 w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-base-300">
          <h2 className="text-xl font-bold">Create Group</h2>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Group Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Weekend Plans"
              className="input input-bordered w-full"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-medium">
                Select Members ({selectedMembers.length})
              </span>
            </label>
            <div className="relative mb-3">
              <Search className="size-4 absolute left-3 top-3.5 text-base-content/50" />
              <input
                type="text"
                placeholder="Search users..."
                className="input input-sm input-bordered w-full pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
              {filteredUsers.map((user) => (
                <label
                  key={user._id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 cursor-pointer transition-colors border border-transparent hover:border-base-300"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                  <div className="avatar">
                    <div className="size-8 rounded-full">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                      />
                    </div>
                  </div>
                  <span className="font-medium flex-1 truncate">
                    {user.fullName}
                  </span>
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4 text-sm">
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-base-300 flex justify-end gap-3 bg-base-300/50 rounded-b-2xl">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn btn-primary"
            disabled={
              isLoading || !groupName.trim() || selectedMembers.length === 0
            }
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Create Group"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
