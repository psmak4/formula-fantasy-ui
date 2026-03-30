import { Badge } from "../ui/Badge";
import {
  breakdownOutcomeLabel,
  breakdownOutcomeTone,
  type BreakdownRow,
  type ResultStatus,
} from "../../lib/resultDetails";

type Props = {
  status?: ResultStatus;
  rows?: BreakdownRow[];
  emptyCopy?: string;
  compact?: boolean;
};

export function ScoringBreakdownTable({
  status,
  rows = [],
  emptyCopy,
  compact = false,
}: Props) {
  if (status === "no_entry") {
    return (
      <div className="border border-dashed border-[#d9dee5] bg-[#f8f9fb] px-5 py-8 text-center text-sm text-[#66707d]">
        {emptyCopy ?? "No prediction card was submitted for this round."}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[#d9dee5] bg-[#f8f9fb] px-5 py-8 text-center text-sm text-[#66707d]">
        {emptyCopy ?? "No scoring breakdown is available yet."}
      </div>
    );
  }

  return (
    <div className={compact ? "grid gap-3" : "grid gap-4"}>
      {rows.map((row) => (
        <article
          key={row.category ?? row.label}
          className={`border border-[#d9dee5] bg-white ${
            compact ? "px-4 py-4" : "px-5 py-5"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black uppercase tracking-[0.08em] text-[#111318] md:text-xl">
                {row.label ?? "Category"}
              </p>
              <p className="mt-2 text-sm text-[#66707d]">
                {row.explanation ?? "No category detail available."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone={breakdownOutcomeTone(row.outcome)}>
                {breakdownOutcomeLabel(row.outcome)}
              </Badge>
              <div className="min-w-[70px] border border-[#d9dee5] bg-[#f8f9fb] px-3 py-2 text-center">
                <p className="ff-kicker">Points</p>
                <p className="mt-1 text-lg font-black text-[#111318]">
                  {typeof row.pointsEarned === "number" ? row.pointsEarned : "—"}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`mt-4 grid gap-3 ${
              compact ? "md:grid-cols-2" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            }`}
          >
            <div className="border border-[#e3e7ec] bg-[#f8f9fb] px-4 py-4">
              <p className="ff-kicker text-[#7b8592]">Your Pick</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#111318]">
                {row.userPick ?? "—"}
              </p>
            </div>

            <div className="border border-[#e3e7ec] bg-[#f8f9fb] px-4 py-4">
              <p className="ff-kicker text-[#7b8592]">Actual Result</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#111318]">
                {row.actualResult ?? "—"}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
