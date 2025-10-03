// --- Constants and Global State ---

const notes = ['ச', 'ரி', 'ரி2', 'க', 'க2', 'மா', 'மா2', 'பா', 'தா', 'தா2', 'நி', 'நி2'];
//ச , ரே , க , மா , பா , தா , நி
const noteToFileMap = {
    'ச': 'note_1',
    'ரி': 'note_2',
    'ரி2': 'note_3',
    'க': 'note_4',
    'க2': 'note_5',
    'மா': 'note_6',
    'மா2': 'note_7',
    'பா': 'note_8',
    'தா': 'note_9',
    'தா2': 'note_10',
    'நி': 'note_11',
    'நி2': 'note_12'
};


const LEVELS = {
    1: { pattern_length: 3, points: 10 },
    2: { pattern_length: 3, points: 20 },
    3: { pattern_length: 5, points: 30 }
};

// *** MODIFICATION 1: Increased interval for better playback separation ***
// This constant is now used for the delay between notes when the computer plays a pattern.
const PATTERN_PLAYBACK_INTERVAL = 800; // 800 milliseconds (0.8 seconds)

const ADDITIONAL_SUSTAIN = 500; // 0.5 seconds additional sustain

// Game State Variables
let currentPattern = [];
let userPattern = [];
let composedPattern = [];
let savedPatterns = [];
let totalScore = 0;
let currentLevel = 1;
let gameMode = 'recognition'; // Default game mode
let audioContext = null;
let activeNotes = new Map(); // Track currently playing notes for composition mode
let lastNoteEndTime = 0;


// --- Audio Functions ---

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

const audioBuffers = {};
async function loadAudio(note) {
    if (!audioBuffers[note]) {
        const fileName = noteToFileMap[note];
        try {
            const response = await fetch(`/static/sitar_notes/${fileName}.wav`);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[note] = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    }
    return audioBuffers[note];
}

async function playNote(note, duration = null) {
    try {
        initAudioContext();
        const buffer = await loadAudio(note);
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (duration) {
            const adjustedDuration = duration + ADDITIONAL_SUSTAIN;
            gainNode.gain.setValueAtTime(1, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + (adjustedDuration / 1000));
        }

        source.start(0);
        return source;
    } catch (error) {
        console.error('Error playing note:', error);
    }
}


// --- UI and Game Initialization ---

function initializeSitarString() {
    const sitarString = document.getElementById('sitarString');
    sitarString.innerHTML = '';

    notes.forEach(note => {
        const noteButtonContainer = document.createElement('div');
        noteButtonContainer.className = 'flex flex-col items-center';

        const button = document.createElement('button');
        button.className = 'w-20 h-40 bg-amber-200 hover:bg-amber-300 rounded-lg text-center font-bold transition-colors border-2 border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed';
        button.innerHTML = `<div class="h-full flex flex-col justify-between p-2 pointer-events-none">
            <span>${note}</span>
            <div class="w-full h-1 bg-amber-600"></div>
        </div>`;

        // *** MODIFICATION 2: Restored event listeners for different game modes ***
        if (gameMode === 'composition') {
            // Mouse events for composition mode (sustain)
            button.addEventListener('mousedown', () => {
                initAudioContext();
                const currentTime = Date.now();
                activeNotes.set(note, { startTime: currentTime });
                playNote(note, ADDITIONAL_SUSTAIN);
                highlightNote(button);
            });

            button.addEventListener('mouseup', () => {
                if (activeNotes.has(note)) {
                    const noteData = activeNotes.get(note);
                    const endTime = Date.now();
                    const sustain = endTime - noteData.startTime;

                    if (composedPattern.length < 8) {
                        composedPattern.push({
                            note: note,
                            sustain: sustain + ADDITIONAL_SUSTAIN
                        });
                        lastNoteEndTime = endTime;
                        updateCompositionDisplay();
                    }
                    activeNotes.delete(note);
                }
            });
        } else {
            // Simple click event for other modes like recognition and sour note
            button.addEventListener('click', () => {
                initAudioContext();
                playNote(note, ADDITIONAL_SUSTAIN);
                highlightNote(button);
                if (gameMode === 'recognition') {
                    handleNoteSelection(note);
                }
            });
        }

        noteButtonContainer.appendChild(button);
        sitarString.appendChild(noteButtonContainer);
    });
}

function highlightNote(button) {
    if (!button || button.disabled) return;

    button.classList.add('bg-amber-400', 'scale-105');
    setTimeout(() => {
        button.classList.remove('bg-amber-400', 'scale-105');
    }, 200);
}

function updateGameMode(mode) {
    gameMode = mode;
    const sitar = document.getElementById('sitarString');
    if (sitar) {
        sitar.innerHTML = '';
    }

    if (mode === 'recognition') {
        // Reset game state for recognition mode
        userPattern = [];
        currentPattern = [];
        totalScore = 0; // Or decide if score should persist
        document.getElementById('score').textContent = totalScore;
        document.getElementById('submitAnswer').disabled = true;
        document.getElementById('feedback').textContent = 'Select a level and click Play Pattern.';
    }
    if (mode === 'composition') {
        updateCompositionDisplay();
    }

    initializeSitarString(); // Rebuild the sitar string with correct event listeners
}


// --- Pattern Recognition Mode ---

async function generatePattern() {
    userPattern = [];
    const level = parseInt(document.getElementById('levelSelect').value);
    currentLevel = level;

    currentPattern = Array.from({ length: LEVELS[level].pattern_length },
        () => notes[Math.floor(Math.random() * notes.length)]
    );

    const buttons = document.querySelectorAll('#sitarString button');
    if (level > 1) { // Auditory levels
        buttons.forEach(button => button.disabled = true);
    }

    document.getElementById('submitAnswer').disabled = true;
    await playCurrentPattern();

    buttons.forEach(button => button.disabled = false); // Re-enable after playing
}

async function playCurrentPattern() {
    const playButton = document.getElementById('playPattern');
    const level = currentLevel;
    playButton.disabled = true;
    document.getElementById('feedback').textContent = 'Listen to the pattern...';

    // Add a small delay before starting
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        for (const note of currentPattern) {
            // For level 1, show which note is playing
            if (level === 1) {
                const noteButton = Array.from(document.querySelectorAll('#sitarString button'))
                    .find(button => button.textContent.includes(note));
                if (noteButton) {
                    highlightNote(noteButton);
                }
            }
            await playNote(note, ADDITIONAL_SUSTAIN);
            // Use the dedicated interval for playback
            await new Promise(resolve => setTimeout(resolve, PATTERN_PLAYBACK_INTERVAL));
        }
    } catch (error) {
        console.error('Error playing pattern:', error);
    }

    playButton.disabled = false;
    document.getElementById('feedback').textContent = 'Now repeat the pattern!';
}

function handleNoteSelection(note) {
    if (userPattern.length < currentPattern.length) {
        userPattern.push(note);
        document.getElementById('feedback').textContent =   `Notes recorded: ${userPattern.length} / ${currentPattern.length}   `;

        if (userPattern.length === currentPattern.length) {
            document.getElementById('submitAnswer').disabled = false;
        }
    }
}

async function checkAnswer() {
    if (userPattern.length !== currentPattern.length) return;

    const isCorrect = userPattern.every((note, index) => note === currentPattern[index]);
    const feedback = document.getElementById('feedback');

    if (isCorrect) {
        const points = LEVELS[currentLevel].points;
        totalScore += points;
        feedback.textContent = `Correct! +${points} points`;
        feedback.className = 'text-green-600 text-lg font-bold animate-bounce';
        await playSuccessAnimation();
    } else {
        feedback.textContent = 'Incorrect. The correct pattern was: ' + currentPattern.join(', ');
        feedback.className = 'text-red-600 text-lg font-bold';
    }

    document.getElementById('score').textContent = totalScore;
    document.getElementById('submitAnswer').disabled = true;
    userPattern = [];
}

async function playSuccessAnimation() {
    const buttons = document.querySelectorAll('#sitarString button');
    for (const button of buttons) {
        button.classList.add('bg-green-300');
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    setTimeout(() => {
        buttons.forEach(button => button.classList.remove('bg-green-300'));
    }, 500);
}


// --- Composition Mode ---

function updateCompositionDisplay() {
    const display = document.getElementById('composedSequence');
    if (display) {
        display.innerHTML = composedPattern.map(({ note }, index) => `
            <div class="note-chip inline-flex items-center bg-amber-200 text-amber-900 font-bold px-3 py-1 rounded-full m-1 shadow" data-index="${index}">
                ${note}
            </div>
        `).join('');
    }
}

async function playComposition() {
    const playButton = document.getElementById('playComposition');
    if (!playButton || composedPattern.length === 0) return;

    playButton.disabled = true;
    const NOTE_INTERVAL = 500; // Interval between notes in composed playback

    for (let i = 0; i < composedPattern.length; i++) {
        const { note } = composedPattern[i];

        // Highlight the current note chip
        document.querySelectorAll('.note-chip').forEach(chip => chip.classList.remove('bg-amber-500', 'text-white'));
        const chip = document.querySelector(`.note-chip[data-index="${i}"]`);
        if (chip) chip.classList.add('bg-amber-500', 'text-white');

        await playNote(note, 200); // Play with a short duration for clarity
        await new Promise(resolve => setTimeout(resolve, NOTE_INTERVAL));
    }

    document.querySelectorAll('.note-chip').forEach(chip => chip.classList.remove('bg-amber-500', 'text-white'));
    playButton.disabled = false;
}


// --- Sour Note Mode (Functions assumed to be similar and complete) ---
// (Your sour note functions from the original code are kept here as they were)
//ச', 'ரி', 'ரி2', 'க', 'க2', 'மா', 'மா2', 'பா', 'தா', 'தா2', 'நி', 'நி2'
const twinkleMelody = [
    { note: 'ச', duration: ADDITIONAL_SUSTAIN },
    { note: 'ச', duration: ADDITIONAL_SUSTAIN },
    { note: 'பா', duration: ADDITIONAL_SUSTAIN },
    { note: 'பா', duration: ADDITIONAL_SUSTAIN },
    { note: 'தா2', duration: ADDITIONAL_SUSTAIN },
    { note: 'தா2', duration: ADDITIONAL_SUSTAIN },
    { note: 'பா', duration: ADDITIONAL_SUSTAIN }
];

let sourNoteMelody = [];
let correctSourIndex = null;
async function startSourNoteGame() {
    sourNoteMelody = [...twinkleMelody];
    correctSourIndex = Math.floor(Math.random() * sourNoteMelody.length);
    const sourNotes = notes.filter(note => !twinkleMelody.some(melodyNote => melodyNote.note === note));
    const sourNote = sourNotes[Math.floor(Math.random() * sourNotes.length)];
    sourNoteMelody[correctSourIndex] = { note: sourNote, duration: ADDITIONAL_SUSTAIN, isSour: true };

    document.getElementById('sourNoteFeedback').textContent = 'Listen to the melody...';
    document.getElementById('submitSourNote').disabled = true;
    const buttons = document.querySelectorAll('#sitarString button');
    buttons.forEach(button => button.disabled = true);
    await playSourNoteMelody();
    buttons.forEach(button => button.disabled = false);
    populateSourNoteButtons();
}
async function playSourNoteMelody() {
    for (const { note, duration } of sourNoteMelody) {
        const noteButton = Array.from(document.querySelectorAll('#sitarString button')).find(button => button.textContent.includes(note));
        if (noteButton) {
            highlightNote(noteButton);
        }
        await playNote(note, duration);
        await new Promise(resolve => setTimeout(resolve, PATTERN_PLAYBACK_INTERVAL));
    }
    document.getElementById('sourNoteFeedback').textContent = 'Select the sour note!';
}
function populateSourNoteButtons() {
    const container = document.getElementById('sourNoteButtons');
    container.innerHTML = '';
    sourNoteMelody.forEach((noteObj, index) => {
        const button = document.createElement('button');
        button.className = 'bg-amber-200 hover:bg-amber-300 text-center font-bold px-4 py-2 rounded-lg transition-colors';
        button.textContent = `Note ${index + 1}`;
        button.onclick = () => {
            playNote(noteObj.note, ADDITIONAL_SUSTAIN);
            handleSourNoteSelection(index, button);
        };
        container.appendChild(button);
    });
}
function handleSourNoteSelection(index, button) {
    document.querySelectorAll('#sourNoteButtons button').forEach(btn => btn.classList.remove('bg-green-300', 'ring-2', 'ring-green-500'));
    button.classList.add('bg-green-300', 'ring-2', 'ring-green-500');
    const submitButton = document.getElementById('submitSourNote');
    submitButton.disabled = false;
    submitButton.dataset.selectedIndex = index;
}
async function submitSourNote() {
    const guessedIndex = parseInt(document.getElementById('submitSourNote').dataset.selectedIndex);
    const feedback = document.getElementById('sourNoteFeedback');
    const buttons = document.querySelectorAll('#sourNoteButtons button');
    if (guessedIndex === correctSourIndex) {
        feedback.textContent = 'Correct! You found the sour note!';
        feedback.className = 'text-green-600 font-bold text-lg animate-bounce';
        totalScore += 20;
        document.getElementById('score').textContent = totalScore;
        buttons[correctSourIndex].classList.add('bg-green-500', 'text-white');
    } else {
        feedback.textContent = 'Incorrect! Try again.';
        feedback.className = 'text-red-600 font-bold text-lg';
        buttons[guessedIndex].classList.add('bg-red-500', 'text-white');
    }
    document.getElementById('submitSourNote').disabled = true;
}


// --- Main Event Listener ---

// *** MODIFICATION 3: Merged both DOMContentLoaded listeners into one ***
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the board for the default game mode
    initializeSitarString();

    // Mode switching buttons
    document.querySelectorAll('.mode-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('bg-amber-600'));
            button.classList.add('bg-amber-600');
            updateGameMode(button.dataset.mode);
        });
    });

    // Event listeners for Pattern Recognition
    const playPatternBtn = document.getElementById('playPattern');
    const submitAnswerBtn = document.getElementById('submitAnswer');
    const levelSelect = document.getElementById('levelSelect');

    if (playPatternBtn) playPatternBtn.addEventListener('click', generatePattern);
    if (submitAnswerBtn) submitAnswerBtn.addEventListener('click', checkAnswer);
    if (levelSelect) {
        levelSelect.addEventListener('change', () => {
            userPattern = [];
            currentPattern = [];
            if (submitAnswerBtn) submitAnswerBtn.disabled = true;
            const feedback = document.getElementById('feedback');
            if (feedback) feedback.textContent = '';
        });
    }

    // Event listeners for Composition
    const playCompositionBtn = document.getElementById('playComposition');
    const clearCompositionBtn = document.getElementById('clearComposition');

    if (playCompositionBtn) playCompositionBtn.addEventListener('click', playComposition);
    if (clearCompositionBtn) {
        clearCompositionBtn.addEventListener('click', () => {
            composedPattern = [];
            activeNotes.clear();
            lastNoteEndTime = 0;
            updateCompositionDisplay();
        });
    }

    // (Add listeners for Sour Note mode here if they exist, e.g., startSourNoteGame)

    // Ensure nav links work: defensive handler to avoid other scripts preventing navigation
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest && e.target.closest('.nav-btn');
        if (target) {
            // If it's an anchor tag with href, allow navigation explicitly
            const href = target.getAttribute && target.getAttribute('href');
            if (href) {
                // Allow default navigation (but log for debug)
                console.debug('Nav click:', href);
                // No preventDefault or stopPropagation here so navigation proceeds
            }
        }
    });
});