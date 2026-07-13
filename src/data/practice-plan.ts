/**
 * 室內設計乙級術科 — 3小時動態調控練習計畫書
 *
 * 來源：Gemini 教練模式（2026-07-14）
 * 性質：個人化練習計畫 + 學習日誌，與「試卷備考知識」獨立
 *
 * 結構：
 * - 啟動數據（統計）
 * - 動態調整邏輯（4 個核心策略）
 * - 週計畫框架（7 天）
 * - 練習日誌（時間軸）
 * - 高效工具 SOP
 * - 考場應變心法
 */

export interface PracticeStrategy {
  id: string;
  title: string;
  description: string;
  tactic: string;
}

export interface WeeklyPlan {
  day: string;
  dayLabel: string;
  /** 上午場 / 下午場 / 全天 */
  session: "上午" | "下午" | "全天";
  goal: string;
  focus: string;
  adjustment: string;
}

export interface PracticeLog {
  date: string;
  topic: string;
  mode: string;
  progress: string;
  aiAdvice: string;
  nextDayAdjustment: string;
}

export interface TacticTool {
  id: string;
  title: string;
  description: string;
}

export interface ExamMindset {
  id: string;
  title: string;
  description: string;
}

export interface PracticePlanStats {
  startDate: string;
  totalHours: number;
  loggedDays: string[];
  writtenScore: string;
}

export const practicePlanStats: PracticePlanStats = {
  startDate: "2024/04/21",
  totalHours: 12,
  loggedDays: ["4/21", "4/22", "4/30"],
  writtenScore: "100 分",
};

export const practiceStrategies: PracticeStrategy[] = [
  {
    id: "line-drawing-blitz",
    title: "結構廣度優先（Line-Drawing Blitz）",
    description: "優先練習不同題組的線稿，掌握家具配置、透視消失點與空間邏輯。",
    tactic: "每張線稿只追求「比例正確」，不上色、不標註，反覆切換題組建立空間感。",
  },
  {
    id: "selective-rendering",
    title: "表現深度抽樣（Selective Rendering）",
    description: "著色採「3+1」抽樣制，每 3 張線稿才進行 1 次完整上色，避免重複動作消耗時間。",
    tactic: "線稿日 → 線稿日 → 線稿日 → 上色日，依此循環。",
  },
  {
    id: "local-material",
    title: "局部材質攻堅",
    description: "針對每題特有的材質（如 208 的特殊牆面、207 的特定家具）進行局部著色測試。",
    tactic: "不畫整張，只練關鍵 5cm × 5cm 材質塊，建立材質字典。",
  },
  {
    id: "gray-shadow",
    title: "灰階陰影驗證",
    description: "若不進行完整著色，僅用灰階馬克筆練習「明暗立體感」，確保空間感正確。",
    tactic: "用 1 支灰色馬克筆＋1 支黑色 0.3 代針筆，10 分鐘確認立體感。",
  },
];

export const weeklyPlan: WeeklyPlan[] = [
  {
    day: "mon",
    dayLabel: "週一",
    session: "上午",
    goal: "平面配置",
    focus: "各題型平面配置、動線、法規尺寸",
    adjustment: "若已熟練 207，則直接挑戰 208 不同配置",
  },
  {
    day: "tue",
    dayLabel: "週二",
    session: "上午",
    goal: "標註與天棚",
    focus: "尺寸線、文字標準化、天花板特殊造型",
    adjustment: "練習標註的「美感與速度」，不重複標簡單元件",
  },
  {
    day: "wed",
    dayLabel: "週三",
    session: "下午",
    goal: "透視底稿",
    focus: "消失點定位、家具立體化、複雜造型",
    adjustment: "重點日：練習不同空間的透視構圖",
  },
  {
    day: "thu",
    dayLabel: "週四",
    session: "全天",
    goal: "著色或新線稿",
    focus: "抽樣上色 或 下一題線稿",
    adjustment: "根據手感決定：需要練上色速度還是練新題型",
  },
  {
    day: "fri",
    dayLabel: "週五",
    session: "全天",
    goal: "魔王元件訓練",
    focus: "樓梯、圓形天花板、特殊櫃體剖面",
    adjustment: "專攻本週覺得最難的「點」",
  },
  {
    day: "sat",
    dayLabel: "週六",
    session: "全天",
    goal: "白紙模擬",
    focus: "從零開始的全白紙起稿速度測試",
    adjustment: "綜合測試：不靠底稿的起稿記憶",
  },
  {
    day: "sun",
    dayLabel: "週日",
    session: "全天",
    goal: "復盤與準備",
    focus: "補完圖面、預畫下週半成品",
    adjustment: "沉澱記憶，準備下週任務切換",
  },
];

export const practiceLog: PracticeLog[] = [
  {
    date: "04/21",
    topic: "207 甲向放圖練習",
    mode: "放圖",
    progress: "完成圖框格線放圖（1/15，櫃後起算）",
    aiAdvice: "切換邏輯測試：測試櫃前起算法與 1/12.5 比例差異。",
    nextDayAdjustment: "深化記憶：進行線稿完稿，鞏固 1/12.5 空間感。",
  },
  {
    date: "04/22",
    topic: "208 甲向放圖練習",
    mode: "放圖",
    progress: "使用 1/12.5 比例成功完成放圖",
    aiAdvice: "決策點：既然已掌握 208 結構，可選擇「今日著色」或「明日換題」。",
    nextDayAdjustment: "下一步建議：建議先完成 208 著色，作為 1/12.5 的基準範本。",
  },
  {
    date: "04/30",
    topic: "208 甲向線稿完稿",
    mode: "完稿",
    progress: "完成 208 甲線稿完稿 (1/12.5)",
    aiAdvice: "決策點：既然已掌握 208 結構，可選擇「今日著色」或「明日換題」。",
    nextDayAdjustment: "建議先完成 208 著色，作為 1/12.5 的基準範本。",
  },
  {
    date: "05/01",
    topic: "著色或換題",
    mode: "(待定)",
    progress: "(待通報)",
    aiAdvice: "下一步建議：建議先完成 208 著色，作為 1/12.5 的基準範本。",
    nextDayAdjustment: "待回報後再調整",
  },
];

export const tacticTools: TacticTool[] = [
  {
    id: "half-finish",
    title: "半成品預製",
    description: "利用週日預畫牆柱、管道間與標題欄。",
  },
  {
    id: "transparent-draft",
    title: "透明底稿法",
    description: "準備黑麥克筆萬用底稿，疊在練習紙下快速定位。",
  },
  {
    id: "3h-cut",
    title: "3 小時切割",
    description: "10 分讀題 → 30 分起稿 → 100 分製圖 → 40 分標註與收尾。",
  },
];

export const examMindsets: ExamMindset[] = [
  {
    id: "structure-justice",
    title: "結構即正義",
    description: "比例、消失點錯了，顏色再漂亮也不會及格。",
  },
  {
    id: "quick-mark",
    title: "快速標記",
    description: "練習用代針筆「暗示」材質（如木紋兩三筆），不一定要靠馬克筆才能表現材質。",
  },
];

/** 計畫書版本鎖定：本檔案為個人化計畫，標題/結構可微調，內容鎖定不嚴格。 */
export const practicePlanVersion = "1.0";
