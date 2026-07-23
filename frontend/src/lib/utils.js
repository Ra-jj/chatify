export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatLastSeen(dateString) {
  if (!dateString) return "Offline";
  const date = new Date(dateString);
  const now = new Date();
  
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 24 && date.getDate() === now.getDate()) {
    return `Last seen today at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  } else if (diffInHours < 48 && (now.getDate() - date.getDate() === 1 || diffInHours > 24)) {
    return `Last seen yesterday at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  } else {
    return `Last seen ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
}
