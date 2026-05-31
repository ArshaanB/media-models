"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type MediaItem = {
  id: number;
  prompt: string;
  kind: "image" | "video";
  palette: string;
  accent: string;
  createdAt: string;
};

const seedPrompts = [
  "cinematic product shot of translucent headphones",
  "editorial portrait in warm window light",
  "macro render of glass UI controls",
  "slow motion city street after rain",
  "minimal studio scene with chrome typography",
  "aerial coast line with morning haze",
  "retro-futurist living room concept",
  "close-up ceramic watch on charcoal fabric",
  "gallery installation with soft shadows",
  "abstract fabric simulation in motion",
  "desert research station at dusk",
  "monochrome sneaker campaign still",
  "botanical lab table with glowing samples",
  "wide shot of a concert stage rig",
  "liquid metal logo animation frame",
  "quiet bookstore cafe in winter",
  "architectural model with paper textures",
  "neon sign reflected in black marble",
  "handheld documentary frame of a market",
  "soft gradient packaging render",
  "training footage of a dance rehearsal",
  "museum archive table top composition",
  "fashion lookbook against painted canvas",
  "satellite view of synthetic farmland",
  "industrial robot arm polishing stone",
  "animated weather map for a sci-fi film",
  "still life with citrus, steel, and linen",
  "low angle shot of a concept vehicle",
  "portrait series with colored gels",
  "ocean research drone launch sequence",
  "brutalist lobby with afternoon sunlight",
  "generative poster made from scan lines",
];

const palettes = [
  ["#f4f1ea", "#1d3557"],
  ["#0f172a", "#f97316"],
  ["#e0f2fe", "#0f766e"],
  ["#161616", "#d9f99d"],
  ["#fff7ed", "#7c2d12"],
  ["#eef2ff", "#4f46e5"],
  ["#f8fafc", "#be123c"],
  ["#111827", "#38bdf8"],
];

function createSeedItems(): MediaItem[] {
  return seedPrompts.map((prompt, index) => {
    const [palette, accent] = palettes[index % palettes.length];

    return {
      id: seedPrompts.length - index,
      prompt,
      kind: index % 5 === 1 || index % 5 === 4 ? "video" : "image",
      palette,
      accent,
      createdAt: `${index + 2}m ago`,
    };
  });
}

function createItem(prompt: string, nextId: number): MediaItem {
  const [palette, accent] = palettes[nextId % palettes.length];

  return {
    id: nextId,
    prompt,
    kind: nextId % 4 === 0 ? "video" : "image",
    palette,
    accent,
    createdAt: "just now",
  };
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<MediaItem[]>(() => createSeedItems());
  const [visibleCount, setVisibleCount] = useState(16);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + 8, items.length));
        }
      },
      { rootMargin: "360px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [items.length]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    setItems((currentItems) => [
      createItem(trimmedPrompt, currentItems[0].id + 1),
      ...currentItems.map((item) =>
        item.createdAt === "just now" ? { ...item, createdAt: "1m ago" } : item,
      ),
    ]);
    setVisibleCount(16);
    setPrompt("");
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#191919]">
      <section className="sticky top-0 z-10 border-b border-black/10 bg-[#f7f4ee]/92 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7c2d12]">
              Media Models
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-5xl">
              Generate, review, and revisit creative outputs.
            </h1>
          </div>

          <form
            className="flex w-full max-w-2xl flex-col gap-2 rounded-lg border border-black/15 bg-white p-2 shadow-[0_18px_60px_rgba(25,25,25,0.10)] sm:flex-row"
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="prompt">
              Prompt
            </label>
            <input
              id="prompt"
              className="min-h-12 flex-1 rounded-md border border-transparent bg-transparent px-3 text-base outline-none transition focus:border-black/20"
              placeholder="Describe an image or video to generate..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button
              className="min-h-12 rounded-md bg-[#191919] px-5 text-sm font-semibold text-white transition hover:bg-[#3b2a20] disabled:cursor-not-allowed disabled:bg-black/25 sm:w-auto"
              disabled={!prompt.trim()}
              type="submit"
            >
              Generate
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent outputs</h2>
            <p className="mt-1 text-sm text-black/60">
              Showing {visibleItems.length} of {items.length} saved generations.
            </p>
          </div>
          <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-medium text-black/65">
            Latest 16 first
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleItems.map((item, index) => (
            <article
              className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_14px_42px_rgba(25,25,25,0.08)]"
              key={item.id}
            >
              <div
                className="relative aspect-[4/3]"
                style={
                  {
                    "--media-bg": item.palette,
                    "--media-accent": item.accent,
                  } as CSSProperties
                }
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,var(--media-accent),transparent_24%),linear-gradient(135deg,var(--media-bg),#ffffff_48%,var(--media-accent))]" />
                <div className="absolute inset-4 border border-white/55" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="rounded-full bg-white/86 px-2.5 py-1 text-xs font-semibold uppercase text-black/70">
                    {item.kind}
                  </span>
                  {item.kind === "video" ? (
                    <span className="grid size-9 place-items-center rounded-full bg-black text-white">
                      <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/80 px-2.5 py-1 text-xs font-semibold text-white">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="line-clamp-2 min-h-12 text-sm font-medium leading-6">
                  {item.prompt}
                </p>
                <div className="flex items-center justify-between text-xs text-black/50">
                  <span>{item.createdAt}</span>
                  <span>model draft</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div
          className="flex h-24 items-center justify-center text-sm text-black/55"
          ref={loadMoreRef}
        >
          {visibleCount < items.length
            ? "Loading more saved outputs..."
            : "End of generation history"}
        </div>
      </section>
    </main>
  );
}
