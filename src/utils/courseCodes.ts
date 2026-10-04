import { Course } from "../types";

export function normalizeCourseCode(code: string): string {
  return code.replace(/\s+/g, " ").trim().toUpperCase();
}

export function buildCourseCodeIndex(courses: Course[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const course of courses) {
    const normalized = normalizeCourseCode(course.code);
    index.set(normalized, course.id);
    index.set(normalized.replace(/\s+/g, ""), course.id);
  }
  return index;
}

/**
  Tracks the active department code across list sequences 
  (e.g. "MATH 151, 152 or 155 and PHYS 140" -> "MATH 151, MATH 152 or MATH 155 and PHYS 140")
*/
export function expandDepartmentShorthand(text: string): string {
  const tokenPattern = /\b([A-Za-z]{2,8})\s+(\d{1,3}[A-Za-z]?)|(?:\b(?:or|and|,)\s+)+(\d{1,3}[A-Za-z]?\b)/gi;
  
  let currentDept = "";

  return text.replace(tokenPattern, (match, dept, numWithDept, shorthandNum) => {
    if (dept && numWithDept) {
      currentDept = dept.toUpperCase();
      return `${currentDept} ${numWithDept}`;
    }
    
    if (shorthandNum && currentDept) {
      // Retain leading separators (like "or ", "and ", or ", ")
      const prefix = match.replace(/\d{1,3}[A-Za-z]?$/, "");
      return `${prefix}${currentDept} ${shorthandNum}`;
    }

    return match;
  });
}

export function findCourseIdsInText(
  text: string,
  codeToId: Map<string, string>
): string[] {
  const expanded = expandDepartmentShorthand(text);
  const found: string[] = [];

  // Robust matching for standard dept codes + course numbers (and optional SFU credit suffixes like MATH 151-3)
  const coursePattern = /\b([A-Za-z]{2,8})\s*(\d{1,3})\s*([A-Za-z])?(?:-\d)?\b/gi;

  let match: RegExpExecArray | null;

  while ((match = coursePattern.exec(expanded)) !== null) {
    const dept = match[1].toUpperCase();
    const number = match[2];
    const suffix = match[3] ? match[3].toUpperCase() : "";

    const normalized = normalizeCourseCode(`${dept} ${number}${suffix}`);
    const compact = normalized.replace(/\s+/g, "");

    const id = codeToId.get(normalized) ?? codeToId.get(compact);

    if (id) {
      found.push(id);
    }
  }

  return [...new Set(found)];
}