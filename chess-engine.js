class ChessEngine {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameHistory = [];
        this.gameEnded = false;
        this.gameMode = 'player-vs-bot';
        this.difficulty = 'medium';
        this.botWhiteDifficulty = 'medium';
        this.botBlackDifficulty = 'medium';
        this.botSpeed = 2000;
        this.gameStatus = 'playing'; // Added gameStatus

        // Piece values untuk AI dengan variasi berdasarkan difficulty
        this.pieceValues = {
            'pawn': 1,
            'knight': 3,
            'bishop': 3,
            'rook': 5,
            'queen': 9,
            'king': 100
        };

        // Difficulty multipliers untuk membuat perbedaan yang lebih jelas
        this.difficultySettings = {
            'noob': {
                depth: 1,
                randomness: 0.8,
                blunderChance: 0.4,
                strategicBonus: 0.1
            },
            'easy': {
                depth: 1,
                randomness: 0.6,
                blunderChance: 0.3,
                strategicBonus: 0.3
            },
            'medium': {
                depth: 2,
                randomness: 0.3,
                blunderChance: 0.15,
                strategicBonus: 0.6
            },
            'hard': {
                depth: 3,
                randomness: 0.15,
                blunderChance: 0.08,
                strategicBonus: 0.8
            },
            'expert': {
                depth: 4,
                randomness: 0.05,
                blunderChance: 0.03,
                strategicBonus: 1.0
            },
            'master': {
                depth: 5,
                randomness: 0.02,
                blunderChance: 0.01,
                strategicBonus: 1.2
            },
            'grandmaster': {
                depth: 6,
                randomness: 0.01,
                blunderChance: 0.005,
                strategicBonus: 1.5
            }
        };

        // Position values untuk AI strategy
        this.centerSquares = [
            [3, 3], [3, 4], [4, 3], [4, 4]
        ];
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Setup pieces
        const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

        // Black pieces
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: pieceOrder[i], color: 'black' };
            board[1][i] = { type: 'pawn', color: 'black' };
        }

        // White pieces
        for (let i = 0; i < 8; i++) {
            board[6][i] = { type: 'pawn', color: 'white' };
            board[7][i] = { type: pieceOrder[i], color: 'white' };
        }

        return board;
    }

    getPieceSymbol(piece) {
        if (!piece) return '';

        const symbols = {
            'white': {
                'king': '♔', 'queen': '♕', 'rook': '♖',
                'bishop': '♗', 'knight': '♘', 'pawn': '♙'
            },
            'black': {
                'king': '♚', 'queen': '♛', 'rook': '♜',
                'bishop': '♝', 'knight': '♞', 'pawn': '♟'
            }
        };

        return symbols[piece.color][piece.type];
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;

        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) return false;

        return this.isValidPieceMove(piece, fromRow, fromCol, toRow, toCol);
    }

    isValidPieceMove(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;

        switch (piece.type) {
            case 'pawn':
                return this.isValidPawnMove(piece, fromRow, fromCol, toRow, toCol);
            case 'rook':
                return (rowDiff === 0 || colDiff === 0) && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'bishop':
                return Math.abs(rowDiff) === Math.abs(colDiff) && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) && 
                       this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'king':
                return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
            case 'knight':
                return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || 
                       (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);
            default:
                return false;
        }
    }

    isValidPawnMove(piece, fromRow, fromCol, toRow, toCol) {
        const direction = piece.color === 'white' ? -1 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);

        // Forward move
        if (colDiff === 0) {
            if (rowDiff === direction && !this.board[toRow][toCol]) return true;
            if (rowDiff === 2 * direction && !this.board[toRow][toCol] && !this.board[fromRow + direction][fromCol]) {
                const startRow = piece.color === 'white' ? 6 : 1;
                return fromRow === startRow;
            }
        }

        // Capture move
        if (colDiff === 1 && rowDiff === direction) {
            return this.board[toRow][toCol] && this.board[toRow][toCol].color !== piece.color;
        }

        return false;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = Math.sign(toRow - fromRow);
        const colStep = Math.sign(toCol - fromCol);

        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;

        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol]) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }

        return true;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // Record move
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: capturedPiece,
            player: this.currentPlayer
        };

        this.gameHistory.push(move);

        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return move;
    }

    undoMove() {
        if (this.gameHistory.length === 0) return null;

        const lastMove = this.gameHistory.pop();

        // Restore pieces
        this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;

        // Switch back player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return lastMove;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color !== color) {
                    if (this.isValidPieceMove(piece, row, col, kingPos.row, kingPos.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    getAllValidMoves(color) {
        const moves = [];

        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                moves.push({
                                    from: { row: fromRow, col: fromCol },
                                    to: { row: toRow, col: toCol },
                                    piece: piece
                                });
                            }
                        }
                    }
                }
            }
        }

        return moves;
    }

    evaluateBoard() {
        let score = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const value = this.pieceValues[piece.type];
                    const positionalValue = this.getPositionalValue(row, col, piece);
                    const totalValue = value + positionalValue;
                    score += piece.color === 'white' ? totalValue : -totalValue;
                }
            }
        }

        return score;
    }

    getPositionalValue(row, col, piece) {
        let value = 0;

        // Center control bonus
        if (this.centerSquares.some(([r, c]) => r === row && c === col)) {
            value += 0.5;
        }

        // Pawn advancement bonus
        if (piece.type === 'pawn') {
            if (piece.color === 'white') {
                value += (6 - row) * 0.1;
            } else {
                value += (row - 1) * 0.1;
            }
        }

        // Knight positioning
        if (piece.type === 'knight') {
            value += Math.abs(3.5 - row) * -0.1; // Knights better in center
            value += Math.abs(3.5 - col) * -0.1;
        }

        return value;
    }

    getBotMove(difficulty = null) {
        const useDifficulty = difficulty || this.difficulty;
        const moves = this.getAllValidMoves(this.currentPlayer);

        if (moves.length === 0) {
            return null;
        }

        const settings = this.difficultySettings[useDifficulty] || this.difficultySettings['medium'];
        
        // Implementasi blunder untuk membuat bot lebih realistis
        if (Math.random() < settings.blunderChance) {
            console.log(`Bot ${this.currentPlayer} melakukan blunder! (${useDifficulty})`);
            return moves[Math.floor(Math.random() * moves.length)];
        }

        let selectedMove = null;

        switch (useDifficulty) {
            case 'noob':
                selectedMove = this.getNoobBotMove(moves);
                break;
            case 'easy':
                selectedMove = this.getEasyBotMove(moves);
                break;
            case 'medium':
                selectedMove = this.getMediumBotMove(moves);
                break;
            case 'hard':
                selectedMove = this.getHardBotMove(moves);
                break;
            case 'expert':
                selectedMove = this.getExpertBotMove(moves);
                break;
            case 'master':
                selectedMove = this.getMasterBotMove(moves);
                break;
            case 'grandmaster':
                selectedMove = this.getGrandmasterBotMove(moves);
                break;
            default:
                selectedMove = this.getMediumBotMove(moves);
        }

        return selectedMove;
    }

    getNoobBotMove(moves) {
        // Noob: Hampir random dengan sedikit preferensi tangkap
        const captureMoves = moves.filter(move => this.board[move.to.row][move.to.col]);
        if (captureMoves.length > 0 && Math.random() < 0.2) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    getEasyBotMove(moves) {
        // Easy: Lebih suka tangkap tapi masih random
        const captureMoves = moves.filter(move => this.board[move.to.row][move.to.col]);
        if (captureMoves.length > 0 && Math.random() < 0.4) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }
        
        if (Math.random() < 0.6) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        return this.getBestMoveFromEvaluation(moves, 1);
    }

    getMediumBotMove(moves) {
        const settings = this.difficultySettings['medium'];
        
        // Medium: Evaluasi dengan depth 2 dan randomness terkontrol
        if (Math.random() < settings.randomness) {
            const captureMoves = moves.filter(move => this.board[move.to.row][move.to.col]);
            if (captureMoves.length > 0) {
                return captureMoves[Math.floor(Math.random() * captureMoves.length)];
            }
        }

        return this.getBestMoveFromEvaluation(moves, settings.depth);
    }

    getHardBotMove(moves) {
        let bestMove = null;
        let bestScore = this.currentPlayer === 'white' ? -Infinity : Infinity;

        for (const move of moves) {
            const score = this.evaluateMoveDeep(move, 2); // Look ahead 2 moves

            if (this.currentPlayer === 'white') {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        return bestMove || moves[0];
    }

    getExpertBotMove(moves) {
        const settings = this.difficultySettings['expert'];
        
        // Expert: Evaluasi mendalam dengan strategic bonus
        if (Math.random() < settings.randomness) {
            return this.getBestMoveFromEvaluation(moves, 2);
        }

        return this.getBestMoveFromEvaluation(moves, settings.depth, true);
    }

    getMasterBotMove(moves) {
        const settings = this.difficultySettings['master'];
        
        // Master: Sangat strategis dengan minimal randomness
        return this.getBestMoveFromEvaluation(moves, settings.depth, true, 1.5);
    }

    getGrandmasterBotMove(moves) {
        const settings = this.difficultySettings['grandmaster'];
        
        // Grandmaster: Hampir sempurna dengan evaluasi maksimal
        return this.getBestMoveFromEvaluation(moves, settings.depth, true, 2.0);
    }

    getBestMoveFromEvaluation(moves, depth, useStrategicBonus = false, strategicMultiplier = 1.0) {
        let bestMove = null;
        let bestScore = this.currentPlayer === 'white' ? -Infinity : Infinity;

        for (const move of moves) {
            let score = this.evaluateMoveDeep(move, depth);
            
            if (useStrategicBonus) {
                score += this.getExpertStrategicBonus(move) * strategicMultiplier;
            }

            if (this.currentPlayer === 'white') {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        return bestMove || moves[0];
    }

    getExpertStrategicBonus(move) {
        let bonus = 0;
        const piece = move.piece;
        const fromRow = move.from.row;
        const fromCol = move.from.col;
        const toRow = move.to.row;
        const toCol = move.to.col;

        // Bonus for controlling center
        if ((toRow === 3 || toRow === 4) && (toCol === 3 || toCol === 4)) {
            bonus += 0.8;
        }

        // Bonus for piece development
        if (piece.type === 'knight' || piece.type === 'bishop') {
            if ((piece.color === 'white' && fromRow === 7) || 
                (piece.color === 'black' && fromRow === 0)) {
                bonus += 0.6;
            }
        }

        // Bonus for castling preparation (king safety)
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            bonus += 1.5;
        }

        // Penalty for moving same piece twice in opening
        if (this.gameHistory.length < 10) {
            const recentMoves = this.gameHistory.slice(-4);
            const samePieceMoves = recentMoves.filter(histMove => 
                histMove.piece.type === piece.type && 
                histMove.piece.color === piece.color
            );
            if (samePieceMoves.length > 1) {
                bonus -= 0.4;
            }
        }

        // Bonus for creating threats
        const capturedPiece = this.board[toRow][toCol];
        if (capturedPiece) {
            bonus += this.pieceValues[capturedPiece.type] * 0.2;
        }

        return bonus * (this.currentPlayer === 'white' ? 1 : -1);
    }

    evaluateMove(move) {
        // Simulate move
        const originalPiece = this.board[move.to.row][move.to.col];
        const movingPiece = this.board[move.from.row][move.from.col];

        this.board[move.to.row][move.to.col] = movingPiece;
        this.board[move.from.row][move.from.col] = null;

        let score = this.evaluateBoard();

        // Add capture bonus
        if (originalPiece) {
            score += this.pieceValues[originalPiece.type] * (this.currentPlayer === 'white' ? 1 : -1);
        }

        // Check for check
        const opponentColor = this.currentPlayer === 'white' ? 'black' : 'white';
        if (this.isInCheck(opponentColor)) {
            score += 2 * (this.currentPlayer === 'white' ? 1 : -1);
        }

        // Undo move
        this.board[move.from.row][move.from.col] = movingPiece;
        this.board[move.to.row][move.to.col] = originalPiece;

        return score;
    }

    evaluateMoveDeep(move, depth) {
        if (depth === 0) {
            return this.evaluateMove(move);
        }

        // Simulate move
        const originalPiece = this.board[move.to.row][move.to.col];
        const movingPiece = this.board[move.from.row][move.from.col];

        this.board[move.to.row][move.to.col] = movingPiece;
        this.board[move.from.row][move.from.col] = null;

        // Switch player temporarily
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        const opponentMoves = this.getAllValidMoves(this.currentPlayer);
        let bestOpponentScore = this.currentPlayer === 'white' ? -Infinity : Infinity;

        // Optimasi: Kurangi jumlah moves yang dievaluasi untuk performa
        const moveLimit = Math.min(3, opponentMoves.length);
        for (let i = 0; i < moveLimit; i++) {
            const score = this.evaluateMoveDeep(opponentMoves[i], depth - 1);

            if (this.currentPlayer === 'white') {
                bestOpponentScore = Math.max(bestOpponentScore, score);
            } else {
                bestOpponentScore = Math.min(bestOpponentScore, score);
            }
        }

        // Restore
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.board[move.from.row][move.from.col] = movingPiece;
        this.board[move.to.row][move.to.col] = originalPiece;

        return bestOpponentScore;
    }

    // Check if the game is over (checkmate or stalemate)
    checkGameEnd() {
        const currentPlayer = this.currentPlayer;
        const moves = this.getAllValidMoves(currentPlayer);

        if (moves.length === 0) {
            if (this.isInCheck(currentPlayer)) {
                this.gameStatus = currentPlayer === 'white' ? 'black_wins' : 'white_wins';
                console.log(`Checkmate detected: ${currentPlayer} has no moves and is in check`);
                return 'checkmate';
            } else {
                this.gameStatus = 'draw';
                console.log(`Stalemate detected: ${currentPlayer} has no moves but not in check`);
                return 'stalemate';
            }
        }

        return null;
    }

    // Check if the game is over
    isGameOver() {
        if (this.gameStatus !== 'playing') {
            return true;
        }
        
        // Check for game end conditions
        const gameEnd = this.checkGameEnd();
        return gameEnd !== null;
    }

    resetGame() {
        console.log('Resetting game...');
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameHistory = [];
        this.gameEnded = false;
        this.gameStatus = 'playing'; // Reset gameStatus
    }
}