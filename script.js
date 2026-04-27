const dropZone = document.getElementById('drop-zone');
const dropZoneText = document.getElementById('drop-zone-text');
const browseBtn = document.getElementById('browse-btn');
const fileInput = document.getElementById('file-input');
const resultView = document.getElementById('result-view');
const errorMessage = document.getElementById('error-message');
const fileNameEl = document.getElementById('file-name');
const pageCountEl = document.getElementById('page-count');
const wordCountEl = document.getElementById('word-count');
const charCountEl = document.getElementById('char-count');
const wpmInput = document.getElementById('wpm');
const readingTimeEl = document.getElementById('reading-time');
const resetBtn = document.getElementById('reset-btn');
const cognitiveLoadInput = document.getElementById('cognitive-load');
const cognitiveValueDisplay = document.getElementById('cognitive-value');
const entropyInput = document.getElementById('entropy');
const entropyValueDisplay = document.getElementById('entropy-value');

// LocalStorage keys
const WPM_KEY = 'pdf-word-counter-wpm';
const COGNITIVE_LOAD_KEY = 'pdf-word-counter-cognitive-load';
const ENTROPY_KEY = 'pdf-word-counter-entropy';

// Default values
const DEFAULT_WPM = 200;
const DEFAULT_COGNITIVE_LOAD = 0;
const DEFAULT_ENTROPY = 0;

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

// Handle dropped files
dropZone.addEventListener('drop', handleDrop, false);
resultView.addEventListener('drop', handleDrop, false);


// Handle file selection via button
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    const file = files[0];
    if (file && file.type === 'application/pdf') {
        resetError();
        showResultView();
        processPdf(file);
    } else {
        showError();
    }
}

function showError() {
    errorMessage.classList.remove('hidden');
}

function resetError() {
    errorMessage.classList.add('hidden');
}

function showResultView() {
    dropZone.classList.add('hidden');
    resultView.classList.remove('hidden');
}

function showDropZone() {
    resultView.classList.add('hidden');
    dropZone.classList.remove('hidden');
    resetCounts();
}

async function processPdf(file) {
    fileNameEl.textContent = file.name;
    const fileReader = new FileReader();

    fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            pageCountEl.textContent = pdf.numPages;

            let totalWords = 0;
            let totalChars = 0;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(s => s.str).join(' ');
                
                totalChars += pageText.length;
                totalWords += pageText.trim().split(/\s+/).filter(Boolean).length;
            }

            wordCountEl.textContent = totalWords;
            charCountEl.textContent = totalChars;
            calculateReadingTime();

        } catch (error) {
            console.error('Error processing PDF:', error);
            showError();
            showDropZone();
        }
    };

    fileReader.readAsArrayBuffer(file);
}

function calculateReadingTime() {
    const words = parseInt(wordCountEl.textContent) || 0;
    const wpm = parseInt(wpmInput.value) || 200;
    const cognitiveLoad = parseInt(cognitiveLoadInput.value) || 0;
    const entropy = parseInt(entropyInput.value) || 0;
    
    if (words === 0 || wpm <= 0) {
        readingTimeEl.textContent = '-';
        return;
    }

    // Calculate base reading time
    let minutes = words / wpm;
    
    // Apply cognitive load and entropy factors
    const totalFactor = 1 + (cognitiveLoad / 100) + (entropy / 100);
    minutes = minutes * totalFactor;
    
    if (minutes < 1) {
        const seconds = Math.round(minutes * 60);
        readingTimeEl.textContent = `${seconds} segundo(s)`;
    } else if (minutes < 60) {
        readingTimeEl.textContent = `${Math.round(minutes)} minuto(s)`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        readingTimeEl.textContent = `${hours} hora(s) y ${remainingMinutes} minuto(s)`;
    }
}

function resetCounts() {
    fileNameEl.textContent = '';
    pageCountEl.textContent = '-';
    wordCountEl.textContent = '-';
    charCountEl.textContent = '-';
    readingTimeEl.textContent = '-';
}

// Load saved WPM from localStorage on page load
function loadSavedWPM() {
    try {
        const savedWPM = localStorage.getItem(WPM_KEY);
        if (savedWPM) {
            const wpmValue = parseInt(savedWPM);
            if (wpmValue > 0) {
                wpmInput.value = wpmValue;
                return;
            }
        }
    } catch (error) {
        console.error('Error loading WPM from localStorage:', error);
    }
    // Use default if nothing saved or invalid
    wpmInput.value = DEFAULT_WPM;
}

// Save WPM to localStorage
function saveWPM() {
    try {
        const wpmValue = parseInt(wpmInput.value);
        if (wpmValue > 0) {
            localStorage.setItem(WPM_KEY, wpmValue.toString());
        }
    } catch (error) {
        console.error('Error saving WPM to localStorage:', error);
    }
}

// Load saved cognitive load from localStorage
function loadSavedCognitiveLoad() {
    try {
        const saved = localStorage.getItem(COGNITIVE_LOAD_KEY);
        if (saved !== null) {
            const value = parseInt(saved);
            if (value >= 0 && value <= 100) {
                cognitiveLoadInput.value = value;
                cognitiveValueDisplay.textContent = value + '%';
                return;
            }
        }
    } catch (error) {
        console.error('Error loading cognitive load from localStorage:', error);
    }
    // Use default
    cognitiveLoadInput.value = DEFAULT_COGNITIVE_LOAD;
    cognitiveValueDisplay.textContent = DEFAULT_COGNITIVE_LOAD + '%';
}

// Save cognitive load to localStorage
function saveCognitiveLoad() {
    try {
        const value = parseInt(cognitiveLoadInput.value);
        if (value >= 0 && value <= 100) {
            localStorage.setItem(COGNITIVE_LOAD_KEY, value.toString());
            cognitiveValueDisplay.textContent = value + '%';
        }
    } catch (error) {
        console.error('Error saving cognitive load to localStorage:', error);
    }
}

// Load saved entropy from localStorage
function loadSavedEntropy() {
    try {
        const saved = localStorage.getItem(ENTROPY_KEY);
        if (saved !== null) {
            const value = parseInt(saved);
            if (value >= 0 && value <= 100) {
                entropyInput.value = value;
                entropyValueDisplay.textContent = value + '%';
                return;
            }
        }
    } catch (error) {
        console.error('Error loading entropy from localStorage:', error);
    }
    // Use default
    entropyInput.value = DEFAULT_ENTROPY;
    entropyValueDisplay.textContent = DEFAULT_ENTROPY + '%';
}

// Save entropy to localStorage
function saveEntropy() {
    try {
        const value = parseInt(entropyInput.value);
        if (value >= 0 && value <= 100) {
            localStorage.setItem(ENTROPY_KEY, value.toString());
            entropyValueDisplay.textContent = value + '%';
        }
    } catch (error) {
        console.error('Error saving entropy to localStorage:', error);
    }
}

// Load all saved values when page loads
window.addEventListener('DOMContentLoaded', () => {
    loadSavedWPM();
    loadSavedCognitiveLoad();
    loadSavedEntropy();
});

// Save WPM when user changes it
wpmInput.addEventListener('input', () => {
    calculateReadingTime();
    saveWPM();
});

// Save cognitive load when user changes it
cognitiveLoadInput.addEventListener('input', () => {
    calculateReadingTime();
    saveCognitiveLoad();
});

// Save entropy when user changes it
entropyInput.addEventListener('input', () => {
    calculateReadingTime();
    saveEntropy();
});

resetBtn.addEventListener('click', showDropZone);
