import { useState, useRef } from "react";
import { splitReaction } from "@/lib/fanfarra/icons";
import { EPISODE_DURATION_TYPES } from "@/lib/fanfarra/formConfig";
import { useNavigate } from "@tanstack/react-router";
import { TagInput } from "@/components/fanfarra/TagInput";
import { Star, Check } from "lucide-react";
import type { ImportedWorkData } from "@/lib/api/importWork.functions";
import type { RelatedWork } from "@/lib/fanfarra/formConfig";
import {
  COMPLETED_STATUSES,
  DEFAULT_STATUS_FOR_TYPE,
  TYPE_FIELDS,
  TYPE_STATUSES,
  type DateParts,
  type FieldDef,
  type MediaType,
  type Status,
  type Work,
} from "@/lib/fanfarra/types";
import {
  COMPLETED_STATUS_FOR_TYPE,
  EXTRA_NUMERIC,
  PROGRESS_PAIRS,
  REACTIONS,
  getKeysToSkip,
} from "@/lib/fanfarra/formConfig";
import {
  ChipsField,
  DatePickerTriple,
  EpisodeDurationField,
  FandomsField,
  Field,
  SliderField,
  TextInput,
  TextareaField,
  ToggleField,
  UrlInput,
  type EpisodeDuration,
} from "./FormFields";

import {
  GENRES,
  MUSIC_GENRES,
  matchImportedGenres,
  matchChipValue,
  matchChipValues,
  getChipField,
  endDateLabel,
  hasAnyDatePart,
  PLATFORM_ALIASES,
  COUNTRY_ALIASES,
  LANGUAGE_ALIASES,
} from "./workform/formHelpers";
import {
  type WorkFormValues,
  workToFormValues,
  formValuesToWork,
} from "./workform/workValues";

import { ProgressPairBlock } from "./workform/ProgressPairBlock";
import { RatingsBlock } from "./workform/RatingsBlock";
import { RelatedWorksSection } from "./workform/RelatedWorksSection";
import { ShelfSelectorSection } from "./workform/ShelfSelectorSection";
import { ImportSection } from "./workform/ImportSection";
import { CoverField } from "./workform/CoverField";

export type { WorkFormValues };
export { workToFormValues, formValuesToWork };

export function WorkForm({
  type,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
  workId,
}: {
  type: MediaType;
  initial?: WorkFormValues;
  submitLabel: string;
  onSubmit: (v: WorkFormValues) => void;
  onDelete?: () => void;
  workId?: string;
}) {
  const nav = useNavigate();
  const [values, setValues] = useState<WorkFormValues>(
    initial ?? {
      title: "",
      status: DEFAULT_STATUS_FOR_TYPE(type),
      cover: "",
      rating: 0,
      notes: "",
      genres: [],
      details: {},
      shelfEntries: [],
    },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [importedFlash, setImportedFlash] = useState(false);

  const [step, setStep] = useState(0);
  const STEPS = ["Informações básicas", "Status e progresso", "Categorização", "Avaliação"];
  const totalSteps = STEPS.length;

  const setDetail = (k: string, v: unknown) =>
    setValues((s) => ({ ...s, details: { ...s.details, [k]: v } }));

  const applyImportedData = (data: ImportedWorkData, importedUrl: string) => {
    setValues((s) => {
      const nextDetails: Record<string, unknown> = { ...s.details };

      const totalsByKey: Record<string, number | undefined> = {
        totalEpisodes: data.totalEpisodes,
        totalChapters: data.totalChapters,
        totalVolumes: data.totalVolumes,
        totalPages: data.totalPages,
        totalIssues: data.totalIssues,
        totalSeasons: data.totalSeasons,
        duration: data.durationMinutes,
      };
      for (const p of PROGRESS_PAIRS[type] ?? []) {
        const v = totalsByKey[p.totalKey];
        if (v != null) nextDetails[p.totalKey] = v;
      }

      // Duração por episódio (Anime, Série, Donghua, Dorama)
      if (data.episodeDurationMinutes != null && EPISODE_DURATION_TYPES.has(type)) {
        nextDetails.episodeDuration = {
          hours: Math.floor(data.episodeDurationMinutes / 60),
          minutes: data.episodeDurationMinutes % 60,
          seconds: 0,
        };
      }

      // Resumo/Prólogo
      if (data.synopsis?.trim()) nextDetails.synopsis = data.synopsis.trim();

      // Tags livres (ex: AO3, Wattpad) — mescladas com as já existentes, sem limite artificial
      if (data.tags && data.tags.length) {
        const existingTags = Array.isArray(s.details.tags) ? (s.details.tags as string[]) : [];
        nextDetails.tags = Array.from(new Set([...existingTags, ...data.tags]));
      }

      if (data.author != null) nextDetails.author = data.author;
      if (data.studio != null) nextDetails.studio = data.studio;
      if (data.publisher != null) nextDetails.publisher = data.publisher;
      if (data.isbn != null) nextDetails.isbn = data.isbn;
      if (data.artist != null) nextDetails.artist = data.artist;
      if (data.album != null) nextDetails.album = data.album;
      if (TYPE_FIELDS[type].some((f) => f.key === "link")) nextDetails.link = importedUrl;

      // País (chips) — ex: MyDramaList traz "South Korea" -> vira "Coreia"
      const countryField = getChipField(type, "country");
      if (countryField && data.country) {
        const matchedCountry = matchChipValue(data.country, countryField.options, COUNTRY_ALIASES);
        if (matchedCountry) nextDetails.country = matchedCountry;
      } else if (data.country != null) {
        nextDetails.country = data.country;
      }

      // Plataforma (chips) — ex: AO3, Wattpad, Steam -> PC, etc.
      const platformField = getChipField(type, "platform");
      if (platformField && data.platform) {
        const matchedPlatform = matchChipValue(
          data.platform,
          platformField.options,
          PLATFORM_ALIASES,
        );
        if (matchedPlatform) {
          if (platformField.multi) {
            const existing = Array.isArray(s.details.platform)
              ? (s.details.platform as string[])
              : [];
            nextDetails.platform = Array.from(new Set([...existing, matchedPlatform]));
          } else {
            nextDetails.platform = matchedPlatform;
          }
        }
      }

      // Idioma (chips, ex: Fanfic) — ex: "English" -> "EN"
      const languageField = getChipField(type, "language");
      if (languageField && data.language) {
        const matchedLangs = matchChipValues(
          data.language,
          languageField.options,
          LANGUAGE_ALIASES,
        );
        if (matchedLangs.length) {
          nextDetails.language = languageField.multi ? matchedLangs : matchedLangs[0];
        }
      }

      // Fandoms (Fanfic)
      if (data.fandoms && data.fandoms.length) {
        const existingFandoms = Array.isArray(s.details.fandoms)
          ? (s.details.fandoms as string[])
          : [];
        nextDetails.fandoms = Array.from(new Set([...existingFandoms, ...data.fandoms]));
      }

      // Quantidade de palavras (Fanfic, Light Novel, Livro)
      if (
        data.wordCount != null &&
        (EXTRA_NUMERIC[type] ?? []).some((e) => e.key === "wordCount")
      ) {
        nextDetails.wordCount = data.wordCount;
      }

      const genreOptions = type === "Música" ? MUSIC_GENRES : GENRES;
      const matched = matchImportedGenres(data.genres, genreOptions);
      const nextGenres =
        matched.length > 0 ? Array.from(new Set([...s.genres, ...matched])) : s.genres;

      const nextStartDate =
        type === "Música" && data.releaseYear && !s.startDate?.y
          ? { ...s.startDate, y: data.releaseYear }
          : s.startDate;

      return {
        ...s,
        title: data.title?.trim() ? data.title.trim() : s.title,
        cover: data.cover?.trim() ? data.cover.trim() : s.cover,
        genres: nextGenres,
        details: nextDetails,
        startDate: nextStartDate,
      };
    });
  };

  const titleMissing = values.title.trim().length === 0;
  const canSave = !titleMissing;
  const titleRef = useRef<HTMLInputElement>(null);
  const skipKeys = getKeysToSkip(type);
  const fields = TYPE_FIELDS[type].filter((f) => !skipKeys.has(f.key));
  const endDateEnabled =
    (COMPLETED_STATUSES as readonly Status[]).includes(values.status) ||
    hasAnyDatePart(values.startDate);
  const statusOptions = TYPE_STATUSES[type];
  const pairs = PROGRESS_PAIRS[type] ?? [];
  const extras = EXTRA_NUMERIC[type] ?? [];
  const reactions: string[] = Array.isArray(values.details.reactions)
    ? (values.details.reactions as string[])
    : [];
  const fandoms: string[] = Array.isArray(values.details.fandoms)
    ? (values.details.fandoms as string[])
    : [];

  const episodeDuration: EpisodeDuration = (values.details.episodeDuration as EpisodeDuration) ?? {
    hours: 0,
    minutes: 24,
    seconds: 0,
  };
  const episodeCount = Number(values.details.episode) || Number(values.details.totalEpisodes) || 0;
  const obraCompleta = !!values.details._obraCompleta;

  const toggleObraCompleta = (on: boolean) => {
    setValues((s) => {
      const nextDetails: Record<string, unknown> = { ...s.details, _obraCompleta: on };
      if (on) {
        for (const p of pairs) {
          const cur = nextDetails[p.currentKey];
          if (cur != null && cur !== "") {
            nextDetails[p.totalKey] = p.totalIsPercent ? 100 : Number(cur) || 0;
          }
        }
      }
      return {
        ...s,
        details: nextDetails,
        status: on ? COMPLETED_STATUS_FOR_TYPE(type) : s.status,
      };
    });
  };

  const toggleReaction = (label: string) => {
    const next = reactions.includes(label)
      ? reactions.filter((r) => r !== label)
      : [...reactions, label];
    setDetail("reactions", next);
  };

  return (
  <div className="px-4 space-y-5 pb-10">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
            Passo {step + 1} de {totalSteps} — {STEPS[step]}
          </span>
          <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
            {Math.round(((step + 1) / totalSteps) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--fan-border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%`, background: "var(--fan-pink)" }}
          />
        </div>
      </div>

     <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      
      {step === 0 && (
      <>
      <ImportSection
        type={type}
        onImported={(data, meta) => {
          applyImportedData(data, meta.url);
          setImportedFlash(true);
          setTimeout(() => setImportedFlash(false), 2500);
        }}
      />
      <Field label="Título da obra" required>
        <ShelfSelectorSection
          value={values.shelfEntries}
          onChange={(v) => setValues((s) => ({ ...s, shelfEntries: v }))}
          workId={workId}
        />
        <div className="relative">
          <input
            ref={titleRef}
            type="text"
            value={values.title}
            onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
            placeholder="Ex: Attack on Titan"
            className="w-full rounded-[10px] px-3 py-3 text-sm outline-none"
            style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
          />
          {importedFlash && values.title && (
            <Check
              size={14}
              color="var(--fan-icon-blue)"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            />
          )}
        </div>
        {triedSubmit && titleMissing && (
          <p className="text-sm mt-1.5" style={{ color: "#F87171" }}>
            O título é obrigatório.
          </p>
        )}
      </Field>

      <Field label="Capa">
        <CoverField value={values.cover} onChange={(v) => setValues((s) => ({ ...s, cover: v }))} />
      </Field>

      <Field label="Resumo/Prólogo">
        <TextareaField
          value={(values.details.synopsis as string) ?? ""}
          onChange={(t) => setDetail("synopsis", t)}
          placeholder="Escreva um resumo ou prólogo da obra..."
          rows={10}
        />
     </Field>
      </>
      )}
      </div>

      {step === 1 && (
      <>
      <Field label="Status">
        <ChipsField
          options={statusOptions}
          value={values.status}
          onChange={(v) => setValues((s) => ({ ...s, status: (v as Status) || s.status }))}
        />
      </Field>

      {type === "Música" ? (
        <Field label="Data de lançamento">
          <DatePickerTriple
            value={values.startDate}
            onChange={(d) => setValues((s) => ({ ...s, startDate: d }))}
          />
        </Field>
      ) : (
        <>
          <Field label="Data de início">
            <DatePickerTriple
              value={values.startDate}
              onChange={(d) => setValues((s) => ({ ...s, startDate: d }))}
            />
          </Field>

          <Field label={endDateLabel(type)}>
            <DatePickerTriple
              value={values.endDate}
              onChange={(d) => setValues((s) => ({ ...s, endDate: d }))}
              disabled={!endDateEnabled}
            />
          </Field>
        </>
      )}

      {pairs.length > 0 && type !== "Música" && (
        <div
          className="flex items-center justify-between rounded-[10px] px-3 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
        >
          <span className="text-sm" style={{ color: "var(--fan-text)" }}>
            Obra completa
          </span>
          <ToggleField value={obraCompleta} onChange={toggleObraCompleta} />
        </div>
      )}

      {pairs.map((p) => (
        <ProgressPairBlock key={p.currentKey} pair={p} values={values} setDetail={setDetail} />
      ))}
      {/* Duração por episódio — só para Anime, Série, Donghua, Dorama */}
      {EPISODE_DURATION_TYPES.has(type) && (
        <EpisodeDurationField
          duration={episodeDuration}
          episodeCount={episodeCount}
          onChange={(d) => setDetail("episodeDuration", d)}
        />
      )}

      {/* Múltiplos fandoms — só para Fanfic */}
      {type === "Fanfic" && (
        <Field label="Fandoms (crossover)">
          <FandomsField value={fandoms} onChange={(v) => setDetail("fandoms", v)} />
        </Field>
      )}

      {extras.map((e) => (
        <Field key={e.key} label={e.label}>
          <TextInput
            type="number"
            value={values.details[e.key] == null ? "" : String(values.details[e.key])}
            onChange={(x) => setDetail(e.key, x === "" ? "" : Number(x))}
            placeholder={e.placeholder}
          />
        </Field>
      ))}

      {fields
        .filter((f) => !(type === "Filme" && f.key === "rewatch" && values.status !== "Assistido"))
        .map((f) => {
          const v = values.details[f.key];
          switch (f.kind) {
            case "number":
              return (
                <Field key={f.key} label={f.label}>
                  <TextInput
                    type="number"
                    value={v == null ? "" : String(v)}
                    onChange={(x) => setDetail(f.key, x === "" ? "" : Number(x))}
                  />
                </Field>
              );
            case "text":
              return (
                <Field key={f.key} label={f.label}>
                  <TextInput value={(v as string) ?? ""} onChange={(x) => setDetail(f.key, x)} />
                </Field>
              );
            case "url":
              return (
                <Field key={f.key} label={f.label}>
                  <UrlInput value={(v as string) ?? ""} onChange={(x) => setDetail(f.key, x)} />
                </Field>
              );
            case "toggle":
              return (
                <Field key={f.key} label={f.label}>
                  <ToggleField value={!!v} onChange={(x) => setDetail(f.key, x)} />
                </Field>
              );
            case "slider":
              return (
                <Field key={f.key} label={f.label}>
                  <SliderField
                    min={f.min}
                    max={f.max}
                    value={Number(v) || 0}
                    onChange={(x) => setDetail(f.key, x)}
                  />
                </Field>
              );
            case "chips":
              return (
                <Field key={f.key} label={f.label}>
                  <ChipsField
                    options={f.options}
                    value={v as string}
                    onChange={(x) => setDetail(f.key, x)}
                    multi={f.multi}
                  />
                </Field>
              );
            case "date":
              return (
                <Field key={f.key} label={f.label}>
                  <DatePickerTriple
                    value={v as DateParts | undefined}
                    onChange={(d) => setDetail(f.key, d)}
                  />
                </Field>
              );
          }
        })}
      </>
      )}

      {step === 2 && (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <RelatedWorksSection
        currentType={type}
        value={(values.details.related as RelatedWork[] | undefined) ?? []}
        onChange={(next) => setDetail("related", next)}
      />

      <Field label="Gêneros">
        <ChipsField
          options={type === "Música" ? MUSIC_GENRES : GENRES}
          value={values.genres}
          onChange={(g) => setValues((s) => ({ ...s, genres: g as string[] }))}
          multi
        />
      </Field>

      <Field label="Tags">
        <TagInput
          value={(values.details.tags as string[] | undefined) ?? []}
          onChange={(tags) => setDetail("tags", tags)}
          placeholder="Ex: Omegaverse, slow burn, enemies to lovers..."
          maxTags={50}
        />
      </Field>
       </div>
      )}
      
    

      {step === 3 && (
      <>
      <RatingsBlock type={type} values={values} setValues={setValues} setDetail={setDetail} />

      <div className="space-y-2">
        <span className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
          Sua reação
        </span>
        <div className="flex flex-wrap gap-2">
          {REACTIONS[type].map((r) => {
            const active = reactions.includes(r);
            const { Icon, label } = splitReaction(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleReaction(r)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-all"
                style={{
                  background: active ? "var(--fan-active-chip)" : "var(--fan-bg-2)",
                  border: `1px solid ${active ? "var(--fan-pink)" : "var(--fan-border)"}`,
                  color: active ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                  fontWeight: active ? 700 : 400,
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Notas pessoais">
        <TextareaField
          value={values.notes}
          onChange={(t) => setValues((s) => ({ ...s, notes: t }))}
          placeholder="Adicione notas, pensamentos..."
        />
      </Field>

</>
      )}

      <div className="flex gap-2 mt-2">
        {step > 0 && (
          <button
            type="button"
            onPointerDown={() => setStep((s) => Math.max(0, s - 1))}
            className="flex-1 rounded-full py-2.5 text-sm font-bold"
            style={{ border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text-3)" }}
          >
            Voltar
          </button>
        )}

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onPointerDown={() => {
              if (step === 0 && titleMissing) {
                setTriedSubmit(true);
                return;
              }
              setStep((s) => Math.min(totalSteps - 1, s + 1));
            }}
            className="flex-1 fan-btn-primary text-sm"
            style={{ touchAction: "manipulation" }}
          >
            Próximo
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={() => {
              const liveTitle = (titleRef.current?.value ?? values.title).trim();
              const updatedValues =
                liveTitle !== values.title ? { ...values, title: liveTitle } : values;
              setValues(updatedValues);
              setTriedSubmit(true);
              if (liveTitle.length > 0) onSubmit(updatedValues);
            }}
            disabled={false}
            className="flex-1 fan-btn-primary text-sm disabled:opacity-40"
            style={{ touchAction: "manipulation" }}
          >
            {submitLabel}
          </button>
        )}
      </div>

      {step === totalSteps - 1 && onDelete && (
        <button
          onPointerDown={() => setConfirmDelete(true)}
          className="w-full text-sm rounded-full py-2.5 font-bold text-white"
          style={{ background: "var(--fan-red)" }}
        >
          Excluir obra
        </button>
      )}

      {confirmDelete && onDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onPointerDown={() => setConfirmDelete(false)}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
          >
            <h3 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
              Tem certeza?
            </h3>
            <p className="text-sm mt-2" style={{ color: "var(--fan-text-2)" }}>
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onPointerDown={() => setConfirmDelete(false)}
                className="flex-1 rounded-full py-2.5 text-sm"
                style={{ border: "0.5px solid var(--fan-rose-mid)", color: "var(--fan-text-3)" }}
              >
                Cancelar
              </button>
              <button
                onPointerDown={() => {
                  onDelete();
                  nav({ to: "/library" });
                }}
                className="flex-1 rounded-full py-2.5 text-sm font-bold text-white"
                style={{ background: "var(--fan-red)" }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
