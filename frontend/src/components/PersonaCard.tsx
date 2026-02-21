"use client";

interface PersonaData {
  name: string;
  tagline: string;
  style?: string;
  priorities?: string[];
  background?: string;
  tone?: string;
}

export default function PersonaCard({ persona }: { persona: PersonaData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">{persona.name}</h3>
        <p className="mt-1 text-sm italic text-gray-500">{persona.tagline}</p>
      </div>

      {persona.style && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
            Style
          </span>
          <p className="mt-1 text-sm text-gray-600">{persona.style}</p>
        </div>
      )}

      {persona.tone && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-500">
            Tone
          </span>
          <p className="mt-1 text-sm text-gray-600">{persona.tone}</p>
        </div>
      )}

      {persona.priorities && persona.priorities.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Priorities
          </span>
          <ul className="mt-1 space-y-1">
            {persona.priorities.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {persona.background && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Background
          </span>
          <p className="mt-1 text-sm text-gray-600">{persona.background}</p>
        </div>
      )}
    </div>
  );
}
