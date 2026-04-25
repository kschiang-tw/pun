// sync-gdrive.jsx — Google Drive sync for pun
//
// Setup:
//  1. Go to https://console.cloud.google.com/ → New project
//  2. Enable "Google Drive API"
//  3. Create "OAuth 2.0 Client ID" (Web application)
//  4. Add http://localhost:8000 as Authorized JavaScript origin
//  5. Paste your client ID below

const GDRIVE_CLIENT_ID = '70246720877-srg60gr093bhfb081b0ol1f4nrn35h1b.apps.googleusercontent.com';
const STORE_KEY = 'splittrip_v1';
const SYNC_META_KEY = 'pun_sync_meta';
const FILE_NAME = 'pun_data.json';
const SPACE = 'appDataFolder';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const GDriveSync = (() => {
  let tokenClient = null;
  let accessToken = null;
  let cachedFileId = null;
  const listeners = new Set();
  let _state = { status: 'idle', lastSynced: null, error: null };

  function emit() { listeners.forEach(fn => fn({ ..._state })); }
  function set(patch) { _state = { ..._state, ...patch }; emit(); }

  function subscribe(fn) {
    listeners.add(fn);
    fn({ ..._state });
    return () => listeners.delete(fn);
  }

  function isConfigured() {
    return !GDRIVE_CLIENT_ID.startsWith('YOUR_');
  }

  async function apiFetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${accessToken}`, ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive ${res.status}: ${err.slice(0, 120)}`);
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('json') ? res.json() : {};
  }

  async function findFile() {
    if (cachedFileId) return cachedFileId;
    const data = await apiFetch(
      `https://www.googleapis.com/drive/v3/files?spaces=${SPACE}&q=name='${FILE_NAME}'&fields=files(id)`
    );
    cachedFileId = data.files?.[0]?.id || null;
    return cachedFileId;
  }

  async function readFile(id) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Drive read ${res.status}`);
    return res.json();
  }

  async function writeFile(payload, id) {
    const body = JSON.stringify(payload);
    if (id) {
      await apiFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }
      );
      return id;
    }
    const b = 'pun_sync_boundary';
    const meta = JSON.stringify({ name: FILE_NAME, parents: [SPACE] });
    const multipart = `--${b}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
    const res = await apiFetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,
      { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body: multipart }
    );
    cachedFileId = res.id;
    return res.id;
  }

  async function doSync() {
    set({ status: 'syncing', error: null });
    try {
      const localRaw = localStorage.getItem(STORE_KEY) || '{}';
      const localState = JSON.parse(localRaw);
      const meta = JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
      const localTs = meta.uploadedAt || 0;

      const fileId = await findFile();

      if (fileId) {
        const remote = await readFile(fileId);
        const remoteTs = remote._syncTs || 0;

        if (remoteTs > localTs) {
          // Remote is newer — pull down
          const { _syncTs, ...remoteState } = remote;
          localStorage.setItem(STORE_KEY, JSON.stringify(remoteState));
          localStorage.setItem(SYNC_META_KEY, JSON.stringify({ uploadedAt: remoteTs }));
          set({ status: 'synced', lastSynced: new Date() });
          window.location.reload();
          return;
        }
      }

      // Local is up to date or newer — push up
      const now = Date.now();
      const payload = { ...localState, _syncTs: now };
      await writeFile(payload, fileId || null);
      localStorage.setItem(SYNC_META_KEY, JSON.stringify({ uploadedAt: now }));
      set({ status: 'synced', lastSynced: new Date() });
    } catch (e) {
      set({ status: 'error', error: e.message });
    }
  }

  function requestSync() {
    if (!isConfigured()) {
      alert('請先設定 Google Client ID。\n\n步驟：\n1. 到 Google Cloud Console 建立專案\n2. 啟用 Drive API\n3. 建立 OAuth 2.0 用戶端 ID（網路應用程式）\n4. 加入 http://localhost:8000 為授權來源\n5. 將 ID 貼入 sync-gdrive.jsx 的 GDRIVE_CLIENT_ID');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      set({ status: 'error', error: 'Google Identity Services 未載入' });
      return;
    }
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GDRIVE_CLIENT_ID,
        scope: SCOPE,
        callback: async (resp) => {
          if (resp.error) { set({ status: 'error', error: resp.error }); return; }
          accessToken = resp.access_token;
          await doSync();
        },
      });
    }
    if (accessToken) {
      doSync();
    } else {
      set({ status: 'syncing' });
      tokenClient.requestAccessToken();
    }
  }

  return { subscribe, requestSync, isConfigured };
})();

window.GDriveSync = GDriveSync;

function SyncButton() {
  const [sync, setSync] = React.useState({ status: 'idle', lastSynced: null, error: null });

  React.useEffect(() => GDriveSync.subscribe(setSync), []);

  const { status, lastSynced, error } = sync;
  const spinning = status === 'syncing';

  const label = status === 'synced'
    ? (lastSynced ? `已同步 ${lastSynced.toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit' })}` : '已同步')
    : status === 'error' ? '同步失敗'
    : 'Google Drive 同步';

  const color = status === 'synced' ? 'var(--pos)' : status === 'error' ? 'var(--neg)' : 'var(--ink-2)';

  return (
    <button
      onClick={GDriveSync.requestSync}
      title={error || label}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', background: 'var(--surface)', color,
        flexShrink: 0,
      }}
    >
      {spinning ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="18" height="18"
          style={{ animation: 'pun-spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : status === 'synced' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 0 9"/>
          <path d="m9 15 2 2 4-4"/>
        </svg>
      ) : status === 'error' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 0 9"/>
          <path d="M12 12v4M12 18h.01"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 0 9"/>
          <path d="M12 22V13"/>
          <path d="m8 17 4-4 4 4"/>
        </svg>
      )}
      <style>{`@keyframes pun-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

window.SyncButton = SyncButton;
