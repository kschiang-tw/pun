# Pun — Travel Expense Splitter

Travel expense splitting app for groups — multi-currency, offline-ready PWA.

## 💡 Naming Strategy / 命名由來

The name **"Pun"** comes from the Taiwanese Romanization (Tâi-lô) of the word **「分」 (pun)**, which means "to share" or "to split."

It perfectly encapsulates the two core pillars of the app:
1. **Split**: Effortlessly splitting expenses among friends.
2. **Share**: Focusing on the joy of sharing travels rather than the stress of calculating debts.

**「Pun」** 的命名靈感來自「分」的台語羅馬拼音（pun）。

這個名字精確地傳遞了此 App 的核心理念：
1. **分攤**：輕鬆處理旅程中複雜的費用分攤。
2. **分享**：將繁瑣的計算留給程式，把寶貴的時間留給與旅伴分享的風景。

## Features

- Multi-currency expense tracking with automatic conversion
- Real-time sync via Firebase Firestore
- Offline-ready PWA (installable on iOS & Android)
- Expense splitting across group members
- Google Drive backup support
- Google Sign-In & email link authentication

## Tech Stack

- Vanilla JS + JSX (no build step)
- Firebase Auth + Firestore
- Service Worker for offline support
- Google Drive API for backup

## Project Structure

| File | Description |
|------|-------------|
| `index.html` | Main page, loads all JS/CSS |
| `store.jsx` | Firebase Auth + Firestore state management |
| `app-shell.jsx` | HomeScreen, bottom navigation |
| `app-screens.jsx` | TripScreen, TripMenu, member views |
| `app-secondary.jsx` | Add/edit trip and other secondary screens |
| `app-forms.jsx` | Expense entry forms |
| `auth.jsx` | Login screen (email link + Google Sign-In) |
| `engine.js` | Expense calculation logic |
| `currencies.js` | Currency list and conversion |
| `version.js` | App version number |

## Notes

- iOS PWA standalone mode uses GSI `renderButton` (popup not supported)
- Standard browsers use `signInWithPopup`
- Firebase project: `pun-github-5329b`
