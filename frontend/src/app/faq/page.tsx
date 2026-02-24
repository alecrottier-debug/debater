"use client";

import { useState } from "react";

interface FAQSection {
  icon: React.ReactNode;
  title: string;
  summary: React.ReactNode;
  details: React.ReactNode;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

const sections: FAQSection[] = [
  {
    icon: (
      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: "How Personas Work",
    summary: (
      <p className="text-sm leading-relaxed text-gray-600">
        Each persona is a deeply researched AI character profile. The system uses <strong>Perplexity</strong> to gather up-to-date web information about real public figures, then <strong>Claude Opus 4.6</strong> synthesizes that research into a comprehensive structured behavioral model covering 12 dimensions of personality, rhetoric, and worldview.
      </p>
    ),
    details: (
      <div className="space-y-4 text-sm leading-relaxed text-gray-600">
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Research Phase</h4>
          <p>Perplexity fetches current biographical data, recent statements, public positions, and speaking style for the subject.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Synthesis Phase</h4>
          <p>Claude Opus 4.6 transforms raw research into the structured V2 persona schema.</p>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">Schema Overview (12 blocks)</h4>
          <ul className="space-y-2">
            <li><strong>Identity</strong> — name, tagline, biography summary, formative environments, incentive structures</li>
            <li><strong>Positions</strong> — core priorities, known stances on specific topics, guiding principles, risk tolerance, default analytical lenses, typical attack patterns</li>
            <li><strong>Rhetoric</strong> — argumentation style, tone, rhetorical moves, argument structure, time horizon, signature phrases</li>
            <li><strong>Voice Calibration</strong> — real quotes, sentence patterns, verbal tics, response openers, transition phrases, emphasis markers, behavior under pressure, distinctive vocabulary</li>
            <li><strong>Epistemology</strong> — preferred evidence types, citation style, disagreement response, uncertainty language, track record, mind changes</li>
            <li><strong>Vulnerabilities</strong> — blind spots, taboo topics, disclaimed areas, hedging topics</li>
            <li><strong>Conversational Profile</strong> — response length, listening style, interruption pattern, humor usage, tangent tendency, energy level</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Moderator Variant</h4>
          <p>Moderator personas add interview style, question strategy, signature moves, and a 5-level confrontation profile.</p>
        </div>
      </div>
    ),
  },
  {
    icon: (
      <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
      </svg>
    ),
    title: "How Debates Are Evaluated",
    summary: (
      <p className="text-sm leading-relaxed text-gray-600">
        An impartial AI judge evaluates debates across <strong>14 scoring dimensions</strong> using a detailed rubric, then delivers a verdict citing specific moments from the transcript. The system includes anti-bias protocols, violation penalties, and closeness calibration to ensure fair, substantive judging.
      </p>
    ),
    details: (
      <div className="space-y-4 text-sm leading-relaxed text-gray-600">
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">4 Headline Scores (1–10)</h4>
          <ul className="space-y-1">
            <li><strong>Clarity</strong> — how clearly arguments are structured and communicated</li>
            <li><strong>Strength</strong> — quality of evidence, reasoning, and argumentation</li>
            <li><strong>Responsiveness</strong> — engagement with the opponent&apos;s actual arguments</li>
            <li><strong>Weighing</strong> — explaining why their arguments matter most in context</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">10 Detailed Sub-Scores (1–10)</h4>
          <p>Logical Rigor, Evidence Quality, Rebuttal Effectiveness, Argument Novelty, Persuasiveness, Voice Authenticity, Rhetorical Skill, Emotional Resonance, Framing Control, Adaptability</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Ballot System</h4>
          <p>4–6 specific reasons with stage references; at least one must acknowledge the losing side&apos;s strength.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Closeness Calibration</h4>
          <p>Blowout (8+ gap), Clear (5–7), Narrow (2–4), Razor-thin (0–1)</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Momentum Tracking</h4>
          <p>A_BUILDING, B_BUILDING, EVEN, A_FADING, B_FADING</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Anti-Bias Protocol</h4>
          <p>No advantage for speaking first, substance over style, don&apos;t reward aggression, don&apos;t penalize concessions, personal views excluded.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Violation Penalties</h4>
          <p>Word count overages, new arguments in closing, missing rebuttals — minor (–0.5) or major (–1 to –2).</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Best Lines</h4>
          <p>Exact quotes from each side, including from the losing side.</p>
        </div>
      </div>
    ),
  },
  {
    icon: (
      <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    title: "How Prompts Are Generated",
    summary: (
      <p className="text-sm leading-relaxed text-gray-600">
        Each debate turn is generated by injecting the full persona profile, the complete debate transcript, and stage-specific tactical instructions into a carefully engineered prompt. The system enforces anti-repetition protocols, cultural filtering, and voice authenticity checks to ensure every turn sounds like the real person and advances the argument.
      </p>
    ),
    details: (
      <div className="space-y-4 text-sm leading-relaxed text-gray-600">
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Prompt Pipeline</h4>
          <p>Persona JSON + motion + transcript history + stage config → system prompt + user prompt → LLM call → Zod-validated structured output.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Voice Enforcement</h4>
          <p>The system injects the persona&apos;s rhetoric style, signature phrases, distinctive vocabulary, sentence rhythm, and verbal tics as explicit instructions.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Anti-Repetition Protocol</h4>
          <p>The LLM reads the entire transcript and is forbidden from reusing any phrase, sentence opening, rhetorical device, or argumentative structure from prior turns.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Tactical Adaptation by Turn</h4>
          <p>Opening turns establish framing; middle turns target the opponent&apos;s weakest link, concede minor points for credibility; later turns shift strategy based on what&apos;s working.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Cultural Filtering</h4>
          <p>Personas don&apos;t echo the opponent&apos;s metaphors or cultural references — a French president doesn&apos;t use American idioms, a tech CEO doesn&apos;t cite treaty articles.</p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Question Strategy</h4>
          <p>Questions target what the opponent is uniquely qualified to answer or uniquely vulnerable on.</p>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">Debate vs Discussion Prompts</h4>
          <ul className="space-y-1">
            <li><strong>Debate:</strong> Adversarial — each side argues FOR or AGAINST, with cross-examination questions and closing statements.</li>
            <li><strong>Discussion:</strong> Exploratory — a moderator guides conversation between two participants, drawing out insight and nuance without forcing opposition.</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-gray-800">Moderator Confrontation Levels (1–5)</h4>
          <p>Shape how aggressively the moderator probes, from gentle facilitation (level 1) to relentless cross-examination (level 5), with signature moves unlocked at higher thresholds.</p>
        </div>
      </div>
    ),
  },
];

export default function FAQPage() {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          How the debate system works under the hood
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => {
          const isOpen = openSections.has(i);
          return (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <button
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
              >
                <span className="mt-0.5 shrink-0">{section.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                  <div className="mt-1">{section.summary}</div>
                </div>
                <span className="mt-1 shrink-0">
                  <ChevronIcon open={isOpen} />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 pl-13">
                  {section.details}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
