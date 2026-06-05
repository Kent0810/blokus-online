# Copilot Instructions

Create a complete web-based multiplayer game inspired by Blokus called "Blockus" with polished UI/UX, smooth animations, matchmaking, turn timer, and production-ready code.

Requirements:

1. Tech Stack
- Frontend: React + TypeScript
- Backend: Node.js + TypeScript
- Real-time multiplayer: WebSocket or Socket.IO
- Database: PostgreSQL or Redis where appropriate
- Styling: modern responsive UI with clean game lobby and board layout
- Deployable with Docker
- Include clear README and setup instructions

2. Core Game Features
- 2 to 4 player online multiplayer
- Matchmaking queue for public games
- Private room creation with invite/join code
- Reconnect support if a player disconnects
- Spectator mode optional but preferred
- Turn-based gameplay with strict server-side validation
- Configurable turn timer
- Auto-skip or fallback behavior when timer expires
- Full rules implementation for a Blokus-like tile placement game:
    - each player has a color
    - each player has a set of polyomino pieces
    - first move starts from assigned board corner
    - pieces of same color may only touch at corners, not edges
    - pieces cannot overlap
    - valid move highlighting on hover or selection
    - rotation and flip controls for pieces
    - scoring and endgame logic
- Game over screen with rankings and rematch option

3. User Experience
- Beautiful landing page
- Matchmaking screen with searching state animation
- Lobby with player slots, ready state, and room code
- Game board with:
    - smooth drag-and-drop or click-to-place interactions
    - animated piece placement
    - hover previews for valid and invalid moves
    - active player highlight
    - visible turn timer
    - player score panel
    - remaining pieces panel
    - subtle sound effects optional
- Responsive design for desktop first, decent tablet support
- Use tasteful animations, not excessive
- Show loading, reconnecting, and error states clearly

4. Matchmaking and Multiplayer
- Build a matchmaking system that pairs players by queue order
- Support 2-player and 4-player modes
- Server authoritative game state
- Prevent cheating through backend move validation
- Handle:
    - disconnects
    - reconnects
    - abandoned matches
    - duplicate actions
    - timeout actions
- Include event flow for:
    - join queue
    - match found
    - room created
    - player ready
    - game start
    - move submitted
    - timer tick
    - turn timeout
    - game end
    - rematch vote

5. Game Logic
- Modular game engine separated from UI
- Clean TypeScript types for board state, pieces, players, moves, timers, and match state
- Utility functions for:
    - rotate piece
    - flip piece
    - collision detection
    - corner-touch validation
    - edge-touch invalidation
    - legal move generation
    - score calculation
- Include unit tests for core game logic

6. AI / Bot Support
- If matchmaking cannot find enough players, optionally fill empty slots with bots
- Bots should make legal moves with simple heuristics
- Bot support should be modular and optional

7. Backend and Architecture
- Organize project as monorepo or clean frontend/backend structure
- Provide scalable architecture
- Include:
    - REST endpoints if needed for rooms/auth
    - WebSocket events for gameplay
    - in-memory or Redis-backed matchmaking queue
    - persistent match results
- Add basic observability:
    - structured logs
    - error handling
    - health endpoint

8. Deliverables
- Full source code
- Folder structure
- README
- Environment variable examples
- Docker setup
- Sample seed or config
- Comments only where helpful, avoid clutter
- No pseudocode; write actual working code

9. Code Quality
- Use clean architecture and reusable components
- Strong TypeScript typing
- Avoid overly complex abstractions
- Production-minded error handling
- Accessible UI where practical

10. Extra Polish
- Add animation for:
    - matchmaking search
    - turn transitions
    - piece placement
    - score updates
    - endgame results
- Add simple background music and SFX hooks if easy to disable
- Add theme variables for easy restyling

Implementation instructions:
- First, output a concise architecture plan
- Then generate the project structure
- Then implement backend core logic
- Then frontend UI
- Then multiplayer integration
- Then tests
- Then README
- Ensure all code is internally consistent
- Do not skip files that are necessary for running the app
- If the response is too long, continue in multiple parts and label each part clearly
