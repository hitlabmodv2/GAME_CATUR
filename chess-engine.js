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
        
        // Tidak boleh makan bidak sendiri
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        // Raja TIDAK BOLEH makan raja lawan (jarak minimal 1 kotak)
        if (piece.type === 'king' && targetPiece && targetPiece.type === 'king') {
            return false;
        }
        
        // Raja tidak boleh bergerak ke kotak yang dikuasai lawan
        if (piece.type === 'king') {
            // Simulasi gerakan untuk cek apakah kotak tujuan dikuasai lawan
            const originalTarget = this.board[toRow][toCol];
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;
            
            // Cek apakah raja akan ter-skak di posisi baru
            const wouldBeInCheck = this.isInCheck(piece.color);
            
            // Kembalikan posisi
            this.board[fromRow][fromCol] = piece;
            this.board[toRow][toCol] = originalTarget;
            
            if (wouldBeInCheck) return false;
        }
        
        // Validasi gerakan dasar bidak
        if (!this.isValidPieceMove(piece, fromRow, fromCol, toRow, toCol)) {
            return false;
        }
        
        // Simulasi gerakan untuk cek apakah raja sendiri akan ter-skak (untuk semua bidak)
        const originalTarget = this.board[toRow][toCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        const isKingInCheck = this.isInCheck(piece.color);
        
        // Kembalikan posisi
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = originalTarget;
        
        // Gerakan tidak valid jika membuat raja sendiri ter-skak
        return !isKingInCheck;
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

    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = 'queen') {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // Check for pawn promotion
        let finalPiece = piece;
        let isPromotion = false;
        
        if (piece.type === 'pawn') {
            // White pawn reaching row 0 (top) or black pawn reaching row 7 (bottom)
            if ((piece.color === 'white' && toRow === 0) || 
                (piece.color === 'black' && toRow === 7)) {
                finalPiece = { type: promotionPiece, color: piece.color };
                isPromotion = true;
            }
        }

        // Record move
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: capturedPiece,
            player: this.currentPlayer,
            promotion: isPromotion ? promotionPiece : null
        };

        this.gameHistory.push(move);

        // Make the move with promoted piece if applicable
        this.board[toRow][toCol] = finalPiece;
        this.board[fromRow][fromCol] = null;

        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return move;
    }

    undoMove() {
        if (this.gameHistory.length === 0) return null;

        const lastMove = this.gameHistory.pop();

        // Restore original pawn if it was a promotion
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
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            return this.addPromotionToMove(randomMove);
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

        return this.addPromotionToMove(selectedMove);
    }

    addPromotionToMove(move) {
        if (!move) return move;
        
        // Check if this move would result in pawn promotion
        const piece = this.board[move.from.row][move.from.col];
        if (piece && piece.type === 'pawn') {
            const toRow = move.to.row;
            if ((piece.color === 'white' && toRow === 0) || 
                (piece.color === 'black' && toRow === 7)) {
                // Bot always promotes to queen (strongest piece)
                move.promotion = 'queen';
            }
        }
        
        return move;
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

        // Maksimal optimasi: Kurangi evaluasi berdasarkan depth dan prioritas moves
        let moveLimit;
        if (depth >= 3) {
            moveLimit = Math.min(2, opponentMoves.length); // Sangat terbatas untuk depth tinggi
        } else if (depth === 2) {
            moveLimit = Math.min(4, opponentMoves.length); // Terbatas untuk depth sedang
        } else {
            moveLimit = Math.min(6, opponentMoves.length); // Lebih banyak untuk depth rendah
        }

        // Prioritaskan moves yang penting (capture, check, dll)
        const priorityMoves = opponentMoves.filter(m => 
            this.board[m.to.row][m.to.col] !== null || // Capture moves
            this.wouldCauseCheck(m) // Moves that cause check
        );
        
        const movesToEvaluate = priorityMoves.length > 0 ? 
            priorityMoves.slice(0, moveLimit) : 
            opponentMoves.slice(0, moveLimit);

        for (const oppMove of movesToEvaluate) {
            const score = this.evaluateMoveDeep(oppMove, depth - 1);

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

    // Helper function untuk check if move would cause check
    wouldCauseCheck(move) {
        const originalPiece = this.board[move.to.row][move.to.col];
        const movingPiece = this.board[move.from.row][move.from.col];

        this.board[move.to.row][move.to.col] = movingPiece;
        this.board[move.from.row][move.from.col] = null;

        const opponentColor = movingPiece.color === 'white' ? 'black' : 'white';
        const wouldCheck = this.isInCheck(opponentColor);

        // Restore
        this.board[move.from.row][move.from.col] = movingPiece;
        this.board[move.to.row][move.to.col] = originalPiece;

        return wouldCheck;
    }

    // Check if the game is over (checkmate or stalemate) - International Chess Standards
    checkGameEnd() {
        const currentPlayer = this.currentPlayer;
        
        // ATURAN INTERNASIONAL CATUR FIDE: 
        // 1. Jika raja ditangkap/hilang = KEMENANGAN LANGSUNG (bukan skakmat)
        // 2. Jika raja tidak ada di papan = KEMENANGAN OTOMATIS untuk lawan
        
        const whiteKing = this.findKing('white');
        const blackKing = this.findKing('black');
        
        // Check if any king is missing/captured - IMMEDIATE WIN CONDITION
        if (!whiteKing) {
            // White king captured/missing = Black wins immediately
            this.gameStatus = 'black_wins';
            console.log(`👑 RAJA PUTIH HILANG/DITANGKAP: Hitam menang otomatis! (Aturan FIDE)`);
            return 'king_captured';
        }
        
        if (!blackKing) {
            // Black king captured/missing = White wins immediately  
            this.gameStatus = 'white_wins';
            console.log(`👑 RAJA HITAM HILANG/DITANGKAP: Putih menang otomatis! (Aturan FIDE)`);
            return 'king_captured';
        }
        
        // Both kings exist - check for traditional checkmate/stalemate
        const validMoves = this.getAllValidMoves(currentPlayer);

        // No valid moves available for current player
        if (validMoves.length === 0) {
            if (this.isInCheck(currentPlayer)) {
                // King is in check and no valid moves = CHECKMATE
                this.gameStatus = currentPlayer === 'white' ? 'black_wins' : 'white_wins';
                console.log(`♔ SKAKMAT: ${currentPlayer} raja dalam skak tanpa langkah legal - ${currentPlayer === 'white' ? 'Hitam' : 'Putih'} menang!`);
                return 'checkmate';
            } else {
                // King is not in check but no valid moves = STALEMATE (DRAW)
                this.gameStatus = 'draw';
                console.log(`🤝 PAT (STALEMATE): ${currentPlayer} tidak memiliki langkah legal tapi raja tidak dalam skak - SERI!`);
                return 'stalemate';
            }
        }

        // Check for insufficient material (automatic draw according to FIDE rules)
        if (this.isInsufficientMaterial()) {
            this.gameStatus = 'draw';
            console.log(`🤝 SERI: Material tidak cukup untuk skakmat (Aturan FIDE)`);
            return 'draw_insufficient_material';
        }

        // Check for threefold repetition (FIDE rule)
        if (this.isThreefoldRepetition()) {
            this.gameStatus = 'draw';
            console.log(`🤝 SERI: Pengulangan posisi 3 kali (Aturan FIDE)`);
            return 'draw_repetition';
        }

        // Check for 50-move rule (FIDE rule)
        if (this.isFiftyMoveRule()) {
            this.gameStatus = 'draw';
            console.log(`🤝 SERI: Aturan 50 langkah tanpa pion atau tangkapan (Aturan FIDE)`);
            return 'draw_fifty_moves';
        }

        // Game continues
        return null;
    }

    // Check for insufficient material to achieve checkmate
    isInsufficientMaterial() {
        const pieces = { white: [], black: [] };
        
        // Collect all pieces on board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    pieces[piece.color].push(piece.type);
                }
            }
        }

        // Remove kings from count
        pieces.white = pieces.white.filter(p => p !== 'king');
        pieces.black = pieces.black.filter(p => p !== 'king');

        // King vs King
        if (pieces.white.length === 0 && pieces.black.length === 0) {
            return true;
        }

        // King and Bishop vs King
        if ((pieces.white.length === 1 && pieces.white[0] === 'bishop' && pieces.black.length === 0) ||
            (pieces.black.length === 1 && pieces.black[0] === 'bishop' && pieces.white.length === 0)) {
            return true;
        }

        // King and Knight vs King
        if ((pieces.white.length === 1 && pieces.white[0] === 'knight' && pieces.black.length === 0) ||
            (pieces.black.length === 1 && pieces.black[0] === 'knight' && pieces.white.length === 0)) {
            return true;
        }

        // King and Bishop vs King and Bishop (same color squares)
        if (pieces.white.length === 1 && pieces.black.length === 1 &&
            pieces.white[0] === 'bishop' && pieces.black[0] === 'bishop') {
            // Check if bishops are on same color squares
            const whiteBishopPos = this.findPiecePosition('white', 'bishop');
            const blackBishopPos = this.findPiecePosition('black', 'bishop');
            if (whiteBishopPos && blackBishopPos) {
                const whiteSquareColor = (whiteBishopPos.row + whiteBishopPos.col) % 2;
                const blackSquareColor = (blackBishopPos.row + blackBishopPos.col) % 2;
                if (whiteSquareColor === blackSquareColor) {
                    return true;
                }
            }
        }

        return false;
    }

    // Helper to find piece position
    findPiecePosition(color, type) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color && piece.type === type) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    // Check for threefold repetition
    isThreefoldRepetition() {
        if (this.gameHistory.length < 8) return false; // Need at least 8 moves for repetition
        
        const currentPosition = this.getBoardHash();
        let repetitions = 1;
        
        // Check previous positions
        for (let i = this.gameHistory.length - 4; i >= 0; i -= 2) {
            // Save current state
            const currentState = this.saveGameState();
            
            // Undo moves to get to previous position
            for (let j = this.gameHistory.length - 1; j >= i; j--) {
                this.undoMove();
            }
            
            // Check if position matches
            if (this.getBoardHash() === currentPosition) {
                repetitions++;
            }
            
            // Restore current state
            this.restoreGameState(currentState);
            
            if (repetitions >= 3) {
                return true;
            }
        }
        
        return false;
    }

    // Check for 50-move rule
    isFiftyMoveRule() {
        if (this.gameHistory.length < 100) return false; // Need 50 moves by each player
        
        // Check last 100 half-moves (50 full moves)
        for (let i = this.gameHistory.length - 100; i < this.gameHistory.length; i++) {
            const move = this.gameHistory[i];
            if (move.piece.type === 'pawn' || move.captured) {
                return false; // Pawn move or capture resets the counter
            }
        }
        
        return true;
    }

    // Generate board hash for position comparison
    getBoardHash() {
        let hash = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    hash += `${piece.color[0]}${piece.type[0]}`;
                } else {
                    hash += '--';
                }
            }
        }
        hash += this.currentPlayer[0]; // Include current player
        return hash;
    }

    // Save current game state
    saveGameState() {
        return {
            board: this.board.map(row => row.slice()),
            currentPlayer: this.currentPlayer,
            gameHistory: [...this.gameHistory]
        };
    }

    // Restore game state
    restoreGameState(state) {
        this.board = state.board.map(row => row.slice());
        this.currentPlayer = state.currentPlayer;
        this.gameHistory = [...state.gameHistory];
    }

    // Helper function to check if king is surrounded
    isKingSurrounded(kingPos, color) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        let blockedSquares = 0;
        let totalSquares = 0;

        for (const [dr, dc] of directions) {
            const newRow = kingPos.row + dr;
            const newCol = kingPos.col + dc;

            // Skip jika di luar board
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
                blockedSquares++;
                totalSquares++;
                continue;
            }

            totalSquares++;

            // Cek apakah square dikuasai lawan atau ada bidak sendiri
            const piece = this.board[newRow][newCol];
            if (piece && piece.color === color) {
                blockedSquares++;
                continue;
            }

            // Simulasi gerakan raja ke square ini
            const originalPiece = this.board[newRow][newCol];
            this.board[newRow][newCol] = { type: 'king', color: color };
            this.board[kingPos.row][kingPos.col] = null;

            // Cek apakah akan ter-skak
            if (this.isInCheck(color)) {
                blockedSquares++;
            }

            // Kembalikan posisi
            this.board[kingPos.row][kingPos.col] = { type: 'king', color: color };
            this.board[newRow][newCol] = originalPiece;
        }

        return blockedSquares === totalSquares;
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