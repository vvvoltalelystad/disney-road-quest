import React, { useState, useEffect, useRef } from 'react';

// Emojis mapping for players
const P1_CHAR = "👑"; // King/Mickey theme
const P2_CHAR = "🍎"; // Villain theme

// Helper to check Othello valid moves
const getOthelloValidMoves = (board, player) => {
  const moves = [];
  const opponent = player === 'blue' ? 'red' : 'blue';
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] !== null) continue;

      let isMoveValid = false;
      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        let hasOpponentBetween = false;

        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (board[nr][nc] === opponent) {
            hasOpponentBetween = true;
          } else if (board[nr][nc] === player) {
            if (hasOpponentBetween) {
              isMoveValid = true;
            }
            break;
          } else {
            break;
          }
          nr += dr;
          nc += dc;
        }
        if (isMoveValid) break;
      }

      if (isMoveValid) {
        moves.push({ r, c });
      }
    }
  }
  return moves;
};

// Helper to flip pieces in Othello
const makeOthelloMove = (board, r, c, player) => {
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = player;
  const opponent = player === 'blue' ? 'red' : 'blue';
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dr, dc] of directions) {
    let nr = r + dr;
    let nc = c + dc;
    const toFlip = [];

    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      if (newBoard[nr][nc] === opponent) {
        toFlip.push({ r: nr, c: nc });
      } else if (newBoard[nr][nc] === player) {
        for (const cell of toFlip) {
          newBoard[cell.r][cell.c] = player;
        }
        break;
      } else {
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return newBoard;
};

// ----------------------------------------------------
// 1. OTHELLO COMPONENT
// ----------------------------------------------------
export function OthelloGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const isP1 = isSolo || (players[0]?.id === localPlayer.id);
  const myColor = isP1 ? 'blue' : 'red';

  const taskState = room.current_task_state || {};
  const board = taskState.othelloBoard || [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, 'red', 'blue', null, null, null],
    [null, null, null, 'blue', 'red', null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null]
  ];
  const activeColor = taskState.othelloTurn || 'blue'; // blue starts

  const validMoves = getOthelloValidMoves(board, activeColor);
  const myTurn = activeColor === myColor;

  const countPieces = () => {
    let blue = 0;
    let red = 0;
    board.forEach(row => row.forEach(cell => {
      if (cell === 'blue') blue++;
      if (cell === 'red') red++;
    }));
    return { blue, red };
  };

  const { blue, red } = countPieces();

  useEffect(() => {
    // If board is uninitialized, set it in Supabase/State
    if (!taskState.othelloBoard) {
      updateRoomState(room.id, {
        current_task_state: {
          ...taskState,
          othelloBoard: board,
          othelloTurn: 'blue'
        }
      });
    }
  }, []);

  // AI Logic for Solo Mode
  useEffect(() => {
    if (isSolo && activeColor === 'red') {
      const timer = setTimeout(() => {
        const aiMoves = getOthelloValidMoves(board, 'red');
        if (aiMoves.length > 0) {
          // Greedy AI: choose move with most flips
          let bestMove = aiMoves[0];
          let maxFlips = -1;
          for (const m of aiMoves) {
            const tempBoard = makeOthelloMove(board, m.r, m.c, 'red');
            const flips = tempBoard.flat().filter(c => c === 'red').length - board.flat().filter(c => c === 'red').length;
            if (flips > maxFlips) {
              maxFlips = flips;
              bestMove = m;
            }
          }
          const nextBoard = makeOthelloMove(board, bestMove.r, bestMove.c, 'red');
          const nextOpponentMoves = getOthelloValidMoves(nextBoard, 'blue');
          const nextTurn = nextOpponentMoves.length > 0 ? 'blue' : 'red';

          updateRoomState(room.id, {
            current_task_state: {
              ...taskState,
              othelloBoard: nextBoard,
              othelloTurn: nextTurn
            }
          });
        } else {
          // AI has no moves, pass turn back to player
          const playerMoves = getOthelloValidMoves(board, 'blue');
          if (playerMoves.length > 0) {
            updateRoomState(room.id, {
              current_task_state: {
                ...taskState,
                othelloTurn: 'blue'
              }
            });
          } else {
            // Both stuck, end game
            handleEndGame(board);
          }
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeColor, isSolo]);

  const handleCellClick = (r, c) => {
    if (!myTurn || isSolo && activeColor === 'red') return;
    if (!validMoves.some(m => m.r === r && m.c === c)) return;

    const nextBoard = makeOthelloMove(board, r, c, myColor);
    const opponent = myColor === 'blue' ? 'red' : 'blue';
    const opponentMoves = getOthelloValidMoves(nextBoard, opponent);
    
    let nextTurn = opponent;
    if (opponentMoves.length === 0) {
      // Opponent passes
      const myNextMoves = getOthelloValidMoves(nextBoard, myColor);
      if (myNextMoves.length === 0) {
        // Both pass, end game
        handleEndGame(nextBoard);
        return;
      }
      nextTurn = myColor;
    }

    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        othelloBoard: nextBoard,
        othelloTurn: nextTurn
      }
    });
  };

  const handleEndGame = (finalBoard) => {
    let bCount = 0;
    let rCount = 0;
    finalBoard.forEach(row => row.forEach(cell => {
      if (cell === 'blue') bCount++;
      if (cell === 'red') rCount++;
    }));

    let won = false;
    if (myColor === 'blue' && bCount > rCount) won = true;
    if (myColor === 'red' && rCount > bCount) won = true;
    const tie = bCount === rCount;

    const score = won ? 3 : tie ? 2 : 1;
    const detail = won ? "Othello gewonnen!" : tie ? "Othello gelijkspel" : "Othello verloren";
    onFinish(score, detail);
  };

  const isGameOver = getOthelloValidMoves(board, 'blue').length === 0 && getOthelloValidMoves(board, 'red').length === 0;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '15px 0', fontSize: '16px' }}>
        <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
          🔵 {isP1 ? "Jij" : (players[0]?.name || "Speler 1")}: {blue}
        </div>
        <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
          🔴 {!isP1 ? "Jij" : (isSolo ? "Computer" : (players[1]?.name || "Speler 2"))}: {red}
        </div>
      </div>

      <div style={{ margin: '10px 0', fontSize: '14px', color: '#fff' }}>
        {isGameOver ? (
          <button className="btn primary" onClick={() => handleEndGame(board)}>Voltooien & Score opslaan</button>
        ) : myTurn ? (
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>⚡ Het is JOUW beurt! Tik op een vakje met een gloed.</span>
        ) : (
          <span>Wachten op tegenstander... ⏳</span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px',
        maxWidth: '340px',
        margin: '15px auto',
        background: '#041026',
        padding: '8px',
        borderRadius: '16px',
        border: '2px solid var(--line)'
      }}>
        {board.map((row, rIdx) => 
          row.map((cell, cIdx) => {
            const isValid = myTurn && validMoves.some(m => m.r === rIdx && m.c === cIdx);
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleCellClick(rIdx, cIdx)}
                style={{
                  aspectRatio: '1',
                  background: '#0a2046',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isValid ? 'pointer' : 'default',
                  border: '1px solid #142f5d',
                  boxShadow: isValid ? '0 0 8px var(--gold)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {cell === 'blue' && (
                  <div style={{ width: '80%', height: '80%', borderRadius: '50%', background: 'linear-gradient(135deg, #4da3ff, #0055ff)', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}></div>
                )}
                {cell === 'red' && (
                  <div style={{ width: '80%', height: '80%', borderRadius: '50%', background: 'linear-gradient(135deg, #ff5e62, #ff2525)', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. DOTS & BOXES COMPONENT
// ----------------------------------------------------
export function DotsBoxesGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const playerColors = ['#0077ff', '#ff3b30', '#ffcc00', '#4cd964'];
  
  const myIndex = players.findIndex(p => p.id === localPlayer.id);
  const activeIndex = room.current_player_index || 0;
  const myTurn = myIndex === activeIndex;

  const taskState = room.current_task_state || {};
  const hLines = taskState.hLines || Array(12).fill(false);
  const vLines = taskState.vLines || Array(12).fill(false);
  const boxes = taskState.boxes || Array(9).fill(null);

  useEffect(() => {
    if (!taskState.hLines) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          hLines,
          vLines,
          boxes
        }
      });
    }
  }, []);

  // AI Logic for Solo mode
  useEffect(() => {
    if (isSolo && activeIndex === 1) {
      const timer = setTimeout(() => {
        const availableH = [];
        const availableV = [];
        hLines.forEach((l, i) => { if (!l) availableH.push(i); });
        vLines.forEach((l, i) => { if (!l) availableV.push(i); });

        if (availableH.length === 0 && availableV.length === 0) return;

        let selectedMove = null;
        let isH = true;

        const checkCompletesBox = (hIdx, isHorizontal) => {
          const testH = [...hLines];
          const testV = [...vLines];
          if (isHorizontal) testH[hIdx] = true;
          else testV[hIdx] = true;

          for (let b = 0; b < 9; b++) {
            if (boxes[b] !== null) continue;
            const r = Math.floor(b / 3);
            const c = b % 3;
            const top = testH[r * 3 + c];
            const bottom = testH[(r + 1) * 3 + c];
            const left = testV[r * 4 + c];
            const right = testV[r * 4 + c + 1];
            if (top && bottom && left && right) return true;
          }
          return false;
        };

        for (const h of availableH) {
          if (checkCompletesBox(h, true)) { selectedMove = h; isH = true; break; }
        }
        if (selectedMove === null) {
          for (const v of availableV) {
            if (checkCompletesBox(v, false)) { selectedMove = v; isH = false; break; }
          }
        }

        if (selectedMove === null) {
          if (availableH.length > 0 && (availableV.length === 0 || Math.random() < 0.5)) {
            selectedMove = availableH[Math.floor(Math.random() * availableH.length)];
            isH = true;
          } else {
            selectedMove = availableV[Math.floor(Math.random() * availableV.length)];
            isH = false;
          }
        }

        const nextH = [...hLines];
        const nextV = [...vLines];
        if (isH) nextH[selectedMove] = true;
        else nextV[selectedMove] = true;

        const nextBoxes = [...boxes];
        let boxCompleted = false;
        for (let b = 0; b < 9; b++) {
          if (nextBoxes[b] !== null) continue;
          const r = Math.floor(b / 3);
          const c = b % 3;
          const top = nextH[r * 3 + c];
          const bottom = nextH[(r + 1) * 3 + c];
          const left = nextV[r * 4 + c];
          const right = nextV[r * 4 + c + 1];
          if (top && bottom && left && right) {
            nextBoxes[b] = 1;
            boxCompleted = true;
          }
        }

        const nextActive = boxCompleted ? 1 : 0;
        updateRoomState(room.id, {
          current_player_index: nextActive,
          current_task_state: {
            ...taskState,
            hLines: nextH,
            vLines: nextV,
            boxes: nextBoxes
          }
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, isSolo]);

  const handleLineClick = (index, isHorizontal) => {
    if (!myTurn || isSolo && activeIndex === 1) return;
    if (isHorizontal && hLines[index]) return;
    if (!isHorizontal && vLines[index]) return;

    const nextH = [...hLines];
    const nextV = [...vLines];
    if (isHorizontal) nextH[index] = true;
    else nextV[index] = true;

    const nextBoxes = [...boxes];
    let boxCompleted = false;
    for (let b = 0; b < 9; b++) {
      if (nextBoxes[b] !== null) continue;
      const r = Math.floor(b / 3);
      const c = b % 3;
      const top = nextH[r * 3 + c];
      const bottom = nextH[(r + 1) * 3 + c];
      const left = nextV[r * 4 + c];
      const right = nextV[r * 4 + c + 1];
      if (top && bottom && left && right) {
        nextBoxes[b] = myIndex;
        boxCompleted = true;
      }
    }

    const totalPlayers = isSolo ? 2 : players.length;
    const nextActive = boxCompleted ? myIndex : (myIndex + 1) % totalPlayers;

    updateRoomState(room.id, {
      current_player_index: nextActive,
      current_task_state: {
        ...taskState,
        hLines: nextH,
        vLines: nextV,
        boxes: nextBoxes
      }
    });
  };

  const getScores = () => {
    const scores = Array(isSolo ? 2 : players.length).fill(0);
    boxes.forEach(owner => {
      if (owner !== null && owner < scores.length) scores[owner]++;
    });
    return scores;
  };

  const scores = getScores();
  const isGameOver = boxes.every(b => b !== null);

  const handleEndGame = () => {
    const myScore = scores[myIndex];
    const maxScore = Math.max(...scores);
    const win = myScore === maxScore;
    const tie = scores.filter(s => s === maxScore).length > 1;

    const pts = win ? 3 : tie ? 2 : 1;
    const details = win ? "Kamertje verhuren gewonnen!" : tie ? "Gelijkspel" : "Verloren";
    onFinish(pts, details);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '10px 0', flexWrap: 'wrap' }}>
        {(isSolo ? ["Jij", "Computer"] : players.map(p => p.name)).map((name, idx) => (
          <div key={idx} style={{ color: playerColors[idx] || '#fff', fontWeight: 'bold' }}>
            {idx === activeIndex ? "⚡ " : ""}{name}: {scores[idx]} pts
          </div>
        ))}
      </div>

      <div style={{ margin: '10px 0', fontSize: '13px' }}>
        {isGameOver ? (
          <button className="btn primary" onClick={handleEndGame}>Voltooien & Score opslaan</button>
        ) : myTurn ? (
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Jouw beurt! Klik op een stippellijn om hem in te kleuren.</span>
        ) : (
          <span>Wachten op tegenstander...</span>
        )}
      </div>

      <svg width="240" height="240" viewBox="0 0 240 240" style={{ margin: '20px auto', display: 'block', background: '#091c38', borderRadius: '16px', border: '1px solid var(--line)' }}>
        {boxes.map((owner, idx) => {
          if (owner === null) return null;
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          return (
            <rect
              key={idx}
              x={30 + c * 60 + 5}
              y={30 + r * 60 + 5}
              width="50"
              height="50"
              fill={playerColors[owner]}
              opacity="0.15"
              rx="6"
            />
          );
        })}

        {hLines.map((line, idx) => {
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          const x1 = 30 + c * 60;
          const y1 = 30 + r * 60;
          return (
            <line
              key={`h-${idx}`}
              x1={x1}
              y1={y1}
              x2={x1 + 60}
              y2={y1}
              stroke={line ? (playerColors[0]) : 'rgba(255,255,255,0.1)'}
              strokeWidth="5"
              strokeDasharray={line ? "none" : "3,3"}
              style={{ cursor: myTurn ? 'pointer' : 'default' }}
              onClick={() => handleLineClick(idx, true)}
            />
          );
        })}

        {vLines.map((line, idx) => {
          const r = Math.floor(idx / 4);
          const c = idx % 4;
          const x1 = 30 + c * 60;
          const y1 = 30 + r * 60;
          return (
            <line
              key={`v-${idx}`}
              x1={x1}
              y1={y1}
              x2={x1}
              y2={y1 + 60}
              stroke={line ? (playerColors[0]) : 'rgba(255,255,255,0.1)'}
              strokeWidth="5"
              strokeDasharray={line ? "none" : "3,3"}
              style={{ cursor: myTurn ? 'pointer' : 'default' }}
              onClick={() => handleLineClick(idx, false)}
            />
          );
        })}

        {Array.from({ length: 16 }).map((_, idx) => {
          const r = Math.floor(idx / 4);
          const c = idx % 4;
          return (
            <circle
              key={idx}
              cx={30 + c * 60}
              cy={30 + r * 60}
              r="6"
              fill="#fff"
              stroke="var(--gold)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// 3. COLOR LINES COMPONENT (Pure Solo)
// ----------------------------------------------------
export function ColorLinesGame({ onFinish }) {
  const [board, setBoard] = useState(Array(81).fill(null));
  const [score, setScore] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [nextColors, setNextColors] = useState([]);
  const [gameOver, setGameOver] = useState(false);

  const colors = ['#0077ff', '#ff3b30', '#ffcc00', '#4cd964', '#bd53ed', '#ff9500'];

  useEffect(() => {
    const initialBoard = Array(81).fill(null);
    const indices = [];
    while (indices.length < 5) {
      const idx = Math.floor(Math.random() * 81);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.forEach(idx => {
      initialBoard[idx] = colors[Math.floor(Math.random() * colors.length)];
    });
    setBoard(initialBoard);

    setNextColors([
      colors[Math.floor(Math.random() * colors.length)],
      colors[Math.floor(Math.random() * colors.length)],
      colors[Math.floor(Math.random() * colors.length)]
    ]);
  }, []);

  const hasPath = (start, end) => {
    const queue = [start];
    const visited = new Set();
    visited.add(start);

    const getNeighbors = (idx) => {
      const neighbors = [];
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      if (r > 0) neighbors.push(idx - 9);
      if (r < 8) neighbors.push(idx + 9);
      if (c > 0) neighbors.push(idx - 1);
      if (c < 8) neighbors.push(idx + 1);
      return neighbors.filter(n => board[n] === null);
    };

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === end) return true;
      for (const n of getNeighbors(curr)) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return false;
  };

  const checkLines = (currentBoard) => {
    const toClear = new Set();

    const checkDir = (start, dr, dc) => {
      const r = Math.floor(start / 9);
      const c = start % 9;
      const val = currentBoard[start];
      if (!val) return;

      const lineCells = [start];
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
        const nextIdx = nr * 9 + nc;
        if (currentBoard[nextIdx] === val) {
          lineCells.push(nextIdx);
        } else {
          break;
        }
        nr += dr;
        nc += dc;
      }

      if (lineCells.length >= 5) {
        lineCells.forEach(cell => toClear.add(cell));
      }
    };

    for (let i = 0; i < 81; i++) {
      checkDir(i, 0, 1);
      checkDir(i, 1, 0);
      checkDir(i, 1, 1);
      checkDir(i, 1, -1);
    }

    if (toClear.size > 0) {
      const nextBoard = [...currentBoard];
      toClear.forEach(idx => { nextBoard[idx] = null; });
      setBoard(nextBoard);
      setScore(prev => prev + toClear.size * 2);
      return true;
    }
    return false;
  };

  const handleCellClick = (idx) => {
    if (gameOver) return;

    if (board[idx] !== null) {
      setSelectedIdx(idx);
    } else if (selectedIdx !== null) {
      if (hasPath(selectedIdx, idx)) {
        const nextBoard = [...board];
        nextBoard[idx] = board[selectedIdx];
        nextBoard[selectedIdx] = null;

        const cleared = checkLines(nextBoard);
        if (!cleared) {
          const emptyIndices = [];
          nextBoard.forEach((cell, i) => { if (cell === null) emptyIndices.push(i); });

          if (emptyIndices.length <= 3) {
            setGameOver(true);
            return;
          }

          for (let i = 0; i < 3; i++) {
            const rIdx = emptyIndices.splice(Math.floor(Math.random() * emptyIndices.length), 1)[0];
            nextBoard[rIdx] = nextColors[i];
          }

          checkLines(nextBoard);
          setBoard(nextBoard);

          setNextColors([
            colors[Math.floor(Math.random() * colors.length)],
            colors[Math.floor(Math.random() * colors.length)],
            colors[Math.floor(Math.random() * colors.length)]
          ]);
        } else {
          setBoard(nextBoard);
        }
        setSelectedIdx(null);
      }
    }
  };

  const handleFinishScore = () => {
    let pts = 1;
    let rating = "Matig";
    if (score >= 40) { pts = 3; rating = "Goed"; }
    else if (score >= 20) { pts = 2; rating = "Gemiddeld"; }
    
    onFinish(pts, `Color Lines score: ${score} (${rating})`);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 20px' }}>
        <div style={{ color: 'var(--gold)', fontSize: '20px', fontWeight: 'bold' }}>Score: {score} ★</div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', marginRight: '4px' }}>Volgende:</span>
          {nextColors.map((col, i) => (
            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: col }}></div>
          ))}
        </div>
      </div>

      {gameOver ? (
        <div style={{ margin: '20px 0' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '10px' }}>Game Over! Geen vrije plekken meer.</h3>
          <button className="btn primary" onClick={handleFinishScore}>Score opslaan</button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: '3px',
          maxWidth: '350px',
          margin: '10px auto',
          background: '#041026',
          padding: '6px',
          borderRadius: '16px',
          border: '1.5px solid var(--line)'
        }}>
          {board.map((cell, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => handleCellClick(idx)}
                style={{
                  aspectRatio: '1',
                  background: isSelected ? 'rgba(255, 212, 92, 0.15)' : '#091c38',
                  borderRadius: '4px',
                  border: isSelected ? '1.5px solid var(--gold)' : '1px solid #142f5d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease'
                }}
              >
                {cell && (
                  <div style={{
                    width: '80%',
                    height: '80%',
                    borderRadius: '50%',
                    background: cell,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                  }}></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 4. RICOCHET SHOT COMPONENT (Fysica & Realtime Duel)
// ----------------------------------------------------
const createRicochetStars = () => [
  { x: 80, y: 70, collected: false },
  { x: 220, y: 80, collected: false },
  { x: 150, y: 150, collected: false },
  { x: 60, y: 220, collected: false },
  { x: 240, y: 220, collected: false }
];

const createRicochetBall = () => ({ x: 150, y: 270, vx: 0, vy: 0, isMoving: false });

export function RicochetShotGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const activeIndex = room.current_player_index || 0;
  const taskState = room.current_task_state || {};

  const syncedStars = taskState.ricochetStars || createRicochetStars();
  const syncedBall = taskState.ricochetBall || createRicochetBall();
  const syncedScores = taskState.ricochetScores || {};
  const totalDuelPlayers = Math.min(2, players.length || 2);
  const duelFinished = !isSolo && Object.keys(syncedScores).length >= totalDuelPlayers;

  const [localStars, setLocalStars] = useState(createRicochetStars);
  const [shotsLeft, setShotsLeft] = useState(5);
  const [localBall, setLocalBall] = useState(createRicochetBall);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const walls = [
    { x1: 0, y1: 0, x2: 300, y2: 0 },
    { x1: 0, y1: 0, x2: 0, y2: 300 },
    { x1: 300, y1: 0, x2: 300, y2: 300 },
    { x1: 0, y1: 300, x2: 300, y2: 300 },
    { x1: 0, y1: 110, x2: 110, y2: 110 },
    { x1: 190, y1: 110, x2: 300, y2: 110 },
    { x1: 100, y1: 190, x2: 200, y2: 190 }
  ];

  const stars = isSolo ? localStars : syncedStars;
  const ball = isSolo ? localBall : syncedBall;
  const myTurn = isSolo || activeIndex === myIndex;
  const hasPlayedDuelShot = !isSolo && syncedScores[myIndex] !== undefined;
  const canShoot = myTurn && !ball.isMoving && !duelFinished && !hasPlayedDuelShot;
  const physicsBallRef = useRef(ball);
  const physicsStarsRef = useRef(stars);

  useEffect(() => {
    physicsBallRef.current = ball;
    physicsStarsRef.current = stars;
  }, [ball, stars]);

  useEffect(() => {
    if (isSolo || taskState.ricochetInitialized) return;

    updateRoomState(room.id, {
      current_player_index: 0,
      current_task_state: {
        ...taskState,
        ricochetInitialized: true,
        ricochetStars: createRicochetStars(),
        ricochetBall: createRicochetBall(),
        ricochetScores: {}
      }
    });
  }, []);

  const handlePointerDown = (e) => {
    if (!canShoot || (isSolo && shotsLeft === 0)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - ball.x, y - ball.y);
    if (dist < 30) {
      setDragStart({ x: ball.x, y: ball.y });
      setDragCurrent({ x, y });
    }
  };

  const handlePointerMove = (e) => {
    if (!dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragCurrent({ x, y });
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent) return;

    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const nextBall = {
      ...ball,
      vx: dx * 0.15,
      vy: dy * 0.15,
      isMoving: true
    };

    if (isSolo) {
      setLocalBall(nextBall);
      setShotsLeft(prev => prev - 1);
    } else {
      updateRoomState(room.id, {
        current_task_state: {
          ...taskState,
          ricochetBall: nextBall
        }
      });
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  useEffect(() => {
    if (!ball.isMoving) return;
    if (!isSolo && activeIndex !== myIndex) return;

    const stepBall = (currentBall, currentStars) => {
      let nx = currentBall.x + currentBall.vx;
      let ny = currentBall.y + currentBall.vy;
      let nvx = currentBall.vx * 0.99;
      let nvy = currentBall.vy * 0.99;

      if (nx < 8) { nx = 8; nvx = -nvx; }
      if (nx > 292) { nx = 292; nvx = -nvx; }
      if (ny < 8) { ny = 8; nvy = -nvy; }
      if (ny > 292) { ny = 292; nvy = -nvy; }

      if (ny > 102 && ny < 118 && nx < 110) { nvy = -nvy; ny = currentBall.y; }
      if (ny > 102 && ny < 118 && nx > 190) { nvy = -nvy; ny = currentBall.y; }
      if (ny > 182 && ny < 198 && nx > 100 && nx < 200) { nvy = -nvy; ny = currentBall.y; }

      const nextStars = currentStars.map(star => {
        if (star.collected) return star;
        const dist = Math.hypot(nx - star.x, ny - star.y);
        if (dist < 15) return { ...star, collected: true };
        return star;
      });

      const speed = Math.hypot(nvx, nvy);
      if (speed < 0.2) {
        return {
          ball: { x: 150, y: 270, vx: 0, vy: 0, isMoving: false },
          stars: nextStars,
          stopped: true
        };
      }

      return {
        ball: { ...currentBall, x: nx, y: ny, vx: nvx, vy: nvy },
        stars: nextStars,
        stopped: false
      };
    };

    const updatePhysics = () => {
      const currentBall = physicsBallRef.current;
      const currentStars = physicsStarsRef.current;

      if (isSolo) {
        const next = stepBall(currentBall, currentStars);
        physicsBallRef.current = next.ball;
        physicsStarsRef.current = next.stars;
        setLocalBall(next.ball);
        setLocalStars(next.stars);
        if (next.stopped) return;

        animationRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      const next = stepBall(currentBall, currentStars);
      physicsBallRef.current = next.ball;
      physicsStarsRef.current = next.stars;
      const nextState = {
        ...taskState,
        ricochetStars: next.stars,
        ricochetBall: next.ball
      };

      if (next.stopped) {
        const collected = next.stars.filter(s => s.collected).length;
        const nextScores = { ...syncedScores, [activeIndex]: collected };
        const nextActiveIndex = (activeIndex + 1) % totalDuelPlayers;
        const allDone = Object.keys(nextScores).length >= totalDuelPlayers;

        nextState.ricochetScores = nextScores;
        if (!allDone) {
          nextState.ricochetStars = createRicochetStars();
          nextState.ricochetBall = createRicochetBall();
        }

        updateRoomState(room.id, {
          current_player_index: allDone ? activeIndex : nextActiveIndex,
          current_task_state: nextState
        });
        return;
      }

      updateRoomState(room.id, { current_task_state: nextState });
      animationRef.current = requestAnimationFrame(updatePhysics);
    };

    animationRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationRef.current);
  }, [ball.isMoving, ball.x, ball.y, ball.vx, ball.vy, activeIndex, isSolo]);

  const collectedCount = stars.filter(s => s.collected).length;
  const isGameOver = isSolo
    ? (shotsLeft === 0 && !ball.isMoving || collectedCount === 5)
    : duelFinished;

  const handleFinishGame = () => {
    if (isSolo) {
      let pts = 1;
      let label = "Matig";
      if (collectedCount === 5) { pts = 3; label = "Uitstekend"; }
      else if (collectedCount >= 3) { pts = 2; label = "Gemiddeld"; }
      onFinish(pts, `Ricochet Shot: ${collectedCount}/5 sterren verzameld (${label})`);
      return;
    }

    const myScore = syncedScores[myIndex] || 0;
    const bestScore = Math.max(...Object.values(syncedScores));
    const winnerCount = Object.values(syncedScores).filter(score => score === bestScore).length;
    const won = myScore === bestScore;
    const pts = won ? (winnerCount > 1 ? 2 : 3) : 1;
    const label = won ? (winnerCount > 1 ? "gelijkspel" : "gewonnen") : "verloren";
    onFinish(pts, `Ricochet Shot ${label}: ${myScore}/5 sterren`);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', margin: '10px 20px', flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Sterren: {collectedCount}/5</div>
        {isSolo ? (
          <div style={{ color: '#fff' }}>Schoten over: {shotsLeft}</div>
        ) : (
          <div style={{ color: '#fff' }}>
            {players.slice(0, totalDuelPlayers).map((p, idx) => `${p.name}: ${syncedScores[idx] ?? '-'}`).join(' | ')}
          </div>
        )}
      </div>

      <div style={{ margin: '10px 0', fontSize: '13px' }}>
        {isGameOver ? (
          <button className="btn primary" onClick={handleFinishGame}>Voltooien & Score opslaan</button>
        ) : !isSolo && hasPlayedDuelShot ? (
          <span>Jouw schot zit erop. Wachten op de andere speler...</span>
        ) : !myTurn ? (
          <span>Wachten op tegenstander...</span>
        ) : !ball.isMoving ? (
          <span>Sleep de bal naar achteren om te richten en laat los!</span>
        ) : (
          <span>Kaatsen...</span>
        )}
      </div>

      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          background: '#041026',
          borderRadius: '16px',
          border: '2px solid var(--line)',
          display: 'block',
          margin: '15px auto',
          touchAction: 'none'
        }}
      >
        {walls.map((w, i) => (
          <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#3b5e9a" strokeWidth="6" strokeLinecap="round" />
        ))}

        {stars.map((star, i) => (
          <g key={i} opacity={star.collected ? 0.2 : 1}>
            <text x={star.x - 10} y={star.y + 8} fontSize="20">*</text>
          </g>
        ))}

        {dragStart && dragCurrent && (
          <line
            x1={ball.x}
            y1={ball.y}
            x2={ball.x + (dragStart.x - dragCurrent.x) * 2}
            y2={ball.y + (dragStart.y - dragCurrent.y) * 2}
            stroke="var(--gold)"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        )}

        <circle cx={ball.x} cy={ball.y} r="8" fill="#00a7ff" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
// ----------------------------------------------------
// 5. CURLING DUEL COMPONENT (Fysica & Realtime Duel)
// ----------------------------------------------------
export function CurlingGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const playerColors = ['#0077ff', '#ff3b30'];
  
  const myIndex = players.findIndex(p => p.id === localPlayer.id);
  const activeIndex = room.current_player_index || 0;
  const myTurn = myIndex === activeIndex;

  const taskState = room.current_task_state || {};
  const stones = taskState.stones || [];

  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  const animationRef = useRef(null);

  useEffect(() => {
    if (!taskState.stones) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          stones: []
        }
      });
    }
  }, []);

  const handlePointerDown = (e) => {
    if (!myTurn || isSolo && activeIndex === 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (y > 200) {
      setDragStart({ x: 150, y: 280 });
      setDragCurrent({ x, y });
    }
  };

  const handlePointerMove = (e) => {
    if (!dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragCurrent({ x, y });
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent) return;

    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;

    const newStone = {
      x: 150,
      y: 280,
      vx: dx * 0.08,
      vy: Math.min(-2, dy * 0.08),
      colorIdx: activeIndex
    };

    const nextStones = [...stones, newStone];
    const totalPlayers = isSolo ? 2 : players.length;
    const nextActive = (activeIndex + 1) % totalPlayers;

    updateRoomState(room.id, {
      current_player_index: nextActive,
      current_task_state: {
        ...taskState,
        stones: nextStones
      }
    });

    setDragStart(null);
    setDragCurrent(null);
  };

  useEffect(() => {
    if (isSolo && activeIndex === 1) {
      const timer = setTimeout(() => {
        const scatterX = (Math.random() - 0.5) * 20;
        const scatterY = (Math.random() - 0.5) * 10;
        const targetX = 150 + scatterX;
        const targetY = 70 + scatterY;

        const vx = (targetX - 150) * 0.03;
        const vy = -6.5 + scatterY * 0.05;

        const newStone = {
          x: 150,
          y: 280,
          vx,
          vy,
          colorIdx: 1
        };

        const nextStones = [...stones, newStone];
        updateRoomState(room.id, {
          current_player_index: 0,
          current_task_state: {
            ...taskState,
            stones: nextStones
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, isSolo]);

  useEffect(() => {
    let hasMovement = false;
    stones.forEach(s => {
      if (Math.hypot(s.vx, s.vy) > 0.05) hasMovement = true;
    });

    if (!hasMovement) return;

    const runPhysicsFrame = () => {
      let nextStones = stones.map(s => {
        let nx = s.x + s.vx;
        let ny = s.y + s.vy;
        let nvx = s.vx * 0.985;
        let nvy = s.vy * 0.985;

        if (nx < 12) { nx = 12; nvx = -nvx; }
        if (nx > 288) { nx = 288; nvx = -nvx; }
        if (ny < 12) { ny = 12; nvy = -nvy; }
        if (ny > 288) { ny = 288; nvy = -nvy; }

        if (Math.hypot(nvx, nvy) < 0.05) {
          nvx = 0;
          nvy = 0;
        }

        return { ...s, x: nx, y: ny, vx: nvx, vy: nvy };
      });

      for (let i = 0; i < nextStones.length; i++) {
        for (let j = i + 1; j < nextStones.length; j++) {
          const s1 = nextStones[i];
          const s2 = nextStones[j];
          const dist = Math.hypot(s1.x - s2.x, s1.y - s2.y);
          
          if (dist < 24) {
            const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            const vx1 = s1.vx * cos + s1.vy * sin;
            const vy1 = s1.vy * cos - s1.vx * sin;
            const vx2 = s2.vx * cos + s2.vy * sin;
            const vy2 = s2.vy * cos - s2.vx * sin;

            const tempVx1 = vx2;
            const tempVx2 = vx1;

            nextStones[i].vx = tempVx1 * cos - vy1 * sin;
            nextStones[i].vy = vy1 * cos + tempVx1 * sin;
            nextStones[j].vx = tempVx2 * cos - vy2 * sin;
            nextStones[j].vy = vy2 * cos + tempVx2 * sin;

            const overlap = 24 - dist;
            nextStones[i].x -= overlap * 0.5 * cos;
            nextStones[i].y -= overlap * 0.5 * sin;
            nextStones[j].x += overlap * 0.5 * cos;
            nextStones[j].y += overlap * 0.5 * sin;
          }
        }
      }

      const totalSpeed = nextStones.reduce((acc, s) => acc + Math.hypot(s.vx, s.vy), 0);
      if (totalSpeed < 0.05) {
        cancelAnimationFrame(animationRef.current);
        updateRoomState(room.id, {
          current_task_state: {
            ...taskState,
            stones: nextStones.map(s => ({ ...s, vx: 0, vy: 0 }))
          }
        });
      } else {
        updateRoomState(room.id, {
          current_task_state: {
            ...taskState,
            stones: nextStones
          }
        });
        animationRef.current = requestAnimationFrame(runPhysicsFrame);
      }
    };

    animationRef.current = requestAnimationFrame(runPhysicsFrame);
    return () => cancelAnimationFrame(animationRef.current);
  }, [stones.length, stones.some(s => s.vx !== 0 || s.vy !== 0)]);

  const isGameOver = stones.length === 6;

  const handleEndGame = () => {
    let closestStone = null;
    let minDist = 9999;
    
    stones.forEach(s => {
      const dist = Math.hypot(s.x - 150, s.y - 70);
      if (dist < minDist) {
        minDist = dist;
        closestStone = s;
      }
    });

    const won = closestStone !== null && closestStone.colorIdx === myIndex;
    const pts = won ? 3 : 1;
    const details = won ? "Curling Duel gewonnen!" : "Curling Duel verloren";
    onFinish(pts, details);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '10px 0', fontSize: '15px' }}>
        <div style={{ color: playerColors[0], fontWeight: 'bold' }}>
          🔵 {isSolo ? "Jij" : players[0]?.name}
        </div>
        <div style={{ color: playerColors[1], fontWeight: 'bold' }}>
          🔴 {isSolo ? "Computer" : (players[1]?.name || "Speler 2")}
        </div>
      </div>

      <div style={{ margin: '10px 0', fontSize: '13px' }}>
        {isGameOver ? (
          <button className="btn primary" onClick={handleEndGame}>Voltooien & Score bepalen</button>
        ) : myTurn ? (
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Jouw beurt! Sleep onderin de ijsbaan om een steen te schuiven.</span>
        ) : (
          <span>Wachten op tegenstander...</span>
        )}
      </div>

      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          background: '#eef8ff',
          borderRadius: '16px',
          border: '2px solid var(--line)',
          display: 'block',
          margin: '15px auto',
          touchAction: 'none'
        }}
      >
        <circle cx="150" cy="70" r="45" fill="rgba(255, 37, 37, 0.2)" stroke="#ff2525" strokeWidth="2" />
        <circle cx="150" cy="70" r="30" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="150" cy="70" r="15" fill="rgba(0, 85, 255, 0.2)" stroke="#0055ff" strokeWidth="2" />
        <circle cx="150" cy="70" r="3" fill="#000" />

        <line x1="150" y1="0" x2="150" y2="300" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        <line x1="0" y1="200" x2="300" y2="200" stroke="#ff2525" strokeWidth="1.5" />

        {stones.map((s, idx) => (
          <g key={idx}>
            <circle cx={s.x} cy={s.y} r="12" fill={playerColors[s.colorIdx]} stroke="#fff" strokeWidth="1.5" />
            <circle cx={s.x} cy={s.y} r="5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
          </g>
        ))}

        {dragStart && dragCurrent && (
          <line
            x1="150"
            y1="280"
            x2={150 + (dragStart.x - dragCurrent.x) * 1.5}
            y2={280 + (dragStart.y - dragCurrent.y) * 1.5}
            stroke="var(--gold)"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        )}

        <circle cx="150" cy="280" r="10" fill="none" stroke="var(--gold)" strokeDasharray="3,3" opacity="0.5" />
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// 6. MARBLE PUSH (ABALONE) COMPONENT
// ----------------------------------------------------
export function AbaloneGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const playerColors = ['#0077ff', '#ff3b30'];
  
  const myIndex = players.findIndex(p => p.id === localPlayer.id);
  const activeIndex = room.current_player_index || 0;
  const myTurn = myIndex === activeIndex;

  const taskState = room.current_task_state || {};
  const marbles = taskState.abaloneMarbles || [];
  const p1Out = taskState.p1Out || 0;
  const p2Out = taskState.p2Out || 0;

  const [selectedCell, setSelectedCell] = useState(null);

  const hexDirections = [
    { r: -1, q: 0 }, { r: -1, q: 1 }, { r: 0, q: 1 },
    { r: 1, q: 0 },  { r: 1, q: -1 }, { r: 0, q: -1 }
  ];

  const initializeBoard = () => {
    const list = [];
    for (let q = -3; q <= 3; q++) {
      if (Math.abs(2 + q) <= 3) list.push({ r: 2, q, colorIdx: 0 });
      if (Math.abs(3 + q) <= 3) list.push({ r: 3, q, colorIdx: 0 });
    }
    for (let q = -3; q <= 3; q++) {
      if (Math.abs(-3 + q) <= 3) list.push({ r: -3, q, colorIdx: 1 });
      if (Math.abs(-2 + q) <= 3) list.push({ r: -2, q, colorIdx: 1 });
    }
    return list;
  };

  useEffect(() => {
    if (!taskState.abaloneMarbles) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          abaloneMarbles: initializeBoard(),
          p1Out: 0,
          p2Out: 0
        }
      });
    }
  }, []);

  const handleCellClick = (r, q) => {
    if (!myTurn || isSolo && activeIndex === 1) return;

    const marbleIdx = marbles.findIndex(m => m.r === r && m.q === q);
    const hasMarble = marbleIdx !== -1;

    if (hasMarble && (!selectedCell || marbles[marbleIdx].colorIdx === myIndex)) {
      const clickedMarble = marbles[marbleIdx];
      if (clickedMarble.colorIdx === myIndex) {
        setSelectedCell({ r, q });
      }
      return;
    }

    if (selectedCell !== null) {
      const dr = r - selectedCell.r;
      const dq = q - selectedCell.q;

      const dirIndex = hexDirections.findIndex(d => d.r === dr && d.q === dq);
      if (dirIndex === -1) {
        setSelectedCell(null);
        return;
      }

      let nextMarbles = marbles.map(m => ({ ...m }));
      const myMarbleIdx = nextMarbles.findIndex(m => m.r === selectedCell.r && m.q === selectedCell.q);
      if (myMarbleIdx === -1) {
        setSelectedCell(null);
        return;
      }

      const targetMarble = hasMarble ? marbles[marbleIdx] : null;
      let pOutUpdate = 0;

      if (targetMarble) {
        if (targetMarble.colorIdx === myIndex) {
          setSelectedCell(null);
          return;
        }

        const nr = r + dr;
        const nq = q + dq;

        if (Math.abs(nr) > 3 || Math.abs(nq) > 3 || Math.abs(nr + nq) > 3) {
          nextMarbles = nextMarbles.filter(m => !(m.r === r && m.q === q));
          pOutUpdate = 1;
        } else {
          const blocked = marbles.some(m => m.r === nr && m.q === nq);
          if (blocked) {
            setSelectedCell(null);
            return;
          }
          const targetOppIdx = nextMarbles.findIndex(m => m.r === r && m.q === q && m.colorIdx !== myIndex);
          nextMarbles[targetOppIdx].r = nr;
          nextMarbles[targetOppIdx].q = nq;
        }
      }

      const movedMarbleIdx = nextMarbles.findIndex(m => m.r === selectedCell.r && m.q === selectedCell.q && m.colorIdx === myIndex);
      nextMarbles[movedMarbleIdx].r = r;
      nextMarbles[movedMarbleIdx].q = q;

      const totalPlayers = isSolo ? 2 : players.length;
      const nextActive = (activeIndex + 1) % totalPlayers;

      updateRoomState(room.id, {
        current_player_index: nextActive,
        current_task_state: {
          ...taskState,
          abaloneMarbles: nextMarbles,
          p1Out: p1Out + (myIndex === 1 ? pOutUpdate : 0),
          p2Out: p2Out + (myIndex === 0 ? pOutUpdate : 0)
        }
      });
      setSelectedCell(null);
    }
  };

  useEffect(() => {
    if (isSolo && activeIndex === 1) {
      const timer = setTimeout(() => {
        const aiMarbles = marbles.filter(m => m.colorIdx === 1);
        if (aiMarbles.length === 0) return;

        let moveFound = false;
        let attempts = 0;
        
        while (!moveFound && attempts < 100) {
          const marble = aiMarbles[Math.floor(Math.random() * aiMarbles.length)];
          const dir = hexDirections[Math.floor(Math.random() * 6)];
          const nr = marble.r + dir.r;
          const nq = marble.q + dir.q;

          if (Math.abs(nr) <= 3 && Math.abs(nq) <= 3 && Math.abs(nr + nq) <= 3) {
            const hasOwn = marbles.some(m => m.r === nr && m.q === nq && m.colorIdx === 1);
            if (!hasOwn) {
              let nextMarbles = marbles.map(m => ({ ...m }));
              const idx = nextMarbles.findIndex(m => m.r === marble.r && m.q === marble.q);
              nextMarbles[idx].r = nr;
              nextMarbles[idx].q = nq;

              const oppIdx = marbles.findIndex(m => m.r === nr && m.q === nq && m.colorIdx === 0);
              let pOut = 0;

              if (oppIdx !== -1) {
                const tr = nr + dir.r;
                const tq = nq + dir.q;
                if (Math.abs(tr) > 3 || Math.abs(tq) > 3 || Math.abs(tr + tq) > 3) {
                  nextMarbles = nextMarbles.filter(m => !(m.r === nr && m.q === nq));
                  pOut = 1;
                } else {
                  const blocked = marbles.some(m => m.r === tr && m.q === tq);
                  if (blocked) continue;
                  const targetIdx = nextMarbles.findIndex(m => m.r === nr && m.q === nq && m.colorIdx === 0);
                  nextMarbles[targetIdx].r = tr;
                  nextMarbles[targetIdx].q = tq;
                }
              }

              updateRoomState(room.id, {
                current_player_index: 0,
                current_task_state: {
                  ...taskState,
                  abaloneMarbles: nextMarbles,
                  p1Out: p1Out + pOut,
                  p2Out
                }
              });
              moveFound = true;
            }
          }
          attempts++;
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, isSolo]);

  const isGameOver = p1Out >= 6 || p2Out >= 6;

  const handleEndGame = () => {
    const won = (myIndex === 0 && p2Out >= 6) || (myIndex === 1 && p1Out >= 6);
    const pts = won ? 3 : 1;
    const details = won ? "Marble Push gewonnen!" : "Marble Push verloren";
    onFinish(pts, details);
  };

  const getHexCoords = (r, q) => {
    const size = 30;
    const x = 150 + size * Math.sqrt(3) * (q + r / 2);
    const y = 150 + size * 3 / 2 * r;
    return { x, y };
  };

  const cells = [];
  for (let r = -3; r <= 3; r++) {
    const q1 = Math.max(-3, -3 - r);
    const q2 = Math.min(3, 3 - r);
    for (let q = q1; q <= q2; q++) {
      cells.push({ r, q });
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '10px 0', fontSize: '15px' }}>
        <div style={{ color: playerColors[0], fontWeight: 'bold' }}>
          🔵 {isSolo ? "Jij" : players[0]?.name}: {p2Out}/6 uitgeduwd
        </div>
        <div style={{ color: playerColors[1], fontWeight: 'bold' }}>
          🔴 {isSolo ? "Computer" : (players[1]?.name || "Speler 2")}: {p1Out}/6 uitgeduwd
        </div>
      </div>

      <div style={{ margin: '10px 0', fontSize: '13px' }}>
        {isGameOver ? (
          <button className="btn primary" onClick={handleEndGame}>Voltooien & Score bepalen</button>
        ) : myTurn ? (
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Jouw beurt! Klik op je bol en tik op een aangrenzend vakje.</span>
        ) : (
          <span>Wachten op tegenstander...</span>
        )}
      </div>

      <svg width="300" height="300" viewBox="0 0 300 300" style={{ display: 'block', margin: '15px auto', background: '#041026', borderRadius: '16px', border: '1px solid var(--line)' }}>
        {cells.map((cell, idx) => {
          const { x, y } = getHexCoords(cell.r, cell.q);
          const isSelected = selectedCell?.r === cell.r && selectedCell?.q === cell.q;
          return (
            <polygon
              key={idx}
              points={`${x},${y - 15} ${x + 13},${y - 7.5} ${x + 13},${y + 7.5} ${x},${y + 15} ${x - 13},${y + 7.5} ${x - 13},${y - 7.5}`}
              fill={isSelected ? 'rgba(255,212,92,0.2)' : 'transparent'}
              stroke={isSelected ? 'var(--gold)' : '#1b3a6e'}
              strokeWidth={isSelected ? '2' : '1'}
              onClick={() => handleCellClick(cell.r, cell.q)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}

        {marbles.map((m, idx) => {
          const { x, y } = getHexCoords(m.r, m.q);
          const isSelected = selectedCell?.r === m.r && selectedCell?.q === m.q;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="10"
              fill={playerColors[m.colorIdx]}
              stroke={isSelected ? 'var(--gold)' : '#fff'}
              strokeWidth={isSelected ? '2.5' : '1'}
              onClick={() => handleCellClick(m.r, m.q)}
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// MAIN WRAPPER RENDERER
// ----------------------------------------------------
export function MiniGameRenderer({ gameId, mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const safeUpdateRoomState = updateRoomState || (async (roomId, updates) => {});

  switch (gameId) {
    case 'othello':
      return (
        <OthelloGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
    case 'dotsboxes':
      return (
        <DotsBoxesGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
    case 'colorlines':
      return (
        <ColorLinesGame
          onFinish={(score, detail) => onFinish(score, detail)}
        />
      );
    case 'ricochet':
      return (
        <RicochetShotGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
    case 'curling':
      return (
        <CurlingGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
    case 'abalone':
      return (
        <AbaloneGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
    default:
      return <div className="center">Onbekend spel.</div>;
  }
}
