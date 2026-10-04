import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { pageTemplates } from "../data";
import { PageTemplate, VariantId } from "../types";

interface AppHeaderProps {
  selectedPageId: string;
  template?: PageTemplate;
  variant?: VariantId;
  onVariantChange?: (variant: VariantId) => void;
  extraControls?: ReactNode;
  onOpenWelcome: () => void;
}

export function AppHeader({
  selectedPageId,
  template,
  variant,
  onVariantChange,
  extraControls,
  onOpenWelcome,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div>
        <h1>SFU MSE Course Navigator</h1>
        <p className="subtitle">ALPHA VERSION</p>
      </div>
      <div className="toolbar">
        <select
          value={selectedPageId}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "custom") navigate("/custom");
            else navigate(`/planner/${value}`);
          }}
          aria-label="Select page template"
        >
          {pageTemplates.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title}
            </option>
          ))}
          <option value="custom">Custom Schedule</option>
        </select>
        {template?.supportsVariants && variant && onVariantChange && (
          <select
            value={variant}
            onChange={(event) => onVariantChange(event.target.value as VariantId)}
            aria-label="Select curriculum option"
          >
            {template.availableVariants.map((option) => (
              <option key={option} value={option}>
                {template.curriculum === "double-degree"
                  ? option === "B"
                    ? "Pre-Fall 2024"
                    : option === "A"
                      ? "Post-Fall 2024"
                      : `Option ${option}`
                  : `Option ${option}`}
              </option>
            ))}
          </select>
        )}
        {extraControls}
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
        <button
          type="button"
          className="help-button"
          onClick={onOpenWelcome}
          aria-label="Open welcome and help guide"
          title="Help"
        >
          ?
        </button>
      </div>
    </header>
  );
}
