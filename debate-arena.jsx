import { useState, useEffect, useRef, useCallback } from "react";

// ─── Database Simulation ───────────────────────────────────────────
const DB = {
  debaters: JSON.parse(localStorage.getItem?.("debaters") || "[]"),
  save() {
    try { localStorage.setItem("debaters", JSON.stringify(this.debaters)); } catch(e) {}
  }
};

// ─── Template Debaters ─────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "t1",
    name: "The Rationalist",
    avatar: "🧠",
    style: "Analytical & Data-Driven",
    ideology: "Evidence-based pragmatism",
    tone: "Measured, precise, occasionally sardonic",
    strengths: "Statistics, logical frameworks, finding logical fallacies",
    weaknesses: "Can seem cold or dismissive of emotional arguments",
    background: "PhD in Philosophy of Science, former debate champion, writes for a policy journal",
    catchphrases: "Let's look at what the data actually says...; That's a compelling narrative, but the evidence suggests otherwise; I'd like to steelman your position before I dismantle it.",
    color: "#00D4AA",
  },
  {
    id: "t2",
    name: "The Firebrand",
    avatar: "🔥",
    style: "Passionate & Persuasive",
    ideology: "Progressive populism",
    tone: "Energetic, righteous, emotionally compelling",
    strengths: "Rhetoric, audience connection, moral framing",
    weaknesses: "Sometimes sacrifices nuance for impact",
    background: "Community organizer turned political commentator, bestselling author, viral TED talk speaker",
    catchphrases: "This isn't just policy — this is about people's lives!; Wake up!; History will judge us by what we do right now.",
    color: "#FF4444",
  },
  {
    id: "t3",
    name: "The Contrarian",
    avatar: "⚡",
    style: "Provocative & Unconventional",
    ideology: "Radical centrism / devil's advocate",
    tone: "Witty, irreverent, deliberately challenging",
    strengths: "Reframing arguments, exposing hidden assumptions, humor",
    weaknesses: "Can seem unserious or nihilistic",
    background: "Former Silicon Valley exec, podcast host with 2M subscribers, known for unpredictable takes",
    catchphrases: "Everyone in this room is wrong, including me.; What if the opposite is true?; You're not going to like what I'm about to say.",
    color: "#FFB800",
  },
  {
    id: "t4",
    name: "The Diplomat",
    avatar: "🕊️",
    style: "Measured & Consensus-Building",
    ideology: "Institutional pragmatism",
    tone: "Calm, respectful, bridge-building",
    strengths: "Finding common ground, historical context, nuanced positions",
    weaknesses: "Can seem indecisive or overly cautious",
    background: "Former ambassador, Georgetown professor of International Relations, served on UN advisory panels",
    catchphrases: "I think we actually agree more than we realize.; Let me offer a third path here.; The truth, as usual, is more complicated.",
    color: "#4488FF",
  },
  {
    id: "t5",
    name: "The Disruptor",
    avatar: "💥",
    style: "Bold & Future-Focused",
    ideology: "Techno-optimism",
    tone: "Confident, visionary, occasionally dismissive of tradition",
    strengths: "Innovation framing, thought experiments, paradigm shifts",
    weaknesses: "Can overlook human costs and historical lessons",
    background: "Serial entrepreneur, AI researcher, writes about exponential technologies and post-scarcity economics",
    catchphrases: "That's a 20th century answer to a 21st century problem.; In five years this debate will be irrelevant.; Build, don't regulate.",
    color: "#AA44FF",
  },
  {
    id: "t6",
    name: "The Traditionalist",
    avatar: "🏛️",
    style: "Principled & Historical",
    ideology: "Classical conservatism",
    tone: "Authoritative, dignified, occasionally stern",
    strengths: "Historical precedent, constitutional arguments, moral clarity",
    weaknesses: "Can resist necessary change, appeals to authority",
    background: "Constitutional law professor, published historian, former Supreme Court clerk",
    catchphrases: "The founders anticipated exactly this situation.; Chesterton's fence exists for a reason.; Reform, not revolution.",
    color: "#88766A",
  },
];

function generateSkillMd(debater) {
  return `---
name: ${debater.name}
type: debater-profile
style: ${debater.style}
---

# ${debater.name} — Debater Profile

## Core Identity
- **Ideology / Worldview:** ${debater.ideology}
- **Debate Style:** ${debater.style}
- **Tone:** ${debater.tone}

## Strengths & Weaknesses
- **Strengths:** ${debater.strengths}
- **Weaknesses:** ${debater.weaknesses}

## Background
${debater.background}

## Signature Phrases
${(debater.catchphrases || "").split(";").map(p => `- "${p.trim()}"`).join("\n")}

## Debate Instructions
When responding as ${debater.name}, you must:
1. Stay in character at all times — adopt the tone, vocabulary, and rhetorical style described above.
2. Draw on your background and expertise to support your arguments.
3. Use your strengths strategically while being aware of your weaknesses.
4. Reference your catchphrases naturally (not forced) when appropriate.
5. Directly engage with your opponent's arguments — don't just monologue.
6. Keep responses focused and punchy (2-4 paragraphs max per turn).
7. Occasionally concede a minor point to appear reasonable before driving home your main argument.
`;
}

// ─── Simulated debate responses ────────────────────────────────────
const SIMULATED_RESPONSES = {
  opening: [
    (d) => `Thank you. Let me be direct about where I stand on this. ${d.ideology === "Evidence-based pragmatism" ? "The data paints a clear picture here, and I intend to walk you through it methodically." : d.ideology === "Progressive populism" ? "This isn't an abstract policy question — real people are affected by the choices we make today." : d.ideology === "Techno-optimism" ? "We're asking the wrong question entirely. The real question is what becomes possible when we stop clinging to outdated frameworks." : "I've studied this from multiple angles, and I believe the path forward requires us to think carefully about unintended consequences."}`,
    (d) => `I appreciate the opportunity to discuss this. As someone who has spent years ${d.background?.split(",")[0]?.toLowerCase() || "studying these issues"}, I can tell you that the conventional wisdom gets this almost entirely wrong. Here's why.`,
  ],
  rebuttal: [
    (d, opp) => `My opponent makes a ${d.tone?.includes("sardonic") ? "superficially appealing" : d.tone?.includes("Energetic") ? "dangerously complacent" : "thought-provoking"} argument, but it falls apart under scrutiny. ${d.strengths?.includes("logical") ? "There are at least three logical gaps in that reasoning." : d.strengths?.includes("Rhetoric") ? "But rhetoric without substance is just noise." : "Let me reframe the question entirely."}`,
    (d, opp) => `${(d.catchphrases || "").split(";")[0]?.trim() || "Let me push back on that."} What ${opp} just described sounds reasonable on the surface, but consider this: ${d.strengths?.includes("Historical") ? "history shows us a very different pattern." : d.strengths?.includes("Innovation") ? "that approach has already been disrupted by reality." : "the evidence points in a completely different direction."}`,
  ],
  closing: [
    (d) => `Let me leave you with this. ${d.ideology === "Evidence-based pragmatism" ? "The numbers don't lie. When we follow the evidence rather than our instincts, we make better decisions. Every time." : d.ideology === "Progressive populism" ? "At the end of the day, policy is about people. And people deserve better than what we've been settling for." : d.ideology === "Techno-optimism" ? "The future is already here — it's just unevenly distributed. Our job is to accelerate the distribution." : "The wisest path forward balances boldness with humility. I believe the approach I've outlined does exactly that."}`,
  ],
};

function getSimulatedResponse(debater, phase, opponentName) {
  const pool = SIMULATED_RESPONSES[phase] || SIMULATED_RESPONSES.rebuttal;
  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(debater, opponentName);
}

// ─── Components ────────────────────────────────────────────────────

function DebaterCard({ debater, onSelect, selected, onEdit, onDelete, isTemplate }) {
  return (
    <div
      onClick={() => onSelect?.(debater)}
      style={{
        background: selected ? `linear-gradient(135deg, ${debater.color}15, ${debater.color}08)` : "rgba(255,255,255,0.03)",
        border: selected ? `2px solid ${debater.color}` : "2px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "24px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: debater.color, color: "#000",
          fontSize: 11, fontWeight: 700, padding: "3px 10px",
          borderRadius: 20, letterSpacing: "0.05em",
        }}>SELECTED</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{
          fontSize: 36, width: 56, height: 56, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `${debater.color}20`, borderRadius: 14,
        }}>{debater.avatar}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>{debater.name}</div>
          <div style={{ fontSize: 13, color: debater.color, fontWeight: 600, letterSpacing: "0.03em" }}>{debater.style}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 10 }}>
        {debater.ideology}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
        "{(debater.catchphrases || "").split(";")[0]?.trim()}"
      </div>
      {!isTemplate && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(debater); }}
            style={{ flex: 1, padding: "6px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer" }}>
            Edit
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(debater); }}
            style={{ flex: 1, padding: "6px 0", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.15)", borderRadius: 8, color: "rgba(255,100,100,0.7)", fontSize: 12, cursor: "pointer" }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function BuilderForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: "", avatar: "🎭", style: "", ideology: "", tone: "",
    strengths: "", weaknesses: "", background: "", catchphrases: "",
    color: "#00D4AA",
  });
  const colors = ["#00D4AA","#FF4444","#FFB800","#4488FF","#AA44FF","#FF6B9D","#88766A","#44DDff"];

  const field = (label, key, multi) => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>
      {multi ? (
        <textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          rows={3}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
      ) : (
        <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 24, fontFamily: "'Playfair Display', serif" }}>
        {initial ? "Edit Debater" : "Create New Debater"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {field("Name", "name")}
        {field("Avatar Emoji", "avatar")}
        {field("Debate Style", "style")}
        {field("Ideology / Worldview", "ideology")}
        {field("Tone", "tone")}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Accent Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {colors.map(c => (
              <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: c, cursor: "pointer",
                  border: form.color === c ? "3px solid #fff" : "3px solid transparent",
                  transition: "all 0.2s",
                }} />
            ))}
          </div>
        </div>
      </div>
      {field("Strengths", "strengths", true)}
      {field("Weaknesses", "weaknesses", true)}
      {field("Background", "background", true)}
      {field("Catchphrases (semicolon-separated)", "catchphrases", true)}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button onClick={() => {
          if (!form.name.trim()) return;
          onSave({ ...form, id: form.id || `custom_${Date.now()}` });
        }}
          style={{
            flex: 1, padding: "12px 0", background: form.color, color: "#000",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
          {initial ? "Save Changes" : "Create Debater"}
        </button>
        <button onClick={onCancel}
          style={{
            padding: "12px 24px", background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
            color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Cancel</button>
      </div>
    </div>
  );
}

function SkillPreview({ debater, onClose }) {
  const md = generateSkillMd(debater);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0D0D0F", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 32, maxWidth: 640, width: "100%", maxHeight: "80vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>
            SKILL.md — {debater.name}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <pre style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: 20, color: "rgba(255,255,255,0.7)",
          fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace",
          overflow: "auto",
        }}>{md}</pre>
      </div>
    </div>
  );
}

// ─── Debate Podium ─────────────────────────────────────────────────
function DebatePodium({ debater, side, responses, isTyping }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: `linear-gradient(180deg, ${debater.color}08 0%, transparent 40%)`,
      borderRadius: 20, border: `1px solid ${debater.color}20`,
      overflow: "hidden", minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 24px 16px", borderBottom: `1px solid ${debater.color}15`,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          fontSize: 40, width: 64, height: 64, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `${debater.color}18`, borderRadius: 16,
          border: `2px solid ${debater.color}30`,
        }}>{debater.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>{debater.name}</div>
          <div style={{ fontSize: 13, color: debater.color, fontWeight: 500, marginTop: 2 }}>{debater.style}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{debater.ideology}</div>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: isTyping ? debater.color : "rgba(255,255,255,0.15)",
          boxShadow: isTyping ? `0 0 12px ${debater.color}` : "none",
          transition: "all 0.3s",
          animation: isTyping ? "pulse 1.5s infinite" : "none",
        }} />
      </div>

      {/* Responses */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {responses.map((r, i) => (
          <div key={i} style={{
            marginBottom: 16, padding: "16px 18px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14, borderLeft: `3px solid ${debater.color}40`,
          }}>
            <div style={{ fontSize: 10, color: debater.color, fontWeight: 700, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {r.phase === "opening" ? "Opening Statement" : r.phase === "closing" ? "Closing Statement" : `Rebuttal ${r.round || ""}`}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>{r.text}</div>
          </div>
        ))}
        {isTyping && (
          <div style={{ padding: "16px 18px", color: debater.color, fontSize: 13, fontStyle: "italic" }}>
            <span style={{ animation: "pulse 1s infinite" }}>Formulating response...</span>
          </div>
        )}
        {responses.length === 0 && !isTyping && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
            Awaiting the debate topic...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────
export default function DebateArena() {
  const [tab, setTab] = useState("build");
  const [customDebaters, setCustomDebaters] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [skillPreview, setSkillPreview] = useState(null);

  // Debate state
  const [debater1, setDebater1] = useState(null);
  const [debater2, setDebater2] = useState(null);
  const [selectingFor, setSelectingFor] = useState(null); // 1 or 2
  const [topic, setTopic] = useState("");
  const [debateActive, setDebateActive] = useState(false);
  const [responses1, setResponses1] = useState([]);
  const [responses2, setResponses2] = useState([]);
  const [typing1, setTyping1] = useState(false);
  const [typing2, setTyping2] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [round, setRound] = useState(0);
  const [debateComplete, setDebateComplete] = useState(false);

  const allDebaters = [...TEMPLATES, ...customDebaters];

  const saveCustom = (d) => {
    setCustomDebaters(prev => {
      const idx = prev.findIndex(x => x.id === d.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = d; return n; }
      return [...prev, d];
    });
    setShowBuilder(false);
    setEditTarget(null);
  };

  const deleteCustom = (d) => {
    setCustomDebaters(prev => prev.filter(x => x.id !== d.id));
    if (debater1?.id === d.id) setDebater1(null);
    if (debater2?.id === d.id) setDebater2(null);
  };

  const handleSelectDebater = (d) => {
    if (selectingFor === 1) {
      setDebater1(d.id === debater2?.id ? debater1 : d);
      setSelectingFor(null);
    } else if (selectingFor === 2) {
      setDebater2(d.id === debater1?.id ? debater2 : d);
      setSelectingFor(null);
    }
  };

  // Simulate debate phases
  const runDebate = useCallback(async () => {
    if (!debater1 || !debater2 || !topic.trim()) return;
    setDebateActive(true);
    setDebateComplete(false);
    setResponses1([]);
    setResponses2([]);
    setRound(0);

    const phases = [
      { phase: "opening", label: "Opening Statements" },
      { phase: "rebuttal", label: "Rebuttal Round 1", round: 1 },
      { phase: "rebuttal", label: "Rebuttal Round 2", round: 2 },
      { phase: "closing", label: "Closing Statements" },
    ];

    for (const p of phases) {
      setCurrentPhase(p.label);
      setRound(p.round || 0);

      // Debater 1 speaks
      setTyping1(true);
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      const r1 = getSimulatedResponse(debater1, p.phase, debater2.name);
      setResponses1(prev => [...prev, { phase: p.phase, round: p.round, text: r1 }]);
      setTyping1(false);

      await new Promise(r => setTimeout(r, 600));

      // Debater 2 speaks
      setTyping2(true);
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      const r2 = getSimulatedResponse(debater2, p.phase, debater1.name);
      setResponses2(prev => [...prev, { phase: p.phase, round: p.round, text: r2 }]);
      setTyping2(false);

      await new Promise(r => setTimeout(r, 800));
    }

    setCurrentPhase("Debate Complete");
    setDebateComplete(true);
  }, [debater1, debater2, topic]);

  const resetDebate = () => {
    setDebateActive(false);
    setDebateComplete(false);
    setResponses1([]);
    setResponses2([]);
    setCurrentPhase(null);
    setRound(0);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08080A",
      color: "#fff",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.01)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display', serif",
            background: "linear-gradient(135deg, #00D4AA, #4488FF, #AA44FF)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite",
          }}>
            DEBATE ARENA
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.25)", marginTop: 4, textTransform: "uppercase",
          }}>AI-Powered Debates</div>
        </div>

        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4 }}>
          {[
            { key: "build", label: "Build", icon: "⚙️" },
            { key: "debate", label: "Debate", icon: "🎤" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: tab === t.key ? "rgba(255,255,255,0.1)" : "transparent",
                color: tab === t.key ? "#fff" : "rgba(255,255,255,0.4)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── BUILD TAB ─── */}
      {tab === "build" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", animation: "slideUp 0.4s ease" }}>
          {showBuilder || editTarget ? (
            <BuilderForm
              initial={editTarget}
              onSave={saveCustom}
              onCancel={() => { setShowBuilder(false); setEditTarget(null); }}
            />
          ) : (
            <>
              {/* Templates */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Playfair Display', serif", color: "#fff" }}>Template Debaters</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Pre-built debate personas ready to deploy</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {TEMPLATES.map(t => (
                    <div key={t.id} style={{ position: "relative" }}>
                      <DebaterCard debater={t} isTemplate
                        onSelect={() => setSkillPreview(t)} />
                      <button onClick={() => setSkillPreview(t)}
                        style={{
                          position: "absolute", bottom: 16, right: 16,
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8, padding: "5px 12px",
                          color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                        SKILL.md
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Debaters */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Playfair Display', serif", color: "#fff" }}>Your Debaters</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Custom-built debate personas</div>
                  </div>
                  <button onClick={() => setShowBuilder(true)}
                    style={{
                      padding: "10px 22px", background: "linear-gradient(135deg, #00D4AA, #4488FF)",
                      border: "none", borderRadius: 12, color: "#000", fontSize: 14,
                      fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>
                    + New Debater
                  </button>
                </div>
                {customDebaters.length === 0 ? (
                  <div style={{
                    padding: "48px 20px", textAlign: "center",
                    background: "rgba(255,255,255,0.02)", borderRadius: 20,
                    border: "2px dashed rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No custom debaters yet. Create one to get started!</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {customDebaters.map(d => (
                      <div key={d.id} style={{ position: "relative" }}>
                        <DebaterCard debater={d}
                          onEdit={() => setEditTarget(d)}
                          onDelete={() => deleteCustom(d)} />
                        <button onClick={() => setSkillPreview(d)}
                          style={{
                            position: "absolute", bottom: 64, right: 16,
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8, padding: "5px 12px",
                            color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                          SKILL.md
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── DEBATE TAB ─── */}
      {tab === "debate" && (
        <div style={{ height: "calc(100vh - 73px)", display: "flex", flexDirection: "column", animation: "slideUp 0.4s ease" }}>
          {/* Debater selection / topic bar */}
          <div style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.01)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 1400, margin: "0 auto" }}>
              {/* Debater 1 selector */}
              <div style={{ flex: "0 0 auto" }}>
                {selectingFor === 1 ? (
                  <div style={{
                    position: "absolute", top: 80, left: 20, zIndex: 100,
                    background: "#111114", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16, padding: 16, maxHeight: 400, overflow: "auto",
                    width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 12, letterSpacing: "0.1em" }}>SELECT DEBATER 1</div>
                    {allDebaters.map(d => (
                      <div key={d.id} onClick={() => handleSelectDebater(d)}
                        style={{
                          padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10,
                          background: d.id === debater2?.id ? "rgba(255,255,255,0.02)" : "transparent",
                          opacity: d.id === debater2?.id ? 0.3 : 1,
                          marginBottom: 4,
                        }}>
                        <span style={{ fontSize: 22 }}>{d.avatar}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: d.color }}>{d.style}</div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setSelectingFor(null)} style={{ width: "100%", marginTop: 8, padding: "8px 0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : null}
                <button onClick={() => setSelectingFor(selectingFor === 1 ? null : 1)}
                  disabled={debateActive}
                  style={{
                    padding: "8px 16px", borderRadius: 10,
                    background: debater1 ? `${debater1.color}15` : "rgba(255,255,255,0.04)",
                    border: debater1 ? `1px solid ${debater1.color}40` : "1px solid rgba(255,255,255,0.1)",
                    color: debater1 ? "#fff" : "rgba(255,255,255,0.4)",
                    fontSize: 13, cursor: debateActive ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                    opacity: debateActive ? 0.5 : 1,
                  }}>
                  {debater1 ? <><span>{debater1.avatar}</span> {debater1.name}</> : "Select Debater 1"}
                </button>
              </div>

              <div style={{ fontSize: 20, color: "rgba(255,255,255,0.2)", fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>VS</div>

              {/* Debater 2 selector */}
              <div style={{ flex: "0 0 auto", position: "relative" }}>
                {selectingFor === 2 ? (
                  <div style={{
                    position: "absolute", top: 40, right: 0, zIndex: 100,
                    background: "#111114", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16, padding: 16, maxHeight: 400, overflow: "auto",
                    width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 12, letterSpacing: "0.1em" }}>SELECT DEBATER 2</div>
                    {allDebaters.map(d => (
                      <div key={d.id} onClick={() => handleSelectDebater(d)}
                        style={{
                          padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10,
                          background: d.id === debater1?.id ? "rgba(255,255,255,0.02)" : "transparent",
                          opacity: d.id === debater1?.id ? 0.3 : 1,
                          marginBottom: 4,
                        }}>
                        <span style={{ fontSize: 22 }}>{d.avatar}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: d.color }}>{d.style}</div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setSelectingFor(null)} style={{ width: "100%", marginTop: 8, padding: "8px 0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : null}
                <button onClick={() => setSelectingFor(selectingFor === 2 ? null : 2)}
                  disabled={debateActive}
                  style={{
                    padding: "8px 16px", borderRadius: 10,
                    background: debater2 ? `${debater2.color}15` : "rgba(255,255,255,0.04)",
                    border: debater2 ? `1px solid ${debater2.color}40` : "1px solid rgba(255,255,255,0.1)",
                    color: debater2 ? "#fff" : "rgba(255,255,255,0.4)",
                    fontSize: 13, cursor: debateActive ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                    opacity: debateActive ? 0.5 : 1,
                  }}>
                  {debater2 ? <><span>{debater2.avatar}</span> {debater2.name}</> : "Select Debater 2"}
                </button>
              </div>

              <div style={{ flex: 1, marginLeft: 8 }}>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Enter debate topic or question..."
                  disabled={debateActive}
                  style={{
                    width: "100%", padding: "10px 16px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, color: "#fff", fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif", outline: "none",
                    opacity: debateActive ? 0.5 : 1,
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && !debateActive) runDebate(); }}
                />
              </div>

              {!debateActive ? (
                <button onClick={runDebate}
                  disabled={!debater1 || !debater2 || !topic.trim()}
                  style={{
                    padding: "10px 24px",
                    background: debater1 && debater2 && topic.trim() ? "linear-gradient(135deg, #00D4AA, #4488FF)" : "rgba(255,255,255,0.05)",
                    border: "none", borderRadius: 10, color: debater1 && debater2 && topic.trim() ? "#000" : "rgba(255,255,255,0.2)",
                    fontSize: 14, fontWeight: 700, cursor: debater1 && debater2 && topic.trim() ? "pointer" : "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap",
                  }}>
                  Start Debate
                </button>
              ) : (
                <button onClick={resetDebate}
                  style={{
                    padding: "10px 24px", background: "rgba(255,60,60,0.1)",
                    border: "1px solid rgba(255,60,60,0.3)", borderRadius: 10,
                    color: "#ff6666", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                  }}>
                  Reset
                </button>
              )}
            </div>

            {/* Phase indicator */}
            {currentPhase && (
              <div style={{
                textAlign: "center", marginTop: 12,
                fontSize: 12, fontWeight: 700, letterSpacing: "0.15em",
                color: debateComplete ? "#00D4AA" : "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}>
                {debateComplete ? "✓ " : "● "}{currentPhase}
              </div>
            )}
          </div>

          {/* Topic Banner */}
          {topic && debateActive && (
            <div style={{
              textAlign: "center", padding: "14px 24px",
              background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.15em", marginBottom: 4 }}>TOPIC</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>"{topic}"</div>
            </div>
          )}

          {/* Debate Stage */}
          <div style={{ flex: 1, display: "flex", gap: 2, padding: "16px 24px", minHeight: 0, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            {debater1 && debater2 ? (
              <>
                <DebatePodium debater={debater1} side="left" responses={responses1} isTyping={typing1} />
                <div style={{
                  width: 2, background: "rgba(255,255,255,0.04)", alignSelf: "stretch",
                  margin: "0 8px", borderRadius: 1,
                }} />
                <DebatePodium debater={debater2} side="right" responses={responses2} isTyping={typing2} />
              </>
            ) : (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 16,
              }}>
                <div style={{ fontSize: 64, opacity: 0.15 }}>🎤</div>
                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.25)", fontFamily: "'Playfair Display', serif" }}>
                  Select two debaters to begin
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)" }}>
                  Choose from templates or create your own in the Build tab
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skill Preview Modal */}
      {skillPreview && <SkillPreview debater={skillPreview} onClose={() => setSkillPreview(null)} />}
    </div>
  );
}
