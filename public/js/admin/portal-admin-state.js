/**
 * Admin State
 * Global state variables for admin console. Must be loaded first.
 */

// Authentication
let adminToken = null;
let isAuthenticated = false;

// Data caches
let allApplicants = [];
let systemConfig = {
    isRegistrationOpen: false,
    isEditingOpen: false,
    regStart: null,
    regEnd: null,
    editStart: null,
    editEnd: null
};
let portalQuestions = {};
let timelineData = [];
let teamsRegistry = [];

// UI state
let currentView = 'applicants';
let filterStatus = 'All';
let searchAdminTerm = '';

function updateAdminClock() {
    const clockNode = document.getElementById('utc-clock-admin');
    if (clockNode) {
        const now = new Date();
        clockNode.textContent = `SYSTEM UTC: ${now.toUTCString().split(' ')[4]}`;
    }
}

setInterval(updateAdminClock, 1000);