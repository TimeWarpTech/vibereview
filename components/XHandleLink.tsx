type Props = { name: string };

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="0.9em"
      height="0.9em"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2H21.5l-7.49 8.56L22.75 22h-6.86l-5.37-7.02L4.36 22H1.1l8-9.14L1 2h7l4.86 6.43L18.24 2zm-1.2 18h1.86L7.06 4H5.1l11.94 16z" />
    </svg>
  );
}

export function XHandleLink({ name }: Props) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === "anonymous") {
    return <span>{trimmed || "Anonymous"}</span>;
  }
  if (!trimmed.startsWith("@")) {
    return <span>{trimmed}</span>;
  }
  const handle = trimmed.replace(/^@+/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return <span>{trimmed}</span>;
  }
  return (
    <a
      href={`https://x.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="x-handle-link"
    >
      <XIcon />
      <span>@{handle}</span>
    </a>
  );
}
