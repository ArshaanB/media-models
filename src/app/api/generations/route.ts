import { listGenerations } from "@/lib/generations";

export const runtime = "nodejs";

export async function GET() {
  const generations = await listGenerations();
  return Response.json({ generations });
}
