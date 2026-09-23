import { useState } from "react";
import { useChatStore } from "../store/useChatStore";

import DoubleForwardIcon from "./DoubleForwardIcon";
import ModalShell from "./ModalShell";
import SearchField from "./SearchField";
import Avatar from "./Avatar";

const ForwardMessageModal = () => {
  const { allUsers, groups, messageToForward, setMessageToForward, forwardMessage } = useChatStore();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // The dialog stays mounted between messages, so each opening starts from a clean sheet
  // instead of the recipients and search text of the last forward. Reset during render (React's
  // pattern for adjusting state to a changed value) so the old ticks never paint, not even for
  // the one frame an effect would leave them on screen.
  const [openedForMessage, setOpenedForMessage] = useState(messageToForward);
  if (openedForMessage !== messageToForward) {
    setOpenedForMessage(messageToForward);
    if (messageToForward) {
      setSelectedIds([]);
      setSearch("");
    }
  }

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
    <ModalShell
      isOpen={Boolean(messageToForward)}
      title="Forward message"
      icon={<DoubleForwardIcon className="size-[18px] text-base-content/75" />}
      onClose={() => setMessageToForward(null)}
      zIndexClassName="z-[100]"
      footer={
        <>
          <button
            type="button"
            onClick={() => setMessageToForward(null)}
            className="btn btn-ghost btn-sm h-9 rounded-lg px-4 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleForward}
            className="btn btn-primary btn-sm h-9 rounded-lg px-4 font-medium"
            disabled={selectedIds.length === 0}
          >
            Forward ({selectedIds.length})
          </button>
        </>
      }
    >
      <div className="sticky top-0 z-10 bg-base-100 px-5 pb-2 pt-4">
        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people and groups" />
      </div>

      <div className="flex flex-col px-3 pb-3">
        {filteredList.map((item) => {
          const isSelected = selectedIds.includes(item._id);
          return (
            <label
              key={item._id}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                isSelected ? "bg-base-200" : "hover:bg-base-200/60"
              }`}
            >
              <Avatar src={item.profilePic} isGroup={item.isGroup} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{item.fullName}</div>
                {item.isGroup && <div className="text-[13px] text-base-content/75">Group</div>}
              </div>
              <input
                type="checkbox"
                className="checkbox checkbox-sm shrink-0 rounded-md border-base-content/30 [--chkbg:oklch(var(--p))] [--chkfg:oklch(var(--pc))] checked:border-primary"
                checked={isSelected}
                onChange={() => toggleSelection(item._id)}
              />
            </label>
          );
        })}
        {filteredList.length === 0 && (
          <p className="py-10 text-center text-sm text-base-content/75">No contacts found</p>
        )}
      </div>
    </ModalShell>
  );
};

export default ForwardMessageModal;
