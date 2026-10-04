import { useEffect, useMemo, useState } from "react";
import { courseById, courseEquivalencies, courses } from "../data";
import { useLiveCourseData } from "../hooks/useLiveCourseData";
import { Course, OfferedSection, SharedOutlineFields } from "../types";
import { buildCourseCodeIndex, isPlaceholderCourse, normalizeCourseCode } from "../utils/courseCodes";
import { parseEquivalents } from "../utils/parseEquivalents";

const courseIdByCode = buildCourseCodeIndex(courses);

interface LiveOutlineBlockProps {
  sharedOutline: SharedOutlineFields;
  sections: OfferedSection[];
  isHistorical?: boolean;
  historicalLabel?: string;
}

interface EquivalentBox {
  code: string;
  title?: string;
  fromOutline: boolean;
  fromSeed: boolean;
}

interface EquivalentBoxCardProps {
  box: EquivalentBox;
  isActive: boolean;
  onSelect: () => void;
}

function EquivalentBoxCard({ box, isActive, onSelect }: EquivalentBoxCardProps) {
  return (
    <div
      className={`equiv-box${isActive ? " active" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="equiv-box-header">
        <strong>{box.code}</strong>
        <span className="equiv-box-badges">
          {box.fromSeed && <span className="equiv-badge seed">Seed</span>}
          {box.fromOutline && <span className="equiv-badge outline">Outline</span>}
        </span>
      </div>
      {box.title && <span className="equiv-box-title">{box.title}</span>}
    </div>
  );
}

interface EquivalentSlideOverProps {
  courseCode: string;
  onClose: () => void;
}

function EquivalentSlideOver({ courseCode, onClose }: EquivalentSlideOverProps) {
  const liveData = useLiveCourseData(courseCode);
  const normalized = normalizeCourseCode(courseCode);
  const courseId =
    courseIdByCode.get(normalized) ?? courseIdByCode.get(normalized.replace(/\s+/g, ""));
  const seedCourse = courseId ? courseById[courseId] : undefined;

  return (
    <div className="equiv-slideover-backdrop" onClick={onClose}>
      <aside
        className="equiv-slideover"
        aria-label={`Details for ${courseCode}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="equiv-slideover-close"
          onClick={onClose}
          aria-label="Close equivalent course panel"
        >
          ×
        </button>

        <h3>{courseCode}</h3>
        {seedCourse && <p className="course-title-text">{seedCourse.title}</p>}
        {seedCourse && <p>Credits: {seedCourse.credits}</p>}

        <div className="live-section">
          {liveData.status === "loading" && (
            <p className="empty-note">Contacting SFU Outlines API…</p>
          )}
          {liveData.status === "not-offered" && (
            <p className="empty-note">
              No section found for the current or upcoming term, and no recent offering was found.
            </p>
          )}
          {liveData.status === "error" && (
            <p className="empty-note">Could not reach the SFU Outlines API right now.</p>
          )}
          {liveData.status === "success" && liveData.sharedOutline && (
            <LiveOutlineBlock
              sharedOutline={liveData.sharedOutline}
              sections={liveData.sections}
              isHistorical={liveData.isHistorical}
              historicalLabel={liveData.historicalLabel}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function LiveOutlineBlock({ sharedOutline, sections, isHistorical, historicalLabel }: LiveOutlineBlockProps) {
  const byTerm = sections.reduce<Record<string, OfferedSection[]>>((acc, sec) => {
    (acc[sec.termLabel] ??= []).push(sec);
    return acc;
  }, {});

  return (
    <details className="live-outline-details" open>
      <summary className="live-outline-summary">
        <span className="summary-title">Outline</span>
        {isHistorical && historicalLabel && (
          <span className="live-badge warn">Last offered: {historicalLabel}</span>
        )}
        {!isHistorical && sections.length > 0 && (
          <span className="live-badge success">AVAILABLE ({sections.length})</span>
        )}
      </summary>

      <div className="live-outline">
        {isHistorical && historicalLabel && (
          <p className="empty-note historical-note">
            Not offered in the current or upcoming term. Showing the most recent outline from{" "}
            {historicalLabel}.
          </p>
        )}

        {sharedOutline.description && (
          <div className="outline-field outline-description">
            <span className="meta-label">Description:</span>
            <p className="outline-description-text">{sharedOutline.description}</p>
          </div>
        )}

        {sharedOutline.prerequisites && (
          <div className="outline-field">
            <span className="meta-label">Prerequisites:</span> {sharedOutline.prerequisites}
          </div>
        )}

        {sharedOutline.corequisites && (
          <div className="outline-field">
            <span className="meta-label">Corequisites:</span> {sharedOutline.corequisites}
          </div>
        )}

        {Object.entries(byTerm).map(([termLabel, termSections]) => (
          <div key={termLabel} className="outline-term-group">
            <p className="outline-term-heading">{termLabel}</p>
            <ul className="inline-list">
              {termSections.map((sec, i) => {
                const instructorNames =
                  sec.instructors.length > 0
                    ? sec.instructors.map((inst) => inst.name).join(", ")
                    : "Instructor TBA";
                return (
                  <li key={i} className="outline-section-row">
                    <span className="section-tag">{sec.sectionName}</span>
                    <span className="section-campus">{sec.campus}</span>
                    <span className="section-instructor">{instructorNames}</span>
                    {sec.deliveryMethod && (
                      <span className="section-delivery">{sec.deliveryMethod}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {sharedOutline.grades && sharedOutline.grades.length > 0 && (
          <div className="outline-field">
            <span className="meta-label">Grading:</span>
            <ul className="inline-list">
              {sharedOutline.grades.map((g, i) => (
                <li key={i}>
                  {g.description}: {g.weight}%
                </li>
              ))}
            </ul>
          </div>
        )}

        {sharedOutline.educationalGoals && (
          <details className="outline-goals">
            <summary>Educational Goals</summary>
            <div className="outline-goals-content">
              {sharedOutline.educationalGoals
                .replace(/<[^>]+>/g, "")
                .split(/(?=\s*-[A-Z])/)
                .map((item) => item.trim())
                .filter(Boolean)
                .map((goal, index) => (
                  <p key={index} style={{ margin: "4px 0" }}>
                    {goal}
                  </p>
                ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

interface CourseDetailsPanelProps {
  selectedCourse: Course | null;
}

export function CourseDetailsPanel({ selectedCourse }: CourseDetailsPanelProps) {
  const [selectedEquivalentCode, setSelectedEquivalentCode] = useState<string | null>(null);
  const isPlaceholder = selectedCourse ? isPlaceholderCourse(selectedCourse) : false;
  const liveData = useLiveCourseData(isPlaceholder ? null : selectedCourse?.code ?? null);

  useEffect(() => {
    setSelectedEquivalentCode(null);
  }, [selectedCourse?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !selectedEquivalentCode) return;
      event.stopImmediatePropagation();
      setSelectedEquivalentCode(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEquivalentCode]);

  const equivalentBoxes = useMemo(() => {
    if (!selectedCourse) return [];

    const byCode = new Map<string, EquivalentBox>();

    for (const item of courseEquivalencies) {
      if (item.sourceCourseId !== selectedCourse.id) continue;
      const equivalentCourse = courseById[item.equivalentCourseId];
      if (!equivalentCourse) continue;

      const normalized = normalizeCourseCode(equivalentCourse.code);
      const existing = byCode.get(normalized);
      if (existing) {
        existing.fromSeed = true;
        if (!existing.title) existing.title = equivalentCourse.title;
      } else {
        byCode.set(normalized, {
          code: equivalentCourse.code,
          title: equivalentCourse.title,
          fromOutline: false,
          fromSeed: true,
        });
      }
    }

    const sharedOutline = liveData.sharedOutline;
    if (sharedOutline?.notes) {
      const parsed = parseEquivalents(sharedOutline.notes, selectedCourse.code);
      for (const item of parsed) {
        const normalized = normalizeCourseCode(item.code);
        const existing = byCode.get(normalized);
        const courseId =
          courseIdByCode.get(normalized) ?? courseIdByCode.get(normalized.replace(/\s+/g, ""));
        const knownCourse = courseId ? courseById[courseId] : undefined;

        if (existing) {
          existing.fromOutline = true;
          if (!existing.title && knownCourse) existing.title = knownCourse.title;
        } else {
          byCode.set(normalized, {
            code: item.code,
            title: knownCourse?.title,
            fromOutline: true,
            fromSeed: false,
          });
        }
      }
    }

    return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [selectedCourse, liveData.sharedOutline]);

  return (
    <aside className="details-panel">
      <h2>Course Details</h2>
      {selectedCourse ? (
        <>
          <h3>{selectedCourse.code}</h3>
          <p className="course-title-text">{selectedCourse.title}</p>
          <p>Credits: {selectedCourse.credits}</p>

          <div className="live-section">
            {isPlaceholder ? (
              <p className="empty-note">
                This is a planner slot (elective, CO-OP, or similar), not a catalog course, so no
                SFU outline is fetched.
              </p>
            ) : (
              <>
                {liveData.status === "loading" && (
                  <p className="empty-note">Contacting SFU Outlines API…</p>
                )}
                {liveData.status === "not-offered" && (
                  <p className="empty-note">
                    No section found for the current or upcoming term, and no recent offering was found.
                  </p>
                )}
                {liveData.status === "error" && (
                  <p className="empty-note">Could not reach the SFU Outlines API right now.</p>
                )}
                {liveData.status === "success" && liveData.sharedOutline && (
                  <LiveOutlineBlock
                    sharedOutline={liveData.sharedOutline}
                    sections={liveData.sections}
                    isHistorical={liveData.isHistorical}
                    historicalLabel={liveData.historicalLabel}
                  />
                )}
              </>
            )}
          </div>

          <h4>Equivalent Courses</h4>
          {equivalentBoxes.length ? (
            <div className="equiv-grid" role="list">
              {equivalentBoxes.map((box) => (
                <EquivalentBoxCard
                  key={box.code}
                  box={box}
                  isActive={selectedEquivalentCode === box.code}
                  onSelect={() =>
                    setSelectedEquivalentCode((current) =>
                      current === box.code ? null : box.code
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="empty-note">No equivalencies found.</p>
          )}
        </>
      ) : (
        <p className="empty-note">Click a course card to view details and equivalency information.</p>
      )}

      {selectedEquivalentCode && (
        <EquivalentSlideOver
          courseCode={selectedEquivalentCode}
          onClose={() => setSelectedEquivalentCode(null)}
        />
      )}
    </aside>
  );
}
