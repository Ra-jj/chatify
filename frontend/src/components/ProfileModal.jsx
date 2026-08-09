import { X, Mail, Calendar } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";

const ProfileModal = () => {
  const { selectedProfileUser, setSelectedProfileUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showFullScreenPic, setShowFullScreenPic] = useState(false);

  if (!selectedProfileUser) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setSelectedProfileUser(null)}
      >
        <div 
          className="bg-base-300 rounded-xl p-8 max-w-sm w-full relative shadow-2xl flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
            onClick={() => setSelectedProfileUser(null)}
          >
            <X className="size-5" />
          </button>
          
          <img 
            src={selectedProfileUser.profilePic || "/avatar.png"} 
            alt={selectedProfileUser.fullName} 
            className="size-40 rounded-full object-cover border-4 border-base-100 shadow-lg mb-6 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              if (selectedProfileUser.profilePic) {
                setShowFullScreenPic(true);
              }
            }}
          />
          
          <h2 className="text-2xl font-bold mb-1">{selectedProfileUser.fullName}</h2>
          <p className="text-emerald-500 font-medium mb-6">
            {onlineUsers.includes(selectedProfileUser._id) ? "Online now" : formatLastSeen(selectedProfileUser.lastSeen)}
          </p>

          <div className="w-full space-y-4">
            <div className="flex items-center gap-3 bg-base-200 p-3 rounded-lg">
              <Mail className="size-5 text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 uppercase font-semibold">Email</span>
                <span className="text-sm truncate">{selectedProfileUser.email}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-base-200 p-3 rounded-lg">
              <Calendar className="size-5 text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 uppercase font-semibold">Joined</span>
                <span className="text-sm">
                  {new Date(selectedProfileUser.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {showFullScreenPic && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowFullScreenPic(false)}
        >
          <div className="relative max-w-5xl w-full flex items-center justify-center h-full">
            <button 
              className="absolute top-4 right-4 p-2 bg-base-100 rounded-full hover:bg-base-200 transition-colors"
              onClick={() => setShowFullScreenPic(false)}
            >
              <X className="size-6" />
            </button>
            <img 
              src={selectedProfileUser.profilePic} 
              alt="Full screen profile" 
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileModal;
