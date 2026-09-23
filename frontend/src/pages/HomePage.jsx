import { useState } from "react";
import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import ProfileModal from "../components/ProfileModal";
import CreateGroupModal from "../components/CreateGroupModal";
import NewChatModal from "../components/NewChatModal";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  // Lives here (not in Sidebar) so the empty state can open the same modals
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Navbar hides itself on phones while a chat is open, so the shell reclaims its 3.5rem there
  const shellHeightClassName = selectedUser
    ? "h-[100dvh] md:h-[calc(100dvh-3.5rem)]"
    : "h-[calc(100dvh-3.5rem)]";

  return (
    <div className={`bg-base-200/50 ${selectedUser ? "pt-0 md:pt-14" : "pt-14"}`}>
      <div className={`mx-auto max-w-[1400px] lg:p-3 ${shellHeightClassName}`}>
        <div className="flex h-full overflow-hidden bg-base-100 lg:rounded-xl lg:border lg:border-base-content/10">
          <Sidebar
            onNewChat={() => setIsNewChatModalOpen(true)}
            onNewGroup={() => setIsCreateGroupModalOpen(true)}
          />

          {!selectedUser ? (
            <NoChatSelected
              onNewChat={() => setIsNewChatModalOpen(true)}
              onNewGroup={() => setIsCreateGroupModalOpen(true)}
            />
          ) : (
            <ChatContainer />
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
      />
      <NewChatModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} />
      <ProfileModal />
    </div>
  );
};
export default HomePage;
