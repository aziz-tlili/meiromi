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
// Define the exact order for sorting essential phase cards
const essentialPhaseOrder = ['p1', 'm1', 'a1', 't1', 'p2', 'm2', 'a2', 't2'];
const bonusCardIds = ['division_réductionnelle', 'division_equationnelle'];


const fullEssentialSequence = [
    'p1', 'm1', 'a1', 't1', 'p2', 'm2', 'a2', 't2',
    'division_réductionnelle', 'division_equationnelle'];




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

// Sorts and redraws a player's hand
function sortAndDisplayHand(playerType) {
    const playerContainer = (playerType === 'me') ? myCardContainer : opponentCardContainer;
    // Get all actual card elements, excluding placeholders
    const currentCardElements = Array.from(playerContainer.querySelectorAll("li.card:not(.placeholder)"));

    if (currentCardElements.length === 0) return; // No cards to sort

    // --- Determine Joker's Role for this sort ---
    let jokerElements = currentCardElements.filter(li => li.dataset.cardId === 'joker');
    let nonJokerElements = currentCardElements.filter(li => li.dataset.cardId !== 'joker');

    let heldPhaseIds = new Set();
    let hasHeldBonus = false;
    nonJokerElements.forEach(li => {
        const id = li.dataset.cardId;
        if (essentialPhaseOrder.includes(id)) {
            heldPhaseIds.add(id);
        } else if (bonusCardIds.includes(id)) {
            hasHeldBonus = true;
        }
    });

    let jokerReplacementTarget = null;
    // Define the full sequence for checking missing items
    const fullSequenceForCheck = [...essentialPhaseOrder, ...bonusCardIds]; 

    if (jokerElements.length > 0) {
        // Find first missing item in the defined sequence
        for (const requiredId of fullSequenceForCheck) {
            let isMissing = true;
            if (essentialPhaseOrder.includes(requiredId)) {
                if (heldPhaseIds.has(requiredId)) {
                    isMissing = false;
                }
            } else if (bonusCardIds.includes(requiredId)) {
                if (hasHeldBonus) {
                    isMissing = false;
                }
            }
            
            if (isMissing) {
                 jokerReplacementTarget = requiredId;
                 break;
            }
        }
    }
    console.log(`${playerType} sorting: Joker will act as: ${jokerReplacementTarget || 'nothing specific'}`);

    // Assign the target role to *one* Joker for sorting purposes
    let activeJokerElement = null;
    if (jokerReplacementTarget && jokerElements.length > 0) {
        activeJokerElement = jokerElements[0]; // The first Joker found takes the role
        activeJokerElement.dataset.sortAs = jokerReplacementTarget; // Temporarily store its role
        console.log(`Assigning role ${jokerReplacementTarget} to Joker element for sorting`);
    }

    // --- Custom Sort Comparison Function ---
    const compareCards = (liA, liB) => {
        // Get the ID to use for sorting (actual ID or Joker's temporary role)
        let idA = (liA === activeJokerElement && liA.dataset.sortAs) ? liA.dataset.sortAs : liA.dataset.cardId;
        let idB = (liB === activeJokerElement && liB.dataset.sortAs) ? liB.dataset.sortAs : liB.dataset.cardId;

        // Determine category/type weight for each card
        const getTypeWeight = (id) => {
            if (essentialPhaseOrder.includes(id)) return 1; // Essential Phase
            if (bonusCardIds.includes(id)) return 2;       // Bonus Card
            // Make the active Joker sort WITH phases/bonus based on its role
            if (id === jokerReplacementTarget && (weight === 1 || weight === 2)) return getTypeWeight(jokerReplacementTarget); 
            // Sort non-active Jokers after Bonus cards
            if (id === 'joker') return 3;                  
            return 4;                                      // Other cards
        };
        
        // Recalculate weights using the effective IDs
         let effectiveWeightA = getTypeWeight(idA);
         let effectiveWeightB = getTypeWeight(idB);


        // 1. Sort primarily by type weight (Phases < Bonus < Jokers < Other)
        if (effectiveWeightA !== effectiveWeightB) {
            return effectiveWeightA - effectiveWeightB;
        }

        // 2. If same type, sort within the type
        if (effectiveWeightA === 1) { // Both are Essential Phases (or Joker acting as one)
            return essentialPhaseOrder.indexOf(idA) - essentialPhaseOrder.indexOf(idB);
        }
        if (effectiveWeightA === 2) { // Both are Bonus Cards (or Joker acting as one)
            // Optional: sort bonus cards themselves if desired, e.g., alphabetically
            // return bonusCardIds.indexOf(idA) - bonusCardIds.indexOf(idB); 
             return 0; // Treat bonus cards as equal priority for now
        }
        if (effectiveWeightA === 3) { // Both are non-active Jokers
            return 0; // Treat non-active Jokers as equal
        }
        if (effectiveWeightA === 4) { // Both are "Other" cards
            return idA.localeCompare(idB); // Sort other cards alphabetically by ID
        }

        return 0; // Should not be reached
    };

    // --- Sort the elements ---
    currentCardElements.sort(compareCards);

    // --- Clean up temporary Joker data ---
     if (activeJokerElement) {
         delete activeJokerElement.dataset.sortAs; // Remove temporary data after sort
     }

    // --- Rebuild DOM ---
    playerContainer.innerHTML = ''; // Clear current display
    currentCardElements.forEach(cardLi => {
        const cardId = cardLi.dataset.cardId;

        // Add 'key-card' class to phases, bonus, and joker
        if (essentialPhaseOrder.includes(cardId) || bonusCardIds.includes(cardId) || cardId === 'joker') {
            cardLi.classList.add('key-card'); // Add the common class
        } else {
            cardLi.classList.remove('key-card'); // Remove if not a key card
        }
        
        // Remove old specific classes (optional cleanup)
        cardLi.classList.remove('essential-phase-card'); 
        cardLi.classList.remove('bonus-card');

        playerContainer.appendChild(cardLi); // Add card back to the container
    });

    console.log(`${playerType}'s hand sorted and displayed.`);

     // Add back placeholders if needed
     const desiredSlots = 14; // Or however many slots you visually want max
     while (playerContainer.children.length < desiredSlots) {
         const placeholderLi = document.createElement('li');
         placeholderLi.classList.add('card', 'placeholder'); 
         const placeholderImg = document.createElement('img');
         placeholderImg.src = 'IMG-20250407-WA0002.jpg'; // Default card back/slot image
         placeholderImg.alt = 'Card Slot';
         placeholderLi.appendChild(placeholderImg);
         playerContainer.appendChild(placeholderLi);
     }
} // --- End of sortAndDisplayHand function ---
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
    // Clear existing placeholders/cards before dealing new ones for reset purposes
    playerContainer.innerHTML = '';

    for (let i = 0; i < numCardsToDeal; i++) {
        if (remainingDeckIndices.length === 0) {
            console.error("Ran out of cards in deck during distribution.");
            break;
        }

        const deckIndexToDeal = remainingDeckIndices.pop(); // Take one index from the end
        const cardData = allCardData[deckIndexToDeal];

        // Create new card LI element
        const newCardLi = document.createElement('li');
        newCardLi.classList.add('card');
        newCardLi.dataset.cardId = cardData.id; // Store card ID on the LI

        const newCardImg = document.createElement('img');
        newCardImg.src = cardData.src;
        newCardImg.alt = cardData.id; // Set alt text for accessibility/debugging
        newCardLi.appendChild(newCardImg);

        playerContainer.appendChild(newCardLi); // Add the new card to the player's hand

        console.log(` -> Dealing card ${cardData.id} (Index: ${deckIndexToDeal}) to ${playerType}`);
    }

    // Sort the hand after dealing all cards
    sortAndDisplayHand(playerType);

    // Add back placeholder slots if the player has less than a certain number (optional visual consistency)
    const desiredSlots = 14; // Or however many slots you visually want max
    while(playerContainer.children.length < desiredSlots){
        const placeholderLi = document.createElement('li');
        placeholderLi.classList.add('card', 'placeholder'); // Add placeholder class
        const placeholderImg = document.createElement('img');
        placeholderImg.src = 'IMG-20250407-WA0002.jpg'; // Default card back/slot image
        placeholderImg.alt = 'Card Slot';
        placeholderLi.appendChild(placeholderImg);
        playerContainer.appendChild(placeholderLi);
    }
}


// Update visual indicator for whose turn it is
// --- MODIFIED updateTurnIndicator Function ---
function updateTurnIndicator() {
    if (turnState === 'game_over') {
        // Optional: Style differently for game over
        turnIndicatorElement.textContent = "Game Over";
        turnIndicatorElement.style.backgroundColor = "rgba(128, 0, 0, 0.8)"; // Example: Red background
        return;
    };

    const currentText = turnIndicatorElement.textContent; // Get text before changing
    const newText = (currentPlayer === 'me' ? "Your Turn (Player 1)" : "Opponent's Turn (Player 2)");

    // Only animate if the text is actually changing
    if (currentText !== newText) {
        turnIndicatorElement.textContent = newText;
        // Apply player-specific background (optional)
        if (currentPlayer === 'me') {
            turnIndicatorElement.style.backgroundColor = "rgba(7, 7, 82, 0.8)"; // Blue for P1
        } else {
            turnIndicatorElement.style.backgroundColor = "rgba(82, 7, 7, 0.8)"; // Darker Red for P2
        }

        // Trigger pulse animation
        turnIndicatorElement.classList.add('indicator-pulse');
        // Remove the class after animation finishes so it can pulse again later
        setTimeout(() => {
            turnIndicatorElement.classList.remove('indicator-pulse');
        }, 600); // Match animation duration (0.6s)

        console.log(`Turn indicator updated: ${turnIndicatorElement.textContent}`);
    } else {
         // If text didn't change (e.g., extra turn), just ensure correct background
         if (currentPlayer === 'me') {
            turnIndicatorElement.style.backgroundColor = "rgba(7, 7, 82, 0.8)"; 
        } else {
            turnIndicatorElement.style.backgroundColor = "rgba(82, 7, 7, 0.8)";
        }
    }
}

// Update score display
function updateScoreDisplay() {
    myScoreElement.textContent = `My Score: ${scores.me}`;
    opponentScoreElement.textContent = `Opponent Score: ${scores.opponent}`;
    console.log(`Scores updated: Me - ${scores.me}, Opponent - ${scores.opponent}`);
}

// Set which player's hand is active (clickable) - UPDATED for Phase 3
function setActivePlayerHand() {
    if (turnState === 'game_over') {
        myCardContainer.classList.add('inactive');
        opponentCardContainer.classList.add('inactive');
         pullCardDeckElement.style.opacity = '0.5';
         playButton.disabled = true;
        console.log("Game over: All interactions disabled.");
        return;
    }
    if (turnState === 'waiting_for_answer') {
        myCardContainer.classList.add('inactive');
        opponentCardContainer.classList.add('inactive');
        console.log("Both hands deactivated (waiting for answer).");
        return;
    }
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
    if (turnState === 'game_over' && message !== "Game Over!") return;

    messageAreaElement.textContent = message;
    console.log(`Message displayed: ${message}`);
    if (duration > 0) {
        setTimeout(() => {
            if (messageAreaElement.textContent === message && turnState !== 'game_over') {
                 messageAreaElement.textContent = '';
            }
        }, duration);
    }
}

// Switch turns between players - UPDATED for Phase 3
function switchPlayer() {
    if (turnState === 'game_over') {
        console.log("Switch player blocked: Game Over.");
        return;
    }

    console.log(`Switching player from ${currentPlayer}. Current state: ${turnState}`);

    currentPlayer = (currentPlayer === 'me') ? 'opponent' : 'me';
    turnState = 'start'; // Always reset to start for the new player's turn
    selectedCard = null;
    playButton.disabled = true;
    pullCardDeckElement.style.opacity = (turnState === 'game_over') ? '0.5' : '1';

    updateTurnIndicator();
    setActivePlayerHand();

    if (suspensions[currentPlayer] > 0) {
        showMessage(`${currentPlayer === 'me' ? 'You are' : 'Opponent is'} suspended for ${suspensions[currentPlayer]} more turn(s). Skipping turn.`, 4000);
        suspensions[currentPlayer]--;
        setTimeout(switchPlayer, 1500); // Skip turn immediately
    } else {
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
    if (turnState === 'game_over') return;

    console.log(`Triggering question sequence for played card: ${playedCardId}`);
    turnState = 'waiting_for_answer';
    setActivePlayerHand();

    currentQuestionData.opponentPlayer = (currentPlayer === 'me') ? 'opponent' : 'me';
    let dataCardTypePrefix = '';
    let promptText = '';
    if (playedCardId === 'ask_question') { dataCardTypePrefix = 'q'; promptText = 'Answer the Question:'; }
    else if (playedCardId === 'true_or_false') { dataCardTypePrefix = 'true_or_false'; promptText = 'True or False?'; }
    else if (playedCardId === 'riddle') { dataCardTypePrefix = 'riddle'; promptText = 'Solve the Riddle:'; }
    else { console.error("Invalid card ID..."); switchPlayer(); return; }

    const dataCard = getRandomDataCard(dataCardTypePrefix);
    if (!dataCard) { showMessage("Error: Could not find data card...", 5000); switchPlayer(); return; }

    currentQuestionData.dataCardId = dataCard.id;
    console.log(`Selected data card: ${dataCard.id} for opponent ${currentQuestionData.opponentPlayer}`);

    responsePromptElement.textContent = `${currentQuestionData.opponentPlayer === 'me' ? 'You must' : 'Opponent must'} ${promptText}`;
    responseCardImageElement.src = dataCard.src;
    responseCardImageElement.alt = dataCard.id;
    responseInputElement.value = '';
    responseFeedbackElement.textContent = '';
    responseSubmitButton.disabled = false;
    responseAreaElement.style.display = 'block';
    responseInputElement.focus();
}


// --- New Functions for Phase 3 ---

// Check if a player has met the win conditions
// --- UPDATED checkWinCondition function (Conceptual modification) ---
function checkWinCondition(player) {
    if (!player || turnState === 'game_over') return false;

    const playerContainer = (player === 'me') ? myCardContainer : opponentCardContainer;
    const playerCards = Array.from(playerContainer.querySelectorAll("li.card:not(.placeholder)")); // Get actual cards
    
    let jokerCount = 0;
    const currentPhases = new Set();
    let hasBonus = false;

    // Tally current cards and jokers
    playerCards.forEach(cardLi => {
        const cardId = cardLi.dataset.cardId;
        if (cardId === 'joker') {
            jokerCount++;
        } else if (requiredPhaseCards.has(cardId)) {
            currentPhases.add(cardId);
        } else if (cardId === 'division_réductionnelle' || cardId === 'division_equationnelle') {
            hasBonus = true;
        }
    });

    let neededPhases = 0; // Count how many essential phases are missing
    essentialPhaseOrder.forEach(phase => {
        if (!currentPhases.has(phase)) {
            neededPhases++;
        }
    });

    // Use Jokers for missing essential phases first, in order
    let jokersUsedForPhases = 0;
    essentialPhaseOrder.forEach(phase => {
        if (!currentPhases.has(phase) && jokerCount > 0) {
            currentPhases.add(phase); // Simulate having the card
            jokerCount--;
            jokersUsedForPhases++;
            neededPhases--; // One less phase needed
        }
    });
    
    // Use remaining Jokers for a missing bonus card if all phases are now covered
    let jokerUsedForBonus = false;
    if (neededPhases === 0 && !hasBonus && jokerCount > 0) {
         hasBonus = true; // Simulate having the bonus
         jokerCount--; // Use one more joker
         jokerUsedForBonus = true;
    }

    console.log(`${player} check: Phases held: ${currentPhases.size}, Bonus held: ${hasBonus}, Jokers used (phase/bonus): ${jokersUsedForPhases}/${jokerUsedForBonus}`);

    // Condition 1: Card collection (8 phases + 1 bonus, considering Jokers)
    if (currentPhases.size === requiredPhaseCards.size && hasBonus) {
        console.log(`Win Condition MET for ${player}: Collected all phases and a bonus card (with Joker assist).`);
        return true;
    }

    // Condition 2: Score exceeds 500 (remains the same)
    if (scores[player] > 500) {
        console.log(`Win Condition MET for ${player}: Score (${scores[player]}) exceeds 500.`);
        return true;
    }

    return false;
}

// End the game and display the winner
// --- UPDATED endGame function ---
function endGame(winner) {
    // REMOVE or COMMENT OUT this check:
    // if (turnState === 'game_over') return; 
    // We WANT this function to run even if the state is already game_over, 
    // especially when called after the winning animation.

    console.log(`Game Ending! Winner: ${winner}`);
    // Ensure the state is game_over if it wasn't already (e.g., score win)
    turnState = 'game_over'; 

    const winnerName = (winner === 'me' ? "Player 1 (You)" : "Player 2 (Opponent)");
    winnerAnnouncementElement.textContent = `${winnerName} Wins! Final Score: ${scores[winner]}`;
    
    // **This is the crucial line to display the overlay**
    gameOverOverlayElement.style.display = 'flex'; 

    // Disable interactions (setActivePlayerHand already does this based on game_over state)
    setActivePlayerHand(); 
    // Show a persistent final message if desired (optional)
    // showMessage("Game Over!", 0); // Message area might be covered by overlay
}

// --- UPDATED handleAnswerSubmit for Phase 3 ---
function handleAnswerSubmit() {
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
    responseSubmitButton.disabled = true;
    let winDetected = false;

    if (correctAnswer === undefined) {
        console.error(`No answer defined for ${dataCardId}`);
        responseFeedbackElement.textContent = "Error: Answer key missing.";
    } else {
        const normalizedOpponentAnswer = opponentAnswer.toLowerCase();
        let isCorrect = false;
        if (Array.isArray(correctAnswer)) {
             const normalizedCorrectAnswers = correctAnswer.map(ans => String(ans).toLowerCase());
             isCorrect = normalizedCorrectAnswers.includes(normalizedOpponentAnswer);
        } else {
             isCorrect = normalizedOpponentAnswer === String(correctAnswer).toLowerCase();
        }

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
         updateScoreDisplay();

         if (checkWinCondition(opponent)) {
             winDetected = true;
             setTimeout(() => endGame(opponent), 500);
             setTimeout(() => { if (turnState === 'game_over') responseAreaElement.style.display = 'none'; }, 2500);
             return;
         }
    }

     if (!winDetected) {
         setTimeout(() => {
             responseAreaElement.style.display = 'none';
             switchPlayer();
         }, 2500);
     }
}


// --- Event Handlers (Updated for game_over state checks) ---

// MODIFY handlePullCardClick to check win condition AFTER adding the card
// MODIFY handlePullCardClick to handle empty deck and reshuffle
function handlePullCardClick() {
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') {
         console.log(`Pull click blocked: State is ${turnState}`); return;
    }
    console.log("Pull card clicked.");
    if (turnState !== 'start') { 
        showMessage("Cannot pull now. Must play or opponent is answering."); 
        return; 
    } 

    // --- NEW: Handle Empty Deck ---
    if (remainingDeckIndices.length === 0) {
        const reshuffleSuccess = reshuffleDiscardPile();
        if (!reshuffleSuccess) {
             // If reshuffle failed (e.g., truly no cards left), show message and stop.
             showMessage("Deck empty and no cards to reshuffle!", 3000);
             return; 
        }
        // If reshuffle succeeded, the deck now has cards, so we continue below.
    }
    // --- End of Empty Deck Handling ---

    // Proceed with pulling a card (deck is guaranteed to have cards here if we passed the check)
    const deckIndexToPull = remainingDeckIndices.pop();
    const cardData = allCardData[deckIndexToPull];
    const playerContainer = (currentPlayer === 'me') ? myCardContainer : opponentCardContainer;

    const placeholderToRemove = playerContainer.querySelector('li.placeholder');
    if (placeholderToRemove) {
        placeholderToRemove.remove();
    }

    const newCardLi = document.createElement('li');
    newCardLi.classList.add('card');
    newCardLi.dataset.cardId = cardData.id;
    const newCardImg = document.createElement('img');
    newCardImg.src = cardData.src; newCardImg.alt = cardData.id;
    newCardLi.appendChild(newCardImg);
    applyDrawAnimation(newCardLi);
    playerContainer.appendChild(newCardLi);

    sortAndDisplayHand(currentPlayer); // Sort AFTER adding
    console.log(`${currentPlayer} pulled ${cardData.id}. Deck: ${remainingDeckIndices.length}`);

    // Check for win condition right after pulling and sorting
    if (checkWinCondition(currentPlayer)) {
        console.log(`Win detected immediately after pulling card ${cardData.id}`);
        showWinningAnimationAndEndGame(currentPlayer); 
        return; 
    }

    // If no win, proceed as normal
    turnState = 'pulled_card';
    pullCardDeckElement.style.opacity = '0.5'; // Disable pulling again
    showMessage("Card pulled. Select a card to play."); 
    console.log(`State after pull (no win): ${turnState}`);
}


function handleCardClick(event) {
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') {
        console.log(`Card click blocked: State is ${turnState}`); return;
    }
    // Allow clicking only actual cards, not placeholders
    const clickedLi = event.target.closest('li.card:not(.placeholder)');
    if (!clickedLi || clickedLi.closest('.cards.inactive')) { return; }

    console.log(`Card clicked: ${clickedLi.dataset.cardId}`);
    // Allow selecting only if a card was just pulled
    if (turnState !== 'pulled_card') { showMessage("Pull card first!"); return; }

    if (selectedCard) { selectedCard.classList.remove('selected-card'); }
    selectedCard = clickedLi;
    selectedCard.classList.add('selected-card');
    playButton.disabled = false;
    console.log(`Card selected: ${selectedCard.dataset.cardId}`);
}

function handleCardMouseOver(event) {
    if (turnState === 'game_over' || turnState === 'waiting_for_answer') return;
    const hoveredLi = event.target.closest('li.card:not(.placeholder)'); // Ignore placeholders
    if (hoveredLi && !hoveredLi.closest('.cards.inactive')) { /* CSS handles hover */ }
}

function handleCardMouseOut(event) {
     if (turnState === 'game_over' || turnState === 'waiting_for_answer') return;
    const hoveredLi = event.target.closest('li.card:not(.placeholder)'); // Ignore placeholders
    if (hoveredLi && !hoveredLi.closest('.cards.inactive')) { /* CSS handles hover */ }
}

// MODIFY handlePlayButtonClick to call the sorting function
// MODIFY handlePlayButtonClick to check win condition BEFORE switching player/triggering question
// --- MODIFIED handlePlayButtonClick function ---
// --- FULL handlePlayButtonClick Function (Focus on mutation_addition) ---
// --- FULL handlePlayButtonClick Function (Corrected mutation_addition focus) ---
// --- FULL handlePlayButtonClick Function (Implementing Deletion Choice) ---
// --- FULL handlePlayButtonClick Function (Revised Deletion Choice Initiation) ---
// --- FULL handlePlayButtonClick Function (Implementing Substitution) ---
// --- FULL handlePlayButtonClick Function (Implementing Block/Change Direction as Extra Turn) ---
function handlePlayButtonClick() {
    // Basic checks for game state and card selection
    if (turnState === 'game_over' || turnState === 'waiting_for_answer' || turnState === 'selecting_deletion_target') {
        console.log(`Play click blocked: State is ${turnState}`);
        return;
    }
    console.log("Play button clicked.");
    if (!selectedCard) {
        showMessage("No card selected.");
        return;
    }
    if (turnState !== 'pulled_card') {
        showMessage("Must pull a card before playing.");
        return;
    }

    const cardId = selectedCard.dataset.cardId;
    console.log(`Current player at start of play: ${currentPlayer}`);
    const opponentPlayer = (currentPlayer === 'me') ? 'opponent' : 'me';

    console.log(`${currentPlayer} playing card: ${cardId}`);

    // Display played card
    playAreaContainer.innerHTML = '';
    const playedCardImg = selectedCard.querySelector('img').cloneNode(true);
    playAreaContainer.appendChild(playedCardImg);
    selectedCard.remove(); // Remove from hand

    // Sort hand after removing
    sortAndDisplayHand(currentPlayer);

    // Add placeholder back
    const playerContainer = (currentPlayer === 'me') ? myCardContainer : opponentCardContainer;
    const placeholderLi = document.createElement('li');
    placeholderLi.classList.add('card', 'placeholder');
    const placeholderImg = document.createElement('img');
    placeholderImg.src = 'IMG-20250407-WA0002.jpg';
    placeholderImg.alt = 'Card Slot';
    placeholderLi.appendChild(placeholderImg);
    playerContainer.appendChild(placeholderLi);

    // --- Handle Card Logic ---
    let needsSwitchPlayer = true; // Assume turn switches unless card logic changes this
    let isQuestionTypeCard = ['ask_question', 'true_or_false', 'riddle'].includes(cardId);
    let playerChangedState = false;

    // --- Standard Card Logic ---
    if (['division_réductionnelle', 'division_equationnelle'].includes(cardId)) {
        scores[currentPlayer] += 15;
        collectedBonus[currentPlayer] = true;
        console.log(`${currentPlayer} played bonus ${cardId} (+15)`);
        playerChangedState = true;
    } else if (isQuestionTypeCard) {
        scores[currentPlayer] += 15;
        console.log(`${currentPlayer} played question ${cardId} (+15)`);
        playerChangedState = true;
        needsSwitchPlayer = false; // Question sequence handles turn progression
        triggerQuestionSequence(cardId);
    } else if (requiredPhaseCards.has(cardId)) {
        collectedPhases[currentPlayer].add(cardId);
        console.log(`${currentPlayer} played phase ${cardId}. Collected: ${[...collectedPhases[currentPlayer]].join(', ')}`);
        playerChangedState = true;
    }
    // --- Logic for Mutation Addition (Verified) ---
    else if (cardId === 'mutation_addition') {
        console.log(`--> Executing Mutation Addition for ${currentPlayer}`);
        if (remainingDeckIndices.length > 0) {
            const deckIndexToPull = remainingDeckIndices.pop();
            const cardData = allCardData[deckIndexToPull];
            const targetHandContainer = (currentPlayer === 'me') ? myCardContainer : opponentCardContainer;
            console.log(`--> Target container determined for: ${currentPlayer}`);
            if (!targetHandContainer) { console.error("Error: Target hand container not found!"); return; }

            const placeholderToRemove = targetHandContainer.querySelector('li.placeholder');
            if (placeholderToRemove) { placeholderToRemove.remove(); console.log("--> Removed placeholder from target hand.");}
            else { console.log("--> No placeholder found to remove in target hand.");}

            const newCardLi = document.createElement('li');
            newCardLi.classList.add('card'); newCardLi.dataset.cardId = cardData.id;
            const newCardImg = document.createElement('img');
            newCardImg.src = cardData.src; newCardImg.alt = cardData.id;
            newCardLi.appendChild(newCardImg);

            applyDrawAnimation(newCardLi);



            targetHandContainer.appendChild(newCardLi);
            console.log(`--> Appended new card ${cardData.id} to ${currentPlayer}'s container.`);

            console.log(`--> Calling sortAndDisplayHand for: ${currentPlayer}`);
            sortAndDisplayHand(currentPlayer);
            showMessage(`Drew extra card: ${cardData.id}`, 2500);
            console.log(`${currentPlayer} drew extra ${cardData.id}. Deck size: ${remainingDeckIndices.length}`);
        } else {
            showMessage("Tried to draw extra card, but deck is empty!", 2500);
            console.log("Mutation Addition played, but deck empty.");
        }
        playerChangedState = true;
    }
    // --- Logic for Mutation Deletion (Choice Initiation - Verified) ---
    else if (cardId === 'mutation_deletion') {
         console.log(`${currentPlayer} played Mutation Deletion! Choose opponent card.`);
         const opponentHandContainer = (opponentPlayer === 'me') ? myCardContainer : opponentCardContainer;
         const opponentCards = opponentHandContainer.querySelectorAll("li.card:not(.placeholder)");

         if (opponentCards.length > 0) {
             // Initiate Selection Mode
             turnState = 'selecting_deletion_target';
             needsSwitchPlayer = false; // Pause turn progression

             playButton.disabled = true;
             pullCardDeckElement.style.opacity = '0.5';

             opponentHandContainer.classList.remove('inactive');
             playerContainer.classList.remove('inactive'); // Player who played the card

             opponentCards.forEach(card => {
                 card.classList.add('selectable-card');
                 card.addEventListener('click', handleDeletionChoiceClick, { once: true });
             });

             showMessage("Select a card from opponent's hand to discard.", 0);
             console.log("Waiting for player to select card for deletion. Listeners attached to cards.");
         } else {
            showMessage("Tried to make opponent discard, but their hand is empty!", 2500);
            console.log("Mutation Deletion played, but opponent hand empty.");
            needsSwitchPlayer = true;
         }
         playerChangedState = true;
    }
    // --- Logic for Mutation Substitution (Verified) ---
    else if (cardId === 'mutation_substitution') {
        console.log(`${currentPlayer} played Mutation Substitution! Swapping hands.`);
        showMessage("Swapping hands!", 2000);

        const myCardsHTML = myCardContainer.innerHTML;
        const opponentCardsHTML = opponentCardContainer.innerHTML;

        myCardContainer.innerHTML = opponentCardsHTML;
        opponentCardContainer.innerHTML = myCardsHTML;

        console.log("--> Re-sorting both hands after swap.");
        sortAndDisplayHand('me');
        sortAndDisplayHand('opponent');

        playerChangedState = true;
    }
    // --- NEW Logic for Block / Change Direction (Extra Turn) ---
    else if (cardId === 'block' || cardId === 'change_direction') {
         console.log(`${currentPlayer} played ${cardId}! Taking another turn.`);
         needsSwitchPlayer = false; // Do NOT switch player

         // Reset state for the *current* player to start their turn again
         turnState = 'start';

         // Immediately update UI for the extra turn
         pullCardDeckElement.style.opacity = '1'; // Re-enable pulling
         playButton.disabled = true; // Can't play until pulling again
         updateTurnIndicator(); // Make sure indicator still shows current player
         setActivePlayerHand(); // Make sure current player's hand is active

         showMessage(`Played ${cardId}. Take another turn!`, 2500);
         playerChangedState = true; // Indicate state changed
    }
    // --- End of Special Card Logic ---
    else {
        console.log(`${currentPlayer} played unhandled card: ${cardId}`);
    }

    // --- Update score display ---
    if (playerChangedState) { updateScoreDisplay(); }

    // --- Reset UI ---
    selectedCard = null;
    // Disable play button unless waiting for deletion target (where it's already disabled)
    if (turnState !== 'selecting_deletion_target') {
        playButton.disabled = true;
    }


    // --- Check Win Condition ---
    // Don't check win condition during selection phase
    if (turnState !== 'selecting_deletion_target' && checkWinCondition(currentPlayer)) {
        console.log(`Win detected after playing card ${cardId}`);
        showWinningAnimationAndEndGame(currentPlayer);
        needsSwitchPlayer = false; // Prevent switching if win occurred
        return; // Stop function execution
    }
    // Optional: Check opponent win after swap etc. (can be complex)
    // if (turnState !== 'selecting_deletion_target' && checkWinCondition(opponentPlayer)) { ... }


    // --- Switch Player if necessary ---
    // Only switch if the flag is set AND not waiting for deletion choice
    // AND not taking an extra turn (handled by block/change_direction setting needsSwitchPlayer=false)
    if (needsSwitchPlayer && turnState !== 'selecting_deletion_target') {
        // Set state to 'start' for the *next* player before switching
        turnState = 'start';
        console.log("Card action complete, proceeding to switch player.");
        setTimeout(switchPlayer, 500);
    } else if (!needsSwitchPlayer && turnState === 'start') {
        // This condition handles the end of the block/change_direction extra turn logic
        console.log("Extra turn granted. Player stays the same.");
        // UI is already updated within the card logic block
    } else if (!needsSwitchPlayer && turnState === 'selecting_deletion_target') {
        // Waiting for player input for deletion
        console.log("Waiting for deletion target selection.");
    } else if (!needsSwitchPlayer) {
         // If needsSwitchPlayer is false for other reasons (like question card),
         // the responsible function (triggerQuestionSequence) handles progression.
         console.log("Turn progression handled by other function (e.g., question sequence).")
    }
}


// --- NEW Event Handler for Deletion Choice ---
// --- Event Handler for Deletion Choice ---
// (Make sure this function exists in your main.js)
// --- REVISED Event Handler for Deletion Choice ---
function handleDeletionChoiceClick(event) {
    // 'this' or event.currentTarget now refers to the clicked LI element itself
    const clickedLi = event.currentTarget;

    // Basic check to prevent errors if state changed unexpectedly
    if (turnState !== 'selecting_deletion_target') {
        console.warn("Deletion choice click handler called in wrong state:", turnState);
        // Attempt to remove selectable class just in case
         clickedLi.classList.remove('selectable-card');
        return;
    }

    // We know clickedLi is the correct card because the listener was attached directly
    const opponentPlayer = (currentPlayer === 'me') ? 'opponent' : 'me';
     // Find the container this card belongs to (its parent UL)
    const opponentHandContainer = clickedLi.closest('ul.cards');
    if (!opponentHandContainer) {
         console.error("Could not find parent container for clicked card!");
         // Try to reset state partially
         turnState = 'start'; // Avoid getting stuck
         setActivePlayerHand();
         return;
    }
    
    const removedCardId = clickedLi.dataset.cardId;
    console.log(`${currentPlayer} chose to discard opponent's ${removedCardId}`);

    // --- Perform Deletion and Cleanup ---
    clickedLi.remove(); // Remove the clicked card

    // Add placeholder back
    const oppPlaceholderLi = document.createElement('li');
    oppPlaceholderLi.classList.add('card', 'placeholder');
    const oppPlaceholderImg = document.createElement('img');
    oppPlaceholderImg.src = 'IMG-20250407-WA0002.jpg';
    oppPlaceholderImg.alt = 'Card Slot';
    oppPlaceholderLi.appendChild(oppPlaceholderImg);
    opponentHandContainer.appendChild(oppPlaceholderLi);

    // Remove selectable class and any stray listeners from OTHERS
    // (The clicked one removed its own listener via {once: true})
    opponentHandContainer.querySelectorAll("li.card.selectable-card").forEach(card => {
        card.classList.remove('selectable-card');
        // Remove listener just in case {once: true} failed or wasn't applied somehow
        card.removeEventListener('click', handleDeletionChoiceClick);
    });

    // Sort opponent's hand
    sortAndDisplayHand(opponentPlayer);

    showMessage(`Discarded opponent's ${removedCardId}!`, 2500);

    // --- Reset State and Proceed ---
    turnState = 'start';
    setActivePlayerHand(); // Apply standard active/inactive styling
    pullCardDeckElement.style.opacity = '1';
    playButton.disabled = true;

    console.log("Deletion complete. Switching player.");
    switchPlayer();
}




// --- Helper function to apply draw animation ---
function applyDrawAnimation(cardElement) {
    if (!cardElement) return;

    // Add the animation class
    cardElement.classList.add('card-draw-animation');

    // Optional: Clean up class after animation finishes
    // Using 'animationend' event is cleaner than setTimeout
    cardElement.addEventListener('animationend', () => {
        cardElement.classList.remove('card-draw-animation');
        // Re-enable pointer events if they were disabled during animation
        // cardElement.style.pointerEvents = 'auto';
        console.log(`Animation ended for card: ${cardElement.dataset.cardId}`);
    }, { once: true }); // {once: true} automatically removes the listener after it fires
}




// --- Initialization ---

// UPDATED initializeEventListeners for Phase 3
function initializeEventListeners() {
    console.log("Initializing event listeners...");
    pullCardDeckElement.addEventListener('click', handlePullCardClick);
    playButton.addEventListener('click', handlePlayButtonClick);
    // Use event delegation on containers instead of individual cards
    myCardContainer.addEventListener('click', handleCardClick);
    myCardContainer.addEventListener('mouseover', handleCardMouseOver);
    myCardContainer.addEventListener('mouseout', handleCardMouseOut);
    opponentCardContainer.addEventListener('click', handleCardClick); // Opponent clicks are usually simulated/disabled
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

// UPDATED initializeGame for Phase 3 (Reset Logic & Sorting)
function initializeGame() {
    console.log("--- RESETTING AND INITIALIZING GAME ---");
     // Reset game state variables completely
     currentPlayer = 'me';
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
     // Placeholders will be added by distributeToPlayer now

     gameOverOverlayElement.style.display = 'none';
     responseAreaElement.style.display = 'none';
     playButton.disabled = true;
     pullCardDeckElement.style.opacity = '1';


    console.log("Initializing game modules...");
    initializeDeck(); // Load card data from HTML
    if (allCardData.length < 28) {
         showMessage("Error: Not enough cards defined in HTML to play.", 0);
         return;
    }
    // distributeInitialCards() now handles dealing AND sorting AND placeholders
    distributeInitialCards();

    // Check if listeners already exist before adding (simple check)
    // A more robust approach would be needed if initializeGame is called multiple times without page reload
    // For simplicity, assuming listeners are set once on load or after full reset
    // if (!pullCardDeckElement.hasAttribute('data-listener-added')) {
         initializeEventListeners();
    //     pullCardDeckElement.setAttribute('data-listener-added', 'true'); // Mark as added
    // }

    updateScoreDisplay();
    updateTurnIndicator();
    setActivePlayerHand();

    console.log("Game initialization complete.");
    showMessage("Game Start! Player 1 (You), pull a card.", 4000);

}


// --- NEW Function to Reshuffle Discarded Cards ---
function reshuffleDiscardPile() {
    console.log("Attempting to reshuffle discard pile...");
    showMessage("Deck empty. Reshuffling discarded cards...", 2000);

    // 1. Identify all cards currently in players' hands
    const cardsInHandsIds = new Set();
    const myHandCards = Array.from(myCardContainer.querySelectorAll("li.card:not(.placeholder)"));
    myHandCards.forEach(li => cardsInHandsIds.add(li.dataset.cardId));

    const opponentHandCards = Array.from(opponentCardContainer.querySelectorAll("li.card:not(.placeholder)"));
    opponentHandCards.forEach(li => cardsInHandsIds.add(li.dataset.cardId));

    console.log(`Cards currently in hands: ${[...cardsInHandsIds].join(', ')}`);

    // 2. Determine indices of cards NOT in hands
    const availableIndicesForReshuffle = [];
    for (let i = 0; i < allCardData.length; i++) {
        const cardId = allCardData[i].id;
        // Check if this card ID is present in the hands set
        // Note: This assumes card IDs are unique enough. If multiple identical cards exist, 
        // this logic needs refinement to track counts. Based on your HTML, 
        // you have multiple cards with the same ID (e.g., 4x p1). 
        // A better approach is needed if exact card copies matter.
        
        // **Revised Approach: Assume we reshuffle ALL original deck indices except those currently held.**
        // This requires knowing which *specific* original card instance is held.
        // Let's simplify: We'll find all *indices* of cards whose IDs match those in hands.
    }

    // **Revised Approach 2: Track indices explicitly**
    // This requires changing how cards are dealt and tracked initially.
    // Let's stick to a simpler model for now: Reshuffle all cards based on ID presence.

    const indicesInHands = new Set();
    // Find *all* indices in the master deck that correspond to card IDs currently held.
    // This might exclude too many if players hold multiple copies of the same card ID.
    for (let i = 0; i < allCardData.length; i++) {
         if (cardsInHandsIds.has(allCardData[i].id)) {
             // This index corresponds to a card ID currently held.
             // Problem: Doesn't account for *which copy* is held.
         }
    }

    // ***RETHINK: The EASIEST approach given the current structure***
    // Get ALL card indices (0 to N-1). Identify the indices currently in hands. Reshuffle the rest.
    // This STILL requires knowing which index corresponds to which LI element.

    // ***Let's use the initial `allCardData` and filter based on IDs in hands***
    // This assumes we reshuffle card *types* not specific instances.

    const discardedCardData = [];
    const heldCardCounts = {}; // Track counts of held cards by ID

    // Count cards in hands
     myHandCards.forEach(li => {
        const id = li.dataset.cardId;
        heldCardCounts[id] = (heldCardCounts[id] || 0) + 1;
     });
     opponentHandCards.forEach(li => {
        const id = li.dataset.cardId;
        heldCardCounts[id] = (heldCardCounts[id] || 0) + 1;
     });

    // Create the pool of discard indices based on counts
    const currentHeldCounts = {...heldCardCounts}; // Copy counts to decrement
    const discardIndices = [];

    for(let i = 0; i < allCardData.length; i++) {
        const cardId = allCardData[i].id;
        if (currentHeldCounts[cardId] && currentHeldCounts[cardId] > 0) {
            // This card instance is considered "in hand", decrement count
            currentHeldCounts[cardId]--;
        } else {
            // This card instance is considered "discarded"
            discardIndices.push(i);
        }
    }
    
    if (discardIndices.length === 0) {
        console.warn("Reshuffle called, but no cards found in discard pile (all cards might be in hands).");
        return false; // Indicate reshuffle failed or wasn't needed
    }

    console.log(`Found ${discardIndices.length} card indices to reshuffle.`);

    // 3. Shuffle the discard indices and assign to remainingDeckIndices
    remainingDeckIndices = shuffleArray(discardIndices); // Use existing shuffle function

    console.log(`Deck reshuffled. New deck size: ${remainingDeckIndices.length}`);
    return true; // Indicate reshuffle success
}



// --- NEW Function for Winning Animation ---
// --- UPDATED Function for Winning Animation (Handles Joker Repositioning) ---
function showWinningAnimationAndEndGame(winner) {
    console.log(`Starting winning animation for ${winner}`);
    turnState = 'game_over'; 
    pullCardDeckElement.style.opacity = '0.5';
    playButton.disabled = true;
    responseAreaElement.style.display = 'none'; 

    const winnerCardContainer = (winner === 'me') ? myCardContainer : opponentCardContainer;
    const winnerCards = Array.from(winnerCardContainer.querySelectorAll("li.card:not(.placeholder)"));
    
    let winningCardData = []; // Store { element: li, id: cardId, isJokerReplacementFor: null }
    let jokerElementsAvailable = [];
    const currentPhaseIds = new Set();
    let hasBonus = false;
    let bonusCardElement = null; 

    // Pass 1: Identify all cards and separate Jokers
    winnerCards.forEach(cardLi => {
        const cardId = cardLi.dataset.cardId;
        if (cardId === 'joker') {
            jokerElementsAvailable.push(cardLi);
        } else if (requiredPhaseCards.has(cardId)) {
             if (!currentPhaseIds.has(cardId)) {
                 currentPhaseIds.add(cardId);
                 winningCardData.push({ element: cardLi, id: cardId, isJokerReplacementFor: null });
             }
        } else if (cardId === 'division_réductionnelle' || cardId === 'division_equationnelle') {
             if (!hasBonus) {
                 hasBonus = true;
                 bonusCardElement = cardLi; // Keep track of the natural bonus card element
             }
        }
    });

    // Pass 2: Determine Joker roles and add them to winningCardData
    let jokersToReposition = []; // Keep track of { jokerElement: li, replaceTargetId: phaseId }

    essentialPhaseOrder.forEach(phaseId => {
        if (!currentPhaseIds.has(phaseId) && jokerElementsAvailable.length > 0) {
            const jokerToUse = jokerElementsAvailable.pop();
            currentPhaseIds.add(phaseId); // Mark phase as covered conceptually
            winningCardData.push({ element: jokerToUse, id: 'joker', isJokerReplacementFor: phaseId });
            jokersToReposition.push({ jokerElement: jokerToUse, replaceTargetId: phaseId });
        }
    });
    
    if (currentPhaseIds.size === requiredPhaseCards.size && !hasBonus && jokerElementsAvailable.length > 0) {
         const jokerToUse = jokerElementsAvailable.pop();
         hasBonus = true; 
         // Add Joker representing the bonus card (target ID can be generic like 'bonus')
         winningCardData.push({ element: jokerToUse, id: 'joker', isJokerReplacementFor: 'bonus' }); 
         // Jokers replacing bonus cards don't need specific repositioning relative to phases usually.
         // They just need to be included in the highlight.
    } else if (hasBonus && bonusCardElement) {
         // If bonus was present naturally, add its data
         winningCardData.push({ element: bonusCardElement, id: bonusCardElement.dataset.cardId, isJokerReplacementFor: null });
    }
    
    console.log(`Identified ${winningCardData.length} winning card elements.`);

    // --- **NEW: Reposition Joker Elements in the DOM** ---
    jokersToReposition.forEach(repositionInfo => {
        const jokerElement = repositionInfo.jokerElement;
        const targetPhaseId = repositionInfo.replaceTargetId;
        const targetIndex = essentialPhaseOrder.indexOf(targetPhaseId);
        let insertBeforeElement = null;

        // Find the element the Joker should appear *before*
        // Iterate through the *rest* of the essential phases *after* the target
        for (let i = targetIndex + 1; i < essentialPhaseOrder.length; i++) {
            const nextPhaseId = essentialPhaseOrder[i];
            // Find the LI element for this next phase *among the winning cards*
            const nextPhaseData = winningCardData.find(data => 
                (data.id === nextPhaseId) || (data.isJokerReplacementFor === nextPhaseId)
            );
            if (nextPhaseData) {
                insertBeforeElement = nextPhaseData.element;
                break; // Found the next element in the sequence
            }
        }

        // Perform the DOM move
        if (insertBeforeElement) {
            console.log(`Moving Joker (as ${targetPhaseId}) before ${insertBeforeElement.dataset.cardId || 'another Joker'}`);
            winnerCardContainer.insertBefore(jokerElement, insertBeforeElement);
        } else {
            // If no element is found after it (Joker is t2 or similar), append it to the end (relative to other phases)
            console.log(`Appending Joker (as ${targetPhaseId}) to the end of phases`);
            winnerCardContainer.appendChild(jokerElement); 
            // Note: This might place it after non-essential cards if not careful.
            // A more robust method might involve rebuilding the UL's children order fully.
            // For simplicity, we try insertBefore first. If it's the last phase (like t2),
            // appending might be visually sufficient if other non-essential cards follow.
        }
    });
    // --- End of Repositioning ---

    // --- Apply Animation Class ---
    winningCardData.forEach(data => {
        data.element.classList.add('winning-card-highlight');
    });

    // --- Delay End Game ---
    const animationDuration = 2000; 
    showMessage(`${winner === 'me' ? 'You have' : 'Opponent has'} the winning combination!`, animationDuration + 500); 

    setTimeout(() => {
        console.log("Animation time finished. Ending game.");
        winningCardData.forEach(data => {
            data.element.classList.remove('winning-card-highlight');
        });
        // Call the MODIFIED endGame function
        endGame(winner); 
    }, animationDuration); 
}

// --- Start Game ---
document.addEventListener('DOMContentLoaded', initializeGame);