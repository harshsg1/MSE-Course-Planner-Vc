import { courseById } from "../data";
import { Course, CourseSlot, PageTemplate, VariantId } from "../types";
import { getActiveTerms, slotCourseIds } from "./scheduleTerms";

export const CUSTOM_PLAN_STORAGE_KEY = "mse-planner:custom-plan";
export const CUSTOM_PLAN_SCHEMA_VERSION = 1 as const;

export interface CustomTerm {
  id: string;
  label: string;
  courseIds: string[];
}

export interface CustomPlan {
  schemaVersion: typeof CUSTOM_PLAN_SCHEMA_VERSION;
  terms: CustomTerm[];
}

export interface CourseDragPayload {
  courseId: string;
  fromTermId: string | null;
}

const SEASONS = [
  { key: "f", name: "Fall" },
  { key: "s", name: "Spring" },
  { key: "u", name: "Summer" },
] as const;

function seasonFromLabel(label: string): string | null {
  if (/\bFall\b/i.test(label)) return "Fall";
  if (/\bSpring\b/i.test(label)) return "Spring";
  if (/\bSummer\b/i.test(label)) return "Summer";
  return null;
}

function yearFromLabel(label: string): number | null {
  const match = label.match(/Year\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function createEmptyCustomPlan(): CustomPlan {
  const terms: CustomTerm[] = [];
  for (let year = 1; year <= 5; year += 1) {
    for (const season of SEASONS) {
      terms.push({
        id: `custom_y${year}_${season.key}`,
        label: `Year ${year} - ${season.name}`,
        courseIds: [],
      });
    }
  }
  return { schemaVersion: CUSTOM_PLAN_SCHEMA_VERSION, terms };
}

export function cloneCustomPlan(plan: CustomPlan): CustomPlan {
  return {
    schemaVersion: CUSTOM_PLAN_SCHEMA_VERSION,
    terms: plan.terms.map((term) => ({
      id: term.id,
      label: term.label,
      courseIds: [...term.courseIds],
    })),
  };
}

export function isCoopCourse(course: Course | undefined): boolean {
  if (!course) return false;
  return course.code.trim().toUpperCase() === "CO-OP";
}

export function isCoopCourseId(courseId: string): boolean {
  return isCoopCourse(courseById[courseId]);
}

export function placedCourseIds(plan: CustomPlan): Set<string> {
  const ids = new Set<string>();
  for (const term of plan.terms) {
    for (const id of term.courseIds) ids.add(id);
  }
  return ids;
}

function flattenSlots(slots: CourseSlot[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    const first = slotCourseIds(slot)[0];
    if (!first || seen.has(first) || !courseById[first]) continue;
    seen.add(first);
    ids.push(first);
  }
  return ids;
}

/** Copies a template/variant onto a Year 1–5 F/S/U grid. Never mutates the template. */
export function customPlanFromTemplate(template: PageTemplate, variant: VariantId): CustomPlan {
  const plan = createEmptyCustomPlan();
  const sourceTerms = getActiveTerms(template, variant);

  for (const source of sourceTerms) {
    const year = yearFromLabel(source.label);
    const season = seasonFromLabel(source.label);
    if (year === null || !season) continue;

    const dest = plan.terms.find((term) => term.label === `Year ${year} - ${season}`);
    if (!dest) continue;

    dest.courseIds = flattenSlots(source.courseIds);
  }

  return plan;
}

function isCustomTerm(value: unknown): value is CustomTerm {
  if (!value || typeof value !== "object") return false;
  const term = value as CustomTerm;
  return (
    typeof term.id === "string" &&
    typeof term.label === "string" &&
    Array.isArray(term.courseIds) &&
    term.courseIds.every((id) => typeof id === "string")
  );
}

function isCustomPlan(value: unknown): value is CustomPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as CustomPlan;
  return plan.schemaVersion === CUSTOM_PLAN_SCHEMA_VERSION && Array.isArray(plan.terms) && plan.terms.every(isCustomTerm);
}

export function loadCustomPlan(): CustomPlan {
  const empty = createEmptyCustomPlan();
  try {
    const raw = localStorage.getItem(CUSTOM_PLAN_STORAGE_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!isCustomPlan(parsed)) return empty;

    const byId = new Map(parsed.terms.map((term) => [term.id, term]));
    return {
      schemaVersion: CUSTOM_PLAN_SCHEMA_VERSION,
      terms: empty.terms.map((slot) => {
        const stored = byId.get(slot.id);
        const courseIds = stored
          ? [...new Set(stored.courseIds.filter((id) => Boolean(courseById[id])))]
          : [];
        return { ...slot, courseIds };
      }),
    };
  } catch {
    return empty;
  }
}

export function saveCustomPlan(plan: CustomPlan): void {
  try {
    localStorage.setItem(CUSTOM_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // private browsing / quota
  }
}

export function clearCustomPlanStorage(): void {
  try {
    localStorage.removeItem(CUSTOM_PLAN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function canPlaceCourse(
  plan: CustomPlan,
  courseId: string,
  destTermId: string,
  fromTermId: string | null
): boolean {
  if (!courseById[courseId]) return false;
  const dest = plan.terms.find((term) => term.id === destTermId);
  if (!dest) return false;
  if (fromTermId === destTermId) return false;

  const destIds = dest.courseIds.filter((id) => !(fromTermId === dest.id && id === courseId));
  if (destIds.includes(courseId)) return false;

  const addingCoop = isCoopCourseId(courseId);
  const destHasOtherCoop = destIds.some((id) => isCoopCourseId(id));

  if (addingCoop) return destIds.length === 0;
  if (destHasOtherCoop) return false;
  return true;
}

export function placeCourse(
  plan: CustomPlan,
  courseId: string,
  destTermId: string,
  fromTermId: string | null
): CustomPlan {
  if (!canPlaceCourse(plan, courseId, destTermId, fromTermId)) return plan;

  const next = cloneCustomPlan(plan);
  if (fromTermId) {
    const source = next.terms.find((term) => term.id === fromTermId);
    if (source) source.courseIds = source.courseIds.filter((id) => id !== courseId);
  }

  const dest = next.terms.find((term) => term.id === destTermId);
  if (dest && !dest.courseIds.includes(courseId)) dest.courseIds.push(courseId);
  return next;
}

export function removeCourseFromPlan(plan: CustomPlan, courseId: string, fromTermId?: string): CustomPlan {
  const next = cloneCustomPlan(plan);
  for (const term of next.terms) {
    if (fromTermId && term.id !== fromTermId) continue;
    term.courseIds = term.courseIds.filter((id) => id !== courseId);
  }
  return next;
}
