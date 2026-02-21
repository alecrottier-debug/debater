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
    <div className="rounded-xl border border-white/10 bg-[#111827] p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">{persona.name}</h3>
        <p className="mt-1 text-sm italic text-slate-400">{persona.tagline}</p>
      </div>

      {persona.style && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Style
          </span>
          <p className="mt-1 text-sm text-slate-300">{persona.style}</p>
        </div>
      )}

      {persona.tone && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            Tone
          </span>
          <p className="mt-1 text-sm text-slate-300">{persona.tone}</p>
        </div>
      )}

      {persona.priorities && persona.priorities.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Priorities
          </span>
          <ul className="mt-1 space-y-1">
            {persona.priorities.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {persona.background && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Background
          </span>
          <p className="mt-1 text-sm text-slate-300">{persona.background}</p>
        </div>
      )}
    </div>
  );
}
