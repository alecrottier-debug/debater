"use client";

import { useState } from "react";
import type { StageConfig, Speaker } from "@/lib/api";
import { formatStageLabel } from "@/lib/format-stage-label";

interface StageProgressTrackerProps {
  stages: StageConfig[];
  completedCount: number;
  isCompleted: boolean;
  personaAName?: string;
  personaBName?: string;
}

const speakerColors: Record<Speaker, string> = {
  MOD: "from-amber-500 to-orange-500",
  A: "from-blue-500 to-cyan-400",
  B: "from-purple-500 to-pink-400",
  JUDGE: "from-emerald-500 to-teal-400",
};

const speakerTextColors: Record<Speaker, string> = {
  MOD: "text-amber-600",
  A: "text-blue-600",
  B: "text-purple-600",
  JUDGE: "text-emerald-600",
};

export default function StageProgressTracker({
  stages,
  completedCount,
  isCompleted,
  personaAName = "For",
  personaBName = "Against",
}: StageProgressTrackerProps) {
  const humanizeLabel = (label: string) =>
    formatStageLabel(label, personaAName, personaBName);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const totalStages = stages.length;
  const progressPercent = isCompleted
    ? 100
    : (completedCount / totalStages) * 100;

  return (
    <div className="enter-down rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Progress bar — width animates via CSS transition (transform would be
          nicer but width is clearer visually and this only animates on change). */}
      <div className="relative mb-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-[width] duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-medium text-gray-400">
            {completedCount}/{totalStages} stages
          </span>
          {isCompleted && (
            <span className="enter-spring-pop rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Stage ticks */}
      <div className="flex items-start justify-between gap-0.5">
        {stages.map((stage, idx) => {
          const isComplete = idx < completedCount;
          const isCurrent = idx === completedCount && !isCompleted;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={stage.id}
              className="relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {idx > 0 && (
                <div
                  className={`absolute right-1/2 top-[14px] h-0.5 w-full -translate-y-1/2 ${
                    isComplete
                      ? "bg-gradient-to-r from-blue-300 to-purple-300"
                      : "bg-gray-100"
                  }`}
                  style={{ left: "-50%" }}
                />
              )}

              <div
                className={`relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-transform duration-150 hover:scale-110 sm:h-8 sm:w-8 sm:text-xs ${
                  isComplete
                    ? `bg-gradient-to-br ${speakerColors[stage.speaker]} text-white shadow-md`
                    : isCurrent
                    ? "border-2 border-blue-500 bg-blue-50 text-blue-600"
                    : "border border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {isComplete ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}

                {/* Pulsing ring for current stage */}
                {isCurrent && (
                  <span className="stage-pulse absolute inset-0 rounded-full border-2 border-blue-400" />
                )}
              </div>

              {/* Label (desktop only) */}
              <span
                className={`mt-1.5 hidden text-center text-[9px] leading-tight sm:block ${
                  isComplete || isCurrent ? "text-gray-600" : "text-gray-300"
                }`}
              >
                {humanizeLabel(stage.label).split(" ").slice(0, 2).join("\n")}
              </span>

              {/* Hover tooltip — CSS opacity transition. Kept always mounted so
                  enter/exit are free. */}
              <div
                className={`pointer-events-none absolute -top-16 z-20 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg transition-opacity duration-150 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="text-xs font-bold text-gray-900">
                  {humanizeLabel(stage.label)}
                </p>
                <p className={`text-[10px] ${speakerTextColors[stage.speaker]}`}>
                  {stage.speaker === "A"
                    ? personaAName
                    : stage.speaker === "B"
                    ? personaBName
                    : stage.speaker}
                  {stage.maxWords ? ` - ${stage.maxWords} max words` : ""}
                </p>
                <div className="absolute left-1/2 top-full -translate-x-1/2">
                  <div className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
