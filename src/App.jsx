import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_TASKS, PRONUNCIATION_MAP } from './questions';
import { 
  supabase 
} from './supabaseClient';
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

const assetPath = (path) => {
  if (location.hostname.includes('github.io')) {
    return '/disney-road-quest/' + path;
  }
  return '/' + path;
};

const removeBg = (e) => {
  const img = e.target;
  if (!img || img.dataset.processed) return;
  img.dataset.processed = "true";
  
  // Make sure image is loaded with crossOrigin if needed (same origin is fine)
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
    
    // BFS Flood-fill to only remove white background connected to borders
    const queue = [];
    const visited = new Uint8Array(w * h);
    
    const isWhite = (x, y) => {
      const idx = (y * w + x) * 4;
      return data[idx] > 220 && data[idx + 1] > 220 && data[idx + 2] > 220;
    };
    
    // Initialize border pixels
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
      data[idx + 3] = 0; // Make transparent
      
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
    
    // Bounding box cropping
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
  // App navigation state
  const [screen, setScreen] = useState('portal'); // 'portal', 'home', 'setup', 'lobby', 'game', 'scores', 'scorelog', 'end', 'manage', 'versioninfo', 'gamehistory'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Local user identity
  const [localPlayer, setLocalPlayer] = useState(null); // { id, name }
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState('');

  // Setup form state
  const [setupMode, setSetupMode] = useState('mix');
  const [setupVersion, setSetupVersion] = useState(1);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(10);
  const [playerNames, setPlayerNames] = useState(['Speler 1', 'Speler 2', 'Speler 3', 'Speler 4']);

  // Sync state (populated from Supabase)
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [sound, setSound] = useState(true);

  // Local game runner states
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [quizLocked, setQuizLocked] = useState(false);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState(null);
  const [scoreReturnScreen, setScoreReturnScreen] = useState('game');
  const [stagePause, setStagePause] = useState(false);

  // Text search in custom tasks
  const [taskSearch, setTaskSearch] = useState('');
  const [customTasks, setCustomTasks] = useState([]);

  // Refs for timers and speaking
  const timerRef = useRef(null);

  // 1. Session Recovery: Load room/player from LocalStorage on mount
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

  // Helper to clear localStorage session
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

  // 2. Realtime subscription to the active room
  useEffect(() => {
    if (!room?.id) return;

    // Trigger full state fetch and state update
    const handleUpdate = async () => {
      try {
        const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(room.id);
        setRoom(r);
        setPlayers(p);
        setScoreHistory(sh);

        // Sync stage pause logic locally
        if (r.current_task_state?.stagePause) {
          setStagePause(true);
        } else {
          setStagePause(false);
        }

        // Adjust screen if game ended or started
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

  // Handle local countdown timer
  useEffect(() => {
    if (timerRunning && secondsLeft > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
            speak("Tijd!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerRunning, secondsLeft]);

  // Clean timer on task change
  useEffect(() => {
    setTimerRunning(false);
    setSecondsLeft(0);
    setQuizLocked(false);
    setQuizSelectedAnswer(null);
  }, [room?.current_task_id]);

  // Sound settings persistence
  const toggleSound = () => {
    const newVal = !sound;
    setSound(newVal);
    localStorage.setItem('disney_sound_enabled', String(newVal));
  };

  // 3. TTS Speech synthesis
  const getVoiceForLang = (lang) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const exact = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase());
    if (exact) return exact;
    const base = lang.split("-")[0].toLowerCase();
    return voices.find(v => v.lang.toLowerCase().startsWith(base)) || null;
  };

  const splitForPronunciation = (text) => {
    const segments = [];
    let remaining = String(text || "");
    const sortedMap = [...PRONUNCIATION_MAP].sort((a, b) => b.text.length - a.text.length);

    while (remaining) {
      let best = null;
      let bestIndex = -1;

      for (const item of sortedMap) {
        const idx = remaining.toLowerCase().indexOf(item.text.toLowerCase());
        if (idx !== -1 && (bestIndex === -1 || idx < bestIndex || (idx === bestIndex && item.text.length > best.text.length))) {
          best = item;
          bestIndex = idx;
        }
      }

      if (bestIndex === -1) {
        segments.push({ text: remaining, lang: "nl-NL" });
        break;
      }

      if (bestIndex > 0) {
        segments.push({ text: remaining.slice(0, bestIndex), lang: "nl-NL" });
      }

      segments.push({ text: remaining.slice(bestIndex, bestIndex + best.text.length), lang: best.lang });
      remaining = remaining.slice(bestIndex + best.text.length);
    }

    return segments.filter(s => s.text.trim());
  };

  const speak = (text) => {
    if (!sound || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const segments = splitForPronunciation(text);
    let index = 0;

    const speakNext = () => {
      if (index >= segments.length) return;
      const segment = segments[index++];
      const u = new SpeechSynthesisUtterance(segment.text);
      u.lang = segment.lang;
      const voice = getVoiceForLang(segment.lang);
      if (voice) u.voice = voice;
      u.rate = segment.lang === "nl-NL" ? 0.95 : 0.90;
      u.pitch = 1;
      u.onend = speakNext;
      u.onerror = speakNext;
      window.speechSynthesis.speak(u);
    };

    speakNext();
  };

  const speakCurrentTask = () => {
    const t = getCurrentTask();
    if (!t || !room) return;
    const player = players[room.current_player_index]?.name || "Speler";
    
    if (t.type === "guess") {
      speak(`${player} is aan de beurt. Pak de telefoon en lees je geheime opdracht op het scherm. Laat het scherm niet aan de andere spelers zien.`);
    } else if (t.type === "group") {
      speak(`Dit is een gezamenlijke opdracht. Niemand verliest hierdoor zijn of haar beurt. ${t.title}. ${t.text}`);
    } else if (t.type === "quizChoice") {
      speak(`${player} is aan de beurt. Kies op het scherm voor makkelijk, medium of moeilijk.`);
    } else if (t.type === "quiz") {
      const level = { easy: "makkelijke", medium: "medium", hard: "moeilijke" }[t.difficulty] || "";
      const choices = t.answers.map((answer, idx) => `Optie ${idx + 1}: ${answer}`).join(". ");
      speak(`${player} krijgt een ${level} vraag voor ${t.points} ${t.points === 1 ? "ster" : "sterren"}. ${t.text}. ${choices}.`);
    } else {
      speak(`${player} is aan de beurt. ${t.title}. ${t.text}`);
    }
  };

  // 4. Game flow helpers
  const isGroupOnly = () => room?.game_mode === "Samen";
  const completedRounds = () => isGroupOnly() ? (room?.round || 0) : (room?.round || 0); 
  const gameIsComplete = () => completedRounds() >= (room?.total_rounds || 0);

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

  // Select next task logic (computed on active client, pushed to DB)
  const selectNextTask = async (currentRoom, currentPlayers, forcePersonal = false) => {
    const usedTasks = currentRoom.current_task_state?.usedTasks || [];
    const taskHistory = currentRoom.current_task_state?.taskHistory || [];

    // Filter tasks that match the active mode
    const activeTasks = DEFAULT_TASKS.filter(t => t.active !== false && (currentRoom.game_mode === 'mix' || t.cat === currentRoom.game_mode));
    
    if (!activeTasks.length) {
      alert("Geen opdrachten beschikbaar.");
      return;
    }

    if (currentRoom.game_mode === "Quiz") {
      await updateRoomState(currentRoom.id, {
        current_task_id: 'quiz-choice',
        current_task_state: { ...currentRoom.current_task_state, stagePause: false }
      });
      return;
    }

    let pool = activeTasks;
    // In mixed mode, force a personal task if preceding task was group-based
    if (currentRoom.game_mode === "mix" && forcePersonal) {
      pool = pool.filter(t => t.type !== "group");
    }

    // Determine deck version matching this lobby
    const player = currentPlayers[currentRoom.current_player_index];
    const unused = pool.filter(t => !usedTasks.includes(t.id));
    const primary = pool.filter(t => taskDeck(t) === currentRoom.game_version);
    const primaryUnused = primary.filter(t => !usedTasks.includes(t.id));

    // History avoidance filters
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
    
    // Attempt to avoid repeating the last category in mixed mode
    if (currentRoom.game_mode === "mix" && currentRoom.current_task_state?.lastCat) {
      const varied = candidates.filter(t => t.cat !== currentRoom.current_task_state.lastCat);
      if (varied.length) candidates = varied;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected) return;

    const newUsed = [...usedTasks];
    if (!newUsed.includes(selected.id)) newUsed.push(selected.id);

    // Sync shown log
    const isGroup = selected.type === "group";
    const newHistory = [...taskHistory, {
      taskId: selected.id,
      playerId: isGroup ? null : player?.id,
      playerName: isGroup ? "Samen" : player?.name,
      shownAt: new Date().toISOString()
    }];

    await updateRoomState(currentRoom.id, {
      current_task_id: selected.type === 'quiz' ? 'quiz-choice' : selected.id,
      current_task_state: {
        ...currentRoom.current_task_state,
        usedTasks: newUsed,
        taskHistory: newHistory,
        lastCat: selected.cat,
        stagePause: false
      }
    });
  };

  // 5. Lobby & Room Handlers
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
      
      // Update room capacity
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

      // Fetch immediate player list
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
      // Random starting player index
      const startingIndex = Math.floor(Math.random() * players.length);
      const totalRounds = isGroupOnly() ? room.rounds_per_player : room.rounds_per_player * players.length;

      await updateRoomState(room.id, {
        status: 'playing',
        current_player_index: startingIndex,
        round: 0,
        total_rounds: totalRounds
      });

      // Fetch updated room
      const { room: updatedRoom } = await fetchRoomData(room.id);
      setRoom(updatedRoom);

      // Trigger first task selection
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
      alert("Geen quizvragen gevonden.");
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
      const activePlayer = players[room.current_player_index];
      await addPlayerScore(
        room.id, 
        activePlayer, 
        points, 
        `Quiz ${room.current_task_state.quizDifficulty === 'easy' ? 'makkelijk' : room.current_task_state.quizDifficulty === 'medium' ? 'medium' : 'moeilijk'}: ${getCurrentTask()?.text}`,
        'knowledge',
        getCurrentTask()
      );
      speak("Goed!");
    } else {
      speak("Helaas, dat antwoord is niet goed.");
    }
  };

  const handleFinishTask = async () => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);

    const wasGroup = getCurrentTask()?.type === "group";
    const nextRound = (room.round || 0) + 1;

    // Check if game complete
    if (nextRound >= room.total_rounds) {
      await updateRoomState(room.id, {
        status: 'ended',
        round: nextRound
      });
      setScreen('end');
      return;
    }

    // Check if stage pause (etappe pause)
    const pauseInterval = isGroupOnly() ? 5 : 6;
    const triggerPause = nextRound > 0 && nextRound % pauseInterval === 0;

    let nextPlayerIndex = room.current_player_index;
    if (!wasGroup) {
      nextPlayerIndex = (room.current_player_index + 1) % players.length;
    }

    if (triggerPause) {
      await updateRoomState(room.id, {
        round: nextRound,
        current_player_index: nextPlayerIndex,
        current_task_state: {
          ...room.current_task_state,
          stagePause: true
        }
      });
      setStagePause(true);
      return;
    }

    // Advancing state directly
    await updateRoomState(room.id, {
      round: nextRound,
      current_player_index: nextPlayerIndex
    });

    const { room: r, players: p } = await fetchRoomData(room.id);
    setRoom(r);
    setPlayers(p);

    await selectNextTask(r, p, wasGroup && room.game_mode === 'mix');
  };

  const handleSkipTask = async (neverShowAgain = false) => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);

    if (neverShowAgain && room.current_task_id) {
      // In a real app we'd save deactivated tasks per room, we can store in current_task_state
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
    await addPlayerScore(
      room.id,
      targetPlayer,
      points,
      `${getCurrentTask()?.cat}: ${getCurrentTask()?.text}`,
      type === 'creative' ? 'creative' : 'general',
      getCurrentTask()
    );
    await handleFinishTask();
  };

  const handleGroupScoreAward = async (points) => {
    // Add score to all players in parallel
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

  // Continue after etappe pause
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

  // Reset lobby for a new session
  const handleNewGameStart = async () => {
    if (room) {
      await updateRoomState(room.id, { status: 'ended' });
    }
    clearSession();
  };

  // 6. Custom Tasks handlers (Manage Tasks Screen)
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

    // Add to local state (or in production, write to shared Custom Tasks table)
    setCustomTasks(prev => [newTask, ...prev]);
    alert("Opdracht toegevoegd!");
    document.getElementById("newText").value = "";
  };

  // 7. Render functions
  const renderAppHeader = (title = "Disney Road Quest", backAction = null) => {
    return (
      <div className="topbar">
        <div className="brand">
          <span className="castle">🏰</span>
          <span>{title}</span>
        </div>
        <div>
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
        {players.map(p => (
          <div key={p.id} className="scorepill">
            <b>{p.name}</b>
            <span>{p.score} ★</span>
          </div>
        ))}
      </div>
    );
  };

  // MAIN ROUTER VIEW
  return (
    <div className="app">
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
                <div className="portal-badge">✨ Magische Spelletjes Portal</div>
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
                    <span className="btn-play">Start Spel ➔</span>
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
                    <p>Dé interactieve muziekquiz met 100 betoverende Disney en Pixar songs. Scan scancodes met Spotify, raad de film, het jaartal of de uitvoerder en verover de troon!</p>
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
                    🔊 Spraak: {sound ? "Aan" : "Uit"}
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
                <h2 className="sectiontitle">1. Kies het speltype</h2>
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
                <h2 className="sectiontitle">2. Kies een spelversie</h2>
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
                <h2 className="sectiontitle">3. Spelers en lengte</h2>
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

                  <div className="progresswrap">
                    <div className="progress">
                      <i style={{ width: `${Math.min(100, Math.round((room.round / room.total_rounds) * 100))}%` }}></i>
                    </div>
                    <span className="small">{room.round}/{room.total_rounds} {isGroupOnly() ? "missies" : "beurten"}</span>
                  </div>

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
                          
                          {t.forbidden && (
                            <div className="forbidden">
                              {t.forbidden.map((f, i) => (
                                <span key={i}>🚫 {f}</span>
                              ))}
                            </div>
                          )}

                          {/* TASK CONTROLS */}
                          <div style={{ marginTop: '20px' }}>
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

                            {t.type === "quiz" && (
                              <div>
                                <div className="answers">
                                  {t.answers.map((ans, idx) => {
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
                                    <button className="btn primary" style={{ width: '100%' }} onClick={handleFinishTask}>
                                      Volgende opdracht
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {t.type === "guess" && (
                              <div>
                                <div id="timerArea" style={{ textAlign: 'center' }}>
                                  <div className={`timer ${secondsLeft <= 10 ? 'low' : ''}`}>{secondsLeft || t.seconds || 45}</div>
                                  {!timerRunning && secondsLeft === 0 && (
                                    <button className="btn secondary" onClick={() => {
                                      setSecondsLeft(t.seconds || 45);
                                      setTimerRunning(true);
                                    }}>
                                      Start timer
                                    </button>
                                  )}
                                </div>

                                {isMyTurn && (
                                  <div className="btnrow" style={{ marginTop: '12px' }}>
                                    <button className="btn ok" onClick={() => handleScoreAward(room.current_player_index, t.points || 2, 'creative')}>
                                      Geraden (+{t.points || 2} ★)
                                    </button>
                                    <button className="btn ghost" onClick={handleFinishTask}>
                                      Niet geraden
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {(t.type === "vote" || t.type === "spot") && (
                              <div>
                                <p className="small">Bespreek of voer de opdracht uit. Kies daarna wie de punten verdient.</p>
                                <div className="answers">
                                  {players.map((p, idx) => (
                                    <button 
                                      key={p.id}
                                      className="answer" 
                                      disabled={!isMyTurn}
                                      onClick={() => handleScoreAward(idx, t.points || 2, 'creative')}
                                    >
                                      ⭐ {p.name}
                                    </button>
                                  ))}
                                </div>
                                {isMyTurn && (
                                  <div style={{ marginTop: '10px' }}>
                                    <button className="btn ghost" style={{ width: '100%' }} onClick={handleFinishTask}>
                                      Niemand krijgt punten
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {t.type === "group" && (
                              <div>
                                {t.seconds && (
                                  <div id="timerArea" style={{ textAlign: 'center', marginBottom: '12px' }}>
                                    <div className={`timer ${secondsLeft <= 10 ? 'low' : ''}`}>{secondsLeft || t.seconds}</div>
                                    {!timerRunning && secondsLeft === 0 && (
                                      <button className="btn secondary" onClick={() => {
                                        setSecondsLeft(t.seconds);
                                        setTimerRunning(true);
                                      }}>
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
                          <div className="btnrow stack">
                            <button className="btn ghost" onClick={speakCurrentTask}>
                              🔊 Voorlezen
                            </button>
                            {isMyTurn && (
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
                </div>
              )}
            </div>
          )}

          {/* SCREEN: SCORES */}
          {screen === 'scores' && (
            <div>
              {renderAppHeader("Tussenstand", () => setScreen(scoreReturnScreen))}
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
                <div className="btnrow one">
                  <button className="btn secondary" onClick={() => setScreen('scorelog')}>
                    🧾 Scoreverloop aanpassen
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn primary" onClick={() => setScreen(scoreReturnScreen)}>
                    Terug naar het spel
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
                <div className="badge">Disney Road Quest · Multiplayer V1</div>
                <h2 className="sectiontitle" style={{ marginTop: '14px' }}>Nieuw en aangepast</h2>
                <div className="versionchanges">
                  <div className="versionchange">
                    <span>📱</span>
                    <div>
                      <strong>Realtime Spelen</strong>
                      <p>Speel nu tegelijk met 4 personen op je eigen mobiele telefoon! Geen telefoon-doorgeef-gedoe meer in de auto.</p>
                    </div>
                  </div>
                  <div className="versionchange">
                    <span>🗄️</span>
                    <div>
                      <strong>Supabase Backend</strong>
                      <p>Spelsynchronisatie en scoreborden worden direct gedeeld via Supabase Realtime.</p>
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
                    .filter(t => (t.cat + " " + t.text).toLowerCase().includes(taskSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(t => (
                      <div key={t.id} className="taskitem">
                        <b>{t.cat}</b>
                        <p>{t.text}</p>
                      </div>
                    ))
                  }
                  {customTasks
                    .filter(t => (t.cat + " " + t.text).toLowerCase().includes(taskSearch.toLowerCase()))
                    .map(t => (
                      <div key={t.id} className="taskitem" style={{ borderColor: 'var(--gold)' }}>
                        <b>{t.cat} (Aangepast)</b>
                        <p>{t.text}</p>
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
