import { Link } from "react-router-dom";
import { Palette } from "lucide-react";
import Logo from "./Logo";
import AuthImagePattern from "./AuthImagePattern";

// Split layout shared by login and sign-up: form column on the left, chat mockup on the right (lg+).
// The global Navbar is hidden on these routes, so the Appearance link lives here instead.
const AuthLayout = ({ children, headline, supportingText }) => {
  return (
    <div className="grid min-h-[100dvh] bg-base-100 text-base-content lg:grid-cols-2">
      <div className="flex min-w-0 flex-col px-6 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80">
            <Logo className="size-7" />
            <span className="text-[17px] font-semibold tracking-tight">Chatify</span>
          </Link>
          <Link
            to="/settings"
            aria-label="Appearance settings"
            title="Appearance settings"
            className="btn btn-circle btn-ghost btn-sm text-base-content/75 hover:text-base-content"
          >
            <Palette className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <AuthImagePattern headline={headline} supportingText={supportingText} />
    </div>
  );
};

export default AuthLayout;
