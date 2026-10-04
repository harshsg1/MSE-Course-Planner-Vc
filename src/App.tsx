import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { CourseDetailsPanel } from "./components/CourseDetailsPanel";
import { HighlightLegend } from "./components/HighlightLegend";
import { ProgressFooter } from "./components/ProgressFooter";
import { ScheduleSlotCard } from "./components/ScheduleSlotCard";
import { WelcomeModal } from "./components/WelcomeModal";
import { courseById, pageTemplates } from "./data";
import { useCourseProgress } from "./hooks/useCourseProgress";
import { useWelcomeModal } from "./hooks/useWelcomeModal";
import { CustomSchedulePage } from "./pages/CustomSchedulePage";
import { Course, TermPlan, VariantId } from "./types";
import {
  computeCompletedCredits,
  computeTotalCurriculumCredits,
} from "./utils/credits";
import { courseDependencyGraph } from "./utils/dependencyGraph";
import { formatCurriculum } from "./utils/formatCurriculum";
import { getActiveTerms, groupTermsByYear } from "./utils/scheduleTerms";

function App() {
  const { isOpen: isWelcomeOpen, open: openWelcome, dismiss: dismissWelcome } = useWelcomeModal();

  return (
    <>
      <WelcomeModal isOpen={isWelcomeOpen} onDismiss={dismissWelcome} />
      <Routes>
        <Route path="/" element={<Navigate to="/planner/post-2024-4-year" replace />} />
        <Route path="/planner/:pageId" element={<PlannerPage onOpenWelcome={openWelcome} />} />
        <Route path="/custom" element={<CustomSchedulePage onOpenWelcome={openWelcome} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

interface PlannerPageProps {
  onOpenWelcome: () => void;
}

function PlannerPage({ onOpenWelcome }: PlannerPageProps) {
  const { pageId } = useParams<{ pageId: string }>();
  const template = pageTemplates.find((p) => p.id === pageId) ?? pageTemplates[0];
  const [variant, setVariant] = useState<VariantId>("A" as VariantId);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [recursiveHighlights, setRecursiveHighlights] = useState(true);

  const {
    completedCourseIds,
    transferCredits,
    toggleCourseCompleted,
    handleTransferCreditsChange,
    handleTransferCreditsKeyDown,
    handleResetProgress,
  } = useCourseProgress();

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse((current) => (current?.id === course.id ? null : course));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCourse(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const relationshipHighlights = useMemo(
    () => courseDependencyGraph.getHighlights(selectedCourse?.id ?? null, recursiveHighlights),
    [selectedCourse?.id, recursiveHighlights]
  );

  const terms = useMemo<TermPlan[]>(() => getActiveTerms(template, variant), [template, variant]);
  const termsByYear = useMemo(() => groupTermsByYear(terms), [terms]);

  const totalCurriculumCredits = useMemo(
    () => computeTotalCurriculumCredits(terms, courseById),
    [terms]
  );

  const completedCredits = useMemo(
    () => computeCompletedCredits(terms, completedCourseIds, courseById),
    [terms, completedCourseIds]
  );

  const totalCompleted = completedCredits + transferCredits;
  const completionPercent =
    totalCurriculumCredits > 0 ? Math.round((totalCompleted / totalCurriculumCredits) * 100) : 0;

  return (
    <div className="app-shell">
      <AppHeader
        selectedPageId={template.id}
        template={template}
        variant={variant}
        onVariantChange={setVariant}
        onOpenWelcome={onOpenWelcome}
      />

      <main className="planner-layout">
        <section className="grid-panel">
          <h2>{template.title}</h2>
          <p className="meta">
            Curriculum: <b>{formatCurriculum(template)}</b> | Plan: <b>{template.planLength}</b>
            {template.supportsVariants && template.curriculum !== "double-degree" ? (
              <>
                {" "}
                | 5-year option:
                {variant == "A" && <b> 8 Month Co-op (yr2-3) + 4 Month Co-op (yr5)</b>}
                {variant == "B" && <b> 12 Month Co-op (yr3-4) + 4 Month Co-op (yr5)</b>}
                {variant == "C" && <b> 8 Month Co-op (yr3-4) + 4 Month Co-op (yr5)</b>}
              </>
            ) : null}
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
                  {yearGroup.terms.map((term) => (
                    <article key={term.id} className="term-column">
                      <h4>{term.label.split("-")[1]?.trim() ?? term.label}</h4>
                      <div className="course-list">
                        {term.courseIds.map((slot, index) => (
                          <ScheduleSlotCard
                            key={Array.isArray(slot) ? `${slot.join("-")}-${index}` : slot}
                            slot={slot}
                            selectedCourseId={selectedCourse?.id ?? null}
                            highlightRoles={relationshipHighlights.roles}
                            completedCourseIds={completedCourseIds}
                            onToggleCompleted={toggleCourseCompleted}
                            onSelect={handleCourseSelect}
                          />
                        ))}
                      </div>
                    </article>
                  ))}
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

export default App;
