import { useState, useCallback, useEffect, useRef } from "react";

const DIFFICULTIES = {
  Fledgling: { rows: 8, cols: 8, mines: 10 },
  Elder: { rows: 12, cols: 12, mines: 25 },
  Ancient: { rows: 16, cols: 16, mines: 50 },
};

const VAMPIRE_ICONS = {
  mine: "🧛",
  flag: "🧄",
  win: "🦇",
  lose: "💀",
  play: "🌙",
};

const NUMBER_COLORS = {
  1: "#c4a0ff",
  2: "#ff6b6b",
  3: "#7cff7c",
  4: "#6bc5ff",
  5: "#ff4444",
  6: "#44ffcc",
  7: "#ff88dd",
  8: "#ffcc44",
};

function createBoard(rows, cols, mines, firstR, firstC) {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      neighborCount: 0,
    }))
  );

  const safe = new Set();
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = firstR + dr, nc = firstC + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        safe.add(`${nr},${nc}`);
    }

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].isMine && !safe.has(`${r},${c}`)) {
      board[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine)
            count++;
        }
      board[r][c].neighborCount = count;
    }

  return board;
}

function revealCell(board, r, c, rows, cols) {
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    if (newBoard[cr][cc].isRevealed || newBoard[cr][cc].isFlagged) continue;
    newBoard[cr][cc].isRevealed = true;
    if (newBoard[cr][cc].neighborCount === 0 && !newBoard[cr][cc].isMine) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr !== 0 || dc !== 0) stack.push([cr + dr, cc + dc]);
    }
  }
  return newBoard;
}

function checkWin(board) {
  return board.every((row) =>
    row.every((cell) => cell.isRevealed || cell.isMine)
  );
}

function BatParticles({ active }) {
  const canvasRef = useRef(null);
  const batsRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    if (active && batsRef.current.length === 0) {
      for (let i = 0; i < 12; i++) {
        batsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: 8 + Math.random() * 10,
          wingPhase: Math.random() * Math.PI * 2,
          opacity: 0.15 + Math.random() * 0.25,
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      batsRef.current.forEach((bat) => {
        bat.x += bat.vx;
        bat.y += bat.vy;
        bat.wingPhase += 0.12;
        if (bat.x < -20) bat.x = canvas.width + 20;
        if (bat.x > canvas.width + 20) bat.x = -20;
        if (bat.y < -20) bat.y = canvas.height + 20;
        if (bat.y > canvas.height + 20) bat.y = -20;

        const wing = Math.sin(bat.wingPhase) * 0.6;
        ctx.save();
        ctx.translate(bat.x, bat.y);
        ctx.globalAlpha = bat.opacity;
        ctx.fillStyle = "#2a0a0a";
        ctx.beginPath();
        ctx.ellipse(0, 0, bat.size * 0.3, bat.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-bat.size * 0.5, -bat.size * wing, -bat.size, bat.size * 0.1 * wing);
        ctx.quadraticCurveTo(-bat.size * 0.5, bat.size * 0.2, 0, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(bat.size * 0.5, -bat.size * wing, bat.size, bat.size * 0.1 * wing);
        ctx.quadraticCurveTo(bat.size * 0.5, bat.size * 0.2, 0, 0);
        ctx.fill();
        ctx.restore();
      });
      animRef.current = requestAnimationFrame(animate);
    }

    if (active) animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

export default function VampireMinesweeper() {
  const [difficulty, setDifficulty] = useState("Fledgling");
  const [board, setBoard] = useState(null);
  const [gameState, setGameState] = useState("idle");
  const [flagCount, setFlagCount] = useState(0);
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);
  const [shakeCell, setShakeCell] = useState(null);
  const [flagMode, setFlagMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsMobile(
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { rows, cols, mines } = DIFFICULTIES[difficulty];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const resetGame = useCallback(() => {
    stopTimer();
    setBoard(null);
    setGameState("idle");
    setFlagCount(0);
    setTime(0);
    setFlagMode(false);
  }, [stopTimer]);

  useEffect(() => {
    resetGame();
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRightClick = useCallback(
    (e, r, c) => {
      if (e) e.preventDefault();
      if (gameState === "won" || gameState === "lost") return;

      let currentBoard = board;
      if (!currentBoard) {
        currentBoard = createBoard(rows, cols, mines, r, c);
        setGameState("playing");
        startTimer();
      }

      const cell = currentBoard[r][c];
      if (cell.isRevealed) return;

      const newBoard = currentBoard.map((row) =>
        row.map((cell) => ({ ...cell }))
      );
      newBoard[r][c].isFlagged = !cell.isFlagged;
      setBoard(newBoard);
      setFlagCount((prev) => (cell.isFlagged ? prev - 1 : prev + 1));
    },
    [board, gameState, rows, cols, mines, startTimer]
  );

  const handleClick = useCallback(
    (r, c) => {
      if (gameState === "won" || gameState === "lost") return;

      if (flagMode) {
        handleRightClick(null, r, c);
        return;
      }

      let currentBoard = board;
      if (!currentBoard) {
        currentBoard = createBoard(rows, cols, mines, r, c);
        setGameState("playing");
        startTimer();
      }

      const cell = currentBoard[r][c];
      if (cell.isRevealed || cell.isFlagged) return;

      if (cell.isMine) {
        const newBoard = currentBoard.map((row) =>
          row.map((cell) => ({
            ...cell,
            isRevealed: cell.isMine ? true : cell.isRevealed,
          }))
        );
        newBoard[r][c].exploded = true;
        setBoard(newBoard);
        setGameState("lost");
        stopTimer();
        return;
      }

      const newBoard = revealCell(currentBoard, r, c, rows, cols);
      setBoard(newBoard);

      if (checkWin(newBoard)) {
        setGameState("won");
        stopTimer();
      }
    },
    [board, gameState, rows, cols, mines, startTimer, stopTimer, flagMode, handleRightClick]
  );

  const handleDoubleClick = useCallback(
    (r, c) => {
      if (!board || gameState !== "playing") return;
      const cell = board[r][c];
      if (!cell.isRevealed || cell.neighborCount === 0) return;

      let adjFlags = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isFlagged)
            adjFlags++;
        }

      if (adjFlags !== cell.neighborCount) {
        setShakeCell(`${r},${c}`);
        setTimeout(() => setShakeCell(null), 400);
        return;
      }

      let newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
      let hitMine = false;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = newBoard[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
              if (neighbor.isMine) {
                hitMine = true;
                neighbor.isRevealed = true;
                neighbor.exploded = true;
              } else {
                newBoard = revealCell(newBoard, nr, nc, rows, cols);
              }
            }
          }
        }

      if (hitMine) {
        newBoard.forEach((row) =>
          row.forEach((cell) => {
            if (cell.isMine) cell.isRevealed = true;
          })
        );
        setBoard(newBoard);
        setGameState("lost");
        stopTimer();
      } else {
        setBoard(newBoard);
        if (checkWin(newBoard)) {
          setGameState("won");
          stopTimer();
        }
      }
    },
    [board, gameState, rows, cols, stopTimer]
  );

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxBoardWidth = Math.min(windowWidth - 32, 600);
  const cellSize = Math.floor((maxBoardWidth - (cols - 1) * 2 - 16) / cols);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0008 0%, #1a0a1e 30%, #120018 60%, #0a0008 100%)",
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        color: "#e8d5f0",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(80,0,60,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(120,0,0,0.1) 0%, transparent 50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <BatParticles active={true} />

      {/* Title */}
      <div style={{ zIndex: 2, textAlign: "center", marginTop: 28, marginBottom: 8 }}>
        <h1
          style={{
            fontSize: isMobile ? 30 : 42,
            fontWeight: 700,
            margin: 0,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "transparent",
            backgroundImage: "linear-gradient(180deg, #ff2244 0%, #8b0000 50%, #4a0020 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            textShadow: "none",
            filter: "drop-shadow(0 0 20px rgba(139,0,0,0.5))",
          }}
        >
          🦇 Bloodsweeper 🦇
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: isMobile ? 11 : 13,
            letterSpacing: 4,
            color: "#8a6090",
            textTransform: "uppercase",
          }}
        >
          Unearth the coffins… but beware the vampires
        </p>
      </div>

      {/* Difficulty */}
      <div
        style={{
          zIndex: 2,
          display: "flex",
          gap: 8,
          margin: "12px 0",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {Object.keys(DIFFICULTIES).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            style={{
              padding: "7px 18px",
              borderRadius: 4,
              border: difficulty === d ? "1px solid #8b0000" : "1px solid #3a1a3a",
              background: difficulty === d
                ? "linear-gradient(180deg, #3a0015, #1a0008)"
                : "rgba(20,5,20,0.7)",
              color: difficulty === d ? "#ff6680" : "#8a6090",
              fontFamily: "inherit",
              fontSize: 13,
              letterSpacing: 2,
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.2s",
              boxShadow: difficulty === d ? "0 0 12px rgba(139,0,0,0.3)" : "none",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div
        style={{
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 24,
          margin: "8px 0 12px",
          padding: "8px 20px",
          borderRadius: 6,
          background: "rgba(15,2,15,0.85)",
          border: "1px solid #2a0a2a",
          boxShadow: "inset 0 1px 8px rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ fontSize: 15, color: "#cc4466", fontVariantNumeric: "tabular-nums" }}>
          {VAMPIRE_ICONS.flag} {mines - flagCount}
        </span>

        <button
          onClick={resetGame}
          style={{
            fontSize: 26,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: 4,
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "scale(1.2)")}
          onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          title="New Game"
        >
          {gameState === "won"
            ? VAMPIRE_ICONS.win
            : gameState === "lost"
            ? VAMPIRE_ICONS.lose
            : VAMPIRE_ICONS.play}
        </button>

        <span style={{ fontSize: 15, color: "#cc4466", fontVariantNumeric: "tabular-nums" }}>
          ⏱ {formatTime(time)}
        </span>
      </div>

      {/* Dig / Garlic toggle */}
      <div
        style={{
          zIndex: 2,
          display: "flex",
          gap: 0,
          margin: "4px 0 8px",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid #3a0020",
          boxShadow: "0 0 16px rgba(100,0,40,0.2)",
        }}
      >
        <button
          onClick={() => setFlagMode(false)}
          style={{
            padding: isMobile ? "10px 22px" : "6px 16px",
            fontSize: isMobile ? 15 : 13,
            fontFamily: "inherit",
            letterSpacing: 1,
            border: "none",
            cursor: "pointer",
            background: !flagMode
              ? "linear-gradient(180deg, #3a0015, #1a0008)"
              : "rgba(15,2,15,0.85)",
            color: !flagMode ? "#ff6680" : "#5a3060",
            transition: "all 0.2s",
            boxShadow: !flagMode ? "inset 0 0 12px rgba(139,0,0,0.3)" : "none",
          }}
        >
          ⛏️ Dig
        </button>
        <button
          onClick={() => setFlagMode(true)}
          style={{
            padding: isMobile ? "10px 22px" : "6px 16px",
            fontSize: isMobile ? 15 : 13,
            fontFamily: "inherit",
            letterSpacing: 1,
            border: "none",
            borderLeft: "1px solid #2a0a2a",
            cursor: "pointer",
            background: flagMode
              ? "linear-gradient(180deg, #3a0015, #1a0008)"
              : "rgba(15,2,15,0.85)",
            color: flagMode ? "#ff6680" : "#5a3060",
            transition: "all 0.2s",
            boxShadow: flagMode ? "inset 0 0 12px rgba(139,0,0,0.3)" : "none",
          }}
        >
          🧄 Garlic
        </button>
      </div>

      {/* Win/Lose message */}
      {(gameState === "won" || gameState === "lost") && (
        <div
          style={{
            zIndex: 2,
            fontSize: isMobile ? 14 : 16,
            letterSpacing: 3,
            marginBottom: 8,
            color: gameState === "won" ? "#44ff88" : "#ff4444",
            textTransform: "uppercase",
            animation: "fadeIn 0.5s ease",
            textShadow:
              gameState === "won"
                ? "0 0 16px rgba(68,255,136,0.4)"
                : "0 0 16px rgba(255,68,68,0.4)",
            textAlign: "center",
            padding: "0 12px",
          }}
        >
          {gameState === "won"
            ? "🦇 The vampires have been vanquished! 🦇"
            : "💀 A vampire has risen… you perish! 💀"}
          <button
            onClick={resetGame}
            style={{
              display: "block",
              margin: "10px auto 0",
              padding: "8px 24px",
              borderRadius: 4,
              border: "1px solid #6b1040",
              background: "linear-gradient(180deg, #3a0015, #1a0008)",
              color: "#ff6680",
              fontFamily: "inherit",
              fontSize: 14,
              letterSpacing: 2,
              cursor: "pointer",
              textTransform: "uppercase",
              boxShadow: "0 0 12px rgba(139,0,0,0.3)",
              transition: "all 0.2s",
            }}
          >
            Rise Again
          </button>
        </div>
      )}

      {/* Board */}
      <div
        style={{
          zIndex: 2,
          display: "inline-grid",
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: 2,
          padding: 8,
          borderRadius: 6,
          background: "linear-gradient(135deg, #5a1040 0%, #3a0828 100%)",
          border: "2px solid #6b1040",
          boxShadow:
            "0 0 60px rgba(139,0,40,0.35), 0 0 120px rgba(100,0,60,0.15), inset 0 0 20px rgba(0,0,0,0.5)",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const cell = board && board[r] ? board[r][c] || null : null;
            const isRevealed = cell?.isRevealed;
            const isFlagged = cell?.isFlagged;
            const isMine = cell?.isMine;
            const exploded = cell?.exploded;
            const count = cell?.neighborCount || 0;
            const isShaking = shakeCell === `${r},${c}`;

            let content = "";
            let bg = "linear-gradient(145deg, #3a1238, #251025)";
            let textColor = "#aaa";
            let shadow =
              "inset 0 1px 2px rgba(60,0,40,0.3), inset 0 -1px 2px rgba(0,0,0,0.4)";
            let cursor = "pointer";

            if (isRevealed) {
              if (isMine) {
                bg = exploded
                  ? "radial-gradient(circle, #660000, #330000)"
                  : "rgba(40,5,10,0.9)";
                content = VAMPIRE_ICONS.mine;
                shadow = exploded ? "0 0 12px rgba(200,0,0,0.5)" : "none";
              } else {
                bg = "rgba(10,2,10,0.7)";
                shadow = "inset 0 1px 3px rgba(0,0,0,0.4)";
                cursor = "default";
                if (count > 0) {
                  content = count;
                  textColor = NUMBER_COLORS[count] || "#ccc";
                }
              }
            } else if (isFlagged) {
              content = VAMPIRE_ICONS.flag;
            }

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={(e) => handleRightClick(e, r, c)}
                onDoubleClick={() => handleDoubleClick(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize:
                    isMine || isFlagged ? cellSize * 0.45 : cellSize * 0.42,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  background: bg,
                  color: textColor,
                  borderRadius: 2,
                  cursor,
                  boxShadow: shadow,
                  transition: "all 0.15s ease",
                  userSelect: "none",
                  position: "relative",
                  WebkitTapHighlightColor: "transparent",
                  animation: isShaking
                    ? "shake 0.4s ease"
                    : exploded
                    ? "explode 0.3s ease"
                    : isRevealed && !isMine
                    ? "reveal 0.2s ease"
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (
                    !isRevealed &&
                    gameState !== "won" &&
                    gameState !== "lost"
                  )
                    e.currentTarget.style.background =
                      "linear-gradient(145deg, #4a1848, #351535)";
                }}
                onMouseLeave={(e) => {
                  if (!isRevealed) e.currentTarget.style.background = bg;
                }}
              >
                {content}
              </div>
            );
          })
        )}
      </div>

      {/* Instructions */}
      <div
        style={{
          zIndex: 2,
          marginTop: 16,
          marginBottom: 24,
          fontSize: 12,
          color: "#5a3060",
          textAlign: "center",
          letterSpacing: 1,
          lineHeight: 1.8,
          padding: "0 16px",
        }}
      >
        {isMobile
          ? "Tap to dig · Switch to Garlic mode to flag · Double-tap number to chord"
          : "Left-click to dig · Right-click to place garlic · Double-click number to chord"}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
        @keyframes explode {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes reveal {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
