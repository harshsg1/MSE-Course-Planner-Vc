# SFU MSE Course Navigator - Project Design Blueprint 

**Goal:** Build an updated planner for the Simon Fraser University Mechatronic Systems Engineering (MSE) program with modern UX, accurate prerequisite flow, and long-term maintainability.

---

## High-Level Overview
- **3** Primary User Types
- **6** Core Page Templates
- **6** MVP Feature Pillars
- **6** Core Data Models
- **3** Release Phases

---

## Design Targets

| Area | Must Keep | Improve | Avoid |
| :--- | :--- | :--- | :--- |
| **Curriculum Coverage** | Official SFU curriculum alignment | Separate pages for pre-Fall 2024 and post-Fall 2024 | Mixing requirements from different curriculum eras |
| **Curriculum Grid** | Term-by-term visual map | Faster drag/drop, touch support, responsive columns | Dense layout that breaks on small screens |
| **Course Details** | Hover or click details panel | Prereq tree + reverse dependencies + offering confidence | Hidden prerequisite rationale |
| **Customization** | Elective slot selection | Constraint-aware suggestions and validation warnings | Manual trial-and-error only |
| **Persistence** | Import/export plans | Versioned schema + migration support + auto-save | Brittle storage format |
| **Student Workflow** | Quick what-if planning | Milestones (co-op, transfer credit, repeats) and conflict checker | No guidance when plan is invalid |
| **Cross-Faculty Equivalencies** | Show recognized substitutes clearly | Clickable equivalency map across faculties and departments | Students manually searching external calendars |

---

## Navigation Model

1.  **Landing Selector:** Choose curriculum era (Pre-2024, Post-2024, Double Degree).
2.  **Plan Selector:** Choose 4-year or 5-year recommended path.
3.  **Variant Selector:** If 5-year selected, switch between Option A, Option B, and Option C.
4.  **In-page Planner:** Drag/drop with live prerequisite and graduation requirement validation.

*Shared layout: Top controls, term grid, right details panel, bottom validation rail.*

---

## Site/Page Architecture

| Page | Curriculum Era | Plan Type | Special Controls |
| :--- | :--- | :--- | :--- |
| **Post-2024 4-Year** | Post-Fall 2024 | Recommended 4-year | Curriculum-year lock + term filter |
| **Post-2024 5-Year** | Post-Fall 2024 | Recommended 5-year | 5-year option switcher (A/B/C) |
| **Pre-2024 4-Year** | Pre-Fall 2024 | Recommended 4-year | Legacy prerequisite rule set |
| **Pre-2024 5-Year** | Pre-Fall 2024 | Recommended 5-year | Legacy plan switcher + migration notice |
| **MSE + Business Double Degree** | Separate track | Combined degree map | Faculty ownership tags + extra credit progress |
| **Custom Planner** | User-selected base | What-if scenarios | Start from any template page |

---

## Feature Set 

| Feature | V0 | V1+ | Notes |
| :--- | :--- | :--- | :--- |
| **Drag/drop planning** | Yes | Batch move + keyboard controls | Must support desktop and touch |
| **Prereq validation** | Hard/soft rule engine | Explainable conflict traces | Show exactly why course placement fails |
| **Elective handling** | Template slots + chooser | Recommendation ranking | Handle technical + complementary electives |
| **Persistence** | Local autosave + file import/export | Optional cloud sync | Keep data portable |
| **Term offerings** | Static expected term flags | Historical probability model | Display confidence and recency |
| **Multi-page curriculum** | Pre/Post + 4-yr/5-yr + Double Degree | Diff view between versions | Keeps requirements unambiguous |
| **Course equivalency** | SFU-equivalent courses from other faculties | Suggested alternatives by term/seat history | Mark source (calendar/advising) |

---

## Equivalency UX (New Core Feature)
1. On course click, details panel shows an "Equivalent Courses" section.
2. Equivalents grouped by faculty and department (e.g., ENSC, MATH, PHYS, BUS).
3. Each equivalent shows substitution scope: full replacement, partial credit, or elective-only.
4. Planner validates if selected equivalent satisfies prereqs and graduation rules.
5. Optional toggle on grid: highlight all courses that have approved cross-faculty equivalents.

---

## Data Model

| Entity | Key Fields | Purpose |
| :--- | :--- | :--- |
| **Course** | id, code, title, units, prereqExpr, coreqExpr, offeredTerms | Source of truth for rule checks and display |
| **CurriculumTrack** | trackId, era(pre/post), planLength(4/5), requiredCourses, electiveRules | Represents each official curriculum page template |
| **PlanVariant** | variantId(A/B/C), coopPattern, termOverrides | Stores 5-year option-specific structures |
| **Plan** | planId, terms[], chosenElectives, overrides, version | User's schedule state and edits |
| **ValidationIssue** | issueType, severity, affectedCourses, explanation | Drives warnings and guidance panel |
| **ProgramProfile** | programId, name, owningFaculty, graduationRules | Handles standard MSE vs MSE+Business |
| **CourseEquivalency** | sourceCourseId, equivalentCourseId, faculty, type, provenance | Maps approved cross-faculty substitutions |

---

## Implementation Plan
- **Phase 1:** Baseline grid UI, course catalog, drag/drop, side panel details.
- **Phase 2:** Prerequisite engine, elective slot logic, import/export compatibility.
- **Phase 3:** Touch responsiveness, accessibility, performance tuning, QA fixtures.

---

## Quality Checklist
- **Accessibility:** Keyboard navigation, focus states, ARIA labels, contrast checks.
- **Reliability:** Deterministic validation engine with regression fixtures.
- **Performance:** Virtualized grid rendering for large custom plans.
- **Transparency:** Every warning includes remediation steps.
