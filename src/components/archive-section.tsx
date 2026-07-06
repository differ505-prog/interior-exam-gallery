import { ArchiveSection } from "@/types/exam";
import { ArchiveSectionClient } from "@/components/archive-section-client";
import { getRecentUploads } from "@/lib/uploads";

export async function ArchiveSectionBlock({ section }: { section: ArchiveSection }) {
  const uploads = await getRecentUploads().catch(() => []);

  return <ArchiveSectionClient section={section} uploads={uploads} />;
}