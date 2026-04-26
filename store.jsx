// store.jsx — App state backed by Firestore rooms (real-time collaborative)

// ── Firebase config ──────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAJYRlb76FNQokETBQ9lfg9aX9G9pbQyS0',
  authDomain:        'pun-github-5329b.firebaseapp.com',
  projectId:         'pun-github-5329b',
  storageBucket:     'pun-github-5329b.firebasestorage.app',
  messagingSenderId: '1000087863029',
  appId:             '1:1000087863029:web:9a4091166d3a0087904fbc',
};

// ── Device fingerprint (prevents echo-back of own writes) ───────────────────
const DEVICE_ID = (() => {
  const k = 'pun_device_id';
  return localStorage.getItem(k) || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(k, id);
    return id;
  })();
})();

// ── Room ID — read from ?room= URL, or generate + push to URL ───────────────
const ROOM_KEY = 'pun_room_id';
function initRoomId() {
  const fromUrl = new URLSearchParams(location.search).get('room');
  if (fromUrl) {
    localStorage.setItem(ROOM_KEY, fromUrl.toUpperCase());
    return fromUrl.toUpperCase();
  }
  const stored = localStorage.getItem(ROOM_KEY);
  if (stored) {
    history.replaceState({}, '', `${location.pathname}?room=${stored}`);
    return stored;
  }
  const fresh = Math.random().toString(36).slice(2, 8).toUpperCase();
  localStorage.setItem(ROOM_KEY, fresh);
  history.pushState({}, '', `${location.pathname}?room=${fresh}`);
  return fresh;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

function mk(title, cat, paidBy, amount, ccy, date, mode, splitData = {}, note = '') {
  return {
    id: uid(), title, cat, paidBy, amount, ccy, date, mode,
    splitData: { participants: ['me', 'an'], ...splitData },
    note, createdAt: Date.now(),
  };
}

const DEFAULT_STATE = () => ({
  activeTripId: null,
  trips: {
    demo: {
      id: 'demo',
      title: '範例：Denmark・Sweden',
      subtitle: '哥本哈根 → 馬爾摩 → 斯德哥爾摩',
      startDate: '2026-06-12',
      endDate: '2026-06-27',
      cover: 0,
      baseCurrency: 'TWD',
      currencies: ['TWD', 'DKK', 'SEK', 'THB'],
      rates: { TWD: 1, DKK: 4.62, SEK: 3.04, THB: 0.93 },
      ratesUpdatedAt: Date.now() - 1000 * 60 * 12,
      rateMode: 'manual',
      liveRatesFetchedAt: null,
      members: [
        { id: 'me', name: 'You',  initial: '你', tint: 'sage', isMe: true },
        { id: 'an', name: 'An',   initial: 'A',  tint: 'clay' },
      ],
      loans: [],
      expenses: [
        mk('Pelikan 晚餐',       'food',     'me', 1240, 'SEK', '2026-06-26', 'equal'),
        mk('Hotel C Stockholm',  'lodging',  'me', 4860, 'SEK', '2026-06-25', 'equal'),
        mk('Vasa Museum',        'activity', 'an',  380, 'SEK', '2026-06-24', 'equal'),
        mk('Öresund Train',      'transit',  'me',  698, 'DKK', '2026-06-23', 'equal'),
        mk('Tivoli 入場',        'activity', 'me',  320, 'DKK', '2026-06-22', 'equal'),
        mk('Noma 套餐',          'food',     'me', 5400, 'DKK', '2026-06-21', 'percent',
           { percent: { me: 70, an: 30 } }, '生日 70/30'),
        mk('Reffen 街市',        'food',     'an',  285, 'DKK', '2026-06-19', 'shares',
           { shares: { me: 2, an: 1 } }, '我 2 份 / A 1 份'),
        mk('機場接駁',           'transit',  'an',  360, 'DKK', '2026-06-14', 'exact',
           { exact: { me: 200, an: 160 } }),
      ],
    },
  },
});

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  const a = action;
  switch (a.type) {

    // Firestore → local: replace entire state
    case 'SET_STATE': return { ...a.state };

    case 'CREATE_TRIP': {
      const id = uid();
      const trip = {
        id, title: a.title, subtitle: a.subtitle || '',
        startDate: a.startDate, endDate: a.endDate, cover: a.cover ?? 0,
        baseCurrency: a.baseCurrency || 'TWD',
        currencies: a.currencies || [a.baseCurrency || 'TWD'],
        rates: a.rates || { [a.baseCurrency || 'TWD']: 1 },
        ratesUpdatedAt: Date.now(),
        rateMode: 'manual',
        liveRatesFetchedAt: null,
        members: a.members || [{ id: 'me', name: 'You', initial: '你', tint: 'sage', isMe: true }],
        expenses: [],
        loans: [],
      };
      return { ...state, activeTripId: id, trips: { ...state.trips, [id]: trip } };
    }
    case 'DELETE_TRIP': {
      const t = { ...state.trips }; delete t[a.id];
      return { ...state, trips: t,
        activeTripId: state.activeTripId === a.id ? null : state.activeTripId };
    }
    case 'SELECT_TRIP':
      return { ...state, activeTripId: a.id };
    case 'UPDATE_TRIP': {
      const t = state.trips[a.id]; if (!t) return state;
      return { ...state, trips: { ...state.trips, [a.id]: { ...t, ...a.patch } } };
    }
    case 'ADD_MEMBER': {
      const t = state.trips[a.tripId]; if (!t) return state;
      const tints = ['sage','clay','stone','rose','plum'];
      const m = { id: uid(), name: a.name, initial: (a.name||'?')[0].toUpperCase(),
        tint: tints[t.members.length % tints.length] };
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, members: [...t.members, m] } } };
    }
    case 'REMOVE_MEMBER': {
      const t = state.trips[a.tripId]; if (!t) return state;
      return { ...state, trips: { ...state.trips,
        [a.tripId]: { ...t, members: t.members.filter(m => m.id !== a.memberId) } } };
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
    default:
      return state;
  }
}

// ── Firestore StoreProvider ───────────────────────────────────────────────────
const StoreCtx = React.createContext(null);
const RoomCtx  = React.createContext({ roomId: '', status: 'connecting' });

function StoreProvider({ children }) {
  const [state, localDispatch] = React.useReducer(reducer, { activeTripId: null, trips: {} });
  const [roomId]      = React.useState(initRoomId);
  const [syncStatus, setSyncStatus] = React.useState('connecting');
  const dbRef    = React.useRef(null);
  const lastJSON = React.useRef(null);   // tracks last Firestore snapshot to avoid echo

  React.useEffect(() => {
    let db;
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      // Offline persistence (tabs share cache)
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      dbRef.current = db;
    } catch (e) {
      console.error('[Firestore] init failed:', e);
      _fallbackLocal(localDispatch);
      setSyncStatus('offline');
      return;
    }

    const doc = db.collection('rooms').doc(roomId);

    // ── Real-time listener ──────────────────────────────────────────────────
    const unsub = doc.onSnapshot(snap => {
      if (!snap.exists) return;
      const { _by, _at, ...appState } = snap.data();
      if (_by === DEVICE_ID) return;             // own write — skip
      lastJSON.current = JSON.stringify(appState);
      localDispatch({ type: 'SET_STATE', state: appState });
    }, err => {
      console.warn('[Firestore] listener error:', err);
      setSyncStatus('error');
    });

    // ── Initial load or create room ─────────────────────────────────────────
    doc.get().then(snap => {
      if (snap.exists) {
        const { _by, _at, ...appState } = snap.data();
        lastJSON.current = JSON.stringify(appState);
        localDispatch({ type: 'SET_STATE', state: appState });
      } else {
        // Brand-new room — seed with demo data
        const init = DEFAULT_STATE();
        init.activeTripId = 'demo';
        lastJSON.current = JSON.stringify({ activeTripId: init.activeTripId, trips: init.trips });
        doc.set({ ...init, _by: DEVICE_ID, _at: firebase.firestore.FieldValue.serverTimestamp() });
        localDispatch({ type: 'SET_STATE', state: init });
      }
      setSyncStatus('ready');
    }).catch(e => {
      console.warn('[Firestore] initial get failed:', e);
      _fallbackLocal(localDispatch);
      setSyncStatus('ready');
    });

    return () => unsub();
  }, [roomId]);

  // ── Write local changes → Firestore ────────────────────────────────────────
  React.useEffect(() => {
    if (syncStatus !== 'ready' || !dbRef.current) return;
    const { activeTripId, trips } = state;
    const json = JSON.stringify({ activeTripId, trips });
    if (json === lastJSON.current) return;       // came from Firestore, skip
    lastJSON.current = json;
    // Local backup (for offline fallback)
    try { localStorage.setItem('pun_backup', json); } catch {}
    // Push to Firestore
    dbRef.current.collection('rooms').doc(roomId).set({
      activeTripId, trips,
      _by: DEVICE_ID,
      _at: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(e => console.warn('[Firestore] write error:', e));
  }, [state, syncStatus, roomId]);

  const dispatch = React.useCallback(a => localDispatch(a), []);

  return (
    <RoomCtx.Provider value={{ roomId, status: syncStatus }}>
      <StoreCtx.Provider value={[state, dispatch]}>
        {children}
      </StoreCtx.Provider>
    </RoomCtx.Provider>
  );
}

function _fallbackLocal(dispatch) {
  try {
    const raw = localStorage.getItem('pun_backup');
    const s = raw ? JSON.parse(raw) : (() => { const d = DEFAULT_STATE(); d.activeTripId = 'demo'; return d; })();
    dispatch({ type: 'SET_STATE', state: s });
  } catch {
    const d = DEFAULT_STATE(); d.activeTripId = 'demo';
    dispatch({ type: 'SET_STATE', state: d });
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useStore() { return React.useContext(StoreCtx); }
function useTrip(id) {
  const [s] = useStore();
  return s.trips[id || s.activeTripId] || null;
}
function useRoom() { return React.useContext(RoomCtx); }

// ── Formatters ────────────────────────────────────────────────────────────────
const CCY_SYMBOL = { TWD:'NT$', USD:'$', EUR:'€', JPY:'¥', DKK:'kr', SEK:'kr', NOK:'kr', THB:'฿', GBP:'£', KRW:'₩', CNY:'¥', HKD:'HK$', SGD:'S$' };
const CCY_PREFIX = ['TWD','USD','EUR','GBP','HKD','SGD','THB','JPY','CNY','KRW'];

function fmtMoney(n, ccy) {
  const sym = CCY_SYMBOL[ccy] || '';
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(Math.round(n)).toLocaleString('en-US');
  return CCY_PREFIX.includes(ccy) ? `${sign}${sym}${v}` : `${sign}${v} ${sym}`;
}
function fmtBase(n, trip) { return fmtMoney(n, trip.baseCurrency); }

window.StoreProvider = StoreProvider;
window.useStore      = useStore;
window.useTrip       = useTrip;
window.useRoom       = useRoom;
window.fmtMoney      = fmtMoney;
window.fmtBase       = fmtBase;
window.CCY_SYMBOL    = CCY_SYMBOL;
window.uid           = uid;
