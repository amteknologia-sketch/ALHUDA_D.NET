/* app.js — ALHUDA_D.NET single-page controller (vanilla JS) */
'use strict';

/* ---------- tiny helpers ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const view = ()=>document.getElementById('view');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let timers = [];
function clearTimers(){ timers.forEach(t=>clearInterval(t)); timers=[]; }

function fmtBytes(b){ b=+b||0; const u=['B','KB','MB','GB','TB']; let i=0; while(b>=1024&&i<u.length-1){b/=1024;i++;} return b.toFixed(b<10&&i>0?2:0)+' '+u[i]; }
function fmtBps(bps){ bps=+bps||0; if(bps>=1e9)return (bps/1e9).toFixed(2)+' Gbps'; if(bps>=1e6)return (bps/1e6).toFixed(2)+' Mbps'; if(bps>=1e3)return (bps/1e3).toFixed(1)+' Kbps'; return bps+' bps'; }
function money(cur,n){ n=+n||0; const indo=/^(rp|idr)$/i.test(cur||''); return (cur||'')+' '+(indo?n.toLocaleString('id-ID'):n.toLocaleString('en-US',{minimumFractionDigits:2})); }

function toast(msg,kind){ const t=document.createElement('div'); t.className='toast'+(kind?' '+kind:''); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
function confirmBox(msg){ return window.confirm(msg); }

function sheet(title, inner){
  closeSheet();
  const wrap=document.createElement('div'); wrap.className='modal'; wrap.id='sheet';
  wrap.innerHTML=`<div class="sheet"><h3>${esc(title)}<button class="x" onclick="closeSheet()">✕</button></h3><div id="sheetBody"></div></div>`;
  wrap.addEventListener('click',e=>{ if(e.target===wrap) closeSheet(); });
  document.body.appendChild(wrap);
  $('#sheetBody').innerHTML = inner;
  return $('#sheetBody');
}
function closeSheet(){ const s=$('#sheet'); if(s) s.remove(); }
window.closeSheet=closeSheet;

async function copyText(t){
  try{ await navigator.clipboard.writeText(t); toast('Disalin ke clipboard','ok'); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');toast('Disalin','ok');}catch(_){toast('Gagal menyalin','err');} ta.remove(); }
}
function waShare(text){
  const url='https://wa.me/?text='+encodeURIComponent(text);
  if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share){
    window.Capacitor.Plugins.Share.share({text}).catch(()=>window.open(url,'_system'));
  } else { window.open(url,'_blank'); }
}

/* ---------- PDF / print via hidden iframe ---------- */
function printHTML(inner){
  const f=document.getElementById('printFrame');
  const doc=f.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(Store.appName)}</title>
  <style>
    *{font-family:-apple-system,Roboto,Arial,sans-serif;box-sizing:border-box}
    body{margin:0;padding:12px;color:#111}
    .vc{border:1.5px dashed #444;border-radius:10px;padding:12px 14px;margin:0 0 12px;break-inside:avoid;page-break-inside:avoid}
    .vc h4{margin:0 0 6px;font-size:15px;text-align:center;letter-spacing:.5px}
    .vc hr{border:0;border-top:1px solid #bbb;margin:8px 0}
    .vc .r{display:flex;justify-content:space-between;font-size:13px;padding:2px 0}
    .vc .r b{font-weight:700}
    .vc .foot{font-size:11px;color:#555;margin-top:8px;text-align:center}
    .big{font-size:20px;font-weight:800;text-align:center;letter-spacing:1px;margin:4px 0}
    .sheetgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .hdr{display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:8px}
    .hdr img{height:34px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}
    th{background:#f0f3f8}
    @media print{.noprint{display:none}}
  </style></head><body>${inner}</body></html>`);
  doc.close();
  setTimeout(()=>{ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ toast('Cetak tidak didukung di WebView ini',''); } }, 350);
}
function voucherCardHTML(v){
  const foot = esc(Store.footer);
  return `<div class="vc"><h4>Layanan Wifi ${esc(Store.appName)}</h4><hr>
    <div class="big">${esc(v.user)}</div>
    <div class="r"><span>User</span><b>${esc(v.user)}</b></div>
    <div class="r"><span>Profil</span><b>${esc(v.profile)}</b></div>
    <div class="r"><span>Komentar</span><b>${esc(v.comment||'-')}</b></div>
    <div class="r"><span>Harga</span><b>${esc(v.price)}</b></div>
    <hr><div class="foot">${foot}</div></div>`;
}

/* ---------- WhatsApp text builders ---------- */
function waSingle(v){
  return `Layanan Wifi ${Store.appName}
___________________________
User     : ${v.user}
Profil   : ${v.profile}
Komentar : ${v.comment||'-'}
Harga    : ${v.price}
___________________________
${Store.footer}`;
}
function waMulti(list){
  let s=`Layanan Wifi ${Store.appName}\n___________________________\n`;
  list.forEach((v,i)=>{ s+=`Voucer ${i+1}\nUser     : ${v.user}\nProfil   : ${v.profile}\nKomentar : ${v.comment||'-'}\nHarga    : ${v.price}\n\n`; });
  s+=`___________________________\n${Store.footer}`;
  return s;
}

/* ---------- profile price cache ---------- */
let profileCache=null;
async function getProfiles(force){ if(profileCache&&!force) return profileCache; profileCache=await api('profiles'); return profileCache; }
function priceOf(profiles,name){ const p=(profiles||[]).find(x=>x.name===name); return p?p.price_text:((' '));}

/* ======================================================================
   BOOT
====================================================================== */
document.addEventListener('DOMContentLoaded', init);
async function init(){
  document.documentElement.setAttribute('data-theme', Store.theme);
  applyBranding();
  bindChrome();
  if(!Store.routers.length){ go('peraturan'); return; }
  await loadSessions();
  go('beranda');
}
function applyBranding(){
  $('#appName').textContent = Store.appName;
  const img=$('#appLogo');
  if(Store.logo){ img.src=Store.logo; img.style.display='inline-block'; } else { img.style.display='none'; }
  document.title = Store.appName;
}
function bindChrome(){
  $('#refreshBtn').onclick=()=>go(currentRoute,true);
  $('#sessionSel').onchange=e=>{ Store.session=e.target.value; profileCache=null; go(currentRoute,true); };
  document.querySelectorAll('.tabbar a').forEach(a=>a.onclick=()=>go(a.dataset.route));
}
async function loadSessions(){
  const sel=$('#sessionSel');
  try{
    const list=await api('sessions');
    sel.innerHTML = list.map(s=>`<option value="${esc(s.session)}">${esc(s.hotspot||s.session)}</option>`).join('');
    if(!Store.session || !list.find(s=>s.session===Store.session)){ Store.session = list[0]?.session||''; }
    sel.value=Store.session;
  }catch(e){ sel.innerHTML=`<option>—</option>`; }
}

/* ======================================================================
   ROUTER
====================================================================== */
let currentRoute='beranda';
function setNav(r){ document.querySelectorAll('.tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.route===r)); }
function loading(){ view().innerHTML=`<div class="loading"><span class="spin"></span> Memuat…</div>`; }
function errBox(msg,retry){ view().innerHTML=`<div class="card"><div class="empty">⚠️ ${esc(msg)}</div>${retry?'<button class="btn pri block" onclick="go(currentRoute,true)">Coba lagi</button>':''}</div>`; }

async function go(route,force){
  currentRoute=route; setNav(route); clearTimers(); closeSheet();
  if(route!=='peraturan' && !Store.routers.length){ return go('peraturan'); }
  try{ await PAGES[route](); }
  catch(e){ errBox(e.message||'Gagal memuat.', true); }
}
window.go=go;

/* ======================================================================
   PAGE: BERANDA
====================================================================== */
const PAGES={};
PAGES.beranda=async function(){
  loading();
  const d=await api('dashboard');
  const memPct = d.totalmem? Math.round((1-(d.freemem/d.totalmem))*100):0;
  view().innerHTML=`
    <div class="page-title">Beranda · ${esc($('#sessionSel').selectedOptions[0]?.textContent||'')}</div>

    <div class="card">
      <h3><span class="dot"></span> Info MikroTik</h3>
      <div class="kv"><span class="k">Nama Papan</span><span class="v">${esc(d.boardname)}</span></div>
      <div class="kv"><span class="k">Model</span><span class="v">${esc(d.model)}</span></div>
      <div class="kv"><span class="k">RouterOS</span><span class="v">${esc(d.version)}</span></div>
      <div class="kv"><span class="k">Waktu</span><span class="v">${esc(d.datetime)} · up ${esc(d.uptime)}</span></div>
      <div style="margin-top:10px">
        <div class="kv"><span class="k">Beban CPU</span><span class="v">${esc(d.cpu)}</span></div>
        <div class="meter"><span style="width:${Math.min(100,d.cpu_raw)}%"></span></div>
        <div class="kv" style="margin-top:8px"><span class="k">Memori Tersedia</span><span class="v">${fmtBytes(d.freemem)}${d.totalmem?' / '+fmtBytes(d.totalmem):''}</span></div>
        ${d.totalmem?`<div class="meter"><span style="width:${memPct}%"></span></div>`:''}
      </div>
    </div>

    <div class="grid c2">
      <div class="stat tap" onclick="showActive()">
        <div class="n">${d.active} <span style="font-size:13px;font-weight:700;color:var(--muted)">Online</span></div>
        <div class="l">Hotspot Aktif — ketuk untuk daftar</div>
      </div>
      <div class="stat">
        <div class="n">${d.users}</div>
        <div class="l">Total Pengguna Hotspot</div>
      </div>
    </div>

    <div class="card">
      <h3><span class="dot"></span> Lalu Lintas <span class="sub" style="margin-left:auto" id="tIface"></span></h3>
      <div class="grid c2">
        <div><div class="l sub">Download (Rx)</div><div class="n" id="tRx" style="font-size:22px;font-weight:800">—</div></div>
        <div><div class="l sub">Upload (Tx)</div><div class="n" id="tTx" style="font-size:22px;font-weight:800">—</div></div>
      </div>
    </div>

    <div class="card">
      <h3><span class="dot"></span> Pendapatan</h3>
      <div class="kv"><span class="k">Hari ini</span><span class="v">${esc(d.income_today.text)}</span></div>
      <div class="kv"><span class="k">Bulan ini</span><span class="v">${esc(d.income_month.text)}</span></div>
    </div>

    <div class="grid c2">
      <button class="btn pri" onclick="go('log')">📜 Log Hotspot</button>
      <button class="btn ok" onclick="pgTambah()">➕ Tambah Pengguna</button>
      <button class="btn warn" onclick="pgHasilkan()">🎫 Hasilkan Pengguna</button>
      <button class="btn ghost" onclick="showCookies()">🍪 Cookies</button>
    </div>`;
  const tick=async()=>{ try{ const t=await api('traffic'); $('#tIface').textContent=t.iface||''; $('#tRx').textContent=fmtBps(t.rx_bps); $('#tTx').textContent=fmtBps(t.tx_bps); }catch(e){} };
  tick(); timers.push(setInterval(tick,4000));
};

async function showActive(){
  const body=sheet('Pengguna Online','<div class="loading"><span class="spin"></span> Memuat…</div>');
  try{
    const a=await api('active');
    if(!a.length){ body.innerHTML='<div class="empty">Tidak ada pengguna online.</div>'; return; }
    body.innerHTML=a.map(u=>`<div class="item">
      <div class="top"><div class="nm">${esc(u.user)}</div>
        <button class="btn dang sm" onclick="kick('${esc(u.id)}')">⏏ Keluarkan</button></div>
      <div class="meta"><span>Server: <b>${esc(u.server)}</b></span><span>IP: <b>${esc(u.address)}</b></span><span>MAC: <b>${esc(u.mac)}</b></span></div>
      <div class="meta"><span>In: <b>${fmtBytes(u.bytes_in)}</b></span><span>Out: <b>${fmtBytes(u.bytes_out)}</b></span><span>Login: <b>${esc(u.login_by)}</b></span></div>
      <div class="meta"><span>Uptime: <b>${esc(u.uptime)}</b></span>${u.comment?`<span>Komentar: <b>${esc(u.comment)}</b></span>`:''}</div>
    </div>`).join('');
  }catch(e){ body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
window.showActive=showActive;
async function kick(id){ if(!confirmBox('Keluarkan pengguna ini?'))return; try{ await api('kick',{id},'POST'); toast('Dikeluarkan','ok'); showActive(); }catch(e){ toast(e.message,'err'); } }
window.kick=kick;

async function showCookies(){
  const body=sheet('Hotspot Cookies','<div class="loading"><span class="spin"></span> Memuat…</div>');
  try{
    const c=await api('cookies');
    if(!c.length){ body.innerHTML='<div class="empty">Tidak ada cookie.</div>'; return; }
    body.innerHTML=c.map(x=>`<div class="item"><div class="top"><div class="nm">${esc(x.user)}</div>
      <button class="btn dang sm" onclick="delCookie('${esc(x.id)}')">🗑</button></div>
      <div class="meta"><span>MAC: <b>${esc(x.mac)}</b></span><span>Domain: <b>${esc(x.domain||'-')}</b></span><span>Exp: <b>${esc(x.expires)}</b></span></div></div>`).join('');
  }catch(e){ body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
window.showCookies=showCookies;
async function delCookie(id){ if(!confirmBox('Hapus cookie ini?'))return; try{ await api('delcookie',{id},'POST'); toast('Dihapus','ok'); showCookies(); }catch(e){ toast(e.message,'err'); } }
window.delCookie=delCookie;

/* ======================================================================
   PAGE: PENGGUNA  (tabs: Lihat / Tambah / Hasilkan / Cepat / Profil)
====================================================================== */
let pgTab='lihat';
PAGES.pengguna=async function(){
  view().innerHTML=`
    <div class="page-title">Pengguna</div>
    <div class="tabs" id="pgTabs">
      <button data-t="lihat">Lihat</button>
      <button data-t="tambah">Tambah</button>
      <button data-t="hasilkan">Hasilkan</button>
      <button data-t="cepat">Cepat</button>
      <button data-t="profil">Profil</button>
    </div>
    <div id="pgBody"></div>`;
  $('#pgTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{pgTab=b.dataset.t;renderPgTab();});
  renderPgTab();
};
function renderPgTab(){
  document.querySelectorAll('#pgTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===pgTab));
  ({lihat:tabLihat,tambah:tabTambah,hasilkan:tabHasilkan,cepat:tabCepat,profil:tabProfil}[pgTab])();
}
window.pgTambah=()=>{ go('pengguna').then(()=>{pgTab='tambah';renderPgTab();}); };
window.pgHasilkan=()=>{ go('pengguna').then(()=>{pgTab='hasilkan';renderPgTab();}); };

/* --- Lihat Pengguna --- */
async function tabLihat(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span> Memuat…</div>`;
  try{
    const [profiles,users]=await Promise.all([getProfiles(),api('users')]);
    const opts=`<option value="all">Semua Profil</option>`+profiles.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
    body.innerHTML=`
      <div class="searchbar">
        <input class="input" id="uSearch" placeholder="Cari user / komentar…" oninput="filterUsers()">
        <select class="input" style="max-width:40%" id="uProf" onchange="reloadUsers()">${opts}</select>
      </div>
      <div class="sub mb" id="uCount"></div>
      <div class="list" id="uList"></div>`;
    window.__users=users; window.__profiles=profiles;
    paintUsers(users);
  }catch(e){ body.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function paintUsers(users){
  $('#uCount').textContent=users.length+' pengguna';
  if(!users.length){ $('#uList').innerHTML='<div class="empty">Belum ada pengguna.</div>'; return; }
  $('#uList').innerHTML=users.map(u=>`<div class="item" data-s="${esc((u.name+' '+u.comment).toLowerCase())}">
    <div class="top"><div class="nm">${esc(u.name)} ${u.disabled?'<span class="pill off">off</span>':''}</div>
      <div class="actions">
        <button class="btn sm ghost" onclick='editUser(${JSON.stringify(u).replace(/'/g,"&#39;")})'>✏️</button>
        <button class="btn sm dang" onclick="delUser('${esc(u.id)}','${esc(u.name)}')">🗑</button>
      </div></div>
    <div class="meta"><span>Profil: <b>${esc(u.profile)}</b></span><span>Server: <b>${esc(u.server)}</b></span>${u.comment?`<span>Komentar: <b>${esc(u.comment)}</b></span>`:''}</div>
  </div>`).join('');
}
window.filterUsers=()=>{ const q=($('#uSearch').value||'').toLowerCase(); document.querySelectorAll('#uList .item').forEach(it=>{ it.style.display=it.dataset.s.includes(q)?'':'none'; }); };
window.reloadUsers=async()=>{ const prof=$('#uProf').value; $('#uList').innerHTML='<div class="loading"><span class="spin"></span></div>'; try{ const users=await api('users',{profile:prof}); window.__users=users; paintUsers(users);}catch(e){toast(e.message,'err');} };
window.delUser=async(id,name)=>{ if(!confirmBox('Hapus user ('+name+')?'))return; try{ await api('deluser',{id},'POST'); toast('Dihapus','ok'); reloadUsers(); }catch(e){toast(e.message,'err');} };
window.editUser=(u)=>{
  const profiles=window.__profiles||[];
  const body=sheet('Edit Pengguna',`
    <label class="fld"><span class="cap">User</span><input class="input" value="${esc(u.name)}" disabled></label>
    <label class="fld"><span class="cap">Profil</span><select class="input" id="eProf">${profiles.map(p=>`<option ${p.name===u.profile?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="fld"><span class="cap">Komentar</span><input class="input" id="eCom" value="${esc((u.comment||'').replace(/^(vc-|up-)/,''))}"></label>
    <button class="btn pri block" onclick="saveEdit('${esc(u.id)}')">Simpan</button>`);
};
window.saveEdit=async(id)=>{ try{ await api('edituser',{id,profile:$('#eProf').value,comment:$('#eCom').value},'POST'); toast('Disimpan','ok'); closeSheet(); reloadUsers(); }catch(e){toast(e.message,'err');} };

/* --- Tambah Pengguna (password = user) --- */
async function tabTambah(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const [profiles,servers]=await Promise.all([getProfiles(),api('servers')]);
  body.innerHTML=`
    <div class="note">Password otomatis mengikuti User (mode voucher).</div>
    <div class="card">
      <label class="fld"><span class="cap">User (= password)</span><input class="input" id="aName" placeholder="mis. alhuda01"></label>
      <div class="row2">
        <label class="fld"><span class="cap">Profil</span><select class="input" id="aProf">${profiles.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="fld"><span class="cap">Server</span><select class="input" id="aSrv">${servers.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
      </div>
      <label class="fld"><span class="cap">Komentar</span><input class="input" id="aCom" placeholder="opsional"></label>
      <button class="btn pri block" onclick="doAdd()">💾 Simpan Pengguna</button>
    </div>
    <div id="aResult"></div>`;
}
window.doAdd=async()=>{
  const name=$('#aName').value.trim(); if(!name){toast('Isi User','err');return;}
  const profile=$('#aProf').value, server=$('#aSrv').value, comment=$('#aCom').value.trim();
  try{
    const r=await api('adduser',{name,profile,server,comment},'POST');
    const profiles=await getProfiles();
    const v={user:r.name,profile:r.profile,comment:r.comment,price:priceOf(profiles,profile)};
    toast('Pengguna ditambahkan','ok');
    $('#aResult').innerHTML=voucherResultCard([v]);
    $('#aName').value=''; $('#aCom').value='';
  }catch(e){ toast(e.message,'err'); }
};

/* --- Hasilkan Pengguna --- */
async function tabHasilkan(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const [profiles,servers]=await Promise.all([getProfiles(),api('servers')]);
  body.innerHTML=`
    <div class="note">Mode voucher: user = password.</div>
    <div class="card">
      <div class="row2">
        <label class="fld"><span class="cap">Jumlah</span><input class="input" id="gQty" type="number" min="1" max="500" value="5"></label>
        <label class="fld"><span class="cap">Panjang Nama (4–6)</span><input class="input" id="gLen" type="number" min="3" max="8" value="4"></label>
      </div>
      <div class="row2">
        <label class="fld"><span class="cap">Awalan (prefix)</span><input class="input" id="gPre" placeholder="opsional"></label>
        <label class="fld"><span class="cap">Karakter</span>
          <select class="input" id="gChar">
            <option value="lower">abcd</option><option value="upper">ABCD</option><option value="upplow">aBcD</option>
            <option value="num">angka 1234</option><option value="mix">campur 5ab2</option><option value="mix1">campur 5AB2</option><option value="mix2">campur 5aB2</option>
          </select></label>
      </div>
      <div class="row2">
        <label class="fld"><span class="cap">Profil</span><select class="input" id="gProf">${profiles.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="fld"><span class="cap">Server</span><select class="input" id="gSrv">${servers.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
      </div>
      <label class="fld"><span class="cap">Komentar</span><input class="input" id="gCom" placeholder="opsional"></label>
      <button class="btn pri block" onclick="doGen()">🎫 Hasilkan</button>
    </div>
    <div id="gResult"></div>`;
}
window.doGen=async()=>{
  const qty=+$('#gQty').value||1, length=+$('#gLen').value||4, prefix=$('#gPre').value.trim();
  const char=$('#gChar').value, profile=$('#gProf').value, server=$('#gSrv').value, comment=$('#gCom').value.trim();
  const btn=event.target; btn.innerHTML='<span class="spin"></span> Memproses…'; btn.disabled=true;
  try{
    const r=await api('generate',{qty,length,prefix,char,profile,server,comment},'POST');
    const profiles=await getProfiles();
    const price=priceOf(profiles,profile);
    const list=r.users.map(u=>({user:u,profile,comment,price}));
    toast('Dibuat '+list.length+' voucher','ok');
    $('#gResult').innerHTML=voucherResultCard(list);
  }catch(e){ toast(e.message,'err'); }
  btn.innerHTML='🎫 Hasilkan'; btn.disabled=false;
};

/* --- Tambahkan Cepat --- */
async function tabCepat(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const profiles=await getProfiles();
  body.innerHTML=`
    <div class="note">Ketuk profil untuk langsung membuat 1 voucher.</div>
    <div class="list">${profiles.map(p=>`<div class="item" onclick="quickVoucher('${esc(p.name)}')" style="cursor:pointer">
      <div class="top"><div class="nm">${esc(p.name)}</div><span class="pill">${esc(p.price_text||'-')}</span></div>
      <div class="meta"><span>Shared: <b>${esc(p['shared-users'])}</b></span><span>Masa: <b>${esc(p.validity||'-')}</b></span><span>Rate: <b>${esc(p['rate-limit']||'-')}</b></span></div>
    </div>`).join('')}</div>
    <div id="qResult" class="mt"></div>`;
}
window.quickVoucher=async(profile)=>{
  try{
    const r=await api('generate',{qty:1,length:4,prefix:'',char:'lower',profile,comment:''},'POST');
    const profiles=await getProfiles();
    const v={user:r.users[0],profile,comment:'',price:priceOf(profiles,profile)};
    $('#qResult').innerHTML=voucherResultCard([v]);
    $('#qResult').scrollIntoView({behavior:'smooth'});
    toast('Voucher dibuat','ok');
  }catch(e){ toast(e.message,'err'); }
};

/* --- shared voucher result card (copy / WA / PDF) --- */
function voucherResultCard(list){
  const preview = list.length===1 ? waSingle(list[0]) : waMulti(list);
  window.__lastVouchers=list;
  return `<div class="card">
    <h3><span class="dot"></span> Hasil (${list.length})</h3>
    <div class="voucher-preview">${esc(preview)}</div>
    <div class="btnrow mt">
      <button class="btn ok" onclick="copyText(document.querySelector('.voucher-preview').textContent)">📋 Salin</button>
      <button class="btn pri" onclick="shareLast()">🟢 Bagikan WA</button>
      <button class="btn warn" onclick="pdfLast()">🖨 Cetak PDF</button>
    </div></div>`;
}
window.shareLast=()=>{ const l=window.__lastVouchers||[]; waShare(l.length===1?waSingle(l[0]):waMulti(l)); };
window.pdfLast=()=>{ const l=window.__lastVouchers||[]; printHTML(`<div class="sheetgrid">${l.map(voucherCardHTML).join('')}</div>`); };

/* --- Profil --- */
async function tabProfil(){
  const body=$('#pgBody'); body.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  const profiles=await getProfiles(true);
  body.innerHTML=`
    <div class="btnrow mb"><button class="btn pri" onclick="addProfileForm()">➕ Tambah Profil</button></div>
    <div class="list">${profiles.map(p=>`<div class="item">
      <div class="top"><div class="nm">${esc(p.name)}</div>
        <div class="actions"><button class="btn sm ghost" onclick="go('pengguna').then(()=>{pgTab='lihat';renderPgTab();setTimeout(()=>{document.getElementById('uProf').value='${esc(p.name)}';reloadUsers();},300)})">👥</button>
        <button class="btn sm warn" onclick="genForProfile('${esc(p.name)}')">🎫</button>
        <button class="btn sm dang" onclick="delProfile('${esc(p.id)}','${esc(p.name)}')">🗑</button></div></div>
      <div class="meta"><span>Shared: <b>${esc(p['shared-users'])}</b></span><span>Masa: <b>${esc(p.validity||'-')}</b></span><span>Harga: <b>${esc(p.price_text||'-')}</b></span><span>Rate: <b>${esc(p['rate-limit']||'-')}</b></span></div>
    </div>`).join('')}</div>`;
}
window.genForProfile=(name)=>{ pgTab='hasilkan'; renderPgTab(); setTimeout(()=>{ const s=$('#gProf'); if(s){s.value=name;} },300); };
window.delProfile=async(id,name)=>{ if(!confirmBox('Hapus profil ('+name+')? Pastikan tak ada user memakainya.'))return; try{ await api('delprofile',{id},'POST'); toast('Dihapus','ok'); profileCache=null; tabProfil(); }catch(e){toast(e.message,'err');} };
window.addProfileForm=()=>{
  sheet('Tambah Profil',`
    <label class="fld"><span class="cap">Nama Profil</span><input class="input" id="npName" placeholder="mis. 1hari"></label>
    <div class="row2">
      <label class="fld"><span class="cap">Shared Users</span><input class="input" id="npShared" type="number" value="1"></label>
      <label class="fld"><span class="cap">Rate Limit (up/down)</span><input class="input" id="npRate" placeholder="512k/2M"></label>
    </div>
    <label class="fld"><span class="cap">Mode Kadaluarsa</span>
      <select class="input" id="npExp" onchange="toggleValidity()">
        <option value="0">None</option><option value="rem">Remove</option><option value="ntf">Notice</option>
        <option value="remc">Remove &amp; Record</option><option value="ntfc">Notice &amp; Record</option>
      </select></label>
    <label class="fld" id="npValWrap" style="display:none"><span class="cap">Masa Berlaku</span><input class="input" id="npVal" placeholder="mis. 1d / 12:00:00"></label>
    <div class="row2">
      <label class="fld"><span class="cap">Harga</span><input class="input" id="npPrice" type="number" value="0"></label>
      <label class="fld"><span class="cap">Harga Jual</span><input class="input" id="npSell" type="number" value="0"></label>
    </div>
    <div class="note">Untuk laporan pendapatan otomatis, pilih mode <b>Remove &amp; Record</b> atau <b>Notice &amp; Record</b>.</div>
    <button class="btn pri block" onclick="saveProfile()">Simpan Profil</button>`);
};
window.toggleValidity=()=>{ const m=$('#npExp').value; $('#npValWrap').style.display=(m==='0'?'none':'block'); };
window.saveProfile=async()=>{
  const name=$('#npName').value.trim(); if(!name){toast('Isi nama profil','err');return;}
  const p={name,sharedusers:$('#npShared').value||'1',ratelimit:$('#npRate').value.trim(),expmode:$('#npExp').value,
    validity:$('#npVal').value.trim(),price:$('#npPrice').value||'0',sprice:$('#npSell').value||'0'};
  try{ await api('addprofile',p,'POST'); toast('Profil ditambahkan','ok'); closeSheet(); profileCache=null; tabProfil(); }catch(e){toast(e.message,'err');}
};

/* ======================================================================
   PAGE: LOG  (tabs: Log / Cookies)
====================================================================== */
let logTab='log';
PAGES.log=async function(){
  view().innerHTML=`<div class="page-title">Log Hotspot &amp; Pengguna</div>
    <div class="tabs" id="lgTabs"><button data-t="log">Log Hotspot</button><button data-t="cookies">Cookies</button></div>
    <div id="lgBody"></div>`;
  $('#lgTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{logTab=b.dataset.t;renderLog();});
  renderLog();
};
function renderLog(){ document.querySelectorAll('#lgTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===logTab)); (logTab==='log'?logList:cookieList)(); }
async function logList(){
  const b=$('#lgBody'); b.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  try{ const l=await api('log');
    b.innerHTML=`<input class="input mb" placeholder="Cari…" oninput="document.querySelectorAll('#logItems .item').forEach(it=>it.style.display=it.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none')">
      <div class="list" id="logItems">${l.length?l.map(x=>`<div class="item"><div class="top"><div class="nm" style="font-size:13px">${esc(x.user)}</div><span class="sub">${esc(x.time)}</span></div><div class="meta"><span>${esc(x.message)}</span></div></div>`).join(''):'<div class="empty">Tidak ada log.</div>'}</div>`;
  }catch(e){ b.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
async function cookieList(){
  const b=$('#lgBody'); b.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  try{ const c=await api('cookies');
    b.innerHTML=`<div class="list">${c.length?c.map(x=>`<div class="item"><div class="top"><div class="nm">${esc(x.user)}</div><button class="btn sm dang" onclick="delCookie('${esc(x.id)}')">🗑</button></div><div class="meta"><span>MAC: <b>${esc(x.mac)}</b></span><span>Domain: <b>${esc(x.domain||'-')}</b></span><span>Exp: <b>${esc(x.expires)}</b></span></div></div>`).join(''):'<div class="empty">Tidak ada cookie.</div>'}</div>`;
  }catch(e){ b.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

/* ======================================================================
   PAGE: LAPORAN  (Bulan Ini / Bulan Kemarin + PDF)
====================================================================== */
let repWhich='month';
PAGES.laporan=async function(){
  view().innerHTML=`<div class="page-title">Laporan</div>
    <div class="tabs" id="rpTabs"><button data-w="month">Bulan Ini</button><button data-w="last">Bulan Kemarin</button></div>
    <div id="rpBody"></div>`;
  $('#rpTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{repWhich=b.dataset.w;renderReport();});
  renderReport();
};
async function renderReport(){
  document.querySelectorAll('#rpTabs button').forEach(b=>b.classList.toggle('on',b.dataset.w===repWhich));
  const b=$('#rpBody'); b.innerHTML=`<div class="loading"><span class="spin"></span></div>`;
  try{
    const r=await api('report',{which:repWhich});
    window.__report=r;
    b.innerHTML=`
      <div class="card"><div class="kv"><span class="k">Periode</span><span class="v">${esc(r.label.toUpperCase())}</span></div>
        <div class="kv"><span class="k">Total Voucher</span><span class="v">${r.count}</span></div>
        <div class="kv"><span class="k">Total Pendapatan</span><span class="v">${esc(r.total_text)}</span></div>
        <div class="btnrow mt"><button class="btn warn" onclick="pdfReport()">🖨 Cetak PDF</button></div>
      </div>
      <input class="input mb" placeholder="Cari user / profil / komentar…" oninput="document.querySelectorAll('#repList .item').forEach(it=>it.style.display=it.dataset.s.includes(this.value.toLowerCase())?'':'none')">
      <div class="list" id="repList">${r.rows.length?r.rows.map(x=>`<div class="item" data-s="${esc((x.user+' '+x.profile+' '+x.comment).toLowerCase())}">
        <div class="top"><div class="nm">${esc(x.user)}</div><span class="pill">${esc(money(r.currency,x.price))}</span></div>
        <div class="meta"><span>${esc(x.date)} ${esc(x.time)}</span><span>Profil: <b>${esc(x.profile)}</b></span>${x.comment?`<span>Komentar: <b>${esc(x.comment)}</b></span>`:''}</div></div>`).join(''):'<div class="empty">Belum ada data. Pastikan profil memakai mode "Record".</div>'}</div>`;
  }catch(e){ b.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
window.pdfReport=()=>{
  const r=window.__report; if(!r)return;
  const rows=r.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td>${esc(x.user)}</td><td>${esc(x.profile)}</td><td>${esc(x.comment||'')}</td><td style="text-align:right">${esc(money(r.currency,x.price))}</td></tr>`).join('');
  printHTML(`<div class="hdr">${Store.logo?`<img src="${Store.logo}">`:''}<h3>Laporan Penjualan ${esc(Store.appName)} — ${esc(r.label.toUpperCase())}</h3></div>
    <table><thead><tr><th>#</th><th>Tanggal</th><th>Waktu</th><th>User</th><th>Profil</th><th>Komentar</th><th style="text-align:right">Harga</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><th colspan="6" style="text-align:right">Total (${r.count} vcr)</th><th style="text-align:right">${esc(r.total_text)}</th></tr></tfoot></table>`);
};

/* ======================================================================
   PAGE: PERATURAN
====================================================================== */
PAGES.peraturan=async function(){
  setNav('peraturan');
  const routers=Store.routers;
  view().innerHTML=`<div class="page-title">Peraturan</div>
    <div class="card">
      <h3><span class="dot"></span> Router / Koneksi MikroTik</h3>
      ${routers.length?`<label class="fld"><span class="cap">Pilih Router</span>
        <select class="input" id="setSess" onchange="selRouter()">${routers.map(r=>`<option value="${esc(r.name)}" ${r.name===Store.session?'selected':''}>${esc(r.hotspot||r.name)}</option>`).join('')}</select></label>`
      :'<div class="note">Belum ada router. Tambahkan router pertama Anda di bawah (langsung ke MikroTik, tanpa server).</div>'}
      <div class="btnrow mb"><button class="btn ghost" onclick="newRouterForm()">➕ Tambah Router</button></div>
      <div id="routerForm"></div>
    </div>

    <div class="card">
      <h3><span class="dot"></span> Pengaturan Aplikasi</h3>
      <label class="fld"><span class="cap">Nama Aplikasi</span><input class="input" id="sAppName" value="${esc(Store.appName)}"></label>
      <label class="fld"><span class="cap">Footer Voucher</span><input class="input" id="sFooter" value="${esc(Store.footer)}"></label>
      <button class="btn block" onclick="saveApp()">Simpan</button>
    </div>

    <div class="card">
      <h3><span class="dot"></span> Logo</h3>
      <input type="file" id="logoFile" accept="image/*" class="input">
      <div class="btnrow mt"><button class="btn" onclick="saveLogoLocal()">Simpan Logo</button></div>
      ${Store.logo?`<div class="mt"><img src="${esc(Store.logo)}" style="max-height:60px"></div>`:''}
    </div>

    <div class="card">
      <h3><span class="dot"></span> Tema</h3>
      <div class="btnrow">
        ${['light:Terang','dark:Gelap','blue:Biru','pink:Pink','green:Hijau'].map(t=>{const[v,l]=t.split(':');return `<button class="btn ${Store.theme===v?'pri':'ghost'}" onclick="setTheme('${v}')">${l}</button>`;}).join('')}
      </div>
    </div>

    <div class="card"><div class="sub center">ALHUDA_D.NET · mode langsung ke router · v2.0</div></div>`;
  if(routers.length){ editRouterForm(currentRouter()); } else { newRouterForm(); }
};
function routerFormHtml(r,isNew){
  r=r||{};
  return `
   <div class="row2">
     <label class="fld"><span class="cap">Nama Sesi</span><input class="input" id="rName" value="${esc(r.name||'')}" ${isNew?'':'readonly'} placeholder="mis. alhuda"></label>
     <label class="fld"><span class="cap">Nama Hotspot</span><input class="input" id="rHot" value="${esc(r.hotspot||'')}" placeholder="alhuda_d.net"></label>
   </div>
   <div class="row2">
     <label class="fld"><span class="cap">IP / Host MikroTik</span><input class="input" id="rHost" value="${esc(r.host||'')}" placeholder="id-16.tunnel.web.id"></label>
     <label class="fld"><span class="cap">Port API</span><input class="input" id="rPort" type="number" value="${esc(r.port||'8728')}"></label>
   </div>
   <div class="row2">
     <label class="fld"><span class="cap">Username</span><input class="input" id="rUser" value="${esc(r.user||'')}"></label>
     <label class="fld"><span class="cap">Password</span><input class="input" id="rPass" type="password" value="${esc(r.pass||'')}"></label>
   </div>
   <div class="row2">
     <label class="fld"><span class="cap">Mata Uang</span><input class="input" id="rCur" value="${esc(r.currency||'Rp')}"></label>
     <label class="fld"><span class="cap">Antarmuka Lalu Lintas</span><input class="input" id="rIface" value="${esc(r.iface||'ether1')}" placeholder="ether1"></label>
   </div>
   <div class="note">Isi Port API MikroTik (default 8728; jika lewat tunnel, pakai port tunnelnya, mis. 7999). Aktifkan service <b>api</b> di MikroTik.</div>
   <div class="btnrow">
     <button class="btn pri" onclick="saveRouter(${isNew?'true':'false'})">💾 Simpan</button>
     <button class="btn ok" onclick="testRouter()">🔌 Connect</button>
     <button class="btn ghost" onclick="pingRouter()">📶 Tes</button>
     ${isNew?'':`<button class="btn dang" onclick="delRouter('${esc(r.name)}')">🗑 Hapus</button>`}
   </div>
   <div id="rMsg" class="mt"></div>`;
}
function editRouterForm(r){ const h=$('#routerForm'); if(h) h.innerHTML=routerFormHtml(r,false); }
function readRouterForm(){
  return { name:($('#rName').value||'').trim(), hotspot:$('#rHot').value.trim(), host:$('#rHost').value.trim(),
    port:$('#rPort').value.trim()||'8728', user:$('#rUser').value.trim(), pass:$('#rPass').value,
    currency:$('#rCur').value.trim()||'Rp', iface:$('#rIface').value.trim() };
}
window.newRouterForm=()=>{ const h=$('#routerForm'); if(h) h.innerHTML=routerFormHtml({port:'8728',currency:'Rp',iface:'ether1'},true); };
window.selRouter=()=>{ Store.session=$('#setSess').value; profileCache=null; editRouterForm(currentRouter()); };
window.saveRouter=async(isNew)=>{
  const o=readRouterForm(); if(!o.name){toast('Isi Nama Sesi','err');return;}
  if(isNew && Store.routers.some(x=>x.name===o.name)){ toast('Nama sesi sudah ada','err'); return; }
  if(!o.host){toast('Isi IP/Host MikroTik','err');return;}
  routerUpsert(o); Store.session=o.name; profileCache=null; toast('Router disimpan','ok');
  await loadSessions(); go('peraturan');
};
async function persistThenTest(apiAction){
  const o=readRouterForm(); if(!o.name){ return {err:'Isi nama dulu'}; }
  routerUpsert(o); Store.session=o.name;
  try{ const r=await api(apiAction,{session:o.name}); return {ok:r}; }
  catch(e){ return {err:e.message}; }
}
window.testRouter=async()=>{ const m=$('#rMsg'); m.innerHTML='<span class="spin"></span> Menghubungkan…';
  const r=await persistThenTest('connect');
  m.innerHTML = r.err ? `<span class="pill off">✕ ${esc(r.err)}</span>` : `<span class="pill ok">✓ Connected${r.ok&&r.ok.name?' · '+esc(r.ok.name):''}</span>`;
  if(!r.err) await loadSessions();
};
window.pingRouter=async()=>{ const m=$('#rMsg'); m.innerHTML='<span class="spin"></span> Mengetes…';
  const r=await persistThenTest('ping');
  m.innerHTML = r.err ? `<span class="pill off">✕ ${esc(r.err)}</span>` : `<span class="pill ok">Terhubung · ${r.ok.ms}ms</span>`;
};
window.delRouter=async(name)=>{ if(!confirmBox('Hapus router '+name+'?'))return; routerDelete(name); profileCache=null; toast('Dihapus','ok'); await loadSessions(); go('peraturan'); };
window.saveApp=()=>{ Store.appName=$('#sAppName').value.trim()||'ALHUDA_D.NET'; Store.footer=$('#sFooter').value.trim(); applyBranding(); toast('Disimpan','ok'); };
window.setTheme=(t)=>{ Store.theme=t; document.documentElement.setAttribute('data-theme',t); go('peraturan'); };
let pendingLogo=null;
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='logoFile'){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{pendingLogo=r.result;}; r.readAsDataURL(f); }});
window.saveLogoLocal=()=>{ if(!pendingLogo){toast('Pilih file dulu','err');return;} Store.logo=pendingLogo; applyBranding(); toast('Logo disimpan','ok'); go('peraturan'); };
