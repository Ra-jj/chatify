import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen, formatMemberCount } from "../lib/utils";
import ModalShell from "./ModalShell";
import Avatar from "./Avatar";
import ImageLightbox from "./ImageLightbox";

const ProfileModal = () => {
  const { selectedProfileUser, setSelectedProfileUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showFullScreenPic, setShowFullScreenPic] = useState(false);

  // The modal stays mounted so its exit animation can play; while closing, AnimatePresence
  // keeps showing the content from the last render where a profile was selected.
  const isGroup = Boolean(selectedProfileUser?.isGroup);
  const isOnline = Boolean(selectedProfileUser) && onlineUsers.includes(selectedProfileUser._id);
  const closeModal = () => setSelectedProfileUser(null);

  let statusText = "";
  if (selectedProfileUser) {
    if (isGroup) statusText = formatMemberCount(selectedProfileUser.members);
    else if (isOnline) statusText = "Online now";
    else statusText = formatLastSeen(selectedProfileUser.lastSeen);
  }

  return (
    <>
      <ModalShell
        isOpen={Boolean(selectedProfileUser)}
        title={isGroup ? "Group info" : "Contact info"}
        onClose={closeModal}
        onBackdropClick={closeModal}
        zIndexClassName="z-[100]"
        panelClassName="max-w-sm"
      >
        {selectedProfileUser && (
          <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
            <button
              type="button"
              aria-label="View photo full size"
              title="View photo full size"
              className="rounded-full transition-opacity hover:opacity-90 disabled:cursor-default disabled:hover:opacity-100"
              disabled={!selectedProfileUser.profilePic}
              onClick={() => {
                if (selectedProfileUser.profilePic) {
                  setShowFullScreenPic(true);
                }
              }}
            >
              <Avatar
                src={selectedProfileUser.profilePic}
                isGroup={isGroup}
                className="size-28"
                iconClassName="size-10"
              />
            </button>

            <h3 className="mt-4 text-xl font-semibold tracking-tight">{selectedProfileUser.fullName}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] text-base-content/75">
              {isOnline && <span className="size-2 rounded-full bg-success" aria-hidden="true" />}
              {statusText}
            </p>

            <dl className="mt-6 w-full divide-y divide-base-content/10 border-t border-base-content/10 text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-base-content/75">{isGroup ? "Created" : "Joined"}</dt>
                <dd className="font-medium">
                  {new Date(selectedProfileUser.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric"
                  })}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </ModalShell>

      {/* Full Screen Image Modal */}
      <ImageLightbox
        isOpen={showFullScreenPic && Boolean(selectedProfileUser?.profilePic)}
        src={selectedProfileUser?.profilePic}
        alt="Full screen profile"
        onClose={() => setShowFullScreenPic(false)}
        zIndexClassName="z-[110]"
      />
    </>
  );
};

export default ProfileModal;
