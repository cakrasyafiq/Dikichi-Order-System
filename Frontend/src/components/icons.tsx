import type { ReactNode } from 'react';

type IconProps = { className?: string; strokeWidth?: number };

function Icon({ children, className, strokeWidth = 1.8 }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const DineInIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 17h16" />
    <path d="M6 17a6 6 0 0 1 12 0" />
    <path d="M12 8v3" />
    <circle cx="12" cy="7" r="1" />
  </Icon>
);

export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M10 6h4M10 10h4M10 14h2" />
  </Icon>
);

export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </Icon>
);

export const CardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Icon strokeWidth={2.2} {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const HeadsetIcon = (props: IconProps) => (
  <Icon strokeWidth={2} {...props}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z" />
  </Icon>
);
