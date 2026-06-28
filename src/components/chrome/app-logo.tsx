import { useId } from "react";

export interface AppLogoProps {
  /** Sizing / positioning classes. Width is auto by default to keep the 142:152 ratio. */
  className?: string;
  /**
   * Accessible label. When omitted the mark is decorative (`aria-hidden`),
   * which is the right call when a nearby heading already names the screen.
   */
  title?: string;
}

/**
 * AlphaBrilliant comet mark. Inlined (not an <img>) so the gradient trail
 * renders reliably — the gradient IDs are generated per-instance with useId()
 * to avoid collisions when more than one logo is on the page.
 */
export function AppLogo({ className, title }: AppLogoProps) {
  const raw = useId();
  const uid = raw.replace(/:/g, "");
  const trail = `${uid}-trail`;
  const sheen = `${uid}-sheen`;
  const spark = `${uid}-spark`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 142 152"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M98.149 54.7674L115.611 64.8212L0.752208 151.405L46.9497 21.5896L52.6553 22.972L98.149 54.7674Z"
        fill={`url(#${trail})`}
      />
      <path
        opacity="0.55"
        d="M7.40925 143.583L59.7394 19.2668L69.2461 24.682L88.2597 35.5124L107.273 46.3428L116.78 51.7581L7.40925 143.583Z"
        fill={`url(#${sheen})`}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M119.775 60.4209L119.777 60.418C124.01 53.0793 121.642 46.4508 119.859 43.1896C115.709 35.5932 113.123 24.9576 113.09 17.1291C113.078 14.1927 111.78 7.24133 104.381 2.96991C96.9831 -1.3015 90.3123 1.05274 87.765 2.50771C80.9688 6.39336 70.4652 9.47187 61.8112 9.67541C58.0974 9.75982 51.1727 11.0227 46.9338 18.3581L46.9321 18.361C46.9321 18.361 46.9321 18.361 46.9288 18.3667C42.6956 25.7054 45.0643 32.3339 46.8464 35.5951C50.9972 43.1915 53.5829 53.8271 53.6159 61.6556C53.6279 64.592 54.9261 71.5434 62.3244 75.8148C69.7227 80.0862 76.3935 77.732 78.9409 76.277C85.7371 72.3913 96.2407 69.3128 104.895 69.1093C108.61 69.022 115.535 67.7591 119.774 60.4237L119.775 60.4209Z"
        fill="#29CC57"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M119.775 60.4209L119.777 60.418C124.01 53.0793 121.642 46.4508 119.859 43.1896C115.709 35.5932 113.123 24.9576 113.09 17.1291C113.078 14.1927 111.78 7.24133 104.381 2.96991C96.9831 -1.3015 90.3123 1.05274 87.765 2.50771C80.9688 6.39336 70.4652 9.47187 61.8112 9.67541C58.0974 9.75982 51.1727 11.0227 46.9338 18.3581L46.9321 18.361C46.9321 18.361 46.9321 18.361 46.9288 18.3667C42.6956 25.7054 45.0643 32.3339 46.8464 35.5951C50.9972 43.1915 53.5829 53.8271 53.6159 61.6556C53.6279 64.592 54.9261 71.5434 62.3244 75.8148C69.7227 80.0862 76.3935 77.732 78.9409 76.277C85.7371 72.3913 96.2407 69.3128 104.895 69.1093C108.61 69.022 115.535 67.7591 119.774 60.4237L119.775 60.4209Z"
        fill={`url(#${spark})`}
      />
      <path
        d="M71.6588 29.1511C69.3361 33.1742 70.7145 38.3185 74.7376 40.6412L90.631 49.8173C94.6541 52.1401 99.7985 50.7616 102.121 46.7385L109.793 33.4506L79.3306 15.8632L71.6588 29.1511Z"
        fill="white"
      />
      <path
        d="M97.1348 38.8262L83.8903 31.1795L89.3857 21.661L102.63 29.3078L97.1348 38.8262Z"
        fill="black"
      />
      <defs>
        <linearGradient
          id={trail}
          x1="105.577"
          y1="14.8788"
          x2="17.2228"
          y2="138.03"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D8E82E" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={sheen}
          x1="18.2456"
          y1="123.764"
          x2="93.1227"
          y2="-39.3232"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="0.148027" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={spark}
          x1="104.381"
          y1="2.96991"
          x2="58.8123"
          y2="82.9199"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.367206" stopColor="#D8E82E" stopOpacity="0" />
          <stop offset="1" stopColor="#D8E82E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
