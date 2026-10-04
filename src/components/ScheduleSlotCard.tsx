import { Fragment, useRef } from "react";
import type { DragEvent } from "react";
import { courseById } from "../data";
import { Course, CourseHighlightRole, CourseSlot } from "../types";
import { slotCourseIds } from "../utils/scheduleTerms";

export function getCourseCardClassName(
  courseId: string,
  roles: Map<string, CourseHighlightRole>
): string {
  const role = roles.get(courseId);
  return role ? `course-card role-${role}` : "course-card";
}

export interface TermMoveOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ScheduleSlotCardProps {
  slot: CourseSlot;
  selectedCourseId: string | null;
  highlightRoles: Map<string, CourseHighlightRole>;
  completedCourseIds: Set<string>;
  onToggleCompleted: (courseId: string) => void;
  onSelect: (course: Course) => void;
  draggable?: boolean;
  onCourseDragStart?: (event: DragEvent<HTMLDivElement>, courseId: string) => void;
  onCourseDragEnd?: () => void;
  moveOptions?: TermMoveOption[];
  currentTermId?: string;
  onMoveToTerm?: (courseId: string, termId: string) => void;
  onRemoveFromPlan?: (courseId: string) => void;
}

export function ScheduleSlotCard({
  slot,
  selectedCourseId,
  highlightRoles,
  completedCourseIds,
  onToggleCompleted,
  onSelect,
  draggable = false,
  onCourseDragStart,
  onCourseDragEnd,
  moveOptions,
  currentTermId,
  onMoveToTerm,
  onRemoveFromPlan,
}: ScheduleSlotCardProps) {
  const courseIds = slotCourseIds(slot);
  const isChoiceGroup = courseIds.length > 1;
  const suppressClickRef = useRef(false);

  return (
    <div
      className={isChoiceGroup ? "course-slot choice-slot" : "course-slot"}
      role={isChoiceGroup ? "group" : undefined}
      aria-label={isChoiceGroup ? "Choose one of the following courses" : undefined}
    >
      {courseIds.map((courseId, index) => {
        const course = courseById[courseId];
        const isCompleted = completedCourseIds.has(courseId);
        return (
          <Fragment key={courseId}>
            {index > 0 && (
              <span className="choice-divider" aria-hidden="true">
                OR
              </span>
            )}
            {course ? (
              <div
                className={`${getCourseCardClassName(course.id, highlightRoles)}${
                  isCompleted ? " completed" : ""
                }${draggable ? " is-draggable" : ""}`}
                role="button"
                tabIndex={0}
                draggable={draggable}
                aria-pressed={selectedCourseId === course.id}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  onSelect(course);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(course);
                  }
                }}
                onDragStart={
                  draggable && onCourseDragStart
                    ? (event) => {
                        suppressClickRef.current = true;
                        onCourseDragStart(event, course.id);
                      }
                    : undefined
                }
                onDragEnd={() => {
                  onCourseDragEnd?.();
                  window.setTimeout(() => {
                    suppressClickRef.current = false;
                  }, 0);
                }}
              >
                <label
                  className="course-checkbox"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    draggable={false}
                    checked={isCompleted}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleCompleted(course.id)}
                    aria-label={`Mark ${course.code} as completed`}
                  />
                </label>
                <strong>{course.code}</strong>
                <span>{course.title}</span>
                {moveOptions && onMoveToTerm && (
                  <label
                    className="course-move-control"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <span className="visually-hidden">
                      {currentTermId ? `Move ${course.code}` : `Add ${course.code}`}
                    </span>
                    <select
                      value=""
                      draggable={false}
                      aria-label={currentTermId ? `Move ${course.code} to another term` : `Add ${course.code} to a term`}
                      onChange={(event) => {
                        const value = event.target.value;
                        event.target.value = "";
                        if (!value) return;
                        if (value === "__remove") {
                          onRemoveFromPlan?.(course.id);
                          return;
                        }
                        onMoveToTerm(course.id, value);
                      }}
                    >
                      <option value="">{currentTermId ? "Move to…" : "Add to…"}</option>
                      {moveOptions.map((option) => (
                        <option key={option.id} value={option.id} disabled={option.disabled}>
                          {option.label}
                        </option>
                      ))}
                      {currentTermId && onRemoveFromPlan && (
                        <option value="__remove">Remove from plan</option>
                      )}
                    </select>
                  </label>
                )}
              </div>
            ) : (
              <div className="course-card">
                <strong>Unknown Course</strong>
                <span>{courseId}</span>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
