// app-shell.jsx — App router + Home + Create Trip screens

const { useState, useEffect } = React;

// ── Error Boundary (catch render crashes and show on-screen) ──────────────────
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 24, background: 'var(--bg)', minHeight: '100svh' }}>
        <div style={{ background: '#fee', border: '1px solid #faa', borderRadius: 12,
          padding: 16, fontSize: 12, color: '#900', lineHeight: 1.6, wordBreak: 'break-all' }}>
          <b>錯誤（請截圖回報）</b><br/>
          {this.state.err.message}<br/>
          <pre style={{ marginTop: 8, fontSize: 10, opacity: 0.7, whiteSpace: 'pre-wrap' }}>
            {this.state.err.stack?.slice(0, 400)}
          </pre>
        </div>
        <button onClick={() => this.setState({ err: null })}
          style={{ marginTop: 16, border: 0, background: 'var(--ink)', color: 'var(--bg)',
            padding: '10px 20px', borderRadius: 999, fontSize: 14, cursor: 'pointer' }}>
          重試
        </button>
      </div>
    );
    return this.props.children;
  }
}

const COVERS = [
  'linear-gradient(135deg, oklch(0.72 0.025 235), oklch(0.78 0.020 200), oklch(0.85 0.018 145))',
  'linear-gradient(135deg, oklch(0.78 0.030 30), oklch(0.68 0.040 15))',
  'linear-gradient(135deg, oklch(0.78 0.025 200), oklch(0.70 0.030 235))',
  'linear-gradient(135deg, oklch(0.78 0.030 145), oklch(0.72 0.030 80))',
];

function AppShell() {
  const { user, authLoading } = useAuth();
  const [, , tripsReady] = useStore();
  const [route, setRoute] = useState({ name: 'home' });
  const go = (name, params = {}) => {
    setRoute({ name, ...params });
    window.scrollTo(0, 0);
  };

  // Show splash while auth resolves
  if (authLoading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 800, fontStyle: 'italic',
          color: 'var(--ink-3)', letterSpacing: -1 }}>pun</div>
        <div style={{ marginTop: 16, maxWidth: 260, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.2, lineHeight: 1.6 }}>
            <span style={{ fontStyle: 'italic', fontWeight: 700 }}>pun</span>
            {' '}
            <span style={{ color: 'var(--ink-4)' }}>/pʌn/</span>
            {' '}
            <span style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: 0.8 }}>v.</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.7, marginTop: 2 }}>
            The Taiwanese word for "share" and "split". An offline-ready, multi-currency app that takes the math out of your group travels.
          </div>
        </div>
      </div>
    </div>
  );

  // Not signed in → login screen
  if (!user) return <LoginScreen/>;

  let view;
  switch (route.name) {
    case 'home':      view = <HomeScreen go={go}/>; break;
    case 'create':    view = <CreateTripScreen go={go}/>; break;
    case 'trip':      view = <TripScreen go={go} tripId={route.tripId}/>; break;
    case 'add':       view = <AddExpenseScreen go={go} tripId={route.tripId} editId={route.editId}/>; break;
    case 'expense':   view = <ExpenseDetailScreen go={go} tripId={route.tripId} id={route.id}/>; break;
    case 'settle':    view = <SettleScreen go={go} tripId={route.tripId}/>; break;
    case 'rates':     view = <RatesScreen go={go} tripId={route.tripId}/>; break;
    case 'members':   view = <MembersScreen go={go} tripId={route.tripId}/>; break;
    case 'export':    view = <ExportScreen go={go} tripId={route.tripId}/>; break;
    case 'statement': view = <StatementScreen go={go} tripId={route.tripId}/>; break;
    case 'stats':     view = <StatsScreen go={go} tripId={route.tripId}/>; break;
    default:          view = <HomeScreen go={go}/>;
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg)',
      color: 'var(--ink)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <AppErrorBoundary key={route.name + (route.tripId || '')}>
        {view}
      </AppErrorBoundary>
    </div>
  );
}

// ─── Home — trip list ────────────────────────────────────────
function fmtSyncTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10)   return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60) || 1} 分鐘前`;
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function HomeScreen({ go }) {
  const [s, dispatch] = useStore();
  const { user, lastSyncAt } = useAuth();
  const trips = Object.values(s.trips).sort((a,b) => b.startDate.localeCompare(a.startDate));
  const [showAbout, setShowAbout] = React.useState(false);
  const [showJoin,  setShowJoin]  = React.useState(false);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '54px 20px 8px' }}>
        <div style={{ marginBottom: 6, fontSize: 10, letterSpacing: 1.6, color: 'var(--ink-3)', fontStyle: 'italic', fontWeight: 600 }}>pun</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="t-display" style={{ fontSize: 34 }}>旅程</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Join trip */}
            <button onClick={() => setShowJoin(true)} title="加入旅程"
              style={{ width: 36, height: 36, borderRadius: '50%', border: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--surface)', color: 'var(--ink-2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </button>
            {/* New trip */}
            <button onClick={() => go('create')}
              style={{ width: 36, height: 36, borderRadius: '50%', border: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--ink)', color: 'var(--bg)' }}>
              <Icon.plus width={18} height={18}/>
            </button>
          </div>
        </div>
      </div>

      {trips.length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>✈️</div>
          <div className="t-meta" style={{ marginBottom: 20, fontSize: 15 }}>還沒有旅程</div>
          <button onClick={() => go('create')} style={{
            border: 0, background: 'var(--ink)', color: 'var(--bg)',
            padding: '14px 28px', borderRadius: 999, fontSize: 15, fontWeight: 500,
            cursor: 'pointer',
          }}>建立第一個旅程</button>
        </div>
      )}

      <div style={{ padding: '12px 20px 0' }}>
        {trips.map((t, i) => {
          const tots = ENGINE.totals(t);
          const net = ENGINE.netBalances(t);
          const me = t.members.find(m => m.isMe) || t.members[0];
          const myBal = me ? net[me.id] : 0;
          return (
            <button key={t.id} onClick={() => go('trip', { tripId: t.id })}
              style={{
                width: '100%', textAlign: 'left', border: 0, padding: 0,
                cursor: 'pointer', marginBottom: 14,
                borderRadius: 'var(--r-xl)', overflow: 'hidden',
                background: COVERS[t.cover % COVERS.length], position: 'relative',
                height: i === 0 ? 200 : 150,
                boxShadow: '0 4px 20px color-mix(in oklch, var(--ink) 12%, transparent)',
              }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, rgba(255,255,255,0.18), transparent 40%, rgba(0,0,0,0.22))',
              }}/>
              <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                  letterSpacing: 0.4, color: '#fff', textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}>{t.members.length} 人 · {t.currencies.length} 幣別</span>
                <AvatarStack members={t.members.slice(0, 3)} size={22}/>
              </div>
              <div style={{ position: 'absolute', left: 18, right: 18, bottom: 14, color: '#fff' }}>
                <div style={{ fontSize: i===0?22:18, fontWeight: 600, letterSpacing: -0.3 }}>{t.title}</div>
                <div style={{
                  fontSize: 12, opacity: 0.9, marginTop: 2,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                }}>
                  <span>{fmtDateRange(t.startDate, t.endDate)}</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-num)' }}>
                    {fmtBase(tots.spent, t)}
                  </span>
                </div>
                {Math.abs(myBal) > 0.5 && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                      color: '#fff', background: 'rgba(255,255,255,0.22)',
                    }}>{myBal > 0 ? '應收' : '應付'} {fmtBase(Math.abs(myBal), t)}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {(() => {
        const demoTrip = Object.values(s.trips).find(t => t.isDemo);
        return demoTrip ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <button onClick={() => { if (confirm('清除範例資料？')) dispatch({ type: 'DELETE_TRIP', id: demoTrip.id }); }}
              style={{ border: 0, background: 'transparent', color: 'var(--ink-3)', fontSize: 11, cursor: 'pointer' }}>
              清除範例資料
            </button>
          </div>
        ) : null;
      })()}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 5 }}>
        <div style={{ textAlign: 'center', padding: '4px 20px 6px', fontSize: 9,
          color: 'var(--ink-4)', letterSpacing: 0.3, background: 'var(--bg)' }}>
          {user?.email || user?.displayName || ''}
          {lastSyncAt && (
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              · 同步 {fmtSyncTime(lastSyncAt)}
            </span>
          )}
        </div>
        <button onClick={() => setShowAbout(true)} style={{
          width: '100%', border: 0, cursor: 'pointer', fontFamily: 'inherit',
          background: 'var(--surface)',
          borderRadius: '16px 16px 0 0',
          padding: `10px 20px max(16px, env(safe-area-inset-bottom, 16px))`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '0 -1px 0 var(--hairline)',
        }}>
          <div style={{ width: 32, height: 4, borderRadius: 999, background: 'var(--ink-4)' }}/>
          <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 0.4 }}>
            v{window.APP_VERSION} · <em>pun</em> © 2026 kschiang-tw
          </div>
        </button>
      </div>

      {showAbout && <AboutSheet onClose={() => setShowAbout(false)}/>}
      {showJoin  && <JoinSheet  onClose={() => setShowJoin(false)}/>}
    </div>
  );
}

function AboutSheet({ onClose }) {
  const { user } = useAuth();
  const signOut = () => {
    if (confirm('確定要登出？')) {
      firebase.auth().signOut().catch(console.error);
      onClose();
    }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `28px 24px max(28px, env(safe-area-inset-bottom, 28px))`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontStyle: 'italic', letterSpacing: -0.3 }}>pun</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>旅行分帳 · v{window.APP_VERSION}</div>
          </div>
          <button onClick={onClose} style={{ border: 0, background: 'var(--surface)', color: 'var(--ink-2)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--hairline)', marginBottom: 18 }}/>

        <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>版權聲明</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
          © 2026 kschiang-tw. All rights reserved.
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>圖示授權</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7, background: 'var(--surface)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ marginBottom: 4 }}>雲端同步圖示由 <b>Freepik</b> 製作，來自 Flaticon。</div>
          <a href="https://www.flaticon.com/free-icons/cloud-computing"
            target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--ink-3)', fontSize: 11, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Cloud computing icons created by Freepik - Flaticon
          </a>
        </div>

        <div style={{ height: '0.5px', background: 'var(--hairline)', margin: '18px 0 14px' }}/>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.6, marginBottom: 16 }}>
          本應用程式使用 React · Firebase Firestore · ExchangeRate-API
        </div>

        {/* Account */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
              {user?.displayName || user?.email || '已登入'}
            </div>
            {user?.displayName && (
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{user.email}</div>
            )}
          </div>
          <button onClick={signOut} style={{
            border: 0, background: 'transparent', color: 'var(--neg)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            padding: '6px 10px', borderRadius: 8,
          }}>登出</button>
        </div>
      </div>
    </div>
  );
}

function fmtDateRange(a, b) {
  const fmt = d => {
    const dt = new Date(d);
    return `${dt.getMonth()+1}/${dt.getDate()}`;
  };
  return `${fmt(a)} – ${fmt(b)}, ${new Date(a).getFullYear()}`;
}

window.AppShell = AppShell;
window.HomeScreen = HomeScreen;
window.fmtDateRange = fmtDateRange;
window.COVERS = COVERS;
