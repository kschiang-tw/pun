# pun — Claude 工作規則

## 每次修改後的固定流程

1. 更新 `version.js` 版號（規則如下）
2. 更新 `CHANGELOG.md`，在最上方加入新版本的條目
3. `git add` 所有修改的檔案（包含 `version.js` 和 `CHANGELOG.md`）
4. `git commit` + `git push` 到 https://github.com/kschiang-tw/pun

**不論是新功能、bug fix、還是小調整，都要執行這個流程。**

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

## 技術筆記

- iOS PWA standalone 模式用 GSI `renderButton`（不能用 popup）
- 一般瀏覽器用 `signInWithPopup`
- Firebase project: `pun-github-5329b`
- GSI Client ID: `70246720877-srg60gr093bhfb081b0ol1f4nrn35h1b.apps.googleusercontent.com`
