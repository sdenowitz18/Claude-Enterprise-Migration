import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ChevronRight,
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
  supportSkills: "https://support.claude.com/en/articles/12512176-what-are-skills",
  supportChatMemory:
    "https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context",
};

/** Explore links for the “Dig into features” screen — one flat grid, path styling from `accent`. */
const GAINING_FEATURES = [
  {
    title: "Artifacts",
    body: "Standalone outputs you can edit, iterate on, and reuse — not just text in the thread.",
    href: URL.supportArtifacts,
    linkLabel: "Learn about Artifacts",
    caution: false,
  },
  {
    title: "Projects",
    body: "Workspaces with saved instructions and files — where ongoing work lives.",
    href: URL.supportProjects,
    linkLabel: "Learn about Projects",
    caution: false,
  },
  {
    title: "Transcend Compass",
    body: "A shared Transcend project for Theory of Change and strategy — open it whenever you need it.",
    href: URL.transcendCompassProject,
    linkLabel: "Open Transcend Compass",
    caution: false,
  },
  {
    title: "Connectors",
    body: "Link Notion, Google Drive, and other tools so Claude can work with your real stack.",
    href: URL.claudeConnectors,
    linkLabel: "Open Connectors",
    caution: false,
  },
  {
    title: "Chat search & memory",
    body: "How Claude uses memory across chats and how to review or update what it stores.",
    href: URL.supportChatMemory,
    linkLabel: "Help: Memory & search",
    caution: false,
  },
  {
    title: "Skills",
    body: "Reusable playbooks Claude loads when relevant — templates and org know-how in one place.",
    href: URL.supportSkills,
    linkLabel: "Learn about Skills",
    caution: true,
  },
  {
    title: "Claude Cowork",
    body: "Agent-style work in the desktop app — files, tools, and connectors with guardrails.",
    href: URL.supportCowork,
    linkLabel: "Learn about Cowork",
    caution: true,
  },
  {
    title: "Claude Code",
    body: "Claude-assisted coding in your terminal and repository — available on many Enterprise plans.",
    href: URL.docsClaudeCode,
    linkLabel: "Learn about Claude Code",
    caution: true,
  },
];

function useAccent(path) {
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

/** Shared steps: bring exported memory into Enterprise via the org “Enterprise memory setup” skill. */
function EnterpriseMemorySkillImportBlock() {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          Claude Enterprise: import with the Enterprise memory setup skill
        </p>
        <p className="mt-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
          In <strong>Claude Enterprise</strong>, open a <strong>new chat</strong>. In the
          message box, type <strong>/</strong> (forward slash — the slash key, not
          backslash <strong>\</strong>) to open the slash menu. In the list that appears,
          click <strong>Enterprise memory setup</strong> to start the skill. That is the
          org skill for importing memory from another tool — it will ask you to provide what
          you exported (paste or upload), let you review and make edits or adjustments,
          then add it to your Enterprise memory when you confirm.
        </p>
      </div>
      <TipCallout>
        <strong className="font-medium">Tip:</strong> Uploading and applying memory can
        take a little time; that is normal. Wait for the flow to finish — it should
        complete successfully. Memory can take a short while to feel fully reflected across
        chats; later, start a new chat and ask &quot;What do you know about me?&quot; to
        verify.
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

function TranscendLogo() {
  return (
    <img
      src="/transcend-logo.png"
      alt="Transcend"
      className="h-9 w-auto max-w-[min(100%,220px)] shrink-0 object-contain object-left opacity-95 dark:opacity-100 sm:h-10"
    />
  );
}

function SiteHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-center sm:gap-6">
      <TranscendLogo />
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

  const accent = useAccent(path);

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
  }, []);

  const handleFlowBack = useCallback(() => {
    if (screen === "orientation") {
      setScreen("landing");
      setPath(null);
      setWizardPhase("chooser");
      setWizardStepIndex(0);
    } else if (screen === "gaining") {
      setScreen("wizard");
    } else if (screen === "done") {
      setScreen("gaining");
    }
  }, [screen]);

  const flowBackLabel =
    screen === "orientation"
      ? "Back to start"
      : screen === "gaining"
        ? "Back to migration steps"
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
    return "";
  }, [path, pathATracksList]);

  const enterpriseBenefits = (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        What you get with Claude Enterprise
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950">
          <div className="mb-2 flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Share2 className="h-5 w-5 shrink-0" aria-hidden />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Shared projects, skills, and org features
            </h3>
          </div>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
            Use teammate-built projects, org-wide Skills, and Enterprise features so you
            build on shared setups instead of starting from scratch each time.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950">
          <div className="mb-2 flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Shield className="h-5 w-5 shrink-0" aria-hidden />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Security, privacy, and safety
            </h3>
          </div>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
            Commercial terms for Transcend&apos;s data, admin controls, and clear rules for
            how AI is used at work. More detail on Transcend acceptable use will follow as
            policy is finalized.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950">
          <div className="mb-2 flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <GraduationCap className="h-5 w-5 shrink-0" aria-hidden />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Shared capacity building
            </h3>
          </div>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
            One Enterprise workspace gives Transcend a shared place to learn the same tools,
            share what works, and build skills together instead of working in silos.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950">
          <div className="mb-2 flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Plug className="h-5 w-5 shrink-0" aria-hidden />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Starters you can use right away
            </h3>
          </div>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
            You can start with the shared <strong>Transcend Compass</strong> project and a{" "}
            <strong>Notion</strong> connection through Connectors. Add other tools anytime in{" "}
            <strong>Settings → Connectors</strong>.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
            <a
              href={URL.transcendCompassProject}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-700 dark:text-teal-400"
            >
              Transcend Compass project
            </a>
            <a
              href={URL.claudeConnectors}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-700 dark:text-teal-400"
            >
              Connectors (Notion &amp; more)
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const landingCards = (
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
            hint: "Capabilities → Memory, then the Enterprise memory setup skill.",
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
              subtitle="Export from ChatGPT, then import with the Enterprise memory setup skill"
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
                <EnterpriseMemorySkillImportBlock />
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
      subtitle: "Copy from personal Claude, then import with the Enterprise memory setup skill",
      body: (
        <div className="space-y-8">
          <WizardSubstep number={1} title="Understand the split">
            <p>
              Memory does not transfer automatically between your personal and Enterprise
              accounts — they are separate. Use the <strong>Enterprise memory setup</strong>{" "}
              skill in Enterprise after you export from Capabilities below.
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
            <EnterpriseMemorySkillImportBlock />
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
      if (atLast) setScreen("gaining");
      else setWizardStepIndex((i) => Math.min(i + 1, total - 1));
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
      if (atLast) setScreen("gaining");
      else setWizardStepIndex((i) => i + 1);
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

  const gainingScreen = (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 sm:text-3xl">
          Dig into features
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
          Your migration checklist is complete. Use the links below to explore what to try
          next — from core product ideas to Connectors, memory, and more powerful tools.
          Nothing here is required; choose what fits how you work.
        </p>
      </header>

      <TipCallout variant="gray">
        <strong className="font-medium">Documentation is there to help.</strong> If you
        start using <strong className="font-medium">Skills</strong>,{" "}
        <strong className="font-medium">Cowork</strong>, or{" "}
        <strong className="font-medium">Claude Code</strong> for real work, take extra
        care — Transcend is still finalizing acceptable-use rules for AI tools, and we
        will share clearer guidance when it is ready.
      </TipCallout>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GAINING_FEATURES.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:focus-visible:ring-offset-gray-950 ${
              path === "chatgpt"
                ? "hover:border-orange-200 focus-visible:ring-orange-500"
                : "hover:border-teal-200 focus-visible:ring-teal-500"
            }`}
          >
            {c.caution ? (
              <span className="mb-2 inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
                Proceed with caution
              </span>
            ) : null}
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {c.title}
            </h3>
            <p className="mt-2 flex-1 text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {c.body}
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-1 text-base font-medium ${accent.text}`}
            >
              {c.linkLabel}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </a>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-500">
          Video tutorials
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {path === "personal" ? (
            <>
              <VideoLink href={URL.videoIntroArtifacts} variant="teal">
                Watch: Intro to Artifacts
              </VideoLink>
              <VideoLink href={URL.videoSkills} variant="teal">
                Watch: Skills overview
              </VideoLink>
            </>
          ) : (
            <>
              <VideoLink href={URL.videoIntroArtifacts}>Watch: Intro to Artifacts</VideoLink>
              <VideoLink href={URL.videoSkills}>Watch: Skills overview</VideoLink>
            </>
          )}
        </div>
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
      <div className="space-y-8">
        <aside
          className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 sm:p-5"
          aria-labelledby="landing-invite-heading"
        >
          <h2
            id="landing-invite-heading"
            className="text-base font-semibold text-amber-950 dark:text-amber-50"
          >
            Before you begin
          </h2>
          <p className="mt-2 text-amber-900/95 dark:text-amber-100/95">
            Check your email (including spam or promotions). You should have a message
            inviting you to join <strong>Transcend&apos;s Claude Enterprise workspace</strong>.
            Open that email and <strong>accept the invitation</strong> — you need an active
            seat in the org before the steps in this guide will work.
          </p>
        </aside>
        <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-teal-50 p-6 shadow-sm dark:border-orange-900/40 dark:from-orange-950/30 dark:via-gray-950 dark:to-teal-950/20 sm:p-8">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-200/40 blur-2xl dark:bg-orange-500/10" aria-hidden />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-teal-200/30 blur-2xl dark:bg-teal-500/10" aria-hidden />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-orange-800 shadow-sm dark:bg-gray-900/90 dark:text-orange-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Transcend · Claude Enterprise
            </div>
            <header className="max-w-2xl">
              <h1 className="text-3xl font-medium leading-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                Let&apos;s get you set up on Claude Enterprise
              </h1>
              <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                We now have a Claude Enterprise account for the team. We think you are
                going to love Claude and everything it offers. Transcend will continue to
                support the enterprise ChatGPT account — and we built this guide so you
                can bring over your context from <strong>ChatGPT</strong> or a{" "}
                <strong>personal Claude</strong> account. The goal is simple: when you
                start working in Enterprise, it should feel like your LLM partner has not
                missed a step.
              </p>
            </header>
          </div>
        </div>
        {enterpriseBenefits}
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Where are you moving from?
          </h2>
          <p className="mt-1 text-base leading-relaxed text-gray-600 dark:text-gray-400">
            Choose the path that matches your setup — each one includes a short
            orientation, then step-by-step migration.
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
        <SiteHeader />
      </div>
      {showGlobalBack && (
        <FlowBackButton onClick={handleFlowBack} label={flowBackLabel} />
      )}
      <ScreenTransition transitionKey={transitionKey}>{main}</ScreenTransition>
    </div>
  );
}
