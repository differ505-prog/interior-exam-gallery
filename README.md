# Draft Gallery 乙級術科

高級畫廊感的室內設計乙級術科準備網站，包含：

- 平面圖 `201-206` 與 `A-E` 版本整理
- 天花板圖與立面圖（客廳 / 主臥 / 餐廳）
- 透視圖 `207-212` 與 `甲乙丙` 三向整理
- 大樣圖 `213-224`
- 練習圖與他人範例圖上傳
- 每張圖的自評缺點、扣分點與綜合複盤
- Supabase 遠端圖庫與 Vercel 部署流程

## 本機開發

```bash
npm install
npm run dev
```

預設會載入展示資料。若要啟用遠端上傳，請設定 Supabase。

## 環境變數

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

填入以下內容：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=practice-images
```

## Supabase 設定

1. 建立一個新的 Supabase 專案。
2. 在 SQL Editor 執行 `supabase/schema.sql`。
3. 確認 Storage bucket 名稱為 `practice-images`，或同步修改環境變數。
4. 取出 `Project URL`、`anon key`、`service role key`。

## Vercel 部署

1. 把專案推到 GitHub。
2. 在 Vercel 匯入 GitHub repository。
3. 將 `.env.local` 內的四個變數填入 Vercel Project Settings。
4. Deploy 後即可獲得遠端網站與遠端圖檔上傳。

## 建議後續擴充

- 加入登入與個人收藏牆
- 增加圖面左右比對模式
- 加入練習計時器與模擬考模式
- 替每張圖建立評分量表
