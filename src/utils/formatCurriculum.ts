import { PageTemplate } from "../types";

export function formatCurriculum(template: PageTemplate): string {
  switch (template.curriculum) {
    case "post-2024":
      return "Post-Fall 2024";
    case "pre-2024":
      return "Pre-Fall 2024";
    case "double-degree":
      return "MSE + Business";
    default:
      return template.curriculum;
  }
}
