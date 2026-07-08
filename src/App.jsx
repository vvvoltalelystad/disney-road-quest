import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_TASKS, MAGIC_NEWS } from './questions';
import { supabase } from './supabaseClient';
import {
  createRoom,
  joinRoom,
  fetchRoomData,
  subscribeToRoom,
  updateRoomState,
  addPlayerScore,
  adjustScoreEntry,
  removeScoreEntry
} from './multiplayer';

const GAME_MODES = [
  { id: "mix", name: "Road Quest", icon: "🚗", description: "De volledige afwisselende mix van alle speltypen." },
  { id: "Quiz", name: "Quiz", icon: "❓", description: "Test je kennis over Disney en Pixar films." },
  { id: "Samen", name: "Samen", icon: "🤝", description: "Werk samen om groepsdoelen te halen." }
];

const GAME_VERSIONS = [
  { id: 1, name: "Sterrenroute", icon: "✨" },
  { id: 2, name: "Avonturenroute", icon: "🧭" },
  { id: 3, name: "Fantasieroute", icon: "🏰" },
  { id: 4, name: "Magische route", icon: "🎆" }
];

const STAGES = [
  "Start de motor!",
  "Grens oversteken",
  "Parijs in zicht",
  "De Disney-sfeer stijgt",
  "Parkeerterrein bereikt",
  "Welkom in het Park!"
];

const POWER_CARDS = {
  fastpass: { name: "FastPass 🎟️", desc: "Sla de huidige actieve opdracht over zonder beurtverlies.", icon: "🎟️", type: "self" },
  hyperdrive: { name: "Hyperdrive 🚀", desc: "Verdubbel de score die je verdient bij je eerstvolgende speelbeurt.", icon: "🚀", type: "self" },
  tink: { name: "Tinkelbel Stof 🪄", desc: "Streep 2 foute opties weg bij je volgende Quiz of Emoji Quiz-vraag.", icon: "🪄", type: "self" },
  time: { name: "Tijdverdrijver 🕰️", desc: "Geeft 30 seconden extra tijd voor de actieve timer.", icon: "🕰️", type: "self" },
  wish: { name: "Wens van Genie 🧞‍♂️", desc: "Ruil deze kaart in om direct 2 nieuwe willekeurige actiekaarten te trekken.", icon: "🧞‍♂️", type: "self" },
  autopech: { name: "Autopech 🪓", desc: "Bevries een medespeler. Hij/zij moet zijn eerstvolgende speelbeurt overslaan.", icon: "🪓", type: "attack", selectTarget: true },
  apple: { name: "Giftige Appel 🍎", desc: "Steel direct 1 ster van een speler naar keuze en voeg deze toe aan jouw score.", icon: "🍎", type: "attack", selectTarget: true },
  abu: { name: "Sluipen met Abu 👣", desc: "Steel een willekeurige actiekaart uit de hand van een medespeler naar keuze.", icon: "👣", type: "attack", selectTarget: true },
  kuzco: { name: "Kroon van Kuzco 👑", desc: "Wissel al jouw actiekaarten om met de kaarten van een medespeler naar keuze.", icon: "👑", type: "attack", selectTarget: true },
  kaahypnose: { name: "Kaa's Hypnose 🌀", desc: "Halveer de beschikbare tijd op de timer van de speler die nu aan de beurt is.", icon: "🌀", type: "attack" },
  shield: { name: "Magische Bumper 🛡️", desc: "Blokkeer een aanval (zoals Autopech of Giftige Appel) die een speler op jou speelt.", icon: "🛡️", type: "defense" },
  spiegel: { name: "Magische Spiegel 🎭", desc: "Kaats een aanval van een medespeler direct terug naar de speler die hem op jou speelde.", icon: "🎭", type: "defense" },
  shortcut: { name: "Sluiproute 🗺️", desc: "Wissel de huidige opdracht met een willekeurige opdracht uit een categorie naar keuze.", icon: "🗺️", type: "self" },
  elsa: { name: "Elsa's Bevriezing ❄️", desc: "Zet de actieve timer gedurende 15 seconden volledig stil om rustig na te denken.", icon: "❄️", type: "self" }
};

const assetPath = (path) => {
  if (location.hostname.includes('github.io')) {
    return '/disney-road-quest/' + path;
  }
  return '/' + path;
};

// Helper for fuzzy string matching (synonyms and spelling typos)
const norm = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, ""); // remove spaces/punctuation
};

const match = (val, targets) => {
  const a = norm(val);
  if (!a) return false;
  return targets.some(t => {
    const b = norm(t);
    if (!b) return false;
    return a === b || (a.length >= 4 && (a.includes(b) || b.includes(a)));
  });
};

const removeBg = (e) => {
  const img = e.target;
  if (!img || img.dataset.processed) return;
  img.dataset.processed = "true";
  
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  if (!w || !h) return;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    const queue = [];
    const visited = new Uint8Array(w * h);
    
    const isWhite = (x, y) => {
      const idx = (y * w + x) * 4;
      return data[idx] > 220 && data[idx + 1] > 220 && data[idx + 2] > 220;
    };
    
    for (let x = 0; x < w; x++) {
      if (isWhite(x, 0)) { queue.push(x, 0); visited[x] = 1; }
      if (isWhite(x, h - 1)) { queue.push(x, h - 1); visited[(h - 1) * w + x] = 1; }
    }
    for (let y = 0; y < h; y++) {
      if (isWhite(0, y)) { queue.push(0, y); visited[y * w] = 1; }
      if (isWhite(w - 1, y)) { queue.push(w - 1, y); visited[y * w + w - 1] = 1; }
    }
    
    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      
      const idx = (cy * w + cx) * 4;
      data[idx + 3] = 0;
      
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];
      
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!visited[nidx] && isWhite(nx, ny)) {
            visited[nidx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
    
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 0) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    
    if (found) {
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      if (cropW > 0 && cropH > 0 && (cropW < w || cropH < h)) {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        img.src = cropCanvas.toDataURL();
        return;
      }
    }
    img.src = canvas.toDataURL();
  } catch (err) {
    console.error("Canvas background removal failed:", err);
  }
};

export default function App() {
  const [screen, setScreen] = useState('portal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [localPlayer, setLocalPlayer] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState('');

  const [setupMode, setSetupMode] = useState('mix');
  const [setupVersion, setSetupVersion] = useState(1);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(10);
  const [playerNames, setPlayerNames] = useState(['Speler 1', 'Speler 2', 'Speler 3', 'Speler 4']);

  // New Category setup choice checklist
  const [selectedCats, setSelectedCats] = useState(["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Disney Mastermind", "Feit of Fabel", "Quiz", "Samen"]);

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [sound, setSound] = useState(true);

  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [quizLocked, setQuizLocked] = useState(false);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState(null);
  const [scoreReturnScreen, setScoreReturnScreen] = useState('game');
  const [stagePause, setStagePause] = useState(false);

  const [taskSearch, setTaskSearch] = useState('');
  const [customTasks, setCustomTasks] = useState([]);

  // Ref for timer
  const timerRef = useRef(null);
  const svgRef = useRef(null);

  // New Interactive Games States
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [localEstimate, setLocalEstimate] = useState('');
  const [diaryChar, setDiaryChar] = useState('');
  const [diaryMovie, setDiaryMovie] = useState('');

  // Mastermind states
  const [mmCode, setMmCode] = useState([]);
  const [mmGuesses, setMmGuesses] = useState([]);
  const [mmCurrentGuess, setMmCurrentGuess] = useState([0, 0, 0, 0, 0]);
  const [mmSolved, setMmSolved] = useState(false);
  const [mmFailed, setMmFailed] = useState(false);
  const [mmPointsEarned, setMmPointsEarned] = useState(0);

  // Wie ben ik states
  const [whoamiRevealed, setWhoamiRevealed] = useState(1);
  const [whoamiLocked, setWhoamiLocked] = useState(false);
  const [whoamiSelected, setWhoamiSelected] = useState(null);

  // Feit of Fabel states
  const [factLocked, setFactLocked] = useState(false);
  const [factSelected, setFactSelected] = useState(null);

  // Upgrade 1: Day/Night Theme and Power Cards Zoom/Flip HUD states
  const [themeMode, setThemeMode] = useState('day'); // 'day' or 'night'
  const [zoomedCardKey, setZoomedCardKey] = useState(null); // card key like 'fastpass' or null
  const [cardFlipped, setCardFlipped] = useState(false); // boolean flip
  const [strafTargetMode, setStrafTargetMode] = useState(null); // card key if selecting target player

  // Session recovery
  useEffect(() => {
    async function recoverSession() {
      const savedRoomId = localStorage.getItem('disney_room_id');
      const savedPlayerId = localStorage.getItem('disney_player_id');
      const savedPlayerName = localStorage.getItem('disney_player_name');
      const savedSound = localStorage.getItem('disney_sound_enabled');

      if (savedSound !== null) {
        setSound(savedSound === 'true');
      }

      if (savedRoomId && savedPlayerId && savedPlayerName) {
        setLoading(true);
        try {
          const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(savedRoomId);
          setRoom(r);
          setPlayers(p);
          setScoreHistory(sh);
          setLocalPlayer({ id: savedPlayerId, name: savedPlayerName });

          if (r.status === 'lobby') {
            setScreen('lobby');
          } else if (r.status === 'playing') {
            setScreen('game');
          } else if (r.status === 'ended') {
            setScreen('end');
          }
        } catch (e) {
          console.error("Session recovery failed", e);
          clearSession();
        } finally {
          setLoading(false);
        }
      }
    }
    recoverSession();
  }, []);

  const clearSession = () => {
    localStorage.removeItem('disney_room_id');
    localStorage.removeItem('disney_player_id');
    localStorage.removeItem('disney_player_name');
    setRoom(null);
    setPlayers([]);
    setScoreHistory([]);
    setLocalPlayer(null);
    setScreen('portal');
  };

  // Real-time subscription
  useEffect(() => {
    if (!room?.id) return;

    const handleUpdate = async () => {
      try {
        const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(room.id);
        setRoom(r);
        setPlayers(p);
        setScoreHistory(sh);

        if (r.current_task_state?.stagePause) {
          setStagePause(true);
        } else {
          setStagePause(false);
        }

        if (r.status === 'ended' && screen !== 'scores' && screen !== 'scorelog') {
          setScreen('end');
        } else if (r.status === 'playing' && screen === 'lobby') {
          setScreen('game');
        }
      } catch (e) {
        console.error("Realtime sync failed", e);
      }
    };

    const unsubscribe = subscribeToRoom(room.id, handleUpdate);
    return () => unsubscribe();
  }, [room?.id, screen]);

  // Realtime attack countdown (only executed by the room host to avoid conflicts)
  useEffect(() => {
    const attack = room?.current_task_state?.activeAttack;
    if (!attack || attack.timer <= 0) return;

    const isHost = players[0]?.id === localPlayer?.id;
    if (!isHost) return;

    const interval = setInterval(async () => {
      const currentTimer = room.current_task_state.activeAttack.timer;
      if (currentTimer <= 1) {
        clearInterval(interval);
        await executeActiveAttack();
      } else {
        await updateRoomState(room.id, {
          current_task_state: {
            ...room.current_task_state,
            activeAttack: {
              ...room.current_task_state.activeAttack,
              timer: currentTimer - 1
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.current_task_state?.activeAttack?.timer, room?.current_task_state?.activeAttack?.targetId]);

  // Real-time Group Timer Synchronization Hook
  useEffect(() => {
    const timerStartedAt = room?.current_task_state?.timerStartedAt;
    const timerDuration = room?.current_task_state?.timerDuration;

    if (!timerStartedAt || !timerDuration) {
      setSecondsLeft(0);
      setTimerRunning(false);
      return;
    }

    const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
    const initialLeft = Math.max(0, timerDuration - elapsed);

    setSecondsLeft(initialLeft);
    setTimerRunning(initialLeft > 0);

    if (initialLeft <= 0) return;

    const interval = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
      const left = Math.max(0, timerDuration - currentElapsed);
      setSecondsLeft(left);
      if (left <= 0) {
        setTimerRunning(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.current_task_state?.timerStartedAt, room?.current_task_state?.timerDuration]);

  // Touch scroll prevention listener for Pictionary
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const prevent = (e) => e.preventDefault();
    svg.addEventListener('touchstart', prevent, { passive: false });
    svg.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      svg.removeEventListener('touchstart', prevent);
      svg.removeEventListener('touchmove', prevent);
    };
  }, [svgRef.current, screen, room?.current_task_id]);

  const toggleSound = () => {
    const newVal = !sound;
    setSound(newVal);
    localStorage.setItem('disney_sound_enabled', String(newVal));
  };

  const isGroupOnly = () => room?.game_mode === "Samen";
  const completedRounds = () => room?.round || 0;
  const getCurrentTask = () => {
    if (!room?.current_task_id) return null;
    if (room.current_task_id === 'quiz-choice') {
      return { id: "quiz-choice", cat: "Quiz", type: "quizChoice", title: "Kies je niveau", text: "Kies voor 1, 2 of 3 sterren.", points: 0 };
    }
    return DEFAULT_TASKS.find(t => t.id === room.current_task_id) || null;
  };

  const taskDeck = (task) => {
    if (!task || String(task.id).startsWith("custom-")) return room?.game_version || 1;
    const match = String(task.id).match(/\d+/);
    const number = match ? Number(match[0]) : 1;
    return ((number - 1) % 4) + 1;
  };

  const selectNextTask = async (currentRoom, currentPlayers, forcePersonal = false) => {
    const usedTasks = currentRoom.current_task_state?.usedTasks || [];
    const taskHistory = currentRoom.current_task_state?.taskHistory || [];
    const enabledCats = currentRoom.current_task_state?.enabledCategories || ["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Disney Mastermind", "Feit of Fabel", "Quiz", "Samen"];

    const activeTasks = DEFAULT_TASKS.filter(t => 
      t.active !== false && 
      (currentRoom.game_mode === 'mix' || t.cat === currentRoom.game_mode) &&
      enabledCats.includes(t.cat)
    );
    
    if (!activeTasks.length) {
      alert("Geen opdrachten beschikbaar voor de gekozen categorieën.");
      return;
    }

    if (currentRoom.game_mode === "Quiz" || (currentRoom.game_mode === "mix" && enabledCats.includes("Quiz") && Math.random() < 0.25)) {
      // Direct choice of quiz difficulty
      await updateRoomState(currentRoom.id, {
        current_task_id: 'quiz-choice',
        current_task_state: { ...currentRoom.current_task_state, stagePause: false }
      });
      return;
    }

    let pool = activeTasks;
    if (currentRoom.game_mode === "mix" && forcePersonal) {
      pool = pool.filter(t => t.type !== "group");
    }

    const player = currentPlayers[currentRoom.current_player_index];
    const unused = pool.filter(t => !usedTasks.includes(t.id));
    const primary = pool.filter(t => taskDeck(t) === currentRoom.game_version);
    const primaryUnused = primary.filter(t => !usedTasks.includes(t.id));

    const wasSeen = (tid) => taskHistory.some(h => h.taskId === tid);
    const wasSeenByPlayer = (tid, pid) => taskHistory.some(h => h.taskId === tid && h.playerId === pid);

    const neverSeen = list => list.filter(t => !wasSeen(t.id));
    const notForPlayer = list => currentRoom.game_mode === "Samen" ? list : list.filter(t => !wasSeenByPlayer(t.id, player.id));

    const stages = [
      neverSeen(primaryUnused),
      neverSeen(unused),
      notForPlayer(primaryUnused),
      notForPlayer(unused),
      primaryUnused,
      unused,
      notForPlayer(primary),
      notForPlayer(pool),
      primary,
      pool
    ];

    let candidates = stages.find(list => list.length) || pool;
    
    if (currentRoom.game_mode === "mix" && currentRoom.current_task_state?.lastCat) {
      const varied = candidates.filter(t => t.cat !== currentRoom.current_task_state.lastCat);
      if (varied.length) candidates = varied;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected) return;

    const newUsed = [...usedTasks];
    if (!newUsed.includes(selected.id)) newUsed.push(selected.id);

    const isGroup = selected.type === "group";
    const newHistory = [...taskHistory, {
      taskId: selected.id,
      playerId: isGroup ? null : player?.id,
      playerName: isGroup ? "Samen" : player?.name,
      shownAt: new Date().toISOString()
    }];

    await updateRoomState(currentRoom.id, {
      current_task_id: selected.id,
      current_task_state: {
        ...currentRoom.current_task_state,
        usedTasks: newUsed,
        taskHistory: newHistory,
        lastCat: selected.cat,
        stagePause: false,
        part: selected.type === 'diary' ? 1 : undefined,
        answers: selected.type === 'diary' ? {} : undefined,
        lines: selected.type === 'draw' ? [] : undefined,
        estimate: undefined,
        votes: (selected.type === 'dilemma' || selected.type === 'estimate') ? {} : undefined,
        tinkActive: false,
        hyperdriveActive: false,
        timerStartedAt: null,
        timerDuration: null
      }
    });
  };

  const handleCreateRoom = async () => {
    if (!playerNameInput.trim()) {
      setError("Voer een naam in om te kunnen starten.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const totalRounds = setupMode === 'Samen' ? roundsPerPlayer : roundsPerPlayer * playerNames.filter(n => n.trim()).length;
      const { room: r, player: p } = await createRoom(setupMode, setupVersion, roundsPerPlayer, playerNameInput);
      
      await updateRoomState(r.id, { total_rounds: totalRounds });
      r.total_rounds = totalRounds;

      setRoom(r);
      setPlayers([p]);
      setLocalPlayer(p);
      
      localStorage.setItem('disney_room_id', r.id);
      localStorage.setItem('disney_player_id', p.id);
      localStorage.setItem('disney_player_name', p.name);

      setScreen('lobby');
    } catch (e) {
      setError("Kamer aanmaken mislukt: " + (e.message || e.toString() || "Onbekende fout"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCodeInput.trim() || !playerNameInput.trim()) {
      setError("Voer zowel de kamercode als je naam in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { room: r, player: p } = await joinRoom(roomCodeInput, playerNameInput);
      setRoom(r);
      setLocalPlayer(p);

      localStorage.setItem('disney_room_id', r.id);
      localStorage.setItem('disney_player_id', p.id);
      localStorage.setItem('disney_player_name', p.name);

      const { players: list, scoreHistory: sh } = await fetchRoomData(r.id);
      setPlayers(list);
      setScoreHistory(sh);

      if (r.status === 'lobby') {
        setScreen('lobby');
      } else {
        setScreen('game');
      }
    } catch (e) {
      setError(e.message || "Deelnemen mislukt.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (players.length < 2) {
      alert("Er zijn minimaal 2 spelers nodig om te starten.");
      return;
    }
    setLoading(true);
    try {
      const startingIndex = Math.floor(Math.random() * players.length);
      const totalRounds = isGroupOnly() ? room.rounds_per_player : room.rounds_per_player * players.length;

      // Initialize card hands for all players
      const startHands = {};
      players.forEach(p => {
        const cardKeys = Object.keys(POWER_CARDS);
        const hand = [];
        for (let i = 0; i < 3; i++) {
          const rKey = cardKeys[Math.floor(Math.random() * cardKeys.length)];
          hand.push(rKey);
        }
        startHands[p.id] = hand;
      });

      await updateRoomState(room.id, {
        status: 'playing',
        current_player_index: startingIndex,
        round: 0,
        total_rounds: totalRounds,
        current_task_state: {
          ...room.current_task_state,
          player_hands: startHands,
          enabledCategories: selectedCats
        }
      });

      const { room: updatedRoom } = await fetchRoomData(room.id);
      setRoom(updatedRoom);

      await selectNextTask(updatedRoom, players);
      setScreen('game');
    } catch (e) {
      console.error("Game start failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseDifficulty = async (difficulty) => {
    const active = DEFAULT_TASKS.filter(t => t.active !== false && t.type === 'quiz' && t.difficulty === difficulty);
    const usedTasks = room.current_task_state?.usedTasks || [];
    const unused = active.filter(t => !usedTasks.includes(t.id));
    const candidates = unused.length ? unused : active;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    if (!selected) {
      alert("Geen quizvragen gevonden voor dit niveau. Selecteer een andere moeilijkheid.");
      return;
    }

    const points = { easy: 1, medium: 2, hard: 3 }[difficulty];
    const newUsed = [...usedTasks];
    if (!newUsed.includes(selected.id)) newUsed.push(selected.id);

    await updateRoomState(room.id, {
      current_task_id: selected.id,
      current_task_state: {
        ...room.current_task_state,
        usedTasks: newUsed,
        quizPoints: points,
        quizDifficulty: difficulty
      }
    });
  };

  const handleAnswerQuiz = async (answerIndex, correctAnswerIndex, points) => {
    if (quizLocked) return;
    setQuizLocked(true);
    setQuizSelectedAnswer(answerIndex);

    const isCorrect = answerIndex === correctAnswerIndex;
    if (isCorrect) {
      const ptsToAward = room.current_task_state?.hyperdriveActive ? points * 2 : points;
      const activePlayer = players[room.current_player_index];

      await addPlayerScore(
        room.id, 
        activePlayer, 
        ptsToAward, 
        `Quiz ${room.current_task_state.quizDifficulty || 'makkelijk'}: ${getCurrentTask()?.text}`,
        'knowledge',
        getCurrentTask()
      );
    }
  };

  const handleFinishTask = async () => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);
    setLocalEstimate('');

    const wasGroup = getCurrentTask()?.type === "group";
    const nextRound = (room.round || 0) + 1;

    if (nextRound >= room.total_rounds) {
      await updateRoomState(room.id, {
        status: 'ended',
        round: nextRound
      });
      setScreen('end');
      return;
    }

    const pauseInterval = isGroupOnly() ? 5 : 6;
    const triggerPause = nextRound > 0 && nextRound % pauseInterval === 0;

    let nextPlayerIndex = room.current_player_index;
    if (!wasGroup) {
      let candidateNextIdx = (room.current_player_index + 1) % players.length;
      const candidatePlayer = players[candidateNextIdx];
      const frozenPlayers = room.current_task_state?.frozenPlayers || {};

      if (frozenPlayers[candidatePlayer.id]) {
        frozenPlayers[candidatePlayer.id] = false;
        candidateNextIdx = (candidateNextIdx + 1) % players.length;
      }
      nextPlayerIndex = candidateNextIdx;
    }

    await updateRoomState(room.id, {
      round: nextRound,
      current_player_index: nextPlayerIndex,
      current_task_state: {
        ...room.current_task_state,
        frozenPlayers: room.current_task_state?.frozenPlayers || {},
        stagePause: triggerPause,
        timerStartedAt: null,
        timerDuration: null
      }
    });

    if (triggerPause) {
      setStagePause(true);
      return;
    }

    const { room: r, players: p } = await fetchRoomData(room.id);
    setRoom(r);
    setPlayers(p);

    await selectNextTask(r, p, wasGroup && room.game_mode === 'mix');
  };

  const handleSkipTask = async (neverShowAgain = false) => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);
    setLocalEstimate('');

    if (neverShowAgain && room.current_task_id) {
      const deactivated = room.current_task_state?.deactivated || [];
      deactivated.push(room.current_task_id);
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, deactivated }
      });
    }

    const { room: r, players: p } = await fetchRoomData(room.id);
    await selectNextTask(r, p);
  };

  const handleScoreAward = async (playerIndex, points, type) => {
    const targetPlayer = players[playerIndex];
    const ptsToAward = (room.current_player_index === playerIndex && room.current_task_state?.hyperdriveActive) ? points * 2 : points;

    await addPlayerScore(
      room.id,
      targetPlayer,
      ptsToAward,
      `${getCurrentTask()?.cat}: ${getCurrentTask()?.title || getCurrentTask()?.text}`,
      type === 'creative' ? 'creative' : 'general',
      getCurrentTask()
    );
    await handleFinishTask();
  };

  const handleGroupScoreAward = async (points) => {
    await Promise.all(players.map(p => 
      addPlayerScore(
        room.id,
        p,
        points,
        `Gezamenlijke missie: ${getCurrentTask()?.text}`,
        'general',
        getCurrentTask()
      )
    ));
    await handleFinishTask();
  };

  const handleContinueStage = async () => {
    setStagePause(false);
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        stagePause: false
      }
    });

    const { room: r, players: p } = await fetchRoomData(room.id);
    setRoom(r);
    setPlayers(p);
    await selectNextTask(r, p);
  };

  const handleNewGameStart = async () => {
    if (room) {
      await updateRoomState(room.id, { status: 'ended' });
    }
    clearSession();
  };

  const handleAddTask = () => {
    const text = document.getElementById("newText")?.value?.trim();
    const cat = document.getElementById("newCat")?.value;
    if (!text) return;

    const newTask = {
      id: "custom-" + Date.now(),
      cat,
      type: "vote",
      title: "Eigen opdracht",
      text,
      points: 2,
      active: true
    };

    setCustomTasks(prev => [newTask, ...prev]);
    alert("Opdracht toegevoegd!");
    document.getElementById("newText").value = "";
  };

  // Force Sync/Resynchronise Connection Action
  const handleForceSync = async () => {
    setLoading(true);
    try {
      const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(room.id);
      setRoom(r);
      setPlayers(p);
      setScoreHistory(sh);
      
      // reset local locks
      setQuizLocked(false);
      setQuizSelectedAnswer(null);
      setWhoamiLocked(false);
      setWhoamiSelected(null);
      setFactLocked(false);
      setFactSelected(null);
      setLocalEstimate('');

      if (r.status === 'lobby') setScreen('lobby');
      else if (r.status === 'playing') setScreen('game');
      else if (r.status === 'ended') setScreen('end');
    } catch (e) {
      console.error("Force sync failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW INTERACTIVE HANDLERS ---

  // Pictionary Drawing Canvas
  const handleSvgPointerDown = (e, isMyTurn) => {
    if (!isMyTurn) return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 300;
    setDrawingPoints([{ x, y }]);
  };

  const handleSvgPointerMove = (e, isMyTurn) => {
    if (!isDrawing || !isMyTurn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 300;
    setDrawingPoints(prev => [...prev, { x, y }]);
  };

  const handleSvgPointerUp = async (isMyTurn) => {
    if (!isDrawing || !isMyTurn) return;
    setIsDrawing(false);
    if (drawingPoints.length < 2) return;
    const newLine = { points: drawingPoints, color: '#ffd45c', width: 4 };
    const updatedLines = [...(room.current_task_state.lines || []), newLine];
    
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        lines: updatedLines
      }
    });
    setDrawingPoints([]);
  };

  const handleClearDrawing = async () => {
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        lines: []
      }
    });
  };

  const handleUndoDrawing = async () => {
    const lines = [...(room.current_task_state.lines || [])];
    if (lines.length > 0) {
      lines.pop();
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          lines
        }
      });
    }
  };

  const handlePictionaryGuessed = async (playerIndex) => {
    const drawer = players[room.current_player_index];
    const guesser = players[playerIndex];
    
    await addPlayerScore(room.id, guesser, 2, "Pictionary: woord correct geraden!", "creative");
    await addPlayerScore(room.id, drawer, 2, "Pictionary: succesvol getekend!", "creative");
    await handleFinishTask();
  };

  // Dilemma
  const handleVoteDilemma = async (option) => {
    const votes = room.current_task_state.votes || {};
    votes[localPlayer.id] = option;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        votes
      }
    });
  };

  const handleResolveDilemma = async (t) => {
    const votes = room.current_task_state.votes || {};
    const countA = Object.values(votes).filter(v => v === 'A').length;
    const countB = Object.values(votes).filter(v => v === 'B').length;
    
    let winner = 'tie';
    if (countA > countB) winner = 'A';
    if (countB > countA) winner = 'B';

    await Promise.all(players.map(p => {
      const pVote = votes[p.id];
      if (winner === 'tie' || pVote === winner) {
        return addPlayerScore(room.id, p, 1, `Dilemma: gestemd met de meerderheid`, 'general');
      }
      return Promise.resolve();
    }));

    await handleFinishTask();
  };

  // Inschattingsvragen
  const handleSendEstimate = async () => {
    const val = Math.round(Number(localEstimate));
    if (isNaN(val)) return;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        estimate: val,
        votes: {}
      }
    });
  };

  const handleVoteEstimate = async (direction) => {
    const votes = room.current_task_state.votes || {};
    votes[localPlayer.id] = direction;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        votes
      }
    });
  };

  const handleResolveEstimate = async (t) => {
    const correct = t.correct_value;
    const estimate = room.current_task_state.estimate;
    const votes = room.current_task_state.votes || {};
    const activePlayer = players[room.current_player_index];

    const diff = Math.abs(estimate - correct) / correct;
    const pts = room.current_task_state?.hyperdriveActive ? 4 : 2;
    if (diff <= 0.20) {
      await addPlayerScore(room.id, activePlayer, pts, `Inschatting: dichtbij het juiste antwoord (${correct})`, 'knowledge');
    }

    const isHigher = correct > estimate;
    await Promise.all(players.map(p => {
      if (p.id === activePlayer.id) return Promise.resolve();
      const vote = votes[p.id];
      const voteCorrect = (vote === 'higher' && isHigher) || (vote === 'lower' && !isHigher);
      if (voteCorrect) {
        return addPlayerScore(room.id, p, 1, `Inschatting: correct geraden dat het hoger/lager was`, 'knowledge');
      }
      return Promise.resolve();
    }));

    await handleFinishTask();
  };

  // Disney Dagboek
  const handleSubmitDiaryPart = async (partNum) => {
    const answers = room.current_task_state.answers || {};
    const pAns = answers[localPlayer.id] || {};
    pAns[`part${partNum}`] = { char: diaryChar.trim(), movie: diaryMovie.trim() };
    answers[localPlayer.id] = pAns;
    
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        answers
      }
    });
    
    setDiaryChar('');
    setDiaryMovie('');
  };

  const handleNextDiaryPart = async (nextPart) => {
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        part: nextPart
      }
    });
  };

  const handleResolveDiary = async (t) => {
    const answers = room.current_task_state.answers || {};
    const activePlayer = players[room.current_player_index];

    await Promise.all(players.map(p => {
      if (p.id === activePlayer.id) return Promise.resolve();
      const pAns = answers[p.id] || {};
      let score = 0;

      ['part1', 'part2', 'part3'].forEach(pk => {
        const entry = pAns[pk];
        if (entry) {
          const charCorrect = match(entry.char, [t.character_nl, t.character_en, ...(t.character_aliases || [])]);
          const movieCorrect = match(entry.movie, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]);
          if (charCorrect && movieCorrect) score++;
        }
      });

      if (score > 0) {
        return addPlayerScore(room.id, p, score, `Disney Dagboek: ${score} beurt(en) correct geraden`, 'knowledge');
      }
      return Promise.resolve();
    }));

    await handleFinishTask();
  };

  // Mastermind (Code Breaker)
  const handleMmSubmitGuess = () => {
    const feedback = checkGuess(mmCurrentGuess, mmCode);
    const updatedGuesses = [...mmGuesses, { guess: [...mmCurrentGuess], ...feedback }];
    setMmGuesses(updatedGuesses);
    
    if (feedback.black === 5) {
      setMmSolved(true);
      const turns = updatedGuesses.length;
      const basePts = turns <= 4 ? 3 : turns <= 7 ? 2 : 1;
      const pts = room.current_task_state?.hyperdriveActive ? basePts * 2 : basePts;
      setMmPointsEarned(pts);
    } else if (updatedGuesses.length >= 10) {
      setMmFailed(true);
    }
  };

  const handleMmFinish = async (pts) => {
    if (pts > 0) {
      await addPlayerScore(room.id, localPlayer, pts, `Mastermind gekraakt in ${mmGuesses.length} beurten`, 'knowledge');
    }
    await handleFinishTask();
  };

  // Wie ben ik
  const handleWhoamiAnswer = async (idx, t) => {
    if (whoamiLocked) return;
    setWhoamiLocked(true);
    setWhoamiSelected(idx);
    const correct = idx === t.correct;
    if (correct) {
      const basePts = whoamiRevealed === 1 ? 3 : whoamiRevealed === 2 ? 2 : 1;
      const pts = room.current_task_state?.hyperdriveActive ? basePts * 2 : basePts;
      await addPlayerScore(room.id, localPlayer, pts, `Hint Quest: correct geraden met ${whoamiRevealed} hint(s)`, 'knowledge');
    }
  };

  // Feit of Fabel
  const handleFactAnswer = async (isTrue, t) => {
    if (factLocked) return;
    setFactLocked(true);
    setFactSelected(isTrue);
    const correct = isTrue === t.correct;
    if (correct) {
      const pts = room.current_task_state?.hyperdriveActive ? 4 : 2;
      await addPlayerScore(room.id, localPlayer, pts, `Feit of Fabel: stelling correct beoordeeld`, 'knowledge');
    }
  };

  // Emoji Quiz text submission
  const handleEmojiTextAnswer = async (t) => {
    if (quizLocked) return;
    setQuizLocked(true);
    const typed = localEstimate.trim();
    setQuizSelectedAnswer(typed);

    const isCorrect = match(typed, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]);
    if (isCorrect) {
      const pts = room.current_task_state?.hyperdriveActive ? 4 : 2;
      await addPlayerScore(room.id, localPlayer, pts, `Emoji Quiz: correct geraden`, 'knowledge');
    }
  };

  // --- POWER CARDS PLAY LOGIC ---
  const handlePlayCard = async (cardKey, targetPlayerId = null) => {
    const hands = room.current_task_state.player_hands || {};
    let myHand = hands[localPlayer.id] || [];

    const idx = myHand.indexOf(cardKey);
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: cardKey,
        playedBy: localPlayer.name,
        target: targetPlayerId ? players.find(p => p.id === targetPlayerId)?.name : null,
        time: new Date().toISOString()
      }
    ];

    if (cardKey === 'fastpass') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
      await selectNextTask(room, players);
    } else if (cardKey === 'hyperdrive') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory, hyperdriveActive: true }
      });
    } else if (cardKey === 'tink') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory, tinkActive: true }
      });
    } else if (cardKey === 'time') {
      // Modify DB timestamps to add 30s to coop timer
      if (room.current_task_state.timerStartedAt) {
        const prevDuration = room.current_task_state.timerDuration || 45;
        await updateRoomState(room.id, {
          current_task_state: { 
            ...room.current_task_state, 
            player_hands: hands, 
            cardHistory: newHistory,
            timerDuration: prevDuration + 30 
          }
        });
      } else {
        await updateRoomState(room.id, {
          current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
        });
      }
    } else if (cardKey === 'wish') {
      const cardKeys = Object.keys(POWER_CARDS);
      for (let i = 0; i < 2; i++) {
        myHand.push(cardKeys[Math.floor(Math.random() * cardKeys.length)]);
      }
      hands[localPlayer.id] = myHand;
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
    } else if (cardKey === 'shortcut') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
      await selectNextTask(room, players);
    } else if (cardKey === 'elsa') {
      // Pauses timer for local players
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
    } else if (cardKey === 'kaahypnose') {
      if (room.current_task_state.timerStartedAt) {
        const prevDuration = room.current_task_state.timerDuration || 45;
        await updateRoomState(room.id, {
          current_task_state: { 
            ...room.current_task_state, 
            player_hands: hands, 
            cardHistory: newHistory,
            timerDuration: Math.max(5, Math.round(prevDuration / 2)) 
          }
        });
      } else {
        await updateRoomState(room.id, {
          current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
        });
      }
    }

    setZoomedCardKey(null);
    setCardFlipped(false);
  };

  const handlePlayAttackCard = async (cardKey, targetPlayerId) => {
    const hands = room.current_task_state.player_hands || {};
    let myHand = hands[localPlayer.id] || [];

    const idx = myHand.indexOf(cardKey);
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: cardKey,
        playedBy: localPlayer.name,
        target: players.find(p => p.id === targetPlayerId)?.name,
        time: new Date().toISOString()
      }
    ];

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        player_hands: hands,
        cardHistory: newHistory,
        activeAttack: {
          card: cardKey,
          attackerId: localPlayer.id,
          targetId: targetPlayerId,
          timer: 6
        }
      }
    });

    setZoomedCardKey(null);
    setCardFlipped(false);
    setStrafTargetMode(null);
  };

  const handleDefendShield = async () => {
    const hands = room.current_task_state.player_hands || {};
    let myHand = hands[localPlayer.id] || [];

    const idx = myHand.indexOf('shield');
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: 'shield',
        playedBy: localPlayer.name,
        target: 'aanval geblokkeerd',
        time: new Date().toISOString()
      }
    ];

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        player_hands: hands,
        activeAttack: null,
        cardHistory: newHistory
      }
    });
    setZoomedCardKey(null);
    setCardFlipped(false);
  };

  const handleDefendSpiegel = async () => {
    const hands = room.current_task_state.player_hands || {};
    let myHand = hands[localPlayer.id] || [];

    const idx = myHand.indexOf('spiegel');
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: 'spiegel',
        playedBy: localPlayer.name,
        target: 'aanval teruggekaatst',
        time: new Date().toISOString()
      }
    ];

    const currentAttack = room.current_task_state.activeAttack;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        player_hands: hands,
        activeAttack: {
          ...currentAttack,
          attackerId: localPlayer.id,
          targetId: currentAttack.attackerId,
          timer: 6
        },
        cardHistory: newHistory
      }
    });
    setZoomedCardKey(null);
    setCardFlipped(false);
  };

  // --- RENDERING HELPERS ---

  const renderAppHeader = (title = "Disney Road Quest", backAction = null) => {
    return (
      <div className="topbar">
        <div className="brand">
          <span className="castle">🏰</span>
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {room?.code && (
            <button className="btn secondary mini" onClick={handleForceSync} style={{ padding: '4px 8px', fontSize: '11px' }}>
              🔄 Herlaad
            </button>
          )}
          {screen === 'game' && (
            <button className="iconbtn" onClick={() => setThemeMode(prev => prev === 'day' ? 'night' : 'day')} aria-label="Sfeer">
              {themeMode === 'day' ? "🌙" : "☀️"}
            </button>
          )}
          {backAction && (
            <button className="iconbtn" onClick={backAction} aria-label="Terug">
              ←
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderScoreBar = () => {
    return (
      <div className="scorebar">
        {players.map(p => {
          const isFrozen = room?.current_task_state?.frozenPlayers?.[p.id];
          return (
            <div key={p.id} className="scorepill" style={{ border: isFrozen ? '1.5px solid var(--danger)' : undefined }}>
              <b>{p.name} {isFrozen ? "❄️" : ""}</b>
              <span>{p.score} ★</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRouteProgressRoad = () => {
    const pct = Math.min(100, Math.round((room.round / room.total_rounds) * 100));
    const stations = [
      { pct: 0, label: "Start", icon: "🔑" },
      { pct: 25, label: "Grens", icon: "🛂" },
      { pct: 50, label: "Parijs", icon: "🗼" },
      { pct: 75, label: "Sfeer", icon: "✨" },
      { pct: 100, label: "Park", icon: "🏰" }
    ];

    return (
      <div className="road-progress-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
          <span>Etappe Routekaart</span>
          <strong>{pct}% voltooid ({room.round}/{room.total_rounds} beurten)</strong>
        </div>
        
        <div className="road-strip">
          <div className="road-dashed"></div>
          {stations.map((s, idx) => (
            <div 
              key={idx}
              className={`road-station ${pct >= s.pct ? 'passed' : ''}`}
              style={{ left: `${s.pct}%` }}
              title={s.label}
            >
              {s.icon}
            </div>
          ))}
          <div className="road-car" style={{ left: `${pct}%` }}>
            🚗💨
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* 3D Styles Injection */}
      <style>{`
        .star-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(circle at 50% -20%, #0d1a33 0%, #050a1a 60%, #02040d 100%);
          overflow: hidden;
        }
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
          animation: twinkle 2s infinite ease-in-out;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .shooting-star {
          position: absolute;
          width: 80px;
          height: 1.5px;
          background: linear-gradient(90deg, white, transparent);
          animation: shoot 5s infinite linear;
          opacity: 0;
        }
        @keyframes shoot {
          0% { transform: translate(-100px, -100px) rotate(35deg); opacity: 1; }
          15%, 100% { transform: translate(500px, 500px) rotate(35deg); opacity: 0; }
        }
        .road-progress-container {
          background: rgba(21, 49, 95, 0.45);
          border: 1px solid #31517e;
          border-radius: 20px;
          padding: 12px 16px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .road-strip {
          height: 4px;
          background: #2b4974;
          border-radius: 99px;
          position: relative;
          margin: 18px 0 10px;
        }
        .road-dashed {
          position: absolute;
          top: 1px;
          left: 0;
          width: 100%;
          height: 2px;
          border-top: 1.5px dashed rgba(255,255,255,0.4);
        }
        .road-station {
          position: absolute;
          top: -12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0a1c3c;
          border: 2px solid #2b4974;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          cursor: pointer;
          transform: translateX(-50%);
          transition: all 0.3s;
          z-index: 10;
        }
        .road-station.passed {
          border-color: var(--gold);
          background: #173664;
          box-shadow: 0 0 10px rgba(255, 212, 92, 0.4);
        }
        .road-car {
          position: absolute;
          top: -16px;
          font-size: 20px;
          transform: translateX(-50%);
          transition: left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 20;
          animation: car-wobble 0.6s infinite alternate ease-in-out;
        }
        @keyframes car-wobble {
          from { transform: translateX(-50%) translateY(0) rotate(-1deg); }
          to { transform: translateX(-50%) translateY(-2px) rotate(1deg); }
        }
        .cards-hud {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 18px;
          padding: 12px;
          background: rgba(21, 49, 95, 0.3);
          border: 1.5px dashed #2b4974;
          border-radius: 20px;
        }
        .mini-card-btn {
          width: 62px;
          height: 86px;
          border-radius: 12px;
          background: linear-gradient(135deg, #173564, #08162f);
          border: 1.5px solid #31517e;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .mini-card-btn:hover {
          transform: translateY(-6px) scale(1.05);
          border-color: var(--gold);
          box-shadow: 0 8px 16px rgba(255, 212, 92, 0.25);
        }
        .card-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-3d-wrapper {
          width: 280px;
          height: 400px;
          perspective: 1000px;
        }
        .card-3d {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-3d.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 15px 35px rgba(0,0,0,0.5);
          border: 2px solid rgba(255,255,255,0.1);
        }
        .card-front {
          background: linear-gradient(135deg, #173664, #08162f);
          color: white;
        }
        .card-back {
          background: linear-gradient(135deg, #0e2447, #061126);
          transform: rotateY(180deg);
          border-color: var(--gold);
          color: #f8fbff;
        }
        .confetti-piece {
          position: fixed;
          width: 10px;
          height: 10px;
          animation: fall 3s infinite linear;
          z-index: 9999;
          top: -10px;
          border-radius: 20%;
        }
        @keyframes fall {
          0% { top: -10px; transform: translateX(0) rotate(0deg); }
          100% { top: 100vh; transform: translateX(100px) rotate(360deg); opacity: 0; }
        }
        .attack-notification {
          position: fixed;
          top: 20px;
          left: 5%;
          width: 90%;
          background: #4a101d;
          border: 2px solid var(--danger);
          border-radius: 16px;
          padding: 14px;
          color: white;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: pulse-red 1.5s infinite alternate;
        }
        @keyframes pulse-red {
          from { box-shadow: 0 0 10px #ff7b8b55; }
          to { box-shadow: 0 0 25px #ff7b8bda; }
        }
        @keyframes glow-defense {
          from { 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 5px rgba(255, 212, 92, 0.4); 
            border-color: #31517e; 
          }
          to { 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 22px #ffd45c, inset 0 0 10px #ffd45c; 
            border-color: #ffd45c; 
            transform: translateY(-4px) scale(1.03);
          }
        }
        .glow-defense {
          animation: glow-defense 0.8s infinite alternate ease-in-out !important;
          border-color: #ffd45c !important;
        }
      `}</style>

      {/* Render Night theme animated stars overlays */}
      {screen === 'game' && themeMode === 'night' && (
        <div className="star-bg">
          {Array.from({ length: 15 }).map((_, i) => (
            <div 
              key={i} 
              className="star" 
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2.5}s`
              }}
            ></div>
          ))}
          <div className="shooting-star" style={{ top: '20%', left: '10%' }}></div>
          <div className="shooting-star" style={{ top: '60%', left: '40%', animationDelay: '3s' }}></div>
        </div>
      )}

      {/* RENDER ACTIVE MULTIPLAYER ATTACK OVERLAY */}
      {room?.current_task_state?.activeAttack && (
        (() => {
          const attack = room.current_task_state.activeAttack;
          const attacker = players.find(p => p.id === attack.attackerId);
          const isMeTarget = attack.targetId === localPlayer?.id;
          const cardInfo = POWER_CARDS[attack.card];

          if (isMeTarget) {
            return (
              <div className="attack-notification">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', color: '#ff7b8b', fontSize: '14px' }}>GEVAAR!</strong>
                      <span style={{ fontSize: '13px' }}><strong>{attacker?.name}</strong> speelt <strong>{cardInfo?.name}</strong> op jou!</span>
                    </div>
                  </div>
                  <div className="timer" style={{ borderColor: 'var(--danger)', width: '42px', height: '42px', fontSize: '16px', margin: 0 }}>
                    {attack.timer}s
                  </div>
                </div>
                <p className="small" style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                  Tik op een oplichtende verdedigingskaart in je hand om te blokkeren of te spiegelen!
                </p>
              </div>
            );
          } else {
            const targetPlayerName = players.find(p => p.id === attack.targetId)?.name || "iemand";
            return (
              <div className="card-modal-overlay">
                <div className="card" style={{ width: '310px', textAlign: 'center', borderColor: 'var(--line)' }}>
                  <span style={{ fontSize: '38px' }}>🪄</span>
                  <h3>Magisch Duel</h3>
                  <p><strong>{attacker?.name}</strong> valt <strong>{targetPlayerName}</strong> aan met <strong>{cardInfo?.name}</strong>!</p>
                  <p className="small">Wachten op reactie... ({attack.timer}s)</p>
                </div>
              </div>
            );
          }
        })()
      )}

      {/* RENDER TARGET SELECT MODAL FOR ATTACK CARDS */}
      {strafTargetMode && (
        <div className="card-modal-overlay">
          <div className="card" style={{ width: '300px' }}>
            <h3>Kies een speler</h3>
            <p>Op wie wil je {POWER_CARDS[strafTargetMode]?.name} spelen?</p>
            <div className="answers" style={{ marginTop: '14px' }}>
              {players
                .filter(p => p.id !== localPlayer.id)
                .map(p => (
                  <button 
                    key={p.id} 
                    className="answer"
                    onClick={() => handlePlayAttackCard(strafTargetMode, p.id)}
                  >
                    🎯 {p.name}
                  </button>
                ))
              }
              <button className="btn ghost full" style={{ marginTop: '8px' }} onClick={() => setStrafTargetMode(null)}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER 3D FLIP ZOOM MODAL FOR ACTIVE HAND CARDS */}
      {zoomedCardKey && (
        (() => {
          const card = POWER_CARDS[zoomedCardKey];
          return (
            <div className="card-modal-overlay">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <p className="small" style={{ color: 'var(--muted)' }}>Tik op de kaart om hem om te draaien!</p>
                
                <div className="card-3d-wrapper" onClick={() => setCardFlipped(prev => !prev)}>
                  <div className={`card-3d ${cardFlipped ? 'flipped' : ''}`}>
                    {/* Front: themed illustration & Title */}
                    <div className="card-front">
                      <div style={{ fontSize: '72px', margin: '40px 0 20px 0', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>{card.icon}</div>
                      <h2 style={{ fontSize: '28px', color: 'var(--gold)', margin: 0 }}>{card.name}</h2>
                      <span className="badge">Disney Power-up</span>
                    </div>

                    {/* Back: details & action only */}
                    <div className="card-back">
                      <div style={{ pointerEvents: 'none' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--gold)', fontSize: '24px' }}>Uitleg</h3>
                        <hr style={{ margin: '8px 0' }} />
                        <p style={{ fontSize: '15px', lineHeight: '1.4', margin: '14px 0 0 0' }}>{card.desc}</p>
                      </div>
                      
                      <div className="answers" style={{ width: '100%' }} onClick={e => e.stopPropagation() /* stop flip bubble on buttons click */}>
                        {(() => {
                          const activeAttack = room?.current_task_state?.activeAttack;
                          const isMeTarget = activeAttack && activeAttack.targetId === localPlayer?.id;
                          const isDefending = isMeTarget && (zoomedCardKey === 'shield' || zoomedCardKey === 'spiegel');

                          if (isDefending) {
                            return (
                              <button 
                                className="btn ok full"
                                onClick={() => {
                                  if (zoomedCardKey === 'shield') handleDefendShield();
                                  if (zoomedCardKey === 'spiegel') handleDefendSpiegel();
                                }}
                              >
                                {zoomedCardKey === 'shield' ? "Zet Magische Bumper in 🛡️" : "Zet Magische Spiegel in 🎭"}
                              </button>
                            );
                          }

                          if (card.type === 'attack') {
                            return (
                              <button 
                                className="btn primary full"
                                onClick={() => {
                                  if (card.selectTarget) {
                                    setStrafTargetMode(zoomedCardKey);
                                    setZoomedCardKey(null);
                                  } else {
                                    handlePlayCard(zoomedCardKey);
                                  }
                                }}
                              >
                                Speel kaart 🎯
                              </button>
                            );
                          }

                          if (card.type !== 'defense') {
                            return (
                              <button 
                                className="btn primary full"
                                disabled={room?.current_player_index !== players.findIndex(p => p.id === localPlayer.id)}
                                onClick={() => handlePlayCard(zoomedCardKey)}
                              >
                                Speel kaart ➔
                              </button>
                            );
                          }

                          return null;
                        })()}
                        <button className="btn ghost full" onClick={() => {
                          setZoomedCardKey(null);
                          setCardFlipped(false);
                        }}>
                          Sluiten
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="timer" style={{ borderWidth: '4px', width: '60px', height: '60px', fontSize: '16px' }}>🧙‍♂️</div>
          <p>Laden...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* SCREEN: PORTAL */}
          {screen === 'portal' && (
            <div className="portal-container">
              <div className="portal-header">
                <div className="portal-logo-glow"></div>
                <div className="portal-badge">✨ MAGIC GAME PORTAL</div>
                <h1 className="portal-title">Disney Game Portal</h1>
                <p className="portal-subtitle">Kies een interactief multiplayer spel voor in de auto of thuis. Iedereen speelt op zijn eigen telefoon!</p>
              </div>

              <div className="portal-grid">
                {/* Game 1: Disney Road Quest */}
                <div className="portal-card road-quest-card" onClick={() => setScreen('home')} role="button" tabIndex={0}>
                  <div className="portal-card-header">
                    <div className="portal-card-media">
                      <img src={assetPath("portal/car.png")} onLoad={removeBg} className="portal-media-img" alt="Road Quest Car" />
                    </div>
                    <span className="portal-card-badge">Aanbevolen</span>
                  </div>
                  <div className="portal-card-body">
                    <h3>Disney Road Quest</h3>
                    <p>De ultieme roadtrip game voor onderweg naar Disneyland Parijs! Test je kennis met quizzen, maak moeilijke keuzes en werk samen aan magische opdrachten.</p>
                  </div>
                  <div className="portal-card-footer">
                    <span className="btn-play">Start Quest ➔</span>
                  </div>
                </div>

                {/* Game 2: Disney Music Quiz */}
                <a 
                  href={room?.code ? `./music/index.html?room=${room.code}` : "./music/index.html"} 
                  className="portal-card music-quiz-card"
                >
                  <div className="portal-card-header">
                    <div className="portal-card-media">
                      <img src={assetPath("portal/mickey_singing.png")} onLoad={removeBg} className="portal-media-img" alt="Mickey Singing" />
                    </div>
                    <span className="portal-card-badge music">Hitster Editie</span>
                  </div>
                  <div className="portal-card-body">
                    <h3>Disney Music Quiz</h3>
                    <p>Dé interactieve muziekquiz met 150 betoverende Disney en Pixar songs. Scan scancodes met Spotify, raad de film, het jaartal of de uitvoerder en verover de troon!</p>
                  </div>
                  <div className="portal-card-footer">
                    <span className="btn-play music">Speel Quiz ➔</span>
                  </div>
                </a>
              </div>

              <div className="portal-info-box">
                <div className="info-icon">ℹ️</div>
                <div className="info-text">
                  <strong>Magische Verbinding</strong> Beide spellen maken gebruik van dezelfde database op Supabase, maar werken apart. Open een kamer, laat je medereizigers de code scannen en laat de magie beginnen!
                </div>
              </div>
            </div>
          )}

          {/* SCREEN: HOME */}
          {screen === 'home' && (
            <div>
              {renderAppHeader("Disney Road Quest", () => setScreen('portal'))}
              <section className="card hero">
                <div className="badge">Multiplayer Edition · Real-time</div>
                <div className="bigicon">✨🏰✨</div>
                <h1>Disney<br /><span className="gold">Road Quest</span></h1>
                <p>Speel samen op je eigen telefoon tijdens de rit naar Disneyland Parijs!</p>
                
                <div className="field">
                  <label htmlFor="joinCode">Kamercode</label>
                  <input 
                    id="joinCode" 
                    placeholder="Vul de 4-letterige code in"
                    value={roomCodeInput} 
                    onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="field">
                  <label htmlFor="joinName">Jouw Naam</label>
                  <input 
                    id="joinName" 
                    placeholder="Bijv. Mickey"
                    value={playerNameInput} 
                    onChange={e => setPlayerNameInput(e.target.value)}
                  />
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>⚠️ {error}</p>}

                <div className="btnrow" style={{ marginTop: '20px' }}>
                  <button className="btn primary" onClick={handleJoinRoom}>Deelnemen</button>
                  <button className="btn secondary" onClick={() => setScreen('setup')}>Nieuwe Kamer</button>
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Spelopties</h2>
                <div className="btnrow stack">
                  <button className="btn ghost" onClick={toggleSound}>
                    🔊 Geluidseffecten: {sound ? "Aan" : "Uit"}
                  </button>
                  <button className="btn ghost" onClick={() => setScreen('versioninfo')}>
                    ℹ️ Versie-info
                  </button>
                </div>
                <div className="notice" style={{ marginTop: '14px' }}>
                  <strong>Realtime multiplayer:</strong> Eén iemand maakt een kamer aan (de host). De anderen vullen de code in om direct mee te spelen!
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: SETUP */}
          {screen === 'setup' && (
            <div>
              {renderAppHeader("Nieuwe Game", () => setScreen('home'))}
              
              <section className="card">
                <h2 className="sectiontitle">1. Kies de spelonderdelen</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0 12px 0' }}>
                  {["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Disney Mastermind", "Feit of Fabel", "Quiz", "Samen"].map(cat => {
                    const checked = selectedCats.includes(cat);
                    return (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#091b33', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: '1px solid var(--line)' }}>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={() => {
                            if (checked) {
                              if (selectedCats.length > 1) {
                                setSelectedCats(selectedCats.filter(c => c !== cat));
                              } else {
                                alert("Kies tenminste één categorie.");
                              }
                            } else {
                              setSelectedCats([...selectedCats, cat]);
                            }
                          }}
                        />
                        {cat}
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">2. Kies het speltype</h2>
                <div className="modegrid">
                  {GAME_MODES.map(m => (
                    <button 
                      key={m.id} 
                      type="button" 
                      className={`modecard ${setupMode === m.id ? "selected" : ""}`}
                      onClick={() => setSetupMode(m.id)}
                    >
                      <span className="modeicon">{m.icon}</span>
                      <span><strong>{m.name}</strong><small>{m.description}</small></span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">3. Kies een spelversie</h2>
                <div className="versiongrid">
                  {GAME_VERSIONS.map(v => (
                    <button 
                      key={v.id} 
                      type="button" 
                      className={`versioncard ${setupVersion === v.id ? "selected" : ""}`}
                      onClick={() => setSetupVersion(v.id)}
                    >
                      <span className="versionicon">{v.icon}</span>
                      <span><strong>Game {v.id} · {v.name}</strong></span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">4. Spelers en lengte</h2>
                <div className="field">
                  <label htmlFor="hostName">Jouw Naam (Host)</label>
                  <input 
                    id="hostName" 
                    placeholder="Bijv. Donald" 
                    value={playerNameInput} 
                    onChange={e => setPlayerNameInput(e.target.value)}
                  />
                </div>
                
                <div className="field">
                  <label htmlFor="rounds">Opdrachtlengte</label>
                  <select 
                    id="rounds" 
                    value={roundsPerPlayer}
                    onChange={e => setRoundsPerPlayer(Number(e.target.value))}
                  >
                    <option value={3}>3 beurten p.p.</option>
                    <option value={5}>5 beurten p.p.</option>
                    <option value={10}>10 beurten p.p.</option>
                    <option value={15}>15 beurten p.p.</option>
                  </select>
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>⚠️ {error}</p>}

                <div className="btnrow one" style={{ marginTop: '20px' }}>
                  <button className="btn primary" onClick={handleCreateRoom}>Kamer aanmaken</button>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: LOBBY */}
          {screen === 'lobby' && (
            <div>
              {renderAppHeader("Wachtruimte", () => handleNewGameStart())}
              <section className="card hero">
                <div className="badge">Kamer Code</div>
                <h1 style={{ fontSize: '64px', margin: '10px 0', letterSpacing: '4px', color: 'var(--gold)' }}>{room?.code}</h1>
                <p>Vertel de anderen in de auto om deze code in te voeren op hun telefoon.</p>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Deelnemers ({players.length})</h2>
                <div className="players">
                  {players.map((p, idx) => (
                    <div key={p.id} className="playerline" style={{ padding: '10px', background: '#081a37', border: '1px solid var(--line)', borderRadius: '10px' }}>
                      <strong>{p.name} {idx === 0 ? "👑" : ""}</strong>
                    </div>
                  ))}
                </div>

                {players.length > 0 && players[0].id === localPlayer?.id ? (
                  <div className="btnrow one" style={{ marginTop: '20px' }}>
                    <button className="btn primary" onClick={handleStartGame}>
                      Spel Starten ({players.length} spelers)
                    </button>
                  </div>
                ) : (
                  <div className="notice" style={{ marginTop: '20px', textAlign: 'center' }}>
                    Wachten op de host 👑 om het spel te starten...
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SCREEN: GAME */}
          {screen === 'game' && room && (
            <div>
              {stagePause ? (
                // ETAPPE VOLTOOID PAUSE VIEW
                <div>
                  {renderAppHeader("Etappe Voltooid", () => setScreen('scores'))}
                  {renderScoreBar()}
                  <section className="card hero" style={{ padding: '30px 10px' }}>
                    <div className="bigicon">🛣️</div>
                    <div className="badge">Pauzemoment</div>
                    <h1 style={{ fontSize: '32px', margin: '10px 0' }}>Etappe Pauze</h1>
                    <p>Even rust. Tijd voor snacks of een plaspauze! Klik hieronder als iedereen er weer klaar voor is.</p>
                    
                    {players[0]?.id === localPlayer?.id ? (
                      <div className="btnrow one">
                        <button className="btn primary" onClick={handleContinueStage}>Volgende Etappe</button>
                      </div>
                    ) : (
                      <p className="small">De host kan de volgende etappe starten.</p>
                    )}
                  </section>
                </div>
              ) : (
                // ACTIVE GAME VIEW
                <div>
                  {renderAppHeader("Road Quest", () => {
                    setScoreReturnScreen('game');
                    setScreen('scores');
                  })}
                  {renderScoreBar()}

                  <div className="routecaption">
                    Kamer: {room.code} · Mode: {GAME_MODES.find(m => m.id === room.game_mode)?.name}
                  </div>

                  {/* Render animated road progress */}
                  {renderRouteProgressRoad()}

                  {getCurrentTask() ? (
                    (() => {
                      const t = getCurrentTask();
                      const activePlayer = players[room.current_player_index];
                      const isMyTurn = activePlayer?.id === localPlayer?.id;
                      const difficultyLabel = t.difficulty ? { easy: "Makkelijk", medium: "Medium", hard: "Moeilijk" }[t.difficulty] : "";
                      const pointsText = t.type === "quizChoice" ? "Kies je niveau" : `${t.points || 1} ster${(t.points || 1) > 1 ? "ren" : ""}`;
                      const badgeText = `${t.cat}${difficultyLabel ? " · " + difficultyLabel : ""} · ${pointsText}`;

                      return (
                        <section className="card task">
                          <div className="badge">{badgeText}</div>
                          {t.type === "group" ? (
                            <div className="turn"><strong>Gezamenlijke opdracht</strong> · iedereen helpt mee!</div>
                          ) : (
                            <div className="turn">
                              Aan de beurt: <strong>{activePlayer?.name} {isMyTurn ? "(Jij!)" : ""}</strong>
                            </div>
                          )}
                          <h2>{t.title}</h2>
                          <div className="prompt">{t.text}</div>

                          <div style={{ marginTop: '20px' }}>
                            {/* 1. QUIZ LEVEL CHOICE */}
                            {t.type === "quizChoice" && (
                              <div>
                                {isMyTurn ? (
                                  <div className="answers">
                                    <button className="answer" onClick={() => handleChooseDifficulty('easy')}>
                                      <strong>Makkelijk · 1 ster</strong><br />
                                      <span className="small">Toegankelijke quizvraag</span>
                                    </button>
                                    <button className="answer" onClick={() => handleChooseDifficulty('medium')}>
                                      <strong>Medium · 2 sterren</strong><br />
                                      <span className="small">Middelkennis Disney</span>
                                    </button>
                                    <button className="answer" onClick={() => handleChooseDifficulty('hard')}>
                                      <strong>Moeilijk · 3 sterren</strong><br />
                                      <span className="small">Voor de echte Disney-expert!</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="center">Wachten tot {activePlayer?.name} de moeilijkheidsgraad kiest...</div>
                                )}
                              </div>
                            )}

                            {/* 2. TRADITIONAL QUIZ */}
                            {t.type === "quiz" && (
                              <div>
                                <div className="answers">
                                  {t.answers.map((ans, idx) => {
                                    const isTinkActive = room.current_task_state?.tinkActive;
                                    const isIncorrectOption = idx !== t.correct;
                                    const shouldHide = isTinkActive && isIncorrectOption && (idx === (t.correct + 1) % 4 || idx === (t.correct + 2) % 4);

                                    if (shouldHide) return null;

                                    let btnClass = "answer";
                                    if (quizLocked) {
                                      if (idx === t.correct) btnClass += " correct";
                                      else if (idx === quizSelectedAnswer) btnClass += " wrong";
                                    }
                                    return (
                                      <button 
                                        key={idx}
                                        className={btnClass}
                                        disabled={quizLocked || !isMyTurn}
                                        onClick={() => handleAnswerQuiz(idx, t.correct, room.current_task_state.quizPoints || 1)}
                                      >
                                        {ans}
                                      </button>
                                    );
                                  })}
                                </div>
                                {quizLocked && isMyTurn && (
                                  <div style={{ marginTop: '12px' }}>
                                    <button className="btn primary full" onClick={handleFinishTask}>
                                      Volgende opdracht
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 3. DISNEY DAGBOEK */}
                            {t.type === "diary" && (() => {
                              const activePart = room.current_task_state.part || 1;
                              const diaryAnswers = room.current_task_state.answers || {};
                              
                              if (isMyTurn) {
                                // Voorlezer View
                                const allSubmitted = players
                                  .filter(p => p.id !== localPlayer.id)
                                  .every(p => diaryAnswers[p.id]?.[`part${activePart}`]);

                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a2042', borderColor: '#214d8f' }}>
                                      <strong>Jij bent de voorlezer! 📖</strong> Lees het actieve deel hieronder luid en duidelijk voor aan de auto.
                                    </div>
                                    <div style={{ padding: '12px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                      <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '5px' }}>Deel {activePart} (Voorlezer-scherm):</strong>
                                      <p style={{ margin: 0, fontStyle: 'italic', fontSize: '15px', lineHeight: '1.4' }}>
                                        {activePart === 1 ? t.part1 : activePart === 2 ? t.part2 : t.part3}
                                      </p>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Status antwoorden (Ronde {activePart}):</strong>
                                      {players.filter(p => p.id !== localPlayer.id).map(p => {
                                        const submitted = !!diaryAnswers[p.id]?.[`part${activePart}`];
                                        const ansText = diaryAnswers[p.id]?.[`part${activePart}`];
                                        return (
                                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#07152d', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                                            <span>{p.name}</span>
                                            <span style={{ color: submitted ? 'var(--ok)' : 'var(--danger)' }}>
                                              {submitted ? `Klaar (${ansText.char} · ${ansText.movie})` : 'Nadenken... ⏳'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="notice" style={{ background: '#091c38', borderColor: 'var(--line)', fontSize: '13px' }}>
                                      <strong>Oplossing:</strong> {t.character_nl} / {t.character_en} ({t.movie_nl} / {t.movie_en})
                                    </div>

                                    <div className="btnrow stack" style={{ marginTop: '10px' }}>
                                      {activePart < 3 ? (
                                        <button className="btn primary" disabled={!allSubmitted} onClick={() => handleNextDiaryPart(activePart + 1)}>
                                          Volgend deel voorlezen ➔
                                        </button>
                                      ) : (
                                        <button className="btn primary" disabled={!allSubmitted} onClick={() => handleResolveDiary(t)}>
                                          Antwoorden evalueren & beëindigen
                                        </button>
                                      )}
                                      <button className="btn secondary" onClick={() => handleSkipTask(false)}>Overslaan</button>
                                    </div>
                                  </div>
                                );
                              } else {
                                // Guesser View - Meeleesscherm text is completely REMOVED to avoid spoiling!
                                const myAnswers = diaryAnswers[localPlayer.id] || {};
                                const alreadySubmittedThisPart = !!myAnswers[`part${activePart}`];

                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a1c3c' }}>
                                      <strong>Luister naar {activePlayer?.name}! 👂</strong> Hij/zij leest een geheim dagboekfragment voor. Raad welk karakter vertelt en uit welke film het komt!
                                    </div>

                                    {alreadySubmittedThisPart ? (
                                      <div className="notice green">
                                        Je hebt je antwoord voor deel {activePart} ingediend. Wacht tot de voorlezer doorgaat...
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="field">
                                          <label>Welk Karakter?</label>
                                          <input placeholder="Bijv. Remy of Aladdin" value={diaryChar} onChange={e => setDiaryChar(e.target.value)} />
                                        </div>
                                        <div className="field">
                                          <label>Welke Film?</label>
                                          <input placeholder="Bijv. Ratatouille of Aladdin" value={diaryMovie} onChange={e => setDiaryMovie(e.target.value)} />
                                        </div>
                                        <button className="btn primary full" disabled={!diaryChar.trim() || !diaryMovie.trim()} onClick={() => handleSubmitDiaryPart(activePart)}>
                                          Bevestig antwoord voor deel {activePart}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            })()}

                            {/* 4. PICTIONARY */}
                            {t.type === "draw" && (() => {
                              return (
                                <div>
                                  {isMyTurn ? (
                                    // Drawer UI
                                    <div>
                                      <div className="notice" style={{ background: '#12362a', borderColor: '#225e4c', color: '#e6fffa' }}>
                                        <strong>Jij bent de tekenaar! 🎨</strong> Teken het woord hieronder op het canvas. De anderen zien het live!
                                        <h3 style={{ fontSize: '24px', margin: '8px 0 0 0', color: 'var(--gold)' }}>{t.text}</h3>
                                      </div>
                                      
                                      <svg 
                                        ref={svgRef}
                                        viewBox="0 0 400 300" 
                                        className="drawing-canvas" 
                                        onPointerDown={(e) => handleSvgPointerDown(e, true)}
                                        onPointerMove={(e) => handleSvgPointerMove(e, true)}
                                        onPointerUp={() => handleSvgPointerUp(true)}
                                        style={{ touchAction: 'none', background: '#051126', border: '2px solid var(--line)', borderRadius: '16px', width: '100%', height: '260px' }}
                                      >
                                        {(room.current_task_state.lines || []).map((line, idx) => (
                                          <path 
                                            key={idx}
                                            d={`M ${line.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke={line.color}
                                            strokeWidth={line.width}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        ))}
                                        {drawingPoints.length > 1 && (
                                          <path 
                                            d={`M ${drawingPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke="#ffd45c"
                                            strokeWidth={4}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        )}
                                      </svg>

                                      <div className="btnrow" style={{ marginTop: '10px' }}>
                                        <button className="btn secondary" onClick={handleUndoDrawing}>↩️ Undo</button>
                                        <button className="btn danger" onClick={handleClearDrawing}>Wis alles</button>
                                      </div>

                                      <div style={{ marginTop: '18px' }}>
                                        <label>Wie heeft het geraden?</label>
                                        <div className="answers">
                                          {players.map((p, idx) => (
                                            p.id !== localPlayer.id && (
                                              <button key={p.id} className="answer" onClick={() => handlePictionaryGuessed(idx)}>
                                                ⭐ {p.name}
                                              </button>
                                            )
                                          ))}
                                          <button className="btn danger full" onClick={handleFinishTask} style={{ marginTop: '8px' }}>
                                            Niemand heeft het geraden
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Guesser UI
                                    <div>
                                      <div className="notice" style={{ background: '#0a1c3c' }}>
                                        <strong>Raad wat {activePlayer?.name} tekent! 🎨</strong> Roep het antwoord in de auto zodra je het weet!
                                      </div>

                                      <svg 
                                        viewBox="0 0 400 300" 
                                        className="drawing-canvas" 
                                        style={{ background: '#051126', border: '2px solid var(--line)', borderRadius: '16px', width: '100%', height: '260px' }}
                                      >
                                        {(room.current_task_state.lines || []).map((line, idx) => (
                                          <path 
                                            key={idx}
                                            d={`M ${line.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke={line.color}
                                            strokeWidth={line.width}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        ))}
                                      </svg>
                                      <div className="center" style={{ marginTop: '12px', color: 'var(--muted)' }}>
                                        Tekening synchroniseert live... ⏳
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 5. INSCHATTINGSVRAGEN */}
                            {t.type === "estimate" && (() => {
                              const estimate = room.current_task_state.estimate;
                              const votes = room.current_task_state.votes || {};
                              
                              if (isMyTurn) {
                                const hasEstimated = estimate !== undefined;
                                const allVoted = players
                                  .filter(p => p.id !== localPlayer.id)
                                  .every(p => votes[p.id]);

                                return (
                                  <div>
                                    {!hasEstimated ? (
                                      <div>
                                        <div className="field">
                                          <label>Jouw Schatting ({t.unit}):</label>
                                          <input type="number" placeholder={`Bijv. 1500`} value={localEstimate} onChange={e => setLocalEstimate(e.target.value)} />
                                        </div>
                                        <button className="btn primary full" disabled={!localEstimate} onClick={handleSendEstimate}>
                                          Schatting verzenden
                                        </button>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="notice green">
                                          Jouw schatting: <strong>{estimate} {t.unit}</strong>.
                                        </div>
                                        
                                        <div style={{ marginBottom: '14px' }}>
                                          <label>Hoger of Lager stemmen:</label>
                                          {players.filter(p => p.id !== localPlayer.id).map(p => {
                                            const v = votes[p.id];
                                            return (
                                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#07152d', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                                                <span>{p.name}</span>
                                                <span style={{ color: v ? 'var(--ok)' : 'var(--danger)' }}>
                                                  {v ? (v === 'higher' ? 'Hoger ⬆️' : 'Lager ⬇️') : 'Stemmen... ⏳'}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div className="notice" style={{ background: '#0c2145' }}>
                                          Het juiste antwoord is: <strong>{t.correct_value} {t.unit}</strong>
                                        </div>

                                        <button className="btn primary full" disabled={!allVoted} onClick={() => handleResolveEstimate(t)}>
                                          Puntentelling valideren & doorgaan
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                const hasEstimated = estimate !== undefined;
                                const myVote = votes[localPlayer.id];

                                return (
                                  <div>
                                    {!hasEstimated ? (
                                      <div className="center">Wachten tot {activePlayer?.name} zijn/haar schatting indient...</div>
                                    ) : (
                                      <div>
                                        <div className="notice">
                                          {activePlayer?.name} schat: <strong style={{ fontSize: '22px', display: 'block', margin: '4px 0' }}>{estimate} {t.unit}</strong>
                                        </div>
                                        
                                        {myVote ? (
                                          <div className="notice green">
                                            Je hebt gestemd: <strong>{myVote === 'higher' ? 'Hoger ⬆️' : 'Lager ⬇️'}</strong>. Wachten tot iedereen gestemd heeft...
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="center">Is het werkelijke antwoord hoger of lager?</p>
                                            <div className="btnrow" style={{ marginTop: '12px' }}>
                                              <button className="btn primary" onClick={() => handleVoteEstimate('higher')}>Hoger ⬆️</button>
                                              <button className="btn secondary" onClick={() => handleVoteEstimate('lower')}>Lager ⬇️</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            })()}

                            {/* 6. DILEMMA */}
                            {t.type === "dilemma" && (() => {
                              const votes = room.current_task_state.votes || {};
                              const myVote = votes[localPlayer.id];
                              const allVoted = players.every(p => votes[p.id]);

                              const countA = Object.values(votes).filter(v => v === 'A').length;
                              const countB = Object.values(votes).filter(v => v === 'B').length;
                              const total = countA + countB || 1;
                              const pctA = Math.round((countA / total) * 100);
                              const pctB = Math.round((countB / total) * 100);

                              return (
                                <div>
                                  {!allVoted ? (
                                    <div>
                                      {myVote ? (
                                        <div className="notice green">
                                          Je hebt gestemd op: <strong>{myVote === 'A' ? t.optionA : t.optionB}</strong>. Wachten op de rest...
                                        </div>
                                      ) : (
                                        <div className="answers">
                                          <button className="answer" onClick={() => handleVoteDilemma('A')}>
                                            🔴 {t.optionA}
                                          </button>
                                          <button className="answer" onClick={() => handleVoteDilemma('B')}>
                                            🔵 {t.optionB}
                                          </button>
                                        </div>
                                      )}
                                      
                                      <div style={{ marginTop: '16px' }}>
                                        <strong style={{ fontSize: '13px' }}>Wie heeft er gestemd:</strong>
                                        {players.map(p => (
                                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#07152d', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                                            <span>{p.name}</span>
                                            <span style={{ color: votes[p.id] ? 'var(--ok)' : 'var(--danger)' }}>
                                              {votes[p.id] ? 'Gestemd ✓' : 'Nadenken... ⏳'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <h3>De groepsmening:</h3>
                                      <div style={{ margin: '18px 0' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                            <span>🔴 {t.optionA}</span>
                                            <strong>{pctA}% ({countA} stemmen)</strong>
                                          </div>
                                          <div style={{ height: '16px', background: '#0a1c3c', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pctA}%`, height: '100%', background: '#ff7b8b' }}></div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                            <span>🔵 {t.optionB}</span>
                                            <strong>{pctB}% ({countB} stemmen)</strong>
                                          </div>
                                          <div style={{ height: '16px', background: '#0a1c3c', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pctB}%`, height: '100%', background: '#65d9a3' }}></div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="notice" style={{ background: '#0a2042' }}>
                                        De meerderheid wint +1 ster! Bij een gelijke stand krijgt iedereen +1 ster.
                                      </div>

                                      {isMyTurn && (
                                        <button className="btn primary full" onClick={() => handleResolveDilemma(t)}>
                                          Sterren toekennen & doorgaan
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 7. EMOJI QUIZ (Converted from MC to typing input for adult difficulty) */}
                            {t.type === "emoji" && (
                              <div>
                                <div className="center" style={{ fontSize: '48px', margin: '20px 0', letterSpacing: '4px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
                                  {t.text}
                                </div>
                                
                                {quizLocked ? (
                                  <div className="notice" style={{ background: match(quizSelectedAnswer, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]) ? '#123d2b' : '#3d121c' }}>
                                    <strong>
                                      {match(quizSelectedAnswer, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]) ? 'Correct! 🎉' : 'Helaas! 💔'}
                                    </strong>
                                    <p>Jouw antwoord: <em>{quizSelectedAnswer || "Geen"}</em></p>
                                    <p style={{ marginTop: '10px' }}><strong>Oplossing:</strong> {t.movie_nl} / {t.movie_en}</p>
                                    
                                    {isMyTurn && (
                                      <button className="btn primary full" style={{ marginTop: '14px' }} onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    {isMyTurn ? (
                                      <div>
                                        <div className="field">
                                          <label>Welke Disney film wordt hier uitgebeeld?</label>
                                          <input 
                                            placeholder="Bijv. Belle en het Beest" 
                                            value={localEstimate} 
                                            onChange={e => setLocalEstimate(e.target.value)} 
                                          />
                                        </div>
                                        <button 
                                          className="btn primary full" 
                                          disabled={!localEstimate.trim()} 
                                          onClick={() => handleEmojiTextAnswer(t)}
                                        >
                                          Antwoord bevestigen
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="center">Wachten tot {activePlayer?.name} de emojis raadt... ⏳</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 8. WIE BEN IK (HINT QUEST) */}
                            {t.type === "whoami" && (() => {
                              return (
                                <div>
                                  <div style={{ padding: '12px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                    <div style={{ marginBottom: '8px' }}>
                                      <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 1 (Gratis):</strong>
                                      <span style={{ fontSize: '15px' }}>{t.hint1}</span>
                                    </div>
                                    {whoamiRevealed >= 2 && (
                                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                                        <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 2 (Kosten: -1 punt):</strong>
                                        <span style={{ fontSize: '15px' }}>{t.hint2}</span>
                                      </div>
                                    )}
                                    {whoamiRevealed >= 3 && (
                                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                                        <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 3 (Kosten: -2 punten):</strong>
                                        <span style={{ fontSize: '15px' }}>{t.hint3}</span>
                                      </div>
                                    )}
                                  </div>

                                  {!whoamiLocked && isMyTurn && (
                                    <div className="btnrow" style={{ marginBottom: '14px' }}>
                                      <button className="btn secondary mini" disabled={whoamiRevealed >= 2} onClick={() => setWhoamiRevealed(2)}>
                                        Onthul Hint 2
                                      </button>
                                      <button className="btn secondary mini" disabled={whoamiRevealed < 2 || whoamiRevealed >= 3} onClick={() => setWhoamiRevealed(3)}>
                                        Onthul Hint 3
                                      </button>
                                    </div>
                                  )}

                                  <div className="answers">
                                    {t.answers.map((ans, idx) => {
                                      let btnClass = "answer";
                                      if (whoamiLocked) {
                                        if (idx === t.correct) btnClass += " correct";
                                        else if (idx === whoamiSelected) btnClass += " wrong";
                                      }
                                      return (
                                        <button 
                                          key={idx}
                                          className={btnClass}
                                          disabled={whoamiLocked || !isMyTurn}
                                          onClick={() => handleWhoamiAnswer(idx, t)}
                                        >
                                          {ans}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {whoamiLocked && isMyTurn && (
                                    <div style={{ marginTop: '12px' }}>
                                      <button className="btn primary full" onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 9. DISNEY MASTERMIND (Code Breaker - 10 beurten) */}
                            {t.type === "mastermind" && (() => {
                              const colors = [
                                { label: '🔴 Mickey', color: '#ff7b8b' },
                                { label: '🦁 Simba', color: '#ffd45c' },
                                { label: '🔵 Stitch', color: '#74d7ff' },
                                { label: '🟢 Buzz', color: '#65d9a3' },
                                { label: '🟡 Winnie', color: '#ffe680' },
                                { label: '🟣 Ursula', color: '#bd53ed' },
                                { label: '🐚 Ariel', color: '#65d9c7' },
                                { label: '❄️ Elsa', color: '#ffffff' }
                              ];

                              if (isMyTurn) {
                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a1c3c' }}>
                                      Vul de stippen met kleuren en klik op check. Vind de 5 juiste figuren en hun positie!
                                    </div>

                                    <div style={{ display: 'grid', gap: '6px', marginBottom: '14px' }}>
                                      {mmGuesses.map((g, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#091c38', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--line)' }}>
                                          <span style={{ fontSize: '12px', minWidth: '46px' }}>Beurt {idx+1}:</span>
                                          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                            {g.guess.map((cIdx, i) => (
                                              <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: colors[cIdx].color }}></div>
                                            ))}
                                          </div>
                                          <div style={{ display: 'flex', gap: '4px', fontSize: '12px' }}>
                                            {Array.from({ length: g.black }).map((_, i) => <span key={i}>⚫</span>)}
                                            {Array.from({ length: g.white }).map((_, i) => <span key={i}>⚪</span>)}
                                            {g.black === 0 && g.white === 0 && <span style={{ color: 'var(--muted)' }}>Geen</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {mmSolved && (
                                      <div className="notice green">
                                        <strong>Gekracked! 🎉</strong> Je hebt de code gekraakt in {mmGuesses.length} beurten en scoort <strong>+{mmPointsEarned} ★</strong>!
                                        <button className="btn primary full" style={{ marginTop: '10px' }} onClick={() => handleMmFinish(mmPointsEarned)}>
                                          Beëindig & incasseer
                                        </button>
                                      </div>
                                    )}

                                    {mmFailed && (
                                      <div className="notice danger">
                                        <strong>Helaas! 💀</strong> De beurten zijn op. De geheime code was:
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '8px 0' }}>
                                          {mmCode.map((cIdx, i) => (
                                            <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: colors[cIdx].color }} title={colors[cIdx].label}></div>
                                          ))}
                                        </div>
                                        <button className="btn primary full" onClick={() => handleMmFinish(0)}>
                                          Volgende opdracht
                                        </button>
                                      </div>
                                    )}

                                    {!mmSolved && !mmFailed && (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#091c38', padding: '14px', borderRadius: '14px', border: '1px solid var(--line)', marginBottom: '14px' }}>
                                          <span>Huidige rij:</span>
                                          <div style={{ display: 'flex', gap: '10px' }}>
                                            {mmCurrentGuess.map((cIdx, idx) => (
                                              <select 
                                                key={idx} 
                                                value={cIdx} 
                                                onChange={e => {
                                                  const newGuess = [...mmCurrentGuess];
                                                  newGuess[idx] = Number(e.target.value);
                                                  setMmCurrentGuess(newGuess);
                                                }}
                                                style={{ width: '46px', height: '36px', padding: '2px', background: colors[cIdx].color, color: 'transparent', border: 'none', borderRadius: '8px' }}
                                              >
                                                {colors.map((c, i) => (
                                                  <option key={i} value={i} style={{ background: c.color, color: 'white' }}>{c.label}</option>
                                                ))}
                                              </select>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        <button className="btn primary full" onClick={handleMmSubmitGuess}>
                                          Check Poging ({mmGuesses.length + 1}/10)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="center">
                                    Wachten tot {activePlayer?.name} de Mastermind kleurcode kraakt... ⏳
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10264f', border: '1.5px solid var(--line)' }}></div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            })()}

                            {/* 10. FEIT OF FABEL */}
                            {t.type === "fact" && (
                              <div>
                                {factLocked ? (
                                  <div className="notice" style={{ background: factSelected === t.correct ? '#174f43' : '#5b2437', borderColor: factSelected === t.correct ? '#58d4a4' : '#ff7b8b' }}>
                                    <strong style={{ display: 'block', fontSize: '18px', marginBottom: '6px' }}>
                                      {factSelected === t.correct ? 'Correct! 🎉 Feit.' : 'Helaas! 💔 Fabel.'}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.4' }}>{t.explanation}</p>
                                    
                                    {isMyTurn && (
                                      <button className="btn primary full" style={{ marginTop: '14px' }} onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="btnrow">
                                    <button className="btn ok" disabled={!isMyTurn} onClick={() => handleFactAnswer(true, t)}>
                                      🟩 FEIT (Echt waar)
                                    </button>
                                    <button className="btn danger" disabled={!isMyTurn} onClick={() => handleFactAnswer(false, t)}>
                                      🟥 FABEL (Niet waar)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 11. SAMEN (COOP timer synced in real-time) */}
                            {t.type === "group" && (
                              <div>
                                {t.seconds && (
                                  <div id="timerArea" style={{ textAlign: 'center', marginBottom: '12px' }}>
                                    <div className={`timer ${secondsLeft <= 10 ? 'low' : ''}`}>{secondsLeft || t.seconds}</div>
                                    {!timerRunning && secondsLeft === 0 && (
                                      <button className="btn secondary" onClick={() => handleStartGroupTimer(t.seconds)}>
                                        Start timer
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                {players[0]?.id === localPlayer?.id && (
                                  <div className="btnrow" style={{ marginTop: '12px' }}>
                                    <button className="btn ok" onClick={() => handleGroupScoreAward(t.points || 1)}>
                                      Missie geslaagd (+{t.points || 1} ★ elk)
                                    </button>
                                    <button className="btn ghost" onClick={handleFinishTask}>
                                      Niet gehaald
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <hr />
                          <div className="btnrow one">
                            {isMyTurn && t.type !== "quizChoice" && (
                              <button className="btn ghost" onClick={() => handleSkipTask(false)}>
                                ↪️ Overslaan
                              </button>
                            )}
                          </div>
                          {isMyTurn && t.type !== "quizChoice" && (
                            <div className="btnrow one" style={{ marginTop: '10px' }}>
                              <button className="btn danger" onClick={() => handleSkipTask(true)}>
                                👎 Nooit meer tonen
                              </button>
                            </div>
                          )}
                        </section>
                      );
                    })()
                  ) : (
                    <section className="card center">
                      <p>Klaarmaken van de volgende opdracht...</p>
                      {players[0]?.id === localPlayer?.id && (
                        <button className="btn primary" onClick={() => selectNextTask(room, players)}>
                          Opdracht Laden
                        </button>
                      )}
                    </section>
                  )}

                  {/* Player's card hand tray */}
                  {(() => {
                    const myHand = room.current_task_state?.player_hands?.[localPlayer.id] || [];
                    if (!myHand.length) return null;

                    const activeAttack = room?.current_task_state?.activeAttack;
                    const isMeTarget = activeAttack && activeAttack.targetId === localPlayer?.id;

                    return (
                      <div className="card" style={{ marginTop: '16px', padding: '12px' }}>
                        <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--gold)' }}>Je actieve handkaarten:</strong>
                        <div className="cards-hud" style={{ padding: '4px', background: 'transparent', border: 'none', marginTop: 0 }}>
                           {myHand.map((cardKey, idx) => {
                             const card = POWER_CARDS[cardKey];
                             const isDefenseGlow = isMeTarget && (cardKey === 'shield' || cardKey === 'spiegel');

                             return (
                               <div 
                                 key={idx} 
                                 className={`mini-card-btn ${isDefenseGlow ? 'glow-defense' : ''}`}
                                 onClick={() => {
                                   setZoomedCardKey(cardKey);
                                   setCardFlipped(false);
                                 }}
                               >
                                 <span style={{ fontSize: '28px' }}>{card?.icon}</span>
                                 <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--muted)', marginTop: '4px' }}>
                                   {card?.name.split(" ")[0]}
                                 </span>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* SCREEN: SCORES */}
          {screen === 'scores' && (
            <div>
              {renderAppHeader("Tussenstand", () => setScreen(scoreReturnScreen))}

              {/* breaking news trivia banner */}
              {(() => {
                const newsIndex = (room?.round || 0) % MAGIC_NEWS.length;
                const newsItem = MAGIC_NEWS[newsIndex];
                return (
                  <div className="breaking-news" style={{
                    background: '#8f3a52',
                    border: '1.5px solid #ff7b8b',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '24px' }}>📰</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#ffcdcf', marginBottom: '2px' }}>MAGISCH NIEUWS</strong>
                      <span style={{ fontSize: '14px', lineHeight: '1.3', color: '#fff' }}>{newsItem}</span>
                    </div>
                  </div>
                );
              })()}

              <section className="card">
                <h2 className="sectiontitle">Stand na {room?.round || 0} beurten</h2>
                <div className="medals">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => (
                      <div key={p.id} className="medal">
                        <div>
                          <span style={{ fontSize: '24px', marginRight: '10px' }}>
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎖️"}
                          </span>
                          <span className="name">{p.name}</span>
                        </div>
                        <div className="pts">{p.score} ★</div>
                      </div>
                    ))
                  }
                </div>
              </section>

              <section className="card">
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn primary" onClick={() => setScreen(scoreReturnScreen)}>
                    Terug naar het spel
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn secondary" onClick={() => setScreen('scorelog')}>
                    🧾 Scoreverloop aanpassen
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn ghost" onClick={() => setScreen('manage')}>
                    ⚙️ Opdrachten beheren
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn danger" onClick={handleNewGameStart}>
                    🚪 Spel verlaten / Reset
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: SCORELOG */}
          {screen === 'scorelog' && (
            <div>
              {renderAppHeader("Scoreverloop", () => setScreen('scores'))}
              {renderScoreBar()}
              <section className="card">
                <h2 className="sectiontitle">Snelle correctie</h2>
                <div className="quickscorelist">
                  {players.map(p => (
                    <div key={p.id} className="quickscore">
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.score} ★</span>
                      </div>
                      <div>
                        <button className="btn ghost mini scorefix" onClick={() => adjustScoreEntry(room.id, { player_id: p.id, delta: -1, bucket: 'general' }, -1)}>-1</button>
                        <button className="btn ghost mini scorefix" onClick={() => adjustScoreEntry(room.id, { player_id: p.id, delta: 1, bucket: 'general' }, 1)}>+1</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Geschiedenis</h2>
                {scoreHistory.length ? (
                  <div className="historylist">
                    {scoreHistory.map(entry => (
                      <div key={entry.id} className="historyitem">
                        <div className="historymain">
                          <div>
                            <strong>{entry.player_name}</strong>
                            <span className={`delta ${entry.delta < 0 ? 'negative' : 'positive'}`}>
                              {entry.delta > 0 ? "+" : ""}{entry.delta}
                            </span>
                          </div>
                          <p>{entry.reason}</p>
                        </div>
                        <div className="historyactions">
                          <button className="btn danger mini" onClick={() => removeScoreEntry(room.id, entry)}>
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="small">Geen scorewijzigingen gevonden.</p>
                )}
              </section>
            </div>
          )}

          {/* SCREEN: END */}
          {screen === 'end' && room && (
            <div>
              {renderAppHeader("Podium")}

              {/* Render confetti overlay */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    background: ['#ff7b8b', '#ffd45c', '#74d7ff', '#65d9a3'][Math.floor(Math.random() * 4)],
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                ></div>
              ))}

              <section className="card hero">
                <div className="bigicon">🎇🏰🎇</div>
                <div className="badge">De magie is bereikt</div>
                <h1>Road Quest Voltooid!</h1>
                <p>Jullie zijn aangekomen op jullie bestemming!</p>
              </section>

              <section className="card">
                <h2 className="sectiontitle font-bold">Einduitslag</h2>
                <div className="medals">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => {
                      const titles = [
                        "De Hercules van de Road Quest 🏆",
                        "De Buzz Lightyear van de Bijna-Winst 🚀",
                        "De Pain & Panic-combi van de Achterhoede 😈",
                        "De Sidekick 🦌"
                      ];
                      return (
                        <div key={p.id} className="medal" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: 'bold' }}>
                            <span>{idx + 1}. {p.name}</span>
                            <span>{p.score} ★</span>
                          </div>
                          <small style={{ color: 'var(--gold)', marginTop: '4px' }}>{titles[idx] || titles[3]}</small>
                        </div>
                      );
                    })
                  }
                </div>
              </section>

              <section className="card">
                <div className="btnrow one">
                  <button className="btn primary" onClick={handleNewGameStart}>
                    Nieuw Spel Starten
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: VERSION INFO */}
          {screen === 'versioninfo' && (
            <div>
              {renderAppHeader("Versie-info", () => setScreen('home'))}
              <section className="card">
                <div className="badge">Disney Road Quest · Premium Editie</div>
                <h2 className="sectiontitle" style={{ marginTop: '14px' }}>Nieuw en aangepast</h2>
                <div className="versionchanges">
                  <div className="versionchange">
                    <span>🎮</span>
                    <div>
                      <strong>10 Interactieve Speltypes</strong>
                      <p>Weg met passief luisteren of uitbeelden. Speel Pictionary (realtime tekenen), Inschattingsvragen, Dilemma's en het sfeervolle Disney Dagboek!</p>
                    </div>
                  </div>
                  <div className="versionchange">
                    <span>🎟️</span>
                    <div>
                      <strong>Wilde Ritten Powerups (14 kaarten)</strong>
                      <p>Gebruik fastpasses, steel sterren, of verdedig je met schilden en spiegels in 3D flip-kaarten!</p>
                    </div>
                  </div>
                  <div className="versionchange">
                    <span>🚗</span>
                    <div>
                      <strong>Geanimeerde Etappe Routekaart</strong>
                      <p>Een live geanimeerd autootje rijdt langs de etappes van je trip naarmate je beurten vordert!</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: MANAGE TASKS */}
          {screen === 'manage' && (
            <div>
              {renderAppHeader("Opdrachten beheren", () => setScreen('scores'))}
              <section className="card">
                <h2 className="sectiontitle">Eigen opdracht toevoegen</h2>
                <div className="field">
                  <label htmlFor="newCat">Categorie</label>
                  <select id="newCat">
                    <option value="Dilemma">Dilemma</option>
                    <option value="Creatief">Creatief</option>
                    <option value="Onderweg">Onderweg</option>
                    <option value="Verboden woorden">Verboden woorden</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newText">Opdracht</label>
                  <textarea id="newText" placeholder="Typ hier je eigen opdracht..."></textarea>
                </div>
                <button className="btn primary" style={{ width: '100%' }} onClick={handleAddTask}>
                  Toevoegen
                </button>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Alle opdrachten</h2>
                <div className="field">
                  <input 
                    placeholder="Zoek opdracht..." 
                    value={taskSearch} 
                    onChange={e => setTaskSearch(e.target.value)}
                  />
                </div>
                <div className="list">
                  {DEFAULT_TASKS
                    .filter(t => (t.cat + " " + (t.title || "")).toLowerCase().includes(taskSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(t => (
                      <div key={t.id} className="taskitem">
                        <b>{t.cat}</b>
                        <p>{t.title || ""}</p>
                      </div>
                    ))
                  }
                  {customTasks
                    .filter(t => (t.cat + " " + (t.title || "")).toLowerCase().includes(taskSearch.toLowerCase()))
                    .map(t => (
                      <div key={t.id} className="taskitem" style={{ borderColor: 'var(--gold)' }}>
                        <b>{t.cat} (Aangepast)</b>
                        <p>{t.title || ""}</p>
                      </div>
                    ))
                  }
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
