"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const PROVIDERS = ["Grok"] as const;

const GROK_MODELS = [
  { id: "grok-imagine-image-quality", label: "Imagine Image", kind: "image" },
  { id: "grok-imagine-video", label: "Imagine Video", kind: "video" },
  {
    id: "grok-imagine-video-1.5-preview",
    label: "Imagine Video 1.5 Preview",
    kind: "video",
  },
] as const;

type Provider = (typeof PROVIDERS)[number];
type GrokModel = (typeof GROK_MODELS)[number]["id"];
type MediaKind = (typeof GROK_MODELS)[number]["kind"];

type Generation = {
  id: string;
  provider: Provider;
  model: GrokModel;
  prompt: string;
  kind: MediaKind;
  url: string;
  createdAt: string;
};

type GenerationsResponse = {
  generations?: Generation[];
  error?: string;
};

type GenerateResponse = {
  generation?: Generation;
  error?: string;
};

const modelLabels: Record<GrokModel, string> = {
  "grok-imagine-image-quality": "Imagine Image",
  "grok-imagine-video": "Imagine Video",
  "grok-imagine-video-1.5-preview": "Imagine Video 1.5 Preview",
};

function isGeneration(value: unknown): value is Generation {
  if (!value || typeof value !== "object") return false;
  const generation = value as Partial<Generation>;
  return (
    typeof generation.id === "string" &&
    generation.provider === "Grok" &&
    typeof generation.model === "string" &&
    generation.model in modelLabels &&
    typeof generation.prompt === "string" &&
    (generation.kind === "image" || generation.kind === "video") &&
    typeof generation.url === "string" &&
    typeof generation.createdAt === "string"
  );
}

function SelectChevron() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-[#9d6d57]"
    />
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<Provider>("Grok");
  const [model, setModel] = useState<GrokModel>("grok-imagine-image-quality");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = useMemo(
    () => GROK_MODELS.find((grokModel) => grokModel.id === model),
    [model],
  );

  useEffect(() => {
    let isActive = true;

    async function loadGenerations() {
      try {
        const response = await fetch("/api/generations");
        const data = (await response.json()) as GenerationsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load the gallery.");
        }

        if (isActive) {
          setGenerations((data.generations ?? []).filter(isGeneration));
          setError("");
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the gallery.",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadGenerations();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || isCreating) return;

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, prompt: value }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.generation) {
        throw new Error(data.error ?? "Generation failed.");
      }

      const generation = data.generation;
      setGenerations((current) => [generation, ...current]);
      setPrompt("");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Generation failed.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className={`${sans.className} min-h-screen bg-[#fbf7f2] text-[#2b2622]`}>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <h1 className={`${serif.className} text-4xl md:text-5xl`}>Lumière</h1>
          <p className="mt-1 text-base font-light text-[#8a7f74]">
            Prompt Grok Imagine and collect the generated media.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[150px_210px_1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Provider</span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
              className="h-12 w-full appearance-none rounded-full border border-[#e7dccf] bg-white py-3 pl-5 pr-10 text-sm text-[#9d6d57] outline-none focus:border-[#c9a98f]"
            >
              {PROVIDERS.map((providerOption) => (
                <option key={providerOption} value={providerOption}>
                  {providerOption}
                </option>
              ))}
            </select>
            <SelectChevron />
          </label>

          <label className="relative block">
            <span className="sr-only">Grok model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as GrokModel)}
              className="h-12 w-full appearance-none rounded-full border border-[#e7dccf] bg-white py-3 pl-5 pr-10 text-sm text-[#9d6d57] outline-none focus:border-[#c9a98f]"
            >
              {GROK_MODELS.map((grokModel) => (
                <option key={grokModel.id} value={grokModel.id}>
                  {grokModel.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </label>

          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              selectedModel?.kind === "video"
                ? "a slow cinematic pan across a glass greenhouse..."
                : "a still life in soft morning light..."
            }
            className="h-12 min-w-0 rounded-full border border-[#e7dccf] bg-white px-5 text-base font-light outline-none placeholder:text-[#a89c90] focus:border-[#c9a98f]"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || isCreating}
            className="h-12 rounded-full bg-[#a06049] px-7 text-sm font-medium text-white transition hover:bg-[#8f543f] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isCreating ? "Creating" : "Create"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-md border border-[#e3b9a8] bg-[#fff8f4] px-4 py-3 text-sm text-[#93513c]">
            {error}
          </p>
        ) : null}

        <section className="mt-10" aria-label="Generated media gallery">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-lg bg-[#eee4da]" />
                  <div className="mt-3 h-4 rounded bg-[#eee4da]" />
                  <div className="mt-2 h-3 w-24 rounded bg-[#eee4da]" />
                </div>
              ))}
            </div>
          ) : generations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d8c8b8] px-5 py-12 text-center">
              <p className={`${serif.className} text-2xl italic text-[#6e6258]`}>
                No generated media yet.
              </p>
              <p className="mt-2 text-sm font-light text-[#8a7f74]">
                Create with Grok and the result will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {generations.map((generation) => (
                <figure key={generation.id}>
                  {generation.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={generation.url}
                      alt={generation.prompt}
                      className="aspect-[4/5] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <video
                      src={generation.url}
                      controls
                      className="aspect-[4/5] w-full rounded-lg bg-black object-cover"
                    />
                  )}
                  <figcaption className="mt-3">
                    <p className={`${serif.className} text-lg italic leading-snug`}>
                      {generation.prompt}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-[#a89c90]">
                      Grok / {modelLabels[generation.model]}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
