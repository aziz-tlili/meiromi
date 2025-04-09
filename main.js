// --- Game State Variables ---
let currentPlayer = 'me'; // 'me' or 'opponent'
// Added 'waiting_for_answer' and 'game_over' states
let turnState = 'start'; // 'start', 'pulled_card', 'played_card', 'waiting_for_answer', 'game_over'
let scores = { me: 0, opponent: 0 };
let collectedPhases = { me: new Set(), opponent: new Set() };
let collectedBonus = { me: false, opponent: false };
let suspensions = { me: 0, opponent: 0 };
let selectedCard = null; // Holds the LI element of the selected card
let allCardData = []; // To store {id, src} for all cards in the deck
let remainingDeckIndices = []; // Indices of cards left in the deck
// State for active question
let currentQuestionData = {
    dataCardId: null,
    opponentPlayer: null
};
// Added required phase cards Set (Phase 3)
const requiredPhaseCards = new Set(['p1', 'm1', 'a1', 't1', 'p2', 'm2', 'a2', 't2']);


// --- DOM Element References ---
const opponentCardContainer = document.querySelector('.opponent .cards');
const myCardContainer = document.querySelector('.me .cards');
const pullCardDeckElement = document.getElementById('pull-card-deck');
const playButton = document.getElementById('play-button');
const playAreaContainer = document.getElementById('play-area');
const turnIndicatorElement = document.getElementById('turn-indicator');
const myScoreElement = document.getElementById('score-me');
const opponentScoreElement = document.getElementById('score-opponent');
const messageAreaElement = document.getElementById('message-area');
const allCardsContainer = document.querySelector(".all_data_cards ul");
// Refs for Response Area elements
const responseAreaElement = document.getElementById('response-area');
const responsePromptElement = document.getElementById('response-prompt');
const responseCardImageElement = document.getElementById('response-card-image');
const responseInputElement = document.getElementById('response-input');
const responseSubmitButton = document.getElementById('response-submit-button');
const responseFeedbackElement = document.getElementById('response-feedback');
const dataCardsContainer = document.querySelector(".data_cards ul");
// Added refs for Game Over Overlay (Phase 3)
const gameOverOverlayElement = document.getElementById('game-over-overlay');
const winnerAnnouncementElement = document.getElementById('winner-announcement');
const restartButton = document.getElementById('restart-button'); // Optional restart


// --- Card Answers (From Phase 2) ---
const cardAnswers = {
    // Questions (IDs q1-q16)
    q1: 'A', q2: 'B', q3: 'B', q4: 'B', q5: 'B', q6: 'A', q7: 'B', q8: ['C', 'D'], // Accept C or D for q8
    q9: 'B', q10: 'C', q11: 'C', q12: 'D', q13: 'B', q14: 'D', q15: 'A', q16: 'A',
    // True/False (IDs true_or_false1 - true_or_false6)
    true_or_false1: '...', // !! Needs clarification !! Set a placeholder or remove if unused
    true_or_false2: 'Brassage interchromosomique',
    true_or_false3: 'Faux',
    true_or_false4: 'Faux',
    true_or_false5: 'Faux',
    true_or_false6: 'Vrai', // Assuming HTML ID 'true_or_false6' is correct
    // Riddles (IDs riddle1 - riddle5)
    riddle1: 'La prophase 1',
    riddle2: 'La méiose',
    riddle3: 'Les gamètes',
    riddle4: 'L’anaphase 1',
    riddle5: 'L’anaphase 2'
};


// --- Core Functions ---

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Initialize the deck data from the hidden HTML list
function initializeDeck() {
    console.log("Initializing deck data...");
    const allCardListItems = allCardsContainer.querySelectorAll("li img");
    allCardData = Array.from(allCardListItems).map(img => ({
        id: img.id,
        src: img.src
    }));
    remainingDeckIndices = Array.from({ length: allCardData.length }, (_, i) => i);
    console.log(`Deck initialized with ${allCardData.length} cards.`);
}


// Function to distribute initial cards to both players
function distributeInitialCards() {
    console.log("Starting initial card distribution...");
    if (allCardData.length === 0) {
        console.error("Deck data not initialized. Cannot distribute.");
        return;
    }

    const cardsToDeal = 14;
    if (remainingDeckIndices.length < cardsToDeal * 2) {
        console.error(`Not enough cards in deck (${remainingDeckIndices.length}) to deal ${cardsToDeal} to each player.`);
        // Handle this error - maybe deal fewer cards or end game setup
        return;
    }

    remainingDeckIndices = shuffleArray(remainingDeckIndices); // Shuffle remaining indices

    // Distribute to "me"
    console.log("\nDistributing to 'me':");
    distributeToPlayer('me', cardsToDeal);

    // Distribute to "opponent"
    console.log("\nDistributing to 'opponent':");
    distributeToPlayer('opponent', cardsToDeal);

    console.log(`\nInitial distribution finished. ${remainingDeckIndices.length} cards left in deck.`);
}

// Distributes a specified number of cards to a player
function distributeToPlayer(playerType, numCardsToDeal) {
    const playerContainer = (playerType === 'me') ? myCardContainer : opponentCardContainer;
    const placeholderSlots = playerContainer.querySelectorAll("li"); // Get the placeholder LIs

    if (placeholderSlots.length < numCardsToDeal) {
        console.warn(`Player "${playerType}" only has ${placeholderSlots.length} slots, cannot deal ${numCardsToDeal}.`);
        numCardsToDeal = placeholderSlots.length; // Deal only up to available slots
    }

    for (let i = 0; i < numCardsToDeal; i++) {
        if (remainingDeckIndices.length === 0) {
            console.error("Ran out of cards in deck during distribution.");
            break;
        }

        const deckIndexToDeal = remainingDeckIndices.pop(); // Take one index from the end
        const cardData = allCardData[deckIndexToDeal];
        const targetSlot = placeholderSlots[i];
        const targetImg = targetSlot.querySelector('img');

        if (!targetSlot || !targetImg) {
            console.error(`Could not find slot or img element for ${playerType} card ${i}`);
            continue; // Skip if slot structure is wrong
        }

        console.log(` -> Dealing card ${cardData.id} (Index: ${deckIndexToDeal}) to ${playerType}'s slot ${i}`);

        // Update the placeholder slot with actual card data
        targetImg.src = cardData.src;
        targetImg.alt = cardData.id; // Set alt text for accessibility/debugging
        targetSlot.dataset.cardId = cardData.id; // Store card ID on the LI

        // Make the LI element represent the actual card now
        targetSlot.classList.remove('placeholder'); // If you add a placeholder class
    }

    // Optional: Remove any remaining unused placeholder slots for this player
    // for (let i = numCardsToDeal; i < placeholderSlots.length; i++) {
    //    placeholderSlots[i].remove();
    // }
}

// Update visual indicator for whose turn it is
function updateTurnIndicator() {
    // Don't update if game is over
    if (turnState === 'game_over') return;
    turnIndicatorElement.textContent = (currentPlayer === 'me' ? "Your Turn (Player 1)" : "Opponent's Turn (Player 2)");
    console.log(`Turn indicator updated: ${turnIndicatorElement.textContent}`);
}

// Update score display
function updateScoreDisplay() {
    myScoreElement.textContent = `My Score: ${scores.me}`;
    opponentScoreElement.textContent = `Opponent Score: ${scores.opponent}`;
    console.log(`Scores updated: Me - ${scores.me}, Opponent - ${scores.opponent}`);
}

// Set which player's hand is active (clickable) - UPDATED for Phase 3
function setActivePlayerHand() {
    // Disable everything if game is over
    if (turnState === 'game_over') {
        myCardContainer.classList.add('inactive');
        opponentCardContainer.classList.add('inactive');
         pullCardDeckElement.style.opacity = '0.5'; // Visually disable
         playButton.disabled = true;
        console.log("Game over: All interactions disabled.");
        return; // Stop here
    }
    // Disable both if waiting for answer (Phase 2 logic)
    if (turnState === 'waiting_for_answer') {
        myCardContainer.classList.add('inactive');
        opponentCardContainer.classList.add('inactive');
        console.log("Both hands deactivated (waiting for answer).");
        return;
    }
    // Normal turn logic
    if (currentPlayer === 'me') {
        myCardContainer.classList.remove('inactive');
        opponentCardContainer.classList.add('inactive');
    } else {
        opponentCardContainer.classList.remove('inactive');
        myCardContainer.classList.add('inactive');
    }
    console.log(`Active hand set for: ${currentPlayer}`);
}

// Display messages to the player
function showMessage(message, duration = 3000) {
    // Don't show transient messages if game is over, only the final one
    if (turnState === 'game_over' && message !== "Game Over!") return;

    messageAreaElement.textContent = message;
    console.log(`Message displayed: ${message}`);
    if (duration > 0) {
        setTimeout(() => {
            // Clear message only if it hasn't been overwritten by another message or game ended
            if (messageAreaElement.textContent === message && turnState !== 'game_over') {
                 messageAreaElement.textContent = '';
            }
        }, duration);
    }
}

// Switch turns between players - UPDATED for Phase 3
function switchPlayer() {
    // Block switching if game is over
    if (turnState === 'game_over') {
        console.log("Switch player blocked: Game Over.");
        return;
    }

    console.log(`Switching player from ${currentPlayer}. Current state: ${turnState}`);
     if (turnState === 'waiting_for_answer') {
        // This state transition happens *after* the answer is processed now
        // No longer need to reset state here, handleAnswerSubmit calls switchPlayer
        console.log("Switching after answer submitted.");
     }

    currentPlayer = (currentPlayer === 'me') ? 'opponent' : 'me';
    turnState = 'start'; // Always reset to start for the new player's turn actions
    selectedCard = null;
    playButton.disabled = true;
    // Only visually enable pull deck if game not over
    pullCardDeckElement.style.opacity = (turnState === 'game_over') ? '0.5' : '1';

    updateTurnIndicator();
    setActivePlayerHand(); // Handles enabling/disabling based on state

    // Handle suspensions
    if (suspensions[currentPlayer] > 0) {
        showMessage(`${currentPlayer === 'me' ? 'You are' : 'Opponent is'} suspended for ${suspensions[currentPlayer]} more turn(s). Skipping turn.`, 4000);
        suspensions[currentPlayer]--;
        setTimeout(switchPlayer, 1500); // Skip turn immediately
    } else {
        // Only prompt if not suspended and game not over
        if (turnState !== 'game_over') {
           showMessage(`${currentPlayer === 'me' ? 'Your' : 'Opponent\'s'} turn. Pull a card.`, 3000);
        }
    }
}


// --- Phase 2 Functions ---

function getRandomDataCard(typePrefix) {
    const matchingCards = Array.from(dataCardsContainer.querySelectorAll(`li img[id^="${typePrefix}"]`));
    if (matchingCards.length === 0) { console.error(`No data cards found with prefix: ${typePrefix}`); return null; }
    const randomIndex = Math.floor(Math.random() * matchingCards.length);
    const chosenCard = matchingCards[randomIndex];
    return { id: chosenCard.id, src: chosenCard.src };
}

function triggerQuestionSequence(playedCardId) {
    if (turnState === 'game_over') return; // Prevent triggering if game ended

    console.log(`Triggering question sequence for played card: ${playedCardId}`);
    turnState = 'waiting_for_answer';
    setActivePlayerHand(); // Deactivate both player hands

    currentQuestionData.opponentPlayer = (currentPlayer === 'me') ? 'opponent' : 'me';
    let dataCardTypePrefix = '';
    let promptText = '';
    if (playedCardId === 'ask_question') { dataCardTypePrefix = 'q'; promptText = 'Answer the Question:'; }
    else if (playedCardId === 'true_or_false') { dataCardTypePrefix = 'true_or_false'; promptText = 'True or False?'; }
    else if (playedCardId === 'riddle') { dataCardTypePrefix = 'riddle'; promptText = 'Solve the Riddle:'; }
    else { console.error("Invalid card ID..."); switchPlayer(); return; } // Fallback if error

    const dataCard = getRandomDataCard(dataCardTypePrefix);
    if (!dataCard) { showMessage("Error: Could not find data card...", 5000); switchPlayer(); return; } // Fallback

    currentQuestionData.dataCardId = dataCard.id;
    console.log(`Selected data card: ${dataCard.id} for opponent ${currentQuestionData.opponentPlayer}`);

    responsePromptElement.textContent = `${currentQuestionData.opponentPlayer === 'me' ? 'You must' : 'Opponent must'} ${promptText}`;
    responseCardImageElement.src = dataCard.src;
    responseCardImageElement.alt = dataCard.id;
    responseInputElement.value = '';
    responseFeedbackElement.textContent = '';
    responseSubmitButton.disabled = false; // Ensure button is enabled
    responseAreaElement.style.display = 'block';
    responseInputElement.focus();
}


// --- New Functions for Phase 3 ---

// Check if a player has met the win conditions
function checkWinCondition(player) {
    if (!player || turnState === 'game_over') return false; // Don't check if game already over

    // Condition 1: Card collection (8 phases + 1 bonus)
    const playerPhases = collectedPhases[player];
    let hasAllPhases = requiredPhaseCards.size === playerPhases.size &&
                       [...requiredPhaseCards].every(phase => playerPhases.has(phase));
    if (hasAllPhases && collectedBonus[player]) {
        console.log(`Win Condition MET for ${player}: Collected all phases and a bonus card.`);
        return true;
    }

    // Condition 2: Score exceeds 500
    if (scores[player] > 500) {
        console.log(`Win Condition MET for ${player}: Score (${scores[player]}) exceeds 500.`);
        return true;
    }

    return false; // No win condition met yet
}

// End the game and display the winner
function endGame(winner) {
    if (turnState === 'game_over') return; // Prevent multiple calls

    console.log(`Game Ending! Winner: ${winner}`);
    turnState = 'game_over';

    // Display winner message
    const winnerName = (winner === 'me' ? "Player 1 (You)" : "Player 2 (Opponent)");
    winnerAnnouncementElement.textContent = `${winnerName} Wins! Final Score: ${scores[winner]}`;
    gameOverOverlayElement.style.display = 'flex';

    // Disable further interactions visually and logically
    setActivePlayerHand(); // This function now handles disabling based on game_over state

    showMessage("Game Over!", 0); // Persistent message on board
}

// --- UPDATED handleAnswerSubmit for Phase 3 ---
function handleAnswerSubmit() {
     // Check if game ended while the prompt was shown
     if (turnState === 'game_over') {
         responseAreaElement.style.display = 'none';
         return;
     }

    console.log("Answer submitted.");
    const opponentAnswer = responseInputElement.value.trim();
    const dataCardId = currentQuestionData.dataCardId;
    const opponent = currentQuestionData.opponentPlayer;

    if (!opponentAnswer) { responseFeedbackElement.textContent = "Please enter an answer."; return; }

    const correctAnswer = cardAnswers[dataCardId];
    responseSubmitButton.disabled = true; // Prevent double clicks
    let winDetected = false;

    if (correctAnswer === undefined) {
        console.error(`No answer defined for ${dataCardId}`);
        responseFeedbackElement.textContent = "Error: Answer key missing.";
    } else {
        const normalizedOpponentAnswer = opponentAnswer.toLowerCase();
        let isCorrect = false;
        // Comparison logic (handles strings and arrays like ['C', 'D'])
        if (Array.isArray(correctAnswer)) {
             const normalizedCorrectAnswers = correctAnswer.map(ans => String(ans).toLowerCase());
             isCorrect = normalizedCorrectAnswers.includes(normalizedOpponentAnswer);
        } else { // Assumes string otherwise
             isCorrect = normalizedOpponentAnswer === String(correctAnswer).toLowerCase();
        }

        // Process result
        if (isCorrect) {
            responseFeedbackElement.textContent = "Correct!";
            scores[opponent] += 15;
            console.log(`${opponent} answered correctly (+15). Score: ${scores[opponent]}`);
        } else {
            let feedback = "Incorrect.";
             if (!Array.isArray(correctAnswer)) { feedback += ` Ans: ${correctAnswer}`; }
             else { feedback += ` Ans: ${correctAnswer.join(' or ')}`; }
            responseFeedbackElement.textContent = feedback;
            scores[opponent] -= 10;
            suspensions[opponent] = 2;
            console.log(`${opponent} answered incorrectly (-10, 2 susp). Score: ${scores[opponent]}`);
        }
         updateScoreDisplay(); // Update score display

         // --- Phase 3 Check: Did the opponent win AFTER scoring? ---
         if (checkWinCondition(opponent)) {
             winDetected = true;
             // Show feedback briefly, THEN end game
             setTimeout(() => endGame(opponent), 500);
             // Ensure response area hides eventually even if game ends
             setTimeout(() => { if (turnState === 'game_over') responseAreaElement.style.display = 'none'; }, 2500);
             return; // Stop processing here if game ends
         }
    }

    // Resume game flow ONLY if game hasn't ended
     if (!winDetected) {
         setTimeout(() => {
             responseAreaElement.style.display = 'none';
             // No need to re-enable button here if we always switch player
             switchPlayer(); // Proceed to the player whose turn it was originally
         }, 2500); // Show feedback for 2.5 seconds
     }
}


// --- Event Handlers (Updated for game_over state checks) ---

function handlePullCardClick() {
    // Block if game over or waiting
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') {
         console.log(`Pull click blocked: State is ${turnState}`); return;
    }
    console.log("Pull card clicked.");
    if (turnState !== 'start') { showMessage("Must play first."); return; }
    if (remainingDeckIndices.length === 0) { showMessage("Deck empty!"); return; }

    // --- Rest of pull logic (no changes needed) ---
    const deckIndexToPull = remainingDeckIndices.pop();
    const cardData = allCardData[deckIndexToPull];
    const playerContainer = (currentPlayer === 'me') ? myCardContainer : opponentCardContainer;
    const newCardLi = document.createElement('li');
    newCardLi.classList.add('card');
    newCardLi.dataset.cardId = cardData.id;
    const newCardImg = document.createElement('img');
    newCardImg.src = cardData.src; newCardImg.alt = cardData.id;
    newCardLi.appendChild(newCardImg);
    playerContainer.appendChild(newCardLi);
    turnState = 'pulled_card';
    pullCardDeckElement.style.opacity = '0.5';
    showMessage("Card pulled. Select a card to play.");
    console.log(`${currentPlayer} pulled ${cardData.id}. State: ${turnState}. Deck: ${remainingDeckIndices.length}`);
}

function handleCardClick(event) {
    // Block if game over or waiting
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') {
        console.log(`Card click blocked: State is ${turnState}`); return;
    }
    const clickedLi = event.target.closest('li.card');
    if (!clickedLi || clickedLi.closest('.cards.inactive')) { return; }

    console.log(`Card clicked: ${clickedLi.dataset.cardId}`);
    if (turnState !== 'pulled_card') { showMessage("Pull card first!"); return; }

    // --- Rest of click logic (no changes needed) ---
    if (selectedCard) { selectedCard.classList.remove('selected-card'); }
    selectedCard = clickedLi;
    selectedCard.classList.add('selected-card');
    playButton.disabled = false;
    console.log(`Card selected: ${selectedCard.dataset.cardId}`);
}

function handleCardMouseOver(event) {
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') return;
    const hoveredLi = event.target.closest('li.card');
    if (hoveredLi && !hoveredLi.closest('.cards.inactive')) { /* CSS handles */ }
}

function handleCardMouseOut(event) {
     if (turnState === 'game_over' || turnState === 'waiting_for_answer') return;
    const hoveredLi = event.target.closest('li.card');
    if (hoveredLi && !hoveredLi.closest('.cards.inactive')) { /* CSS handles */ }
}

// UPDATED handlePlayButtonClick for Phase 3
function handlePlayButtonClick() {
    // Block if game over or waiting
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') {
        console.log(`Play click blocked: State is ${turnState}`); return;
    }
    console.log("Play button clicked.");
    if (!selectedCard) { showMessage("No card selected."); return; }

    const cardId = selectedCard.dataset.cardId;
    console.log(`${currentPlayer} playing card: ${cardId}`);

    // --- Play Logic ---
    playAreaContainer.innerHTML = '';
    const playedCardImg = selectedCard.querySelector('img').cloneNode(true);
    playAreaContainer.appendChild(playedCardImg);
    selectedCard.remove(); // Remove from hand

    // Update Score / Collected Cards
    let isQuestionTypeCard = ['ask_question', 'true_or_false', 'riddle'].includes(cardId);
    let playerChangedState = false; // Track if score/cards changed
     if (['division_réductionnelle', 'division_equationnelle'].includes(cardId)) {
         scores[currentPlayer] += 15; collectedBonus[currentPlayer] = true;
         console.log(`${currentPlayer} played bonus ${cardId} (+15)`);
         playerChangedState = true;
     } else if (isQuestionTypeCard) {
         scores[currentPlayer] += 15;
         console.log(`${currentPlayer} played question ${cardId} (+15)`);
         playerChangedState = true;
     } else if (requiredPhaseCards.has(cardId)) { // Check ONLY the 8 required phases
         scores[currentPlayer] += 10;
         collectedPhases[currentPlayer].add(cardId);
         console.log(`${currentPlayer} played phase ${cardId} (+10). Collected: ${[...collectedPhases[currentPlayer]].join(', ')}`);
         playerChangedState = true;
     } // Add logic for other special cards here

     if(playerChangedState) { updateScoreDisplay(); }

    // Reset UI
    selectedCard = null;
    playButton.disabled = true;
    turnState = 'played_card'; // Tentative state before checks

    // --- Phase 3 Check: Did the current player win AFTER playing? ---
    if (checkWinCondition(currentPlayer)) {
        endGame(currentPlayer); // This sets state to game_over and stops flow
        return; // Stop execution here
    }

    // If game didn't end, proceed
    if (isQuestionTypeCard) {
        console.log(`Triggering question sequence for ${cardId}.`);
        triggerQuestionSequence(cardId); // Sets state to 'waiting_for_answer'
    } else {
        console.log("Standard card played, switching player.");
        setTimeout(switchPlayer, 500); // Switches turn if game not over
    }
}


// --- Initialization ---

// UPDATED initializeEventListeners for Phase 3
function initializeEventListeners() {
    console.log("Initializing event listeners...");
    pullCardDeckElement.addEventListener('click', handlePullCardClick);
    playButton.addEventListener('click', handlePlayButtonClick);
    myCardContainer.addEventListener('click', handleCardClick);
    myCardContainer.addEventListener('mouseover', handleCardMouseOver);
    myCardContainer.addEventListener('mouseout', handleCardMouseOut);
    opponentCardContainer.addEventListener('click', handleCardClick);
    opponentCardContainer.addEventListener('mouseover', handleCardMouseOver);
    opponentCardContainer.addEventListener('mouseout', handleCardMouseOut);
    responseSubmitButton.addEventListener('click', handleAnswerSubmit);

     // Optional: Restart button listener (Phase 3)
     restartButton.addEventListener('click', () => {
        console.log("Restart button clicked");
        initializeGame(); // Call initializeGame for a full reset without reload
     });

    console.log("Event listeners initialized.");
}

// UPDATED initializeGame for Phase 3 (Reset Logic)
function initializeGame() {
    console.log("--- RESETTING AND INITIALIZING GAME ---");
     // Reset game state variables completely
     currentPlayer = 'me'; // Start with player 1
     turnState = 'start';
     scores = { me: 0, opponent: 0 };
     collectedPhases = { me: new Set(), opponent: new Set() };
     collectedBonus = { me: false, opponent: false };
     suspensions = { me: 0, opponent: 0 };
     selectedCard = null;
     allCardData = [];
     remainingDeckIndices = [];
     currentQuestionData = { dataCardId: null, opponentPlayer: null };

     // Clear UI elements that persist
     playAreaContainer.innerHTML = '';
     messageAreaElement.textContent = '';
     myCardContainer.innerHTML = ''; // Clear previous game's cards
     opponentCardContainer.innerHTML = '';
     // Add placeholders back (important for distributeToPlayer)
     for(let i=0; i<14; i++){
         myCardContainer.innerHTML += `<li class="card"><img src="IMG-20250407-WA0002.jpg" alt="Card Slot"></li>`;
         opponentCardContainer.innerHTML += `<li class="card"><img src="IMG-20250407-WA0002.jpg" alt="Card Slot"></li>`;
     }
     gameOverOverlayElement.style.display = 'none'; // Hide overlay
     responseAreaElement.style.display = 'none'; // Hide response area
     playButton.disabled = true; // Ensure play button starts disabled
     pullCardDeckElement.style.opacity = '1'; // Ensure pull deck looks active


    console.log("Initializing game modules...");
    initializeDeck(); // Load card data from HTML
    if (allCardData.length < 28) { // Basic check after loading deck data
         showMessage("Error: Not enough cards defined in HTML to play.", 0);
         return; // Stop initialization if deck is too small
    }
    distributeInitialCards(); // Deal cards
    initializeEventListeners(); // Set up interactions (Do this only ONCE ideally)
    updateScoreDisplay(); // Set initial scores (0)
    updateTurnIndicator(); // Set initial turn indicator ('me')
    setActivePlayerHand(); // Set initial active hand styling ('me' active)

    console.log("Game initialization complete.");
    showMessage("Game Start! Player 1 (You), pull a card.", 4000);

}

// --- Start Game ---
document.addEventListener('DOMContentLoaded', initializeGame);