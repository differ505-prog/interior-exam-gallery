import { ArchiveSection } from "@/types/exam";
import { ArchiveCard } from "@/components/archive-card";
import { getRecentUploads } from "@/lib/uploads";

export async function ArchiveSectionBlock({ section }: { section: ArchiveSection }) {
  const uploads = await getRecentUploads().catch(() => []);

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
        {section.items.map((item) => {
          const matchedUploads = uploads.filter(
            (u) => u.sheetCode.trim().toLowerCase() === item.code.trim().toLowerCase()
          );
          return (
            <ArchiveCard
              item={item}
              key={`${section.slug}-${item.code}`}
              sectionSlug={section.slug}
              uploads={matchedUploads}
            />
          );
        })}
      </div>
    </section>
  );
}