import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  GraduationCap,
  Play,
  Plug,
  Share2,
  Shield,
  Sparkles,
  User,
} from "lucide-react";

const TRACK_ORDER = [
  "personalization",
  "connectors",
  "memory",
  "migrateChats",
  "customGpts",
];

const TRACK_LABELS = {
  personalization: "personalization settings",
  connectors: "connectors",
  memory: "memory",
  migrateChats: "important chats",
  customGpts: "Custom GPTs",
};

/** Personal Claude path — chooser matches wizard steps (Wrap up is always last, not listed). */
const PATH_B_TRACK_ORDER = [
  "personalization",
  "connectors",
  "memory",
  "migrateChats",
  "projects",
];

const PATH_B_TRACK_LABELS = {
  personalization: "Personalization",
  connectors: "Connectors",
  memory: "Memory",
  migrateChats: "Important chats",
  projects: "Projects",
};

const MEMORY_EXPORT_PROMPT = `I'm moving to another service and need to export my data. List every memory you have stored about me, as well as any context you've learned about me from past conversations. Output everything in a single code block so I can easily copy it. Format each entry as: [date saved, if available] - memory content. Make sure to cover all of the following — preserve my words verbatim where possible: Instructions I've given you about how to respond (tone, format, style, 'always do X', 'never do Y'). Personal details: name, location, job, family, interests. Projects, goals, and recurring topics. Tools, languages, and frameworks I use. Preferences and corrections I've made to your behavior. Any other stored context not covered above. Do not summarize, group, or omit any entries. After the code block, confirm whether that is the complete set or if any remain.`;

/** Use in ChatGPT if the default memory-export prompt does not give enough detail. */
const MEMORY_EXPORT_PROMPT_FALLBACK = `## Instructions

Include BOTH:
1) Stored long-term memory
2) Inferred and observed patterns from this conversation and prior context

- Prioritize preserving my original wording verbatim wherever possible (especially for instructions and preferences)
- If something is inferred rather than explicitly stated, include it but label it clearly as: (inferred)
- Do NOT limit yourself to what is officially stored as memory — I want the most complete and useful representation possible

## Categories (output in this order)

1. Instructions
2. Identity
3. Career
4. Projects
5. Preferences

## Format

- Use section headers for each category
- Within each category, list one entry per line
- Format each line as: [YYYY-MM-DD] - Entry content here.
- If no date is known, use [unknown]

## Quality bar

- Be exhaustive but not redundant
- Merge duplicates into single clean entries
- Prefer clarity over completeness if there is tension
- Do not include meta commentary

## Output

- Wrap everything in a single code block for easy copying
- After the code block, briefly state:
  - what portion is stored memory vs reconstructed
  - any notable assumptions you made`;



/** Run in the old project’s chat (personal Claude or ChatGPT Custom GPT) after the Enterprise project exists — paste the output into a new chat inside the migrated project, not into project instructions. */
const OPTIONAL_PROJECT_CHAT_HISTORY_PROMPT = `I'm migrating this project to Claude Enterprise. Summarize the important context from our conversation history that won't be fully captured in my project instructions or uploaded files: recurring themes, decisions, preferences, open threads, and unfinished work. Output a concise reference I can paste into a new chat in the migrated Enterprise project so the assistant knows what to remember — do not repeat the full project instructions verbatim.`;

/** Paste at bottom of a personal Claude chat (Migrate Important Chats). Output is one Markdown blob to paste into Enterprise — no separate receive prompt. */
const MIGRATE_CHATS_EXTRACT_CLAUDE = `I'm moving this conversation into Claude Enterprise and need one complete Markdown handoff I can paste into a new chat there.

OUTPUT RULES (critical):
- Write the entire response in clean Markdown only: use # and ## headings, bullet lists, and **bold** where it helps. No HTML.
- The whole thing must be easy to select and copy as a single block.

STRUCTURE — follow this order:

1) Start with a top section titled exactly: ## Handoff notice
   In that section, write a short introduction (2–4 sentences) that:
   - States this document is an import from a conversation in my personal Claude account
   - Says I'm giving it to you so you have the full context in Claude Enterprise and we're not starting cold
   - Asks you (the assistant receiving this in Enterprise) to: confirm you've read and understood the material; briefly list the 3 most important things to carry forward; ask one clarifying question only if something is genuinely unclear; say you're ready to continue where we left off; and treat everything below as active background for our work together

2) After that, add the captured content using these ## sections (be thorough — this may be the only record):
## Context summary
- What this conversation was about, why it mattered, what problem we were solving

## Key decisions and conclusions
- Decisions made or agreed on, positions or recommendations reached

## Important background
- Key facts, constraints, frameworks, models, or structures we developed

## Open threads
- Unanswered questions, next steps discussed but not completed

## How to continue
- What a fresh session needs to pick up where we left off
- My preferences for how I want this topic handled going forward

Be comprehensive and preserve nuance.`;

/** Paste at bottom of a ChatGPT conversation (Migrate Important Chats). Same pattern as personal Claude — one Markdown paste into Enterprise. */
const MIGRATE_CHATS_EXTRACT_CHATGPT = `I'm moving this conversation into Claude Enterprise and need one complete Markdown handoff I can paste into a new chat there.

OUTPUT RULES (critical):
- Write the entire response in clean Markdown only: use # and ## headings, bullet lists, and **bold** where it helps. No HTML.
- The whole thing must be easy to select and copy as a single block.

STRUCTURE — follow this order:

1) Start with a top section titled exactly: ## Handoff notice
   In that section, write a short introduction (2–4 sentences) that:
   - States this document is an import from a conversation in ChatGPT
   - Says I'm giving it to you so you have the full context in Claude Enterprise and we're not starting cold
   - Asks you (the assistant receiving this in Enterprise) to: confirm you've read and understood the material; briefly list the 3 most important things to carry forward; ask one clarifying question only if something is genuinely unclear; say you're ready to continue where we left off; and treat everything below as active background for our work together

2) After that, add the captured content using these ## sections (be thorough — this may be the only record):
## Context summary
- What this conversation was about, the core problem or goal we were working on

## Key decisions and conclusions
- Decisions made, recommendations reached, anything I confirmed or approved

## Important background
- Key facts and constraints I gave you, frameworks or approaches we developed together

## Open threads
- Questions raised but not resolved, next steps we discussed

## How to continue
- What a new assistant would need to pick up exactly where we left off
- How I like to work on this topic (tone, format, approach)

Be comprehensive and preserve nuance.`;

const URL = {
  chatgptPersonalization:
    "https://chatgpt.com/c/69d6d0e7-5e98-8326-bca4-d687b9aa41b4#settings/Personalization",
  chatgptConnectors:
    "https://chatgpt.com/c/69d6d0e7-5e98-8326-bca4-d687b9aa41b4#settings/Connectors",
  claudeHome: "https://claude.ai",
  claudeGeneral: "https://claude.ai/settings/general",
  claudeCapabilities: "https://claude.ai/settings/capabilities",
  claudeConnectors: "https://claude.ai/settings/connectors",
  /** New Enterprise chat — use Transcend work account; swap if your org uses a different entry URL. */
  claudeEnterpriseEntry: "https://claude.ai",
  chatgptHome: "https://chatgpt.com",
  transcendAboutYouDoc:
    "https://docs.google.com/document/d/1MIKMw_xn4FQH8ZBPSyTXFQ9MJkHn0yjkXfkna4raML8/edit?tab=t.82cl9linter7#heading=h.pnfkm7qiqyxw",
  transcendCustomInstructionsDoc:
    "https://docs.google.com/document/d/1MIKMw_xn4FQH8ZBPSyTXFQ9MJkHn0yjkXfkna4raML8/edit?tab=t.rmepizpkjjcy#heading=h.xrt1ihy7tjpf",
  videoIntroArtifacts: "https://claude.com/resources/tutorials/intro-to-artifacts",
  videoSkills: "https://claude.com/resources/tutorials/teach-claude-your-way-of-working-using-skills",
  supportArtifacts: "https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them",
  supportProjects: "https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects",
  transcendCompassProject: "https://claude.ai/project/019d6e4c-d5d7-7101-924d-3ea814765606",
  supportCowork: "https://support.claude.com/en/articles/13345190-getting-started-with-cowork",
  docsClaudeCode: "https://docs.anthropic.com/en/docs/claude-code/overview",
  supportClaudeDesign: "https://support.claude.com/en/articles/14604416-get-started-with-claude-design",
  supportSkills: "https://support.claude.com/en/articles/12512176-what-are-skills",
  supportChatMemory:
    "https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context",
  docsPromptEngineering:
    "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview",
};

/** Anthropic Academy (Skilljar) — slugs from https://anthropic.skilljar.com/ catalog. */
const ANTHROPIC_SKILLJAR_ORIGIN = "https://anthropic.skilljar.com";

const ANTHROPIC_COURSES = [
  { title: "Claude 101", href: `${ANTHROPIC_SKILLJAR_ORIGIN}/claude-101` },
  { title: "Claude Code 101", href: `${ANTHROPIC_SKILLJAR_ORIGIN}/claude-code-101` },
  {
    title: "Introduction to Claude Cowork",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/introduction-to-claude-cowork`,
  },
  { title: "Claude Code in Action", href: `${ANTHROPIC_SKILLJAR_ORIGIN}/claude-code-in-action` },
  {
    title: "AI Fluency: Framework & Foundations",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/ai-fluency-framework-foundations`,
  },
  {
    title: "Model Context Protocol: Advanced Topics",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/model-context-protocol-advanced-topics`,
  },
  {
    title: "Teaching AI Fluency",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/teaching-ai-fluency`,
  },
  {
    title: "AI Fluency for nonprofits",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/ai-fluency-for-nonprofits`,
  },
  {
    title: "Introduction to agent skills",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/introduction-to-agent-skills`,
  },
  {
    title: "AI Capabilities and Limitations",
    href: `${ANTHROPIC_SKILLJAR_ORIGIN}/ai-capabilities-and-limitations`,
  },
];

/** Cards for “What you get with Claude Enterprise” on the landing page (carousel). */
const ENTERPRISE_BENEFITS_DATA = [
  {
    key: "shared",
    Icon: Share2,
    title: "Shared projects, skills, and org features",
    body: "Use teammate-built projects, org-wide Skills, and Enterprise features so you build on shared setups instead of starting from scratch each time.",
  },
  {
    key: "compass",
    Icon: Compass,
    title: "Transcend Compass",
    body: "Ask Compass anything about Transcend — theory of change, theory of action, strategic approach, or how we work. Built on our foundational documentation and designed to think alongside you.",
    links: [{ label: "Open Transcend Compass", href: "transcendCompassProject" }],
  },
  {
    key: "connectors",
    Icon: Plug,
    title: "Pre-built Connectors",
    body: "Connect Claude to tools your team already uses — like Notion, Slack, and Google Drive. More coming soon.",
    links: [{ label: "Open Connectors", href: "claudeConnectors" }],
  },
  {
    key: "security",
    Icon: Shield,
    title: "Security, privacy, and safety",
    body: "Commercial terms for Transcend's data, admin controls, and clear rules for how AI is used at work. More detail on Transcend acceptable use will follow as policy is finalized.",
  },
  {
    key: "capacity",
    Icon: GraduationCap,
    title: "Shared capacity building",
    body: "One Enterprise workspace gives Transcend a shared place to learn the same tools, share what works, and build skills together instead of working in silos.",
  },
];

/** Explore links for the “Dig into features” screen — one flat grid, path styling from `accent`. */
const GAINING_FEATURES = [
  {
    title: "Artifacts",
    body: "Standalone outputs you can edit, iterate on, and reuse — not just text in the thread.",
    href: URL.supportArtifacts,
    linkLabel: "Learn about Artifacts",
    horizon: "now",
  },
  {
    title: "Projects",
    body: "Workspaces with saved instructions and files — where ongoing work lives.",
    href: URL.supportProjects,
    linkLabel: "Learn about Projects",
    horizon: "now",
  },
  {
    title: "Transcend Compass",
    body: "Use Transcend Compass — your shared AI thinking partner grounded in Transcend's strategy and foundational docs.",
    href: URL.transcendCompassProject,
    linkLabel: "Open Transcend Compass",
    horizon: "now",
  },
  {
    title: "Connectors",
    body: "Link Notion, Slack, Google Drive, and more so Claude can work with your real stack.",
    href: URL.claudeConnectors,
    linkLabel: "Open Connectors",
    horizon: "now",
  },
  {
    title: "Chat search & memory",
    body: "How Claude uses memory across chats and how to review or update what it stores.",
    href: URL.supportChatMemory,
    linkLabel: "Help: Memory & search",
    horizon: "now",
  },
  {
    title: "Prompt engineering",
    body: "Clarity, structure, and iteration patterns for getting reliable results from Claude.",
    href: URL.docsPromptEngineering,
    linkLabel: "Prompt engineering overview",
    horizon: "now",
  },
  {
    title: "Skills",
    body: "Write down how something should be done once — Claude keeps it in its pocket and pulls it out whenever it's relevant.",
    href: URL.supportSkills,
    linkLabel: "Learn about Skills",
    horizon: "now",
    securityWarning: true,
  },
  {
    title: "Claude Cowork",
    body: "Agent-style work in the desktop app — files, tools, and connectors with guardrails.",
    href: URL.supportCowork,
    linkLabel: "Learn about Cowork",
    horizon: "next",
  },
  {
    title: "Claude Code",
    body: "Claude-assisted coding in your terminal and repository — available on many Enterprise plans.",
    href: URL.docsClaudeCode,
    linkLabel: "Learn about Claude Code",
    horizon: "next",
  },
  {
    title: "Claude Design",
    body: "Create designs, interactive prototypes, and presentations by describing what you want — your brand system is built in.",
    href: URL.supportClaudeDesign,
    linkLabel: "Get started with Claude Design",
    horizon: "next",
  },
];

function useAccent(path) {
  if (path == null) {
    return {
      text: "text-gray-700 dark:text-gray-300",
      bgDot: "bg-gray-500 dark:bg-gray-400",
      ringDot: "ring-gray-500 dark:ring-gray-400",
      btn: "bg-gray-800 text-white hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500",
      focusRing: "focus-visible:ring-gray-500",
      celebrate: "bg-gray-100 dark:bg-gray-800",
    };
  }
  const isA = path === "chatgpt";
  return {
    text: isA ? "text-orange-600 dark:text-orange-400" : "text-teal-600 dark:text-teal-400",
    bgDot: isA ? "bg-orange-500 dark:bg-orange-400" : "bg-teal-500 dark:bg-teal-400",
    ringDot: isA ? "ring-orange-500 dark:ring-orange-400" : "ring-teal-500 dark:ring-teal-400",
    btn: isA
      ? "bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
      : "bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400",
    /** Focus ring for primary (filled) buttons — use with outline-none + ring-2 + ring-offset-2 */
    focusRing: isA
      ? "focus-visible:ring-orange-500"
      : "focus-visible:ring-teal-500",
    celebrate: isA ? "bg-orange-50 dark:bg-orange-950/50" : "bg-teal-50 dark:bg-teal-950/50",
  };
}

function gainingCardFocusClass(path) {
  if (path === "chatgpt") {
    return "hover:border-orange-200 focus-visible:ring-orange-500";
  }
  if (path === "personal") {
    return "hover:border-teal-200 focus-visible:ring-teal-500";
  }
  return "hover:border-gray-300 focus-visible:ring-gray-500";
}

function gainingTabSelectedClass(active, path) {
  if (!active) {
    return "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100";
  }
  if (path === "chatgpt") {
    return "bg-white text-orange-700 shadow-sm dark:bg-gray-950 dark:text-orange-300";
  }
  if (path === "personal") {
    return "bg-white text-teal-800 shadow-sm dark:bg-gray-950 dark:text-teal-300";
  }
  return "bg-white text-gray-800 shadow-sm dark:bg-gray-950 dark:text-gray-200";
}

function CarouselArrows({ page, maxPage, onPrev, onNext, accentRingClass }) {
  const disabledPrev = page <= 0;
  const disabledNext = page >= maxPage;
  const ring =
    accentRingClass ||
    "focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500";
  const baseBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Show previous items"
        disabled={disabledPrev}
        onClick={onPrev}
        className={`${baseBtn} ${ring}`}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Show next items"
        disabled={disabledNext}
        onClick={onNext}
        className={`${baseBtn} ${ring}`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ScreenTransition({ transitionKey, children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [transitionKey]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function CopyableBlock({ text, compact = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text.trim());
    setCopied(true);
  }, [text]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="relative rounded-lg border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800">
      <pre
        className={`overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-200 ${
          compact
            ? "max-h-44 overflow-y-auto overscroll-contain sm:max-h-52"
            : ""
        }`}
      >
        {text.trim()}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

function TipCallout({ children, variant = "amber" }) {
  const styles =
    variant === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      : "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200";
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-base leading-relaxed ${styles}`}
    >
      {children}
    </div>
  );
}

/** Numbered sub-steps inside a wizard step (Path A / Path B). */
function WizardSubstep({ number, title, children }) {
  return (
    <section className="space-y-3">
      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {number}. {title}
      </h4>
      <div className="space-y-3 text-base leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

function MemoryCapabilityExampleFigure({ src, alt, caption }) {
  return (
    <figure className="mx-auto w-full max-w-2xl">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-600 dark:bg-gray-900"
      />
      <figcaption className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {caption}
      </figcaption>
    </figure>
  );
}

/**
 * Shared: bring exported memory into Claude Enterprise. Capabilities → Memory can show
 * either a full editor (“View and edit memory”) or an early empty state — cover both.
 * Also remind users to enable chat search + memory-from-chats toggles on Capabilities.
 */
function EnterpriseMemoryImportInEnterpriseBlock() {
  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
        In <strong>Claude Enterprise</strong>, open{" "}
        <a
          href={URL.claudeCapabilities}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 hover:text-teal-800 dark:text-teal-400"
        >
          Settings → Capabilities
        </a>{" "}
        and open <strong>Memory</strong>. The screen you get is not always the same —
        especially right after you first join the org, or before you have much history in
        Enterprise.
      </p>

      <TipCallout variant="gray">
        <strong className="font-medium">On that Capabilities page:</strong> make sure{" "}
        <strong>Search and reference chats</strong> and{" "}
        <strong>Generate memory from chat history</strong> are both turned{" "}
        <strong>on</strong> (if your layout shows those toggles). That way search across chats
        and memory from history behave as expected while you import and use Enterprise.
      </TipCallout>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
        <div className="flex flex-col gap-4">
          <div className="space-y-3">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              If you can use <strong>View and edit memory</strong> (or similar)
            </p>
            <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
              When the UI shows something like <strong>Memory from your chats</strong> (with a
              preview snippet) and you can open it to view, add, or edit what Claude remembers,
              use that to <strong>paste or upload</strong> what you exported from ChatGPT or
              personal Claude. That is usually the fastest path once that editor is available.
            </p>
          </div>
          <MemoryCapabilityExampleFigure
            src="/memory-capabilities-editable.png"
            alt="Claude Capabilities memory card showing Memory from your chats with a text preview — you can open this to edit memory."
            caption="Example: this layout means you can open memory and add or edit entries directly."
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
        <div className="flex flex-col gap-4">
          <div className="space-y-3">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              If you only see an empty or &quot;not much yet&quot; message
            </p>
            <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
              Some accounts first show <strong>What does Claude know about you?</strong> with
              text like &quot;Not much, yet…&quot; and there is <strong>no</strong> real way to
              add or manage memories there yet. In that case, bring your export in with the{" "}
              <strong>Enterprise memory setup</strong> skill below. After you have used
              Enterprise for a bit, check again — the fuller memory editor often appears later.
            </p>
          </div>
          <MemoryCapabilityExampleFigure
            src="/memory-capabilities-empty-state.png"
            alt="Claude Capabilities memory card showing What does Claude know about you and Not much yet — this empty state cannot be used to import memory directly."
            caption="Example: this layout has no memory editor yet — use the Enterprise memory setup skill instead."
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-medium text-gray-900 dark:text-gray-100">
          Enterprise memory setup skill (when settings are not enough, or you prefer a guided
          import)
        </p>
        <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
          In <strong>Claude Enterprise</strong>, open a <strong>new chat</strong>. In the
          message box, type <strong>/</strong> (forward slash — the slash key, not backslash{" "}
          <strong>\</strong>) to open the slash menu. In the list that appears, click{" "}
          <strong>Enterprise memory setup</strong> to start the skill. It will ask you to
          provide what you exported (paste or upload), let you review and make edits or
          adjustments, then add it to your Enterprise memory when you confirm.
        </p>
      </div>

      <TipCallout variant="gray">
        <strong className="font-medium">Optional:</strong> You can still run{" "}
        <strong>Enterprise memory setup</strong> even when <strong>View and edit memory</strong>{" "}
        is available — helpful if you want a guided flow or to double-check before saving.
      </TipCallout>

      <TipCallout>
        <strong className="font-medium">Tip:</strong> Uploading and applying memory can take a
        little time; that is normal. Wait for the flow to finish — it should complete
        successfully. Memory can take a short while to feel fully reflected across chats;
        later, start a new chat and ask &quot;What do you know about me?&quot; to verify.
      </TipCallout>
    </div>
  );
}

function MigrateImportantChatsContent({ variant, accent }) {
  const isClaude = variant === "claude";
  const extractText = isClaude ? MIGRATE_CHATS_EXTRACT_CLAUDE : MIGRATE_CHATS_EXTRACT_CHATGPT;
  const sourceHref = isClaude ? URL.claudeHome : URL.chatgptHome;
  const sourceLinkClass = isClaude
    ? "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
    : "inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-900 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-100";

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <WizardSubstep number={1} title="Open the chat you want to migrate">
          <p>
            Use the button to open {isClaude ? "Claude" : "ChatGPT"} in a new tab. In that
            tab, find the conversation in your sidebar and open it.
          </p>
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className={sourceLinkClass}
          >
            {isClaude ? "Open Claude — claude.ai" : "Open ChatGPT — chatgpt.com"}
            <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </a>
          <TipCallout variant="gray">
            <strong className="font-medium">Tip:</strong> Pick a chat with a lot of
            back-and-forth, key decisions, or context you&apos;d have to re-explain. Longer,
            richer threads are more useful.
          </TipCallout>
        </WizardSubstep>

        <WizardSubstep number={2} title="Copy the extraction prompt">
          <p>
            The prompt asks for a single <strong>Markdown</strong> handoff. It starts with a
            short <strong>Handoff notice</strong> (explaining this is an import from another
            chat and what you want the Enterprise assistant to do with it), then the structured
            content — so you can paste <strong>one</strong> block into Enterprise later.
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Extraction prompt — paste at the bottom of your {isClaude ? "Claude" : "ChatGPT"}{" "}
            conversation
          </p>
          <CopyableBlock text={extractText} compact />
          <TipCallout variant="gray">
            <strong className="font-medium">Tip:</strong> Copy the prompt as-is; paste it at
            the bottom of the chat and send.
          </TipCallout>
        </WizardSubstep>

        <WizardSubstep number={3} title="Run the prompt and copy the full Markdown output">
          <p>
            In your {isClaude ? "Claude" : "ChatGPT"} tab, scroll to the bottom of the
            conversation, paste the prompt, and send. When the model finishes, select{" "}
            <strong>all</strong> of the Markdown output and copy it.
          </p>
          {isClaude ? (
            <TipCallout variant="gray">
              <strong className="font-medium">Tip:</strong> If the output looks long,
              that&apos;s a good sign — more detail means better context in Enterprise.
            </TipCallout>
          ) : (
            <TipCallout variant="gray">
              <strong className="font-medium">Tip:</strong> If the response was cut off, type
              &quot;continue&quot; in ChatGPT and copy that section too — then paste{" "}
              <strong>everything together</strong> into Enterprise as one message.
            </TipCallout>
          )}
        </WizardSubstep>

        <WizardSubstep number={4} title="Paste into Claude Enterprise and send">
          <p>
            Open a <strong>new chat</strong> in Claude Enterprise (logged in with your
            Transcend work account). Paste the <strong>entire</strong> Markdown handoff from
            the previous step — the Handoff notice and the sections below it are already
            written for the assistant; you don&apos;t add a second prompt.
          </p>
          <a
            href={URL.claudeEnterpriseEntry}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition ${accent.btn} ${focusPrimary(accent)}`}
          >
            Open Claude Enterprise
            <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Opens claude.ai — use your Enterprise org; replace this link if Transcend uses a
            different entry URL.
          </p>
        </WizardSubstep>

        <WizardSubstep number={5} title="You&apos;re done">
          <p>
            Claude Enterprise should respond to the Handoff notice and the content below it.
            {!isClaude ? (
              <>
                {" "}
                You&apos;ll have a more capable model picking up where ChatGPT left off.
              </>
            ) : null}
          </p>
          <TipCallout variant="gray">
            <strong className="font-medium">Note:</strong> To migrate another chat, repeat
            from step 1 with a different conversation.
          </TipCallout>
        </WizardSubstep>
      </div>
    </div>
  );
}

function WizardStepHeading({ focus, subtitle }) {
  return (
    <header className="space-y-1">
      <h2 className="text-2xl font-medium text-gray-900 dark:text-gray-100 sm:text-3xl">
        {focus}
      </h2>
      {subtitle ? (
        <p className="text-base text-gray-500 dark:text-gray-400">{subtitle}</p>
      ) : null}
    </header>
  );
}

function SiteHeader({ onHome }) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-center sm:gap-6">
      <button
        type="button"
        onClick={onHome}
        className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500"
        aria-label="Go to home page"
      >
        <img
          src="/transcend-logo.png"
          alt="Transcend"
          className="h-9 w-auto max-w-[min(100%,220px)] object-contain object-left opacity-95 transition hover:opacity-70 dark:opacity-100 dark:hover:opacity-70 sm:h-10"
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-medium leading-snug text-gray-900 dark:text-gray-100 sm:text-xl">
          Migrate to Transcend's Claude Enterprise
        </p>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Internal guide · Bring your context from ChatGPT or personal Claude into your org
          workspace
        </p>
      </div>
    </div>
  );
}

function VideoLink({ href, children, variant = "orange" }) {
  const playClass =
    variant === "teal"
      ? "text-teal-600 dark:text-teal-400"
      : variant === "slate"
        ? "text-gray-600 dark:text-gray-400"
        : "text-orange-500 dark:text-orange-400";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-900 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950"
    >
      <Play className={`h-4 w-4 shrink-0 ${playClass}`} aria-hidden />
      {children}
    </a>
  );
}

function FlowBackButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-2 rounded-md text-base font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-100 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ProgressDots({ current, total, accent }) {
  if (total < 1) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base font-medium text-gray-600 dark:text-gray-400">
        Step {current + 1} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: total }, (_, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                done
                  ? `${accent.bgDot} scale-100`
                  : active
                    ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-950 ${accent.ringDot} bg-white dark:bg-gray-900`
                    : "border-2 border-gray-300 bg-transparent dark:border-gray-600"
              }`}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}

const focusSecondary =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950";
const focusPrimary = (accent) =>
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 ${accent.focusRing}`;

function NavRow({ onBack, onNext, nextLabel, nextDisabled, accent }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-900 ${focusSecondary}`}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={onNext}
        className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${accent.btn} ${focusPrimary(accent)}`}
      >
        {nextLabel}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export default function ClaudeMigrationGuide() {
  const [screen, setScreen] = useState("landing");
  const [path, setPath] = useState(null);
  const [tracks, setTracks] = useState({
    personalization: true,
    connectors: true,
    memory: true,
    migrateChats: true,
    customGpts: true,
  });
  const [tracksPathB, setTracksPathB] = useState({
    personalization: true,
    connectors: true,
    memory: true,
    migrateChats: true,
    projects: true,
  });
  const [wizardPhase, setWizardPhase] = useState("chooser");
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const [gainingLearnTab, setGainingLearnTab] = useState("courses");
  const [gainingHorizonTab, setGainingHorizonTab] = useState("now");
  const [gainingFeaturePage, setGainingFeaturePage] = useState(0);
  const [gainingFromExplore, setGainingFromExplore] = useState(false);
  const [benefitsPage, setBenefitsPage] = useState(0);
  const [perPageBenefits, setPerPageBenefits] = useState(2);

  const accent = useAccent(path);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setPerPageBenefits(mq.matches ? 2 : 1);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const benefitsPageMax = Math.max(
    0,
    Math.ceil(ENTERPRISE_BENEFITS_DATA.length / perPageBenefits) - 1,
  );

  useEffect(() => {
    setBenefitsPage((p) => Math.min(p, benefitsPageMax));
  }, [benefitsPageMax, perPageBenefits]);

  const pathATracksList = useMemo(() => {
    return TRACK_ORDER.filter((id) => tracks[id]);
  }, [tracks]);

  /** ChatGPT wizard always ends with a Wrap up step (not a selectable track). */
  const pathAStepsWithWrap = useMemo(() => {
    return [...pathATracksList, "wrapUp"];
  }, [pathATracksList]);

  const pathBTracksList = useMemo(() => {
    return PATH_B_TRACK_ORDER.filter((id) => tracksPathB[id]);
  }, [tracksPathB]);

  const transitionKey = useMemo(() => {
    return `${screen}-${path ?? "x"}-${wizardPhase}-${wizardStepIndex}`;
  }, [screen, path, wizardPhase, wizardStepIndex]);

  const resetAll = useCallback(() => {
    setScreen("landing");
    setPath(null);
    setTracks({
      personalization: true,
      connectors: true,
      memory: true,
      migrateChats: true,
      customGpts: true,
    });
    setTracksPathB({
      personalization: true,
      connectors: true,
      memory: true,
      migrateChats: true,
      projects: true,
    });
    setWizardPhase("chooser");
    setWizardStepIndex(0);
    setGainingLearnTab("courses");
    setGainingHorizonTab("now");
    setGainingFeaturePage(0);
    setGainingFromExplore(false);
    setBenefitsPage(0);
  }, []);

  const handleFlowBack = useCallback(() => {
    if (screen === "orientation") {
      setScreen("landing");
      setPath(null);
      setWizardPhase("chooser");
      setWizardStepIndex(0);
    } else if (screen === "gaining") {
      if (gainingFromExplore) {
        setScreen("landing");
        setGainingFromExplore(false);
      } else {
        setScreen("wizard");
      }
    } else if (screen === "done") {
      setScreen("gaining");
    }
  }, [screen, gainingFromExplore]);

  const flowBackLabel =
    screen === "orientation"
      ? "Back to start"
      : screen === "gaining"
        ? gainingFromExplore
          ? "Back to start"
          : "Back to migration steps"
        : screen === "done"
          ? "Back to explore features"
          : "Back";

  const summaryLine = useMemo(() => {
    if (path === "chatgpt") {
      const items = pathATracksList.map((id) => TRACK_LABELS[id]);
      if (items.length === 0) return "You chose what to bring over.";
      if (items.length === 1) return `You migrated: ${items[0]}.`;
      if (items.length === 2) return `You migrated: ${items[0]} and ${items[1]}.`;
      const last = items[items.length - 1];
      const rest = items.slice(0, -1).join(", ");
      return `You migrated: ${rest}, and ${last}.`;
    }
    if (path === "personal") {
      const items = pathBTracksList.map((id) => PATH_B_TRACK_LABELS[id]);
      if (items.length === 0) {
        return "You wrapped up the personal Claude → Enterprise checklist.";
      }
      if (items.length === 1) {
        return `You walked through: ${items[0]} (plus wrap-up) in your personal Claude → Enterprise migration.`;
      }
      const last = items[items.length - 1];
      const rest = items.slice(0, -1).join(", ");
      return `You walked through: ${rest}, and ${last} (plus wrap-up) in your personal Claude → Enterprise migration.`;
    }
    if (path == null) {
      return "You explored features and learning resources — come back anytime from the start.";
    }
    return "";
  }, [path, pathATracksList, pathBTracksList]);

  const enterpriseBenefits = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          What you get with Claude Enterprise
        </h2>
        <CarouselArrows
          page={benefitsPage}
          maxPage={benefitsPageMax}
          onPrev={() => setBenefitsPage((p) => Math.max(0, p - 1))}
          onNext={() => setBenefitsPage((p) => Math.min(benefitsPageMax, p + 1))}
        />
      </div>
      <div
        className={`grid gap-4 ${perPageBenefits >= 2 ? "md:grid-cols-2" : "grid-cols-1"}`}
      >
        {ENTERPRISE_BENEFITS_DATA.slice(
          benefitsPage * perPageBenefits,
          benefitsPage * perPageBenefits + perPageBenefits,
        ).map((item) => {
          const Icon = item.Icon;
          return (
            <div
              key={item.key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-950 sm:p-5"
            >
              <div className="mb-2 flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                {item.body}
              </p>
              {item.links?.length ? (
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
                  {item.links.map((l) => (
                    <a
                      key={l.href}
                      href={URL[l.href]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-700 dark:text-teal-400"
                    >
                      {l.label}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  const landingCards = (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setPath("chatgpt");
            setWizardPhase("chooser");
            setWizardStepIndex(0);
            setScreen("orientation");
          }}
          className="group rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-orange-800 dark:focus-visible:ring-offset-gray-950"
        >
          <div className="mb-4 inline-flex rounded-lg bg-orange-50 p-3 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
            <ArrowRightLeft className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            I&apos;m coming from ChatGPT
          </h3>
          <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
            Memory, Custom GPTs, personalization, connectors — migrate what you need.
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            setPath("personal");
            setWizardPhase("chooser");
            setWizardStepIndex(0);
            setScreen("orientation");
          }}
          className="group rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-teal-800 dark:focus-visible:ring-offset-gray-950"
        >
          <div className="mb-4 inline-flex rounded-lg bg-teal-50 p-3 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
            <User className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            I&apos;m on a personal Claude account
          </h3>
          <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
            Projects, settings, memory, connectors — bring your active work into Enterprise.
          </p>
        </button>
      </div>
      <p className="mt-4 text-center sm:text-left">
        <button
          type="button"
          onClick={() => {
            setPath(null);
            setGainingFromExplore(true);
            setGainingHorizonTab("now");
            setGainingLearnTab("courses");
            setScreen("gaining");
          }}
          className="border-0 bg-transparent p-0 text-base font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 transition hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:text-teal-400 dark:hover:text-teal-300 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-gray-950"
        >
          Explore Claude
        </button>
      </p>
    </div>
  );

  const orientationA = (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 sm:text-3xl">
          You&apos;re about to level up how you work with AI
        </h1>
        <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
          Three things worth knowing before the steps — the big picture first, not every detail.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "It's manual, but faster than you think",
            body: "Most people finish in about 30 minutes. We'll take it one piece at a time — and you can skip anything that doesn't apply.",
          },
          {
            title: "You're moving four kinds of context",
            body: "Personalization, connectors, memory, important chats, and your Custom GPTs (rebuilt as Claude Projects). We'll only show the tracks you choose.",
          },
          {
            title: "We'll handle the tricky parts together",
            body: "ChatGPT and Claude organize settings a little differently — when something needs extra care (like memory), we'll call it out in the step where it matters, not here.",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-950 dark:hover:border-orange-900"
          >
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              {c.title}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {c.body}
            </p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setWizardPhase("chooser");
            setWizardStepIndex(0);
            setScreen("wizard");
          }}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition ${accent.btn} ${focusPrimary(accent)}`}
        >
          Continue to migration
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  const orientationB = (
    <div className="space-y-8">
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-emerald-50/90 p-6 shadow-sm dark:border-teal-900/60 dark:from-teal-950/40 dark:via-gray-950 dark:to-emerald-950/30 sm:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-teal-800 shadow-sm dark:bg-teal-950/80 dark:text-teal-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Enterprise is the home for your work with Claude
        </div>
        <header>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 sm:text-3xl">
            Same Claude you love — now built for how your org works
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
            You already know the product. This path is about moving your context over safely and
            confidently — with clearer data boundaries, shared projects, and room for what&apos;s next.
          </p>
        </header>
      </div>
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          What to know before you migrate
        </h2>
        <div className="mt-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Three things worth knowing
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Keep both accounts open for now",
                body: "Your personal and Enterprise accounts are separate. Stay logged into both until you're happy with how everything works in Enterprise.",
              },
              {
                title: "Your data situation is changing — in a good way",
                body: "Commercial terms cover Transcend's data, and Anthropic does not use it to train models. Transcend may publish acceptable-use rules for AI at work. On work accounts, administrators may be able to export or review activity, depending on policy.",
              },
              {
                title: "What this guide covers",
                body: "This checklist walks through preferences, connectors, memory, important chats, and projects — one topic at a time.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-950 dark:hover:border-teal-900"
              >
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {c.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">
            A few differences in Enterprise
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Projects can be shared",
                body: "Create projects for everyone at Transcend or for specific people. Chats inside a project stay private to you unless you choose to share them.",
              },
              {
                title: "Defaults from Transcend",
                body: "Transcend administrators can set defaults for Claude for everyone. A few screens or options may look different from your personal account.",
              },
              {
                title: "Larger context windows",
                body: "Enterprise offers more room for long documents and long threads than the personal plan, so you lose context less often on big tasks.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-950 dark:hover:border-teal-900"
              >
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {c.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setWizardPhase("chooser");
            setWizardStepIndex(0);
            setScreen("wizard");
          }}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition ${accent.btn} ${focusPrimary(accent)}`}
        >
          Continue to migration
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  const pathBChooser = (
    <div className="space-y-6">
      <h1 className="sr-only">Migration checklist</h1>
      <WizardStepHeading
        focus="Tracks"
        subtitle="Choose what to migrate from personal Claude — we&apos;ll only show what applies."
      />
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950">
        {[
          {
            id: "personalization",
            label: "Personalization",
            hint: "copy Personal preferences into Enterprise.",
          },
          {
            id: "connectors",
            label: "Connectors",
            hint: "re-authenticate Google Drive and other integrations in Enterprise.",
          },
          {
            id: "memory",
            label: "Memory",
            hint: "Capabilities → Memory — paste in settings when you can, or use the Enterprise memory setup skill.",
          },
          {
            id: "migrateChats",
            label: "Important chats",
            hint: "Markdown handoff from personal chats into Enterprise.",
          },
          {
            id: "projects",
            label: "Projects",
            hint: "move project instructions, files, and optional thread context.",
          },
        ].map((row) => (
          <label
            key={row.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 transition hover:bg-gray-50 dark:hover:bg-gray-900/80"
          >
            <input
              type="checkbox"
              checked={tracksPathB[row.id]}
              onChange={() => toggleTrackPathB(row.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900"
            />
            <span className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
              <span className="font-medium">{row.label}</span>
              {" — "}
              <em className="font-normal not-italic text-gray-500 dark:text-gray-500">
                {row.hint}
              </em>
            </span>
          </label>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        You&apos;ll always get a <strong>Wrap up</strong> step at the end.
      </p>
      <NavRow
        accent={accent}
        onBack={() => setScreen("orientation")}
        onNext={() => {
          if (pathBTracksList.length === 0) return;
          setWizardPhase("steps");
          setWizardStepIndex(0);
        }}
        nextLabel="Start migration steps"
        nextDisabled={pathBTracksList.length === 0}
      />
    </div>
  );

  const toggleTrack = (id) => {
    setTracks((t) => ({ ...t, [id]: !t[id] }));
  };

  const toggleTrackPathB = (id) => {
    setTracksPathB((t) => ({ ...t, [id]: !t[id] }));
  };

  const pathAChooser = (
    <div className="space-y-6">
      <h1 className="sr-only">Migration checklist</h1>
      <WizardStepHeading
        focus="Tracks"
        subtitle="Choose what to migrate from ChatGPT — we&apos;ll only show what applies."
      />
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950">
        {[
          {
            id: "personalization",
            label: "Personalization settings",
            hint: "your role, tone, and preferences. Fastest step.",
          },
          {
            id: "connectors",
            label: "Connectors",
            hint: "Google Drive and other integrations",
          },
          {
            id: "memory",
            label: "Memory",
            hint: "everything ChatGPT learned about how you work",
          },
          {
            id: "migrateChats",
            label: "Important chats",
            hint: "copy high-value threads into Enterprise (same idea as personal Claude)",
          },
          {
            id: "customGpts",
            label: "Custom GPTs",
            hint: "your tailored assistants, rebuilt as Claude Projects",
          },
        ].map((row) => (
          <label
            key={row.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 transition hover:bg-gray-50 dark:hover:bg-gray-900/80"
          >
            <input
              type="checkbox"
              checked={tracks[row.id]}
              onChange={() => toggleTrack(row.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900"
            />
            <span className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
              <span className="font-medium">{row.label}</span>
              {" — "}
              <em className="font-normal not-italic text-gray-500 dark:text-gray-500">
                {row.hint}
              </em>
            </span>
          </label>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        You&apos;ll always get a <strong>Wrap up</strong> step at the end.
      </p>
      <NavRow
        accent={accent}
        onBack={() => setScreen("orientation")}
        onNext={() => {
          if (pathATracksList.length === 0) return;
          setWizardPhase("steps");
          setWizardStepIndex(0);
        }}
        nextLabel="Start migration steps"
        nextDisabled={pathATracksList.length === 0}
      />
    </div>
  );

  const pathAStepContent = (trackId) => {
    switch (trackId) {
      case "personalization":
        return (
          <div className="space-y-6">
            <WizardStepHeading
              focus="Personalization"
              subtitle="Bring your ChatGPT profile into Claude Enterprise"
            />
            <div className="space-y-8">
              <WizardSubstep number={1} title="Collect your text in ChatGPT">
                <p>
                  Open <strong>Personalization</strong> in ChatGPT and collect what you want
                  to bring over: one <strong>Custom instructions</strong> field (how you want
                  ChatGPT to respond) and one <strong>About you</strong> field (your name,
                  role, how you like to work — labels may vary slightly).
                </p>
                <a
                  href={URL.chatgptPersonalization}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-900 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-100"
                >
                  Open ChatGPT — Personalization settings
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </a>
              </WizardSubstep>
              <WizardSubstep number={2} title="Paste into Claude Enterprise">
                <p>
                  In Claude, put what you collected into{" "}
                  <strong>Personal preferences</strong> (under General) — one place for how
                  Claude should know you and how it should respond. Paste or rewrite your
                  ChatGPT &quot;About you&quot; and custom instructions there so nothing
                  important is left behind.
                </p>
                <a
                  href={URL.claudeGeneral}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  Open Claude — General settings
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </a>
              </WizardSubstep>
              <WizardSubstep number={3} title="Optional — draft from Transcend guides first">
                <TipCallout variant="gray">
                  <strong className="font-medium">Haven&apos;t filled out ChatGPT personalization yet?</strong>{" "}
                  Use these Transcend guides to draft your <strong>About you</strong> and{" "}
                  <strong>Custom instructions</strong> in ChatGPT first, then bring the finished
                  text into Claude&apos;s Personal preferences.
                  <span className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <a
                      href={URL.transcendAboutYouDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-orange-700 underline decoration-orange-200 underline-offset-2 hover:text-orange-800 dark:text-orange-400"
                    >
                      About you (Google Doc)
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    </a>
                    <a
                      href={URL.transcendCustomInstructionsDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-orange-700 underline decoration-orange-200 underline-offset-2 hover:text-orange-800 dark:text-orange-400"
                    >
                      Custom instructions (Google Doc)
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    </a>
                  </span>
                </TipCallout>
              </WizardSubstep>
            </div>
          </div>
        );
      case "connectors":
        return (
          <div className="space-y-6">
            <WizardStepHeading
              focus="Connectors"
              subtitle="Mirror what you use in ChatGPT"
            />
            <div className="space-y-8">
              <WizardSubstep number={1} title="See what’s connected in ChatGPT">
                <p>
                  Open <strong>Connectors</strong> (integrations) in ChatGPT and note
                  what&apos;s connected — e.g. Google Drive, calendar, and other tools.
                  You&apos;ll mirror these in Claude next.
                </p>
                <a
                  href={URL.chatgptConnectors}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-900 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-100"
                >
                  Open ChatGPT — Connectors
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </a>
              </WizardSubstep>
              <WizardSubstep number={2} title="Re-authenticate in Claude Enterprise">
                <p>
                  In Claude, go to <strong>Connectors</strong> and sign in again for each
                  service you use. It&apos;s usually just re-authentication — no full
                  reconfiguration.
                </p>
                <a
                  href={URL.claudeConnectors}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  Open Claude — Connectors
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </a>
              </WizardSubstep>
              <WizardSubstep number={3} title="Quick timing">
                <TipCallout>
                  <strong className="font-medium">Tip:</strong> Budget about two minutes per
                  connector — quick win.
                </TipCallout>
              </WizardSubstep>
            </div>
          </div>
        );
      case "memory":
        return (
          <div className="space-y-6">
            <WizardStepHeading
              focus="Memory"
              subtitle="Export from ChatGPT, then import in Enterprise — settings or the org memory setup skill"
            />
            <div className="space-y-8">
              <WizardSubstep number={1} title="Clean up saved memory in ChatGPT">
                <p>
                  In <strong>ChatGPT → Settings → Personalization → Manage memory</strong>,
                  delete anything outdated — old projects, stale preferences, things that
                  are no longer true. You don&apos;t want to carry noise into Claude.
                </p>
              </WizardSubstep>
              <WizardSubstep number={2} title="Export what ChatGPT remembers">
                <p>
                  Paste the prompt below into a <strong>new ChatGPT chat</strong>, run it,
                  and copy the full output. The box scrolls if you need to read the whole
                  thing — use <strong>Copy</strong> to grab everything at once.
                </p>
                <div className="mt-3">
                  <CopyableBlock text={MEMORY_EXPORT_PROMPT} compact />
                </div>
                <div className="mt-6 space-y-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    If that doesn&apos;t give you what you need
                  </p>
                  <p>
                    Try this alternate prompt instead (more structured; asks for inferred
                    context as well as stored memory):
                  </p>
                  <CopyableBlock text={MEMORY_EXPORT_PROMPT_FALLBACK} compact />
                </div>
              </WizardSubstep>
              <WizardSubstep number={3} title="Import in Claude Enterprise">
                <EnterpriseMemoryImportInEnterpriseBlock />
              </WizardSubstep>
              <WizardSubstep number={4} title="Reference">
                <a
                  href={URL.supportChatMemory}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Help: Chat search &amp; memory
                </a>
              </WizardSubstep>
            </div>
          </div>
        );
      case "migrateChats":
        return (
          <div className="space-y-6">
            <WizardStepHeading
              focus="Important chats"
              subtitle="Extraction runs in ChatGPT — one Markdown handoff into Enterprise"
            />
            <MigrateImportantChatsContent variant="chatgpt" accent={accent} />
          </div>
        );
      case "customGpts":
        return (
          <div className="space-y-6">
            <WizardStepHeading
              focus="Projects"
              subtitle="Rebuild Custom GPTs as Claude Projects"
            />
            <div className="space-y-8">
              <WizardSubstep number={1} title="Gather everything from each Custom GPT">
                <p>
                  Claude Projects are the equivalent of Custom GPTs — and in a lot of ways
                  more powerful. For each Custom GPT you want to migrate:
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Open the GPT in ChatGPT → click <strong>Configure</strong></li>
                  <li>
                    Copy the <strong>Instructions</strong> (system prompt) and the{" "}
                    <strong>Description</strong> — in Claude, put instructions in{" "}
                    <strong>Project instructions</strong> and the description in{" "}
                    <strong>Project description</strong> so people know what the project is
                    for.
                  </li>
                  <li>Download any files in the <strong>Knowledge</strong> section</li>
                </ol>
                <TipCallout variant="gray">
                  <strong className="font-medium">Heads up:</strong> Custom GPT{" "}
                  <strong>conversation starters</strong> don&apos;t have a direct
                  equivalent in Projects today — you lose that shortcut list. You can fold
                  starter ideas into <strong>project instructions</strong> or the
                  description so teammates still know how to begin.
                </TipCallout>
              </WizardSubstep>
              <WizardSubstep number={2} title="Create the project in Claude Enterprise">
                <p>
                  In Claude Enterprise, go to <strong>Projects → New project</strong>.
                  Paste instructions and description, then upload your knowledge files.
                </p>
              </WizardSubstep>
              <WizardSubstep number={3} title="Share when it&apos;s ready">
                <p>
                  After you create the project, open sharing: invite{" "}
                  <strong>specific teammates</strong> who should use it, or share{" "}
                  <strong>across Transcend</strong> where that makes sense so others can
                  find and build on your setup.
                </p>
              </WizardSubstep>
              <WizardSubstep number={4} title="Files and testing">
                <TipCallout>
                  <strong className="font-medium">Important:</strong> Claude requires files
                  to be PDFs. If your knowledge files are .docx, Google Docs, or other
                  formats, convert them to PDF before uploading.
                </TipCallout>
                <p className="text-gray-600 dark:text-gray-400">
                  After uploading, test with a few of your most common prompts and adjust
                  until it feels right.
                </p>
              </WizardSubstep>
            </div>
          </div>
        );
      case "wrapUp":
        return (
          <div className="space-y-6">
            <WizardStepHeading
              focus="Wrap up"
              subtitle="You&apos;re done with this checklist"
            />
            <div className="space-y-8">
              <WizardSubstep number={1} title="Migration checklist complete">
                <p>
                  You&apos;ve finished the steps you selected. For day-to-day work, use
                  whichever tool you prefer — <strong>Claude Enterprise</strong> or{" "}
                  <strong>ChatGPT Enterprise</strong> — or use both. There&apos;s no need to
                  pick only one; choose what feels most comfortable for each task.
                </p>
              </WizardSubstep>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const pathBSteps = useMemo(
    () => [
    {
      id: "personalization",
      focus: "Personalization",
      subtitle: "Copy preferences into Enterprise",
      body: (
        <div className="space-y-8">
          <WizardSubstep number={1} title="Copy from your personal account">
            <p>
              <strong>Settings → Account → Personal preferences</strong>. Copy everything
              — your role, how you like responses formatted, any always/never behaviors.
            </p>
            <a
              href={URL.claudeGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Open Personal preferences (personal account)
              <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
          </WizardSubstep>
          <WizardSubstep number={2} title="Paste into Enterprise">
            <p>
              In your <strong>Enterprise</strong> account, go to the same place and
              rewrite from scratch. Write in first person, be direct.
            </p>
            <a
              href={URL.claudeGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Open Personal preferences (Enterprise)
              <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
          </WizardSubstep>
          <WizardSubstep number={3} title="Switch accounts">
            <TipCallout>
              <strong className="font-medium">Tip:</strong> Use the control in the{" "}
              <strong>bottom-left corner</strong> (your initials) to switch between your
              personal and Enterprise accounts. A blue checkmark shows which account is
              active.
            </TipCallout>
          </WizardSubstep>
        </div>
      ),
    },
    {
      id: "connectors",
      focus: "Connectors",
      subtitle: "Re-authenticate in Enterprise",
      body: (
        <div className="space-y-8">
          <WizardSubstep number={1} title="See what’s connected in personal Claude">
            <p>
              Open <strong>Settings → Connectors</strong> and see what is already
              connected.
            </p>
            <a
              href={URL.claudeConnectors}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Open Connectors (personal)
              <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
          </WizardSubstep>
          <WizardSubstep number={2} title="Re-authenticate in Enterprise">
            <p>
              In your Enterprise account: <strong>Settings → Connectors</strong>.
              Sign in again for each connector. Usually that is only a fresh login — no full
              setup from scratch.
            </p>
            <a
              href={URL.claudeConnectors}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Open Connectors (Enterprise)
              <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
          </WizardSubstep>
        </div>
      ),
    },
    {
      id: "memory",
      focus: "Memory",
      subtitle: "Copy from personal Claude, then import in Enterprise — settings or the org memory setup skill",
      body: (
        <div className="space-y-8">
          <WizardSubstep number={1} title="Understand the split">
            <p>
              Memory does not transfer automatically between your personal and Enterprise
              accounts — they are separate. After you copy from personal Capabilities below,
              bring it into Enterprise either in <strong>Capabilities → Memory</strong> (when
              the editor is available) or with the <strong>Enterprise memory setup</strong>{" "}
              skill — see the import step for both cases.
            </p>
          </WizardSubstep>
          <WizardSubstep number={2} title="Copy from personal Capabilities">
            <p>
              In your <strong>personal</strong> account, open{" "}
              <a
                href={URL.claudeCapabilities}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 hover:text-teal-800 dark:text-teal-400"
              >
                Settings → Capabilities
              </a>{" "}
              (<span className="whitespace-nowrap">claude.ai/settings/capabilities</span>
              ). Under <strong>Memory</strong>, review what is stored and copy anything
              you want in Enterprise (or save it to a file if that is easier).
            </p>
          </WizardSubstep>
          <WizardSubstep number={3} title="Import in Claude Enterprise">
            <EnterpriseMemoryImportInEnterpriseBlock />
          </WizardSubstep>
        </div>
      ),
    },
    {
      id: "migrateChats",
      focus: "Important chats",
      subtitle: "Run extraction in personal Claude, then paste the Markdown handoff into Enterprise",
      body: <MigrateImportantChatsContent variant="claude" accent={accent} />,
    },
    {
      id: "projects",
      focus: "Projects",
      subtitle: "Move each project into Enterprise",
      body: (
        <div className="space-y-8">
          <WizardSubstep number={1} title="Copy from your personal project">
            <p>
              In your <strong>personal</strong> project, copy the <strong>project name</strong>,{" "}
              <strong>description</strong>, and <strong>project instructions</strong> (or export
              them if your UI offers that). Download any <strong>knowledge base</strong> files.
            </p>
          </WizardSubstep>
          <WizardSubstep number={2} title="Create the project in Enterprise">
            <p>
              In <strong>Enterprise</strong>, create a new project. Use the same{" "}
              <strong>name</strong> and <strong>description</strong> as in personal. Paste{" "}
              <strong>project instructions</strong> and <strong>re-upload files</strong>{" "}
              (PDFs where required).
            </p>
          </WizardSubstep>
          <WizardSubstep number={3} title="Optional — carry over chat history as context">
            <div className="space-y-3 rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 dark:border-teal-900 dark:bg-teal-950/30">
              <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                After the Enterprise project exists with instructions and files, open a
                chat <strong>inside your personal project</strong> (the old one), run the
                prompt below, copy the output, then start a <strong>new chat inside your new
                Enterprise project</strong> and paste it there. That brings useful thread
                context into Enterprise without pasting a long block into project
                instructions.
              </p>
              <CopyableBlock text={OPTIONAL_PROJECT_CHAT_HISTORY_PROMPT} />
            </div>
          </WizardSubstep>
          <WizardSubstep number={4} title="Files and help">
            <TipCallout>
              <strong className="font-medium">Important:</strong> Claude requires files to
              be PDFs. Convert any .docx, Google Docs, or other formats before uploading.
            </TipCallout>
            <a
              href={URL.supportProjects}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-base font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 hover:text-teal-800 dark:text-teal-400"
            >
              Help: Create and manage projects
              <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
          </WizardSubstep>
        </div>
      ),
    },
    {
      id: "wrapUp",
      focus: "Wrap up",
      subtitle: "What to do next",
      body: (
        <div className="space-y-8">
          <WizardSubstep number={1} title="You&apos;re done with the checklist">
            <p>
              Once you&apos;ve confirmed everything feels good in Enterprise, you&apos;re
              done with the migration checklist. There&apos;s no requirement to change your
              personal account — many people keep it for non-work experiments, side
              projects, or backups.
            </p>
          </WizardSubstep>
          <WizardSubstep number={2} title="Where to work day to day">
            <p>
              For Transcend work, use the <strong>Enterprise</strong> org so your chats get
              the right data protections, sharing, and policy context. You can keep your
              personal Claude account for as long as you still find it useful.
            </p>
          </WizardSubstep>
        </div>
      ),
    },
    ],
    [accent],
  );

  const pathBStepsFiltered = useMemo(() => {
    return pathBSteps.filter((step) => {
      if (step.id === "wrapUp") return true;
      return tracksPathB[step.id];
    });
  }, [pathBSteps, tracksPathB]);

  useEffect(() => {
    if (path !== "personal" || wizardPhase !== "steps") return;
    const max = pathBStepsFiltered.length - 1;
    if (max < 0) return;
    setWizardStepIndex((i) => Math.min(i, max));
  }, [path, wizardPhase, pathBStepsFiltered.length]);

  useEffect(() => {
    if (path !== "chatgpt" || wizardPhase !== "steps") return;
    const max = pathAStepsWithWrap.length - 1;
    if (max < 0) return;
    setWizardStepIndex((i) => Math.min(i, max));
  }, [path, wizardPhase, pathAStepsWithWrap.length]);

  const pathAWizardSteps = () => {
    const total = pathAStepsWithWrap.length;
    const safeIndex = Math.min(wizardStepIndex, Math.max(0, total - 1));
    const currentId = pathAStepsWithWrap[safeIndex];
    const atLast = safeIndex >= total - 1;

    const goBack = () => {
      if (safeIndex > 0) setWizardStepIndex((i) => i - 1);
      else setWizardPhase("chooser");
    };

    const goNext = () => {
      if (atLast) {
        setGainingFromExplore(false);
        setScreen("gaining");
      } else setWizardStepIndex((i) => Math.min(i + 1, total - 1));
    };

    return (
      <div className="space-y-6">
        <h1 className="sr-only">Migration checklist</h1>
        <ProgressDots current={safeIndex} total={total} accent={accent} />
        {pathAStepContent(currentId)}
        <NavRow
          accent={accent}
          onBack={goBack}
          onNext={goNext}
          nextLabel={atLast ? "Continue to explore features" : "Next step"}
        />
      </div>
    );
  };

  const pathBWizard = () => {
    const total = pathBStepsFiltered.length;
    const safeIndex = Math.min(wizardStepIndex, Math.max(0, total - 1));
    const step = pathBStepsFiltered[safeIndex];
    const atLast = safeIndex >= total - 1;

    const goBack = () => {
      if (safeIndex > 0) setWizardStepIndex((i) => i - 1);
      else setWizardPhase("chooser");
    };

    const goNext = () => {
      if (atLast) {
        setGainingFromExplore(false);
        setScreen("gaining");
      } else setWizardStepIndex((i) => i + 1);
    };

    if (!step || total === 0) {
      return (
        <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
          <p>No steps selected. Go back and choose at least one track.</p>
          <button
            type="button"
            onClick={() => setWizardPhase("chooser")}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${accent.btn}`}
          >
            Back to tracks
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h1 className="sr-only">Migration checklist</h1>
        <ProgressDots current={safeIndex} total={total} accent={accent} />
        <div>
          <WizardStepHeading focus={step.focus} subtitle={step.subtitle} />
          <div className="mt-4">{step.body}</div>
        </div>
        <NavRow
          accent={accent}
          onBack={goBack}
          onNext={goNext}
          nextLabel={atLast ? "Continue to explore features" : "Next step"}
        />
      </div>
    );
  };

  const mediaLinkVariant =
    path === "personal" ? "teal" : path === "chatgpt" ? "orange" : "slate";

  const gainingIntro =
    path == null
      ? "Browse features, Anthropic courses, and short videos — all optional; pick what fits how you work."
      : "Your migration checklist is complete. Use the links below to explore what to try next — from core product ideas to Connectors, memory, and more powerful tools. Nothing here is required; choose what fits how you work.";

  const gainingFeaturesNow = GAINING_FEATURES.filter((c) => c.horizon === "now");
  const gainingFeaturesNext = GAINING_FEATURES.filter((c) => c.horizon === "next");
  const gainingFeatureList = gainingHorizonTab === "now" ? gainingFeaturesNow : gainingFeaturesNext;
  const gainingFeaturePageMax = Math.max(0, Math.ceil(gainingFeatureList.length / 3) - 1);
  const gainingFeatureSlice = gainingFeatureList.slice(gainingFeaturePage * 3, gainingFeaturePage * 3 + 3);

  const gainingScreen = (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 sm:text-3xl">
          Dig into features
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
          {gainingIntro}
        </p>
      </header>

      <TipCallout variant="gray">
        <strong className="font-medium">Documentation is there to help.</strong> If you
        start using <strong className="font-medium">Cowork</strong> or{" "}
        <strong className="font-medium">Claude Code</strong> for real work, take extra
        care — Transcend is still finalizing acceptable-use rules for AI tools, and we
        will share clearer guidance when it is ready.
      </TipCallout>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-lg border border-gray-200 bg-stone-100 p-0.5 dark:border-gray-700 dark:bg-gray-900"
            role="tablist"
            aria-label="Feature horizon"
          >
            <button
              type="button"
              role="tab"
              aria-selected={gainingHorizonTab === "now"}
              onClick={() => { setGainingHorizonTab("now"); setGainingFeaturePage(0); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950 ${gainingTabSelectedClass(gainingHorizonTab === "now", path)}`}
            >
              Available now
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={gainingHorizonTab === "next"}
              onClick={() => { setGainingHorizonTab("next"); setGainingFeaturePage(0); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950 ${gainingTabSelectedClass(gainingHorizonTab === "next", path)}`}
            >
              Coming soon
            </button>
          </div>
          <CarouselArrows
            page={gainingFeaturePage}
            maxPage={gainingFeaturePageMax}
            onPrev={() => setGainingFeaturePage((p) => Math.max(0, p - 1))}
            onNext={() => setGainingFeaturePage((p) => Math.min(gainingFeaturePageMax, p + 1))}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {gainingFeatureSlice.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:focus-visible:ring-offset-gray-950 sm:p-5 ${gainingCardFocusClass(path)}`}
            >
              <h3 className="flex items-center gap-1.5 text-base font-medium text-gray-900 dark:text-gray-100 sm:text-lg">
                {c.title}
                {c.securityWarning ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                ) : null}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                {c.body}
              </p>
              <span
                className={`mt-3 inline-flex items-center gap-1 text-sm font-medium sm:mt-4 sm:text-base ${accent.text}`}
              >
                {c.linkLabel}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </a>
          ))}
        </div>
        {gainingFeatureSlice.some((c) => c.securityWarning) ? (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Never upload a skill from an external source — doing so poses a security risk to Transcend.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-500">
          Courses &amp; video tutorials
        </p>
        <div
          className="inline-flex rounded-lg border border-gray-200 bg-stone-100 p-0.5 dark:border-gray-700 dark:bg-gray-900"
          role="tablist"
          aria-label="Courses and video tutorials"
        >
          <button
            type="button"
            role="tab"
            id="gaining-tab-courses"
            aria-selected={gainingLearnTab === "courses"}
            aria-controls="gaining-panel-courses"
            onClick={() => setGainingLearnTab("courses")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950 ${gainingTabSelectedClass(gainingLearnTab === "courses", path)}`}
          >
            Courses
          </button>
          <button
            type="button"
            role="tab"
            id="gaining-tab-videos"
            aria-selected={gainingLearnTab === "videos"}
            aria-controls="gaining-panel-videos"
            onClick={() => setGainingLearnTab("videos")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950 ${gainingTabSelectedClass(gainingLearnTab === "videos", path)}`}
          >
            Video tutorials
          </button>
        </div>

        {gainingLearnTab === "courses" ? (
          <div
            id="gaining-panel-courses"
            role="tabpanel"
            aria-labelledby="gaining-tab-courses"
            className="flex flex-wrap gap-2"
          >
            {ANTHROPIC_COURSES.map((c) => (
              <VideoLink key={c.href} href={c.href} variant={mediaLinkVariant}>
                {c.title}
              </VideoLink>
            ))}
          </div>
        ) : (
          <div
            id="gaining-panel-videos"
            role="tabpanel"
            aria-labelledby="gaining-tab-videos"
            className="flex flex-wrap gap-2"
          >
            <VideoLink href={URL.videoIntroArtifacts} variant={mediaLinkVariant}>
              Watch: Intro to Artifacts
            </VideoLink>
            <VideoLink href={URL.videoSkills} variant={mediaLinkVariant}>
              Watch: Skills overview
            </VideoLink>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setScreen("done")}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition ${accent.btn} ${focusPrimary(accent)}`}
        >
          I&apos;m done exploring
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  const doneScreen = (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-950">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${accent.celebrate} animate-[pulse-soft_1.2s_ease-out_1]`}
        >
          <Check
            className={`h-7 w-7 ${accent.text}`}
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      </div>
      <style>{`
        @keyframes pulse-soft {
          0% { transform: scale(0.92); opacity: 0.7; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <header>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 sm:text-3xl">
          You&apos;re all set.
        </h1>
        <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400">
          Claude Enterprise is ready when you are.
        </p>
      </header>
      <p className="mx-auto max-w-lg text-base leading-relaxed text-gray-700 dark:text-gray-300">
        {summaryLine}
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition ${accent.btn} ${focusPrimary(accent)}`}
        >
          Open Claude Enterprise
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
        </a>
      </div>
      <button
        type="button"
        onClick={resetAll}
        className="rounded-md text-base font-medium text-gray-600 underline decoration-gray-300 underline-offset-2 transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-200 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-950"
      >
        Help a teammate — start over
      </button>
    </div>
  );

  let main = null;
  if (screen === "landing") {
    main = (
      <div className="space-y-5">
        <aside
          className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2.5 text-xs leading-snug text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 sm:px-4 sm:py-3 sm:text-sm"
          aria-labelledby="landing-invite-heading"
        >
          <h2
            id="landing-invite-heading"
            className="text-xs font-semibold text-amber-950 dark:text-amber-50 sm:text-sm"
          >
            Before you begin
          </h2>
          <p className="mt-1 text-amber-900/95 dark:text-amber-100/95">
            Accept your <strong>Claude Enterprise invite</strong> from email (check spam)
            so you have an org seat before you run through migration steps.
          </p>
        </aside>
        <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-teal-50 p-5 shadow-sm dark:border-orange-900/40 dark:from-orange-950/30 dark:via-gray-950 dark:to-teal-950/20 sm:p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-200/40 blur-2xl dark:bg-orange-500/10" aria-hidden />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-teal-200/30 blur-2xl dark:bg-teal-500/10" aria-hidden />
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-orange-800 shadow-sm dark:bg-gray-900/90 dark:text-orange-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Transcend · Claude Enterprise
            </div>
            <header className="max-w-2xl">
              <h1 className="text-2xl font-medium leading-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
                Let&apos;s get you set up on Claude Enterprise
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:text-base">
                New org workspace for the team — use this guide to move context from{" "}
                <strong>ChatGPT</strong> or <strong>personal Claude</strong> so Enterprise
                feels like a seamless step forward.
              </p>
            </header>
          </div>
        </div>
        {enterpriseBenefits}
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Where are you moving from?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
            Pick a path for orientation and migration, or explore features below.
          </p>
        </div>
        {landingCards}
      </div>
    );
  } else if (screen === "orientation") {
    main = path === "chatgpt" ? orientationA : orientationB;
  } else if (screen === "wizard") {
    if (path === "chatgpt" && wizardPhase === "chooser") {
      main = pathAChooser;
    } else if (path === "chatgpt") {
      main = pathAWizardSteps();
    } else if (path === "personal" && wizardPhase === "chooser") {
      main = pathBChooser;
    } else if (path === "personal") {
      main = pathBWizard();
    } else {
      main = null;
    }
  } else if (screen === "gaining") {
    main = gainingScreen;
  } else {
    main = doneScreen;
  }

  const showGlobalBack =
    screen === "orientation" || screen === "gaining" || screen === "done";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <SiteHeader onHome={resetAll} />
      </div>
      {showGlobalBack && (
        <FlowBackButton onClick={handleFlowBack} label={flowBackLabel} />
      )}
      <ScreenTransition transitionKey={transitionKey}>{main}</ScreenTransition>
    </div>
  );
}
