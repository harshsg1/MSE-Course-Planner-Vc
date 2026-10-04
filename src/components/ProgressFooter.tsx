import type { ChangeEvent, KeyboardEvent } from "react";

interface ProgressFooterProps {
  completedCredits: number;
  transferCredits: number;
  totalCompleted: number;
  totalCurriculumCredits: number;
  completionPercent: number;
  onTransferCreditsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTransferCreditsKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onResetProgress: () => void;
}

export function ProgressFooter({
  completedCredits,
  transferCredits,
  totalCompleted,
  totalCurriculumCredits,
  completionPercent,
  onTransferCreditsChange,
  onTransferCreditsKeyDown,
  onResetProgress,
}: ProgressFooterProps) {
  return (
    <footer className="status-rail">
      <div className="credits-counter">
        <span>Completed Credits: {completedCredits}</span>
        <span className="transfer-credits-field">
          Transfer Credits:{" "}
          <input
            type="number"
            className="transfer-credits-input"
            min={0}
            step={1}
            inputMode="numeric"
            value={transferCredits}
            onChange={onTransferCreditsChange}
            onKeyDown={onTransferCreditsKeyDown}
            aria-label="Transfer credits"
          />
        </span>
        <span>
          Progress: {totalCompleted} / {totalCurriculumCredits} Credits ({completionPercent}%)
        </span>
        <button type="button" className="reset-progress-btn" onClick={onResetProgress}>
          Reset Progress
        </button>
      </div>
    </footer>
  );
}
