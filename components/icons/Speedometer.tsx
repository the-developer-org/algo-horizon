"use client";

import * as React from "react";

const Speedometer = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 12a9 9 0 1 0 18 0" />
    <path d="M12 12l4-4" />
    <path d="M12 7v5" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export default Speedometer;
