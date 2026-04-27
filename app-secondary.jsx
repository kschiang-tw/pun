// app-secondary.jsx — CreateTrip, Members, Rates, Stats, Export, ExpenseDetail

// ─── Create Trip ──────────────────────────────────────────────
function CreateTripScreen({ go }) {
  const [, dispatch] = useStore();
  const { user } = useAuth();
  const [title, setTitle] = React.useState('');
  const today = new Date().toISOString().slice(0,10);
  const inWeek = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(inWeek);
  const [base, setBase] = React.useState('TWD');
  const [cover, setCover] = React.useState(0);
  const [members, setMembers] = React.useState([{ name: '', isMe: true }, { name: '' }]);

  const create = () => {
    if (!title.trim()) { alert('請輸入旅程名稱'); return; }
    const meEntry = members.find(m => m.isMe);
    if (!meEntry?.name.trim()) { alert('請輸入你的名字'); return; }
    const tints = ['sage','clay','stone','rose','plum'];
    const ms = members.filter(m => m.name.trim()).map((m, i) => ({
      id: m.isMe ? 'me' : uid(),
      name: m.name.trim(),
      initial: m.name.trim()[0].toUpperCase(),
      tint: tints[i % tints.length],
      ...(m.isMe ? { isMe: true } : {}),  // never include isMe:undefined — Firestore throws on undefined values
    }));
    const accessList = user ? [{
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || null,
    }] : [];
    dispatch({ type:'CREATE_TRIP', title, startDate, endDate, cover,
      baseCurrency: base, currencies: [base], rates: { [base]: 1 }, members: ms,
      ownerId: user?.uid, accessList });
    go('home');
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={() => go('home')} style={{ border:0, background:'transparent', color:'var(--ink-2)', fontSize:15, cursor:'pointer' }}>取消</button>
        <div style={{ fontSize:15, fontWeight:600 }}>新旅程</div>
        <button onClick={create} style={{ border:0, background:'var(--ink)', color:'var(--bg)', height:32, padding:'0 14px', borderRadius:999, fontSize:13, fontWeight:500, cursor:'pointer' }}>建立</button>
      </div>

      <div style={{ padding:'8px 20px 0' }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="例如：京都賞楓" autoFocus style={{
            width:'100%', border:0, background:'transparent', outline:'none',
            fontSize:26, fontWeight:600, color:'var(--ink)', padding:0,
            fontFamily:'inherit', letterSpacing:-0.3,
          }}/>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:8, paddingLeft:4 }}>封面</div>
        <div style={{ display:'flex', gap:8, overflowX:'auto' }} className="no-scroll">
          {COVERS.map((bg, i) => {
            const on = cover === i;
            return (
              <button key={i} onClick={() => setCover(i)} style={{
                flex:'0 0 auto', width:80, height:54, borderRadius:12,
                border:0, padding:0, position:'relative', cursor:'pointer',
                background: bg,
                boxShadow: 'inset 0 0 0 0.5px color-mix(in oklch, var(--ink) 12%, transparent)',
                transition:'box-shadow 0.15s',
                transform: 'none',
              }}>
                {on && (
                  <span style={{ position:'absolute', top:6, right:6, width:18, height:18, borderRadius:'50%', background:'rgba(255,255,255,0.88)', color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                    <Icon.check width={11} height={11}/>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <FormRow label="開始">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ border:0, background:'transparent', color:'var(--ink-2)', fontFamily:'inherit', fontSize:14, outline:'none', cursor:'pointer' }}/>
          </FormRow>
          <FormRow label="結束">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ border:0, background:'transparent', color:'var(--ink-2)', fontFamily:'inherit', fontSize:14, outline:'none', cursor:'pointer' }}/>
          </FormRow>
          <FormRow label="主幣別" last>
            <CcyPicker value={base} onChange={setBase}/>
          </FormRow>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:8, paddingLeft:4 }}>
          成員 · {members.filter(m=>m.name.trim()).length} 人
        </div>
        <div className="card" style={{ padding:'4px 14px' }}>
          {members.map((m, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i===members.length-1?0:'0.5px solid var(--hairline)' }}>
              <input value={m.name} onChange={e => { const next=[...members]; next[i]={...m,name:e.target.value}; setMembers(next); }}
                placeholder={m.isMe?'你':'成員姓名'} style={{ flex:1, border:0, background:'transparent', outline:'none', fontFamily:'inherit', fontSize:14, color:'var(--ink)' }}/>
              {m.isMe
                ? <span className="chip sage" style={{ fontSize:10 }}>你</span>
                : <button onClick={() => setMembers(members.filter((_,j)=>j!==i))} style={{ border:0, background:'transparent', color:'var(--ink-3)', fontSize:13, cursor:'pointer' }}>移除</button>}
            </div>
          ))}
          <button onClick={() => setMembers([...members, { name:'' }])}
            style={{ width:'100%', border:0, background:'transparent', padding:'10px 0', color:'var(--ink-2)', fontSize:13, cursor:'pointer', fontWeight:500 }}>
            + 加入成員
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Members ─────────────────────────────────────────────────
function MembersScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const [newName, setNewName] = React.useState('');
  if (!trip) return null;
  const tots = ENGINE.totals(trip);
  const net = ENGINE.netBalances(trip);

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <div style={{ fontSize:15, fontWeight:600 }}>成員</div>
        <div style={{ width:32 }}/>
      </div>

      <div style={{ padding:'8px 20px 0' }}>
        <div className="t-display" style={{ fontSize:28 }}>{trip.members.length} 人</div>
        <div className="t-meta" style={{ marginTop:4 }}>分擔總額 {fmtBase(tots.spent, trip)}</div>
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div className="card" style={{ padding:'4px 14px' }}>
          {trip.members.map((m, i) => {
            const paid = tots.paidBy[m.id] || 0;
            const bal = net[m.id] || 0;
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom: i===trip.members.length-1?0:'0.5px solid var(--hairline)' }}>
                <Avatar member={m} size={36}/>
                <div style={{ flex:1 }}>
                  <div className="t-h" style={{ fontSize:14 }}>
                    {m.name}
                    {m.id === 'me' && <span className="chip sage" style={{ marginLeft:6, fontSize:9, padding:'1px 6px' }}>發起者</span>}
                    {m.isMe && m.id !== 'me' && <span className="chip sage" style={{ marginLeft:6, fontSize:9, padding:'1px 6px' }}>你</span>}
                  </div>
                  <div className="t-meta" style={{ marginTop:2, fontSize:11 }}>付過 {fmtBase(paid, trip)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div className="t-amount tabular" style={{ fontSize:13, fontWeight:600, color: bal>0.5?'var(--pos)':bal<-0.5?'var(--neg)':'var(--ink-2)' }}>
                    {bal>0?'+':bal<0?'−':''}{fmtBase(Math.abs(bal), trip)}
                  </div>
                  {!m.isMe && (
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:2 }}>
                      <button onClick={() => dispatch({ type:'SET_ME', tripId, memberId: m.id })}
                        style={{ border:0, background:'transparent', color:'var(--accent,#7c6f64)', fontSize:11, cursor:'pointer', padding:0 }}>這是我</button>
                      <button onClick={() => { if(confirm(`移除 ${m.name}？`)) dispatch({ type:'REMOVE_MEMBER', tripId, memberId: m.id }); }}
                        style={{ border:0, background:'transparent', color:'var(--ink-3)', fontSize:11, cursor:'pointer', padding:0 }}>移除</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div className="card" style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="新成員姓名" style={{ flex:1, border:0, background:'transparent', outline:'none', fontFamily:'inherit', fontSize:14, color:'var(--ink)', padding:'4px 0' }}/>
          <button onClick={() => { if(newName.trim()) { dispatch({ type:'ADD_MEMBER', tripId, name: newName.trim() }); setNewName(''); } }}
            style={{ border:0, background:'var(--ink)', color:'var(--bg)', padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:500, cursor:'pointer' }}>
            加入
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rates ───────────────────────────────────────────────────
function RatesScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  const [fetching, setFetching] = React.useState(false);
  const [fetchErr, setFetchErr] = React.useState('');
  if (!trip) return null;

  const ALL = (window.CURRENCIES || []).map(([c]) => c);
  const rateMode = trip.rateMode || 'manual';

  const fetchLive = React.useCallback(async () => {
    setFetching(true); setFetchErr('');
    const base = trip.baseCurrency;
    const wanted = trip.currencies.filter(c => c !== base);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.result !== 'success' || !data.rates) throw new Error('API error');
      const next = { [base]: 1 };
      for (const c of wanted) {
        const r = data.rates[c];
        if (r && r > 0) next[c] = ENGINE.round2(1 / r);
      }
      dispatch({ type:'SET_RATES_BULK', tripId, rates: next, rateMode:'live' });
    } catch (e) {
      setFetchErr('無法取得即時匯率，請檢查網路或改用手動');
    } finally {
      setFetching(false);
    }
  }, [trip.baseCurrency, trip.currencies, tripId, dispatch]);

  React.useEffect(() => {
    if (rateMode !== 'live') return;
    const stale = !trip.liveRatesFetchedAt || (Date.now() - trip.liveRatesFetchedAt) > 3600 * 1000;
    if (stale && !fetching) fetchLive();
  }, [rateMode]);

  const setMode = (mode) => { setFetchErr(''); dispatch({ type:'SET_RATE_MODE', tripId, mode }); };
  const updatedMin = Math.max(0, Math.round((Date.now() - (trip.ratesUpdatedAt || Date.now())) / 60000));

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <div style={{ fontSize:15, fontWeight:600 }}>匯率</div>
        <div style={{ width:32 }}/>
      </div>

      <div style={{ padding:'8px 20px 0' }}>
        <div className="t-display" style={{ fontSize:28 }}>1 {trip.baseCurrency} 換算</div>
        <div className="t-meta" style={{ marginTop:4 }}>
          {rateMode === 'live'
            ? (fetching ? '正在取得即時匯率…' : trip.liveRatesFetchedAt ? `即時匯率 · ${updatedMin} 分鐘前更新` : '即時匯率（尚未取得）')
            : `手動匯率 · ${updatedMin} 分鐘前更新`}
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, padding:3, background:'var(--surface)', borderRadius:12, border:'0.5px solid var(--hairline)' }}>
          {[
            { k:'manual', l:'手動匯率', sub:'自行輸入' },
            { k:'live',   l:'即時匯率', sub:'網路自動更新' },
          ].map(opt => {
            const on = rateMode === opt.k;
            return (
              <button key={opt.k} onClick={() => setMode(opt.k)} style={{
                border:0, borderRadius:9, padding:'10px 8px', cursor:'pointer',
                background: on ? 'var(--bg)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: on ? '0 1px 3px color-mix(in oklch, var(--ink) 12%, transparent)' : 'none',
                fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              }}>
                <span style={{ fontSize:13, fontWeight: on?600:500 }}>{opt.l}</span>
                <span style={{ fontSize:10, color:'var(--ink-3)' }}>{opt.sub}</span>
              </button>
            );
          })}
        </div>

        {rateMode === 'live' && (
          <div style={{ marginTop:10, display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={fetchLive} disabled={fetching} className="glass-pill" style={{
              flex:1, height:38, borderRadius:11, border:0, cursor: fetching?'wait':'pointer',
              fontSize:12, fontWeight:500, color:'var(--ink)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              opacity: fetching ? 0.6 : 1,
            }}>
              {React.createElement(Icon.swap, { width:14, height:14 })}
              {fetching ? '更新中…' : '立即更新匯率'}
            </button>
            <span className="t-meta" style={{ fontSize:10, color:'var(--ink-3)' }}>來源 · open.er-api.com</span>
          </div>
        )}

        {fetchErr && (
          <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:'color-mix(in oklch, var(--neg) 12%, transparent)', color:'var(--neg)', fontSize:11.5, lineHeight:1.5 }}>
            {fetchErr}
          </div>
        )}
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:8, paddingLeft:4 }}>已啟用</div>
        <div className="card" style={{ padding:'4px 14px' }}>
          {trip.currencies.map((c, i) => {
            const isBase = c === trip.baseCurrency;
            return (
              <div key={c} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom: i===trip.currencies.length-1?0:'0.5px solid var(--hairline)' }}>
                <div style={{ width:34, height:34, borderRadius:10, background:'var(--clay-soft)', color:'var(--clay-deep)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, letterSpacing:0.5 }}>{c}</div>
                <div style={{ flex:1 }}>
                  <div className="t-h" style={{ fontSize:14 }}>
                    {c} {isBase && <span className="chip sage" style={{ fontSize:9, marginLeft:6 }}>主幣</span>}
                  </div>
                  <div className="t-meta tabular" style={{ marginTop:2, fontSize:11 }}>
                    1 {c} = {ENGINE.round2(trip.rates[c] || 1)} {trip.baseCurrency}
                  </div>
                </div>
                {!isBase ? (
                  <input type="number" step="0.01" value={trip.rates[c] || 1}
                    disabled={rateMode === 'live'}
                    onChange={e => dispatch({ type:'SET_RATE', tripId, ccy: c, rate: +e.target.value })}
                    style={{
                      width:80, border:'0.5px solid var(--hairline-strong)', borderRadius:10, padding:'5px 10px', textAlign:'right',
                      background: rateMode==='live' ? 'var(--surface)' : 'var(--bg-2)',
                      color: rateMode==='live' ? 'var(--ink-3)' : 'var(--ink)',
                      outline:'none', cursor: rateMode==='live' ? 'not-allowed' : 'text',
                      fontFamily:'var(--font-num)', fontVariantNumeric:'tabular-nums', fontSize:13, fontWeight:500,
                    }}/>
                ) : (
                  <span className="t-amount tabular" style={{ color:'var(--ink-3)', fontSize:13 }}>1.00</span>
                )}
                {!isBase && rateMode !== 'live' && (
                  <button onClick={() => dispatch({ type:'TOGGLE_CCY', tripId, ccy: c })}
                    style={{ border:0, background:'transparent', color:'var(--ink-3)', fontSize:11, cursor:'pointer' }}>移除</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:8, paddingLeft:4 }}>加入幣別</div>
        <div style={{ borderRadius:'var(--r-md)', overflow:'hidden', border:'0.5px solid var(--hairline)' }}>
          {ALL.filter(c => !trip.currencies.includes(c)).map((c, i, arr) => (
            <button key={c} onClick={() => dispatch({ type:'TOGGLE_CCY', tripId, ccy: c })}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'11px 14px',
                border:0, borderBottom: i < arr.length-1 ? '0.5px solid var(--hairline)' : 0,
                background:'var(--surface)', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
              }}>
              <div style={{
                width:42, height:26, borderRadius:6, background:'var(--bg-2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:600, letterSpacing:0.4, color:'var(--ink-2)', flexShrink:0,
              }}>{c}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:14, fontWeight:500, color:'var(--ink)' }}>{c}</span>
                <span style={{ fontSize:12, color:'var(--ink-3)', marginLeft:8 }}>{CCY_NAME[c]}</span>
              </div>
              <span style={{ color:'var(--ink-4)', fontSize:18, lineHeight:1, flexShrink:0 }}>+</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stats ───────────────────────────────────────────────────
function StatsScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  if (!trip) return null;
  const tots = ENGINE.totals(trip);
  const byCat = ENGINE.byCategory(trip);
  const byDay = ENGINE.byDay(trip);
  const cats = [
    { id:'food',     l:'餐飲', c:'oklch(0.72 0.030 30)' },
    { id:'lodging',  l:'住宿', c:'oklch(0.62 0.018 240)' },
    { id:'transit',  l:'交通', c:'oklch(0.68 0.025 80)' },
    { id:'activity', l:'活動', c:'oklch(0.65 0.030 145)' },
    { id:'shop',     l:'購物', c:'oklch(0.62 0.030 320)' },
  ];
  const max = Math.max(...byDay.map(d => d.amt), 1);

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <div style={{ fontSize:15, fontWeight:600 }}>統計</div>
        <div style={{ width:32 }}/>
      </div>

      <div style={{ padding:'8px 20px 0' }}>
        <div className="t-cap">總支出</div>
        <div className="t-display" style={{ fontSize:34 }}>{fmtBase(tots.spent, trip)}</div>
        <div className="t-meta" style={{ marginTop:4 }}>
          {trip.expenses.length} 筆 · 人均 {fmtBase(tots.perPerson, trip)}
        </div>
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:10, paddingLeft:4 }}>分類佔比</div>
        <div className="card" style={{ padding:14 }}>
          <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', background:'var(--bg-2)', marginBottom:14 }}>
            {cats.map(c => {
              const v = byCat[c.id] || 0;
              if (!v) return null;
              return <div key={c.id} style={{ width:`${v/tots.spent*100}%`, background: c.c }}/>;
            })}
          </div>
          {cats.map(c => {
            const v = byCat[c.id] || 0;
            if (!v) return null;
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
                <div style={{ width:10, height:10, borderRadius:3, background: c.c }}/>
                <div className="t-body" style={{ flex:1, fontSize:13 }}>{c.l}</div>
                <div className="t-amount tabular" style={{ fontSize:13, fontWeight:500 }}>{fmtBase(v, trip)}</div>
                <div className="t-meta tabular" style={{ width:40, textAlign:'right', fontSize:11 }}>
                  {(v/tots.spent*100).toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:10, paddingLeft:4 }}>每日花費</div>
        <div className="card" style={{ padding:'16px 14px 12px', overflowX:'auto' }}>
          {byDay.filter(d => d.amt > 0).length === 0 ? (
            <div className="t-meta" style={{ textAlign:'center', padding:'20px 0' }}>尚無支出資料</div>
          ) : (() => {
            // Only show days with expenses for readability
            const activeDays = byDay.filter(d => d.amt > 0);
            const activeMax = Math.max(...activeDays.map(d => d.amt), 1);
            const fmtAmt = n => {
              if (n >= 10000) return Math.round(n/1000) + 'k';
              if (n >= 1000) return (n/1000).toFixed(1) + 'k';
              return Math.round(n).toString();
            };
            return (
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, minHeight:160 }}>
                {activeDays.map(d => {
                  const pct = d.amt / activeMax;
                  const barH = Math.max(Math.round(pct * 110), 6);
                  const isMax = d.amt === activeMax;
                  return (
                    <div key={d.date} style={{ flex:'0 0 auto', minWidth:44, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      {/* Amount label above bar */}
                      <div style={{
                        fontSize:9, fontWeight:600, color: isMax ? 'var(--clay-deep)' : 'var(--ink-3)',
                        fontFamily:'var(--font-num)', letterSpacing:-0.3, whiteSpace:'nowrap',
                      }}>{fmtBase(d.amt, trip)}</div>
                      {/* Bar */}
                      <div style={{
                        width:'100%', height: barH,
                        background: isMax ? 'var(--clay)' : 'var(--clay-soft)',
                        borderRadius:'5px 5px 2px 2px',
                        border: isMax ? 'none' : '0.5px solid color-mix(in oklch, var(--clay) 30%, transparent)',
                        transition:'height 0.3s',
                      }}/>
                      {/* Date label */}
                      <div style={{ fontSize:9, color:'var(--ink-3)', whiteSpace:'nowrap', marginTop:2 }}>
                        {d.date.slice(5).replace('-','/')}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────
function ExportScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  if (!trip) return null;

  const tots = ENGINE.totals(trip);
  const transfers = ENGINE.simplify(trip);
  const byCat = ENGINE.byCategory(trip);
  const memberById = Object.fromEntries(trip.members.map(m => [m.id, m]));
  const sorted = [...trip.expenses].sort((a,b) => a.date.localeCompare(b.date));

  const downloadCSV = () => {
    const csv = '\ufeff' + ENGINE.toCSV(trip);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${trip.title.replace(/\s+/g,'_')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };
  const printPDF = () => openPrintWindow('pdf-paper');
  const copyShare = async () => {
    const txt = ENGINE.toShareText(trip);
    try { await navigator.clipboard.writeText(txt); alert('結算結果已複製'); }
    catch { alert(txt); }
  };

  const catNames = { food:'餐飲', lodging:'住宿', transit:'交通', activity:'活動', shop:'購物' };
  const fmtMD = d => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; };

  return (
    <div style={{ paddingBottom: 60 }}>
      <div className="no-print" style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <div style={{ fontSize:15, fontWeight:600 }}>匯出明細</div>
        <button onClick={printPDF} style={{ border:0, background:'var(--ink)', color:'var(--bg)', height:32, padding:'0 14px', borderRadius:999, fontSize:13, fontWeight:500, cursor:'pointer' }}>列印</button>
      </div>

      {/* Paper preview */}
      <div style={{ padding:'8px 16px 0' }}>
        <div id="pdf-paper" style={{
          background:'#fcfaf6', borderRadius:16, padding:'22px 20px',
          border:'0.5px solid var(--hairline)',
          boxShadow:'0 12px 40px color-mix(in oklch, var(--ink) 8%, transparent)',
          fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink)', lineHeight:1.55,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:12, borderBottom:'1px solid #e8e1d4' }}>
            <div>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:14, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase' }}>{trip.title}</div>
              {trip.subtitle && <div style={{ fontFamily:'var(--font-sans)', fontSize:10, color:'var(--ink-2)', marginTop:2 }}>{trip.subtitle}</div>}
              <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:3 }}>{trip.startDate} – {trip.endDate}</div>
            </div>
            <div style={{ textAlign:'right', fontSize:9, color:'var(--ink-3)' }}>
              <div>{trip.expenses.length} expenses</div>
              <div>{trip.members.length} members</div>
              <div style={{ marginTop:2 }}>generated {new Date().toISOString().slice(0,10)}</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'10px 0', borderBottom:'1px solid #e8e1d4' }}>
            {[['TOTAL', fmtBase(tots.spent, trip)], ['PER PERSON', fmtBase(tots.perPerson, trip)], ['BASE', trip.baseCurrency]].map(([l,v],i) => (
              <div key={i}>
                <div style={{ fontSize:8, color:'var(--ink-3)', letterSpacing:0.5 }}>{l}</div>
                <div style={{ fontFamily:'var(--font-sans)', fontSize:13, fontWeight:700, marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ paddingTop:10 }}>
            <div style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:0.5, marginBottom:6 }}>PAID BY</div>
            {trip.members.map(m => {
              const paid = tots.paidBy[m.id] || 0;
              return (
                <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, padding:'3px 0', fontSize:10 }}>
                  <span style={{ fontFamily:'var(--font-sans)' }}>{m.name}</span>
                  <span style={{ color:'var(--ink-3)' }}>{tots.spent>0 ? `${(paid/tots.spent*100).toFixed(0)}%` : '0%'}</span>
                  <span style={{ fontFamily:'var(--font-sans)', fontWeight:600, minWidth:80, textAlign:'right' }}>{fmtBase(paid, trip)}</span>
                </div>
              );
            })}
          </div>

          <div style={{ paddingTop:14, marginTop:10, borderTop:'1px solid #e8e1d4' }}>
            <div style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:0.5, marginBottom:6 }}>BY CATEGORY</div>
            {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
              <div key={k} style={{ display:'grid', gridTemplateColumns:'70px 1fr auto', gap:8, padding:'3px 0', fontSize:10, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-sans)' }}>{catNames[k] || k}</span>
                <div style={{ height:5, borderRadius:2, background:'#ece3d3', overflow:'hidden' }}>
                  <div style={{ width: `${tots.spent>0 ? v/tots.spent*100 : 0}%`, height:'100%', background:{food:'oklch(0.72 0.030 30)',lodging:'oklch(0.62 0.018 240)',transit:'oklch(0.68 0.025 80)',activity:'oklch(0.65 0.030 145)',shop:'oklch(0.62 0.030 320)'}[k]||'var(--ink-3)' }}/>
                </div>
                <span style={{ fontFamily:'var(--font-sans)', fontWeight:600, minWidth:80, textAlign:'right' }}>{fmtBase(v, trip)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop:14, paddingTop:10, borderTop:'1px solid #e8e1d4' }}>
            <div style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:0.5, marginBottom:6 }}>DETAIL · {trip.expenses.length} ITEMS</div>
            <div style={{ display:'grid', gridTemplateColumns:'34px 1fr 28px 60px 56px', gap:6, fontSize:8, color:'var(--ink-3)', letterSpacing:0.4, paddingBottom:4, borderBottom:'0.5px dashed var(--hairline-strong)' }}>
              <span>DATE</span><span>ITEM · PAID BY</span><span style={{ textAlign:'right' }}>CCY</span><span style={{ textAlign:'right' }}>AMOUNT</span><span style={{ textAlign:'right' }}>{trip.baseCurrency}</span>
            </div>
            {sorted.map(e => (
              <div key={e.id} style={{ display:'grid', gridTemplateColumns:'34px 1fr 28px 60px 56px', gap:6, padding:'5px 0', borderBottom:'0.5px dashed #e8e1d4', fontSize:9.5, alignItems:'baseline' }}>
                <span>{fmtMD(e.date)}</span>
                <span style={{ fontFamily:'var(--font-sans)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {e.title}<span style={{ color:'var(--ink-3)', marginLeft:4 }}>· {memberById[e.paidBy]?.name||'?'}</span>
                </span>
                <span style={{ textAlign:'right', color:'var(--ink-3)' }}>{e.ccy}</span>
                <span style={{ textAlign:'right', fontFamily:'var(--font-num)' }}>{Math.round(e.amount).toLocaleString()}</span>
                <span style={{ textAlign:'right', fontFamily:'var(--font-sans)', fontWeight:600 }}>{Math.round(ENGINE.toBase(e.amount, e.ccy, trip.rates)).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:6, paddingTop:8, marginTop:4, borderTop:'1px solid #e8e1d4' }}>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--font-sans)' }}>TOTAL</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-sans)' }}>{fmtBase(tots.spent, trip)}</span>
            </div>
          </div>

          <div style={{ marginTop:14, padding:'12px 14px', borderRadius:8, background:'oklch(0.94 0.020 145)', color:'var(--sage-deep)' }}>
            <div style={{ fontFamily:'var(--font-sans)', fontSize:9, fontWeight:700, letterSpacing:0.6, marginBottom:6 }}>SETTLEMENT · 最少 {transfers.length} 筆</div>
            {transfers.length === 0
              ? <div style={{ fontFamily:'var(--font-sans)', fontSize:12 }}>✓ 已結平，無需轉帳</div>
              : transfers.map((tr, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:11 }}>
                  <span style={{ fontFamily:'var(--font-sans)' }}><b>{memberById[tr.from]?.name}</b> → <b>{memberById[tr.to]?.name}</b></span>
                  <span style={{ fontFamily:'var(--font-sans)', fontWeight:700 }}>{fmtBase(tr.amount, trip)}</span>
                </div>
              ))}
          </div>

          <div style={{ marginTop:14, paddingTop:8, borderTop:'1px solid #e8e1d4', display:'flex', justifyContent:'space-between', fontSize:8, color:'var(--ink-3)' }}>
            <span>FX: {trip.currencies.map(c=>`1 ${c}=${ENGINE.round2(trip.rates[c]||1)} ${trip.baseCurrency}`).join(' · ')}</span>
            <span><em>pun</em></span>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ padding:'18px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[
          { l:'CSV', icon:'download', on: downloadCSV },
          { l:'複製文字', icon:'copy', on: copyShare },
          { l:'PDF', icon:'print', on: printPDF },
        ].map(b => (
          <button key={b.l} onClick={b.on} className="glass-pill" style={{
            height:50, borderRadius:14, border:0, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            fontSize:13, fontWeight:500, color:'var(--ink)',
          }}>
            {React.createElement(Icon[b.icon], { width:16, height:16 })}{b.l}
          </button>
        ))}
      </div>

      <div className="no-print" style={{ padding:'10px 16px 0' }}>
        <button onClick={() => go('statement', { tripId })} style={{
          width:'100%', height:54, borderRadius:14, border:0, cursor:'pointer',
          background:'var(--ink)', color:'var(--bg)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 18px', fontFamily:'inherit',
        }}>
          <span style={{ display:'flex', alignItems:'center', gap:10 }}>
            {React.createElement(Icon.receipt, { width:18, height:18 })}
            <span style={{ textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>個人帳單 PDF</div>
              <div style={{ fontSize:10, opacity:0.65, marginTop:1 }}>逐筆明細 · 含分擔計算與應收付</div>
            </span>
          </span>
          <span style={{ fontSize:18, opacity:0.7 }}>›</span>
        </button>
      </div>
    </div>
  );
}

// ─── Expense Detail ──────────────────────────────────────────
function ExpenseDetailScreen({ go, tripId, id }) {
  const trip = useTrip(tripId);
  const [, dispatch] = useStore();
  if (!trip) return null;
  const e = trip.expenses.find(x => x.id === id);
  if (!e) { go('trip', { tripId }); return null; }

  const splits = ENGINE.computeSplit(e, trip.members);
  const paidBy = trip.members.find(m => m.id === e.paidBy);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('trip', { tripId })}/>
        <button onClick={() => go('add', { tripId, editId: e.id })} className="glass-pill"
          style={{ height:32, padding:'0 14px', borderRadius:999, border:0, cursor:'pointer', fontSize:13, fontWeight:500, color:'var(--ink)' }}>
          編輯
        </button>
      </div>

      <div style={{ padding:'8px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
          <CatIcon catId={e.cat} size={48}/>
          <div style={{ flex:1 }}>
            <div className="t-display" style={{ fontSize:22, lineHeight:1.2 }}>{e.title}</div>
            <div className="t-meta" style={{ marginTop:6, fontSize:12 }}>{fmtDate(e.date)} · {paidBy?.name} 付</div>
          </div>
        </div>
        <div style={{ marginTop:18, display:'flex', alignItems:'baseline', gap:8 }}>
          <div className="t-display tabular" style={{ fontSize:36, fontWeight:600, letterSpacing:-0.5 }}>
            {fmtMoney(e.amount, e.ccy)}
          </div>
          <SplitBadge type={e.mode}/>
        </div>
        {e.ccy !== trip.baseCurrency && (
          <div className="t-meta tabular" style={{ marginTop:2, fontSize:12 }}>
            ≈ {fmtBase(ENGINE.toBase(e.amount, e.ccy, trip.rates), trip)} (匯率 {ENGINE.round2(trip.rates[e.ccy])})
          </div>
        )}
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div className="t-cap" style={{ marginBottom:8, paddingLeft:4 }}>分擔明細</div>
        <div className="card" style={{ padding:'4px 14px' }}>
          {trip.members.map((m, i) => {
            const owe = splits[m.id] || 0;
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 0', borderBottom: i===trip.members.length-1?0:'0.5px solid var(--hairline)' }}>
                <Avatar member={m} size={32}/>
                <div style={{ flex:1 }}>
                  <div className="t-h" style={{ fontSize:14 }}>{m.name}</div>
                  {m.id === e.paidBy && <div className="t-meta" style={{ marginTop:2, fontSize:11 }}>付了 {fmtMoney(e.amount, e.ccy)}</div>}
                </div>
                <div className="t-amount tabular" style={{ fontSize:14, fontWeight:600 }}>
                  {owe > 0 ? fmtMoney(owe, e.ccy) : <span style={{ color:'var(--ink-3)' }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {e.note && (
        <div style={{ padding:'18px 20px 0' }}>
          <div className="t-cap" style={{ marginBottom:6 }}>備註</div>
          <div className="t-body" style={{ fontSize:13, color:'var(--ink-2)' }}>{e.note}</div>
        </div>
      )}

      <div style={{ padding:'20px 20px 0', textAlign:'center' }}>
        <button onClick={() => {
          if (confirm('刪除這筆支出？')) { dispatch({ type:'DELETE_EXPENSE', tripId, id: e.id }); go('trip', { tripId }); }
        }} style={{ border:0, background:'transparent', color:'var(--neg)', fontSize:13, fontWeight:500, cursor:'pointer' }}>刪除</button>
      </div>
    </div>
  );
}

window.CreateTripScreen = CreateTripScreen;
window.MembersScreen = MembersScreen;
window.RatesScreen = RatesScreen;
window.StatsScreen = StatsScreen;
window.ExportScreen = ExportScreen;
window.ExpenseDetailScreen = ExpenseDetailScreen;
