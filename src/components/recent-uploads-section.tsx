import { Suspense } from "react";
import { EmptyState, SectionHeading, SkeletonGrid, SurfacePanel } from "@/components/ui/primitives";
import { RecentUploads } from "@/components/recent-uploads";
import { getRecentUploads } from "@/lib/uploads";

/**
 * AsyncUploadsSection
 * 使用 Suspense + SkeletonGrid 作為 fallback，
 * 並在錯誤狀態時透過 EmptyState 顯示防禦性 UI（憲法第 7 條）。
 */
export async function AsyncUploadsSection() {
  return (
    <SurfacePanel ariaLabel="最近上傳" id="recent-uploads">
      <SectionHeading
        anchor="recent-uploads-title"
        description="你的練習與收藏。附自評、扣分點與複盤。"
        eyebrow="Critique Wall"
        title="最近上傳"
      />
      <Suspense fallback={<SkeletonGrid ariaLabel="載入最近上傳中" count={6} />}>
        <RecentUploadsLoader />
      </Suspense>
    </SurfacePanel>
  );
}

async function RecentUploadsLoader() {
  const uploads = await getRecentUploads().catch(() => []);
  if (!uploads || uploads.length === 0) {
    return (
      <EmptyState
        description="完成第一張上傳後，複盤牆就會在這裡展開。"
        title="尚無上傳"
      />
    );
  }
  return <RecentUploads uploads={uploads} />;
}