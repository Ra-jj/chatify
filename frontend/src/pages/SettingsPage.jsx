import { THEMES, DARK_THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { CircleCheck, SendHorizontal } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const THEME_GROUPS = [
  { label: "Dark", themes: THEMES.filter((t) => DARK_THEMES.includes(t)) },
  { label: "Light", themes: THEMES.filter((t) => !DARK_THEMES.includes(t)) },
];

const formatThemeName = (themeName) => themeName.charAt(0).toUpperCase() + themeName.slice(1);

// A tiny chat rendered inside the theme itself: header strip, incoming bubble, outgoing bubble
const ThemeCard = ({ themeName, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={isSelected}
    className={`group rounded-xl p-1.5 text-left transition-colors ${
      isSelected ? "bg-base-200" : "hover:bg-base-200/60"
    }`}
  >
    <div
      data-theme={themeName}
      className={`overflow-hidden rounded-lg border bg-base-100 ${
        isSelected ? "border-transparent ring-2 ring-primary" : "border-base-content/10"
      }`}
    >
      <div className="flex items-center gap-1.5 bg-base-200 px-2.5 py-2">
        <span className="size-3 rounded-full bg-primary/40" />
        <span className="h-1.5 w-10 rounded-full bg-base-content/30" />
      </div>
      <div className="space-y-1.5 px-2.5 pb-3 pt-2.5">
        <div className="flex">
          <div className="flex h-5 w-[62%] items-center rounded-lg rounded-tl-sm bg-base-200 px-2">
            <span className="h-1 w-3/4 rounded-full bg-base-content/40" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="flex h-5 w-[55%] items-center rounded-lg rounded-tr-sm bg-primary px-2">
            <span className="h-1 w-2/3 rounded-full bg-primary-content/70" />
          </div>
        </div>
      </div>
    </div>

    <div className="mt-2 flex items-center justify-between gap-1 px-1 pb-0.5">
      <span className={`truncate text-[13px] ${isSelected ? "font-semibold" : "font-medium text-base-content/80"}`}>
        {formatThemeName(themeName)}
      </span>
      {isSelected && <CircleCheck className="size-4 shrink-0 text-primary-ink" aria-hidden="true" />}
    </div>
  </button>
);

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-[100dvh] bg-base-100 pt-14">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
          <p className="mt-1 text-[15px] text-base-content/75">Choose how Chatify looks on this device.</p>
        </div>

        <div className="mt-8 space-y-8">
          {THEME_GROUPS.map((group) => (
            <section key={group.label} aria-labelledby={`theme-group-${group.label}`}>
              <h2 id={`theme-group-${group.label}`} className="mb-3 text-sm font-semibold text-base-content/75">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {group.themes.map((t) => (
                  <ThemeCard key={t} themeName={t} isSelected={theme === t} onSelect={() => setTheme(t)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Preview Section */}
        <section className="mt-12" aria-labelledby="theme-preview-heading">
          <h2 id="theme-preview-heading" className="text-sm font-semibold text-base-content/75">
            Preview
          </h2>
          <div className="bg-dot-grid mt-3 rounded-xl border border-base-content/10 bg-base-200/50 p-4 text-base-content sm:p-8">
            <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-base-content/10 bg-base-100">
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-base-content/10 px-4 py-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary-ink">
                  J
                </div>
                <div className="leading-tight">
                  <h3 className="text-sm font-semibold">John Doe</h3>
                  <p className="text-[13px] text-base-content/75">Online</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="min-h-[180px] space-y-2 p-4">
                {PREVIEW_MESSAGES.map((message) => (
                  <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex max-w-[80%] flex-wrap items-end gap-x-3 rounded-2xl px-3 py-2 ${
                        message.isSent
                          ? "rounded-tr-md bg-primary text-primary-content"
                          : "rounded-tl-md bg-base-200 text-base-content"
                      }`}
                    >
                      <p className="text-[15px] leading-snug">{message.content}</p>
                      <p
                        className={`ml-auto text-[11px] leading-4 ${
                          message.isSent ? "text-primary-content" : "text-base-content/75"
                        }`}
                      >
                        12:00
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 rounded-full border border-base-content/10 bg-base-200 p-1 pl-4">
                  <input
                    type="text"
                    className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
                    aria-label="Preview message"
                    value="This is a preview"
                    readOnly
                  />
                  <button
                    type="button"
                    aria-label="Send (preview only)"
                    title="Send (preview only)"
                    className="btn btn-circle btn-primary size-8 min-h-0"
                  >
                    <SendHorizontal className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
export default SettingsPage;
