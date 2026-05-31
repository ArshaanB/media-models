import { saveGenerations, type Generation, type MediaKind } from "@/lib/generations";

export const runtime = "nodejs";

const GROK_MODELS: Record<string, MediaKind> = {
  "grok-imagine-image-quality": "image",
  "grok-imagine-video": "video",
  "grok-imagine-video-1.5-preview": "video",
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

type XaiVideoRequestBody = {
  model: string;
  prompt: string;
  duration: number;
  aspect_ratio: string;
  resolution: string;
  image?: { url: string };
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

function getImageUrl(body: unknown) {
  if (!body || typeof body !== "object" || !("imageUrl" in body)) return "";
  return typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
}

function isValidImageUrl(value: string) {
  if (value.startsWith("data:image/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function parseXaiError(response: Response) {
  const fallback = `xAI request failed with status ${response.status}`;
  try {
    const data = await response.json();
    const message =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.error?.message === "string"
          ? data.error.message
          : typeof data?.message === "string"
            ? data.message
            : fallback;

    return `${message} xAI status: ${response.status}. Payload: ${JSON.stringify(data)}`;
  } catch {
    return fallback;
  }
}

function getErrorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return "";

  const value = error as { code?: unknown; message?: unknown };
  if (typeof value.code === "string" && typeof value.message === "string") {
    return `[${value.code}]: ${value.message}`;
  }
  if (typeof value.message === "string") return value.message;
  return "";
}

function formatVideoStatusError(
  statusData: XaiVideoStatusResponse,
  requestId: string,
  model: string,
) {
  const details = getErrorMessage(statusData.error);
  const rawPayload = JSON.stringify(statusData);
  const message = details ? ` ${details}` : ".";

  return `xAI video request ${statusData.status}${message} Model: ${model}. Request ID: ${requestId}. Payload: ${rawPayload}`;
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

async function generateVideo(
  apiKey: string,
  model: string,
  prompt: string,
  imageUrl: string,
) {
  const requestBody: XaiVideoRequestBody = {
    model,
    prompt,
    duration: 6,
    aspect_ratio: "16:9",
    resolution: "480p",
  };

  if (imageUrl) {
    requestBody.image = { url: imageUrl };
  }

  const startResponse = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
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
      throw new Error(
        formatVideoStatusError(statusData, startData.request_id, model),
      );
    }
  }

  throw new Error(`xAI video generation timed out. Request ID: ${startData.request_id}`);
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
  const imageUrl = getImageUrl(body);
  const kind = GROK_MODELS[model];

  if (!prompt) return jsonError("Prompt is required.");
  if (!kind) return jsonError("Unsupported Grok model.");
  if (imageUrl && !isValidImageUrl(imageUrl)) {
    return jsonError("Image must be an HTTP URL or a base64 image data URI.");
  }
  if (model === "grok-imagine-video-1.5-preview" && !imageUrl) {
    return jsonError("Image is required for grok-imagine-video-1.5-preview.");
  }

  try {
    const url =
      kind === "image"
        ? await generateImage(apiKey, model, prompt)
        : await generateVideo(apiKey, model, prompt, imageUrl);

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
