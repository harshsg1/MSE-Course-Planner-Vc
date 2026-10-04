import { useEffect, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { courseById } from "../data";

const COMPLETED_COURSES_STORAGE_KEY = "mse-planner:completed-course-ids";
const TRANSFER_CREDITS_STORAGE_KEY = "mse-planner:transfer-credits";

function loadCompletedCourseIds(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_COURSES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === "string" && !!courseById[id])
    );
  } catch {
    return new Set();
  }
}

function loadTransferCredits(): number {
  try {
    const raw = localStorage.getItem(TRANSFER_CREDITS_STORAGE_KEY);
    if (raw === null) return 0;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function useCourseProgress() {
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(loadCompletedCourseIds);
  const [transferCredits, setTransferCredits] = useState<number>(loadTransferCredits);

  useEffect(() => {
    try {
      localStorage.setItem(
        COMPLETED_COURSES_STORAGE_KEY,
        JSON.stringify(Array.from(completedCourseIds))
      );
    } catch {
      // ignore
    }
  }, [completedCourseIds]);

  useEffect(() => {
    try {
      localStorage.setItem(TRANSFER_CREDITS_STORAGE_KEY, String(transferCredits));
    } catch {
      // ignore
    }
  }, [transferCredits]);

  const toggleCourseCompleted = (courseId: string) => {
    setCompletedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const handleTransferCreditsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw.trim() === "") {
      setTransferCredits(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || Number.isNaN(parsed)) {
      setTransferCredits(0);
      return;
    }
    setTransferCredits(parsed);
  };

  const handleTransferCreditsKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["-", "+", "e", "E", "."].includes(event.key)) {
      event.preventDefault();
    }
  };

  const handleResetProgress = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset your progress? This will uncheck all completed courses and reset transfer credits."
    );
    if (!confirmed) return;

    setCompletedCourseIds(new Set());
    setTransferCredits(0);
    try {
      localStorage.removeItem(COMPLETED_COURSES_STORAGE_KEY);
      localStorage.removeItem(TRANSFER_CREDITS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return {
    completedCourseIds,
    transferCredits,
    toggleCourseCompleted,
    handleTransferCreditsChange,
    handleTransferCreditsKeyDown,
    handleResetProgress,
  };
}
