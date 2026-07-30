import Logo from "./Logo";

const NoChatSelected = () => {
  return (
    <div 
      className="hidden sm:flex w-full flex-1 flex-col items-center justify-center p-16 relative overflow-hidden"
      style={{ 
        backgroundImage: "url('/doodle-bg.png')", 
        backgroundRepeat: "repeat",
        backgroundSize: "400px" 
      }}
    >
      {/* Optional dark overlay for better text readability */}
      <div className="absolute inset-0 bg-base-100/50 mix-blend-overlay"></div>

      <div className="max-w-md text-center space-y-6 relative z-10 p-8 rounded-3xl bg-base-100/20 backdrop-blur-sm border border-white/5 shadow-2xl">
        {/* Icon Display */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div className="flex items-center justify-center animate-bounce">
              <Logo className="w-16 h-16" zapSize="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-2xl font-bold">Welcome to Chatify!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
