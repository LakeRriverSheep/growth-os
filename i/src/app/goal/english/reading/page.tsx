import SceneNotes from "../_components/SceneNotes";
import { READING_SCENES } from "@/lib/ielts";

export const metadata = { title: "雅思阅读 · I" };

export default function ReadingPage() {
  return (
    <SceneNotes
      kind="reading"
      scenes={READING_SCENES}
      backHref="/goal/english"
      title="阅读 · 场景精读"
      hint="按场景做 → 记同义替换、生词和句子"
    />
  );
}
