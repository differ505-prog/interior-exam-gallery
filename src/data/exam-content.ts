import { ArchiveSection, UploadEntry } from "@/types/exam";

const planItems: ArchiveSection["items"] = [];
const ceilingElevationItems: ArchiveSection["items"] = [];
const questions = ["201", "202", "203", "204", "205", "206"];
const variants = ["A", "B", "C", "D", "E", "F"];

questions.forEach((q) => {
  variants.forEach((v) => {
    // Generate Plan Item
    planItems.push({
      code: `${q}${v}`,
      title: `${q}${v} 平面配置圖`,
      variants: [v],
      focus: "平面配置圖",
      notes: `${q}題型${v}版平面配置圖練習，專注通道淨寬、家具尺度與動線流暢性。`
    });

    // 1. 天花板配置圖
    ceilingElevationItems.push({
      code: `${q}${v}天花`,
      title: `${q}${v} 天花板配置圖`,
      variants: ["天花配置", "燈具迴路"],
      focus: "天花配置、燈具配置與出風口投影",
      notes: `${q}題型${v}版天花配置圖，注意燈槽尺寸與迴路配線。`,
      view: "客天",
    });
    // 2. 客廳立面圖
    ceilingElevationItems.push({
      code: `${q}${v}客立`,
      title: `${q}${v} 客廳立面圖`,
      variants: ["客廳立面", "剖面高度"],
      focus: "電視牆投影、展示櫃尺度與高度標註",
      notes: `${q}題型${v}版客廳立面配置，注意材質交接與高度標記。`,
      view: "客立",
    });
    // 3. 餐廳立面圖
    ceilingElevationItems.push({
      code: `${q}${v}餐立`,
      title: `${q}${v} 餐廳立面圖`,
      variants: ["餐廳立面", "剖面高度"],
      focus: "餐邊櫃比例、出風口投影與主牆造型",
      notes: `${q}題型${v}版餐廳立面配置，注意拉門收邊與餐几尺度。`,
      view: "餐立",
    });
    // 4. 主臥立面圖
    ceilingElevationItems.push({
      code: `${q}${v}臥立`,
      title: `${q}${v} 主臥立面圖`,
      variants: ["主臥立面", "剖面高度"],
      focus: "床頭背牆、衣櫃機能收納與化妝桌配置",
      notes: `${q}題型${v}版主臥室立面配置，細檢化妝鏡高度與抽屜配置。`,
      view: "臥立",
    });

    // ── v1.2 新增：天花板視角衍生項（客廳天花 / 餐廳天花 / 主臥天花）──────────────────────

    // 5. 客廳天花（新）
    ceilingElevationItems.push({
      code: `${q}${v}客天`,
      title: `${q}${v} 客廳天花`,
      variants: ["客廳天花", "燈具迴路"],
      focus: "客廳天花板配置，含客廳燈具迴路、空調出風口投影與間接照明飾燈配置。",
      notes: `× 客廳天花燈具迴路未標\n× 客廳出風口尺寸遺漏\n× 客廳天花間接照明取消扣\n× 客廳飾燈位置與立面圖不一致\n× 客廳天花高度標註缺漏`,
      view: "客天",
    });

    // 6. 餐廳天花（新）
    ceilingElevationItems.push({
      code: `${q}${v}餐天`,
      title: `${q}${v} 餐廳天花`,
      variants: ["餐廳天花", "燈具迴路"],
      focus: "餐廳天花板配置，含餐廳吊燈位置、空調出風口與飾燈投射範圍。",
      notes: `× 餐廳吊燈位置錯誤\n× 餐廳天花尺寸鏈標註缺漏\n× 餐廳出風口投影與吊燈位置衝突\n× 餐廳天花板飾燈電源迴路未標`,
      view: "餐天",
    });

    // 7. 主臥天花（新）
    ceilingElevationItems.push({
      code: `${q}${v}臥天`,
      title: `${q}${v} 主臥天花`,
      variants: ["主臥天花", "燈具迴路"],
      focus: "主臥天花板配置，含主臥間接照明鏈條、空調出風口投影與飾燈位置。",
      notes: `× 主臥間接照明鏈條遺漏\n× 主臥出風口投影位置錯誤\n× 主臥天花飾燈與床頭位置衝突\n× 主臥天花板高度鏈標註缺漏`,
      view: "臥天",
    });
  });
});

export const examSections: ArchiveSection[] = [
  {
    slug: "plan",
    eyebrow: "Plan Archive",
    title: "平面圖 201-206",
    summary: "收錄 201-206 各版型（A-F）的平面配置圖，搭配家具尺度與應考節奏。",
    visualNote: "像畫冊一樣閱讀平面配置，先看格局節奏，再看尺寸與動線。",
    items: planItems,
  },
  {
    slug: "ceiling-elevation",
    eyebrow: "Ceiling & Elevation Archive",
    title: "天花板與立面圖（216 張）",
    summary: "收錄 201-206 各版型（A-F）的天花板與立面圖，共 216 張（天花板 108 + 立面 108）。",
    visualNote: "您可以點擊上方題號標籤切換檢視，對照天花照明迴路與立面圖櫃體投影設計。",
    items: ceilingElevationItems,
  },
  {
    slug: "perspective",
    eyebrow: "Perspective Studies",
    title: "透視圖 207-212",
    summary: "每題收錄甲乙丙三向，強調視點、構圖層次與色彩節奏。",
    visualNote: "把透視練習做成藝術展牆，快速橫向比較不同視角的空間敘事。",
    items: [
      { code: "207甲", title: "入口視角 (甲向)", variants: ["甲"], focus: "近景入口收邊、中景櫃體與光源方向", notes: "優先建立地坪與天花的消失點。" },
      { code: "207乙", title: "入口視角 (乙向)", variants: ["乙"], focus: "客廳視線收束與整體空間感", notes: "注意大面落地窗的透視比例。" },
      { code: "207丙", title: "入口視角 (丙向)", variants: ["丙"], focus: "天花板迴路與燈具配置投影", notes: "透視圖的消失點必須精確抓出。" },
      { code: "208甲", title: "客廳主視角 (甲向)", variants: ["甲"], focus: "展示櫃比例、EL 定位與陰影線層次；比例 1:12.5，圖面寬度 32cm，符合術科 30cm 門檻", notes: "× 展示櫃最高點 261cm（天花板 300cm），櫃頂不可接天花板，留 39cm 缺口\n× 左側角落柱與天花板口字型需閃過橫樑\n× 展示櫃層板厚度 8cm（參考王本楷老師）\n× 燈箱深度比櫃子淺，使用淺黃/白色亮光\n× 中下格無招牌光，陰影線 45 度角統一方向\n× 右側四座櫃子側面比正面暗半階" },
      { code: "208乙", title: "客廳主視角 (乙向)", variants: ["乙"], focus: "電視櫃立面、走道寬度與構圖平衡", notes: "電視主牆與沙發對應關係是拿分關鍵。" },
      { code: "208丙", title: "客廳主視角 (丙向)", variants: ["丙"], focus: "天花層次、吊燈垂直性與端景平衡", notes: "消失點偏左，右側量體要穩定。" },
      { code: "209甲", title: "餐廳展示視角 (甲向)", variants: ["甲"], focus: "餐桌尺度、餐邊櫃比例與吊燈垂直性", notes: "注意餐桌椅與後方走道的通行寬度。" },
      { code: "209乙", title: "餐廳展示視角 (乙向)", variants: ["乙"], focus: "吧台高低差、高腳椅尺度與展示架", notes: "細緻描繪杯架與燈帶能大幅提升質感。" },
      { code: "209丙", title: "餐廳展示視角 (丙向)", variants: ["丙"], focus: "廚房拉門交界、天花造型與留白", notes: "拉門格柵的比例與透視縮小需一致。" },
      { code: "210甲", title: "主臥氛圍視角 (甲向)", variants: ["甲"], focus: "床頭背景、床組比例與布面陰影", notes: "床頭板軟包或線條需避免畫髒。" },
      { code: "210乙", title: "主臥氛圍視角 (乙向)", variants: ["乙"], focus: "更衣室入口、化妝台尺度與鏡面反射", notes: "鏡面反射可適度留白，增加通透感。" },
      { code: "210丙", title: "主臥氛圍視角 (丙向)", variants: ["丙"], focus: "落地窗簾、天花板窗簾盒與間接照明", notes: "窗簾抓摺起伏的陰影表現需流暢。" },
      { code: "211甲", title: "複合角度視角 (甲向)", variants: ["甲"], focus: "轉角收邊、櫃體交接與消失點", notes: "建議拆成三層上色，避免一次塗死。" },
      { code: "211乙", title: "複合角度視角 (乙向)", variants: ["乙"], focus: "多功能房隔間、和室踏階與升降桌", notes: "踏階高度與消失點要精確對齊。" },
      { code: "211丙", title: "複合角度視角 (丙向)", variants: ["丙"], focus: "書架格柵、書桌尺度與局部光影", notes: "層板書架上的書籍擺設可點綴色彩。" },
      { code: "212甲", title: "模擬考視角 (甲向)", variants: ["甲"], focus: "整體表現、快速上色與時間控管", notes: "考前用來練完整節奏最好。" },
      { code: "212乙", title: "模擬考視角 (乙向)", variants: ["乙"], focus: "透視比例精準度與快乾筆法", notes: "利用麥克筆寬面快速鋪底色。" },
      { code: "212丙", title: "模擬考視角 (丙向)", variants: ["丙"], focus: "陰影層次、點睛色點綴與細部收拾", notes: "最後 10 分鐘用代針筆加強輪廓線。" },
    ],
  },
  {
    slug: "detail",
    eyebrow: "Detail Collection",
    title: "大樣圖 213-224",
    summary: "以節點卡牆呈現收邊、接縫、櫃體、燈槽與材料交接的大樣整理。",
    visualNote: "讓大樣圖像美術館藏品一樣被放大觀看，專注細部扣分點。",
    items: Array.from({ length: 12 }, (_, index) => {
      const code = String(213 + index);
      return {
        code,
        title: `大樣節點 ${code}`,
        variants: ["尺度", "材質", "做法"],
        focus: "節點關係、材料厚度與尺寸標註",
        notes: "建議搭配扣分點清單一起做考前複盤。",
      };
    }),
  },
];

export const sampleUploads: UploadEntry[] = [];
