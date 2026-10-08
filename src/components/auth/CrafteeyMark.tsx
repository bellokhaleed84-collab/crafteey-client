type Props = {
  className?: string;
  cColor?: string;
  chevronColor?: string;
};

// The Crafteey "C" with three chevrons. Hand-built approximation of the logo:
// swap the paths for your real SVG if you have it.
export default function CrafteeyMark({
  className,
  cColor = "currentColor",
  chevronColor = "#F59E0B",
}: Props) {
  return (
    <svg
      viewBox="0 0 100 90"
      className={className}
      role="img"
      aria-label="Crafteey"
      fill="none"
    >
      <path
        d="M90 14H36Q14 14 14 36V54Q14 76 36 76H90"
        stroke={cColor}
        strokeWidth="22"
        strokeLinejoin="round"
      />
      <g stroke={chevronColor} strokeWidth="7" strokeLinejoin="miter" strokeLinecap="butt">
        <polyline points="40,30 54,45 40,60" />
        <polyline points="54,30 68,45 54,60" />
        <polyline points="68,30 82,45 68,60" />
      </g>
    </svg>
  );
}