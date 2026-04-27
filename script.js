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
const readingDistributionSection = document.getElementById('reading-distribution');
const readingDaysInput = document.getElementById('reading-days');
const minutesPerDayInput = document.getElementById('minutes-per-day');
const distributionInfoEl = document.getElementById('distribution-info');

// LocalStorage keys
const WPM_KEY = 'pdf-word-counter-wpm';
const COGNITIVE_LOAD_KEY = 'pdf-word-counter-cognitive-load';
const ENTROPY_KEY = 'pdf-word-counter-entropy';
const READING_DAYS_KEY = 'pdf-word-counter-reading-days';
const MINUTES_PER_DAY_KEY = 'pdf-word-counter-minutes-per-day';

// Default values
const DEFAULT_WPM = 200;
const DEFAULT_COGNITIVE_LOAD = 0;
const DEFAULT_ENTROPY = 0;
const DEFAULT_MINUTES_PER_DAY = 30;
const READING_TIME_THRESHOLD = 180; // 3 hours in minutes
let lastModifiedDistributionField = 'minutes-per-day'; // Track which field was last modified

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
        readingDistributionSection.classList.add('hidden');
        return;
    }

    // Calculate base reading time
    let totalMinutes = words / wpm;
    
    // Apply cognitive load and entropy factors
    const totalFactor = 1 + (cognitiveLoad / 100) + (entropy / 100);
    totalMinutes = totalMinutes * totalFactor;
    
    // Display reading time
    displayReadingTime(totalMinutes);
    
    // Show distribution section if reading time exceeds threshold
    if (totalMinutes > READING_TIME_THRESHOLD) {
        readingDistributionSection.classList.remove('hidden');
        updateReadingDistribution(totalMinutes);
    } else {
        readingDistributionSection.classList.add('hidden');
    }
}

function displayReadingTime(minutes) {
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

function updateReadingDistribution(totalMinutes) {
    if (lastModifiedDistributionField === 'minutes-per-day') {
        // User modified minutes per day, calculate days
        const minutesPerDay = parseInt(minutesPerDayInput.value) || DEFAULT_MINUTES_PER_DAY;
        const days = Math.ceil(totalMinutes / minutesPerDay);
        readingDaysInput.value = days;
        updateDistributionInfo(totalMinutes, days, minutesPerDay);
    } else {
        // User modified days, calculate minutes per day
        const days = parseInt(readingDaysInput.value) || 1;
        const minutesPerDay = Math.ceil(totalMinutes / days);
        minutesPerDayInput.value = minutesPerDay;
        updateDistributionInfo(totalMinutes, days, minutesPerDay);
    }
}

function updateDistributionInfo(totalMinutes, days, minutesPerDay) {
    const actualTotalMinutes = days * minutesPerDay;
    const hoursPerDay = (minutesPerDay / 60).toFixed(1);
    
    distributionInfoEl.textContent = `${days} día(s) de ${minutesPerDay} minuto(s) (${hoursPerDay} hora(s)) al día`;
}

function resetCounts() {
    fileNameEl.textContent = '';
    pageCountEl.textContent = '-';
    wordCountEl.textContent = '-';
    charCountEl.textContent = '-';
    readingTimeEl.textContent = '-';
    readingDistributionSection.classList.add('hidden');
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

// Load saved reading days from localStorage
function loadSavedReadingDays() {
    try {
        const saved = localStorage.getItem(READING_DAYS_KEY);
        if (saved !== null) {
            const value = parseInt(saved);
            if (value >= 1) {
                readingDaysInput.value = value;
                return;
            }
        }
    } catch (error) {
        console.error('Error loading reading days from localStorage:', error);
    }
    // Use default (will be calculated based on minutes per day)
}

// Save reading days to localStorage
function saveReadingDays() {
    try {
        const value = parseInt(readingDaysInput.value);
        if (value >= 1) {
            localStorage.setItem(READING_DAYS_KEY, value.toString());
        }
    } catch (error) {
        console.error('Error saving reading days to localStorage:', error);
    }
}

// Load saved minutes per day from localStorage
function loadSavedMinutesPerDay() {
    try {
        const saved = localStorage.getItem(MINUTES_PER_DAY_KEY);
        if (saved !== null) {
            const value = parseInt(saved);
            if (value >= 1) {
                minutesPerDayInput.value = value;
                return;
            }
        }
    } catch (error) {
        console.error('Error loading minutes per day from localStorage:', error);
    }
    // Use default
    minutesPerDayInput.value = DEFAULT_MINUTES_PER_DAY;
}

// Save minutes per day to localStorage
function saveMinutesPerDay() {
    try {
        const value = parseInt(minutesPerDayInput.value);
        if (value >= 1) {
            localStorage.setItem(MINUTES_PER_DAY_KEY, value.toString());
        }
    } catch (error) {
        console.error('Error saving minutes per day to localStorage:', error);
    }
}

// Load all saved values when page loads
window.addEventListener('DOMContentLoaded', () => {
    loadSavedWPM();
    loadSavedCognitiveLoad();
    loadSavedEntropy();
    loadSavedReadingDays();
    loadSavedMinutesPerDay();
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

// Handle reading days input
readingDaysInput.addEventListener('input', () => {
    lastModifiedDistributionField = 'days';
    saveReadingDays();
    calculateReadingTime();
});

// Handle minutes per day input
minutesPerDayInput.addEventListener('input', () => {
    lastModifiedDistributionField = 'minutes-per-day';
    saveMinutesPerDay();
    calculateReadingTime();
});

resetBtn.addEventListener('click', showDropZone);
