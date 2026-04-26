// sync-firebase.jsx — Invite UI: share a trip + join by code

// ── InviteSheet — shown to trip OWNER ────────────────────────────────────────
function InviteSheet({ tripId, onClose }) {
  const { shareTrip } = useTripActions();
  const [phase, setPhase] = React.useState('idle'); // idle | loading | done | error
  const [code,  setCode]  = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function activate() {
    setPhase('loading');
    try {
      const c = await shareTrip(tripId);
      setCode(c);
      setPhase('done');
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  }

  React.useEffect(() => {
    // If trip already has a shareCode, fetch it
    activate();
  }, []); // eslint-disable-line

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    const url = `${location.origin}${location.pathname}?invite=${code}`;
    if (navigator.share) navigator.share({ title: '加入我的旅程', url });
    else { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `24px 24px max(32px, env(safe-area-inset-bottom, 32px))`,
      }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--ink-4)', margin: '0 auto 20px' }}/>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>邀請旅伴</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
          分享邀請碼或連結給旅伴，對方登入後即可共同編輯此旅程。
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>產生邀請碼…</div>
        )}

        {phase === 'done' && (
          <>
            <div style={{
              background: 'var(--surface)', borderRadius: 16, padding: '16px 20px',
              textAlign: 'center', marginBottom: 14, border: '0.5px solid var(--hairline)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.6, marginBottom: 8 }}>邀請碼</div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8,
                fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>{code}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={copy} style={{
                flex: 1, borderRadius: 12, border: '0.5px solid var(--hairline)',
                background: 'var(--surface)', padding: 13, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)',
              }}>{copied ? '✓ 已複製' : '複製邀請碼'}</button>
              <button onClick={shareLink} style={{
                flex: 1, borderRadius: 12, border: 0,
                background: 'var(--ink)', padding: 13, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--bg)',
              }}>分享連結…</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
              旅伴在首頁點「加入旅程」輸入此碼，或直接點分享連結
            </div>
          </>
        )}

        {phase === 'error' && (
          <div style={{ color: 'var(--neg)', fontSize: 13 }}>{err}</div>
        )}
      </div>
    </div>
  );
}

// ── JoinSheet — shown to GUEST ────────────────────────────────────────────────
function JoinSheet({ initialCode = '', onClose }) {
  const { joinTripByCode } = useTripActions();
  const [code,  setCode]  = React.useState(initialCode.toUpperCase());
  const [phase, setPhase] = React.useState('idle');
  const [err,   setErr]   = React.useState('');

  async function join() {
    if (code.length < 4) return;
    setPhase('loading');
    try {
      await joinTripByCode(code);
      onClose();
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  }

  const ready = code.length >= 4 && phase !== 'loading';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: `24px 24px max(32px, env(safe-area-inset-bottom, 32px))`,
      }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--ink-4)', margin: '0 auto 20px' }}/>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>加入旅程</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>輸入旅伴傳給你的邀請碼</div>

        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')); setPhase('idle'); }}
          onKeyDown={e => e.key === 'Enter' && ready && join()}
          placeholder="例：AB1C2D"
          maxLength={8} autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 28, fontWeight: 700, letterSpacing: 8, textAlign: 'center',
            fontFamily: 'var(--font-num)', color: 'var(--ink)',
            border: '0.5px solid var(--hairline)', borderRadius: 14,
            padding: '16px 20px', background: 'var(--surface)', outline: 'none', marginBottom: 12,
          }}
        />

        {phase === 'error' && (
          <div style={{ color: 'var(--neg)', fontSize: 13, marginBottom: 12 }}>{err}</div>
        )}

        <button onClick={join} disabled={!ready} style={{
          width: '100%', border: 0, borderRadius: 14,
          background: ready ? 'var(--ink)' : 'var(--surface)',
          color: ready ? 'var(--bg)' : 'var(--ink-3)',
          padding: 14, fontSize: 15, fontWeight: 600,
          cursor: ready ? 'pointer' : 'default', fontFamily: 'inherit',
        }}>{phase === 'loading' ? '加入中…' : '加入旅程'}</button>
      </div>
    </div>
  );
}

window.InviteSheet = InviteSheet;
window.JoinSheet   = JoinSheet;
