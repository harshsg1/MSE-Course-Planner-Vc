import {
  HistoricalLookupResult,
  OfferedSection,
  SharedOutlineFields,
  TermName,
  TermTuple,
} from "./types";

const SFU_BASE = "https://www.sfu.ca/bin/wcm/course-outlines";

const TERM_ORDER: TermName[] = ["spring", "summer", "fall"];

const TERM_TO_SFU_CODE: Record<TermName, string> = {
  spring: "1",
  summer: "4",
  fall: "7",
};

interface SfuSection {
  text: string;
  value: string;
  title: string;
  classType: "e" | "n";
  sectionCode: string;
  associatedClass: string;
}

interface SfuScheduleItem {
  campus: string;
  isExam: boolean;
}

interface SfuInstructor {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCode: string;
  profileUrl?: string;
}

interface SfuOutline {
  description: string;
  prerequisites: string;
  corequisites: string;
  notes?: string;
  term: string;
  deliveryMethod: string;
  educationalGoals?: string;
  instructor?: SfuInstructor[];
  courseSchedule?: SfuScheduleItem[];
  grades?: { description: string; weight: string }[];
}

export function getCurrentAcademicTerm(): TermTuple {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month <= 4) return { year, term: "spring" };
  if (month <= 8) return { year, term: "summer" };
  return { year, term: "fall" };
}

export function getPastTerms(count: number): TermTuple[] {
  const terms: TermTuple[] = [];
  let { year, term } = getCurrentAcademicTerm();

  for (let i = 0; i < count; i++) {
    let idx = TERM_ORDER.indexOf(term) - 1;
    if (idx < 0) {
      idx = TERM_ORDER.length - 1;
      year -= 1;
    }
    term = TERM_ORDER[idx];
    terms.push({ year, term });
  }

  return terms;
}

export function termTupleToSlug({ year, term }: TermTuple): string {
  const yy = year - 2000;
  return `1${String(yy).padStart(2, "0")}${TERM_TO_SFU_CODE[term]}`;
}

export function termTupleToLabel({ year, term }: TermTuple): string {
  const sem = { spring: "Spring", summer: "Summer", fall: "Fall" }[term];
  return `${sem} ${year}`;
}

export function termCodeToLabel(termCode: string): string {
  const match = termCode.match(/^1(\d{2})(\d)$/);
  if (!match) return termCode;
  const year = 2000 + parseInt(match[1], 10);
  const semMap: Record<string, string> = { "1": "Spring", "4": "Summer", "7": "Fall" };
  const sem = semMap[match[2]] ?? `Term ${match[2]}`;
  return `${sem} ${year}`;
}

export async function fetchSectionsForTerm(
  termSlug: string,
  dept: string,
  num: string
): Promise<{ sections: SfuSection[]; termSlug: string } | null> {
  try {
    const res = await fetch(`${SFU_BASE}?${termSlug}/${dept}/${num}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { sections: data as SfuSection[], termSlug };
  } catch {
    return null;
  }
}

function enrollmentSections(result: { sections: SfuSection[]; termSlug: string }) {
  const hasLec = result.sections.some((s) => s.classType === "e" && s.sectionCode === "LEC");
  return result.sections.filter(
    (s) => s.classType === "e" && (hasLec ? s.sectionCode === "LEC" : true)
  );
}

function campusFromOutline(outline: SfuOutline): string {
  const item = outline.courseSchedule?.find((s) => !s.isExam);
  return item?.campus ?? "Unknown";
}

function sharedOutlineFrom(outline: SfuOutline): SharedOutlineFields {
  return {
    description: outline.description,
    prerequisites: outline.prerequisites,
    corequisites: outline.corequisites,
    notes: outline.notes,
    educationalGoals: outline.educationalGoals,
    grades: outline.grades,
  };
}

async function fetchSectionOutlines(
  dept: string,
  number: string,
  toFetch: { termSlug: string; section: SfuSection }[]
): Promise<{ sections: OfferedSection[]; sharedOutline: SharedOutlineFields } | null> {
  if (toFetch.length === 0) return null;

  const outlineResults = await Promise.all(
    toFetch.map(async ({ termSlug, section }) => {
      try {
        const res = await fetch(`${SFU_BASE}?${termSlug}/${dept}/${number}/${section.value}`);
        if (!res.ok) return null;
        const raw = await res.json();
        const outline: SfuOutline = raw.info ?? raw.courseInfo ?? raw;
        if (!outline.courseSchedule && raw.courseSchedule) outline.courseSchedule = raw.courseSchedule;
        if (!outline.instructor && raw.instructor) outline.instructor = raw.instructor;
        if (!outline.grades && raw.grades) outline.grades = raw.grades;
        if (!outline.notes && raw.info?.notes) outline.notes = raw.info.notes;
        if (!outline.notes && raw.notes) outline.notes = raw.notes;
        return { outline, sectionName: section.value };
      } catch {
        return null;
      }
    })
  );

  const validResults = outlineResults.filter(
    (r): r is { outline: SfuOutline; sectionName: string } => r !== null
  );
  if (validResults.length === 0) return null;

  return {
    sharedOutline: sharedOutlineFrom(validResults[0].outline),
    sections: validResults.map(({ outline, sectionName }) => ({
      sectionName,
      termLabel: termCodeToLabel(outline.term),
      campus: campusFromOutline(outline),
      instructors: outline.instructor ?? [],
      deliveryMethod: outline.deliveryMethod,
    })),
  };
}

/** Resolve enrollment sections + outlines across one or more term slug results. */
export async function resolveOfferedSections(
  dept: string,
  number: string,
  termResults: ({ sections: SfuSection[]; termSlug: string } | null)[]
): Promise<{ sections: OfferedSection[]; sharedOutline: SharedOutlineFields } | null> {
  const toFetch: { termSlug: string; section: SfuSection }[] = [];
  const seenValues = new Set<string>();

  for (const result of termResults) {
    if (!result) continue;
    for (const section of enrollmentSections(result)) {
      if (!seenValues.has(section.value)) {
        seenValues.add(section.value);
        toFetch.push({ termSlug: result.termSlug, section });
      }
    }
  }

  return fetchSectionOutlines(dept, number, toFetch);
}

async function fetchOfferedSectionsForTerm(
  termSlug: string,
  dept: string,
  number: string,
  sectionResult: { sections: SfuSection[]; termSlug: string }
): Promise<{ sections: OfferedSection[]; sharedOutline: SharedOutlineFields } | null> {
  const candidates = enrollmentSections(sectionResult);
  if (candidates.length === 0) return null;

  return fetchSectionOutlines(
    dept,
    number,
    candidates.map((section) => ({ termSlug, section }))
  );
}

/**
 * Walks backward through past terms (newest first) looking for the most recent
 * term a course was actually offered in. Stops at the first match.
 */
export async function findHistoricalOffering(
  dept: string,
  courseNumber: string,
  maxTermsBack = 6
): Promise<HistoricalLookupResult | null> {
  const candidateTerms = getPastTerms(maxTermsBack);

  for (const tuple of candidateTerms) {
    try {
      const termSlug = termTupleToSlug(tuple);
      const sectionResult = await fetchSectionsForTerm(termSlug, dept, courseNumber);
      if (!sectionResult || sectionResult.sections.length === 0) continue;

      const offered = await fetchOfferedSectionsForTerm(termSlug, dept, courseNumber, sectionResult);
      if (!offered || offered.sections.length === 0) continue;

      return {
        year: tuple.year,
        term: tuple.term,
        sections: offered.sections,
        sharedOutline: offered.sharedOutline,
        isHistorical: true,
      };
    } catch (err) {
      console.warn(
        `[findHistoricalOffering] Lookup failed for ${dept} ${courseNumber} in ${tuple.year}/${tuple.term}:`,
        err
      );
    }
  }

  return null;
}
