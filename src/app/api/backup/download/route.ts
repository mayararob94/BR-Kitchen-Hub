import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { backupPath } from "@/lib/db/backup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const filePath = backupPath(name);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    },
  });
}
