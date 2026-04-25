// app-forms.jsx — Add/Edit Expense + Calculator + Split Editor

function AddExpenseScreen({ go, tripId, editId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const editing = editId ? trip?.expenses.find(e => e.id === editId) : null;

  const [title, setTitle] = React.useState(editing?.title || '');
  const [amount, setAmount] = React.useState(String(editing?.amount || ''));
  const [ccy, setCcy] = React.useState(editing?.ccy || trip?.currencies[0] || 'TWD');
  const [date, setDate] = React.useState(editing?.date || new Date().toISOString().slice(0,10));
  const [paidBy, setPaidBy] = React.useState(editing?.paidBy || trip?.members[0]?.id);
  const [cat, setCat] = React.useState(editing?.cat || 'food');
  const [mode, setMode] = React.useState(editing?.mode || 'equal');
  const [splitData, setSplitData] = React.useState(editing?.splitData ||
    { participants: trip?.members.map(m => m.id) || [] });
  const [note, setNote] = React.useState(editing?.note || '');
  const [calcOpen, setCalcOpen] = React.useState(false);
  const [calcExpr, setCalcExpr] = React.useState('');

  if (!trip) return null;

  const numAmount = ENGINE.calc(amount) || +amount || 0;

  React.useEffect(() => {
    if (ccy && trip && !trip.currencies.includes(ccy)) {
      dispatch({ type: 'TOGGLE_CCY', tripId, ccy });
    }
  }, [ccy]);

  const save = () => {
    if (!title.trim() || numAmount <= 0) { alert('請輸入名稱與金額'); return; }
    const expense = { title: title.trim(), amount: numAmount, ccy, date, paidBy, cat, mode, splitData, note };
    if (editing) {
      dispatch({ type: 'UPDATE_EXPENSE', tripId, id: editing.id, patch: expense });
    } else {
      dispatch({ type: 'ADD_EXPENSE', tripId, expense });
    }
    go('trip', { tripId });
  };

  const remove = () => {
    if (!editing) return;
    if (confirm('刪除這筆支出？')) {
      dispatch({ type: 'DELETE_EXPENSE', tripId, id: editing.id });
      go('trip', { tripId });
    }
  };

  const splits = [
    { id: 'equal',   l: '均分', sub: '人數平分' },
    { id: 'exact',   l: '金額', sub: '自由輸入' },
    { id: 'shares',  l: '等份', sub: '依 share' },
    { id: 'percent', l: '比例', sub: '依 %' },
  ];

  const cats = [
    { id: 'food', l: '餐飲' }, { id: 'lodging', l: '住宿' }, { id: 'transit', l: '交通' },
    { id: 'activity', l: '活動' }, { id: 'shop', l: '購物' },
  ];

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Nav bar */}
      <div style={{ padding: '54px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => go('trip', { tripId })}
          style={{ border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 15, cursor: 'pointer' }}>取消</button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{editing ? '編輯支出' : '新增支出'}</div>
        <button onClick={save} style={{
          border: 0, background: 'var(--ink)', color: 'var(--bg)',
          height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>儲存</button>
      </div>

      {/* Title */}
      <div style={{ padding: '8px 20px 0' }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="例如：晚餐、地鐵票"
          style={{
            width: '100%', border: 0, background: 'transparent',
            fontSize: 22, fontWeight: 600, color: 'var(--ink)', outline: 'none',
            padding: 0, fontFamily: 'inherit', letterSpacing: -0.2,
          }}/>
      </div>

      {/* Amount + currency */}
      <div style={{ padding: '18px 16px 0' }}>
        <div className="card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CcyPicker value={ccy} onChange={setCcy} allowedHint={`此旅程：${trip.currencies.join(' · ')}`}/>
          <input value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0" inputMode="decimal"
            style={{
              flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none',
              fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums',
              fontSize: 30, fontWeight: 600, color: 'var(--ink)',
              textAlign: 'right', letterSpacing: -0.5, padding: 0,
            }}/>
          <button onClick={() => setCalcOpen(!calcOpen)} style={{
            width: 38, height: 38, borderRadius: 11, border: 0, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: calcOpen ? 'var(--clay-soft)' : 'var(--bg-2)',
            color: calcOpen ? 'var(--clay-deep)' : 'var(--ink-2)',
          }}>
            <Icon.calc width={18} height={18}/>
          </button>
        </div>
        {ccy !== trip.baseCurrency && numAmount > 0 && (
          <div className="t-meta tabular" style={{ textAlign: 'right', marginTop: 4 }}>
            ≈ {fmtBase(ENGINE.toBase(numAmount, ccy, trip.rates), trip)}
          </div>
        )}
        {calcOpen && <Calculator expr={calcExpr} setExpr={setCalcExpr}
          onResult={v => { setAmount(String(v)); setCalcOpen(false); }}/>}
      </div>

      {/* Date / payer / category */}
      <div style={{ padding: '18px 16px 0' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <FormRow label="日期">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ border: 0, background: 'transparent', color: 'var(--ink-2)', fontFamily: 'inherit', fontSize: 14, outline: 'none', cursor: 'pointer' }}/>
          </FormRow>
          <FormRow label="付款人">
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
              style={{ border: 0, background: 'transparent', color: 'var(--ink-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', appearance: 'none' }}>
              {trip.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="分類" last>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {cats.map(c => {
                const on = cat === c.id;
                return (
                  <button key={c.id} onClick={() => setCat(c.id)}
                    style={{
                      fontSize: 11, padding: '3px 9px', cursor: 'pointer',
                      borderRadius: 999, fontWeight: 500, fontFamily: 'inherit',
                      background: on ? 'var(--clay-soft)' : 'var(--bg-2)',
                      color: on ? 'var(--clay-deep)' : 'var(--ink-2)',
                      border: on ? '0.5px solid color-mix(in oklch, var(--clay-deep) 35%, transparent)' : '0.5px solid var(--hairline)',
                    }}>{c.l}</button>
                );
              })}
            </div>
          </FormRow>
        </div>
      </div>

      {/* Split mode */}
      <div style={{ padding: '20px 20px 0' }}>
        <div className="t-cap" style={{ marginBottom: 10 }}>分帳方式</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {splits.map(s => {
            const on = s.id === mode;
            return (
              <button key={s.id} onClick={() => setMode(s.id)}
                style={{
                  padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                  background: on ? 'var(--clay-soft)' : 'var(--surface)',
                  color: on ? 'var(--clay-deep)' : 'var(--ink-2)',
                  borderRadius: 'var(--r-md)',
                  border: on ? '0.5px solid color-mix(in oklch, var(--clay-deep) 35%, transparent)' : '0.5px solid var(--hairline)',
                  fontFamily: 'inherit',
                }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 10, marginTop: 2, color: on ? 'color-mix(in oklch, var(--clay-deep) 70%, transparent)' : 'var(--ink-3)' }}>{s.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split editor */}
      <div style={{ padding: '12px 16px 0' }}>
        <SplitEditor mode={mode} amount={numAmount} ccy={ccy}
          members={trip.members} splitData={splitData} setSplitData={setSplitData}/>
      </div>

      {/* Note */}
      <div style={{ padding: '14px 16px 0' }}>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="備註"
          rows={2} style={{
            width: '100%', border: '0.5px solid var(--hairline)',
            borderRadius: 14, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13,
            background: 'var(--surface)', color: 'var(--ink)', outline: 'none', resize: 'none',
          }}/>
      </div>

      {editing && (
        <div style={{ padding: '14px 20px 0', textAlign: 'center' }}>
          <button onClick={remove} style={{ border: 0, background: 'transparent', color: 'var(--neg)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            刪除這筆支出
          </button>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, children, last }) {
  return (
    <div style={{
      padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      borderBottom: last ? 0 : '0.5px solid var(--hairline)',
    }}>
      <span className="t-body" style={{ fontSize: 14 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function Calculator({ expr, setExpr, onResult }) {
  const result = ENGINE.calc(expr);
  const press = (k) => {
    if (k === 'C') { setExpr(''); return; }
    if (k === '⌫') { setExpr(expr.slice(0, -1)); return; }
    if (k === '=') { onResult(ENGINE.round2(result)); setExpr(''); return; }
    setExpr(expr + k);
  };
  const keys = [
    ['C','⌫','%','÷'], ['7','8','9','×'], ['4','5','6','−'],
    ['1','2','3','+'], ['0','.','=',''],
  ];
  return (
    <div className="card" style={{ marginTop: 12, padding: 10, borderRadius: 16, background: 'color-mix(in oklch, var(--bg-2) 70%, transparent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px 8px' }}>
        <div className="t-meta" style={{ fontFamily: 'var(--font-num)', minHeight: 16 }}>{expr || '0'}</div>
        <div className="t-amount tabular" style={{ fontSize: 15, fontWeight: 600 }}>= {ENGINE.round2(result)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        {keys.flat().map((k, i) => {
          if (!k) return <div key={i}/>;
          const isOp = '÷×−+%'.includes(k);
          const isFn = 'C⌫'.includes(k);
          return (
            <button key={i} onClick={() => press(k)} style={{
              height: 36, borderRadius: 10, border: 0, cursor: 'pointer',
              fontSize: 16, fontWeight: 500,
              background: k === '=' ? 'var(--ink)' : (isOp || isFn) ? 'var(--clay-soft)' : 'var(--surface)',
              color: k === '=' ? 'var(--bg)' : (isOp || isFn) ? 'var(--clay-deep)' : 'var(--ink)',
              fontFamily: 'var(--font-num)',
            }}>{k}</button>
          );
        })}
      </div>
    </div>
  );
}

function SplitEditor({ mode, amount, ccy, members, splitData, setSplitData }) {
  const ids = splitData.participants?.length ? splitData.participants : members.map(m => m.id);
  const update = (patch) => setSplitData({ ...splitData, ...patch });

  if (mode === 'equal') {
    const each = ids.length ? amount / ids.length : 0;
    return (
      <div className="card" style={{ padding: '4px 14px' }}>
        {members.map((m, i) => {
          const on = ids.includes(m.id);
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i === members.length-1 ? 0 : '0.5px solid var(--hairline)',
            }}>
              <Avatar member={m} size={28}/>
              <div className="t-body" style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
              {on && <span className="t-amount tabular" style={{ color: 'var(--ink-2)', fontSize: 13 }}>{fmtMoney(each, ccy)}</span>}
              <button onClick={() => {
                const next = on ? ids.filter(x => x !== m.id) : [...ids, m.id];
                update({ participants: next });
              }} style={{
                width: 24, height: 24, borderRadius: '50%', border: '1.5px solid var(--hairline-strong)',
                background: on ? 'var(--sage-deep)' : 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <Icon.check width={14} height={14} style={{ color: '#fff' }}/>}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === 'exact') {
    const cur = splitData.exact || {};
    const sum = members.reduce((s, m) => s + (+cur[m.id] || 0), 0);
    return (
      <div className="card" style={{ padding: '4px 14px' }}>
        {members.map((m, i) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
            borderBottom: i === members.length-1 ? 0 : '0.5px solid var(--hairline)',
          }}>
            <Avatar member={m} size={28}/>
            <div className="t-body" style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
            <input value={cur[m.id] ?? ''} onChange={e => update({ exact: { ...cur, [m.id]: e.target.value } })}
              inputMode="decimal" placeholder="0" style={{
                width: 90, border: '0.5px solid var(--hairline-strong)', borderRadius: 10,
                padding: '5px 10px', textAlign: 'right', background: 'var(--bg-2)',
                color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-num)',
                fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 500,
              }}/>
            <span className="t-meta" style={{ width: 30, fontSize: 11 }}>{ccy}</span>
          </div>
        ))}
        <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid var(--hairline)' }}>
          <span className="t-meta">合計</span>
          <span className="t-amount tabular" style={{ color: Math.abs(sum - amount) < 0.01 ? 'var(--sage-deep)' : 'var(--neg)', fontWeight: 600 }}>
            {fmtMoney(sum, ccy)} / {fmtMoney(amount, ccy)}{Math.abs(sum - amount) < 0.01 ? ' ✓' : ''}
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'shares') {
    const cur = splitData.shares || Object.fromEntries(members.map(m => [m.id, 1]));
    const tot = members.reduce((s, m) => s + (+cur[m.id] || 0), 0) || 1;
    return (
      <div className="card" style={{ padding: '4px 14px' }}>
        {members.map((m, i) => {
          const sh = +cur[m.id] || 0;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i === members.length-1 ? 0 : '0.5px solid var(--hairline)',
            }}>
              <Avatar member={m} size={28}/>
              <div style={{ flex: 1 }}>
                <div className="t-body" style={{ fontSize: 14 }}>{m.name}</div>
                <div className="t-meta" style={{ fontSize: 11 }}>
                  {(sh/tot*100).toFixed(0)}% · {fmtMoney(amount*sh/tot, ccy)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--hairline-strong)', borderRadius: 999, background: 'var(--bg-2)' }}>
                <button onClick={() => update({ shares: { ...cur, [m.id]: Math.max(0, sh-1) } })}
                  style={{ width: 28, height: 28, border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 16, cursor: 'pointer' }}>−</button>
                <span className="t-amount tabular" style={{ width: 22, textAlign: 'center', fontSize: 14 }}>{sh}</span>
                <button onClick={() => update({ shares: { ...cur, [m.id]: sh+1 } })}
                  style={{ width: 28, height: 28, border: 0, background: 'transparent', color: 'var(--ink-2)', fontSize: 14, cursor: 'pointer' }}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // percent
  const cur = splitData.percent || Object.fromEntries(members.map((m, i, a) => [m.id, Math.round(100/a.length)]));
  const sum = members.reduce((s, m) => s + (+cur[m.id] || 0), 0);
  return (
    <div className="card" style={{ padding: '4px 14px' }}>
      {members.map((m, i) => {
        const p = +cur[m.id] || 0;
        return (
          <div key={m.id} style={{
            padding: '10px 0',
            borderBottom: i === members.length-1 ? 0 : '0.5px solid var(--hairline)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar member={m} size={28}/>
              <div className="t-body" style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
              <span className="t-amount tabular" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
                {fmtMoney(amount*p/100, ccy)}
              </span>
              <input value={cur[m.id] ?? ''} onChange={e => update({ percent: { ...cur, [m.id]: +e.target.value || 0 } })}
                inputMode="decimal" style={{
                  width: 54, border: '0.5px solid var(--hairline-strong)', borderRadius: 10,
                  padding: '5px 8px', textAlign: 'right', background: 'var(--bg-2)',
                  color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-num)',
                  fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 500,
                }}/>
              <span className="t-meta" style={{ width: 12, fontSize: 11 }}>%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, marginTop: 6, background: 'var(--bg-2)', marginLeft: 38 }}>
              <div style={{
                width: `${Math.min(100, p)}%`, height: '100%',
                background: ['var(--sage)','var(--clay)','var(--stone)','var(--rose)','var(--plum)'][i%5],
                borderRadius: 2,
              }}/>
            </div>
          </div>
        );
      })}
      <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid var(--hairline)' }}>
        <span className="t-meta">合計</span>
        <span className="t-amount tabular" style={{ color: sum === 100 ? 'var(--sage-deep)' : 'var(--neg)', fontWeight: 600 }}>
          {sum}% {sum === 100 ? '✓' : ''}
        </span>
      </div>
    </div>
  );
}

window.AddExpenseScreen = AddExpenseScreen;
window.Calculator = Calculator;
window.SplitEditor = SplitEditor;
