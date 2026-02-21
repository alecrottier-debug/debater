"use client";

import { motion } from "framer-motion";
import type { Persona } from "@/lib/api";

interface PersonaPreviewProps {
  persona: Persona;
  side: "A" | "B";
}

export default function PersonaPreview({ persona, side }: PersonaPreviewProps) {
  const json = persona.personaJson as {
    style?: string;
    priorities?: string[];
    background?: string;
    tone?: string;
  };

  const accentColor = side === "A" ? "blue" : "purple";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`mt-3 overflow-hidden rounded-xl border p-4 ${
        accentColor === "blue"
          ? "border-blue-200 bg-blue-50/50"
          : "border-purple-200 bg-purple-50/50"
      }`}
    >
      {/* Name & tagline */}
      <div className="mb-3">
        <h4 className="text-sm font-bold text-gray-900">{persona.name}</h4>
        <p className="text-xs italic text-gray-500">&ldquo;{persona.tagline}&rdquo;</p>
      </div>

      {/* Style */}
      {json.style && (
        <div className="mb-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              accentColor === "blue" ? "text-blue-600" : "text-purple-600"
            }`}
          >
            Style
          </span>
          <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{json.style}</p>
        </div>
      )}

      {/* Priorities as pills */}
      {json.priorities && json.priorities.length > 0 && (
        <div className="mb-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              accentColor === "blue" ? "text-blue-600" : "text-purple-600"
            }`}
          >
            Priorities
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {json.priorities.slice(0, 3).map((p, i) => (
              <span
                key={i}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  accentColor === "blue"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {p.length > 30 ? p.slice(0, 30) + "..." : p}
              </span>
            ))}
            {json.priorities.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                +{json.priorities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tone */}
      {json.tone && (
        <div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              accentColor === "blue" ? "text-blue-600" : "text-purple-600"
            }`}
          >
            Tone
          </span>
          <p className="mt-0.5 text-xs text-gray-600 line-clamp-1">{json.tone}</p>
        </div>
      )}
    </motion.div>
  );
}
