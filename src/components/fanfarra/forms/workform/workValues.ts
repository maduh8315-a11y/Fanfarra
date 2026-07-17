import type { DateParts, MediaType, Status, Work } from "@/lib/fanfarra/types";
import { PROGRESS_PAIRS } from "@/lib/fanfarra/formConfig";

export interface WorkFormValues {
  title: string;
  status: Status;
  cover: string;
  rating: number;
  notes: string;
  startDate?: DateParts;
  endDate?: DateParts;
  genres: string[];
  details: Record<string, unknown>;
  shelfEntries: { bookcaseId: string; shelfId: string }[];
}

export function workToFormValues(
  w: Work,
  shelfEntries?: { bookcaseId: string; shelfId: string }[],
): WorkFormValues {
  return {
    title: w.title,
    status: w.status,
    cover: w.cover ?? "",
    rating: w.rating,
    notes: w.notes,
    startDate: w.startDate,
    endDate: w.endDate,
    genres: w.genres ?? [],
    details: w.details ?? {},
    shelfEntries: shelfEntries ?? [],
  };
}

export function formValuesToWork(
  type: MediaType,
  v: WorkFormValues,
): Omit<Work, "id" | "createdAt" | "updatedAt"> {
  const pair = PROGRESS_PAIRS[type]?.[0];
  const current = pair ? Number(v.details[pair.currentKey]) || 0 : 0;
  const rawTotal = pair ? v.details[pair.totalKey] : undefined;
  const total = rawTotal == null || rawTotal === "?" ? 0 : Number(rawTotal) || 0;
  return {
    title: v.title.trim(),
    type,
    status: v.status,
    current,
    total,
    rating: v.rating,
    notes: v.notes.trim(),
    cover: v.cover.trim() || undefined,
    startDate: v.startDate,
    endDate: v.endDate,
    genres: v.genres,
    link: typeof v.details.link === "string" ? (v.details.link as string) : undefined,
    details: v.details,
  };
}