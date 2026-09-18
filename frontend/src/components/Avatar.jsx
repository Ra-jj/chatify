import { Users } from "lucide-react";

// Round avatar with an optional online dot. Groups without an image get an icon tile.
// `ringClassName` should match the surface behind the avatar so the dot looks cut out.
const Avatar = ({
  src,
  alt = "",
  isGroup = false,
  isOnline = false,
  className = "size-11",
  iconClassName = "size-5",
  ringClassName = "ring-base-100",
  dotClassName = "size-3",
}) => {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {isGroup && !src ? (
        <span className="flex size-full items-center justify-center rounded-full bg-primary/10 text-primary-ink">
          <Users className={iconClassName} aria-hidden="true" />
        </span>
      ) : (
        <img
          src={src || "/avatar.png"}
          alt={alt}
          className="size-full rounded-full bg-base-200 object-cover"
        />
      )}
      {isOnline && (
        <span
          aria-hidden="true"
          className={`absolute bottom-0 right-0 rounded-full bg-success ring-2 ${dotClassName} ${ringClassName}`}
        />
      )}
    </span>
  );
};

export default Avatar;
