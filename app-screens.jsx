// app-screens.jsx — Trip dashboard + Settle screen

function TripScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const [showMenu, setShowMenu] = React.useState(false);
  if (!trip) return null;

  const tots = ENGINE.totals(trip);
  const net = ENGINE.netBalances(trip);
  const me = trip.members.find(m => m.isMe) || trip.members[0];
  const myBal = me ? net[me.id] : 0;
  const expenses = [...trip.expenses].sort((a,b) => b.date.localeCompare(a.date));

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Hero header */}
      <div style={{
        height: 190, background: COVERS[trip.cover % COVERS.length],
        position: 'relative', padding: '54px 20px 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <CircleIconBtn icon="back" onClick={() => go('home')}/>
          <CircleIconBtn icon="more" onClick={() => setShowMenu(true)}/>
        </div>
        <div style={{ marginTop: 16, color: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4 }}>{trip.title}</div>
          <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>
            {fmtDateRange(trip.startDate, trip.endDate)} · {trip.members.length} 人
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div style={{ padding: '0 16px', marginTop: -28 }}>
        <div className="card glass-thick" style={{
          padding: 18, borderRadius: 22,
          boxShadow: '0 8px 32px color-mix(in oklch, var(--ink) 10%, transparent)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="t-cap">你的餘額</div>
              <div className="t-amount" style={{
                fontSize: 30, fontWeight: 600, marginTop: 4,
                color: myBal > 0.5 ? 'var(--pos)' : myBal < -0.5 ? 'var(--neg)' : 'var(--ink)',
              }}>
                {myBal > 0 ? '+' : myBal < 0 ? '−' : ''}{fmtBase(Math.abs(myBal), trip)}
              </div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {myBal > 0.5 ? '其他人應付給你' : myBal < -0.5 ? '你應付給其他人' : '已結平'}
              </div>
            </div>
            {Math.abs(myBal) > 0.5 && (
              <button onClick={() => go('settle', { tripId: trip.id })} style={{
                border: 0, background: 'var(--ink)', color: 'var(--bg)',
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>結算 →</button>
            )}
          </div>
          <div style={{ height: 0.5, background: 'var(--hairline)', margin: '14px -18px' }}/>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { l: '總支出', v: fmtBase(tots.spent, trip) },
              { l: '人均', v: fmtBase(tots.perPerson, trip) },
              { l: '筆數', v: trip.expenses.length },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div className="t-cap" style={{ fontSize: 9 }}>{s.l}</div>
                <div className="t-amount tabular" style={{ fontSize: 14, marginTop: 2, fontWeight: 500 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scroll">
        {[
          { id: 'settle',  l: '結算', icon: 'swap' },
          { id: 'stats',   l: '圖表', icon: 'chart' },
          { id: 'rates',   l: '匯率', icon: 'globe' },
          { id: 'members', l: '成員', icon: 'people' },
          { id: 'export',  l: '匯出', icon: 'download' },
        ].map(a => (
          <button key={a.id} onClick={() => go(a.id, { tripId: trip.id })}
            className="glass-pill" style={{
              height: 36, padding: '0 14px', borderRadius: 999, border: 0, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink)',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            }}>
            {React.createElement(Icon[a.icon], { width: 14, height: 14 })}{a.l}
          </button>
        ))}
      </div>

      {/* Expenses list */}
      <div style={{ padding: '14px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-cap">支出 · {expenses.length}</div>
      </div>

      {expenses.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div className="t-meta">還沒有任何支出，點下方 + 新增第一筆。</div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {expenses.map((e, i, arr) => {
          const sameDay = i > 0 && arr[i-1].date === e.date;
          return (
            <React.Fragment key={e.id}>
              {!sameDay && (
                <div className="t-meta" style={{ padding: '12px 4px 6px', fontWeight: 500 }}>
                  {fmtDate(e.date)}
                </div>
              )}
              <button onClick={() => go('expense', { tripId: trip.id, id: e.id })}
                className="card" style={{
                  width: '100%', textAlign: 'left', border: '0.5px solid var(--hairline)',
                  padding: '12px 14px', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--surface)',
                  borderRadius: 'var(--r-lg)',
                }}>
                <CatIcon catId={e.cat}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-h" style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.title}
                  </div>
                  <div className="t-meta" style={{ marginTop: 2, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {trip.members.find(m => m.id === e.paidBy)?.name || '?'} 付 ·
                    <SplitBadge type={e.mode}/>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="t-amount tabular" style={{ fontSize: 14, fontWeight: 600 }}>
                    {fmtMoney(e.amount, e.ccy)}
                  </div>
                  {e.ccy !== trip.baseCurrency && (
                    <div className="t-meta tabular" style={{ fontSize: 10, marginTop: 2 }}>
                      ≈ {fmtBase(ENGINE.toBase(e.amount, e.ccy, trip.rates), trip)}
                    </div>
                  )}
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* FAB */}
      <div style={{
        position: 'fixed',
        bottom: 'max(88px, calc(env(safe-area-inset-bottom, 0px) + 84px))',
        right: 20, zIndex: 29,
      }}>
        <button onClick={() => go('add', { tripId: trip.id })} style={{
          width: 56, height: 56, borderRadius: 18, border: 0, cursor: 'pointer',
          background: 'var(--ink)', color: 'var(--bg)',
          boxShadow: '0 8px 24px color-mix(in oklch, var(--ink) 30%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon.plus width={26} height={26}/></button>
      </div>

      {showMenu && <TripMenu trip={trip} dispatch={dispatch} go={go} onClose={() => setShowMenu(false)}/>}
    </div>
  );
}

function TripMenu({ trip, dispatch, go, onClose }) {
  const [syncStatus, setSyncStatus] = React.useState({ status: 'idle', lastSynced: null });
  React.useEffect(() => GDriveSync.subscribe(setSyncStatus), []);

  const menuItem = (label, icon, onClick, danger) => (
    <button onClick={() => { onClose(); onClick(); }} style={{
      width: '100%', textAlign: 'left', border: 0, background: 'transparent',
      padding: '14px 20px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
      color: danger ? 'var(--neg)' : 'var(--ink)', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {icon}
      {label}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 20px 6px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, letterSpacing: 0.3 }}>
          {trip.title}
        </div>
        <div style={{ height: '0.5px', background: 'var(--hairline)', margin: '0 20px 6px' }}/>

        {menuItem('雲端同步', (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 0 9"/>
            <path d="M12 22V13"/>
            <path d="m8 17 4-4 4 4"/>
          </svg>
        ), () => GDriveSync.requestSync())}

        {menuItem('刪除旅程', (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        ), () => { if (confirm('刪除此旅程？')) { dispatch({ type: 'DELETE_TRIP', id: trip.id }); go('home'); } }, true)}

        <div style={{ height: '0.5px', background: 'var(--hairline)', margin: '6px 20px 0' }}/>
        <div style={{ padding: '10px 20px 0', fontSize: 10, color: 'var(--ink-3)', letterSpacing: 0.3 }}>
          最後同步時間：{syncStatus.lastSynced
            ? syncStatus.lastSynced.toLocaleString('zh-TW', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
            : '尚未同步'}
        </div>
      </div>
    </div>
  );
}

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  const wk = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
  return `${dt.getMonth()+1}/${dt.getDate()} · ${wk}`;
}

function SplitBadge({ type }) {
  const map = {
    equal:   { l: '均分', c: 'sage' },
    exact:   { l: '指定', c: 'clay' },
    shares:  { l: '等份', c: 'stone' },
    percent: { l: '比例', c: 'plum' },
  };
  const it = map[type] || map.equal;
  return <span className={`chip ${it.c}`} style={{ fontSize: 10, padding: '1px 7px' }}>{it.l}</span>;
}

// ─── Settle ──────────────────────────────────────────────────
function SettleScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const [showLoanForm, setShowLoanForm] = React.useState(false);
  if (!trip) return null;
  const transfers = ENGINE.simplify(trip);
  const tots = ENGINE.totals(trip);
  const memberOf = id => trip.members.find(m => m.id === id);
  const loans = trip.loans || [];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '54px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <div style={{ fontSize: 15, fontWeight: 600 }}>結算</div>
        <div style={{ width: 32 }}/>
      </div>

      <div style={{ padding: '8px 24px 0' }}>
        <div className="t-cap">最少筆數結算</div>
        <div className="t-display" style={{ fontSize: 30, marginTop: 6 }}>
          {transfers.length === 0 ? '已經結平 ✓' : `${transfers.length} 筆轉帳就完成`}
        </div>
        <div className="t-meta" style={{ marginTop: 8 }}>
          系統試過所有組合，這是最少筆數的解。
        </div>
      </div>

      {transfers.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          {transfers.map((tr, i) => {
            const from = memberOf(tr.from), to = memberOf(tr.to);
            return (
              <div key={i} className="card glass-thick" style={{ padding: 18, marginBottom: 10, borderRadius: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={from} size={44}/>
                  <Icon.arrow width={18} height={18} style={{ color: 'var(--ink-3)' }}/>
                  <Avatar member={to} size={44}/>
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <div className="t-h" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      <b style={{ color: 'var(--ink)' }}>{from?.name}</b> 應付給 <b style={{ color: 'var(--ink)' }}>{to?.name}</b>
                    </div>
                    <div className="t-amount" style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>
                      {fmtBase(tr.amount, trip)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loans section */}
      <div style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-cap">借款紀錄</div>
        <button onClick={() => setShowLoanForm(true)} style={{
          border: 0, background: 'var(--surface)', color: 'var(--ink)',
          padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icon.plus width={12} height={12}/> 記錄借款
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loans.length === 0 ? (
          <div className="t-meta" style={{ padding: '10px 4px', fontSize: 13 }}>尚無借款紀錄</div>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {loans.map((l, i) => {
              const lender = memberOf(l.from), borrower = memberOf(l.to);
              return (
                <div key={l.id} style={{
                  padding: '11px 0', borderBottom: i < loans.length-1 ? '0.5px solid var(--hairline)' : 0,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Avatar member={lender} size={28}/>
                  <Icon.arrow width={14} height={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }}/>
                  <Avatar member={borrower} size={28}/>
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
                    <div className="t-body" style={{ fontSize: 13 }}>
                      <b>{lender?.name}</b> 借給 <b>{borrower?.name}</b>
                    </div>
                    {l.note && <div className="t-meta" style={{ fontSize: 11, marginTop: 1 }}>{l.note}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-amount tabular" style={{ fontSize: 14, fontWeight: 600 }}>{fmtMoney(l.amount, l.ccy)}</div>
                    {l.ccy !== trip.baseCurrency && (
                      <div className="t-meta tabular" style={{ fontSize: 10 }}>≈ {fmtBase(ENGINE.toBase(l.amount, l.ccy, trip.rates), trip)}</div>
                    )}
                  </div>
                  <button onClick={() => dispatch({ type: 'DELETE_LOAN', tripId, id: l.id })} style={{
                    border: 0, background: 'transparent', color: 'var(--ink-3)',
                    padding: '4px 6px', cursor: 'pointer', fontSize: 16, lineHeight: 1,
                  }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 8px' }}>
        <div className="t-cap">明細</div>
      </div>
      <div style={{ padding: '0 16px' }}>
        <div className="card" style={{ padding: '4px 16px' }}>
          <Line l="總支出" v={fmtBase(tots.spent, trip)}/>
          <Line l="人均應分擔" v={fmtBase(tots.perPerson, trip)}/>
        </div>
        <div className="card" style={{ padding: '4px 16px', marginTop: 8 }}>
          {trip.members.map(m => {
            const paid = tots.paidBy[m.id] || 0;
            const bal = ENGINE.netBalances(trip)[m.id] || 0;
            return (
              <div key={m.id} style={{
                padding: '10px 0', borderBottom: '0.5px solid var(--hairline)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Avatar member={m} size={28}/>
                <div className="t-body" style={{ flex: 1 }}>{m.name}</div>
                <div className="t-meta" style={{ textAlign: 'right' }}>付 {fmtBase(paid, trip)}</div>
                <div className="t-amount tabular" style={{
                  width: 90, textAlign: 'right', fontWeight: 600,
                  color: bal > 0 ? 'var(--pos)' : bal < 0 ? 'var(--neg)' : 'var(--ink)',
                }}>
                  {bal > 0 ? '+' : bal < 0 ? '−' : ''}{fmtBase(Math.abs(bal), trip)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showLoanForm && (
        <LoanForm trip={trip} tripId={tripId} onClose={() => setShowLoanForm(false)}/>
      )}
    </div>
  );
}

function LoanForm({ trip, tripId, onClose }) {
  const [, dispatch] = useStore();
  const me = trip.members.find(m => m.isMe) || trip.members[0];
  const other = trip.members.find(m => m.id !== me?.id) || trip.members[1];
  const [from, setFrom] = React.useState(me?.id || trip.members[0]?.id);
  const [to, setTo]     = React.useState(other?.id || trip.members[1]?.id);
  const [amount, setAmount] = React.useState('');
  const [ccy, setCcy]   = React.useState(trip.baseCurrency);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState('');

  const save = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0 || from === to) return;
    dispatch({ type: 'ADD_LOAN', tripId, loan: { from, to, amount: n, ccy, date, note } });
    onClose();
  };

  const selStyle = {
    border: '0.5px solid var(--hairline)', background: 'var(--surface)',
    borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'inherit', width: '100%', outline: 'none',
    WebkitAppearance: 'none', appearance: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `24px 20px calc(env(safe-area-inset-bottom, 0px) + 28px)`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>記錄借款</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>借出方</div>
            <select value={from} onChange={e => setFrom(e.target.value)} style={selStyle}>
              {trip.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <Icon.arrow width={16} height={16} style={{ color: 'var(--ink-3)', marginTop: 20 }}/>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>借入方</div>
            <select value={to} onChange={e => setTo(e.target.value)} style={selStyle}>
              {trip.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {from === to && (
          <div style={{ color: 'var(--neg)', fontSize: 12, marginBottom: 10 }}>借出方和借入方不能相同</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 14 }}>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>幣別</div>
            <select value={ccy} onChange={e => setCcy(e.target.value)} style={selStyle}>
              {trip.currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>金額</div>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{ ...selStyle, textAlign: 'right' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="t-cap" style={{ marginBottom: 6 }}>備註（可空）</div>
          <input
            placeholder="例如：墊付計程車費"
            value={note} onChange={e => setNote(e.target.value)}
            style={selStyle}
          />
        </div>

        <button onClick={save} disabled={!amount || parseFloat(amount) <= 0 || from === to} style={{
          width: '100%', border: 0, background: 'var(--ink)', color: 'var(--bg)',
          padding: '14px 0', borderRadius: 14, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', opacity: (!amount || parseFloat(amount) <= 0 || from === to) ? 0.4 : 1,
        }}>儲存借款</button>
      </div>
    </div>
  );
}

function Line({ l, v }) {
  return (
    <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid var(--hairline)' }}>
      <span className="t-body" style={{ color: 'var(--ink-2)' }}>{l}</span>
      <span className="t-amount tabular" style={{ fontWeight: 500 }}>{v}</span>
    </div>
  );
}

window.TripScreen = TripScreen;
window.SettleScreen = SettleScreen;
window.SplitBadge = SplitBadge;
window.fmtDate = fmtDate;
