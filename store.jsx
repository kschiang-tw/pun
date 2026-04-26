// store.jsx — App state with reducer + Context + localStorage persistence

const STORE_KEY = 'splittrip_v1';

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

function migrate(s) {
  // v2.0.1 → rename demo trip title
  if (s.trips?.demo?.title === 'Denmark · Sweden') {
    s.trips.demo.title = '範例：Denmark・Sweden';
  }
  return s;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const s = DEFAULT_STATE();
      s.activeTripId = 'demo';
      return s;
    }
    return migrate(JSON.parse(raw));
  } catch (e) {
    const s = DEFAULT_STATE();
    s.activeTripId = 'demo';
    return s;
  }
}

function saveState(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
}

function reducer(state, action) {
  const a = action;
  switch (a.type) {
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

const StoreCtx = React.createContext(null);

function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, null, loadState);
  React.useEffect(() => { saveState(state); }, [state]);
  return <StoreCtx.Provider value={[state, dispatch]}>{children}</StoreCtx.Provider>;
}

function useStore() { return React.useContext(StoreCtx); }
function useTrip(id) {
  const [s] = useStore();
  return s.trips[id || s.activeTripId] || null;
}

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
window.useStore = useStore;
window.useTrip = useTrip;
window.fmtMoney = fmtMoney;
window.fmtBase = fmtBase;
window.CCY_SYMBOL = CCY_SYMBOL;
window.uid = uid;
