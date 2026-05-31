import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type MediaKind = "image" | "video";

export type Generation = {
  id: string;
  provider: "Grok";
  model: string;
  prompt: string;
  kind: MediaKind;
  url: string;
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "generations.json");

async function readGenerationsFile(): Promise<Generation[]> {
  try {
    const content = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeGenerationsFile(generations: Generation[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(generations, null, 2)}\n`);
}

export async function listGenerations() {
  return readGenerationsFile();
}

export async function saveGenerations(newGenerations: Generation[]) {
  const generations = await readGenerationsFile();
  const nextGenerations = [...newGenerations, ...generations];
  await writeGenerationsFile(nextGenerations);
  return nextGenerations;
}
