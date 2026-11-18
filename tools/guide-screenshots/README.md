# 使用指南截圖產生器

重新產生 `guide/*.jpg`（`guide.html` 用的截圖）。會在無頭 Chromium 裡跑真正的 App，
以記憶體中的假 Firebase 載入虛構示範資料（小安／阿傑／小美的「京都五日遊」），
並用橘色外框標出每個步驟要按的按鈕。不需要網路，也不會碰到真實帳號資料。

```bash
cd tools/guide-screenshots
npm install
npx playwright install chromium   # 第一次才需要
npm run shoot
```

- 截圖流程與標示的按鈕寫在 `shoot.js`；介面文字改了，對應的 selector 也要跟著改
- 示範資料在 `shoot.js` 的 `SEED`
- `firebase-stub.js` 只提供畫面需要的最小 Firebase API
