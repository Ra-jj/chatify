import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import IconButton from "../components/IconButton";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <AuthLayout
      headline={
        <>
          Conversations that feel <em>instant</em>.
        </>
      }
      supportingText="Messages, reactions and voice notes arrive the moment they are sent."
    >
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight">Welcome back</h1>
      <p className="mt-2 text-[15px] text-base-content/75">Sign in to pick up your conversations.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <AuthField
          id="login-email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <AuthField
          id="login-password"
          label="Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          trailing={
            <IconButton
              label={showPassword ? "Hide password" : "Show password"}
              icon={showPassword ? EyeOff : Eye}
              onClick={() => setShowPassword(!showPassword)}
            />
          }
        />

        <button type="submit" className="btn btn-primary h-11 w-full rounded-lg text-[15px] font-medium" disabled={isLoggingIn}>
          {isLoggingIn ? (
            <>
              <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-base-content/75">
        New to Chatify?{" "}
        <Link
          to="/signup"
          className="font-medium text-base-content underline decoration-primary/60 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
};
export default LoginPage;
