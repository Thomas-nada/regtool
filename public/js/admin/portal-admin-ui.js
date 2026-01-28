/**
 * Admin UI Controller
 * Main orchestration hub for the administrative console.
 */
const PortalAdminUI = {
    activeArchitectTrack: null,
    activeLogFilters: ['All'],
    currentVisibleLogs: [],
    auditResolver: null,

    init() {
        const requiredModules = [
            'PortalUtils', 'PortalApplicants', 'PortalAudit',
            'PortalArchitect', 'PortalRoadmap', 'PortalTeams', 'PortalScheduler'
        ];

        const missing = requiredModules.filter(m => typeof window[m] === 'undefined');
        if (missing.length > 0) {
            console.error(`Missing modules: ${missing.join(', ')}`);
            return;
        }

        const searchInput = document.getElementById('admin-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchAdminTerm = e.target.value;
                this.render();
            });
        }

        // UTC clock
        setInterval(() => {
            const clock = document.getElementById('utc-clock-admin');
            if (clock) {
                const now = new Date();
                const pad = (n) => n.toString().padStart(2, '0');
                const day = pad(now.getUTCDate());
                const month = pad(now.getUTCMonth() + 1);
                const year = now.getUTCFullYear();
                const hours = pad(now.getUTCHours());
                const minutes = pad(now.getUTCMinutes());
                const seconds = pad(now.getUTCSeconds());
                clock.innerText = `${day}/${month}/${year} ${hours}:${minutes}:${seconds} UTC`;
            }
        }, 1000);

        console.log("Admin UI initialized.");
    },

    render() {
        if (!isAuthenticated) return;
        const container = document.getElementById('admin-content-target');
        if (!container) return;

        container.innerHTML = '';

        switch (currentView) {
            case 'applicants':
                PortalApplicants.render(container);
                break;
            case 'audit-log':
                PortalAudit.render(container);
                break;
            case 'architect':
                PortalArchitect.render(container);
                break;
            case 'timeline':
                PortalRoadmap.render(container);
                break;
            case 'teams':
                PortalTeams.render(container);
                break;
            case 'settings':
                PortalScheduler.render(container);
                break;
        }
    },

    setView(v) {
        currentView = v;
        const btns = document.querySelectorAll('.nav-btn');

        btns.forEach(btn => {
            const btnOnClick = btn.getAttribute('onclick');
            if (!btnOnClick) return;
            const btnView = btnOnClick.match(/'(.*?)'/)[1];

            btn.classList.toggle('active-audit', btnView === v && v === 'applicants');
            btn.classList.toggle('active-form', btnView === v && v === 'architect');
            btn.classList.toggle('active-roadmap', btnView === v && v === 'timeline');
            btn.classList.toggle('active-teams', btnView === v && v === 'teams');
            btn.classList.toggle('active-system', btnView === v && (v === 'audit-log' || v === 'settings'));
        });

        this.render();
    },

    resolveCandidateName(app) {
        if (!app || !app.data) return "Unknown Record";
        const d = app.data;

        return d['individual-name'] ||
               d['consortium-name'] ||
               d['org-name'] ||
               d['name'] ||
               d['q1768839882885'] ||
               d['q_1769085576918'] ||
               `Entry #${app.entryId}`;
    },

    // Registry proxies
    async handleToggleVerification(id, s) { await PortalApplicants.handleToggleVerification(id, s); },
    async handleArchiveApplication(id) { await PortalApplicants.handleArchiveApplication(id); },
    async handleRestoreApplication(id) { await PortalApplicants.handleRestoreApplication(id); },
    exportApplicantsJSON() { PortalUtils.exportApplicantsJSON(); },
    exportCSV() { PortalUtils.exportCSV(); },

    // Audit log proxies
    setLogFilter(c) { PortalAudit.setLogFilter(c); },
    async renderAuditLog(c) { await PortalAudit.render(c); },
    exportAuditLogText() { PortalUtils.exportAuditLogText(); },

    // Auth proxies
    performLogin() { PortalUtils.performLogin(); },
    requestAuditDetails() { return PortalUtils.requestAuditDetails(); },
    closeAuditModal(s) { PortalUtils.closeAuditModal(s); },

    // Form architect proxies
    setArchitectTrack(t) { PortalArchitect.setTrack(t); },
    addNewTrack() { PortalArchitect.addNewTrack(); },
    addStage(b) { PortalArchitect.addStage(b); },
    addField(b) { PortalArchitect.addField(b); },
    deleteTrack(n) { PortalArchitect.deleteTrack(n); },
    saveArchitectData() { PortalArchitect.save(); },
    toggleFieldExtras(s) { PortalArchitect.toggleFieldExtras(s); },

    // Roadmap proxies
    addTimelineItem() { PortalRoadmap.addItem(); },
    addLinkField(b) { PortalRoadmap.addLink(b); },
    saveTimelineData() { PortalRoadmap.save(); },

    // Teams proxies
    addTeamItem() { PortalTeams.addItem(); },
    async saveTeamsData() { await PortalTeams.save(); },

    // Scheduler proxies
    saveConfig() { PortalScheduler.save(); }
};

document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are fully parsed
    setTimeout(() => PortalAdminUI.init(), 100);
});
