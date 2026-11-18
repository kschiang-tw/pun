# pun — Claude 工作規則

## 每次修改後的固定流程

1. 更新 `version.js` 版號（規則如下），並同步把 `sw.js` 的 `CACHE` 名稱 +1（例如 `pun-v29` → `pun-v30`）
2. **檢查使用指南（操作手冊）是否需要更新**（見下方「使用指南檢查」）
3. 更新 `CHANGELOG.md`（開發日誌），在最上方加入新版本的條目，條目最後一行註明使用指南檢查結果：
   `- 使用指南：已更新（改了哪些段落／截圖）` 或 `- 使用指南：不需更新（原因）`
4. `git add` 所有修改的檔案（包含 `version.js`、`CHANGELOG.md`，以及有改到的 `guide.html`、`guide/`）
5. `git commit` + `git push` 到 https://github.com/kschiang-tw/pun

**不論是新功能、bug fix、還是小調整，都要執行這個流程。**

## 使用指南檢查（每次更新都要做）

`guide.html` 是給旅伴看的操作手冊，App 內「使用說明」也是同一份。每次修改後逐項確認：

- **按鈕名稱、畫面文字、操作步驟**有沒有改？→ 更新 `guide.html` 對應段落（含常見問題）
- **畫面外觀**有沒有改到指南截圖裡的畫面？→ 重新產生截圖：`cd tools/guide-screenshots && npm install && npm run shoot`
  - 若按鈕文字變了，要先改 `shoot.js` 裡對應的 selector
- **新功能**旅伴會用到嗎？→ 在 `guide.html` 對應的時間軸段落（出發前／旅途中／回國後）加一步或加一題常見問題
- **網頁 App（加到主畫面）**的情境也要顧到：主要使用者是把 pun 加到主畫面使用，說明要以主畫面 App 為準（登入、邀請碼、離線、更新方式）
- 純內部修改（重構、效能、資料修正）不影響操作時，註明「不需更新」即可

## 版號規則（語意化版本）

格式：`主版本.次版本.修訂號`（例如 `2.3.20`）

| 情況 | 改哪一碼 | 範例 |
|------|----------|------|
| 修小 bug、微調樣式 | 修訂號 +1 | 2.3.20 → 2.3.21 |
| 修較多內容、中型功能調整 | 次版本 +1，修訂號歸零 | 2.3.20 → 2.4.0 |
| 新增全新功能 | 主版本 +1，其餘歸零 | 2.3.20 → 3.0.0 |

## 專案結構

| 檔案 | 說明 |
|------|------|
| `index.html` | 主頁面，載入所有 JS/CSS |
| `store.jsx` | Firebase Auth + Firestore 狀態管理 |
| `app-shell.jsx` | HomeScreen、底部導覽列 |
| `app-screens.jsx` | TripScreen、TripMenu、成員畫面 |
| `app-secondary.jsx` | 新增旅程、編輯旅程等次要畫面 |
| `auth.jsx` | 登入畫面（email link + Google Sign-In） |
| `version.js` | App 版本號 |
| `guide.html` | 使用指南（獨立網頁；App 內「使用說明」以 iframe 嵌入同一份） |
| `guide/` | 使用指南截圖（由 `tools/guide-screenshots` 產生） |
| `tools/guide-screenshots/` | 用示範資料重新產生指南截圖：`npm install && npm run shoot` |

## 技術筆記

- iOS PWA standalone 模式用 GSI `renderButton`（不能用 popup）
- 一般瀏覽器用 `signInWithPopup`
- Firebase project: `pun-github-5329b`
- GSI Client ID: `70246720877-srg60gr093bhfb081b0ol1f4nrn35h1b.apps.googleusercontent.com`
