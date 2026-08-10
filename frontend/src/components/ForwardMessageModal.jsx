import { useState } from "react";
import { X, Search, Forward } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const DoubleForwardIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="11 17 16 12 11 7" />
    <polyline points="16 17 21 12 16 7" />
    <path d="M4 18v-2a4 4 0 0 1 4-4h8" />
  </svg>
);

const ForwardMessageModal = () => {
  const { allUsers, groups, messageToForward, setMessageToForward, forwardMessage } = useChatStore();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  if (!messageToForward) return null;

  const combinedList = [
    ...allUsers.map(u => ({ ...u, isGroup: false })),
    ...groups.map(g => ({ ...g, isGroup: true, fullName: g.name, profilePic: g.groupImage }))
  ];

  const filteredList = combinedList.filter((item) =>
    item.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleForward = () => {
    if (selectedIds.length === 0) return;
    forwardMessage(selectedIds, messageToForward);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-200 w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-base-300">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DoubleForwardIcon className="size-5 text-primary" />
            Forward Message
          </h2>
          <button onClick={() => setMessageToForward(null)} className="btn btn-sm btn-circle btn-ghost">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="form-control">
            <div className="relative mb-2">
              <Search className="size-4 absolute left-3 top-3.5 text-base-content/50" />
              <input
                type="text"
                placeholder="Search to forward..."
                className="input input-sm input-bordered w-full pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-2">
              {filteredList.map((item) => (
                <label
                  key={item._id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-300 transition-colors w-full cursor-pointer"
                >
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-sm checkbox-primary shrink-0" 
                    checked={selectedIds.includes(item._id)}
                    onChange={() => toggleSelection(item._id)}
                  />
                  <div className="avatar shrink-0">
                    <div className="size-10 rounded-full">
                      <img
                        src={item.profilePic || "/avatar.png"}
                        alt={item.fullName}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.fullName}</div>
                    {item.isGroup && <div className="text-xs text-zinc-400">Group</div>}
                  </div>
                </label>
              ))}
              {filteredList.length === 0 && (
                <div className="text-center text-zinc-500 py-8 text-sm">
                  No contacts found
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-base-300 flex justify-end gap-2">
          <button onClick={() => setMessageToForward(null)} className="btn btn-ghost">Cancel</button>
          <button 
            onClick={handleForward} 
            className="btn btn-primary"
            disabled={selectedIds.length === 0}
          >
            Forward ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
