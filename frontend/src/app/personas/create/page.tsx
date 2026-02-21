"use client";

import { useState } from "react";
import {
  researchPersona,
  synthesizePersona,
  createPersona,
  type Persona,
} from "@/lib/api";
import PersonaCard from "@/components/PersonaCard";
import Link from "next/link";

type WizardTab = "ai" | "manual";

interface PersonaFields {
  name: string;
  tagline: string;
  style: string;
  priorities: string[];
  background: string;
  tone: string;
}

const emptyFields: PersonaFields = {
  name: "",
  tagline: "",
  style: "",
  priorities: [""],
  background: "",
  tone: "",
};

export default function CreatePersonaPage() {
  const [tab, setTab] = useState<WizardTab>("ai");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Setup
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Create New Persona</h1>
        <p className="mt-2 text-slate-400">
          Build a custom debater persona using AI research or manual entry.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="mb-8 flex rounded-lg border border-white/10 bg-[#111827] p-1">
        <button
          onClick={() => setTab("ai")}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "ai"
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          AI-Assisted (Recommended)
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "manual"
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Manual Entry
        </button>
      </div>

      {tab === "ai" ? <AiWizard /> : <ManualWizard />}
    </div>
  );
}

/* ============================== AI WIZARD ============================== */

type AiStep = "input" | "researching" | "dossier" | "synthesizing" | "preview" | "saved";

function AiWizard() {
  const [step, setStep] = useState<AiStep>("input");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [dossierId, setDossierId] = useState("");
  const [summary, setSummary] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [editFields, setEditFields] = useState<PersonaFields>(emptyFields);
  const [error, setError] = useState("");
  const [savedPersona, setSavedPersona] = useState<Persona | null>(null);

  async function handleResearch() {
    if (!subject.trim()) return;
    setError("");
    setStep("researching");
    try {
      const result = await researchPersona({
        subject: subject.trim(),
        context: context.trim() || undefined,
      });
      setDossierId(result.dossierId);
      setSummary(result.summary);
      setStep("dossier");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
      setStep("input");
    }
  }

  async function handleSynthesize() {
    setError("");
    setStep("synthesizing");
    try {
      const result = await synthesizePersona({ dossierId });
      setPersona(result);
      const pj = result.personaJson as unknown as PersonaFields;
      setEditFields({
        name: pj.name || result.name,
        tagline: pj.tagline || result.tagline,
        style: pj.style || "",
        priorities: pj.priorities?.length ? pj.priorities : [""],
        background: pj.background || "",
        tone: pj.tone || "",
      });
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed");
      setStep("dossier");
    }
  }

  async function handleSave() {
    setError("");
    try {
      const personaJson = {
        name: editFields.name,
        tagline: editFields.tagline,
        style: editFields.style,
        priorities: editFields.priorities.filter((p) => p.trim()),
        background: editFields.background,
        tone: editFields.tone,
      };
      const saved = await createPersona({
        name: editFields.name,
        tagline: editFields.tagline,
        personaJson,
        isTemplate: false,
      });
      setSavedPersona(saved);
      setStep("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-2">
        {(["Research", "Dossier", "Generate", "Review"] as const).map((label, i) => {
          const stepMap: Record<string, number> = {
            input: 0,
            researching: 0,
            dossier: 1,
            synthesizing: 2,
            preview: 3,
            saved: 4,
          };
          const current = stepMap[step] ?? 0;
          const isActive = i <= current;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${isActive ? "bg-blue-500" : "bg-white/10"}`}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    : "border border-white/20 text-slate-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${isActive ? "text-white" : "text-slate-500"}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step: Input */}
      {(step === "input" || step === "researching") && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder='e.g. "Elon Musk on AI regulation" or "a veteran labor union organizer"'
              className="w-full rounded-lg border border-white/10 bg-[#0b0d17] px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={step === "researching"}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Additional Context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any additional context to guide the research..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-[#0b0d17] px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={step === "researching"}
            />
          </div>
          <button
            onClick={handleResearch}
            disabled={!subject.trim() || step === "researching"}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === "researching" ? (
              <>
                <Spinner />
                Researching...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Research
              </>
            )}
          </button>
        </div>
      )}

      {/* Step: Dossier */}
      {(step === "dossier" || step === "synthesizing") && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">Research Complete</h3>
            </div>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-300">
              {summary}
            </div>
          </div>
          <button
            onClick={handleSynthesize}
            disabled={step === "synthesizing"}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === "synthesizing" ? (
              <>
                <Spinner />
                Generating Persona...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
                Generate Persona
              </>
            )}
          </button>
        </div>
      )}

      {/* Step: Preview & Edit */}
      {step === "preview" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Preview & Edit</h3>
          <PersonaEditForm
            fields={editFields}
            onChange={setEditFields}
          />
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Preview
            </h4>
            <PersonaCard persona={editFields} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25"
            >
              Save Persona
            </button>
            <button
              onClick={() => setStep("dossier")}
              className="rounded-lg border border-white/10 px-6 py-3 font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Re-generate
            </button>
          </div>
        </div>
      )}

      {/* Step: Saved */}
      {step === "saved" && savedPersona && (
        <div className="space-y-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white">Persona Created!</h3>
          <p className="text-slate-400">
            <strong className="text-white">{savedPersona.name}</strong> is now
            available in your persona dropdown pickers.
          </p>
          <PersonaCard
            persona={savedPersona.personaJson as unknown as PersonaFields}
          />
          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25"
            >
              Back to Setup
            </Link>
            <button
              onClick={() => {
                setStep("input");
                setSubject("");
                setContext("");
                setDossierId("");
                setSummary("");
                setPersona(null);
                setEditFields(emptyFields);
                setSavedPersona(null);
                setError("");
              }}
              className="rounded-lg border border-white/10 px-6 py-3 font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== MANUAL WIZARD ============================== */

function ManualWizard() {
  const [fields, setFields] = useState<PersonaFields>(emptyFields);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Persona | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof PersonaFields, string>>
  >({});

  function validate(): boolean {
    const errors: Partial<Record<keyof PersonaFields, string>> = {};
    if (!fields.name.trim()) errors.name = "Name is required";
    if (!fields.tagline.trim()) errors.tagline = "Tagline is required";
    if (!fields.style.trim()) errors.style = "Style is required";
    if (!fields.tone.trim()) errors.tone = "Tone is required";
    if (!fields.background.trim()) errors.background = "Background is required";
    const nonEmpty = fields.priorities.filter((p) => p.trim());
    if (nonEmpty.length === 0) errors.priorities = "At least one priority is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setError("");
    setSaving(true);
    try {
      const personaJson = {
        name: fields.name.trim(),
        tagline: fields.tagline.trim(),
        style: fields.style.trim(),
        priorities: fields.priorities.filter((p) => p.trim()),
        background: fields.background.trim(),
        tone: fields.tone.trim(),
      };
      const result = await createPersona({
        name: fields.name.trim(),
        tagline: fields.tagline.trim(),
        personaJson,
        isTemplate: false,
      });
      setSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white">Persona Created!</h3>
        <p className="text-slate-400">
          <strong className="text-white">{saved.name}</strong> is now available
          in your persona dropdown pickers.
        </p>
        <PersonaCard persona={saved.personaJson as unknown as PersonaFields} />
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25"
          >
            Back to Setup
          </Link>
          <button
            onClick={() => {
              setFields(emptyFields);
              setSaved(null);
              setError("");
              setValidationErrors({});
            }}
            className="rounded-lg border border-white/10 px-6 py-3 font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <PersonaEditForm
        fields={fields}
        onChange={setFields}
        errors={validationErrors}
      />

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </h4>
        <PersonaCard persona={fields} />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            "Save Persona"
          )}
        </button>
      </div>
    </div>
  );
}

/* ============================== SHARED COMPONENTS ============================== */

function PersonaEditForm({
  fields,
  onChange,
  errors = {},
}: {
  fields: PersonaFields;
  onChange: (f: PersonaFields) => void;
  errors?: Partial<Record<keyof PersonaFields, string>>;
}) {
  function updateField(key: keyof PersonaFields, value: string) {
    onChange({ ...fields, [key]: value });
  }

  function updatePriority(index: number, value: string) {
    const updated = [...fields.priorities];
    updated[index] = value;
    onChange({ ...fields, priorities: updated });
  }

  function addPriority() {
    onChange({ ...fields, priorities: [...fields.priorities, ""] });
  }

  function removePriority(index: number) {
    const updated = fields.priorities.filter((_, i) => i !== index);
    onChange({ ...fields, priorities: updated.length ? updated : [""] });
  }

  return (
    <div className="space-y-4">
      <FormField
        label="Name"
        value={fields.name}
        onChange={(v) => updateField("name", v)}
        placeholder="Persona display name"
        error={errors.name}
        required
      />
      <FormField
        label="Tagline"
        value={fields.tagline}
        onChange={(v) => updateField("tagline", v)}
        placeholder="One compelling line"
        error={errors.tagline}
        required
      />
      <FormField
        label="Style"
        value={fields.style}
        onChange={(v) => updateField("style", v)}
        placeholder='e.g. "aggressive cross-examiner", "calm evidence-based reasoner"'
        error={errors.style}
        required
      />
      <FormField
        label="Tone"
        value={fields.tone}
        onChange={(v) => updateField("tone", v)}
        placeholder='e.g. "direct and confrontational", "measured with dry wit"'
        error={errors.tone}
        required
      />
      <FormTextarea
        label="Background"
        value={fields.background}
        onChange={(v) => updateField("background", v)}
        placeholder="Brief background description (2-3 sentences)"
        error={errors.background}
        required
      />

      {/* Priorities */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Priorities *
        </label>
        {errors.priorities && (
          <p className="mb-2 text-xs text-red-400">{errors.priorities}</p>
        )}
        <div className="space-y-2">
          {fields.priorities.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={p}
                onChange={(e) => updatePriority(i, e.target.value)}
                placeholder={`Priority ${i + 1}`}
                className="flex-1 rounded-lg border border-white/10 bg-[#0b0d17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {fields.priorities.length > 1 && (
                <button
                  onClick={() => removePriority(i)}
                  className="rounded-lg border border-white/10 px-3 text-slate-400 transition-colors hover:border-red-500/30 hover:text-red-400"
                  title="Remove priority"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {fields.priorities.length < 8 && (
            <button
              onClick={addPriority}
              className="inline-flex items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Priority
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label} {required && "*"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-[#0b0d17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
            : "border-white/10 focus:border-blue-500 focus:ring-blue-500"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label} {required && "*"}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`w-full rounded-lg border bg-[#0b0d17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
            : "border-white/10 focus:border-blue-500 focus:ring-blue-500"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
