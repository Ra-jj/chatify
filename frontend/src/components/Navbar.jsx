import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { LogOut, Palette, Settings, UserRound } from "lucide-react";
import Logo from "./Logo";

// The auth pages carry their own logo and Appearance link, so the bar would only clutter them
const ROUTES_WITHOUT_NAVBAR = ["/login", "/signup"];

// daisyUI dropdowns stay open while focus is inside them; blurring closes the menu after a pick
const closeDropdown = () => document.activeElement?.blur();

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { selectedUser } = useChatStore();
  const { pathname } = useLocation();

  if (ROUTES_WITHOUT_NAVBAR.includes(pathname)) return null;

  // On phones an open chat takes the whole screen, WhatsApp-style
  const isChatOpenOnHome = pathname === "/" && Boolean(selectedUser);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 h-14 border-b border-base-content/10 bg-base-100/80 backdrop-blur-md ${
        isChatOpenOnHome ? "hidden md:block" : ""
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-4 lg:px-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
        >
          <Logo className="size-7" />
          <span className="text-[17px] font-semibold tracking-tight">Chatify</span>
        </Link>

        {authUser ? (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              aria-label="Account menu"
              title="Account menu"
              className="btn btn-circle btn-ghost btn-sm"
            >
              <img
                src={authUser.profilePic || "/avatar.png"}
                alt=""
                className="size-8 rounded-full border border-base-content/10 object-cover"
              />
            </div>

            <div
              tabIndex={0}
              className="dropdown-content z-50 mt-2 w-64 overflow-hidden rounded-xl border border-base-content/10 bg-base-100 shadow-lg"
            >
              <div className="border-b border-base-content/10 px-4 py-3">
                <p className="truncate text-sm font-semibold">{authUser.fullName}</p>
                <p className="truncate text-[13px] text-base-content/75">{authUser.email}</p>
              </div>

              <ul className="menu gap-0.5 p-1.5 text-sm">
                <li>
                  <Link to="/profile" onClick={closeDropdown} className="rounded-lg">
                    <UserRound className="size-4" aria-hidden="true" />
                    Profile
                  </Link>
                </li>
                <li>
                  <Link to="/settings" onClick={closeDropdown} className="rounded-lg">
                    <Palette className="size-4" aria-hidden="true" />
                    Appearance
                  </Link>
                </li>
              </ul>

              <ul className="menu border-t border-base-content/10 p-1.5 text-sm">
                <li>
                  <button type="button" onClick={logout} className="rounded-lg">
                    <LogOut className="size-4" aria-hidden="true" />
                    Log out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <Link
            to="/settings"
            aria-label="Appearance settings"
            title="Appearance settings"
            className="btn btn-circle btn-ghost btn-sm text-base-content/75 hover:text-base-content"
          >
            <Settings className="size-[18px]" aria-hidden="true" />
          </Link>
        )}
      </div>
    </header>
  );
};
export default Navbar;
