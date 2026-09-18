// Icon-only button. `label` is required: it becomes both aria-label and title.
const IconButton = ({
  label,
  icon: Icon,
  onClick,
  className = "",
  iconClassName = "size-[18px]",
  type = "button",
  ...rest
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`btn btn-circle btn-ghost btn-sm text-base-content/75 hover:text-base-content ${className}`}
      {...rest}
    >
      <Icon className={iconClassName} aria-hidden="true" />
    </button>
  );
};

export default IconButton;
