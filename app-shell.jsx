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
            <span style={{ fontWeight: 700 }}>分</span>
            {' '}
            <span style={{ color: 'var(--ink-4)' }}>/pun/</span>
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
    case 'guide':     view = <GuideScreen go={go}/>; break;
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
  const { unreadCount } = useNotifications();
  const currentTripId = s.currentTripId;
  const trips = Object.values(s.trips).sort((a,b) => {
    // 目前旅程（本機置頂）永遠排在最前面
    const ac = a.id === currentTripId, bc = b.id === currentTripId;
    if (ac !== bc) return (bc ? 1 : 0) - (ac ? 1 : 0);
    return b.startDate.localeCompare(a.startDate);
  });
  // Settled trips (結清) move to their own section below the active ones;
  // the pinned 目前旅程 always stays on top.
  const activeTrips  = trips.filter(t => t.id === currentTripId || !ENGINE.isTripSettled(t));
  const settledTrips = trips.filter(t => t.id !== currentTripId && ENGINE.isTripSettled(t));

  function renderTripCard(t, i, compact) {
    const tots = ENGINE.totals(t);
    const net = ENGINE.netBalances(t);
    const me = t.members.find(m => m.isMe) || t.members[0];
    const myBal = me ? net[me.id] : 0;
    const settled = ENGINE.isSettled(myBal, t.baseCurrency);
    const tripSettled = ENGINE.isTripSettled(t);
    const big = !compact && i === 0;
    return (
      <button key={t.id} onClick={() => go('trip', { tripId: t.id })}
        style={{
          width: '100%', textAlign: 'left', border: 0, padding: 0,
          cursor: 'pointer', marginBottom: compact ? 10 : 14,
          borderRadius: 'var(--r-xl)', overflow: 'hidden',
          background: COVERS[t.cover % COVERS.length], position: 'relative',
          height: big ? 200 : compact ? 118 : 150,
          boxShadow: '0 4px 20px color-mix(in oklch, var(--ink) 12%, transparent)',
        }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.18), transparent 40%, rgba(0,0,0,0.22))',
        }}/>
        <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            {t.id === currentTripId && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                letterSpacing: 0.4, color: 'var(--ink)',
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                <Icon.pin width={11} height={11}/>目前旅程
              </span>
            )}
            <span style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
              letterSpacing: 0.4, color: '#fff', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}>{t.members.length} 人 · {t.currencies.length} 幣別</span>
          </div>
          <AvatarStack members={t.members.slice(0, 3)} size={22}/>
        </div>
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 14, color: '#fff' }}>
          <div style={{ fontSize: big ? 22 : compact ? 16 : 18, fontWeight: 600, letterSpacing: -0.3 }}>{t.title}</div>
          <div style={{
            fontSize: 12, opacity: 0.9, marginTop: 2,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          }}>
            <span>{fmtDateRange(t.startDate, t.endDate)}</span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-num)' }}>
              {fmtBase(tots.spent, t)}
            </span>
          </div>
          {(tripSettled || !settled) && (
            <div style={{ marginTop: 8 }}>
              <span style={{
                padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                color: '#fff', background: 'rgba(255,255,255,0.22)',
              }}>{tripSettled ? '✓ 已結清'
                : `${myBal > 0 ? '應收' : '應付'} ${fmtBase(Math.abs(myBal), t)}`}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  const [showAbout, setShowAbout] = React.useState(false);
  const [showJoin,  setShowJoin]  = React.useState(false);
  const [showNotif, setShowNotif] = React.useState(false);

  return (
    <div style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ padding: '54px 20px 8px' }}>
        <div style={{ marginBottom: 6, fontSize: 10, letterSpacing: 1.6, color: 'var(--ink-3)', fontStyle: 'italic', fontWeight: 600 }}>pun</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="t-display" style={{ fontSize: 34 }}>旅程</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* User guide */}
            <button onClick={() => go('guide')} title="使用說明" aria-label="使用說明"
              style={{ width: 36, height: 36, borderRadius: '50%', border: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--surface)', color: 'var(--ink-2)' }}>
              <Icon.help width={18} height={18}/>
            </button>
            {/* Notifications */}
            <button onClick={() => setShowNotif(true)} title="通知"
              style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', border: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--surface)', color: 'var(--ink-2)' }}>
              <Icon.bell width={18} height={18}/>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16,
                  padding: '0 4px', borderRadius: 999, background: 'var(--neg, #d9534f)',
                  color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: '16px',
                  textAlign: 'center', boxShadow: '0 0 0 2px var(--bg)',
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
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
        {activeTrips.map((t, i) => renderTripCard(t, i, false))}
      </div>

      {settledTrips.length > 0 && (
        <div style={{ padding: '14px 20px 0' }}>
          <div className="t-cap" style={{ padding: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.check width={12} height={12}/> 已結清 · {settledTrips.length}
          </div>
          {settledTrips.map((t, i) => renderTripCard(t, i, true))}
        </div>
      )}

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

      {showAbout && <AboutSheet onClose={() => setShowAbout(false)}
        onGuide={() => { setShowAbout(false); go('guide'); }}/>}
      {showJoin  && <JoinSheet  onClose={() => setShowJoin(false)}/>}
      {showNotif && <NotificationSheet go={go} onClose={() => setShowNotif(false)}/>}
    </div>
  );
}

// ─── Notification center ─────────────────────────────────────
function fmtNotifTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return '剛剛';
  if (diff < 3600)  return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function NotificationSheet({ go, onClose }) {
  const { notifications, markAllNotifsRead, clearNotifs, notifPermission, requestNotifPermission } = useNotifications();

  // Mark everything read shortly after opening so the badge clears.
  React.useEffect(() => {
    const t = setTimeout(markAllNotifsRead, 600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const openTrip = (n) => { onClose(); go('trip', { tripId: n.tripId }); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `24px 20px max(24px, env(safe-area-inset-bottom, 24px))`,
        maxHeight: '82svh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="t-display" style={{ fontSize: 22 }}>動態</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {notifications.length > 0 && (
              <button onClick={clearNotifs} style={{
                border: 0, background: 'transparent', color: 'var(--ink-3)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 8px',
              }}>清除全部</button>
            )}
            <button onClick={onClose} style={{ border: 0, background: 'var(--surface)', color: 'var(--ink-2)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* Permission prompt */}
        {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
          <button onClick={requestNotifPermission} style={{
            border: '0.5px solid var(--hairline)', background: 'var(--surface)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 14, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left', width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon.bell width={18} height={18}/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>開啟推播通知</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.5 }}>
                旅程有新紀錄時，App 開啟或在背景時會收到系統通知
              </div>
            </div>
          </button>
        )}
        {notifPermission === 'unsupported' && (
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 14, lineHeight: 1.5 }}>
            此瀏覽器不支援系統通知，但仍可在此查看新紀錄。
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, margin: '0 -4px' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12, opacity: 0.3, color: 'var(--ink-3)',
                display: 'flex', justifyContent: 'center' }}>
                <Icon.bell width={44} height={44}/>
              </div>
              <div className="t-meta" style={{ fontSize: 14, color: 'var(--ink-3)' }}>目前沒有通知</div>
            </div>
          ) : (
            notifications.map(n => {
              const legacy = !n.verb;  // older entries only had a `body` string
              const iconKey = n.action === 'delete' ? 'trash'
                : n.action === 'edit' ? 'pencil'
                : n.kind === 'loan' ? 'swap'
                : n.kind === 'settlement' ? 'check'
                : n.kind === 'trip' ? (n.action === 'settle' ? 'check' : 'close') : 'receipt';
              const toneColor = n.tone === 'pos' ? 'var(--pos)'
                : n.tone === 'neg' ? 'var(--neg)' : 'var(--ink-3)';
              const struck = n.action === 'delete';
              return (
                <button key={n.id} onClick={() => openTrip(n)} style={{
                  width: '100%', textAlign: 'left', border: 0, cursor: 'pointer',
                  background: n.read ? 'transparent' : 'var(--surface)',
                  borderRadius: 12, padding: '11px 12px', marginBottom: 6,
                  display: 'flex', gap: 11, alignItems: 'flex-start', fontFamily: 'inherit',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 1,
                    background: 'var(--surface)', color: 'var(--ink-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {React.createElement(Icon[iconKey] || Icon.receipt, { width: 18, height: 18 })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {legacy ? (
                      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{n.body}</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
                          <b>{n.actor}</b> {n.verb}
                        </div>
                        <div style={{
                          fontSize: 12.5, marginTop: 2, lineHeight: 1.5, color: 'var(--ink-2)',
                          textDecoration: struck ? 'line-through' : 'none',
                          textDecorationColor: struck ? 'var(--ink-4)' : undefined,
                        }}>
                          {n.subtitle ? <span>{n.subtitle} · </span> : null}
                          <span style={{ color: toneColor, fontWeight: 600 }}>{n.amountText}</span>
                        </div>
                      </>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}>
                      {n.tripTitle} · {fmtNotifTime(n.ts)}
                    </div>
                  </div>
                  {!n.read && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neg)', flexShrink: 0, marginTop: 6 }}/>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AboutSheet({ onClose, onGuide }) {
  const { user } = useAuth();
  const { forceBackup } = useTripActions();
  const [updatePhase, setUpdatePhase] = React.useState('idle'); // idle | syncing | done | error
  const [updateErr,   setUpdateErr]   = React.useState('');

  const signOut = () => {
    if (confirm('確定要登出？')) {
      firebase.auth().signOut().catch(console.error);
      onClose();
    }
  };

  const handleBackupAndUpdate = async () => {
    setUpdatePhase('syncing');
    setUpdateErr('');
    try {
      // 1. Force-write all trips to Firestore
      await forceBackup();
      // 2. Clear all SW caches so next load fetches fresh files
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      // 3. Tell SW to check for updates
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
      setUpdatePhase('done');
      // 4. Reload after a brief moment so user sees the success state
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error('[backup+update]', e);
      setUpdateErr(e.message || '發生錯誤');
      setUpdatePhase('error');
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

        {onGuide && (
          <button onClick={onGuide} style={{
            width: '100%', border: '0.5px solid var(--hairline)', background: 'var(--surface)',
            borderRadius: 14, padding: '12px 14px', marginBottom: 18, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left', color: 'var(--ink)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon.help width={18} height={18}/>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>使用說明</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>3 分鐘學會記帳、分帳與結清</span>
            </span>
            <Icon.chev width={14} height={14} style={{ color: 'var(--ink-4)' }}/>
          </button>
        )}

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

        {/* Backup + Update */}
        <button
          onClick={handleBackupAndUpdate}
          disabled={updatePhase === 'syncing' || updatePhase === 'done'}
          style={{
            width: '100%', border: '0.5px solid var(--hairline)',
            background: updatePhase === 'done' ? 'var(--surface)' : 'var(--ink)',
            color: updatePhase === 'done' ? 'var(--pos)' : 'var(--bg)',
            borderRadius: 12, padding: '13px 0', marginBottom: 10,
            fontSize: 14, fontWeight: 600, cursor: updatePhase === 'syncing' ? 'default' : 'pointer',
            fontFamily: 'inherit', opacity: updatePhase === 'syncing' ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {updatePhase === 'idle'    && '備份資料並更新到最新版本'}
          {updatePhase === 'syncing' && '備份中…'}
          {updatePhase === 'done'    && '✓ 備份完成，重新載入中…'}
          {updatePhase === 'error'   && '重試備份並更新'}
        </button>
        {updatePhase === 'error' && (
          <div style={{ fontSize: 11, color: 'var(--neg)', textAlign: 'center', marginBottom: 10 }}>
            {updateErr}
          </div>
        )}

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

// ─── 使用說明 ────────────────────────────────────────────────
// The guide lives in guide.html (also shared as a standalone link), so the
// in-app screen embeds it instead of keeping a second copy. In embed mode the
// page sizes this iframe to its content, so the app window does the scrolling.
function GuideScreen({ go }) {
  const url = new URL('guide.html', location.href).href;
  // Offline on a device that never cached the guide → the iframe gets a browser
  // error page (unreadable: different origin). Show a friendly message instead.
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const onLoad = (e) => {
    let ok = false;
    try { ok = !!e.target.contentDocument?.getElementById('ver'); } catch {}
    setFailed(!ok);
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'pun 使用指南', text: '3 分鐘學會用 pun 旅行分帳', url }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(url); alert('已複製使用指南連結'); }
    catch { prompt('使用指南連結', url); }
  };
  return (
    <div style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ padding: '54px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('home')}/>
        <div style={{ fontSize: 15, fontWeight: 600 }}>使用說明</div>
        <button onClick={share} style={{
          border: 0, background: 'var(--surface)', color: 'var(--ink-2)',
          height: 32, padding: '0 12px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.share width={14} height={14}/> 分享
        </button>
      </div>
      {failed && (
        <div style={{ padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--ink-4)', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon.help width={40} height={40}/>
          </div>
          <div className="t-h" style={{ fontSize: 15 }}>目前無法載入使用說明</div>
          <div className="t-meta" style={{ marginTop: 6, lineHeight: 1.6 }}>
            請連上網路再試一次。<br/>開啟過一次之後，離線也能看。
          </div>
          <button onClick={() => { setFailed(false); setAttempt(n => n + 1); }} style={{
            marginTop: 16, border: 0, background: 'var(--ink)', color: 'var(--bg)',
            padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>重新載入</button>
        </div>
      )}
      <iframe key={attempt} src="guide.html?embed=1" title="pun 使用指南" onLoad={onLoad}
        style={{ display: failed ? 'none' : 'block', width: '100%', height: '100vh', border: 0, background: 'transparent' }}/>
    </div>
  );
}
window.GuideScreen = GuideScreen;
