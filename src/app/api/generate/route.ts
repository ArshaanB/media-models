import { saveGenerations, type Generation, type MediaKind } from "@/lib/generations";

export const runtime = "nodejs";

const GROK_MODELS: Record<string, MediaKind> = {
  "grok-imagine-image-quality": "image",
  "grok-imagine-video": "video",
};

type XaiImageResponse = {
  data?: Array<{ url?: string }>;
  url?: string;
};

type XaiVideoStartResponse = {
  request_id?: string;
};

type XaiVideoStatusResponse = {
  status?: string;
  video?: { url?: string };
  error?: unknown;
};

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function getPrompt(body: unknown) {
  if (!body || typeof body !== "object" || !("prompt" in body)) return "";
  return typeof body.prompt === "string" ? body.prompt.trim() : "";
}

function getModel(body: unknown) {
  if (!body || typeof body !== "object" || !("model" in body)) return "";
  return typeof body.model === "string" ? body.model : "";
}

async function parseXaiError(response: Response) {
  const fallback = `xAI request failed with status ${response.status}`;
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.error?.message === "string") return data.error.message;
    if (typeof data?.message === "string") return data.message;
    return fallback;
  } catch {
    return fallback;
  }
}

async function generateImage(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt }),
  });

  if (!response.ok) {
    throw new Error(await parseXaiError(response));
  }

  const data = (await response.json()) as XaiImageResponse;
  const url = data.data?.[0]?.url ?? data.url;
  if (!url) throw new Error("xAI did not return an image URL.");
  return url;
}

async function generateVideo(apiKey: string, model: string, prompt: string) {
  const startResponse = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, duration: 6 }),
  });

  if (!startResponse.ok) {
    throw new Error(await parseXaiError(startResponse));
  }

  const startData = (await startResponse.json()) as XaiVideoStartResponse;
  if (!startData.request_id) {
    throw new Error("xAI did not return a video request ID.");
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `https://api.x.ai/v1/videos/${startData.request_id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!statusResponse.ok) {
      throw new Error(await parseXaiError(statusResponse));
    }

    const statusData = (await statusResponse.json()) as XaiVideoStatusResponse;
    if (statusData.status === "done" && statusData.video?.url) {
      return statusData.video.url;
    }
    if (statusData.status === "failed" || statusData.status === "expired") {
      throw new Error(`xAI video request ${statusData.status}.`);
    }
  }

  throw new Error("xAI video generation timed out.");
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return jsonError("Missing XAI_API_KEY in the environment.", 500);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const prompt = getPrompt(body);
  const model = getModel(body);
  const kind = GROK_MODELS[model];

  if (!prompt) return jsonError("Prompt is required.");
  if (!kind) return jsonError("Unsupported Grok model.");

  try {
    const url =
      kind === "image"
        ? await generateImage(apiKey, model, prompt)
        : await generateVideo(apiKey, model, prompt);

    const generation: Generation = {
      id: crypto.randomUUID(),
      provider: "Grok",
      model,
      prompt,
      kind,
      url,
      createdAt: new Date().toISOString(),
    };

    await saveGenerations([generation]);
    return Response.json({ generation });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Generation failed.", 502);
  }
}
