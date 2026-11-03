import { useId } from "react";
import { cn } from "@/lib/cn";

interface CompassDialProps {
  bearing: number;
  heading: number;
  northUp: boolean;
  distanceLabel: string;
  accuracyM: number;
  pingRemainingSec: number;
  pingTotalSec: number;
  className?: string;
}

const CARDINALS = [
  { label: "N", x: 210, y: 44 },
  { label: "E", x: 377, y: 216 },
  { label: "S", x: 210, y: 388 },
  { label: "W", x: 43, y: 216 },
];

export function CompassDial({
  bearing,
  heading,
  northUp,
  distanceLabel,
  accuracyM,
  pingRemainingSec,
  pingTotalSec,
  className,
}: CompassDialProps) {
  const gradientId = useId().replace(/:/g, "");
  const displayHeading = northUp ? 0 : heading;
  const dialRotation = -displayHeading;
  const needleAngle = ((bearing - displayHeading) % 360 + 360) % 360;
  const pingProgress = pingTotalSec === 0 ? 0 : Math.max(0, pingRemainingSec / pingTotalSec);
  const urgent = pingRemainingSec <= 60;
  const circumference = 2 * Math.PI * 201;

  return (
    <div className={cn("relative aspect-square w-full", className)}>
      <div className="absolute inset-[12%] rounded-full bg-runner/[0.035] blur-3xl" />

      <svg viewBox="0 0 420 420" className="relative size-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--runner)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--runner) 35%, var(--canvas))" />
          </linearGradient>
          <radialGradient id={`${gradientId}-glow`}>
            <stop offset="0%" stopColor="var(--runner)" stopOpacity="0.18" />
            <stop offset="70%" stopColor="var(--runner)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--runner)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="210" cy="210" r="205" fill={`url(#${gradientId}-glow)`} />
        <circle cx="210" cy="210" r="202" fill="none" stroke="var(--line)" strokeWidth="1" />
        <circle
          cx="210"
          cy="210"
          r="201"
          fill="none"
          stroke={urgent ? "var(--warning)" : "var(--runner)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pingProgress)}
          transform="rotate(-90 210 210)"
          opacity="0.7"
        />
        <circle
          cx="210"
          cy="210"
          r="188"
          fill="none"
          stroke="var(--line)"
          strokeWidth="0.75"
          strokeDasharray="1 6"
          opacity="0.7"
        />
        <circle cx="210" cy="210" r="152" fill="none" stroke="var(--line)" strokeWidth="0.75" opacity="0.65" />

        <g
          style={{
            transform: `rotate(${dialRotation}deg)`,
            transformOrigin: "210px 210px",
            transition: "transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {Array.from({ length: 72 }).map((_, index) => {
            const major = index % 6 === 0;
            const medium = index % 2 === 0;
            return (
              <line
                key={index}
                x1="210"
                y1="8"
                x2="210"
                y2={major ? 26 : medium ? 18 : 13}
                transform={`rotate(${index * 5} 210 210)`}
                stroke={major ? "var(--muted)" : "var(--faint)"}
                strokeWidth={major ? 1.4 : 0.8}
                opacity={major ? 0.9 : 0.5}
              />
            );
          })}

          {CARDINALS.map((cardinal) => (
            <text
              key={cardinal.label}
              x={cardinal.x}
              y={cardinal.y}
              textAnchor="middle"
              fill={cardinal.label === "N" ? "var(--runner)" : "var(--muted)"}
              fontSize={cardinal.label === "N" ? "13" : "11"}
              fontFamily="var(--font-mono)"
              letterSpacing="0.1em"
            >
              {cardinal.label}
            </text>
          ))}

          {Array.from({ length: 12 }).map((_, index) => {
            const angle = index * 30;
            return (
              <text
                key={`degree-${angle}`}
                x="210"
                y="62"
                textAnchor="middle"
                fill="var(--faint)"
                fontSize="6.5"
                fontFamily="var(--font-mono)"
                letterSpacing="0.08em"
                transform={`rotate(${angle} 210 210)`}
              >
                {String(angle).padStart(3, "0")}
              </text>
            );
          })}
        </g>

        <circle cx="210" cy="210" r="104" fill="none" stroke="var(--line)" strokeWidth="0.75" opacity="0.5" />
        <line x1="210" y1="120" x2="210" y2="300" stroke="var(--line)" strokeWidth="0.5" opacity="0.4" />
        <line x1="120" y1="210" x2="300" y2="210" stroke="var(--line)" strokeWidth="0.5" opacity="0.4" />

        <g
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: "210px 210px",
            transition: "transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          <path
            d="M210 66 L225 194 L210 212 L195 194 Z"
            fill={`url(#${gradientId})`}
            style={{ filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--runner) 50%, transparent))" }}
          />
          <path d="M210 348 L217 294 L210 286 L203 294 Z" fill="var(--line-strong)" />
          <line x1="210" y1="84" x2="210" y2="292" stroke="var(--runner)" strokeWidth="0.6" opacity="0.4" />
          <circle cx="210" cy="210" r="22" fill="var(--surface)" stroke="var(--runner)" strokeWidth="1.2" />
          <circle cx="210" cy="210" r="11" fill="none" stroke="var(--runner)" strokeWidth="0.8" opacity="0.4" />
          <circle cx="210" cy="210" r="4.5" fill="var(--runner)" />
        </g>

        <path d="M210 2 L216 14 L204 14 Z" fill="var(--runner)" opacity="0.9" />
        <path d="M210 418 L216 406 L204 406 Z" fill="var(--line-strong)" />
        <line x1="2" y1="210" x2="10" y2="210" stroke="var(--line-strong)" strokeWidth="1" />
        <line x1="410" y1="210" x2="418" y2="210" stroke="var(--line-strong)" strokeWidth="1" />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="mt-[38%] text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-faint">
            Nearest hunter
          </p>
          <p className="mt-1 font-mono text-3xl font-medium tabular tracking-[-0.04em] text-ink sm:text-4xl">
            {distanceLabel}
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-runner">
            {Math.round(bearing)}° bearing
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[5%] flex items-center justify-between px-8 sm:px-10">
        <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-faint">
          GPS ±{accuracyM}m
        </span>
        <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-faint">
          {northUp ? "North-up" : `Heading ${Math.round(displayHeading)}°`}
        </span>
      </div>
    </div>
  );
}
