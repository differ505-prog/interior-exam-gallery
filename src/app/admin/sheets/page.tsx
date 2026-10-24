import type { Metadata } from "next";
import { SheetRegistryPanel } from "@/components/admin/sheet-registry-panel";

export const metadata: Metadata = {
  title: "建檔中心｜乙級術科",
  robots: { index: false, follow: false },
};

export default function SheetRegistryPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-10)" }}>
      <SheetRegistryPanel />
    </main>
  );
}