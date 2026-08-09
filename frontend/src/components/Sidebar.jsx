import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MessagesSquare, Plus, SquarePen } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import NewChatModal from "./NewChatModal";

const Sidebar = () => {
  const { getUsers, users, groups, selectedUser, setSelectedUser, isUsersLoading, setSelectedProfileUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'chats', 'groups'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const displayList = useMemo(() => {
    // Map groups to a compatible shape
    const formattedGroups = groups.map(g => ({
      ...g,
      isGroup: true,
      fullName: g.name,
      profilePic: g.groupImage || null,
      unreadCount: 0, // Groups don't have unread count built-in yet
    }));

    let list = [];
    if (activeTab === "all") list = [...users, ...formattedGroups];
    else if (activeTab === "chats") list = [...users];
    else if (activeTab === "groups") list = [...formattedGroups];

    if (showOnlineOnly && activeTab !== "groups") {
      list = list.filter((item) => item.isGroup || onlineUsers.includes(item._id));
    }

    // Sort: you might want to sort by latest message in future, but for now just alphabet or users then groups
    return list;
  }, [users, groups, activeTab, showOnlineOnly, onlineUsers]);

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className={`h-full border-r border-base-300 flex flex-col transition-all duration-200 ${selectedUser ? "hidden sm:flex sm:w-72 lg:w-72" : "w-full sm:w-72 lg:w-72"}`}>
      <div className="border-b border-base-300 w-full p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessagesSquare className="size-6" />
            <span className="font-medium text-lg">Chats</span>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="btn btn-sm btn-circle btn-ghost" 
              title="New Chat"
            >
              <SquarePen className="size-5" />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn btn-sm btn-circle btn-ghost" 
              title="Create Group"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-200/50 p-1">
          <a className={`tab tab-sm flex-1 ${activeTab === 'all' ? 'tab-active' : ''}`} onClick={() => setActiveTab('all')}>All</a>
          <a className={`tab tab-sm flex-1 ${activeTab === 'chats' ? 'tab-active' : ''}`} onClick={() => setActiveTab('chats')}>DMs</a>
          <a className={`tab tab-sm flex-1 ${activeTab === 'groups' ? 'tab-active' : ''}`} onClick={() => setActiveTab('groups')}>Groups</a>
        </div>

        {activeTab !== "groups" && (
          <div className="flex items-center gap-2 px-1">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-xs"
              />
              <span className="text-xs">Online only</span>
            </label>
            <span className="text-[10px] text-zinc-500">({Math.max(0, onlineUsers.length - 1)} online)</span>
          </div>
        )}
      </div>

      <div className="overflow-y-auto w-full py-2 flex-1">
        {displayList.map((item) => (
          <button
            key={item._id}
            onClick={() => setSelectedUser(item)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === item._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div 
              className="relative mx-auto lg:mx-0 cursor-pointer shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProfileUser(item);
              }}
            >
              {item.isGroup ? (
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  {item.profilePic ? (
                    <img src={item.profilePic} alt={item.fullName} className="size-12 object-cover rounded-full" />
                  ) : (
                    <Users className="size-6" />
                  )}
                </div>
              ) : (
                <img
                  src={item.profilePic || "/avatar.png"}
                  alt={item.fullName}
                  className="size-12 object-cover rounded-full hover:opacity-80 transition-opacity"
                />
              )}
              
              {!item.isGroup && onlineUsers.includes(item._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>

            {/* User/Group info */}
            <div className="flex justify-between items-center w-full min-w-0">
              <div className="text-left min-w-0">
                <div className="font-medium truncate">{item.fullName}</div>
                <div className="text-xs text-zinc-400 truncate flex items-center gap-1">
                  {item.isGroup ? (
                    <span>{item.members?.length || 0} members</span>
                  ) : (
                    onlineUsers.includes(item._id) ? "Online" : "Offline"
                  )}
                </div>
              </div>
              {item.unreadCount > 0 && (
                <div className="badge badge-error badge-sm">
                  {item.unreadCount}
                </div>
              )}
            </div>
          </button>
        ))}

        {displayList.length === 0 && (
          <div className="text-center text-zinc-500 py-8 text-sm flex flex-col items-center gap-2">
            <MessagesSquare className="size-8 opacity-20" />
            No conversations found
          </div>
        )}
      </div>

      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <NewChatModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} />
    </aside>
  );
};
export default Sidebar;
