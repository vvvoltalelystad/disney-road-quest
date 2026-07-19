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

const OTHELLO_POSITION_WEIGHTS = [
  [120, -28, 18, 8, 8, 18, -28, 120],
  [-28, -45, -6, -5, -5, -6, -45, -28],
  [18, -6, 12, 4, 4, 12, -6, 18],
  [8, -5, 4, 2, 2, 4, -5, 8],
  [8, -5, 4, 2, 2, 4, -5, 8],
  [18, -6, 12, 4, 4, 12, -6, 18],
  [-28, -45, -6, -5, -5, -6, -45, -28],
  [120, -28, 18, 8, 8, 18, -28, 120]
];

function evaluateOthelloBoard(board, player = 'red') {
  const opponent = player === 'red' ? 'blue' : 'red';
  let score = 0;
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (cell === player) score += OTHELLO_POSITION_WEIGHTS[r][c];
    if (cell === opponent) score -= OTHELLO_POSITION_WEIGHTS[r][c];
  }));
  const mobility = getOthelloValidMoves(board, player).length - getOthelloValidMoves(board, opponent).length;
  const pieceDiff = board.flat().filter(cell => cell === player).length - board.flat().filter(cell => cell === opponent).length;
  return score + mobility * 7 + pieceDiff * 0.6;
}

function chooseOthelloAiMove(board, aiLevel = 'normal') {
  const moves = getOthelloValidMoves(board, 'red');
  if (!moves.length) return null;
  if (aiLevel === 'easy') return moves[Math.floor(Math.random() * moves.length)];

  const ranked = moves.map(move => {
    const nextBoard = makeOthelloMove(board, move.r, move.c, 'red');
    const immediateGain = nextBoard.flat().filter(cell => cell === 'red').length - board.flat().filter(cell => cell === 'red').length;
    if (aiLevel === 'normal') {
      return { ...move, score: immediateGain * 3 + OTHELLO_POSITION_WEIGHTS[move.r][move.c] };
    }

    const replies = getOthelloValidMoves(nextBoard, 'blue');
    const worstReplyScore = replies.length
      ? Math.min(...replies.map(reply => evaluateOthelloBoard(makeOthelloMove(nextBoard, reply.r, reply.c, 'blue'), 'red')))
      : evaluateOthelloBoard(nextBoard, 'red') + 20;
    return { ...move, score: worstReplyScore };
  });
  return ranked.sort((a, b) => b.score - a.score)[0];
}

// ----------------------------------------------------
// 1. OTHELLO COMPONENT
// ----------------------------------------------------
export function OthelloGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const isP1 = isSolo || (players[0]?.id === localPlayer.id);
  const myColor = isP1 ? 'blue' : 'red';

  const taskState = room.current_task_state || {};
  const aiLevel = taskState.aiLevel || 'normal';
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
  const othelloFinal = taskState.othelloFinal || null;

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
        const bestMove = chooseOthelloAiMove(board, aiLevel);
        if (bestMove) {
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
            markGameOver(board);
          }
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeColor, isSolo, aiLevel, board]);

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
        markGameOver(nextBoard);
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

  const getFinalCounts = (finalBoard) => {
    let bCount = 0;
    let rCount = 0;
    finalBoard.forEach(row => row.forEach(cell => {
      if (cell === 'blue') bCount++;
      if (cell === 'red') rCount++;
    }));
    return { blue: bCount, red: rCount };
  };

  const markGameOver = (finalBoard) => {
    const finalCounts = getFinalCounts(finalBoard);
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        othelloBoard: finalBoard,
        othelloGameOver: true,
        othelloFinal: finalCounts
      }
    });
  };

  const handleEndGame = (finalBoard) => {
    const { blue: bCount, red: rCount } = othelloFinal || getFinalCounts(finalBoard);

    let won = false;
    if (myColor === 'blue' && bCount > rCount) won = true;
    if (myColor === 'red' && rCount > bCount) won = true;
    const tie = bCount === rCount;

    const score = won ? 3 : tie ? 2 : 1;
    const detail = won ? "Othello gewonnen!" : tie ? "Othello gelijkspel" : "Othello verloren";
    onFinish(score, detail);
  };

  const isGameOver = taskState.othelloGameOver || (getOthelloValidMoves(board, 'blue').length === 0 && getOthelloValidMoves(board, 'red').length === 0);
  const finalBlue = othelloFinal?.blue ?? blue;
  const finalRed = othelloFinal?.red ?? red;
  const blueName = players[0]?.name || (isSolo ? "Jij" : "Speler 1");
  const redName = isSolo ? "Computer" : (players[1]?.name || "Speler 2");
  const winnerText = finalBlue === finalRed
    ? "Gelijkspel"
    : finalBlue > finalRed
      ? `${blueName} wint`
      : `${redName} wint`;

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
          <div style={{ display: 'grid', gap: '10px', justifyItems: 'center' }}>
            <div style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: '12px', background: '#081730' }}>
              <strong style={{ color: 'var(--gold)' }}>{winnerText}</strong>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                Eindstand: blauw {finalBlue} - rood {finalRed}
              </div>
            </div>
            <button className="btn primary" onClick={() => handleEndGame(board)}>Score opslaan & terug</button>
          </div>
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
  const playerColors = ['#008cff', '#ff2f3f', '#ffcc00', '#4cd964'];
  const playerBoxEmojis = ['\uD83D\uDC51', '\uD83C\uDF4E', '\u2B50', '\uD83C\uDF40'];
  
  const myIndex = players.findIndex(p => p.id === localPlayer.id);
  const activeIndex = room.current_player_index || 0;
  const myTurn = myIndex === activeIndex;

  const taskState = room.current_task_state || {};
  const aiLevel = taskState.aiLevel || 'normal';
  const dotsGridSize = taskState.dotsGridSize || 4;
  const boxGridSize = dotsGridSize - 1;
  const hLineCount = dotsGridSize * boxGridSize;
  const vLineCount = boxGridSize * dotsGridSize;
  const boxCount = boxGridSize * boxGridSize;
  const hLines = taskState.hLines?.length === hLineCount ? taskState.hLines : Array(hLineCount).fill(false);
  const vLines = taskState.vLines?.length === vLineCount ? taskState.vLines : Array(vLineCount).fill(false);
  const boxes = taskState.boxes?.length === boxCount ? taskState.boxes : Array(boxCount).fill(null);
  const boardSize = 260;
  const boardPadding = 28;
  const boardStep = (boardSize - boardPadding * 2) / boxGridSize;
  const claimedBoxInset = Math.max(5, boardStep * 0.1);
  const claimedBoxSize = Math.max(26, boardStep - claimedBoxInset * 2);
  const hasStarted = hLines.some(Boolean) || vLines.some(Boolean) || boxes.some(owner => owner !== null);
  const canConfigureGrid = !hasStarted && (isSolo || players[0]?.id === localPlayer.id);

  const createDotsState = (size) => ({
    dotsGridSize: size,
    hLines: Array(size * (size - 1)).fill(false),
    vLines: Array((size - 1) * size).fill(false),
    boxes: Array((size - 1) * (size - 1)).fill(null)
  });

  const getBoxSides = (boxIndex, horizontalLines = hLines, verticalLines = vLines) => {
    const r = Math.floor(boxIndex / boxGridSize);
    const c = boxIndex % boxGridSize;
    return {
      top: horizontalLines[r * boxGridSize + c],
      bottom: horizontalLines[(r + 1) * boxGridSize + c],
      left: verticalLines[r * dotsGridSize + c],
      right: verticalLines[r * dotsGridSize + c + 1]
    };
  };

  const handleGridSizeChange = (size) => {
    if (!canConfigureGrid || size === dotsGridSize) return;
    updateRoomState(room.id, {
      current_player_index: 0,
      current_task_state: {
        ...taskState,
        ...createDotsState(size)
      }
    });
  };

  useEffect(() => {
    if (!taskState.hLines || taskState.hLines.length !== hLineCount || taskState.vLines?.length !== vLineCount || taskState.boxes?.length !== boxCount) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          dotsGridSize,
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

        const evaluateMove = (lineIndex, isHorizontal) => {
          const testH = [...hLines];
          const testV = [...vLines];
          if (isHorizontal) testH[lineIndex] = true;
          else testV[lineIndex] = true;

          let completed = 0;
          let exposed = 0;
          for (let b = 0; b < boxCount; b++) {
            if (boxes[b] !== null) continue;
            const { top, bottom, left, right } = getBoxSides(b, testH, testV);
            const sideCount = [top, bottom, left, right].filter(Boolean).length;
            if (sideCount === 4) completed++;
            else if (sideCount === 3) exposed++;
          }
          return { lineIndex, isHorizontal, completed, exposed };
        };

        const moves = [
          ...availableH.map(index => evaluateMove(index, true)),
          ...availableV.map(index => evaluateMove(index, false))
        ];
        let selected;
        if (aiLevel === 'easy') {
          selected = moves[Math.floor(Math.random() * moves.length)];
        } else if (aiLevel === 'normal') {
          const scoringMoves = moves.filter(move => move.completed > 0);
          selected = scoringMoves.length
            ? scoringMoves.sort((a, b) => b.completed - a.completed)[0]
            : moves[Math.floor(Math.random() * moves.length)];
        } else {
          selected = moves.sort((a, b) => {
            if (b.completed !== a.completed) return b.completed - a.completed;
            if (a.exposed !== b.exposed) return a.exposed - b.exposed;
            return Math.random() - 0.5;
          })[0];
        }
        const selectedMove = selected.lineIndex;
        const isH = selected.isHorizontal;

        const nextH = [...hLines];
        const nextV = [...vLines];
        if (isH) nextH[selectedMove] = true;
        else nextV[selectedMove] = true;

        const nextBoxes = [...boxes];
        let boxCompleted = false;
        for (let b = 0; b < boxCount; b++) {
          if (nextBoxes[b] !== null) continue;
          const { top, bottom, left, right } = getBoxSides(b, nextH, nextV);
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
            dotsGridSize,
            hLines: nextH,
            vLines: nextV,
            boxes: nextBoxes
          }
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, isSolo, hLines, vLines, boxes, dotsGridSize, aiLevel]);

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
    for (let b = 0; b < boxCount; b++) {
      if (nextBoxes[b] !== null) continue;
      const { top, bottom, left, right } = getBoxSides(b, nextH, nextV);
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
        dotsGridSize,
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
      <div style={{ margin: '8px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>Raster:</span>
        {[4, 5, 6].map(size => (
          <button
            key={size}
            type="button"
            className={`btn mini ${dotsGridSize === size ? 'primary' : 'ghost'}`}
            onClick={() => handleGridSizeChange(size)}
            disabled={!canConfigureGrid}
            title={canConfigureGrid ? `${size} x ${size} punten` : 'Raster kan alleen voor de eerste zet worden aangepast'}
            style={{ padding: '5px 9px', fontSize: '12px', opacity: canConfigureGrid || dotsGridSize === size ? 1 : 0.45 }}
          >
            {size}x{size}
          </button>
        ))}
      </div>

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

      <svg width="260" height="260" viewBox={`0 0 ${boardSize} ${boardSize}`} style={{ margin: '20px auto', display: 'block', background: '#091c38', borderRadius: '16px', border: '1px solid var(--line)' }}>
        {boxes.map((owner, idx) => {
          if (owner === null) return null;
          const r = Math.floor(idx / boxGridSize);
          const c = idx % boxGridSize;
          const x = boardPadding + c * boardStep + claimedBoxInset;
          const y = boardPadding + r * boardStep + claimedBoxInset;
          const centerX = x + claimedBoxSize / 2;
          const centerY = y + claimedBoxSize / 2;
          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={claimedBoxSize}
                height={claimedBoxSize}
                fill={playerColors[owner] || '#fff'}
                opacity="0.94"
                rx="6"
                stroke={owner === 0 ? '#7ed1ff' : '#ff9aa3'}
                strokeWidth="2"
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={Math.max(12, claimedBoxSize * 0.28)}
                fill="#fff"
                opacity="0.94"
                stroke="rgba(0,0,0,0.28)"
                strokeWidth="1"
              />
              <text
                x={centerX}
                y={centerY + Math.max(6, claimedBoxSize * 0.15)}
                textAnchor="middle"
                fontSize={Math.max(17, claimedBoxSize * 0.38)}
                style={{ pointerEvents: 'none' }}
              >
                {playerBoxEmojis[owner] || '★'}
              </text>
            </g>
          );
        })}

        {hLines.map((line, idx) => {
          const r = Math.floor(idx / boxGridSize);
          const c = idx % boxGridSize;
          const x1 = boardPadding + c * boardStep;
          const y1 = boardPadding + r * boardStep;
          return (
            <line
              key={`h-${idx}`}
              x1={x1}
              y1={y1}
              x2={x1 + boardStep}
              y2={y1}
              stroke={line ? (playerColors[0]) : 'rgba(255,255,255,0.1)'}
              strokeWidth={line ? 6 : 5}
              strokeDasharray={line ? "none" : "3,3"}
              style={{ cursor: myTurn ? 'pointer' : 'default' }}
              onClick={() => handleLineClick(idx, true)}
            />
          );
        })}

        {vLines.map((line, idx) => {
          const r = Math.floor(idx / dotsGridSize);
          const c = idx % dotsGridSize;
          const x1 = boardPadding + c * boardStep;
          const y1 = boardPadding + r * boardStep;
          return (
            <line
              key={`v-${idx}`}
              x1={x1}
              y1={y1}
              x2={x1}
              y2={y1 + boardStep}
              stroke={line ? (playerColors[0]) : 'rgba(255,255,255,0.1)'}
              strokeWidth={line ? 6 : 5}
              strokeDasharray={line ? "none" : "3,3"}
              style={{ cursor: myTurn ? 'pointer' : 'default' }}
              onClick={() => handleLineClick(idx, false)}
            />
          );
        })}

        {Array.from({ length: dotsGridSize * dotsGridSize }).map((_, idx) => {
          const r = Math.floor(idx / dotsGridSize);
          const c = idx % dotsGridSize;
          return (
            <circle
              key={idx}
              cx={boardPadding + c * boardStep}
              cy={boardPadding + r * boardStep}
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
  const makeNextColors = () => [
    colors[Math.floor(Math.random() * colors.length)],
    colors[Math.floor(Math.random() * colors.length)],
    colors[Math.floor(Math.random() * colors.length)]
  ];

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

    setNextColors(makeNextColors());
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

  const clearLines = (currentBoard) => {
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
      setScore(prev => prev + toClear.size * 2);
      return { board: nextBoard, cleared: true };
    }
    return { board: currentBoard, cleared: false };
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

        let resolved = clearLines(nextBoard);
        if (!resolved.cleared) {
          const emptyIndices = [];
          nextBoard.forEach((cell, i) => { if (cell === null) emptyIndices.push(i); });

          if (emptyIndices.length === 0) {
            setBoard(nextBoard);
            setGameOver(true);
            return;
          }

          const colorsToAdd = nextColors.length === 3 ? nextColors : makeNextColors();
          const ballsToAdd = Math.min(3, emptyIndices.length);
          for (let i = 0; i < ballsToAdd; i++) {
            const rIdx = emptyIndices.splice(Math.floor(Math.random() * emptyIndices.length), 1)[0];
            nextBoard[rIdx] = colorsToAdd[i];
          }

          resolved = clearLines(nextBoard);
          setNextColors(makeNextColors());
        }
        setBoard(resolved.board);
        if (resolved.board.every(cell => cell !== null)) setGameOver(true);
        setSelectedIdx(null);
      }
    }
  };

  const handleFinishScore = () => {
    let pts = 1;
    let rating = "Matig";
    if (score >= 40) { pts = 3; rating = "Goed"; }
    else if (score >= 20) { pts = 2; rating = "Gemiddeld"; }
    
    onFinish(pts, `Inside Out Kleurenchaos score: ${score} (${rating})`);
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
      <div style={{ margin: '8px auto 12px', maxWidth: '340px', color: 'var(--muted)', fontSize: '12px', lineHeight: 1.4 }}>
        Verplaats een bol naar een leeg vakje. Maak een rij van 5 dezelfde kleuren om ze weg te spelen. Er is geen eindbaas: probeer zo lang mogelijk door te gaan en haal een hoge score.
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
const RICOCHET_LEVELS = [
  {
    name: "Sterrenpoort",
    stars: [
      { x: 80, y: 70 }, { x: 220, y: 80 }, { x: 150, y: 150 }, { x: 60, y: 220 }, { x: 240, y: 220 }
    ],
    walls: [
      { x1: 0, y1: 0, x2: 300, y2: 0 },
      { x1: 0, y1: 0, x2: 0, y2: 300 },
      { x1: 300, y1: 0, x2: 300, y2: 300 },
      { x1: 0, y1: 300, x2: 300, y2: 300 },
      { x1: 0, y1: 110, x2: 110, y2: 110 },
      { x1: 190, y1: 110, x2: 300, y2: 110 },
      { x1: 100, y1: 190, x2: 200, y2: 190 }
    ]
  },
  {
    name: "Kasteelbocht",
    stars: [
      { x: 55, y: 65 }, { x: 245, y: 60 }, { x: 85, y: 155 }, { x: 215, y: 190 }, { x: 150, y: 245 }
    ],
    walls: [
      { x1: 0, y1: 0, x2: 300, y2: 0 },
      { x1: 0, y1: 0, x2: 0, y2: 300 },
      { x1: 300, y1: 0, x2: 300, y2: 300 },
      { x1: 0, y1: 300, x2: 300, y2: 300 },
      { x1: 70, y1: 105, x2: 235, y2: 105 },
      { x1: 70, y1: 105, x2: 70, y2: 220 },
      { x1: 155, y1: 170, x2: 285, y2: 170 }
    ]
  },
  {
    name: "Maanlabyrint",
    stars: [
      { x: 55, y: 225 }, { x: 75, y: 80 }, { x: 150, y: 130 }, { x: 225, y: 80 }, { x: 245, y: 225 }
    ],
    walls: [
      { x1: 0, y1: 0, x2: 300, y2: 0 },
      { x1: 0, y1: 0, x2: 0, y2: 300 },
      { x1: 300, y1: 0, x2: 300, y2: 300 },
      { x1: 0, y1: 300, x2: 300, y2: 300 },
      { x1: 55, y1: 125, x2: 130, y2: 125 },
      { x1: 170, y1: 125, x2: 245, y2: 125 },
      { x1: 120, y1: 190, x2: 180, y2: 190 },
      { x1: 150, y1: 45, x2: 150, y2: 105 },
      { x1: 150, y1: 210, x2: 150, y2: 265 }
    ]
  }
];

const generateRicochetLevel = (level = 0) => {
  if (RICOCHET_LEVELS[level]) return RICOCHET_LEVELS[level];

  const seed = level + 1;
  const stars = Array.from({ length: 5 }, (_, idx) => ({
    x: 48 + ((seed * 53 + idx * 71) % 204),
    y: 50 + ((seed * 79 + idx * 47) % 178)
  }));

  const walls = [
    { x1: 0, y1: 0, x2: 300, y2: 0 },
    { x1: 0, y1: 0, x2: 0, y2: 300 },
    { x1: 300, y1: 0, x2: 300, y2: 300 },
    { x1: 0, y1: 300, x2: 300, y2: 300 }
  ];

  for (let i = 0; i < 4 + (level % 3); i++) {
    const horizontal = (seed + i) % 2 === 0;
    const baseX = 45 + ((seed * 31 + i * 57) % 190);
    const baseY = 70 + ((seed * 43 + i * 41) % 170);
    const length = 54 + ((seed * 17 + i * 19) % 72);
    walls.push(horizontal
      ? { x1: Math.max(20, baseX - length / 2), y1: baseY, x2: Math.min(280, baseX + length / 2), y2: baseY }
      : { x1: baseX, y1: Math.max(25, baseY - length / 2), x2: baseX, y2: Math.min(250, baseY + length / 2) }
    );
  }

  return {
    name: `Magisch Labyrint ${level + 1}`,
    stars,
    walls
  };
};

const createRicochetStars = (level = 0) => generateRicochetLevel(level).stars.map(star => ({ ...star, collected: false }));

const createRicochetBall = () => ({ x: 150, y: 270, vx: 0, vy: 0, isMoving: false });

export function RicochetShotGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const activeIndex = room.current_player_index || 0;
  const taskState = room.current_task_state || {};

  const syncedLevel = taskState.ricochetLevel || 0;
  const [localLevel, setLocalLevel] = useState(0);
  const level = isSolo ? localLevel : syncedLevel;
  const syncedStars = taskState.ricochetStars || createRicochetStars(syncedLevel);
  const syncedBall = taskState.ricochetBall || createRicochetBall();
  const syncedScores = taskState.ricochetScores || {};
  const totalDuelPlayers = Math.min(4, players.length || 2);
  const duelFinished = !isSolo && Object.keys(syncedScores).length >= totalDuelPlayers;

  const [localStars, setLocalStars] = useState(() => createRicochetStars(0));
  const [shotsLeft, setShotsLeft] = useState(5);
  const [localBall, setLocalBall] = useState(createRicochetBall);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const stars = isSolo ? localStars : syncedStars;
  const ball = isSolo ? localBall : syncedBall;
  const currentLevel = generateRicochetLevel(level);
  const walls = currentLevel.walls;
  const myTurn = isSolo || activeIndex === myIndex;
  const hasPlayedDuelShot = !isSolo && syncedScores[myIndex] !== undefined;
  const canShoot = myTurn && !ball.isMoving && !duelFinished && !hasPlayedDuelShot;
  const canChangeLevel = isSolo
    ? shotsLeft === 5 && !ball.isMoving && localStars.every(star => !star.collected)
    : players[0]?.id === localPlayer.id && !ball.isMoving && Object.keys(syncedScores).length === 0;
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
        ricochetLevel: 0,
        ricochetStars: createRicochetStars(0),
        ricochetBall: createRicochetBall(),
        ricochetScores: {}
      }
    });
  }, []);

  const handlePointerDown = (e) => {
    if (!canShoot || (isSolo && shotsLeft === 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - ball.x, y - ball.y);
    if (dist < 30) {
      setDragStart({ x: ball.x, y: ball.y });
      setDragCurrent({ x, y });
    }
  };

  const handleLevelChange = (nextLevel) => {
    if (!canChangeLevel || nextLevel === level) return;

    if (isSolo) {
      setLocalLevel(nextLevel);
      setLocalStars(createRicochetStars(nextLevel));
      setLocalBall(createRicochetBall());
      setShotsLeft(5);
      return;
    }

    updateRoomState(room.id, {
      current_player_index: 0,
      current_task_state: {
        ...taskState,
        ricochetLevel: nextLevel,
        ricochetStars: createRicochetStars(nextLevel),
        ricochetBall: createRicochetBall(),
        ricochetScores: {}
      }
    });
  };

  const handlePointerMove = (e) => {
    if (!dragStart) return;
    e.preventDefault();
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

      walls.slice(4).forEach(wall => {
        const minX = Math.min(wall.x1, wall.x2) - 4;
        const maxX = Math.max(wall.x1, wall.x2) + 4;
        const minY = Math.min(wall.y1, wall.y2) - 4;
        const maxY = Math.max(wall.y1, wall.y2) + 4;

        if (wall.y1 === wall.y2 && nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
          nvy = -nvy;
          ny = currentBall.y;
        }

        if (wall.x1 === wall.x2 && ny >= minY && ny <= maxY && nx >= minX && nx <= maxX) {
          nvx = -nvx;
          nx = currentBall.x;
        }
      });

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
          nextState.ricochetStars = createRicochetStars(level);
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
      <div style={{ margin: '8px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>Level:</span>
        {Array.from({ length: Math.max(6, level + 2) }).map((_, idx) => {
          const item = generateRicochetLevel(idx);
          return (
          <button
            key={item.name}
            type="button"
            className={`btn mini ${level === idx ? 'primary' : 'ghost'}`}
            onClick={() => handleLevelChange(idx)}
            disabled={!canChangeLevel}
            title={canChangeLevel ? item.name : 'Level kan alleen voor het eerste schot worden aangepast'}
            style={{ padding: '5px 9px', fontSize: '12px', opacity: canChangeLevel || level === idx ? 1 : 0.45 }}
          >
            {idx + 1}
          </button>
          );
        })}
      </div>
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
      <div style={{ margin: '0 auto 10px', maxWidth: '320px', color: 'var(--muted)', fontSize: '12px', lineHeight: 1.4 }}>
        Doel: raak met je schot zoveel mogelijk sterren. Sleep de blauwe bal naar achteren, laat los, en gebruik de muren om te kaatsen.
      </div>

      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDragCurrent(null);
        }}
        onTouchMove={(e) => e.preventDefault()}
        style={{
          background: '#041026',
          borderRadius: '16px',
          border: '2px solid var(--line)',
          display: 'block',
          margin: '15px auto',
          touchAction: 'none',
          overscrollBehavior: 'contain',
          userSelect: 'none'
        }}
      >
        {walls.map((w, i) => (
          <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#3b5e9a" strokeWidth="6" strokeLinecap="round" />
        ))}

        <text x="150" y="24" textAnchor="middle" fill="#9fb8df" fontSize="11" fontWeight="800">
          {currentLevel.name}
        </text>

        {stars.map((star, i) => (
          <g key={i} opacity={star.collected ? 0.25 : 1}>
            <circle cx={star.x} cy={star.y} r="16" fill="rgba(255,212,92,0.18)" stroke="#ffd45c" strokeWidth="1.5" />
            <text
              x={star.x}
              y={star.y + 7}
              textAnchor="middle"
              fontSize="24"
              fill="#ffd45c"
              stroke="#2a1800"
              strokeWidth="0.8"
              style={{ pointerEvents: 'none' }}
            >
              ★
            </text>
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
  const shooter = { x: 150, y: 268 };
  const stonesMoving = stones.some(s => Math.hypot(s.vx, s.vy) > 0.05);

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

  const getBoardPoint = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 300,
      y: ((e.clientY - rect.top) / rect.height) * 300
    };
  };

  const handlePointerDown = (e) => {
    if (!myTurn || stonesMoving || isSolo && activeIndex === 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { x, y } = getBoardPoint(e);
    
    if (y > 205 || Math.hypot(x - shooter.x, y - shooter.y) < 42) {
      setDragStart(shooter);
      setDragCurrent({ x, y });
    }
  };

  const handlePointerMove = (e) => {
    if (!dragStart) return;
    e.preventDefault();
    setDragCurrent(getBoardPoint(e));
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent) return;

    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;

    const newStone = {
      x: shooter.x,
      y: shooter.y,
      vx: dx * 0.09,
      vy: Math.min(-2.8, dy * 0.09),
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
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Jouw beurt! Sleep de zichtbare puck onderin naar achteren en laat los.</span>
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
        onPointerCancel={() => {
          setDragStart(null);
          setDragCurrent(null);
        }}
        onTouchMove={(e) => e.preventDefault()}
        style={{
          background: '#eef8ff',
          borderRadius: '16px',
          border: '2px solid var(--line)',
          display: 'block',
          margin: '15px auto',
          touchAction: 'none',
          overscrollBehavior: 'contain',
          userSelect: 'none'
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

        {!isGameOver && myTurn && !stonesMoving && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={shooter.x} cy={shooter.y} r="21" fill="rgba(255, 212, 92, 0.18)" stroke="#ffd45c" strokeWidth="2" strokeDasharray="4,4" />
            <circle cx={shooter.x} cy={shooter.y} r="15" fill={playerColors[activeIndex]} stroke="#ffffff" strokeWidth="2.5" />
            <circle cx={shooter.x} cy={shooter.y} r="6" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
          </g>
        )}

        {dragStart && dragCurrent && (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={shooter.x}
              y1={shooter.y}
              x2={shooter.x + (dragStart.x - dragCurrent.x) * 1.6}
              y2={shooter.y + (dragStart.y - dragCurrent.y) * 1.6}
              stroke="#ffd45c"
              strokeWidth="3"
              strokeDasharray="5,4"
            />
            <line
              x1={shooter.x}
              y1={shooter.y}
              x2={dragCurrent.x}
              y2={dragCurrent.y}
              stroke="rgba(20,45,90,0.35)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        )}

        <circle cx={shooter.x} cy={shooter.y} r="24" fill="none" stroke="var(--gold)" strokeDasharray="3,3" opacity="0.45" />
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
  const aiLevel = taskState.aiLevel || 'normal';
  const marbles = taskState.abaloneMarbles || [];
  const p1Out = taskState.p1Out || 0;
  const p2Out = taskState.p2Out || 0;

  const [selectedCell, setSelectedCell] = useState(null);

  const hexDirections = [
    { r: -1, q: 0 }, { r: -1, q: 1 }, { r: 0, q: 1 },
    { r: 1, q: 0 },  { r: 1, q: -1 }, { r: 0, q: -1 }
  ];
  const isInsideHex = (r, q) => Math.abs(r) <= 3 && Math.abs(q) <= 3 && Math.abs(r + q) <= 3;

  const getAbaloneAiMoves = () => {
    const moves = [];
    marbles.filter(marble => marble.colorIdx === 1).forEach(marble => {
      hexDirections.forEach(dir => {
        const nr = marble.r + dir.r;
        const nq = marble.q + dir.q;
        if (!isInsideHex(nr, nq)) return;
        if (marbles.some(item => item.r === nr && item.q === nq && item.colorIdx === 1)) return;

        const opponent = marbles.find(item => item.r === nr && item.q === nq && item.colorIdx === 0);
        const nextMarbles = marbles.map(item => ({ ...item }));
        let pushed = false;
        let ejected = false;
        let opponentEdgeBefore = 0;
        let opponentEdgeAfter = 0;

        if (opponent) {
          const tr = nr + dir.r;
          const tq = nq + dir.q;
          const targetIndex = nextMarbles.findIndex(item => item.r === nr && item.q === nq && item.colorIdx === 0);
          pushed = true;
          opponentEdgeBefore = Math.max(Math.abs(nr), Math.abs(nq), Math.abs(nr + nq));
          if (!isInsideHex(tr, tq)) {
            nextMarbles.splice(targetIndex, 1);
            ejected = true;
            opponentEdgeAfter = 4;
          } else {
            if (marbles.some(item => item.r === tr && item.q === tq)) return;
            nextMarbles[targetIndex].r = tr;
            nextMarbles[targetIndex].q = tq;
            opponentEdgeAfter = Math.max(Math.abs(tr), Math.abs(tq), Math.abs(tr + tq));
          }
        }

        const ownIndex = nextMarbles.findIndex(item => item.r === marble.r && item.q === marble.q && item.colorIdx === 1);
        nextMarbles[ownIndex].r = nr;
        nextMarbles[ownIndex].q = nq;
        const ownEdge = Math.max(Math.abs(nr), Math.abs(nq), Math.abs(nr + nq));
        const support = hexDirections.filter(supportDir => nextMarbles.some(item => (
          item.colorIdx === 1 && item.r === nr + supportDir.r && item.q === nq + supportDir.q
        ))).length;
        moves.push({ nextMarbles, pushed, ejected, opponentEdgeGain: opponentEdgeAfter - opponentEdgeBefore, ownEdge, support });
      });
    });
    return moves;
  };

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
        const moves = getAbaloneAiMoves();
        if (!moves.length) {
          updateRoomState(room.id, { current_player_index: 0 });
          return;
        }
        const selectedMove = aiLevel === 'easy'
          ? moves[Math.floor(Math.random() * moves.length)]
          : moves
              .map(move => ({
                ...move,
                priority: move.ejected * 120
                  + move.pushed * (aiLevel === 'hard' ? 24 : 12)
                  + move.opponentEdgeGain * (aiLevel === 'hard' ? 9 : 4)
                  + move.support * (aiLevel === 'hard' ? 3 : 1)
                  - move.ownEdge * (aiLevel === 'hard' ? 2.5 : 0.5)
                  + Math.random() * 0.25
              }))
              .sort((a, b) => b.priority - a.priority)[0];

        updateRoomState(room.id, {
          current_player_index: 0,
          current_task_state: {
            ...taskState,
            abaloneMarbles: selectedMove.nextMarbles,
            p1Out: p1Out + (selectedMove.ejected ? 1 : 0),
            p2Out
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, isSolo, aiLevel, marbles, p1Out, p2Out]);

  const isGameOver = p1Out >= 6 || p2Out >= 6;

  const handleEndGame = () => {
    const won = (myIndex === 0 && p2Out >= 6) || (myIndex === 1 && p1Out >= 6);
    const pts = won ? 3 : 1;
    const details = won ? "Louisa's Power Push gewonnen!" : "Louisa's Power Push verloren";
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

const PIRATES_PLANK_WORDS = [
  { word: "PHANTOM MANOR", language: "en", category: "Attractie", hint: "Een spookachtig landhuis in Frontierland." },
  { word: "THUNDER MESA", language: "en", category: "Disney-locatie", hint: "Het mijnstadje rond Big Thunder Mountain." },
  { word: "CASEY JR CIRCUS TRAIN", language: "en", category: "Attractie", hint: "Een kleine circustrein uit Fantasyland." },
  { word: "NAUTILUS", language: "en", category: "Disney-locatie", hint: "De beroemde onderzeeër van kapitein Nemo." },
  { word: "DISCOVERYLAND", language: "en", category: "Disney-locatie", hint: "Hier draait alles om uitvindingen en de toekomst." },
  { word: "SKULL ROCK", language: "en", category: "Disney-locatie", hint: "Een rots in de vorm van een piratenschedel." },
  { word: "ADMIRAL BOOM", language: "en", category: "Personage", hint: "De luidruchtige buurman uit Mary Poppins." },
  { word: "CLARABELLE COW", language: "en", category: "Personage", hint: "Een klassieke vriendin van Mickey en Minnie." },
  { word: "PROFESSOR PORTER", language: "en", category: "Personage", hint: "De vader van Jane in Tarzan." },
  { word: "KRONKS SPINACH PUFFS", language: "en", category: "Disney-gerecht", hint: "Kronks beroemdste ovenhapjes." },
  { word: "MAURICES INVENTION", language: "en", category: "Disney-voorwerp", hint: "Een uitvinding van Belles vader." },
  { word: "YEN SID", language: "en", category: "Personage", hint: "De machtige tovenaar uit Fantasia." },
  { word: "GREAT MOUSE DETECTIVE", language: "en", category: "Film", hint: "Een muis lost een mysterie op in Londen." },
  { word: "SILVERMIST", language: "en", category: "Personage", hint: "Een watertalent uit Pixie Hollow." },
  { word: "MADAME MEDUSA", language: "en", category: "Personage", hint: "De schurk uit The Rescuers." },
  { word: "ROBIN HOOD AND LITTLE JOHN", language: "en", category: "Film", hint: "Twee vrienden die door het woud trekken." },
  { word: "THE RESCUERS DOWN UNDER", language: "en", category: "Film", hint: "Bernard en Bianca reizen naar Australië." },
  { word: "WALT DISNEY STUDIOS PARK", language: "en", category: "Disney-locatie", hint: "De vroegere naam van het tweede park in Parijs." },
  { word: "AVENGERS ASSEMBLE FLIGHT FORCE", language: "en", category: "Attractie", hint: "Een snelle Marvel-missie in Avengers Campus." },
  { word: "LAND OF FAIRY TALES", language: "en", category: "Attractie", hint: "Een boottocht langs miniatuur-sprookjes." },
  { word: "DE KLEINE ZEEMEERMIN", language: "nl", category: "Film", hint: "Een prinses droomt van een leven op het land." },
  { word: "BELLE EN HET BEEST", language: "nl", category: "Film", hint: "Een betoverd kasteel en een magische roos." },
  { word: "DE PRINSES EN DE KIKKER", language: "nl", category: "Film", hint: "Een ambitieuze kokkin in New Orleans." },
  { word: "DE REDDERTJES", language: "nl", category: "Film", hint: "Twee dappere muizen schieten te hulp." },
  { word: "KNABBEL EN BABBEL", language: "nl", category: "Personages", hint: "Twee ondeugende aardeekhoorns." },
  { word: "HET JUNGLEBOEK", language: "nl", category: "Film", hint: "Mowgli groeit op tussen de dieren." },
  { word: "DE KLOKKENLUIDER VAN DE NOTRE DAME", language: "nl", category: "Film", hint: "Een verhaal rond de kathedraal van Parijs." },
  { word: "101 DALMATIERS", language: "nl", category: "Film", hint: "Een heleboel gevlekte puppy's." }
];

const PLANK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PLANK_VOWELS = ["A", "E", "I", "O", "U"];
const PLANK_CONSONANTS = PLANK_LETTERS.filter(letter => !PLANK_VOWELS.includes(letter));
const PLANK_NUMBER_DIE = [1, 1, 2, 2, 3, 3];
const PLANK_EVENT_DIE = [
  { id: "neutral-1", name: "Neutraal", icon: "⚓", tone: "#d8e8ff", allowsLetter: true, multiplier: 1 },
  { id: "neutral-2", name: "Neutraal", icon: "🧭", tone: "#d8e8ff", allowsLetter: true, multiplier: 1 },
  { id: "double", name: "Dubbel", icon: "🏴‍☠️", tone: "#ffd45c", allowsLetter: true, multiplier: 2 },
  { id: "curse", name: "Vloek", icon: "💀", tone: "#ff6b6b", allowsLetter: false },
  { id: "shipwreck", name: "Schipbreuk", icon: "🌊", tone: "#6bd6ff", allowsLetter: true },
  { id: "chest", name: "Schatkist", icon: "💰", tone: "#ffd45c", allowsLetter: true }
];
const PLANK_DIFFICULTIES = {
  easy: { label: "Rustig", maxLetters: 14, preReveal: 2, maxStrikes: 5, vowelCost: 3, startTreasure: 3, solvePenalty: 1, autoHintAfter: 2, showCategory: true, showHint: true },
  normal: { label: "Normaal", maxLetters: 22, preReveal: 1, maxStrikes: 4, vowelCost: 4, startTreasure: 3, solvePenalty: 1, autoHintAfter: 2, showCategory: true, showHint: false },
  hard: { label: "Uitdagend", maxLetters: Infinity, preReveal: 0, maxStrikes: 3, vowelCost: 5, startTreasure: 2, solvePenalty: 2, autoHintAfter: 2, showCategory: false, showHint: false }
};
const PLANK_LANGUAGES = {
  en: { flag: "🇬🇧", label: "Engelstalig woord" },
  nl: { flag: "🇳🇱", label: "Nederlandstalig woord" }
};

const getPlankOccurrenceCount = (word, letter) => word.split("").filter(char => char === letter).length;
const getPlankLetterCount = word => word.split("").filter(char => /[A-Z0-9]/.test(char)).length;
const getPlankWordCount = word => word.trim().split(/\s+/).filter(Boolean).length;
const isPlankWordSolved = (word, guesses) => (
  word.split("").every(char => !PLANK_LETTERS.includes(char) || guesses.includes(char))
);

function createPiratesPlankState(difficulty = "normal") {
  const safeDifficulty = PLANK_DIFFICULTIES[difficulty] ? difficulty : "normal";
  const config = PLANK_DIFFICULTIES[safeDifficulty];
  const candidates = PIRATES_PLANK_WORDS.filter(entry => getPlankLetterCount(entry.word) <= config.maxLetters);
  const weightedCandidates = [
    ...candidates,
    ...candidates.filter(entry => getPlankLetterCount(entry.word) <= 14),
    ...(safeDifficulty === "easy" ? candidates.filter(entry => getPlankLetterCount(entry.word) <= 11) : [])
  ];
  const entry = weightedCandidates[Math.floor(Math.random() * weightedCandidates.length)];
  const uniqueLetters = Array.from(new Set(entry.word.split("").filter(char => PLANK_LETTERS.includes(char))));
  const shuffledLetters = [...uniqueLetters].sort(() => Math.random() - 0.5);
  const startingGuesses = shuffledLetters.slice(0, Math.min(config.preReveal, Math.max(0, uniqueLetters.length - 2)));
  return {
    piratesDifficulty: safeDifficulty,
    plankWord: entry.word,
    plankLanguage: entry.language || "en",
    plankCategory: entry.category,
    plankHint: entry.hint,
    plankGuesses: startingGuesses,
    plankBoughtVowels: [],
    plankWrongGuesses: [],
    plankTreasure: config.startTreasure,
    plankStrikes: 0,
    plankTurns: 0,
    plankWrongStreak: 0,
    plankPendingRoll: null,
    plankLastMove: startingGuesses.length
      ? `Startletter${startingGuesses.length > 1 ? "s" : ""}: ${startingGuesses.join(", ")}. Gooi de dobbelstenen.`
      : "Gooi de dobbelstenen om de jacht op buit te starten.",
    plankWinnerId: null,
    plankFailed: false
  };
}

function LegacyPiratesPlankGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const maxWrong = 6;
  const taskState = room.current_task_state || {};
  const activeIndex = room.current_player_index || 0;
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const myTurn = isSolo || activeIndex === myIndex;

  const word = taskState.plankWord || "";
  const guesses = taskState.plankGuesses || [];
  const wrong = taskState.plankWrong || 0;
  const winnerId = taskState.plankWinnerId || null;
  const failed = taskState.plankFailed || false;
  const isFinished = Boolean(winnerId) || failed;

  useEffect(() => {
    if (!taskState.plankWord) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          ...createPiratesPlankState()
        }
      });
    }
  }, []);

  const visibleWord = word.split("").map(char => {
    if (!PLANK_LETTERS.includes(char)) return char;
    return guesses.includes(char) ? char : "_";
  });

  const guessedWrongLetters = guesses.filter(letter => !word.includes(letter));
  const remainingSafeSteps = Math.max(0, maxWrong - wrong);

  const handleGuess = (letter) => {
    if (!word || isFinished || !myTurn || guesses.includes(letter)) return;

    const nextGuesses = [...guesses, letter];
    const isCorrect = word.includes(letter);
    const nextWrong = isCorrect ? wrong : wrong + 1;
    const solved = word.split("").every(char => char === " " || char === "-" || char === "'" || nextGuesses.includes(char));
    const nextFailed = nextWrong >= maxWrong && !solved;
    const totalPlayers = isSolo ? 1 : players.length;

    updateRoomState(room.id, {
      current_player_index: isCorrect || isSolo ? activeIndex : (activeIndex + 1) % totalPlayers,
      current_task_state: {
        ...taskState,
        plankGuesses: nextGuesses,
        plankWrong: nextWrong,
        plankWinnerId: solved ? localPlayer.id : null,
        plankFailed: nextFailed
      }
    });
  };

  const handleFinish = () => {
    const won = winnerId === localPlayer.id || (isSolo && winnerId);
    const pts = won ? (wrong <= 2 ? 3 : 2) : 1;
    const detail = winnerId
      ? `Black Pearl's Plank opgelost: ${word}`
      : `Black Pearl's Plank gemist: ${word}`;
    onFinish(pts, detail);
  };

  const winnerName = winnerId
    ? (players.find(p => p.id === winnerId)?.name || (isSolo ? "Jij" : "Speler"))
    : null;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'grid', gap: '10px', justifyItems: 'center' }}>
        <div style={{ fontSize: '42px', letterSpacing: '2px' }}>
          {"☠️".repeat(Math.min(wrong, maxWrong))}{"🌊".repeat(remainingSafeSteps)}
        </div>
        <div style={{ width: '100%', maxWidth: '340px', height: '12px', background: '#061225', borderRadius: '999px', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (wrong / maxWrong) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #ffd45c, #ff3b30)' }} />
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Geen hint. Alleen de plank, de letters en je Disney-geheugen.</div>
      </div>

      <div style={{
        margin: '18px auto',
        padding: '14px',
        maxWidth: '360px',
        background: '#081730',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: '24px',
        letterSpacing: '4px',
        color: '#fff',
        wordBreak: 'break-word'
      }}>
        {visibleWord.join(" ")}
      </div>

      <div style={{ margin: '8px 0 12px', fontSize: '13px' }}>
        {isFinished ? (
          <div style={{ display: 'grid', gap: '10px', justifyItems: 'center' }}>
            <strong style={{ color: winnerId ? 'var(--gold)' : 'var(--danger)' }}>
              {winnerId ? `${winnerName} heeft het woord gevonden!` : "De piraat is over de plank gegaan!"}
            </strong>
            <div style={{ color: 'var(--muted)' }}>Het woord was: <strong style={{ color: '#fff' }}>{word}</strong></div>
            <button className="btn primary" onClick={handleFinish}>Score opslaan & terug</button>
          </div>
        ) : myTurn ? (
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Jouw beurt: kies een letter.</span>
        ) : (
          <span>Wachten op de andere speler...</span>
        )}
      </div>

      {guessedWrongLetters.length > 0 && (
        <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '10px' }}>
          Foute letters: {guessedWrongLetters.join(", ")}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', maxWidth: '360px', margin: '0 auto' }}>
        {PLANK_LETTERS.map(letter => {
          const used = guesses.includes(letter);
          const correct = used && word.includes(letter);
          return (
            <button
              key={letter}
              type="button"
              className={`btn mini ${correct ? 'primary' : 'ghost'}`}
              disabled={used || !myTurn || isFinished}
              onClick={() => handleGuess(letter)}
              style={{
                minWidth: 0,
                padding: '8px 0',
                opacity: used && !correct ? 0.35 : 1,
                color: used && !correct ? 'var(--muted)' : undefined
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PiratesPlankGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const taskState = room.current_task_state || {};
  const activeIndex = room.current_player_index || 0;
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const myTurn = isSolo || activeIndex === myIndex;

  const word = taskState.plankWord || "";
  const difficulty = PLANK_DIFFICULTIES[taskState.piratesDifficulty] ? taskState.piratesDifficulty : "normal";
  const difficultyConfig = PLANK_DIFFICULTIES[difficulty];
  const wordLanguage = taskState.plankLanguage || PIRATES_PLANK_WORDS.find(entry => entry.word === word)?.language || "en";
  const wordEntry = PIRATES_PLANK_WORDS.find(entry => entry.word === word);
  const wordCategory = taskState.plankCategory || wordEntry?.category || "Disney";
  const wordHint = taskState.plankHint || wordEntry?.hint || "Een bekende naam uit de Disney-wereld.";
  const languageInfo = PLANK_LANGUAGES[wordLanguage] || PLANK_LANGUAGES.en;
  const guesses = taskState.plankGuesses || [];
  const wrongGuesses = taskState.plankWrongGuesses || [];
  const boughtVowelLetters = taskState.plankBoughtVowels || [];
  const treasure = taskState.plankTreasure || 0;
  const strikes = taskState.plankStrikes || 0;
  const turns = taskState.plankTurns || 0;
  const wrongStreak = taskState.plankWrongStreak || 0;
  const pendingRoll = taskState.plankPendingRoll || null;
  const lastMove = taskState.plankLastMove || "";
  const winnerId = taskState.plankWinnerId || null;
  const failed = taskState.plankFailed || false;
  const isFinished = Boolean(winnerId) || failed;

  useEffect(() => {
    if (!taskState.plankWord) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          ...createPiratesPlankState(taskState.piratesDifficulty || "normal")
        }
      });
    }
  }, []);

  const visibleWord = word.split("").map(char => {
    if (!PLANK_LETTERS.includes(char)) return char;
    return guesses.includes(char) ? char : "_";
  });

  const totalPlayers = isSolo ? 1 : players.length;
  const passTurnIndex = isSolo ? activeIndex : (activeIndex + 1) % totalPlayers;
  const canAct = Boolean(word) && !isFinished && myTurn;
  const hasLetterRoll = pendingRoll?.allowsLetter;
  const shipProgress = Math.min(1, (strikes / difficultyConfig.maxStrikes) * 0.82 + Math.min(turns, 12) / 12 * 0.18);
  const treasureColor = treasure < difficultyConfig.vowelCost ? '#ff5b5b' : '#050b16';

  const addAutomaticHint = (baseGuesses, nextStreak) => {
    if (nextStreak < difficultyConfig.autoHintAfter) {
      return { guesses: baseGuesses, wrongStreak: nextStreak, revealed: null };
    }
    const available = Array.from(new Set(word.split("").filter(char => PLANK_LETTERS.includes(char) && !baseGuesses.includes(char))));
    const revealed = available[0] || null;
    return {
      guesses: revealed ? [...baseGuesses, revealed] : baseGuesses,
      wrongStreak: 0,
      revealed
    };
  };

  const commitPlankState = (updates, passTurn = true) => {
    updateRoomState(room.id, {
      current_player_index: passTurn ? passTurnIndex : activeIndex,
      current_task_state: {
        ...taskState,
        ...updates
      }
    });
  };

  const handleRollDice = () => {
    if (!canAct || pendingRoll) return;
    const number = PLANK_NUMBER_DIE[Math.floor(Math.random() * PLANK_NUMBER_DIE.length)];
    const event = PLANK_EVENT_DIE[Math.floor(Math.random() * PLANK_EVENT_DIE.length)];
    const baseRoll = {
      number,
      eventId: event.id,
      eventName: event.name,
      icon: event.icon,
      tone: event.tone,
      allowsLetter: event.allowsLetter,
      multiplier: event.multiplier || 1
    };

    if (event.id === "curse") {
      const curseCost = 2;
      const lost = Math.min(curseCost, treasure);
      const getsStrike = treasure < curseCost;
      const nextStrikes = Math.min(difficultyConfig.maxStrikes, strikes + (getsStrike ? 1 : 0));
      commitPlankState({
        plankPendingRoll: null,
        plankTreasure: treasure - lost,
        plankStrikes: nextStrikes,
        plankTurns: turns + 1,
        plankFailed: nextStrikes >= difficultyConfig.maxStrikes,
        plankLastMove: getsStrike
          ? `Vloek! ${localPlayer.name} verliest ${lost} buit en krijgt door te weinig buit 1 strike.`
          : `Vloek afgekocht: ${localPlayer.name} verliest 2 buit, maar geen strike.`
      });
      return;
    }

    if (event.id === "shipwreck") {
      const lost = Math.ceil(treasure / 2);
      commitPlankState({
        plankPendingRoll: baseRoll,
        plankTreasure: Math.max(0, treasure - lost),
        plankLastMove: `Schipbreuk! ${localPlayer.name} verliest ${lost} buit en mag daarna een medeklinker kiezen.`
      }, false);
      return;
    }

    if (event.id === "chest") {
      commitPlankState({
        plankPendingRoll: baseRoll,
        plankTreasure: treasure + 5,
        plankLastMove: `Schatkist! ${localPlayer.name} vindt 5 buit en mag een medeklinker kiezen.`
      }, false);
      return;
    }

    commitPlankState({
      plankPendingRoll: baseRoll,
      plankLastMove: `${localPlayer.name} gooide ${number} + ${event.name}. Kies een medeklinker.`
    }, false);
  };

  const handleConsonantGuess = (letter) => {
    if (!canAct || !hasLetterRoll || guesses.includes(letter) || !PLANK_CONSONANTS.includes(letter)) return;

    const count = getPlankOccurrenceCount(word, letter);
    const guessedLetters = [...guesses, letter];
    const earned = count * pendingRoll.number * (pendingRoll.multiplier || 1);
    const nextTreasure = treasure + earned;
    const hintResult = count > 0
      ? { guesses: guessedLetters, wrongStreak: 0, revealed: null }
      : addAutomaticHint(guessedLetters, wrongStreak + 1);
    const nextGuesses = hintResult.guesses;
    const nextStrikes = count > 0 ? strikes : Math.min(difficultyConfig.maxStrikes, strikes + 1);
    const solved = isPlankWordSolved(word, nextGuesses);
    const nextFailed = nextStrikes >= difficultyConfig.maxStrikes && !solved;

    commitPlankState({
      plankGuesses: nextGuesses,
      plankWrongGuesses: count > 0 ? wrongGuesses : [...wrongGuesses, letter],
      plankTreasure: nextTreasure,
      plankStrikes: nextStrikes,
      plankWrongStreak: hintResult.wrongStreak,
      plankTurns: turns + 1,
      plankPendingRoll: null,
      plankWinnerId: solved ? localPlayer.id : null,
      plankFailed: nextFailed,
      plankLastMove: count > 0
        ? `${letter} zit er ${count}x in: +${earned} buit.`
        : `${letter} zit er niet in: strike ${nextStrikes}/${difficultyConfig.maxStrikes}.${hintResult.revealed ? ` Hulp aan dek: ${hintResult.revealed} is onthuld.` : ""}`
    });
  };

  const handleBuyVowel = (letter) => {
    if (!canAct || pendingRoll || guesses.includes(letter) || treasure < difficultyConfig.vowelCost) return;

    const count = getPlankOccurrenceCount(word, letter);
    const guessedLetters = [...guesses, letter];
    const nextTreasure = Math.max(0, treasure - difficultyConfig.vowelCost);
    const hintResult = count > 0
      ? { guesses: guessedLetters, wrongStreak: 0, revealed: null }
      : addAutomaticHint(guessedLetters, wrongStreak + 1);
    const nextGuesses = hintResult.guesses;
    const nextStrikes = count > 0 ? strikes : Math.min(difficultyConfig.maxStrikes, strikes + 1);
    const solved = isPlankWordSolved(word, nextGuesses);
    const nextFailed = nextStrikes >= difficultyConfig.maxStrikes && !solved;

    commitPlankState({
      plankGuesses: nextGuesses,
      plankWrongGuesses: count > 0 ? wrongGuesses : [...wrongGuesses, letter],
      plankBoughtVowels: [...boughtVowelLetters, letter],
      plankTreasure: nextTreasure,
      plankStrikes: nextStrikes,
      plankWrongStreak: hintResult.wrongStreak,
      plankTurns: turns + 1,
      plankWinnerId: solved ? localPlayer.id : null,
      plankFailed: nextFailed,
      plankLastMove: count > 0
        ? `${localPlayer.name} koopt ${letter}. De klinker staat ${count}x in de oplossing.`
        : `${localPlayer.name} koopt ${letter}, maar die staat er niet in: strike ${nextStrikes}/${difficultyConfig.maxStrikes}.${hintResult.revealed ? ` Hulp aan dek: ${hintResult.revealed} is onthuld.` : ""}`
    });
  };

  const handleSolve = () => {
    if (!canAct) return;
    const attempt = window.prompt('Wat is de volledige oplossing?')?.trim().toUpperCase();
    if (!attempt) return;

    const normalizedAttempt = attempt.replace(/\s+/g, ' ');
    const normalizedWord = word.replace(/\s+/g, ' ');
    const solved = normalizedAttempt === normalizedWord;
    const nextStrikes = solved ? strikes : Math.min(difficultyConfig.maxStrikes, strikes + difficultyConfig.solvePenalty);
    const hintResult = solved
      ? { guesses, wrongStreak: 0, revealed: null }
      : addAutomaticHint(guesses, wrongStreak + 1);
    const solvedByHint = !solved && isPlankWordSolved(word, hintResult.guesses);
    const nextFailed = !solved && !solvedByHint && nextStrikes >= difficultyConfig.maxStrikes;
    const revealedLetters = solved
      ? Array.from(new Set(word.split("").filter(char => PLANK_LETTERS.includes(char))))
      : hintResult.guesses;

    commitPlankState({
      plankGuesses: revealedLetters,
      plankStrikes: nextStrikes,
      plankWrongStreak: hintResult.wrongStreak,
      plankTurns: turns + 1,
      plankPendingRoll: null,
      plankWinnerId: solved || solvedByHint ? localPlayer.id : null,
      plankFailed: nextFailed,
      plankLastMove: solved
        ? `${localPlayer.name} lost de schatkistcode op!`
        : `Foute oplossing: +${difficultyConfig.solvePenalty} strike${difficultyConfig.solvePenalty > 1 ? "s" : ""} (${nextStrikes}/${difficultyConfig.maxStrikes}).${hintResult.revealed ? ` Hulp aan dek: ${hintResult.revealed} is onthuld.` : ""}`
    });
  };

  const handleFinish = () => {
    const won = winnerId === localPlayer.id || (isSolo && winnerId);
    const boughtVowels = boughtVowelLetters.length;
    const speedBonus = turns <= 5 ? 2 : turns <= 8 ? 1 : 0;
    const strikeBonus = strikes === 0 ? 2 : strikes === 1 ? 1 : 0;
    const thriftBonus = boughtVowels === 0 ? 1 : 0;
    const treasureBonus = Math.min(1, Math.floor(treasure / 10));
    const pts = won ? Math.min(6, 1 + speedBonus + strikeBonus + thriftBonus + treasureBonus) : 0;
    const detail = winnerId
      ? `Black Pearl's Plank opgelost: ${word} (${treasure} munten, ${strikes} strikes, ${turns} beurten)`
      : `Black Pearl's Plank gezonken: ${word}`;
    onFinish(pts, detail);
  };

  const winnerName = winnerId
    ? (players.find(p => p.id === winnerId)?.name || (isSolo ? "Jij" : "Speler"))
    : null;

  const ShipImage = ({ type, style }) => {
    const [broken, setBroken] = useState(false);
    const src = type === 'blackPearl'
      ? `${import.meta.env.BASE_URL}pirates/black-pearl.png`
      : type === 'sinking'
        ? `${import.meta.env.BASE_URL}pirates/boat-sinking.png`
        : `${import.meta.env.BASE_URL}pirates/boat.png`;
    if (broken) {
      return <span style={{ fontSize: type === 'blackPearl' ? '30px' : '34px', ...style }}>{type === 'blackPearl' ? '🏴‍☠️' : type === 'sinking' ? '⛵' : '🚤'}</span>;
    }
    return <img src={src} alt="" onError={() => setBroken(true)} style={{ width: type === 'blackPearl' ? '58px' : '48px', height: 'auto', objectFit: 'contain', ...style }} />;
  };

  const renderLetterButton = (letter, kind) => {
    const used = guesses.includes(letter);
    const correct = used && word.includes(letter);
    const disabled = kind === 'vowel'
      ? used || !canAct || Boolean(pendingRoll) || treasure < difficultyConfig.vowelCost
      : used || !canAct || !hasLetterRoll;
    return (
      <button
        key={letter}
        type="button"
        className={`btn mini ${correct ? 'primary' : 'ghost'}`}
        disabled={disabled}
        onClick={() => kind === 'vowel' ? handleBuyVowel(letter) : handleConsonantGuess(letter)}
        style={{
          minWidth: 0,
          padding: '8px 0',
          opacity: used && !correct ? 0.35 : disabled ? 0.45 : 1,
          color: used && !correct ? 'var(--muted)' : undefined
        }}
      >
        {letter}
      </button>
    );
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {failed && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px'
          }}
        >
          <div style={{ width: 'min(92vw, 360px)', background: '#07152c', border: '2px solid var(--danger)', borderRadius: '16px', padding: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
            <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <ShipImage type="sinking" style={{ width: '150px', transform: 'rotate(17deg) translateY(24px)', filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.5))' }} />
            </div>
            <h2 style={{ color: 'var(--danger)', margin: '8px 0' }}>Gezonken!</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 14px' }}>The Black Pearl heeft je boot bereikt. De oplossing was <strong style={{ color: '#fff' }}>{word}</strong>.</p>
            <button className="btn primary full" onClick={handleFinish}>Score opslaan & terug</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ position: 'relative', height: '76px', maxWidth: '360px', width: '100%', margin: '0 auto' }}>
          <div style={{ position: 'absolute', left: '24px', right: '24px', top: '35px', borderTop: '3px dashed rgba(216,232,255,0.35)' }} />
          <div style={{ position: 'absolute', left: `${Math.min(82, shipProgress * 82)}%`, top: '10px', transform: 'translateX(-50%)', transition: 'left 0.35s ease' }}>
            <ShipImage type="blackPearl" />
          </div>
          <div style={{ position: 'absolute', right: '0', top: '15px' }}>
            <ShipImage type="boat" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div className="badge" style={{ justifyContent: 'center' }}>
            Buit: <strong style={{ color: treasureColor, background: treasure < difficultyConfig.vowelCost ? 'transparent' : '#fff', borderRadius: '8px', padding: '1px 7px' }}>{treasure}</strong>
          </div>
          <div className="badge" style={{ justifyContent: 'center' }}>Strikes: {strikes}/{difficultyConfig.maxStrikes}</div>
          <div className="badge" style={{ justifyContent: 'center' }}>Beurten: {turns}</div>
        </div>

        <div className={`plank-language-hint language-${wordLanguage}`} aria-label={languageInfo.label}>
          <span className="plank-language-flag" aria-hidden="true">{languageInfo.flag}</span>
          <span><small>Schatkistcode</small><strong>{languageInfo.label}</strong></span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', marginTop: '-3px' }}>
          <span className="badge">{difficultyConfig.label}</span>
          <span className="badge">{getPlankWordCount(word)} {getPlankWordCount(word) === 1 ? 'woord' : 'woorden'} · {getPlankLetterCount(word)} letters</span>
          {difficultyConfig.showCategory && <span className="badge">Categorie: {wordCategory}</span>}
        </div>
        {difficultyConfig.showHint && (
          <div style={{ maxWidth: '380px', margin: '-2px auto 0', color: '#d8e8ff', fontSize: '12px', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--gold)' }}>Hint:</strong> {wordHint}
          </div>
        )}

        <div style={{
          margin: '8px auto',
          padding: '14px',
          width: '100%',
          maxWidth: '380px',
          background: '#081730',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          fontFamily: 'Outfit, Inter, sans-serif',
          fontSize: '24px',
          letterSpacing: '4px',
          color: '#fff',
          wordBreak: 'break-word'
        }}>
          {visibleWord.join(" ")}
        </div>

        <div style={{ color: 'var(--muted)', fontSize: '12px', minHeight: '18px' }}>{lastMove}</div>

        {isFinished ? (
          <div style={{ display: 'grid', gap: '10px', justifyItems: 'center' }}>
            <strong style={{ color: winnerId ? 'var(--gold)' : 'var(--danger)' }}>
              {winnerId ? `${winnerName} heeft de schatkistcode gekraakt!` : "The Black Pearl heeft je boot bereikt!"}
            </strong>
            <div style={{ color: 'var(--muted)' }}>Het woord was: <strong style={{ color: '#fff' }}>{word}</strong></div>
            {!failed && <button className="btn primary" onClick={handleFinish}>Score opslaan & terug</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxWidth: '320px', margin: '0 auto' }}>
              <div style={{ background: '#fff', color: '#07152c', borderRadius: '12px', padding: '10px', fontWeight: 900, fontSize: '28px', minHeight: '58px', display: 'grid', placeItems: 'center' }}>
                {pendingRoll ? pendingRoll.number : '?'}
              </div>
              <div style={{ background: '#8f1f2d', color: pendingRoll?.tone || '#fff', borderRadius: '12px', padding: '10px', fontWeight: 900, fontSize: '24px', minHeight: '58px', display: 'grid', placeItems: 'center' }}>
                {pendingRoll ? pendingRoll.icon : '?'}
                {pendingRoll && <span style={{ display: 'block', color: '#fff', fontSize: '10px', marginTop: '2px' }}>{pendingRoll.eventName}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxWidth: '360px', margin: '0 auto' }}>
              <button className="btn primary" disabled={!canAct || Boolean(pendingRoll)} onClick={handleRollDice}>
                Gooi dobbelstenen
              </button>
              <button className="btn danger" disabled={!canAct} onClick={handleSolve}>
                Los op (+{difficultyConfig.solvePenalty} strike{difficultyConfig.solvePenalty > 1 ? 's' : ''} bij fout)
              </button>
            </div>

            <div>
              <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '12px', marginBottom: '6px' }}>Medeklinkers</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', maxWidth: '380px', margin: '0 auto' }}>
                {PLANK_CONSONANTS.map(letter => renderLetterButton(letter, 'consonant'))}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '12px', marginBottom: '6px' }}>Klinkers kopen: {difficultyConfig.vowelCost} buit</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', maxWidth: '260px', margin: '0 auto' }}>
                {PLANK_VOWELS.map(letter => renderLetterButton(letter, 'vowel'))}
              </div>
            </div>

            {wrongGuesses.length > 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                Foute letters: {wrongGuesses.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const YAHTZEE_DICE = [
  { value: 1, label: "Kasteel" },
  { value: 2, label: "Ster" },
  { value: 3, label: "Muziek" },
  { value: 4, label: "Kroon" },
  { value: 5, label: "Tover" },
  { value: 6, label: "Vuurwerk" }
];

const YAHTZEE_CATEGORIES = [
  { id: "ones", name: "Eentjes", hint: "Alle 1'en", upperValue: 1 },
  { id: "twos", name: "Tweetjes", hint: "Alle 2'en", upperValue: 2 },
  { id: "threes", name: "Drietjes", hint: "Alle 3'en", upperValue: 3 },
  { id: "fours", name: "Viertjes", hint: "Alle 4'en", upperValue: 4 },
  { id: "fives", name: "Vijfjes", hint: "Alle 5'en", upperValue: 5 },
  { id: "sixes", name: "Zesjes", hint: "Alle 6'en", upperValue: 6 },
  { id: "threeKind", name: "3 gelijk", hint: "Drie dezelfde: totaal" },
  { id: "fourKind", name: "4 gelijk", hint: "Vier dezelfde: totaal" },
  { id: "fullHouse", name: "Full House", hint: "3 + 2 gelijk: 25" },
  { id: "smallStreet", name: "Kleine straat", hint: "Vier op rij: 30" },
  { id: "largeStreet", name: "Grote straat", hint: "Vijf op rij: 40" },
  { id: "yahtzee", name: "Yahtzee", hint: "Vijf dezelfde: 50" },
  { id: "chance", name: "Chance", hint: "Alle ogen samen" }
];

const YAHTZEE_UPPER_IDS = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const YAHTZEE_LOWER_IDS = YAHTZEE_CATEGORIES.filter(category => !YAHTZEE_UPPER_IDS.includes(category.id)).map(category => category.id);
const YAHTZEE_BONUS_THRESHOLD = 63;
const YAHTZEE_BONUS_POINTS = 35;

function rollYahtzeeDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function makeYahtzeeScores() {
  return [{}, {}];
}

function getYahtzeeCounts(dice) {
  return dice.reduce((acc, value) => {
    if (value) acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function hasYahtzeeRun(values, run) {
  return run.every(value => values.includes(value));
}

function scoreYahtzeeCategory(categoryId, dice) {
  if (!dice.every(Boolean)) return 0;
  const counts = getYahtzeeCounts(dice);
  const values = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const total = dice.reduce((sum, value) => sum + value, 0);
  const category = YAHTZEE_CATEGORIES.find(item => item.id === categoryId);

  if (category?.upperValue) {
    return dice.filter(value => value === category.upperValue).reduce((sum, value) => sum + value, 0);
  }

  const countValues = Object.values(counts);
  switch (categoryId) {
    case "threeKind":
      return countValues.some(count => count >= 3) ? total : 0;
    case "fourKind":
      return countValues.some(count => count >= 4) ? total : 0;
    case "fullHouse":
      return (countValues.includes(3) && countValues.includes(2)) || countValues.includes(5) ? 25 : 0;
    case "smallStreet":
      return hasYahtzeeRun(values, [1, 2, 3, 4]) || hasYahtzeeRun(values, [2, 3, 4, 5]) || hasYahtzeeRun(values, [3, 4, 5, 6]) ? 30 : 0;
    case "largeStreet":
      return hasYahtzeeRun(values, [1, 2, 3, 4, 5]) || hasYahtzeeRun(values, [2, 3, 4, 5, 6]) ? 40 : 0;
    case "yahtzee":
      return countValues.includes(5) ? 50 : 0;
    case "chance":
      return total;
    default:
      return 0;
  }
}

function getYahtzeeTotal(scoreCard = {}) {
  const rawTotal = Object.values(scoreCard).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const upperTotal = YAHTZEE_UPPER_IDS.reduce((sum, id) => sum + (Number(scoreCard[id]) || 0), 0);
  return rawTotal + (upperTotal >= YAHTZEE_BONUS_THRESHOLD ? YAHTZEE_BONUS_POINTS : 0);
}

function getYahtzeeUpperTotal(scoreCard = {}) {
  return YAHTZEE_UPPER_IDS.reduce((sum, id) => sum + (Number(scoreCard[id]) || 0), 0);
}

function isYahtzeeComplete(scores) {
  return [0, 1].every(index => YAHTZEE_CATEGORIES.every(category => scores?.[index]?.[category.id] !== undefined));
}

function chooseYahtzeeAiCategory(dice, scoreCard = {}) {
  const openCategories = YAHTZEE_CATEGORIES.filter(category => scoreCard[category.id] === undefined);
  return openCategories
    .map(category => ({ ...category, score: scoreYahtzeeCategory(category.id, dice) }))
    .sort((a, b) => b.score - a.score)[0];
}

function chooseYahtzeeAiCategoryByLevel(dice, scoreCard = {}, aiLevel = 'normal') {
  const openCategories = YAHTZEE_CATEGORIES.filter(category => scoreCard[category.id] === undefined);
  if (aiLevel === 'easy') {
    return openCategories[Math.floor(Math.random() * openCategories.length)];
  }
  if (aiLevel === 'hard') {
    return openCategories
      .map(category => {
        const score = scoreYahtzeeCategory(category.id, dice);
        const zeroCost = {
          yahtzee: 32,
          largeStreet: 25,
          smallStreet: 17,
          fullHouse: 16,
          fourKind: 13,
          threeKind: 9,
          chance: 18
        }[category.id] || (category.upperValue || 1) * 1.5;
        const upperBonusPace = category.upperValue && score >= category.upperValue * 3 ? 8 : 0;
        const categoryBonus = category.id === 'yahtzee' && score === 50 ? 30
          : category.id === 'largeStreet' && score === 40 ? 18
            : category.id === 'smallStreet' && score === 30 ? 10
              : 0;
        return { ...category, score, priority: score > 0 ? score + upperBonusPace + categoryBonus : -zeroCost };
      })
      .sort((a, b) => b.priority - a.priority)[0];
  }
  return chooseYahtzeeAiCategory(dice, scoreCard);
}

function chooseYahtzeeKeepIndices(dice, scoreCard = {}, aiLevel = 'normal') {
  const counts = getYahtzeeCounts(dice);
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const open = id => scoreCard[id] === undefined;
  const indicesForValues = values => {
    const used = new Set();
    return dice.reduce((indices, value, index) => {
      if (!values.includes(value) || used.has(value)) return indices;
      used.add(value);
      indices.push(index);
      return indices;
    }, []);
  };

  if (aiLevel === 'hard') {
    const bestGroup = groups[0];
    if (bestGroup?.count >= 3 && (open('yahtzee') || open('fourKind') || open('threeKind'))) {
      return dice.reduce((indices, value, index) => value === bestGroup.value ? [...indices, index] : indices, []);
    }

    if (open('largeStreet') || open('smallStreet')) {
      const runs = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
      const bestRun = runs
        .map(run => ({ run, present: run.filter(value => counts[value]).length }))
        .sort((a, b) => b.present - a.present)[0];
      if (bestRun.present >= 3) return indicesForValues(bestRun.run);
    }

    if (open('fullHouse')) {
      const pairValues = groups.filter(group => group.count >= 2).slice(0, 2).map(group => group.value);
      if (pairValues.length >= 2 || groups[0]?.count >= 3) {
        return dice.reduce((indices, value, index) => pairValues.includes(value) ? [...indices, index] : indices, []);
      }
    }
  }

  const upperCandidates = groups.filter(group => open(YAHTZEE_UPPER_IDS[group.value - 1]));
  const target = (upperCandidates.length ? upperCandidates : groups)
    .sort((a, b) => (b.count * b.value) - (a.count * a.value))[0];
  if (!target || target.count < 2) return [];
  return dice.reduce((indices, value, index) => value === target.value ? [...indices, index] : indices, []);
}

function playYahtzeeAiTurn(scoreCard = {}, aiLevel = 'normal') {
  const rollCount = aiLevel === 'easy' ? 1 : aiLevel === 'hard' ? 3 : 2;
  let dice = Array.from({ length: 5 }, rollYahtzeeDie);
  for (let roll = 1; roll < rollCount; roll++) {
    const keep = new Set(chooseYahtzeeKeepIndices(dice, scoreCard, aiLevel));
    dice = dice.map((value, index) => keep.has(index) ? value : rollYahtzeeDie());
  }
  const choice = chooseYahtzeeAiCategoryByLevel(dice, scoreCard, aiLevel);
  return { dice, choice, rolls: rollCount };
}

export function DisneyYahtzeeGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const taskState = room.current_task_state || {};
  const aiLevel = taskState.aiLevel || 'normal';
  const activeIndex = room.current_player_index || 0;
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const playerNames = [
    isSolo ? "Jij" : (players[0]?.name || "Speler 1"),
    isSolo ? "Computer" : (players[1]?.name || "Speler 2")
  ];
  const playerColors = ["#5bbcff", "#ff5b5b", "#ffd45c", "#32d583"];
  const [viewedScoreIndex, setViewedScoreIndex] = useState(myIndex);

  const scores = Array.isArray(taskState.yahtzeeScores) ? taskState.yahtzeeScores : makeYahtzeeScores();
  const dice = Array.isArray(taskState.yahtzeeDice) ? taskState.yahtzeeDice : [null, null, null, null, null];
  const held = Array.isArray(taskState.yahtzeeHeld) ? taskState.yahtzeeHeld : [false, false, false, false, false];
  const rolls = taskState.yahtzeeRolls || 0;
  const isComplete = taskState.yahtzeeComplete || isYahtzeeComplete(scores);
  const myTurn = activeIndex === myIndex && !isComplete;
  const aiTurnRef = useRef("");

  useEffect(() => {
    if (!taskState.yahtzeeScores) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          yahtzeeScores: makeYahtzeeScores(),
          yahtzeeDice: [null, null, null, null, null],
          yahtzeeHeld: [false, false, false, false, false],
          yahtzeeRolls: 0,
          yahtzeeComplete: false,
          yahtzeeLastMove: null
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!isSolo || activeIndex !== 1 || isComplete || !taskState.yahtzeeScores) return;

    const aiKey = JSON.stringify(scores[1] || {});
    if (aiTurnRef.current === aiKey) return;
    aiTurnRef.current = aiKey;

    const timer = setTimeout(() => {
      const { dice: aiDice, choice: aiChoice, rolls: aiRolls } = playYahtzeeAiTurn(scores[1] || {}, aiLevel);
      if (!aiChoice) return;
      const aiScore = scoreYahtzeeCategory(aiChoice.id, aiDice);

      const nextScores = [
        { ...(scores[0] || {}) },
        { ...(scores[1] || {}), [aiChoice.id]: aiScore }
      ];
      const nextComplete = isYahtzeeComplete(nextScores);

      updateRoomState(room.id, {
        current_player_index: nextComplete ? 1 : 0,
        current_task_state: {
          ...taskState,
          yahtzeeScores: nextScores,
          yahtzeeDice: [null, null, null, null, null],
          yahtzeeHeld: [false, false, false, false, false],
          yahtzeeRolls: 0,
          yahtzeeComplete: nextComplete,
          yahtzeeLastMove: `Computer (LEVEL ${{ easy: 1, normal: 2, hard: 3 }[aiLevel] || 2}) gebruikte ${aiRolls} worp${aiRolls === 1 ? '' : 'en'} en koos ${aiChoice.name} voor ${aiScore} punten.`
        }
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [isSolo, activeIndex, isComplete, taskState.yahtzeeScores, aiLevel]);

  const handleRoll = () => {
    if (!myTurn || rolls >= 3) return;
    const nextDice = dice.map((value, index) => (held[index] && value ? value : rollYahtzeeDie()));
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        yahtzeeDice: nextDice,
        yahtzeeHeld: rolls === 0 ? [false, false, false, false, false] : held,
        yahtzeeRolls: rolls + 1,
        yahtzeeLastMove: null
      }
    });
  };

  const toggleHold = (index) => {
    if (!myTurn || rolls === 0) return;
    const nextHeld = held.map((value, heldIndex) => heldIndex === index ? !value : value);
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        yahtzeeHeld: nextHeld
      }
    });
  };

  const handleScoreCategory = (categoryId) => {
    if (!myTurn || rolls === 0 || scores[activeIndex]?.[categoryId] !== undefined) return;

    const score = scoreYahtzeeCategory(categoryId, dice);
    const nextScores = [
      { ...(scores[0] || {}) },
      { ...(scores[1] || {}) }
    ];
    nextScores[activeIndex][categoryId] = score;
    const nextComplete = isYahtzeeComplete(nextScores);
    const category = YAHTZEE_CATEGORIES.find(item => item.id === categoryId);

    updateRoomState(room.id, {
      current_player_index: nextComplete ? activeIndex : (activeIndex + 1) % 2,
      current_task_state: {
        ...taskState,
        yahtzeeScores: nextScores,
        yahtzeeDice: [null, null, null, null, null],
        yahtzeeHeld: [false, false, false, false, false],
        yahtzeeRolls: 0,
        yahtzeeComplete: nextComplete,
        yahtzeeLastMove: `${playerNames[activeIndex]} koos ${category?.name || "categorie"} voor ${score} punten.`
      }
    });
  };

  const handleFinish = () => {
    const myTotal = getYahtzeeTotal(scores[myIndex] || scores[0]);
    const otherIndex = myIndex === 0 ? 1 : 0;
    const otherTotal = getYahtzeeTotal(scores[otherIndex] || {});
    const won = myTotal > otherTotal;
    const tie = myTotal === otherTotal;
    const points = won ? 3 : tie ? 2 : 1;
    const detail = won
      ? `Goofy's Geluksworp gewonnen: ${myTotal}-${otherTotal}`
      : tie
        ? `Goofy's Geluksworp gelijkspel: ${myTotal}-${otherTotal}`
        : `Goofy's Geluksworp verloren: ${myTotal}-${otherTotal}`;
    onFinish(points, detail);
  };

  const totals = [getYahtzeeTotal(scores[0]), getYahtzeeTotal(scores[1])];
  const winnerText = totals[0] === totals[1]
    ? "Gelijkspel"
    : `${playerNames[totals[0] > totals[1] ? 0 : 1]} wint!`;
  const viewedScore = scores[viewedScoreIndex] || {};
  const viewedUpperTotal = getYahtzeeUpperTotal(viewedScore);
  const viewedUpperBonus = viewedUpperTotal >= YAHTZEE_BONUS_THRESHOLD ? YAHTZEE_BONUS_POINTS : 0;
  const renderYahtzeeScoreRows = (categoryIds) => categoryIds.map(categoryId => {
    const category = YAHTZEE_CATEGORIES.find(item => item.id === categoryId);
    const savedScore = viewedScore[categoryId];
    const isActiveCard = viewedScoreIndex === activeIndex;
    const isUsed = savedScore !== undefined;
    const preview = isActiveCard && rolls > 0 ? scoreYahtzeeCategory(categoryId, dice) : null;
    return (
      <button
        key={categoryId}
        type="button"
        className="btn mini"
        disabled={!myTurn || !isActiveCard || rolls === 0 || isUsed || isComplete}
        onClick={() => handleScoreCategory(categoryId)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '7px 8px',
          borderRadius: '8px',
          background: isUsed ? '#10264c' : '#07152c',
          border: isActiveCard && !isUsed && rolls > 0 ? `1px solid ${playerColors[viewedScoreIndex]}` : '1px solid var(--line)',
          color: '#fff',
          textAlign: 'left',
          fontSize: '12px'
        }}
      >
        <span>
          <strong>{category?.name}</strong>
          <span style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>{category?.hint}</span>
        </span>
        <strong style={{ color: isUsed ? 'var(--gold)' : playerColors[viewedScoreIndex] }}>
          {isUsed ? savedScore : preview === null ? "-" : `+${preview}`}
        </strong>
      </button>
    );
  });

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[0, 1].map(index => (
          <button
            key={index}
            type="button"
            onClick={() => setViewedScoreIndex(index)}
            className="btn mini"
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: viewedScoreIndex === index ? '#10264c' : '#07152c',
              border: viewedScoreIndex === index ? `2px solid ${playerColors[index]}` : '1px solid var(--line)',
              textAlign: 'center'
            }}
          >
            <div style={{ color: playerColors[index], fontWeight: 800, fontSize: '13px' }}>{playerNames[index]}</div>
            <div style={{ fontSize: '24px', fontWeight: 900 }}>{totals[index]}</div>
            <div style={{ color: activeIndex === index && !isComplete ? 'var(--gold)' : 'var(--muted)', fontSize: '10px' }}>
              {activeIndex === index && !isComplete ? "Aan zet" : "Scorekaart"}
            </div>
          </button>
        ))}
      </div>

      <div style={{ margin: '8px 0 12px', minHeight: '22px', color: 'var(--muted)', fontSize: '13px' }}>
        {isComplete
          ? <strong style={{ color: 'var(--gold)' }}>{winnerText}</strong>
          : activeIndex === 1 && isSolo
            ? "Computer denkt na..."
            : myTurn
              ? `Jouw beurt: worp ${Math.min(rolls + 1, 3)} van 3.`
              : `Wachten op ${playerNames[activeIndex]}...`}
        {taskState.yahtzeeLastMove && (
          <div style={{ marginTop: '4px' }}>{taskState.yahtzeeLastMove}</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', maxWidth: '360px', margin: '0 auto 12px' }}>
        {dice.map((value, index) => {
          const die = YAHTZEE_DICE.find(item => item.value === value);
          return (
            <button
              key={index}
              type="button"
              className={`btn ${held[index] ? 'primary' : 'secondary'}`}
              onClick={() => toggleHold(index)}
              disabled={!myTurn || rolls === 0 || isComplete}
              style={{
                minWidth: 0,
                aspectRatio: '1',
                padding: '6px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                lineHeight: 1.1
              }}
            >
              <strong style={{ fontSize: '24px' }}>{value || "?"}</strong>
              <span style={{ fontSize: '9px' }}>{die?.label || "Worp"}</span>
            </button>
          );
        })}
      </div>

      <button
        className={`btn ${(!myTurn || rolls >= 3 || isComplete) ? 'secondary' : 'primary'} full`}
        onClick={handleRoll}
        disabled={!myTurn || rolls >= 3 || isComplete}
        style={{ marginBottom: '12px', opacity: (!myTurn || rolls >= 3 || isComplete) ? 0.55 : 1 }}
      >
        {rolls === 0 ? "Gooi dobbelstenen" : rolls < 3 ? "Gooi opnieuw" : "Kies een score"}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'start', marginTop: '8px' }}>
        <div style={{ background: '#061225', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <strong style={{ color: playerColors[viewedScoreIndex] }}>Boven</strong>
            <span style={{ color: 'var(--muted)' }}>{viewedUpperTotal}/63 · bonus {viewedUpperBonus}</span>
          </div>
          <div style={{ display: 'grid', gap: '5px' }}>
            {renderYahtzeeScoreRows(YAHTZEE_UPPER_IDS)}
          </div>
        </div>

        <div style={{ background: '#061225', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <strong style={{ color: playerColors[viewedScoreIndex] }}>Onder</strong>
            <span style={{ color: 'var(--muted)' }}>Totaal {getYahtzeeTotal(viewedScore)}</span>
          </div>
          <div style={{ display: 'grid', gap: '5px' }}>
            {renderYahtzeeScoreRows(YAHTZEE_LOWER_IDS)}
          </div>
        </div>
      </div>

      {isComplete && (
        <button className="btn primary full" onClick={handleFinish} style={{ marginTop: '14px' }}>
          Score opslaan & terug
        </button>
      )}
    </div>
  );
}

const QWIXX_ROWS = [
  { id: "red", name: "Mickey Rood", color: "#ff4d5d", values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "yellow", name: "Belle Geel", color: "#ffd45c", values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "green", name: "Tiana Groen", color: "#32d583", values: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2] },
  { id: "blue", name: "Elsa Blauw", color: "#5bbcff", values: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2] }
];

function rollQwixxDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function createQwixxMarks() {
  return QWIXX_ROWS.reduce((acc, row) => ({ ...acc, [row.id]: [] }), {});
}

function createQwixxScores() {
  return [createQwixxMarks(), createQwixxMarks()];
}

function isQwixxValueOpen(row, marks = [], value, lockedRows = []) {
  if (lockedRows.includes(row.id) || !row.values.includes(value) || marks.includes(value)) return false;
  const valueIndex = row.values.indexOf(value);
  if (valueIndex === row.values.length - 1 && marks.length < 5) return false;
  const furthestIndex = marks.reduce((max, markedValue) => Math.max(max, row.values.indexOf(markedValue)), -1);
  return valueIndex > furthestIndex;
}

function getQwixxWhiteOptions(dice, marks, lockedRows) {
  if (!dice) return [];
  const whiteSum = dice.white1 + dice.white2;
  const options = [];

  QWIXX_ROWS.forEach(row => {
    const rowMarks = marks?.[row.id] || [];
    if (isQwixxValueOpen(row, rowMarks, whiteSum, lockedRows)) {
      options.push({ key: `${row.id}-${whiteSum}`, rowId: row.id, value: whiteSum, source: "witte som" });
    }
  });

  return options;
}

function getQwixxColorOptions(dice, marks, lockedRows) {
  if (!dice) return [];
  const options = [];

  QWIXX_ROWS.forEach(row => {
    if (lockedRows.includes(row.id) || !Number.isFinite(dice[row.id])) return;
    const rowMarks = marks?.[row.id] || [];
    [dice.white1 + dice[row.id], dice.white2 + dice[row.id]].forEach(value => {
      if (isQwixxValueOpen(row, rowMarks, value, lockedRows)) {
        const key = `${row.id}-${value}`;
        if (!options.some(option => option.key === key)) {
          options.push({ key, rowId: row.id, value, source: "wit + kleur" });
        }
      }
    });
  });

  return options;
}

function addQwixxMark(allMarks, playerIndex, rowId, value) {
  return allMarks.map((playerMarks, index) => {
    if (index !== playerIndex) return playerMarks;
    return {
      ...playerMarks,
      [rowId]: [...(playerMarks[rowId] || []), value]
    };
  });
}

function getQwixxNextLockedRows(lockedRows, row, previousMarks, value) {
  const isFinalNumber = row.values.indexOf(value) === row.values.length - 1;
  // A player needs five earlier crosses before the final box can lock a colour.
  if (!isFinalNumber || previousMarks.length < 5 || lockedRows.includes(row.id)) return lockedRows;
  return [...lockedRows, row.id];
}

function getQwixxNextClosedBy(closedBy, previousLockedRows, nextLockedRows, rowId, playerIndex) {
  if (previousLockedRows.includes(rowId) || !nextLockedRows.includes(rowId)) return closedBy;
  return { ...closedBy, [rowId]: playerIndex };
}

function appendQwixxAction(actionLog, action) {
  if (!action?.text) return Array.isArray(actionLog) ? actionLog.slice(-8) : [];
  return [...(Array.isArray(actionLog) ? actionLog : []), {
    id: `${Date.now()}-${action.playerIndex ?? 'game'}-${action.rowId || 'none'}-${action.value ?? 'none'}`,
    ...action
  }].slice(-8);
}

function chooseQwixxAiOption(options, marks, aiLevel, context = {}) {
  if (!options.length) return null;
  const scored = options.map(option => {
    const row = QWIXX_ROWS.find(item => item.id === option.rowId);
    const rowIndex = row.values.indexOf(option.value);
    const rowMarks = marks[row.id] || [];
    const markCount = rowMarks.length;
    const furthestIndex = rowMarks.reduce((max, value) => Math.max(max, row.values.indexOf(value)), -1);
    const skippedBoxes = Math.max(0, rowIndex - furthestIndex - 1);
    const canLock = rowIndex === row.values.length - 1 && markCount >= 5;
    const pointGain = markCount + 1 + (canLock ? markCount + 2 : 0);
    const opponentThreat = (context.opponentMarks?.[row.id] || []).length >= 5;
    const normalPriority = pointGain * 2.2 - skippedBoxes * 2.4 + (canLock ? 18 : 0) + rowIndex * 0.12;
    const hardPriority = pointGain * 3.4
      - skippedBoxes * 5.2
      + (canLock ? 34 : 0)
      + (canLock && opponentThreat ? 10 : 0)
      + (markCount >= 4 ? 4 : 0)
      - (rowIndex >= 8 && markCount < 3 ? 9 : 0);
    return {
      ...option,
      row,
      markCount,
      skippedBoxes,
      canLock,
      priority: aiLevel === 'hard' ? hardPriority : normalPriority
    };
  });
  if (aiLevel === 'easy') {
    if (context.canSkip && Math.random() < 0.18) return null;
    return scored[Math.floor(Math.random() * scored.length)];
  }
  const best = scored.sort((a, b) => b.priority - a.priority)[0];
  if (context.canSkip && !context.mustAvoidPenalty) {
    if (aiLevel === 'hard' && best.skippedBoxes >= 4 && best.markCount < 4 && !best.canLock) return null;
    if (aiLevel === 'normal' && best.skippedBoxes >= 6 && !best.canLock) return null;
  }
  return best;
}

function chooseQwixxAiWhiteOption(dice, aiMarks, lockedRows, aiLevel, context = {}) {
  const whiteOptions = getQwixxWhiteOptions(dice, aiMarks, lockedRows);
  if (aiLevel !== 'hard' || !context.isActivePlayer) {
    return chooseQwixxAiOption(whiteOptions, aiMarks, aiLevel, {
      canSkip: true,
      opponentMarks: context.opponentMarks,
      phase: 'white'
    });
  }

  const candidates = [null, ...whiteOptions].map(option => {
    if (!option) {
      const colorChoice = chooseQwixxAiOption(
        getQwixxColorOptions(dice, aiMarks, lockedRows),
        aiMarks,
        'hard',
        { canSkip: false, mustAvoidPenalty: true, opponentMarks: context.opponentMarks, phase: 'color' }
      );
      return { option: null, combinedPriority: (colorChoice?.priority || -5) - 1 };
    }

    const row = QWIXX_ROWS.find(item => item.id === option.rowId);
    const nextAiMarks = {
      ...aiMarks,
      [option.rowId]: [...(aiMarks[option.rowId] || []), option.value]
    };
    const nextLockedRows = getQwixxNextLockedRows(lockedRows, row, aiMarks[option.rowId] || [], option.value);
    const whiteEvaluation = chooseQwixxAiOption([option], aiMarks, 'hard', {
      canSkip: false,
      opponentMarks: context.opponentMarks,
      phase: 'white'
    });
    const colorChoice = chooseQwixxAiOption(
      getQwixxColorOptions(dice, nextAiMarks, nextLockedRows),
      nextAiMarks,
      'hard',
      { canSkip: true, mustAvoidPenalty: false, opponentMarks: context.opponentMarks, phase: 'color' }
    );
    const closesGame = nextLockedRows.length >= 2;
    return {
      option,
      combinedPriority: (whiteEvaluation?.priority || 0) + (colorChoice?.priority || 0) + (closesGame ? 45 : 0)
    };
  });

  return candidates.sort((a, b) => b.combinedPriority - a.combinedPriority)[0]?.option || null;
}

function scoreQwixxMarks(count) {
  return (count * (count + 1)) / 2;
}

function getQwixxPlayerTotal(marks = createQwixxMarks(), penalties = 0, closedBy = {}, playerIndex = -1) {
  const rowScore = QWIXX_ROWS.reduce((sum, row) => {
    const lockBonus = closedBy[row.id] === playerIndex ? 1 : 0;
    return sum + scoreQwixxMarks((marks[row.id] || []).length + lockBonus);
  }, 0);
  return rowScore - penalties * 5;
}

function isQwixxComplete(nextState) {
  return (nextState.qwixxLockedRows || []).length >= 2
    || (nextState.qwixxPenalties || []).some(value => value >= 4);
}

function getQwixxEndReason(nextState) {
  if ((nextState.qwixxLockedRows || []).length >= 2) return "Er zijn twee kleurrijen gesloten.";
  if ((nextState.qwixxPenalties || []).some(value => value >= 4)) return "Een speler heeft vier strafvakjes.";
  return "";
}

function QwixxZoomBoard({ children, label, color }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef(null);
  const touchRef = useRef(null);
  const mouseRef = useRef(null);
  const suppressClickRef = useRef(false);

  const clampZoom = value => Math.min(2.2, Math.max(1, value));
  const clampPan = (nextPan, nextZoom = zoom) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || nextZoom <= 1) return { x: 0, y: 0 };
    const maxX = Math.max(18, (rect.width * (nextZoom - 1)) / 2);
    const maxY = Math.max(18, (rect.height * (nextZoom - 1)) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextPan.x)),
      y: Math.min(maxY, Math.max(-maxY, nextPan.y))
    };
  };
  const applyZoom = value => {
    const nextZoom = clampZoom(value);
    setZoom(nextZoom);
    setPan(previous => clampPan(previous, nextZoom));
  };
  const touchDistance = touches => {
    const [first, second] = touches;
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };
  const handleTouchStart = event => {
    if (event.touches.length === 2) {
      touchRef.current = { mode: 'pinch', distance: touchDistance(event.touches), zoom, pan };
    } else if (event.touches.length === 1 && zoom > 1) {
      touchRef.current = {
        mode: 'pan',
        startX: event.touches[0].clientX,
        startY: event.touches[0].clientY,
        pan,
        moved: false
      };
    }
  };
  const handleTouchMove = event => {
    const gesture = touchRef.current;
    if (!gesture) return;
    if (event.touches.length === 2 && gesture.mode === 'pinch') {
      event.preventDefault();
      const nextZoom = clampZoom(gesture.zoom * (touchDistance(event.touches) / gesture.distance));
      setZoom(nextZoom);
      setPan(clampPan(gesture.pan, nextZoom));
      return;
    }
    if (event.touches.length !== 1 || gesture.mode !== 'pan') return;
    const dx = event.touches[0].clientX - gesture.startX;
    const dy = event.touches[0].clientY - gesture.startY;
    if (!gesture.moved && Math.abs(dx) + Math.abs(dy) > 6) {
      gesture.moved = true;
      suppressClickRef.current = true;
    }
    if (!gesture.moved) return;
    event.preventDefault();
    setPan(clampPan({ x: gesture.pan.x + dx, y: gesture.pan.y + dy }, zoom));
  };
  const handleTouchEnd = () => {
    const moved = touchRef.current?.moved;
    touchRef.current = null;
    setPan(previous => clampPan(previous, zoom));
    if (moved) {
      window.setTimeout(() => { suppressClickRef.current = false; }, 220);
    }
  };
  const handleMouseDown = event => {
    if (zoom <= 1 || event.button !== 0) return;
    mouseRef.current = { startX: event.clientX, startY: event.clientY, pan };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleMouseMove = event => {
    const gesture = mouseRef.current;
    if (!gesture) return;
    setPan(clampPan({
      x: gesture.pan.x + event.clientX - gesture.startX,
      y: gesture.pan.y + event.clientY - gesture.startY
    }, zoom));
  };
  const handleMouseUp = event => {
    if (!mouseRef.current) return;
    mouseRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const keepInBounds = () => setPan(previous => clampPan(previous, zoom));
    window.addEventListener('resize', keepInBounds);
    return () => window.removeEventListener('resize', keepInBounds);
  }, [zoom]);

  return (
    <div className="qwixx-zoom-shell">
      <div className="qwixx-viewbar" style={{ borderColor: color }}>
        <div>
          <strong style={{ color }}>{label}</strong>
          <small>{zoom > 1 ? 'Sleep om over het bord te bewegen' : '100% vult het kader precies'}</small>
        </div>
        <div className="qwixx-zoom-controls" aria-label="Zoom scorekaart">
          <button type="button" onClick={() => applyZoom(+(zoom - 0.2).toFixed(2))} disabled={zoom <= 1} aria-label="Scorekaart verkleinen">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => applyZoom(+(zoom + 0.2).toFixed(2))} disabled={zoom >= 2.2} aria-label="Scorekaart vergroten">+</button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="qwixx-board-frame"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={event => event.pointerType === 'mouse' && handleMouseDown(event)}
        onPointerMove={event => event.pointerType === 'mouse' && handleMouseMove(event)}
        onPointerUp={event => event.pointerType === 'mouse' && handleMouseUp(event)}
        onPointerCancel={event => event.pointerType === 'mouse' && handleMouseUp(event)}
        style={{ touchAction: zoom > 1 ? 'none' : 'pan-y', cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        <div
          className="qwixx-board-surface"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          onClickCapture={event => {
            if (!suppressClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function DisneyQwixxGame({ mode, room, localPlayer, players, updateRoomState, onFinish, onToolbarChange }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const taskState = room.current_task_state || {};
  const aiLevel = taskState.aiLevel || 'normal';
  const activeIndex = room.current_player_index || 0;
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const playerNames = [
    isSolo ? (players[0]?.name || localPlayer?.name || "Speler 1") : (players[0]?.name || "Speler 1"),
    isSolo ? `Computer · LEVEL ${{ easy: 1, normal: 2, hard: 3 }[aiLevel] || 2}` : (players[1]?.name || "Speler 2")
  ];

  const marks = Array.isArray(taskState.qwixxMarks) ? taskState.qwixxMarks : createQwixxScores();
  const penalties = Array.isArray(taskState.qwixxPenalties) ? taskState.qwixxPenalties : [0, 0];
  const dice = taskState.qwixxDice || null;
  const rolled = Boolean(taskState.qwixxRolled);
  const round = taskState.qwixxRound || 1;
  const lockedRows = taskState.qwixxLockedRows || [];
  const phase = taskState.qwixxPhase || (rolled ? 'white' : 'roll');
  const whiteDone = Array.isArray(taskState.qwixxWhiteDone) ? taskState.qwixxWhiteDone : [false, false];
  const activeMarked = Boolean(taskState.qwixxActiveMarked);
  const complete = Boolean(taskState.qwixxComplete);
  const endReason = taskState.qwixxEndReason || "";
  const closedBy = taskState.qwixxClosedBy || {};
  const actionLog = Array.isArray(taskState.qwixxActionLog) ? taskState.qwixxActionLog : [];
  const myTurn = activeIndex === myIndex && !complete;
  const aiTurnRef = useRef("");
  const [viewedPlayerIndex, setViewedPlayerIndex] = useState(myIndex);
  const playerColors = ['#5bbcff', '#ff7b8b'];

  useEffect(() => {
    if (!taskState.qwixxMarks) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          qwixxMarks: createQwixxScores(),
          qwixxPenalties: [0, 0],
          qwixxDice: null,
          qwixxRolled: false,
          qwixxRound: 1,
          qwixxLockedRows: [],
          qwixxPhase: 'roll',
          qwixxWhiteDone: [false, false],
          qwixxActiveMarked: false,
          qwixxComplete: false,
          qwixxClosedBy: {},
          qwixxActionLog: [],
          qwixxLastMove: null
        }
      });
    }
  }, []);

  const myMarks = marks[myIndex] || createQwixxMarks();
  const visibleMarks = marks[viewedPlayerIndex] || createQwixxMarks();
  const whiteOptions = getQwixxWhiteOptions(dice, myMarks, lockedRows);
  const colorOptions = getQwixxColorOptions(dice, myMarks, lockedRows);
  const canChooseWhite = rolled && phase === 'white' && !whiteDone[myIndex] && !complete;
  const canChooseColor = rolled && phase === 'color' && myTurn && !complete;
  const currentOptions = phase === 'white' ? whiteOptions : colorOptions;

  const finishTurn = (nextMarks, nextPenalties, nextLockedRows, action, nextClosedBy = closedBy) => {
    const nextRound = activeIndex === 1 ? round + 1 : round;
    const nextState = {
      ...taskState,
      qwixxMarks: nextMarks,
      qwixxPenalties: nextPenalties,
      qwixxDice: null,
      qwixxRolled: false,
      qwixxRound: nextRound,
      qwixxLockedRows: nextLockedRows,
      qwixxPhase: 'roll',
      qwixxWhiteDone: [false, false],
      qwixxActiveMarked: false,
      qwixxClosedBy: nextClosedBy,
      qwixxActionLog: appendQwixxAction(actionLog, action),
      qwixxLastMove: action?.text || null
    };
    const nextComplete = isQwixxComplete(nextState);

    updateRoomState(room.id, {
      current_player_index: nextComplete ? activeIndex : (activeIndex + 1) % 2,
      current_task_state: {
        ...nextState,
        qwixxComplete: nextComplete,
        qwixxEndReason: nextComplete ? getQwixxEndReason(nextState) : ""
      }
    });
  };

  const handleRoll = () => {
    if (!myTurn || rolled) return;
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        qwixxDice: {
          white1: rollQwixxDie(),
          white2: rollQwixxDie(),
          red: lockedRows.includes('red') ? null : rollQwixxDie(),
          yellow: lockedRows.includes('yellow') ? null : rollQwixxDie(),
          green: lockedRows.includes('green') ? null : rollQwixxDie(),
          blue: lockedRows.includes('blue') ? null : rollQwixxDie()
        },
        qwixxRolled: true,
        qwixxPhase: 'white',
        qwixxWhiteDone: [false, false],
        qwixxActiveMarked: false,
        qwixxLastMove: null
      }
    });
  };

  const updateWhiteChoice = (rowId, value) => {
    if (!canChooseWhite) return;
    const option = value === undefined
      ? null
      : whiteOptions.find(item => item.rowId === rowId && item.value === value);
    if (value !== undefined && !option) return;

    const row = option ? QWIXX_ROWS.find(item => item.id === rowId) : null;
    const nextMarks = option ? addQwixxMark(marks, myIndex, rowId, value) : marks;
    const nextLockedRows = option
      ? getQwixxNextLockedRows(lockedRows, row, myMarks[rowId] || [], value)
      : lockedRows;
    const nextClosedBy = option
      ? getQwixxNextClosedBy(closedBy, lockedRows, nextLockedRows, rowId, myIndex)
      : closedBy;
    const nextWhiteDone = whiteDone.map((done, index) => index === myIndex ? true : done);
    const nextPhase = nextWhiteDone.every(Boolean) ? 'color' : 'white';
    const nextActiveMarked = activeMarked || (myIndex === activeIndex && Boolean(option));
    const actionText = option
      ? `${playerNames[myIndex]} streepte witte som ${dice.white1 + dice.white2} af in ${row.name}.`
      : `${playerNames[myIndex]} sloeg de witte som over.`;

    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        qwixxMarks: nextMarks,
        qwixxLockedRows: nextLockedRows,
        qwixxWhiteDone: nextWhiteDone,
        qwixxActiveMarked: nextActiveMarked,
        qwixxPhase: nextPhase,
        qwixxClosedBy: nextClosedBy,
        qwixxActionLog: appendQwixxAction(actionLog, {
          text: actionText,
          playerIndex: myIndex,
          rowId: option ? rowId : null,
          value: option ? value : null,
          kind: option ? 'mark' : 'skip'
        }),
        qwixxLastMove: actionText
      }
    });
  };

  const handleColorMark = (rowId, value) => {
    if (!canChooseColor) return;
    const row = QWIXX_ROWS.find(item => item.id === rowId);
    const option = colorOptions.find(item => item.rowId === rowId && item.value === value);
    if (!row || !option) return;

    const nextMarks = addQwixxMark(marks, activeIndex, rowId, value);
    const nextLockedRows = getQwixxNextLockedRows(lockedRows, row, myMarks[rowId] || [], value);
    const nextClosedBy = getQwixxNextClosedBy(closedBy, lockedRows, nextLockedRows, rowId, activeIndex);
    const actionText = `${playerNames[activeIndex]} streepte ${value} af in ${row.name}.`;

    finishTurn(
      nextMarks,
      penalties,
      nextLockedRows,
      { text: actionText, playerIndex: activeIndex, rowId, value, kind: 'mark' },
      nextClosedBy
    );
  };

  const handleColorSkip = () => {
    if (!canChooseColor) return;
    const nextPenalties = penalties.map((value, index) => index === activeIndex && !activeMarked ? value + 1 : value);
    finishTurn(
      marks,
      nextPenalties,
      lockedRows,
      {
        text: activeMarked
          ? `${playerNames[activeIndex]} sloeg actie 2 over.`
          : `${playerNames[activeIndex]} streepte niets af en kreeg een strafvakje.`,
        playerIndex: activeIndex,
        kind: activeMarked ? 'skip' : 'penalty'
      }
    );
  };

  useEffect(() => {
    if (!isSolo || complete || !taskState.qwixxMarks) return;

    const aiIndex = 1;
    const aiKey = `${activeIndex}-${phase}-${rolled}-${JSON.stringify(dice)}-${JSON.stringify(marks[aiIndex])}-${JSON.stringify(whiteDone)}-${activeMarked}`;
    if (aiTurnRef.current === aiKey) return;
    if (!rolled && activeIndex !== aiIndex) return;
    if (rolled && phase === 'white' && whiteDone[aiIndex]) return;
    if (rolled && phase === 'color' && activeIndex !== aiIndex) return;
    aiTurnRef.current = aiKey;

    const timer = setTimeout(() => {
      if (!rolled) {
        updateRoomState(room.id, {
          current_task_state: {
            ...taskState,
            qwixxDice: {
              white1: rollQwixxDie(),
              white2: rollQwixxDie(),
              red: lockedRows.includes('red') ? null : rollQwixxDie(),
              yellow: lockedRows.includes('yellow') ? null : rollQwixxDie(),
              green: lockedRows.includes('green') ? null : rollQwixxDie(),
              blue: lockedRows.includes('blue') ? null : rollQwixxDie()
            },
            qwixxRolled: true,
            qwixxPhase: 'white',
            qwixxWhiteDone: [false, false],
            qwixxActiveMarked: false,
            qwixxLastMove: "Computer gooit de dobbelstenen."
          }
        });
        return;
      }

      const aiMarks = marks[aiIndex] || createQwixxMarks();
      if (phase === 'white') {
        const bestOption = chooseQwixxAiWhiteOption(
          dice,
          aiMarks,
          lockedRows,
          aiLevel,
          {
            isActivePlayer: activeIndex === aiIndex,
            opponentMarks: marks[0] || createQwixxMarks()
          }
        );
        const row = bestOption ? QWIXX_ROWS.find(item => item.id === bestOption.rowId) : null;
        const nextMarks = bestOption ? addQwixxMark(marks, aiIndex, bestOption.rowId, bestOption.value) : marks;
        const nextLockedRows = bestOption
          ? getQwixxNextLockedRows(lockedRows, row, aiMarks[bestOption.rowId] || [], bestOption.value)
          : lockedRows;
        const nextClosedBy = bestOption
          ? getQwixxNextClosedBy(closedBy, lockedRows, nextLockedRows, bestOption.rowId, aiIndex)
          : closedBy;
        const nextWhiteDone = whiteDone.map((done, index) => index === aiIndex ? true : done);
        const actionText = bestOption
          ? `Computer streepte witte som ${dice.white1 + dice.white2} af in ${row.name}.`
          : "Computer sloeg de witte som over.";
        updateRoomState(room.id, {
          current_task_state: {
            ...taskState,
            qwixxMarks: nextMarks,
            qwixxLockedRows: nextLockedRows,
            qwixxWhiteDone: nextWhiteDone,
            qwixxActiveMarked: activeMarked || (activeIndex === aiIndex && Boolean(bestOption)),
            qwixxPhase: nextWhiteDone.every(Boolean) ? 'color' : 'white',
            qwixxClosedBy: nextClosedBy,
            qwixxActionLog: appendQwixxAction(actionLog, {
              text: actionText,
              playerIndex: aiIndex,
              rowId: bestOption?.rowId || null,
              value: bestOption?.value ?? null,
              kind: bestOption ? 'mark' : 'skip'
            }),
            qwixxLastMove: actionText
          }
        });
        return;
      }

      const bestOption = chooseQwixxAiOption(
        getQwixxColorOptions(dice, aiMarks, lockedRows),
        aiMarks,
        aiLevel,
        {
          canSkip: true,
          mustAvoidPenalty: !activeMarked,
          opponentMarks: marks[0] || createQwixxMarks(),
          phase: 'color'
        }
      );
      if (!bestOption) {
        const nextPenalties = penalties.map((value, index) => index === aiIndex && !activeMarked ? value + 1 : value);
        finishTurn(
          marks,
          nextPenalties,
          lockedRows,
          {
            text: activeMarked ? "Computer sloeg actie 2 over." : "Computer streepte niets af en kreeg een strafvakje.",
            playerIndex: aiIndex,
            kind: activeMarked ? 'skip' : 'penalty'
          }
        );
        return;
      }

      const nextMarks = addQwixxMark(marks, aiIndex, bestOption.rowId, bestOption.value);
      const nextLockedRows = getQwixxNextLockedRows(
        lockedRows,
        bestOption.row,
        aiMarks[bestOption.rowId] || [],
        bestOption.value
      );
      const nextClosedBy = getQwixxNextClosedBy(closedBy, lockedRows, nextLockedRows, bestOption.rowId, aiIndex);
      finishTurn(
        nextMarks,
        penalties,
        nextLockedRows,
        {
          text: `Computer streepte ${bestOption.value} af in ${bestOption.row.name}.`,
          playerIndex: aiIndex,
          rowId: bestOption.rowId,
          value: bestOption.value,
          kind: 'mark'
        },
        nextClosedBy
      );
    }, rolled ? 850 : 650);

    return () => clearTimeout(timer);
  }, [isSolo, activeIndex, complete, rolled, phase, dice, round, taskState.qwixxMarks, taskState.qwixxWhiteDone, activeMarked, closedBy, actionLog]);

  const handleFinish = () => {
    const myTotal = getQwixxPlayerTotal(marks[myIndex] || marks[0], penalties[myIndex] || 0, closedBy, myIndex);
    const otherIndex = myIndex === 0 ? 1 : 0;
    const otherTotal = getQwixxPlayerTotal(marks[otherIndex] || {}, penalties[otherIndex] || 0, closedBy, otherIndex);
    const won = myTotal > otherTotal;
    const tie = myTotal === otherTotal;
    const points = won ? 2 : tie ? 1 : 0;
    const detail = won
      ? `Mike's Wazowski-Board gewonnen: ${myTotal}-${otherTotal}`
      : tie
        ? `Mike's Wazowski-Board gelijkspel: ${myTotal}-${otherTotal}`
        : `Mike's Wazowski-Board verloren: ${myTotal}-${otherTotal}`;
    onFinish(points, detail);
  };

  const totals = [
    getQwixxPlayerTotal(marks[0], penalties[0], closedBy, 0),
    getQwixxPlayerTotal(marks[1], penalties[1], closedBy, 1)
  ];
  const winnerText = totals[0] === totals[1]
    ? "Gelijkspel"
    : `${playerNames[totals[0] > totals[1] ? 0 : 1]} wint!`;
  const projectedStars = totals[0] === totals[1]
    ? [1, 1]
    : totals[0] > totals[1] ? [2, 0] : [0, 2];
  const opponentActions = actionLog.filter(action => action.playerIndex !== myIndex).slice(-2);
  const visibleRecentMarks = actionLog
    .filter(action => action.kind === 'mark' && action.playerIndex === viewedPlayerIndex)
    .slice(-2);

  useEffect(() => {
    onToolbarChange?.({
      gameId: 'qwixx',
      projectedStars,
      projectedCoins: projectedStars,
      totals
    });
  }, [onToolbarChange, projectedStars[0], projectedStars[1], totals[0], totals[1]]);

  return (
    <div className="qwixx-game" style={{ textAlign: 'center' }}>
      <div className="qwixx-scoreboard" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[0, 1].map(index => (
          <button
            key={index}
            type="button"
            className="qwixx-player-score"
            aria-pressed={viewedPlayerIndex === index}
            onClick={() => setViewedPlayerIndex(index)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: activeIndex === index && !complete ? '#10264c' : '#07152c',
              border: viewedPlayerIndex === index ? `2px solid ${playerColors[index]}` : '1px solid var(--line)',
              boxShadow: viewedPlayerIndex === index ? `0 0 0 2px ${playerColors[index]}33` : 'none',
              color: '#fff'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '13px', color: playerColors[index] }}>{playerNames[index]}</div>
            <div style={{ fontSize: '24px', fontWeight: 900 }}>{totals[index]}</div>
            <div style={{ fontSize: '11px', color: viewedPlayerIndex === index ? playerColors[index] : 'var(--muted)' }}>
              Straf: {penalties[index] || 0}/4 {viewedPlayerIndex === index ? '· in beeld' : ''}
            </div>
          </button>
        ))}
      </div>

      <div className="qwixx-status" style={{ margin: '8px 0 12px', minHeight: '22px', color: 'var(--muted)', fontSize: '13px' }}>
        {complete
          ? (
            <span>
              <strong style={{ color: 'var(--gold)' }}>{winnerText}</strong>
              {endReason && <span style={{ display: 'block', marginTop: '3px' }}>Einde spel: {endReason}</span>}
            </span>
          )
          : !rolled
            ? myTurn
              ? "Jouw beurt: gooi de dobbelstenen."
              : activeIndex === 1 && isSolo
                ? "Computer gooit de dobbelstenen..."
                : `Wachten op ${playerNames[activeIndex]}...`
            : phase === 'white'
              ? canChooseWhite
                ? `Actie 1: kies de witte som ${dice.white1 + dice.white2} of sla hem over.`
                : whiteDone[myIndex]
                  ? "Jouw keuze voor de witte som staat vast."
                  : "Wachten op de witte-somkeuze van de andere speler."
              : canChooseColor
                ? "Actie 2: kies wit + kleur, of sla deze actie over."
                : activeIndex === 1 && isSolo
                  ? "Computer speelt actie 2..."
                  : `Wachten op ${playerNames[activeIndex]}...`}
      </div>

      <div className="qwixx-action-log" aria-live="polite">
        <strong>Laatste acties tegenstander</strong>
        {opponentActions.length ? (
          <ol>
            {[...opponentActions].reverse().map(action => (
              <li key={action.id}>
                <span style={{ background: playerColors[action.playerIndex] || 'var(--gold)' }} />
                {action.text}
              </li>
            ))}
          </ol>
        ) : <p>Nog geen acties van de tegenstander.</p>}
      </div>

      <div className="qwixx-dice" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(2, 6 - lockedRows.length)}, 1fr)`, gap: '6px', margin: '0 auto 12px', maxWidth: '360px' }}>
        {[
          ["W1", dice?.white1, "#f8fbff", null],
          ["W2", dice?.white2, "#f8fbff", null],
          ["R", dice?.red, "#ff4d5d", "red"],
          ["G", dice?.green, "#32d583", "green"],
          ["B", dice?.blue, "#5bbcff", "blue"],
          ["Y", dice?.yellow, "#ffd45c", "yellow"]
        ].filter(([, , , rowId]) => !rowId || !lockedRows.includes(rowId)).map(([label, value, color]) => (
          <div
            key={label}
            className="qwixx-die"
            style={{
              aspectRatio: '1',
              borderRadius: '10px',
              background: color,
              color: label.startsWith("W") || label === "Y" ? '#07152c' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: 'inset 0 -8px 14px rgba(0,0,0,0.18)'
            }}
          >
            <strong style={{ fontSize: '20px' }}>{value || "?"}</strong>
            <span style={{ fontSize: '10px', fontWeight: 800 }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="qwixx-actions" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '12px' }}>
        {!rolled && (
          <button className="btn primary full" onClick={handleRoll} disabled={!myTurn || complete}>
            Gooi dobbelstenen
          </button>
        )}
        {canChooseWhite && (
          <button className="btn secondary full" onClick={() => updateWhiteChoice()}>
            Witte som overslaan
          </button>
        )}
        {canChooseColor && (
          <button className="btn secondary full" onClick={handleColorSkip}>
            {activeMarked ? 'Actie 2 overslaan' : 'Actie 2 overslaan (-5)'}
          </button>
        )}
      </div>

      <QwixxZoomBoard label={`Kaart van ${playerNames[viewedPlayerIndex]}`} color={playerColors[viewedPlayerIndex]}>
      <div className="qwixx-board" style={{ display: 'grid', gap: '8px' }}>
        {QWIXX_ROWS.map(row => {
          const rowMarks = visibleMarks[row.id] || [];
          const rowLocked = lockedRows.includes(row.id);
          const hasLockBonus = closedBy[row.id] === viewedPlayerIndex;
          const rowPoints = scoreQwixxMarks(rowMarks.length + (hasLockBonus ? 1 : 0));
          return (
            <div key={row.id} className={`qwixx-row${rowLocked ? ' is-closed' : ''}`} style={{ background: '#07152c', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px' }}>
              <div className="qwixx-row-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: row.color, fontSize: '13px' }}>{row.name}</strong>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  {rowMarks.length + (hasLockBonus ? 1 : 0)} kruisjes · {rowPoints} punten {rowLocked ? "· gesloten" : ""}
                </span>
              </div>
              <div className="qwixx-row-cells" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px' }}>
                {row.values.map(value => {
                  const marked = rowMarks.includes(value);
                  const playable = currentOptions.some(option => option.rowId === row.id && option.value === value);
                  const canMark = viewedPlayerIndex === myIndex && playable && (canChooseWhite || canChooseColor);
                  const recentIndex = [...visibleRecentMarks].reverse().findIndex(action => (
                    action.rowId === row.id && action.value === value
                  ));
                  const recentClass = recentIndex === 0 ? ' is-latest' : recentIndex === 1 ? ' is-previous' : '';
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`btn mini qwixx-cell${recentClass}`}
                      disabled={!canMark}
                      onClick={() => phase === 'white' ? updateWhiteChoice(row.id, value) : handleColorMark(row.id, value)}
                      style={{
                        minWidth: 0,
                        padding: '7px 0',
                        borderRadius: '8px',
                        background: marked ? row.color : canMark ? '#12345f' : '#061225',
                        border: canMark ? `1px solid ${row.color}` : '1px solid var(--line)',
                        color: marked ? (row.id === 'yellow' ? '#07152c' : '#fff') : '#fff',
                        opacity: marked ? 1 : canMark ? 1 : 0.58,
                        fontSize: '11px',
                        fontWeight: 900
                      }}
                    >
                      {marked ? "X" : value}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`btn mini qwixx-cell qwixx-lock${hasLockBonus ? ' is-locked' : ''}`}
                  disabled
                  aria-label={`${row.name} ${rowLocked ? 'gesloten' : 'open'}`}
                  title={rowLocked ? `Rij gesloten door ${playerNames[closedBy[row.id]] || 'een speler'}` : 'Sluitvak: wordt automatisch afgekruist met het laatste getal'}
                >
                  {hasLockBonus ? 'X' : '🔒'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </QwixxZoomBoard>

      {complete && (
        <button className="btn primary full" onClick={handleFinish} style={{ marginTop: '14px' }}>
          Score opslaan & terug
        </button>
      )}
    </div>
  );
}

const KEER_COLORS = [
  { id: "red", name: "Mickey Rood", color: "#ff4d5d" },
  { id: "yellow", name: "Belle Geel", color: "#ffd45c" },
  { id: "green", name: "Tiana Groen", color: "#32d583" },
  { id: "blue", name: "Elsa Blauw", color: "#5bbcff" },
  { id: "purple", name: "Rapunzel Paars", color: "#b16cff" }
];

const KEER_BOARD = [
  ["red", "yellow", "blue", "green", "purple", "red", "yellow"],
  ["green", "red", "yellow", "blue", "green", "purple", "red"],
  ["blue", "green", "red", "yellow", "blue", "green", "purple"],
  ["purple", "blue", "green", "red", "yellow", "blue", "green"],
  ["yellow", "purple", "blue", "green", "red", "yellow", "blue"],
  ["red", "yellow", "purple", "blue", "green", "red", "yellow"],
  ["green", "red", "yellow", "purple", "blue", "green", "red"]
];

const KEER_STARS = ["0-2", "1-5", "3-3", "4-0", "5-4", "6-1"];

function rollKeerDie(max) {
  return Math.floor(Math.random() * max) + 1;
}

function rollKeerDice() {
  return {
    colors: [
      KEER_COLORS[Math.floor(Math.random() * KEER_COLORS.length)].id,
      KEER_COLORS[Math.floor(Math.random() * KEER_COLORS.length)].id,
      KEER_COLORS[Math.floor(Math.random() * KEER_COLORS.length)].id
    ],
    numbers: [rollKeerDie(5), rollKeerDie(5), rollKeerDie(5)]
  };
}

function createKeerBoards() {
  return [[], []];
}

function getKeerColor(colorId) {
  return KEER_COLORS.find(color => color.id === colorId) || KEER_COLORS[0];
}

function getKeerCellKey(row, col) {
  return `${row}-${col}`;
}

function getKeerNeighbors(row, col) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ].filter(([r, c]) => r >= 0 && r < KEER_BOARD.length && c >= 0 && c < KEER_BOARD[0].length);
}

function isKeerSelectionConnected(cells) {
  if (cells.length <= 1) return true;
  const selected = new Set(cells);
  const visited = new Set([cells[0]]);
  const queue = [cells[0]];

  while (queue.length) {
    const key = queue.shift();
    const [row, col] = key.split("-").map(Number);
    getKeerNeighbors(row, col).forEach(([r, c]) => {
      const nextKey = getKeerCellKey(r, c);
      if (selected.has(nextKey) && !visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push(nextKey);
      }
    });
  }

  return visited.size === cells.length;
}

function touchesKeerMarkedArea(cells, boardMarks) {
  if (boardMarks.length === 0) return true;
  const marked = new Set(boardMarks);
  return cells.some(key => {
    const [row, col] = key.split("-").map(Number);
    return getKeerNeighbors(row, col).some(([r, c]) => marked.has(getKeerCellKey(r, c)));
  });
}

function getKeerFilledColumns(boardMarks = []) {
  const marked = new Set(boardMarks);
  let columns = 0;
  for (let col = 0; col < KEER_BOARD[0].length; col++) {
    let full = true;
    for (let row = 0; row < KEER_BOARD.length; row++) {
      if (!marked.has(getKeerCellKey(row, col))) {
        full = false;
        break;
      }
    }
    if (full) columns += 1;
  }
  return columns;
}

function getKeerFilledColors(boardMarks = []) {
  const marked = new Set(boardMarks);
  return KEER_COLORS.reduce((count, color) => {
    const allCells = [];
    KEER_BOARD.forEach((row, r) => row.forEach((cellColor, c) => {
      if (cellColor === color.id) allCells.push(getKeerCellKey(r, c));
    }));
    return count + (allCells.every(key => marked.has(key)) ? 1 : 0);
  }, 0);
}

function getKeerPlayerTotal(boardMarks = [], penalties = 0) {
  const marked = new Set(boardMarks);
  const markedPoints = boardMarks.length;
  const columnBonus = getKeerFilledColumns(boardMarks) * 5;
  const colorBonus = getKeerFilledColors(boardMarks) * 8;
  const openStarPenalty = KEER_STARS.filter(key => !marked.has(key)).length * 2;
  return markedPoints + columnBonus + colorBonus - openStarPenalty - penalties * 3;
}

function isKeerComplete(nextState) {
  const boards = nextState.keerBoards || [[], []];
  return (nextState.keerRound || 1) > 18
    || (nextState.keerPenalties || []).some(value => value >= 4)
    || boards.some(board => board.length >= KEER_BOARD.length * KEER_BOARD[0].length);
}

function chooseKeerAiMove(dice, boardMarks = []) {
  if (!dice) return null;
  const marked = new Set(boardMarks);
  const bestMoves = [];

  dice.colors.forEach(colorId => {
    dice.numbers.forEach(number => {
      const candidates = [];
      KEER_BOARD.forEach((row, r) => row.forEach((cellColor, c) => {
        const key = getKeerCellKey(r, c);
        if (cellColor === colorId && !marked.has(key)) {
          candidates.push(key);
        }
      }));

      candidates.forEach(startKey => {
        const selected = [startKey];
        const selectedSet = new Set(selected);
        let expanded = true;

        while (selected.length < number && expanded) {
          expanded = false;
          for (const key of [...selected]) {
            const [row, col] = key.split("-").map(Number);
            const neighbor = getKeerNeighbors(row, col)
              .map(([r, c]) => getKeerCellKey(r, c))
              .find(nextKey => {
                const [nr, nc] = nextKey.split("-").map(Number);
                return KEER_BOARD[nr][nc] === colorId && !marked.has(nextKey) && !selectedSet.has(nextKey);
              });
            if (neighbor) {
              selected.push(neighbor);
              selectedSet.add(neighbor);
              expanded = true;
              break;
            }
          }
        }

        if (touchesKeerMarkedArea(selected, boardMarks)) {
          bestMoves.push({ colorId, number, cells: selected });
        }
      });
    });
  });

  return bestMoves
    .sort((a, b) => {
      const starDiff = b.cells.filter(key => KEER_STARS.includes(key)).length - a.cells.filter(key => KEER_STARS.includes(key)).length;
      if (starDiff !== 0) return starDiff;
      return b.cells.length - a.cells.length;
    })[0] || null;
}

export function DisneyKeerOpKeerGame({ mode, room, localPlayer, players, updateRoomState, onFinish }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const taskState = room.current_task_state || {};
  const activeIndex = room.current_player_index || 0;
  const myIndex = Math.max(0, players.findIndex(p => p.id === localPlayer.id));
  const playerNames = [
    isSolo ? "Jij" : (players[0]?.name || "Speler 1"),
    isSolo ? "Computer" : (players[1]?.name || "Speler 2")
  ];

  const boards = Array.isArray(taskState.keerBoards) ? taskState.keerBoards : createKeerBoards();
  const penalties = Array.isArray(taskState.keerPenalties) ? taskState.keerPenalties : [0, 0];
  const dice = taskState.keerDice || null;
  const rolled = Boolean(taskState.keerRolled);
  const round = taskState.keerRound || 1;
  const selectedColor = taskState.keerSelectedColor || null;
  const selectedNumber = taskState.keerSelectedNumber || null;
  const pendingCells = taskState.keerPendingCells || [];
  const complete = Boolean(taskState.keerComplete);
  const myTurn = activeIndex === myIndex && !complete;
  const myBoard = boards[activeIndex] || [];
  const aiTurnRef = useRef("");

  useEffect(() => {
    if (!taskState.keerBoards) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          keerBoards: createKeerBoards(),
          keerPenalties: [0, 0],
          keerDice: null,
          keerRolled: false,
          keerRound: 1,
          keerSelectedColor: null,
          keerSelectedNumber: null,
          keerPendingCells: [],
          keerComplete: false,
          keerLastMove: null
        }
      });
    }
  }, []);

  const finishTurn = (nextBoards, nextPenalties, lastMove) => {
    const nextRound = activeIndex === 1 ? round + 1 : round;
    const nextState = {
      ...taskState,
      keerBoards: nextBoards,
      keerPenalties: nextPenalties,
      keerDice: null,
      keerRolled: false,
      keerRound: nextRound,
      keerSelectedColor: null,
      keerSelectedNumber: null,
      keerPendingCells: [],
      keerLastMove: lastMove
    };
    const nextComplete = isKeerComplete(nextState);

    updateRoomState(room.id, {
      current_player_index: nextComplete ? activeIndex : (activeIndex + 1) % 2,
      current_task_state: {
        ...nextState,
        keerComplete: nextComplete
      }
    });
  };

  const handleRoll = () => {
    if (!myTurn || rolled) return;
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        keerDice: rollKeerDice(),
        keerRolled: true,
        keerSelectedColor: null,
        keerSelectedNumber: null,
        keerPendingCells: [],
        keerLastMove: null
      }
    });
  };

  const chooseColor = (colorId) => {
    if (!myTurn || !rolled) return;
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        keerSelectedColor: colorId,
        keerPendingCells: []
      }
    });
  };

  const chooseNumber = (number) => {
    if (!myTurn || !rolled) return;
    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        keerSelectedNumber: number,
        keerPendingCells: []
      }
    });
  };

  const toggleCell = (row, col) => {
    if (!myTurn || !rolled || !selectedColor || !selectedNumber || complete) return;
    if (KEER_BOARD[row][col] !== selectedColor) return;
    const key = getKeerCellKey(row, col);
    if (myBoard.includes(key)) return;

    const nextPending = pendingCells.includes(key)
      ? pendingCells.filter(cell => cell !== key)
      : pendingCells.length < selectedNumber
        ? [...pendingCells, key]
        : pendingCells;

    updateRoomState(room.id, {
      current_task_state: {
        ...taskState,
        keerPendingCells: nextPending
      }
    });
  };

  const pendingIsValid = pendingCells.length > 0
    && pendingCells.length <= (selectedNumber || 0)
    && isKeerSelectionConnected(pendingCells)
    && touchesKeerMarkedArea(pendingCells, myBoard);

  const handleConfirm = () => {
    if (!myTurn || !pendingIsValid) return;
    const nextBoards = boards.map((board, index) => (
      index === activeIndex ? [...board, ...pendingCells] : board
    ));
    const colorName = getKeerColor(selectedColor).name;
    finishTurn(
      nextBoards,
      penalties,
      `${playerNames[activeIndex]} kleurde ${pendingCells.length} vakjes in ${colorName}.`
    );
  };

  const handlePass = () => {
    if (!myTurn || !rolled || complete) return;
    const nextPenalties = penalties.map((value, index) => index === activeIndex ? value + 1 : value);
    finishTurn(
      boards,
      nextPenalties,
      `${playerNames[activeIndex]} paste en kreeg een minpunt.`
    );
  };

  useEffect(() => {
    if (!isSolo || activeIndex !== 1 || complete || !taskState.keerBoards) return;

    const aiKey = `${round}-${rolled}-${JSON.stringify(dice)}-${JSON.stringify(boards[1])}-${penalties[1]}`;
    if (aiTurnRef.current === aiKey) return;
    aiTurnRef.current = aiKey;

    const timer = setTimeout(() => {
      if (!rolled) {
        updateRoomState(room.id, {
          current_task_state: {
            ...taskState,
            keerDice: rollKeerDice(),
            keerRolled: true,
            keerLastMove: "Computer rolt de dobbelstenen."
          }
        });
        return;
      }

      const move = chooseKeerAiMove(dice, boards[1] || []);
      if (!move) {
        const nextPenalties = penalties.map((value, index) => index === 1 ? value + 1 : value);
        finishTurn(boards, nextPenalties, "Computer paste en kreeg een minpunt.");
        return;
      }

      const nextBoards = boards.map((board, index) => (
        index === 1 ? [...board, ...move.cells] : board
      ));
      finishTurn(
        nextBoards,
        penalties,
        `Computer kleurde ${move.cells.length} vakjes in ${getKeerColor(move.colorId).name}.`
      );
    }, rolled ? 900 : 650);

    return () => clearTimeout(timer);
  }, [isSolo, activeIndex, complete, rolled, dice, round, taskState.keerBoards]);

  const handleFinish = () => {
    const myTotal = getKeerPlayerTotal(boards[myIndex] || boards[0], penalties[myIndex] || 0);
    const otherIndex = myIndex === 0 ? 1 : 0;
    const otherTotal = getKeerPlayerTotal(boards[otherIndex] || [], penalties[otherIndex] || 0);
    const won = myTotal > otherTotal;
    const tie = myTotal === otherTotal;
    const points = won ? 3 : tie ? 2 : 1;
    const detail = won
      ? `Disney Keer op Keer gewonnen: ${myTotal}-${otherTotal}`
      : tie
        ? `Disney Keer op Keer gelijkspel: ${myTotal}-${otherTotal}`
        : `Disney Keer op Keer verloren: ${myTotal}-${otherTotal}`;
    onFinish(points, detail);
  };

  const totals = [
    getKeerPlayerTotal(boards[0], penalties[0]),
    getKeerPlayerTotal(boards[1], penalties[1])
  ];
  const winnerText = totals[0] === totals[1]
    ? "Gelijkspel"
    : `${playerNames[totals[0] > totals[1] ? 0 : 1]} wint!`;
  const visibleBoard = boards[myIndex] || boards[0] || [];
  const visibleMarked = new Set(visibleBoard);
  const pendingSet = new Set(pendingCells);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[0, 1].map(index => (
          <div
            key={index}
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: activeIndex === index && !complete ? '#10264c' : '#07152c',
              border: activeIndex === index && !complete ? '2px solid var(--gold)' : '1px solid var(--line)'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '13px', color: index === 0 ? '#5bbcff' : '#ff5b5b' }}>{playerNames[index]}</div>
            <div style={{ fontSize: '24px', fontWeight: 900 }}>{totals[index]}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Ronde {round}/18 · Straf {penalties[index] || 0}/4</div>
          </div>
        ))}
      </div>

      <div style={{ margin: '8px 0 12px', minHeight: '22px', color: 'var(--muted)', fontSize: '13px' }}>
        {complete
          ? <strong style={{ color: 'var(--gold)' }}>{winnerText}</strong>
          : activeIndex === 1 && isSolo
            ? "Computer puzzelt..."
            : myTurn
              ? rolled ? "Kies kleur + aantal en tik vakjes op je bord." : "Jouw beurt: rol de dobbelstenen."
              : `Wachten op ${playerNames[activeIndex]}...`}
        {taskState.keerLastMove && (
          <div style={{ marginTop: '4px' }}>{taskState.keerLastMove}</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: '#07152c', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px' }}>
          <strong style={{ fontSize: '12px' }}>Kleur</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
            {(dice?.colors || [null, null, null]).map((colorId, index) => {
              const color = colorId ? getKeerColor(colorId) : null;
              return (
                <button
                  key={index}
                  type="button"
                  className="btn mini"
                  disabled={!myTurn || !rolled || !colorId || complete}
                  onClick={() => chooseColor(colorId)}
                  style={{
                    padding: '8px 2px',
                    background: color?.color || '#061225',
                    color: colorId === 'yellow' ? '#07152c' : '#fff',
                    border: selectedColor === colorId ? '2px solid var(--gold)' : '1px solid var(--line)',
                    fontSize: '10px'
                  }}
                >
                  {color ? color.name.split(" ")[1] : "?"}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background: '#07152c', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px' }}>
          <strong style={{ fontSize: '12px' }}>Aantal</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
            {(dice?.numbers || [null, null, null]).map((number, index) => (
              <button
                key={index}
                type="button"
                className={`btn mini ${selectedNumber === number ? 'primary' : 'secondary'}`}
                disabled={!myTurn || !rolled || !number || complete}
                onClick={() => chooseNumber(number)}
                style={{ padding: '8px 2px', fontSize: '13px', fontWeight: 900 }}
              >
                {number || "?"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: rolled ? '1fr 1fr 1fr' : '1fr', gap: '8px', marginBottom: '12px' }}>
        <button className="btn primary full" onClick={handleRoll} disabled={!myTurn || rolled || complete}>
          Rol dobbelstenen
        </button>
        {rolled && (
          <>
            <button className="btn primary full" onClick={handleConfirm} disabled={!pendingIsValid}>
              Kleur in ({pendingCells.length})
            </button>
            <button className="btn secondary full" onClick={handlePass} disabled={!myTurn || complete}>
              Pas (-3)
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', maxWidth: '360px', margin: '0 auto' }}>
        {KEER_BOARD.map((row, r) => row.map((colorId, c) => {
          const key = getKeerCellKey(r, c);
          const color = getKeerColor(colorId);
          const marked = visibleMarked.has(key);
          const pending = pendingSet.has(key);
          const star = KEER_STARS.includes(key);
          const selectable = myTurn && rolled && selectedColor === colorId && selectedNumber && !marked && !complete;

          return (
            <button
              key={key}
              type="button"
              className="btn mini"
              disabled={!selectable}
              onClick={() => toggleCell(r, c)}
              style={{
                minWidth: 0,
                aspectRatio: '1',
                padding: 0,
                borderRadius: '8px',
                background: marked || pending ? color.color : '#061225',
                border: pending ? '2px solid var(--gold)' : `1px solid ${color.color}`,
                color: marked || pending ? (colorId === 'yellow' ? '#07152c' : '#fff') : color.color,
                opacity: selectable || marked || pending ? 1 : 0.52,
                fontSize: '13px',
                fontWeight: 900
              }}
            >
              {marked || pending ? "X" : star ? "*" : ""}
            </button>
          );
        }))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '12px auto 0', maxWidth: '360px', color: 'var(--muted)', fontSize: '11px' }}>
        <span>Kolommen: {getKeerFilledColumns(visibleBoard)} x 5</span>
        <span>Kleuren: {getKeerFilledColors(visibleBoard)} x 8</span>
        <span>Sterren open: {KEER_STARS.filter(key => !visibleMarked.has(key)).length}</span>
      </div>

      {complete && (
        <button className="btn primary full" onClick={handleFinish} style={{ marginTop: '14px' }}>
          Score opslaan & terug
        </button>
      )}
    </div>
  );
}

const ULTIMATE_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const createUltimateTicTacToeState = () => ({
  cells: Array.from({ length: 9 }, () => Array(9).fill(null)),
  boardOwners: Array(9).fill(null),
  forcedBoard: null,
  turn: 0,
  winner: null,
  moveCount: 0,
  lastMove: null
});

const getUltimateWinner = (values) => {
  for (const [a, b, c] of ULTIMATE_LINES) {
    if (values[a] !== null && values[a] === values[b] && values[a] === values[c]) return values[a];
  }
  return null;
};

const isUltimateBoardClosed = (cells, boardOwners, boardIndex) => (
  boardOwners[boardIndex] !== null || cells[boardIndex].every(cell => cell !== null)
);

const getUltimateLegalMoves = (state) => {
  const allowedBoards = state.forcedBoard !== null && !isUltimateBoardClosed(state.cells, state.boardOwners, state.forcedBoard)
    ? [state.forcedBoard]
    : Array.from({ length: 9 }, (_, index) => index).filter(index => !isUltimateBoardClosed(state.cells, state.boardOwners, index));

  return allowedBoards.flatMap(boardIndex => (
    state.cells[boardIndex]
      .map((value, cellIndex) => value === null ? { boardIndex, cellIndex } : null)
      .filter(Boolean)
  ));
};

const makeUltimateMove = (state, boardIndex, cellIndex, playerIndex) => {
  const cells = state.cells.map(board => [...board]);
  const boardOwners = [...state.boardOwners];
  cells[boardIndex][cellIndex] = playerIndex;

  const smallBoardWinner = getUltimateWinner(cells[boardIndex]);
  if (smallBoardWinner !== null) boardOwners[boardIndex] = smallBoardWinner;

  const macroWinner = getUltimateWinner(boardOwners);
  const isDraw = macroWinner === null && getUltimateLegalMoves({
    cells,
    boardOwners,
    forcedBoard: null
  }).length === 0;
  const nextForcedBoard = isUltimateBoardClosed(cells, boardOwners, cellIndex) ? null : cellIndex;

  return {
    ...state,
    cells,
    boardOwners,
    forcedBoard: macroWinner !== null || isDraw ? null : nextForcedBoard,
    turn: macroWinner !== null || isDraw ? playerIndex : (playerIndex + 1) % 2,
    winner: macroWinner !== null ? macroWinner : isDraw ? 'draw' : null,
    moveCount: (state.moveCount || 0) + 1,
    lastMove: { boardIndex, cellIndex, playerIndex }
  };
};

const evaluateUltimateLine = (values, aiPlayer = 1) => {
  const opponent = aiPlayer === 1 ? 0 : 1;
  let score = 0;
  ULTIMATE_LINES.forEach(line => {
    const lineValues = line.map(index => values[index]);
    const aiCount = lineValues.filter(value => value === aiPlayer).length;
    const opponentCount = lineValues.filter(value => value === opponent).length;
    if (opponentCount === 0) score += aiCount === 2 ? 12 : aiCount === 1 ? 2 : 0;
    if (aiCount === 0) score -= opponentCount === 2 ? 15 : opponentCount === 1 ? 2 : 0;
  });
  return score;
};

const evaluateUltimateState = (state, aiPlayer = 1) => {
  if (state.winner === aiPlayer) return 100000;
  if (state.winner !== null && state.winner !== 'draw') return -100000;
  let score = evaluateUltimateLine(state.boardOwners, aiPlayer) * 40;
  state.boardOwners.forEach((owner, boardIndex) => {
    if (owner === aiPlayer) score += 420;
    else if (owner !== null) score -= 460;
    else score += evaluateUltimateLine(state.cells[boardIndex], aiPlayer) * 2.5;
  });
  if (state.forcedBoard !== null && state.boardOwners[state.forcedBoard] === null) {
    score += evaluateUltimateLine(state.cells[state.forcedBoard], aiPlayer) * (state.turn === aiPlayer ? 1.5 : -1.5);
  }
  return score;
};

const chooseUltimateAiMove = (state, level) => {
  const legalMoves = getUltimateLegalMoves(state);
  if (legalMoves.length === 0) return null;
  if (level === 'easy') return legalMoves[Math.floor(Math.random() * legalMoves.length)];

  if (level !== 'easy') {
    const winningMove = legalMoves.find(move => {
      const next = makeUltimateMove(state, move.boardIndex, move.cellIndex, 1);
      return next.winner === 1 || next.boardOwners[move.boardIndex] === 1;
    });
    if (winningMove) return winningMove;

    const blockingMove = legalMoves.find(move => {
      const simulated = makeUltimateMove({ ...state, turn: 0 }, move.boardIndex, move.cellIndex, 0);
      return simulated.winner === 0 || simulated.boardOwners[move.boardIndex] === 0;
    });
    if (blockingMove) return blockingMove;
  }
  if (level === 'hard') {
    return legalMoves
      .map(move => {
        const next = makeUltimateMove(state, move.boardIndex, move.cellIndex, 1);
        const replies = getUltimateLegalMoves(next);
        const worstReply = replies.length
          ? Math.min(...replies.map(reply => evaluateUltimateState(makeUltimateMove(next, reply.boardIndex, reply.cellIndex, 0), 1)))
          : evaluateUltimateState(next, 1);
        const positionalBonus = (move.cellIndex === 4 ? 5 : [0, 2, 6, 8].includes(move.cellIndex) ? 2 : 0)
          + (move.boardIndex === 4 ? 3 : 0);
        return { ...move, score: worstReply + positionalBonus };
      })
      .sort((a, b) => b.score - a.score)[0];
  }
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
};

function UltimateTicTacToeGame({ mode, room, localPlayer, players, updateRoomState, onFinish, onToolbarChange }) {
  const isSolo = mode === 'solo' || room.id === 'solo';
  const taskState = room.current_task_state || {};
  const state = taskState.ultimateTicTacToe;
  const aiLevel = taskState.aiLevel || 'normal';
  const myIndex = Math.max(0, players.findIndex(player => player.id === localPlayer?.id));
  const playerNames = [
    isSolo ? 'Jij' : (players[0]?.name || 'Speler 1'),
    isSolo ? 'Computer' : (players[1]?.name || 'Speler 2')
  ];
  const playerMarks = ['X', 'O'];
  const playerColors = ['#65bfff', '#ff6b74'];
  const aiMoveRef = useRef('');

  useEffect(() => {
    if (!taskState.ultimateTicTacToe) {
      updateRoomState(room.id, {
        current_player_index: 0,
        current_task_state: {
          ...taskState,
          ultimateTicTacToe: createUltimateTicTacToeState()
        }
      });
    }
  }, []);

  const commitMove = (boardIndex, cellIndex, playerIndex) => {
    if (!state || state.winner !== null) return;
    const legalMove = getUltimateLegalMoves(state).some(move => (
      move.boardIndex === boardIndex && move.cellIndex === cellIndex
    ));
    if (!legalMove) return;

    const nextState = makeUltimateMove(state, boardIndex, cellIndex, playerIndex);
    updateRoomState(room.id, {
      current_player_index: nextState.turn,
      current_task_state: {
        ...taskState,
        ultimateTicTacToe: nextState
      }
    });
  };

  useEffect(() => {
    if (!isSolo || !state || state.winner !== null || state.turn !== 1) return;
    const turnToken = `${room.id}-${state.moveCount}`;
    if (aiMoveRef.current === turnToken) return;
    aiMoveRef.current = turnToken;
    const timer = window.setTimeout(() => {
      const move = chooseUltimateAiMove(state, aiLevel);
      if (move) commitMove(move.boardIndex, move.cellIndex, 1);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isSolo, state?.moveCount, state?.turn, state?.winner, aiLevel]);

  const myTurn = Boolean(state) && state.turn === myIndex && state.winner === null;
  const activeName = state ? playerNames[state.turn] : '';
  const turnText = !state ? '' : state.winner !== null
    ? state.winner === 'draw' ? 'Gelijkspel' : `${playerNames[state.winner]} wint`
    : myTurn ? 'Jouw beurt' : `Aan zet: ${activeName}`;
  const boardMessage = !state ? '' : state.winner !== null
    ? state.winner === 'draw' ? 'Het grote bord is vol: gelijkspel.' : `${playerNames[state.winner]} verovert het grote bord!`
    : state.forcedBoard === null ? 'Vrije bordkeuze' : `Speel op klein bord ${state.forcedBoard + 1}`;
  const boardScores = state
    ? [
        state.boardOwners.filter(owner => owner === 0).length,
        state.boardOwners.filter(owner => owner === 1).length
      ]
    : [0, 0];

  const handleFinish = () => {
    const draw = state.winner === 'draw';
    const won = state.winner === myIndex;
    const points = draw ? 2 : won ? 3 : 1;
    const detail = draw
      ? "Tic Tac Tinker Bell gelijkspel"
      : won
        ? "Tic Tac Tinker Bell gewonnen!"
        : "Tic Tac Tinker Bell verloren";
    onFinish(points, detail);
  };

  useEffect(() => {
    if (!onToolbarChange || !state) return undefined;
    onToolbarChange({
      gameId: 'tictactinker',
      playerNames,
      playerColors,
      boardScores,
      myTurn,
      turnText,
      boardMessage,
      finished: state.winner !== null,
      finishGame: handleFinish
    });
    return () => onToolbarChange(null);
  }, [onToolbarChange, playerNames[0], playerNames[1], boardScores[0], boardScores[1], myTurn, turnText, boardMessage, state?.winner]);

  if (!state) {
    return <div className="center" style={{ padding: '28px', color: 'var(--muted)' }}>Magisch bord wordt klaargezet...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', width: '100%', height: '100%', padding: '7px', background: '#041026', borderRadius: '16px' }}>
        {state.cells.map((board, boardIndex) => {
          const owner = state.boardOwners[boardIndex];
          const forced = state.forcedBoard === boardIndex && owner === null;
          const availableBoard = state.forcedBoard === null || forced;
          return (
            <div
              key={boardIndex}
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '2px',
                aspectRatio: '1',
                padding: '3px',
                background: '#07152c',
                border: `3px solid ${forced ? '#a7ffe7' : '#65d9bd'}`,
                borderRadius: '8px',
                boxShadow: forced ? '0 0 14px rgba(101, 217, 189, 0.6)' : 'none',
                opacity: owner !== null ? 0.72 : availableBoard ? 1 : 0.45
              }}
            >
              {board.map((mark, cellIndex) => {
                const canPlay = myTurn && owner === null && availableBoard && mark === null;
                return (
                  <button
                    key={cellIndex}
                    type="button"
                    disabled={!canPlay}
                    onClick={() => commitMove(boardIndex, cellIndex, myIndex)}
                    aria-label={`Klein bord ${boardIndex + 1}, vak ${cellIndex + 1}`}
                    style={{
                      minWidth: 0,
                      padding: 0,
                      border: '1px solid #23466f',
                      borderRadius: '4px',
                      background: '#0a1c38',
                      color: mark === null ? 'transparent' : playerColors[mark],
                      fontSize: 'clamp(14px, 4vw, 23px)',
                      fontWeight: 950,
                      lineHeight: 1,
                      cursor: canPlay ? 'pointer' : 'default'
                    }}
                  >
                    {mark === null ? '-' : playerMarks[mark]}
                  </button>
                );
              })}
              {owner !== null && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: playerColors[owner], fontSize: 'clamp(34px, 10vw, 64px)', fontWeight: 950, textShadow: '0 2px 12px #000' }}>
                  {playerMarks[owner]}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

const MINI_GAME_RULES = {
  othello: {
    title: "Ursula's Spiegelstrijd",
    intro: "Origineel: Othello / Reversi. Leg fiches op het bord en sluit fiches van de tegenstander in.",
    rules: [
      "Blauw begint.",
      "Je mag alleen plaatsen op een vakje waarmee je minstens een fiche van de tegenstander insluit.",
      "Alle ingesloten fiches tussen jouw nieuwe fiche en een bestaande fiche van jou draaien om naar jouw kleur.",
      "Kun je geen geldige zet doen, dan gaat de beurt naar de tegenstander.",
      "Als niemand meer kan zetten, wint de speler met de meeste fiches."
    ],
    solo: "Solo: jij speelt blauw tegen de computer.",
    duel: "Duel: speler 1 is blauw, speler 2 is rood. Beurten worden realtime gesynchroniseerd."
  },
  dotsboxes: {
    title: "Rapunzel's Torenkamers",
    intro: "Origineel: Dots & Boxes. Trek lijnen tussen punten en probeer de meeste vakjes te claimen.",
    rules: [
      "Tik op een stippellijn om die lijn te trekken.",
      "Maak je de vierde zijde van een vakje af, dan claim je dat vakje.",
      "Claim je een vakje, dan mag je nog een keer.",
      "Maak je geen vakje af, dan gaat de beurt naar de volgende speler.",
      "Als alle vakjes gevuld zijn, wint de speler met de meeste vakjes."
    ],
    solo: "Solo: jij speelt tegen de computer.",
    duel: "Duel: elke getrokken lijn en elk geclaimd vakje verschijnt realtime bij de ander."
  },
  colorlines: {
    title: "Inside Out Kleurenchaos",
    intro: "Origineel: Color Lines. Maak lijnen van vijf dezelfde bollen voordat het bord volloopt.",
    rules: [
      "Tik eerst een bol aan en tik daarna op een leeg vakje om hem te verplaatsen.",
      "Een bol kan alleen bewegen als er een vrij pad naar het doelvakje is.",
      "Maak horizontaal, verticaal of diagonaal een rij van vijf of meer gelijke bollen.",
      "Na een zet zonder lijn verschijnen er nieuwe bollen.",
      "Het spel eindigt wanneer er te weinig vrije plekken over zijn."
    ],
    solo: "Color Lines is een solo-puzzel. Je score wordt opgeslagen wanneer je klaar bent."
  },
  ricochet: {
    title: "Ricochet Shot",
    intro: "Schiet de bal via muren door het doolhof en verzamel sterren.",
    rules: [
      "Sleep de bal naar achteren om richting en kracht te bepalen.",
      "Laat los om te schieten.",
      "De bal stuitert tegen muren en obstakels.",
      "Elke geraakte ster telt mee voor je score.",
      "In duel krijgt elke speler een schot; de meeste sterren wint."
    ],
    solo: "Solo: je hebt meerdere schoten om zoveel mogelijk sterren te pakken.",
    duel: "Duel: jouw schot en score worden realtime gedeeld met de tegenstander."
  },
  curling: {
    title: "Curling Duel",
    intro: "Schuif stenen over het ijs en eindig zo dicht mogelijk bij het midden.",
    rules: [
      "Sleep de zichtbare puck onderin naar achteren om richting en kracht te bepalen.",
      "Laat los om een steen te schuiven.",
      "Stenen kunnen botsen en elkaar verplaatsen.",
      "Spelers schieten om de beurt.",
      "Na alle stenen wint de speler met de steen het dichtst bij de stip."
    ],
    solo: "Solo: jij speelt tegen de computer.",
    duel: "Duel: alle steenposities en botsingen worden realtime gesynchroniseerd."
  },
  abalone: {
    title: "Louisa's Power Push",
    intro: "Origineel: Marble Push / Abalone. Verplaats bollen op het hex-bord en duw bollen van de tegenstander eruit.",
    rules: [
      "Tik op een eigen bol om die te selecteren.",
      "Tik daarna op een aangrenzend vakje om te bewegen.",
      "Staat daar een tegenstander, dan probeer je die in dezelfde richting te duwen.",
      "Je kunt alleen duwen als het vakje achter de tegenstander vrij is of buiten het bord ligt.",
      "Duw zes bollen van de tegenstander van het bord om te winnen."
    ],
    solo: "Solo: jij speelt blauw tegen de computer.",
    duel: "Duel: elke verplaatsing en duw wordt realtime gedeeld met de tegenstander."
  },
  piratesplank: {
    title: "Black Pearl's Plank",
    intro: "Origineel: Galgje/Wheel of Fortune. Kraak een Disney-code voordat The Black Pearl je bereikt.",
    rules: [
      "Kies Rustig, Normaal of Uitdagend. Het niveau bepaalt woordlengte, startletters, hints, kosten en strikes.",
      "Je ziet altijd de taal en het aantal woorden en letters. Rustig toont ook een hint; Normaal toont de categorie.",
      "Gooi eerst twee dobbelstenen: een witte buit-dobbelsteen en een rode gebeurtenis-dobbelsteen.",
      "Bij vijf van de zes gebeurtenissen mag je een medeklinker kiezen. Een juiste letter levert buit op; een foute letter geeft een strike.",
      "Een vloek kost eerst buit en geeft alleen bij te weinig buit een strike. Na meerdere missers helpt de bemanning met een letter.",
      "Klinkers kosten 3, 4 of 5 buit en je hebt 5, 4 of 3 strikes, afhankelijk van het gekozen niveau.",
      "De Black Pearl komt dichterbij door strikes én door verstreken beurten."
    ],
    solo: "Solo: verzamel buit, koop slim klinkers en los de code zo strak mogelijk op.",
    duel: "Duel: spelers spelen om de beurt. Degene die de volledige oplossing kraakt wint."
  },
  yahtzee: {
    title: "Goofy's Geluksworp",
    intro: "Origineel: Yahtzee. Gooi vijf dobbelstenen en vul slim je scorekaart.",
    rules: [
      "Je mag per beurt maximaal drie keer gooien.",
      "Na je eerste worp kun je dobbelstenen vasthouden door erop te tikken.",
      "Na elke worp mag je een vrije scorecategorie kiezen.",
      "Elke categorie kan maar een keer gebruikt worden, ook als je daar nul punten scoort.",
      "Als alle categorieen gevuld zijn, wint de speler met de meeste punten."
    ],
    solo: "Solo: jij speelt tegen de computer. De computer vult automatisch een categorie na zijn worp.",
    duel: "Duel: spelers gooien om de beurt en vullen samen realtime de scorekaart."
  },
  qwixx: {
    title: "Mike's Wazowski-Board",
    intro: "Origineel: Qwixx. Streep getallen af in gekleurde Disney-rijen en pak zoveel mogelijk punten.",
    rules: [
      "Gooi twee witte en vier gekleurde dobbelstenen.",
      "Actie 1: alle spelers mogen precies een vakje met de som van de twee witte dobbelstenen afstrepen, of overslaan.",
      "Actie 2: alleen de actieve speler mag een witte en een gekleurde dobbelsteen combineren en nog een vakje afstrepen.",
      "Je mag alleen getallen afstrepen die verder naar rechts staan dan je eerdere kruisjes in die rij.",
      "De rode en gele rij lopen van 2 naar 12; de groene en blauwe rij lopen van 12 naar 2.",
      "Sluit een kleur alleen met het laatste getal wanneer je daarvoor al minstens vijf kruisjes in die rij hebt.",
      "Een gesloten kleurrij sluit direct voor iedereen; de bijbehorende gekleurde dobbelsteen gaat uit het spel.",
      "Alleen de actieve speler krijgt een strafvakje van min vijf als die in beide acties niets afstreept.",
      "Het spel eindigt direct bij twee gesloten kleuren of vier strafvakjes; elke rij met n kruisjes is n x (n + 1) / 2 punten waard."
    ],
    solo: "Solo: jij en de computer kiezen allebei bij de witte som; alleen de actieve speler krijgt daarna de kleuractie.",
    duel: "Duel: beide scorebladen worden realtime bijgewerkt. Bij de witte som kiest ieder op het eigen scherm."
  },
  tictactinker: {
    title: "Tic Tac Tinker Bell",
    intro: "Origineel: Ultimate Tic Tac Toe. Verover kleine 3x3-borden om drie grote vakken op rij te claimen.",
    rules: [
      "De eerste speler mag op elk klein bord beginnen.",
      "Het vakje dat je kiest, bepaalt op welk kleine bord je tegenstander daarna moet spelen.",
      "Is dat kleine bord al gewonnen of vol, dan mag je tegenstander vrij kiezen.",
      "Drie X'en of O's op rij winnen een klein bord.",
      "Wie drie kleine borden op rij verovert, wint het grote bord."
    ],
    solo: "Solo: jij speelt X tegen de computer. Het gekozen vakje stuurt de computer naar zijn volgende kleine bord.",
    duel: "Duel: X begint. Elke zet en de verplichte volgende bordkeuze worden realtime gedeeld."
  },
  keeropkeer: {
    title: "Disney Keer op Keer",
    intro: "Rol kleur en aantal, kleur vakjes op je bord en maak slimme bonuslijnen.",
    rules: [
      "Rol drie kleur- en drie getaldobbelstenen.",
      "Kies een kleur en een aantal uit de worp.",
      "Tik vakjes van die kleur aan; je selectie moet aan elkaar grenzen.",
      "Nieuwe vakjes moeten aansluiten op je bestaande gekleurde gebied, behalve bij je eerste zet.",
      "Volle kolommen en volle kleuren leveren bonuspunten op. Open sterren kosten minpunten."
    ],
    solo: "Solo: jij speelt tegen de computer. De computer kiest automatisch een kleur/aantal-combinatie.",
    duel: "Duel: spelers kleuren om de beurt hun eigen bord. De score wordt realtime gedeeld."
  }
};

export function MiniGameRulesButton({ gameId, mode, compact = false }) {
  const [open, setOpen] = useState(false);
  const rules = MINI_GAME_RULES[gameId];

  if (!rules) return null;

  const modeText = mode === 'duel' ? rules.duel : rules.solo;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: compact ? 0 : '0 0 10px' }}>
      <button
        type="button"
        className="btn ghost mini"
        onClick={() => setOpen(true)}
        aria-label={`Spelregels voor ${rules.title}`}
        title={`Spelregels voor ${rules.title}`}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          padding: 0,
          fontFamily: 'Outfit, Inter, sans-serif',
          fontWeight: 800,
          fontSize: '16px',
          lineHeight: '1'
        }}
      >
        i
      </button>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(2, 8, 20, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mini-game-rules-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              maxHeight: '82vh',
              overflowY: 'auto',
              background: '#07152c',
              border: '1px solid var(--line)',
              borderRadius: '14px',
              boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
              padding: '18px',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <div>
                <h2 id="mini-game-rules-title" style={{ margin: 0, fontSize: '20px', color: 'var(--gold)' }}>
                  {rules.title}
                </h2>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.45 }}>
                  {rules.intro}
                </p>
              </div>
              <button
                type="button"
                className="btn ghost mini"
                onClick={() => setOpen(false)}
                aria-label="Sluit spelregels"
                title="Sluiten"
                style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, flex: '0 0 auto' }}
              >
                x
              </button>
            </div>

            <ol style={{ margin: '14px 0', paddingLeft: '20px', display: 'grid', gap: '8px', fontSize: '14px', lineHeight: 1.45 }}>
              {rules.rules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ol>

            {modeText && (
              <div style={{ marginTop: '14px', padding: '10px 12px', background: '#0b2145', border: '1px solid var(--line)', borderRadius: '10px', fontSize: '13px', lineHeight: 1.45 }}>
                {modeText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// MAIN WRAPPER RENDERER
// ----------------------------------------------------
export function MiniGameRenderer({ gameId, mode, room, localPlayer, players, updateRoomState, onFinish, showRules = true, onToolbarChange }) {
  const safeUpdateRoomState = updateRoomState || (async () => {});
  let gameView;

  switch (gameId) {
    case 'othello':
      gameView = (
        <OthelloGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
        players={players}
        updateRoomState={safeUpdateRoomState}
        onFinish={onFinish}
        />
      );
      break;
    case 'dotsboxes':
      gameView = (
        <DotsBoxesGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
      break;
    case 'colorlines':
      gameView = (
        <ColorLinesGame
          onFinish={(score, detail) => onFinish(score, detail)}
        />
      );
      break;
    case 'abalone':
      gameView = (
        <AbaloneGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
      break;
    case 'piratesplank':
      gameView = (
        <PiratesPlankGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
      break;
    case 'yahtzee':
      gameView = (
        <DisneyYahtzeeGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
        />
      );
      break;
    case 'qwixx':
      gameView = (
        <DisneyQwixxGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
          onToolbarChange={onToolbarChange}
        />
      );
      break;
    case 'tictactinker':
      gameView = (
        <UltimateTicTacToeGame
          mode={mode}
          room={room}
          localPlayer={localPlayer}
          players={players}
          updateRoomState={safeUpdateRoomState}
          onFinish={onFinish}
          onToolbarChange={onToolbarChange}
        />
      );
      break;
    default:
      return <div className="center">Onbekend spel.</div>;
  }

  return (
    <div style={gameId === 'tictactinker' ? { width: '100%', height: '100%' } : undefined}>
      {showRules && <MiniGameRulesButton gameId={gameId} mode={mode} />}
      {gameView}
    </div>
  );
}
