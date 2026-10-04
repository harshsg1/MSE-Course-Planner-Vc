import { CourseSlot, PageTemplate, TermPlan, VariantId } from "../types";

/**
 * Resolves the recommended schedule (list of TermPlans) that should be
 * rendered for a given template + variant.
 *
 * This is the ONLY place that decides between `terms` and `termsByVariant`.
 * Before this helper existed, `App.tsx` fell back from `termsByVariant` to
 * `terms`, which meant variant-supporting templates carried a redundant
 * top-level `terms` copy that had to be hand-kept in sync with variant "A" —
 * a common source of schedules quietly drifting out of date. Templates that
 * support variants should simply omit `terms` in templates.json and define
 * every option under `termsByVariant` instead.
 */
export function getActiveTerms(template: PageTemplate, variant: VariantId): TermPlan[] {
  if (template.supportsVariants && template.termsByVariant) {
    return (
      template.termsByVariant[variant] ??
      template.termsByVariant[template.availableVariants[0]] ??
      template.terms ??
      []
    );
  }

  return template.terms ?? [];
}

/** Normalizes a CourseSlot to an array of course ids, whether it's a single course or a choice group. */
export function slotCourseIds(slot: CourseSlot): string[] {
  return Array.isArray(slot) ? slot : [slot];
}

/** A slot is a "choose one of" group when it lists more than one course id. */
export function isChoiceGroup(slot: CourseSlot): boolean {
  return Array.isArray(slot) && slot.length > 1;
}

export function groupTermsByYear<T extends { label: string }>(
  terms: T[]
): { year: number; terms: T[] }[] {
  const grouped = new Map<number, T[]>();

  for (const term of terms) {
    const match = term.label.match(/Year\s+(\d+)/i);
    const yearNumber = match ? Number(match[1]) : 0;
    const yearTerms = grouped.get(yearNumber) ?? [];
    yearTerms.push(term);
    grouped.set(yearNumber, yearTerms);
  }

  const termOrder = (label: string): number => {
    if (label.includes("Fall")) return 0;
    if (label.includes("Spring")) return 1;
    if (label.includes("Summer")) return 2;
    return 3;
  };

  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearTerms]) => ({
      year,
      terms: [...yearTerms].sort((a, b) => termOrder(a.label) - termOrder(b.label)),
    }));
}
