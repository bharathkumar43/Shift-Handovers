/**
 * Split ticket field text into tokens (newlines / commas / semicolons).
 * Extracts http(s) URLs from each line so pasted prose + URLs still parses cleanly.
 */

function splitCommaSemi(s: string, into: string[]) {
  for (const part of s.split(/[,;]/)) {
    const t = part.trim();
    if (t) into.push(t);
  }
}

export function splitTicketInput(raw: string): string[] {
  if (!raw.trim()) return [];

  const all: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const urlRe = /https?:\/\/[^\s,;]+/gi;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = urlRe.exec(trimmedLine)) !== null) {
      const before = trimmedLine.slice(cursor, match.index);
      splitCommaSemi(before, all);
      all.push(match[0]);
      cursor = match.index + match[0].length;
    }
    splitCommaSemi(trimmedLine.slice(cursor), all);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of all.map((x) => x.trim()).filter(Boolean)) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Return safe href only for real URLs — no external service integration. */
export function ticketTokenHref(token: string): string | null {
  let t = token.trim();
  if (!t) return null;
  if (/^www\./i.test(t)) t = `https://${t}`;
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}
