import Logo from "./Logo";
import { Send } from "lucide-react";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12 relative overflow-hidden">
      {/* faint radial glow to give the panel some warmth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(245, 158, 11, 0.12), transparent 55%), radial-gradient(circle at 80% 80%, rgba(15, 23, 42, 0.35), transparent 60%)",
        }}
      />

      <div className="relative max-w-md w-full text-center">
        {/* Brand mark */}
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Logo className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">Chatify</span>
          </div>

        {/* Chat-bubble constellation — loose, asymmetric, not a rigid grid */}
        <div className="relative h-56 mb-8">
          {/* big amber bubble, top-left */}
          <div
            className="absolute left-2 top-2 w-32 h-20 rounded-lg bg-primary/20 border border-primary/30
                       flex items-center gap-2 px-3 animate-pulse"
          >
            <div className="size-2 rounded-full bg-primary/70" />
            <div className="size-2 rounded-full bg-primary/70" />
            <div className="size-2 rounded-full bg-primary/70" />
          </div>

          {/* small slate bubble, top-right (sent, with tail) */}
          <div className="absolute right-2 top-6 w-28 h-14 rounded-lg bg-base-300 border border-base-300
                          flex items-center justify-center">
            <Send className="w-4 h-4 text-primary/80" />
          </div>

          {/* medium bubble center */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-20 w-40 h-12 rounded-lg bg-primary/15
                       border border-primary/20 flex items-center px-3 gap-1.5"
            style={{ animation: "pulse 2.4s ease-in-out infinite", animationDelay: "0.4s" }}
          >
            <span className="h-1.5 w-12 rounded-full bg-primary/40" />
            <span className="h-1.5 w-6 rounded-full bg-primary/40" />
            <span className="h-1.5 w-10 rounded-full bg-primary/40" />
          </div>

          {/* small incoming bubble, bottom-left */}
          <div className="absolute left-6 bottom-2 w-24 h-10 rounded-lg bg-base-300 border border-base-300
                          flex items-center px-3">
            <span className="h-1.5 w-16 rounded-full bg-base-content/40" />
          </div>

          {/* amber accent bubble, bottom-right (tailed) */}
          <div className="absolute right-4 bottom-0 w-28 h-16 rounded-lg bg-primary/25 border border-primary/30
                          flex items-center px-3">
            <span className="h-1.5 w-10 rounded-full bg-primary/70" />
            <span className="h-1.5 w-6 rounded-full bg-primary/70 ml-1.5" />
          </div>

          {/* tiny dot bubble, mid-right */}
          <div className="absolute right-12 top-2 size-4 rounded-full bg-primary/40 animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
