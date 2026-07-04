"use strict";
const cfg=window.DMQ_CONFIG||{};
const COLORS=[['blue','Blauw','#74d7ff'],['green','Groen','#69e58d'],['yellow','Geel','#ffe45f'],['pink','Roze','#ff7ac8'],['purple','Paars','#bb86ff']];
const AVATARS=[['hyperspace','Hyperspace Mountain','🚀','hyperdrive'],['big_thunder','Big Thunder Mountain','🚂','wild_ride'],['phantom','Phantom Manor','👻','ghost_whisper'],['pirates','Pirates of the Caribbean','🏴‍☠️','hidden_treasure'],['tower','Tower of Terror','🏨','second_drop']];
const DEFAULT_SETTINGS={streaks:true,powers:true,quick_guess:false,jackpot:false,stat_titles:true,final_bet:false,animations:true,leader_mode:'rotating',fixed_leader_player_id:null};
const state={sb:null,user:null,room:null,players:[],me:null,round:null,answers:[],songs:[],presence:{},channel:null,poll:null,view:'home',joinCode:'',joinName:'',joinColor:null,joinAvatar:null,adminPin:'',adminSelectedSong:1,refreshing:false,timer:null,startError:'',manageOpen:false,lobbySettings:{roundCount:10,gameMode:'mix',leaderMode:'rotating',fixedLeader:null,streaks:true,powers:true,quick_guess:false,jackpot:false,stat_titles:true,final_bet:false,animations:true},currentAnswer:{film:'',title:'',year:'',text:'',artist:''}};
document.addEventListener('DOMContentLoaded',init);window.addEventListener('beforeunload',cleanup);
async function init(){if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if('caches'in window)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{})}if(!configured()){setupScreen();return}try{state.sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});let{data:{session}}=await state.sb.auth.getSession();if(!session){let r=await state.sb.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}state.user=session.user;await fetchSongs();const params=new URLSearchParams(location.search);if(params.get('admin')==='1'){state.room=null;state.players=[];state.me=null;state.view='admin';render();return}const join=(params.get('join')||'').toUpperCase();const hostCode=(params.get('host')||'').toUpperCase();const legacy=(params.get('room')||'').toUpperCase();if(join){localStorage.removeItem('dmq-v2-room');state.room=null;state.me=null;state.joinCode=join;state.view='join';await loadJoinChoices(join);render();return}const q=hostCode||legacy;if(q){let roomResult=await state.sb.from('dmq_rooms').select('id,code,host_user_id,status').eq('code',q).maybeSingle();if(roomResult.data){let isHost=roomResult.data.host_user_id===state.user.id;let membership=await state.sb.from('dmq_players').select('id').eq('room_id',roomResult.data.id).eq('user_id',state.user.id).maybeSingle();if(isHost||membership.data){if(await loadRoom(roomResult.data.id,false))return}}state.joinCode=q;state.view='join';await loadJoinChoices(q);render();return}const saved=localStorage.getItem('dmq-v2-room');if(saved&&await loadRoom(saved,false))return;render()}catch(e){fatal('Verbinden mislukt.',e)}}
function configured(){return cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes('VUL_HIER')&&!cfg.SUPABASE_ANON_KEY.includes('VUL_HIER')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setupScreen(){app().innerHTML='<section class="card hero"><div class="logo">♫</div><h1>Disney Music Quest v2</h1><p>Voer eerst supabase_setup.sql en supabase_setup_v2.sql uit en vul config.js in.</p></section>'}
function app(){return document.getElementById('app')}
function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function loading(m='Even laden…'){app().innerHTML=`<section class="card hero"><div class="spinner"></div><p>${esc(m)}</p></section>`}
function fatal(m,e){console.error(e);app().innerHTML=`<section class="card"><h2>Er ging iets mis</h2><p>${esc(m)}</p><div class="notice red">${esc(e?.message||e)}</div><button class="btn primary full" onclick="location.reload()">Opnieuw</button></section>`}
function topbar(t,b=''){return `<div class="topbar">${b?`<button class="iconbtn" onclick="${b}">←</button>`:'<span></span>'}<h1>${esc(t)}</h1><button class="iconbtn" onclick="refreshAll()">↻</button></div>`}
function C(id){const x=COLORS.find(v=>v[0]===id)||COLORS[0];return{id:x[0],name:x[1],hex:x[2]}}
function A(id){const x=AVATARS.find(v=>v[0]===id)||AVATARS[0];return{id:x[0],name:x[1],icon:x[2],power:x[3]}}
function online(p){return Object.values(state.presence||{}).flat().some(x=>x.user_id===p.user_id)}
function host(){return state.room?.host_user_id===state.user?.id}
function settings(){return{...DEFAULT_SETTINGS,...(state.room?.settings||{})}}
function leaderId(){if(!state.players.length)return null;const s=settings();if(s.leader_mode==='fixed')return s.fixed_leader_player_id||state.players[0].id;return state.players[(Math.max(1,state.room.current_round_no||1)-1)%state.players.length]?.id}
function leader(){return state.me?.id===leaderId()}
function currentSong(){return state.songs.find(s=>+s.song_number===+state.round?.song_number)}
function own(){return state.answers.find(a=>a.user_id===state.user.id)}

function shuffle(list){
  const items=Array.isArray(list)?[...list]:[];
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}

function activeSongs(){return state.songs.filter(s=>s.enabled&&s.title&&s.film&&s.year&&(s.spotify_url||s.code_image_url))}
function playerList(statusFn){const l=leaderId();return `<div class="playerlist">${state.players.map(p=>{const s=statusFn?statusFn(p):(online(p)?['Online','ok']:['Offline','wait']);const showKick=host()&&state.room&&state.room.status==='lobby';return `<div class="player energy ${p.id===l?'leader':''}" style="--player-color:${p.color}"><div class="playerleft"><span class="avatarbadge">${A(p.avatar_id).icon}</span><div><strong>${esc(p.name)}${p.id===l?' 👑':''}</strong><small>${esc(A(p.avatar_id).name)}</small></div></div><div style="display:flex;align-items:center;"><span class="statuspill ${s[1]}">${esc(s[0])}</span>${showKick?`<button class="btn ghost" style="margin-left:8px;padding:2px 6px;font-size:12px;border-color:#ff6b6b;color:#ff6b6b;width:auto;min-height:auto;border-radius:6px;cursor:pointer;" onclick="kickPlayer('${p.id}')">Verwijder</button>`:''}</div></div>`}).join('')}</div>`}
async function kickPlayer(id){if(!confirm("Weet je zeker dat je deze speler wilt verwijderen?"))return;loading('Speler verwijderen…');let r=await state.sb.from('dmq_players').delete().eq('id',id);if(r.error)toast(r.error.message);await refreshAll()}
function scorebar(){return `<div class="scorebar">${state.players.map(p=>`<div class="scorechip" style="border-color:${p.color}"><strong>${A(p.avatar_id).icon} ${esc(p.name)}</strong><span>${p.score||0} ★</span></div>`).join('')}</div>`}
function progress(){if(!state.room?.total_rounds)return'';let n=state.room.current_round_no||0,t=state.room.total_rounds;return `<div class="progress"><i style="width:${Math.min(100,n/t*100)}%"></i></div><p class="small" style="text-align:center;margin:6px 0 12px">Ronde ${n} van ${t}</p>`}
async function fetchSongs(){let r=await state.sb.from('dmq_songs').select('*').order('song_number');if(r.error)throw r.error;state.songs=r.data||[]}
async function loadRoom(id,show=true){try{if(show)loading('Kamer openen…');let r=await state.sb.from('dmq_rooms').select('*').eq('id',id).single();if(r.error)return false;let p=await state.sb.from('dmq_players').select('*').eq('room_id',id).order('joined_at');if(p.error)throw p.error;const players=p.data||[];const me=players.find(x=>x.user_id===state.user.id)||null;const isHost=r.data.host_user_id===state.user.id;if(!isHost&&!me){localStorage.removeItem('dmq-v2-room');return false}state.room=r.data;state.players=players;state.me=me;localStorage.setItem('dmq-v2-room',id);await fetchRound();subscribe();render();return true}catch(e){console.error(e);return false}}
async function fetchRound(){if(!state.room?.current_round_no)return;let r=await state.sb.from('dmq_rounds').select('*').eq('room_id',state.room.id).eq('round_no',state.room.current_round_no).maybeSingle();if(r.error)throw r.error;if(r.data && (!state.round || state.round.id !== r.data.id)){state.currentAnswer={film:'',title:'',year:'',text:'',artist:''}}state.round=r.data;if(r.data){let a=await state.sb.from('dmq_answers').select('*').eq('round_id',r.data.id);if(a.error)throw a.error;state.answers=a.data||[]}}
let rt=null;function schedule(){clearTimeout(rt);rt=setTimeout(refreshAll,130)}
async function refreshAll(){if(state.refreshing||!state.room)return;state.refreshing=true;try{let r=await state.sb.from('dmq_rooms').select('*').eq('id',state.room.id).single();let p=await state.sb.from('dmq_players').select('*').eq('room_id',state.room.id).order('joined_at');if(r.data)state.room=r.data;if(p.data){state.players=p.data;state.me=p.data.find(x=>x.user_id===state.user.id)||state.me}await fetchRound();render()}finally{state.refreshing=false}}
function subscribe(){cleanup();state.channel=state.sb.channel('dmq2-'+state.room.id,{config:{presence:{key:state.user.id}}}).on('presence',{event:'sync'},()=>{state.presence=state.channel.presenceState();render()}).on('postgres_changes',{event:'*',schema:'public',table:'dmq_rooms',filter:`id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_players',filter:`room_id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_rounds',filter:`room_id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_answers',filter:`room_id=eq.${state.room.id}`},schedule).subscribe(async s=>{if(s==='SUBSCRIBED')await state.channel.track({user_id:state.user.id,name:state.me?.name||'organisator'})});state.poll=setInterval(refreshAll,4500)}
function cleanup(){if(state.poll)clearInterval(state.poll);state.poll=null;if(state.channel&&state.sb)state.sb.removeChannel(state.channel).catch(()=>{});state.channel=null}
function render(){if(!state.room){if(state.view==='join')renderJoin();else if(state.view==='admin')renderAdmin();else renderHome();return}if(state.room.status==='lobby'){renderLobby();return}if(state.room.status==='finished'){renderFinal();return}if(!state.round){loading('Ronde laden…');return}({claim:renderClaim,answer:renderAnswer,power_phantom:renderPhantom,power_tower:renderTower,review:renderReview,standings:renderStandings}[state.round.phase]||renderAnswer)()}

async function loadJoinChoices(code){
  state.players=[];
  const clean=(code||'').trim().toUpperCase();
  if(!clean)return false;
  const result=await state.sb.rpc('dmq_get_lobby_choices',{p_code:clean});
  if(result.error){
    console.error(result.error);
    return false;
  }
  state.players=(result.data||[]).map((row,index)=>({
    id:row.player_id||`choice-${index}`,
    name:row.player_name||'Speler',
    color_id:row.color_id,
    color:row.color,
    avatar_id:row.avatar_id,
    user_id:null,
    score:0
  }));
  return true;
}


function leaveRoom(){
  cleanup();
  state.room=null;state.players=[];state.me=null;state.round=null;state.answers=[];state.presence={};
  state.manageOpen=false;state.startError='';
  localStorage.removeItem('dmq-v2-room');
  history.replaceState(null,'',location.pathname+'?v=27');
  state.view='home';render();
}
function openSongAdminFromLobby(){
  const url=`${location.origin}${location.pathname}?admin=1&v=29`;
  const w=window.open(url,'_blank');
  if(!w){location.href=url}
}

function renderHome(){app().innerHTML=`<section class="card hero"><div class="logo">♫</div><div class="badge">Multiplayer v2</div><h1>Disney Music Quest</h1><p>Maak de kamer, laat spelers de QR-code scannen en gebruik daarna jouw telefoon voor Hitster.</p></section><section class="card hostcard"><h2>Spel organiseren</h2><p>Jij telt niet automatisch mee als speler.</p><button class="btn primary full" onclick="createRoom()">Nieuwe game maken</button></section><section class="card"><h2>Meedoen</h2><div class="field"><label>Kamercode</label><input id="homeCode" value="${esc(state.joinCode)}"></div><button class="btn secondary full" onclick="goJoin()">Deelnemen</button></section><section class="card"><button class="btn ghost full" onclick="state.view='admin';render()">⚙️ Songbeheer · 100 songs</button><button class="btn ghost full" style="margin-top:10px" onclick="window.location.href='../'">🏰 Terug naar Portal</button></section>`}
async function goJoin(){state.joinCode=(document.getElementById('homeCode').value||'').trim().toUpperCase();state.view='join';loading('Vrije kleuren en avatars laden…');await loadJoinChoices(state.joinCode);render()}
function rememberJoinFields(){
  const code=document.getElementById('joinCode');
  const name=document.getElementById('joinName');
  if(code) state.joinCode=(code.value||'').trim().toUpperCase();
  if(name) state.joinName=name.value||'';
}
async function chooseJoinColor(id){rememberJoinFields();state.joinColor=id;await loadJoinChoices(state.joinCode);renderJoin()}
async function chooseJoinAvatar(id){rememberJoinFields();state.joinAvatar=id;await loadJoinChoices(state.joinCode);renderJoin()}
function renderJoin(){
if(state.joinColor&&state.players.some(p=>p.color_id===state.joinColor))state.joinColor=null;
if(state.joinAvatar&&state.players.some(p=>p.avatar_id===state.joinAvatar))state.joinAvatar=null;
app().innerHTML=`${topbar('Deelnemen',"state.view='home';render()")}
<section class="card"><div class="field"><label>Kamercode</label><input id="joinCode" value="${esc(state.joinCode)}"></div><div class="field"><label>Jouw naam</label><input id="joinName" maxlength="18" value="${esc(state.joinName)}"></div></section>
<section class="card"><h2>Kies een kleur</h2><div class="choicegrid">${COLORS.map(x=>{let taken=state.players.some(p=>p.color_id===x[0]);return `<button class="colorchoice ${state.joinColor===x[0]?'selected':''} ${taken?'taken':''}" style="--choice:${x[2]}" ${taken?'disabled':''} onclick="chooseJoinColor('${x[0]}')"><span class="colororb"></span>${x[1]}</button>`}).join('')}</div></section>
<section class="card"><h2>Kies een attractie-avatar</h2><div class="avatargrid">${AVATARS.map(x=>{let taken=state.players.some(p=>p.avatar_id===x[0]);return `<button class="avatarchoice ${state.joinAvatar===x[0]?'selected':''} ${taken?'taken':''}" ${taken?'disabled':''} onclick="chooseJoinAvatar('${x[0]}')"><span class="avataricon">${x[2]}</span>${x[1]}</button>`}).join('')}</div></section><section class="card"><button class="btn primary full" onclick="joinRoom()">Bevestigen</button></section>`}
async function createRoom(){loading('Kamer maken…');let r=await state.sb.rpc('dmq_create_host_room');if(r.error){fatal('Kamer maken mislukt.',r.error);return}let row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?host=${row.room_code}&v=29`);await loadRoom(row.room_id,false)}
async function joinRoom(){state.joinCode=(document.getElementById('joinCode').value||'').trim().toUpperCase();state.joinName=(document.getElementById('joinName').value||'').trim();if(!state.joinCode||!state.joinName||!state.joinColor||!state.joinAvatar){toast('Vul naam, kleur en avatar in.');return}let c=C(state.joinColor);loading('Deelnemen…');let r=await state.sb.rpc('dmq_join_room_v2',{p_code:state.joinCode,p_player_name:state.joinName,p_color_id:c.id,p_color:c.hex,p_avatar_id:state.joinAvatar});if(r.error){fatal('Deelnemen mislukt.',r.error);return}let row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?room=${state.joinCode}&v=29`);await loadRoom(row.room_id,false)}
function toggle(id,label,on,key){return `<label class="toggleline"><span>${label}</span><input id="${id}" type="checkbox" ${on?'checked':''} onchange="state.lobbySettings['${key}']=this.checked; renderLobby();"></label>`}

function byId(id){return document.getElementById(id)}
function selectedValue(id,fallback=''){const e=byId(id);return e?e.value:fallback}
function selectedChecked(id,fallback=false){const e=byId(id);return e?!!e.checked:fallback}
function startReadiness(totalOverride=null){
  const total=Number(totalOverride??selectedValue('roundCount','5'))||5;
  const enoughPlayers=state.players.length>=2&&state.players.length<=5;
  const allOnline=enoughPlayers&&state.players.every(online);
  const enoughSongs=activeSongs().length>=total;
  return {total,enoughPlayers,allOnline,enoughSongs,can:host()&&enoughPlayers&&allOnline&&enoughSongs};
}
function organizerPanel(){
  if(!host())return '';
  return `<section class="card hostcard">
    <button class="btn ghost full" onclick="state.manageOpen=!state.manageOpen;renderLobby()">🛠️ Wachtruimte beheren</button>
    ${state.manageOpen?`
      <div class="notice blue">Vernieuw de kamercode, pas spelers aan of zet een vastgelopen spel terug naar de lobby.</div>
      <div class="btnrow">
        <button class="btn secondary" onclick="regenerateRoomCode()">Nieuwe kamercode</button>
        <button class="btn danger" onclick="resetRoomToLobby()">Spel herstellen</button>
      </div>
      <button class="btn ghost full" style="margin-top:9px" onclick="openSongAdminFromLobby()">⚙️ Songbeheer · 100 songs openen</button>
      <hr><h3>Spelers beheren</h3>
      ${state.players.length?state.players.map(p=>`
        <div class="adminsong">
          <strong><span>${A(p.avatar_id).icon} ${esc(p.name)}</span><span style="color:${esc(p.color)}">●</span></strong>
          <div class="field"><label>Naam</label><input id="manage_name_${p.id}" value="${esc(p.name)}" maxlength="18"></div>
          <div class="grid2">
            <div class="field"><label>Kleur</label><select id="manage_color_${p.id}">
              ${COLORS.map(c=>`<option value="${c[0]}" ${p.color_id===c[0]?'selected':''}>${esc(c[1])}</option>`).join('')}
            </select></div>
            <div class="field"><label>Avatar</label><select id="manage_avatar_${p.id}">
              ${AVATARS.map(a=>`<option value="${a[0]}" ${p.avatar_id===a[0]?'selected':''}>${a[2]} ${esc(a[1])}</option>`).join('')}
            </select></div>
          </div>
          <div class="btnrow">
            <button class="btn ghost" onclick="updateManagedPlayer('${p.id}')">Wijzigingen opslaan</button>
            <button class="btn danger" onclick="removeManagedPlayer('${p.id}')">Speler verwijderen</button>
          </div>
        </div>`).join(''):`<p class="muted">Er zijn nog geen spelers.</p>`}
    `:''}
  </section>`;
}

function renderLobby(){
  const activeCount=activeSongs().length,ready=startReadiness(5);
  if(!state.lobbySettings.fixedLeader && state.players.length > 0) {
    state.lobbySettings.fixedLeader = state.players[0].id;
  }
  app().innerHTML=`${topbar('Wachtruimte','leaveRoom()')}
  <section class="card hero"><div class="badge">Kamercode</div><div class="roomcode">${esc(state.room.code)}</div><div id="joinQR" class="joinqr"></div><p>Laat spelers deze QR-code scannen of deel de link:</p><div style="margin:12px 0;background:#051024;padding:10px;border-radius:8px;border:1px solid #1a365d;font-size:12px;word-break:break-all;color:#74d7ff;font-family:monospace;line-height:1.4;">${location.origin}${location.pathname}?join=${state.room.code}&v=29</div><button class="btn ghost" onclick="shareRoom()">🔗 Kopieer & deel link</button></section>
  <section class="card"><h2>Spelers · ${state.players.length}/5</h2>${playerList()}
    ${!ready.enoughPlayers?`<div class="notice blue">Minimaal twee spelers nodig.</div>`:''}
    ${ready.enoughPlayers&&!ready.allOnline?`<div class="notice red">Niet alle spelers worden als online gezien. Laat iedereen de wachtruimte openhouden en druk op ↻.</div>`:''}
  </section>
  ${host()?`<section class="card hostcard"><h2>Spelinstellingen</h2>
    <div class="grid2">
      <div class="field"><label>Aantal songs</label>
        <input id="roundCount" type="number" min="1" max="100" value="${state.lobbySettings.roundCount}" oninput="state.lobbySettings.roundCount = Number(this.value); renderLobby();" style="width:100%;max-width:120px;padding:8px;border-radius:8px;border:1px solid #234873;background:#0b1f40;color:white;font-weight:bold;">
      </div>
      <div class="field"><label>Spelvorm</label>
        <select id="gameMode" onchange="state.lobbySettings.gameMode = this.value; renderLobby();">
          <option value="mix" ${state.lobbySettings.gameMode === 'mix'?'selected':''}>Afwisselende mix</option>
          <option value="full" ${state.lobbySettings.gameMode === 'full'?'selected':''}>Film, titel en jaar</option>
          <option value="year" ${state.lobbySettings.gameMode === 'year'?'selected':''}>Alleen jaartallen</option>
          <option value="film" ${state.lobbySettings.gameMode === 'film'?'selected':''}>Alleen film</option>
          <option value="title" ${state.lobbySettings.gameMode === 'title'?'selected':''}>Alleen titel</option>
          <option value="artist" ${state.lobbySettings.gameMode === 'artist'?'selected':''}>Alleen uitvoerder</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Spelleider</label>
      <select id="leaderMode" onchange="state.lobbySettings.leaderMode = this.value; renderLobby();">
        <option value="rotating" ${state.lobbySettings.leaderMode === 'rotating'?'selected':''}>Roulerend</option>
        <option value="fixed" ${state.lobbySettings.leaderMode === 'fixed'?'selected':''}>Vast</option>
      </select>
    </div>
    <div class="field" id="fixedLeaderWrap" style="display: ${state.lobbySettings.leaderMode === 'fixed' ? 'block' : 'none'}">
      <label>Vaste spelleider</label>
      <select id="fixedLeader" onchange="state.lobbySettings.fixedLeader = this.value; renderLobby();">
        ${state.players.map(p=>`<option value="${p.id}" ${state.lobbySettings.fixedLeader === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select>
    </div>
    <h3>Extra spelregels</h3>
    ${toggle('streaks','Muzikale streaks',state.lobbySettings.streaks,'streaks')}
    ${toggle('powers','Attractiekrachten',state.lobbySettings.powers,'powers')}
    ${toggle('quick','Snelle gok',state.lobbySettings.quick_guess,'quick_guess')}
    ${toggle('jackpot','Soundtrack Jackpot',state.lobbySettings.jackpot,'jackpot')}
    ${toggle('stats','Extra statistiektitels',state.lobbySettings.stat_titles,'stat_titles')}
    ${toggle('bet','Geheime inzet finale',state.lobbySettings.final_bet,'final_bet')}
    ${toggle('anim','Feestelijke animaties',state.lobbySettings.animations,'animations')}
    <div class="notice ${activeCount>=state.lobbySettings.roundCount?'green':'red'}"><strong>${activeCount} actieve songs beschikbaar.</strong> Voor ${state.lobbySettings.roundCount} rondes zijn minimaal ${state.lobbySettings.roundCount} actieve songs met titel, film, jaar en Spotify-link/scancode nodig.</div>
    ${state.startError?`<div class="notice red"><strong>Starten lukt niet:</strong> ${esc(state.startError)}</div>`:''}
    <div class="notice blue">Na starten kun jij naar Hitster wisselen.</div>
    <button class="btn primary full" ${ready.can?'':'disabled'} onclick="startGame()">Start Disney Music Quest</button>
  </section>`:'<section class="card"><div class="notice blue">De organisator start de game.</div></section>'}
  ${organizerPanel()}`;
  setTimeout(()=>{let e=document.getElementById('joinQR');if(e&&window.QRCode)new QRCode(e,{text:`${location.origin}${location.pathname}?join=${state.room.code}&v=29`,width:210,height:210,colorDark:'#07152e',colorLight:'#fff'})},0)
}
function qtype(mode,s){if(mode!=='mix')return mode;let a=['full','film','title','year'];if(s.artist)a.push('artist');return a[Math.floor(Math.random()*a.length)]}
async function startGame(){
  state.startError='';
  try{
    const total=state.lobbySettings.roundCount||5;
    const mode=state.lobbySettings.gameMode||'mix';
    const songs=shuffle(activeSongs()).slice(0,total);
    if(state.players.length<2)throw new Error('Er zijn minimaal twee spelers nodig.');
    if(!state.players.every(online))throw new Error('Niet alle spelers worden als online gezien. Laat iedereen de wachtruimte openhouden en druk op ↻.');
    if(songs.length<total)throw new Error(`Er zijn ${songs.length} actieve songs, maar je hebt ${total} rondes gekozen. Activeer meer songs in Songbeheer · 100 songs.`);
    const lm=state.lobbySettings.leaderMode||'rotating';
    const set={
      streaks:state.lobbySettings.streaks,
      powers:state.lobbySettings.powers,
      quick_guess:state.lobbySettings.quick_guess,
      jackpot:state.lobbySettings.jackpot,
      stat_titles:state.lobbySettings.stat_titles,
      final_bet:state.lobbySettings.final_bet,
      animations:state.lobbySettings.animations,
      leader_mode:lm,
      fixed_leader_player_id:lm==='fixed'?(state.lobbySettings.fixedLeader||state.players[0]?.id||null):null
    };
    loading('Game starten…');
    const r=await state.sb.rpc('dmq_start_game_v2',{p_room_id:state.room.id,p_total_rounds:total,p_game_mode:mode,p_song_sequence:songs.map(s=>s.song_number),p_question_sequence:songs.map(s=>qtype(mode,s)),p_settings:set});
    if(r.error)throw r.error;
    await refreshAll();
  }catch(e){
    console.error(e);state.startError=e?.message||String(e);renderLobby();toast('Starten is niet gelukt.');
  }
}

async function regenerateRoomCode(){
  try{
    if(!window.confirm('Een nieuwe kamercode maken? De huidige QR-code werkt daarna niet meer.'))return;
    const r=await state.sb.rpc('dmq_host_regenerate_code',{p_room_id:state.room.id});
    if(r.error)throw r.error;
    state.room.code=Array.isArray(r.data)?r.data[0]?.new_code||r.data[0]:r.data;
    history.replaceState(null,'',`${location.pathname}?host=${state.room.code}&v=29`);
    toast('Nieuwe kamercode gemaakt.');await refreshAll();
  }catch(e){console.error(e);toast(`Kamercode wijzigen mislukt: ${e.message||e}`)}
}
async function resetRoomToLobby(){
  try{
    if(!window.confirm('Spel herstellen en terugzetten naar de lobby? Scores, antwoorden en rondes worden gewist. Spelers blijven behouden.'))return;
    const r=await state.sb.rpc('dmq_host_reset_room',{p_room_id:state.room.id});
    if(r.error)throw r.error;
    toast('De kamer is hersteld.');await refreshAll();
  }catch(e){console.error(e);toast(`Herstellen mislukt: ${e.message||e}`)}
}
async function removeManagedPlayer(playerId){
  const player=state.players.find(p=>p.id===playerId);const name=player?.name||'Deze speler';
  try{
    if(!window.confirm(`${name} uit deze kamer verwijderen?`))return;
    const r=await state.sb.rpc('dmq_host_remove_player',{p_room_id:state.room.id,p_player_id:playerId});
    if(r.error)throw r.error;
    toast(`${name} is verwijderd.`);await refreshAll();
  }catch(e){console.error(e);toast(`Verwijderen mislukt: ${e.message||e}`)}
}
async function updateManagedPlayer(playerId){
  try{
    const name=byId(`manage_name_${playerId}`)?.value.trim();
    const colorId=selectedValue(`manage_color_${playerId}`);
    const avatarId=selectedValue(`manage_avatar_${playerId}`);
    if(!name)throw new Error('Vul een naam in.');
    const r=await state.sb.rpc('dmq_host_update_player',{p_room_id:state.room.id,p_player_id:playerId,p_name:name,p_color_id:colorId,p_color:C(colorId).hex,p_avatar_id:avatarId});
    if(r.error)throw r.error;
    toast('Speler aangepast.');await refreshAll();
  }catch(e){console.error(e);toast(`Wijzigen mislukt: ${e.message||e}`)}
}

function rules(type,p=null){let x=type==='full'?['Juiste film: +1','Juiste titel: +1','Exact filmjaar: +1','Maximum: 3']:type==='film'?['Juiste film: +2']:type==='title'?['Juiste titel: +2']:type==='artist'?['Juiste uitvoerder/personage: +2']:['Exact: +3','1 jaar verschil: +2','2 jaar verschil: +1','Verder: 0'];if(p==='hyperdrive')x.push('Hyperdrive: alle punten dubbel');if(p==='wild_ride'&&type==='year')x=['Exact: +3','Maximaal 2 jaar verschil: +2','Maximaal 4 jaar verschil: +1'];if(p==='hidden_treasure')x.push('Verborgen schat: minimaal 1 goed = +1 bonus');if(p==='ghost_whisper')x.push('Geestenfluistering: kies 10 seconden uit alle jaartallen');if(p==='second_drop')x.push('Tweede val: rode antwoorden 10 seconden aanpassen');return `<div class="rulebox"><h3>Punten deze ronde</h3>${x.map(v=>`<div>• ${v}</div>`).join('')}</div>`}
function power(){return state.round?.active_power||null}
function powerButton(){if(!settings().powers||!state.me||state.me.power_used||power())return'';let a=A(state.me.avatar_id);if(a.power==='ghost_whisper'&&state.round.question_type!=='year')return'';return `<button class="btn secondary full" onclick="activatePower('${a.power}')">${a.icon} Gebruik ${esc(a.name)}-kracht</button>`}
async function activatePower(p){let r=await state.sb.rpc('dmq_activate_power',{p_round_id:state.round.id,p_power:p});if(r.error)toast(r.error.message);else schedule()}
function renderClaim(){let s=currentSong(),claimed=state.round.claimed_by_user_id,mine=claimed===state.user.id,cp=state.players.find(p=>p.user_id===claimed);app().innerHTML=`${topbar('Song starten')}${scorebar()}${progress()}<section class="card question" style="--accent:${cp?.color||'#bb86ff'}"><div class="badge">${esc(state.round.question_type)}</div><div class="songnumber">${esc(s?.label||'Song')}</div><p>Scan de code met de Hitster-telefoon.</p><div class="qrwrap" id="qrArea"></div>${rules(state.round.question_type,power())}${powerButton()}${!claimed?'<button class="btn primary full" onclick="claimSong()">▶ Ik laat deze song afspelen</button>':mine?'<div class="notice green">Jij bedient de muziek.</div><button class="btn primary full" onclick="confirmPlaying()">🔊 De song wordt afgespeeld</button><button class="btn ghost full" style="margin-top:8px" onclick="releaseSong()">Afspeelbeurt vrijgeven</button>':`<div class="notice blue">${esc(cp?.name||'Een speler')} laat de song afspelen.</div>${leader()?'<button class="btn ghost full" onclick="releaseSong()">Claim vrijgeven</button>':''}`}</section>`;setTimeout(()=>showCode(s),0)}
function showCode(s){let e=document.getElementById('qrArea');if(!e)return;e.innerHTML='';if(s?.code_image_url)e.innerHTML=`<img src="${esc(s.code_image_url)}">`;else if(s?.spotify_url&&window.QRCode)new QRCode(e,{text:s.spotify_url,width:200,height:200,colorDark:'#07152e',colorLight:'#fff'});else e.innerHTML='<div class="qrplaceholder">Nog geen scancode ingesteld.</div>'}
async function claimSong(){let r=await state.sb.rpc('dmq_claim_song',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else if(!r.data)toast('Iemand anders was sneller.');else schedule()}
async function releaseSong(){let r=await state.sb.rpc('dmq_release_song',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else schedule()}
async function confirmPlaying(){let r=await state.sb.rpc('dmq_confirm_playing',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else schedule()}
function prompt(t){return{full:'Welke film, welke titel en welk filmjaar?',film:'Uit welke film komt dit lied?',title:'Hoe heet dit lied?',year:'In welk jaar verscheen de film?',artist:'Wie zingt of voert dit uit?'}[t]}
function form(t,a={}){const fVal=state.currentAnswer.film!==undefined?state.currentAnswer.film:(a.film||'');const tVal=state.currentAnswer.title!==undefined?state.currentAnswer.title:(a.title||'');const yVal=state.currentAnswer.year!==undefined?state.currentAnswer.year:(a.year||'');const txVal=state.currentAnswer.text!==undefined?state.currentAnswer.text:(a[t]||'');if(t==='full')return `<div class="field"><label>Film</label><input id="ansFilm" value="${esc(fVal)}" oninput="state.currentAnswer.film=this.value"></div><div class="field"><label>Titel</label><input id="ansTitle" value="${esc(tVal)}" oninput="state.currentAnswer.title=this.value"></div><div class="field"><label>Jaar</label><input id="ansYear" type="number" value="${esc(yVal)}" oninput="state.currentAnswer.year=this.value"></div>`;if(t==='year')return `<div class="field"><label>Jaar</label><input id="ansYear" type="number" value="${esc(yVal)}" oninput="state.currentAnswer.year=this.value"></div>`;return `<div class="field"><label>Antwoord</label><input id="ansText" value="${esc(txVal)}" oninput="state.currentAnswer.text=this.value"></div>`}
function collect(t){if(t==='full')return{film:ansFilm.value.trim(),title:ansTitle.value.trim(),year:+ansYear.value||null};if(t==='year')return{year:+ansYear.value||null};return{[t]:ansText.value.trim()}}
function filled(t,a){return t==='full'?!!(a.film&&a.title&&a.year):t==='year'?!!a.year:!!a[t]}
function renderAnswer(){let mine=own(),done=new Set(state.answers.map(a=>a.user_id)),all=state.answers.length===state.players.length;app().innerHTML=`${topbar('Geheim antwoorden')}${scorebar()}${progress()}<section class="card question" style="--accent:${state.me?.color||'#00e5ff'}"><div class="prompt">${esc(prompt(state.round.question_type))}</div>${rules(state.round.question_type,power())}${powerButton()}${mine?'<div class="notice green">Je antwoord is opgeslagen.</div>':host()?'<div class="notice blue">Jij bent de organisator. Wacht tot de spelers antwoorden.</div>':`${form(state.round.question_type)}<button class="btn primary full" onclick="submitAnswer()">Antwoord vastleggen</button>`}</section><section class="card"><h2>Wie heeft geantwoord?</h2>${playerList(p=>done.has(p.user_id)?['Antwoord binnen','ok']:['Denkt nog na','wait'])}${leader()||host()?`<button class="btn secondary full" style="margin-top:12px" ${all?'':'disabled'} onclick="afterAnswers()">Verder</button>`:`<div class="notice blue">${all?'Alle antwoorden zijn binnen.':'Wachten op alle spelers.'}</div>`}</section>`}
async function submitAnswer(){if(host())return;let a=collect(state.round.question_type);if(!filled(state.round.question_type,a)){toast('Vul je antwoord in.');return}let r=await state.sb.from('dmq_answers').insert({room_id:state.room.id,round_id:state.round.id,player_id:state.me.id,user_id:state.user.id,answer:a});if(r.error)toast(r.error.message);else schedule()}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/\b(the|a|an|de|het|een)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function lev(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;let r=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){let t=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return r[b.length]}
function match(v,targets){let a=norm(v);if(!a)return false;return targets.filter(Boolean).some(t=>{let b=norm(t);return a===b||(a.length>=6&&(a.includes(b)||b.includes(a)))||(1-lev(a,b)/Math.max(a.length,b.length)>=.8)})}
function points(a,s,t,p){let film=[s.film,...(s.film_aliases||[])],title=[s.title,...(s.title_aliases||[])],artist=[s.artist,...(s.artist_aliases||[])],q=0;if(t==='full')q=(match(a.film,film)?1:0)+(match(a.title,title)?1:0)+(+a.year===+s.year?1:0);if(t==='film')q=match(a.film,film)?2:0;if(t==='title')q=match(a.title,title)?2:0;if(t==='artist')q=match(a.artist,artist)?2:0;if(t==='year'){let d=Math.abs(+a.year-+s.year);q=p==='wild_ride'?(d===0?3:d<=2?2:d<=4?1:0):(d===0?3:d===1?2:d===2?1:0)}if(p==='hidden_treasure'&&q>0)q++;if(p==='hyperdrive')q*=2;return q}
async function afterAnswers(){if(power()==='ghost_whisper'){let r=await state.sb.rpc('dmq_begin_power_phase',{p_round_id:state.round.id,p_phase:'power_phantom'});if(r.error)toast(r.error.message);return}if(power()==='second_drop'){await prepareTower();return}await reveal()}
async function reveal(){let s=currentSong();for(const a of state.answers){let q=points(a.revised_answer||a.answer||{},s,state.round.question_type,power());let r=await state.sb.from('dmq_answers').update({proposed_points:q,final_points:q}).eq('id',a.id);if(r.error){fatal('Beoordelen mislukt.',r.error);return}}let r=await state.sb.rpc('dmq_set_phase',{p_round_id:state.round.id,p_phase:'review'});if(r.error)toast(r.error.message);else schedule()}
function startTimer(seconds,done){clearInterval(state.timer);let n=seconds;state.timer=setInterval(async()=>{n--;let e=document.getElementById('countNum');if(e)e.textContent=n;if(n<=0){clearInterval(state.timer);state.timer=null;await done()}},1000)}
function renderPhantom(){let mine=own(),counts={};state.answers.forEach(a=>{let y=+a.answer?.year;if(y)counts[y]=(counts[y]||0)+1});let ys=Object.keys(counts).map(Number).sort((a,b)=>a-b),selected=+(mine.revised_answer?.year||mine.answer?.year),same=ys.length===1;app().innerHTML=`${topbar('Phantom Manor')}${scorebar()}${progress()}<section class="card phantom"><div class="powerbanner">👻 Geestenfluistering geldt voor iedereen</div>${rules('year','ghost_whisper')}<h2>De geesten fluisteren…</h2><p>Alle jaartallen zijn anoniem samengevoegd. Jouw antwoord staat geselecteerd.</p><div class="yearchoices">${ys.map(y=>`<button class="yearbtn ${selected===y?'selected':''}" onclick="chooseYear(${y})">${y}${counts[y]>1?` × ${counts[y]}`:''}</button>`).join('')}</div><div class="countdown phantom"><div class="small">De klokken tikken…</div><div id="countNum" class="number">${same?3:10}</div><div>🕯️ 👻 🕯️</div></div></section>`;startTimer(same?3:10,finishPhantom)}
async function chooseYear(y){let r=await state.sb.from('dmq_answers').update({revised_answer:{year:y}}).eq('id',own().id);if(r.error)toast(r.error.message);else schedule()}
async function finishPhantom(){if(!leader())return;let r=await state.sb.rpc('dmq_finalize_phantom',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else{await refreshAll();await reveal()}}
async function prepareTower(){let s=currentSong(),t=state.round.question_type;for(const a of state.answers){let x=a.answer||{},c={film:t==='full'?match(x.film,[s.film,...(s.film_aliases||[])]):null,title:t==='full'?match(x.title,[s.title,...(s.title_aliases||[])]):null,year:(t==='full'||t==='year')?+x.year===+s.year:null,artist:t==='artist'?match(x.artist,[s.artist,...(s.artist_aliases||[])]):null};await state.sb.from('dmq_answers').update({correctness:c,revised_answer:x}).eq('id',a.id)}let r=await state.sb.rpc('dmq_begin_power_phase',{p_round_id:state.round.id,p_phase:'power_tower'});if(r.error)toast(r.error.message)}
function renderTower(){let mine=own(),a=mine.revised_answer||mine.answer||{},c=mine.correctness||{},t=state.round.question_type;const f=(k,l,tp='text')=>{const val=state.currentAnswer[k]!==undefined?state.currentAnswer[k]:(a[k]||'');return `<div class="field answerfield ${c[k]===true?'correct':c[k]===false?'wrong':''}"><label>${l} ${c[k]===true?'✓':c[k]===false?'✗':''}</label><input id="tower_${k}" type="${tp}" value="${esc(val)}" ${c[k]===true?'disabled':''} oninput="state.currentAnswer['${k}']=this.value"></div>`};let fields=t==='full'?f('film','Film')+f('title','Titel')+f('year','Jaar','number'):t==='year'?f('year','Jaar','number'):f(t,t==='film'?'Film':t==='title'?'Titel':'Uitvoerder');app().innerHTML=`${topbar('Tower of Terror')}${scorebar()}${progress()}<section class="card tower"><div class="powerbanner">🏨 Tweede val geldt voor iedereen</div>${rules(t,'second_drop')}<h2>De liftdeuren sluiten…</h2><p>Groen is juist en staat vast. Rood mag nog worden gewijzigd.</p>${fields}<button class="btn secondary full" onclick="saveTower()">Wijzigingen opslaan</button><div class="countdown tower"><div class="small">Verdieping</div><div id="countNum" class="number">10</div><div>⬇️ 🛗 ⬇️</div></div></section>`;startTimer(10,finishTower)}
async function saveTower(){let mine=own(),c=mine.correctness||{},t=state.round.question_type,a={...(mine.revised_answer||mine.answer||{})},keys=t==='full'?['film','title','year']:[t];keys.forEach(k=>{if(c[k]!==true){let e=document.getElementById('tower_'+k);a[k]=k==='year'?+e.value||null:e.value.trim()}});let r=await state.sb.from('dmq_answers').update({revised_answer:a}).eq('id',mine.id);if(r.error)toast(r.error.message);else toast('Wijzigingen opgeslagen.')}
async function finishTower(){if(!leader())return;let r=await state.sb.rpc('dmq_finalize_tower',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else{await refreshAll();await reveal()}}
function answerText(a,t){if(t==='full')return `${a.film||'—'} · ${a.title||'—'} · ${a.year||'—'}`;return String(a[t]||'—')}
function maxPoints(t,p){let m=t==='full'||t==='year'?3:2;if(p==='hidden_treasure')m++;if(p==='hyperdrive')m*=2;return m}
function renderReview(){let s=currentSong(),mine=own();if(!s||(!mine&&!host())){loading('Laden…');return}let a=mine?.revised_answer||mine?.answer||{},p=power();app().innerHTML=`${topbar('Punten controleren')}${scorebar()}${progress()}<section class="card question" style="--accent:${state.me?.color||'#00e5ff'}"><div class="correctbox"><strong>Het juiste antwoord</strong><p style="margin:7px 0 0">${esc(s.title)} · ${esc(s.film)} · ${esc(s.year)}${s.artist?` · ${esc(s.artist)}`:''}</p></div>${rules(state.round.question_type,p)}${host()?'':`<div class="answerline"><small>Jouw definitieve antwoord</small><strong>${esc(answerText(a,state.round.question_type))}</strong></div>`}${host()?'<div class="notice blue">Jij bent de organisator. Wacht tot de spelers hun punten bevestigen.</div>':!mine.points_confirmed?`<div class="field"><label>Mijn definitieve punten</label><select id="finalPoints">${Array.from({length:maxPoints(state.round.question_type,p)+1},(_,i)=>`<option value="${i}" ${+mine.final_points===i?'selected':''}>${i}</option>`).join('')}</select></div><div class="field"><label>Toelichting bij correctie</label><input id="correctionNote"></div><button class="btn primary full" onclick="confirmPoints()">Punten bevestigen</button>`:`<div class="notice green">Je hebt +${mine.final_points} bevestigd.</div>${!mine.round_completed?'<button class="btn primary full" onclick="completeRound()">Ik ben klaar met deze ronde</button>':'<button class="btn ghost full" disabled>Ronde afgerond ✓</button>'}`}</section><section class="card"><h2>Puntenstatus</h2>${playerList(pl=>{let x=state.answers.find(a=>a.player_id===pl.id);if(!x?.points_confirmed)return['Controleert nog','wait'];return x.round_completed?[`+${x.final_points} · klaar`,'ok']:[`+${x.final_points} · afronden`,'wait']})}</section>`}
async function confirmPoints(){let r=await state.sb.rpc('dmq_confirm_points',{p_answer_id:own().id,p_final_points:+finalPoints.value,p_note:correctionNote.value.trim()});if(r.error)toast(r.error.message);else schedule()}
async function completeRound(){let r=await state.sb.rpc('dmq_complete_round',{p_answer_id:own().id});if(r.error)toast(r.error.message);else schedule()}
function renderStandings(){let sorted=[...state.players].sort((a,b)=>b.score-a.score);app().innerHTML=`${topbar('Tussenstand')}${rules(state.round.question_type,power())}<section class="card"><div class="standings">${sorted.map((p,i)=>`<div class="rank" style="border-color:${p.color}"><div class="rankicon">${['🥇','🥈','🥉','🎵','🎶'][i]}</div><div><strong>${A(p.avatar_id).icon} ${esc(p.name)}</strong><small class="muted">${esc(A(p.avatar_id).name)}</small></div><div class="rankscore">${p.score} ★</div></div>`).join('')}</div>${leader()?`<button class="btn primary full" style="margin-top:14px" onclick="nextRound()">${state.room.current_round_no>=state.room.total_rounds?'Einduitslag':'Volgende song'}</button>`:`<div class="notice blue">${esc(state.players.find(p=>p.id===leaderId())?.name||'De spelleider')} start de volgende ronde.</div>`}</section>`}
async function nextRound(){let r=await state.sb.rpc('dmq_next_round_v2',{p_room_id:state.room.id});if(r.error)toast(r.error.message);else schedule()}
const TITLES=[['De Maestro van Main Street','De Gouden Groove van het Kasteel','De Onbetwiste Oorwurmkoning','De Headliner van de Magische Hitlijst','De Dirigent van de Disney-deuntjes'],['De Eeuwige Encore','De Zilveren Soundtrackheld','De Bijna-Banger van Big Thunder','De Ster van het Voorprogramma','De Remix die nét niet won'],['De Phantom van het Vergeten Refrein','De Shuffleknop in Mensenvorm','De FastPass naar het Foute Jaartal','De Piraat met de Verkeerde Playlist','De Toonzoeker van de Tower']];
function renderFinal(){let s=[...state.players].sort((a,b)=>b.score-a.score);app().innerHTML=`${topbar('Einduitslag','leaveRoom()')}<section class="card hero"><div class="logo">♫</div><h1>${esc(s[0]?.name)} wint!</h1></section><section class="card"><div class="standings">${s.map((p,i)=>`<div class="rank" style="border-color:${p.color}"><div class="rankicon">${A(p.avatar_id).icon}</div><div><strong>${esc(p.name)}</strong><small class="gold">${esc(TITLES[Math.min(i,2)][i%5])}</small></div><div class="rankscore">${p.score} ★</div></div>`).join('')}</div><button class="btn ghost full" style="margin-top:14px" onclick="leaveRoom()">Terug</button></section>`}
function renderAdmin(){let s=state.songs.find(x=>+x.song_number===+state.adminSelectedSong)||{};app().innerHTML=`${topbar('Songbeheer · 100 songs',"state.view='home';render()")}
<section class="card"><div class="field"><label>Beheer-PIN</label><input id="adminPin" type="password" value="${esc(state.adminPin)}"></div><div class="field"><label>Song</label><select id="songSelect" onchange="state.adminPin=adminPin.value;state.adminSelectedSong=+this.value;renderAdmin()">${state.songs.map(x=>`<option value="${x.song_number}" ${+x.song_number===+state.adminSelectedSong?'selected':''}>${esc(x.label)} · ${esc(x.title||'leeg')}</option>`).join('')}</select></div></section>
<section class="card"><div class="field"><label>Titel</label><input id="songTitle" value="${esc(s.title||'')}"></div><div class="field"><label>Film</label><input id="songFilm" value="${esc(s.film||'')}"></div><div class="grid2"><div class="field"><label>Jaar</label><input id="songYear" type="number" value="${esc(s.year||'')}"></div><div class="field"><label>Uitvoerder</label><input id="songArtist" value="${esc(s.artist||'')}"></div></div><div class="field"><label>Spotify-link</label><input id="songSpotify" value="${esc(s.spotify_url||'')}"></div><div class="field"><label>Codeafbeelding-URL</label><input id="songCode" value="${esc(s.code_image_url||'')}"></div><div class="field"><label>Film-aliases</label><input id="filmAliases" value="${esc((s.film_aliases||[]).join(', '))}"></div><div class="field"><label>Titel-aliases</label><input id="titleAliases" value="${esc((s.title_aliases||[]).join(', '))}"></div><div class="field"><label>Uitvoerder-aliases</label><input id="artistAliases" value="${esc((s.artist_aliases||[]).join(', '))}"></div><label class="toggleline">Song actief<input id="songEnabled" type="checkbox" ${s.enabled?'checked':''}></label><button class="btn primary full" onclick="saveSong()">Opslaan</button></section>`}
function list(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function saveSong(){state.adminPin=adminPin.value;let s=state.songs.find(x=>+x.song_number===+state.adminSelectedSong);let r=await state.sb.rpc('dmq_admin_upsert_song',{p_pin:state.adminPin,p_song_number:s.song_number,p_title:songTitle.value.trim(),p_film:songFilm.value.trim(),p_year:+songYear.value||null,p_artist:songArtist.value.trim(),p_spotify_url:songSpotify.value.trim(),p_code_image_url:songCode.value.trim(),p_film_aliases:list(filmAliases.value),p_title_aliases:list(titleAliases.value),p_artist_aliases:list(artistAliases.value),p_enabled:songEnabled.checked});if(r.error)toast(r.error.message);else{await fetchSongs();toast('Song opgeslagen.');renderAdmin()}}
async function shareRoom(){
  const url=`${location.origin}${location.pathname}?join=${state.room.code}&v=29`;
  const shareData={title:'Disney Music Quest',text:`Doe mee met de Disney Music Quest! Kamercode: ${state.room.code}`,url:url};
  try{
    if(navigator.share&&navigator.canShare&&navigator.canShare(shareData)){
      await navigator.share(shareData);
    }else{
      await navigator.clipboard.writeText(url);
      toast('Deellink gekopieerd!');
    }
  }catch(e){
    if(e.name!=='AbortError'){
      try{await navigator.clipboard.writeText(url);toast('Deellink gekopieerd!');}catch(err){toast('Kopiëren mislukt.');}
    }
  }
}


Object.assign(window,{
  leaveRoom,openSongAdminFromLobby,regenerateRoomCode,resetRoomToLobby,
  removeManagedPlayer,updateManagedPlayer,startGame,refreshAll,shareRoom,
  createRoom,goJoin,chooseJoinColor,chooseJoinAvatar,joinRoom,render,
  renderLobby,saveSong,nextRound,confirmMyPoints,completeMyRound
});
