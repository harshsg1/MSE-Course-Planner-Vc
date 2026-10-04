export type CurriculumType = "pre-2024" | "post-2024" | "double-degree";
export type PlanLength = "4-year" | "5-year";
export type VariantId = "A" | "B" | "C";
export type TermName = "spring" | "summer" | "fall";

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  description: string;
}

export type PrerequisiteExpression =
  | { type: "course"; courseId: string }
  | { type: "and"; items: PrerequisiteExpression[] }
  | { type: "or"; items: PrerequisiteExpression[] };

export type CourseHighlightRole = "selected" | "prerequisite" | "corequisite" | "dependent";

export interface CourseRelationshipHighlights {
  roles: Map<string, CourseHighlightRole>;
}

export type ThemeMode = "light" | "dark";

/**
 * A single slot in a term's course list.
 *
 * - `string` — a single required course, referenced by its `Course.id`.
 * - `string[]` — a "choose one of" group. All ids in the array are
 *   rendered side-by-side on the same row, and the student may pick
 *   any one of them to satisfy that slot (e.g. ["bus343", "buec232"]
 *   renders as "BUS 343 OR BUEC 232").
 *
 * This keeps the recommended-schedule config purely data-driven: adding,
 * removing, or grouping courses only requires editing `templates.json`,
 * never the React components that render it.
 */
export type CourseSlot = string | string[];

export interface TermPlan {
  id: string;
  label: string;
  courseIds: CourseSlot[];
}

export interface PageTemplate {
  id: string;
  title: string;
  curriculum: CurriculumType;
  planLength: PlanLength;
  supportsVariants: boolean;
  availableVariants: VariantId[];
  /**
   * Per-variant recommended schedules (5-year plans with Option A/B/C
   * co-op placements). When a template supports variants, this is the
   * single source of truth for its terms — see `terms` below.
   */
  termsByVariant?: Partial<Record<VariantId, TermPlan[]>>;
  /**
   * The recommended schedule for templates that don't support variants
   * (4-year plans, double-degree). Templates that DO support variants
   * should omit this and rely solely on `termsByVariant`, so there is
   * never a second copy of the same schedule to keep in sync — use
   * `getActiveTerms()` from `utils/scheduleTerms` to read the right one.
   */
  terms?: TermPlan[];
}

export interface CourseEquivalency {
  sourceCourseId: string;
  equivalentCourseId: string;
  faculty: string;
  equivalencyType: "full" | "partial" | "elective-only";
  evidenceSource: string;
  expiry: string | null;
}

export interface TermTuple {
  year: number;
  term: TermName;
}

export interface OfferedSectionInstructor {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCode: string;
  profileUrl?: string;
}

/** One fetched section's worth of offering data shown in the outline panel. */
export interface OfferedSection {
  sectionName: string;
  termLabel: string;
  campus: string;
  instructors: OfferedSectionInstructor[];
  deliveryMethod: string;
}

export interface SharedOutlineFields {
  description: string;
  prerequisites: string;
  corequisites: string;
  notes?: string;
  educationalGoals?: string;
  grades?: { description: string; weight: string }[];
}

export interface HistoricalLookupResult {
  year: number;
  term: TermName;
  sections: OfferedSection[];
  sharedOutline: SharedOutlineFields;
  isHistorical: true;
}
