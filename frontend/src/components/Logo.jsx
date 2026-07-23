import { MessagesSquare } from "lucide-react";

const Logo = ({ className = "w-8 h-8" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Define the gradient */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="chatify-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" /> {/* Cyan */}
            <stop offset="100%" stopColor="#a855f7" /> {/* Purple */}
          </linearGradient>
        </defs>
      </svg>
      {/* Use lucide icon with gradient stroke and subtle fill */}
      <MessagesSquare 
        className="w-full h-full" 
        style={{ 
          stroke: "url(#chatify-gradient)", 
          strokeWidth: 2,
          fill: "url(#chatify-gradient)",
          fillOpacity: 0.15 
        }} 
      />
    </div>
  );
};

export default Logo;

