import { SquarePen, UsersRound } from "lucide-react";
import Logo from "./Logo";

const NoChatSelected = ({ onNewChat, onNewGroup }) => {
  return (
    <div className="bg-dot-grid hidden min-w-0 flex-1 flex-col items-center justify-center p-10 text-base-content md:flex">
      <div className="flex max-w-md flex-col items-center text-center">
        <Logo className="size-12" />

        <h2 className="mt-6 font-display text-[2.75rem] leading-[1.05] tracking-tight">
          Pick up where you left off
        </h2>
        <p className="mt-3 text-[15px] text-base-content/75">
          Choose a conversation from the list, or start a new one.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={onNewChat} className="btn btn-primary btn-sm h-9 rounded-full px-4 font-medium">
            <SquarePen className="size-4" aria-hidden="true" />
            New chat
          </button>
          <button
            type="button"
            onClick={onNewGroup}
            className="btn btn-outline btn-sm h-9 rounded-full border-base-content/15 px-4 font-medium hover:border-base-content/25 hover:bg-base-200 hover:text-base-content"
          >
            <UsersRound className="size-4" aria-hidden="true" />
            New group
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
