"use client";
import type { FitnessInput } from "@/lib/fitness";
import { EXP_OPTIONS } from "../_constants";

const inputCls =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-center text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none";

const GENDERS = ["男", "女"] as const;

type Profile = FitnessInput["profile"];

export default function ProfileSection({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (next: Profile) => void;
}) {
  const set = (key: keyof Profile, value: string) => onChange({ ...profile, [key]: value });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">性别</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => set("gender", g)}
                className={`rounded-xl border py-2.5 text-sm transition-colors ${
                  profile.gender === g
                    ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <Field label="年龄（岁）" placeholder="如 23" value={profile.age} onChange={(v) => set("age", v)} inputMode="numeric" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="身高（cm）" placeholder="如 175" value={profile.height} onChange={(v) => set("height", v)} inputMode="numeric" />
        <Field label="体重（kg）" placeholder="如 65" value={profile.weight} onChange={(v) => set("weight", v)} inputMode="decimal" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label="体脂率（%，选填）"
          placeholder="男生腹肌隐约可见≈15"
          value={profile.bodyFat}
          onChange={(v) => set("bodyFat", v)}
          inputMode="decimal"
        />
        <Field
          label="目标体重（kg，选填）"
          placeholder="会算预计达标周数"
          value={profile.goalWeight ?? ""}
          onChange={(v) => set("goalWeight", v)}
          inputMode="decimal"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-zinc-500">训练经验</label>
        <div className="grid grid-cols-3 gap-2.5">
          {EXP_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => set("exp", e)}
              className={`rounded-xl border px-1 py-2.5 text-xs leading-4 transition-colors ${
                profile.exp === e
                  ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode: "numeric" | "decimal";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-zinc-500">{label}</label>
      <input
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}
