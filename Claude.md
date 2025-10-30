# Don't Close This - Project Context

## Game Concept

"Don't Close This" is a browser-based challenge game where players must avoid closing the tab by solving increasingly difficult puzzles across 10 levels. The core mechanic plays on the tension between wanting to close a tab and being forced to keep it open to progress.

## Current Implementation

The game currently has 10 levels with various challenge types:
1. **Welcome** - Introduction explaining the tab-closing mechanic
2. **Simple YES/NO** - Basic button choice
3. **Many Buttons Timer** - Find "YES" among many "NO" buttons within 3 seconds, all same color
4. **Position vs Label** - 10 numbered buttons shuffled, click by position not label (e.g., "Click the SEVENTH button" when it says "Button 3")
5. **Traffic Light** - Random color cycling with random speed, click when the target color appears
6. **Hard Math** - Addition or subtraction with numbers 10-50, 6 answer options
7. **Reverse Psychology** - Player must click "NO" instead of "YES"
8. **Alphabetical Sequence** - Click buttons A→B→C→D→E in order
9. **Button Swap** - Buttons change position/text after hover
10. **Pattern Memory** - Remember 5-character pattern, choose correct one from confusing options

## Technical Details

**Architecture:**
- Vanilla JavaScript with no frameworks
- Biome for linting and formatting
- localStorage for game state persistence and high scores
- Separate meta panel showing level and elapsed time
- Interval cleanup system to prevent memory leaks
- Debug mode via URL parameters (e.g., `game.html?level=5`)

**Files:**
- `game.js` - Main game logic (~625 lines)
- `index.js` - Landing page and high scores (~210 lines)
- `game.html` - Game page structure
- `index.html` - Landing page structure
- `styles.css` - All styling with vendor prefixes
- `biome.json` - Linter configuration
- `package.json` - NPM dependencies

## Future Level Ideas

### Confirmed Ideas for Implementation:
- **3 Cup Monte** - YES hidden behind a div that moves around randomly
- **Distance Guesser** - Estimate distance between two cities
- **Current Events API** - Questions based on https://en.wikipedia.org/wiki/Portal:Current_events
- **Tetris** - Complete a Tetris game to reveal YES button
- **Pentagram Drawing** - Draw a pentagram to some accuracy level
- **Precise Timing** - Click YES at exact moment (e.g., between 10-12 seconds)
- **Minesweeper** - Complete minesweeper puzzle to reveal YES
- **Bad Chess Puzzle** - Solve chess puzzle with absurd positions (5 knights)
- **Tripwire Maze** - Navigate mouse through maze without touching edges
- **Multilingual YES** - Pick correct "yes" from many languages
- **Guess the Song** - Identify song from 5-second clip
- **Dog Breed API** - "Is this a Labrador?" with dog images

### API Resources:
- https://dev.to/onlyoneerin/38-awesome-apis-to-inspire-your-next-software-project-4395
- https://github.com/cheatsnake/emojihub

## Future Features

### Planned Enhancements:
- **Speedrun Timer** - Track completion time for competitive play (partially implemented)
- **Real Leaderboard** - Backend database using Cloudflare for persistent global scores
- **Analytics** - Track player behavior, failure rates per level, completion statistics

## Design Philosophy

The game balances:
- **Frustration vs Fun** - Challenges should be difficult but fair
- **Variety** - Each level uses different mechanics (memory, timing, puzzle-solving, dexterity)
- **Progression** - Difficulty increases but remains accessible
- **Humor** - Reverse psychology and absurd challenges add personality
- **Polish** - Clean UI, proper error handling, mobile support

## Victory Condition

Completing all 10 levels closes the tab and displays a victory message on the index page showing completion time. High scores track level reached and time elapsed, sorted by highest level first, then fastest time.
