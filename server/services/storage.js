/**
 * Storage Service
 * File system operations for config, questions, and records.
 */
const fs = require('fs');
const { CONFIG_FILE, QUESTIONS_FILE } = require('../config');

let portalConfig = {
    isRegistrationOpen: true,
    isEditingOpen: true,
    regStart: null,
    regEnd: null,
    editStart: null,
    editEnd: null,
    lastSync: new Date().toISOString()
};

let portalQuestions = {};

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const loadedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            portalConfig = { ...portalConfig, ...loadedConfig };
        } catch (e) {
            console.error("Failed to load config.", e);
        }
    }
}

function loadQuestions() {
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            portalQuestions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
        } catch (e) {
            console.error("Failed to load questions.", e);
        }
    }
}

function syncPortalConfig() {
    try {
        portalConfig.lastSync = new Date().toISOString();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(portalConfig, null, 4));
    } catch (err) {
        console.error("Failed to sync config.", err);
    }
}

function syncPortalQuestions() {
    try {
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(portalQuestions, null, 4));
    } catch (err) {
        console.error("Failed to sync questions.", err);
    }
}

function getConfig() {
    return portalConfig;
}

function setConfig(newConfig) {
    Object.assign(portalConfig, newConfig);
}

function getQuestions() {
    return portalQuestions;
}

function setQuestions(newQuestions) {
    portalQuestions = newQuestions;
}

module.exports = {
    loadConfig,
    loadQuestions,
    syncPortalConfig,
    syncPortalQuestions,
    getConfig,
    setConfig,
    getQuestions,
    setQuestions
};
