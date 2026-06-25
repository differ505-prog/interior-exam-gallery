import { ArchiveSectionBlock } from "@/components/archive-section";
import { RecentUploads } from "@/components/recent-uploads";
import { UploadStudio } from "@/components/upload-studio";
import { examSections } from "@/data/exam-content";
import { getRecentUploads } from "@/lib/uploads";

const quickLinks = [
  { href: "#plan", label: "平面圖 201-206" },
  { href: "#ceiling-elevation", label: "天花板圖 / 立面圖" },
  { href: "#perspective", label: "透視圖 207-212" },
  { href: "#detail", label: "大樣圖 213-224" },
  { href: "#upload-studio", label: "上傳練習圖" },
];

const metrics = [
  { label: "平面圖版本", value: "30" },
  { label: "透視視角", value: "18" },
  { label: "大樣節點", value: "12" },
  { label: "練習複盤模組", value: "遠端同步" },
];

export default async function HomePage() {
  const uploads = await getRecentUploads();

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Draft Gallery 乙級術科</p>
            <h1>把術科圖面整理成可閱讀、可上傳、可複盤的圖庫藝廊</h1>
          </div>
          <nav>
            {quickLinks.map((link) => (
              <a href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p>
              這不是補習班式的資料堆疊，而是一個有策展感的應考網站。你可以用畫廊式節奏查看平面圖、立面圖、透視圖與大樣圖，也可以把自己的練習圖和他人範例圖上傳到遠端圖庫，逐張寫下自評缺點與扣分點。
            </p>
            <div className="hero-actions">
              <a className="solid-link" href="#upload-studio">
                立即建立我的複盤牆
              </a>
              <a className="ghost-link" href="#recent-uploads">
                查看最近上傳
              </a>
            </div>
          </div>
          <aside className="hero-card">
            <span>本週練習動線</span>
            <ol>
              <li>先看 201A 平面圖與客廳立面</li>
              <li>再練 208 乙向透視與吊燈構圖</li>
              <li>最後複盤 216 大樣節點與扣分點</li>
            </ol>
          </aside>
        </div>

        <div className="metric-row">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-panel">
        <div>
          <p className="eyebrow">Curated Workflow</p>
          <h2>左側索引、中央圖面、右側複盤，維持安靜但專業的閱讀節奏</h2>
        </div>
        <p>
          網站介面以暖白、炭黑、霧金與灰綠作為核心色，讓圖面像展覽作品一樣被觀看，資訊則維持最少但最有用。適合長時間備考，不會被雜訊打斷。
        </p>
      </section>

      {examSections.map((section) => (
        <ArchiveSectionBlock key={section.slug} section={section} />
      ))}

      <UploadStudio />

      <section className="recent-section" id="recent-uploads">
        <div className="archive-heading">
          <p className="eyebrow">Recent Critiques</p>
          <div>
            <h2>最近上傳與複盤</h2>
            <p>
              這裡會顯示你的練習圖與收藏範例圖，每張都附上自評缺點、扣分點與整理者資訊。
            </p>
          </div>
        </div>
        <RecentUploads uploads={uploads} />
      </section>
    </main>
  );
}
