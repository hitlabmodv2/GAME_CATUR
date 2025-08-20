class ChessGame {
    constructor() {
        this.engine = new ChessEngine();
        this.boardElement = document.getElementById('chessBoard');
        this.gameLog = document.getElementById('gameLog');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.whiteTimer = document.getElementById('whiteTimer');
        this.blackTimer = document.getElementById('blackTimer');

        this.timers = {
            white: 600, // 10 minutes
            black: 600
        };
        this.timerInterval = null;
        this.isPaused = false;
        this.botThinking = false;
        this.isUIBusy = false; // Untuk mengontrol update UI

        this.selectedGameMode = null;
        this.selectedDifficulty = null;

        // Uptime monitoring
        this.uptimeStartTime = Date.now();
        this.uptimeInterval = null;
        this.sessionStartTime = Date.now();

        // Game statistics - inisialisasi di awal
        this.gameStats = {
            white: {
                captured: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 },
                totalValue: 0,
                wins: 0,
                losses: 0,
                moveQuality: {
                    brilliant: 0,
                    great: 0,
                    best: 0,
                    mistake: 0,
                    miss: 0,
                    blunder: 0
                }
            },
            black: {
                captured: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 },
                totalValue: 0,
                wins: 0,
                losses: 0,
                moveQuality: {
                    brilliant: 0,
                    great: 0,
                    best: 0,
                    mistake: 0,
                    miss: 0,
                    blunder: 0
                }
            }
        };

        this.totalGames = 0;
        this.predictionAccuracy = { white: 0, black: 0 };



        // Tournament system dengan maksimal 5 round
        this.tournamentSettings = {
            totalRounds: 3,
            currentRound: 1,
            roundWins: { white: 0, black: 0 },
            drawCount: 0,
            autoStart: false
        };

        this.setupWelcomeScreen();
        this.setupEventListeners();
        this.updateLogCounter();

        // Load saved theme on startup
        this.loadSavedTheme();
    }

    setupWelcomeScreen() {
        const modeCards = document.querySelectorAll('.mode-card');
        const difficultySelection = document.getElementById('difficultySelection');
        const botVsBotSettings = document.getElementById('botVsBotSettings');
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        const startBtn = document.getElementById('startGameFromWelcome');

        // Load saved settings
        this.loadSavedSettings();

        // Update difficulty options untuk bot vs bot yang lebih balanced
        this.updateDifficultyOptions();

        // Initialize engine speed
        if (this.engine) {
            this.engine.botSpeed = 1500; // 1.5 second default
        }

        // Initialize speed guide as collapsed by default
        const speedGuideContent = document.querySelector('.speed-guide-content');
        if (speedGuideContent) {
            speedGuideContent.classList.add('collapsed');
        }

        // Setup speed card selection system
        const speedCards = document.querySelectorAll('.speed-card');
        const speedInput = document.getElementById('gameSpeed');
        const speedValueDisplay = document.getElementById('gameSpeedValue');

        if (speedCards.length > 0 && speedInput && speedValueDisplay) {
            // Handle speed card selection
            speedCards.forEach(card => {
                card.addEventListener('click', () => {
                    // Remove selected class from all cards
                    speedCards.forEach(c => c.classList.remove('selected'));

                    // Add selected class to clicked card
                    card.classList.add('selected');

                    // Get speed value
                    const speed = parseFloat(card.dataset.speed);
                    const speedName = card.dataset.name;

                    // Update hidden input
                    speedInput.value = speed;

                    // Update engine speed
                    if (this.engine) {
                        this.engine.botSpeed = speed * 1000;
                        console.log(`Speed updated to: ${speed}s (${this.engine.botSpeed}ms)`);
                    }

                    // Save speed setting
                    localStorage.setItem('chessGameSpeed', speed.toString());

                    // Update display
                    const speedNameMap = {
                        'ultra': '⚡⚡ Ultra Kilat',
                        'lightning': '⚡ Kilat',
                        'fast': '🚀 Cepat',
                        'normal': '⭐ Normal',
                        'slow': '🐌 Lambat',
                        'turtle': '🐢 Kura-kura'
                    };

                    speedValueDisplay.textContent = `${speedNameMap[speedName]} (${speed}s)`;

                    // Add selection animation
                    card.style.transform = 'translateY(-5px) scale(1.05)';
                    setTimeout(() => {
                        card.style.transform = '';
                    }, 200);
                });
            });

            // Load saved speed setting and select appropriate card
            const savedSpeed = localStorage.getItem('chessGameSpeed');
            if (savedSpeed) {
                const speedValue = parseFloat(savedSpeed);
                speedInput.value = speedValue;

                if (this.engine) {
                    this.engine.botSpeed = speedValue * 1000;
                }

                // Find and select the closest speed card
                let closestCard = null;
                let closestDiff = Infinity;

                speedCards.forEach(card => {
                    const cardSpeed = parseFloat(card.dataset.speed);
                    const diff = Math.abs(cardSpeed - speedValue);
                    if (diff < closestDiff) {
                        closestDiff = diff;
                        closestCard = card;
                    }
                });

                if (closestCard) {
                    speedCards.forEach(c => c.classList.remove('selected'));
                    closestCard.classList.add('selected');

                    const speedName = closestCard.dataset.name;
                    const speedNameMap = {
                        'ultra': '⚡⚡ Ultra Kilat',
                        'lightning': '⚡ Kilat',
                        'fast': '🚀 Cepat',
                        'normal': '⭐ Normal',
                        'slow': '🐌 Lambat',
                        'turtle': '🐢 Kura-kura'
                    };
                    speedValueDisplay.textContent = `${speedNameMap[speedName]} (${speedValue}s)`;
                }
            }
        }

        // Handle mode selection
        modeCards.forEach(card => {
            card.addEventListener('click', () => {
                modeCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedGameMode = card.dataset.mode;

                if (this.selectedGameMode === 'player-vs-bot') {
                    difficultySelection.style.display = 'block';
                    botVsBotSettings.style.display = 'none';
                    document.getElementById('tutorialSettings').style.display = 'none';
                    this.selectedDifficulty = document.getElementById('playerDifficulty').value;
                    startBtn.disabled = false;
                } else if (this.selectedGameMode === 'bot-vs-bot') {
                    difficultySelection.style.display = 'none';
                    botVsBotSettings.style.display = 'block';
                    document.getElementById('tutorialSettings').style.display = 'none';
                    this.selectedDifficulty = 'medium'; // Default for bot vs bot
                    startBtn.disabled = false;
                } else if (this.selectedGameMode === 'tutorial') {
                    difficultySelection.style.display = 'none';
                    botVsBotSettings.style.display = 'none';
                    document.getElementById('tutorialSettings').style.display = 'block';
                    this.selectedDifficulty = 'easy'; // Tutorial uses easy AI
                    startBtn.disabled = false;
                }
            });
        });

        // Handle player vs bot settings
        const playerDifficultySelect = document.getElementById('playerDifficulty');
        const resetPlayerBtn = document.getElementById('resetPlayerSettings');
        const savePlayerBtn = document.getElementById('savePlayerSettings');
        const playerTotalRoundsSelect = document.getElementById('playerTotalRounds'); // Added for player vs bot tournament

        playerDifficultySelect.addEventListener('change', () => {
            this.selectedDifficulty = playerDifficultySelect.value;
            startBtn.disabled = false;
        });

        // Handle player total rounds selection
        playerTotalRoundsSelect.addEventListener('change', () => {
            this.tournamentSettings.totalRounds = parseInt(playerTotalRoundsSelect.value);
        });

        resetPlayerBtn.addEventListener('click', () => {
            this.resetPlayerSettings();
        });

        savePlayerBtn.addEventListener('click', () => {
            this.savePlayerSettings();
        });

        // Handle bot vs bot settings
        const resetBtn = document.getElementById('resetToDefault');
        const saveBtn = document.getElementById('saveSettings');
        const totalRoundsSelect = document.getElementById('totalRounds');

        resetBtn.addEventListener('click', () => {
            this.resetToDefaultSettings();
        });

        saveBtn.addEventListener('click', () => {
            this.saveCurrentSettings();
        });

        // Handle start game
        startBtn.addEventListener('click', () => {
            if (this.selectedGameMode === 'player-vs-bot') {
                this.engine.gameMode = this.selectedGameMode;
                this.engine.difficulty = document.getElementById('playerDifficulty').value;
                const selectedRounds = parseInt(document.getElementById('playerTotalRounds').value);
                this.tournamentSettings.totalRounds = Math.min(Math.max(selectedRounds, 1), 5); // Batasi maksimal 5 round
                this.startGameFromWelcome();
            } else if (this.selectedGameMode === 'bot-vs-bot') {
                this.engine.gameMode = this.selectedGameMode;
                this.engine.botWhiteDifficulty = document.getElementById('botWhiteDifficulty').value;
                this.engine.botBlackDifficulty = document.getElementById('botBlackDifficulty').value;
                this.engine.botSpeed = parseFloat(document.getElementById('gameSpeed').value || '1') * 1000;
                const selectedRounds = parseInt(document.getElementById('totalRounds').value);
                this.tournamentSettings.totalRounds = Math.min(Math.max(selectedRounds, 1), 5); // Batasi maksimal 5 round
                this.startGameFromWelcome();
            } else if (this.selectedGameMode === 'tutorial') {
                this.startTutorialMode();
            }
        });
    }

    updateDifficultyOptions() {
        // Update semua select difficulty dengan level yang lebih bervariasi
        const difficultySelects = [
            'botWhiteDifficulty', 'botBlackDifficulty', 'playerDifficulty'
        ];

        const difficultyOptions = `
            <option value="noob">🤪 Pemula Banget</option>
            <option value="easy">🤠 Mudah</option>
            <option value="medium">⚡ Sedang</option>
            <option value="hard">💀 Sulit</option>
            <option value="expert">🏆 Ahli</option>
            <option value="master">👑 Master</option>
            <option value="grandmaster">🔥 Grandmaster</option>
        `;

        difficultySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value || 'medium';
                select.innerHTML = difficultyOptions;
                select.value = currentValue;
            }
        });
    }

    loadSavedSettings() {
        const savedSettings = localStorage.getItem('chessGameSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            document.getElementById('botWhiteDifficulty').value = settings.botWhiteDifficulty || 'medium';
            document.getElementById('botBlackDifficulty').value = settings.botBlackDifficulty || 'hard'; // Buat default yang berbeda
            document.getElementById('gameSpeed').value = settings.gameSpeed || '1';
            document.getElementById('totalRounds').value = settings.totalRounds || '3';
        } else {
            // Set defaults dengan level yang berbeda untuk balancing
            document.getElementById('botWhiteDifficulty').value = 'medium';
            document.getElementById('botBlackDifficulty').value = 'hard'; // Default berbeda
            document.getElementById('gameSpeed').value = '1.5'; // Default normal speed
        }

        const savedPlayerSettings = localStorage.getItem('chessPlayerSettings');
        if (savedPlayerSettings) {
            const playerSettings = JSON.parse(savedPlayerSettings);
            document.getElementById('playerDifficulty').value = playerSettings.difficulty || 'medium';
            document.getElementById('playerTotalRounds').value = playerSettings.totalRounds || '1';
        } else {
            document.getElementById('playerDifficulty').value = 'medium';
            document.getElementById('playerTotalRounds').value = '1'; // Default 1 round
        }
    }

    saveCurrentSettings() {
        const settings = {
            botWhiteDifficulty: document.getElementById('botWhiteDifficulty').value,
            botBlackDifficulty: document.getElementById('botBlackDifficulty').value,
            gameSpeed: document.getElementById('gameSpeed').value,
            totalRounds: document.getElementById('totalRounds').value
        };

        localStorage.setItem('chessGameSettings', JSON.stringify(settings));

        // Visual feedback
        const saveBtn = document.getElementById('saveSettings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Tersimpan!';
        saveBtn.classList.add('setting-saved');

        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('setting-saved');
        }, 2000);
    }

    resetToDefaultSettings() {
        document.getElementById('botWhiteDifficulty').value = 'medium';
        document.getElementById('botBlackDifficulty').value = 'medium';
        document.getElementById('gameSpeed').value = '1.5';
        document.getElementById('totalRounds').value = '3';

        // Clear saved settings
        localStorage.removeItem('chessGameSettings');

        // Visual feedback
        const resetBtn = document.getElementById('resetToDefault');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = '✅ Reset!';
        resetBtn.classList.add('setting-saved');

        setTimeout(() => {
            resetBtn.textContent = originalText;
            resetBtn.classList.remove('setting-saved');
        }, 2000);
    }

    savePlayerSettings() {
        const playerSettings = {
            difficulty: document.getElementById('playerDifficulty').value,
            totalRounds: document.getElementById('playerTotalRounds').value // Save rounds for player vs bot
        };

        localStorage.setItem('chessPlayerSettings', JSON.stringify(playerSettings));

        // Visual feedback
        const saveBtn = document.getElementById('savePlayerSettings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Tersimpan!';
        saveBtn.classList.add('setting-saved');

        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('setting-saved');
        }, 2000);
    }

    resetPlayerSettings() {
        document.getElementById('playerDifficulty').value = 'medium';
        document.getElementById('playerTotalRounds').value = '1'; // Reset ke 1 round untuk player vs bot

        // Clear saved settings
        localStorage.removeItem('chessPlayerSettings');

        // Visual feedback
        const resetBtn = document.getElementById('resetPlayerSettings');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = '✅ Reset!';
        resetBtn.classList.add('setting-saved');

        setTimeout(() => {
            resetBtn.textContent = originalText;
            resetBtn.classList.remove('setting-saved');
        }, 2000);
    }

    startGameFromWelcome() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';

        // Hide settings button for bot vs bot mode
        const settingsBtn = document.getElementById('settingsBtn');
        if (this.engine.gameMode === 'bot-vs-bot') {
            settingsBtn.style.display = 'none';
        } else {
            settingsBtn.style.display = 'inline-block';
        }

        this.initializeGame();
    }

    initializeGame() {
        this.resetGameStats();
        this.resetTournamentIfNeeded();

        // Implement fair turn alternation system
        this.setupFairTurnSystem();

        this.createBoard();
        this.updateBoard();
        this.updateGameInfo();
        this.updateTournamentDisplay();

        // Ensure engine is properly reset
        this.engine.gameStatus = 'playing';
        this.engine.gameEnded = false;

        if (this.engine.gameMode === 'bot-vs-bot') {
            this.logMove(`🎮 Game dimulai! Mode: ${this.engine.gameMode}`);
            this.logMove(`🤖 Alpha-Bot (${this.engine.botWhiteDifficulty}) vs Beta-Bot (${this.engine.botBlackDifficulty})`);
            this.logMove(`⚡ Kecepatan Game: ${this.engine.botSpeed / 1000}s per langkah`);
            this.logMove(`🎲 Giliran pertama: ${this.engine.currentPlayer === 'white' ? 'Alpha-Bot (Putih)' : 'Beta-Bot (Hitam)'}`);
        } else {
            this.logMove(`🎮 Game dimulai! Mode: ${this.engine.gameMode}, Kesulitan: ${this.engine.difficulty}`);
            this.logMove(`🎲 Giliran pertama: ${this.engine.currentPlayer === 'white' ? 'Anda (Putih)' : 'Bot (Hitam)'}`);
        }

        this.updateGameStats();
        this.startTimer();

        // Start bot moves based on game mode with better initialization
        if (this.engine.gameMode === 'bot-vs-bot') {
            this.logMove("Mode Bot vs Bot - Game otomatis dimulai...");
            this.botThinking = false; // Ensure bot is not stuck thinking
            this.isPaused = false; // Ensure game is not paused

            // Start first bot move with proper delay
            setTimeout(() => {
                console.log('Starting bot vs bot game...');
                if (!this.isPaused && !this.botThinking && !this.engine.isGameOver()) {
                    this.makeBotMove();
                } else {
                    console.log('Bot move blocked:', {
                        isPaused: this.isPaused,
                        botThinking: this.botThinking,
                        isGameOver: this.engine.isGameOver()
                    });
                }
            }, Math.max(500, Math.min(this.engine.botSpeed, 1000)));
        } else if (this.engine.gameMode === 'player-vs-bot') {
            // Check if bot should start first
            if (this.engine.currentPlayer === 'black') {
                this.logMove("Mode Player vs Bot - Bot bermain sebagai putih (mulai duluan), Anda sebagai hitam.");
                setTimeout(() => this.makeBotMove(), 1000);
            } else {
                this.logMove("Mode Player vs Bot - Anda bermain sebagai putih (mulai duluan), bot sebagai hitam.");
            }
        }
    }

    setupFairTurnSystem() {
        // Initialize turn counter if not exists
        if (!this.turnCounter) {
            this.turnCounter = {
                totalGames: 0,
                whiteStarts: 0,
                blackStarts: 0
            };
        }

        // PERBAIKAN: Selalu mulai dengan putih untuk konsistensi
        // Set starting player selalu putih
        this.engine.currentPlayer = 'white';

        // Update counters
        this.turnCounter.totalGames++;
        this.turnCounter.whiteStarts++;

        console.log('Turn system fixed:', {
            currentGame: this.turnCounter.totalGames,
            whiteStarts: this.turnCounter.whiteStarts,
            blackStarts: this.turnCounter.blackStarts,
            startingPlayer: this.engine.currentPlayer
        });
    }

    createBoard() {
        this.boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                square.addEventListener('click', () => this.handleSquareClick(row, col));

                this.boardElement.appendChild(square);
            }
        }
    }

    updateBoard() {
        // Optimasi: Use fragment untuk batch DOM updates
        const squares = this.boardElement.children;
        const changedSquares = [];

        // Cari square yang berubah saja
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const squareIndex = row * 8 + col;
                const square = squares[squareIndex];
                const piece = this.engine.board[row][col];
                const newSymbol = this.engine.getPieceSymbol(piece);

                // Update hanya jika berubah
                if (square.textContent !== newSymbol) {
                    square.textContent = newSymbol;
                    changedSquares.push(square);
                }

                // Clear semua class styling dulu
                square.classList.remove('selected', 'valid-move', 'last-move', 'in-check');

                // Highlight king if in check
                if (piece && piece.type === 'king' && this.engine.isInCheck(piece.color)) {
                    square.classList.add('in-check');
                }
            }
        }

        // Highlight last move - optimasi dengan caching
        if (this.engine.gameHistory.length > 0) {
            const lastMove = this.engine.gameHistory[this.engine.gameHistory.length - 1];
            const fromSquare = this.getSquareElement(lastMove.from.row, lastMove.from.col);
            const toSquare = this.getSquareElement(lastMove.to.row, lastMove.to.col);

            if (fromSquare) fromSquare.classList.add('last-move');
            if (toSquare) toSquare.classList.add('last-move');
        }
    }

    handleSquareClick(row, col) {
        if (this.isPaused || this.botThinking) return;

        // Prevent clicks in bot vs bot mode
        if (this.engine.gameMode === 'bot-vs-bot') {
            return;
        }

        const piece = this.engine.board[row][col];

        if (this.engine.selectedSquare) {
            const fromRow = this.engine.selectedSquare.row;
            const fromCol = this.engine.selectedSquare.col;

            if (fromRow === row && fromCol === col) {
                // Deselect
                this.engine.selectedSquare = null;
                this.updateBoard();
                return;
            }

            if (this.engine.isValidMove(fromRow, fromCol, row, col)) {
                this.makePlayerMove(fromRow, fromCol, row, col);
            } else {
                // Select new piece if it belongs to current player
                if (piece && piece.color === this.engine.currentPlayer && this.canPlayerControl(piece.color)) {
                    this.selectSquare(row, col);
                } else {
                    this.engine.selectedSquare = null;
                    this.updateBoard();
                }
            }
        } else {
            // Select piece if it belongs to current player and player can control it
            if (piece && piece.color === this.engine.currentPlayer && this.canPlayerControl(piece.color)) {
                this.selectSquare(row, col);
            }
        }
    }

    canPlayerControl(color) {
        if (this.engine.gameMode === 'bot-vs-bot') {
            return false;
        } else if (this.engine.gameMode === 'player-vs-bot') {
            return color === 'white';
        }
        return true;
    }

    selectSquare(row, col) {
        this.engine.selectedSquare = { row, col };
        this.updateBoard();

        // Highlight selected square
        const square = this.getSquareElement(row, col);
        square.classList.add('selected');

        // Highlight valid moves
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (this.engine.isValidMove(row, col, toRow, toCol)) {
                    const targetSquare = this.getSquareElement(toRow, toCol);
                    targetSquare.classList.add('valid-move');
                }
            }
        }
    }

    makePlayerMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.engine.board[fromRow][fromCol];

        // Check if pawn promotion is needed
        if (piece.type === 'pawn' &&
            ((piece.color === 'white' && toRow === 0) || (piece.color === 'black' && toRow === 7))) {
            this.showPromotionDialog(fromRow, fromCol, toRow, toCol);
            return;
        }

        const move = this.engine.makeMove(fromRow, fromCol, toRow, toCol);
        this.engine.selectedSquare = null;

        this.completePlayerMove(move, toRow, toCol);
    }

    showPromotionDialog(fromRow, fromCol, toRow, toCol) {
        const overlay = document.createElement('div');
        overlay.className = 'promotion-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'promotion-dialog';

        const piece = this.engine.board[fromRow][fromCol];
        const isWhite = piece.color === 'white';

        dialog.innerHTML = `
            <h3>🎉 Promosi Pion!</h3>
            <p>Pilih bidak untuk promosi pion Anda:</p>
            <div class="promotion-pieces">
                <button class="promotion-btn" data-piece="queen">
                    ${isWhite ? '♕' : '♛'} Ratu
                </button>
                <button class="promotion-btn" data-piece="rook">
                    ${isWhite ? '♖' : '♜'} Benteng
                </button>
                <button class="promotion-btn" data-piece="bishop">
                    ${isWhite ? '♗' : '♝'} Gajah
                </button>
                <button class="promotion-btn" data-piece="knight">
                    ${isWhite ? '♘' : '♞'} Kuda
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Add event listeners
        const buttons = dialog.querySelectorAll('.promotion-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const promotionPiece = btn.dataset.piece;
                overlay.remove();

                const move = this.engine.makeMove(fromRow, fromCol, toRow, toCol, promotionPiece);
                this.engine.selectedSquare = null;

                this.completePlayerMove(move, toRow, toCol);
            });
        });
    }

    completePlayerMove(move, toRow, toCol) {
        // Track captures
        if (move.captured) {
            this.trackCapture(move);
        }

        // Evaluate move quality
        this.evaluateMoveQuality(move);

        this.updateBoard();
        this.updateGameInfo();
        this.logMove(this.formatMove(move));

        // Force update inline stats after each move
        setTimeout(() => {
            this.updateInlineStats();
        }, 100);

        // Add animation
        const targetSquare = this.getSquareElement(toRow, toCol);
        targetSquare.classList.add('piece-moving');
        setTimeout(() => targetSquare.classList.remove('piece-moving'), 300);

        // Check for game end - check if current player has no valid moves
        const currentPlayerMoves = this.engine.getAllValidMoves(this.engine.currentPlayer);
        if (currentPlayerMoves.length === 0) {
            this.endGame();
            return;
        }

        if (this.engine.isGameOver()) {
            this.endGame();
            return;
        }

        // Trigger bot move in player vs bot mode
        if (this.engine.gameMode === 'player-vs-bot' && this.engine.currentPlayer === 'black') {
            setTimeout(() => this.makeBotMove(), Math.min(this.engine.botSpeed * 0.4, 400));
        }
    }

    makeBotMove() {
        // Advanced anti-stuck system dengan multiple checks
        if (this.botThinking) {
            console.warn('Bot is already thinking, skipping move');
            return;
        }

        if (this.isPaused) {
            console.log('Game is paused, skipping bot move');
            return;
        }

        // Check for game end before starting
        const availableMoves = this.engine.getAllValidMoves(this.engine.currentPlayer);
        if (availableMoves.length === 0 || this.engine.isGameOver()) {
            console.log('No moves available or game over, ending game');
            this.endGame();
            return;
        }

        this.botThinking = true;

        // PERBAIKAN: Timeout yang lebih fleksibel untuk semua level
        const baseTimeout = Math.max(this.engine.botSpeed || 1000, 1000);
        const botMoveTimeout = setTimeout(() => {
            console.error('Bot move timeout - forcing recovery');
            this.botThinking = false;
            if (!this.engine.isGameOver() && !this.isPaused) {
                setTimeout(() => this.makeBotMove(), 100);
            }
        }, Math.max(baseTimeout * 3, 3000)); // Timeout lebih fleksibel

        let currentPlayerName;

        if (this.engine.gameMode === 'bot-vs-bot') {
            const difficultyIcons = {
                'noob': '🤪', 'easy': '🤠', 'medium': '⚡', 'hard': '💀',
                'expert': '🏆', 'master': '👑', 'grandmaster': '🔥'
            };

            if (this.engine.currentPlayer === 'white') {
                const icon = difficultyIcons[this.engine.botWhiteDifficulty] || '🤖';
                currentPlayerName = `${icon} Alpha-Bot`;
            } else {
                const icon = difficultyIcons[this.engine.botBlackDifficulty] || '🤖';
                currentPlayerName = `${icon} Beta-Bot`;
            }
        } else {
            currentPlayerName = this.engine.currentPlayer === 'white' ? 'Bot Putih' : 'Bot Hitam';
        }

        // Get difficulty for current bot
        let currentDifficulty = this.engine.difficulty;
        if (this.engine.gameMode === 'bot-vs-bot') {
            currentDifficulty = this.engine.currentPlayer === 'white' ?
                this.engine.botWhiteDifficulty : this.engine.botBlackDifficulty;
        }

        // PERBAIKAN: Bot speed yang konsisten untuk semua level
        const actualSpeed = Math.max(this.engine.botSpeed || 1000, 500);
        let thinkingTime;

        // Thinking time berdasarkan difficulty
        switch(currentDifficulty) {
            case 'noob':
            case 'easy':
                thinkingTime = Math.max(actualSpeed * 0.2, 200);
                break;
            case 'medium':
                thinkingTime = Math.max(actualSpeed * 0.3, 300);
                break;
            case 'hard':
                thinkingTime = Math.max(actualSpeed * 0.4, 400);
                break;
            case 'expert':
                thinkingTime = Math.max(actualSpeed * 0.5, 500);
                break;
            case 'master':
                thinkingTime = Math.max(actualSpeed * 0.6, 600);
                break;
            case 'grandmaster':
                thinkingTime = Math.max(actualSpeed * 0.7, 700);
                break;
            default:
                thinkingTime = Math.max(actualSpeed * 0.3, 300);
        }

        console.log(`Bot ${currentPlayerName} (${currentDifficulty}) thinking for ${thinkingTime}ms (base speed: ${actualSpeed}ms)`);

        // Robust bot move execution
        const executeBotMove = () => {
            try {
                // Clear timeout since we're executing now
                clearTimeout(botMoveTimeout);

                // Double check game state before executing
                if (this.isPaused || this.engine.isGameOver()) {
                    console.log('Game state changed during thinking, aborting');
                    this.botThinking = false;
                    return;
                }

                // Safe bot move generation with error handling
                let botMove = null;
                try {
                    botMove = this.engine.getBotMove(currentDifficulty);
                } catch (moveError) {
                    console.error('Error generating bot move:', moveError);
                    // Fallback to random valid move
                    const validMoves = this.engine.getAllValidMoves(this.engine.currentPlayer);
                    if (validMoves.length > 0) {
                        botMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                    }
                }

                if (botMove && this.engine.isValidMove(botMove.from.row, botMove.from.col, botMove.to.row, botMove.to.col)) {
                    let move = null;
                    try {
                        move = this.engine.makeMove(
                            botMove.from.row, botMove.from.col,
                            botMove.to.row, botMove.to.col,
                            botMove.promotion || 'queen'
                        );
                    } catch (moveExecuteError) {
                        console.error('Error executing move:', moveExecuteError);
                        this.botThinking = false;
                        return;
                    }

                    // Track captures safely
                    if (move && move.captured) {
                        try {
                            this.trackCapture(move);
                        } catch (captureError) {
                            console.error('Error tracking capture:', captureError);
                        }
                    }

                    // Evaluate move quality safely
                    if (move) {
                        try {
                            this.evaluateMoveQuality(move);
                        } catch (qualityError) {
                            console.error('Error evaluating move quality:', qualityError);
                        }
                    }

                    // Update UI efficiently with error handling
                    try {
                        requestAnimationFrame(() => {
                            this.updateBoard();
                            this.updateGameInfo();
                            this.updateInlineStats();
                        });
                    } catch (uiError) {
                        console.error('Error updating UI:', uiError);
                    }

                    // Log every move immediately for accurate real-time tracking
                    if (move) {
                        try {
                            this.logMove(this.formatMove(move));
                        } catch (logError) {
                            console.error('Error logging move:', logError);
                        }
                    }

                    // Visual feedback for non-bot-vs-bot modes
                    if (this.engine.gameMode !== 'bot-vs-bot') {
                        try {
                            const targetSquare = this.getSquareElement(botMove.to.row, botMove.to.col);
                            if (targetSquare) {
                                targetSquare.classList.add('piece-moving');
                                setTimeout(() => targetSquare.classList.remove('piece-moving'), 150);
                            }
                        } catch (visualError) {
                            console.error('Error with visual feedback:', visualError);
                        }
                    }

                    this.botThinking = false;

                    // Check for game end after move
                    try {
                        const gameEndResult = this.engine.checkGameEnd();
                        if (gameEndResult) {
                            console.log(`Game ending: ${gameEndResult}`);
                            this.endGame();
                            return;
                        }
                    } catch (gameEndError) {
                        console.error('Error checking game end:', gameEndError);
                    }

                    // Continue game flow dengan timing yang konsisten
                    if (this.engine.gameMode === 'bot-vs-bot' && !this.isPaused) {
                        // Use consistent delay based on bot speed
                        const nextMoveDelay = Math.max(actualSpeed * 0.7, 300);
                        setTimeout(() => {
                            if (!this.isPaused && !this.botThinking && !this.engine.isGameOver()) {
                                this.makeBotMove();
                            }
                        }, nextMoveDelay);
                    } else if (this.engine.gameMode === 'player-vs-bot' && this.engine.currentPlayer === 'black') {
                        setTimeout(() => {
                            if (!this.isPaused && !this.engine.isGameOver()) {
                                this.makeBotMove();
                            }
                        }, Math.max(actualSpeed * 0.4, 250));
                    }
                } else {
                    console.error('Invalid bot move generated:', botMove);
                    this.botThinking = false;

                    // Force game end if no valid moves
                    const validMoves = this.engine.getAllValidMoves(this.engine.currentPlayer);
                    if (validMoves.length === 0) {
                        this.endGame();
                    } else {
                        // Retry with random move
                        setTimeout(() => {
                            if (!this.isPaused && !this.engine.isGameOver()) {
                                this.makeBotMove();
                            }
                        }, 300);
                    }
                }
            } catch (error) {
                console.error('Critical error in bot move execution:', error);
                clearTimeout(botMoveTimeout);
                this.botThinking = false;

                // Emergency recovery
                setTimeout(() => {
                    if (!this.isPaused && !this.engine.isGameOver()) {
                        try {
                            const emergencyMoves = this.engine.getAllValidMoves(this.engine.currentPlayer);
                            if (emergencyMoves.length === 0) {
                                this.endGame();
                            } else {
                                this.makeBotMove();
                            }
                        } catch (recoveryError) {
                            console.error('Emergency recovery failed:', recoveryError);
                            // Force end game if recovery fails
                            this.endGame();
                        }
                    }
                }, 500);
            }
        };

        // Execute with proper timing
        setTimeout(executeBotMove, thinkingTime);
    }

    formatMove(move) {
        const pieceNames = {
            'pawn': 'Pion', 'rook': 'Benteng', 'knight': 'Kuda',
            'bishop': 'Gajah', 'queen': 'Ratu', 'king': 'Raja'
        };

        const fromPos = this.positionToChess(move.from.row, move.from.col);
        const toPos = this.positionToChess(move.to.row, move.to.col);
        const pieceName = pieceNames[move.piece.type];
        const playerName = move.player === 'white' ? 'Putih' : 'Hitam';

        let moveText = `${playerName}: ${pieceName} ${fromPos} → ${toPos}`;

        // Special moves
        if (move.castling) {
            const isKingside = move.to.col > move.from.col;
            moveText = `${playerName}: ${isKingside ? '🏰 ROKADE KINGSIDE' : '🏰 ROKADE QUEENSIDE'}`;
        } else if (move.enPassantCapture) {
            moveText += ` 🎯 EN PASSANT!`;
        } else if (move.captured) {
            const capturedName = pieceNames[move.captured.type];
            moveText += ` (menangkap ${capturedName})`;
        }

        if (move.promotion) {
            const promotedName = pieceNames[move.promotion];
            moveText += ` 🎉 PROMOSI → ${promotedName}!`;
        }

        if (this.engine.isInCheck(this.engine.currentPlayer)) {
            moveText += ' - SKAK!';
        }

        return moveText;
    }

    positionToChess(row, col) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return files[col] + (8 - row);
    }

    getSquareElement(row, col) {
        return this.boardElement.children[row * 8 + col];
    }

    updateGameInfo() {
        if (this.botThinking) {
            return; // Don't update if bot is thinking
        }

        let currentPlayerName = this.engine.currentPlayer === 'white' ? 'Putih' : 'Hitam';

        // Define difficulty icons untuk semua level
        const difficultyIcons = {
            'noob': '🤪', 'easy': '🤠', 'medium': '⚡', 'hard': '💀',
            'expert': '🏆', 'master': '👑', 'grandmaster': '🔥'
        };

        // Add bot indicator for bot players with better naming
        if (this.engine.gameMode === 'bot-vs-bot') {
            if (this.engine.currentPlayer === 'white') {
                const icon = difficultyIcons[this.engine.botWhiteDifficulty] || '🤖';
                currentPlayerName = `${icon} Alpha-AI`;
            } else {
                const icon = difficultyIcons[this.engine.botBlackDifficulty] || '🤖';
                currentPlayerName = `${icon} Beta-AI`;
            }
        } else if (this.engine.gameMode === 'player-vs-bot' && this.engine.currentPlayer === 'black') {
            currentPlayerName = `🤖 Bot-AI`;
        } else if (this.engine.gameMode === 'player-vs-bot' && this.engine.currentPlayer === 'white') {
            currentPlayerName = `👤 Anda`;
        }

        this.turnIndicator.textContent = `Giliran: ${currentPlayerName}`;

        // Update player names in display
        const whitePlayerName = document.querySelector('.white-player .player-name');
        const blackPlayerName = document.querySelector('.black-player .player-name');

        if (this.engine.gameMode === 'bot-vs-bot') {
            const whiteIcon = difficultyIcons[this.engine.botWhiteDifficulty] || '🤖';
            const blackIcon = difficultyIcons[this.engine.botBlackDifficulty] || '🤖';
            if (whitePlayerName) whitePlayerName.textContent = `${whiteIcon} Alpha-AI`;
            if (blackPlayerName) blackPlayerName.textContent = `${blackIcon} Beta-AI`;
        } else if (this.engine.gameMode === 'player-vs-bot') {
            if (whitePlayerName) whitePlayerName.textContent = '👤 Anda';
            if (blackPlayerName) blackPlayerName.textContent = '🤖 Bot-AI';
        } else {
            if (whitePlayerName) whitePlayerName.textContent = 'Pemain Putih';
            if (blackPlayerName) blackPlayerName.textContent = 'Pemain Hitam';
        }

        // Hide/show settings button based on game mode
        const settingsBtn = document.getElementById('settingsBtn');
        if (this.engine.gameMode === 'bot-vs-bot') {
            settingsBtn.style.display = 'none';
        } else {
            settingsBtn.style.display = 'inline-block';
        }

        // Update timers
        this.updateTimerDisplay();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            // PERBAIKAN: Timer berjalan untuk semua mode dan level
            if (!this.isPaused && this.engine.gameStatus === 'playing') {
                if (this.engine.currentPlayer === 'white') {
                    this.timers.white--;
                } else {
                    this.timers.black--;
                }

                this.updateTimerDisplay();

                // Check for time out
                if (this.timers.white <= 0 || this.timers.black <= 0) {
                    this.endGame('timeout');
                }
            }
        }, 1000);
    }

    updateTimerDisplay() {
        this.whiteTimer.textContent = this.formatTime(this.timers.white);
        this.blackTimer.textContent = this.formatTime(this.timers.black);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    logMove(message, type = 'default') {
        // Skip only exact duplicate consecutive messages
        const lastLogEntry = this.gameLog.lastElementChild;
        if (lastLogEntry && lastLogEntry.innerHTML === this.formatLogMessage(message)) {
            return; // Skip only if exact same formatted message
        }

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = this.formatLogMessage(message);

        // Add color classes based on message type
        this.addLogColorClasses(logEntry, message);

        this.gameLog.appendChild(logEntry);

        // Auto scroll to bottom immediately for real-time feel
        requestAnimationFrame(() => {
            this.gameLog.scrollTop = this.gameLog.scrollHeight;
        });

        // Update log counter
        this.updateLogCounter();
    }

    formatLogMessage(message) {
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 1
        });

        // Enhanced message formatting with better bot names
        let formattedMessage = message;

        // Add consistent colored indicators for all modes
        if (this.engine.gameMode === 'bot-vs-bot') {
            // Get bot difficulties for names
            const whiteDiff = this.engine.botWhiteDifficulty;
            const blackDiff = this.engine.botBlackDifficulty;

            const difficultyIcons = {
                'noob': '🤪', 'easy': '🤠', 'medium': '⚡', 'hard': '💀',
                'expert': '🏆', 'master': '👑', 'grandmaster': '🔥'
            };

            const whiteIcon = difficultyIcons[whiteDiff] || '🤖';
            const blackIcon = difficultyIcons[blackDiff] || '🤖';

            // Create unique and accurate bot names dengan strength indicator
            const alphaBotName = `${whiteIcon} Alpha-AI (LV.${this.getDifficultyLevel(whiteDiff)})`;
            const betaBotName = `${blackIcon} Beta-AI (LV.${this.getDifficultyLevel(blackDiff)})`;

            formattedMessage = formattedMessage.replace('Putih:', `<span class="player-indicator white">${alphaBotName}</span>:`);
            formattedMessage = formattedMessage.replace('Hitam:', `<span class="player-indicator black">${betaBotName}</span>:`);
            formattedMessage = formattedMessage.replace('Bot Putih:', `<span class="player-indicator white">${alphaBotName}</span>:`);
            formattedMessage = formattedMessage.replace('Bot Hitam:', `<span class="player-indicator black">${betaBotName}</span>:`);
        } else if (this.engine.gameMode === 'player-vs-bot') {
            formattedMessage = formattedMessage.replace('Putih:', '<span class="player-indicator white">👤 Pemain</span>:');
            formattedMessage = formattedMessage.replace('Hitam:', '<span class="player-indicator black">🤖 Bot-AI</span>:');
        }

        return `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${formattedMessage}</span>
        `;
    }

    addLogColorClasses(logEntry, message) {
        // Different log colors based on game mode
        if (message.includes('Game dimulai') || message.includes('Mode:')) {
            logEntry.classList.add('game-start');
        } else if (message.includes('GAME BERAKHIR')) {
            logEntry.classList.add('game-end');
        } else if (this.engine.gameMode === 'bot-vs-bot') {
            // Bot vs Bot mode - distinct colors and names for each bot
            if (message.includes('Putih:') || message.includes('Bot Putih')) {
                logEntry.classList.add('bot1-move');
            } else if (message.includes('Hitam:') || message.includes('Bot Hitam')) {
                logEntry.classList.add('bot2-move');
            }
        } else {
            // Player vs Bot mode - original colors
            if (message.includes('Putih:')) {
                logEntry.classList.add('white-move');
            } else if (message.includes('Hitam:')) {
                logEntry.classList.add('black-move');
            }
        }

        if (message.includes('Pengaturan') || message.includes('dipause') || message.includes('dilanjutkan') || message.includes('dibatalkan')) {
            logEntry.classList.add('system-message');
        }
    }

    updateLogCounter() {
        const logCounter = document.getElementById('logCounter');
        if (logCounter) {
            const totalLogs = this.gameLog.children.length;
            logCounter.textContent = `${totalLogs} logs`;
        }
    }

    downloadGameLog() {
        const logs = [];
        const logEntries = this.gameLog.children;

        // Create header with game info
        const gameInfo = `
=== GAME CATUR LOG ===
Mode: ${this.engine.gameMode}
Tanggal: ${new Date().toLocaleDateString('id-ID')}
Waktu: ${new Date().toLocaleTimeString('id-ID')}
${this.engine.gameMode === 'bot-vs-bot' ?
    `Alpha-Bot: ${this.engine.botWhiteDifficulty} vs Beta-Bot: ${this.engine.botBlackDifficulty}` :
    `Difficulty: ${this.engine.difficulty}`}
Kecepatan: ${this.engine.botSpeed / 1000}s
=====================
        `.trim();

        logs.push(gameInfo);
        logs.push('');

        // Extract text content from each log entry
        for (let i = 0; i < logEntries.length; i++) {
            const entry = logEntries[i];
            const timeText = entry.querySelector('.log-time')?.textContent || '';
            const messageText = entry.querySelector('.log-message')?.textContent || '';
            logs.push(`${timeText} ${messageText}`);
        }

        // Create downloadable file
        const logContent = logs.join('\n');
        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `chess-game-log-${timestamp}.txt`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        this.showToast('📥 Log berhasil didownload!', 'success');
    }

    clearGameLog() {
        // Show confirmation dialog
        if (confirm('🗑️ Hapus semua log permainan? Tindakan ini tidak dapat dibatalkan.')) {
            this.gameLog.innerHTML = '';
            this.updateLogCounter();
            this.logMove('🧹 Log permainan telah dibersihkan');
            this.showToast('🗑️ Log berhasil dihapus!', 'success');
        }
    }

    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.textContent = message;

        // Add to body
        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    showUptimeModal() {
        const uptimeModal = document.getElementById('uptimeModal');
        if (uptimeModal) {
            uptimeModal.style.display = 'block';

            // Update uptime info
            this.updateUptimeInfo();

            // Start uptime interval
            if (this.uptimeInterval) {
                clearInterval(this.uptimeInterval);
            }

            this.uptimeInterval = setInterval(() => {
                this.updateUptimeInfo();
            }, 1000);
        }
    }

    updateUptimeInfo() {
        // Calculate session uptime
        const sessionUptime = Date.now() - this.sessionStartTime;
        const sessionHours = Math.floor(sessionUptime / (1000 * 60 * 60));
        const sessionMinutes = Math.floor((sessionUptime % (1000 * 60 * 60)) / (1000 * 60));
        const sessionSeconds = Math.floor((sessionUptime % (1000 * 60)) / 1000);

        // Update server uptime display
        const serverUptimeElement = document.getElementById('serverUptime');
        if (serverUptimeElement) {
            serverUptimeElement.textContent = `${sessionHours}h ${sessionMinutes}m ${sessionSeconds}s`;
        }

        // Simulate realistic RAM usage (25-75% with slow variation)
        const baseRamUsage = 45;
        const ramVariation = Math.sin(Date.now() / 10000) * 15;
        const ramUsage = Math.floor(baseRamUsage + ramVariation);
        const ramUsageBar = document.getElementById('ramUsageBar');
        const ramUsageValue = document.getElementById('ramUsageValue');
        const usedMemoryElement = document.getElementById('usedMemory');
        const availableMemoryElement = document.getElementById('availableMemory');

        if (ramUsageBar) ramUsageBar.style.width = `${ramUsage}%`;
        if (ramUsageValue) ramUsageValue.textContent = `${ramUsage}%`;
        if (usedMemoryElement) usedMemoryElement.textContent = `${(32 * ramUsage / 100).toFixed(1)} GB`;
        if (availableMemoryElement) availableMemoryElement.textContent = `${(32 * (100 - ramUsage) / 100).toFixed(1)} GB`;

        // Simulate realistic CPU usage (15-45% with variations)
        const baseCpuUsage = 25;
        const cpuVariation = Math.cos(Date.now() / 8000) * 10;
        const cpuUsage = Math.floor(baseCpuUsage + cpuVariation);
        const cpuUsageBar = document.getElementById('cpuUsageBar');
        const cpuUsageValue = document.getElementById('cpuUsageValue');

        if (cpuUsageBar) cpuUsageBar.style.width = `${cpuUsage}%`;
        if (cpuUsageValue) cpuUsageValue.textContent = `${cpuUsage}%`;

        // Update CPU frequency based on usage
        const cpuFrequencyElement = document.getElementById('cpuFrequency');
        if (cpuFrequencyElement) {
            const baseFreq = 3.6;
            const boostFreq = baseFreq + (cpuUsage / 100) * 1.9; // Up to 5.5 GHz boost
            cpuFrequencyElement.textContent = `${boostFreq.toFixed(1)} GHz`;
        }

        // Simulate CPU temperature (40-65°C based on usage)
        const cpuTempElement = document.getElementById('cpuTemp');
        if (cpuTempElement) {
            const baseTemp = 45;
            const tempIncrease = (cpuUsage / 100) * 20;
            const currentTemperature = Math.floor(baseTemp + tempIncrease);
            cpuTempElement.textContent = `${currentTemperature}°C`;
        }

        // Update network status
        const networkStatusElement = document.getElementById('networkStatus');
        if (networkStatusElement) {
            const statuses = ['🟢 Online - Excellent', '🟢 Online - Good', '🟡 Online - Fair'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            networkStatusElement.textContent = randomStatus;
        }

        // Update last updated time
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            lastUpdatedElement.textContent = now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        // Update health indicators based on current metrics
        this.updateHealthIndicators(cpuUsage, ramUsage, 45);
    }

    updateHealthIndicators(cpuUsage, ramUsage, cpuTemp) {
        const healthCards = document.querySelectorAll('.health-card');

        // CPU Health
        const cpuHealthCard = healthCards[0];
        if (cpuHealthCard) {
            const cpuIcon = cpuHealthCard.querySelector('.health-icon');
            const cpuStatus = cpuHealthCard.querySelector('.health-status');

            if (cpuUsage < 30 && cpuTemp < 50) {
                cpuIcon.textContent = '✅';
                cpuStatus.textContent = 'Excellent';
                cpuHealthCard.className = 'health-card healthy';
            } else if (cpuUsage < 60 && cpuTemp < 70) {
                cpuIcon.textContent = '⚠️';
                cpuStatus.textContent = 'Good';
                cpuHealthCard.className = 'health-card warning';
            } else {
                cpuIcon.textContent = '🔥';
                cpuStatus.textContent = 'High Load';
                cpuHealthCard.className = 'health-card critical';
            }
        }

        // Memory Health
        const memoryHealthCard = healthCards[1];
        if (memoryHealthCard) {
            const memoryIcon = memoryHealthCard.querySelector('.health-icon');
            const memoryStatus = memoryHealthCard.querySelector('.health-status');

            if (ramUsage < 50) {
                memoryIcon.textContent = '✅';
                memoryStatus.textContent = 'Excellent';
                memoryHealthCard.className = 'health-card healthy';
            } else if (ramUsage < 75) {
                memoryIcon.textContent = '⚠️';
                memoryStatus.textContent = 'Good';
                memoryHealthCard.className = 'health-card warning';
            } else {
                memoryIcon.textContent = '🚨';
                memoryStatus.textContent = 'High Usage';
                memoryHealthCard.className = 'health-card critical';
            }
        }
    }

    // Theme Management Methods
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('chessGameTheme') || 'default';

        // Remove active class from all cards
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => card.classList.remove('active'));

        // Set active card based on saved theme
        const activeCard = document.querySelector(`[data-theme="${savedTheme}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }

        // Apply the theme to body
        this.setTheme(savedTheme);
    }

    applySelectedTheme() {
        const activeCard = document.querySelector('.theme-card.active');
        if (!activeCard) return;

        const selectedTheme = activeCard.dataset.theme;

        // Save theme to localStorage
        localStorage.setItem('chessGameTheme', selectedTheme);

        // Apply theme
        this.setTheme(selectedTheme);

        // Close modal
        document.getElementById('themeModal').style.display = 'none';

        // Show success message
        this.showToast(`🎨 Tema "${activeCard.querySelector('h4').textContent}" berhasil diterapkan!`, 'success');
    }

    resetToDefaultTheme() {
        // Remove saved theme
        localStorage.removeItem('chessGameTheme');

        // Set default theme
        this.setTheme('default');

        // Update UI
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => card.classList.remove('active'));

        const defaultCard = document.querySelector('[data-theme="default"]');
        if (defaultCard) {
            defaultCard.classList.add('active');
        }

        // Close modal
        document.getElementById('themeModal').style.display = 'none';

        // Show success message
        this.showToast('🔄 Tema berhasil direset ke default!', 'success');
    }

    setTheme(themeName) {
        const body = document.body;

        // Remove all theme classes
        body.classList.remove('theme-default', 'theme-forest');

        // Add new theme class
        if (themeName !== 'default') {
            body.classList.add(`theme-${themeName}`);
        }

        console.log(`Theme applied: ${themeName}`);
    }

    endGame(reason = 'checkmate') {
        clearInterval(this.timerInterval);
        this.botThinking = false;

        let winner = '';
        let winnerColor = '';
        let loserColor = '';
        let isDraw = false;
        let drawReason = '';

        if (reason === 'timeout') {
            winnerColor = this.timers.white <= 0 ? 'black' : 'white';
            loserColor = this.timers.white <= 0 ? 'white' : 'black';
            winner = this.timers.white <= 0 ? 'Hitam' : 'Putih';
            this.logMove(`🏁 GAME BERAKHIR! ${winner} menang karena waktu habis! ⏰`);
        } else {
            // Check for checkmate/stalemate/draw properly according to international standards
            const gameEndResult = this.engine.checkGameEnd();

            if (gameEndResult === 'checkmate') {
                // Checkmate - opponent wins
                const currentPlayer = this.engine.currentPlayer;
                winnerColor = currentPlayer === 'white' ? 'black' : 'white';
                loserColor = currentPlayer;
                winner = currentPlayer === 'white' ? 'Hitam' : 'Putih';
                this.logMove(`🏆 CHECKMATE! ${winner} menang! Raja ${currentPlayer === 'white' ? 'putih' : 'hitam'} telah skakmat! 🎉`);
            } else if (gameEndResult === 'king_captured') {
                // King captured/missing - immediate win (FIDE Rules)
                // Determine winner based on which king is missing
                const whiteKing = this.engine.findKing('white');
                const blackKing = this.engine.findKing('black');

                if (!whiteKing) {
                    // White king missing = Black wins
                    winnerColor = 'black';
                    loserColor = 'white';
                    winner = 'Hitam';
                    this.logMove(`👑 RAJA PUTIH HILANG/DITANGKAP! Hitam menang otomatis sesuai aturan FIDE! 🏆`);
                } else if (!blackKing) {
                    // Black king missing = White wins
                    winnerColor = 'white';
                    loserColor = 'black';
                    winner = 'Putih';
                    this.logMove(`👑 RAJA HITAM HILANG/DITANGKAP! Putih menang otomatis sesuai aturan FIDE! 🏆`);
                } else {
                    // Fallback - should not happen but handle gracefully
                    const currentPlayer = this.engine.currentPlayer;
                    winnerColor = currentPlayer === 'white' ? 'black' : 'white';
                    loserColor = currentPlayer;
                    winner = currentPlayer === 'white' ? 'Hitam' : 'Putih';
                    this.logMove(`👑 RAJA DITANGKAP! ${winner} menang otomatis! 🎉`);
                }

                this.turnIndicator.textContent = `🏆 ${winner} MENANG - Raja Lawan Ditangkap!`;
            } else if (gameEndResult === 'stalemate') {
                // Stalemate - draw
                isDraw = true;
                drawReason = 'Stalemate';
                this.logMove(`🤝 STALEMATE! Game berakhir seri karena pat! 🤝`);
                this.turnIndicator.textContent = `Game Berakhir - Seri (Stalemate)!`;
            } else if (gameEndResult === 'draw_insufficient_material') {
                // Insufficient material - draw
                isDraw = true;
                drawReason = 'Material Tidak Cukup';
                this.logMove(`🤝 SERI! Material tidak cukup untuk skakmat! 🤝`);
                this.turnIndicator.textContent = `Game Berakhir - Seri (Material Tidak Cukup)!`;
            } else if (gameEndResult === 'draw_repetition') {
                // Threefold repetition - draw
                isDraw = true;
                drawReason = 'Pengulangan 3x';
                this.logMove(`🤝 SERI! Posisi terulang 3 kali! 🤝`);
                this.turnIndicator.textContent = `Game Berakhir - Seri (Pengulangan)!`;
            } else if (gameEndResult === 'draw_fifty_moves') {
                // 50-move rule - draw
                isDraw = true;
                drawReason = 'Aturan 50 Langkah';
                this.logMove(`🤝 SERI! 50 langkah tanpa pion atau tangkapan! 🤝`);
                this.turnIndicator.textContent = `Game Berakhir - Seri (50 Langkah)!`;
            } else {
                // Game is not actually over
                console.log('Game end called but game is not over');
                return;
            }

            // Handle draw cases
            if (isDraw) {
                // Add round to history for draw
                this.addRoundToHistory(
                    this.tournamentSettings.currentRound,
                    this.gameStats.white.captured,
                    this.gameStats.black.captured,
                    this.gameStats.white.totalValue,
                    this.gameStats.black.totalValue,
                    null, // No winner for draw
                    drawReason
                );

                // Show draw animation with play again option
                this.showVictoryAnimation(null, null, true, drawReason);

                // Update tournament and show play again option
                if (this.engine.gameMode === 'bot-vs-bot') {
                    this.updateTournamentAfterGame('draw', 'draw');
                    setTimeout(() => {
                        this.showPlayAgainPrompt();
                    }, 4000);
                } else {
                    setTimeout(() => {
                        this.showPlayAgainPrompt();
                    }, 3000);
                }
                return;
            }
        }

        // Update win/loss statistics only if there's a winner
        if (winnerColor && loserColor) {
            console.log(`🎯 UPDATING STATS: ${winnerColor} wins, ${loserColor} loses`);
            this.gameStats[winnerColor].wins++;
            this.gameStats[loserColor].losses++;
            this.totalGames++;

            // Add round to history
            this.addRoundToHistory(
                this.tournamentSettings.currentRound,
                this.gameStats.white.captured,
                this.gameStats.black.captured,
                this.gameStats.white.totalValue,
                this.gameStats.black.totalValue,
                winnerColor === 'white' ? 'Alpha-AI' : 'Beta-AI'
            );

            console.log('📊 Updated game stats:', this.gameStats);
            console.log('🎮 Total games played:', this.totalGames);

            // Always update inline stats after a game ends
            setTimeout(() => {
                this.updateInlineStats();
                this.updatePredictionAccuracy(winnerColor);
                console.log('Statistics updated in UI');
            }, 500);
        }

        this.turnIndicator.textContent = `Game Berakhir - ${winner} Menang!`;

        // Show victory animation
        if (!isDraw) {
            this.showVictoryAnimation(winnerColor, winner, false);
        }

        // Handle tournament progression in bot vs bot mode
        if (this.engine.gameMode === 'bot-vs-bot') {
            this.updateTournamentAfterGame(winnerColor, loserColor);

            // PERBAIKAN: Gunakan deteksi tournament selesai yang konsisten
            const isTournamentComplete = this.tournamentSettings.currentRound >= this.tournamentSettings.totalRounds;

            // Show play again prompt for all cases
            setTimeout(() => {
                this.showPlayAgainPrompt();

                // HAPUS auto endTournament dari sini - biar di showPlayAgainPrompt saja
                // if (isTournamentComplete) {
                //     this.endTournament();
                // }
            }, 4000);
        } else {
            // For player vs bot mode
            setTimeout(() => {
                this.showPlayAgainPrompt();
            }, 3000);
        }
    }

    showPlayAgainPrompt() {
        const existingPrompt = document.querySelector('.play-again-overlay');
        if (existingPrompt) {
            existingPrompt.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'play-again-overlay';

        const content = document.createElement('div');
        content.className = 'play-again-content';

        let promptMessage = '';
        let buttonsHtml = '';

        if (this.engine.gameMode === 'bot-vs-bot') {
            // PERBAIKAN: Gunakan logika yang lebih ketat untuk deteksi tournament selesai
            const isTournamentComplete = this.tournamentSettings.currentRound >= this.tournamentSettings.totalRounds;
            const currentScore = `Alpha ${this.tournamentSettings.roundWins.white} - ${this.tournamentSettings.roundWins.black} Beta (Seri: ${this.tournamentSettings.drawCount})`;

            console.log('Tournament Status Check:', {
                currentRound: this.tournamentSettings.currentRound,
                totalRounds: this.tournamentSettings.totalRounds,
                isTournamentComplete: isTournamentComplete
            });

            if (!isTournamentComplete) {
                // Masih ada round berikutnya - tampilkan info round yang akan datang
                promptMessage = `
                    <div class="round-continuation">
                        <h2>🎯 Round ${this.tournamentSettings.currentRound} Selesai!</h2>
                        <div class="current-score">
                            <p class="score-display">📊 Skor Sementara: ${currentScore}</p>
                        </div>
                        <div class="next-round-info">
                            <p>🔥 Siap untuk Round ${this.tournamentSettings.currentRound + 1}?</p>
                            <small>Sisa ${this.tournamentSettings.totalRounds - this.tournamentSettings.currentRound} round lagi!</small>
                        </div>
                    </div>
                `;

                buttonsHtml = `
                    <div class="play-again-buttons tournament-continue">
                        <button id="playAgainYes" class="btn-primary next-round-btn">🎮 Lanjut Round ${this.tournamentSettings.currentRound + 1}</button>
                        <button id="viewRoundHistory" class="btn-secondary history-btn">📜 Lihat Riwayat Round</button>
                        <button id="playAgainNo" class="btn-secondary menu-btn">🏠 Kembali ke Menu</button>
                    </div>
                `;
            } else {
                // Tournament BENAR-BENAR SELESAI - tampilkan hasil final dan opsi tournament baru
                const whiteWins = this.tournamentSettings.roundWins.white;
                const blackWins = this.tournamentSettings.roundWins.black;
                const draws = this.tournamentSettings.drawCount;

                let championText = '';
                let championIcon = '';

                if (whiteWins > blackWins) {
                    championText = `Alpha-AI Juara Tournament!`;
                    championIcon = '🏆👑';
                } else if (blackWins > whiteWins) {
                    championText = `Beta-AI Juara Tournament!`;
                    championIcon = '🏆👑';
                } else {
                    championText = 'Tournament Berakhir Seri!';
                    championIcon = '🤝✨';
                }

                // Tambahan untuk tournament final yang lebih dramatis dan akurat
                let finalTitle = '';
                if (this.tournamentSettings.totalRounds === 1) {
                    finalTitle = '🎯 Pertandingan Final Selesai!';
                } else if (this.tournamentSettings.totalRounds <= 3) {
                    finalTitle = `🏁 Tournament ${this.tournamentSettings.totalRounds} Round - FINAL!`;
                } else if (this.tournamentSettings.totalRounds <= 5) {
                    finalTitle = `🎊 Grand Tournament ${this.tournamentSettings.totalRounds} Round - FINAL!`;
                } else {
                    finalTitle = `👑 Ultimate Championship ${this.tournamentSettings.totalRounds} Round - FINAL!`;
                }

                promptMessage = `
                    <div class="tournament-final-complete">
                        <h2>${finalTitle}</h2>
                        <div class="champion-announcement">
                            <p class="champion-crown">${championIcon}</p>
                            <p class="champion-text">${championText}</p>
                        </div>
                        <div class="final-results">
                            <div class="final-score-box">
                                <h4>📊 Hasil Final Tournament</h4>
                                <p class="final-score-display">${currentScore}</p>
                                <small class="tournament-stats">Total ${whiteWins + blackWins + draws} round dimainkan | Tournament Level: ${this.tournamentSettings.totalRounds} Round</small>
                            </div>
                        </div>
                    </div>
                `;

                buttonsHtml = `
                    <div class="play-again-buttons tournament-final">
                        <button id="playAgainYes" class="btn-primary new-tournament-btn">🎮 Tournament Baru</button>
                        <button id="viewRoundHistory" class="btn-secondary history-btn">🏆 Lihat Riwayat Final</button>
                        <button id="playAgainNo" class="btn-secondary menu-btn">🏠 Kembali ke Menu</button>
                    </div>
                `;
            }
        } else if (this.engine.gameMode === 'player-vs-bot') {
            // Player vs Bot mode - bisa juga ada tournament
            const hasNextRound = this.tournamentSettings.currentRound < this.tournamentSettings.totalRounds;

            if (hasNextRound) {
                // Player vs Bot masih ada round
                promptMessage = `
                    <div class="player-round-continuation">
                        <h2>🎯 Round ${this.tournamentSettings.currentRound} Selesai!</h2>
                        <p>🔥 Siap untuk Round ${this.tournamentSettings.currentRound + 1}?</p>
                        <small>Sisa ${this.tournamentSettings.totalRounds - this.tournamentSettings.currentRound} round lagi!</small>
                    </div>
                `;

                buttonsHtml = `
                    <div class="play-again-buttons player-continue">
                        <button id="playAgainYes" class="btn-primary">🎮 Lanjut Round ${this.tournamentSettings.currentRound + 1}</button>
                        <button id="playAgainNo" class="btn-secondary">🏠 Kembali ke Menu</button>
                    </div>
                `;
            } else {
                // Player vs Bot tournament selesai
                promptMessage = `
                    <div class="player-tournament-complete">
                        <h2>🏁 Tournament Player vs Bot Selesai!</h2>
                        <p>🎉 Terima kasih sudah bermain!</p>
                    </div>
                `;

                buttonsHtml = `
                    <div class="play-again-buttons player-final">
                        <button id="playAgainYes" class="btn-primary">🎮 Main Lagi</button>
                        <button id="playAgainNo" class="btn-secondary">🏠 Kembali ke Menu</button>
                    </div>
                `;
            }
        } else {
            // Mode lainnya - single game
            promptMessage = `
                <div class="game-complete">
                    <h2>🎮 Permainan Selesai!</h2>
                    <p>Terima kasih sudah bermain!</p>
                </div>
            `;

            buttonsHtml = `
                <div class="play-again-buttons single-game">
                    <button id="playAgainYes" class="btn-primary">🔄 Main Lagi</button>
                    <button id="playAgainNo" class="btn-secondary">🏠 Kembali ke Menu</button>
                </div>
            `;
        }

        content.innerHTML = `
            ${promptMessage}
            ${buttonsHtml}
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // Add event listeners
        const playAgainYes = document.getElementById('playAgainYes');
        const playAgainNo = document.getElementById('playAgainNo');
        const viewHistoryBtn = document.getElementById('viewRoundHistory');

        if (playAgainYes) {
            playAgainYes.addEventListener('click', () => {
                overlay.remove();

                // PERBAIKAN: Gunakan deteksi tournament selesai yang sama
                const isTournamentComplete = this.tournamentSettings.currentRound >= this.tournamentSettings.totalRounds;

                if (this.engine.gameMode === 'bot-vs-bot' && !isTournamentComplete) {
                    console.log('Starting next round:', this.tournamentSettings.currentRound + 1);
                    this.startNewRound();
                } else {
                    console.log('Tournament complete, starting new game/tournament');
                    this.newGame(); // Start new tournament/game
                }
            });
        }

        if (playAgainNo) {
            playAgainNo.addEventListener('click', () => {
                overlay.remove();
                this.newGame(); // Back to welcome screen
            });
        }

        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                this.showRoundHistoryModal();
            });
        }
    }

    showVictoryAnimation(winnerColor, winner, isDraw) {
        // Remove any existing victory overlay
        const existingOverlay = document.querySelector('.victory-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create victory overlay
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';

        const content = document.createElement('div');
        content.className = 'victory-content tournament';

        let titleText, subtitleText, titleClass;

        if (isDraw) {
            titleText = '🤝 SERI! 🤝';
            subtitleText = 'Pertandingan berakhir imbang!';
            titleClass = 'victory-title draw';
        } else {
            if (this.engine.gameMode === 'bot-vs-bot') {
                const difficultyIcons = {
                    'noob': '🤪', 'easy': '🤠', 'medium': '⚡', 'hard': '💀',
                    'expert': '🏆', 'master': '👑', 'grandmaster': '🔥'
                };

                if (winnerColor === 'white') {
                    const icon = difficultyIcons[this.engine.botWhiteDifficulty] || '🤖';
                    titleText = `${icon} ALPHA-AI MENANG! 🏆`;
                    subtitleText = `Alpha-AI (${this.engine.botWhiteDifficulty.toUpperCase()}) mengalahkan Beta-AI!`;
                } else {
                    const icon = difficultyIcons[this.engine.botBlackDifficulty] || '🤖';
                    titleText = `${icon} BETA-AI MENANG! 🏆`;
                    subtitleText = `Beta-AI (${this.engine.botBlackDifficulty.toUpperCase()}) mengalahkan Alpha-AI!`;
                }
            } else {
                if (winnerColor === 'white') {
                    titleText = '👤 ANDA MENANG! 🏆';
                    subtitleText = 'Selamat! Anda berhasil mengalahkan AI!';
                } else {
                    titleText = '🤖 AI MENANG! 💀';
                    subtitleText = 'AI berhasil mengalahkan Anda. Coba lagi!';
                }
            }
            titleClass = 'victory-title winner';
        }

        // Create stats display
        const whiteStats = this.gameStats.white;
        const blackStats = this.gameStats.black;

        content.innerHTML = `
            <h1 class="${titleClass}">${titleText}</h1>
            <p class="victory-subtitle">${subtitleText}</p>
            <div class="victory-stats">
                <h4>📊 Statistik Round Ini</h4>
                <p><strong>♔ Alpha-AI:</strong> ${whiteStats.totalValue} poin tangkapan</p>
                <p><strong>♚ Beta-AI:</strong> ${blackStats.totalValue} poin tangkapan</p>
                <p><strong>🏆 Tournament Stats:</strong> Alpha ${whiteStats.wins}W-${whiteStats.losses}L | Beta ${blackStats.wins}W-${blackStats.losses}L</p>
            </div>
            <button class="victory-close">Tutup</button>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // Add event listener for close button
        const closeBtn = content.querySelector('.victory-close');
        closeBtn.addEventListener('click', () => {
            overlay.style.animation = 'fadeOutOverlay 0.3s ease forwards';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        });

        // Auto close after delay for bot vs bot mode
        if (this.engine.gameMode === 'bot-vs-bot') {
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.style.animation = 'fadeOutOverlay 0.3s ease forwards';
                    setTimeout(() => {
                        overlay.remove();
                    }, 300);
                }
            }, 4000);
        }

        // Add fade out animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOutOverlay {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    showRoundHistoryModal() {
        const existingModal = document.querySelector('.history-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'history-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'history-modal';

        // Get history data
        const historyList = document.getElementById('roundHistoryList');
        const historyEntries = historyList ? historyList.children : [];

        let historyContent = '';
        if (historyEntries.length > 0) {
            historyContent = '<div class="history-entries">';
            for (let i = 0; i < historyEntries.length; i++) {
                historyContent += `<div class="modal-history-entry">${historyEntries[i].innerHTML}</div>`;
            }
            historyContent += '</div>';
        } else {
            historyContent = '<p class="no-history">📭 Belum ada riwayat round.</p>';
        }

        const currentScore = `Alpha ${this.tournamentSettings.roundWins.white} - ${this.tournamentSettings.roundWins.black} Beta (Seri: ${this.tournamentSettings.drawCount})`;

        modal.innerHTML = `
            <div class="history-modal-header">
                <h3>📜 Riwayat Round Tournament</h3>
                <button class="history-close-btn">&times;</button>
            </div>
            <div class="history-modal-body">
                <div class="current-tournament-status">
                    <h4>🏆 Status Tournament Saat Ini</h4>
                    <p class="current-round">Round: ${this.tournamentSettings.currentRound} / ${this.tournamentSettings.totalRounds}</p>
                    <p class="current-score">Skor: ${currentScore}</p>
                </div>
                <div class="history-content">
                    <h4>📋 Detail Riwayat Round</h4>
                    ${historyContent}
                </div>
            </div>
            <div class="history-modal-footer">
                <button class="btn-secondary close-history-btn">✅ Tutup</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Add event listeners
        const closeBtn = modal.querySelector('.history-close-btn');
        const closeFooterBtn = modal.querySelector('.close-history-btn');

        const closeModal = () => {
            overlay.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    showTournamentVictoryAnimation(whiteWins, blackWins, draws, winnerName) {
        // Remove any existing victory overlay
        const existingOverlay = document.querySelector('.victory-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create tournament victory overlay
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';

        const content = document.createElement('div');
        content.className = 'victory-content tournament';

        let titleText, subtitleText;

        if (whiteWins > blackWins) {
            titleText = '🏆 ALPHA-AI JUARA TOURNAMENT! 🎉';
            subtitleText = `${winnerName} memenangkan tournament dengan ${whiteWins} kemenangan!`;
        } else if (blackWins > whiteWins) {
            titleText = '🏆 BETA-AI JUARA TOURNAMENT! 🎉';
            subtitleText = `${winnerName} memenangkan tournament dengan ${blackWins} kemenangan!`;
        } else {
            titleText = '🤝 TOURNAMENT SERI! 🤝';
            subtitleText = 'Tournament berakhir dengan hasil yang seimbang!';
        }

        content.innerHTML = `
            <h1 class="victory-title tournament-champion">${titleText}</h1>
            <p class="victory-subtitle">${subtitleText}</p>
            <div class="victory-stats tournament-final">
                <h4>🏆 HASIL FINAL TOURNAMENT</h4>
                <div class="final-scores">
                    <p><strong>🤖 Alpha-AI:</strong> ${whiteWins} Kemenangan</p>
                    <p><strong>🤖 Beta-AI:</strong> ${blackWins} Kemenangan</p>
                    <p><strong>🤝 Seri:</strong> ${draws} Games</p>
                    <p><strong>📊 Total Games:</strong> ${whiteWins + blackWins + draws} Round</p>
                </div>
            </div>
            <button class="victory-close tournament-close">Tutup Tournament</button>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // Add event listener for close button
        const closeBtn = content.querySelector('.victory-close');
        closeBtn.addEventListener('click', () => {
            overlay.style.animation = 'fadeOutOverlay 0.3s ease forwards';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        });

        // Auto close after longer delay for tournament end
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.animation = 'fadeOutOverlay 0.3s ease forwards';
                setTimeout(() => {
                    overlay.remove();
                }, 300);
            }
        }, 8000);
    }

    calculateMaterialValue(color) {
        let totalValue = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.engine.board[row][col];
                if (piece && piece.color === color) {
                    totalValue += this.engine.pieceValues[piece.type] || 0;
                }
            }
        }
        return totalValue;
    }

    setupTutorialSystem() {
        this.tutorialData = [
            {
                title: "🎓 Selamat Datang di Tutorial Catur!",
                content: `
                    <h3>🌟 Selamat Datang di Tutorial Catur Interaktif!</h3>
                    <p>Tutorial ini akan mengajarkan Anda bermain catur dari dasar hingga mahir. Kita akan belajar step-by-step dengan praktik langsung.</p>
                    <div class="tutorial-highlight">
                        <h4>📚 Apa yang akan Anda pelajari:</h4>
                        <ul>
                            <li>🏁 Pengenalan papan catur dan setup bidak</li>
                            <li>♟️ Cara bergerak setiap bidak catur</li>
                            <li>⚡ Aturan khusus catur (rokade, en passant, promosi)</li>
                            <li>🧠 Strategi dasar opening, middlegame, dan endgame</li>
                            <li>🎯 Taktik catur (pin, fork, skewer)</li>
                            <li>🎮 Latihan melawan AI bertahap</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>💡 Tips:</strong> Ikuti setiap langkah dengan seksama. Jangan ragu untuk mengulang step yang kurang jelas!
                    </div>
                `,
                showBoard: false
            },
            {
                title: "🏁 Mengenal Papan Catur",
                content: `
                    <h3>🔍 Mari Kenali Papan Catur</h3>
                    <p>Papan catur memiliki 64 kotak (8x8) dengan warna terang dan gelap bergantian.</p>
                    <div class="tutorial-highlight">
                        <h4>📍 Koordinat Papan:</h4>
                        <ul>
                            <li><strong>File (Kolom):</strong> a, b, c, d, e, f, g, h (dari kiri ke kanan)</li>
                            <li><strong>Rank (Baris):</strong> 1, 2, 3, 4, 5, 6, 7, 8 (dari bawah ke atas)</li>
                            <li><strong>Contoh:</strong> Kotak kiri bawah adalah a1, kanan atas h8</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>🎯 Aturan Setup:</strong> Papan harus diposisikan dengan kotak putih di pojok kanan bawah setiap pemain.
                    </div>
                `,
                showBoard: true,
                boardSetup: "empty",
                highlights: []
            },
            {
                title: "♟️ Setup Bidak - Posisi Awal",
                content: `
                    <h3>🏗️ Setup Bidak yang Benar</h3>
                    <p>Setiap pemain memulai dengan 16 bidak yang disusun dalam formasi standar.</p>
                    <div class="tutorial-highlight">
                        <h4>👑 Bidak Putih (Anda):</h4>
                        <ul>
                            <li><strong>Baris 1:</strong> Benteng, Kuda, Gajah, Ratu, Raja, Gajah, Kuda, Benteng</li>
                            <li><strong>Baris 2:</strong> 8 Pion</li>
                        </ul>
                        <h4>♚ Bidak Hitam (Lawan):</h4>
                        <ul>
                            <li><strong>Baris 8:</strong> Benteng, Kuda, Gajah, Ratu, Raja, Gajah, Kuda, Benteng</li>
                            <li><strong>Baris 7:</strong> 8 Pion</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>👸 Ingat:</strong> Ratu putih di kotak putih (d1), ratu hitam di kotak hitam (d8) - "Queen on her color!"
                    </div>
                `,
                showBoard: true,
                boardSetup: "standard",
                highlights: [
                    {row: 0, col: 3, type: "tutorial-highlight"}, // Ratu hitam
                    {row: 7, col: 3, type: "tutorial-highlight"}  // Ratu putih
                ]
            },
            {
                title: "♙ Pion - Bidak Terdepan",
                content: `
                    <h3>🎯 Mari Belajar Gerakan Pion</h3>
                    <p>Pion adalah bidak terdepan yang melindungi bidak lain. Meski terlihat lemah, pion sangat penting!</p>
                    <div class="tutorial-highlight">
                        <h4>📋 Cara Pion Bergerak:</h4>
                        <ul>
                            <li><strong>Normal:</strong> Maju 1 kotak ke depan</li>
                            <li><strong>Langkah Pertama:</strong> Boleh maju 2 kotak</li>
                            <li><strong>Menangkap:</strong> Diagonal ke depan (tidak bisa menangkap ke depan langsung)</li>
                            <li><strong>En Passant:</strong> Aturan khusus tangkap pion</li>
                            <li><strong>Promosi:</strong> Jadi bidak lain saat mencapai ujung papan</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>💡 Strategi:</strong> Pion tidak bisa mundur, jadi pikir baik-baik sebelum memajukan pion!
                    </div>
                `,
                showBoard: true,
                boardSetup: "pawn-demo",
                highlights: [
                    {row: 6, col: 4, type: "tutorial-highlight"}, // Pion putih e2
                    {row: 4, col: 4, type: "tutorial-target"},    // Kemungkinan gerakan
                    {row: 5, col: 4, type: "tutorial-target"}     // Kemungkinan gerakan
                ]
            },
            {
                title: "♖ Benteng - Kekuatan Garis Lurus",
                content: `
                    <h3>🏰 Benteng - Bidak yang Kuat</h3>
                    <p>Benteng adalah salah satu bidak terkuat yang bergerak dalam garis lurus tanpa batas.</p>
                    <div class="tutorial-highlight">
                        <h4>📋 Cara Benteng Bergerak:</h4>
                        <ul>
                            <li><strong>Horizontal:</strong> Ke kiri atau kanan tanpa batas</li>
                            <li><strong>Vertikal:</strong> Ke atas atau bawah tanpa batas</li>
                            <li><strong>Tidak bisa:</strong> Bergerak diagonal atau melompati bidak</li>
                            <li><strong>Rokade:</strong> Gerakan khusus dengan raja</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>🎯 Nilai:</strong> Benteng bernilai 5 poin, sangat berharga untuk mengontrol file dan rank!
                    </div>
                `,
                showBoard: true,
                boardSetup: "rook-demo",
                highlights: [
                    {row: 4, col: 4, type: "tutorial-highlight"} // Benteng di tengah
                ]
            },
            {
                title: "♘ Kuda - Gerakan Unik",
                content: `
                    <h3>🐎 Kuda - Bidak dengan Gerakan Unik</h3>
                    <p>Kuda adalah satu-satunya bidak yang bisa melompati bidak lain dengan pola gerakan bentuk "L".</p>
                    <div class="tutorial-highlight">
                        <h4>📋 Cara Kuda Bergerak:</h4>
                        <ul>
                            <li><strong>Pola L:</strong> 2 kotak ke satu arah + 1 kotak tegak lurus</li>
                            <li><strong>Melompat:</strong> Bisa melewati bidak lain</li>
                            <li><strong>8 Gerakan:</strong> Maksimal 8 kemungkinan dari tengah papan</li>
                            <li><strong>Taktik:</strong> Sangat efektif untuk serangan mendadak</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>💡 Tip:</strong> Kuda paling kuat di tengah papan, lemah di pojok!
                    </div>
                `,
                showBoard: true,
                boardSetup: "knight-demo",
                highlights: [
                    {row: 4, col: 4, type: "tutorial-highlight"} // Kuda di tengah
                ]
            },
            {
                title: "♗ Gajah - Kekuatan Diagonal",
                content: `
                    <h3>🔷 Gajah - Master Diagonal</h3>
                    <p>Gajah bergerak secara diagonal dan sangat kuat untuk mengontrol kotak-kotak diagonal panjang.</p>
                    <div class="tutorial-highlight">
                        <h4>📋 Cara Gajah Bergerak:</h4>
                        <ul>
                            <li><strong>Diagonal:</strong> Semua arah diagonal tanpa batas</li>
                            <li><strong>Warna Tetap:</strong> Selalu di warna kotak yang sama</li>
                            <li><strong>Tidak bisa:</strong> Melompati bidak atau pindah warna kotak</li>
                            <li><strong>Pasangan:</strong> Setiap pemain punya gajah kotak putih & hitam</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>🎯 Strategi:</strong> Gajah sangat kuat di papan terbuka, lemah jika terhalang pion!
                    </div>
                `,
                showBoard: true,
                boardSetup: "bishop-demo",
                highlights: [
                    {row: 4, col: 4, type: "tutorial-highlight"} // Gajah di tengah
                ]
            },
            {
                title: "♕ Ratu - Bidak Terkuat",
                content: `
                    <h3>👑 Ratu - The Ultimate Piece</h3>
                    <p>Ratu adalah bidak terkuat yang menggabungkan kekuatan benteng dan gajah!</p>
                    <div class="tutorial-highlight">
                        <h4>📋 Cara Ratu Bergerak:</h4>
                        <ul>
                            <li><strong>8 Arah:</strong> Horizontal, vertikal, dan diagonal</li>
                            <li><strong>Tanpa Batas:</strong> Sepanjang tidak terhalang bidak</li>
                            <li><strong>Paling Kuat:</strong> Bernilai 9 poin</li>
                            <li><strong>Penting:</strong> Jangan dimainkan terlalu awal!</li>
                        </ul>
                    </div>
                    <div class="tutorial-warning">
                        <strong>⚠️ Hati-hati:</strong> Ratu sangat berharga. Jangan sampai diserang di awal permainan!
                    </div>
                `,
                showBoard: true,
                boardSetup: "queen-demo",
                highlights: [
                    {row: 4, col: 4, type: "tutorial-highlight"} // Ratu di tengah
                ]
            },
            {
                title: "♔ Raja - Bidak Terpenting",
                content: `
                    <h3>🛡️ Raja - Bidak yang Harus Dilindungi</h3>
                    <p>Raja adalah bidak terpenting. Jika raja terancam dan tidak bisa diselamatkan (skakmat), permainan berakhir!</p>
                    <div class="tutorial-highlight">
                        <h4>📋 Cara Raja Bergerak:</h4>
                        <ul>
                            <li><strong>1 Kotak:</strong> Ke segala arah, tapi hanya 1 kotak</li>
                            <li><strong>Tidak Boleh:</strong> Masuk ke kotak yang diserang lawan</li>
                            <li><strong>Rokade:</strong> Gerakan khusus dengan benteng</li>
                            <li><strong>Endgame:</strong> Menjadi bidak aktif di akhir permainan</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>🛡️ Keamanan:</strong> Prioritas utama adalah menjaga keamanan raja Anda!
                    </div>
                `,
                showBoard: true,
                boardSetup: "king-demo",
                highlights: [
                    {row: 4, col: 4, type: "tutorial-highlight"} // Raja di tengah
                ]
            },
            {
                title: "🎓 Selamat! Tutorial Selesai",
                content: `
                    <h3>🎉 Anda Telah Menyelesaikan Tutorial Dasar!</h3>
                    <p>Selamat! Anda sudah mempelajari dasar-dasar catur. Sekarang saatnya untuk berlatih!</p>
                    <div class="tutorial-highlight">
                        <h4>✅ Yang Sudah Anda Pelajari:</h4>
                        <ul>
                            <li>🏁 Setup papan catur dan koordinat</li>
                            <li>♟️ Cara bergerak semua bidak catur</li>
                            <li>🎯 Nilai relatif setiap bidak</li>
                            <li>⚡ Aturan dasar permainan catur</li>
                        </ul>
                    </div>
                    <div class="tutorial-tip">
                        <strong>🚀 Langkah Selanjutnya:</strong> Mulai bermain melawan AI untuk berlatih! Pilih level mudah dulu untuk membiasakan diri.
                    </div>
                `,
                showBoard: false
            }
        ];

        this.currentTutorialStep = 0;
        this.tutorialBoard = null;
    }

    startTutorialMode() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('tutorialModal').style.display = 'block';

        this.setupTutorialSystem();
        this.currentTutorialStep = 0;
        this.showTutorialStep();
    }

    showTutorialStep() {
        const step = this.tutorialData[this.currentTutorialStep];
        const totalSteps = this.tutorialData.length;

        // Update header
        document.getElementById('tutorialTitle').textContent = step.title;
        document.getElementById('tutorialProgress').textContent = `${this.currentTutorialStep + 1} / ${totalSteps}`;

        // Update navigation buttons
        document.getElementById('tutorialPrevBtn').disabled = this.currentTutorialStep === 0;
        document.getElementById('tutorialNextBtn').style.display = this.currentTutorialStep === totalSteps - 1 ? 'none' : 'inline-block';
        document.getElementById('tutorialComplete').style.display = this.currentTutorialStep === totalSteps - 1 ? 'inline-block' : 'none';

        // Update content
        document.getElementById('tutorialStep').innerHTML = step.content;

        // Handle board display
        const boardContainer = document.getElementById('tutorialBoardContainer');
        if (step.showBoard) {
            boardContainer.style.display = 'block';
            this.createTutorialBoard(step);
        } else {
            boardContainer.style.display = 'none';
        }
    }

    createTutorialBoard(step) {
        const boardElement = document.getElementById('tutorialBoard');
        boardElement.innerHTML = '';

        // Create 8x8 grid
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                // Add piece based on setup
                if (step.boardSetup === 'standard') {
                    const piece = this.getTutorialPiece(row, col, 'standard');
                    if (piece) {
                        square.textContent = this.engine.getPieceSymbol(piece);
                    }
                } else if (step.boardSetup === 'pawn-demo') {
                    if (row === 6 && col === 4) square.textContent = '♙'; // White pawn
                    if (row === 1 && col === 4) square.textContent = '♟'; // Black pawn
                } else if (step.boardSetup === 'rook-demo') {
                    if (row === 4 && col === 4) square.textContent = '♖'; // White rook
                } else if (step.boardSetup === 'knight-demo') {
                    if (row === 4 && col === 4) square.textContent = '♘'; // White knight
                } else if (step.boardSetup === 'bishop-demo') {
                    if (row === 4 && col === 4) square.textContent = '♗'; // White bishop
                } else if (step.boardSetup === 'queen-demo') {
                    if (row === 4 && col === 4) square.textContent = '♕'; // White queen
                } else if (step.boardSetup === 'king-demo') {
                    if (row === 4 && col === 4) square.textContent = '♔'; // White king
                }

                // Add highlights
                if (step.highlights) {
                    const highlight = step.highlights.find(h => h.row === row && h.col === col);
                    if (highlight) {
                        square.classList.add(highlight.type);
                    }
                }

                boardElement.appendChild(square);
            }
        }
    }

    getTutorialPiece(row, col, setup) {
        if (setup !== 'standard') return null;

        // Standard chess setup
        const startPosition = [
            [
                {type: 'rook', color: 'black'}, {type: 'knight', color: 'black'}, 
                {type: 'bishop', color: 'black'}, {type: 'queen', color: 'black'}, 
                {type: 'king', color: 'black'}, {type: 'bishop', color: 'black'}, 
                {type: 'knight', color: 'black'}, {type: 'rook', color: 'black'}
            ],
            Array(8).fill({type: 'pawn', color: 'black'}),
            Array(8).fill(null),
            Array(8).fill(null),
            Array(8).fill(null),
            Array(8).fill(null),
            Array(8).fill({type: 'pawn', color: 'white'}),
            [
                {type: 'rook', color: 'white'}, {type: 'knight', color: 'white'}, 
                {type: 'bishop', color: 'white'}, {type: 'queen', color: 'white'}, 
                {type: 'king', color: 'white'}, {type: 'bishop', color: 'white'}, 
                {type: 'knight', color: 'white'}, {type: 'rook', color: 'white'}
            ]
        ];

        return startPosition[row][col];
    }

    setupEventListeners() {
        // Tutorial navigation
        const tutorialPrevBtn = document.getElementById('tutorialPrevBtn');
        const tutorialNextBtn = document.getElementById('tutorialNextBtn');
        const tutorialSkip = document.getElementById('tutorialSkip');
        const tutorialComplete = document.getElementById('tutorialComplete');
        const tutorialClose = document.querySelector('.tutorial-close');

        if (tutorialPrevBtn) {
            tutorialPrevBtn.addEventListener('click', () => {
                if (this.currentTutorialStep > 0) {
                    this.currentTutorialStep--;
                    this.showTutorialStep();
                }
            });
        }

        if (tutorialNextBtn) {
            tutorialNextBtn.addEventListener('click', () => {
                if (this.currentTutorialStep < this.tutorialData.length - 1) {
                    this.currentTutorialStep++;
                    this.showTutorialStep();
                }
            });
        }

        if (tutorialSkip || tutorialComplete) {
            const completeTutorial = () => {
                document.getElementById('tutorialModal').style.display = 'none';
                document.getElementById('welcomeScreen').style.display = 'flex';

                // Reset tutorial selections
                document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
                document.getElementById('startGameFromWelcome').disabled = true;
                this.selectedGameMode = null;

                this.showToast('🎓 Tutorial selesai! Silakan pilih mode permainan.', 'success');
            };

            if (tutorialSkip) tutorialSkip.addEventListener('click', completeTutorial);
            if (tutorialComplete) tutorialComplete.addEventListener('click', completeTutorial);
        }

        if (tutorialClose) {
            tutorialClose.addEventListener('click', () => {
                document.getElementById('tutorialModal').style.display = 'none';
                document.getElementById('welcomeScreen').style.display = 'flex';

                // Reset tutorial selections
                document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
                document.getElementById('startGameFromWelcome').disabled = true;
                this.selectedGameMode = null;
            });
        }

        // Close tutorial modal when clicking outside
        const tutorialModal = document.getElementById('tutorialModal');
        if (tutorialModal) {
            window.addEventListener('click', (e) => {
                if (e.target === tutorialModal) {
                    tutorialModal.style.display = 'none';
                    document.getElementById('welcomeScreen').style.display = 'flex';

                    // Reset tutorial selections
                    document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
                    document.getElementById('startGameFromWelcome').disabled = true;
                    this.selectedGameMode = null;
                }
            });
        }

        // Welcome screen buttons
        const updateInfoBtn = document.getElementById('updateInfoBtn');
        const updateInfoModal = document.getElementById('updateInfoModal');
        const updateCloseBtn = document.querySelector('.update-close');
        const themeBtn = document.getElementById('themeBtn');
        const themeModal = document.getElementById('themeModal');
        const themeCloseBtn = document.querySelector('.theme-close');
        const howToPlayBtn = document.getElementById('howToPlayBtn');
        const howToPlayModal = document.getElementById('howToPlayModal');
        const howToPlayCloseBtn = document.querySelector('.how-to-play-close');
        const howToPlayCloseBtnFooter = document.querySelector('.how-to-play-close-btn');
        const myDeveloperBtn = document.getElementById('myDeveloperBtn');
        const myDeveloperModal = document.getElementById('myDeveloperModal');
        const developerCloseBtn = document.querySelector('.developer-close');
        const developerCloseBtnFooter = document.querySelector('.developer-close-btn');

        if (updateInfoBtn && updateInfoModal) {
            updateInfoBtn.addEventListener('click', () => {
                updateInfoModal.style.display = 'block';
            });
        }

        if (updateCloseBtn && updateInfoModal) {
            updateCloseBtn.addEventListener('click', () => {
                updateInfoModal.style.display = 'none';
            });
        }

        // Theme modal functionality
        if (themeBtn && themeModal) {
            themeBtn.addEventListener('click', () => {
                themeModal.style.display = 'block';
                this.loadSavedTheme();
            });
        }

        if (themeCloseBtn && themeModal) {
            themeCloseBtn.addEventListener('click', () => {
                themeModal.style.display = 'none';
            });
        }

        // How to Play modal functionality
        if (howToPlayBtn && howToPlayModal) {
            howToPlayBtn.addEventListener('click', () => {
                howToPlayModal.style.display = 'block';
            });
        }

        if (howToPlayCloseBtn && howToPlayModal) {
            howToPlayCloseBtn.addEventListener('click', () => {
                howToPlayModal.style.display = 'none';
            });
        }

        if (howToPlayCloseBtnFooter && howToPlayModal) {
            howToPlayCloseBtnFooter.addEventListener('click', () => {
                howToPlayModal.style.display = 'none';
            });
        }

        // Close how to play modal when clicking outside
        if (howToPlayModal) {
            window.addEventListener('click', (e) => {
                if (e.target === howToPlayModal) {
                    howToPlayModal.style.display = 'none';
                }
            });
        }

        // Theme selection functionality
        const themeCards = document.querySelectorAll('.theme-card');
        const applyThemeBtn = document.getElementById('applyTheme');
        const resetThemeBtn = document.getElementById('resetTheme');

        themeCards.forEach(card => {
            card.addEventListener('click', () => {
                themeCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });

        if (applyThemeBtn) {
            applyThemeBtn.addEventListener('click', () => {
                this.applySelectedTheme();
            });
        }

        if (resetThemeBtn) {
            resetThemeBtn.addEventListener('click', () => {
                this.resetToDefaultTheme();
            });
        }

        // Close theme modal when clicking outside
        if (themeModal) {
            window.addEventListener('click', (e) => {
                if (e.target === themeModal) {
                    themeModal.style.display = 'none';
                }
            });
        }

        // My Developer modal functionality
        if (myDeveloperBtn && myDeveloperModal) {
            myDeveloperBtn.addEventListener('click', () => {
                myDeveloperModal.style.display = 'block';
                // Animate skill bars after modal opens
                setTimeout(() => {
                    this.animateSkillBars();
                }, 300);
            });
        }

        // Uptime modal functionality
        const uptimeBtn = document.getElementById('uptimeBtn');
        const uptimeModal = document.getElementById('uptimeModal');
        const uptimeCloseBtn = document.querySelector('.uptime-close');
        const uptimeCloseBtnFooter = document.querySelector('.uptime-close-btn');

        if (uptimeBtn && uptimeModal) {
            uptimeBtn.addEventListener('click', () => {
                this.showUptimeModal();
            });
        }

        if (uptimeCloseBtn && uptimeModal) {
            uptimeCloseBtn.addEventListener('click', () => {
                uptimeModal.style.display = 'none';
            });
        }

        if (uptimeCloseBtnFooter && uptimeModal) {
            uptimeCloseBtnFooter.addEventListener('click', () => {
                uptimeModal.style.display = 'none';
            });
        }

        // Close uptime modal when clicking outside
        if (uptimeModal) {
            window.addEventListener('click', (e) => {
                if (e.target === uptimeModal) {
                    uptimeModal.style.display = 'none';
                    if (this.uptimeInterval) {
                        clearInterval(this.uptimeInterval);
                    }
                }
            });
        }

        // System info refresh button
        const refreshSystemInfoBtn = document.getElementById('refreshSystemInfo');
        if (refreshSystemInfoBtn) {
            refreshSystemInfoBtn.addEventListener('click', () => {
                this.updateUptimeInfo();
                // Visual feedback
                refreshSystemInfoBtn.textContent = '✅ Updated!';
                setTimeout(() => {
                    refreshSystemInfoBtn.textContent = '🔄 Refresh';
                }, 1500);
            });
        }

        if (developerCloseBtn && myDeveloperModal) {
            developerCloseBtn.addEventListener('click', () => {
                myDeveloperModal.style.display = 'none';
            });
        }

        if (developerCloseBtnFooter && myDeveloperModal) {
            developerCloseBtnFooter.addEventListener('click', () => {
                myDeveloperModal.style.display = 'none';
            });
        }

        // Close developer modal when clicking outside
        if (myDeveloperModal) {
            window.addEventListener('click', (e) => {
                if (e.target === myDeveloperModal) {
                    myDeveloperModal.style.display = 'none';
                }
            });
        }

        // Close update modal when clicking outside
        if (updateInfoModal) {
            window.addEventListener('click', (e) => {
                if (e.target === updateInfoModal) {
                    updateInfoModal.style.display = 'none';
                }
            });
        }

        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeModal = document.querySelector('.close');
        const startGameBtn = document.getElementById('startGame');

        // Toggle statistics
        const toggleStatsBtn = document.getElementById('toggleStats');
        const statisticsContent = document.getElementById('statisticsContent');

        settingsBtn.addEventListener('click', () => {
            this.updateSettingsModal();
            settingsModal.style.display = 'block';
        });

        if (toggleStatsBtn && statisticsContent) {
            toggleStatsBtn.addEventListener('click', () => {
                console.log('Statistics toggle clicked');
                const isVisible = statisticsContent.classList.contains('show');
                console.log('Current visibility:', isVisible);

                if (isVisible) {
                    statisticsContent.classList.remove('show');
                    toggleStatsBtn.textContent = '📈 Tampilkan Statistik';
                    console.log('Hiding statistics');
                } else {
                    statisticsContent.classList.add('show');
                    toggleStatsBtn.textContent = '📉 Sembunyikan Statistik';
                    this.updateInlineStats();
                    console.log('Showing statistics');
                }
            });
        } else {
            console.error('Statistics toggle elements not found:', {
                toggleStatsBtn: !!toggleStatsBtn,
                statisticsContent: !!statisticsContent
            });
        }

        closeModal.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });

        startGameBtn.addEventListener('click', () => {
            this.applySettings();
            settingsModal.style.display = 'none';
            this.newGame();
        });

        // Game controls
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());

        // Tournament controls
        const startNewRoundBtn = document.getElementById('startNewRoundBtn');
        if (startNewRoundBtn) {
            startNewRoundBtn.addEventListener('click', () => this.startNewRound());
        }

        // Settings controls
        const botSpeedSlider = document.getElementById('botSpeed');
        const speedValue = document.getElementById('speedValue');

        botSpeedSlider.addEventListener('input', (e) => {
            speedValue.textContent = `${e.target.value}s`;
        });

        // Log controls
        const downloadLogBtn = document.getElementById('downloadLogBtn');
        const clearLogBtn = document.getElementById('clearLogBtn');

        if (downloadLogBtn) {
            downloadLogBtn.addEventListener('click', () => this.downloadGameLog());
        }

        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', () => this.clearGameLog());
        }
    }

    updateSettingsModal() {
        const gameModeSelect = document.getElementById('gameMode');
        const currentMode = this.engine.gameMode;

        // Update game mode select options based on current mode
        if (currentMode === 'bot-vs-bot') {
            // Hide player vs bot option in bot vs bot mode
            gameModeSelect.innerHTML = `
                <option value="bot-vs-bot" selected>Bot vs Bot</option>
            `;
        } else {
            // Show all options in other modes
            gameModeSelect.innerHTML = `
                <option value="player-vs-bot" ${currentMode === 'player-vs-bot' ? 'selected' : ''}>Pemain vs Bot</option>
                <option value="bot-vs-bot" ${currentMode === 'bot-vs-bot' ? 'selected' : ''}>Bot vs Bot</option>
            `;
        }

        // Set current difficulty
        document.getElementById('difficulty').value = this.engine.difficulty;
        document.getElementById('botSpeed').value = this.engine.botSpeed / 1000;
        document.getElementById('speedValue').textContent = `${this.engine.botSpeed / 1000}s`;
    }

    // Method untuk batch UI updates dan mengurangi reflow
    batchUIUpdate(updateFunction) {
        if (this.isUIBusy) return;

        this.isUIBusy = true;
        requestAnimationFrame(() => {
            updateFunction();
            this.isUIBusy = false;
        });
    }

    updateInlineStats() {
        // Update White Stats
        const whiteStatsElement = document.getElementById('whiteStatsInline');
        if (whiteStatsElement) {
            const whiteCapturedText = this.formatCapturedPieces(this.gameStats.white.captured);
            const whiteTotalValue = this.gameStats.white.totalValue;
            const whiteMoveQuality = this.formatMoveQuality(this.gameStats.white.moveQuality);

            whiteStatsElement.innerHTML = `
                <div class="captured-pieces-inline">♔ Tangkapan: ${whiteCapturedText}</div>
                <div class="total-value-inline">💰 Total Nilai: ${whiteTotalValue}</div>
                <div class="move-quality-inline">🎯 Kualitas Langkah: ${whiteMoveQuality}</div>
            `;
        }

        // Update Black Stats  
        const blackStatsElement = document.getElementById('blackStatsInline');
        if (blackStatsElement) {
            const blackCapturedText = this.formatCapturedPieces(this.gameStats.black.captured);
            const blackTotalValue = this.gameStats.black.totalValue;
            const blackMoveQuality = this.formatMoveQuality(this.gameStats.black.moveQuality);

            blackStatsElement.innerHTML = `
                <div class="captured-pieces-inline">♚ Tangkapan: ${blackCapturedText}</div>
                <div class="total-value-inline">💰 Total Nilai: ${blackTotalValue}</div>
                <div class="move-quality-inline">🎯 Kualitas Langkah: ${blackMoveQuality}</div>
            `;
        }

        console.log('📊 Inline stats updated:', {
            white: this.gameStats.white,
            black: this.gameStats.black
        });
    }

    formatCapturedPieces(captured) {
        const captureList = [];
        const pieceSymbols = {
            'pawn': '♟️', 'rook': '♜', 'knight': '♞',
            'bishop': '♝', 'queen': '♛', 'king': '♚'
        };

        Object.entries(captured).forEach(([piece, count]) => {
            if (count > 0) {
                captureList.push(`${pieceSymbols[piece]}${count}`);
            }
        });

        return captureList.length > 0 ? captureList.join(' ') : 'Tidak ada';
    }

    evaluateMoveQuality(move) {
        if (!move || !move.player) return;

        const playerColor = move.player;
        let moveQuality = 'best'; // Default quality

        // Ensure moveQuality object exists and is initialized
        if (!this.gameStats[playerColor].moveQuality) {
            this.gameStats[playerColor].moveQuality = {
                brilliant: 0,
                great: 0,
                best: 0,
                mistake: 0,
                miss: 0,
                blunder: 0
            };
        }

        try {
            // Evaluate based on different criteria
            const capturedValue = move.captured ? this.engine.pieceValues[move.captured.type] : 0;
            const movingPieceValue = this.engine.pieceValues[move.piece.type];

            // Check if move puts opponent in check
            const opponentInCheck = this.engine.isInCheck(playerColor === 'white' ? 'black' : 'white');

            // Brilliant move criteria
            if (capturedValue >= 9 || // Queen capture
                move.promotion === 'queen' || // Pawn promotion
                (opponentInCheck && capturedValue >= 5) || // Check + valuable capture
                move.castling) { // Castling move
                moveQuality = 'brilliant';
            }
            // Great move criteria
            else if (capturedValue >= 5 || // Rook/Queen capture
                    opponentInCheck || // Putting opponent in check
                    (move.piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2)) { // Pawn advance
                moveQuality = 'great';
            }
            // Check for mistakes/blunders
            else if (this.wouldLoseMaterial(move)) {
                if (movingPieceValue >= 5) {
                    moveQuality = 'blunder'; // Losing valuable piece
                } else {
                    moveQuality = 'mistake'; // Losing less valuable piece
                }
            }
            // Miss - neutral move with no clear benefit
            else if (capturedValue === 0 && !opponentInCheck && !this.improvesPosition(move)) {
                moveQuality = 'miss';
            }

            // Update statistics safely
            if (this.gameStats[playerColor] && this.gameStats[playerColor].moveQuality) {
                this.gameStats[playerColor].moveQuality[moveQuality]++;
            }

            console.log(`📊 Move quality: ${playerColor} made a ${moveQuality} move`);
        } catch (error) {
            console.error('Error in evaluateMoveQuality:', error);
            // Fallback to best move if error occurs
            if (this.gameStats[playerColor] && this.gameStats[playerColor].moveQuality) {
                this.gameStats[playerColor].moveQuality.best++;
            }
        }
    }

    wouldLoseMaterial(move) {
        // Simple check if the piece can be captured after this move
        const toRow = move.to.row;
        const toCol = move.to.col;
        const piece = move.piece;

        // Check if any opponent piece can capture this position
        const opponentColor = piece.color === 'white' ? 'black' : 'white';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const opponentPiece = this.engine.board[row][col];
                if (opponentPiece && opponentPiece.color === opponentColor) {
                    if (this.engine.isValidPieceMove(opponentPiece, row, col, toRow, toCol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    improvesPosition(move) {
        // Simple position improvement check
        const piece = move.piece;
        const fromRow = move.from.row;
        const toRow = move.to.row;
        const toCol = move.to.col;

        // Check if moving towards center
        const centerDistance = Math.abs(3.5 - toRow) + Math.abs(3.5 - toCol);
        const oldCenterDistance = Math.abs(3.5 - fromRow) + Math.abs(3.5 - move.from.col);

        // Check piece development
        if (piece.type === 'knight' || piece.type === 'bishop') {
            const startRow = piece.color === 'white' ? 7 : 0;
            if (fromRow === startRow) return true; // Developing piece
        }

        return centerDistance < oldCenterDistance;
    }

    formatMoveQuality(moveQuality, showTooltip = false) {
        if (!moveQuality) {
            return '🔸 Belum ada langkah';
        }

        const qualities = [];
        const explanations = {
            brilliant: 'Langkah cemerlang - strategi istimewa seperti tangkap bidak berharga, promosi, atau kombinasi brilian',
            great: 'Langkah bagus - keputusan tactical yang baik seperti skak, tangkap bidak, atau posisi menguntungkan',
            best: 'Langkah terbaik - gerakan standar yang optimal sesuai strategi catur',
            mistake: 'Kesalahan kecil - langkah kurang optimal yang masih dapat diperbaiki',
            miss: 'Langkah netral - gerakan biasa tanpa dampak strategis yang signifikan',
            blunder: 'Blunder besar - kesalahan fatal yang merugikan posisi secara drastis'
        };

        if (moveQuality.brilliant > 0) {
            qualities.push(`🌟 Cemerlang: ${moveQuality.brilliant}`);
        }
        if (moveQuality.great > 0) {
            qualities.push(`🎯 Bagus: ${moveQuality.great}`);
        }
        if (moveQuality.best > 0) {
            qualities.push(`✅ Terbaik: ${moveQuality.best}`);
        }
        if (moveQuality.mistake > 0) {
            qualities.push(`⚠️ Keliru: ${moveQuality.mistake}`);
        }
        if (moveQuality.miss > 0) {
            qualities.push(`😐 Netral: ${moveQuality.miss}`);
        }
        if (moveQuality.blunder > 0) {
            qualities.push(`💥 Blunder: ${moveQuality.blunder}`);
        }

        if (qualities.length === 0) {
            return '🔸 Belum ada langkah';
        }

        let result = qualities.join(' • ');

        // Tambahkan penjelasan singkat untuk kualitas move tertinggi
        if (showTooltip) {
            if (moveQuality.brilliant > 0) {
                result += `\n📝 ${explanations.brilliant}`;
            } else if (moveQuality.great > 0) {
                result += `\n📝 ${explanations.great}`;
            } else if (moveQuality.best > 0) {
                result += `\n📝 ${explanations.best}`;
            } else if (moveQuality.blunder > 0) {
                result += `\n📝 ${explanations.blunder}`;
            } else if (moveQuality.mistake > 0) {
                result += `\n📝 ${explanations.mistake}`;
            } else if (moveQuality.miss > 0) {
                result += `\n📝 ${explanations.miss}`;
            }
        }

        return result;
    }

    applySettings() {
        this.engine.gameMode = document.getElementById('gameMode').value;
        this.engine.difficulty = document.getElementById('difficulty').value;
        this.engine.botSpeed = document.getElementById('botSpeed').value * 1000;

        this.logMove(`Pengaturan: Mode ${this.engine.gameMode}, Kesulitan ${this.engine.difficulty}`);
    }

    newGame() {
        clearInterval(this.timerInterval);
        this.botThinking = false;

        // Show welcome screen again
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';

        // Reset selections
        document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('difficultySelection').style.display = 'none';
        document.getElementById('startGameFromWelcome').disabled = true;

        this.selectedGameMode = null;
        this.selectedDifficulty = null;

        // Reset game state
        this.engine.resetGame();
        this.resetGameStats();
        this.timers = { white: 600, black: 600 };
        this.isPaused = false;
    }

    undoMove() {
        if (this.engine.gameHistory.length > 0 && !this.botThinking) {
            this.engine.undoMove();
            this.updateBoard();
            this.updateGameInfo();
            this.logMove("Langkah dibatalkan");
        }
    }

    trackCapture(move) {
        const capturedPiece = move.captured;
        const capturePlayer = move.player;

        if (capturedPiece && capturedPiece.type !== 'king') {
            // Initialize captured object if needed
            if (!this.gameStats[capturePlayer].captured[capturedPiece.type]) {
                this.gameStats[capturePlayer].captured[capturedPiece.type] = 0;
            }

            // Increment capture count
            this.gameStats[capturePlayer].captured[capturedPiece.type]++;

            // Add piece value
            const pieceValue = this.engine.pieceValues[capturedPiece.type] || 0;
            this.gameStats[capturePlayer].totalValue += pieceValue;

            console.log(`📈 Capture tracked: ${capturePlayer} captured ${capturedPiece.type} (+${pieceValue} points)`);
            console.log(`📊 Current captures for ${capturePlayer}:`, this.gameStats[capturePlayer].captured);
            console.log(`💰 Total value for ${capturePlayer}:`, this.gameStats[capturePlayer].totalValue);

            // Always update inline stats after capture
            this.updateInlineStats();

            // Force update display even if statistics are hidden
            const statisticsContent = document.getElementById('statisticsContent');
            if (statisticsContent && statisticsContent.style.display === 'block') {
                setTimeout(() => this.updateInlineStats(), 100);
            }
        }
    }

    addRoundToHistory(roundNumber, whiteCaptured, blackCaptured, whiteValue, blackValue, winner, drawReason = null) {
        try {
            const historyList = document.getElementById('roundHistoryList');
            if (!historyList) return;

            const historyEntry = document.createElement('div');
            historyEntry.className = 'round-history-entry';

            const whiteCaptureText = this.formatCapturedPieces(whiteCaptured || {});
            const blackCaptureText = this.formatCapturedPieces(blackCaptured || {});

            // Format move quality for history
            const whiteMoveQuality = this.formatMoveQuality(this.gameStats.white.moveQuality || {});
            const blackMoveQuality = this.formatMoveQuality(this.gameStats.black.moveQuality || {});

            let resultText = '';
            let resultClass = '';

            if (drawReason) {
                resultText = `🤝 Seri (${drawReason})`;
                resultClass = 'draw-result';
            } else if (winner === 'Alpha-AI') {
                resultText = '🏆 Alpha-AI Menang';
                resultClass = 'white-win';
            } else if (winner === 'Beta-AI') {
                resultText = '🏆 Beta-AI Menang';
                resultClass = 'black-win';
            } else {
                resultText = '🤝 Seri';
                resultClass = 'draw-result';
            }

            historyEntry.innerHTML = `
                <div class="round-header">
                    <h4>🎯 Round ${roundNumber}</h4>
                    <span class="round-result ${resultClass}">${resultText}</span>
                </div>
                <div class="round-stats">
                    <div class="player-round-stats">
                        <div class="player-name">♔ Alpha-AI</div>
                        <div class="round-captures">Tangkapan: ${whiteCaptureText}</div>
                        <div class="round-value">Total Nilai: ${whiteValue || 0}</div>
                        <div class="round-quality">Kualitas: ${whiteMoveQuality}</div>
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="player-round-stats">
                        <div class="player-name">♚ Beta-AI</div>
                        <div class="round-captures">Tangkapan: ${blackCaptureText}</div>
                        <div class="round-value">Total Nilai: ${blackValue || 0}</div>
                        <div class="round-quality">Kualitas: ${blackMoveQuality}</div>
                    </div>
                </div>
            `;

            historyList.appendChild(historyEntry);

            // Auto scroll to bottom
            historyList.scrollTop = historyList.scrollHeight;
        } catch (error) {
            console.error('Error adding round to history:', error);
        }
    }

    // Placeholder for prediction accuracy update logic
    updatePredictionAccuracy(winnerColor) {
        if (this.engine.gameMode === 'bot-vs-bot') {
            // This is where you would implement logic to track how many times a bot was predicted to win
            // and how often that prediction was correct.
            // For now, it's a placeholder.
            console.log(`Prediction accuracy update for ${winnerColor} win.`);
        }
    }

    updateGameStats() {
        // Statistik sekarang ditampilkan di modal terpisah, tidak di log
        // Hanya update statistik internal
    }

    resetGameStats() {
        // Preserve statistics throughout the entire tournament
        const whiteWins = this.gameStats?.white?.wins || 0;
        const whiteLosses = this.gameStats?.white?.losses || 0;
        const blackWins = this.gameStats?.black?.wins || 0;
        const blackLosses = this.gameStats?.black?.losses || 0;

        // Keep ALL captured stats and values throughout tournament - NEVER reset during rounds
        const whiteCaptured = this.gameStats?.white?.captured || { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 };
        const blackCaptured = this.gameStats?.black?.captured || { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 };
        const whiteTotalValue = this.gameStats?.white?.totalValue || 0;
        const blackTotalValue = this.gameStats?.black?.totalValue || 0;

        // Only reset everything when starting completely new tournament from welcome screen
        const isCompleteTournamentReset = document.getElementById('welcomeScreen').style.display !== 'none' ||
                                        (this.tournamentSettings.currentRound === 1 &&
                                         this.tournamentSettings.roundWins.white === 0 &&
                                         this.tournamentSettings.roundWins.black === 0 &&
                                         this.tournamentSettings.drawCount === 0 &&
                                         whiteTotalValue === 0 && blackTotalValue === 0);

        if (isCompleteTournamentReset) {
            // Complete reset only for brand new tournament
            this.gameStats = {
                white: {
                    captured: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 },
                    totalValue: 0,
                    wins: 0,
                    losses: 0,
                    moveQuality: {
                        brilliant: 0,
                        great: 0,
                        best: 0,
                        mistake: 0,
                        miss: 0,
                        blunder: 0
                    }
                },
                black: {
                    captured: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 },
                    totalValue: 0,
                    wins: 0,
                    losses: 0,
                    moveQuality: {
                        brilliant: 0,
                        great: 0,
                        best: 0,
                        mistake: 0,
                        miss: 0,
                        blunder: 0
                    }
                }
            };

            // Create new round history container
            this.createRoundHistory();

            console.log('🔄 Tournament statistics completely reset for new tournament');
        } else {
            // PRESERVE ALL statistics during ongoing tournament - including captures and values
            const whiteMoveQuality = this.gameStats?.white?.moveQuality || {
                brilliant: 0, great: 0, best: 0, mistake: 0, miss: 0, blunder: 0
            };
            const blackMoveQuality = this.gameStats?.black?.moveQuality || {
                brilliant: 0, great: 0, best: 0, mistake: 0, miss: 0, blunder: 0
            };

            this.gameStats = {
                white: {
                    captured: whiteCaptured,
                    totalValue: whiteTotalValue,
                    wins: whiteWins,
                    losses: whiteLosses,
                    moveQuality: whiteMoveQuality
                },
                black: {
                    captured: blackCaptured,
                    totalValue: blackTotalValue,
                    wins: blackWins,
                    losses: blackLosses,
                    moveQuality: blackMoveQuality
                }
            };

            console.log('📊 Tournament statistics preserved during round:', {
                whiteCaptures: whiteCaptured,
                blackCaptures: blackCaptured,
                whiteValue: whiteTotalValue,
                blackValue: blackTotalValue
            });
        }

        // Remove existing stats element
        const statsElement = document.getElementById('gameStats');
        if (statsElement) {
            statsElement.remove();
        }
    }

    createRoundHistory() {
        // Create a container to store round-by-round statistics
        const existingHistory = document.getElementById('roundHistoryContainer');
        if (!existingHistory) {
            const historyContainer = document.createElement('div');
            historyContainer.id = 'roundHistoryContainer';
            historyContainer.className = 'round-history-container';
            historyContainer.innerHTML = `
                <h4>🏆 Riwayat Round</h4>
                <div id="roundHistoryList" class="round-history-list"></div>
            `;

            // Add it to statistics section
            const statsContent = document.getElementById('statisticsContent');
            if (statsContent) {
                statsContent.appendChild(historyContainer);
            }
        }
    }

    addRoundToHistory(roundNum, whiteCaptures, blackCaptures, whiteValue, blackValue, winner) {
        const historyList = document.getElementById('roundHistoryList');
        if (!historyList) return;

        // Tentukan penyebab kekalahan/kemenangan
        let gameEndReason = '';
        if (winner) {
            const loserColor = winner.includes('Alpha') ? 'black' : 'white';
            const winnerColor = winner.includes('Alpha') ? 'white' : 'black';

            // Analisis penyebab berdasarkan game end result
            const gameEndResult = this.engine.checkGameEnd();

            if (gameEndResult === 'king_captured') {
                gameEndReason = '👑 Raja Ditangkap - Kemenangan Langsung';
            } else if (gameEndResult === 'checkmate') {
                gameEndReason = '♔ Checkmate - Raja Terkepung Tanpa Jalan Keluar';
            } else if (this.engine.getAllValidMoves(loserColor).length === 0 && this.engine.isInCheck(loserColor)) {
                gameEndReason = '⚔️ Checkmate - Tidak Ada Langkah Valid';
            } else if (whiteValue > blackValue + 10) {
                gameEndReason = '💀 Dominasi Material Putih - Keunggulan Bidak';
            } else if (blackValue > whiteValue + 10) {
                gameEndReason = '💀 Dominasi Material Hitam - Keunggulan Bidak';
            } else if (this.engine.gameHistory.length > 50) {
                gameEndReason = '🧠 Strategi Jangka Panjang - Permainan Bertahan Lama';
            } else {
                gameEndReason = '⚡ Taktik Cepat - Kemenangan Strategis';
            }
        } else {
            gameEndReason = '🤝 Permainan Seimbang - Hasil Seri';
        }

        const roundEntry = document.createElement('div');
        roundEntry.className = 'round-history-entry';
        roundEntry.innerHTML = `
            <div class="round-header">
                <strong>Round ${roundNum}</strong>
                ${winner ? `<span class="round-winner">🏆 ${winner}</span>` : '<span class="round-draw">🤝 Seri</span>'}
            </div>
            <div class="round-reason">
                <small class="game-end-reason">${gameEndReason}</small>
            </div>
            <div class="round-stats">
                <div class="round-stat">♔ Alpha: ${whiteValue} poin (${this.formatCaptures(whiteCaptures)})</div>
                <div class="round-stat">♚ Beta: ${blackValue} poin (${this.formatCaptures(blackCaptures)})</div>
            </div>
        `;

        historyList.appendChild(roundEntry);

        // Auto scroll to bottom dengan smooth animation
        historyList.scrollTo({
            top: historyList.scrollHeight,
            behavior: 'smooth'
        });
    }

    formatCaptures(captures) {
        const captureList = [];
        Object.entries(captures).forEach(([piece, count]) => {
            if (count > 0) {
                const pieceSymbols = {
                    'pawn': '♟️', 'rook': '♜', 'knight': '♞',
                    'bishop': '♝', 'queen': '♛', 'king': '♚'
                };
                captureList.push(`${pieceSymbols[piece]}${count}`);
            }
        });
        return captureList.length > 0 ? captureList.join(' ') : 'Tidak ada';
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isPaused ? 'Lanjut' : 'Pause';
        this.logMove(this.isPaused ? "Game dipause" : "Game dilanjutkan");

        // Resume bot moves if unpaused in bot vs bot mode
        if (!this.isPaused && this.engine.gameMode === 'bot-vs-bot' && !this.botThinking && !this.engine.isGameOver()) {
            setTimeout(() => this.makeBotMove(), Math.min(this.engine.botSpeed, 500));
        }
    }

    startNewBotGame() {
        if (this.engine.gameMode !== 'bot-vs-bot') return;

        console.log('Starting new bot vs bot game...');

        // Reset game state and captures for new round but keep win/loss stats
        clearInterval(this.timerInterval);
        this.botThinking = false;
        this.engine.resetGame();
        this.timers = { white: 600, black: 600 };
        this.isPaused = false;

        // Keep win/loss stats but reset captures for fresh round
        const whiteWins = this.gameStats.white.wins;
        const whiteLosses = this.gameStats.white.losses;
        const blackWins = this.gameStats.black.wins;
        const blackLosses = this.gameStats.black.losses;

        // Reset captures and values for new round
        this.gameStats = {
            white: {
                captured: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 },
                totalValue: 0,
                wins: whiteWins,
                losses: whiteLosses
            },
            black: {
                captured: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0 },
                totalValue: 0,
                wins: blackWins,
                losses: blackLosses
            }
        };

        // Clear game log for new round (fresh start)
        this.gameLog.innerHTML = '';

        // Start new game
        this.updateBoard();
        this.updateGameInfo();
        this.updateInlineStats(); // Update stats display
        this.logMove(`🔄 Round ${this.tournamentSettings.currentRound} - GAME BARU DIMULAI!`);
        this.logMove(`🏆 Tournament Stats: Putih ${whiteWins}W-${whiteLosses}L | Hitam ${blackWins}W-${blackLosses}L`);
        this.logMove(`🤖 Alpha-Bot (${this.engine.botWhiteDifficulty}) vs Beta-Bot (${this.engine.botBlackDifficulty})`);
        this.startTimer();

        // Ensure proper game state
        this.engine.gameStatus = 'playing';
        this.engine.gameEnded = false;

        // Start first move with proper delay and better logging
        console.log('Scheduling first bot move...');
        setTimeout(() => {
            console.log('Attempting to start first bot move...');
            if (!this.isPaused && !this.botThinking && !this.engine.isGameOver()) {
                console.log('Starting bot move...');
                this.makeBotMove();
            } else {
                console.log('Bot move blocked:', {
                    isPaused: this.isPaused,
                    botThinking: this.botThinking,
                    isGameOver: this.engine.isGameOver()
                });
            }
        }, Math.max(500, this.engine.botSpeed * 0.3));
    }

    resetTournamentIfNeeded() {
        if (this.engine.gameMode === 'bot-vs-bot') {
            // Only reset if starting new tournament
            if (this.tournamentSettings.currentRound === 1 &&
                this.tournamentSettings.roundWins.white === 0 &&
                this.tournamentSettings.roundWins.black === 0 &&
                this.tournamentSettings.drawCount === 0) {
                // Already reset, do nothing
            }
        }
    }

    updateTournamentDisplay() {
        const roundProgress = document.getElementById('roundProgress');
        const currentRoundSpan = document.getElementById('currentRound');
        const totalRoundsSpan = document.getElementById('totalRoundsDisplay');
        const whiteWinsSpan = document.getElementById('whiteRoundWins');
        const blackWinsSpan = document.getElementById('blackRoundWins');
        const drawCountSpan = document.getElementById('drawCount');

        if (this.engine.gameMode === 'bot-vs-bot' || this.engine.gameMode === 'player-vs-bot') {
            roundProgress.style.display = 'block';
            currentRoundSpan.textContent = `🏆 Round ${this.tournamentSettings.currentRound} dari ${this.tournamentSettings.totalRounds}`;
            totalRoundsSpan.textContent = this.tournamentSettings.totalRounds;
            whiteWinsSpan.textContent = this.tournamentSettings.roundWins.white;
            blackWinsSpan.textContent = this.tournamentSettings.roundWins.black;
            drawCountSpan.textContent = this.tournamentSettings.drawCount;
        } else {
            roundProgress.style.display = 'none';
        }
    }

    updateTournamentAfterGame(winnerColor, loserColor) {
        if (this.engine.gameMode !== 'bot-vs-bot' && this.engine.gameMode !== 'player-vs-bot') return;

        // Update tournament stats
        if (winnerColor === 'white') {
            this.tournamentSettings.roundWins.white++;
        } else if (winnerColor === 'black') {
            this.tournamentSettings.roundWins.black++;
        } else if (winnerColor === 'draw' || !winnerColor) {
            this.tournamentSettings.drawCount++;
        }

        // PERBAIKAN: Gunakan deteksi tournament selesai yang lebih ketat
        const isTournamentComplete = this.tournamentSettings.currentRound >= this.tournamentSettings.totalRounds;

        console.log('Tournament After Game Check:', {
            currentRound: this.tournamentSettings.currentRound,
            totalRounds: this.tournamentSettings.totalRounds,
            isTournamentComplete: isTournamentComplete,
            winnerColor: winnerColor,
            loserColor: loserColor
        });

        if (!isTournamentComplete) {
            // Masih ada round berikutnya
            this.logMove(`🎯 Round ${this.tournamentSettings.currentRound} dari ${this.tournamentSettings.totalRounds} selesai!`);
            this.logMove(`📊 Skor Tournament: Alpha-Bot ${this.tournamentSettings.roundWins.white} - ${this.tournamentSettings.roundWins.black} Beta-Bot (Seri: ${this.tournamentSettings.drawCount})`);
            this.logMove(`🔥 Siap untuk Round ${this.tournamentSettings.currentRound + 1}? Sisa ${this.tournamentSettings.totalRounds - this.tournamentSettings.currentRound} round lagi!`);
        } else {
            // Tournament BENAR-BENAR selesai
            this.logMove(`🏁 ═══ TOURNAMENT ${this.tournamentSettings.totalRounds} ROUND FINAL ═══`);
            this.logMove(`🎊 TOURNAMENT RESMI SELESAI!`);
            this.logMove(`📊 HASIL FINAL: Alpha-Bot ${this.tournamentSettings.roundWins.white} - ${this.tournamentSettings.roundWins.black} Beta-Bot (Seri: ${this.tournamentSettings.drawCount})`);

            // Tentukan juara
            const whiteWins = this.tournamentSettings.roundWins.white;
            const blackWins = this.tournamentSettings.roundWins.black;

            if (whiteWins > blackWins) {
                this.logMove(`👑 JUARA TOURNAMENT: Alpha-Bot! 🏆`);
            } else if (blackWins > whiteWins) {
                this.logMove(`👑 JUARA TOURNAMENT: Beta-Bot! 🏆`);
            } else {
                this.logMove(`🤝 TOURNAMENT BERAKHIR SERI - TIE GAME! 🤝`);
            }

            this.logMove(`🎊 ═══════════════════════════════════ 🎊`);
        }

        this.updateTournamentDisplay();
    }

    startNewRound() {
        if (this.tournamentSettings.currentRound >= this.tournamentSettings.totalRounds) {
            this.endTournament();
            return;
        }

        this.tournamentSettings.currentRound++;

        // Hide start button
        const startNewRoundBtn = document.getElementById('startNewRoundBtn');
        if (startNewRoundBtn) {
            startNewRoundBtn.style.display = 'none';
        }

        // Start new game
        this.startNewBotGame();

        this.logMove(`🆕 Round ${this.tournamentSettings.currentRound} dimulai!`);
        this.updateTournamentDisplay();
    }

    getDifficultyLevel(difficulty) {
        const levels = {
            'noob': '1', 'easy': '2', 'medium': '3', 'hard': '4',
            'expert': '5', 'master': '6', 'grandmaster': '7'
        };
        return levels[difficulty] || '3';
    }

    animateSkillBars() {
        const skillBars = document.querySelectorAll('.skill-progress');
        skillBars.forEach(bar => {
            const skillValue = bar.getAttribute('data-skill');
            bar.style.width = skillValue + '%';
        });
    }



    endTournament() {
        const whiteWins = this.tournamentSettings.roundWins.white;
        const blackWins = this.tournamentSettings.roundWins.black;
        const draws = this.tournamentSettings.drawCount;

        let tournamentWinner = '';
        let winnerName = '';

        if (whiteWins > blackWins) {
            winnerName = `Alpha-Bot (${this.engine.botWhiteDifficulty.toUpperCase()})`;
            tournamentWinner = `🏆 ${winnerName} menjadi JUARA Tournament! 🎉`;
        } else if (blackWins > whiteWins) {
            winnerName = `Beta-Bot (${this.engine.botBlackDifficulty.toUpperCase()})`;
            tournamentWinner = `🏆 ${winnerName} menjadi JUARA Tournament! 🎉`;
        } else {
            tournamentWinner = '🤝 Tournament berakhir SERI! 🤝';
        }

        this.logMove(`🎊 ═══════════════════════════════════ 🎊`);
        this.logMove(`🏁 TOURNAMENT ${this.tournamentSettings.totalRounds} ROUND SELESAI!`);
        this.logMove(`📊 Hasil Akhir: Alpha-Bot ${whiteWins} - ${blackWins} Beta-Bot (Seri: ${draws})`);
        this.logMove(tournamentWinner);
        this.logMove(`🎊 ═══════════════════════════════════ 🎊`);

        // Show victory animation for tournament
        this.showTournamentVictoryAnimation(whiteWins, blackWins, draws, winnerName);

        // Reset tournament for next time
        this.tournamentSettings = {
            totalRounds: this.tournamentSettings.totalRounds,
            currentRound: 1,
            roundWins: { white: 0, black: 0 },
            drawCount: 0,
            autoStart: false
        };

        // Hide start button and show new game button prominently
        const startNewRoundBtn = document.getElementById('startNewRoundBtn');
        if (startNewRoundBtn) {
            startNewRoundBtn.style.display = 'none';
        }

        this.updateTournamentDisplay();
    }
}

// Function to toggle difficulty guide spoiler
function toggleGuide(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.guide-toggle');

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        header.classList.add('expanded');
        toggle.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('collapsed');
        header.classList.remove('expanded');
        toggle.style.transform = 'rotate(0deg)';
    }
}

// Function to toggle speed guide spoiler
function toggleSpeedGuide(header) {
    const container = header.parentElement;
    const content = container.querySelector('.speed-cards-grid');
    const toggle = header.querySelector('.speed-guide-toggle');

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'grid';
        header.classList.add('expanded');
        if (toggle) toggle.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        header.classList.remove('expanded');
        if (toggle) toggle.style.transform = 'rotate(0deg)';
    }
}

// Initialize game when page loads and apply web config
document.addEventListener('DOMContentLoaded', () => {
    // Apply web configuration from Wilykun.js
    if (typeof applyWebConfig === 'function') {
        applyWebConfig();
    }

    new ChessGame();
});