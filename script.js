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
    if (words === 0 || wpm <= 0) {
        readingTimeEl.textContent = '-';
        return;
    }

    const minutes = words / wpm;
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
    wpmInput.value = 200;
}

wpmInput.addEventListener('input', calculateReadingTime);
resetBtn.addEventListener('click', showDropZone);
