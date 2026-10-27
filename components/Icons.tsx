import type { CSSProperties } from "react";
export type IconName =
  | "network"
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "reset"
  | "end"
  | "arrow"
  | "external"
  | "download"
  | "check"
  | "chevron"
  | "chart"
  | "book"
  | "layers"
  | "clock"
  | "info"
  | "close";
const paths: Record<IconName, React.ReactNode> = {
  network: (
    <>
      <path d="m6 6 12 3M6 6l3 12M18 9l-9 9" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="9" r="3" />
      <circle cx="9" cy="18" r="3" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  next: (
    <>
      <path d="m8 6 8 6-8 6M19 5v14" />
    </>
  ),
  previous: (
    <>
      <path d="m16 6-8 6 8 6M5 5v14" />
    </>
  ),
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
    </>
  ),
  end: (
    <>
      <path d="m4 6 8 6-8 6m8-12 8 6-8 6M21 5v14" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  external: (
    <>
      <path d="M14 4h6v6m0-6L10 14M9 4H4v16h16v-5" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m8 5 7 7-7 7" />,
  chart: (
    <>
      <path d="M4 3v17h17M8 15v-4m5 4V6m5 9V9" />
    </>
  ),
  book: (
    <>
      <path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z" />
    </>
  ),
  layers: (
    <>
      <path d="m3 8 9-5 9 5-9 5Zm0 5 9 5 9-5m-18 5 9 5 9-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
};
export default function Icon({
  name,
  size = 18,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
