// auth.jsx — Login Screen UI (auth state is managed by store.jsx / StoreProvider)

const EMAIL_KEY = 'pun_signin_email';
const GSI_CLIENT_ID = '70246720877-srg60gr093bhfb081b0ol1f4nrn35h1b.apps.googleusercontent.com';

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [phase, setPhase] = React.useState('idle'); // idle | sending | sent | error
  const [err,   setErr]   = React.useState('');

  // Only PWA standalone mode (added to home screen) cannot use signInWithPopup.
  // Use Google Identity Services (GSI / FedCM) for PWA, popup for all others.
  const isPWA = window.navigator.standalone === true;

  const actionUrl = location.origin + location.pathname + location.search;
  const gsiButtonRef = React.useRef(null);

  // Initialize GSI rendered button for PWA standalone mode
  React.useEffect(() => {
    if (!isPWA) return;

    function initGSI() {
      if (!window.google?.accounts?.id || !gsiButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GSI_CLIENT_ID,
        callback: async (response) => {
          try {
            const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
            await firebase.auth().signInWithCredential(credential);
          } catch (e) {
            setErr(e.message);
            setPhase('error');
          }
        },
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.renderButton(gsiButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: Math.min(window.innerWidth - 48, 340),
      });
    }

    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          initGSI();
        }
      }, 100);
      return () => clearInterval(t);
    }
  }, [isPWA]);

  async function sendLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase('sending');
    try {
      await firebase.auth().sendSignInLinkToEmail(email.trim(), {
        url: actionUrl,
        handleCodeInApp: true,
      });
      localStorage.setItem(EMAIL_KEY, email.trim());
      setPhase('sent');
    } catch (err) {
      setErr(err.message);
      setPhase('error');
    }
  }

  async function googleSignIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErr(err.message);
        setPhase('error');
      }
    }
  }

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      background: 'var(--bg)', padding: '0 24px',
      paddingTop: 'max(60px, env(safe-area-inset-top, 60px))',
      paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 48, fontWeight: 800, fontStyle: 'italic',
          letterSpacing: -2, color: 'var(--ink)', lineHeight: 1 }}>pun</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, letterSpacing: 0.3 }}>
          旅行分帳
        </div>
        <div style={{ marginTop: 16, maxWidth: 260, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.2, lineHeight: 1.6 }}>
            <span style={{ fontStyle: 'italic', fontWeight: 700 }}>分</span>
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

      <div style={{ width: '100%', maxWidth: 340 }}>

        {phase === 'sent' ? (
          /* ── Email sent ── */
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📬</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>登入連結已寄出</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              請到 <b>{email}</b> 的信箱<br/>點擊連結完成登入
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 10 }}>
              若幾分鐘後沒收到，請確認垃圾信件夾
            </div>
            <button onClick={() => setPhase('idle')}
              style={{ marginTop: 24, border: 0, background: 'transparent',
                color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer' }}>
              重新輸入 email
            </button>
          </div>
        ) : (
          /* ── Login form ── */
          <>
            {/* Google Sign-In:
                PWA standalone → GSI rendered button (FedCM / One Tap, no popup needed)
                Regular browser → signInWithPopup                                       */}
            {isPWA ? (
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', minHeight: 44 }}>
                <div ref={gsiButtonRef} />
              </div>
            ) : (
              <button onClick={googleSignIn} style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 10,
                padding: '13px 20px', borderRadius: 14,
                border: '0.5px solid var(--hairline)',
                background: 'var(--surface)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
                color: 'var(--ink)', marginBottom: 16,
              }}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                使用 Google 登入
              </button>
            )}

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: .5, background: 'var(--hairline)' }}/>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>或用 email 登入</span>
              <div style={{ flex: 1, height: .5, background: 'var(--hairline)' }}/>
            </div>

            {/* Email link */}
            <form onSubmit={sendLink}>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setPhase('idle'); }}
                placeholder="your@email.com"
                autoComplete="email"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '13px 16px', borderRadius: 14, fontSize: 15,
                  border: '0.5px solid var(--hairline)',
                  background: 'var(--surface)', color: 'var(--ink)',
                  fontFamily: 'inherit', outline: 'none', marginBottom: 10,
                }}
              />
              <button type="submit"
                disabled={!email.trim() || phase === 'sending'}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 14,
                  border: 0,
                  background: email.trim() ? 'var(--ink)' : 'var(--surface)',
                  color: email.trim() ? 'var(--bg)' : 'var(--ink-3)',
                  fontSize: 15, fontWeight: 600,
                  cursor: email.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}>
                {phase === 'sending' ? '寄送中…' : '寄出登入連結'}
              </button>
            </form>

            {phase === 'error' && (
              <div style={{ marginTop: 12, color: 'var(--neg)', fontSize: 12, textAlign: 'center' }}>
                {err}
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: 11, color: 'var(--ink-4)',
              textAlign: 'center', lineHeight: 1.6 }}>
              登入即表示你同意此 app 僅將資料存於<br/>你個人的 Firebase 帳號中
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
