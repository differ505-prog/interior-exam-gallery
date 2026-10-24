/**
 * curator-token.ts
 *
 * 建檔中心管理密碼的瀏覽器端存取。
 *
 * 資安紀律（憲法第九條）：
 * - 真實 token 僅存在 server-side 環境變數 CURATOR_TOKEN，絕不打包進 client bundle
 * - 瀏覽器端只保存於 sessionStorage（關閉分頁即失效），且僅作為 request header 送出
 * - 本模組不 import 任何 server-only 模組，故可安全用於 client component
 */

/** curator token 的瀏覽器端儲存 key（sessionStorage，關閉分頁即失效） */
export const CURATOR_TOKEN_STORAGE_KEY = "sheet_registry_token";

export function getCuratorToken(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(CURATOR_TOKEN_STORAGE_KEY) ?? "";
}

export function setCuratorToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CURATOR_TOKEN_STORAGE_KEY, token);
}

export function clearCuratorToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CURATOR_TOKEN_STORAGE_KEY);
}