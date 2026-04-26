# Changelog

## v2.3.22 (2026-04-27)
### 修正
- 找到並修正 Nepal 行程消失的真正原因
  - 當兩個 Firestore subscription（owned/shared）其中一個先 fire 空結果時，
    800ms 計時到後 recovery 路徑（`getLocalIds()` → `doc.get()`）會把旅程撈進來
  - Recovery 路徑呼叫了 `SET_TRIP` 但沒更新 `prevRef.current`
  - 導致 write effect 看到 `prevNull: true` → 重寫 Firestore（WRITE 在 Firestore 事件之前）
  - 修正：recovery / migration 路徑在 `localDispatch` 前也預先填 `prevRef.current`

## v2.3.21 (2026-04-27)
### 修正
- 移除 `markReady` 重複呼叫 `applyChanges` 的問題
  - 原本第一次 snapshot 時 `applyChanges` 被呼叫兩次
  - 第二次呼叫觸發 SET_TRIP isMe merge，對非 me 成員加上 `isMe: false`
  - 導致 prevRef 與 state.trips JSON 不同 → write effect 重複寫 Firestore
- 加入 console.log debug 輸出（`[pun] Firestore`、`[pun] WRITE`、`[pun] DELETE`、`[pun] RESET`）

## v2.3.20 (2026-04-27)
### 修正
- 修正 iOS 每次重開 app 後旅程消失的問題（Nepal bug）
  - 移除不可靠的 SESSION_ID echo guard 方案
  - 改為在 `applyChanges` 時立即預填 `prevRef.current`，防止 write effect 誤判並重複寫入 Firestore

## v2.3.19 (2026-04-27)
### 修正
- 嘗試用 session-scoped ID 取代 DEVICE_ID 作為 echo guard（未完全修復）

## v2.3.18 (2026-04-27)
### 修正
- 修正加入旅程時，擁有者的裝置看不到新成員的問題
  - `joinTripByCode` 加入 `_by: 'join:' + uid` 繞過 echo guard

## v2.3.17 (2026-04-26)
### 新增
- TripMenu（三個點）的「邀請旅伴」下方顯示已加入旅程的 Google 帳號名單
- 新增旅程時自動建立 `accessList`，加入邀請碼時同步更新
- HomeScreen 底部顯示最後同步時間

## v2.3.16 (2026-04-26)
### 修正
- 修正 GSI `origin_mismatch` 錯誤：改用 pun-github 自有的 OAuth client ID

## v2.3.15 (2026-04-26)
### 新增
- iOS PWA standalone 模式改用 Google Identity Services (GSI) `renderButton`
  - 解決 PWA 無法使用 `signInWithPopup` 的問題
  - 使用 FedCM API，不需要重新導向

## v2.3.14 (2026-04-25)
### 修正
- 只在 PWA standalone 模式停用 Google popup 登入，一般瀏覽器維持原有行為

## v2.3.13 (2026-04-25)
### 修正
- 修正 Google 登入無限迴圈問題：iOS 改用 email link 登入

## v2.3.12 (2026-04-24)
### 修正
- 新用戶才顯示範例旅程，回訪用戶不再重新產生範例資料（`pun_ever_had_trips` flag）

## v2.3.11 (2026-04-24)
### 修正
- 修正重新整理後資料消失的問題
  - 加入 localStorage 舊資料自動遷移至 Firestore
  - 加入本地 trip ID 登記（`pun_local_trip_ids`）
  - 加入孤兒 Firestore 旅程救回機制

## v2.3.10 (2026-04-23)
### 新增
- 設定頁面加入登出按鈕，顯示目前登入的帳號資訊

## v2.3.9 (2026-04-23)
### 修正
- Firestore 寫入加入 try-catch 防止崩潰
- 加入全域錯誤提示 overlay

## v2.3.8 (2026-04-22)
### 新增
- 加入 Error Boundary，崩潰時顯示錯誤詳細資訊
- 結算畫面加入「匯出」按鈕

## v2.3.7 (2026-04-22)
### 修正
- 修正 PDF 匯出速度過慢的問題：改用 blob window 取代 `window.print()`

## v2.3.6 (2026-04-21)
### 修正
- 修正 iOS Google 登入問題：改用 `signInWithRedirect` 並處理 redirect result

## v2.3.5 (2026-04-21)
### 修正
- 修正快取過舊的問題：升級 Service Worker 版本至 pun-v5

## v2.3.4 (2026-04-20)
### 修正
- 修正 `CREATE_TRIP` 未傳入 `ownerId` 導致旅程無法正確歸屬的問題

## v2.3.3 (2026-04-20)
### 修正
- 修正「清除範例資料」按鈕：改用 `isDemo` flag 找旅程，而非寫死 id

## v2.3.2 (2026-04-20)
### 修正
- 修正空白頁面：移除已不存在的 `AuthProvider` wrapper

## v2.3.1 (2026-04-19)
### 修正
- 移除選單中的 Google Drive 同步選項
- 所有旅程都顯示「邀請旅伴」按鈕

## v2.3.0 (2026-04-19)
### 新增
- 完整 Firebase Auth 登入系統（email link + Google Sign-In）
- 每個旅程獨立存於 Firestore，支援多裝置同步
- 旅程邀請碼系統（`/invites` collection）
- URL `?invite=CODE` 自動加入旅程

## v2.0.0 (2026-04-18)
### 新增
- 版本管理：加入 `version.js` 與 `bump.sh`
- 重新設計同步架構：Firestore 取代 localStorage + Google Drive
- Firebase Firestore 即時協作旅程共享
