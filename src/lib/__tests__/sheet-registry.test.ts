import { describe, expect, it } from "vitest";
import {
  applyApprove,
  applyDiscard,
  applyRollback,
  applyStage,
  buildRegistryKey,
  buildSectionCoverage,
  createRecord,
  parseRegistryKey,
  resolveSlotUrl,
} from "@/lib/sheet-registry";
import type { ArchiveItem } from "@/types/exam";

const NOW = "2026-10-22T12:00:00.000Z";
const LATER = "2026-10-22T13:00:00.000Z";

function item(code: string): ArchiveItem {
  return {
    code,
    title: code,
    variants: [],
    focus: "",
    notes: "",
  };
}

describe("registry key", () => {
  it("組裝與解析互為逆運算", () => {
    const key = buildRegistryKey("plan", "201A", "question");
    expect(key).toBe("plan:201A:question");
    expect(parseRegistryKey(key)).toEqual({
      sectionSlug: "plan",
      code: "201A",
      slot: "question",
    });
  });

  it("非法 slot 回傳 null", () => {
    expect(parseRegistryKey("plan:201A:answer2")).toBeNull();
    expect(parseRegistryKey("plan-201A")).toBeNull();
  });
});

describe("狀態機", () => {
  it("待核准不會變成生效（治理不變式）", () => {
    const staged = applyStage(
      createRecord("plan", "201A", "question", NOW),
      "u1",
      NOW,
    );
    expect(staged.stagedUrl).toBe("u1");
    expect(resolveSlotUrl(staged)).toBeNull();
  });

  it("核准後生效，舊生效降級為上一版", () => {
    const first = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    const second = applyApprove(applyStage(first, "u2", LATER), LATER);
    expect(resolveSlotUrl(second)).toBe("u2");
    expect(second.prevUrl).toBe("u1");
    expect(second.stagedUrl).toBeNull();
  });

  it("撤銷不影響生效版本", () => {
    const live = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    const discarded = applyDiscard(applyStage(live, "u2", LATER), LATER);
    expect(discarded.stagedUrl).toBeNull();
    expect(resolveSlotUrl(discarded)).toBe("u1");
  });

  it("回滾為互換，可再核准還原", () => {
    const live = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    const newer = applyApprove(applyStage(live, "u2", LATER), LATER);
    const rolled = applyRollback(newer, LATER);
    expect(resolveSlotUrl(rolled)).toBe("u1");
    expect(rolled.prevUrl).toBe("u2");
  });

  it("無上一版時回滾為 no-op", () => {
    const live = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    expect(applyRollback(live, LATER)).toEqual(live);
  });
});

describe("覆蓋率", () => {
  it("無任何圖檔時全數列入缺圖", () => {
    const registry = {};
    const probe = {};
    const coverage = buildSectionCoverage(
      "detail",
      [item("214"), item("215")],
      registry,
      probe,
    );
    expect(coverage.totalCodes).toBe(2);
    expect(coverage.missingCodes).toEqual(["214", "215"]);
  });

  it("磁碟探測為 false 才算缺圖（不會誤報）", () => {
    const registry = {};
    const probe = {
      "detail:214:question": false,
      "detail:214:answer": false,
      "detail:215:question": true,
      "detail:215:answer": true,
    };
    const coverage = buildSectionCoverage(
      "detail",
      [item("214"), item("215")],
      registry,
      probe,
    );
    expect(coverage.missingCodes).toEqual(["214"]);
  });

  it("待核准數量正確計入", () => {
    const registry = {
      "detail:214:question": applyStage(
        createRecord("detail", "214", "question", NOW),
        "u1",
        NOW,
      ),
    };
    const coverage = buildSectionCoverage("detail", [item("214")], registry, {});
    expect(coverage.pendingCount).toBe(1);
  });
});