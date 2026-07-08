// Build trigger: 2026-07-04 23:22
"use strict";
const DMQ_VERSION='64';
const cfg=window.DMQ_CONFIG||{};
const COLORS=[['blue','Blauw','#00e5ff'],['green','Groen','#2eff7d'],['yellow','Geel','#ffd615'],['pink','Roze','#ff2a85'],['purple','Paars','#bd53ed'],['orange','Oranje','#ff6b00']];
const AVATARS=[['linguini','Alfredo Linguini','avatars/linguini.webp'],['bruno','Bruno','avatars/bruno.png'],['buzz','Buzz Lightyear','avatars/buzz.png'],['heihei','Heihei','avatars/heihei.png'],['jack','Jack Sparrow','avatars/jack.png'],['kuzco','Kuzco','avatars/kuzco.png'],['medusa','Madame Medusa','avatars/medusa.png'],['maximus','Maximus','avatars/maximus.png'],['miguel','Miguel','avatars/miguel.png'],['mufasa','Mufasa','avatars/mufasa.png'],['mushu','Mushu','avatars/mushu.png'],['olaf','Olaf','avatars/olaf.png'],['pascal','Pascal','avatars/pascal.png'],['percy','Percy','avatars/percy.png'],['peter','Peter Pan','avatars/peter.png'],['redpanda','Red Panda','avatars/redpanda.png'],['remy','Remy','avatars/remy.png'],['stitch','Stitch','avatars/stitch.png']];
const POWERS_EXPLAIN=[{id:'hyperdrive',name:'Hyperdrive (Hyperspace Mountain)',icon:'attractions/hyperspace.png',desc:'Verdubbel al jouw behaalde punten in de huidige ronde!'},{id:'wild_ride',name:'Wild Ride (Big Thunder Mountain)',icon:'attractions/big_thunder.png',desc:'Bij jaartal-vragen krijg je ook punten bij een afwijking van max. 4 jaar.'},{id:'ghost_whisper',name:'Geestenfluistering (Phantom Manor)',icon:'attractions/phantom.png',desc:'Kies anoniem uit de ingevoerde jaartallen van alle spelers.'},{id:'hidden_treasure',name:'Verborgen Schat (Pirates of the Caribbean)',icon:'attractions/pirates.png',desc:'Krijg +1 bonuspunt als je ten minste één onderdeel correct beantwoordt.'},{id:'second_drop',name:'Tweede Val (Tower of Terror)',icon:'attractions/tower.png',desc:'Iedereen mag gedurende 30 seconden zijn foutieve (rode) antwoorden herzien.'},{id:'lightspeed',name:'Lichtsnelheid (Star Tours)',icon:'attractions/star_tours.png',desc:'Beantwoord de vraag correct binnen 10 seconden voor +1 snelheidsbonus.'},{id:'small_world',name:'Kleine Wereld Harmonie ("it\'s a small world")',icon:'attractions/small_world.png',desc:'Spelers die minder scoren dan jij, schenken jou +1 bonuspunt (max. +2).'},{id:'ingredient_theft',name:'Remy\'s Keukendiefstal (Ratatouille)',icon:'attractions/ratatouille.png',desc:'Kopiëer het antwoord van een tegenstander als je het zelf niet weet.'},{id:'laser_block',name:'Laser Blaster (Buzz Lightyear)',icon:'attractions/buzz.png',desc:'Schiet de actieve kracht van een tegenstander uit de lucht om deze te neutraliseren.'},{id:'temple_run',name:'Temple of Peril (Indiana Jones)',icon:'attractions/indiana.png',desc:'Verdrievoudig je score bij een goed antwoord, maar krijg -1 punt bij een fout antwoord.'},{id:'spider_bot',name:'Spider-Bot (WEB Adventure)',icon:'attractions/web.png',desc:'Kopieer de score van de hoogst scorende speler in deze ronde (indien jouw score lager is).'},{id:'turbo_boost',name:'Turbo Boost (Autopia)',icon:'attractions/autopia.png',desc:'Krijg +1 bonuspunt als je antwoord correct is en je de allersnelste correcte speler was.'}];
const DEFAULT_SETTINGS={streaks:true,powers:true,quick_guess:false,jackpot:false,stat_titles:true,final_bet:false,animations:true,leader_mode:'rotating',fixed_leader_player_id:null};
const state={sb:null,user:null,room:null,players:[],me:null,round:null,answers:[],songs:[],presence:{},channel:null,poll:null,view:'home',joinCode:'',joinName:'',joinColor:null,joinAvatar:null,adminPin:'',adminSelectedSong:1,refreshing:false,timer:null,startError:'',manageOpen:false,lobbySettings:{roundCount:10,gameMode:'mix',leaderMode:'rotating',fixedLeader:null,streaks:true,powers:true,quick_guess:false,jackpot:false,stat_titles:true,final_bet:false,animations:true},currentAnswer:{film:'',title:'',year:'',text:'',artist:''},timerSeconds:0,timerRoundId:null,timerPhase:null,lastShownPower:null,answerPhaseStartedAt:null,reviewFinalPoints:null,reviewCorrectionNote:null,celebrationShown:false};
document.addEventListener('DOMContentLoaded',init);window.addEventListener('beforeunload',cleanup);
async function init(){document.addEventListener('focusout',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))window.scrollTo(0,window.scrollY)});if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if('caches'in window)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{})}if(!configured()){setupScreen();return}try{state.sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});let{data:{session}}=await state.sb.auth.getSession();if(!session){let r=await state.sb.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}state.user=session.user;await fetchSongs();const params=new URLSearchParams(location.search);if(params.get('admin')==='1'){state.room=null;state.players=[];state.me=null;state.view='admin';render();return}const join=(params.get('join')||'').toUpperCase();const hostCode=(params.get('host')||'').toUpperCase();const legacy=(params.get('room')||'').toUpperCase();if(join){localStorage.removeItem('dmq-v2-room');state.room=null;state.me=null;state.joinCode=join;state.view='join';await loadJoinChoices(join);render();return}const q=hostCode||legacy;if(q){let roomResult=await state.sb.from('dmq_rooms').select('id,code,host_user_id,status').eq('code',q).maybeSingle();if(roomResult.data){let isHost=roomResult.data.host_user_id===state.user.id;let membership=await state.sb.from('dmq_players').select('id').eq('room_id',roomResult.data.id).eq('user_id',state.user.id).maybeSingle();if(isHost||membership.data){if(await loadRoom(roomResult.data.id,false))return}}state.joinCode=q;state.view='join';await loadJoinChoices(q);render();return}const saved=localStorage.getItem('dmq-v2-room');if(saved&&await loadRoom(saved,false))return;render()}catch(e){fatal('Verbinden mislukt.',e)}}
function configured(){return cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes('VUL_HIER')&&!cfg.SUPABASE_ANON_KEY.includes('VUL_HIER')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setupScreen(){app().innerHTML='<section class="card hero"><div class="logo">♫</div><h1>Disney Music Quest v2</h1><p>Voer eerst supabase_setup.sql en supabase_setup_v2.sql uit en vul config.js in.</p></section>'}
function app(){return document.getElementById('app')}
function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function loading(m='Even laden…'){app().innerHTML=`<section class="card hero"><div class="spinner"></div><p>${esc(m)}</p></section>`}
function fatal(m,e){console.error(e);app().innerHTML=`<section class="card"><h2>Er ging iets mis</h2><p>${esc(m)}</p><div class="notice red">${esc(e?.message||e)}</div><button class="btn primary full" onclick="location.reload()">Opnieuw</button></section>`}
function topbar(t,b=''){const action=b||(state.room?'leaveRoom()':'');return `<div class="topbar">${action?`<button class="iconbtn" onclick="${action}">←</button>`:'<span></span>'}<h1>${esc(t)}</h1><button class="iconbtn" onclick="refreshAll()">↻</button></div>`}
function C(id){const x=COLORS.find(v=>v[0]===id)||COLORS[0];return{id:x[0],name:x[1],hex:x[2]}}
function A(id){const map={hyperspace:'buzz',big_thunder:'bruno',phantom:'stitch',pirates:'jack',tower:'stitch',star_tours:'buzz',small_world:'linguini',ratatouille:'remy',buzz:'buzz'};const targetId=map[id]||id;const x=AVATARS.find(v=>v[0]===targetId)||AVATARS[0];const isImg=x[2].includes('/')||x[2].endsWith('.webp')||x[2].endsWith('.png');const iconHtml=isImg?`<img src="${x[2]}" class="avatar-img-inline" onload="removeBg(this)" alt="${x[1]}">`:x[2];return{id:x[0],name:x[1],icon:iconHtml,power:x[3]}}
function P(id){const x=POWERS_EXPLAIN.find(v=>v.id===id)||{id:'',name:'Onbekend',icon:'❓',desc:''};const isImg=x.icon.includes('/')||x.icon.endsWith('.png');const iconHtml=isImg?`<img src="${x.icon}" class="attraction-img-inline" onload="removeBg(this)" alt="${x.name}">`:x.icon;return{id:x.id,name:x.name,icon:iconHtml,desc:x.desc}}
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
function scorebar(){const count=state.players.length;return `<div class="scorebar cols-${count}">${state.players.map(p=>{const isOnline=online(p);const isCurrentLeader=leaderId()===p.id;return `<div class="scorechip ${isCurrentLeader?'leader':''}" style="--chip-color:${p.color}"><div class="avatar-frame"><span class="avatar-emoji">${A(p.avatar_id).icon}</span><span class="status-dot ${isOnline?'online':''}"></span></div><div class="scorechip-name">${esc(p.name)} ${isCurrentLeader?'👑':''}</div><div class="scorechip-score">${p.score||0} ★</div></div>`}).join('')}</div>`}
function progress(){if(!state.room?.total_rounds)return'';let n=state.room.current_round_no||0,t=state.room.total_rounds;return `<div class="progress"><i style="width:${Math.min(100,n/t*100)}%"></i></div><p class="small" style="text-align:center;margin:6px 0 12px">Ronde ${n} van ${t}</p>`}
async function fetchSongs(){let r=await state.sb.from('dmq_songs').select('*').order('song_number');if(r.error)throw r.error;state.songs=r.data||[]}
async function loadRoom(id,show=true){try{if(show)loading('Kamer openen…');let r=await state.sb.from('dmq_rooms').select('*').eq('id',id).single();if(r.error)return false;let p=await state.sb.from('dmq_players').select('*').eq('room_id',id).order('joined_at');if(p.error)throw p.error;const players=p.data||[];const me=players.find(x=>x.user_id===state.user.id)||null;const isHost=r.data.host_user_id===state.user.id;if(!isHost&&!me){localStorage.removeItem('dmq-v2-room');return false}state.room=r.data;state.players=players;state.me=me;localStorage.setItem('dmq-v2-room',id);await fetchRound();subscribe();render();return true}catch(e){console.error(e);return false}}
async function fetchRound(){if(!state.room?.current_round_no)return;let r=await state.sb.from('dmq_rounds').select('*').eq('room_id',state.room.id).eq('round_no',state.room.current_round_no).maybeSingle();if(r.error)throw r.error;if(r.data && (!state.round || state.round.id !== r.data.id)){state.currentAnswer={film:'',title:'',year:'',text:'',artist:''};state.answerPhaseStartedAt=null;state.reviewFinalPoints=null;state.reviewCorrectionNote=null}state.round=r.data;if(r.data){let a=await state.sb.from('dmq_answers').select('*').eq('round_id',r.data.id);if(a.error)throw a.error;state.answers=a.data||[]}}
let rt=null;function schedule(){clearTimeout(rt);rt=setTimeout(refreshAll,130)}
async function refreshAll(){if(state.refreshing||!state.room)return;state.refreshing=true;try{let r=await state.sb.from('dmq_rooms').select('*').eq('id',state.room.id).single();let p=await state.sb.from('dmq_players').select('*').eq('room_id',state.room.id).order('joined_at');if(r.data)state.room=r.data;if(p.data){state.players=p.data;state.me=p.data.find(x=>x.user_id===state.user.id)||state.me}await fetchRound();if(state.round?.active_power && state.lastShownPower !== state.round.active_power){const activator=state.players.find(pl=>pl.id===state.round.power_used_by_player_id)?.name||'Iemand';playPowerTakeover(state.round.active_power,activator);state.lastShownPower=state.round.active_power}else if(!state.round?.active_power){state.lastShownPower=null}render()}finally{state.refreshing=false}}
function subscribe(){cleanup();state.channel=state.sb.channel('dmq2-'+state.room.id,{config:{presence:{key:state.user.id}}}).on('presence',{event:'sync'},()=>{state.presence=state.channel.presenceState();render()}).on('postgres_changes',{event:'*',schema:'public',table:'dmq_rooms',filter:`id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_players',filter:`room_id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_rounds',filter:`room_id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_answers',filter:`room_id=eq.${state.room.id}`},schedule).subscribe(async s=>{if(s==='SUBSCRIBED')await state.channel.track({user_id:state.user.id,name:state.me?.name||'organisator'})});state.poll=setInterval(refreshAll,4500)}
function cleanup(){if(state.poll)clearInterval(state.poll);state.poll=null;if(state.channel&&state.sb)state.sb.removeChannel(state.channel).catch(()=>{});state.channel=null}
function render(){
  const activeId=document.activeElement?.id;
  const selStart=document.activeElement?.selectionStart;
  const selEnd=document.activeElement?.selectionEnd;

  if(!state.room){
    if(state.view==='join')renderJoin();
    else if(state.view==='admin')renderAdmin();
    else renderHome();
  } else if(state.room.status==='lobby'){
    renderLobby();
  } else if(state.room.status==='finished'){
    renderFinal();
  } else if(!state.round){
    loading('Ronde laden…');
  } else {
    ({claim:renderClaim,answer:renderAnswer,power_phantom:renderPhantom,power_tower:renderTower,review:renderReview,standings:renderStandings}[state.round.phase]||renderAnswer)();
  }

  if(activeId){
    const el=document.getElementById(activeId);
    if(el){
      el.focus();
      if(typeof selStart==='number'&&typeof selEnd==='number'){
        try{el.setSelectionRange(selStart,selEnd)}catch(e){}
      }
    }
  }
  if(window.twemoji){
    window.twemoji.parse(document.getElementById('app'),{
      base:'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/'
    });
  }
}

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


function leaveRoom(){if(state.room&&state.room.status==='playing'){if(!confirm('Weet je zeker dat je het actieve spel wilt verlaten?'))return}cleanup();state.room=null;state.players=[];state.me=null;state.round=null;state.answers=[];state.presence={};state.manageOpen=false;state.startError='';state.view='home';state.celebrationShown=false;localStorage.removeItem('dmq-v2-room');history.replaceState(null,'',location.pathname+'?v='+DMQ_VERSION);render()}
function openSongAdminFromLobby(){
  const url=`${location.origin}${location.pathname}?admin=1&v=${DMQ_VERSION}`;
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
<section class="card"><h2>Kies een Disney-karakter</h2><div class="avatargrid">${AVATARS.map(x=>{let taken=state.players.some(p=>p.avatar_id===x[0]);let c=state.joinColor?C(state.joinColor):null;let choiceStyle=c?`style="--choice:${c.hex}"`:'';return `<button class="avatarchoice ${state.joinAvatar===x[0]?'selected':''} ${taken?'taken':''}" ${choiceStyle} ${taken?'disabled':''} onclick="chooseJoinAvatar('${x[0]}')"><span class="avataricon">${A(x[0]).icon}</span>${x[1]}</button>`}).join('')}</div></section><section class="card"><h2>Magische Attractiekaarten</h2><p class="small muted" style="margin-bottom:12px">Tijdens het spel krijgt elke speler 3 willekeurige kaarten toebedeeld:</p><div style="display:grid;gap:8px">${POWERS_EXPLAIN.map(x=>`<div style="display:flex;align-items:flex-start;gap:12px;font-size:12px;background:rgba(25,50,90,0.2);padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.06)"><span class="power-list-icon">${P(x.id).icon}</span><div style="text-align:left"><strong style="display:block;margin-bottom:4px;font-size:13px;color:var(--gold);">${esc(x.name)}</strong><span class="muted" style="font-size:11.5px;line-height:1.4;display:block;">${esc(x.desc)}</span></div></div>`).join('')}</div></section><section class="card"><button class="btn primary full" onclick="joinRoom()">Bevestigen</button></section>`}
async function createRoom(){loading('Kamer maken…');let r=await state.sb.rpc('dmq_create_host_room');if(r.error){fatal('Kamer maken mislukt.',r.error);return}let row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?host=${row.room_code}&v=${DMQ_VERSION}`);await loadRoom(row.room_id,false)}
async function joinRoom(){state.joinCode=(document.getElementById('joinCode').value||'').trim().toUpperCase();state.joinName=(document.getElementById('joinName').value||'').trim();if(!state.joinCode||!state.joinName||!state.joinColor||!state.joinAvatar){toast('Vul naam, kleur en avatar in.');return}let c=C(state.joinColor);loading('Deelnemen…');let r=await state.sb.rpc('dmq_join_room_v2',{p_code:state.joinCode,p_player_name:state.joinName,p_color_id:c.id,p_color:c.hex,p_avatar_id:state.joinAvatar});if(r.error){fatal('Deelnemen mislukt.',r.error);return}let row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?room=${state.joinCode}&v=${DMQ_VERSION}`);await loadRoom(row.room_id,false)}
function toggle(id,label,on,key){return `<label class="toggleline"><span>${label}</span><input id="${id}" type="checkbox" ${on?'checked':''} onchange="state.lobbySettings['${key}']=this.checked; renderLobby();"></label>`}

function byId(id){return document.getElementById(id)}
function selectedValue(id,fallback=''){const e=byId(id);return e?e.value:fallback}
function selectedChecked(id,fallback=false){const e=byId(id);return e?!!e.checked:fallback}
function startReadiness(totalOverride=null){
  const total=Number(totalOverride??selectedValue('roundCount','5'))||5;
  const enoughPlayers=state.players.length>=2&&state.players.length<=6;
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

function validateCardsCount(){
  const count=state.lobbySettings.cards_per_player||3;
  const maxAllowed=Math.floor(12/Math.max(state.players.length,1));
  if(count>maxAllowed){
    state.lobbySettings.cards_per_player=Math.min(3,maxAllowed);
  }
}

function renderLobby(){
  validateCardsCount();
  const activeCount=activeSongs().length,ready=startReadiness(6);
  if(!state.lobbySettings.fixedLeader && state.players.length > 0) {
    state.lobbySettings.fixedLeader = state.players[0].id;
  }
  app().innerHTML=`${topbar('Wachtruimte','leaveRoom()')}
  <section class="card hero"><div class="badge">Kamercode</div><div class="roomcode">${esc(state.room.code)}</div><div id="joinQR" class="joinqr"></div><p>Laat spelers deze QR-code scannen of deel de link:</p><div style="margin:12px 0;background:#051024;padding:10px;border-radius:8px;border:1px solid #1a365d;font-size:12px;word-break:break-all;color:#74d7ff;font-family:monospace;line-height:1.4;">${location.origin}${location.pathname}?join=${state.room.code}&v=${DMQ_VERSION}</div><button class="btn ghost" onclick="shareRoom()">🔗 Kopieer & deel link</button></section>
  <section class="card"><h2>Spelers · ${state.players.length}/6</h2>${playerList()}
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
    <div class="grid2" style="margin-top:10px">
      <div class="field"><label>Krachten per speler</label>
        <select id="cardsPerPlayer" onchange="state.lobbySettings.cards_per_player = Number(this.value); validateCardsCount(); renderLobby();">
          <option value="1" ${state.lobbySettings.cards_per_player === 1?'selected':''}>1 kaart</option>
          <option value="2" ${state.lobbySettings.cards_per_player === 2?'selected':''}>2 kaarten</option>
          <option value="3" ${(state.lobbySettings.cards_per_player === 3 || !state.lobbySettings.cards_per_player)?'selected':''}${state.players.length>=5?' disabled':''}>3 kaarten (max 4 spl)</option>
        </select>
      </div>
      <div class="field"><label>Spelleider</label>
        <select id="leaderMode" onchange="state.lobbySettings.leaderMode = this.value; renderLobby();">
          <option value="rotating" ${state.lobbySettings.leaderMode === 'rotating'?'selected':''}>Roulerend</option>
          <option value="fixed" ${state.lobbySettings.leaderMode === 'fixed'?'selected':''}>Vast</option>
        </select>
      </div>
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
  setTimeout(()=>{let e=document.getElementById('joinQR');if(e&&window.QRCode)new QRCode(e,{text:`${location.origin}${location.pathname}?join=${state.room.code}&v=${DMQ_VERSION}`,width:210,height:210,colorDark:'#07152e',colorLight:'#fff'})},0)
}
function getSongPopularity(s){
  const n=Number(s.song_number);
  const high=[1,2,3,4,5,6,9,10,11,12,15,16,17,20,21,22,25,26,30,31,40,43,47,48,96,97,100];
  const low=[38,39,45,46,54,55,59,61,62,65,66,69,71,74,77,81,82,84,85,86,87,88,89,90,91,93,94,95,99];
  if(high.includes(n))return 'high';
  if(low.includes(n))return 'low';
  return 'medium';
}
function qtype(mode,s){if(mode!=='mix')return mode;const pop=getSongPopularity(s);if(pop==='low')return 'year';if(pop==='medium')return 'year_film';return 'year_film_artist';}
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
      fixed_leader_player_id:lm==='fixed'?(state.lobbySettings.fixedLeader||state.players[0]?.id||null):null,
      cards_per_player:state.lobbySettings.cards_per_player||3
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
    history.replaceState(null,'',`${location.pathname}?host=${state.room.code}&v=${DMQ_VERSION}`);
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

function rules(type,p=null){let x=type==='full'?['Juiste film: +1','Juiste titel: +1','Exact filmjaar: +1','Maximum: 3']:type==='year_film'?['Juiste film: +1','Exact filmjaar: +2','1 jaar verschil: +1','Maximum: 3']:type==='year_film_artist'?['Juiste film: +1','Exact filmjaar: +1','Juiste uitvoerder/personage: +1','Maximum: 3']:type==='film'?['Juiste film: +2']:type==='title'?['Juiste titel: +2']:type==='artist'?['Juiste uitvoerder/personage: +2']:['Exact: +3','1 jaar verschil: +2','2 jaar verschil: +1','Verder: 0'];if(p==='hyperdrive')x.push('Hyperdrive: alle punten dubbel');if(p==='wild_ride'&&type==='year')x=['Exact: +3','Maximaal 2 jaar verschil: +2','Maximaal 4 jaar verschil: +1'];if(p==='wild_ride'&&type==='year_film')x=['Juiste film: +1','Exact of max. 2 jaar verschil: +2','Maximaal 4 jaar verschil: +1','Maximum: 3'];if(p==='wild_ride'&&type==='year_film_artist')x=['Juiste film: +1','Max. 2 jaar verschil: +1','Juiste uitvoerder/personage: +1','Maximum: 3'];if(p==='hidden_treasure')x.push('Verborgen schat: minimaal 1 goed = +1 bonus');if(p==='ghost_whisper')x.push('Geestenfluistering: kies 10 seconden uit alle jaartallen');if(p==='second_drop')x.push('Tweede val: rode antwoorden 30 seconden aanpassen');if(p==='lightspeed')x.push('Lichtsnelheid: beantwoord binnen 10s = +1 bonus');if(p==='small_world')x.push('Kleine wereld harmonie: minder scorende spelers schenken +1 bonus');if(p==='ingredient_theft')x.push('Remy\'s Keukendiefstal: gekopieerd antwoord');if(p==='laser_block')x.push('Laser Blaster: neutraliseer de geactiveerde kracht van een tegenstander!');if(p==='laser_blocked')x.push('Laser Blaster: alle krachten zijn deze ronde geannuleerd! 💥');if(p==='temple_run')x.push('Temple of Peril: verdrievoudig bij juist, -1 bij fout!');if(p==='spider_bot')x.push('Spider-Bot: kopieer de topscore van deze ronde!');if(p==='turbo_boost')x.push('Turbo Boost: +1 bonus voor de allersnelste correcte speler!');return `<div class="rulebox"><h3>Punten deze ronde</h3>${x.map(v=>`<div>• ${v}</div>`).join('')}</div>`}
function myAccentColor(){if(host())return'#ffd45c';return state.me?.color||'#ffd45c'}
function power(){return state.round?.active_power||null}
function powerButton(){
  if(!settings().powers||!state.me)return '';
  const cards=state.me.power_cards||[];
  const used=state.me.used_cards||[];
  const activePower=power();
  if(cards.length===0)return '';
  return `<div class="deck-container">
    ${cards.map(pName=>{
      const powerInfo=P(pName);
      const isUsed=used.includes(pName);
      const isActive=activePower===pName;
      const isBlocked=activePower==='laser_blocked' && state.round.power_used_by_player_id===state.me.id && isUsed;
      let classes=['power-card'];
      if(isUsed) classes.push('used');
      if(isActive) classes.push('active');
      if(isBlocked) classes.push('blocked');
      let clickAction='';
      if(!isUsed){
        if(!activePower){
          if(pName==='laser_block'){
            clickAction=`toast('Er is geen actieve kracht om te blokkeren.')`;
          } else if(pName==='ghost_whisper'&&state.round.question_type!=='year'){
            clickAction=`toast('Geestenfluistering kan alleen bij jaartal-vragen!')`;
          } else if(pName==='ingredient_theft'){
            clickAction=`openStealDialog()`;
          } else {
            clickAction=`activatePower('${pName}')`;
          }
        } else {
          if(pName==='laser_block' && activePower !== 'laser_blocked'){
            clickAction=`activatePower('laser_block')`;
          } else {
            clickAction=`toast('Er is al een kracht actief in deze ronde.')`;
          }
        }
      }
      return `<div class="${classes.join(' ')}" onclick="${clickAction}">
        <div class="card-emoji" style="display:flex;align-items:center;justify-content:center;height:44px;margin-bottom:6px;">${powerInfo.icon}</div>
        <div class="card-name">${esc(powerInfo.name.split(' (')[0])}</div>
        <div class="card-status">${isUsed?'Gebruikt':isActive?'Actief':'Beschikbaar'}</div>
      </div>`;
    }).join('')}
  </div>`;
}
async function activatePower(p){let r=await state.sb.rpc('dmq_activate_power',{p_round_id:state.round.id,p_power:p});if(r.error)toast(r.error.message);else schedule()}
function renderClaim(){let s=currentSong(),claimed=state.round.claimed_by_user_id,mine=claimed===state.user.id,cp=state.players.find(p=>p.user_id===claimed);app().innerHTML=`${topbar('Song starten')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="badge">${esc(state.round.question_type)}</div><div class="songnumber">${esc(s?.label||'Song')}</div><p>Scan de code met de Hitster-telefoon.</p><div class="qrwrap" id="qrArea"></div>${rules(state.round.question_type,power())}${powerButton()}${!claimed?'<button class="btn primary full" onclick="claimSong()">▶ Ik laat deze song afspelen</button>':mine?'<div class="notice green">Jij bedient de muziek.</div><button class="btn primary full" onclick="confirmPlaying()">🔊 De song wordt afgespeeld</button><button class="btn ghost full" style="margin-top:8px" onclick="releaseSong()">Afspeelbeurt vrijgeven</button>':`<div class="notice blue">${esc(cp?.name||'Een speler')} laat de song afspelen.</div>${leader()?'<button class="btn ghost full" onclick="releaseSong()">Claim vrijgeven</button>':''}`}</section>`;setTimeout(()=>showCode(s),0)}
function showCode(s){let e=document.getElementById('qrArea');if(!e)return;e.innerHTML='';if(s?.code_image_url)e.innerHTML=`<img src="${esc(s.code_image_url)}">`;else if(s?.spotify_url&&window.QRCode)new QRCode(e,{text:s.spotify_url,width:200,height:200,colorDark:'#07152e',colorLight:'#fff'});else e.innerHTML='<div class="qrplaceholder">Nog geen scancode ingesteld.</div>'}
async function claimSong(){let r=await state.sb.rpc('dmq_claim_song',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else if(!r.data)toast('Iemand anders was sneller.');else schedule()}
async function releaseSong(){let r=await state.sb.rpc('dmq_release_song',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else schedule()}
async function confirmPlaying(){let r=await state.sb.rpc('dmq_confirm_playing',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else schedule()}
function prompt(t){return{full:'Welke film, welke titel en welk filmjaar?',film:'Uit welke film komt dit lied?',title:'Hoe heet dit lied?',year:'In welk jaar verscheen de film?',artist:'Wie zingt of voert dit uit?',year_film:'Welke film en welk filmjaar?',year_film_artist:'Welke film, welk filmjaar en wie zingt of voert dit uit?'}[t]}
function form(t,a={}){const fVal=state.currentAnswer.film!==undefined?state.currentAnswer.film:(a.film||'');const tVal=state.currentAnswer.title!==undefined?state.currentAnswer.title:(a.title||'');const yVal=state.currentAnswer.year!==undefined?state.currentAnswer.year:(a.year||'');const artVal=state.currentAnswer.artist!==undefined?state.currentAnswer.artist:(a.artist||'');const txVal=state.currentAnswer.text!==undefined?state.currentAnswer.text:(a[t]||'');if(t==='full')return `<div class="field"><label>Film</label><input id="ansFilm" value="${esc(fVal)}" oninput="state.currentAnswer.film=this.value"></div><div class="field"><label>Titel</label><input id="ansTitle" value="${esc(tVal)}" oninput="state.currentAnswer.title=this.value"></div><div class="field"><label>Jaar</label><input id="ansYear" type="number" value="${esc(yVal)}" oninput="state.currentAnswer.year=this.value"></div>`;if(t==='year_film')return `<div class="field"><label>Film</label><input id="ansFilm" value="${esc(fVal)}" oninput="state.currentAnswer.film=this.value"></div><div class="field"><label>Jaar</label><input id="ansYear" type="number" value="${esc(yVal)}" oninput="state.currentAnswer.year=this.value"></div>`;if(t==='year_film_artist')return `<div class="field"><label>Film</label><input id="ansFilm" value="${esc(fVal)}" oninput="state.currentAnswer.film=this.value"></div><div class="field"><label>Jaar</label><input id="ansYear" type="number" value="${esc(yVal)}" oninput="state.currentAnswer.year=this.value"></div><div class="field"><label>Uitvoerder</label><input id="ansArtist" value="${esc(artVal)}" oninput="state.currentAnswer.artist=this.value"></div>`;if(t==='year')return `<div class="field"><label>Jaar</label><input id="ansYear" type="number" value="${esc(yVal)}" oninput="state.currentAnswer.year=this.value"></div>`;return `<div class="field"><label>Antwoord</label><input id="ansText" value="${esc(txVal)}" oninput="state.currentAnswer.text=this.value"></div>`}
function collect(t){if(t==='full')return{film:ansFilm.value.trim(),title:ansTitle.value.trim(),year:+ansYear.value||null};if(t==='year_film')return{film:ansFilm.value.trim(),year:+ansYear.value||null};if(t==='year_film_artist')return{film:ansFilm.value.trim(),year:+ansYear.value||null,artist:ansArtist.value.trim()};if(t==='year')return{year:+ansYear.value||null};return{[t]:ansText.value.trim()}}
function filled(t,a){if(t==='full')return !!(a.film&&a.title&&a.year);if(t==='year_film')return !!(a.film&&a.year);if(t==='year_film_artist')return !!(a.film&&a.year&&a.artist);if(t==='year')return !!a.year;return !!a[t]}
function renderAnswer(){if(!state.answerPhaseStartedAt)state.answerPhaseStartedAt=Date.now();let mine=own(),done=new Set(state.answers.map(a=>a.user_id)),all=state.answers.length===state.players.length;app().innerHTML=`${topbar('Geheim antwoorden')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="prompt">${esc(prompt(state.round.question_type))}</div>${rules(state.round.question_type,power())}${powerButton()}${mine?'<div class="notice green">Je antwoord is opgeslagen.</div>':host()?'<div class="notice blue">Jij bent de organisator. Wacht tot de spelers antwoorden.</div>':`${form(state.round.question_type)}<button class="btn primary full" onclick="submitAnswer()">Antwoord vastleggen</button>`}</section><section class="card"><h2>Wie heeft geantwoord?</h2>${playerList(p=>done.has(p.user_id)?['Antwoord binnen','ok']:['Denkt nog na','wait'])}${leader()||host()?`<button class="btn secondary full" style="margin-top:12px" ${all?'':'disabled'} onclick="afterAnswers()">Verder</button>`:`<div class="notice blue">${all?'Alle antwoorden zijn binnen.':'Wachten op alle spelers.'}</div>`}</section>`}
async function submitAnswer(){if(host())return;let a=collect(state.round.question_type);if(!filled(state.round.question_type,a)){toast('Vul je antwoord in.');return}const elapsed=(Date.now()-(state.answerPhaseStartedAt||Date.now()))/1000;if(elapsed<=10)a.speed_bonus=true;let r=await state.sb.from('dmq_answers').insert({room_id:state.room.id,round_id:state.round.id,player_id:state.me.id,user_id:state.user.id,answer:a});if(r.error)toast(r.error.message);else schedule()}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/\b(the|a|an|de|het|een|la|le|les|un|une|der|die|das)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function lev(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;let r=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){let t=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return r[b.length]}
function match(v,targets){let a=norm(v);if(!a)return false;return targets.filter(Boolean).some(t=>{let b=norm(t);return a===b||(a.length>=6&&(a.includes(b)||b.includes(a)))||(1-lev(a,b)/Math.max(a.length,b.length)>=.72)})}
function isMyPower(playerId){
  if(!state.round?.active_power) return false;
  if(state.round.active_power==='ghost_whisper'||state.round.active_power==='second_drop') return true;
  return state.round.power_used_by_player_id===playerId;
}
function points(a,s,t,activePower,playerId){
  let film=[s.film,...(s.film_aliases||[])],title=[s.title,...(s.title_aliases||[])],artist=[s.artist,...(s.artist_aliases||[])],q=0;
  const p=isMyPower(playerId)?activePower:null;
  if(t==='full')q=(match(a.film,film)?1:0)+(match(a.title,title)?1:0)+(+a.year===+s.year?1:0);
  if(t==='film')q=match(a.film,film)?2:0;
  if(t==='title')q=match(a.title,title)?2:0;
  if(t==='artist')q=match(a.artist,artist)?2:0;
  if(t==='year'){
    let d=Math.abs(+a.year-+s.year);
    q=p==='wild_ride'?(d===0?3:d<=2?2:d<=4?1:0):(d===0?3:d===1?2:d===2?1:0)
  }
  if(t==='year_film'){
    const filmCorrect=match(a.film,film);
    const d=Math.abs(+a.year-+s.year);
    const yearPts=p==='wild_ride'?(d===0?2:d<=2?2:d<=4?1:0):(d===0?2:d===1?1:0);
    q=(filmCorrect?1:0)+yearPts;
  }
  if(t==='year_film_artist'){
    const filmCorrect=match(a.film,film);
    const artistCorrect=match(a.artist,artist);
    const d=Math.abs(+a.year-+s.year);
    const yearCorrect=p==='wild_ride'?(d<=2):(d===0);
    q=(filmCorrect?1:0)+(artistCorrect?1:0)+(yearCorrect?1:0);
  }
  if(p==='hidden_treasure'&&q>0)q++;
  if(p==='hyperdrive')q*=2;
  if(p==='lightspeed'&&a.speed_bonus&&q>0)q++;
  if(p==='temple_run'){
    if(q>0)q*=3;
    else q=-1;
  }
  if(p==='turbo_boost'&&q>0){
    const sortedAns=[...state.answers].sort((x,y)=>new Date(x.created_at)-new Date(y.created_at));
    if(sortedAns[0]?.player_id===playerId) q++;
  }
  if(p==='spider_bot'){
    let maxOther=0;
    state.answers.forEach(ans=>{
      if(ans.player_id!==playerId){
        const otherScore=points(ans.answer,s,t,null,ans.player_id);
        if(otherScore>maxOther)maxOther=otherScore;
      }
    });
    if(q<maxOther)q=maxOther;
  }
  return q;
}
async function afterAnswers(){if(power()==='ghost_whisper'){let r=await state.sb.rpc('dmq_begin_power_phase',{p_round_id:state.round.id,p_phase:'power_phantom'});if(r.error)toast(r.error.message);return}if(power()==='second_drop'){await prepareTower();return}await reveal()}
async function reveal(){let s=currentSong();let basePoints=[];for(const a of state.answers){let q=points(a.revised_answer||a.answer||{},s,state.round.question_type,power(),a.player_id);basePoints.push({ans:a,pts:q,streakBonusApplied:false})}if(power()==='small_world'){const activatorPlayerId=state.round.power_used_by_player_id;const activatorEntry=basePoints.find(bp=>bp.ans.player_id===activatorPlayerId);if(activatorEntry&&activatorEntry.pts>0){let bonus=0;basePoints.forEach(bp=>{if(bp.ans.player_id!==activatorPlayerId&&bp.pts<activatorEntry.pts){bonus++}});activatorEntry.pts+=Math.min(bonus,2)}}if(state.room.settings?.streaks){try{const{data:pastAns}=await state.sb.from('dmq_answers').select('player_id,final_points,round_id').eq('room_id',state.room.id);const{data:pastRounds}=await state.sb.from('dmq_rounds').select('id,round_no').eq('room_id',state.room.id).order('round_no',{ascending:true});if(pastAns&&pastRounds){const roundOrder=pastRounds.map(r=>r.id);const currentRoundIdx=roundOrder.indexOf(state.round.id);if(currentRoundIdx>=2){const prevRound1Id=roundOrder[currentRoundIdx-1];const prevRound2Id=roundOrder[currentRoundIdx-2];basePoints.forEach(bp=>{const ans1=pastAns.find(a=>a.player_id===bp.ans.player_id&&a.round_id===prevRound1Id);const ans2=pastAns.find(a=>a.player_id===bp.ans.player_id&&a.round_id===prevRound2Id);if(bp.pts>0&&ans1&&ans1.final_points>0&&ans2&&ans2.final_points>0){bp.pts+=1;bp.streakBonusApplied=true}})}}}catch(err){console.error("Streak calculation failed:",err)}}for(const bp of basePoints){let note=bp.streakBonusApplied?'Muzikale Streak! 🔥 (+1 bonus)':'';let r=await state.sb.from('dmq_answers').update({proposed_points:bp.pts,final_points:bp.pts,note:note}).eq('id',bp.ans.id);if(r.error){fatal('Beoordelen mislukt.',r.error);return}}let r=await state.sb.rpc('dmq_set_phase',{p_round_id:state.round.id,p_phase:'review'});if(r.error)toast(r.error.message);else schedule()}
function startTimer(seconds,done){clearInterval(state.timer);state.timerSeconds=seconds;state.timerFinished=false;state.timer=setInterval(async()=>{state.timerSeconds--;let e=document.getElementById('countNum');if(e)e.textContent=state.timerSeconds;if(state.timerSeconds<=0){clearInterval(state.timer);state.timer=null;state.timerFinished=true;await done()}},1000)}
function renderPhantom(){let mine=own(),counts={};state.answers.forEach(a=>{let y=+a.answer?.year;if(y)counts[y]=(counts[y]||0)+1});let ys=Object.keys(counts).map(Number).sort((a,b)=>a-b),selected=+(mine?.revised_answer?.year||mine?.answer?.year),same=ys.length===1;const duration=same?3:10;const secondsLeft=(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timerFinished)?0:(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timer)?state.timerSeconds:duration;app().innerHTML=`${topbar('Phantom Manor')}${scorebar()}${progress()}<section class="card phantom"><div class="powerbanner">👻 Geestenfluistering geldt voor iedereen</div>${rules('year','ghost_whisper')}<h2>De geesten fluisteren…</h2><p>Alle jaartallen zijn anoniem samengevoegd. ${host()?'Wacht tot de spelers kiezen.':'Jouw antwoord staat geselecteerd.'}</p><div class="yearchoices">${ys.map(y=>`<button class="yearbtn ${selected===y?'selected':''}" ${host()?'disabled':''} onclick="chooseYear(${y})">${y}${counts[y]>1?` × ${counts[y]}`:''}</button>`).join('')}</div><div class="countdown phantom"><div class="small">De klokken tikken…</div><div id="countNum" class="number">${secondsLeft}</div><div>🕯️ 👻 🕯️</div></div></section>`;if((state.timerRoundId!==state.round.id||state.timerPhase!==state.round.phase)&&!state.timerFinished){state.timerRoundId=state.round.id;state.timerPhase=state.round.phase;startTimer(duration,finishPhantom)}}
async function chooseYear(y){let r=await state.sb.from('dmq_answers').update({revised_answer:{year:y}}).eq('id',own().id);if(r.error)toast(r.error.message);else schedule()}
async function finishPhantom(){if(!leader()&&!host())return;let r=await state.sb.rpc('dmq_finalize_phantom',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else{await refreshAll();await reveal()}}
async function prepareTower(){let s=currentSong(),t=state.round.question_type;for(const a of state.answers){let x=a.answer||{},c={film:(t==='full'||t==='year_film'||t==='year_film_artist')?match(x.film,[s.film,...(s.film_aliases||[])]):null,title:t==='full'?match(x.title,[s.title,...(s.title_aliases||[])]):null,year:(t==='full'||t==='year'||t==='year_film'||t==='year_film_artist')?+x.year===+s.year:null,artist:(t==='artist'||t==='year_film_artist')?match(x.artist,[s.artist,...(s.artist_aliases||[])]):null};await state.sb.from('dmq_answers').update({correctness:c,revised_answer:x}).eq('id',a.id)}let r=await state.sb.rpc('dmq_begin_power_phase',{p_round_id:state.round.id,p_phase:'power_tower'});if(r.error)toast(r.error.message)}
function renderTower(){let mine=own(),a=mine?.revised_answer||mine?.answer||{},c=mine?.correctness||{},t=state.round.question_type;const secondsLeft=(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timerFinished)?0:(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timer)?state.timerSeconds:30;const f=(k,l,tp='text')=>{const val=state.currentAnswer[k]!==undefined?state.currentAnswer[k]:(a[k]||'');return `<div class="field answerfield ${c[k]===true?'correct':c[k]===false?'wrong':''}"><label>${l} ${c[k]===true?'✓':c[k]===false?'✗':''}</label><input id="tower_${k}" type="${tp}" value="${esc(val)}" ${c[k]===true||host()||mine?.tower_completed?'disabled':''} oninput="state.currentAnswer['${k}']=this.value; this.closest('.answerfield').classList.remove('wrong');"></div>`};let fields=t==='full'?f('film','Film')+f('title','Titel')+f('year','Jaar','number'):t==='year_film'?f('film','Film')+f('year','Jaar','number'):t==='year_film_artist'?f('film','Film')+f('year','Jaar','number')+f('artist','Uitvoerder'):t==='year'?f('year','Jaar','number'):f(t,t==='film'?'Film':t==='title'?'Titel':'Uitvoerder');app().innerHTML=`${topbar('Tower of Terror')}${scorebar()}${progress()}<section class="card tower"><div class="powerbanner">🏨 Tweede val geldt voor iedereen</div>${rules(t,'second_drop')}<h2>De liftdeuren sluiten…</h2><p>${host()?'Jij bent de organisator. Wacht tot de spelers hun antwoorden herzien.':mine?.tower_completed?'Je antwoord staat vast. Wacht tot de timer afloopt.':'Groen is juist en staat vast. Pas rode velden aan en klik op Klaar.'}</p>${fields}${host()?'':mine?.tower_completed?'<div class="notice green">Je bent klaar.</div>':`<button class="btn primary full" onclick="completeTower()">✓ Ik ben klaar</button>`}<div class="countdown tower"><div class="small">Verdieping</div><div id="countNum" class="number">${secondsLeft}</div><div>⬇️ 🛗 ⬇️</div></div></section><section class="card"><h2>Wie is klaar?</h2>${playerList(pl=>{let x=state.answers.find(ans=>ans.player_id===pl.id);if(!x)return['Nadenken...','wait'];const correctness=x.correctness||{};const keys=t==='full'?['film','title','year']:t==='year_film'?['film','year']:t==='year_film_artist'?['film','year','artist']:[t];const allCorrect=keys.every(k=>correctness[k]===true);if(allCorrect)return['Volledig juist! ✓','ok'];return x.tower_completed?['Klaar ✓','ok']:['Aanpassen... ⏳','wait']})}</section>`;if((state.timerRoundId!==state.round.id||state.timerPhase!==state.round.phase)&&!state.timerFinished){state.timerRoundId=state.round.id;state.timerPhase=state.round.phase;startTimer(30,finishTower)}}
async function completeTower(){let mine=own(),c=mine?.correctness||{},t=state.round.question_type,a={...(mine?.revised_answer||mine?.answer||{})},keys=t==='full'?['film','title','year']:t==='year_film'?['film','year']:t==='year_film_artist'?['film','year','artist']:[t];keys.forEach(k=>{if(c[k]!==true){let e=document.getElementById('tower_'+k);if(e)a[k]=k==='year'?+e.value||null:e.value.trim()}});let r=await state.sb.from('dmq_answers').update({revised_answer:a,tower_completed:true}).eq('id',mine.id);if(r.error)toast(r.error.message);else schedule()}
async function finishTower(){if(!leader()&&!host())return;let r=await state.sb.rpc('dmq_finalize_tower',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else{await refreshAll();await reveal()}}
function answerText(a,t){if(t==='full')return `${a.film||'—'} · ${a.title||'—'} · ${a.year||'—'}`;if(t==='year_film')return `${a.film||'—'} · ${a.year||'—'}`;if(t==='year_film_artist')return `${a.film||'—'} · ${a.year||'—'} · ${a.artist||'—'}`;return String(a[t]||'—')}
function maxPoints(t,p,playerId){let m=(t==='full'||t==='year'||t==='year_film'||t==='year_film_artist')?3:2;const activeP=isMyPower(playerId)?p:null;if(activeP==='hidden_treasure'||activeP==='lightspeed')m++;if(activeP==='small_world')m+=2;if(activeP==='hyperdrive')m*=2;if(activeP==='temple_run')m*=3;if(activeP==='spider_bot')m=(t==='full'||t==='year'||t==='year_film'||t==='year_film_artist')?6:4;return m;}
function renderReview(){let s=currentSong(),mine=own();if(!s||(!mine&&!host())){loading('Laden…');return}let a=mine?.revised_answer||mine?.answer||{},p=power();if(mine){if(state.reviewFinalPoints===null)state.reviewFinalPoints=mine.final_points;if(state.reviewCorrectionNote===null)state.reviewCorrectionNote=mine.note||''}const fpVal=(mine&&state.reviewFinalPoints!==null)?state.reviewFinalPoints:(mine?.final_points||0);const noteVal=(mine&&state.reviewCorrectionNote!==null)?state.reviewCorrectionNote:(mine?.note||'');const minP=p==='temple_run'&&isMyPower(state.me?.id)?-1:0;app().innerHTML=`${topbar('Punten controleren')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="correctbox"><strong>Het juiste antwoord</strong><p style="margin:7px 0 0">${esc(s.title)} · ${esc(s.film)} · ${esc(s.year)}${s.artist?` · ${esc(s.artist)}`:''}</p></div>${rules(state.round.question_type,p)}${host()?'':`<div class="answerline"><small>Jouw definitieve antwoord</small><strong>${esc(answerText(a,state.round.question_type))}</strong></div>`}${host()?'<div class="notice blue">Jij bent de organisator. Wacht tot de spelers hun punten bevestigen.</div>':!mine.points_confirmed?`<div class="field"><label>Mijn definitieve punten</label><select id="finalPoints" onchange="state.reviewFinalPoints=+this.value">${Array.from({length:maxPoints(state.round.question_type,p,state.me?.id)-minP+1},(_,i)=>{const val=minP+i;return`<option value="${val}" ${+fpVal===val?'selected':''}>${val}</option>`}).join('')}</select></div><div class="field"><label>Toelichting bij correctie</label><input id="correctionNote" value="${esc(noteVal)}" oninput="state.reviewCorrectionNote=this.value"></div><button class="btn primary full" onclick="confirmPoints()">Punten bevestigen</button>`:`<div class="notice green">Je hebt +${mine.final_points} bevestigd.</div>${!mine.round_completed?'<button class="btn primary full" onclick="completeRound()">Ik ben klaar met deze ronde</button>':'<button class="btn ghost full" disabled>Ronde afgerond ✓</button>'}`}</section><section class="card"><h2>Puntenstatus</h2>${playerList(pl=>{let x=state.answers.find(a=>a.player_id===pl.id);if(!x?.points_confirmed)return['Controleert nog','wait'];return x.round_completed?[`+${x.final_points} · klaar`,'ok']:[`+${x.final_points} · afronden`,'wait']})}</section>`}
async function confirmPoints(){let r=await state.sb.rpc('dmq_confirm_points',{p_answer_id:own().id,p_final_points:state.reviewFinalPoints,p_note:state.reviewCorrectionNote||''});if(r.error)toast(r.error.message);else schedule()}
async function completeRound(){let r=await state.sb.rpc('dmq_complete_round',{p_answer_id:own().id});if(r.error)toast(r.error.message);else schedule()}
function renderStandings(){let sorted=[...state.players].sort((a,b)=>b.score-a.score);app().innerHTML=`${topbar('Tussenstand')}${rules(state.round.question_type,power())}<section class="card"><div class="standings">${sorted.map((p,i)=>`<div class="rank" style="border-color:${p.color}"><div class="rankicon">${['🥇','🥈','🥉','🎵','🎶'][i]}</div><div><strong>${A(p.avatar_id).icon} ${esc(p.name)}</strong><small class="muted">${esc(A(p.avatar_id).name)}</small></div><div class="rankscore">${p.score} ★</div></div>`).join('')}</div>${leader()?`<button class="btn primary full" style="margin-top:14px" onclick="nextRound()">${state.room.current_round_no>=state.room.total_rounds?'Einduitslag':'Volgende song'}</button>`:`<div class="notice blue">${esc(state.players.find(p=>p.id===leaderId())?.name||'De spelleider')} start de volgende ronde.</div>`}</section>`}
async function nextRound(){state.reviewFinalPoints=null;state.reviewCorrectionNote=null;let r=await state.sb.rpc('dmq_next_round_v2',{p_room_id:state.room.id});if(r.error)toast(r.error.message);else schedule()}
const TITLES=[['De Maestro van Main Street','De Gouden Groove van het Kasteel','De Onbetwiste Oorwurmkoning','De Headliner van de Magische Hitlijst','De Dirigent van de Disney-deuntjes'],['De Eeuwige Encore','De Zilveren Soundtrackheld','De Bijna-Banger van Big Thunder','De Ster van het Voorprogramma','De Remix die nét niet won'],['De Phantom van het Vergeten Refrein','De Shuffleknop in Mensenvorm','De FastPass naar het Foute Jaartal','De Piraat met de Verkeerde Playlist','De Toonzoeker van de Tower']];
function renderFinal(){
  let s=[...state.players].sort((a,b)=>b.score-a.score);
  app().innerHTML=`${topbar('Einduitslag','leaveRoom()')}<section class="card hero"><div class="logo">♫</div><h1>${esc(s[0]?.name)} wint!</h1></section><section class="card"><div class="standings">${s.map((p,i)=>`<div class="rank" style="border-color:${p.color}"><div class="rankicon">${['🥇','🥈','🥉','🎵','🎶'][Math.min(i,4)]}</div><div><strong>${A(p.avatar_id).icon} ${esc(p.name)}</strong><small class="gold">${esc(TITLES[Math.min(i,2)][i%5])}</small></div><div class="rankscore">${p.score} ★</div></div>`).join('')}</div><button class="btn ghost full" style="margin-top:14px" onclick="leaveRoom()">Terug</button></section>`;
  if(state.lobbySettings.animations&&s.length>0&&!state.celebrationShown){
    state.celebrationShown=true;
    setTimeout(()=>playWinnerCelebration(s[0],s.slice(1)),150);
  }
}
function renderAdmin(){let s=state.songs.find(x=>+x.song_number===+state.adminSelectedSong)||{};app().innerHTML=`${topbar('Songbeheer · 100 songs',"state.view='home';render()")}
<section class="card"><div class="field"><label>Beheer-PIN</label><input id="adminPin" type="password" value="${esc(state.adminPin)}"></div><div class="field"><label>Song</label><select id="songSelect" onchange="state.adminPin=adminPin.value;state.adminSelectedSong=+this.value;renderAdmin()">${state.songs.map(x=>`<option value="${x.song_number}" ${+x.song_number===+state.adminSelectedSong?'selected':''}>${esc(x.label)} · ${esc(x.title||'leeg')}</option>`).join('')}</select></div></section>
<section class="card"><div class="field"><label>Titel</label><input id="songTitle" value="${esc(s.title||'')}"></div><div class="field"><label>Film</label><input id="songFilm" value="${esc(s.film||'')}"></div><div class="grid2"><div class="field"><label>Jaar</label><input id="songYear" type="number" value="${esc(s.year||'')}"></div><div class="field"><label>Uitvoerder</label><input id="songArtist" value="${esc(s.artist||'')}"></div></div><div class="field"><label>Spotify-link</label><input id="songSpotify" value="${esc(s.spotify_url||'')}"></div><div class="field"><label>Codeafbeelding-URL</label><input id="songCode" value="${esc(s.code_image_url||'')}"></div><div class="field"><label>Film-aliases</label><input id="filmAliases" value="${esc((s.film_aliases||[]).join(', '))}"></div><div class="field"><label>Titel-aliases</label><input id="titleAliases" value="${esc((s.title_aliases||[]).join(', '))}"></div><div class="field"><label>Uitvoerder-aliases</label><input id="artistAliases" value="${esc((s.artist_aliases||[]).join(', '))}"></div><label class="toggleline">Song actief<input id="songEnabled" type="checkbox" ${s.enabled?'checked':''}></label><button class="btn primary full" onclick="saveSong()">Opslaan</button></section>`}
function list(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function saveSong(){state.adminPin=adminPin.value;let s=state.songs.find(x=>+x.song_number===+state.adminSelectedSong);let r=await state.sb.rpc('dmq_admin_upsert_song',{p_pin:state.adminPin,p_song_number:s.song_number,p_title:songTitle.value.trim(),p_film:songFilm.value.trim(),p_year:+songYear.value||null,p_artist:songArtist.value.trim(),p_spotify_url:songSpotify.value.trim(),p_code_image_url:songCode.value.trim(),p_film_aliases:list(filmAliases.value),p_title_aliases:list(titleAliases.value),p_artist_aliases:list(artistAliases.value),p_enabled:songEnabled.checked});if(r.error)toast(r.error.message);else{await fetchSongs();toast('Song opgeslagen.');renderAdmin()}}
async function shareRoom(){
  const url=`${location.origin}${location.pathname}?join=${state.room.code}&v=${DMQ_VERSION}`;
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

function showPowersInfo(){
  let modal=document.createElement('div');
  modal.id='powersModal';
  modal.className='modal-overlay';
  modal.innerHTML=`<div class="modal-content">
    <button class="modal-close" onclick="closePowersInfo()">×</button>
    <h2 class="modal-title">ℹ Attractiekrachten Uitleg</h2>
    <div class="modal-body">
      ${POWERS_EXPLAIN.map(x=>`<div class="modal-item"><div class="icon" style="display:flex;align-items:center;justify-content:center;">${P(x.id).icon}</div><div><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p></div></div>`).join('')}
    </div>
  </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
}
function closePowersInfo(){
  let modal=document.getElementById('powersModal');
  if(modal){
    modal.classList.remove('show');
    setTimeout(()=>modal.remove(),300);
  }
}

function getPowerMiniDesc(power){
  if(power==='hyperdrive') return 'Punten verdubbelaar geactiveerd!';
  if(power==='wild_ride') return 'Maximale afwijking jaartal verhoogd!';
  if(power==='ghost_whisper') return 'Spookfluisteraar! Alle keuzes anoniem!';
  if(power==='hidden_treasure') return 'Verborgen schat bonus actief!';
  if(power==='second_drop') return 'Tweede val! Pas rode antwoorden aan!';
  if(power==='lightspeed') return 'Lichtsnelheid! Snelheidsbonus actief!';
  if(power==='small_world') return 'Kleine Wereld Harmonie actief!';
  if(power==='ingredient_theft') return 'Keukendiefstal! Remy kopieert een antwoord!';
  if(power==='laser_block') return 'Laser Blaster! Een kracht is uit de lucht geschoten! 💥';
  if(power==='laser_blocked') return 'Gecancelled! Alle krachten deze ronde geannuleerd! 💥';
  if(power==='temple_run') return 'Indiana Jones tempelavontuur! Drie keer of -1!';
  if(power==='spider_bot') return 'Spider-Bot kopieert de topscore!';
  if(power==='turbo_boost') return 'Turbo Boost! +1 bonuspunt voor de snelste speler!';
  return 'Kracht geactiveerd!';
}

function playPowerTakeover(power,playerName){
  let takeover=document.createElement('div');
  takeover.className='takeover-overlay';
  const powerInfo=P(power);
  const colors={hyperdrive:'#ff7ac8',wild_ride:'#ffd45c',ghost_whisper:'#69e58d',hidden_treasure:'#74d7ff',second_drop:'#bb86ff',lightspeed:'#69e58d',small_world:'#ffe45f',ingredient_theft:'#ff7ac8',laser_block:'#e95f72',laser_blocked:'#e95f72',temple_run:'#ffd45c',spider_bot:'#74d7ff',turbo_boost:'#69e58d'};
  const color=colors[power]||'#ffffff';
  
  if(power==='laser_block'||power==='laser_blocked'){
    const imgHtml = power==='laser_block' ? powerInfo.icon : '💥';
    takeover.innerHTML=`
      <div class="takeover-content">
        <div class="takeover-avatar">${imgHtml}</div>
        <h1 class="takeover-title" style="color:${color}">${esc(playerName)} activeert:</h1>
        <h2 class="takeover-title" style="font-size:32px">Laser Blaster!</h2>
        <p class="takeover-desc">De actieve kracht is uit de lucht geschoten! 💥</p>
      </div>
    `;
  } else {
    takeover.innerHTML=`
      <div class="takeover-content">
        <div class="takeover-avatar">${powerInfo.icon}</div>
        <h1 class="takeover-title" style="color:${color}">${esc(playerName)} zet in:</h1>
        <h2 class="takeover-title" style="font-size:32px">${esc(powerInfo.name.split(' (')[0])}</h2>
        <p class="takeover-desc">${esc(getPowerMiniDesc(power))}</p>
      </div>
    `;
  }
  document.body.appendChild(takeover);
  if(window.twemoji){window.twemoji.parse(takeover,{base:'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/'});}
  setTimeout(()=>takeover.classList.add('show'),10);
  triggerPowerEffectEffects(power,takeover);
  setTimeout(()=>{
    takeover.classList.remove('show');
    document.body.classList.remove('rumble-screen');
    setTimeout(()=>takeover.remove(),500);
  },3500);
}

function triggerPowerEffectEffects(power,overlay){
  if(power==='hyperdrive'||power==='lightspeed'){
    for(let i=0;i<40;i++){
      let star=document.createElement('div');
      star.className='star-particle';
      star.textContent='✦';
      let tx=(Math.random()-0.5)*window.innerWidth*1.2;
      let ty=(Math.random()-0.5)*window.innerHeight*1.2;
      star.style.setProperty('--tx', `${tx}px`);
      star.style.setProperty('--ty', `${ty}px`);
      star.style.left='50%';
      star.style.top='50%';
      star.style.animationDelay=`${Math.random()*0.8}s`;
      overlay.appendChild(star);
    }
  }
  if(power==='lightspeed'){
    let raider=document.createElement('div');
    raider.className='flyby-raider';
    raider.textContent='🛸';
    overlay.appendChild(raider);
  }
  if(power==='hyperdrive'){
    let raider=document.createElement('div');
    raider.className='flyby-raider';
    raider.textContent='🚀';
    overlay.appendChild(raider);
  }
  if(power==='wild_ride'){
    document.body.classList.add('rumble-screen');
    let train=document.createElement('div');
    train.className='flyby-raider';
    train.textContent='🚂💨';
    overlay.appendChild(train);
  }
  if(power==='ghost_whisper'){
    for(let i=0;i<6;i++){
      let ghost=document.createElement('div');
      ghost.className='ghost-particle';
      ghost.textContent='👻';
      ghost.style.left=`${10+Math.random()*80}%`;
      ghost.style.setProperty('--tx',`${(Math.random()-0.5)*150}px`);
      ghost.style.animationDelay=`${Math.random()*1.2}s`;
      overlay.appendChild(ghost);
    }
  }
  if(power==='hidden_treasure'||power==='small_world'){
    const char=power==='small_world'?'🎉':'🪙';
    for(let i=0;i<35;i++){
      let coin=document.createElement('div');
      coin.className='coin-particle';
      coin.textContent=char;
      coin.style.left=`${Math.random()*100}%`;
      coin.style.top=`-${Math.random()*50}px`;
      coin.style.animationDelay=`${Math.random()*1.5}s`;
      overlay.appendChild(coin);
    }
  }
  if(power==='ingredient_theft'){
    const char=Math.random()>0.5?'🧀':'🐭';
    for(let i=0;i<35;i++){
      let coin=document.createElement('div');
      coin.className='coin-particle';
      coin.textContent=char;
      coin.style.left=`${Math.random()*100}%`;
      coin.style.top=`-${Math.random()*50}px`;
      coin.style.animationDelay=`${Math.random()*1.5}s`;
      overlay.appendChild(coin);
    }
  }
  if(power==='second_drop'){
    let box=document.createElement('div');
    box.className='elevator-box';
    box.textContent='🛗';
    overlay.appendChild(box);
    setTimeout(()=>{
      document.body.classList.add('rumble-screen');
      setTimeout(()=>document.body.classList.remove('rumble-screen'),400);
    },1400);
  }
  if(power==='laser_block'||power==='laser_blocked'){
    for(let i=0;i<8;i++){
      let laser=document.createElement('div');
      laser.style.position='absolute';
      laser.style.background='red';
      laser.style.boxShadow='0 0 10px red';
      if(Math.random()>0.5){
        laser.style.width='100vw';
        laser.style.height='3px';
        laser.style.left='0';
        laser.style.top=`${Math.random()*100}%`;
        laser.style.transform=`rotate(${(Math.random()-0.5)*10}deg)`;
      } else {
        laser.style.width='3px';
        laser.style.height='100vh';
        laser.style.top='0';
        laser.style.left=`${Math.random()*100}%`;
        laser.style.transform=`rotate(${(Math.random()-0.5)*10}deg)`;
      }
      laser.style.opacity='0';
      laser.style.transition='opacity 0.2s';
      overlay.appendChild(laser);
      setTimeout(()=>laser.style.opacity='0.8', 200 + i*150);
      setTimeout(()=>laser.style.opacity='0', 400 + i*150);
    }
  }
}

function openStealDialog(){
  let modal=document.createElement('div');
  modal.id='stealModal';
  modal.className='modal-overlay';
  const others=state.players.filter(p=>p.id!==state.me.id);
  modal.innerHTML=`<div class="modal-content">
    <button class="modal-close" onclick="closeStealDialog()">×</button>
    <h2 class="modal-title">🐭 Remy's Keukendiefstal</h2>
    <p>Kies een speler om zijn/haar ingevulde antwoord te kopiëren:</p>
    <div class="modal-body" style="gap:10px;margin-top:12px">
      ${others.map(p=>{
        const hasAnswered=state.answers.some(ans=>ans.player_id===p.id);
        return `<button class="btn secondary full" style="justify-content:flex-start;text-align:left;--choice:${p.color};margin-bottom:8px" ${hasAnswered?'':'disabled'} onclick="stealFromPlayer('${p.id}')">
          <span style="font-size:20px;margin-right:8px">${A(p.avatar_id).icon}</span>
          <strong>${esc(p.name)}</strong>
          <span style="margin-left:auto;font-size:11px;opacity:0.6">${hasAnswered?'✓ Antwoord binnen':'⏳ Denkt nog na'}</span>
        </button>`;
      }).join('')}
    </div>
  </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
}
function closeStealDialog(){
  let modal=document.getElementById('stealModal');
  if(modal){
    modal.classList.remove('show');
    setTimeout(()=>modal.remove(),300);
  }
}
async function stealFromPlayer(targetPlayerId){
  closeStealDialog();
  const ansRow=state.answers.find(ans=>ans.player_id===targetPlayerId);
  if(!ansRow || !ansRow.answer){
    toast('Kon antwoord niet ophalen.');
    return;
  }
  const a=ansRow.answer;
  const t=state.round.question_type;
  if(t==='full'||t==='year_film'||t==='year_film_artist'){
    state.currentAnswer.film=a.film||'';
    state.currentAnswer.year=a.year||'';
    if(t==='full') state.currentAnswer.title=a.title||'';
    if(t==='year_film_artist') state.currentAnswer.artist=a.artist||'';
    
    let f=document.getElementById('ansFilm');if(f)f.value=state.currentAnswer.film;
    let y=document.getElementById('ansYear');if(y)y.value=state.currentAnswer.year;
    if(t==='full'){
      let ti=document.getElementById('ansTitle');if(ti)ti.value=state.currentAnswer.title;
    }
    if(t==='year_film_artist'){
      let art=document.getElementById('ansArtist');if(art)art.value=state.currentAnswer.artist;
    }
  } else if(t==='year'){
    state.currentAnswer.year=a.year||'';
    let y=document.getElementById('ansYear');if(y)y.value=state.currentAnswer.year;
  } else {
    state.currentAnswer.text=a[t]||'';
    let tx=document.getElementById('ansText');if(tx)tx.value=state.currentAnswer.text;
  }
  let r=await state.sb.rpc('dmq_activate_power',{p_round_id:state.round.id,p_power:'ingredient_theft'});
  if(r.error)toast(r.error.message);
  else {
    toast('Antwoord gekopieerd!');
    schedule();
  }
}

function playWinnerCelebration(winner,others){
  const overlay=document.createElement('div');
  overlay.className='celebration-overlay';
  const winAv=A(winner.avatar_id);
  const color=winner.color||'#ffd45c';
  overlay.innerHTML=`
    <div class="celebration-container">
      <div class="celebration-shine" style="background: radial-gradient(circle, ${color}33 0%, transparent 70%)"></div>
      <div class="winner-crown">👑</div>
      <div class="winner-avatar-large animate-winner">${winAv.icon}</div>
      <h1 class="winner-name-large" style="text-shadow: 0 0 20px ${color}aa">${esc(winner.name)}</h1>
      <p class="winner-title-large">${esc(TITLES[0][0])}</p>
      <div class="winner-score-large">${winner.score} ★</div>
      
      <div class="cheering-section">
        ${others.map((o,i)=>{
          const av=A(o.avatar_id);
          return `
            <div class="cheering-player" style="animation-delay:${i*0.15}s">
              <div class="cheer-emoji">${av.icon}</div>
              <div class="cheer-name">${esc(o.name)}</div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn primary close-celebration" onclick="closeCelebration()">Bekijk uitslag</button>
    </div>
  `;
  document.body.appendChild(overlay);
  if(window.twemoji){window.twemoji.parse(overlay,{base:'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/'});}
  spawnThemeParticles(winAv.id,overlay);
}

function spawnThemeParticles(avatarId,parent){
  let emojis=['✨','🎉','🏆','⭐'];
  if(avatarId==='olaf')emojis=['⛄','🥕','❄️','✨'];
  else if(avatarId==='buzz')emojis=['🚀','⭐','🔫','✨'];
  else if(avatarId==='jack')emojis=['🪙','💰','🏴‍☠️'];
  else if(avatarId==='remy'||avatarId==='linguini')emojis=['🧀','👨‍🍳','🥖','✨'];
  else if(avatarId==='peter')emojis=['✨','🧚‍♂️','⭐','💫'];
  else if(avatarId==='miguel')emojis=['🎸','💀','🧡','✨'];
  else if(avatarId==='mufasa')emojis=['🦁','🍂','🍁','⭐'];
  else if(avatarId==='bruno')emojis=['⏳','🐀','💚','✨'];
  else if(avatarId==='heihei')emojis=['🐔','🪶','🤪'];
  else if(avatarId==='mushu')emojis=['🐉','🔥','⚔️','💥'];
  else if(avatarId==='kuzco')emojis=['🦙','👑','🧪','✨'];
  else if(avatarId==='medusa')emojis=['💎','🐊','🚗','💀'];
  else if(avatarId==='percy')emojis=['🐶','🍒','🪶','🎀'];
  else if(avatarId==='redpanda')emojis=['🐼','🎵','🏮','✨'];
  else if(avatarId==='pascal')emojis=['🦎','🎨','🍳','🏮'];
  else if(avatarId==='maximus')emojis=['🐴','🍎','⚔️','🛡️'];
  for(let i=0;i<60;i++){
    setTimeout(()=>{
      if(!parent.parentNode)return;
      const p=document.createElement('div');
      p.className='celebration-particle';
      p.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      p.style.left=Math.random()*100+'vw';
      p.style.fontSize=(Math.random()*20+16)+'px';
      p.style.animationDuration=(Math.random()*2.5+2)+'s';
      p.style.animationDelay=(Math.random()*2)+'s';
      parent.appendChild(p);
    },i*50);
  }
}

function closeCelebration(){
  const o=document.querySelector('.celebration-overlay');
  if(o)o.remove();
}

function removeBg(img){
  if(!img||img.dataset.processed)return;
  img.dataset.processed="true";
  const canvas=document.createElement('canvas');
  const w=img.naturalWidth||img.width;
  const h=img.naturalHeight||img.height;
  canvas.width=w;
  canvas.height=h;
  if(!w||!h)return;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0);
  try{
    const imgData=ctx.getImageData(0,0,w,h);
    const data=imgData.data;
    for(let i=0;i<data.length;i+=4){
      if(data[i]>240&&data[i+1]>240&&data[i+2]>240){
        data[i+3]=0;
      }
    }
    let minX=w,minY=h,maxX=0,maxY=0;
    let found=false;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const alpha=data[((y*w)+x)*4+3];
        if(alpha>0){
          found=true;
          if(x<minX)minX=x;
          if(x>maxX)maxX=x;
          if(y<minY)minY=y;
          if(y>maxY)maxY=y;
        }
      }
    }
    ctx.putImageData(imgData,0,0);
    if(found){
      const cropW=maxX-minX+1;
      const cropH=maxY-minY+1;
      if(cropW>0&&cropH>0&&(cropW<w||cropH<h)){
        const cropCanvas=document.createElement('canvas');
        cropCanvas.width=cropW;
        cropCanvas.height=cropH;
        const cropCtx=cropCanvas.getContext('2d');
        cropCtx.drawImage(canvas,minX,minY,cropW,cropH,0,0,cropW,cropH);
        img.src=cropCanvas.toDataURL();
        return;
      }
    }
    img.src=canvas.toDataURL();
  }catch(e){console.error(e)}
}

Object.assign(window,{
  leaveRoom,openSongAdminFromLobby,regenerateRoomCode,resetRoomToLobby,
  removeManagedPlayer,updateManagedPlayer,startGame,refreshAll,shareRoom,
  createRoom,goJoin,chooseJoinColor,chooseJoinAvatar,joinRoom,render,
  renderLobby,saveSong,nextRound,confirmMyPoints,completeMyRound,
  showPowersInfo,closePowersInfo,openStealDialog,closeStealDialog,stealFromPlayer,
  closeCelebration,removeBg,P
});
