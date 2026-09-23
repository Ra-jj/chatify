import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import IconButton from "../components/IconButton";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const success = validateForm();

    if (success === true) signup(formData);
  };

  return (
    <AuthLayout
      headline={
        <>
          Your people, one tap <em>away</em>.
        </>
      }
      supportingText="Start a chat or a group in seconds. Everything arrives in real time."
    >
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight">Create your account</h1>
      <p className="mt-2 text-[15px] text-base-content/75">It takes less than a minute.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <AuthField
          id="signup-full-name"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Priya Sharma"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        />

        <AuthField
          id="signup-email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <AuthField
          id="signup-password"
          label="Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 6 characters"
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

        <button type="submit" className="btn btn-primary h-11 w-full rounded-lg text-[15px] font-medium" disabled={isSigningUp}>
          {isSigningUp ? (
            <>
              <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-base-content/75">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-base-content underline decoration-primary/60 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
export default SignUpPage;
