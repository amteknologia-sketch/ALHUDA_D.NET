/* app.js — ALHUDA_D.NET (mode langsung ke router) v3 */
'use strict';

/* ---------- helpers ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const view = ()=>document.getElementById('view');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let timers = [];
function clearTimers(){ timers.forEach(t=>clearInterval(t)); timers=[]; }
function fmtBytes(b){ b=+b||0; const u=['B','KB','MB','GB','TB']; let i=0; while(b>=1024&&i<u.length-1){b/=1024;i++;} return b.toFixed(b<10&&i>0?2:0)+' '+u[i]; }
function mbps(bps){ return (+bps||0)/1e6; }
function fmtBps(bps){ const m=mbps(bps); return (m>=1?m.toFixed(2):(bps/1e3).toFixed(0)+'e-3')+' Mbps'; }
function fmtMbps(bps){ return mbps(bps).toFixed(2)+' Mbps'; }
function money(cur,n){ n=+n||0; const indo=/^(rp|idr)$/i.test(cur||''); return (cur||'')+' '+(indo?n.toLocaleString('id-ID'):n.toLocaleString('en-US',{minimumFractionDigits:2})); }
function toast(msg,kind){ const t=document.createElement('div'); t.className='toast'+(kind?' '+kind:''); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
function confirmBox(msg){ return window.confirm(msg); }
function sheet(title, inner){
  closeSheet();
  const wrap=document.createElement('div'); wrap.className='modal'; wrap.id='sheet';
  wrap.innerHTML=`<div class="sheet"><h3>${esc(title)}<button class="x" onclick="closeSheet()">✕</button></h3><div id="sheetBody"></div></div>`;
  wrap.addEventListener('click',e=>{ if(e.target===wrap) closeSheet(); });
  document.body.appendChild(wrap); $('#sheetBody').innerHTML=inner; return $('#sheetBody');
}
function closeSheet(){ const s=$('#sheet'); if(s) s.remove(); }
window.closeSheet=closeSheet;
async function copyText(t){ try{ await navigator.clipboard.writeText(t); toast('Disalin','ok'); }catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');toast('Disalin','ok');}catch(_){toast('Gagal menyalin','err');} ta.remove(); } }
function waShare(text){ const url='https://wa.me/?text='+encodeURIComponent(text);
  if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Share){ window.Capacitor.Plugins.Share.share({text}).catch(()=>window.open(url,'_system')); }
  else { window.open(url,'_blank'); } }

/* ---------- meter ---------- */
function meterHTML(id,label,value,max,opt){
  opt=opt||{}; const pct=Math.max(0,Math.min(100,max>0?(value/max*100):0));
  let color='var(--accent)';
  if(opt.red!=null && value>=opt.red) color='var(--danger)';
  else if(opt.yellow!=null && value>=opt.yellow) color='var(--warn)';
  const disp=opt.display!=null?opt.display:value;
  return `<div class="kv"><span class="k">${esc(label)}</span><span class="v" id="${id}_t">${esc(disp)}</span></div>
    <div class="meter"><span id="${id}_b" style="width:${pct}%;background:${color}"></span></div>`;
}
function updateMeter(id,value,max,opt){
  opt=opt||{}; const b=$('#'+id+'_b'), t=$('#'+id+'_t'); if(!b) return;
  const pct=Math.max(0,Math.min(100,max>0?(value/max*100):0));
  let color='var(--accent)';
  if(opt.red!=null && value>=opt.red) color='var(--danger)';
  else if(opt.yellow!=null && value>=opt.yellow) color='var(--warn)';
  b.style.width=pct+'%'; b.style.background=color;
  if(t && opt.display!=null) t.textContent=opt.display;
}

/* ---------- PDF / print ---------- */
function printOverlay(inner){
  closeSheet();
  const o=document.createElement('div'); o.className='printwrap'; o.id='printwrap';
  o.innerHTML=`<div class="printbar"><button class="btn sm" onclick="document.getElementById('printwrap').remove()">✕ Tutup</button>
    <button class="btn sm pri" onclick="try{window.print()}catch(e){}">🖨 Cetak</button>
    <span class="sub">Bisa juga di-screenshot</span></div><div class="printpage">${inner}</div>`;
  document.body.appendChild(o);
}
function logoSrc(){ return Store.logo || 'img/logo.png'; }
function humanDur(v){ v=String(v||'').trim(); if(!v) return '-';
  let d=0,h=0,m=0; const dm=v.match(/(\d+)\s*d/i); if(dm)d=+dm[1]; const hm=v.match(/(\d+)\s*h/i); if(hm)h=+hm[1]; const mm=v.match(/(\d+)\s*m(?!s)/i); if(mm&&!/:/.test(v))m=+mm[1];
  const t=v.match(/(\d{1,3}):(\d{2}):(\d{2})/); if(t){ d+=Math.floor(+t[1]/24); h+=(+t[1])%24; m+=+t[2]; }
  const p=[]; if(d)p.push(d+' Hari'); if(h)p.push(h+'Jam'); if(m)p.push(m+' Menit'); return p.join(' ')||v;
}
function masaAktif(profileName){ const p=(profileCache||[]).find(x=>x.name===profileName); return p&&p.validity?humanDur(p.validity):'-'; }
function voucherCardHTML(v){
  const masa=v.masa||masaAktif(v.profile);
  const note=esc(Store.vnote);
  const qr='https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data='+encodeURIComponent(v.user);
  return `<div class="tkt">
    <div class="tkt-price"><span>${esc(v.price||'')}</span></div>
    <div class="tkt-main">
      <img class="tkt-logo" src="${esc(logoSrc())}" alt="logo">
      <div class="tkt-code">${esc(v.user)}</div>
      <div class="tkt-masa">Masa aktif: ${esc(masa)}</div>
      <div class="tkt-note">${note}</div>
    </div>
    <div class="tkt-qr"><img src="${qr}" alt="QR" onerror="this.style.display='none'"></div>
  </div>`;
}
function waSingle(v){ return `Layanan Wifi ${Store.appName}\n___________________________\nUser     : ${v.user}\nProfil   : ${v.profile}\nKomentar : ${v.comment||'-'}\nHarga    : ${v.price}\n___________________________\n${Store.footer}`; }
function waMulti(list){ let s=`Layanan Wifi ${Store.appName}\n___________________________\n`; list.forEach((v,i)=>{ s+=`Voucer ${i+1}\nUser     : ${v.user}\nProfil   : ${v.profile}\nKomentar : ${v.comment||'-'}\nHarga    : ${v.price}\n\n`; }); s+=`___________________________\n${Store.footer}`; return s; }

/* ---------- profiles cache ---------- */
let profileCache=null;
async function getProfiles(force){ if(profileCache&&!force) return profileCache; try{ profileCache=await apiCached('profiles'); }catch(e){ const c=cachePeek('profiles'); if(c){profileCache=c;}else throw e; } return profileCache; }
function priceOf(profiles,name){ const p=(profiles||[]).find(x=>x.name===name); return p?p.price_text:' '; }

/* ======================================================================
   BOOT
====================================================================== */
document.addEventListener('DOMContentLoaded', init);
async function init(){
  document.documentElement.setAttribute('data-theme', Store.theme);
  applyBranding(); bindChrome();
  if(!Store.routers.length){ go('peraturan'); return; }
  await loadSessions(); go('beranda');
}
function applyBranding(){ $('#appName').textContent=Store.appName; const img=$('#appLogo'); if(Store.logo){img.src=Store.logo;img.style.display='inline-block';}else{img.style.display='none';} document.title=Store.appName; }
function bindChrome(){
  $('#refreshBtn').onclick=()=>go(currentRoute,true);
  $('#sessionSel').onchange=e=>{ Store.session=e.target.value; profileCache=null; go(currentRoute,true); };
  document.querySelectorAll('.tabbar a').forEach(a=>a.onclick=()=>go(a.dataset.route));
}
async function loadSessions(){
  const sel=$('#sessionSel');
  try{ const list=await api('sessions');
    sel.innerHTML=list.map(s=>`<option value="${esc(s.session)}">${esc(s.hotspot||s.session)}</option>`).join('');
    if(!Store.session || !list.find(s=>s.session===Store.session)) Store.session=list[0]?.session||'';
    sel.value=Store.session;
  }catch(e){ sel.innerHTML='<option>—</option>'; }
}

/* ======================================================================
   ROUTER
====================================================================== */
let currentRoute='beranda';
function setNav(r){ document.querySelectorAll('.tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.route===r)); }
function errBox(msg){ view().innerHTML=`<div class="card"><div class="empty">⚠️ ${esc(msg)}</div><button class="btn pri block" onclick="go(currentRoute,true)">Coba lagi</button></div>`; }
async function go(route,force){
  currentRoute=route; setNav(route); clearTimers(); closeSheet();
  if(route!=='peraturan' && !Store.routers.length) return go('peraturan');
  try{ await PAGES[route](); }catch(e){ errBox(e.message||'Gagal memuat.'); }
}
window.go=go;
const PAGES={};

/* ======================================================================
   BERANDA
====================================================================== */
PAGES.beranda=async function(){
  const sel=$('#sessionSel').selectedOptions[0]?.textContent||'';
  view().innerHTML=`
    <div class="page-title">Beranda · ${esc(sel)}</div>
    <div class="card"><h3><span class="dot"></span> Indikator <span id="indSpin" style="margin-left:auto"></span></h3><div id="indic"><div class="sub">memuat…</div></div></div>
    <div class="card"><h3><span class="dot"></span> Server Hotspot</h3><div id="srvList"><div class="sub">—</div></div></div>
    <div class="card"><h3><span class="dot"></span> Interface Padat</h3><div id="ifList"><div class="sub">—</div></div></div>
    <div class="card"><h3><span class="dot"></span> 10 User Pemakaian Terbesar</h3><div id="topUsers"><div class="sub">—</div></div></div>
    <div class="grid c2 mt">
      <button class="btn pri" onclick="go('log')">📜 Log Hotspot</button>
      <button class="btn ok" onclick="pgTambah()">➕ Tambah Pengguna</button>
      <button class="btn warn" onclick="pgHasilkan()">🎫 Hasilkan Pengguna</button>
      <button class="btn ghost" onclick="showCookies()">🍪 Cookies</button>
    </div>`;
  const cached=cachePeek('home');
  if(cached){ renderHome(cached); } else { $('#indSpin').innerHTML='<span class="spin"></span>'; }
  try{ const d=await apiCached('home'); renderHome(d); $('#indSpin').innerHTML=''; startTrafficPoll(); }
  catch(e){ $('#indSpin').innerHTML=''; if(cached){ startTrafficPoll(); toast('Mode offline — data tersimpan','') ; } else { $('#indic').innerHTML=`<div class="empty">${esc(e.message)}</div>`; } }
};
function renderHome(d){
  const cur=d.currency||'Rp'; const memPct=d.totalmem?Math.round((1-d.freemem/d.totalmem)*100):0;
  const dataGB=(d.dataBytes||0)/1073741824;
  const indic=$('#indic'); if(indic){ indic.innerHTML=
    meterHTML('mCpu','Beban CPU',d.cpu_raw,100,{display:d.cpu})+
    meterHTML('mMem','Memori Tersedia',memPct,100,{display:fmtBytes(d.freemem)+(d.totalmem?' / '+fmtBytes(d.totalmem):'')})+
    meterHTML('mTemp','Temperature (Health)',(d.temp||0),50,{yellow:35,red:40,display:(d.temp!=null?d.temp+'°C':'N/A')})+
    meterHTML('mData','Pemakaian Data Bulan Ini',dataGB,10000,{yellow:8000,red:9000,display:dataGB.toFixed(2)+' GB'})+
    meterHTML('mAct','Hotspot Aktif',d.active,100,{yellow:70,red:90,display:d.active+' Online'})+
    meterHTML('mDown','Lalu Lintas Download',0,200,{yellow:150,red:180,display:'…'})+
    meterHTML('mUp','Lalu Lintas Upload',0,200,{yellow:150,red:180,display:'…'})+
    meterHTML('mIncM','Pendapatan Bulan ini',d.income_month,6000000,{display:money(cur,d.income_month)})+
    meterHTML('mIncD','Pendapatan Hari ini',d.income_today,300000,{yellow:200000,red:250000,display:money(cur,d.income_today)});
  }
  renderServers(d.servers,cur); renderIfaces(d.interfaces); renderTopUsers(d.topusers);
}
function renderServers(list,cur){
  const h=$('#srvList'); if(!h) return;
  if(!list||!list.length){ h.innerHTML='<div class="sub">Tidak ada server hotspot.</div>'; return; }
  h.innerHTML=list.map((s,i)=>`<div class="item">
    <div class="top"><div class="nm">${i+1}. ${esc(s.name)}</div><span class="pill">${s.active} online</span></div>
    <div class="meta"><span>Download: <b>${fmtMbps(s.rx_bps)}</b></span><span>Upload: <b>${fmtMbps(s.tx_bps)}</b></span></div>
    <div class="btnrow mt"><button class="btn sm pri" onclick="showActiveDetail('${esc(s.name)}')">👥 Lihat User online</button></div>
  </div>`).join('');
}
function meterBar(value,max,opt){ opt=opt||{}; const pct=Math.max(0,Math.min(100,max>0?value/max*100:0)); let color='var(--accent)'; if(opt.red!=null&&value>=opt.red)color='var(--danger)'; else if(opt.yellow!=null&&value>=opt.yellow)color='var(--warn)'; return `<div class="meter"><span style="width:${pct}%;background:${color}"></span></div>`; }
function renderIfaces(list){ const h=$('#ifList'); if(!h)return; if(!list||!list.length){h.innerHTML='<div class="sub">—</div>';return;}
  h.innerHTML=list.map(i=>{ const dM=mbps(i.rx_bps),uM=mbps(i.tx_bps),tot=dM+uM; const live=(i.rx_bps||i.tx_bps);
    const val= live?`↓${dM.toFixed(1)} ↑${uM.toFixed(1)} Mbps`:(i.bytes!=null?fmtBytes(i.bytes)+' total':'0');
    return `<div class="mb"><div class="kv"><span class="k">${esc(i.name)}</span><span class="v">${val}</span></div>${meterBar(tot,50,{yellow:30,red:40})}</div>`;
  }).join(''); }
function renderTopUsers(list){ const h=$('#topUsers'); if(!h)return; if(!list||!list.length){h.innerHTML='<div class="sub">—</div>';return;}
  h.innerHTML=list.map((u,i)=>{ const gb=(u.total||0)/1073741824;
    return `<div class="mb"><div class="kv"><span class="k">${i+1}. ${esc(u.name)}</span><span class="v">${gb.toFixed(2)} GB</span></div>${meterBar(gb,500,{yellow:400,red:450})}</div>`;
  }).join(''); }
function startTrafficPoll(){ const tick=async()=>{ try{ const t=await api('traffic'); const dM=mbps(t.rx_bps),uM=mbps(t.tx_bps);
  updateMeter('mDown',dM,200,{yellow:150,red:180,display:dM.toFixed(2)+' Mbps'}); updateMeter('mUp',uM,200,{yellow:150,red:180,display:uM.toFixed(2)+' Mbps'}); }catch(e){} };
  tick(); timers.push(setInterval(tick,4000)); }

/* shared active-detail list (User, Server, Mac, IP, Download, Upload, Total) + search + sort */
let _activeCache=[], _activeSort='total', _activeFilterServer='';
async function showActiveDetail(server){
  _activeFilterServer=server||''; _activeSort='total';
  const body=sheet('Pengguna Online'+(server?' · '+server:''),'<div class="loading"><span class="spin"></span> Memuat…</div>');
  try{
    _activeCache=await api('active');
    body.innerHTML=`
      <div class="searchbar"><input class="input" id="adSearch" placeholder="Cari user / IP / MAC…" oninput="paintActive()">
        <select class="input" style="max-width:42%" id="adSort" onchange="paintActive()">
          <option value="total">Total Data</option><option value="download">Download</option>
          <option value="name">Nama</option><option value="server">Server</option></select></div>
      <div class="sub mb" id="adCount"></div><div class="list" id="adList"></div>`;
    paintActive();
  }catch(e){ body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
window.showActiveDetail=showActiveDetail;
function paintActive(){
  const q=($('#adSearch')?.value||'').toLowerCase(); const sort=$('#adSort')?.value||'total';
  let rows=_activeCache.filter(a=>!_activeFilterServer||a.server===_activeFilterServer);
  rows=rows.filter(a=>(a.user+' '+a.address+' '+a.mac).toLowerCase().includes(q));
  rows.sort((a,b)=> sort==='name'?a.user.localeCompare(b.user): sort==='server'?a.server.localeCompare(b.server): (b[sort]||0)-(a[sort]||0));
  $('#adCount').textContent=rows.length+' online';
  $('#adList').innerHTML=rows.length?rows.map(a=>`<div class="item">
    <div class="top"><div class="nm">${esc(a.user)}</div><button class="btn dang sm" onclick="kick('${esc(a.id)}')">⏏</button></div>
    <div class="meta"><span>Server: <b>${esc(a.server)}</b></span><span>IP: <b>${esc(a.address)}</b></span><span>MAC: <b>${esc(a.mac)}</b></span></div>
    <div class="meta"><span>Download: <b>${fmtBytes(a.download)}</b></span><span>Upload: <b>${fmtBytes(a.upload)}</b></span><span>Total: <b>${fmtBytes(a.total)}</b></span></div>
  </div>`).join(''):'<div class="empty">Tidak ada pengguna online.</div>';
}
window.paintActive=paintActive;
async function kick(id){ if(!confirmBox('Keluarkan pengguna ini?'))return; try{ await api('kick',{id}); toast('Dikeluarkan','ok'); _activeCache=await api('active'); paintActive(); }catch(e){ toast(e.message,'err'); } }
window.kick=kick;
async function showCookies(){ const body=sheet('Hotspot Cookies','<div class="loading"><span class="spin"></span></div>');
  try{ const c=await api('cookies'); body.innerHTML=c.length?c.map(x=>`<div class="item"><div class="top"><div class="nm">${esc(x.user)}</div><button class="btn dang sm" onclick="delCookie('${esc(x.id)}')">🗑</button></div><div class="meta"><span>MAC: <b>${esc(x.mac)}</b></span><span>Exp: <b>${esc(x.expires)}</b></span></div></div>`).join(''):'<div class="empty">Tidak ada cookie.</div>'; }catch(e){ body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; } }
window.showCookies=showCookies;
async function delCookie(id){ if(!confirmBox('Hapus cookie ini?'))return; try{ await api('delcookie',{id}); toast('Dihapus','ok'); showCookies(); }catch(e){ toast(e.message,'err'); } }
window.delCookie=delCookie;

/* ======================================================================
   PENGGUNA
====================================================================== */
let pgTab='lihat';
PAGES.pengguna=async function(){
  view().innerHTML=`
    <div class="page-title">Pengguna</div>
    <div class="grid c2">
      <div class="stat"><div class="n" id="totUsers">—</div><div class="l">Total Pengguna Hotspot</div></div>
      <div class="stat tap" onclick="showActiveDetail('')"><div class="n" id="totActive">—</div><div class="l">Hotspot Aktif — ketuk untuk daftar</div></div>
    </div>
    <div class="tabs" id="pgTabs">
      <button data-t="lihat">Lihat</button><button data-t="tambah">Tambah</button>
      <button data-t="hasilkan">Hasilkan</button><button data-t="cepat">Cepat</button><button data-t="profil">Profil</button>
    </div><div id="pgBody"></div>`;
  $('#pgTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{pgTab=b.dataset.t;renderPgTab();});
  renderPgTab();
  const hc=cachePeek('home'); if(hc){ $('#totUsers').textContent=hc.users; $('#totActive').textContent=hc.active+' Online'; }
  try{ const d=await apiCached('home'); $('#totUsers').textContent=d.users; $('#totActive').textContent=d.active+' Online'; }catch(e){}
};
function renderPgTab(){ document.querySelectorAll('#pgTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===pgTab));
  ({lihat:tabLihat,tambah:tabTambah,hasilkan:tabHasilkan,cepat:tabCepat,profil:tabProfil}[pgTab])(); }
window.pgTambah=()=>{ go('pengguna').then(()=>{pgTab='tambah';renderPgTab();}); };
window.pgHasilkan=()=>{ go('pengguna').then(()=>{pgTab='hasilkan';renderPgTab();}); };

async function tabLihat(){
  const body=$('#pgBody');
  const build=(profiles,users)=>{
    const opts=`<option value="all">Semua Profil</option>`+profiles.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
    body.innerHTML=`<div class="searchbar"><input class="input" id="uSearch" placeholder="Cari user / komentar…" oninput="filterUsers()">
      <select class="input" style="max-width:40%" id="uProf" onchange="reloadUsers()">${opts}</select></div>
      <div class="sub mb" id="uCount"></div><div class="list" id="uList"></div>`;
    window.__users=users; window.__profiles=profiles; paintUsers(users);
  };
  const cu=cachePeek('users',{}), cp=cachePeek('profiles');
  if(cu&&cp){ build(cp,cu); } else { body.innerHTML=`<div class="loading"><span class="spin"></span></div>`; }
  try{ const [profiles,users]=await Promise.all([getProfiles(true),apiCached('users',{})]); build(profiles,users); }
  catch(e){ if(!(cu&&cp)) body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function paintUsers(users){
  $('#uCount').textContent=users.length+' pengguna';
  $('#uList').innerHTML=users.length?users.map(u=>`<div class="item" data-s="${esc((u.name+' '+u.comment).toLowerCase())}">
    <div class="top"><div class="nm">${esc(u.name)} ${u.disabled?'<span class="pill off">off</span>':''}</div>
      <button class="btn sm ghost" onclick='editUser(${JSON.stringify(u).replace(/'/g,"&#39;")})'>✏️ Edit</button></div>
    <div class="meta"><span>Profil: <b>${esc(u.profile)}</b></span><span>Server: <b>${esc(u.server)}</b></span>${u.comment?`<span>Komentar: <b>${esc(u.comment)}</b></span>`:''}</div>
  </div>`).join(''):'<div class="empty">Belum ada pengguna.</div>';
}
window.filterUsers=()=>{ const q=($('#uSearch').value||'').toLowerCase(); document.querySelectorAll('#uList .item').forEach(it=>{ it.style.display=it.dataset.s.includes(q)?'':'none'; }); };
window.reloadUsers=async()=>{ const prof=$('#uProf').value; $('#uList').innerHTML='<div class="loading"><span class="spin"></span></div>'; try{ const users=await api('users',{profile:prof}); window.__users=users; paintUsers(users);}catch(e){toast(e.message,'err');} };
window.editUser=(u)=>{
  const profiles=window.__profiles||[];
  sheet('Edit Pengguna',`
    <label class="fld"><span class="cap">User</span><input class="input" value="${esc(u.name)}" disabled></label>
    <label class="fld"><span class="cap">Profil</span><select class="input" id="eProf">${profiles.map(p=>`<option ${p.name===u.profile?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="fld"><span class="cap">Komentar</span><input class="input" id="eCom" value="${esc((u.comment||'').replace(/^(vc-|up-)/,''))}"></label>
    <div class="btnrow"><button class="btn pri" onclick="saveEdit('${esc(u.id)}')">💾 Simpan</button>
      <button class="btn dang" onclick="delUser('${esc(u.id)}','${esc(u.name)}')">🗑 Hapus</button></div>
    <div id="eResult" class="mt"></div>`);
  window.__editU=u;
};
window.saveEdit=async(id)=>{ try{ await api('edituser',{id,profile:$('#eProf').value,comment:$('#eCom').value}); toast('Disimpan','ok');
  const u=window.__editU||{}; const profiles=await getProfiles(); const v={user:u.name,profile:$('#eProf').value,comment:$('#eCom').value,price:priceOf(profiles,$('#eProf').value)};
  $('#eResult').innerHTML=voucherResultCard([v]); reloadUsers(); }catch(e){toast(e.message,'err');} };
window.delUser=async(id,name)=>{ if(!confirmBox('Hapus user ('+name+')?'))return; try{ await api('deluser',{id}); toast('Dihapus','ok'); closeSheet(); reloadUsers(); }catch(e){toast(e.message,'err');} };

async function tabTambah(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const [profiles,servers]=await Promise.all([getProfiles(),api('servers')]);
  body.innerHTML=`<div class="note">Password otomatis mengikuti User (mode voucher).</div>
    <div class="card">
      <label class="fld"><span class="cap">User (= password)</span><input class="input" id="aName" placeholder="mis. alhuda01"></label>
      <div class="row2"><label class="fld"><span class="cap">Profil</span><select class="input" id="aProf">${profiles.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="fld"><span class="cap">Server</span><select class="input" id="aSrv">${servers.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label></div>
      <label class="fld"><span class="cap">Komentar</span><input class="input" id="aCom" placeholder="opsional"></label>
      <button class="btn pri block" onclick="doAdd()">💾 Simpan Pengguna</button>
    </div><div id="aResult"></div>`;
}
window.doAdd=async()=>{ const name=$('#aName').value.trim(); if(!name){toast('Isi User','err');return;}
  const profile=$('#aProf').value, server=$('#aSrv').value, comment=$('#aCom').value.trim();
  try{ const r=await api('adduser',{name,profile,server,comment}); const profiles=await getProfiles();
    const v={user:r.name,profile:r.profile,comment:r.comment,price:priceOf(profiles,profile)};
    toast('Ditambahkan','ok'); $('#aResult').innerHTML=voucherResultCard([v]); $('#aName').value=''; $('#aCom').value='';
  }catch(e){ toast(e.message,'err'); } };

async function tabHasilkan(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const [profiles,servers]=await Promise.all([getProfiles(),api('servers')]);
  body.innerHTML=`<div class="note">Mode voucher: user = password.</div>
    <div class="card">
      <div class="row2"><label class="fld"><span class="cap">Jumlah</span><input class="input" id="gQty" type="number" min="1" max="500" value="5"></label>
      <label class="fld"><span class="cap">Panjang Nama (4–6)</span><input class="input" id="gLen" type="number" min="3" max="8" value="4"></label></div>
      <div class="row2"><label class="fld"><span class="cap">Awalan</span><input class="input" id="gPre" placeholder="opsional"></label>
      <label class="fld"><span class="cap">Karakter</span><select class="input" id="gChar">
        <option value="lower">abcd</option><option value="upper">ABCD</option><option value="upplow">aBcD</option>
        <option value="num">angka</option><option value="mix">5ab2</option><option value="mix1">5AB2</option><option value="mix2">5aB2</option></select></label></div>
      <div class="row2"><label class="fld"><span class="cap">Profil</span><select class="input" id="gProf">${profiles.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="fld"><span class="cap">Server</span><select class="input" id="gSrv">${servers.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label></div>
      <label class="fld"><span class="cap">Komentar</span><input class="input" id="gCom" placeholder="opsional"></label>
      <button class="btn pri block" onclick="doGen(event)">🎫 Hasilkan</button>
    </div><div id="gResult"></div>`;
}
window.doGen=async(ev)=>{ const qty=+$('#gQty').value||1, length=+$('#gLen').value||4, prefix=$('#gPre').value.trim();
  const char=$('#gChar').value, profile=$('#gProf').value, server=$('#gSrv').value, comment=$('#gCom').value.trim();
  const btn=ev.target; btn.innerHTML='<span class="spin"></span> Memproses…'; btn.disabled=true;
  try{ const r=await api('generate',{qty,length,prefix,char,profile,server,comment}); const profiles=await getProfiles(); const price=priceOf(profiles,profile);
    const list=r.users.map(u=>({user:u,profile,comment,price})); toast('Dibuat '+list.length+' voucher','ok'); $('#gResult').innerHTML=voucherResultCard(list);
  }catch(e){ toast(e.message,'err'); } btn.innerHTML='🎫 Hasilkan'; btn.disabled=false; };

async function tabCepat(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const profiles=await getProfiles();
  body.innerHTML=`<div class="note">Ketuk profil untuk langsung membuat 1 voucher.</div>
    <div class="list">${profiles.map(p=>`<div class="item" onclick="quickVoucher('${esc(p.name)}')" style="cursor:pointer">
      <div class="top"><div class="nm">${esc(p.name)}</div><span class="pill">${esc(p.price_text||'-')}</span></div>
      <div class="meta"><span>Shared: <b>${esc(p['shared-users'])}</b></span><span>Masa: <b>${esc(p.validity||'-')}</b></span></div></div>`).join('')}</div>
    <div id="qResult" class="mt"></div>`;
}
window.quickVoucher=async(profile)=>{ try{ const r=await api('generate',{qty:1,length:4,char:'lower',profile}); const profiles=await getProfiles();
  const v={user:r.users[0],profile,comment:'',price:priceOf(profiles,profile)}; $('#qResult').innerHTML=voucherResultCard([v]); $('#qResult').scrollIntoView({behavior:'smooth'}); toast('Voucher dibuat','ok');
}catch(e){ toast(e.message,'err'); } };

function voucherResultCard(list){
  const preview=list.length===1?waSingle(list[0]):waMulti(list); window.__lastVouchers=list;
  return `<div class="card"><h3><span class="dot"></span> Hasil (${list.length})</h3>
    <div class="voucher-preview">${esc(preview)}</div>
    <div class="btnrow mt"><button class="btn ok" onclick="copyText(document.querySelector('.voucher-preview').textContent)">📋 Salin</button>
      <button class="btn pri" onclick="shareLast()">🟢 Bagikan WA</button>
      <button class="btn warn" onclick="pdfLast()">🖨 Cetak PDF</button></div></div>`;
}
window.shareLast=()=>{ const l=window.__lastVouchers||[]; waShare(l.length===1?waSingle(l[0]):waMulti(l)); };
window.pdfLast=()=>{ const l=window.__lastVouchers||[]; printOverlay(`<div class="vgrid">${l.map(voucherCardHTML).join('')}</div>`); };

async function tabProfil(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const profiles=await getProfiles(true);
  body.innerHTML=`<div class="btnrow mb"><button class="btn pri" onclick="addProfileForm()">➕ Tambah Profil</button></div>
    <div class="list">${profiles.map(p=>`<div class="item">
      <div class="top"><div class="nm">${esc(p.name)}</div><div class="actions">
        <button class="btn sm warn" onclick="genForProfile('${esc(p.name)}')">🎫</button>
        <button class="btn sm dang" onclick="delProfile('${esc(p.id)}','${esc(p.name)}')">🗑</button></div></div>
      <div class="meta"><span>Shared: <b>${esc(p['shared-users'])}</b></span><span>Masa: <b>${esc(p.validity||'-')}</b></span><span>Harga: <b>${esc(p.price_text||'-')}</b></span></div>
    </div>`).join('')}</div>`;
}
window.genForProfile=(name)=>{ pgTab='hasilkan'; renderPgTab(); setTimeout(()=>{ const s=$('#gProf'); if(s)s.value=name; },300); };
window.delProfile=async(id,name)=>{ if(!confirmBox('Hapus profil ('+name+')?'))return; try{ await api('delprofile',{id}); toast('Dihapus','ok'); profileCache=null; tabProfil(); }catch(e){toast(e.message,'err');} };
window.addProfileForm=()=>{ sheet('Tambah Profil',`
  <label class="fld"><span class="cap">Nama Profil</span><input class="input" id="npName" placeholder="mis. 1hari"></label>
  <div class="row2"><label class="fld"><span class="cap">Shared Users</span><input class="input" id="npShared" type="number" value="1"></label>
  <label class="fld"><span class="cap">Rate Limit (up/down)</span><input class="input" id="npRate" placeholder="512k/2M"></label></div>
  <label class="fld"><span class="cap">Mode Kadaluarsa</span><select class="input" id="npExp" onchange="toggleValidity()">
    <option value="0">None</option><option value="rem">Remove</option><option value="ntf">Notice</option><option value="remc">Remove &amp; Record</option><option value="ntfc">Notice &amp; Record</option></select></label>
  <label class="fld" id="npValWrap" style="display:none"><span class="cap">Masa Berlaku</span><input class="input" id="npVal" placeholder="1d 00:00:00"></label>
  <div class="row2"><label class="fld"><span class="cap">Harga</span><input class="input" id="npPrice" type="number" value="0"></label>
  <label class="fld"><span class="cap">Harga Jual</span><input class="input" id="npSell" type="number" value="0"></label></div>
  <div class="note">Laporan otomatis: pilih mode Record.</div>
  <button class="btn pri block" onclick="saveProfile()">Simpan Profil</button>`); };
window.toggleValidity=()=>{ $('#npValWrap').style.display=($('#npExp').value==='0'?'none':'block'); };
window.saveProfile=async()=>{ const name=$('#npName').value.trim(); if(!name){toast('Isi nama','err');return;}
  try{ await api('addprofile',{name,sharedusers:$('#npShared').value||'1',ratelimit:$('#npRate').value.trim(),expmode:$('#npExp').value,validity:$('#npVal').value.trim(),price:$('#npPrice').value||'0',sprice:$('#npSell').value||'0'});
    toast('Ditambahkan','ok'); closeSheet(); profileCache=null; tabProfil(); }catch(e){toast(e.message,'err');} };

/* ======================================================================
   LOG (Log Pengguna / Log Hotspot / Cookies)
====================================================================== */
let logTab='pengguna';
PAGES.log=async function(){
  view().innerHTML=`<div class="page-title">Log Hotspot &amp; Pengguna</div>
    <div class="tabs" id="lgTabs"><button data-t="pengguna">Log Pengguna</button><button data-t="hotspot">Log Hotspot</button><button data-t="cookies">Cookies</button></div>
    <div id="lgBody"></div>`;
  $('#lgTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{logTab=b.dataset.t;renderLog();});
  renderLog();
};
function renderLog(){ document.querySelectorAll('#lgTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===logTab)); ({pengguna:logUser,hotspot:logHotspot,cookies:logCookies}[logTab])(); }
async function logLoad(action,render){ const b=$('#lgBody'); const c=cachePeek(action,{});
  if(c){ render(c); } else { b.innerHTML=`<div class="loading"><span class="spin"></span></div>`; }
  try{ render(await apiCached(action,{})); }catch(e){ if(!c) b.innerHTML=`<div class="empty">${esc(e.message)}</div>`; } }
function logUser(){ logLoad('logpengguna',l=>{ $('#lgBody').innerHTML=`<div class="list">${l.length?l.map(x=>`<div class="item"><div class="top"><div class="nm" style="font-size:13px">${esc(x.time)}</div></div><div class="meta"><span>${esc(x.message)}</span></div></div>`).join(''):'<div class="empty">Tidak ada log pengguna.</div>'}</div>`; }); }
function logHotspot(){ logLoad('log',l=>{ $('#lgBody').innerHTML=`<div class="list">${l.length?l.map(x=>`<div class="item"><div class="top"><div class="nm" style="font-size:13px">${esc(x.user)}</div><span class="sub">${esc(x.time)}</span></div><div class="meta"><span>${esc(x.message)}</span></div></div>`).join(''):'<div class="empty">Tidak ada log.</div>'}</div>`; }); }
function logCookies(){ logLoad('cookies',c=>{ $('#lgBody').innerHTML=`<div class="list">${c.length?c.map(x=>`<div class="item"><div class="top"><div class="nm">${esc(x.user)}</div><button class="btn sm dang" onclick="delCookie('${esc(x.id)}')">🗑</button></div><div class="meta"><span>MAC: <b>${esc(x.mac)}</b></span><span>Exp: <b>${esc(x.expires)}</b></span></div></div>`).join(''):'<div class="empty">Tidak ada cookie.</div>'}</div>`; }); }

/* ======================================================================
   LAPORAN
====================================================================== */
let repWhich='month';
PAGES.laporan=async function(){
  view().innerHTML=`<div class="page-title">Laporan</div>
    <div class="tabs" id="rpTabs"><button data-w="month">Bulan Ini</button><button data-w="last">Bulan Kemarin</button></div><div id="rpBody"></div>`;
  $('#rpTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{repWhich=b.dataset.w;renderReport();});
  renderReport();
};
async function renderReport(){
  document.querySelectorAll('#rpTabs button').forEach(b=>b.classList.toggle('on',b.dataset.w===repWhich));
  const b=$('#rpBody');
  const render=(r)=>{ window.__report=r;
    b.innerHTML=`<div class="card"><div class="kv"><span class="k">Periode</span><span class="v">${esc(r.label.toUpperCase())}</span></div>
      <div class="kv"><span class="k">Total Voucher</span><span class="v">${r.count}</span></div>
      <div class="kv"><span class="k">Total Pendapatan</span><span class="v">${esc(r.total_text)}</span></div>
      <div class="btnrow mt"><button class="btn warn" onclick="pdfReport()">🖨 Cetak PDF</button></div></div>
      <input class="input mb" placeholder="Cari…" oninput="document.querySelectorAll('#repList .item').forEach(it=>it.style.display=it.dataset.s.includes(this.value.toLowerCase())?'':'none')">
      <div class="list" id="repList">${r.rows.length?r.rows.map(x=>`<div class="item" data-s="${esc((x.user+' '+x.profile+' '+x.comment).toLowerCase())}">
        <div class="top"><div class="nm">${esc(x.user)}</div><span class="pill">${esc(money(r.currency,x.price))}</span></div>
        <div class="meta"><span>${esc(x.date)} ${esc(x.time)}</span><span>Profil: <b>${esc(x.profile)}</b></span>${x.comment?`<span>Komentar: <b>${esc(x.comment)}</b></span>`:''}</div></div>`).join(''):'<div class="empty">Belum ada data. Pastikan profil memakai mode Record.</div>'}</div>`; };
  const c=cachePeek('report',{which:repWhich}); if(c){ render(c); } else { b.innerHTML=`<div class="loading"><span class="spin"></span></div>`; }
  try{ render(await apiCached('report',{which:repWhich})); }catch(e){ if(!c) b.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
window.pdfReport=()=>{ const r=window.__report; if(!r)return;
  const rows=r.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td>${esc(x.user)}</td><td>${esc(x.profile)}</td><td>${esc(x.comment||'')}</td><td style="text-align:right">${esc(money(r.currency,x.price))}</td></tr>`).join('');
  printOverlay(`<div class="vhdr">${Store.logo?`<img src="${Store.logo}">`:''}<h3>Laporan ${esc(Store.appName)} — ${esc(r.label.toUpperCase())}</h3></div>
    <table class="rtable"><thead><tr><th>#</th><th>Tanggal</th><th>Waktu</th><th>User</th><th>Profil</th><th>Komentar</th><th style="text-align:right">Harga</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><th colspan="6" style="text-align:right">Total (${r.count} vcr)</th><th style="text-align:right">${esc(r.total_text)}</th></tr></tfoot></table>`); };

/* ======================================================================
   PERALATAN (Tools)
====================================================================== */
PAGES.peralatan=async function(){
  view().innerHTML=`<div class="page-title">Peralatan</div>
    <div class="card"><h3><span class="dot"></span> Informasi MikroTik</h3><div id="toolInfo"><div class="sub">memuat…</div></div></div>
    <div class="card"><h3><span class="dot"></span> Alat</h3>
      <div class="grid c2">
        <button class="btn pri" onclick="openServerProfiles()">🖥 Server Profil</button>
        <button class="btn dang" onclick="doReboot()">🔁 Reboot Router</button>
      </div></div>`;
  const renderSys=s=>{ const memPct=s.totalmem?Math.round((1-s.freemem/s.totalmem)*100):0;
    $('#toolInfo').innerHTML=`
      <div class="kv"><span class="k">Identity</span><span class="v">${esc(s.identity)}</span></div>
      <div class="kv"><span class="k">RouterOS</span><span class="v">${esc(s.version)}</span></div>
      <div class="kv"><span class="k">Model</span><span class="v">${esc(s.model)}</span></div>
      <div class="kv"><span class="k">CPU</span><span class="v">${esc(s.cpu)}</span></div>
      <div class="kv"><span class="k">Memory</span><span class="v">${fmtBytes(s.freemem)} bebas${s.totalmem?' / '+fmtBytes(s.totalmem):''} (${memPct}% terpakai)</span></div>
      <div class="kv"><span class="k">Uptime</span><span class="v">${esc(s.uptime)}</span></div>`; };
  const c=cachePeek('sysinfo'); if(c) renderSys(c);
  try{ renderSys(await apiCached('sysinfo')); }catch(e){ if(!c) $('#toolInfo').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
};
const HTML_DIRS=['hotspot','hotspot/alogin','hotspot2','flash/hotspot'];
const LOGINBY=['cookie','http-chap','http-pap','https','mac','mac-cookie','trial'];
window.doReboot=async()=>{ if(!confirmBox('Reboot router sekarang? Koneksi akan terputus sementara.'))return; try{ await api('reboot'); toast('Perintah reboot dikirim','ok'); }catch(e){ toast(e.message,'err'); } };
window.openServerProfiles=async()=>{ const body=sheet('Server Profil','<div class="loading"><span class="spin"></span></div>');
  try{ const list=await api('serverprofiles'); body.innerHTML=list.length?list.map(p=>`<div class="item">
    <div class="top"><div class="nm">${esc(p.name)}</div><button class="btn sm ghost" onclick='editServerProfile(${JSON.stringify(p).replace(/'/g,"&#39;")})'>✏️</button></div>
    <div class="meta"><span>DNS: <b>${esc(p['dns-name']||'-')}</b></span><span>HTML: <b>${esc(p['html-directory']||'-')}</b></span><span>Login: <b>${esc(p['login-by']||'-')}</b></span></div></div>`).join(''):'<div class="empty">Tidak ada server profil.</div>';
  }catch(e){ body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; } };
window.editServerProfile=async(p)=>{
  let dirs=[]; try{ dirs=await api('dirs'); }catch(e){}
  const opts=Array.from(new Set(HTML_DIRS.concat(dirs).concat(p['html-directory']?[p['html-directory']]:[]))).filter(Boolean);
  const cur=(p['login-by']||'').split(',').map(s=>s.trim()).filter(Boolean);
  sheet('Edit Server Profil · '+p.name,`
    <label class="fld"><span class="cap">DNS Name (terkunci)</span><input class="input" value="${esc(p['dns-name']||'-')}" disabled></label>
    <label class="fld"><span class="cap">Hotspot Address (terkunci)</span><input class="input" value="${esc(p['hotspot-address']||'-')}" disabled></label>
    <label class="fld"><span class="cap">HTML Directory</span><select class="input" id="spHtml">${opts.map(o=>`<option ${o===p['html-directory']?'selected':''}>${esc(o)}</option>`).join('')}</select></label>
    <div class="fld"><span class="cap">Login By (boleh lebih dari satu)</span><div class="chks">${LOGINBY.map(l=>`<label class="chk"><input type="checkbox" value="${l}" ${cur.includes(l)?'checked':''}> ${l}</label>`).join('')}</div></div>
    <button class="btn pri block" onclick="saveServerProfile('${esc(p.id)}')">💾 Simpan</button>`);
};
window.saveServerProfile=async(id)=>{
  const logins=Array.from(document.querySelectorAll('#sheetBody .chk input:checked')).map(x=>x.value).join(',');
  try{ await api('editserverprofile',{id,'html-directory':$('#spHtml').value,'login-by':logins}); toast('Disimpan','ok'); openServerProfiles(); }catch(e){toast(e.message,'err');}
};

/* ======================================================================
   PERATURAN (passcode + submenu)
====================================================================== */
let perSub=null;
PAGES.peraturan=async function(){
  setNav('peraturan');
  if(!Store.routers.length){ perUnlocked=true; } // first run: allow add router
  if(!perUnlocked){ return renderPasscode(); }
  if(perSub) return renderPerSub(perSub);
  view().innerHTML=`<div class="page-title">Peraturan</div>
    <div class="list">
      <div class="item" onclick="openSub('router')" style="cursor:pointer"><div class="top"><div class="nm">🖧 Router / Koneksi MikroTik</div><span style="color:var(--muted)">›</span></div></div>
      <div class="item" onclick="openSub('app')" style="cursor:pointer"><div class="top"><div class="nm">⚙️ Pengaturan Aplikasi</div><span style="color:var(--muted)">›</span></div></div>
      <div class="item" onclick="openSub('logo')" style="cursor:pointer"><div class="top"><div class="nm">🖼 Logo</div><span style="color:var(--muted)">›</span></div></div>
      <div class="item" onclick="openSub('tema')" style="cursor:pointer"><div class="top"><div class="nm">🎨 Tema Aplikasi</div><span style="color:var(--muted)">›</span></div></div>
      <div class="item" onclick="openSub('pdf')" style="cursor:pointer"><div class="top"><div class="nm">🧾 Template Cetak PDF</div><span style="color:var(--muted)">›</span></div></div>
    </div>
    <div class="card"><div class="sub center">ALHUDA_D.NET · mode langsung ke router · v3.0</div></div>`;
};
let perUnlocked=false;
function renderPasscode(){
  view().innerHTML=`<div class="page-title">Peraturan</div>
    <div class="card"><h3><span class="dot"></span> Masukkan Kode Aktivasi</h3>
      <label class="fld"><span class="cap">Kode</span><input class="input" id="pcode" type="password" placeholder="kode aktivasi"></label>
      <button class="btn pri block" onclick="checkPasscode()">Buka</button>
      <div id="pcMsg" class="mt"></div></div>`;
}
window.checkPasscode=()=>{ if($('#pcode').value==='zakas11'){ perUnlocked=true; perSub=null; go('peraturan'); } else { $('#pcMsg').innerHTML='<span class="pill off">Kode salah</span>'; } };
window.openSub=(s)=>{ perSub=s; renderPerSub(s); };
window.perBack=()=>{ perSub=null; go('peraturan'); };
function renderPerSub(s){ ({router:subRouter,app:subApp,logo:subLogo,tema:subTema,pdf:subPdf}[s])(); }
function subHead(title){ return `<div class="page-title"><span onclick="perBack()" style="cursor:pointer">‹ Peraturan</span> · ${esc(title)}</div>`; }

function subApp(){ view().innerHTML=subHead('Pengaturan Aplikasi')+`<div class="card">
  <label class="fld"><span class="cap">Nama Aplikasi</span><input class="input" id="sAppName" value="${esc(Store.appName)}"></label>
  <label class="fld"><span class="cap">Footer Voucher (teks WA)</span><input class="input" id="sFooter" value="${esc(Store.footer)}"></label>
  <label class="fld"><span class="cap">Catatan Voucher (template cetak)</span><input class="input" id="sVnote" value="${esc(Store.vnote)}"></label>
  <button class="btn pri block" onclick="saveApp()">Simpan</button></div>`; }
window.saveApp=()=>{ Store.appName=$('#sAppName').value.trim()||'ALHUDA_D.NET'; Store.footer=$('#sFooter').value.trim(); Store.vnote=$('#sVnote').value.trim(); applyBranding(); toast('Disimpan','ok'); };

function subLogo(){ view().innerHTML=subHead('Logo')+`<div class="card">
  <input type="file" id="logoFile" accept="image/*" class="input">
  <div class="btnrow mt"><button class="btn pri" onclick="saveLogoLocal()">Simpan Logo</button></div>
  ${Store.logo?`<div class="mt"><img src="${esc(Store.logo)}" style="max-height:70px"></div>`:''}</div>`; }
let pendingLogo=null;
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='logoFile'){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{pendingLogo=r.result;}; r.readAsDataURL(f); }});
window.saveLogoLocal=()=>{ if(!pendingLogo){toast('Pilih file dulu','err');return;} Store.logo=pendingLogo; applyBranding(); toast('Logo disimpan','ok'); };

function subTema(){ view().innerHTML=subHead('Tema Aplikasi')+`<div class="card"><div class="btnrow">
  ${['light:Terang','dark:Gelap','blue:Biru','pink:Pink','green:Hijau'].map(t=>{const[v,l]=t.split(':');return `<button class="btn ${Store.theme===v?'pri':'ghost'}" onclick="setTheme('${v}')">${l}</button>`;}).join('')}
  </div></div>`; }
window.setTheme=(t)=>{ Store.theme=t; document.documentElement.setAttribute('data-theme',t); subTema(); };

function subPdf(){ view().innerHTML=subHead('Template Cetak PDF')+`<div class="card">
  <div class="note">Template tiket memakai Logo + harga + masa aktif + QR + Catatan Voucher. Pratinjau:</div>
  <div class="vgrid" style="background:#fff;border-radius:12px;padding:10px">${voucherCardHTML({user:'673',profile:'1hari',price:'Rp 1.000',masa:'3Jam'})}</div>
  <button class="btn pri block mt" onclick="pdfPreview()">🖨 Coba Cetak</button></div>`; }
window.pdfPreview=()=>{ printOverlay(`<div class="vgrid">${voucherCardHTML({user:'673',profile:'1hari',price:'Rp 1.000',masa:'3Jam'})}</div>`); };

/* ---- Router submenu (local router CRUD) ---- */
function subRouter(){
  const routers=Store.routers;
  view().innerHTML=subHead('Router / Koneksi MikroTik')+`<div class="card">
    ${routers.length?`<label class="fld"><span class="cap">Pilih Router</span><select class="input" id="setSess" onchange="selRouter()">${routers.map(r=>`<option value="${esc(r.name)}" ${r.name===Store.session?'selected':''}>${esc(r.hotspot||r.name)}</option>`).join('')}</select></label>`:'<div class="note">Belum ada router. Tambahkan di bawah.</div>'}
    <div class="btnrow mb"><button class="btn ghost" onclick="newRouterForm()">➕ Tambah Router</button></div>
    <div id="routerForm"></div></div>`;
  if(routers.length) editRouterForm(currentRouter()); else newRouterForm();
}
function routerFormHtml(r,isNew){ r=r||{}; return `
  <div class="row2"><label class="fld"><span class="cap">Nama Sesi</span><input class="input" id="rName" value="${esc(r.name||'')}" ${isNew?'':'readonly'} placeholder="mis. alhuda"></label>
    <label class="fld"><span class="cap">Nama Hotspot</span><input class="input" id="rHot" value="${esc(r.hotspot||'')}" placeholder="alhuda_d.net"></label></div>
  <div class="row2"><label class="fld"><span class="cap">IP / Host MikroTik</span><input class="input" id="rHost" value="${esc(r.host||'')}" placeholder="id-16.tunnel.web.id"></label>
    <label class="fld"><span class="cap">Port API</span><input class="input" id="rPort" type="number" value="${esc(r.port||'8728')}"></label></div>
  <div class="row2"><label class="fld"><span class="cap">Username</span><input class="input" id="rUser" value="${esc(r.user||'')}"></label>
    <label class="fld"><span class="cap">Password</span><input class="input" id="rPass" type="password" value="${esc(r.pass||'')}"></label></div>
  <div class="row2"><label class="fld"><span class="cap">Mata Uang</span><input class="input" id="rCur" value="${esc(r.currency||'Rp')}"></label>
    <label class="fld"><span class="cap">Antarmuka Lalu Lintas</span><select class="input" id="rIface"><option selected>${esc(r.iface||'ether1')}</option></select></label></div>
  <div class="note">Port API default 8728; lewat tunnel pakai port tunnelnya (mis. 7999). Aktifkan service <b>api</b> di MikroTik.</div>
  <div class="btnrow"><button class="btn pri" onclick="saveRouter(${isNew?'true':'false'})">💾 Simpan</button>
    <button class="btn ok" onclick="testRouter()">🔌 Connect</button><button class="btn ghost" onclick="pingRouter()">📶 Tes</button>
    ${isNew?'':`<button class="btn dang" onclick="delRouter('${esc(r.name)}')">🗑 Hapus</button>`}</div>
  <div id="rMsg" class="mt"></div>`; }
function editRouterForm(r){ const h=$('#routerForm'); if(h){ h.innerHTML=routerFormHtml(r,false); fillIfaceOptions(r&&r.iface); } }
async function fillIfaceOptions(current){ const sel=$('#rIface'); if(!sel)return; try{ const ifs=await api('interfaces'); let names=ifs.map(i=>i.name); if(current&&!names.includes(current)) names.unshift(current); sel.innerHTML=names.map(n=>`<option ${n===current?'selected':''}>${esc(n)}</option>`).join(''); }catch(e){} }
function readRouterForm(){ return { name:($('#rName').value||'').trim(), hotspot:$('#rHot').value.trim(), host:$('#rHost').value.trim(), port:$('#rPort').value.trim()||'8728', user:$('#rUser').value.trim(), pass:$('#rPass').value, currency:$('#rCur').value.trim()||'Rp', iface:$('#rIface').value.trim() }; }
window.newRouterForm=()=>{ const h=$('#routerForm'); if(h){ h.innerHTML=routerFormHtml({port:'8728',currency:'Rp',iface:'ether1'},true); fillIfaceOptions('ether1'); } };
window.selRouter=()=>{ Store.session=$('#setSess').value; profileCache=null; editRouterForm(currentRouter()); };
window.saveRouter=async(isNew)=>{ const o=readRouterForm(); if(!o.name){toast('Isi Nama Sesi','err');return;} if(!o.host){toast('Isi IP/Host','err');return;}
  if(isNew && Store.routers.some(x=>x.name===o.name)){ toast('Nama sesi sudah ada','err'); return; }
  routerUpsert(o); Store.session=o.name; profileCache=null; toast('Router disimpan','ok'); await loadSessions(); subRouter(); };
async function persistThenTest(action){ const o=readRouterForm(); if(!o.name) return {err:'Isi nama dulu'}; routerUpsert(o); Store.session=o.name; try{ return {ok:await api(action,{session:o.name})}; }catch(e){ return {err:e.message}; } }
window.testRouter=async()=>{ const m=$('#rMsg'); m.innerHTML='<span class="spin"></span> Menghubungkan…'; const r=await persistThenTest('connect'); m.innerHTML=r.err?`<span class="pill off">✕ ${esc(r.err)}</span>`:`<span class="pill ok">✓ Connected${r.ok&&r.ok.name?' · '+esc(r.ok.name):''}</span>`; if(!r.err) await loadSessions(); };
window.pingRouter=async()=>{ const m=$('#rMsg'); m.innerHTML='<span class="spin"></span> Mengetes…'; const r=await persistThenTest('ping'); m.innerHTML=r.err?`<span class="pill off">✕ ${esc(r.err)}</span>`:`<span class="pill ok">Terhubung · ${r.ok.ms}ms</span>`; };
window.delRouter=async(name)=>{ if(!confirmBox('Hapus router '+name+'?'))return; routerDelete(name); profileCache=null; toast('Dihapus','ok'); await loadSessions(); subRouter(); };
