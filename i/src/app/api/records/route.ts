import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/records          → 返回全部有记录的日期列表
// GET /api/records?date=XX  → 返回某一天记录
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (date) {
    const row = db
      .prepare("SELECT * FROM records WHERE date = ?")
      .get(date) as Record<string, unknown> | undefined;
    return NextResponse.json(row ?? null);
  }

  const rows = db
    .prepare("SELECT date, done FROM records ORDER BY date DESC")
    .all() as { date: string; done: number }[];
  return NextResponse.json(rows);
}

// POST /api/records  body: { date, training, diet, calories, done }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, training = "", diet = "", calories = "", done = false } = body;

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO records (date, training, diet, calories, done, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
     ON CONFLICT(date) DO UPDATE SET
       training = excluded.training,
       diet = excluded.diet,
       calories = excluded.calories,
       done = excluded.done,
       updated_at = excluded.updated_at`,
  ).run(date, training, diet, calories, done ? 1 : 0);

  return NextResponse.json({ ok: true });
}
