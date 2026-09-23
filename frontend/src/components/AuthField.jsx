// Labelled auth input with a leading icon and an optional trailing control (e.g. show password)
const AuthField = ({ id, label, icon: Icon, trailing, ...inputProps }) => {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-base-content/60"
        />
        <input
          id={id}
          className={`input h-11 w-full rounded-lg border-base-content/20 bg-base-100 pl-10 text-[15px] placeholder:text-base-content/75 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            trailing ? "pr-11" : ""
          }`}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
    </div>
  );
};

export default AuthField;
