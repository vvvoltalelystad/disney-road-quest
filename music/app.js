// Build trigger: 2026-07-04 23:22
"use strict";
const DMQ_VERSION='84';
const cfg=window.DMQ_CONFIG||{};
const COLORS=[['blue','Blauw','#00e5ff'],['green','Groen','#2eff7d'],['yellow','Geel','#ffd615'],['pink','Roze','#ff2a85'],['purple','Paars','#bd53ed'],['orange','Oranje','#ff6b00']];
const AVATARS=[['bruno','Bruno','avatars/bruno.png'],['buzz','Buzz Lightyear','avatars/buzz.png'],['linguini','Ernesto de la Cruz','../Ernesto_png.png'],['heihei','Heihei','avatars/heihei.png'],['hen-wen','Hen Wen','avatars/hen-wen.png'],['jack','Jack Sparrow','avatars/jack.png'],['kuzco','Kuzco','avatars/kuzco.png'],['medusa','Madame Medusa','avatars/medusa.png'],['maximus','Maximus','avatars/maximus.png'],['miguel','Miguel','avatars/miguel.png'],['mufasa','Mufasa','avatars/mufasa.png'],['mushu','Mushu','avatars/mushu.png'],['olaf','Olaf','avatars/olaf.png'],['pascal','Pascal','avatars/pascal.png'],['percy','Percy','avatars/percy.png'],['peter','Peter Pan','avatars/peter.png'],['redpanda','Red Panda','avatars/redpanda.png'],['remy','Remy','avatars/remy.png'],['stitch','Stitch','avatars/stitch.png'],['taran','Taran','avatars/taran.png']].sort((left,right)=>left[1].localeCompare(right[1],'nl',{sensitivity:'base'}));
const POWERS_EXPLAIN=[{id:'hyperdrive',name:'Hyperdrive (Hyperspace Mountain)',icon:'attractions/hyperspace.png',desc:'Verdubbel al jouw behaalde punten in de huidige ronde!'},{id:'wild_ride',name:'Wild Ride (Big Thunder Mountain)',icon:'attractions/big_thunder.png',desc:'Bij jaartal-vragen krijg je ook punten bij een afwijking van max. 4 jaar.'},{id:'ghost_whisper',name:'Geestenfluistering (Phantom Manor)',icon:'attractions/phantom.png',desc:'Kies anoniem uit de ingevoerde jaartallen van alle spelers.'},{id:'hidden_treasure',name:'Verborgen Schat (Pirates of the Caribbean)',icon:'attractions/pirates.png',desc:'Krijg +1 bonuspunt als je ten minste één onderdeel correct beantwoordt.'},{id:'second_drop',name:'Tweede Val (Tower of Terror)',icon:'attractions/tower.png',desc:'Iedereen mag gedurende 30 seconden zijn foutieve (rode) antwoorden herzien.'},{id:'lightspeed',name:'Lichtsnelheid (Star Tours)',icon:'attractions/star_tours.png',desc:'Beantwoord de vraag correct binnen 10 seconden voor +1 snelheidsbonus.'},{id:'small_world',name:'Kleine Wereld Harmonie ("it\'s a small world")',icon:'attractions/small_world.png',desc:'Spelers die minder scoren dan jij, schenken jou +1 bonuspunt (max. +2).'},{id:'ingredient_theft',name:'Remy\'s Keukendiefstal (Ratatouille)',icon:'attractions/ratatouille.png',desc:'Kopiëer het antwoord van een tegenstander als je het zelf niet weet.'},{id:'laser_block',name:'Laser Blaster (Buzz Lightyear)',icon:'attractions/buzz.png',desc:'Schiet de actieve kracht van een tegenstander uit de lucht om deze te neutraliseren.'},{id:'temple_run',name:'Temple of Peril (Indiana Jones)',icon:'attractions/indiana.png',desc:'Verdrievoudig je score bij een goed antwoord, maar krijg -1 punt bij een fout antwoord.'},{id:'spider_bot',name:'Spider-Bot (WEB Adventure)',icon:'attractions/web.png',desc:'Kopieer de score van de hoogst scorende speler in deze ronde (indien jouw score lager is).'},{id:'turbo_boost',name:'Turbo Boost (Autopia)',icon:'attractions/autopia.png',desc:'Krijg +1 bonuspunt als je antwoord correct is en je de allersnelste correcte speler was.'}];
const DEFAULT_SETTINGS={streaks:true,powers:false,quick_guess:false,answer_time_limit:'none',jackpot:false,stat_titles:true,final_bet:false,animations:true,leader_mode:'rotating',fixed_leader_player_id:null,fixed_leader_name:null};
const TIME_POWER_IDS=new Set(['second_drop','lightspeed','turbo_boost']);
const state={sb:null,user:null,room:null,players:[],me:null,round:null,answers:[],songs:[],presence:{},channel:null,poll:null,profilePoll:null,profileUpdatedAt:'',view:'home',joinCode:'',joinName:localStorage.getItem('disney_active_profile')||localStorage.getItem('disney_player_name')||'',joinColor:null,joinAvatar:null,adminPin:'',adminSelectedSong:1,refreshing:false,timer:null,startError:'',manageOpen:false,lobbySettings:{roundCount:10,gameMode:'mix',leaderMode:'rotating',fixedLeader:null,streaks:true,powers:false,answerTimeLimit:'none',jackpot:false,stat_titles:true,final_bet:false,animations:true},currentAnswer:{film:'',title:'',year:'',text:'',artist:'',year_period:null},timerSeconds:0,timerRoundId:null,timerPhase:null,lastShownPower:null,answerPhaseStartedAt:null,reviewFinalPoints:null,reviewCorrectionNote:null,celebrationShown:false};
document.addEventListener('DOMContentLoaded',init);window.addEventListener('beforeunload',cleanupAll);
async function init(){document.addEventListener('focusout',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))window.scrollTo(0,window.scrollY)});if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if('caches'in window)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{})}if(!configured()){setupScreen();return}try{state.sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});let{data:{session}}=await state.sb.auth.getSession();if(!session){let r=await state.sb.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}state.user=session.user;await refreshMusicProfileStore();startMusicProfileSync();await fetchSongs();const params=new URLSearchParams(location.search);if(params.get('admin')==='1'){state.room=null;state.players=[];state.me=null;state.view='admin';render();return}const join=(params.get('join')||'').toUpperCase();const hostCode=(params.get('host')||'').toUpperCase();const legacy=(params.get('room')||'').toUpperCase();if(join){localStorage.removeItem('dmq-v2-room');state.room=null;state.me=null;state.joinCode=join;state.view='join';await loadJoinChoices(join);render();return}const q=hostCode||legacy;if(q){let roomResult=await state.sb.from('dmq_rooms').select('id,code,host_user_id,status').eq('code',q).maybeSingle();if(roomResult.data){let isHost=roomResult.data.host_user_id===state.user.id;let membership=await state.sb.from('dmq_players').select('id').eq('room_id',roomResult.data.id).eq('user_id',state.user.id).maybeSingle();if(isHost||membership.data){if(await loadRoom(roomResult.data.id,false))return}}state.joinCode=q;state.view='join';await loadJoinChoices(q);render();return}const saved=localStorage.getItem('dmq-v2-room');if(saved&&await loadRoom(saved,false))return;render()}catch(e){fatal('Verbinden mislukt.',e)}}
function configured(){return cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes('VUL_HIER')&&!cfg.SUPABASE_ANON_KEY.includes('VUL_HIER')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setupScreen(){app().innerHTML=`<section class="card hero"><div class="logo">♫</div><h1>Mickey's Music Match</h1><p>Origineel: Disney Music Quiz. Voer eerst supabase_setup.sql en supabase_setup_v2.sql uit en vul config.js in.</p></section>`}
function app(){return document.getElementById('app')}
function profileStorageKey(name){return String(name||'speler').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')||'speler'}
function portalUrl(action=''){const url=new URL('../',location.href);url.searchParams.set('portal','1');if(action)url.searchParams.set(action,'1');return url.toString()}
function readMusicProfile(){const name=activeProfileName();if(!name)return null;const key=profileStorageKey(name);let preference={};let bank={};try{preference=JSON.parse(localStorage.getItem('disney_profile_preferences')||'{}')[key]||{}}catch(e){}try{bank=JSON.parse(localStorage.getItem('disney_coco_coin_bank')||'{}')}catch(e){}return{name,key,balance:Number(bank[key]||0),preference}}
async function refreshMusicProfileStore(){if(!state.sb)return;try{const result=await state.sb.from('rooms').select('current_task_state').eq('code','COCO-PROFILES-V1').maybeSingle();if(result.error)throw result.error;const shared=result.data?.current_task_state||{};const updated=String(shared.updated_at||'');if(state.profileUpdatedAt&&updated&&updated<=state.profileUpdatedAt)return;if(updated)state.profileUpdatedAt=updated;const mappings=[['coco_profiles','disney_coco_profiles'],['coco_profile_preferences','disney_profile_preferences'],['coco_collections','disney_collections'],['coco_exclusive_claims','disney_exclusive_claims'],['coco_badge_collections','disney_badge_collections'],['coco_badge_achievements','disney_badge_achievements'],['coco_badge_market','disney_badge_market'],['coco_player_trades','disney_player_trades']];mappings.forEach(([remoteKey,localKey])=>{if(shared[remoteKey]!==undefined)localStorage.setItem(localKey,JSON.stringify(shared[remoteKey]))});const mergeUnique=(remote=[],local=[],signature)=>{const seen=new Set();return[...remote,...local].filter(item=>{const key=signature(item);if(!key||seen.has(key))return false;seen.add(key);return true})};let localLogs={};let localHistory=[];try{localLogs=JSON.parse(localStorage.getItem('disney_captains_log')||'{}')}catch(e){}try{localHistory=JSON.parse(localStorage.getItem('disney_solo_history')||'[]')}catch(e){}const remoteLogs=shared.coco_captains_log||{};const names=new Set([...Object.keys(remoteLogs),...Object.keys(localLogs)]);const mergedLogs=Object.fromEntries([...names].map(name=>[name,mergeUnique(remoteLogs[name],localLogs[name],entry=>[entry?.timestamp,entry?.amount,entry?.type,entry?.description].join('|'))]));const reconciledBank={...(shared.coco_bank||{})};Object.entries(mergedLogs).forEach(([name,entries])=>{const sorted=[...(entries||[])].sort((a,b)=>new Date(a.timestamp||0)-new Date(b.timestamp||0));const opening=sorted.findIndex(entry=>entry?.ledgerOpening);if(opening>=0)reconciledBank[disneyStarKey(name)]=Math.max(0,sorted.slice(opening).reduce((sum,entry,index)=>sum+(index===0?Math.abs(Number(entry?.amount)||0):(Number(entry?.amount)||0)),0));else{const latest=[...sorted].reverse().find(entry=>Number.isFinite(Number(entry?.balanceAfter)));if(latest)reconciledBank[disneyStarKey(name)]=Number(latest.balanceAfter)}});const mergedHistory=mergeUnique(shared.coco_game_history,localHistory,item=>[item?.date,item?.profileKey||item?.profileName,item?.gameType,item?.score,item?.details].join('|')).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));localStorage.setItem('disney_coco_coin_bank',JSON.stringify(reconciledBank));localStorage.setItem('disney_captains_log',JSON.stringify(mergedLogs));localStorage.setItem('disney_solo_history',JSON.stringify(mergedHistory));renderGlobalMusicHeader()}catch(e){console.warn('Disney-profielen konden nog niet worden ververst.',e)}}
function refreshMusicProfileWhenActive(){if(document.visibilityState==='visible')refreshMusicProfileStore()}
function startMusicProfileSync(){if(state.profilePoll)clearInterval(state.profilePoll);state.profilePoll=setInterval(refreshMusicProfileStore,3000);window.addEventListener('focus',refreshMusicProfileWhenActive);document.addEventListener('visibilitychange',refreshMusicProfileWhenActive)}
function musicTheme(){const profile=readMusicProfile();return profile?.preference?.theme||localStorage.getItem('disney_theme_mode')||'day'}
function applyMusicTheme(){document.body.classList.toggle('music-night',musicTheme()==='night')}
function toggleMusicTheme(){const profile=readMusicProfile();const next=musicTheme()==='night'?'day':'night';localStorage.setItem('disney_theme_mode',next);if(profile){try{const preferences=JSON.parse(localStorage.getItem('disney_profile_preferences')||'{}');preferences[profile.key]={...(preferences[profile.key]||{}),name:profile.name,theme:next};localStorage.setItem('disney_profile_preferences',JSON.stringify(preferences))}catch(e){}}applyMusicTheme();renderGlobalMusicHeader()}
function renderGlobalMusicHeader(){const header=document.getElementById('globalMusicHeader');if(!header)return;const profile=readMusicProfile();if(!profile){header.hidden=true;return}const avatarId=profile.preference?.avatar||'';const avatarFile=AVATARS.find(avatar=>avatar[0]===avatarId)?.[2]||'';const color=C(profile.preference?.color).hex;header.hidden=false;header.innerHTML=`<div class="global-profile-pill"><a class="global-profile-segment global-profile-avatar-segment" href="${portalUrl('profile')}" aria-label="Wijzig avatar en spelerskleur">${avatarFile?`<img class="global-profile-avatar avatar-id-${esc(avatarId)}" src="${avatarFile}" alt="" style="border-color:${color}">`:`<span class="global-profile-avatar-fallback" style="border-color:${color}">${esc(profile.name.slice(0,1).toUpperCase())}</span>`}</a><span class="global-profile-divider" aria-hidden="true">•</span><a class="global-profile-segment global-profile-name-segment" href="${portalUrl('log')}" aria-label="Open spelersoverzicht van ${esc(profile.name)}"><span>${esc(profile.name)}</span></a><span class="global-profile-divider" aria-hidden="true">•</span><a class="global-profile-segment global-profile-balance-segment" href="${portalUrl('coin')}" aria-label="Bekijk Coco Coin. Saldo: ${profile.balance}"><span>${profile.balance}</span><img src="../collectables/coco-coin-front.png" alt="Coco Coin"></a></div><button class="global-header-icon" type="button" onclick="toggleMusicTheme()" aria-label="Wissel dag- en nachtstand">${musicTheme()==='night'?'☀️':'🌙'}</button><button class="global-header-icon" type="button" onclick="returnToPortal()" aria-label="Terug">←</button>`;applyMusicTheme()}
function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function loading(m='Even laden…'){app().innerHTML=`<section class="card hero"><div class="spinner"></div><p>${esc(m)}</p></section>`}
function fatal(m,e){console.error(e);app().innerHTML=`<section class="card"><h2>Er ging iets mis</h2><p>${esc(m)}</p><div class="notice red">${esc(e?.message||e)}</div><button class="btn primary full" onclick="location.reload()">Opnieuw</button></section>`}
function topbar(t,b=''){const action=b||(state.room?'leaveRoom()':'returnToPortal()');return `<div class="topbar music-topbar"><button class="music-portal-mark" type="button" onclick="returnToPortal()" aria-label="Terug naar Portal"><img src="../portal/mickey_singing.png" alt="Mickey's Music Match"></button><h1>${esc(t)}</h1><div class="topbar-actions"><button class="iconbtn" type="button" onclick="refreshAll()" aria-label="Vernieuwen">↻</button><button class="iconbtn" type="button" onclick="${action}" aria-label="Terug">←</button></div></div>`}
function C(id){const x=COLORS.find(v=>v[0]===id)||COLORS[0];return{id:x[0],name:x[1],hex:x[2]}}
function A(id){const map={hyperspace:'buzz',big_thunder:'bruno',phantom:'stitch',pirates:'jack',tower:'stitch',star_tours:'buzz',small_world:'linguini',ratatouille:'remy',buzz:'buzz'};const targetId=map[id]||id;const x=AVATARS.find(v=>v[0]===targetId)||AVATARS[0];const isImg=x[2].includes('/')||x[2].endsWith('.webp')||x[2].endsWith('.png');const iconHtml=isImg?`<img src="${x[2]}" class="avatar-img-inline avatar-id-${x[0]}" onload="removeBg(this)" alt="${x[1]}">`:x[2];return{id:x[0],name:x[1],icon:iconHtml,power:x[3]}}
function P(id){const x=POWERS_EXPLAIN.find(v=>v.id===id)||{id:'',name:'Onbekend',icon:'❓',desc:''};const isImg=x.icon.includes('/')||x.icon.endsWith('.png');const iconHtml=isImg?`<img src="${x.icon}" class="attraction-img-inline" onload="removeBg(this)" alt="${x.name}">`:x.icon;return{id:x.id,name:x.name,icon:iconHtml,desc:x.desc}}
function online(p){return Object.values(state.presence||{}).flat().some(x=>x.user_id===p.user_id)}
function host(){return state.room?.host_user_id===state.user?.id}
function playingHost(){return host()&&!!state.me}
function facilitatorOnly(){return host()&&!state.me}
function settings(){return{...DEFAULT_SETTINGS,...(state.room?.settings||{}),powers:false}}
function hostLeaderId(){return state.room?.host_user_id||state.user?.id||null}
function leaderId(){const s=settings();if(s.leader_mode==='fixed')return s.fixed_leader_player_id||hostLeaderId()||state.players[0]?.id||null;if(!state.players.length)return null;return state.players[(Math.max(1,state.room.current_round_no||1)-1)%state.players.length]?.id}
function leader(){return state.me?.id===leaderId()||(host()&&settings().leader_mode==='fixed'&&leaderId()===hostLeaderId())}
function leaderName(){const id=leaderId();return state.players.find(p=>p.id===id)?.name||settings().fixed_leader_name||'De spelleider'}
function uniqueTopScorerId(){if(!state.players.length)return null;const top=Math.max(...state.players.map(player=>Number(player.score)||0));const leaders=state.players.filter(player=>(Number(player.score)||0)===top);return leaders.length===1?leaders[0].id:null}
function crownFor(playerId){return uniqueTopScorerId()===playerId?'<span class="score-crown" aria-label="Unieke topscore">👑</span>':''}
function competitionRank(player,players=state.players){const score=Number(player?.score)||0;return 1+new Set(players.filter(other=>(Number(other.score)||0)>score).map(other=>Number(other.score)||0)).size}
function rankMedal(rank){return rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'🎵'}
function finalCoinReward(player){return ({1:10,2:6,3:4}[competitionRank(player)]||2)}
function currentSong(){return state.songs.find(s=>+s.song_number===+state.round?.song_number)}
function own(){return state.answers.find(a=>a.user_id===state.user.id)}
function activeProfileName(){return String(localStorage.getItem('disney_active_profile')||localStorage.getItem('disney_player_name')||'').trim()}
function syncJoinProfile(){state.joinName=activeProfileName();return state.joinName}
function activeProfilePreference(){try{const all=JSON.parse(localStorage.getItem('disney_profile_preferences')||'{}');return all[disneyStarKey(activeProfileName())]||null}catch(e){return null}}
function questionFieldCount(type){if(type==='full')return 3;return ['film','title','year','artist'].filter(key=>type===key||type.includes(key)).length||1}
function answerTimeLimit(type){const choice=settings().answer_time_limit||'auto';if(choice==='none')return 0;if(choice!=='auto')return Number(choice)||0;const fields=questionFieldCount(type);return fields<=2?30:fields===3?45:60}
function maxPowerCardsPerPlayer(){const total=state.lobbySettings.answerTimeLimit==='none'?9:12;return Math.max(1,Math.floor(total/Math.max(state.players.length,1)))}
function disneyStarKey(name){return String(name||'speler').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')||'speler'}
function awardDisneyStars(name,points){const stars=Math.max(0,+points||0);if(stars<=0)return;try{const playerName=name||activeProfileName()||'Speler';const key=disneyStarKey(playerName);const bank=JSON.parse(localStorage.getItem('disney_star_bank')||'{}');bank[key]=(bank[key]||0)+stars;localStorage.setItem('disney_star_bank',JSON.stringify(bank));const cocoBank=JSON.parse(localStorage.getItem('disney_coco_coin_bank')||'{}');cocoBank[key]=(cocoBank[key]||0)+stars;localStorage.setItem('disney_coco_coin_bank',JSON.stringify(cocoBank));const profiles=JSON.parse(localStorage.getItem('disney_coco_profiles')||'[]');const merged=[...profiles,playerName].filter(Boolean).map(v=>String(v).trim());const seen=new Set();const nextProfiles=merged.filter(v=>{const k=disneyStarKey(v);if(!v||seen.has(k))return false;seen.add(k);return true;}).slice(0,12);localStorage.setItem('disney_coco_profiles',JSON.stringify(nextProfiles));localStorage.setItem('disney_active_profile',playerName);localStorage.setItem('disney_player_name',playerName);const logs=JSON.parse(localStorage.getItem('disney_captains_log')||'{}');logs[playerName]=[...(logs[playerName]||[]),{timestamp:new Date().toISOString(),amount:stars,type:'earn',description:"Mickey's Music Match afgerond",balanceAfter:cocoBank[key]}];localStorage.setItem('disney_captains_log',JSON.stringify(logs))}catch(e){}}

function getJackpotValue(){
  if(!state.room?.settings?.jackpot||!state.allRounds||!state.allAnswers)return 0;
  let pool=0;
  const currentNo=state.room.current_round_no;
  for(let idx=0;idx<currentNo-1;idx++){
    const rnd=state.allRounds[idx];
    if(!rnd)continue;
    const answers=state.allAnswers.filter(a=>a.round_id===rnd.id);
    if(answers.length===0){
      pool+=3;
    }else{
      const maxPtsScored=Math.max(...answers.map(a=>a.final_points||0));
      if(maxPtsScored===0){
        pool+=3;
      }else{
        if(maxPtsScored>=2){
          pool=0;
        }
      }
    }
  }
  return pool;
}

function getPlayerTitle(player,s,allAnswers){
  if(!state.room?.settings?.stat_titles){
    const idx=s.findIndex(p=>p.id===player.id);
    return TITLES[Math.min(idx,2)][idx%5];
  }
  const pAnswers=allAnswers.filter(a=>a.player_id===player.id);
  const roundsWithPts=pAnswers.filter(a=>a.final_points>0).length;
  const speedCount=pAnswers.filter(a=>a.answer?.speed_bonus).length;
  let totalDev=0,devCount=0;
  pAnswers.forEach(a=>{
    const sNo=state.allRounds.find(r=>r.id===a.round_id)?.song_number;
    const songObj=state.songs.find(sg=>sg.song_number===sNo);
    if(songObj&&a.answer?.year){
      totalDev+=Math.abs(+a.answer.year-+songObj.year);
      devCount++;
    }
  });
  const avgDev=devCount>0?+(totalDev/devCount).toFixed(1):null;
  const rankIdx=s.findIndex(p=>p.id===player.id);
  if(rankIdx===0)return `🥇 Winnaar · ${roundsWithPts} correcte songs`;
  const allPlayersSpeed=s.map(pl=>({id:pl.id,count:allAnswers.filter(a=>a.player_id===pl.id&&a.answer?.speed_bonus).length})).sort((a,b)=>b.count-a.count);
  if(allPlayersSpeed[0]?.id===player.id&&allPlayersSpeed[0]?.count>0)return `⚡ Snelle Denker · ${speedCount} speed bonuses`;
  if(avgDev!==null&&avgDev<=2.0)return `📅 Tijdreiziger · Gem. slechts ${avgDev} jaar afwijking`;
  if(avgDev!==null&&avgDev>=6.0)return `🌀 Verdwaald in de Tijd · Gem. ${avgDev} jaar afwijking`;
  const zeroRounds=pAnswers.filter(a=>a.final_points===0).length;
  if(zeroRounds>3)return `👻 Phantom · ${zeroRounds} rondes gezocht naar melodie`;
  return `🎶 Muziekliefhebber · ${roundsWithPts} rondes gescoord`;
}

function shuffle(list){
  const items=Array.isArray(list)?[...list]:[];
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}

function activeSongs(){return state.songs.filter(s=>s.enabled&&s.title&&s.film&&s.year&&(s.spotify_url||s.code_image_url))}
function playerList(statusFn){const l=leaderId();return `<div class="playerlist">${state.players.map(p=>{const s=statusFn?statusFn(p):(online(p)?['Online','ok']:['Offline','wait']);const showKick=host()&&state.room&&state.room.status==='lobby';return `<div class="player energy ${p.id===l?'leader':''}" style="--player-color:${p.color}"><div class="playerleft"><span class="avatarbadge">${A(p.avatar_id).icon}</span><div><strong>${esc(p.name)}${crownFor(p.id)}</strong><small>${esc(A(p.avatar_id).name)}</small></div></div><div style="display:flex;align-items:center;"><span class="statuspill ${s[1]}">${esc(s[0])}</span>${showKick?`<button class="btn ghost" style="margin-left:8px;padding:2px 6px;font-size:12px;border-color:#ff6b6b;color:#ff6b6b;width:auto;min-height:auto;border-radius:6px;cursor:pointer;" onclick="kickPlayer('${p.id}')">Verwijder</button>`:''}</div></div>`}).join('')}</div>`}
async function kickPlayer(id){if(!confirm("Weet je zeker dat je deze speler wilt verwijderen?"))return;loading('Speler verwijderen…');let r=await state.sb.from('dmq_players').delete().eq('id',id);if(r.error)toast(r.error.message);await refreshAll()}
function scorebar(){const count=state.players.length;return `<div class="scorebar cols-${count}">${state.players.map(p=>{const isOnline=online(p);const isCurrentLeader=leaderId()===p.id;return `<div class="scorechip ${isCurrentLeader?'leader':''}" style="--chip-color:${p.color}"><div class="avatar-frame"><span class="avatar-emoji">${A(p.avatar_id).icon}</span><span class="status-dot ${isOnline?'online':''}"></span></div><div class="scorechip-name">${esc(p.name)}${crownFor(p.id)}</div><div class="scorechip-score">${p.score||0} ★</div></div>`}).join('')}</div>`}
function progress(){if(!state.room?.total_rounds)return'';let n=state.room.current_round_no||0,t=state.room.total_rounds;return `<div class="progress"><i style="width:${Math.min(100,n/t*100)}%"></i></div><p class="small" style="text-align:center;margin:6px 0 12px">Ronde ${n} van ${t}</p>`}
async function fetchSongs(){let r=await state.sb.from('dmq_songs').select('*').order('song_number');if(r.error)throw r.error;state.songs=r.data||[]}
async function loadRoom(id,show=true){try{if(show)loading('Kamer openen…');let r=await state.sb.from('dmq_rooms').select('*').eq('id',id).single();if(r.error)return false;let p=await state.sb.from('dmq_players').select('*').eq('room_id',id).order('joined_at');if(p.error)throw p.error;const players=p.data||[];const me=players.find(x=>x.user_id===state.user.id)||null;const isHost=r.data.host_user_id===state.user.id;if(!isHost&&!me){localStorage.removeItem('dmq-v2-room');return false}state.room=r.data;state.players=players;state.me=me;localStorage.setItem('dmq-v2-room',id);await fetchRound();subscribe();render();return true}catch(e){console.error(e);return false}}
async function fetchRound(){if(!state.room?.current_round_no)return;let r=await state.sb.from('dmq_rounds').select('*').eq('room_id',state.room.id).eq('round_no',state.room.current_round_no).maybeSingle();if(r.error)throw r.error;if(r.data && (!state.round || state.round.id !== r.data.id)){state.currentAnswer={film:'',title:'',year:'',text:'',artist:'',year_period:null};state.answerPhaseStartedAt=null;state.reviewFinalPoints=null;state.reviewCorrectionNote=null}state.round=r.data;if(r.data){let a=await state.sb.from('dmq_answers').select('*').eq('round_id',r.data.id);if(a.error)throw a.error;state.answers=(a.data||[]).map(answer=>({...answer,note:answer.correction_note||''}));let allRResult=await state.sb.from('dmq_rounds').select('*').eq('room_id',state.room.id).order('round_no',{ascending:true});state.allRounds=allRResult.data||[];let allAResult=await state.sb.from('dmq_answers').select('*').eq('room_id',state.room.id);state.allAnswers=allAResult.data||[]}}
let rt=null;function schedule(){clearTimeout(rt);rt=setTimeout(refreshAll,130)}
async function refreshAll(){if(state.refreshing)return;if(!state.room){const nextUrl=new URL(location.href);nextUrl.searchParams.set('v',DMQ_VERSION);nextUrl.searchParams.set('refresh',Date.now().toString());location.replace(nextUrl.toString());return}state.refreshing=true;try{let r=await state.sb.from('dmq_rooms').select('*').eq('id',state.room.id).single();let p=await state.sb.from('dmq_players').select('*').eq('room_id',state.room.id).order('joined_at');if(r.data)state.room=r.data;if(p.data){state.players=p.data;state.me=p.data.find(x=>x.user_id===state.user.id)||state.me}await fetchRound();if(state.round?.active_power && state.lastShownPower !== state.round.active_power){const activator=state.players.find(pl=>pl.id===state.round.power_used_by_player_id)?.name||'Iemand';playPowerTakeover(state.round.active_power,activator);state.lastShownPower=state.round.active_power}else if(!state.round?.active_power){state.lastShownPower=null}render()}finally{state.refreshing=false}}
function subscribe(){cleanup();state.channel=state.sb.channel('dmq2-'+state.room.id,{config:{presence:{key:state.user.id}}}).on('presence',{event:'sync'},()=>{state.presence=state.channel.presenceState();render()}).on('postgres_changes',{event:'*',schema:'public',table:'dmq_rooms',filter:`id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_players',filter:`room_id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_rounds',filter:`room_id=eq.${state.room.id}`},schedule).on('postgres_changes',{event:'*',schema:'public',table:'dmq_answers',filter:`room_id=eq.${state.room.id}`},schedule).subscribe(async s=>{if(s==='SUBSCRIBED')await state.channel.track({user_id:state.user.id,name:state.me?.name||'organisator'})});state.poll=setInterval(refreshAll,4500)}
function cleanup(){if(state.poll)clearInterval(state.poll);state.poll=null;if(state.channel&&state.sb)state.sb.removeChannel(state.channel).catch(()=>{});state.channel=null}
function cleanupAll(){cleanup();if(state.profilePoll)clearInterval(state.profilePoll);state.profilePoll=null;window.removeEventListener('focus',refreshMusicProfileWhenActive);document.removeEventListener('visibilitychange',refreshMusicProfileWhenActive)}
function render(){
  renderGlobalMusicHeader();
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
    if(state.round.phase==='review')prepareReviewState();
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

function returnToPortal(){window.location.href='../?portal=1'}
function renderHome(){app().innerHTML=`<section class="card hero music-home-hero"><button class="music-hero-mark" type="button" onclick="returnToPortal()" aria-label="Terug naar Portal"><img src="../portal/mickey_singing.png" alt="Mickey's Music Match"></button><div class="badge">Origineel: Disney Music Quiz</div><h1><span>Mickey's</span> <span class="music-accent">Music Match</span></h1><p>Start een kamer en laat medespelers met hun gekozen Disney-profiel aansluiten.</p></section><section class="card hostcard"><h2>Spel organiseren</h2><p>Jij telt niet automatisch mee als speler.</p><button class="btn primary full" onclick="createRoom()">Nieuwe game maken</button></section><section class="card"><h2>Meedoen of hervatten</h2><div class="field"><label>Kamercode</label><input id="homeCode" maxlength="6" autocapitalize="characters" value="${esc(state.joinCode)}"></div><button class="btn secondary full" onclick="goJoin()">Deelnemen als nieuwe speler</button><button class="btn ghost full" style="margin-top:10px" onclick="resumePlayer()">Hervat als speler</button><button class="btn ghost full" style="margin-top:10px" onclick="resumeHost()">Hervat als organisator</button><p class="small muted" style="margin:12px 0 0">Hervatten opent de bestaande kamer precies bij de huidige ronde en score.</p></section><section class="card"><button class="btn ghost full" onclick="state.view='admin';render()">⚙️ Songbeheer · 300 songs</button></section>`}
function homeCode(){return (document.getElementById('homeCode')?.value||'').trim().toUpperCase()}
async function goJoin(){state.joinCode=homeCode();state.view='join';loading('Vrije kleuren en avatars laden…');await loadJoinChoices(state.joinCode);render()}
async function resumeHost(){const code=homeCode();if(!code){toast('Vul de kamercode in.');return}loading('Organisatorrol herstellen…');const r=await state.sb.rpc('dmq_resume_host',{p_code:code});if(r.error){fatal('Hervatten als organisator mislukt.',r.error);return}const row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?host=${code}&v=${DMQ_VERSION}`);await loadRoom(row.room_id||row,false)}
async function resumePlayer(){const code=homeCode();const name=activeProfileName();if(!code||!name){toast('Kies eerst een Disney-profiel en vul de kamercode in.');return}loading('Speler herstellen…');const r=await state.sb.rpc('dmq_resume_player',{p_code:code,p_player_name:name});if(r.error){fatal('Hervatten als speler mislukt.',r.error);return}const row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?room=${code}&v=${DMQ_VERSION}`);await loadRoom(row.room_id,false)}
function rememberJoinFields(){
  const code=document.getElementById('joinCode');
  if(code) state.joinCode=(code.value||'').trim().toUpperCase();
  syncJoinProfile();
}
async function chooseJoinColor(id){rememberJoinFields();state.joinColor=id;await loadJoinChoices(state.joinCode);renderJoin()}
async function chooseJoinAvatar(id){rememberJoinFields();state.joinAvatar=id;await loadJoinChoices(state.joinCode);renderJoin()}
function renderJoin(){
if(state.joinColor&&state.players.some(p=>p.color_id===state.joinColor))state.joinColor=null;
if(state.joinAvatar&&state.players.some(p=>p.avatar_id===state.joinAvatar))state.joinAvatar=null;
const profileName=syncJoinProfile();
const preference=activeProfilePreference();
if(preference?.color)state.joinColor=preference.color;
if(preference?.avatar)state.joinAvatar=preference.avatar;
const profileColor=C(state.joinColor||'blue'),profileAvatar=A(state.joinAvatar||'miguel');
app().innerHTML=`${topbar('Deelnemen',"state.view='home';render()")}
<section class="card"><div class="field"><label>Kamercode</label><input id="joinCode" maxlength="6" autocapitalize="characters" value="${esc(state.joinCode)}"></div><div class="notice blue">Je speelt als <strong>${esc(profileName||'kies eerst een profiel in de portal')}</strong>.</div><div class="player energy" style="--player-color:${profileColor.hex}"><div class="playerleft"><span class="avatarbadge">${profileAvatar.icon}</span><div><strong>${esc(profileName||'Geen profiel')}</strong><small>${esc(profileAvatar.name)} · ${esc(profileColor.name)}</small></div></div></div><p class="small muted">Avatar en kleur wijzig je via je profiel in de portal.</p></section>
<section class="card"><button class="btn primary full" onclick="joinRoom()">Deelnemen</button></section>`;
return;
app().innerHTML=`${topbar('Deelnemen',"state.view='home';render()")}
<section class="card"><div class="field"><label>Kamercode</label><input id="joinCode" maxlength="6" autocapitalize="characters" value="${esc(state.joinCode)}"></div><div class="notice blue">Je speelt als <strong>${esc(profileName||'kies eerst een profiel in de portal')}</strong>.</div></section>
<section class="card"><h2>Kies een kleur</h2><div class="choicegrid">${COLORS.map(x=>{let taken=state.players.some(p=>p.color_id===x[0]);return `<button class="colorchoice ${state.joinColor===x[0]?'selected':''} ${taken?'taken':''}" style="--choice:${x[2]}" ${taken?'disabled':''} onclick="chooseJoinColor('${x[0]}')"><span class="colororb"></span>${x[1]}</button>`}).join('')}</div></section>
<section class="card"><h2>Kies een Disney-karakter</h2><div class="avatargrid">${AVATARS.map(x=>{let taken=state.players.some(p=>p.avatar_id===x[0]);let c=state.joinColor?C(state.joinColor):null;let choiceStyle=c?`style="--choice:${c.hex}"`:'';return `<button class="avatarchoice ${state.joinAvatar===x[0]?'selected':''} ${taken?'taken':''}" ${choiceStyle} ${taken?'disabled':''} onclick="chooseJoinAvatar('${x[0]}')"><span class="avataricon">${A(x[0]).icon}</span>${x[1]}</button>`}).join('')}</div></section><section class="card"><h2>Magische Attractiekaarten</h2><p class="small muted" style="margin-bottom:12px">Tijdens het spel krijgt elke speler 3 willekeurige kaarten toebedeeld:</p><div style="display:grid;gap:8px">${POWERS_EXPLAIN.map(x=>`<div style="display:flex;align-items:flex-start;gap:12px;font-size:12px;background:rgba(25,50,90,0.2);padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.06)"><span class="power-list-icon">${P(x.id).icon}</span><div style="text-align:left"><strong style="display:block;margin-bottom:4px;font-size:13px;color:var(--gold);">${esc(x.name)}</strong><span class="muted" style="font-size:11.5px;line-height:1.4;display:block;">${esc(x.desc)}</span></div></div>`).join('')}</div></section><section class="card"><button class="btn primary full" onclick="joinRoom()">Bevestigen</button></section>`}
async function createRoom(){loading('Kamer maken…');let r=await state.sb.rpc('dmq_create_host_room');if(r.error){fatal('Kamer maken mislukt.',r.error);return}let row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?host=${row.room_code}&v=${DMQ_VERSION}`);await loadRoom(row.room_id,false)}
async function setHostParticipation(plays){if(!host()||state.room?.status!=='lobby')return;if(plays&&state.me)return;if(!plays&&!state.me)return;loading(plays?'Organisator als speler toevoegen…':'Organisator uit spelerslijst halen…');if(!plays){const removed=await state.sb.rpc('dmq_host_remove_player',{p_room_id:state.room.id,p_player_id:state.me.id});if(removed.error){fatal('Spelersrol wijzigen mislukt.',removed.error);return}await refreshAll();return}const preference=activeProfilePreference()||{};const preferredColor=preference.color||preference.color_id;const preferredAvatar=preference.avatar||preference.avatar_id;const freeColor=[preferredColor,...COLORS.map(item=>item[0])].find(id=>id&&!state.players.some(player=>player.color_id===id));const freeAvatar=[preferredAvatar,...AVATARS.map(item=>item[0])].find(id=>id&&!state.players.some(player=>player.avatar_id===id));if(!freeColor||!freeAvatar){state.refreshing=false;toast('Er is geen vrije kleur of avatar beschikbaar.');renderLobby();return}const color=C(freeColor);const joined=await state.sb.rpc('dmq_join_room_v2',{p_code:state.room.code,p_player_name:activeProfileName()||'Organisator',p_color_id:color.id,p_color:color.hex,p_avatar_id:freeAvatar});if(joined.error){fatal('Organisator als speler toevoegen mislukt.',joined.error);return}await refreshAll()}
async function joinRoom(){state.joinCode=(document.getElementById('joinCode').value||'').trim().toUpperCase();state.joinName=syncJoinProfile();if(!state.joinCode||!state.joinName||!state.joinColor||!state.joinAvatar){toast('Kies eerst een profiel, kleur en Disney-karakter.');return}let c=C(state.joinColor);loading('Deelnemen…');let r=await state.sb.rpc('dmq_join_room_v2',{p_code:state.joinCode,p_player_name:state.joinName,p_color_id:c.id,p_color:c.hex,p_avatar_id:state.joinAvatar});if(r.error){fatal('Deelnemen mislukt.',r.error);return}let row=Array.isArray(r.data)?r.data[0]:r.data;history.replaceState(null,'',`${location.pathname}?room=${state.joinCode}&v=${DMQ_VERSION}`);await loadRoom(row.room_id,false)}
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
      <button class="btn ghost full" style="margin-top:9px" onclick="openSongAdminFromLobby()">⚙️ Songbeheer · 300 songs openen</button>
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
  if(state.lobbySettings.answerTimeLimit==='none'){
    state.lobbySettings.cards_per_player=2;
    return;
  }
  const count=state.lobbySettings.cards_per_player||3;
  const maxAllowed=maxPowerCardsPerPlayer();
  if(count>maxAllowed){
    state.lobbySettings.cards_per_player=Math.min(3,maxAllowed);
  }
}
function prepareReviewState(){if(state.reviewFinalPoints!==null||facilitatorOnly())return;const mine=own();if(!mine)return;let proposed=Number(mine.final_points)||0;const bet=Number(mine.answer?.final_bet)||0;const isFinal=state.room?.current_round_no===state.room?.total_rounds;if(isFinal&&state.room?.settings?.final_bet&&bet>0&&proposed===0)proposed=-bet;state.reviewFinalPoints=proposed}

function adjustRoundCount(delta){state.lobbySettings.roundCount=Math.max(1,Math.min(100,(Number(state.lobbySettings.roundCount)||1)+delta));renderLobby()}

function renderLobby(){
  validateCardsCount();
  const activeCount=activeSongs().length,ready=startReadiness(state.lobbySettings.roundCount);
  const organizerOption={id:hostLeaderId(),name:`${activeProfileName()||'Organisator'} (organisator)`};
  const leaderOptions=host()?[...(playingHost()?[]:[organizerOption]),...state.players.map(p=>({id:p.id,name:p.name}))]:state.players.map(p=>({id:p.id,name:p.name}));
  if(!leaderOptions.some(option=>option.id===state.lobbySettings.fixedLeader)) {
    state.lobbySettings.fixedLeader=leaderOptions[0]?.id||null;
  }
  app().innerHTML=`${topbar('Wachtruimte','leaveRoom()')}
  <section class="card hero"><div class="badge">Kamercode</div><div class="roomcode">${esc(state.room.code)}</div><p>Laat spelers deze kamercode invullen. Hun profielavatar en spelerskleur worden automatisch gebruikt.</p></section>
  <section class="card"><h2>Spelers · ${state.players.length}/6</h2>${playerList()}
    ${!ready.enoughPlayers?`<div class="notice blue">Minimaal twee spelers nodig.</div>`:''}
    ${ready.enoughPlayers&&!ready.allOnline?`<div class="notice red">Niet alle spelers worden als online gezien. Laat iedereen de wachtruimte openhouden en druk op ↻.</div>`:''}
  </section>
  ${host()?`<section class="card hostcard"><h2>Spelinstellingen</h2>
    <label class="toggleline"><span><strong>Ik speel zelf mee</strong><small class="muted" style="display:block">Uit: aparte organisator · Aan: organisator én speler</small></span><input type="checkbox" ${playingHost()?'checked':''} onchange="setHostParticipation(this.checked)"></label>
    <div class="grid2">
      <div class="field"><label>Aantal songs</label>
        <div style="display:flex;align-items:center;gap:10px"><button class="iconbtn" type="button" aria-label="Een song minder" onclick="adjustRoundCount(-1)">-</button><output style="min-width:42px;text-align:center;font-size:22px;font-weight:900;color:var(--gold)">${state.lobbySettings.roundCount}</output><button class="iconbtn" type="button" aria-label="Een song meer" onclick="adjustRoundCount(1)">+</button></div>
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
    <div class="notice blue">Music Match wordt zonder antwoordtimer gespeeld. Iedereen kan rustig invullen en bevestigen.</div>
    <div class="field" style="margin-top:10px"><label>Spelleider</label>
        <select id="leaderMode" onchange="state.lobbySettings.leaderMode = this.value; renderLobby();">
          <option value="rotating" ${state.lobbySettings.leaderMode === 'rotating'?'selected':''}>Roulerend</option>
          <option value="fixed" ${state.lobbySettings.leaderMode === 'fixed'?'selected':''}>Vast</option>
        </select>
    </div>
    <div class="field" id="fixedLeaderWrap" style="display: ${state.lobbySettings.leaderMode === 'fixed' ? 'block' : 'none'}">
      <label>Vaste spelleider</label>
      <select id="fixedLeader" onchange="state.lobbySettings.fixedLeader = this.value; renderLobby();">
        ${leaderOptions.map(option=>`<option value="${option.id}" ${state.lobbySettings.fixedLeader === option.id ? 'selected' : ''}>${esc(option.name)}</option>`).join('')}
      </select>
      <small class="muted">De organisator kan de vaste spelleider zijn zonder zelf mee te spelen.</small>
    </div>
    <h3>Extra spelregels</h3>
    ${toggle('streaks','Muzikale streaks',state.lobbySettings.streaks,'streaks')}
    ${toggle('jackpot','Soundtrack Jackpot',state.lobbySettings.jackpot,'jackpot')}
    ${toggle('stats','Extra statistiektitels',state.lobbySettings.stat_titles,'stat_titles')}
    ${toggle('bet','Geheime inzet finale',state.lobbySettings.final_bet,'final_bet')}
    ${toggle('anim','Feestelijke animaties',state.lobbySettings.animations,'animations')}
    <div class="notice blue">Attractiekrachten zijn uitgeschakeld. Music Match draait volledig om de muziekkennis en de geheime finale-inzet.</div>
    <div class="notice ${activeCount>=state.lobbySettings.roundCount?'green':'red'}"><strong>${activeCount} actieve songs beschikbaar.</strong> Voor ${state.lobbySettings.roundCount} rondes zijn minimaal ${state.lobbySettings.roundCount} actieve songs met titel, film, jaar en Spotify-link/scancode nodig.</div>
    ${state.startError?`<div class="notice red"><strong>Starten lukt niet:</strong> ${esc(state.startError)}</div>`:''}
    <div class="notice blue">Na starten kun jij naar Hitster wisselen.</div>
    <button class="btn primary full" ${ready.can?'':'disabled'} onclick="startGame()">Start Mickey's Music Match</button>
  </section>`:'<section class="card"><div class="notice blue">De organisator start de game.</div></section>'}
  ${organizerPanel()}`;
}
function getSongPopularity(s){
  if(s.question_profile)return s.question_profile==='iconic'?'high':s.question_profile==='deep'||s.question_profile==='score'?'low':'medium';
  const n=Number(s.song_number);
  const high=[1,2,3,4,5,6,9,10,11,12,15,16,17,20,21,22,25,26,30,31,40,43,47,48,96,97,100,
               101,102,103,104,107,108,110,113,115,119,122,126,127,130,132,134,135,143,144,147,148,149,150];
  const low=[38,39,45,46,54,55,59,61,62,65,66,69,71,74,77,81,82,84,85,86,87,88,89,90,91,93,94,95,99,
              105,106,109,111,112,114,116,117,118,120,121,123,124,125,128,129,131,133,136,137,138,139,140,141,142,145,146];
  if(high.includes(n))return 'high';
  if(low.includes(n))return 'low';
  return 'medium';
}
function qtype(mode,s){
  const allowed=Array.isArray(s.allowed_questions)&&s.allowed_questions.length?s.allowed_questions:['film','title','year','artist'];
  // Instrumentale herkenningsrondes vragen uitsluitend naar de film. De titel,
  // uitvoerder of het jaartal van achtergrondmuziek is onnodig specialistisch.
  if(s.question_profile==='score')return 'film';
  if(mode!=='mix')return mode;
  const pop=getSongPopularity(s);
  if(pop==='low'){
    const opts=['year','title','film'].filter(type=>allowed.includes(type));
    return opts[Math.floor(Math.random()*opts.length)];
  }
  if(pop==='medium'){
    const opts=['year_film','year_title','film_title'].filter(type=>type.split('_').every(part=>allowed.includes(part)));
    return opts[Math.floor(Math.random()*opts.length)];
  }
  const opts=['year_film_artist','year_title_artist','film_title_artist','full'].filter(type=>(type==='full'?['film','title','year']:type.split('_')).every(part=>allowed.includes(part)));
  return opts[Math.floor(Math.random()*opts.length)];
}
function songSupportsMode(song,mode){
  if(mode==='mix')return true;
  const allowed=Array.isArray(song.allowed_questions)&&song.allowed_questions.length?song.allowed_questions:['film','title','year','artist'];
  if(mode==='full')return ['film','title','year'].every(type=>allowed.includes(type));
  return allowed.includes(mode);
}
async function musicUsedSongNumbers(){
  try{
    const result=await state.sb.from('rooms').select('current_task_state').eq('code','COCO-PROFILES-V1').maybeSingle();
    if(result.error)throw result.error;
    const usage=result.data?.current_task_state?.coco_content_usage||{};
    const numbers=state.players.flatMap(player=>usage[profileStorageKey(player.name)]?.['music-match']||[]);
    return [...new Set(numbers.map(Number).filter(Number.isFinite))];
  }catch(error){
    console.warn('Muziekhistorie kon niet worden gelezen.',error);
    return [];
  }
}
async function markMusicSongsUsed(songNumbers){
  const numbers=[...new Set((songNumbers||[]).map(Number).filter(Number.isFinite))];
  const profileNames=[...new Set(state.players.map(player=>String(player.name||'').trim()).filter(Boolean))];
  if(!numbers.length||!profileNames.length)return;
  for(let attempt=0;attempt<4;attempt++){
    try{
      const result=await state.sb.from('rooms').select('id,current_task_state').eq('code','COCO-PROFILES-V1').maybeSingle();
      if(result.error)throw result.error;
      const row=result.data;
      if(!row)return;
      const current=row.current_task_state||{};
      const usage={...(current.coco_content_usage||{})};
      profileNames.forEach(profileName=>{
        const key=profileStorageKey(profileName);
        const profileUsage={...(usage[key]||{})};
        profileUsage['music-match']=[...new Set([...(profileUsage['music-match']||[]).map(Number),...numbers])].slice(-600);
        usage[key]=profileUsage;
      });
      const updatedAt=new Date().toISOString();
      const next={...current,coco_content_usage:usage,updated_at:updatedAt};
      let update=state.sb.from('rooms').update({current_task_state:next}).eq('id',row.id);
      if(current.updated_at)update=update.eq('current_task_state->>updated_at',String(current.updated_at));
      const saved=await update.select('id').maybeSingle();
      if(saved.error)throw saved.error;
      if(saved.data){localStorage.setItem('disney_content_usage',JSON.stringify(usage));return;}
    }catch(error){
      if(attempt===3)console.warn('Muziekhistorie kon niet worden opgeslagen.',error);
    }
  }
}
function buildSongSequence(total,mode,usedSongNumbers=[]){
  const eligible=activeSongs().filter(song=>songSupportsMode(song,mode));
  const used=new Set(usedSongNumbers.map(Number));
  const freshFirst=songs=>[
    ...shuffle(songs.filter(song=>!used.has(Number(song.song_number)))),
    ...shuffle(songs.filter(song=>used.has(Number(song.song_number))))
  ];
  const vocals=freshFirst(eligible.filter(song=>song.question_profile!=='score'));
  const scores=freshFirst(eligible.filter(song=>song.question_profile==='score'));
  // Strikte bovengrens: hoogstens één instrumental per volledige tien rondes.
  // Een spel korter dan tien rondes bevat dus geen instrumental.
  const instrumentalCount=(mode==='mix'||mode==='film')?Math.min(scores.length,Math.floor(total/10)):0;
  if(vocals.length<total-instrumentalCount)return [];
  const result=[];
  let vocalIndex=0;
  let scoreIndex=0;
  for(let blockStart=0;blockStart<total;blockStart+=10){
    const blockSize=Math.min(10,total-blockStart);
    const useInstrumental=scoreIndex<instrumentalCount;
    const instrumentalPosition=useInstrumental?Math.floor(Math.random()*blockSize):-1;
    for(let position=0;position<blockSize;position++){
      if(position===instrumentalPosition)result.push(scores[scoreIndex++]);
      else result.push(vocals[vocalIndex++]);
    }
  }
  return result;
}
async function startGame(){
  state.startError='';
  try{
    const total=state.lobbySettings.roundCount||5;
    const mode=state.lobbySettings.gameMode||'mix';
    const usedSongs=await musicUsedSongNumbers();
    const songs=buildSongSequence(total,mode,usedSongs);
    if(state.players.length<2)throw new Error('Er zijn minimaal twee spelers nodig.');
    if(!state.players.every(online))throw new Error('Niet alle spelers worden als online gezien. Laat iedereen de wachtruimte openhouden en druk op ↻.');
    if(songs.length<total)throw new Error(`Er zijn ${songs.length} actieve songs, maar je hebt ${total} rondes gekozen. Activeer meer songs in Songbeheer · 300 songs.`);
    const lm=state.lobbySettings.leaderMode||'rotating';
    const answerTimeLimit='none';
    const fixedLeaderId=state.lobbySettings.fixedLeader||hostLeaderId()||state.players[0]?.id||null;
    const fixedLeaderName=fixedLeaderId===hostLeaderId()?(activeProfileName()||'Organisator'):state.players.find(player=>player.id===fixedLeaderId)?.name||null;
    const set={
      streaks:state.lobbySettings.streaks,
      powers:false,
      quick_guess:answerTimeLimit!=='none',
      answer_time_limit:answerTimeLimit,
      jackpot:state.lobbySettings.jackpot,
      stat_titles:state.lobbySettings.stat_titles,
      final_bet:state.lobbySettings.final_bet,
      animations:state.lobbySettings.animations,
      leader_mode:lm,
      fixed_leader_player_id:lm==='fixed'?fixedLeaderId:null,
      fixed_leader_name:lm==='fixed'?fixedLeaderName:null,
      cards_per_player:answerTimeLimit==='none'?2:(state.lobbySettings.cards_per_player||3)
    };
    loading('Game starten…');
    const r=await state.sb.rpc('dmq_start_game_v2',{p_room_id:state.room.id,p_total_rounds:total,p_game_mode:mode,p_song_sequence:songs.map(s=>s.song_number),p_question_sequence:songs.map(s=>qtype(mode,s)),p_settings:set});
    if(r.error)throw r.error;
    await markMusicSongsUsed(songs.map(song=>song.song_number));
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

function rules(type,p=null){const x=[];if(type==='film')x.push('Juiste film: +2');else if(type==='title')x.push('Juiste titel: +2');else if(type==='artist')x.push('Juiste uitvoerder: +2');else{if(type==='full'||type.includes('film'))x.push('Juiste film: +1');if(type==='full'||type.includes('title'))x.push('Juiste titel: +1');if(type.includes('artist'))x.push('Juiste uitvoerder: +1');if(type==='full'||type.includes('year')||type==='year'){x.push('Juiste periode van vijf jaar: +1');x.push('Exact filmjaar: +1 extra')}}if(p)x.push('Een geactiveerde Attractiekracht kan de score aanpassen.');return `<div class="rulebox"><h3>Punten deze ronde</h3>${x.map(value=>`<div>• ${value}</div>`).join('')}<div><strong>Maximum: ${maxPoints(type,p,state.me?.id)}</strong></div></div>`}
function myAccentColor(){if(facilitatorOnly())return'#ffd45c';return state.me?.color||'#ffd45c'}
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
      const unavailableWithoutTimer=settings().answer_time_limit==='none'&&TIME_POWER_IDS.has(pName);
      let classes=['power-card'];
      if(isUsed) classes.push('used');
      if(isActive) classes.push('active');
      if(isBlocked) classes.push('blocked');
      let clickAction='';
      if(unavailableWithoutTimer){
        clickAction=`toast('Deze kracht is alleen beschikbaar met tijdsdruk.')`;
        classes.push('used');
      }else if(!isUsed){
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
function renderClaim(){let s=currentSong(),claimed=state.round.claimed_by_user_id,mine=claimed===state.user.id,cp=state.players.find(p=>p.user_id===claimed);app().innerHTML=`${topbar('Song starten')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="badge">${esc(state.round.question_type)}</div><div class="songnumber">${esc(s?.label||'Song')}</div><p>Scan de code: deze opent direct de juiste Spotify-track, zonder zoekpagina.</p><div class="qrwrap" id="qrArea"></div>${rules(state.round.question_type,power())}${powerButton()}${!claimed?'<button class="btn primary full" onclick="claimSong()">▶ De juiste song wordt afgespeeld</button>':mine?'<div class="notice green">🔊 De song is gestart. Het antwoordscherm wordt geopend…</div>':`<div class="notice blue">${esc(cp?.name||'Een speler')} start de song.</div>${leader()?'<button class="btn ghost full" onclick="releaseSong()">Claim vrijgeven</button>':''}`}</section>`;setTimeout(()=>showCode(s),0)}
function showCode(s){let e=document.getElementById('qrArea');if(!e)return;e.innerHTML='';if(s?.spotify_url&&window.QRCode)new window.QRCode(e,{text:s.spotify_url,width:200,height:200,colorDark:'#07152e',colorLight:'#fff'});else if(s?.code_image_url)e.innerHTML=`<img src="${esc(s.code_image_url)}">`;else e.innerHTML='<div class="qrplaceholder">Nog geen directe Spotify-track ingesteld.</div>'}
async function claimSong(){let r=await state.sb.rpc('dmq_claim_song',{p_round_id:state.round.id});if(r.error){toast(r.error.message);return}if(!r.data){toast('Iemand anders was sneller.');return}let playing=await state.sb.rpc('dmq_confirm_playing',{p_round_id:state.round.id});if(playing.error){await state.sb.rpc('dmq_release_song',{p_round_id:state.round.id});toast(`Song starten mislukt: ${playing.error.message}`)}else schedule()}
async function releaseSong(){let r=await state.sb.rpc('dmq_release_song',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else schedule()}
async function confirmPlaying(){let r=await state.sb.rpc('dmq_confirm_playing',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else schedule()}
function prompt(t){
  return {
    full:'Welke film, welke titel en welk filmjaar?',
    film:'Uit welke film komt dit lied?',
    title:'Hoe heet dit lied?',
    year:'In welk jaar verscheen de film?',
    artist:'Wie zingt of voert dit uit?',
    year_film:'Welke film en welk filmjaar?',
    year_title:'Welke titel en welk filmjaar?',
    film_title:'Welke film en welke titel?',
    year_film_artist:'Welke film, welk filmjaar en wie zingt of voert dit uit?',
    year_title_artist:'Welke titel, welk filmjaar en wie zingt of voert dit uit?',
    film_title_artist:'Welke film, welke titel en wie zingt of voert dit uit?'
  }[t] || 'Beantwoord de vragen:';
}
function yearPeriodOptions(song=currentSong()){const year=Number(song?.year)||2000;const correctStart=Math.floor((year-1)/5)*5+1;const correctSlot=((Number(song?.song_number)||0)+(Number(state.room?.current_round_no)||0))%3;const firstStart=correctStart-(correctSlot*5);return Array.from({length:3},(_,index)=>{const start=firstStart+(index*5);return{id:`${start}-${start+4}`,label:`${start}–${start+4}`}})}
function yearFields(a={}){const selected=state.currentAnswer.year_period!==undefined?state.currentAnswer.year_period:(a.year_period||'');const yearValue=state.currentAnswer.year!==undefined?state.currentAnswer.year:(a.year||'');return `<div class="field"><label>Kies eerst de periode van vijf jaar</label><div class="yearchoices">${yearPeriodOptions().map(period=>`<button type="button" class="yearbtn ${selected===period.id?'selected':''}" onclick="state.currentAnswer.year_period='${period.id}';render()">${period.label}</button>`).join('')}</div></div><div class="field"><label>Exact filmjaar (optioneel, +1 extra)</label><input id="ansYear" type="number" inputmode="numeric" value="${esc(yearValue)}" oninput="state.currentAnswer.year=this.value"></div>`}
function form(t,a={}){
  const fVal=state.currentAnswer.film!==undefined?state.currentAnswer.film:(a.film||'');
  const tVal=state.currentAnswer.title!==undefined?state.currentAnswer.title:(a.title||'');
  const yVal=state.currentAnswer.year!==undefined?state.currentAnswer.year:(a.year||'');
  const artVal=state.currentAnswer.artist!==undefined?state.currentAnswer.artist:(a.artist||'');
  const txVal=state.currentAnswer.text!==undefined?state.currentAnswer.text:(a[t]||'');
  
  let html = '';
  const reqFilm = t === 'full' || t.includes('film') || t === 'film';
  const reqTitle = t === 'full' || t.includes('title') || t === 'title';
  const reqYear = t === 'full' || t.includes('year') || t === 'year';
  const reqArtist = t.includes('artist') || t === 'artist';
  const isSingle = !t.includes('_') && t !== 'full';
  
  if (isSingle) {
    if (t === 'film') return `<div class="field"><label>Film</label><input id="ansFilm" value="${esc(fVal)}" oninput="state.currentAnswer.film=this.value"></div>`;
    if (t === 'title') return `<div class="field"><label>Titel</label><input id="ansTitle" value="${esc(tVal)}" oninput="state.currentAnswer.title=this.value"></div>`;
    if (t === 'year') return yearFields(a);
    if (t === 'artist') return `<div class="field"><label>Uitvoerder</label><input id="ansArtist" value="${esc(artVal)}" oninput="state.currentAnswer.artist=this.value"></div>`;
    return `<div class="field"><label>Antwoord</label><input id="ansText" value="${esc(txVal)}" oninput="state.currentAnswer.text=this.value"></div>`;
  }
  
  if (reqFilm) html += `<div class="field"><label>Film</label><input id="ansFilm" value="${esc(fVal)}" oninput="state.currentAnswer.film=this.value"></div>`;
  if (reqTitle) html += `<div class="field"><label>Titel</label><input id="ansTitle" value="${esc(tVal)}" oninput="state.currentAnswer.title=this.value"></div>`;
  if (reqYear) html += yearFields(a);
  if (reqArtist) html += `<div class="field"><label>Uitvoerder</label><input id="ansArtist" value="${esc(artVal)}" oninput="state.currentAnswer.artist=this.value"></div>`;
  return html;
}
function collect(t){
  const reqFilm = t === 'full' || t.includes('film') || t === 'film';
  const reqTitle = t === 'full' || t.includes('title') || t === 'title';
  const reqYear = t === 'full' || t.includes('year') || t === 'year';
  const reqArtist = t.includes('artist') || t === 'artist';
  
  let res = {};
  const fieldValue = id => document.getElementById(id)?.value?.trim() || '';
  if (reqFilm) res.film = fieldValue('ansFilm');
  if (reqTitle) res.title = fieldValue('ansTitle');
  if (reqYear) {res.year=+fieldValue('ansYear')||null;res.year_period=state.currentAnswer.year_period||null}
  if (reqArtist) res.artist = fieldValue('ansArtist');
  
  if (!reqFilm && !reqTitle && !reqYear && !reqArtist) {
    res[t] = fieldValue('ansText');
  }
  if (state.currentAnswer.final_bet !== undefined) {
    res.final_bet = state.currentAnswer.final_bet;
  }
  return res;
}
function filled(t,a){
  const reqFilm = t === 'full' || t.includes('film') || t === 'film';
  const reqTitle = t === 'full' || t.includes('title') || t === 'title';
  const reqYear = t === 'full' || t.includes('year') || t === 'year';
  const reqArtist = t.includes('artist') || t === 'artist';
  
  if (reqFilm && !a.film) return false;
  if (reqTitle && !a.title) return false;
  if (reqYear && !a.year_period) return false;
  if (reqArtist && !a.artist) return false;
  if (!reqFilm && !reqTitle && !reqYear && !reqArtist) {
    return !!a[t];
  }
  return true;
}
function renderAnswer(){
  if(!state.answerPhaseStartedAt)state.answerPhaseStartedAt=Date.now();
  let mine=own(),done=new Set(state.answers.map(a=>a.user_id)),all=state.answers.length===state.players.length;
  const isFinalRound = state.room.current_round_no === state.room.total_rounds;
  const needFinalBet = state.room.settings?.final_bet && isFinalRound && !facilitatorOnly() && !mine && state.currentAnswer.final_bet === undefined;
  if(needFinalBet){
    const pending=state.currentAnswer.pending_final_bet;
    const currentScore=Number(state.me?.score)||0;
    app().innerHTML=`${topbar('Finale inzet')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="badge">🔥 De Grote Finale</div><h2>Geheime finale-inzet</h2><p>Vul zelf in hoeveel punten je wilt inzetten. Je krijgt eerst een overzicht voordat de inzet definitief wordt.</p>${pending===undefined?`<div class="field"><label>Mijn inzet (huidige score: ${currentScore})</label><input id="betAmount" type="number" inputmode="numeric" min="0" max="${currentScore}" value="0"></div><button class="btn primary full" onclick="previewFinalBet()">Bekijk mijn inzet</button>`:`<div class="answerline"><small>Inzet</small><strong>${pending} punten</strong></div><div class="notice green">Bij een goed antwoord komt de inzet boven op je rondepunten. Bij een volledig fout antwoord daalt je totaalscore naar ${Math.max(0,currentScore-pending)}.</div><div class="btnrow"><button class="btn ghost" onclick="editFinalBet()">Wijzigen</button><button class="btn primary" onclick="confirmFinalBet()">Inzet bevestigen</button></div>`}</section>`;
    return;
  }
  const configuredSeconds=answerTimeLimit(state.round.question_type);
  const showTimer=configuredSeconds>0;
  const autoSubmitOnTimeout=showTimer&&!facilitatorOnly()&&!mine;
  const secondsLeft=(state.timerRoundId===state.round.id&&state.timerPhase==='answer'&&state.timer)?state.timerSeconds:configuredSeconds;
  const timerHtml=showTimer?`<div class="timer ${secondsLeft<=5?'low':''}" id="countNum">${secondsLeft}</div>`:'';
  const jackpotVal = getJackpotValue();
  const jackpotHtml = (state.room.settings?.jackpot && jackpotVal > 0) ? `<div class="powerbanner" style="background:#8f3a52;margin-bottom:12px">🔥 Soundtrack Jackpot Actief: +${jackpotVal} punten!</div>` : '';
  const finalBetHtml = (state.room.settings?.final_bet && isFinalRound && state.currentAnswer.final_bet !== undefined) ? `<div class="powerbanner" style="background:#bd53ed;margin-bottom:12px">🎲 Finale inzet actief: ${state.currentAnswer.final_bet} punten</div>` : '';
  app().innerHTML=`${topbar('Geheim antwoorden')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}">${jackpotHtml}${finalBetHtml}<div class="prompt">${esc(prompt(state.round.question_type))}</div>${timerHtml}${rules(state.round.question_type,power())}${powerButton()}${mine?'<div class="notice green">Je antwoord is opgeslagen.</div>':facilitatorOnly()?'<div class="notice blue">Jij bent de aparte organisator. Hieronder zie je de ingeleverde antwoorden.</div>':`${form(state.round.question_type)}<button class="btn primary full" onclick="submitAnswer()">Antwoord vastleggen</button>`}</section><section class="card"><h2>Wie heeft geantwoord?</h2>${playerList(p=>done.has(p.user_id)?['Antwoord binnen','ok']:['Denkt nog na','wait'])}${leader()||host()?`<button class="btn secondary full" style="margin-top:12px" ${all?'':'disabled'} onclick="afterAnswers()">Verder</button>`:`<div class="notice blue">${all?'Alle antwoorden zijn binnen.':'Wachten op alle spelers.'}</div>`}</section>${hostAnswerOverview()}`;
  if(autoSubmitOnTimeout && (state.timerRoundId !== state.round.id || state.timerPhase !== 'answer') && !state.timerFinished) {
    state.timerRoundId = state.round.id;
    state.timerPhase = 'answer';
    startTimer(configuredSeconds, async () => {
      let a = collect(state.round.question_type);
      const reqFilm = state.round.question_type === 'full' || state.round.question_type.includes('film') || state.round.question_type === 'film';
      const reqTitle = state.round.question_type === 'full' || state.round.question_type.includes('title') || state.round.question_type === 'title';
      const reqYear = state.round.question_type === 'full' || state.round.question_type.includes('year') || state.round.question_type === 'year';
      const reqArtist = state.round.question_type.includes('artist') || state.round.question_type === 'artist';
      
      if (reqFilm && !a.film) a.film = '-';
      if (reqTitle && !a.title) a.title = '-';
      if (reqYear && !a.year) a.year = null;
      if (reqArtist && !a.artist) a.artist = '-';
      if (!reqFilm && !reqTitle && !reqYear && !reqArtist && !a[state.round.question_type]) a[state.round.question_type] = '-';
      
      if (state.currentAnswer.final_bet !== undefined) {
        a.final_bet = state.currentAnswer.final_bet;
      }
      clearInterval(state.timer);
      state.timer = null;
      state.timerFinished = true;
      let r = await state.sb.from('dmq_answers').insert({
        room_id: state.room.id,
        round_id: state.round.id,
        player_id: state.me.id,
        user_id: state.user.id,
        answer: a
      });
      if (r.error) toast(r.error.message);
      else schedule();
    });
  }
}
function previewFinalBet(){const max=Number(state.me?.score)||0;const val=Math.max(0,Math.min(max,Number(document.getElementById('betAmount')?.value)||0));state.currentAnswer.pending_final_bet=val;render()}
function editFinalBet(){delete state.currentAnswer.pending_final_bet;render()}
function confirmFinalBet(){state.currentAnswer.final_bet=Number(state.currentAnswer.pending_final_bet)||0;delete state.currentAnswer.pending_final_bet;render()}
async function submitAnswer(){if(facilitatorOnly())return;let a=collect(state.round.question_type);if(!filled(state.round.question_type,a)){toast('Vul je antwoord in.');return}const elapsed=(Date.now()-(state.answerPhaseStartedAt||Date.now()))/1000;if(answerTimeLimit(state.round.question_type)>0&&elapsed<=10)a.speed_bonus=true;clearInterval(state.timer);state.timer=null;let r=await state.sb.from('dmq_answers').insert({room_id:state.room.id,round_id:state.round.id,player_id:state.me.id,user_id:state.user.id,answer:a});if(r.error)toast(r.error.message);else schedule()}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/&/g,' and ').replace(/\bi\s+ll\b/g,'i will').replace(/\bi\s+m\b/g,'i am').replace(/\b(can|won|don|isn|aren|wasn|weren|didn|doesn|hasn|haven|wouldn|shouldn|couldn)\s+t\b/g,'$1 not').replace(/\b(the|a|an|de|het|een|la|le|les|un|une|der|die|das)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function lev(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;let r=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){let t=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return r[b.length]}
function match(v,targets){let a=norm(v);if(!a)return false;return targets.filter(Boolean).some(t=>{let b=norm(t);return a===b||(a.length>=6&&(a.includes(b)||b.includes(a)))||(1-lev(a,b)/Math.max(a.length,b.length)>=.72)})}
function judgedCorrect(answer,key,automatic){const manual=answer?._manual_correctness?.[key];return typeof manual==='boolean'?manual:automatic}
function isMyPower(playerId){
  if(!state.round?.active_power) return false;
  if(state.round.active_power==='ghost_whisper'||state.round.active_power==='second_drop') return true;
  return state.round.power_used_by_player_id===playerId;
}
function points(a,s,t,activePower,playerId){
  let film=[s.film,...(s.film_aliases||[])],title=[s.title,...(s.title_aliases||[])],artist=[s.artist,...(s.artist_aliases||[])],q=0;
  const p=isMyPower(playerId)?activePower:null;
  
  const reqFilm = t === 'full' || t.includes('film') || t === 'film';
  const reqTitle = t === 'full' || t.includes('title') || t === 'title';
  const reqYear = t === 'full' || t.includes('year') || t === 'year';
  const reqArtist = t.includes('artist') || t === 'artist';
  const correctStart=Math.floor((Number(s.year)-1)/5)*5+1;
  const correctPeriod=`${correctStart}-${correctStart+4}`;
  const filmCorrect=judgedCorrect(a,'film',match(a.film,film));
  const titleCorrect=judgedCorrect(a,'title',match(a.title,title));
  const artistCorrect=judgedCorrect(a,'artist',match(a.artist,artist));
  const periodCorrect=judgedCorrect(a,'year_period',a.year_period===correctPeriod);
  const yearCorrect=judgedCorrect(a,'year',!!a.year&&Number(a.year)===Number(s.year));
  
  if (reqFilm && filmCorrect) q+=t==='film'?2:1;
  if (reqTitle && titleCorrect) q+=t==='title'?2:1;
  if (reqArtist && artistCorrect) q+=t==='artist'?2:1;
  
  if(reqYear){if(periodCorrect)q+=1;if(yearCorrect)q+=1}
  
  if(p==='hidden_treasure'){
    let correctParts = 0;
    if (reqFilm && filmCorrect) correctParts++;
    if (reqTitle && titleCorrect) correctParts++;
    if (reqArtist && artistCorrect) correctParts++;
    if (reqYear && yearCorrect) correctParts++;
    if (correctParts >= 1) q++;
  }
  if(p==='hyperdrive') q *= 2;
  if(p==='lightspeed'&&a.speed_bonus&&q>0) q++;
  if(p==='temple_run'){
    const maxBase = maxPoints(t, null, playerId);
    if(q===maxBase) q *= 3;
    else q = -1;
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
    if(q<maxOther) q=maxOther;
  }
  return q;
}
function answerChecks(a,s,t){const checks=[];const reqFilm=t==='full'||t.includes('film')||t==='film';const reqTitle=t==='full'||t.includes('title')||t==='title';const reqYear=t==='full'||t.includes('year')||t==='year';const reqArtist=t.includes('artist')||t==='artist';if(reqFilm)checks.push({key:'film',label:'Film',value:a.film||'Niet ingevuld',correct:judgedCorrect(a,'film',match(a.film,[s.film,...(s.film_aliases||[])]))});if(reqTitle)checks.push({key:'title',label:'Titel',value:a.title||'Niet ingevuld',correct:judgedCorrect(a,'title',match(a.title,[s.title,...(s.title_aliases||[])]))});if(reqYear){const start=Math.floor((Number(s.year)-1)/5)*5+1;const period=`${start}-${start+4}`;checks.push({key:'year_period',label:'Periode',value:a.year_period||'Niet gekozen',correct:judgedCorrect(a,'year_period',a.year_period===period)});checks.push({key:'year',label:'Exact jaar',value:a.year||'Niet ingevuld',correct:judgedCorrect(a,'year',!!a.year&&Number(a.year)===Number(s.year))})}if(reqArtist)checks.push({key:'artist',label:'Uitvoerder',value:a.artist||'Niet ingevuld',correct:judgedCorrect(a,'artist',match(a.artist,[s.artist,...(s.artist_aliases||[])]))});return checks}
function hostAnswerOverview(){if(!host())return'';const allSubmitted=state.players.length>0&&state.players.every(player=>state.answers.some(answer=>answer.player_id===player.id));const mayInspect=facilitatorOnly()||(playingHost()&&!!own()&&allSubmitted);if(!mayInspect){const message=playingHost()&&own()?'Je antwoord is opgeslagen. Het beoordelingsscherm opent pas wanneer alle spelers klaar zijn.':'Vul eerst zelf je antwoord in. Daarna wacht je tot alle spelers klaar zijn.';return`<section class="card host-answer-board"><h2>Hostoverzicht</h2><div class="notice blue">${message}</div></section>`}const song=currentSong();return`<section class="card host-answer-board"><h2>Hostoverzicht</h2><p class="small muted">${facilitatorOnly()?'Ingeleverde antwoorden verschijnen direct.':'Alle antwoorden zijn binnen.'} Groen en rood zijn de automatische beoordeling; gebruik de knoppen om die bewust te corrigeren.</p><div class="host-answer-grid">${state.players.map(player=>{const submitted=state.answers.find(answer=>answer.player_id===player.id);if(!submitted)return`<article class="host-answer-card waiting" style="--player-color:${player.color}"><header><strong>${esc(player.name)}</strong><span class="statuspill wait">Denkt nog na</span></header></article>`;const answer=submitted.revised_answer||submitted.answer||{};const checks=answerChecks(answer,song,state.round.question_type);const automatic=points(answer,song,state.round.question_type,null,player.id);return`<article class="host-answer-card" style="--player-color:${player.color}"><header><strong>${esc(player.name)}</strong><span class="statuspill ok">Antwoord binnen</span></header>${checks.map(check=>`<div class="host-answer-part ${check.correct?'correct':'wrong'}"><span>${esc(check.label)}</span><strong>${esc(check.value)}</strong><div class="host-judge-buttons"><button type="button" class="${check.correct?'selected good':''}" aria-label="${esc(check.label)} van ${esc(player.name)} goed rekenen" onclick="setHostAnswerJudgement('${submitted.id}','${check.key}',true)">✓</button><button type="button" class="${!check.correct?'selected bad':''}" aria-label="${esc(check.label)} van ${esc(player.name)} fout rekenen" onclick="setHostAnswerJudgement('${submitted.id}','${check.key}',false)">✕</button></div></div>`).join('')}<footer>Score na beoordeling: <strong>${automatic}</strong></footer></article>`}).join('')}</div></section>`}
async function setHostAnswerJudgement(answerId,key,value){if(!host())return;if(state.round?.phase!=='answer'){toast('Deze ronde is al beoordeeld. Wijzig zo nodig je eigen definitieve punten.');return}const submitted=state.answers.find(answer=>answer.id===answerId);if(!submitted)return;const applyManual=source=>({...source,_manual_correctness:{...(source?._manual_correctness||{}),[key]:!!value}});const updates={answer:applyManual(submitted.answer||{})};if(submitted.revised_answer)updates.revised_answer=applyManual(submitted.revised_answer);const result=await state.sb.from('dmq_answers').update(updates).eq('id',answerId);if(result.error){toast(`Beoordeling opslaan mislukt: ${result.error.message}`);return}await refreshAll()}
async function afterAnswers(){if(power()==='ghost_whisper'){let r=await state.sb.rpc('dmq_begin_power_phase',{p_round_id:state.round.id,p_phase:'power_phantom'});if(r.error)toast(r.error.message);return}if(power()==='second_drop'){await prepareTower();return}await reveal()}
async function reveal(){let s=currentSong();let basePoints=[];for(const a of state.answers){let q=points(a.revised_answer||a.answer||{},s,state.round.question_type,power(),a.player_id);basePoints.push({ans:a,pts:q,streakBonusApplied:false,jackpotBonus:0,finalBetBonus:0,finalBetPenalty:0})}if(power()==='small_world'){const activatorPlayerId=state.round.power_used_by_player_id;const activatorEntry=basePoints.find(bp=>bp.ans.player_id===activatorPlayerId);if(activatorEntry&&activatorEntry.pts>0){let bonus=0;basePoints.forEach(bp=>{if(bp.ans.player_id!==activatorPlayerId&&bp.pts<activatorEntry.pts){bonus++}});activatorEntry.pts+=Math.min(bonus,2)}}if(state.room.settings?.streaks){try{const{data:pastAns}=await state.sb.from('dmq_answers').select('player_id,final_points,round_id').eq('room_id',state.room.id);const{data:pastRounds}=await state.sb.from('dmq_rounds').select('id,round_no').eq('room_id',state.room.id).order('round_no',{ascending:true});if(pastAns&&pastRounds){const roundOrder=pastRounds.map(r=>r.id);const currentRoundIdx=roundOrder.indexOf(state.round.id);if(currentRoundIdx>=2){const prevRound1Id=roundOrder[currentRoundIdx-1];const prevRound2Id=roundOrder[currentRoundIdx-2];basePoints.forEach(bp=>{const ans1=pastAns.find(a=>a.player_id===bp.ans.player_id&&a.round_id===prevRound1Id);const ans2=pastAns.find(a=>a.player_id===bp.ans.player_id&&a.round_id===prevRound2Id);if(bp.pts>0&&ans1&&ans1.final_points>0&&ans2&&ans2.final_points>0){bp.pts+=1;bp.streakBonusApplied=true}})}}}catch(err){console.error("Streak calculation failed:",err)}}const jackpotVal=getJackpotValue();if(state.room.settings?.jackpot&&jackpotVal>0){const maxBase=maxPoints(state.round.question_type,null,null);const winners=basePoints.filter(bp=>bp.pts>=maxBase);if(winners.length>0){const split=Math.floor(jackpotVal/winners.length);winners.forEach(bp=>{bp.pts+=split;bp.jackpotBonus=split})}}const isFinalRound=state.room.current_round_no===state.room.total_rounds;if(state.room.settings?.final_bet&&isFinalRound){basePoints.forEach(bp=>{const bet=Math.max(0,Number(bp.ans.answer?.final_bet)||0);if(bet>0){if(bp.pts>0){bp.pts+=bet;bp.finalBetBonus=bet}else{const currentScore=Number(state.players.find(player=>player.id===bp.ans.player_id)?.score)||0;bp.finalBetPenalty=Math.min(bet,currentScore);bp.pts=-bp.finalBetPenalty}}})}for(const bp of basePoints){let notes=[];if(bp.streakBonusApplied)notes.push('Muzikale Streak! 🔥 (+1 bonus)');if(bp.jackpotBonus>0)notes.push(`Soundtrack Jackpot! 💰 (+${bp.jackpotBonus})`);if(bp.finalBetBonus>0)notes.push(`Finale inzet gewonnen! 🏆 (+${bp.finalBetBonus})`);if(bp.finalBetPenalty>0)notes.push(`Finale inzet verloren... 💔 (-${bp.finalBetPenalty})`);let note=notes.join(' · ');let r=await state.sb.from('dmq_answers').update({proposed_points:bp.pts,final_points:bp.pts,correction_note:note}).eq('id',bp.ans.id);if(r.error){fatal('Beoordelen mislukt.',r.error);return}}let r=await state.sb.rpc('dmq_set_phase',{p_round_id:state.round.id,p_phase:'review'});if(r.error)toast(r.error.message);else schedule()}
function startTimer(seconds,done){clearInterval(state.timer);state.timerSeconds=seconds;state.timerFinished=false;state.timer=setInterval(async()=>{state.timerSeconds--;let e=document.getElementById('countNum');if(e)e.textContent=state.timerSeconds;if(state.timerSeconds<=0){clearInterval(state.timer);state.timer=null;state.timerFinished=true;await done()}},1000)}
function renderPhantom(){let mine=own(),counts={};state.answers.forEach(a=>{let y=+a.answer?.year;if(y)counts[y]=(counts[y]||0)+1});let ys=Object.keys(counts).map(Number).sort((a,b)=>a-b),selected=+(mine?.revised_answer?.year||mine?.answer?.year),same=ys.length===1;const duration=same?3:10;const secondsLeft=(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timerFinished)?0:(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timer)?state.timerSeconds:duration;app().innerHTML=`${topbar('Phantom Manor')}${scorebar()}${progress()}<section class="card phantom"><div class="powerbanner">👻 Geestenfluistering geldt voor iedereen</div>${rules('year','ghost_whisper')}<h2>De geesten fluisteren…</h2><p>Alle jaartallen zijn anoniem samengevoegd. ${facilitatorOnly()?'Wacht tot de spelers kiezen.':'Jouw antwoord staat geselecteerd.'}</p><div class="yearchoices">${ys.map(y=>`<button class="yearbtn ${selected===y?'selected':''}" ${facilitatorOnly()?'disabled':''} onclick="chooseYear(${y})">${y}${counts[y]>1?` × ${counts[y]}`:''}</button>`).join('')}</div><div class="countdown phantom"><div class="small">De klokken tikken…</div><div id="countNum" class="number">${secondsLeft}</div><div>🕯️ 👻 🕯️</div></div></section>`;if((state.timerRoundId!==state.round.id||state.timerPhase!==state.round.phase)&&!state.timerFinished){state.timerRoundId=state.round.id;state.timerPhase=state.round.phase;startTimer(duration,finishPhantom)}}
async function chooseYear(y){let r=await state.sb.from('dmq_answers').update({revised_answer:{year:y}}).eq('id',own().id);if(r.error)toast(r.error.message);else schedule()}
async function finishPhantom(){if(!leader()&&!host())return;let r=await state.sb.rpc('dmq_finalize_phantom',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else{await refreshAll();await reveal()}}
async function prepareTower(){
  let s=currentSong(),t=state.round.question_type;
  for(const a of state.answers){
    let x=a.answer||{};
    let c={
      film: (t==='full'||t.includes('film')||t==='film')?match(x.film,[s.film,...(s.film_aliases||[])]):null,
      title: (t==='full'||t.includes('title')||t==='title')?match(x.title,[s.title,...(s.title_aliases||[])]):null,
      year: (t==='full'||t.includes('year')||t==='year')?+x.year===+s.year:null,
      artist: (t.includes('artist')||t==='artist')?match(x.artist,[s.artist,...(s.artist_aliases||[])]):null
    };
    await state.sb.from('dmq_answers').update({correctness:c,revised_answer:x}).eq('id',a.id);
  }
  let r=await state.sb.rpc('dmq_begin_power_phase',{p_round_id:state.round.id,p_phase:'power_tower'});
  if(r.error)toast(r.error.message);
}
function renderTower(){
  let mine=own(),a=mine?.revised_answer||mine?.answer||{},c=mine?.correctness||{},t=state.round.question_type;
  const secondsLeft=(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timerFinished)?0:(state.timerRoundId===state.round.id&&state.timerPhase===state.round.phase&&state.timer)?state.timerSeconds:30;
  const f=(k,l,tp='text')=>{
    const val=state.currentAnswer[k]!==undefined?state.currentAnswer[k]:(a[k]||'');
    return `<div class="field answerfield ${c[k]===true?'correct':c[k]===false?'wrong':''}"><label>${l} ${c[k]===true?'✓':c[k]===false?'✗':''}</label><input id="tower_${k}" type="${tp}" value="${esc(val)}" ${c[k]===true||facilitatorOnly()||mine?.tower_completed?'disabled':''} oninput="state.currentAnswer['${k}']=this.value; this.closest('.answerfield').classList.remove('wrong');"></div>`
  };
  
  const keys=[];
  if(t==='full'||t.includes('film')||t==='film')keys.push('film');
  if(t==='full'||t.includes('title')||t==='title')keys.push('title');
  if(t==='full'||t.includes('year')||t==='year')keys.push('year');
  if(t.includes('artist')||t==='artist')keys.push('artist');
  if(keys.length===0)keys.push(t);
  
  let fields='';
  keys.forEach(k=>{
    fields+=f(k,k==='film'?'Film':k==='title'?'Titel':k==='year'?'Jaar':k==='artist'?'Uitvoerder':'Antwoord',k==='year'?'number':'text');
  });
  
  app().innerHTML=`${topbar('Tower of Terror')}${scorebar()}${progress()}<section class="card tower"><div class="powerbanner">🏨 Tweede val geldt voor iedereen</div>${rules(t,'second_drop')}<h2>De liftdeuren sluiten…</h2><p>${facilitatorOnly()?'Jij bent de organisator. Wacht tot de spelers hun antwoorden herzien.':mine?.tower_completed?'Je antwoord staat vast. Wacht tot de timer afloopt.':'Groen is juist en staat vast. Pas rode velden aan en klik op Klaar.'}</p>${fields}${facilitatorOnly()?'':mine?.tower_completed?'<div class="notice green">Je bent klaar.</div>':`<button class="btn primary full" onclick="completeTower()">✓ Ik ben klaar</button>`}<div class="countdown tower"><div class="small">Verdieping</div><div id="countNum" class="number">${secondsLeft}</div><div>⬇️ 🛗 ⬇️</div></div></section><section class="card"><h2>Wie is klaar?</h2>${playerList(pl=>{let x=state.answers.find(ans=>ans.player_id===pl.id);if(!x)return['Nadenken...','wait'];const correctness=x.correctness||{};const allCorrect=keys.every(k=>correctness[k]===true);if(allCorrect)return['Volledig juist! ✓','ok'];return x.tower_completed?['Klaar ✓','ok']:['Aanpassen... ⏳','wait']})}</section>`;
  if((state.timerRoundId!==state.round.id||state.timerPhase!==state.round.phase)&&!state.timerFinished){state.timerRoundId=state.round.id;state.timerPhase=state.round.phase;startTimer(30,finishTower)}
}
async function completeTower(){
  let mine=own(),c=mine?.correctness||{},t=state.round.question_type,a={...(mine?.revised_answer||mine?.answer||{})};
  const keys=[];
  if(t==='full'||t.includes('film')||t==='film')keys.push('film');
  if(t==='full'||t.includes('title')||t==='title')keys.push('title');
  if(t==='full'||t.includes('year')||t==='year')keys.push('year');
  if(t.includes('artist')||t==='artist')keys.push('artist');
  if(keys.length===0)keys.push(t);
  
  keys.forEach(k=>{
    if(c[k]!==true){
      let e=document.getElementById('tower_'+k);
      if(e)a[k]=k==='year'?+e.value||null:e.value.trim();
    }
  });
  let r=await state.sb.from('dmq_answers').update({revised_answer:a,tower_completed:true}).eq('id',mine.id);
  if(r.error)toast(r.error.message);
  else schedule();
}
async function finishTower(){if(!leader()&&!host())return;let r=await state.sb.rpc('dmq_finalize_tower',{p_round_id:state.round.id});if(r.error)toast(r.error.message);else{await refreshAll();await reveal()}}
function answerText(a,t){
  const parts=[];
  if((t==='full'||t.includes('film')||t==='film')&&a.film)parts.push(`Film: ${a.film}`);
  if((t==='full'||t.includes('title')||t==='title')&&a.title)parts.push(`Titel: ${a.title}`);
  if((t==='full'||t.includes('year')||t==='year')&&a.year_period)parts.push(`Periode: ${a.year_period}`);
  if((t==='full'||t.includes('year')||t==='year')&&a.year)parts.push(`Exact jaar: ${a.year}`);
  if((t.includes('artist')||t==='artist')&&a.artist)parts.push(`Uitvoerder: ${a.artist}`);
  if(parts.length===0&&!t.includes('_')&&t!=='full')return String(a[t]||'—');
  return parts.length>0?parts.join(' · '):'—';
}
function maxPoints(t,p,playerId){
  const hasYear=t==='full'||t.includes('year')||t==='year';
  let m=(t==='film'||t==='title'||t==='artist')?2:questionFieldCount(t)+(hasYear?1:0);
  const activeP=isMyPower(playerId)?p:null;
  if(activeP==='hidden_treasure'||activeP==='lightspeed')m++;
  if(activeP==='small_world')m+=2;
  if(activeP==='hyperdrive')m*=2;
  if(activeP==='temple_run')m*=3;
  if(activeP==='spider_bot'){
    if(t==='full'||t==='year'||t==='year_film'||t==='year_film_artist'||t==='year_title'||t==='year_title_artist'||t==='film_title_artist'){
      m=6;
    }else{
      m=4;
    }
  }
  return m;
}
function renderReview(){let s=currentSong(),mine=own();if(facilitatorOnly())return renderFacilitatorReview();if(!s||!mine){loading('Laden…');return}let a=mine?.revised_answer||mine?.answer||{};if(state.reviewFinalPoints===null)state.reviewFinalPoints=Number(mine.final_points)||0;if(state.reviewCorrectionNote===null)state.reviewCorrectionNote=mine.note||'';const pointsValue=Number(state.reviewFinalPoints)||0;const noteValue=state.reviewCorrectionNote||'';const statusHtml=playerList(pl=>{let x=state.answers.find(answer=>answer.player_id===pl.id);if(!x?.points_confirmed)return['Controleert nog','wait'];return x.round_completed?[`${x.final_points>=0?'+':''}${x.final_points} · klaar`,'ok']:[`${x.final_points>=0?'+':''}${x.final_points} · afronden`,'wait']});app().innerHTML=`${topbar('Punten controleren')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="correctbox"><strong>Het juiste antwoord</strong><p style="margin:7px 0 0">${esc(s.title)} · ${esc(s.film)} · ${esc(s.year)}${s.artist?` · ${esc(s.artist)}`:''}</p></div>${rules(state.round.question_type,power())}<div class="answerline"><small>Jouw definitieve antwoord</small><strong>${esc(answerText(a,state.round.question_type))}</strong></div>${!mine.points_confirmed?`<div class="field"><label>Mijn definitieve punten</label><input id="finalPoints" type="number" inputmode="numeric" min="-${Number(state.me?.score)||0}" max="50" value="${pointsValue}" oninput="state.reviewFinalPoints=Number(this.value)||0"></div><div class="field"><label>Toelichting bij correctie</label><input id="correctionNote" value="${esc(noteValue)}" oninput="state.reviewCorrectionNote=this.value"></div><div class="notice blue">Controleer de punten eerst. Je kunt het getal nog wijzigen voordat je bevestigt.</div><button class="btn primary full" onclick="confirmPoints()">Punten bevestigen</button>`:`<div class="notice green">Je hebt ${mine.final_points>=0?'+':''}${mine.final_points} bevestigd.</div>${!mine.round_completed?'<button class="btn primary full" onclick="completeRound()">Ik ben klaar met deze ronde</button>':'<button class="btn ghost full" disabled>Ronde afgerond ✓</button>'}`}</section><section class="card"><h2>Puntenstatus</h2>${statusHtml}</section>`}
function renderFacilitatorReview(){renderReviewLegacy();app().insertAdjacentHTML('beforeend',hostAnswerOverview())}
function renderReviewLegacy(){let s=currentSong(),mine=own();if(!s||(!mine&&!host())){loading('Laden…');return}let a=mine?.revised_answer||mine?.answer||{},p=power();if(mine){if(state.reviewFinalPoints===null)state.reviewFinalPoints=mine.final_points;if(state.reviewCorrectionNote===null)state.reviewCorrectionNote=mine.note||''}const fpVal=(mine&&state.reviewFinalPoints!==null)?state.reviewFinalPoints:(mine?.final_points||0);const noteVal=(mine&&state.reviewCorrectionNote!==null)?state.reviewCorrectionNote:(mine?.note||'');app().innerHTML=`${topbar('Punten controleren')}${scorebar()}${progress()}<section class="card question" style="--accent:${myAccentColor()}"><div class="correctbox"><strong>Het juiste antwoord</strong><p style="margin:7px 0 0">${esc(s.title)} · ${esc(s.film)} · ${esc(s.year)}${s.artist?` · ${esc(s.artist)}`:''}</p></div>${rules(state.round.question_type,p)}${host()?'':`<div class="answerline"><small>Jouw definitieve antwoord</small><strong>${esc(answerText(a,state.round.question_type))}</strong></div>`}${host()?'<div class="notice blue">Jij bent de organisator. Wacht tot de spelers hun punten bevestigen.</div>':!mine.points_confirmed?`<div class="field"><label>Mijn definitieve punten</label><input id="finalPoints" type="number" inputmode="numeric" min="-${Number(state.me?.score)||0}" max="50" value="${Number(fpVal)||0}" oninput="state.reviewFinalPoints=Number(this.value)||0"></div><div class="field"><label>Toelichting bij correctie</label><input id="correctionNote" value="${esc(noteVal)}" oninput="state.reviewCorrectionNote=this.value"></div><div class="notice blue">Controleer de punten eerst. Je kunt het getal nog wijzigen voordat je bevestigt.</div><button class="btn primary full" onclick="confirmPoints()">Punten bevestigen</button>`:`<div class="notice green">Je hebt ${mine.final_points>=0?'+':''}${mine.final_points} bevestigd.</div>${!mine.round_completed?'<button class="btn primary full" onclick="completeRound()">Ik ben klaar met deze ronde</button>':'<button class="btn ghost full" disabled>Ronde afgerond ✓</button>'}`}</section><section class="card"><h2>Puntenstatus</h2>${playerList(pl=>{let x=state.answers.find(a=>a.player_id===pl.id);if(!x?.points_confirmed)return['Controleert nog','wait'];const score=`${x.final_points>=0?'+':''}${x.final_points}`;return x.round_completed?[`${score} · klaar`,'ok']:[`${score} · afronden`,'wait']})}</section>`}
async function confirmPoints(){let r=await state.sb.rpc('dmq_confirm_points',{p_answer_id:own().id,p_final_points:state.reviewFinalPoints,p_note:state.reviewCorrectionNote||''});if(r.error)toast(r.error.message);else schedule()}
async function completeRound(){let r=await state.sb.rpc('dmq_complete_round',{p_answer_id:own().id});if(r.error)toast(r.error.message);else schedule()}
function renderStandings(){let sorted=[...state.players].sort((a,b)=>b.score-a.score);app().innerHTML=`${topbar('Tussenstand')}${rules(state.round.question_type,power())}<section class="card"><div class="standings">${sorted.map(p=>{const rank=competitionRank(p,sorted);return`<div class="rank" style="border-color:${p.color}"><div class="rankicon">${rankMedal(rank)}</div><div><strong>${A(p.avatar_id).icon} ${esc(p.name)}</strong><small class="muted">${esc(A(p.avatar_id).name)} · verwachte beloning ${finalCoinReward(p)} Coco Coins</small></div><div class="rankscore">${p.score} ★</div></div>`}).join('')}</div>${leader()?`<button class="btn primary full" style="margin-top:14px" onclick="nextRound()">${state.room.current_round_no>=state.room.total_rounds?'Einduitslag':'Volgende song'}</button>`:`<div class="notice blue">${esc(leaderName())} start de volgende ronde.</div>`}</section>`}
async function nextRound(){state.reviewFinalPoints=null;state.reviewCorrectionNote=null;let r=await state.sb.rpc('dmq_next_round_v2',{p_room_id:state.room.id});if(r.error)toast(r.error.message);else schedule()}
const TITLES=[['De Maestro van Main Street','De Gouden Groove van het Kasteel','De Onbetwiste Oorwurmkoning','De Headliner van de Magische Hitlijst','De Dirigent van de Disney-deuntjes'],['De Eeuwige Encore','De Zilveren Soundtrackheld','De Bijna-Banger van Big Thunder','De Ster van het Voorprogramma','De Remix die nét niet won'],['De Phantom van het Vergeten Refrein','De Shuffleknop in Mensenvorm','De FastPass naar het Foute Jaartal','De Piraat met de Verkeerde Playlist','De Toonzoeker van de Tower']];
function renderFinal(){
  let s=[...state.players].sort((a,b)=>b.score-a.score);
  awardFinalMusicReward();
  const winners=s.filter(player=>(Number(player.score)||0)===(Number(s[0]?.score)||0));
  const winnerTitle=winners.length>1?`${winners.map(player=>player.name).join(' & ')} winnen samen!`:`${s[0]?.name||'De winnaar'} wint!`;
  app().innerHTML=`${topbar('Einduitslag','leaveRoom()')}<section class="card hero"><div class="logo">♫</div><h1>${esc(winnerTitle)}</h1></section><section class="card"><div class="standings">${s.map(p=>{const rank=competitionRank(p,s);return`<div class="rank" style="border-color:${p.color}"><div class="rankicon">${rankMedal(rank)}</div><div><strong>${A(p.avatar_id).icon} ${esc(p.name)}</strong><small class="gold">${esc(getPlayerTitle(p,s,state.allAnswers))}</small><small class="muted">${finalCoinReward(p)} Coco Coins</small></div><div class="rankscore">${p.score} ★</div></div>`}).join('')}</div><button class="btn ghost full" style="margin-top:14px" onclick="leaveRoom()">Terug</button></section>`;
  if(state.lobbySettings.animations&&s.length>0&&!state.celebrationShown){
    state.celebrationShown=true;
    setTimeout(()=>playWinnerCelebration(s[0],s.slice(1)),150);
  }
}
function awardFinalMusicReward(){if(!state.me||!state.room)return;const key=`dmq-final-reward-${state.room.id}-${state.me.id}`;if(localStorage.getItem(key))return;const reward=finalCoinReward(state.me);awardDisneyStars(state.me.name,reward);localStorage.setItem(key,String(reward));syncFinalMusicReward(state.me.name,reward,key).catch(console.error);recordMusicResult(state.me)}
async function syncFinalMusicReward(name,reward,receipt){if(!state.sb||reward<=0)return;const atomic=await state.sb.rpc('dmq_award_coco_reward',{p_receipt:receipt,p_profile_key:disneyStarKey(name),p_amount:reward});if(!atomic.error)return;console.warn('Atomaire beloning nog niet beschikbaar.',atomic.error)}
function recordMusicResult(player){const key=`dmq-history-${state.room.id}-${player.id}`;if(localStorage.getItem(key))return;const rank=competitionRank(player);const history=JSON.parse(localStorage.getItem('disney_solo_history')||'[]');history.unshift({profileName:player.name,profileKey:disneyStarKey(player.name),category:'music-match',gameType:"Mickey's Music Match",date:new Date().toISOString(),score:player.score,details:rank===1?'Gewonnen':`Geëindigd op plaats ${rank}`});localStorage.setItem('disney_solo_history',JSON.stringify(history));localStorage.setItem(key,'1')}
function renderAdmin(){let s=state.songs.find(x=>+x.song_number===+state.adminSelectedSong)||{};app().innerHTML=`${topbar('Songbeheer · 300 songs',"state.view='home';render()")}
<section class="card"><div class="field"><label>Beheer-PIN</label><input id="adminPin" type="password" value="${esc(state.adminPin)}"></div><div class="field"><label>Song</label><select id="songSelect" onchange="selectAdminSong(this.value)">${state.songs.map(x=>`<option value="${x.song_number}" ${+x.song_number===+state.adminSelectedSong?'selected':''}>${esc(x.label)} · ${esc(x.title||'leeg')}</option>`).join('')}</select></div></section>
<section class="card"><div class="field"><label>Titel</label><input id="songTitle" value="${esc(s.title||'')}"></div><div class="field"><label>Film</label><input id="songFilm" value="${esc(s.film||'')}"></div><div class="grid2"><div class="field"><label>Jaar</label><input id="songYear" type="number" value="${esc(s.year||'')}"></div><div class="field"><label>Uitvoerder</label><input id="songArtist" value="${esc(s.artist||'')}"></div></div><div class="field"><label>Spotify-link</label><input id="songSpotify" value="${esc(s.spotify_url||'')}"></div><div class="field"><label>Codeafbeelding-URL</label><input id="songCode" value="${esc(s.code_image_url||'')}"></div><div class="field"><label>Film-aliases</label><input id="filmAliases" value="${esc((s.film_aliases||[]).join(', '))}"></div><div class="field"><label>Titel-aliases</label><input id="titleAliases" value="${esc((s.title_aliases||[]).join(', '))}"></div><div class="field"><label>Uitvoerder-aliases</label><input id="artistAliases" value="${esc((s.artist_aliases||[]).join(', '))}"></div><label class="toggleline">Song actief<input id="songEnabled" type="checkbox" ${s.enabled?'checked':''}></label><button class="btn primary full" onclick="saveSong()">Opslaan</button></section>`}
function list(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
function selectAdminSong(value){state.adminPin=document.getElementById('adminPin')?.value||'';state.adminSelectedSong=+value;renderAdmin()}
async function saveSong(){const value=id=>document.getElementById(id)?.value?.trim()||'';state.adminPin=value('adminPin');let s=state.songs.find(x=>+x.song_number===+state.adminSelectedSong);let r=await state.sb.rpc('dmq_admin_upsert_song',{p_pin:state.adminPin,p_song_number:s.song_number,p_title:value('songTitle'),p_film:value('songFilm'),p_year:+value('songYear')||null,p_artist:value('songArtist'),p_spotify_url:value('songSpotify'),p_code_image_url:value('songCode'),p_film_aliases:list(value('filmAliases')),p_title_aliases:list(value('titleAliases')),p_artist_aliases:list(value('artistAliases')),p_enabled:!!document.getElementById('songEnabled')?.checked});if(r.error)toast(r.error.message);else{await fetchSongs();toast('Song opgeslagen.');renderAdmin()}}
async function shareRoom(){
  const url=`${location.origin}${location.pathname}?join=${state.room.code}&v=${DMQ_VERSION}`;
  const shareData={title:"Mickey's Music Match",text:`Doe mee met Mickey's Music Match! Kamercode: ${state.room.code}`,url:url};
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
  if(t==='full'||t.includes('_')||t==='film'||t==='title'||t==='year'||t==='artist'){
    state.currentAnswer.film=a.film||'';
    state.currentAnswer.year=a.year||'';
    state.currentAnswer.title=a.title||'';
    state.currentAnswer.artist=a.artist||'';
    
    let f=document.getElementById('ansFilm');if(f)f.value=state.currentAnswer.film;
    let y=document.getElementById('ansYear');if(y)y.value=state.currentAnswer.year;
    let ti=document.getElementById('ansTitle');if(ti)ti.value=state.currentAnswer.title;
    let art=document.getElementById('ansArtist');if(art)art.value=state.currentAnswer.artist;
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
  else if(avatarId==='remy')emojis=['🧀','👨‍🍳','🥖','✨'];
  else if(avatarId==='linguini')emojis=['🎸','💀','⭐','✨'];
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
  removeManagedPlayer,updateManagedPlayer,startGame,refreshAll,shareRoom,adjustRoundCount,
  createRoom,goJoin,resumeHost,resumePlayer,chooseJoinColor,chooseJoinAvatar,joinRoom,render,
  renderLobby,saveSong,selectAdminSong,nextRound,confirmPoints,completeRound,
  previewFinalBet,editFinalBet,confirmFinalBet,
  showPowersInfo,closePowersInfo,openStealDialog,closeStealDialog,stealFromPlayer,
  closeCelebration,removeBg,P
});
