// app.js — Adaptive AI + Game End Overlay + Config Overlay (cog in sidebar)

const {
  Box,
  Typography,
  Button,
  Snackbar,
  Slider,
} = MaterialUI;

const { createRoot } = ReactDOM;
const { useState, useEffect, useRef, useCallback } = React;

let getLegalMovesFiltered;
let getLegalMoves;
let applyMove;
let isInCheck;
let isCheckmate;
let findKing;
let getAIMoveAdaptive;
let initialBoard;
let evaluateBoard;
let hasAnyLegalMoves;
let isStalemate;
let boardKey;

function getWinLossStats() {
  return { redWins: 0, blackWins: 0, winRate: 0 };
}

// --- Utility: clamp ---
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Map skill 1..6 to a notional depth label just for display
const skillToDepth = (s) => ({1:1,2:1,3:2,4:2,5:3,6:3})[s] || 2;

/**
 * CapturedTray
 * Keeps all captured pieces on ONE line by shrinking the token size as count grows.
 */
function CapturedTray({ pieces, color }) {
  const containerRef = useRef(null);
  const [itemSize, setItemSize] = useState(24);
  const GAP = 6;
  const MIN = 14;
  const MAX = 30;

  const recalc = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const n = Math.max(1, pieces.length);
    const w = el.clientWidth || 0;
    if (pieces.length === 0) {
      setItemSize(24);
      return;
    }
    const s = Math.floor((w - (n - 1) * GAP) / n);
    setItemSize(clamp(s, MIN, MAX));
  }, [pieces.length]);

  useEffect(() => { recalc(); }, [recalc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recalc());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalc]);

  const fontSize = Math.round(itemSize * 0.58);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        gap: `${GAP}px`,
        alignItems: 'center',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        minHeight: itemSize + 8,
      }}
    >
      {pieces.map((p, i) => (
        <Box
          key={`${color}-cap-${i}`}
          className={`piece ${color}`}
          sx={{ width: itemSize, height: itemSize, fontSize }}
          title={p.t}
        >
          {color === "black"
            ? chineseChars[p.t.toUpperCase()]
            : chineseChars[p.t.toLowerCase()]
          }
        </Box>
      ))}
    </Box>
  );
}

/** GameEndOverlay — full-screen dimmer with a result card */
function GameEndOverlay({ open, result, stats, moveLog, captured, onReset, aiInfo }) {
  if (!open || !result) return null;

  const totalPlies = moveLog.length;                 // half-moves
  const totalMoves = Math.ceil(totalPlies / 2);      // full moves
  const redCaps = captured.red.length;               // pieces red lost
  const blackCaps = captured.black.length;           // pieces black lost

  return (
    <div className="result-overlay">
      <div className="result-card">
        <div className={`result-ribbon ${result.result}`}>
          {result.result === 'draw'
            ? 'Draw'
            : `${result.result.toUpperCase()} Wins`}
        </div>

        <Typography variant="h5" sx={{ fontWeight: 800, mb: .5 }}>
          {result.result === 'draw'
            ? (result.reason === 'repetition' ? 'Draw by Threefold Repetition' : 'Draw by Stalemate')
            : `Checkmate – ${result.result === 'red' ? 'Red' : 'Black'} triumphs`}
        </Typography>

        <div className="result-grid">
          <div className="result-item">
            <div className="k">Total moves</div>
            <div className="v">{totalMoves} <span className="sub">({totalPlies} plies)</span></div>
          </div>
          <div className="result-item">
            <div className="k">Win rate (Red)</div>
            <div className="v">{stats.winRate}% <span className="sub">({stats.redWins}–{stats.blackWins})</span></div>
          </div>
          <div className="result-item">
            <div className="k">Captures</div>
            <div className="v">Red {blackCaps} • Black {redCaps}</div>
          </div>
          <div className="result-item">
            <div className="k">AI (next game)</div>
            <div className="v">Skill {aiInfo.skill} • Depth {aiInfo.depth}</div>
          </div>
        </div>

        <div className="result-actions">
          <Button variant="contained" onClick={onReset}>Play again</Button>
        </div>
      </div>
    </div>
  );
}

/** ConfigOverlay — uses existing .ai-overlay backdrop for styling */
function ConfigOverlay({
  open, onClose,
  turn, stats, playerSkill, setPlayerSkill,
  onResetStats
}) {
  if (!open) return null;

  // simple local helper to format label
  const depth = skillToDepth(playerSkill);

  const stop = (e) => e.stopPropagation();

  return (
    <div className="ai-overlay" onClick={onClose}>
      <div
        onClick={stop}
        style={{
          width: 'min(560px, 92vw)',
          background: 'linear-gradient(180deg, #15231c, #0f1b15)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 16,
          padding: 18,
          boxShadow: '0 22px 50px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)',
          color: 'var(--text-1)',
          position: 'relative'
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close configuration"
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.18)',
            color: 'var(--text-1)',
            padding: '6px 9px',
            borderRadius: 10,
            cursor: 'pointer'
          }}
        >✕</button>

        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Configuration</Typography>


        {/* Wins / Win rate */}
        <div style={{ paddingTop: 10, paddingBottom: 10, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Win counter & win rate</div>
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap', marginBottom: 8 }}>
            <span className="chip chip-red">Red Wins: {stats.redWins}</span>
            <span className="chip chip-blue">Black Wins: {stats.blackWins}</span>
            <span className="chip">Win Rate: {stats.winRate}%</span>
          </div>
          <Button variant="outlined" onClick={onResetStats}>Reset counters</Button>
        </div>

        {/* Adaptive AI */}
        <div style={{ paddingTop: 10, paddingBottom: 2, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Adaptive AI</div>
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap', marginBottom: 8 }}>
            <span className="chip">Adaptive</span>
            <span className="chip">Skill: {playerSkill}</span>
            <span className="chip">Depth: {depth}</span>
          </div>
          <div style={{ padding: '4px 6px 12px' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Adjust AI skill (1–6)</Typography>
            <Slider
              min={1} max={6} step={1}
              value={playerSkill}
              onChange={(_, v)=> setPlayerSkill(v)}
              valueLabelDisplay="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}


/** Evaluation bar — chess.com-style */
function EvalBar({ boardRef, scoreFromRed }){
  const [height, setHeight] = React.useState(0);
  const wrapRef = React.useRef(null);

  // sync height with board via ResizeObserver
  React.useEffect(()=>{
    const el = boardRef.current;
    if(!el) return;
    const ro = new ResizeObserver(([entry])=>{
      setHeight(Math.floor(entry.contentRect.height));
    });
    ro.observe(el);
    return ()=> ro.disconnect();
  }, [boardRef]);

  // map score to 0..1 fill; clamp for sanity
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const RANGE = 30; // material-ish scale; saturate beyond
  const p = (clamp(scoreFromRed, -RANGE, RANGE) + RANGE) / (2*RANGE); // 0 black .. 1 red
  const redPct = Math.round(p * 100);

  return (
<div
  className="eval-wrap"
  ref={wrapRef}
  style={{ height: height || undefined }}
  aria-label="Position evaluation bar"
  title={scoreFromRed === 0 ? 'Even' : (scoreFromRed > 0 ? `Red +${scoreFromRed.toFixed(1)}` : `Black +${Math.abs(scoreFromRed).toFixed(1)}`)}
>
  <div className="eval-track">
    <div className="eval-chunk eval-black" style={{ height: `${100 - redPct}%` }} />
    <div className="eval-chunk eval-red"   style={{ height: `${redPct}%` }} />
  </div>
</div>
);
}

function App() {
  const [board, setBoard] = useState(initialBoard());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [turn, setTurn] = useState("red");
  const [useOpeningBook] = useState(true); // always ON
  const [mode] = useState("ai");
  const [lastMoveFrom, setLastMoveFrom] = useState(null);
  const [lastMoveTo, setLastMoveTo] = useState(null);
  const [capturedAt, setCapturedAt] = useState(null);
  const [capturedPieces, setCapturedPieces] = useState({ red: [], black: [] });
  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [playerSkill, setPlayerSkill] = useState(() => {
    const stored = parseInt(localStorage.getItem("xiangqiPlayerSkill"));
    if (Number.isFinite(stored)) return Math.max(1, Math.min(6, stored));
    return 3; // start in the middle
  });
  const boardRef = useRef(null);
  const canvasRef = useRef(null);

  // NEW: Game result for overlay
  const [gameResult, setGameResult] = useState(null); // { result:'red'|'black'|'draw', reason:'checkmate'|'stalemate'|'repetition' }

  // NEW: Config overlay open state
  const [configOpen, setConfigOpen] = useState(false);
  const evalScore = React.useMemo(()=> {
    try { return evaluateBoard(board, 'red'); } catch(e){ return 0; }
  }, [board]);

  // Responsive square sizing
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const px = Math.max(32, Math.min(60, Math.round((w / 9) * 0.9)));
      el.style.setProperty('--sq', px + 'px');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [checkKing, setCheckKing] = useState(null);
  const [stats, setStats] = useState(() => JSON.parse(localStorage.getItem("xiangqiStats")) || getWinLossStats());
  const [aiThinking, setAiThinking] = useState(false);
  const [moveLog, setMoveLog] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [repetitionMap, setRepetitionMap] = useState({});
  const REPETITION_LIMIT = 3;

  // Persist skill & stats
  useEffect(() => {
    localStorage.setItem("xiangqiPlayerSkill", String(playerSkill));
  }, [playerSkill]);

  useEffect(() => {
    localStorage.setItem("xiangqiStats", JSON.stringify(stats));
  }, [stats]);

  // AI turn
  useEffect(() => {
    if (mode === "ai" && turn === "black" && !gameOver) {
      setAiThinking(true);
      const timeout = setTimeout(() => {
        const aiMove = getAIMoveAdaptive(board, "black", { useOpeningBook, moveNumber: moveLog.length, playerSkill });
        setAiThinking(false);
        if (aiMove) handleMove(aiMove.from, aiMove.to);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [turn, mode, board, gameOver, useOpeningBook, moveLog, playerSkill]);

  // Draw board grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--line-color').trim();
    const riverTint = getComputedStyle(document.documentElement).getPropertyValue('--river-tint').trim();

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      const cssW = Math.max(100, Math.floor(rect.width));
      const cssH = Math.max(100, Math.floor(rect.height));

      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const cellW = cssW / 8;
      const cellH = cssH / 9;

      ctx.fillStyle = riverTint;
      ctx.fillRect(0, 4 * cellH, cssW, cellH);

      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;

      for (let i = 0; i <= 9; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(cssW, i * cellH);
        ctx.stroke();
      }

      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, 4 * cellH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i * cellW, 5 * cellH);
        ctx.lineTo(i * cellW, 9 * cellH);
        ctx.stroke();
      }

      ctx.beginPath(); ctx.moveTo(3 * cellW, 0); ctx.lineTo(5 * cellW, 2 * cellH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5 * cellW, 0); ctx.lineTo(3 * cellW, 2 * cellH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3 * cellW, 7 * cellH); ctx.lineTo(5 * cellW, 9 * cellH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5 * cellW, 7 * cellH); ctx.lineTo(3 * cellW, 9 * cellH); ctx.stroke();
    }

    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    draw();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const startKey = boardKey(board, turn);
    setRepetitionMap({ [startKey]: 1 });
  }, []);

  function handleSquareClick(r, c) {
    if (aiThinking || gameOver) return;
    if (selected) {
      const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isLegal) {
        handleMove(selected, [r, c]);
        return;
      }
    }
    const piece = board[r][c];
    if (piece && piece.c === turn) {
      const moves = getLegalMoves(board, r, c);
      setSelected([r, c]);
      setLegalMoves(moves);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }

  // Adjust skill after each finished game
  function adjustSkillAfterGame(winnerColor) {
    if (winnerColor === "red") {
      // Human won -> make AI a bit stronger
      setPlayerSkill(s => Math.min(6, s + 1));
    } else if (winnerColor === "black") {
      // AI won -> ease off
      setPlayerSkill(s => Math.max(1, s - 1));
    }
  }

  function handleMove(from, to) {
    if (gameOver) return;

    const targetPiece = board[to[0]][to[1]];
    if (targetPiece) {
      setCapturedAt(to);
      setCapturedPieces(prev => ({
        ...prev,
        [targetPiece.c]: [...prev[targetPiece.c], targetPiece]
      }));
    }
    const movingPiece = board[from[0]][from[1]];
    const newBoard = applyMove(board, from, to);

    setLastMoveFrom(from);
    setLastMoveTo(to);
    setMoveLog(prev => [...prev, { from, to, piece: movingPiece, captured: targetPiece || null }]);

    const nextColor = turn === "red" ? "black" : "red";
    const inCheck = isInCheck(newBoard, nextColor);
    const checkmate = isCheckmate(newBoard, nextColor);

    if (checkmate) {
      const updatedStats = { ...stats };
      if (turn === "red") updatedStats.redWins++;
      else updatedStats.blackWins++;
      const total = updatedStats.redWins + updatedStats.blackWins;
      updatedStats.winRate = total === 0 ? 0 : Math.round((updatedStats.redWins / total) * 100);
      setStats(updatedStats);
      localStorage.setItem("xiangqiStats", JSON.stringify(updatedStats));
      setMessage(`${turn} wins by checkmate!`);
      setCheckKing(null);
      setAiThinking(false);
      setBoard(newBoard);
      setGameOver(true);

      // NEW: set result for overlay and adapt AI
      setGameResult({ result: turn, reason: 'checkmate' });
      adjustSkillAfterGame(turn);
      return;
    }

    if (isStalemate(newBoard, nextColor)) {
      setMessage(`Draw by stalemate.`);
      setAiThinking(false);
      setOpenSnackbar(true);
      setBoard(newBoard);
      setTurn(nextColor);
      setGameOver(true);
      // NEW
      setGameResult({ result: 'draw', reason: 'stalemate' });
      return;
    }

    if (inCheck) {
      setMessage(`${nextColor} is in check!`);
      const kingPos = findKing(newBoard, nextColor);
      setCheckKing(kingPos);
    } else {
      setCheckKing(null);
      setMessage("");
    }

    const key = boardKey(newBoard, nextColor);
    const repCount = (repetitionMap[key] || 0) + 1;
    if (repCount >= REPETITION_LIMIT) {
      setMessage(`Draw by repetition (threefold).`);
      setRepetitionMap(prev => ({ ...prev, [key]: repCount }));
      setAiThinking(false);
      setOpenSnackbar(true);
      setBoard(newBoard);
      setTurn(nextColor);
      setGameOver(true);
      // NEW
      setGameResult({ result: 'draw', reason: 'repetition' });
      return;
    } else {
      setRepetitionMap(prev => ({ ...prev, [key]: repCount }));
    }

    setOpenSnackbar(true);
    setBoard(newBoard);
    setTurn(nextColor);
    setSelected(null);
    setLegalMoves([]);
  }

  function handleResetGame() {
    const fresh = initialBoard();
    setBoard(fresh);
    setSelected(null);
    setLegalMoves([]);
    setTurn("red");
    setMoveLog([]);
    setLastMoveFrom(null);
    setLastMoveTo(null);
    setCapturedAt(null);
    setCapturedPieces({ red: [], black: [] });
    setCheckKing(null);
    setAiThinking(false);
    setMessage("");
    setOpenSnackbar(false);
    setGameOver(false);
    setGameResult(null); // clear overlay result
    const startKey = boardKey(fresh, "red");
    setRepetitionMap({ [startKey]: 1 });
  }

  function handleResetStats() {
    setStats(getWinLossStats());
    localStorage.setItem("xiangqiStats", JSON.stringify(getWinLossStats()));
  }

  return (
<Box
  sx={{
    display: "flex",
    flexDirection: "row",
    gap: 3,
    p: 2,
    justifyContent: "center",
    alignItems: "flex-start",   // ✅ add this
    flexWrap: "wrap",
  }}
>
      <Box ref={boardRef} className="board" sx={{ position: 'relative', width: '100%', maxWidth: 560, aspectRatio: '9 / 10' }}>
        {/* Evaluation bar (overlay on left edge) */}
        <EvalBar boardRef={boardRef} scoreFromRed={evalScore} />

        <div className="board-lines">
          <canvas ref={canvasRef}></canvas>
        </div>

        {aiThinking && (
          <div className="ai-overlay">
            <div className="ai-message">
              <div className="spinner"></div>
              <div className="ai-lines">
                <div className="ai-title">AI is thinking</div>
                <div className="ai-sub">Evaluating moves<span className="dots"><span></span><span></span><span></span></span></div>
              </div>
            </div>
          </div>
        )}

        {board.map((row, r) =>
          row.map((piece, c) => {
            const top = (r / 9) * 100;
            const left = (c / 8) * 100;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c);
            const isCheck = checkKing && checkKing[0] === r && checkKing[1] === c;
            const isFrom = lastMoveFrom && lastMoveFrom[0] === r && lastMoveFrom[1] === c;
            const isTo = lastMoveTo && lastMoveTo[0] === r && lastMoveTo[1] === c;
            const isCaptured = capturedAt && capturedAt[0] === r && capturedAt[1] === c;
            const classNames = ["square"];
            if (isSelected) classNames.push("selected");
            if (isLegal) classNames.push("legal-move");
            if (isCheck) classNames.push("check-king");
            if (isFrom || isTo) classNames.push("last-move");
            if (isCaptured) classNames.push("captured-glow");
            return (
              <div
                key={`${r}-${c}`}
                className={classNames.join(" ")}
                onClick={() => handleSquareClick(r, c)}
                style={{ top: `${top}%`, left: `${left}%` }}
              >
                {piece && (
                  <div className={`piece ${piece.c}`}>
                    {piece.c === "red"
                      ? chineseChars[piece.t.toLowerCase()]
                      : chineseChars[piece.t.toUpperCase()]}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* NEW: Game End Overlay */}
        <GameEndOverlay
          open={gameOver}
          result={gameResult}
          stats={stats}
          moveLog={moveLog}
          captured={capturedPieces}
          aiInfo={{ skill: playerSkill, depth: skillToDepth(playerSkill) }}
          onReset={handleResetGame}
        />
      </Box>

      {/* Sidebar */}
      <Box className="side-panel" sx={{ width: 360, position: 'relative', alignSelf: 'flex-start' }}>
        {/* Cog button (top-right) */}
        <button
          onClick={()=> setConfigOpen(true)}
          aria-label="Open configuration"
          title="Settings"
          style={{
            position:'absolute', top: 8, right: 8,
            width: 34, height: 34,
            display:'grid', placeItems:'center',
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.18)',
            borderRadius: 10,
            color: 'var(--text-1)',
            cursor: 'pointer'
          }}
        >
          {/* simple gear svg */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4a7.96 7.96 0 00-.24-1.92l2.02-1.56-2-3.46-2.4.96a7.98 7.98 0 00-3.32-1.92l-.36-2.52H9.3l-.36 2.52a7.98 7.98 0 00-3.32 1.92l-2.4-.96-2 3.46 2.02 1.56A8.1 8.1 0 003 12c0 .66.08 1.3.24 1.92L1.22 15.5l2 3.46 2.4-.96a7.98 7.98 0 003.32 1.92l.36 2.52h3.4l.36-2.52a7.98 7.98 0 003.32-1.92l2.4.96 2-3.46-2.02-1.58c.16-.6.24-1.24.24-1.92z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          </svg>
        </button>

        <div className="panel-section" style={{ paddingTop: 40 }}>
          <Typography variant="subtitle2" className="section-label">Captured by Red:</Typography>
          <Box className="panel-well">
            <CapturedTray pieces={capturedPieces.black} color="black" />
          </Box>
        </div>

        <div className="panel-section">
          <Typography variant="subtitle2" className="section-label">Captured by Black:</Typography>
          <Box className="panel-well">
            <CapturedTray pieces={capturedPieces.red} color="red" />
          </Box>
        </div>

<div className="panel-section">
  <Typography variant="subtitle2" className="section-label">Move Log:</Typography>
  <div className="move-log">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Red</th>
          <th>Black</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: Math.ceil(moveLog.length / 2) })
  .map((_, idx) => Math.ceil(moveLog.length / 2) - 1 - idx) // reversed index
  .map((reversedIndex) => {
    const moveNumber = reversedIndex + 1; // biggest number first
    const redMove = moveLog[reversedIndex * 2];
    const blackMove = moveLog[reversedIndex * 2 + 1];

    const redTxt = redMove
      ? `${(redMove.piece.c === 'red'
          ? chineseChars[redMove.piece.t.toLowerCase()]
          : chineseChars[redMove.piece.t.toUpperCase()])} ${redMove.from[0]},${redMove.from[1]}→${redMove.to[0]},${redMove.to[1]}`
      : '';

    const blackTxt = blackMove
      ? `${(blackMove.piece.c === 'red'
          ? chineseChars[blackMove.piece.t.toLowerCase()]
          : chineseChars[blackMove.piece.t.toUpperCase()])} ${blackMove.from[0]},${blackMove.from[1]}→${blackMove.to[0]},${blackMove.to[1]}`
      : '';

    return (
      <tr key={reversedIndex}>
        <td>{moveNumber}</td>
        <td>{redTxt}</td>
        <td>{blackTxt}</td>
      </tr>
    );
  })}
      </tbody>
    </table>
  </div>
</div>

        <Button
          className="panel-reset"
          variant="outlined"
          onClick={handleResetGame}
          sx={{ width: '50%' }}
        >
          Reset Game
        </Button>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        message={message}
      />

      {/* Config overlay */}
      <ConfigOverlay
        open={configOpen}
        onClose={()=> setConfigOpen(false)}
        turn={turn}
        stats={stats}
        playerSkill={playerSkill}
        setPlayerSkill={setPlayerSkill}
        onResetStats={handleResetStats}
      />
    </Box>
  );
}

function waitForLogicAndStart() {
  if (window.logic) {
    const logic = window.logic;
    getLegalMovesFiltered = logic.getLegalMovesFiltered;
    getLegalMoves = logic.getLegalMoves;
    applyMove = logic.applyMove;
    isInCheck = logic.isInCheck;
    isCheckmate = logic.isCheckmate;
    findKing = logic.findKing;
    getAIMoveAdaptive = logic.getAIMoveAdaptive;
    initialBoard = logic.initialBoard;
    evaluateBoard = logic.evaluateBoard;
    hasAnyLegalMoves = logic.hasAnyLegalMoves;
    isStalemate = logic.isStalemate;
    boardKey = logic.boardKey;

    const root = createRoot(document.getElementById("root"));
    root.render(<App />);
  } else {
    setTimeout(waitForLogicAndStart, 50);
  }
}

waitForLogicAndStart();
