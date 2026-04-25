// currencies.js — Currency list with names + recents tracking

const CURRENCIES = [
  ['TWD', 'Taiwan Dollar'],
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
  ['JPY', 'Japanese Yen'],
  ['GBP', 'British Pound'],
  ['CNY', 'Chinese Yuan'],
  ['HKD', 'Hong Kong Dollar'],
  ['SGD', 'Singapore Dollar'],
  ['KRW', 'Korean Won'],
  ['THB', 'Thai Baht'],
  ['VND', 'Vietnamese Dong'],
  ['MYR', 'Malaysian Ringgit'],
  ['IDR', 'Indonesian Rupiah'],
  ['PHP', 'Philippine Peso'],
  ['INR', 'Indian Rupee'],
  ['AUD', 'Australian Dollar'],
  ['NZD', 'New Zealand Dollar'],
  ['CAD', 'Canadian Dollar'],
  ['CHF', 'Swiss Franc'],
  ['DKK', 'Danish Krone'],
  ['SEK', 'Swedish Krona'],
  ['NOK', 'Norwegian Krone'],
  ['ISK', 'Icelandic Krona'],
  ['CZK', 'Czech Koruna'],
  ['PLN', 'Polish Zloty'],
  ['HUF', 'Hungarian Forint'],
  ['TRY', 'Turkish Lira'],
  ['AED', 'UAE Dirham'],
  ['ILS', 'Israeli Shekel'],
  ['ZAR', 'South African Rand'],
  ['BRL', 'Brazilian Real'],
  ['MXN', 'Mexican Peso'],
  ['ARS', 'Argentine Peso'],
];

const CCY_NAME = Object.fromEntries(CURRENCIES);
const RECENTS_KEY = 'splittrip_recent_ccy';

function getRecentCcys() {
  try {
    const r = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    return Array.isArray(r) ? r.filter(c => CCY_NAME[c]).slice(0, 5) : [];
  } catch { return []; }
}

function pushRecentCcy(code) {
  if (!CCY_NAME[code]) return;
  const cur = getRecentCcys().filter(c => c !== code);
  cur.unshift(code);
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, 5))); } catch {}
}

window.CURRENCIES = CURRENCIES;
window.CCY_NAME = CCY_NAME;
window.getRecentCcys = getRecentCcys;
window.pushRecentCcy = pushRecentCcy;
