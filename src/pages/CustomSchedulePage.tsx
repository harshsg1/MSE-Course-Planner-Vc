import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { AppHeader } from "../components/AppHeader";
import { CourseDetailsPanel } from "../components/CourseDetailsPanel";
import { HighlightLegend } from "../components/HighlightLegend";
import { ProgressFooter } from "../components/ProgressFooter";
import { ScheduleSlotCard } from "../components/ScheduleSlotCard";
import { courseById, courses, pageTemplates } from "../data";
import { useCourseProgress } from "../hooks/useCourseProgress";
import { Course, VariantId } from "../types";
import { courseDepartment, isPlaceholderCourse } from "../utils/courseCodes";
import {
  computeCompletedCredits,
  computeTermCredits,
  computeTotalCurriculumCredits,
  TERM_CREDIT_WARN_THRESHOLD,
} from "../utils/credits";
import {
  canPlaceCourse,
  clearCustomPlanStorage,
  CourseDragPayload,
  createEmptyCustomPlan,
  CustomPlan,
  customPlanFromTemplate,
  loadCustomPlan,
  placeCourse,
  placedCourseIds,
  removeCourseFromPlan,
  saveCustomPlan,
} from "../utils/customPlan";
import { courseDependencyGraph } from "../utils/dependencyGraph";
import { groupTermsByYear } from "../utils/scheduleTerms";

const DRAG_MIME = "application/x-mse-course";

interface CustomSchedulePageProps {
  onOpenWelcome: () => void;
}

function parseDragPayload(event: DragEvent): CourseDragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CourseDragPayload;
    if (typeof parsed?.courseId === "string") {
      return { courseId: parsed.courseId, fromTermId: parsed.fromTermId ?? null };
    }
  } catch {
    if (courseById[raw]) return { courseId: raw, fromTermId: null };
  }
  return null;
}

export function CustomSchedulePage({ onOpenWelcome }: CustomSchedulePageProps) {
  const [plan, setPlan] = useState<CustomPlan>(loadCustomPlan);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [recursiveHighlights, setRecursiveHighlights] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [templateSeed, setTemplateSeed] = useState(`${pageTemplates[0]?.id ?? ""}:A`);
  const [dragging, setDragging] = useState<CourseDragPayload | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);

  const {
    completedCourseIds,
    transferCredits,
    toggleCourseCompleted,
    handleTransferCreditsChange,
    handleTransferCreditsKeyDown,
    handleResetProgress,
  } = useCourseProgress();

  useEffect(() => {
    saveCustomPlan(plan);
  }, [plan]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCourse(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const placed = useMemo(() => placedCourseIds(plan), [plan]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    for (const course of courses) {
      if (!isPlaceholderCourse(course)) depts.add(courseDepartment(course));
    }
    return [...depts].sort();
  }, []);

  const pickerCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (placed.has(course.id)) return false;
      if (query) {
        const haystack = `${course.code} ${course.title}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      const dept = courseDepartment(course);
      if (deptFilter === "all") return true;
      if (deptFilter === "Slots") return dept === "Slots";
      return dept === deptFilter;
    });
  }, [placed, search, deptFilter]);

  const pickerGroups = useMemo(() => {
    const slots: Course[] = [];
    const byDept = new Map<string, Course[]>();

    for (const course of pickerCourses) {
      if (isPlaceholderCourse(course)) {
        slots.push(course);
        continue;
      }
      const dept = courseDepartment(course);
      const list = byDept.get(dept) ?? [];
      list.push(course);
      byDept.set(dept, list);
    }

    const groups = [...byDept.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dept, items]) => ({
        id: dept,
        title: dept,
        courses: items.sort((a, b) => a.code.localeCompare(b.code)),
      }));

    if (slots.length && (deptFilter === "all" || deptFilter === "Slots")) {
      groups.push({
        id: "Slots",
        title: "Slots",
        courses: slots.sort((a, b) => a.code.localeCompare(b.code) || a.title.localeCompare(b.title)),
      });
    }

    return groups;
  }, [pickerCourses, deptFilter]);

  const termsByYear = useMemo(() => groupTermsByYear(plan.terms), [plan.terms]);

  const relationshipHighlights = useMemo(
    () => courseDependencyGraph.getHighlights(selectedCourse?.id ?? null, recursiveHighlights),
    [selectedCourse?.id, recursiveHighlights]
  );

  const totalCurriculumCredits = useMemo(
    () => computeTotalCurriculumCredits(plan.terms, courseById),
    [plan.terms]
  );

  const completedCredits = useMemo(
    () => computeCompletedCredits(plan.terms, completedCourseIds, courseById),
    [plan.terms, completedCourseIds]
  );

  const totalCompleted = completedCredits + transferCredits;
  const completionPercent =
    totalCurriculumCredits > 0 ? Math.round((totalCompleted / totalCurriculumCredits) * 100) : 0;

  const beginDrag = (event: DragEvent<HTMLDivElement>, courseId: string, fromTermId: string | null) => {
    const payload: CourseDragPayload = { courseId, fromTermId };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    setDragging(payload);
  };

  const endDrag = () => {
    setDragging(null);
    setHoverTarget(null);
  };

  const dropOnTerm = (event: DragEvent, destTermId: string) => {
    event.preventDefault();
    const payload = dragging ?? parseDragPayload(event);
    endDrag();
    if (!payload) return;
    setPlan((current) => placeCourse(current, payload.courseId, destTermId, payload.fromTermId));
  };

  const dropOnPicker = (event: DragEvent) => {
    event.preventDefault();
    const payload = dragging ?? parseDragPayload(event);
    endDrag();
    if (!payload?.fromTermId) return;
    setPlan((current) => removeCourseFromPlan(current, payload.courseId, payload.fromTermId ?? undefined));
  };

  const termDropState = (termId: string): "valid" | "invalid" | null => {
    if (!dragging) return null;
    return canPlaceCourse(plan, dragging.courseId, termId, dragging.fromTermId) ? "valid" : "invalid";
  };

  const handleStartFromTemplate = () => {
    const [templateId, variantId] = templateSeed.split(":");
    const template = pageTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const variant = (variantId as VariantId) || template.availableVariants[0] || "A";
    setPlan(customPlanFromTemplate(template, variant));
  };

  const handleResetSchedule = () => {
    const confirmed = window.confirm(
      "Reset your custom schedule to an empty Year 1–5 grid? This cannot be undone."
    );
    if (!confirmed) return;
    const empty = createEmptyCustomPlan();
    setPlan(empty);
    clearCustomPlanStorage();
    saveCustomPlan(empty);
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse((current) => (current?.id === course.id ? null : course));
  };

  const pickerDropActive = Boolean(dragging?.fromTermId);

  return (
    <div className="app-shell">
      <AppHeader
        selectedPageId="custom"
        extraControls={
          <>
            <select
              value={templateSeed}
              onChange={(event) => setTemplateSeed(event.target.value)}
              aria-label="Template to copy"
            >
              {pageTemplates.map((page) =>
                page.supportsVariants
                  ? page.availableVariants.map((option) => (
                      <option key={`${page.id}:${option}`} value={`${page.id}:${option}`}>
                        {page.title} — Option {option}
                      </option>
                    ))
                  : [
                      <option key={`${page.id}:A`} value={`${page.id}:A`}>
                        {page.title}
                      </option>,
                    ]
              )}
            </select>
            <button type="button" onClick={handleStartFromTemplate}>
              Start from template
            </button>
            <button type="button" className="reset-progress-btn" onClick={handleResetSchedule}>
              Reset
            </button>
          </>
        }
        onOpenWelcome={onOpenWelcome}
      />

      <main className="planner-layout custom-layout">
        <aside
          className={`picker-panel${pickerDropActive ? " drop-target-valid" : ""}${
            hoverTarget === "picker" && pickerDropActive ? " drop-hover" : ""
          }`}
          onDragOver={(event) => {
            if (!dragging?.fromTermId) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setHoverTarget("picker");
          }}
          onDragLeave={() => {
            if (hoverTarget === "picker") setHoverTarget(null);
          }}
          onDrop={dropOnPicker}
        >
          <h2>Course picker</h2>
          <p className="meta">Drag a course onto a term, or use Add to…</p>
          <input
            type="search"
            className="picker-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses"
            aria-label="Search courses"
          />
          <select
            value={deptFilter}
            onChange={(event) => setDeptFilter(event.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
            <option value="Slots">Slots</option>
          </select>

          <div className="picker-list">
            {pickerGroups.length === 0 && (
              <p className="empty-note">No matching unplaced courses.</p>
            )}
            {pickerGroups.map((group) => (
              <section key={group.id} className="picker-group">
                <h3>{group.title}</h3>
                <div className="course-list">
                  {group.courses.map((course) => (
                    <ScheduleSlotCard
                      key={course.id}
                      slot={course.id}
                      selectedCourseId={selectedCourse?.id ?? null}
                      highlightRoles={relationshipHighlights.roles}
                      completedCourseIds={completedCourseIds}
                      onToggleCompleted={toggleCourseCompleted}
                      onSelect={handleCourseSelect}
                      draggable
                      onCourseDragStart={(event, courseId) => beginDrag(event, courseId, null)}
                      onCourseDragEnd={endDrag}
                      moveOptions={plan.terms.map((term) => ({
                        id: term.id,
                        label: term.label,
                        disabled: !canPlaceCourse(plan, course.id, term.id, null),
                      }))}
                      onMoveToTerm={(courseId, termId) =>
                        setPlan((current) => placeCourse(current, courseId, termId, null))
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="grid-panel">
          <h2>Custom Schedule</h2>
          <p className="meta">
            Build a Year 1–5 plan. CO-OP must occupy a term by itself. Terms over{" "}
            {TERM_CREDIT_WARN_THRESHOLD} credits are flagged.
          </p>

          <HighlightLegend
            roles={relationshipHighlights.roles}
            recursiveHighlights={recursiveHighlights}
            onToggleRecursive={setRecursiveHighlights}
          />

          <div className="year-grid">
            {termsByYear.map((yearGroup) => (
              <section key={yearGroup.year} className="year-row">
                <h3 className="year-title">Year {yearGroup.year}</h3>
                <div className="term-grid">
                  {yearGroup.terms.map((term) => {
                    const credits = computeTermCredits(term.courseIds, courseById);
                    const over = credits > TERM_CREDIT_WARN_THRESHOLD;
                    const dropState = dragging ? termDropState(term.id) : null;
                    const dropClass =
                      dropState === "valid"
                        ? " drop-target-valid"
                        : dropState === "invalid"
                          ? " drop-target-invalid"
                          : "";
                    const hoverClass = hoverTarget === term.id ? " drop-hover" : "";

                    return (
                      <article
                        key={term.id}
                        className={`term-column${over ? " term-over-credits" : ""}${dropClass}${hoverClass}`}
                        onDragOver={(event) => {
                          if (!dragging) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = canPlaceCourse(
                            plan,
                            dragging.courseId,
                            term.id,
                            dragging.fromTermId
                          )
                            ? "move"
                            : "none";
                          setHoverTarget(term.id);
                        }}
                        onDragLeave={() => {
                          if (hoverTarget === term.id) setHoverTarget(null);
                        }}
                        onDrop={(event) => dropOnTerm(event, term.id)}
                      >
                        <h4>
                          {term.label.split("-")[1]?.trim() ?? term.label}
                          <span className={`term-credits${over ? " warn" : ""}`}>
                            {credits} cr
                            {over ? " — over 18" : ""}
                          </span>
                        </h4>
                        <div className="course-list">
                          {term.courseIds.map((courseId) => (
                            <ScheduleSlotCard
                              key={courseId}
                              slot={courseId}
                              selectedCourseId={selectedCourse?.id ?? null}
                              highlightRoles={relationshipHighlights.roles}
                              completedCourseIds={completedCourseIds}
                              onToggleCompleted={toggleCourseCompleted}
                              onSelect={handleCourseSelect}
                              draggable
                              onCourseDragStart={(event, id) => beginDrag(event, id, term.id)}
                              onCourseDragEnd={endDrag}
                              currentTermId={term.id}
                              moveOptions={plan.terms
                                .filter((option) => option.id !== term.id)
                                .map((option) => ({
                                  id: option.id,
                                  label: option.label,
                                  disabled: !canPlaceCourse(plan, courseId, option.id, term.id),
                                }))}
                              onMoveToTerm={(id, destTermId) =>
                                setPlan((current) => placeCourse(current, id, destTermId, term.id))
                              }
                              onRemoveFromPlan={(id) =>
                                setPlan((current) => removeCourseFromPlan(current, id, term.id))
                              }
                            />
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>

        <CourseDetailsPanel selectedCourse={selectedCourse} />
      </main>

      <ProgressFooter
        completedCredits={completedCredits}
        transferCredits={transferCredits}
        totalCompleted={totalCompleted}
        totalCurriculumCredits={totalCurriculumCredits}
        completionPercent={completionPercent}
        onTransferCreditsChange={handleTransferCreditsChange}
        onTransferCreditsKeyDown={handleTransferCreditsKeyDown}
        onResetProgress={handleResetProgress}
      />
    </div>
  );
}
