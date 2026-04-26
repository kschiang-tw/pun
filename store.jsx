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
      const { _by, _at, _sid, ...trip } = a.trip;
      // Preserve local isMe when receiving remote update
      const existing = state.trips[trip.id];
      if (existing) {
        const meId = existing.members?.find(m => m.isMe)?.id;
        // Only rebuild members array if isMe flags actually need changing.
        // IMPORTANT: avoid { ...trip, members } when members is unchanged —
        // that moves the `members` key to the end of the object, changing
        // JSON.stringify output and causing spurious Firestore writes.
        let membersChanged = false;
        const members = (trip.members || existing.members).map(m => {
          if (!meId) return m;
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
      return { ...state, trips: { ...state.trips, [trip.id]: trip } };
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
        // Pre-populate prevRef so the write effect sees prevJSON === currJSON for
        // Firestore-loaded trips and never re-writes them spuriously.
        const { _by, _at, _sid, ...cleanTrip } = data;
        prevRef.current = { ...prevRef.current, [id]: { id, ...cleanTrip } };
        remoteIds.current.add(id);
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
              const { _by, _at, _sid, ...cleanRecovery } = tripData;
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
      _db.collection('trips').doc(id).set({
        ...trip, _by: DEVICE_ID,
        _at: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(e => console.warn('[Firestore] write:', e));
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
  const dispatch = React.useCallback(a => {
    if (USER_WRITE_ACTIONS.includes(a.type)) {
      const id = a.id || a.tripId;
      if (id) dirtyIds.current.add(id);
    }
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

  const tripActions = { shareTrip, joinTripByCode };

  return (
    <AuthCtx.Provider value={{ user, authLoading, lastSyncAt }}>
      <TripActCtx.Provider value={tripActions}>
        <StoreCtx.Provider value={[state, dispatch, tripsReady]}>
          {children}
        </StoreCtx.Provider>
      </TripActCtx.Provider>
    </AuthCtx.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────────
function useStore()      { return React.useContext(StoreCtx); }
function useAuth()       { return React.useContext(AuthCtx); }
function useTripActions(){ return React.useContext(TripActCtx); }
function useTrip(id) {
  const [s] = useStore();
  return s.trips[id || s.activeTripId] || null;
}

// ── Formatters ────────────────────────────────────────────────────────────────
const CCY_SYMBOL = { TWD:'NT$', USD:'$', EUR:'€', JPY:'¥', DKK:'kr', SEK:'kr',
  NOK:'kr', THB:'฿', GBP:'£', KRW:'₩', CNY:'¥', HKD:'HK$', SGD:'S$' };
const CCY_PREFIX = ['TWD','USD','EUR','GBP','HKD','SGD','THB','JPY','CNY','KRW'];

function fmtMoney(n, ccy) {
  const sym = CCY_SYMBOL[ccy] || '';
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(Math.round(n)).toLocaleString('en-US');
  return CCY_PREFIX.includes(ccy) ? `${sign}${sym}${v}` : `${sign}${v} ${sym}`;
}
function fmtBase(n, trip) { return fmtMoney(n, trip.baseCurrency); }

window.StoreProvider  = StoreProvider;
window.useStore       = useStore;
window.useAuth        = useAuth;
window.useTripActions = useTripActions;
window.useTrip        = useTrip;
window.fmtMoney       = fmtMoney;
window.fmtBase        = fmtBase;
window.CCY_SYMBOL     = CCY_SYMBOL;
window.uid            = uid;
