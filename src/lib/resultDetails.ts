import type { ComponentProps } from "react";
import type { Badge } from "../components/ui/Badge";

export type ResultStatus = "scored" | "pending" | "no_entry";

export type BreakdownRow = {
  category?: string;
  label?: string;
  userPick?: string;
  actualResult?: string;
  pointsEarned?: number | null;
  outcome?: "exact" | "partial" | "miss" | "pending" | "no_entry";
  explanation?: string;
};

export function resultStatusLabel(status?: ResultStatus): string {
  switch (status) {
    case "scored":
      return "Scored";
    case "pending":
      return "Pending";
    case "no_entry":
      return "No Entry";
    default:
      return "Pending";
  }
}

export function resultStatusTone(status?: ResultStatus): ComponentProps<typeof Badge>["tone"] {
  switch (status) {
    case "scored":
      return "success";
    case "pending":
      return "warning";
    case "no_entry":
      return "neutral";
    default:
      return "neutral";
  }
}

export function breakdownOutcomeLabel(outcome?: BreakdownRow["outcome"]): string {
  switch (outcome) {
    case "exact":
      return "Exact";
    case "partial":
      return "Partial";
    case "miss":
      return "Miss";
    case "pending":
      return "Pending";
    case "no_entry":
      return "No Entry";
    default:
      return "Pending";
  }
}

export function breakdownOutcomeTone(outcome?: BreakdownRow["outcome"]): ComponentProps<typeof Badge>["tone"] {
  switch (outcome) {
    case "exact":
      return "success";
    case "partial":
      return "warning";
    case "miss":
      return "danger";
    case "pending":
      return "warning";
    case "no_entry":
      return "neutral";
    default:
      return "neutral";
  }
}
