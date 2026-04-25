// engine.js — Pure math helpers. No React, no side effects.

const ENGINE = (() => {
  function computeShares(expense, members) {
    const { amount, mode, splitData } = expense;
    const ids = (splitData?.participants?.length ? splitData.participants
                 : members.map(m => m.id));

    if (mode === 'equal') {
      const each = round2(amount / ids.length);
      const out = {};
      let used = 0;
      ids.forEach((id, i) => {
        out[id] = i === ids.length - 1 ? round2(amount - used) : each;
        used += out[id];
      });
      return out;
    }

    if (mode === 'exact') {
      const out = {};
      ids.forEach(id => { out[id] = +(splitData.exact?.[id] || 0); });
      return out;
    }

    if (mode === 'shares') {
      const total = ids.reduce((s, id) => s + (+splitData.shares?.[id] || 0), 0);
      if (total === 0) return Object.fromEntries(ids.map(id => [id, 0]));
      const out = {};
      let used = 0;
      ids.forEach((id, i) => {
        const sh = +splitData.shares?.[id] || 0;
        const v = i === ids.length - 1
          ? round2(amount - used)
          : round2(amount * sh / total);
        out[id] = v; used += v;
      });
      return out;
    }

    if (mode === 'percent') {
      const out = {};
      let used = 0;
      ids.forEach((id, i) => {
        const p = +splitData.percent?.[id] || 0;
        const v = i === ids.length - 1
          ? round2(amount - used)
          : round2(amount * p / 100);
        out[id] = v; used += v;
      });
      return out;
    }

    return {};
  }

  function toBase(amount, ccy, rates) {
    const r = rates[ccy] ?? 1;
    return amount * r;
  }

  function netBalances(trip) {
    const { members, expenses, rates, loans = [] } = trip;
    const net = Object.fromEntries(members.map(m => [m.id, 0]));
    for (const e of expenses) {
      const baseAmt = toBase(e.amount, e.ccy, rates);
      net[e.paidBy] = (net[e.paidBy] || 0) + baseAmt;
      const shares = computeShares(e, members);
      for (const [id, s] of Object.entries(shares)) {
        const sBase = toBase(s, e.ccy, rates);
        net[id] = (net[id] || 0) - sBase;
      }
    }
    for (const l of loans) {
      const base = toBase(l.amount, l.ccy, rates);
      net[l.from] = (net[l.from] || 0) + base;
      net[l.to]   = (net[l.to]   || 0) - base;
    }
    for (const k of Object.keys(net)) net[k] = round2(net[k]);
    return net;
  }

  function simplify(trip) {
    const net = netBalances(trip);
    const creditors = [];
    const debtors = [];
    for (const [id, v] of Object.entries(net)) {
      if (v > 0.005) creditors.push([id, v]);
      else if (v < -0.005) debtors.push([id, -v]);
    }
    creditors.sort((a, b) => b[1] - a[1]);
    debtors.sort((a, b) => b[1] - a[1]);

    const out = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const [dId, dAmt] = debtors[i];
      const [cId, cAmt] = creditors[j];
      const pay = Math.min(dAmt, cAmt);
      out.push({ from: dId, to: cId, amount: round2(pay) });
      debtors[i][1] = round2(dAmt - pay);
      creditors[j][1] = round2(cAmt - pay);
      if (debtors[i][1] < 0.01) i++;
      if (creditors[j][1] < 0.01) j++;
    }
    return out;
  }

  function totals(trip) {
    const { members, expenses, rates } = trip;
    let spent = 0;
    const paidBy = {};
    const byCat = {};
    for (const m of members) paidBy[m.id] = 0;
    for (const e of expenses) {
      const b = toBase(e.amount, e.ccy, rates);
      spent += b;
      paidBy[e.paidBy] = (paidBy[e.paidBy] || 0) + b;
      byCat[e.cat] = (byCat[e.cat] || 0) + b;
    }
    return {
      spent: round2(spent),
      perPerson: members.length ? round2(spent / members.length) : 0,
      paidBy: Object.fromEntries(Object.entries(paidBy).map(([k,v]) => [k, round2(v)])),
      byCategory: Object.fromEntries(Object.entries(byCat).map(([k,v]) => [k, round2(v)])),
    };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function calc(expr) {
    if (!expr) return 0;
    const s = String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        tokens.push({ t: 'n', v: parseFloat(s.slice(i, j)) });
        i = j;
      } else if ('+-*/()'.includes(c)) {
        tokens.push({ t: c }); i++;
      } else { i++; }
    }
    const out = [], op = [];
    const prec = { '+':1,'-':1,'*':2,'/':2 };
    for (const tk of tokens) {
      if (tk.t === 'n') out.push(tk);
      else if (tk.t === '(') op.push(tk);
      else if (tk.t === ')') {
        while (op.length && op[op.length-1].t !== '(') out.push(op.pop());
        op.pop();
      } else {
        while (op.length && op[op.length-1].t in prec
          && prec[op[op.length-1].t] >= prec[tk.t]) out.push(op.pop());
        op.push(tk);
      }
    }
    while (op.length) out.push(op.pop());
    const stack = [];
    for (const tk of out) {
      if (tk.t === 'n') stack.push(tk.v);
      else {
        const b = stack.pop(), a = stack.pop() ?? 0;
        if (tk.t === '+') stack.push(a + b);
        else if (tk.t === '-') stack.push(a - b);
        else if (tk.t === '*') stack.push(a * b);
        else if (tk.t === '/') stack.push(b === 0 ? 0 : a / b);
      }
    }
    const r = stack[0];
    return Number.isFinite(r) ? r : 0;
  }

  function computeSplit(expense, members) { return computeShares(expense, members); }

  function byCategory(trip) {
    const out = {};
    for (const e of trip.expenses) {
      const b = toBase(e.amount, e.ccy, trip.rates);
      out[e.cat] = (out[e.cat] || 0) + b;
    }
    for (const k of Object.keys(out)) out[k] = round2(out[k]);
    return out;
  }

  function byDay(trip) {
    const map = {};
    for (const e of trip.expenses) {
      const b = toBase(e.amount, e.ccy, trip.rates);
      map[e.date] = (map[e.date] || 0) + b;
    }
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const out = [];
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end >= start) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const k = d.toISOString().slice(0,10);
        out.push({ date: k, amt: round2(map[k] || 0) });
      }
    } else {
      for (const k of Object.keys(map).sort()) out.push({ date: k, amt: round2(map[k]) });
    }
    return out;
  }

  function toCSV(trip) {
    const memberById = Object.fromEntries(trip.members.map(m => [m.id, m.name]));
    const rows = [
      ['Date','Title','Category','Paid by','Amount','Currency','Base ('+trip.baseCurrency+')','Mode','Note']
    ];
    const sorted = [...trip.expenses].sort((a,b) => a.date.localeCompare(b.date));
    for (const e of sorted) {
      rows.push([
        e.date, e.title, e.cat, memberById[e.paidBy] || e.paidBy,
        e.amount, e.ccy, round2(toBase(e.amount, e.ccy, trip.rates)),
        e.mode, e.note || '',
      ]);
    }
    return rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');
  }

  function toShareText(trip) {
    const t = totals(trip);
    const tr = simplify(trip);
    const memberById = Object.fromEntries(trip.members.map(m => [m.id, m.name]));
    const sym = { TWD:'NT$', USD:'$', EUR:'€', JPY:'¥', DKK:'kr', SEK:'kr', THB:'฿' };
    const fmt = (n) => Math.round(n).toLocaleString('en-US') + ' ' + (sym[trip.baseCurrency] || trip.baseCurrency);
    const lines = [];
    lines.push(`【${trip.title}】結算`);
    lines.push(`${trip.startDate} – ${trip.endDate} · ${trip.members.length} 人`);
    lines.push('');
    lines.push(`總支出 ${fmt(t.spent)}　人均 ${fmt(t.perPerson)}`);
    lines.push('');
    lines.push('— 支付明細 —');
    for (const m of trip.members) {
      lines.push(`${m.name}: 付 ${fmt(t.paidBy[m.id] || 0)}`);
    }
    lines.push('');
    if (tr.length === 0) {
      lines.push('✓ 已結平，無需轉帳');
    } else {
      lines.push(`— 結算 (${tr.length} 筆) —`);
      for (const x of tr) {
        lines.push(`${memberById[x.from]} → ${memberById[x.to]}：${fmt(x.amount)}`);
      }
    }
    return lines.join('\n');
  }

  return { computeShares, computeSplit, toBase, netBalances, simplify, totals,
    byCategory, byDay, toCSV, toShareText, calc, round2 };
})();

window.ENGINE = ENGINE;
