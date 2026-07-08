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

  // New Interactive Games States
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [localEstimate, setLocalEstimate] = useState('');
  const [diaryChar, setDiaryChar] = useState('');
  const [diaryMovie, setDiaryMovie] = useState('');

  // Mastermind states
  const [mmCode, setMmCode] = useState([]);
  const [mmGuesses, setMmGuesses] = useState([]);
  const [mmCurrentGuess, setMmCurrentGuess] = useState([0, 0, 0, 0]);
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

  // Local timer
  useEffect(() => {
    if (timerRunning && secondsLeft > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerRunning, secondsLeft]);

  // Clean timer and interactive states on task change
  useEffect(() => {
    setTimerRunning(false);
    setSecondsLeft(0);
    setQuizLocked(false);
    setQuizSelectedAnswer(null);

    setDrawingPoints([]);
    setIsDrawing(false);
    setLocalEstimate('');
    setDiaryChar('');
    setDiaryMovie('');

    setMmGuesses([]);
    setMmCurrentGuess([0, 0, 0, 0]);
    setMmSolved(false);
    setMmFailed(false);
    setMmPointsEarned(0);
    if (getCurrentTask()?.type === 'mastermind') {
      const code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6));
      setMmCode(code);
    }

    setWhoamiRevealed(1);
    setWhoamiLocked(false);
    setWhoamiSelected(null);

    setFactLocked(false);
    setFactSelected(null);
  }, [room?.current_task_id]);

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
      current_task_id: selected.type === 'quiz' ? 'quiz-choice' : selected.id,
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
        votes: (selected.type === 'dilemma' || selected.type === 'estimate') ? {} : undefined
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

      await updateRoomState(room.id, {
        status: 'playing',
        current_player_index: startingIndex,
        round: 0,
        total_rounds: totalRounds
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
    }
  };

  const handleFinishTask = async () => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);

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
      `${getCurrentTask()?.cat}: ${getCurrentTask()?.text || getCurrentTask()?.title}`,
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

  // --- NEW INTERACTIVE HANDLERS ---

  // Pictionary
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

    // Check active player (within 20%)
    const diff = Math.abs(estimate - correct) / correct;
    if (diff <= 0.20) {
      await addPlayerScore(room.id, activePlayer, 2, `Inschatting: dichtbij het juiste antwoord (${correct})`, 'knowledge');
    }

    // Check other players
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
          const charCorrect = match(entry.char, [t.character, ...(t.character_aliases || [])]);
          const movieCorrect = match(entry.movie, [t.movie, ...(t.movie_aliases || [])]);
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

  // Mastermind
  const checkGuess = (guess, code) => {
    let black = 0;
    let white = 0;
    let codeUsed = Array(4).fill(false);
    let guessUsed = Array(4).fill(false);
    
    for (let i = 0; i < 4; i++) {
      if (guess[i] === code[i]) {
        black++;
        codeUsed[i] = true;
        guessUsed[i] = true;
      }
    }
    
    for (let i = 0; i < 4; i++) {
      if (guessUsed[i]) continue;
      for (let j = 0; j < 4; j++) {
        if (codeUsed[j]) continue;
        if (guess[i] === code[j]) {
          white++;
          codeUsed[j] = true;
          break;
        }
      }
    }
    return { black, white };
  };

  const handleMmSubmitGuess = () => {
    const feedback = checkGuess(mmCurrentGuess, mmCode);
    const updatedGuesses = [...mmGuesses, { guess: [...mmCurrentGuess], ...feedback }];
    setMmGuesses(updatedGuesses);
    
    if (feedback.black === 4) {
      setMmSolved(true);
      const turns = updatedGuesses.length;
      const pts = turns <= 3 ? 3 : turns <= 5 ? 2 : 1;
      setMmPointsEarned(pts);
    } else if (updatedGuesses.length >= 6) {
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
      const pts = whoamiRevealed === 1 ? 3 : whoamiRevealed === 2 ? 2 : 1;
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
      await addPlayerScore(room.id, localPlayer, 2, `Feit of Fabel: stelling correct beoordeeld`, 'knowledge');
    }
  };

  // Emoji Quiz
  const handleEmojiAnswer = async (idx, t) => {
    if (quizLocked) return;
    setQuizLocked(true);
    setQuizSelectedAnswer(idx);
    const correct = idx === t.correct;
    if (correct) {
      await addPlayerScore(room.id, localPlayer, 2, `Emoji Quiz: correct geraden`, 'knowledge');
    }
  };

  // --- RENDERING HELPERS ---

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

                                    <div className="btnrow stack">
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
                                // Guesser View
                                const myAnswers = diaryAnswers[localPlayer.id] || {};
                                const alreadySubmittedThisPart = !!myAnswers[`part${activePart}`];

                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a1c3c' }}>
                                      <strong>Luister naar {activePlayer?.name}! 👂</strong> Hij/zij leest een geheim dagboekfragment voor. Raad welk karakter vertelt en uit welke film het komt!
                                    </div>

                                    <div style={{ padding: '12px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                      <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '5px' }}>Lopend fragment (Meeleesscherm):</strong>
                                      <p style={{ margin: 0, fontStyle: 'italic', fontSize: '15px', lineHeight: '1.4' }}>
                                        {activePart >= 1 && t.part1}
                                        {activePart >= 2 && <><br /><br />{t.part2}</>}
                                        {activePart >= 3 && <><br /><br />{t.part3}</>}
                                      </p>
                                    </div>

                                    {alreadySubmittedThisPart ? (
                                      <div className="notice green">
                                        Je hebt je antwoord voor deel {activePart} ingediend. Wacht tot de voorlezer doorgaat...
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="field">
                                          <label>Welk Karakter?</label>
                                          <input placeholder="Bijv. Aladdin" value={diaryChar} onChange={e => setDiaryChar(e.target.value)} />
                                        </div>
                                        <div className="field">
                                          <label>Welke Film?</label>
                                          <input placeholder="Bijv. Aladdin" value={diaryMovie} onChange={e => setDiaryMovie(e.target.value)} />
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

                                      <div className="btnrow stack" style={{ marginTop: '10px' }}>
                                        <button className="btn secondary" onClick={handleClearDrawing}>Wis tekening</button>
                                        <button className="btn ghost" onClick={() => handleSkipTask(false)}>Overslaan</button>
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
                                // Active Player UI
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
                                // Guessers UI
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
                                    // Results diagram
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

                            {/* 7. EMOJI QUIZ */}
                            {t.type === "emoji" && (
                              <div>
                                <div className="center" style={{ fontSize: '48px', margin: '20px 0', letterSpacing: '4px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
                                  {t.text}
                                </div>
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
                                        onClick={() => handleEmojiAnswer(idx, t)}
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
                                      <button className="btn secondary mini" disabled={whoamiRevealed >= 2} onClick={handleWhoamiRevealHint}>
                                        Onthul Hint 2
                                      </button>
                                      <button className="btn secondary mini" disabled={whoamiRevealed < 2 || whoamiRevealed >= 3} onClick={handleWhoamiRevealHint}>
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

                            {/* 9. DISNEY MASTERMIND */}
                            {t.type === "mastermind" && (() => {
                              const colors = [
                                { label: '🔴 Mickey', color: '#ff7b8b' },
                                { label: '🦁 Simba', color: '#ffd45c' },
                                { label: '🔵 Stitch', color: '#74d7ff' },
                                { label: '🟢 Buzz', color: '#65d9a3' },
                                { label: '🟡 Winnie', color: '#ffe680' },
                                { label: '🟣 Ursula', color: '#bd53ed' }
                              ];

                              if (isMyTurn) {
                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a1c3c' }}>
                                      Vul de stippen met kleuren en klik op check. Vind de 4 juiste figuren en hun positie!
                                    </div>

                                    {/* Guesses log */}
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
                                          Check Poging ({mmGuesses.length + 1}/6)
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
                                      {Array.from({ length: 4 }).map((_, i) => (
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

                            {/* 11. SAMEN (COOP) */}
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
                <div className="badge">Disney Road Quest · Multiplayer V2</div>
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
                    <span>📰</span>
                    <div>
                      <strong>Magisch Nieuws</strong>
                      <p>Sfeervolle Disneyland Paris en Disney trivia op het tussenstand-scherm om de reis op te leuken.</p>
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
                <h2 className="sectiontitle">All opdrachten</h2>
                <div className="field">
                  <input 
                    placeholder="Zoek opdracht..." 
                    value={taskSearch} 
                    onChange={e => setTaskSearch(e.target.value)}
                  />
                </div>
                <div className="list">
                  {DEFAULT_TASKS
                    .filter(t => (t.cat + " " + (t.text || t.title || "")).toLowerCase().includes(taskSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(t => (
                      <div key={t.id} className="taskitem">
                        <b>{t.cat}</b>
                        <p>{t.text || t.title || ""}</p>
                      </div>
                    ))
                  }
                  {customTasks
                    .filter(t => (t.cat + " " + (t.text || t.title || "")).toLowerCase().includes(taskSearch.toLowerCase()))
                    .map(t => (
                      <div key={t.id} className="taskitem" style={{ borderColor: 'var(--gold)' }}>
                        <b>{t.cat} (Aangepast)</b>
                        <p>{t.text || t.title || ""}</p>
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
