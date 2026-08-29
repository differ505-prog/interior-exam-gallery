import { ArchiveSection } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { ArchiveSectionClient } from "@/components/archive-section-client";
import { kvGetAllEntries, hasKvEnv } from "@/lib/kv-store";
import { sampleUploads } from "@/data/exam-content";

export async function ArchiveSectionBlock({ section, examNotes }: { section: ArchiveSection; examNotes?: ExamNoteCategory[] }) {
  let uploads: import("@/types/exam").UploadEntry[] = [];
  if (hasKvEnv()) {
    try {
      uploads = await kvGetAllEntries();
    } catch {
      uploads = [];
    }
  }
  if (!uploads.length) uploads = sampleUploads;

  return <ArchiveSectionClient section={section} uploads={uploads} examNotes={examNotes} />;
}