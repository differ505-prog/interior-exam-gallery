import { ArchiveSection } from "@/types/exam";

export function ArchiveSectionBlock({ section }: { section: ArchiveSection }) {
  return (
    <section className="archive-block" id={section.slug}>
      <div className="archive-heading">
        <p className="eyebrow">{section.eyebrow}</p>
        <div>
          <h2>{section.title}</h2>
          <p>{section.summary}</p>
        </div>
      </div>
      <div className="archive-note">
        <span>策展閱讀方式</span>
        <p>{section.visualNote}</p>
      </div>
      <div className="archive-grid">
        {section.items.map((item) => (
          <article className="archive-card" key={`${section.slug}-${item.code}`}>
            <div className="archive-card-top">
              <p>{item.code}</p>
              <span>{item.variants.join(" / ")}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.focus}</p>
            <small>{item.notes}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
