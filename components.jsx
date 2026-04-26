// components.jsx — Shared primitives

const CATEGORY_ICON = {
  food: 'fork', lodging: 'bed', transit: 'tram', activity: 'ticket', shop: 'bag',
};

const stroke = (d, props = {}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
       strokeLinecap="round" strokeLinejoin="round" {...props}>{d}</svg>
);

const Icon = {
  plus:     (p) => stroke(<><path d="M12 5v14M5 12h14"/></>, p),
  back:     (p) => stroke(<path d="M15 18l-6-6 6-6"/>, p),
  forward:  (p) => stroke(<path d="M9 18l6-6-6-6"/>, p),
  close:    (p) => stroke(<><path d="M6 6l12 12M18 6L6 18"/></>, p),
  search:   (p) => stroke(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>, p),
  more:     (p) => stroke(<><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></>, p),
  cog:      (p) => stroke(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>, p),
  home:     (p) => stroke(<path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/>, p),
  list:     (p) => stroke(<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></>, p),
  chart:    (p) => stroke(<><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>, p),
  people:   (p) => stroke(<><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M22 19c0-2.5-2-4.5-5-4.5"/></>, p),
  bed:      (p) => stroke(<><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 14h18M3 18v2M21 18v2"/><circle cx="8" cy="11" r="1.5"/></>, p),
  fork:     (p) => stroke(<><path d="M7 3v8a2 2 0 0 0 2 2v8"/><path d="M11 3v8a2 2 0 0 1-2 2"/><path d="M16 3c-1.5 1-2 2.5-2 5 0 2 1 3 2 3v10"/></>, p),
  tram:     (p) => stroke(<><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><circle cx="9" cy="14" r="0.8"/><circle cx="15" cy="14" r="0.8"/><path d="M8 17l-2 4M16 17l2 4"/></>, p),
  ticket:   (p) => stroke(<><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z"/><path d="M13 7v2M13 11v2M13 15v2"/></>, p),
  bag:      (p) => stroke(<><path d="M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>, p),
  receipt:  (p) => stroke(<><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></>, p),
  swap:     (p) => stroke(<><path d="M7 7h13l-3-3M17 17H4l3 3"/></>, p),
  globe:    (p) => stroke(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>, p),
  download: (p) => stroke(<><path d="M12 3v13M6 11l6 6 6-6M4 21h16"/></>, p),
  share:    (p) => stroke(<><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></>, p),
  arrow:    (p) => stroke(<path d="M5 12h14M13 6l6 6-6 6"/>, p),
  arrowDown:(p) => stroke(<path d="M19 12l-7 7-7-7M12 5v14"/>, p),
  arrowUp:  (p) => stroke(<path d="M5 12l7-7 7 7M12 19V5"/>, p),
  calc:     (p) => stroke(<><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3"/><circle cx="9" cy="13" r="0.5"/><circle cx="12" cy="13" r="0.5"/><circle cx="15" cy="13" r="0.5"/><circle cx="9" cy="17" r="0.5"/><circle cx="12" cy="17" r="0.5"/><circle cx="15" cy="17" r="0.5"/></>, p),
  check:    (p) => stroke(<path d="M5 12l5 5L20 7"/>, p),
  pencil:   (p) => stroke(<><path d="M14 4l6 6-11 11H3v-6z"/></>, p),
  user:     (p) => stroke(<><circle cx="12" cy="8" r="4"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8"/></>, p),
  copy:     (p) => stroke(<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>, p),
  print:    (p) => stroke(<><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><rect x="6" y="14" width="12" height="7"/><circle cx="17" cy="12.5" r="0.6"/></>, p),
  chev:     (p) => stroke(<path d="M9 18l6-6-6-6"/>, p),
  pdf:      (p) => stroke(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 13h1a1 1 0 0 1 0 2H9v-2zm0 2v2M14 13v4M13 13h2M16 13h2M16 15h2"/></>, p),
  filter:   (p) => stroke(<path d="M4 6h16M7 12h10M10 18h4"/>, p),
  bell:     (p) => stroke(<><path d="M6 9a6 6 0 0 1 12 0c0 4 1 6 2 7H4c1-1 2-3 2-7z"/><path d="M10 21a2 2 0 0 0 4 0"/></>, p),
};

function Avatar({ member, size = 32, ring = false }) {
  const tints = {
    sage:  ['oklch(0.78 0.030 145)', 'oklch(0.42 0.040 148)'],
    clay:  ['oklch(0.82 0.038 42)',  'oklch(0.46 0.050 38)'],
    stone: ['oklch(0.80 0.022 235)', 'oklch(0.42 0.030 235)'],
    rose:  ['oklch(0.85 0.030 15)',  'oklch(0.46 0.045 15)'],
    plum:  ['oklch(0.80 0.028 320)', 'oklch(0.42 0.035 320)'],
  };
  const [bg, fg] = tints[member?.tint] || tints.sage;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, letterSpacing: 0,
      flexShrink: 0,
      boxShadow: ring ? '0 0 0 2px var(--surface), 0 0 0 3px ' + fg : 'none',
    }}>{member?.initial || '?'}</div>
  );
}

function AvatarStack({ members, size = 28 }) {
  return (
    <div style={{ display: 'inline-flex' }}>
      {members.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}>
          <Avatar member={m} size={size} ring />
        </div>
      ))}
    </div>
  );
}

const CAT_TINTS = {
  lodging: 'stone', food: 'clay', transit: 'sage', activity: 'rose', shop: 'plum',
};

function CatIcon({ catId, size = 36 }) {
  const tint = CAT_TINTS[catId] || 'sage';
  const tints = {
    sage:  'oklch(0.86 0.024 145)', clay:  'oklch(0.88 0.030 42)',
    stone: 'oklch(0.86 0.020 235)', rose:  'oklch(0.90 0.026 15)',
    plum:  'oklch(0.86 0.024 320)',
  };
  const inks = {
    sage:  'oklch(0.40 0.040 148)', clay:  'oklch(0.42 0.050 38)',
    stone: 'oklch(0.38 0.030 235)', rose:  'oklch(0.42 0.045 15)',
    plum:  'oklch(0.40 0.035 320)',
  };
  const iconKey = CATEGORY_ICON[catId] || 'receipt';
  const IconComp = Icon[iconKey] || Icon.receipt;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: tints[tint], color: inks[tint],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <IconComp width={size * 0.55} height={size * 0.55}/>
    </div>
  );
}

function GlassTabBar({ active, onChange, items }) {
  return (
    <div style={{
      position: 'fixed', left: 12, right: 12,
      bottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
      height: 64, borderRadius: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 8px', zIndex: 30,
    }} className="glass">
      {items.map(it => {
        const on = it.id === active;
        const Comp = Icon[it.icon];
        return (
          <button key={it.id} onClick={() => onChange?.(it.id)}
            style={{
              border: 0, background: on ? 'color-mix(in oklch, var(--ink) 8%, transparent)' : 'transparent',
              borderRadius: 18, padding: '8px 14px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              color: on ? 'var(--ink)' : 'var(--ink-3)',
              cursor: 'pointer', minWidth: 56,
            }}>
            <Comp width={22} height={22} strokeWidth={on ? 2 : 1.6}/>
            <span style={{ fontSize: 10, fontWeight: 500 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function GlassNavBar({ title, leading, trailing, scrolled = false }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      padding: 'var(--nav-top, 54px) 16px 8px',
      transition: 'background 0.2s',
      background: scrolled ? 'color-mix(in oklch, var(--bg) 75%, transparent)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
      borderBottom: scrolled ? '0.5px solid var(--hairline)' : '0.5px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 36 }}>
        <div style={{ flex: 1 }}>{leading}</div>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 16, fontWeight: 600, color: 'var(--ink)',
          opacity: scrolled ? 1 : 0, transition: 'opacity 0.2s',
        }}>{title}</div>
        <div style={{ display: 'flex', gap: 8 }}>{trailing}</div>
      </div>
    </div>
  );
}

function PillButton({ children, tone, onClick, style }) {
  const tones = {
    primary: { bg: 'var(--ink)', fg: 'var(--bg)' },
    glass:   { bg: 'transparent', fg: 'var(--ink)', glass: true },
    sage:    { bg: 'var(--sage-soft)', fg: 'var(--sage-deep)' },
    clay:    { bg: 'var(--clay-soft)', fg: 'var(--clay-deep)' },
  };
  const t = tones[tone] || tones.glass;
  return (
    <button onClick={onClick} className={t.glass ? 'glass-pill' : ''}
      style={{
        height: 36, padding: '0 14px', borderRadius: 999,
        background: t.bg, color: t.fg,
        border: t.glass ? undefined : '0.5px solid var(--hairline)',
        fontSize: 14, fontWeight: 500, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        ...style,
      }}>{children}</button>
  );
}

function CircleIconBtn({ icon, size = 36, onClick, tone = 'glass', style }) {
  const Comp = Icon[icon];
  if (!Comp) return null;
  return (
    <button onClick={onClick} className={tone === 'glass' ? 'glass-pill' : ''}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: 0, color: 'var(--ink)',
        background: tone === 'ink' ? 'var(--ink)' : (tone === 'glass' ? undefined : 'var(--surface)'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        ...style,
      }}>
      <Comp width={size * 0.5} height={size * 0.5} style={{ color: tone === 'ink' ? 'var(--bg)' : undefined }}/>
    </button>
  );
}

function CcyChip({ code, size = 24 }) {
  const tints = {
    TWD: ['oklch(0.85 0.030 15)',  'oklch(0.42 0.045 15)'],
    DKK: ['oklch(0.85 0.030 15)',  'oklch(0.42 0.045 15)'],
    SEK: ['oklch(0.82 0.030 240)', 'oklch(0.40 0.045 240)'],
    THB: ['oklch(0.86 0.028 80)',  'oklch(0.45 0.045 80)'],
  };
  const [bg, fg] = tints[code] || tints.TWD;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: -0.2, flexShrink: 0,
    }}>{code}</span>
  );
}

// ── Print helper ─────────────────────────────────────────────────────────────
// Opens a lightweight standalone HTML window for printing — avoids iOS PWA
// re-rendering the full React+Babel page (which takes 5+ minutes).
function openPrintWindow(elementId) {
  const el = document.getElementById(elementId);
  if (!el) { window.print(); return; }

  // Resolve CSS custom properties so the print window renders correctly
  const rs = getComputedStyle(document.documentElement);
  const varNames = [
    '--ink','--ink-2','--ink-3','--ink-4',
    '--bg','--surface','--hairline',
    '--font-sans','--font-num','--font-mono',
  ];
  const cssVars = varNames.map(v => `${v}:${rs.getPropertyValue(v)}`).join(';');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<style>
  :root{${cssVars}}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;padding:24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif}
  @media print{body{padding:0}}
</style>
</head><body>
${el.outerHTML}
<script>
window.onload=function(){setTimeout(function(){
  window.print();
  window.onafterprint=function(){window.close()};
},150)};
<\/script>
</body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

Object.assign(window, {
  Icon, Avatar, AvatarStack, CatIcon,
  GlassTabBar, GlassNavBar, PillButton, CircleIconBtn,
  CcyChip, CATEGORY_ICON, openPrintWindow,
});
