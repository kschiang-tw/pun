// ccy-picker.jsx — Bottom-sheet currency picker with search + recents

function CcyPicker({ value, onChange, allowedHint, label = '幣別' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button" style={{
        height: 36, padding: '0 12px', borderRadius: 10,
        border: '0.5px solid var(--hairline-strong)', background: 'var(--bg-2)',
        fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
        fontFamily: 'inherit', flexShrink: 0, display: 'inline-flex',
        alignItems: 'center', gap: 6,
      }}>
        {value} <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>▾</span>
      </button>
      {open && <CcyPickerSheet value={value} onChange={onChange}
        allowedHint={allowedHint} label={label} onClose={() => setOpen(false)}/>}
    </>
  );
}

function CcyPickerSheet({ value, onChange, allowedHint, label, onClose }) {
  const [q, setQ] = React.useState('');
  const recents = window.getRecentCcys ? window.getRecentCcys() : [];
  const all = window.CURRENCIES || [];

  // Lock body scroll while sheet is open (prevents iOS viewport shift)
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const filtered = q.trim()
    ? all.filter(([code, name]) => {
        const t = q.trim().toUpperCase();
        return code.includes(t) || name.toUpperCase().includes(t);
      })
    : all;

  const pick = (code) => {
    if (window.pushRecentCcy) window.pushRecentCcy(code);
    onChange(code);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'color-mix(in oklch, var(--ink) 30%, transparent)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '80svh',
        background: 'var(--bg)', borderRadius: '24px 24px 0 0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 40px color-mix(in oklch, var(--ink) 18%, transparent)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--hairline-strong)' }}/>
        </div>
        <div style={{ padding: '0 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{label}</div>
          {allowedHint && <div className="t-meta" style={{ fontSize: 11 }}>{allowedHint}</div>}
        </div>
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-2)', borderRadius: 12, padding: '8px 12px',
            border: '0.5px solid var(--hairline)',
          }}>
            <Icon.search width={14} height={14} style={{ color: 'var(--ink-3)' }}/>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="搜尋代碼或名稱" style={{
                flex: 1, border: 0, outline: 'none', background: 'transparent',
                fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
              }}/>
            {q && <button onClick={() => setQ('')} style={{
              border: 0, background: 'transparent', color: 'var(--ink-3)',
              fontSize: 12, cursor: 'pointer',
            }}>清除</button>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 24px' }} className="no-scroll">
          {!q && recents.length > 0 && (
            <>
              <div className="t-cap" style={{ padding: '12px 12px 6px' }}>最近使用</div>
              {recents.map(code => (
                <CcyRow key={'r-'+code} code={code} name={window.CCY_NAME?.[code]}
                  active={code === value} onClick={() => pick(code)}/>
              ))}
              <div style={{ height: 1, background: 'var(--hairline)', margin: '10px 14px' }}/>
              <div className="t-cap" style={{ padding: '8px 12px 6px' }}>全部幣別</div>
            </>
          )}
          {filtered.map(([code, name]) => (
            <CcyRow key={code} code={code} name={name}
              active={code === value} onClick={() => pick(code)}/>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="t-meta">找不到「{q}」</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CcyRow({ code, name, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px 14px', display: 'flex',
      alignItems: 'center', gap: 12, border: 0, cursor: 'pointer',
      background: active ? 'var(--clay-soft)' : 'transparent',
      borderRadius: 10, fontFamily: 'inherit', textAlign: 'left',
      color: active ? 'var(--clay-deep)' : 'var(--ink)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-num)', letterSpacing: 0.3, width: 42 }}>{code}</span>
      <span style={{ flex: 1, fontSize: 13, color: active ? 'var(--clay-deep)' : 'var(--ink-2)' }}>{name}</span>
      {active && <Icon.check width={16} height={16}/>}
    </button>
  );
}

window.CcyPicker = CcyPicker;
