// sync-firebase.jsx — Firestore real-time collaborative sync
//
// Setup:
//  1. Go to https://console.firebase.google.com/ → New project
//  2. Add a Web app (</> icon) → copy the firebaseConfig below
//  3. Build → Firestore Database → Create database (Start in test mode)
//  4. Paste your config into FIREBASE_CONFIG below

const FIREBASE_CONFIG = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

// ── Device fingerprint (prevents echoing back own writes) ───────────────────
const DEVICE_ID = (() => {
  const k = 'pun_device_id';
  return localStorage.getItem(k) || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(k, id);
    return id;
  })();
})();

// ── FirestoreSync module ────────────────────────────────────────────────────
const FirestoreSync = (() => {
  let db = null;
  const listeners = {};       // shareId → unsubscribe fn
  const pendingRemote = new Set();  // shareIds mid-remote-update

  function isConfigured() {
    return !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
  }

  function init() {
    if (db) return true;
    if (!window.firebase) return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      return true;
    } catch (e) {
      console.error('[Firestore] init:', e);
      return false;
    }
  }

  function ref(shareId) {
    return db.collection('trips').doc(shareId);
  }

  async function shareTrip(trip) {
    if (!init()) throw new Error('Firebase 尚未設定，請先填入 FIREBASE_CONFIG');
    const shareId = trip.shareId || Math.random().toString(36).slice(2, 8).toUpperCase();
    await ref(shareId).set({
      ...trip,
      shareId,
      _deviceId: DEVICE_ID,
      _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return shareId;
  }

  async function joinTrip(rawCode) {
    if (!init()) throw new Error('Firebase 尚未設定');
    const shareId = rawCode.trim().toUpperCase();
    if (shareId.length < 4) throw new Error('分享碼格式不對');
    const snap = await ref(shareId).get();
    if (!snap.exists) throw new Error('找不到旅程，請再確認分享碼');
    const { _deviceId, _updatedAt, ...trip } = snap.data();
    return trip;
  }

  function subscribe(shareId, onUpdate) {
    if (!init()) return;
    unsubscribe(shareId);
    const unsub = ref(shareId).onSnapshot(snap => {
      if (!snap.exists) return;
      const raw = snap.data();
      if (raw._deviceId === DEVICE_ID) return;  // own write, skip
      const { _deviceId, _updatedAt, ...trip } = raw;
      pendingRemote.add(shareId);
      onUpdate(trip);
      setTimeout(() => pendingRemote.delete(shareId), 500);
    }, err => console.warn('[Firestore] snapshot:', err));
    listeners[shareId] = unsub;
  }

  function unsubscribe(shareId) {
    if (listeners[shareId]) { listeners[shareId](); delete listeners[shareId]; }
  }

  function isReceivingRemote(shareId) {
    return pendingRemote.has(shareId);
  }

  function push(shareId, trip) {
    if (!init() || !shareId) return;
    ref(shareId).set({
      ...trip,
      _deviceId: DEVICE_ID,
      _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(e => console.warn('[Firestore] push:', e));
  }

  return { isConfigured, shareTrip, joinTrip, subscribe, unsubscribe, push, isReceivingRemote };
})();

window.FirestoreSync = FirestoreSync;

// ── FirebaseBridge: wires Firestore ↔ store ─────────────────────────────────
function FirebaseBridge() {
  const [state, dispatch] = useStore();
  const prevRef = React.useRef(state.trips);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);

  // Subscribe to all shared trips
  const sharedKey = Object.values(state.trips)
    .filter(t => t.shareId).map(t => t.shareId).sort().join(',');

  React.useEffect(() => {
    if (!FirestoreSync.isConfigured()) return;
    const shared = Object.values(state.trips).filter(t => t.shareId);
    shared.forEach(trip =>
      FirestoreSync.subscribe(trip.shareId, remote => {
        if (!alive.current) return;
        dispatch({ type: 'FIREBASE_UPDATE_TRIP', trip: remote });
      })
    );
    return () => shared.forEach(t => FirestoreSync.unsubscribe(t.shareId));
  }, [sharedKey]); // eslint-disable-line

  // Push local edits to Firestore
  React.useEffect(() => {
    const prev = prevRef.current;
    const curr = state.trips;
    Object.values(curr).forEach(trip => {
      if (!trip.shareId) return;
      if (FirestoreSync.isReceivingRemote(trip.shareId)) return;
      const p = prev[trip.id];
      if (!p) return; // brand-new join — don't push
      if (JSON.stringify(p) !== JSON.stringify(trip)) {
        FirestoreSync.push(trip.shareId, trip);
      }
    });
    prevRef.current = curr;
  }, [state.trips]); // eslint-disable-line

  return null;
}

window.FirebaseBridge = FirebaseBridge;

// ── ShareSheet ───────────────────────────────────────────────────────────────
function ShareSheet({ trip, onClose }) {
  const [, dispatch] = useStore();
  const [phase, setPhase] = React.useState(trip.shareId ? 'done' : 'idle');
  const [shareId, setShareId] = React.useState(trip.shareId || '');
  const [err, setErr] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  async function activate() {
    if (!FirestoreSync.isConfigured()) {
      setErr('請先到 sync-firebase.jsx 填入 Firebase 設定。');
      return;
    }
    setPhase('loading');
    try {
      const id = await FirestoreSync.shareTrip(trip);
      dispatch({ type: 'SET_SHARE_ID', tripId: trip.id, shareId: id });
      setShareId(id);
      setPhase('done');
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  }

  function copy() {
    navigator.clipboard?.writeText(shareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function share() {
    const url = `${location.origin}${location.pathname}?join=${shareId}`;
    if (navigator.share) navigator.share({ title: trip.title, text: `加入旅程：${trip.title}`, url });
    else copy();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `24px 24px max(32px, env(safe-area-inset-bottom, 32px))`,
      }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--ink-4)', margin: '0 auto 22px' }}/>

        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>即時共享旅程</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
          旅伴用分享碼加入後，任何人新增或修改支出，所有成員即時同步。
        </div>

        {phase === 'idle' && (
          <button onClick={activate} style={{
            width: '100%', border: 0, borderRadius: 14, background: 'var(--ink)',
            color: 'var(--bg)', padding: 14, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>建立共享連結</button>
        )}

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>建立中…</div>
        )}

        {phase === 'done' && (
          <>
            <div style={{
              background: 'var(--surface)', borderRadius: 16, padding: '18px 20px',
              textAlign: 'center', marginBottom: 14,
              border: '0.5px solid var(--hairline)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.6, marginBottom: 8 }}>分享碼</div>
              <div style={{
                fontSize: 38, fontWeight: 700, letterSpacing: 8,
                fontFamily: 'var(--font-num)', color: 'var(--ink)',
              }}>{shareId}</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={copy} style={{
                flex: 1, borderRadius: 12, border: '0.5px solid var(--hairline)',
                background: 'var(--surface)', padding: 13, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)',
              }}>{copied ? '✓ 已複製' : '複製分享碼'}</button>
              <button onClick={share} style={{
                flex: 1, borderRadius: 12, border: 0,
                background: 'var(--ink)', padding: 13, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--bg)',
              }}>分享…</button>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.6 }}>
              旅伴在首頁點「加入旅程」輸入此碼即可加入
            </div>
          </>
        )}

        {phase === 'error' && (
          <div>
            <div style={{ color: 'var(--neg)', fontSize: 13, marginBottom: 14 }}>{err}</div>
            <button onClick={() => setPhase('idle')} style={{ border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 14, cursor: 'pointer' }}>重試</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.ShareSheet = ShareSheet;

// ── JoinSheet ────────────────────────────────────────────────────────────────
function JoinSheet({ initialCode = '', onClose }) {
  const [, dispatch] = useStore();
  const [code, setCode] = React.useState(initialCode.toUpperCase());
  const [phase, setPhase] = React.useState('idle');
  const [err, setErr] = React.useState('');

  async function join() {
    if (code.length < 4) return;
    if (!FirestoreSync.isConfigured()) {
      setErr('Firebase 尚未設定，請聯絡旅程建立者確認設定是否完成。');
      setPhase('error'); return;
    }
    setPhase('loading');
    try {
      const trip = await FirestoreSync.joinTrip(code);
      dispatch({ type: 'JOIN_TRIP', trip });
      onClose();
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  }

  const ready = code.length >= 4 && phase !== 'loading';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `24px 24px max(32px, env(safe-area-inset-bottom, 32px))`,
      }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--ink-4)', margin: '0 auto 22px' }}/>

        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>加入共享旅程</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>輸入旅伴傳給你的分享碼</div>

        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setPhase('idle'); }}
          onKeyDown={e => e.key === 'Enter' && ready && join()}
          placeholder="例：AB1C2D"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 30, fontWeight: 700, letterSpacing: 8, textAlign: 'center',
            fontFamily: 'var(--font-num)', color: 'var(--ink)',
            border: '0.5px solid var(--hairline)', borderRadius: 14,
            padding: '16px 20px', background: 'var(--surface)', outline: 'none',
            marginBottom: 12,
          }}
        />

        {phase === 'error' && (
          <div style={{ color: 'var(--neg)', fontSize: 13, marginBottom: 12 }}>{err}</div>
        )}

        <button onClick={join} disabled={!ready} style={{
          width: '100%', border: 0, borderRadius: 14,
          background: ready ? 'var(--ink)' : 'var(--surface)',
          color: ready ? 'var(--bg)' : 'var(--ink-3)',
          padding: 14, fontSize: 15, fontWeight: 600,
          cursor: ready ? 'pointer' : 'default', fontFamily: 'inherit',
        }}>{phase === 'loading' ? '加入中…' : '加入旅程'}</button>
      </div>
    </div>
  );
}

window.JoinSheet = JoinSheet;
