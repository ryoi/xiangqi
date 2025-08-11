# Xiangqi (Chinese Chess) – Web Game

This is my first vibecoding project - A modern web-based implementation of **Xiangqi (Chinese Chess)** with a responsive UI, move logging, captured pieces display, evaluation bar, adaptive AI opponent, and game result overlays.

---

## 🎯 Features
- **Interactive Board** – Click-to-select and move pieces.
- **Adaptive AI** – Adjusts difficulty based on the player’s performance.
- **Opening Book Support** – AI knows standard opening moves.
- **Move Log** – Displays recent moves with newest at the top.
- **Captured Pieces Display** – Tracks captured pieces for both sides.
- **Evaluation Bar** – Shows real-time position evaluation.
- **Game End Overlay** – Displays win/loss/draw details and statistics.
- **Undo & Reset** – Undo your last move or restart the game.
- **Responsive Design** – Works on desktop and mobile devices.

---

## 📂 Project Structure
```
index.html   # Main HTML entry point
style.css    # Game board and UI styling
logic.js     # Xiangqi rules, legal move generation, AI engine
app.js       # React-based UI and game flow logic
```

---

## 🚀 Getting Started

### 1. Clone or Download
```bash
git clone https://github.com/ryoibot@gmail.com/xiangqi-game.git
cd xiangqi-game
```

### 2. Run Locally
Even though the project doesn’t need a backend, you still need to serve it over http:// (or https://) for it to work properly.
```
cd /path/to/gameDirectory
python3 -m http.server 8000
```
Then visit http://localhost:8000


### 3. or Just Access the Game Online
https://ryoi.github.io/xiangqi/

---

## 🎮 How to Play

### Objective
Checkmate your opponent’s **General (King)** by placing it in a position where it cannot escape capture.

### Board Layout
- **9 columns × 10 rows**  
- **River** divides the board horizontally in the middle.
- **Palaces** (3×3 areas) restrict the Generals and Advisors.

### Pieces & Movement
| Piece | Chinese | Moves | Special Rules |
|-------|---------|-------|---------------|
| **General (King)** | 帥 / 將 | 1 step orthogonally within palace | Cannot face opposing General directly without intervening pieces |
| **Advisor (Guard)** | 仕 / 士 | 1 step diagonally within palace | Must stay in palace |
| **Elephant (Bishop)** | 相 / 象 | 2 steps diagonally | Cannot cross the river; blocked if midpoint occupied |
| **Horse (Knight)** | 馬 / 馬 | L-shape (2+1 steps) | Blocked if first orthogonal step is occupied |
| **Chariot (Rook)** | 車 / 車 | Any distance orthogonally | Cannot jump over pieces |
| **Cannon** | 炮 / 砲 | Moves like Rook; to capture, must jump over exactly one piece |
| **Soldier (Pawn)** | 兵 / 卒 | 1 step forward; after crossing river can also move sideways | No backward moves |

---

## 🧠 AI Difficulty
- **Skill Levels**: 1 (easiest) – 6 (hardest)
- **Adaptive Mode**:  
  - If you win, AI becomes stronger.  
  - If AI wins, difficulty decreases slightly.
- Uses **alpha-beta pruning**, **transposition tables**, **killer moves**, and **history heuristics**.

---

## 📜 Game Rules Implemented
- Legal move generation for all pieces
- Check & checkmate detection
- Stalemate detection
- Threefold repetition draw rule
- Opening move book

---

## ⚖ License
This project is licensed under the MIT License.

---

## 🙌 Credits
- UI inspired by **Chess.com** design elements.
- Fonts: [Noto Sans TC](https://fonts.google.com/) & [Zhi Mang Xing](https://fonts.google.com/).
