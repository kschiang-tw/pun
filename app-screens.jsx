// app-screens.jsx — Trip dashboard + Settle screen

function TripScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const [showMenu,   setShowMenu]   = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [editPay,    setEditPay]    = React.useState(null);
  if (!trip) return null;

  const tots = ENGINE.totals(trip);
  const net = ENGINE.netBalances(trip);
  const me = trip.members.find(m => m.isMe) || trip.members[0];
  const myBal = me ? net[me.id] : 0;
  const settled = ENGINE.isSettled(myBal, trip.baseCurrency);
  const expenses = [...trip.expenses].sort((a,b) => b.date.localeCompare(a.date));
  const payments = trip.settlements || [];
  const memberName = id => trip.members.find(m => m.id === id)?.name || '?';
  // Expenses and settle-up payments in one timeline (Splitwise-style).
  // Same-day payments go first; stable sort keeps expense order intact.
  const items = [
    ...[...payments].reverse().map(p => ({ kind: 'pay', id: p.id, date: p.date || '', rec: p })),
    ...expenses.map(e => ({ kind: 'exp', id: e.id, date: e.date, rec: e })),
  ].sort((a,b) => b.date.localeCompare(a.date));

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
                color: settled ? 'var(--ink)' : myBal > 0 ? 'var(--pos)' : 'var(--neg)',
              }}>
                {settled ? '' : myBal > 0 ? '+' : '−'}{fmtBase(settled ? 0 : Math.abs(myBal), trip)}
              </div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {!settled ? (myBal > 0 ? '其他人應付給你' : '你應付給其他人')
                  : payments.length ? '已結清 ✓' : '已結平'}
              </div>
            </div>
            {!settled && (
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
        <div className="t-cap">支出 · {expenses.length}{payments.length > 0 && `　還款 · ${payments.length}`}</div>
      </div>

      {items.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div className="t-meta">還沒有任何支出，點下方 + 新增第一筆。</div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {items.map((it, i, arr) => {
          const sameDay = i > 0 && arr[i-1].date === it.date;
          const dayHeader = !sameDay && (
            <div className="t-meta" style={{ padding: '12px 4px 6px', fontWeight: 500 }}>
              {it.date ? fmtDate(it.date) : '—'}
            </div>
          );
          if (it.kind === 'pay') {
            const p = it.rec;
            return (
              <React.Fragment key={'p' + p.id}>
                {dayHeader}
                <PaymentRow trip={trip} p={p} memberName={memberName} onClick={() => setEditPay(p)}/>
              </React.Fragment>
            );
          }
          const e = it.rec;
          return (
            <React.Fragment key={e.id}>
              {dayHeader}
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
                    {typeof e.paidBy === 'string'
                      ? (trip.members.find(m => m.id === e.paidBy)?.name || '?')
                      : Object.entries(e.paidBy).filter(([,a]) => a > 0).map(([id]) => trip.members.find(m => m.id === id)?.name || '?').join('、')
                    } 付 ·
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

      {showMenu && <TripMenu trip={trip} dispatch={dispatch} go={go}
        onClose={() => setShowMenu(false)} onInvite={() => setShowInvite(true)}/>}
      {showInvite && <InviteSheet tripId={trip.id} onClose={() => setShowInvite(false)}/>}
      {editPay && <SettleUpSheet trip={trip} tripId={trip.id} editing={editPay}
        onClose={() => setEditPay(null)}/>}
    </div>
  );
}

// A settle-up payment in the trip timeline — "A 付給 B · 還款".
function PaymentRow({ trip, p, memberName, onClick }) {
  return (
    <button onClick={onClick} className="card" style={{
      width: '100%', textAlign: 'left', border: '0.5px solid var(--hairline)',
      padding: '12px 14px', marginBottom: 6,
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--surface)',
      borderRadius: 'var(--r-lg)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'var(--sage-soft)', color: 'var(--sage-deep)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon.check width={20} height={20}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-h" style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {memberName(p.from)} 付給 {memberName(p.to)}
        </div>
        <div className="t-meta" style={{ marginTop: 2, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="chip" style={{ fontSize: 10, padding: '1px 7px', flexShrink: 0 }}>還款</span>
          {p.note && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.note}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="t-amount tabular" style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-deep)' }}>
          {fmtMoney(p.amount, p.ccy)}
        </div>
        {p.ccy !== trip.baseCurrency && (
          <div className="t-meta tabular" style={{ fontSize: 10, marginTop: 2 }}>
            ≈ {fmtBase(ENGINE.toBase(p.amount, p.ccy, trip.rates), trip)}
          </div>
        )}
      </div>
    </button>
  );
}

function TripMenu({ trip, dispatch, go, onClose, onInvite }) {
  const { user } = useAuth();
  const [s] = useStore();
  const { setCurrentTrip } = useTripActions();
  const isCurrent = s.currentTripId === trip.id;

  // 設定 / 取消「目前旅程」— 同步至自己的雲端帳號（跨裝置），但不分享給旅伴
  const toggleCurrent = () => {
    setCurrentTrip(isCurrent ? null : trip.id);
  };

  // accessList: new trips have it; fall back to just the current owner for old trips
  const accessList = (trip.accessList && trip.accessList.length > 0)
    ? trip.accessList
    : (user && trip.ownerId === user.uid
        ? [{ uid: user.uid, email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || null }]
        : []);

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

        {menuItem(
          isCurrent ? '取消目前旅程' : '設為目前旅程（置頂）',
          <Icon.pin width={20} height={20}/>,
          toggleCurrent,
        )}

        {menuItem('邀請旅伴', (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
        ), () => { onClose(); onInvite(); })}

        {/* Access list */}
        {accessList.length > 0 && (
          <div style={{ padding: '6px 20px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500,
              letterSpacing: 0.4, marginBottom: 10, textTransform: 'uppercase' }}>
              已加入
            </div>
            {accessList.map(member => (
              <div key={member.uid} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {member.photoURL ? (
                  <img src={member.photoURL} referrerPolicy="no-referrer"
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--surface)', border: '0.5px solid var(--hairline)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: 'var(--ink-2)',
                  }}>
                    {(member.displayName || member.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                    {member.displayName || member.email || '未知'}
                  </div>
                  {member.displayName && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.email}
                    </div>
                  )}
                </div>
                {member.uid === trip.ownerId && (
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>擁有者</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: '0.5px', background: 'var(--hairline)', margin: '0 20px 6px' }}/>

        {menuItem('刪除旅程', (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        ), () => { if (confirm('刪除此旅程？')) { dispatch({ type: 'DELETE_TRIP', id: trip.id }); go('home'); } }, true)}
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
// Local calendar date (toISOString() is UTC — wrong day before 8am in Taiwan).
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function SettleScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const [showLoanForm, setShowLoanForm] = React.useState(false);
  // Settle-up sheet: { preset: transfer } to record, { editing: payment } to edit, {} for blank
  const [sheet, setSheet] = React.useState(null);
  if (!trip) return null;
  const transfers = ENGINE.simplify(trip);
  const tots = ENGINE.totals(trip);
  const net = ENGINE.netBalances(trip);
  const memberOf = id => trip.members.find(m => m.id === id);
  const loans = trip.loans || [];
  const payments = [...(trip.settlements || [])].sort((a,b) =>
    (b.date||'').localeCompare(a.date||'') || (b.createdAt||0) - (a.createdAt||0));
  const meId = (trip.members.find(m => m.isMe) || {}).id;
  const done = transfers.length === 0;

  const settleAll = () => {
    if (!confirm(`將 ${transfers.length} 筆轉帳全部記為「已付款」？\n之後仍可在還款紀錄中修改或刪除。`)) return;
    const date = localToday();
    transfers.forEach(tr => dispatch({ type: 'ADD_SETTLEMENT', tripId, settlement: {
      from: tr.from, to: tr.to, amount: tr.amount, ccy: trip.baseCurrency, date, note: '',
    } }));
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '54px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <div style={{ fontSize: 15, fontWeight: 600 }}>結算</div>
        <button onClick={() => go('export', { tripId })} style={{
          border: 0, background: 'var(--surface)', color: 'var(--ink-2)',
          height: 32, padding: '0 12px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {React.createElement(Icon.download, { width: 14, height: 14 })}
          匯出
        </button>
      </div>

      <div style={{ padding: '8px 24px 0' }}>
        <div className="t-cap">{done ? '結清狀態' : '最少筆數結算'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          {done && (
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'var(--sage-soft)', color: 'var(--sage-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon.check width={22} height={22}/></div>
          )}
          <div className="t-display" style={{ fontSize: 30 }}>
            {done ? (payments.length ? '全部結清' : '已經結平')
              : payments.length ? `還差 ${transfers.length} 筆` : `${transfers.length} 筆轉帳就完成`}
          </div>
        </div>
        <div className="t-meta" style={{ marginTop: 8 }}>
          {done
            ? (payments.length ? `已記錄 ${payments.length} 筆還款，大家互不相欠。` : '目前沒有人需要付款。')
            : '系統試過所有組合，這是最少筆數的解。付款後按「結清」記錄，餘額會自動更新。'}
        </div>
      </div>

      {transfers.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          {transfers.map((tr, i) => {
            const from = memberOf(tr.from), to = memberOf(tr.to);
            const hint = tr.from === meId ? '你付款後即可結清'
              : tr.to === meId ? '收到款項後記錄即可結清'
              : '付款後任何人都可以記錄';
            return (
              <div key={tr.from + '>' + tr.to} className="card glass-thick" style={{ padding: 18, marginBottom: 10, borderRadius: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={from} size={44}/>
                  <Icon.arrow width={18} height={18} style={{ color: 'var(--ink-3)' }}/>
                  <Avatar member={to} size={44}/>
                  <div style={{ flex: 1, marginLeft: 8, minWidth: 0 }}>
                    <div className="t-h" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      <b style={{ color: 'var(--ink)' }}>{from?.name}</b> 應付給 <b style={{ color: 'var(--ink)' }}>{to?.name}</b>
                    </div>
                    <div className="t-amount" style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>
                      {fmtBase(tr.amount, trip)}
                    </div>
                  </div>
                </div>
                <div style={{ height: 0.5, background: 'var(--hairline)', margin: '14px -18px 12px' }}/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div className="t-meta" style={{ fontSize: 12 }}>{hint}</div>
                  <button onClick={() => setSheet({ preset: tr })} style={{
                    border: 0, background: 'var(--ink)', color: 'var(--bg)', flexShrink: 0,
                    padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <Icon.check width={14} height={14}/> 結清
                  </button>
                </div>
              </div>
            );
          })}
          {transfers.length > 1 && (
            <button onClick={settleAll} style={{
              width: '100%', border: '0.5px solid var(--hairline-strong)', background: 'transparent',
              color: 'var(--ink-2)', padding: '12px 0', borderRadius: 14, marginTop: 2,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>全部標記為已結清</button>
          )}
        </div>
      )}

      {/* Settle-up payments */}
      <div style={{ padding: '24px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-cap">還款紀錄{payments.length > 0 && ` · ${payments.length}`}</div>
        <button onClick={() => setSheet({})} style={{
          border: 0, background: 'var(--surface)', color: 'var(--ink)',
          padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
        }}>
          <Icon.plus width={12} height={12}/> 記錄還款
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {payments.length === 0 ? (
          <div className="t-meta" style={{ padding: '10px 4px', fontSize: 13 }}>
            尚無還款紀錄。實際付款後按「結清」，餘額就會扣掉。
          </div>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {payments.map((p, i) => {
              const payer = memberOf(p.from), receiver = memberOf(p.to);
              return (
                <button key={p.id} onClick={() => setSheet({ editing: p })} style={{
                  width: '100%', border: 0, background: 'transparent', textAlign: 'left',
                  padding: '11px 0', borderBottom: i < payments.length-1 ? '0.5px solid var(--hairline)' : 0,
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--ink)',
                }}>
                  <Avatar member={payer} size={28}/>
                  <Icon.arrow width={14} height={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }}/>
                  <Avatar member={receiver} size={28}/>
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
                    <div className="t-body" style={{ fontSize: 13 }}>
                      <b>{payer?.name || '?'}</b> 付給 <b>{receiver?.name || '?'}</b>
                    </div>
                    <div className="t-meta" style={{ fontSize: 11, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.date ? fmtDate(p.date) : '—'}{p.note ? ` · ${p.note}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-amount tabular" style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-deep)' }}>{fmtMoney(p.amount, p.ccy)}</div>
                    {p.ccy !== trip.baseCurrency && (
                      <div className="t-meta tabular" style={{ fontSize: 10 }}>≈ {fmtBase(ENGINE.toBase(p.amount, p.ccy, trip.rates), trip)}</div>
                    )}
                  </div>
                  <Icon.chev width={14} height={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
            const bal = net[m.id] || 0;
            const zero = ENGINE.isSettled(bal, trip.baseCurrency);
            const hadPayments = payments.some(p => p.from === m.id || p.to === m.id);
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
                  color: zero ? (hadPayments ? 'var(--sage-deep)' : 'var(--ink)') : bal > 0 ? 'var(--pos)' : 'var(--neg)',
                }}>
                  {zero ? (hadPayments ? '已結清' : fmtBase(0, trip))
                    : `${bal > 0 ? '+' : '−'}${fmtBase(Math.abs(bal), trip)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showLoanForm && (
        <LoanForm trip={trip} tripId={tripId} onClose={() => setShowLoanForm(false)}/>
      )}
      {sheet && (
        <SettleUpSheet trip={trip} tripId={tripId} preset={sheet.preset} editing={sheet.editing}
          onClose={() => setSheet(null)}/>
      )}
    </div>
  );
}

// ─── Settle up sheet (記錄還款) ───────────────────────────────
// Splitwise-style "record a payment": payer → receiver, prefilled with the
// outstanding amount between them. Same sheet edits / deletes a payment.
function SettleUpSheet({ trip, tripId, preset, editing, onClose }) {
  const [, dispatch] = useStore();
  const base = trip.baseCurrency;
  const members = trip.members;
  // Suggestions leave out the payment being edited, otherwise it would net
  // itself out and the sheet would suggest paying 0.
  const transfers = ENGINE.simplify({ ...trip,
    settlements: (trip.settlements || []).filter(p => p.id !== editing?.id) });
  const me = members.find(m => m.isMe) || members[0];
  const init = editing || preset
    || transfers.find(t => t.from === me?.id) || transfers.find(t => t.to === me?.id) || transfers[0]
    || { from: me?.id, to: members.find(m => m.id !== me?.id)?.id };

  // Outstanding amount from → to, expressed in `c`.
  const suggestFor = (f, t, c) => {
    const tr = transfers.find(x => x.from === f && x.to === t);
    if (!tr) return null;
    return c === base ? tr.amount : tr.amount / (trip.rates[c] || 1);
  };
  const toInput = (n, c) => String(parseFloat(n.toFixed(ccyMaxDecimals(c))));

  const [from, setFrom] = React.useState(init.from);
  const [to, setTo]     = React.useState(init.to);
  const [ccy, setCcy]   = React.useState(editing?.ccy || base);
  const [amount, setAmount] = React.useState(() => {
    if (editing) return String(editing.amount);
    const sug = suggestFor(init.from, init.to, base);
    return sug ? toInput(sug, base) : '';
  });
  const [touched, setTouched] = React.useState(!!editing);  // user typed an amount
  const [date, setDate] = React.useState(editing?.date || localToday());
  const [note, setNote] = React.useState(editing?.note || '');

  // Changing who/currency re-fills the amount until the user types their own.
  const choose = (f, t, c) => {
    setFrom(f); setTo(t); setCcy(c);
    if (!touched) {
      const sug = suggestFor(f, t, c);
      setAmount(sug ? toInput(sug, c) : '');
    }
  };

  const suggestion = suggestFor(from, to, ccy);
  const n = parseFloat(amount);
  const valid = n > 0 && from && to && from !== to;
  const payer = members.find(m => m.id === from), receiver = members.find(m => m.id === to);

  const save = () => {
    if (!valid) return;
    let value = n;
    // The prefilled amount is rounded for display (NT$1,234.56 → 1235).
    // Snap back to the exact outstanding amount so the pair ends at exactly 0.
    if (suggestion != null && ccy === base && Math.abs(value - suggestion) < ENGINE.dust(base)) value = suggestion;
    const rec = { from, to, amount: value, ccy, date, note: note.trim() };
    if (editing) dispatch({ type: 'UPDATE_SETTLEMENT', tripId, id: editing.id, patch: rec });
    else dispatch({ type: 'ADD_SETTLEMENT', tripId, settlement: rec });
    onClose();
  };

  const remove = () => {
    if (!confirm('刪除這筆還款紀錄？\n刪除後，相關成員的餘額會恢復成付款前。')) return;
    dispatch({ type: 'DELETE_SETTLEMENT', tripId, id: editing.id });
    onClose();
  };

  const selStyle = {
    border: '0.5px solid var(--hairline)', background: 'var(--surface)',
    borderRadius: 10, padding: '11px 14px', fontSize: 16, color: 'var(--ink)',
    fontFamily: 'inherit', width: '100%', outline: 'none', boxSizing: 'border-box',
    WebkitAppearance: 'none', appearance: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{editing ? '編輯還款' : '記錄還款'}</div>
          <button onClick={onClose} style={{
            border: 0, background: 'var(--surface)', color: 'var(--ink-2)', width: 28, height: 28,
            borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon.close width={14} height={14}/></button>
        </div>

        {/* who → whom */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '6px 0 4px' }}>
          <Avatar member={payer} size={52}/>
          <Icon.arrow width={22} height={22} style={{ color: 'var(--ink-3)' }}/>
          <Avatar member={receiver} size={52}/>
        </div>
        <div className="t-body" style={{ textAlign: 'center', fontSize: 14, marginBottom: 18, color: 'var(--ink-2)' }}>
          <b style={{ color: 'var(--ink)' }}>{payer?.name || '?'}</b> 付給 <b style={{ color: 'var(--ink)' }}>{receiver?.name || '?'}</b>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>付款人</div>
            <select value={from} onChange={e => choose(e.target.value, to, ccy)} style={selStyle}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <Icon.arrow width={16} height={16} style={{ color: 'var(--ink-3)', marginTop: 20 }}/>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>收款人</div>
            <select value={to} onChange={e => choose(from, e.target.value, ccy)} style={selStyle}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {from === to && (
          <div style={{ color: 'var(--neg)', fontSize: 12, marginBottom: 10 }}>付款人和收款人不能相同</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 6 }}>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>幣別</div>
            <select value={ccy} onChange={e => choose(from, to, e.target.value)} style={selStyle}>
              {trip.currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>金額</div>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={amount} onChange={e => { setAmount(e.target.value); setTouched(true); }}
              style={{ ...selStyle, textAlign: 'right' }}
            />
          </div>
        </div>

        <div className="t-meta" style={{ fontSize: 12, minHeight: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {from !== to && (suggestion != null ? (
            <>
              <span>目前尚欠 {fmtMoney(suggestion, ccy)}{ccy !== base && `（≈ ${fmtBase(suggestion * (trip.rates[ccy] || 1), trip)}）`}</span>
              {Math.abs((n || 0) - suggestion) >= ENGINE.dust(ccy) && (
                <button onClick={() => { setAmount(toInput(suggestion, ccy)); setTouched(false); }} style={{
                  border: 0, background: 'var(--surface)', color: 'var(--ink)', padding: '3px 10px',
                  borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}>帶入全額</button>
              )}
              {n > 0 && n < suggestion - ENGINE.dust(ccy) && <span>· 部分還款</span>}
              {n > suggestion + ENGINE.dust(ccy) && <span style={{ color: 'var(--neg)' }}>· 超過尚欠金額</span>}
            </>
          ) : (
            <span>依目前結算，{payer?.name || '?'} 不需要付款給 {receiver?.name || '?'}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginBottom: 18 }}>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>日期</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...selStyle, minHeight: 44, padding: '10px 10px' }}/>
          </div>
          <div>
            <div className="t-cap" style={{ marginBottom: 6 }}>備註（可空）</div>
            <input placeholder="例如：LINE Pay" value={note} onChange={e => setNote(e.target.value)} style={selStyle}/>
          </div>
        </div>

        <button onClick={save} disabled={!valid} style={{
          width: '100%', border: 0, background: 'var(--ink)', color: 'var(--bg)',
          padding: '14px 0', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
          cursor: valid ? 'pointer' : 'default', opacity: valid ? 1 : 0.4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon.check width={16} height={16}/>{editing ? '儲存變更' : '確認已付款'}
        </button>

        {editing && (
          <button onClick={remove} style={{
            width: '100%', border: 0, background: 'transparent', color: 'var(--neg)',
            padding: '14px 0 2px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>刪除這筆還款</button>
        )}
      </div>
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
    borderRadius: 10, padding: '11px 14px', fontSize: 16, color: 'var(--ink)',
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
window.SettleUpSheet = SettleUpSheet;
window.SplitBadge = SplitBadge;
window.fmtDate = fmtDate;
