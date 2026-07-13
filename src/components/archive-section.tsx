import { ArchiveSection } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { ArchiveSectionClient } from "@/components/archive-section-client";
import { getRecentUploads } from "@/lib/uploads";

export async function ArchiveSectionBlock({ section, examNotes }: { section: ArchiveSection; examNotes?: ExamNoteCategory[] }) {
  const uploads = await getRecentUploads().catch(() => []);

  return <ArchiveSectionClient section={section} uploads={uploads} examNotes={examNotes} />;
}