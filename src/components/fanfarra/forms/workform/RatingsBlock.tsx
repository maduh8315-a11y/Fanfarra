import { Star } from "lucide-react";
import { RATING_CRITERIA } from "@/lib/fanfarra/formConfig";
import { RatingStars } from "../FormFields";
import type { MediaType } from "@/lib/fanfarra/types";
import type { WorkFormValues } from "./workValues";

export function RatingsBlock({
  type,
  values,
  setValues,
  setDetail,
}: {
  type: MediaType;
  values: WorkFormValues;
  setValues: React.Dispatch<React.SetStateAction<WorkFormValues>>;
  setDetail: (k: string, v: unknown) => void;
}) {
  const criteria = RATING_CRITERIA[type] ?? [];
  const criteriaRatings = (values.details.criteriaRatings as Record<string, number>) ?? {};
  const setCriterion = (k: string, v: number) =>
    setDetail("criteriaRatings", { ...criteriaRatings, [k]: v });
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
    >
      <span className="block text-sm font-bold mb-3" style={{ color: "var(--fan-text-3)" }}>
        Avaliações
      </span>
      <div>
        {criteria.map((c) => (
          <div
            key={c.key}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: "1px solid var(--fan-border)" }}
          >
            <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
              {c.label}
            </span>
            <RatingStars
              value={criteriaRatings[c.key] ?? 0}
              onChange={(r) => setCriterion(c.key, r)}
              size={18}
            />
          </div>
        ))}
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
            <span className="inline-flex items-center gap-1"><Star size={13} fill="currentColor" /> Geral</span>
          </span>
          <RatingStars
            value={values.rating}
            onChange={(r) => setValues((s) => ({ ...s, rating: r }))}
            size={22}
          />
        </div>
      </div>
    </div>
  );
}
