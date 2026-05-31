// store.jsx — App state: Firebase Auth + per-trip Firestore

// ── Firebase init ─────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAJYRlb76FNQokETBQ9lfg9aX9G9pbQyS0',
  authDomain:        'pun-github-5329b.firebaseapp.com',
  projectId:         'pun-github-5329b',
  storageBucket:     'pun-github-5329b.firebasestorage.app',
  messagingSenderId: '1000087863029',
  appId:             '1:1000087863029:web:9a4091166d3a0087904fbc',
};

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const _db   = firebase.firestore();
const _auth = firebase.auth();
_db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// ── Device fingerprint ────────────────────────────────────────────────────────
const DEVICE_ID = (() => {
  const k = 'pun_device_id';
  return localStorage.getItem(k) || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(k, id); return id;
  })();
})();

// ── Local trip ID registry (fallback index for orphaned Firestore trips) ──────
const LOCAL_IDS_KEY = 'pun_local_trip_ids';
function getLocalIds() {
  try { return JSON.parse(localStorage.getItem(LOCAL_IDS_KEY) || '[]'); } catch { return []; }
}
function registerLocalId(id) {
  try {
    const ids = new Set(getLocalIds()); ids.add(id);
    localStorage.setItem(LOCAL_IDS_KEY, JSON.stringify([...ids]));
  } catch {}
}
function removeLocalId(id) {
  try {
    const ids = new Set(getLocalIds()); ids.delete(id);
    localStorage.setItem(LOCAL_IDS_KEY, JSON.stringify([...ids]));
  } catch {}
}

// ── "Returning user" flag — once set, never seed demo again ──────────────────
const EVER_HAD_TRIPS_KEY = 'pun_ever_had_trips';
function markEverHadTrips() {
  try { localStorage.setItem(EVER_HAD_TRIPS_KEY, '1'); } catch {}
}
function everHadTrips() {
  try { return !!localStorage.getItem(EVER_HAD_TRIPS_KEY); } catch { return false; }
}

// ── Notifications (in-app notification center + local push) ───────────────────
const NOTIFS_KEY        = 'pun_notifications';
const NOTIF_ENABLED_KEY = 'pun_notif_enabled';
const NOTIF_MAX         = 60;

function loadNotifs() {
  try { return JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]'); } catch { return []; }
}
function saveNotifs(list) {
  try { localStorage.setItem(NOTIFS_KEY, JSON.stringify(list.slice(0, NOTIF_MAX))); } catch {}
}
function notifEnabled() {
  try { return localStorage.getItem(NOTIF_ENABLED_KEY) === '1'; } catch { return false; }
}
function setNotifEnabled(v) {
  try { localStorage.setItem(NOTIF_ENABLED_KEY, v ? '1' : '0'); } catch {}
}

// Fire a system-level local notification (works while the app/SW is alive).
// Real background push (app fully closed) would need a server + FCM.
function fireLocalNotification(n) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!notifEnabled()) return;
  const opts = {
    body: n.body, tag: n.id, icon: './icon.svg', badge: './icon.svg',
    lang: 'zh-Hant', data: { tripId: n.tripId },
  };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.showNotification) reg.showNotification(n.tripTitle, opts);
        else { try { new Notification(n.tripTitle, opts); } catch {} }
      }).catch(() => { try { new Notification(n.tripTitle, opts); } catch {} });
    } else {
      new Notification(n.tripTitle, opts);
    }
  } catch {}
}

// Which member is "me" in this trip (localStorage override > isMe flag).
function getMeId(trip) {
  try { const s = localStorage.getItem('pun_me_' + trip.id); if (s) return s; } catch {}
  return (trip.members || []).find(m => m.isMe)?.id || null;
}

// "我的視角" amount line for an expense — 你借出 / 你欠 / 中性總額.
function perspectiveExpense(trip, meId, e) {
  const ccy = e.ccy;
  if (!meId || typeof ENGINE === 'undefined')
    return { tone: 'neutral', amountText: fmtMoney(e.amount, ccy) };
  const shares = ENGINE.computeShares(e, trip.members || []);
  const myShare = +(shares[meId] || 0);
  if (e.paidBy === meId) {
    const lent = ENGINE.round2(e.amount - myShare);
    if (lent > 0.005) return { tone: 'pos', amountText: `你借出 ${fmtMoney(lent, ccy)}` };
    return { tone: 'neutral', amountText: fmtMoney(e.amount, ccy) };
  }
  if (myShare > 0.005) return { tone: 'neg', amountText: `你欠 ${fmtMoney(myShare, ccy)}` };
  return { tone: 'neutral', amountText: fmtMoney(e.amount, ccy) };
}

// "我的視角" amount line for a loan (from = 借出方 / to = 借入方).
function perspectiveLoan(trip, meId, l) {
  const ccy = l.ccy;
  if (meId && l.from === meId) return { tone: 'pos', amountText: `你借出 ${fmtMoney(l.amount, ccy)}` };
  if (meId && l.to   === meId) return { tone: 'neg', amountText: `你欠 ${fmtMoney(l.amount, ccy)}` };
  return { tone: 'neutral', amountText: fmtMoney(l.amount, ccy) };
}

const ACTIVITY_VERBS = {
  expense: { add: '新增了一筆支出', edit: '修改了支出', delete: '刪除了一筆支出' },
  loan:    { add: '記錄了一筆借款', edit: '修改了借款', delete: '刪除了一筆借款' },
};

// Build a Splitwise-style activity entry for a single record change.
function makeActivity({ trip, meId, actorName, isSelf, action, kind, record }) {
  const nameOf = id => (trip.members || []).find(m => m.id === id)?.name || '?';
  const persp = kind === 'expense'
    ? perspectiveExpense(trip, meId, record)
    : perspectiveLoan(trip, meId, record);
  const subtitle = kind === 'expense'
    ? (record.title || '支出')
    : `${nameOf(record.from)} → ${nameOf(record.to)}`;
  const actor = isSelf ? '你' : (actorName || '某人');
  const verb  = ACTIVITY_VERBS[kind][action];
  return {
    id: uid(), tripId: trip.id, tripTitle: trip.title || '旅程',
    actor, isSelf: !!isSelf, action, kind, verb, subtitle,
    amountText: persp.amountText, tone: persp.tone,
    body: `${actor} ${verb}` + (kind === 'expense' ? `「${subtitle}」` : `（${subtitle}）`),
    ts: Date.now(), read: !!isSelf,
  };
}

// Diff old vs new trip → list of { action, kind, record } record changes.
function diffRecordChanges(oldTrip, newTrip) {
  const out = [];
  const sigE = e => JSON.stringify([e.title, e.amount, e.ccy, e.cat, e.paidBy, e.date, e.mode, e.note, e.splitData]);
  const sigL = l => JSON.stringify([l.from, l.to, l.amount, l.ccy, l.note]);
  function diff(kind, oldList = [], newList = [], sigFn) {
    const oldMap = new Map(oldList.map(r => [r.id, r]));
    const newMap = new Map(newList.map(r => [r.id, r]));
    for (const r of newList) if (!oldMap.has(r.id)) out.push({ action: 'add',    kind, record: r });
    for (const r of oldList) if (!newMap.has(r.id)) out.push({ action: 'delete', kind, record: r });
    for (const r of newList) {
      const o = oldMap.get(r.id);
      if (o && sigFn(o) !== sigFn(r)) out.push({ action: 'edit', kind, record: r });
    }
  }
  diff('expense', oldTrip.expenses, newTrip.expenses, sigE);
  diff('loan',    oldTrip.loans,    newTrip.loans,    sigL);
  return out;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

function mk(title, cat, paidBy, amount, ccy, date, mode, splitData = {}, note = '') {
  return {
    id: uid(), title, cat, paidBy, amount, ccy, date, mode,
    splitData: { participants: ['me', 'an'], ...splitData },
    note, createdAt: Date.now(),
  };
}

function makeDemoTrip(ownerId) {
  return {
    id: uid(),
    title: '範例：Denmark・Sweden',
    subtitle: '哥本哈根 → 馬爾摩 → 斯德哥爾摩',
    startDate: '2026-06-12', endDate: '2026-06-27', cover: 0,
    baseCurrency: 'TWD',
    currencies: ['TWD', 'DKK', 'SEK', 'THB'],
    rates: { TWD: 1, DKK: 4.62, SEK: 3.04, THB: 0.93 },
    ratesUpdatedAt: Date.now() - 1000 * 60 * 12,
    rateMode: 'manual', liveRatesFetchedAt: null,
    members: [
      { id: 'me', name: 'You', initial: '你', tint: 'sage', isMe: true },
      { id: 'an', name: 'An',  initial: 'A',  tint: 'clay' },
    ],
    loans: [],
    expenses: [
      mk('Pelikan 晚餐',      'food',     'me', 1240, 'SEK', '2026-06-26', 'equal'),
      mk('Hotel C Stockholm', 'lodging',  'me', 4860, 'SEK', '2026-06-25', 'equal'),
      mk('Vasa Museum',       'activity', 'an',  380, 'SEK', '2026-06-24', 'equal'),
      mk('Öresund Train',     'transit',  'me',  698, 'DKK', '2026-06-23', 'equal'),
      mk('Tivoli 入場',       'activity', 'me',  320, 'DKK', '2026-06-22', 'equal'),
      mk('Noma 套餐',         'food',     'me', 5400, 'DKK', '2026-06-21', 'percent',
         { percent: { me: 70, an: 30 } }, '生日 70/30'),
      mk('Reffen 街市',       'food',     'an',  285, 'DKK', '2026-06-19', 'shares',
         { shares: { me: 2, an: 1 } }, '我 2 份 / A 1 份'),
      mk('機場接駁',          'transit',  'an',  360, 'DKK', '2026-06-14', 'exact',
         { exact: { me: 200, an: 160 } }),
    ],
    // Firestore ownership fields
    ownerId, collaborators: [], shareCode: null,
    isDemo: true,
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  const a = action;
  switch (a.type) {

    // Firestore → local: upsert a single trip
    case 'SET_TRIP': {
      const { _by, _at, _sid, _byName, ...trip } = a.trip;
      const existing = state.trips[trip.id];
      // Priority for "me" identity: localStorage > local state > Firestore data
      const storedMeId = localStorage.getItem(`pun_me_${trip.id}`);
      const meId = storedMeId
        || existing?.members?.find(m => m.isMe)?.id
        || trip.members?.find(m => m.isMe)?.id;
      if (!meId) return { ...state, trips: { ...state.trips, [trip.id]: trip } };
      // Only rebuild members array if isMe flags actually need changing.
      // IMPORTANT: avoid { ...trip, members } when members is unchanged —
      // that moves the `members` key to the end of the object, changing
      // JSON.stringify output and causing spurious Firestore writes.
      let membersChanged = false;
      const members = (trip.members || []).map(m => {
        if (m.id === meId && !m.isMe)  { membersChanged = true; return { ...m, isMe: true }; }
        if (m.id !== meId && m.isMe)   { membersChanged = true; return { ...m, isMe: false }; }
        return m;
      });
      if (!membersChanged) {
        // Members are already correct — use trip as-is to preserve property order
        return { ...state, trips: { ...state.trips, [trip.id]: trip } };
      }
      return { ...state, trips: { ...state.trips, [trip.id]: { ...trip, members } } };
    }

    // Firestore → local: remove a trip (deleted by owner)
    case 'REMOVE_TRIP': {
      const t = { ...state.trips }; delete t[a.id];
      return { ...state, trips: t,
        activeTripId: state.activeTripId === a.id ? null : state.activeTripId };
    }

    case 'SELECT_TRIP':
      return { ...state, activeTripId: a.id };

    case 'CREATE_TRIP': {
      const trip = {
        id: uid(), title: a.title, subtitle: a.subtitle || '',
        startDate: a.startDate, endDate: a.endDate, cover: a.cover ?? 0,
        baseCurrency: a.baseCurrency || 'TWD',
        currencies: a.currencies || [a.baseCurrency || 'TWD'],
        rates: a.rates || { [a.baseCurrency || 'TWD']: 1 },
        ratesUpdatedAt: Date.now(), rateMode: 'manual', liveRatesFetchedAt: null,
        members: a.members || [{ id: 'me', name: 'You', initial: '你', tint: 'sage', isMe: true }],
        expenses: [], loans: [],
        ownerId: a.ownerId, collaborators: [], shareCode: null,
        accessList: a.accessList || [],
      };
      return { ...state, activeTripId: trip.id,
        trips: { ...state.trips, [trip.id]: trip } };
    }

    case 'DELETE_TRIP': {
      const t = { ...state.trips }; delete t[a.id];
      return { ...state, trips: t,
        activeTripId: state.activeTripId === a.id ? null : state.activeTripId };
    }

    case 'UPDATE_TRIP': {
      const t = state.trips[a.id]; if (!t) return state;
      return { ...state, trips: { ...state.trips, [a.id]: { ...t, ...a.patch } } };
    }

    case 'ADD_MEMBER': {
      const t = state.trips[a.tripId]; if (!t) return state;
      const tints = ['sage','clay','stone','rose','plum'];
      const m = { id: uid(), name: a.name,
        initial: (a.name||'?')[0].toUpperCase(),
        tint: tints[t.members.length % tints.length] };
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, members: [...t.members, m] } } };
    }

    case 'REMOVE_MEMBER': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, members: t.members.filter(m => m.id !== a.memberId) } } };
    }

    case 'SET_ME': {
      const t = state.trips[a.tripId]; if (!t) return state;
      if (a.memberId) {
        localStorage.setItem(`pun_me_${a.tripId}`, a.memberId);
      } else {
        localStorage.removeItem(`pun_me_${a.tripId}`);
      }
      const members = t.members.map(m => {
        if (m.id === a.memberId) return m.isMe ? m : { ...m, isMe: true };
        if (m.isMe) return { ...m, isMe: false };
        return m;
      });
      return { ...state, trips: { ...state.trips, [a.tripId]: { ...t, members } } };
    }

    case 'SET_RATE': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, rates: { ...t.rates, [a.ccy]: a.rate },
          ratesUpdatedAt: Date.now() } } };
    }

    case 'SET_RATES_BULK': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, rates: { ...t.rates, ...a.rates },
          ratesUpdatedAt: Date.now(),
          rateMode: a.rateMode ?? t.rateMode,
          liveRatesFetchedAt: a.rateMode === 'live' ? Date.now() : t.liveRatesFetchedAt,
        } } };
    }

    case 'SET_RATE_MODE': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, rateMode: a.mode } } };
    }

    case 'TOGGLE_CCY': {
      const t = state.trips[a.tripId]; if (!t) return state;
      const has = t.currencies.includes(a.ccy);
      const cur = has ? t.currencies.filter(c => c !== a.ccy) : [...t.currencies, a.ccy];
      const rates = { ...t.rates };
      if (!has && rates[a.ccy] == null) rates[a.ccy] = 1;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, currencies: cur, rates } } };
    }

    case 'ADD_EXPENSE': {
      const t = state.trips[a.tripId]; if (!t) return state;
      const e = { id: uid(), createdAt: Date.now(), ...a.expense };
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, expenses: [e, ...t.expenses] } } };
    }

    case 'UPDATE_EXPENSE': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t,
          expenses: t.expenses.map(e => e.id === a.id ? { ...e, ...a.patch } : e) } } };
    }

    case 'DELETE_EXPENSE': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, expenses: t.expenses.filter(e => e.id !== a.id) } } };
    }

    case 'ADD_LOAN': {
      const t = state.trips[a.tripId]; if (!t) return state;
      const l = { id: uid(), createdAt: Date.now(), ...a.loan };
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, loans: [...(t.loans || []), l] } } };
    }

    case 'DELETE_LOAN': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, loans: (t.loans || []).filter(l => l.id !== a.id) } } };
    }

    case 'RESET':
      return { activeTripId: null, trips: {} };

    default: return state;
  }
}

// ── Contexts ──────────────────────────────────────────────────────────────────
const StoreCtx  = React.createContext(null);
const AuthCtx   = React.createContext({ user: null, authLoading: true });
const TripActCtx = React.createContext({});
const NotifCtx  = React.createContext({ notifications: [], unreadCount: 0 });

// ── StoreProvider ─────────────────────────────────────────────────────────────
function StoreProvider({ children }) {
  const [state, localDispatch] = React.useReducer(reducer, { activeTripId: null, trips: {} });
  const [user,        setUser]       = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [tripsReady,  setTripsReady]  = React.useState(false);
  const [lastSyncAt,  setLastSyncAt]  = React.useState(null);
  const prevRef   = React.useRef({});        // tracks which trip IDs exist in Firestore (for new-trip detection + deletion)
  const remoteIds = React.useRef(new Set()); // trip IDs mid-remote-update
  const dirtyIds  = React.useRef(new Set()); // trip IDs modified by user actions (need Firestore write)
  const stateRef  = React.useRef(state);     // always points to latest state (for use inside async callbacks)
  React.useEffect(() => { stateRef.current = state; });

  // ── Notification center state ──────────────────────────────────────────────
  const [notifications, setNotifications] = React.useState(loadNotifs);
  const [notifPermission, setNotifPermission] = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  const addNotifications = React.useCallback((items) => {
    if (!items || !items.length) return;
    setNotifications(prev => {
      const next = [...items, ...prev].slice(0, NOTIF_MAX);
      saveNotifs(next);
      return next;
    });
    // Only fire a system push for *others'* actions — never for your own.
    items.forEach(n => { if (!n.isSelf) fireLocalNotification(n); });
  }, []);

  const markAllNotifsRead = React.useCallback(() => {
    setNotifications(prev => {
      if (!prev.some(n => !n.read)) return prev;
      const next = prev.map(n => n.read ? n : { ...n, read: true });
      saveNotifs(next);
      return next;
    });
  }, []);

  const clearNotifs = React.useCallback(() => {
    setNotifications([]); saveNotifs([]);
  }, []);

  const requestNotifPermission = React.useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    let p = Notification.permission;
    if (p === 'default') { try { p = await Notification.requestPermission(); } catch { p = Notification.permission; } }
    setNotifPermission(p);
    setNotifEnabled(p === 'granted');
    return p;
  }, []);

  // ── Auth listener + email link handling ──────────────────────────────────
  React.useEffect(() => {
    if (_auth.isSignInWithEmailLink(location.href)) {
      let email = localStorage.getItem('pun_signin_email');
      if (!email) email = window.prompt('請輸入您的 email 地址以確認身份：');
      if (email) {
        _auth.signInWithEmailLink(email, location.href)
          .then(() => {
            localStorage.removeItem('pun_signin_email');
            const inv = new URLSearchParams(location.search).get('invite');
            history.replaceState({}, '', location.pathname + (inv ? `?invite=${inv}` : ''));
          })
          .catch(e => console.error('[Auth] email link:', e));
      }
    }
    return _auth.onAuthStateChanged(u => {
      setUser(u || null);
      setAuthLoading(false);
    });
  }, []);

  // ── Firestore subscriptions — reload when user changes ───────────────────
  React.useEffect(() => {
    if (!user) {
      console.log('[pun] RESET (user signed out / null)');
      localDispatch({ type: 'RESET' });
      setTripsReady(false);
      prevRef.current = {};
      return;
    }

    setTripsReady(false);
    let initialised = false;
    const loaded = {};   // accumulate initial load before declaring ready

    function applyChanges(changes) {
      let hadChanges = false;
      changes.forEach(change => {
        const id = change.doc.id;
        if (change.type === 'removed') {
          console.log('[pun] Firestore REMOVED:', id);
          localDispatch({ type: 'REMOVE_TRIP', id });
          delete loaded[id];
          // Also remove from prevRef so write effect doesn't try to delete from Firestore
          const { [id]: _removed, ...rest } = prevRef.current;
          prevRef.current = rest;
          hadChanges = true;
          return;
        }
        const data = change.doc.data();
        console.log('[pun] Firestore', change.type, id, '_by:', data._by);
        // Capture the previously-known version BEFORE we overwrite prevRef, so we
        // can diff for new records added by other devices/members.
        const oldTrip = prevRef.current[id];
        // Pre-populate prevRef so the write effect sees prevJSON === currJSON for
        // Firestore-loaded trips and never re-writes them spuriously.
        const { _by, _at, _sid, _byName, ...cleanTrip } = data;
        prevRef.current = { ...prevRef.current, [id]: { id, ...cleanTrip } };
        remoteIds.current.add(id);
        // ── Activity detection → notification center ─────────────────────────
        // Only after initial load, only for changes written by *other* devices
        // (our own writes echo back with _by === DEVICE_ID and are logged at
        // dispatch time instead). join writes use _by 'join:…' and yield no
        // record changes, so they produce nothing here.
        if (initialised && oldTrip && data._by && data._by !== DEVICE_ID) {
          const newTrip = { id, ...cleanTrip };
          const meId = getMeId(newTrip);
          const changes = diffRecordChanges(oldTrip, newTrip);
          if (changes.length) {
            addNotifications(changes.map(c => makeActivity({
              trip: newTrip, meId, actorName: data._byName, isSelf: false,
              action: c.action, kind: c.kind, record: c.record,
            })));
          }
        }
        localDispatch({ type: 'SET_TRIP', trip: { id, ...data } });
        setTimeout(() => remoteIds.current.delete(id), 500);
        loaded[id] = true;
        hadChanges = true;
      });
      if (hadChanges) setLastSyncAt(Date.now());
    }

    function markReady() {
      // NOTE: do NOT call applyChanges here again — the outer snapshot callback
      // already called it. Calling twice causes a second SET_TRIP with existing
      // state, which triggers the isMe merge and adds isMe:false to non-me members,
      // making prevRef differ from state.trips and causing spurious Firestore writes.
      if (!initialised) {
        initialised = true;
        setTimeout(async () => {
          // ── 1. Migrate old localStorage trips (pre-Firestore era) ────────────
          const OLD_KEYS = ['splittrip_v1', 'pun_v1'];
          for (const key of OLD_KEYS) {
            try {
              const raw = localStorage.getItem(key);
              if (!raw) continue;
              const stored = JSON.parse(raw);
              const trips = Object.values(stored?.trips || {});
              for (const trip of trips) {
                if (!trip?.id) continue;
                const patch = { ...trip, ownerId: trip.ownerId || user.uid,
                  collaborators: trip.collaborators || [], shareCode: trip.shareCode || null,
                  _by: DEVICE_ID, _at: firebase.firestore.FieldValue.serverTimestamp() };
                try {
                  await _db.collection('trips').doc(trip.id).set(patch, { merge: true });
                  loaded[trip.id] = true;
                  const { _by: mb, _at: ma, _sid: ms, ...cleanMigration } = patch;
                  prevRef.current = { ...prevRef.current, [trip.id]: cleanMigration };
                  localDispatch({ type: 'SET_TRIP', trip: patch });
                } catch (e) { console.warn('[Migration]', e); }
              }
              localStorage.removeItem(key);
              console.log('[Migration] migrated', trips.length, 'trips from', key);
            } catch (e) { console.warn('[Migration] parse:', e); }
          }

          // ── 2. Recover orphaned Firestore trips (missing ownerId) ────────────
          const localIds = getLocalIds();
          const missing = localIds.filter(id => !loaded[id]);
          for (const id of missing) {
            try {
              console.log('[pun] RECOVERY fetching:', id);
              const doc = await _db.collection('trips').doc(id).get();
              if (!doc.exists) { removeLocalId(id); continue; }
              const data = doc.data();
              if (!data.ownerId) {
                await _db.collection('trips').doc(id).update({ ownerId: user.uid })
                  .catch(console.warn);
              }
              loaded[id] = true;
              const tripData = { id, ...data, ownerId: data.ownerId || user.uid };
              // Pre-populate prevRef so the write effect doesn't treat this recovered
              // trip as "new local" and spuriously re-write it to Firestore.
              const { _by, _at, _sid, _byName, ...cleanRecovery } = tripData;
              prevRef.current = { ...prevRef.current, [id]: cleanRecovery };
              localDispatch({ type: 'SET_TRIP', trip: tripData });
            } catch (e) { console.warn('[Recovery]', id, e); }
          }

          // ── 3. Mark returning user if any trips found ─────────────────────────
          if (Object.keys(loaded).length > 0) markEverHadTrips();

          // ── 4. Seed demo only for brand-new users ─────────────────────────────
          if (Object.keys(loaded).length === 0 && !everHadTrips()) {
            const demo = makeDemoTrip(user.uid);
            try {
              _db.collection('trips').doc(demo.id).set({
                ...demo, _by: DEVICE_ID,
                _at: firebase.firestore.FieldValue.serverTimestamp(),
              }).catch(e => console.warn('[Firestore] demo seed:', e));
            } catch (e) { console.warn('[Firestore] demo seed sync:', e); }
            localDispatch({ type: 'SET_TRIP', trip: demo });
          }
          setTripsReady(true);
        }, 800);
      }
    }

    const unsubOwned = _db.collection('trips')
      .where('ownerId', '==', user.uid)
      .onSnapshot(snap => {
        applyChanges(snap.docChanges());
        if (!initialised) markReady();
      }, console.error);

    const unsubShared = _db.collection('trips')
      .where('collaborators', 'array-contains', user.uid)
      .onSnapshot(snap => {
        applyChanges(snap.docChanges());
        if (!initialised) markReady();
      }, console.error);

    return () => { unsubOwned(); unsubShared(); };
  }, [user?.uid]);  // eslint-disable-line

  // ── Auto-handle ?invite= on load ─────────────────────────────────────────
  React.useEffect(() => {
    if (!user || !tripsReady) return;
    const code = new URLSearchParams(location.search).get('invite');
    if (!code) return;
    joinTripByCode(code, user).catch(console.error);
    history.replaceState({}, '', location.pathname);
  }, [user?.uid, tripsReady]); // eslint-disable-line

  // ── Write local changes → Firestore ─────────────────────────────────────
  // Only write trips that are:
  //   (a) new  — not yet known to Firestore (prevRef has no entry)
  //   (b) dirty — explicitly modified by a user action via dispatch()
  // This replaces the old JSON.stringify comparison which was fragile:
  // property-order differences and isMe flag mutations caused spurious writes
  // that overwrote multi-member trips on every app reopen.
  React.useEffect(() => {
    if (!user || !tripsReady) return;
    const prev = prevRef.current;
    const curr = state.trips;
    Object.entries(curr).forEach(([id, trip]) => {
      const isNew   = !prev[id];                     // never written to Firestore
      const isDirty = dirtyIds.current.has(id);      // user modified this trip
      if (!isNew && !isDirty) return;                // Firestore-sourced, no changes
      if (remoteIds.current.has(id)) return;         // mid-remote-update guard
      console.log('[pun] WRITE trip:', id, isNew ? '(new)' : '(dirty)');
      dirtyIds.current.delete(id);
      registerLocalId(id);
      if (!trip.isDemo) markEverHadTrips();
      try {
        _db.collection('trips').doc(id).set({
          ...trip, _by: DEVICE_ID,
          _byName: user.displayName || user.email || '某人',
          _at: firebase.firestore.FieldValue.serverTimestamp(),
        }).catch(e => console.warn('[Firestore] write:', e));
      } catch (e) {
        // Firestore throws synchronously for invalid data (e.g. undefined values).
        // Catch here so the error doesn't escape as an uncaught cross-origin "Script error."
        console.warn('[Firestore] write (sync error):', e, 'trip:', id);
      }
    });
    // Handle deletions
    Object.keys(prev).forEach(id => {
      if (!curr[id]) {
        console.log('[pun] DELETE trip:', id);
        removeLocalId(id);
        _db.collection('trips').doc(id).delete().catch(console.warn);
      }
    });
    prevRef.current = curr;
  }, [state.trips, tripsReady, user?.uid]); // eslint-disable-line

  // User-facing dispatch: mark trips dirty so write effect knows to sync them
  const USER_WRITE_ACTIONS = [
    'UPDATE_TRIP','ADD_EXPENSE','UPDATE_EXPENSE','DELETE_EXPENSE',
    'ADD_LOAN','DELETE_LOAN','ADD_MEMBER','REMOVE_MEMBER',
    'SET_RATE','SET_RATES_BULK','SET_RATE_MODE','TOGGLE_CCY',
  ];
  // Log *your own* record actions to the activity feed (actor = 你).
  // Others' actions are detected via the Firestore snapshot diff instead.
  function logOwnActivity(a) {
    const trip = stateRef.current.trips[a.tripId];
    if (!trip) return;
    const meId = getMeId(trip);
    const base = { trip, meId, isSelf: true };
    let entry = null;
    if (a.type === 'ADD_EXPENSE') {
      entry = makeActivity({ ...base, action: 'add', kind: 'expense', record: a.expense });
    } else if (a.type === 'UPDATE_EXPENSE') {
      const e = trip.expenses.find(x => x.id === a.id);
      if (e) entry = makeActivity({ ...base, action: 'edit', kind: 'expense', record: { ...e, ...a.patch } });
    } else if (a.type === 'DELETE_EXPENSE') {
      const e = trip.expenses.find(x => x.id === a.id);
      if (e) entry = makeActivity({ ...base, action: 'delete', kind: 'expense', record: e });
    } else if (a.type === 'ADD_LOAN') {
      entry = makeActivity({ ...base, action: 'add', kind: 'loan', record: a.loan });
    } else if (a.type === 'DELETE_LOAN') {
      const l = (trip.loans || []).find(x => x.id === a.id);
      if (l) entry = makeActivity({ ...base, action: 'delete', kind: 'loan', record: l });
    }
    if (entry) addNotifications([entry]);
  }

  const dispatch = React.useCallback(a => {
    if (USER_WRITE_ACTIONS.includes(a.type)) {
      const id = a.id || a.tripId;
      if (id) dirtyIds.current.add(id);
    }
    try { logOwnActivity(a); } catch (e) { console.warn('[activity]', e); }
    localDispatch(a);
  }, []); // eslint-disable-line

  // ── Trip action helpers (invite / join) ───────────────────────────────────
  async function shareTrip(tripId) {
    const trip = state.trips[tripId];
    if (!trip || trip.ownerId !== user?.uid) throw new Error('無權限共享此旅程');
    if (trip.shareCode) return trip.shareCode;   // reuse existing
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await Promise.all([
      _db.collection('trips').doc(tripId).update({ shareCode: code }),
      _db.collection('invites').doc(code).set({ tripId, ownerId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() }),
    ]);
    localDispatch({ type: 'UPDATE_TRIP', id: tripId, patch: { shareCode: code } });
    return code;
  }

  async function joinTripByCode(code, currentUser) {
    const uid = (currentUser || user)?.uid;
    if (!uid) throw new Error('請先登入');
    const snap = await _db.collection('invites').doc(code.trim().toUpperCase()).get();
    if (!snap.exists) throw new Error('找不到此邀請碼，請確認是否正確');
    const { tripId } = snap.data();
    const tripSnap = await _db.collection('trips').doc(tripId).get();
    if (!tripSnap.exists) throw new Error('此旅程已不存在');
    if (tripSnap.data().ownerId === uid) return; // already owner
    if ((tripSnap.data().collaborators || []).includes(uid)) return; // already in
    const cu = currentUser || user;
    await _db.collection('trips').doc(tripId).update({
      collaborators: firebase.firestore.FieldValue.arrayUnion(uid),
      accessList: firebase.firestore.FieldValue.arrayUnion({
        uid: cu.uid,
        email: cu.email || '',
        displayName: cu.displayName || '',
        photoURL: cu.photoURL || null,
      }),
      _by: 'join:' + uid,   // prevent echo-guard from filtering this on owner's device
      _at: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Trip will appear via onSnapshot
  }

  // ── Force backup: write all owned trips to Firestore immediately ─────────
  async function forceBackup() {
    if (!user) throw new Error('請先登入');
    const trips = Object.values(stateRef.current.trips);
    let written = 0;
    for (const trip of trips) {
      try {
        await _db.collection('trips').doc(trip.id).set({
          ...trip, _by: DEVICE_ID,
          _at: firebase.firestore.FieldValue.serverTimestamp(),
        });
        registerLocalId(trip.id);
        written++;
      } catch (e) {
        console.warn('[forceBackup] trip', trip.id, e);
      }
    }
    console.log('[pun] forceBackup wrote', written, 'trips');
    return written;
  }

  const tripActions = { shareTrip, joinTripByCode, forceBackup };

  const unreadCount = notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0);
  const notifApi = {
    notifications, unreadCount, notifPermission,
    addNotifications, markAllNotifsRead, clearNotifs, requestNotifPermission,
  };

  return (
    <AuthCtx.Provider value={{ user, authLoading, lastSyncAt }}>
      <TripActCtx.Provider value={tripActions}>
        <NotifCtx.Provider value={notifApi}>
          <StoreCtx.Provider value={[state, dispatch, tripsReady]}>
            {children}
          </StoreCtx.Provider>
        </NotifCtx.Provider>
      </TripActCtx.Provider>
    </AuthCtx.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────────
function useStore()      { return React.useContext(StoreCtx); }
function useAuth()       { return React.useContext(AuthCtx); }
function useTripActions(){ return React.useContext(TripActCtx); }
function useNotifications(){ return React.useContext(NotifCtx); }
function useTrip(id) {
  const [s] = useStore();
  return s.trips[id || s.activeTripId] || null;
}

// ── Formatters ────────────────────────────────────────────────────────────────
const CCY_SYMBOL = { TWD:'NT$', USD:'$', EUR:'€', JPY:'¥', DKK:'kr', SEK:'kr',
  NOK:'kr', THB:'฿', GBP:'£', KRW:'₩', CNY:'¥', HKD:'HK$', SGD:'S$' };
const CCY_PREFIX = ['TWD','USD','EUR','GBP','HKD','SGD','THB','JPY','CNY','KRW'];
const CCY_ZERO_DECIMALS = new Set(['JPY','KRW','VND','IDR','ISK','HUF','TWD','CLP']);

function ccyMaxDecimals(ccy) { return CCY_ZERO_DECIMALS.has(ccy) ? 0 : 2; }

function fmtMoney(n, ccy) {
  const sym = CCY_SYMBOL[ccy] || '';
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: ccyMaxDecimals(ccy),
  });
  return CCY_PREFIX.includes(ccy) ? `${sign}${sym}${v}` : `${sign}${v} ${sym}`;
}
function fmtBase(n, trip) { return fmtMoney(n, trip.baseCurrency); }

window.StoreProvider  = StoreProvider;
window.useStore       = useStore;
window.useAuth        = useAuth;
window.useTripActions = useTripActions;
window.useNotifications = useNotifications;
window.useTrip        = useTrip;
window.fmtMoney       = fmtMoney;
window.fmtBase        = fmtBase;
window.ccyMaxDecimals = ccyMaxDecimals;
window.CCY_SYMBOL     = CCY_SYMBOL;
window.uid            = uid;
