import { normalizeCourseCode } from "./courseCodes";

export interface ParsedEquivalent {
  code: string;
  dept: string;
  number: string;
}

const DEPT_STOPLIST = new Set([
  "OR",
  "AND",
  "OF",
  "TO",
  "FOR",
  "IN",
  "ON",
  "BY",
  "THE",
  "ANY",
  "ALL",
  "MAY",
  "NOT",
  "TAKE",
  "THIS",
  "THAT",
  "WITH",
  "CREDIT",
  "COURSE",
]);

const CONNECTORS = new Set([",", "or", "and", "/", "&"]);

const EQUIVALENCE_PATTERNS = [
  /equivalent\s+to/i,
  /may\s+not\s+take\b.*?\bfor\s+further\s+credit/i,
  /received\s+credit\s+for/i,
  /(?:students\s+)?with\s+credit\s+for/i,
  /duplicate\s+credit/i,
  /credit\s+overlap/i,
  /overlaps?\s+with/i,
  /not\s+eligible\s+for\s+credit/i,
  /students\s+who\s+have\s+(?:received\s+)?credit\s+for/i,
];

const EXCLUDE_PATTERNS = [
  /\bprerequisites?\b/i,
  /\bcorequisites?\b/i,
  /\bco-?\s*requisites?\b/i,
  /\brecommended\b/i,
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?:[.;]\s+|\n+)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isExcludedSentence(sentence: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(sentence));
}

function isEquivalenceSentence(sentence: string): boolean {
  return EQUIVALENCE_PATTERNS.some((pattern) => pattern.test(sentence));
}

function isValidDeptToken(token: string): boolean {
  return /^[A-Z]{2,5}$/.test(token) && !DEPT_STOPLIST.has(token);
}

function isCourseNumber(token: string): boolean {
  return /^\d{3}[A-Za-z]?$/.test(token);
}

function tokenizeSentence(sentence: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < sentence.length) {
    const rest = sentence.slice(index);

    if (/^\s+/.test(rest)) {
      index += rest.match(/^\s+/)![0].length;
      continue;
    }

    if (rest[0] === "." || rest[0] === ";") {
      tokens.push(rest[0]);
      index += 1;
      continue;
    }

    if (rest[0] === "," || rest[0] === "/" || rest[0] === "&") {
      tokens.push(rest[0]);
      index += 1;
      continue;
    }

    const wordMatch = rest.match(/^(or|and)\b/i);
    if (wordMatch) {
      tokens.push(wordMatch[1].toLowerCase());
      index += wordMatch[0].length;
      continue;
    }

    const numberMatch = rest.match(/^(\d{3}[A-Za-z]?)/);
    if (numberMatch) {
      tokens.push(numberMatch[1]);
      index += numberMatch[0].length;
      continue;
    }

    const deptMatch = rest.match(/^([A-Za-z]{2,5})(?=\b)/);
    if (deptMatch) {
      tokens.push(deptMatch[1]);
      index += deptMatch[0].length;
      continue;
    }

    index += 1;
  }

  return tokens;
}

function emitCode(
  dept: string,
  number: string,
  seen: Set<string>,
  results: ParsedEquivalent[]
): void {
  if (DEPT_STOPLIST.has(dept)) return;

  const normalizedDept = dept.toUpperCase();
  const normalizedNumber = number.toUpperCase();
  const code = normalizeCourseCode(`${normalizedDept} ${normalizedNumber}`);

  if (seen.has(code)) return;
  seen.add(code);
  results.push({
    code,
    dept: normalizedDept.toLowerCase(),
    number: normalizedNumber.toLowerCase(),
  });
}

function extractCourseCodesFromSentence(sentence: string): ParsedEquivalent[] {
  const tokens = tokenizeSentence(sentence);
  const results: ParsedEquivalent[] = [];
  const seen = new Set<string>();
  let lastDept: string | null = null;
  let prevWasConnector = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "." || token === ";") {
      lastDept = null;
      prevWasConnector = false;
      continue;
    }

    if (CONNECTORS.has(token)) {
      prevWasConnector = true;
      continue;
    }

    if (isValidDeptToken(token)) {
      const next = tokens[index + 1];
      if (next && isCourseNumber(next)) {
        lastDept = token;
        emitCode(token, next, seen, results);
        index += 1;
        prevWasConnector = false;
        continue;
      }
    }

    if (isCourseNumber(token) && prevWasConnector && lastDept) {
      emitCode(lastDept, token, seen, results);
      prevWasConnector = false;
      continue;
    }

    prevWasConnector = false;
  }

  return results;
}

/** Exported for unit tests. */
export function extractCourseCodes(text: string): ParsedEquivalent[] {
  const sentences = text.split(/[.;]+/).map((sentence) => sentence.trim()).filter(Boolean);
  const results: ParsedEquivalent[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    for (const item of extractCourseCodesFromSentence(sentence)) {
      if (seen.has(item.code)) continue;
      seen.add(item.code);
      results.push(item);
    }
  }

  return results;
}

/**
 * Parse equivalent / credit-overlap course codes from SFU outline notes.
 * Returns [] on empty input and never throws.
 */
export function parseEquivalents(
  notes: string | undefined | null,
  selfCode: string | undefined | null
): ParsedEquivalent[] {
  try {
    if (!notes?.trim()) return [];

    const selfNormalized = selfCode ? normalizeCourseCode(selfCode) : null;
    const relevantText = splitSentences(notes)
      .filter((sentence) => !isExcludedSentence(sentence))
      .filter((sentence) => isEquivalenceSentence(sentence))
      .join(". ");

    if (!relevantText.trim()) return [];

    const deduped = new Map<string, ParsedEquivalent>();
    for (const item of extractCourseCodes(relevantText)) {
      if (selfNormalized && item.code === selfNormalized) continue;
      deduped.set(item.code, item);
    }

    return Array.from(deduped.values());
  } catch {
    return [];
  }
}
