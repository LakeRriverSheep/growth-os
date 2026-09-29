import Planner from "../_components/Planner";

export const metadata = { title: "周计划 · I" };

// 周计划 = 原首页视图：课程表 + 自排日程，一周全见（手机一天一屏左右滑动）
export default function PlannerPage() {
  return <Planner />;
}
