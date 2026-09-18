import { Search } from "lucide-react";

// Pill-shaped search input that matches the message composer
const SearchField = ({ value, onChange, placeholder, autoFocus = false, className = "" }) => {
  return (
    <label
      className={`flex h-10 items-center gap-2 rounded-full border border-base-content/10 bg-base-200 px-3.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${className}`}
    >
      <Search className="size-4 shrink-0 text-base-content/60" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        data-autofocus={autoFocus || undefined}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/75"
      />
    </label>
  );
};

export default SearchField;
