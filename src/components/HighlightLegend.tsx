import { useMemo } from "react";
import { CourseHighlightRole } from "../types";

interface HighlightLegendProps {
  roles: Map<string, CourseHighlightRole>;
  recursiveHighlights: boolean;
  onToggleRecursive: (checked: boolean) => void;
}

export function HighlightLegend({
  roles,
  recursiveHighlights,
  onToggleRecursive,
}: HighlightLegendProps) {
  const counts = useMemo(() => {
    const tally = { prerequisite: 0, corequisite: 0, dependent: 0 };
    for (const role of roles.values()) {
      if (role === "prerequisite") tally.prerequisite += 1;
      if (role === "corequisite") tally.corequisite += 1;
      if (role === "dependent") tally.dependent += 1;
    }
    return tally;
  }, [roles]);

  const hasSelection = roles.size > 0;

  return (
    <div className="highlight-legend" role="group" aria-label="Course relationship legend">
      <h4>Curriculum Relationships</h4>
      <div className="legend-item">
        <span className="legend-swatch selected" aria-hidden="true" />
        Selected course
      </div>
      <div className="legend-item">
        <span className="legend-swatch prerequisite" aria-hidden="true" />
        Prerequisites{hasSelection && ` (${counts.prerequisite})`}
      </div>
      <div className="legend-item">
        <span className="legend-swatch corequisite" aria-hidden="true" />
        Corequisites{hasSelection && ` (${counts.corequisite})`}
      </div>
      <div className="legend-item">
        <span className="legend-swatch dependent" aria-hidden="true" />
        Dependent courses{hasSelection && ` (${counts.dependent})`}
      </div>

      <label className="recursive-toggle">
        <input
          type="checkbox"
          checked={recursiveHighlights}
          onChange={(event) => onToggleRecursive(event.target.checked)}
        />
        Recursive highlights
      </label>
    </div>
  );
}
