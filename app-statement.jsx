// app-statement.jsx — Per-member formal PDF statement

function StatementScreen({ go, tripId }) {
  const trip = useTrip(tripId);
  const [memberId, setMemberId] = React.useState(
    () => (trip?.members.find(m => m.isMe) || trip?.members[0])?.id);
  if (!trip) return null;
  const member = trip.members.find(m => m.id === memberId) || trip.members[0];
  const data = buildStatement(trip, memberId);
  const print = () => window.print();

  return (
    <div style={{ paddingBottom: 60 }}>
      <div className="no-print" style={{ padding:'54px 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CircleIconBtn icon="back" onClick={() => go('export', { tripId })}/>
        <div style={{ fontSize:15, fontWeight:600 }}>個人帳單</div>
        <button onClick={print} style={{ border:0, background:'var(--ink)', color:'var(--bg)', height:32, padding:'0 14px', borderRadius:999, fontSize:13, fontWeight:500, cursor:'pointer' }}>列印 PDF</button>
      </div>

      <div className="no-print" style={{ padding:'4px 16px 12px' }}>
        <div className="t-cap" style={{ marginBottom:6, paddingLeft:4 }}>選擇成員</div>
        <div style={{ display:'flex', gap:6, overflowX:'auto' }} className="no-scroll">
          {trip.members.map(m => {
            const on = m.id === memberId;
            return (
              <button key={m.id} onClick={() => setMemberId(m.id)} style={{
                flexShrink:0, padding:'6px 10px 6px 6px', border:0, cursor:'pointer',
                borderRadius:999, display:'flex', alignItems:'center', gap:8,
                background: on ? 'oklch(0.32 0.055 148)' : 'var(--surface)',
                color: on ? 'oklch(0.94 0.018 145)' : 'var(--ink)', fontFamily:'inherit',
              }}>
                <Avatar member={m} size={24}/>
                <span style={{ fontSize:13, fontWeight:500 }}>{m.name}{m.isMe ? '（你）' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'0 12px' }}>
        <div id="statement-doc" style={{
          background:'#fff', borderRadius:6,
          boxShadow:'0 12px 40px color-mix(in oklch, var(--ink) 10%, transparent)',
          padding:'28px 24px 32px',
          fontFamily:'var(--font-sans)', fontSize:11, color:'#1d1d1d', lineHeight:1.55,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:14, borderBottom:'2px solid #1d1d1d' }}>
            <div>
              <div style={{ fontSize:9, letterSpacing:2.4, color:'#777', fontWeight:600 }}><em>pun</em> · STATEMENT</div>
              <div style={{ fontSize:18, fontWeight:700, marginTop:6, letterSpacing:-0.3 }}>{trip.title}</div>
              {trip.subtitle && <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{trip.subtitle}</div>}
              <div style={{ fontSize:10, color:'#666', marginTop:4 }}>{trip.startDate} – {trip.endDate}</div>
            </div>
            <div style={{ textAlign:'right', fontSize:9, color:'#777' }}>
              <div style={{ fontWeight:600, color:'#1d1d1d', fontSize:10 }}>NO. {trip.id.toUpperCase().slice(0,6)}-{member.id.toUpperCase().slice(0,4)}</div>
              <div style={{ marginTop:3 }}>ISSUED {new Date().toISOString().slice(0,10)}</div>
              <div>BASE {trip.baseCurrency}</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, paddingTop:14 }}>
            <div>
              <div style={{ fontSize:8, letterSpacing:1.6, color:'#999', fontWeight:600 }}>STATEMENT FOR</div>
              <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>{member.name}</div>
              <div style={{ fontSize:10, color:'#666', marginTop:1 }}>{trip.members.length} 位成員之一</div>
            </div>
            <div>
              <div style={{ fontSize:8, letterSpacing:1.6, color:'#999', fontWeight:600 }}>NET POSITION</div>
              <div style={{ fontSize:18, fontWeight:700, marginTop:4, color: data.net>0.5?'#2d6a3a':data.net<-0.5?'#a13d2d':'#1d1d1d' }}>
                {data.net > 0 ? '+' : data.net < 0 ? '−' : ''}{fmtBase(Math.abs(data.net), trip)}
              </div>
              <div style={{ fontSize:10, color:'#666', marginTop:1 }}>
                {data.net>0.5 ? '其他成員應付給你' : data.net<-0.5 ? '你應付給其他成員' : '已結平'}
              </div>
            </div>
          </div>

          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:8, letterSpacing:1.6, color:'#999', fontWeight:600, marginBottom:8 }}>EXPENSE DETAIL · BY CURRENCY</div>

            {data.byCcy.map(group => (
              <div key={group.ccy} style={{ marginBottom:18, breakInside:'avoid' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'8px 10px', background:'#f4f1eb', borderRadius:'3px 3px 0 0' }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700 }}>{group.ccy}</span>
                    <span style={{ fontSize:10, color:'#666', marginLeft:6 }}>{window.CCY_NAME?.[group.ccy] || ''}</span>
                  </div>
                  <div style={{ fontSize:10, color:'#666' }}>
                    參考匯率 1 {group.ccy} = {ENGINE.round2(trip.rates[group.ccy] || 1)} {trip.baseCurrency}
                  </div>
                </div>

                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #1d1d1d' }}>
                      <th style={thStyle}>日期</th>
                      <th style={thStyle}>項目</th>
                      <th style={thStyle}>付款人</th>
                      <th style={{...thStyle, textAlign:'right'}}>總額</th>
                      <th style={{...thStyle, textAlign:'right'}}>分擔方式</th>
                      <th style={{...thStyle, textAlign:'right'}}>你的金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(r => (
                      <tr key={r.id} style={{ borderBottom:'0.5px solid #ece6db' }}>
                        <td style={tdStyle}>{r.date.slice(5).replace('-','/')}</td>
                        <td style={{...tdStyle, fontWeight:500}}>
                          {r.title}
                          {r.note && <div style={{ fontSize:9, color:'#888' }}>{r.note}</div>}
                        </td>
                        <td style={tdStyle}>
                          {r.paidByName}
                          {r.paidByMe && <span style={{ fontSize:8, color:'#2d6a3a', marginLeft:3, fontWeight:600 }}>(你付)</span>}
                        </td>
                        <td style={{...tdStyle, textAlign:'right', fontFamily:'var(--font-num)'}}>{Math.round(r.amount).toLocaleString()}</td>
                        <td style={{...tdStyle, textAlign:'right', fontSize:9, color:'#666'}}>{r.modeLabel}</td>
                        <td style={{...tdStyle, textAlign:'right', fontFamily:'var(--font-num)', fontWeight:600}}>
                          {r.share > 0 ? Math.round(r.share).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:'1px solid #1d1d1d' }}>
                      <td colSpan={3} style={{...tdStyle, fontWeight:600}}>小計 / SUBTOTAL ({group.ccy})</td>
                      <td style={{...tdStyle, textAlign:'right', fontFamily:'var(--font-num)', fontWeight:600}}>{Math.round(group.totalAmount).toLocaleString()}</td>
                      <td style={tdStyle}/>
                      <td style={{...tdStyle, textAlign:'right', fontFamily:'var(--font-num)', fontWeight:700}}>{Math.round(group.totalShare).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} style={{...tdStyle, fontSize:9, color:'#666'}}>換算 {trip.baseCurrency} (× {ENGINE.round2(trip.rates[group.ccy] || 1)})</td>
                      <td style={{...tdStyle, textAlign:'right', fontFamily:'var(--font-num)', fontWeight:600, fontSize:11, color:'#1d1d1d'}}>
                        {fmtBase(group.totalShare * (trip.rates[group.ccy] || 1), trip)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>

          <div style={{ marginTop:8, padding:'14px 16px', background:'#f4f1eb', color:'#1d1d1d', borderRadius:4 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, fontSize:11 }}>
              <span style={{ color:'#666' }}>你的總分擔（{trip.baseCurrency} 換算）</span>
              <span style={{ fontFamily:'var(--font-num)', fontWeight:600 }}>{fmtBase(data.totalShareBase, trip)}</span>
              <span style={{ color:'#666' }}>你已支付（{trip.baseCurrency} 換算）</span>
              <span style={{ fontFamily:'var(--font-num)', fontWeight:600 }}>{fmtBase(data.totalPaidBase, trip)}</span>
            </div>
            <div style={{ height:1, background:'#d8d3c8', margin:'10px 0' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:10, letterSpacing:1.6, color:'#888', fontWeight:600 }}>應收 / 應付 NET</span>
              <span style={{ fontFamily:'var(--font-num)', fontWeight:700, fontSize:18, color: data.net>0.5?'#2d6a3a':data.net<-0.5?'#a13d2d':'#1d1d1d' }}>
                {data.net > 0 ? '+' : data.net < 0 ? '−' : ''}{fmtBase(Math.abs(data.net), trip)}
              </span>
            </div>
          </div>

          {data.transfers.length > 0 && (
            <div style={{ marginTop:18 }}>
              <div style={{ fontSize:8, letterSpacing:1.6, color:'#999', fontWeight:600, marginBottom:8 }}>SETTLEMENT INSTRUCTIONS</div>
              <div style={{ border:'0.5px solid #d8d3c8', borderRadius:4, padding:'4px 14px' }}>
                {data.transfers.map((t, i) => (
                  <div key={i} style={{ padding:'8px 0', borderBottom: i===data.transfers.length-1?0:'0.5px solid #ece6db', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11 }}>
                    <span>
                      {t.direction === 'pay'
                        ? <>付給 <b>{t.otherName}</b></>
                        : <>向 <b>{t.otherName}</b> 收取</>}
                    </span>
                    <span style={{ fontFamily:'var(--font-num)', fontWeight:700 }}>{fmtBase(t.amount, trip)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop:24, paddingTop:10, borderTop:'0.5px solid #d8d3c8', display:'flex', justifyContent:'space-between', fontSize:8, color:'#999' }}>
            <span>本文件由 <em>pun</em> 自動產生 · 僅供成員間結算參考</span>
            <span>PAGE 1 OF 1</span>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ padding:'14px 20px 0', textAlign:'center' }}>
        <div className="t-meta" style={{ fontSize:11 }}>按「列印 PDF」存成檔案，或用瀏覽器列印對話框另存</div>
      </div>
    </div>
  );
}

const thStyle = { textAlign:'left', padding:'6px 6px', fontSize:9, letterSpacing:0.5, color:'#666', fontWeight:600, textTransform:'uppercase' };
const tdStyle = { padding:'6px 6px', verticalAlign:'top' };

function buildStatement(trip, memberId) {
  const memberById = Object.fromEntries(trip.members.map(m => [m.id, m]));
  const modeLabels = { equal:'均分', exact:'指定', shares:'等份', percent:'比例' };
  const groups = {};
  let totalShareBase = 0, totalPaidBase = 0;

  for (const e of trip.expenses) {
    const shares = ENGINE.computeShares(e, trip.members);
    const myShare = shares[memberId] || 0;
    if (myShare === 0 && e.paidBy !== memberId) continue;

    const rate = trip.rates[e.ccy] || 1;
    totalShareBase += myShare * rate;
    if (e.paidBy === memberId) totalPaidBase += e.amount * rate;

    if (!groups[e.ccy]) groups[e.ccy] = { ccy: e.ccy, rows: [], totalAmount: 0, totalShare: 0 };
    groups[e.ccy].rows.push({
      id: e.id, date: e.date, title: e.title, note: e.note || '',
      amount: e.amount, share: myShare,
      paidByName: memberById[e.paidBy]?.name || '?',
      paidByMe: e.paidBy === memberId,
      modeLabel: modeLabels[e.mode] || e.mode,
    });
    groups[e.ccy].totalAmount += e.amount;
    groups[e.ccy].totalShare += myShare;
  }

  for (const g of Object.values(groups)) {
    g.rows.sort((a,b) => a.date.localeCompare(b.date));
  }
  const byCcy = Object.values(groups).sort((a,b) => b.totalShare - a.totalShare);

  const all = ENGINE.simplify(trip);
  const transfers = [];
  for (const t of all) {
    if (t.from === memberId) transfers.push({ direction:'pay', otherName: memberById[t.to]?.name, amount: t.amount });
    else if (t.to === memberId) transfers.push({ direction:'receive', otherName: memberById[t.from]?.name, amount: t.amount });
  }

  const net = totalPaidBase - totalShareBase;
  return {
    byCcy,
    totalShareBase: ENGINE.round2(totalShareBase),
    totalPaidBase: ENGINE.round2(totalPaidBase),
    net: ENGINE.round2(net),
    transfers,
  };
}

window.StatementScreen = StatementScreen;
