/**
 * Admin Utilities
 * Authentication, name resolution, and export functions.
 */
const PortalUtils = {
    async performLogin() {
        const input = document.getElementById('admin-password');
        const btn = document.getElementById('login-btn');
        if (!input || !input.value) return;

        const tokenAttempt = input.value.trim();
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Connecting...';

        const success = await PortalAdminAPI.validateToken(tokenAttempt);
        if (success) {
            document.getElementById('login-overlay')?.classList.add('hidden');
            document.getElementById('admin-dashboard')?.classList.remove('hidden');

            await Promise.all([
                PortalAdminAPI.fetchMasterList(),
                this.syncGlobalSettings()
            ]);

            PortalAdminUI.render();
        } else {
            alert("Token rejected.");
            btn.disabled = false;
            btn.innerText = 'Connect';
        }
    },

    async syncGlobalSettings() {
        const data = await PortalAdminAPI.fetchStratum('config');
        if (data) systemConfig = data;
    },

    requestAuditDetails() {
        return new Promise((resolve) => {
            const modal = document.getElementById('audit-detail-modal');
            if (!modal) return resolve(null);

            document.getElementById('audit-change-input').value = '';
            document.getElementById('audit-reason-input').value = '';

            modal.classList.remove('hidden');
            modal.classList.add('flex');

            PortalAdminUI.auditResolver = resolve;
        });
    },

    closeAuditModal(isSkip) {
        const modal = document.getElementById('audit-detail-modal');
        if (!modal) return;

        modal.classList.add('hidden');
        modal.classList.remove('flex');

        if (isSkip) {
            if (PortalAdminUI.auditResolver) PortalAdminUI.auditResolver(null);
        } else {
            const changes = document.getElementById('audit-change-input').value.trim();
            const reason = document.getElementById('audit-reason-input').value.trim();
            if (PortalAdminUI.auditResolver) PortalAdminUI.auditResolver({ changes, reason });
        }
        PortalAdminUI.auditResolver = null;
    },

    resolveCandidateName(app) {
        if (!app) return "Unknown Record";

        const d = app.data || app.payload || {};

        // Priority: semantic form keys, then legacy keys
        const primaryKeys = [
            'individual-name',
            'org-name',
            'consortium-name',
            'q1768839882885',
            'q_1769085576918',
            'q_1769085297138'
        ];

        for (const key of primaryKeys) {
            const val = d[key];
            if (val && typeof val === 'string' && val.trim().length > 1) {
                return val.trim();
            }
        }

        const semanticKeys = ['name', 'orgName', 'consortiumName', 'fullName', 'displayName', 'candidateName'];
        for (const key of semanticKeys) {
            const val = d[key];
            if (val && typeof val === 'string' && val.trim().length > 1) {
                return val.trim();
            }
        }

        // Fallback: look for string values in q-prefixed keys
        const dataKeys = Object.keys(d);
        for (const key of dataKeys) {
            if (key.startsWith('q')) {
                const val = d[key];
                if (typeof val === 'string' && val.length > 3 && val.length < 100 && !val.includes('@')) {
                    return val.trim();
                }
            }
        }

        return `Entry #${app.entryId || '????'}`;
    },

    exportApplicantsJSON() {
        const filtered = allApplicants.filter(app => {
            const name = this.resolveCandidateName(app).toLowerCase();
            const searchTerm = (searchAdminTerm || "").toLowerCase().trim();
            return name.includes(searchTerm) || String(app.entryId).includes(searchTerm);
        });

        const exportData = {
            reportTitle: "Audit Report",
            generatedAt: new Date().toISOString(),
            records: filtered
        };

        this.triggerDownload(exportData, `registry_audit_${Date.now()}.json`);
    },

    exportAuditLogText() {
        const logs = PortalAdminUI.currentVisibleLogs;
        if (!logs || logs.length === 0) {
            return alert("No logs match current filters.");
        }

        const header = `CC ELECTION PORTAL - AUDIT LOG\n`;
        const subHeader = `Generated: ${new Date().toISOString()}\n`;
        const filterInfo = `Active Filters: ${PortalAdminUI.activeLogFilters.join(', ')}\n`;
        const separator = `--------------------------------------------------------------------------------\n`;

        const logLines = logs.map(e => {
            let line = `[${e.timestamp}] EVENT: ${e.headline}`;
            if (e.actionLineText) line += ` | ACTION: ${e.actionLineText}`;
            if (e.details) line += `\n    DATA: ${e.details}`;
            if (e.reason) line += `\n    REASON: ${e.reason}`;
            return line;
        }).join('\n\n');

        const fullContent = header + subHeader + filterInfo + separator + '\n' + logLines;

        const blob = new Blob([fullContent], { type: 'text/plain' });
        const filterStamp = PortalAdminUI.activeLogFilters.join('-').toLowerCase();
        this.triggerDownloadBlob(blob, `audit_${filterStamp}_${Date.now()}.log`);
    },

    triggerDownload(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
        this.triggerDownloadBlob(blob, filename);
    },

    triggerDownloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    exportCSV() {
        if (!adminToken) return;
        window.open(`/api/admin/export?token=${adminToken}`, '_blank');
    }
};
