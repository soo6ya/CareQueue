
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, X, ArrowLeft, ChevronRight } from "lucide-react";
import "./FloatingGames.css";

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");

  const winner = WINNING_COMBINATIONS.find(([a, b, c]) => {
    return board[a] && board[a] === board[b] && board[b] === board[c];
  });

  const winningPlayer = winner ? board[winner[0]] : null;
  const isDraw = !winningPlayer && board.every(Boolean);

  const handleCellClick = (index) => {
    if (board[index] || winningPlayer || isDraw) return;

    const updatedBoard = [...board];
    updatedBoard[index] = currentPlayer;

    setBoard(updatedBoard);
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
  };

  const restartGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
  };

  return (
    <div className="cq-tictactoe">
      <div className="cq-game-status">
        {winningPlayer
          ? `Player ${winningPlayer} wins! 🎉`
          : isDraw
            ? "It's a draw!"
            : `Player ${currentPlayer}'s turn`}
      </div>

      <div className="cq-game-board">
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            className={`cq-game-cell ${
              cell ? `player-${cell.toLowerCase()}` : ""
            }`}
            onClick={() => handleCellClick(index)}
            disabled={Boolean(cell || winningPlayer || isDraw)}
          >
            {cell}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="cq-game-restart"
        onClick={restartGame}
      >
        ↻ Restart Game
      </button>
    </div>
  );
}

// SNAKE GAME

const GRID_SIZE = 15;
const INITIAL_SNAKE = [
  { x: 7, y: 7 },
  { x: 6, y: 7 },
  { x: 5, y: 7 },
];

function createFood(snake) {
  let newFood;

  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (
    snake.some(
      (segment) =>
        segment.x === newFood.x && segment.y === newFood.y
    )
  );

  return newFood;
}

function SnakeGame() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(() => createFood(INITIAL_SNAKE));
  const [direction, setDirection] = useState("RIGHT");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return Number(localStorage.getItem("carequeue-snake-best")) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);

      try {
        localStorage.setItem("carequeue-snake-best", String(score));
      } catch {
        // Continue playing if storage is unavailable.
      }
    }
  }, [score, bestScore]);

  const changeDirection = (nextDirection) => {
    const oppositeDirections = {
      UP: "DOWN",
      DOWN: "UP",
      LEFT: "RIGHT",
      RIGHT: "LEFT",
    };

    if (oppositeDirections[direction] === nextDirection) return;

    if (!gameOver) setDirection(nextDirection);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const keyDirections = {
        ArrowUp: "UP",
        w: "UP",
        W: "UP",
        ArrowDown: "DOWN",
        s: "DOWN",
        S: "DOWN",
        ArrowLeft: "LEFT",
        a: "LEFT",
        A: "LEFT",
        ArrowRight: "RIGHT",
        d: "RIGHT",
        D: "RIGHT",
      };

      const nextDirection = keyDirections[event.key];

      if (nextDirection) {
        event.preventDefault();
        changeDirection(nextDirection);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, gameOver]);

  useEffect(() => {
    if (gameOver) return;

    const moveTimer = setTimeout(() => {
      const movements = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 },
      };

      const movement = movements[direction];

      const newHead = {
        x: snake[0].x + movement.x,
        y: snake[0].y + movement.y,
      };

      const ateFood = newHead.x === food.x && newHead.y === food.y;
      const bodyToCheck = ateFood ? snake : snake.slice(0, -1);

      const hitWall =
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE;

      const hitBody = bodyToCheck.some(
        (segment) => segment.x === newHead.x && segment.y === newHead.y
      );

      if (hitWall || hitBody) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...snake];

      if (!ateFood) {
        newSnake.pop();
      } else {
        setScore((previous) => previous + 10);
        setFood(createFood(newSnake));
      }

      setSnake(newSnake);
    }, 150);

    return () => clearTimeout(moveTimer);
  }, [snake, direction, food, gameOver]);

  const restartGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(createFood(INITIAL_SNAKE));
    setDirection("RIGHT");
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="cq-snake-game">
      <div className="cq-snake-scores">
        <div><span>SCORE</span><strong>{score}</strong></div>
        <div><span>BEST</span><strong>{bestScore}</strong></div>
      </div>

      <div className="cq-snake-board" role="img" aria-label="Snake game board">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);

          const isHead = snake[0].x === x && snake[0].y === y;
          const isSnake = snake.some(
            (segment) => segment.x === x && segment.y === y
          );
          const isFood = food.x === x && food.y === y;

          return (
            <div
              key={index}
              className={[
                "cq-snake-cell",
                isSnake ? "snake-body" : "",
                isHead ? "snake-head" : "",
                isFood ? "snake-food" : "",
              ].join(" ")}
            >
              {isFood ? "●" : ""}
            </div>
          );
        })}

        {gameOver && (
          <div className="cq-snake-gameover">
            <strong>Game Over!</strong>
            <span>Your score: {score}</span>
          </div>
        )}
      </div>

      <p className="cq-snake-instructions">
        Use arrow keys or buttons to move
      </p>

      <div className="cq-snake-controls">
        <button type="button" onClick={() => changeDirection("UP")}>↑</button>
        <div>
          <button type="button" onClick={() => changeDirection("LEFT")}>←</button>
          <button type="button" onClick={() => changeDirection("DOWN")}>↓</button>
          <button type="button" onClick={() => changeDirection("RIGHT")}>→</button>
        </div>
      </div>

      <button className="cq-game-restart" type="button" onClick={restartGame}>
        ↻ Restart Snake
      </button>
    </div>
  );
}

// MEMORY CARD MATCH

const MEMORY_EMOJIS = [
  "🐶", "🐱", "🦁", "🐼",
  "🐸", "🐵", "🦊", "🐰",
];

function createMemoryCards() {
  return [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
    .map((emoji, index) => ({
      id: index,
      emoji,
    }))
    .sort(() => Math.random() - 0.5);
}

function MemoryGame() {
  const [cards, setCards] = useState(createMemoryCards);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const completed = matchedCards.length === 16;

  useEffect(() => {
    if (!gameStarted || completed) return;

    const timer = setInterval(() => {
      setSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, completed]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;

    const [firstId, secondId] = flippedCards;

    if (cards[firstId].emoji === cards[secondId].emoji) {
      const timer = setTimeout(() => {
        setMatchedCards((previous) => [
          ...previous,
          firstId,
          secondId,
        ]);
        setFlippedCards([]);
      }, 350);

      return () => clearTimeout(timer);
    }

    setIsLocked(true);

    const timer = setTimeout(() => {
      setFlippedCards([]);
      setIsLocked(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [flippedCards, cards]);

  const flipCard = (index) => {
    if (
      isLocked ||
      flippedCards.includes(index) ||
      matchedCards.includes(index) ||
      completed
    ) {
      return;
    }

    if (!gameStarted) setGameStarted(true);

    const updatedFlipped = [...flippedCards, index];
    setFlippedCards(updatedFlipped);

    if (updatedFlipped.length === 2) {
      setMoves((previous) => previous + 1);
    }
  };

  const restartGame = () => {
    setCards(createMemoryCards());
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setSeconds(0);
    setIsLocked(false);
    setGameStarted(false);
  };

  const formattedTime = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return (
    <div className="cq-memory-game">
      <div className="cq-memory-stats">
        <div><span>MOVES</span><strong>{moves}</strong></div>
        <div><span>TIME</span><strong>{formattedTime}</strong></div>
        <div><span>PAIRS</span><strong>{matchedCards.length / 2}/8</strong></div>
      </div>

      {completed && (
        <div className="cq-memory-victory">
          🎉 Congratulations! You matched all pairs!
        </div>
      )}

      <div className="cq-memory-board">
        {cards.map((card, index) => {
          const isRevealed =
            flippedCards.includes(index) || matchedCards.includes(index);

          return (
            <button
              type="button"
              key={card.id}
              className={[
                "cq-memory-card",
                isRevealed ? "revealed" : "",
                matchedCards.includes(index) ? "matched" : "",
              ].join(" ")}
              onClick={() => flipCard(index)}
              disabled={isRevealed || isLocked || completed}
              aria-label={isRevealed ? card.emoji : "Hidden memory card"}
            >
              {isRevealed ? card.emoji : "?"}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="cq-game-restart"
        onClick={restartGame}
      >
        ↻ Restart Memory Game
      </button>
    </div>
  );
}

// FLOATING GAMES PANEL

function FloatingGames() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const closeGames = () => {
    setIsOpen(false);
    setSelectedGame(null);
  };

  const goBack = () => setSelectedGame(null);

  return createPortal((
    <div className="cq-floating-games">
      {isOpen && (
        <div className="cq-games-panel">
          <div className="cq-games-header">
            <div>
              <h3>CareQueue Games</h3>
              <p>Enjoy while you wait!</p>
            </div>

            <button
              type="button"
              className="cq-games-close"
              onClick={closeGames}
              aria-label="Close games"
            >
              <X size={18} />
            </button>
          </div>

          {!selectedGame ? (
            <div className="cq-games-content">
              <h4>Choose a game</h4>

              <button
                type="button"
                className="cq-game-option"
                onClick={() => setSelectedGame("tictactoe")}
              >
                <span className="cq-game-option-icon">⭕</span>
                <span>
                  <strong>Tic-Tac-Toe</strong>
                  <small>Play with a friend</small>
                </span>
                <span className="cq-game-arrow"><ChevronRight size={18} /></span>
              </button>

              <button
                type="button"
                className="cq-game-option"
                onClick={() => setSelectedGame("snake")}
              >
                <span className="cq-game-option-icon">🐍</span>
                <span>
                  <strong>Snake Game</strong>
                  <small>Collect food and grow</small>
                </span>
                <span className="cq-game-arrow"><ChevronRight size={18} /></span>
              </button>

              <button
                type="button"
                className="cq-game-option"
                onClick={() => setSelectedGame("memory")}
              >
                <span className="cq-game-option-icon">🧠</span>
                <span>
                  <strong>Memory Match</strong>
                  <small>Find all matching pairs</small>
                </span>
                <span className="cq-game-arrow"><ChevronRight size={18} /></span>
              </button>

              <p className="cq-games-note">
                Your queue position will not be affected by playing games.
              </p>
            </div>
          ) : (
            <div className="cq-games-content">
              <button
                type="button"
                className="cq-games-back"
                onClick={goBack}
              >
                <ArrowLeft size={15} /> Back to Games
              </button>

              {selectedGame === "tictactoe" && (
                <>
                  <h4>Tic-Tac-Toe</h4>
                  <TicTacToe />
                </>
              )}

              {selectedGame === "snake" && (
                <>
                  <h4>Snake Game 🐍</h4>
                  <SnakeGame />
                </>
              )}

              {selectedGame === "memory" && (
                <>
                  <h4>Memory Match 🧠</h4>
                  <MemoryGame />
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={`cq-floating-game-button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close games panel" : "Open games panel"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={25} /> : <Gamepad2 size={25} strokeWidth={2.1} />}
      </button>
    </div>
  ), document.body);
}

export default FloatingGames;
