"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Instrument_Serif, Hanken_Grotesk } from "next/font/google";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const MODELS = ["Grok", "Google", "OpenAI"];

type Piece = {
  id: number;
  prompt: string;
  model: string;
  from: string;
  to: string;
};

const blends: Array<[string, string]> = [
  ["#f7d9c4", "#d98a7b"],
  ["#e6d3f2", "#a98fd1"],
  ["#d3e8e0", "#7fb6a6"],
  ["#f5e7c6", "#d6b06a"],
  ["#dce6f5", "#8aa6d6"],
  ["#f3d4dd", "#cf90a6"],
];

const seeds = [
  "a quiet still life of citrus, steel and linen",
  "editorial portrait in warm window light",
  "coastline wrapped in pale morning haze",
  "translucent headphones in soft studio light",
  "botanical samples glowing on marble",
  "ceramic watch on charcoal cashmere",
  "a bookstore cafe hushed by winter light",
  "chrome lettering in an endless white room",
  "dust and sunlight in a brutalist atrium",
  "soft gradient packaging on a pale table",
  "a concept interior at the blue hour",
  "fashion lookbook against painted canvas",
  "macro of brushed-glass interface controls",
  "a desert research station at dusk",
  "liquid petals unfolding in slow motion",
  "monochrome sneaker on folded paper",
];

function makePieces(): Piece[] {
  return seeds.map((prompt, i) => {
    const [from, to] = blends[i % blends.length];
    return { id: seeds.length - i, prompt, model: MODELS[i % MODELS.length], from, to };
  });
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [pieces, setPieces] = useState<Piece[]>(() => makePieces());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    const newId = pieces[0].id + 1;
    const [from, to] = blends[newId % blends.length];
    setPieces((c) => [{ id: newId, prompt: value, model, from, to }, ...c]);
    setPrompt("");
  }

  return (
    <div className={`${sans.className} min-h-screen bg-[#fbf7f2] text-[#2b2622]`}>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10">
          <h1 className={`${serif.className} text-4xl tracking-tight md:text-5xl`}>
            Lumière
          </h1>
          <p className="mt-1 text-base font-light text-[#8a7f74]">
            Describe a scene and add it to the collection.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            aria-label="Model"
            className="appearance-none rounded-full border border-[#e7dccf] bg-white py-3 pl-5 pr-11 text-sm text-[#a06049] outline-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4.5l4 4 4-4' stroke='%23a06049' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 1rem center",
            }}
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="a still life in soft morning light…"
            className="flex-1 rounded-full border border-[#e7dccf] bg-white px-5 py-3 text-base font-light outline-none placeholder:text-[#a89c90] focus:border-[#c9a98f]"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="rounded-full px-7 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #c98a6b, #a06049)" }}
          >
            Create
          </button>
        </form>

        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {pieces.map((piece) => (
            <figure key={piece.id}>
              <div
                className="aspect-[4/5] rounded-2xl"
                style={{
                  backgroundImage: `linear-gradient(150deg, ${piece.from}, ${piece.to})`,
                }}
              />
              <figcaption className="mt-3">
                <p className={`${serif.className} text-lg italic leading-snug`}>
                  {piece.prompt}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-[#a89c90]">
                  {piece.model}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </main>
    </div>
  );
}
