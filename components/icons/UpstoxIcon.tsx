"use client";

import * as React from "react";
import type { LucideProps } from "lucide-react";

const UpstoxIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, color, size = 24, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        {/* A neutral "U"-shaped mark with an upward spark — not an official logo. */}
        <path
          d="M6 6v7a6 6 0 1 0 12 0V6"
          stroke={color || "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 3.5L16 2m-4 1.5L12 2m-4 1.5L8 2"
          stroke={color || "currentColor"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
);

UpstoxIcon.displayName = "UpstoxIcon";

export default UpstoxIcon;
