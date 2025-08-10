// logic.js — Full logic reloaded with Adaptive AI

let winLossStats = { redWins: 0, blackWins: 0 };

function initialBoard() {
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));

  const redBackRow = ["r", "n", "b", "a", "k", "a", "b", "n", "r"].map(t => ({ t, c: "red" }));
  const blackBackRow = ["r", "n", "b", "a", "k", "a", "b", "n", "r"].map(t => ({ t, c: "black" }));

  board[0] = blackBackRow;
  board[2][1] = board[2][7] = { t: "c", c: "black" };
  [0, 2, 4, 6, 8].forEach(c => board[3][c] = { t: "s", c: "black" });

  board[9] = redBackRow;
  board[7][1] = board[7][7] = { t: "c", c: "red" };
  [0, 2, 4, 6, 8].forEach(c => board[6][c] = { t: "s", c: "red" });

  return board;
}

function applyMove(board, from, to) {
  const newBoard = board.map(row => row.slice());
  newBoard[to[0]][to[1]] = newBoard[from[0]][from[1]];
  newBoard[from[0]][from[1]] = null;
  return newBoard;
}

function inBounds(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 9;
}

function clearPath(board, r1, r2, c) {
  const min = Math.min(r1, r2);
  const max = Math.max(r1, r2);
  for (let i = min + 1; i < max; i++) {
    if (board[i][c]) return false;
  }
  return true;
}

function getLegalMovesFiltered(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const { t, c: color } = piece;
  const enemy = color === "red" ? "black" : "red";
  const moves = [];

  switch (t) {
    case "k": {
      const range = color === "red" ? [7, 9] : [0, 2];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= range[0] && nr <= range[1] && nc >= 3 && nc <= 5) {
          const target = board[nr][nc];
          if (!target || target.c === enemy) moves.push([nr, nc]);
        }
      });
      // flying general (face-to-face)
      for (let i = r + 1; i < 10; i++) {
        const p = board[i][c];
        if (p) {
          if (p.t === "k" && p.c !== color && clearPath(board, r, i, c)) moves.push([i, c]);
          break;
        }
      }
      for (let i = r - 1; i >= 0; i--) {
        const p = board[i][c];
        if (p) {
          if (p.t === "k" && p.c !== color && clearPath(board, i, r, c)) moves.push([i, c]);
          break;
        }
      }
      break;
    }
    case "a": {
      const range = color === "red" ? [7, 9] : [0, 2];
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= range[0] && nr <= range[1] && nc >= 3 && nc <= 5) {
          const target = board[nr][nc];
          if (!target || target.c === enemy) moves.push([nr, nc]);
        }
      });
      break;
    }
    case "b": {
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
        const mr = r + dr / 2, mc = c + dc / 2;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[mr][mc] == null) {
          if ((color === "red" && nr >= 5) || (color === "black" && nr <= 4)) {
            const target = board[nr][nc];
            if (!target || target.c === enemy) moves.push([nr, nc]);
          }
        }
      });
      break;
    }
    case "n": {
      const knightMoves = [
        [-2, -1, -1, 0], [-2, 1, -1, 0],
        [-1, -2, 0, -1], [-1, 2, 0, 1],
        [1, -2, 0, -1], [1, 2, 0, 1],
        [2, -1, 1, 0], [2, 1, 1, 0]
      ];
      knightMoves.forEach(([dr, dc, br, bc]) => {
        const brd = r + br, bcd = c + bc;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[brd][bcd] == null) {
          const target = board[nr][nc];
          if (!target || target.c === enemy) moves.push([nr, nc]);
        }
      });
      break;
    }
    case "r": {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 10; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (!inBounds(nr, nc)) break;
          const target = board[nr][nc];
          if (!target) moves.push([nr, nc]);
          else {
            if (target.c === enemy) moves.push([nr, nc]);
            break;
          }
        }
      });
      break;
    }
    case "c": {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        let screen = false;
        for (let i = 1; i < 10; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (!inBounds(nr, nc)) break;
          const target = board[nr][nc];
          if (!screen) {
            if (!target) moves.push([nr, nc]);
            else screen = true;
          } else {
            if (target) {
              if (target.c === enemy) moves.push([nr, nc]);
              break;
            }
          }
        }
      });
      break;
    }
    case "s": {
      const forward = color === "red" ? -1 : 1;
      const nr = r + forward;
      if (inBounds(nr, c) && (!board[nr][c] || board[nr][c].c === enemy)) {
        moves.push([nr, c]);
      }
      if ((color === "red" && r <= 4) || (color === "black" && r >= 5)) {
        [[0, 1], [0, -1]].forEach(([dr, dc]) => {
          const nc = c + dc;
          if (inBounds(r, nc) && (!board[r][nc] || board[r][nc].c === enemy)) {
            moves.push([r, nc]);
          }
        });
      }
      break;
    }
  }
  return moves;
}

const chineseChars = {
  r: "車", n: "馬", b: "相", a: "仕", k: "帥", c: "炮", s: "兵",
  R: "車", N: "馬", B: "象", A: "士", K: "將", C: "砲", S: "卒"
};

function findKing(board, color) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.t === "k" && piece.c === color) {
        return [r, c];
      }
    }
  }
  return null;
}

function isInCheck(board, color) {
  const enemy = color === "red" ? "black" : "red";
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.c === enemy) {
        const moves = getLegalMovesFiltered(board, r, c);
        if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) {
          return true;
        }
      }
    }
  }
  return false;
}

function isCheckmate(board, color) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.c === color) {
        const moves = getLegalMovesFiltered(board, r, c);
        for (const move of moves) {
          const simulated = applyMove(board, [r, c], move);
          if (!isInCheck(simulated, color)) return false;
        }
      }
    }
  }
  return true;
}

function evaluateBoard(board, color) {
  const pieceValues = { k: 1000, a: 2, b: 2, n: 4, r: 9, c: 5, s: 1 };
  let score = 0;
  for (let row of board) {
    for (let p of row) {
      if (p) {
        const val = pieceValues[p.t.toLowerCase()] || 0;
        score += (p.c === color ? 1 : -1) * val;
      }
    }
  }
  return score;
}

// ✅ SAFE legal moves (no self-check)
function getLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.c;
  const pseudo = getLegalMovesFiltered(board, r, c);
  return pseudo.filter(([mr, mc]) => {
    const simulated = applyMove(board, [r, c], [mr, mc]);
    return !isInCheck(simulated, color);
  });
}


// --- Personality profiles & helpers (kept internal; default to balanced) ---
const AI_STYLES = {
  balanced: { captureWeight: 1.0, checkWeight: 1.0, centerWeight: 0.2, mobilityWeight: 0.1, kingSafetyWeight: 1.0 },
};

function moveGivesCheck(board, from, to, enemyColor) {
  const after = applyMove(board, from, to);
  return isInCheck(after, enemyColor);
}

function pieceAt(board, rc) { return board[rc[0]][rc[1]]; }

function captureValue(board, to) {
  const p = pieceAt(board, to);
  if (!p) return 0;
  const values = { k: 1000, a: 2, b: 2, n: 4, r: 9, c: 5, s: 1 };
  return values[p.t.toLowerCase()] || 0;
}

function centerBonus(from, to) {
  const centerCols = new Set([3,4,5]);
  const [fr, fc] = from, [tr, tc] = to;
  const dist = Math.abs(fr-4.5) + Math.abs(fc-4);
  const dist2 = Math.abs(tr-4.5) + Math.abs(tc-4);
  const towardCenter = dist - dist2; // positive if moved closer
  const tileBonus = centerCols.has(tc) ? 0.2 : 0;
  return towardCenter * 0.05 + tileBonus;
}

function mobility(afterBoard, color) {
  let m = 0;
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p = afterBoard[r][c];
    if (p && p.c === color) m += getLegalMoves(afterBoard, r, c).length;
  }
  return m;
}

// --- Lightweight opening book (position + ply) ---
const BOOK = {
  start_red: { from: [7,1], to: [7,4] },           // 中炮
  start_black_reply: { from: [0,1], to: [2,2] }    // 屏風馬
};

function isInitialLike(board) {
  const start = initialBoard();
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const a = start[r][c], b = board[r][c];
    if (!a && !b) continue;
    if (!a || !b) return false;
    if (a.t !== b.t || a.c !== b.c) return false;
  }
  return true;
}

function bookMove(board, color, moveNumber) {
  try {
    if (moveNumber === 0 && color === 'red' && isInitialLike(board)) {
      const mv = BOOK.start_red;
      const legal = getLegalMoves(board, mv.from[0], mv.from[1]).some(([r,c])=> r===mv.to[0] && c===mv.to[1]);
      return legal ? { from: mv.from, to: mv.to } : null;
    }
    if (moveNumber === 1 && color === 'black') {
      const mv = BOOK.start_black_reply;
      const legal = getLegalMoves(board, mv.from[0], mv.from[1]).some(([r,c])=> r===mv.to[0] && c===mv.to[1]);
      return legal ? { from: mv.from, to: mv.to } : null;
    }
  } catch (e) {}
  return null;
}

function scoreMove(board, color, move, style='balanced') {
  const weights = AI_STYLES[style] || AI_STYLES.balanced;
  const enemy = color === 'red' ? 'black' : 'red';
  const after = applyMove(board, move.from, move.to);
  const base = evaluateBoard(after, color);
  const cap = captureValue(board, move.to) * weights.captureWeight;
  const chk = (moveGivesCheck(board, move.from, move.to, enemy) ? 3 : 0) * weights.checkWeight;
  const cen = centerBonus(move.from, move.to) * weights.centerWeight;
  const mob = mobility(after, color) * 0.02 * weights.mobilityWeight;
  const safe = isInCheck(after, color) ? -3 * weights.kingSafetyWeight : 0;
  return base + cap + chk + cen + mob + safe;
}

// Existing simple AI (difficulty 1..3)
function getAIMove(board, color, difficulty = 1, options) {
  const useOpeningBook = options && options.useOpeningBook;
  const moveNumber = options && typeof options.moveNumber === 'number' ? options.moveNumber : undefined;

  // Opening book
  if (useOpeningBook) {
    const mv = bookMove(board, color, moveNumber ?? -1);
    if (mv) return mv;
  }

  const allMoves = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.c === color) {
        const moves = getLegalMovesFiltered(board, r, c);
        for (const move of moves) {
          const simulated = applyMove(board, [r, c], move);
          if (!isInCheck(simulated, color)) {
            allMoves.push({ from: [r, c], to: move });
          }
        }
      }
    }
  }

  if (allMoves.length === 0) return null;

  if (difficulty === 1) {
    const scored = allMoves.map(m => ({ m, s: scoreMove(board, color, m, 'balanced') }));
    scored.sort((a,b)=>b.s-a.s);
    const k = Math.max(1, Math.floor(scored.length / 3));
    return scored[Math.floor(Math.random()*k)].m;
  }

  if (difficulty === 2) {
    let bestScore = -Infinity, bestMove = allMoves[0];
    for (let move of allMoves) {
      const s = scoreMove(board, color, move, 'balanced');
      if (s > bestScore) { bestScore = s; bestMove = move; }
    }
    return bestMove;
  }

  if (difficulty === 3) {
    let bestScore = -Infinity;
    let bestMove = allMoves[0];
    const enemy = color === "red" ? "black" : "red";

    for (let move of allMoves) {
      const newBoard = applyMove(board, move.from, move.to);
      let worstReplyScore = Infinity;

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const piece = newBoard[r][c];
          if (piece && piece.c === enemy) {
            const replies = getLegalMovesFiltered(newBoard, r, c);
            for (const reply of replies) {
              const replyBoard = applyMove(newBoard, [r, c], reply);
              if (!isInCheck(replyBoard, enemy)) {
                const s = scoreMove(newBoard, color, { from:[r,c], to: reply }, 'balanced');
                if (s < worstReplyScore) worstReplyScore = s;
              }
            }
          }
        }
      }

      if (worstReplyScore > bestScore) {
        bestScore = worstReplyScore;
        bestMove = move;
      }
    }

    return bestMove;
  }

  return allMoves[0];
}

// --- Adaptive wrapper ---
// playerSkill: 1..6 (stored by app). We map to a difficulty and a notional depth.
function mapSkillToDifficulty(skill) {
  if (skill <= 2) return 1;
  if (skill <= 4) return 2;
  return 3;
}
function mapSkillToDepth(skill) {
  return ({1:1,2:1,3:2,4:2,5:3,6:3})[skill] || 2;
}

/**
 * getAIMoveAdaptive(board, color, { moveNumber, useOpeningBook, playerSkill })
 * Returns { from, to, meta: { effectiveDifficulty, effectiveDepth } }
 */
function getAIMoveAdaptive(board, color, opts) {
  const o = opts || {};
  const skill = Math.max(1, Math.min(6, Number(o.playerSkill || 3)));
  const effectiveDifficulty = mapSkillToDifficulty(skill);
  const mv = getAIMove(board, color, effectiveDifficulty, { useOpeningBook: !!o.useOpeningBook, moveNumber: o.moveNumber });
  if (!mv) return null;
  return { ...mv, meta: { effectiveDifficulty, effectiveDepth: mapSkillToDepth(skill) } };
}


// --- helpers for stalemate & repetition ---
function hasAnyLegalMoves(board, color) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.c === color) {
        const moves = getLegalMoves(board, r, c);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

function isStalemate(board, color) {
  return !isInCheck(board, color) && !hasAnyLegalMoves(board, color);
}

function boardKey(board, sideToMove) {
  let s = sideToMove === "red" ? "r|" : "b|";
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) { s += "."; continue; }
      const ch = p.c === "red" ? p.t.toLowerCase() : p.t.toUpperCase();
      s += ch;
    }
    s += "|";
  }
  return s;
}

window.logic = {
  getAIMove,
  getAIMoveAdaptive, // ✅ export adaptive
  initialBoard,
  applyMove,
  getLegalMovesFiltered,
  getLegalMoves,
  chineseChars,
  isInCheck,
  isCheckmate,
  findKing,
  evaluateBoard,
  hasAnyLegalMoves,
  isStalemate,
  boardKey
};
