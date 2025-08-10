
// logic.js — Stronger AI (Alpha-Beta + Quiescence + PST)

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

// --- Evaluation ---
// Material
const BASE_VALUES = { k: 10000, a: 20, b: 20, n: 45, r: 100, c: 60, s: 12 };

// Simple piece-square tables (from Red's perspective); mirrored for Black.
// Values are intentionally small (centipawn-ish).
const PST = {
  // rows 0..9, cols 0..8
  s: [
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 1,1,1, 0,0,0],
    [0,1,1, 2,2,2, 1,1,0],
    [0,1,2, 3,4,3, 2,1,0],
    [0,0,1, 2,3,2, 1,0,0],
    [0,0,0, 1,2,1, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
  ],
  r: [
    [0,1,1, 1,1,1, 1,1,0],
    [0,2,2, 2,2,2, 2,2,0],
    [0,2,3, 3,3,3, 3,2,0],
    [0,2,3, 4,5,4, 3,2,0],
    [0,2,3, 4,6,4, 3,2,0],
    [0,2,3, 4,5,4, 3,2,0],
    [0,2,3, 3,4,3, 3,2,0],
    [0,2,2, 2,2,2, 2,2,0],
    [0,1,1, 1,1,1, 1,1,0],
    [0,0,0, 0,0,0, 0,0,0],
  ],
  c: [
    [0,1,1, 1,1,1, 1,1,0],
    [0,2,2, 2,2,2, 2,2,0],
    [0,2,3, 3,3,3, 3,2,0],
    [0,2,3, 4,4,4, 3,2,0],
    [0,2,3, 4,5,4, 3,2,0],
    [0,2,3, 4,4,4, 3,2,0],
    [0,2,3, 3,3,3, 3,2,0],
    [0,2,2, 2,2,2, 2,2,0],
    [0,1,1, 1,1,1, 1,1,0],
    [0,0,0, 0,0,0, 0,0,0],
  ],
  n: [
    [0,1,2, 2,2,2, 2,1,0],
    [0,2,3, 3,3,3, 3,2,0],
    [0,3,4, 5,5,5, 4,3,0],
    [0,3,5, 6,7,6, 5,3,0],
    [0,2,4, 5,6,5, 4,2,0],
    [0,2,3, 4,5,4, 3,2,0],
    [0,1,2, 3,4,3, 2,1,0],
    [0,1,1, 2,2,2, 1,1,0],
    [0,0,1, 1,1,1, 1,0,0],
    [0,0,0, 0,0,0, 0,0,0],
  ],
  b: [
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,1, 1,1,1, 1,0,0],
    [0,0,1, 2,2,2, 1,0,0],
    [0,0,2, 3,3,3, 2,0,0],
    [0,0,2, 3,4,3, 2,0,0],
    [0,0,2, 3,3,3, 2,0,0],
    [0,0,1, 2,2,2, 1,0,0],
    [0,0,1, 1,1,1, 1,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
  ],
  a: [
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 1,2,1, 0,0,0],
    [0,0,0, 1,3,1, 0,0,0],
    [0,0,0, 1,2,1, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 1,2,1, 0,0,0],
    [0,0,0, 1,3,1, 0,0,0],
    [0,0,0, 1,2,1, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
  ],
  k: [
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 0,2,0, 0,0,0],
    [0,0,0, 0,2,0, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,0, 0,2,0, 0,0,0],
    [0,0,0, 0,2,0, 0,0,0],
    [0,0,0, 0,1,0, 0,0,0],
  ],
};

function pstScore(t, color, r, c) {
  // PST defined from Red's perspective. Mirror rows for Black.
  const table = PST[t];
  if (!table) return 0;
  const rr = color === "red" ? r : 9 - r;
  const v = table[rr][c] || 0;
  return v;
}

function evaluateBoard(board, color) {
  let score = 0;
  for (let r=0; r<10; r++) {
    for (let c=0; c<9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = (p.c === color) ? 1 : -1;
      const t = p.t.toLowerCase();
      const mat = BASE_VALUES[t] || 0;
      let s = mat;

      // piece-square
      s += pstScore(t, p.c, r, c);

      // soldier bonus after crossing the river (encourage advancement)
      if (t === "s") {
        if (p.c === "red" && r <= 4) s += 6;
        if (p.c === "black" && r >= 5) s += 6;
      }

      // mobility for major pieces (quick estimate)
      if (t === "r" || t === "c") {
        const lm = getLegalMovesFiltered(board, r, c).length;
        s += Math.min(10, lm); // cap
      }

      score += sign * s;
    }
  }

  // king in check penalty
  const meInCheck = isInCheck(board, color);
  const themInCheck = isInCheck(board, color === "red" ? "black" : "red");
  if (meInCheck) score -= 30;
  if (themInCheck) score += 30;

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

function allLegalMoves(board, color) {
  const mv = [];
  for (let r=0; r<10; r++) for (let c=0; c<9; c++) {
    const p = board[r][c];
    if (p && p.c === color) {
      const moves = getLegalMoves(board, r, c);
      for (const m of moves) mv.push({ from:[r,c], to:m });
    }
  }
  return mv;
}

function captureValue(board, to) {
  const p = board[to[0]][to[1]];
  if (!p) return 0;
  return BASE_VALUES[p.t.toLowerCase()] || 0;
}

function moveOrderingKey(board, color, move) {
  // MVV-LVA-ish: prioritize captures and checking moves
  const cap = captureValue(board, move.to);
  let chk = 0;
  const enemy = color === "red" ? "black" : "red";
  const after = applyMove(board, move.from, move.to);
  if (isInCheck(after, enemy)) chk = 50;
  // Prefer centralization slightly
  const [tr, tc] = move.to;
  const centerBonus = -Math.abs(tc - 4) - Math.abs(tr - 4.5);
  return cap * 10 + chk + centerBonus;
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

// --- Alpha-Beta with Quiescence ---
let NODE_COUNT = 0;
let NODE_LIMIT = 5000; // hard cap on evaluated nodes per AI move
const TT = new Map(); // simple transposition: key -> { depth, score }
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

function quiescence(board, color, alpha, beta) {
  const stand = evaluateBoard(board, color);
  if (stand >= beta) return beta;
  if (alpha < stand) alpha = stand;

  // Explore only capturing replies
  const enemy = color === "red" ? "black" : "red";
  const moves = allLegalMoves(board, color)
    .filter(m => captureValue(board, m.to) > 0)
    .sort((a,b)=> moveOrderingKey(board, color, b) - moveOrderingKey(board, color, a));

  for (const m of moves) {
    const nb = applyMove(board, m.from, m.to);
    const score = -quiescence(nb, enemy, -beta, -alpha);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(board, color, depth, alpha, beta) {
  NODE_COUNT++;
  if (NODE_COUNT > NODE_LIMIT) return evaluateBoard(board, color);
  const key = boardKey(board, color);
  const tt = TT.get(key);
  if (tt && tt.depth >= depth) return tt.score;

  if (depth === 0) {
    const q = quiescence(board, color, alpha, beta);
    TT.set(key, { depth, score: q });
    return q;
  }

  const moves = allLegalMoves(board, color)
    .sort((a,b)=> moveOrderingKey(board, color, b) - moveOrderingKey(board, color, a));

  if (moves.length === 0) {
    // Checkmate or stalemate
    if (isInCheck(board, color)) return -99999 + (5 - depth);
    return 0;
  }

  const enemy = color === "red" ? "black" : "red";
  let best = -Infinity;

  for (const m of moves) {
    const nb = applyMove(board, m.from, m.to);
    const score = -search(nb, enemy, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // cutoff
  }

  TT.set(key, { depth, score: best });
  return best;
}

function searchRoot(board, color, depth) {
  const enemy = color === "red" ? "black" : "red";
  const moves = allLegalMoves(board, color)
    .sort((a,b)=> moveOrderingKey(board, color, b) - moveOrderingKey(board, color, a));

  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity, beta = Infinity;

  for (const m of moves) {
    const nb = applyMove(board, m.from, m.to);
    const score = -search(nb, enemy, depth - 1, -beta, -alpha);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
  }
  // Pick randomly among top 2-3 to add variety
  const sortedMoves = moves.slice().sort((a,b)=> moveOrderingKey(board, color, b) - moveOrderingKey(board, color, a));
  const topN = Math.min(3, sortedMoves.length);
  const choicePool = [];
  let topScore = bestScore;
  for (const m of sortedMoves) {
    const nb = applyMove(board, m.from, m.to);
    const score = -search(nb, enemy, depth - 1, -beta, -alpha);
    if (Math.abs(score - topScore) <= 15) choicePool.push(m);
  }
  return choicePool.length ? choicePool[Math.floor(Math.random()*choicePool.length)] : bestMove;
}

// --- Legacy simple policy (kept for low difficulty and as fallback) ---
function simpleScoreMove(board, color, move) {
  const after = applyMove(board, move.from, move.to);
  const base = evaluateBoard(after, color);
  // small capture bonus to help ordering
  const cap = captureValue(board, move.to) * 0.2;
  // discourage self-check
  const safe = isInCheck(after, color) ? -50 : 0;
  return base + cap + safe;
}

function getAIMove(board, color, difficulty = 1, options) {
  const useOpeningBook = options && options.useOpeningBook;
  const moveNumber = options && typeof options.moveNumber === 'number' ? options.moveNumber : undefined;

  // Opening book
  if (useOpeningBook) {
    const mv = bookMove(board, color, moveNumber ?? -1);
    if (mv) return mv;
  }

  // Difficulty mapping:
  // 1: policy + randomness, 2: greedy policy, 3+: alpha-beta search with depth scaling
  if (difficulty <= 1) {
    const allMoves = allLegalMoves(board, color);
    if (allMoves.length === 0) return null;
    const scored = allMoves.map(m => ({ m, s: simpleScoreMove(board, color, m) }));
    scored.sort((a,b)=> b.s - a.s);
    const k = Math.max(1, Math.floor(scored.length / 3));
    return scored[Math.floor(Math.random() * k)].m;
  }

  if (difficulty === 2) {
    const allMoves = allLegalMoves(board, color);
    if (allMoves.length === 0) return null;
    let best = allMoves[0], bestS = -Infinity;
    for (const m of allMoves) {
      const s = simpleScoreMove(board, color, m);
      if (s > bestS) { bestS = s; best = m; }
    }
    return best;
  }

  // difficulty >= 3 -> alpha-beta
  const depth = Math.min(7, 2 + difficulty); // d3=5, d4=6, d5=7
  TT.clear();
  const mv = searchRoot(board, color, depth);
  return mv || null;
}

// --- Adaptive wrapper ---
// playerSkill: 1..6 (stored by app). We map to a difficulty and a depth.
function mapSkillToDifficulty(skill) {
  // Keep 1..6 but push higher skills into deeper search
  return Math.max(1, Math.min(6, Number(skill || 3)));
}
function mapSkillToDepth(skill) {
  // Expose for UI only (not used directly by getAIMove now)
  return ({1:3,2:4,3:5,4:6,5:6,6:7})[skill] || 5;
}

/**
 * getAIMoveAdaptive(board, color, { moveNumber, useOpeningBook, playerSkill })
 * Returns { from, to, meta: { effectiveDifficulty, effectiveDepth } }
 */
function getAIMoveAdaptive(board, color, opts) {
  const o = opts || {};
  const skill = Math.max(1, Math.min(6, Number(o.playerSkill || 3)));
  const difficulty = mapSkillToDifficulty(skill);
  const mv = getAIMove(board, color, difficulty, { useOpeningBook: !!o.useOpeningBook, moveNumber: o.moveNumber });
  if (!mv) return null;
  return { ...mv, meta: { effectiveDifficulty: difficulty, effectiveDepth: mapSkillToDepth(skill) } };
}

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
