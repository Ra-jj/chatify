const DoubleForwardIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="11 17 16 12 11 7" />
    <polyline points="16 17 21 12 16 7" />
    <path d="M4 18v-2a4 4 0 0 1 4-4h8" />
  </svg>
);

export default DoubleForwardIcon;
