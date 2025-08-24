import { useMemo, useState } from "react";
import "./styles/othello.css";

/**
 * 盤面は 8x8、'B' (Black), 'W' (White), null を格納
 */

const SIZE = 8;
const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const opponentOf = (p) => (p === "B" ? "W" : "B");

function makeInitialBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  board[3][3] = "W";
  board[3][4] = "B";
  board[4][3] = "B";
  board[4][4] = "W";
  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

/**
 * 指し手の合法判定と、裏返る石の座標一覧を返す
 * 戻り値: Map<"r,c", Array<[r,c]>>
 */
function getValidMoves(board, player) {
  const opp = opponentOf(player);
  const moves = new Map();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== null) continue;

      const flipsAllDirs = [];

      for (const [dr, dc] of DIRS) {
        const flips = [];
        let nr = r + dr;
        let nc = c + dc;

        // まず隣が相手色でなければこの方向は不可
        if (!inBoard(nr, nc) || board[nr][nc] !== opp) continue;

        // 相手色が続く限り進める
        while (inBoard(nr, nc) && board[nr][nc] === opp) {
          flips.push([nr, nc]);
          nr += dr;
          nc += dc;
        }

        // 自分色で挟めていれば合法
        if (inBoard(nr, nc) && board[nr][nc] === player && flips.length > 0) {
          flipsAllDirs.push(...flips);
        }
      }

      if (flipsAllDirs.length > 0) {
        moves.set(`${r},${c}`, flipsAllDirs);
      }
    }
  }
  return moves;
}

function inBoard(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function countStones(board) {
  let b = 0,
    w = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === "B") b++;
      else if (cell === "W") w++;
    }
  }
  return { B: b, W: w };
}

export default function App() {
  const [board, setBoard] = useState(makeInitialBoard);
  const [player, setPlayer] = useState("B"); // 先手: 黒
  const [history, setHistory] = useState([
    { board: makeInitialBoard(), player: "B" },
  ]);
  const [lastMove, setLastMove] = useState(null); // [r, c]
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const validMoves = useMemo(
    () => getValidMoves(board, player),
    [board, player]
  );
  const score = useMemo(() => countStones(board), [board]);

  const handlePlace = (r, c) => {
    if (gameOver) return;
    const key = `${r},${c}`;
    if (!validMoves.has(key)) return;

    const flips = validMoves.get(key);
    const next = cloneBoard(board);
    next[r][c] = player;
    for (const [fr, fc] of flips) next[fr][fc] = player;

    const nextPlayer = opponentOf(player);

    // とりあえず手番交代
    setBoard(next);
    setPlayer(nextPlayer);
    setLastMove([r, c]);
    setHistory((h) => [...h, { board: next, player: nextPlayer }]);

    // パス＆ゲーム終了判定
    setTimeout(() => {
      const nextMoves = getValidMoves(next, nextPlayer);
      if (nextMoves.size === 0) {
        const backToCurrentMoves = getValidMoves(next, player);
        if (backToCurrentMoves.size === 0) {
          // 両者打てず → 終局
          setGameOver(true);
          setMessage("Both players have no valid moves. Game Over.");
        } else {
          // 相手が打てないのでパス → 手番は元のプレイヤー継続
          setPlayer(player);
          setMessage(
            `${
              nextPlayer === "B" ? "Black" : "White"
            } has no valid moves. Pass.`
          );
        }
      } else {
        setMessage("");
      }
    }, 0);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHist = history.slice(0, -1);
    const last = newHist[newHist.length - 1];
    setHistory(newHist);
    setBoard(last.board);
    setPlayer(last.player);
    setLastMove(null);
    setGameOver(false);
    setMessage("");
  };

  const handleReset = () => {
    const init = makeInitialBoard();
    setBoard(init);
    setPlayer("B");
    setHistory([{ board: init, player: "B" }]);
    setLastMove(null);
    setGameOver(false);
    setMessage("");
  };

  const gameStatus = gameOver
    ? score.B === score.W
      ? "Draw!"
      : score.B > score.W
      ? "Black wins!"
      : "White wins!"
    : `${player === "B" ? "Black" : "White"}'s turn`;

  return (
    <div className="app-container">
      <header className="game-header">
        <h1 className="title">Othello (Reversi)</h1>
        <div className="status-line" role="status" aria-live="polite">
          <TurnBadge player={player} gameOver={gameOver} />
          <span className="status-text">{gameStatus}</span>
        </div>
        {message && <div className="info-banner">{message}</div>}
      </header>

      <main className="game-main">
        <aside className="side-panel">
          <ScoreCard score={score} />
          <div className="controls">
            <button
              className="btn btn-primary"
              onClick={handleUndo}
              disabled={history.length <= 1}
              aria-label="Undo last move"
            >
              Undo
            </button>
            <button
              className="btn btn-outline"
              onClick={handleReset}
              aria-label="Reset the game"
            >
              Reset
            </button>
          </div>
          <Tips />
        </aside>

        <Board
          board={board}
          validMoves={validMoves}
          onPlace={handlePlace}
          lastMove={lastMove}
        />
      </main>

      <footer className="game-footer">
        <small>
          Made with React.{" "}
          <span className="hint">
            （Bootstrap を使うなら <code>index.js</code> に
            <code>import 'bootstrap/dist/css/bootstrap.min.css'</code> を追加）
          </span>
        </small>
      </footer>
    </div>
  );
}

function Board({ board, validMoves, onPlace, lastMove }) {
  return (
    <div
      className="board"
      role="grid"
      aria-label="Othello board"
      aria-rowcount={SIZE}
      aria-colcount={SIZE}
    >
      {board.map((row, r) => (
        <div className="board-row" role="row" key={r}>
          {row.map((cell, c) => {
            const key = `${r},${c}`;
            const isValid = validMoves.has(key);
            const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;

            return (
              <button
                key={key}
                className={[
                  "cell",
                  isValid ? "cell-valid" : "",
                  isLast ? "cell-last" : "",
                ].join(" ")}
                role="gridcell"
                aria-label={`Row ${r + 1} Column ${c + 1}`}
                onClick={() => onPlace(r, c)}
                disabled={!isValid}
              >
                {cell && <Disc color={cell} />}
                {!cell && isValid && <span className="valid-dot" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Disc({ color }) {
  return (
    <span className={`disc ${color === "B" ? "disc-black" : "disc-white"}`} />
  );
}

function ScoreCard({ score }) {
  return (
    <div className="score-card" aria-label="Score">
      <div className="score-line">
        <span className="stone stone-black" aria-hidden />
        <span>Black</span>
        <strong>{score.B}</strong>
      </div>
      <div className="score-line">
        <span className="stone stone-white" aria-hidden />
        <span>White</span>
        <strong>{score.W}</strong>
      </div>
    </div>
  );
}

function TurnBadge({ player, gameOver }) {
  if (gameOver) return <span className="badge">Game Over</span>;
  return (
    <span className={`badge ${player === "B" ? "badge-black" : "badge-white"}`}>
      {player === "B" ? "Black" : "White"}
    </span>
  );
}

function Tips() {
  return (
    <details className="tips">
      <summary>How to play</summary>
      <ul>
        <li>Legal cells are highlighted. Click to place your disc.</li>
        <li>If the opponent has no valid moves, they pass automatically.</li>
        <li>Both players cannot move → the game ends.</li>
        <li>
          Use <b>Undo</b> or <b>Reset</b> anytime.
        </li>
      </ul>
    </details>
  );
}
