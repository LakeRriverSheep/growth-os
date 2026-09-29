import SceneNotes from "../_components/SceneNotes";
import { LISTENING_SCENES } from "@/lib/ielts";

export const metadata = { title: "雅思听力 · I" };

export default function ListeningPage() {
  return (
    <SceneNotes
      kind="listening"
      scenes={LISTENING_SCENES}
      backHref="/goal/english"
      title="听力 · 场景精听"
      hint="完整听一遍 → 选答案 → 再听 2-3 遍 → 听不出的词和好句子记下来"
    />
  );
}
