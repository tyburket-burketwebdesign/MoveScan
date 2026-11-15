"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import CorrectiveMap from "@/components/CorrectiveMap";
import { Field, Pill, Segmented, Sheet, toEmbed, VideoFrame } from "@/components/ui";
import { store } from "@/lib/store";
import { blankProgram, CATEGORIES, fromTemplate, mergeLibrary, newId, STARTER_LIBRARY, TEMPLATES, type Category, type LibraryExercise } from "@/lib/training";
import { useLoad } from "@/lib/useSettings";

type Tab = "programs" | "exercises" | "map";
const STARTER_KEYS = new Set(STARTER_LIBRARY.map((x) => x.key));

function Training() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "programs");
  const [data, reload] = useLoad(async () => {
    const [programs, assignments, custom] = await Promise.all([store.list("program"), store.list("assignment"), store.list("exercise")]);
    return { programs, assignments, custom };
  });
  const [templates, setTemplates] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [editing, setEditing] = useState<LibraryExercise | null>(null);

  const library = useMemo(() => mergeLibrary(data?.custom), [data]);
  if (!data) return <Loading />;
  const { programs, assignments } = data;

  const create = async (key?: string) => {
    const p = key ? fromTemplate(key) : blankProgram();
    await store.put("program", p);
    router.push(`/training/${p.id}`);
  };

  const shown = library.filter((x) => (cat === "All" || x.category === cat) && x.name.toLowerCase().includes(q.toLowerCase()));
  const withVideo = library.filter((x) => toEmbed(x.videoUrl)).length;

  return (
    <div>
      <PageHeader title="Training" sub="Build programs once, assign them to anyone, and watch the check-offs come in.">
        {tab === "programs" && (
          <>
            <button className="btn btn-quiet" onClick={() => setTemplates(true)}>
              Start from a template
            </button>
            <button className="btn btn-primary" onClick={() => create()}>
              New program
            </button>
          </>
        )}
        {tab === "exercises" && (
          <button className="btn btn-primary" onClick={() => setEditing({ id: "", key: "", name: "", category: "Strength", cue: "", custom: true })}>
            New exercise
          </button>
        )}
      </PageHeader>

      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Training sections"
          options={[
            ["programs", `Programs (${programs.length})`],
            ["exercises", `Exercise library (${library.length})`],
            ["map", "Corrective map"],
          ]}
        />
      </div>

      {tab === "programs" &&
        (programs.length === 0 ? (
          <div className="surface flex flex-col items-start gap-4 p-10">
            <h2 className="title text-2xl">Your first program</h2>
            <p className="max-w-lg text-dim">Start from one of the templates and make it yours, or build one from a blank page.</p>
            <button className="btn btn-primary" onClick={() => setTemplates(true)}>
              Start from a template
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((p) => {
              const on = assignments.filter((a) => a.program_id === p.id && a.status === "active").length;
              return (
                <Link key={p.id} href={`/training/${p.id}`} className="surface group flex min-h-52 flex-col p-6 transition-transform hover:-translate-y-0.5 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="title text-2xl">{p.name}</h2>
                    {on > 0 && <Pill tone="good">{on} training</Pill>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[15px] text-dim">{p.summary || "No description yet."}</p>
                  <div className="mt-auto flex items-end justify-between pt-6">
                    <dl className="flex gap-6 text-sm">
                      <div>
                        <dd className="readout text-3xl">{p.weeks}</dd>
                        <dt className="mt-1 text-dim">weeks</dt>
                      </div>
                      <div>
                        <dd className="readout text-3xl">{p.days.length}</dd>
                        <dt className="mt-1 text-dim">days a week</dt>
                      </div>
                      <div>
                        <dd className="readout text-3xl">{p.days.reduce((t, d) => t + d.items.length, 0)}</dd>
                        <dt className="mt-1 text-dim">exercises</dt>
                      </div>
                    </dl>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

      {tab === "exercises" && (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <Segmented value={cat} onChange={setCat} label="Category" options={[["All", "All"], ...CATEGORIES.map((c) => [c, c] as [Category, string])]} />
            <input className="field !min-h-10 w-56 !text-sm" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
          </div>
          <p className="mb-4 text-sm text-dim">
            {withVideo} of {library.length} exercises have a demo video. Add your own so athletes see you coaching the movement.
          </p>
          <ul className="surface divide-y divide-[var(--color-hair)]">
            {shown.map((x) => (
              <li key={x.key}>
                <button className="grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] sm:px-7" onClick={() => setEditing(x)}>
                  <span className={`grid aspect-square place-items-center rounded-[10px] ${toEmbed(x.videoUrl) ? "bg-ice/15 text-ice" : "bg-white/[0.04] text-faint"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{x.name}</span>
                    <span className="block truncate text-sm text-dim">{x.cue}</span>
                  </span>
                  <span className="hidden text-sm text-faint sm:block">{x.category}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-7 py-8 text-dim">Nothing matches. Add it as a new exercise.</li>}
          </ul>
        </div>
      )}

      {tab === "map" && <CorrectiveMap />}

      <Sheet open={templates} onClose={() => setTemplates(false)} title="Start from a template" wide>
        <ul className="space-y-2.5">
          {TEMPLATES.map((t) => (
            <li key={t.key}>
              <button className="w-full rounded-[14px] bg-white/[0.04] p-5 text-left transition-colors hover:bg-white/[0.08]" onClick={() => create(t.key)}>
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-lg font-semibold">{t.name}</span>
                  <span className="shrink-0 text-sm text-dim">
                    {t.weeks} weeks, {t.build().length} days
                  </span>
                </span>
                <span className="mt-1 block text-[15px] text-dim">{t.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <ExerciseSheet
        exercise={editing}
        onClose={() => setEditing(null)}
        onSaved={() => (setEditing(null), reload())}
      />
    </div>
  );
}

function ExerciseSheet({ exercise, onClose, onSaved }: { exercise: LibraryExercise | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise?.key ? exercise.name : "New exercise"}>
      {exercise && <ExerciseForm key={exercise.key || "new"} exercise={exercise} onSaved={onSaved} />}
    </Sheet>
  );
}

function ExerciseForm({ exercise, onSaved }: { exercise: LibraryExercise; onSaved: () => void }) {
  const [f, setF] = useState(exercise);
  const isNew = !exercise.key;
  const badUrl = Boolean(f.videoUrl) && !toEmbed(f.videoUrl);
  return (
    <div className="space-y-4">
      <VideoFrame url={f.videoUrl} title={f.name} />
      <Field label="Name">
        <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Category">
        <select className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Coaching cue">
        <textarea className="field" value={f.cue} onChange={(e) => setF({ ...f, cue: e.target.value })} placeholder="What you'd say standing next to them" />
      </Field>
      <Field label="Demo video link" hint={badUrl ? undefined : "Paste a YouTube or Vimeo link, or a direct link to an .mp4. Athletes see it inside their workout."}>
        <input className="field" inputMode="url" placeholder="https://" value={f.videoUrl ?? ""} onChange={(e) => setF({ ...f, videoUrl: e.target.value.trim() || undefined })} />
        {badUrl && <span className="text-xs text-amber">That link can&apos;t be played. Use a YouTube, Vimeo or .mp4 link that starts with https.</span>}
      </Field>
      <div className="flex gap-2.5 pt-1">
        <button
          className="btn btn-primary flex-1"
          disabled={!f.name.trim() || badUrl}
          onClick={async () => {
            const key = isNew ? `x_${newId().slice(0, 8)}` : f.key;
            await store.put("exercise", { ...f, id: key, key, name: f.name.trim(), custom: isNew ? true : f.custom });
            onSaved();
          }}
        >
          {isNew ? "Add exercise" : "Save"}
        </button>
        {!isNew && exercise.custom && !STARTER_KEYS.has(exercise.key) && (
          <button
            className="btn btn-quiet"
            onClick={async () => {
              if (!confirm(`Delete ${exercise.name}? Programs that use it will show it as removed.`)) return;
              await store.remove("exercise", exercise.key);
              onSaved();
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Training />
      </Suspense>
    </AppShell>
  );
}
