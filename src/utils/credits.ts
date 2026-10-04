import { Course, CourseSlot, TermPlan } from "../types";
import { slotCourseIds } from "./scheduleTerms";

function isDev(): boolean {
  return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
}

/**
 * Credits a single slot contributes to the curriculum total.
 *
 * For a plain slot (one course id) this is just that course's credits.
 * For a "choose one of" slot (array of alternatives), only one course is
 * ever actually taken, so we use the first resolvable alternative's credit
 * value as the slot's representative weight rather than summing every
 * alternative (which would over-count credits nobody actually earns twice).
 *
 * Assumption: alternatives within a choice slot carry equal credit weight
 * (true for every current pairing in courses.json/templates.json, e.g.
 * BUS 343 / BUEC 232 are both 3 credits). Revisit if a future choice slot
 * ever mixes differently-weighted courses.
 */
export function getSlotCredits(slot: CourseSlot, courseById: Record<string, Course>): number {
  const ids = slotCourseIds(slot);
  for (const id of ids) {
    const course = courseById[id];
    if (course) return course.credits ?? 0;
  }
  if (isDev()) {
    console.warn(`[credits] Slot [${ids.join(", ")}] has no resolvable course; counting as 0.`);
  }
  return 0;
}

/**
 * Credits a slot contributes to "completed" totals, given the set of
 * checked course ids. If more than one alternative within a choice slot is
 * checked, the slot still only counts once (using whichever checked
 * alternative comes first), so a student can't double-count a slot they
 * can only actually complete one course from.
 */
export function getSlotCompletedCredits(
  slot: CourseSlot,
  completedCourseIds: Set<string>,
  courseById: Record<string, Course>
): number {
  const ids = slotCourseIds(slot);
  const checkedId = ids.find((id) => completedCourseIds.has(id));
  if (!checkedId) return 0;
  return courseById[checkedId]?.credits ?? 0;
}

export function computeTotalCurriculumCredits(
  terms: TermPlan[],
  courseById: Record<string, Course>
): number {
  let total = 0;
  for (const term of terms) {
    for (const slot of term.courseIds) {
      total += getSlotCredits(slot, courseById);
    }
  }
  return total;
}

export function computeCompletedCredits(
  terms: TermPlan[],
  completedCourseIds: Set<string>,
  courseById: Record<string, Course>
): number {
  let total = 0;
  for (const term of terms) {
    for (const slot of term.courseIds) {
      total += getSlotCompletedCredits(slot, completedCourseIds, courseById);
    }
  }
  return total;
}

export const TERM_CREDIT_WARN_THRESHOLD = 18;

export function computeTermCredits(
  courseIds: string[],
  courseById: Record<string, Course>
): number {
  let total = 0;
  for (const id of courseIds) {
    total += courseById[id]?.credits ?? 0;
  }
  return total;
}