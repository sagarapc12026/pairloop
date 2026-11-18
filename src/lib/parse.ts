import * as chrono from "chrono-node";

export type Who = "me" | "partner" | "both";
export type ParsedTask = {
  title: string;
  dueAt: Date | null;
  hasTime: boolean;
  priority: "NORMAL" | "HIGH";
  isPrivate: boolean;
  who: Who | null;
  dateText: string | null;
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HIGH = [
  /\b(?:very\s+)?(?:urgent(?:ly)?|asap|a\.s\.a\.p\.?|high[-\s]priority|top[-\s]priority|priority|important|critical|emergency|don'?t\s+forget)\b/gi,
  /(^|\s)(?:!{1,3}|#urgent|#high|!high)(?=\s|$)/gi,
];
const PRIVATE = [/\b(?:private(?:ly)?|personal|just\s+for\s+me|only\s+me|secret)\b/gi, /(^|\s)#private(?=\s|$)/gi];

/**
 * Turns "remind Sam to pick up kids today at 3pm urgent" into a structured task.
 * Runs in the browser so dates use the user's own timezone.
 */
export function parseTask(input: string, opts: { partnerName?: string | null; now?: Date } = {}): ParsedTask {
  const now = opts.now ?? new Date();
  let text = ` ${input.replace(/\s+/g, " ").trim()} `;
  let priority: ParsedTask["priority"] = "NORMAL";
  let isPrivate = false;
  let who: Who | null = null;

  for (const re of HIGH) if (re.test(text)) { priority = "HIGH"; text = text.replace(re, " "); }
  for (const re of PRIVATE) if (re.test(text)) { isPrivate = true; text = text.replace(re, " "); }

  const p = opts.partnerName?.trim().split(/\s+/)[0];
  const P = p ? esc(p) : null;
  const rules: [RegExp, Who][] = [];
  if (P) {
    rules.push(
      [new RegExp(`(^|\\s)@${P}\\b`, "i"), "partner"],
      [new RegExp(`\\b(?:ask|tell|remind|get|have)\\s+${P}\\s+to\\b`, "i"), "partner"],
      [new RegExp(`^\\s*${P}\\s*[,:]?\\s+(?:(?:please|pls|can you|could you|you need to|needs to|should|to)\\s+)*`, "i"), "partner"],
      [new RegExp(`\\b(?:for|by|to)\\s+${P}\\b`, "i"), "partner"],
      [new RegExp(`\\b${P}\\s+(?:needs to|should|has to|will|must)\\b`, "i"), "partner"],
    );
  }
  rules.push(
    [/(^|\s)@(?:partner|them|bae|babe|hubby|wifey)\b/i, "partner"],
    [/(^|\s)@(?:both|us|we)\b/i, "both"],
    [/(^|\s)@me\b/i, "me"],
    [/\b(?:for\s+)?(?:both\s+of\s+us|us\s+both|the\s+two\s+of\s+us|together)\b/i, "both"],
    [/^\s*(?:we\s+(?:need|have|should|must)\s+to|we\s+should|let'?s)\s+/i, "both"],
    [/^\s*(?:remind\s+me\s+to|i\s+(?:need|have|want)\s+to|i\s+should|i'?ll|i\s+will|i\s+must)\s+/i, "me"],
    [/\bfor\s+me\b/i, "me"],
  );
  for (const [re, w] of rules) {
    if (re.test(text)) {
      who = who ?? w;
      text = text.replace(re, " ");
    }
  }
  if (isPrivate) who = "me";

  let dueAt: Date | null = null;
  let hasTime = false;
  let dateText: string | null = null;
  const results = chrono.parse(text, now, { forwardDate: true });
  if (results.length) {
    const r = results[0];
    dateText = r.text.trim();
    // "tonight", "this morning" etc. imply a real time of day.
    hasTime = r.start.isCertain("hour") || /\b(tonight|morning|afternoon|evening|noon|midnight|lunch)\b/i.test(r.text);
    const d = r.start.date();
    if (!hasTime) d.setHours(0, 0, 0, 0);
    dueAt = d;
    // Remove the date phrase plus a dangling preposition right before it.
    const before = text.slice(0, r.index).replace(/\b(?:on|at|by|before|due|for|this)\s*$/i, "");
    text = `${before} ${text.slice(r.index + r.text.length)}`;
  } else {
    // "by the 25th" → next occurrence of that day of the month.
    const m = text.match(/\b(?:on|by|before|due)?\s*the\s+(\d{1,2})(?:st|nd|rd|th)\b/i);
    const day = m ? Number(m[1]) : 0;
    if (m && day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d.getDate() !== day || d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        d.setMonth(now.getMonth() + 1, day);
      }
      dueAt = d;
      dateText = m[0].trim();
      text = text.replace(m[0], " ");
    }
  }

  let title = text
    .replace(/^\s*(?:please|pls|can you|could you|don'?t forget to|need to|to)\s+/i, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/^[\s,.:;\-–]+|[\s,:;\-–]+$/g, "")
    .trim();
  if (!title) title = input.trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, dueAt, hasTime, priority, isPrivate, who, dateText };
}
