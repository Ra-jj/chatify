import { useEffect, useState, useMemo } from "react";
import { LazyMotion } from "motion/react";
import * as m from "motion/react-m";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { MessagesSquare, SquarePen, UsersRound } from "lucide-react";
import Avatar from "./Avatar";
import { formatMemberCount } from "../lib/utils";
import IconButton from "./IconButton";

// layoutId needs Motion's layout feature (domMax), which is not in the app-wide domAnimation
// bundle. Loading it here, on demand, keeps it out of the main chunk. Module scope keeps the
// loader stable, because LazyMotion only reads it once.
const loadLayoutFeatures = () => import("../lib/motionLayoutFeatures").then((module) => module.default);

// Calm slide between positions, no overshoot
const INDICATOR_TRANSITION = { type: "spring", visualDuration: 0.3, bounce: 0 };

const TABS = [
  { id: "all", label: "All" },
  { id: "chats", label: "DMs" },
  { id: "groups", label: "Groups" },
];

const Sidebar = ({ onNewChat, onNewGroup }) => {
  const { getUsers, users, groups, groupUnread, selectedUser, setSelectedUser, isUsersLoading, setSelectedProfileUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'chats', 'groups'

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
      // Counted in the store from live messages; the server keeps no unread state for groups
      unreadCount: groupUnread[g._id] || 0,
    }));

    // A chat opened from New chat has no row until its first message is sent or received
    // (the store adds one then). Until that, it is listed while it is open, and leaving it
    // without a message leaves no trace.
    const isOpenChatWithoutRow =
      selectedUser && !selectedUser.isGroup && !users.some((user) => user._id === selectedUser._id);
    const conversations = isOpenChatWithoutRow ? [...users, selectedUser] : users;

    let list = [];
    if (activeTab === "all") list = [...conversations, ...formattedGroups];
    else if (activeTab === "chats") list = [...conversations];
    else if (activeTab === "groups") list = [...formattedGroups];

    if (showOnlineOnly && activeTab !== "groups") {
      list = list.filter((item) => item.isGroup || onlineUsers.includes(item._id));
    }

    // Sort: you might want to sort by latest message in future, but for now just alphabet or users then groups
    return list;
  }, [users, groups, groupUnread, selectedUser, activeTab, showOnlineOnly, onlineUsers]);

  // On phones the list gives way to the open chat; from md up both sit side by side
  const asideClassName = `${selectedUser ? "hidden md:flex" : "flex"} h-full w-full shrink-0 flex-col border-r border-base-content/10 md:w-72 lg:w-80`;

  if (isUsersLoading) return <SidebarSkeleton className={asideClassName} />;

  const onlineCount = Math.max(0, onlineUsers.length - 1);

  const isEmptyBecauseOfFilter = showOnlineOnly && activeTab !== "groups";
  let emptyTitle = "No conversations yet";
  let emptyHint = "Start one with a person or a group.";
  if (isEmptyBecauseOfFilter) {
    emptyTitle = "Nobody is online right now";
    emptyHint = "Turn off Online only to see everyone.";
  } else if (activeTab === "groups") {
    emptyTitle = "No groups yet";
    emptyHint = "Create one to talk with several people at once.";
  }

  return (
    <LazyMotion features={loadLayoutFeatures} strict>
      <aside className={asideClassName}>
        <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Chats</h2>
            <div className="flex items-center gap-0.5">
              <IconButton label="New chat" icon={SquarePen} onClick={onNewChat} />
              <IconButton label="New group" icon={UsersRound} onClick={onNewGroup} />
            </div>
          </div>

          {/* Segmented control */}
          <div role="tablist" aria-label="Filter conversations" className="grid grid-cols-3 gap-0.5 rounded-lg bg-base-200 p-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative h-7 rounded-md text-[13px] font-medium transition-colors ${
                    isActive ? "text-base-content" : "text-base-content/75 hover:text-base-content"
                  }`}
                >
                  {isActive && (
                    <m.span
                      layoutId="sidebar-active-tab"
                      transition={INDICATOR_TRANSITION}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-md bg-base-100 shadow-sm ring-1 ring-base-content/10"
                    />
                  )}
                  <span className="relative">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== "groups" && (
            <label className="flex cursor-pointer items-center justify-between gap-2 px-0.5">
              <span className="text-[13px] text-base-content/75">
                Online only ({onlineCount})
              </span>
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="toggle toggle-primary toggle-xs"
              />
            </label>
          )}
        </div>

        {/* layoutScroll lets the indicator's layout animation account for this list's scroll offset */}
        <m.div layoutScroll className="flex-1 overflow-y-auto px-2 pb-2">
          {displayList.map((item) => {
            const isActive = selectedUser?._id === item._id;
            const isOnline = !item.isGroup && onlineUsers.includes(item._id);

            return (
              <button
                key={item._id}
                type="button"
                onClick={() => setSelectedUser(item)}
                aria-current={isActive ? "true" : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isActive ? "bg-base-200" : "hover:bg-base-200/60"
                }`}
              >
                {isActive && (
                  <m.span
                    layoutId="sidebar-active-conversation"
                    transition={INDICATOR_TRANSITION}
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                  />
                )}

                <div
                  className="shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
                  title={item.isGroup ? "View group info" : "View profile"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProfileUser(item);
                  }}
                >
                  <Avatar
                    src={item.profilePic}
                    isGroup={item.isGroup}
                    isOnline={isOnline}
                    ringClassName={isActive ? "ring-base-200" : "ring-base-100"}
                  />
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{item.fullName}</div>
                    <div className="truncate text-[13px] text-base-content/75">
                      {item.isGroup
                        ? formatMemberCount(item.members)
                        : isOnline
                          ? "Online"
                          : "Offline"}
                    </div>
                  </div>
                  {item.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-content">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {displayList.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-base-200 text-base-content/60">
                <MessagesSquare className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">{emptyTitle}</p>
                <p className="mt-1 text-[13px] text-base-content/75">{emptyHint}</p>
              </div>
              {!isEmptyBecauseOfFilter && (
                <button
                  type="button"
                  onClick={activeTab === "groups" ? onNewGroup : onNewChat}
                  className="btn btn-outline btn-sm rounded-full border-base-content/15 font-medium"
                >
                  {activeTab === "groups" ? "New group" : "New chat"}
                </button>
              )}
            </div>
          )}
        </m.div>
      </aside>
    </LazyMotion>
  );
};
export default Sidebar;
