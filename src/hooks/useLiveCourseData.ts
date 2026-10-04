import { useEffect, useState } from "react";
import {
  fetchSectionsForTerm,
  findHistoricalOffering,
  resolveOfferedSections,
  termTupleToLabel,
} from "../sfuOutlines";
import { OfferedSection, SharedOutlineFields } from "../types";
import { normalizeCourseCode, parseCourseCode } from "../utils/courseCodes";

export type LiveStatus = "idle" | "loading" | "success" | "error" | "not-offered";

export interface LiveCourseData {
  status: LiveStatus;
  sharedOutline: SharedOutlineFields | null;
  sections: OfferedSection[];
  isHistorical?: boolean;
  historicalLabel?: string;
  errorMsg?: string;
}

const liveCourseCache = new Map<string, LiveCourseData>();

async function fetchLiveCourseData(dept: string, number: string): Promise<LiveCourseData> {
  const [currentResult, registrationResult] = await Promise.all([
    fetchSectionsForTerm("current/current", dept, number),
    fetchSectionsForTerm("registration/registration", dept, number),
  ]);

  const currentSections = currentResult?.sections ?? [];
  const registrationSections = registrationResult?.sections ?? [];

  if (currentSections.length === 0 && registrationSections.length === 0) {
    const historical = await findHistoricalOffering(dept, number, 6);

    if (historical) {
      return {
        status: "success",
        sharedOutline: historical.sharedOutline,
        sections: historical.sections,
        isHistorical: true,
        historicalLabel: termTupleToLabel(historical),
      };
    }

    return { status: "not-offered", sharedOutline: null, sections: [] };
  }

  const resolved = await resolveOfferedSections(dept, number, [
    currentResult,
    registrationResult,
  ]);

  if (!resolved || resolved.sections.length === 0) {
    return { status: "not-offered", sharedOutline: null, sections: [] };
  }

  return {
    status: "success",
    sharedOutline: resolved.sharedOutline,
    sections: resolved.sections,
  };
}

export function useLiveCourseData(courseCode: string | null): LiveCourseData {
  const [state, setState] = useState<LiveCourseData>({ status: "idle", sharedOutline: null, sections: [] });

  useEffect(() => {
    if (!courseCode) {
      setState({ status: "idle", sharedOutline: null, sections: [] });
      return;
    }

    const cacheKey = normalizeCourseCode(courseCode);
    const cached = liveCourseCache.get(cacheKey);
    if (cached) {
      setState(cached);
      return;
    }

    const parsed = parseCourseCode(courseCode);
    if (!parsed) {
      const notOffered: LiveCourseData = { status: "not-offered", sharedOutline: null, sections: [] };
      liveCourseCache.set(cacheKey, notOffered);
      setState(notOffered);
      return;
    }

    let cancelled = false;
    setState({ status: "loading", sharedOutline: null, sections: [] });

    async function load() {
      try {
        const result = await fetchLiveCourseData(parsed!.dept, parsed!.number);
        liveCourseCache.set(cacheKey, result);
        if (!cancelled) setState(result);
      } catch (err) {
        const errorResult: LiveCourseData = {
          status: "error",
          sharedOutline: null,
          sections: [],
          errorMsg: String(err),
        };
        liveCourseCache.set(cacheKey, errorResult);
        if (!cancelled) setState(errorResult);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseCode]);

  return state;
}
