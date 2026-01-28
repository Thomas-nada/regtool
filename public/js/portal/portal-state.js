/**
 * Portal State
 * Global state variables. Must be loaded first.
 */

// Directory data
let allCandidates = [];
let formConfig = {};

// UI filters
let currentTypeFilter = 'All';
let currentSearchTerm = '';
let currentStep = 0;
let currentType = '';

// Session state
let isEditMode = false;
let activeEntryId = null;
let activeEditToken = null;

// Data buffers
let rosters = {};
let autoSaveTimer = null;
const logicRegistry = new Map();

function updateClock() {
    const clockNode = document.getElementById('utc-clock');
    if (clockNode) {
        const now = new Date();
        // Extract time component from UTC string
        clockNode.textContent = `UTC SYNC: ${now.toUTCString().split(' ')[4]}`;
    }
}

setInterval(updateClock, 1000);