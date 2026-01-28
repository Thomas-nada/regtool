/**
 * Admin API Client
 * Handles communication with the backend admin endpoints.
 */

const PortalAdminAPI = {

    async validateToken(token) {
        try {
            const res = await fetch('/api/admin/applications', {
                headers: { 'Authorization': token }
            });

            if (res.ok) {
                adminToken = token;
                isAuthenticated = true;
                return true;
            }
            return false;
        } catch (err) {
            console.error("Auth failed:", err);
            return false;
        }
    },

    async fetchMasterList() {
        if (!isAuthenticated) return;

        try {
            const res = await fetch('/api/admin/applications', {
                headers: { 'Authorization': adminToken }
            });

            if (res.status === 401 || res.status === 403) {
                this.handleSessionTermination();
                return;
            }

            allApplicants = await res.json();

            if (typeof PortalAdminUI !== 'undefined') {
                PortalAdminUI.render();
            }
        } catch (err) {
            console.error("Failed to fetch registry:", err);
        }
    },

    async archiveApplication(entryId, auditMeta = null) {
        try {
            const res = await fetch('/api/admin/archive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ entryId, auditMeta })
            });

            if (res.ok) {
                await this.fetchMasterList();
                return true;
            }
            throw new Error("Archive rejected.");
        } catch (err) {
            alert("Archive failed: " + err.message);
            return false;
        }
    },

    async restoreApplication(entryId, auditMeta = null) {
        try {
            const res = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ entryId, auditMeta })
            });

            if (res.ok) {
                await this.fetchMasterList();
                return true;
            }
            throw new Error("Restore rejected.");
        } catch (err) {
            alert("Restore failed: " + err.message);
            return false;
        }
    },

    async toggleVerification(entryId, status, auditMeta = null) {
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ entryId, verified: status, auditMeta })
            });

            if (!res.ok) throw new Error("Verification update failed.");

            await this.fetchMasterList();
        } catch (err) {
            alert("Error: " + err.message);
        }
    },

    async deleteApplication(entryId, auditMeta = null) {
        try {
            const res = await fetch('/api/admin/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ entryId, auditMeta })
            });

            if (!res.ok) throw new Error("Delete rejected.");

            await this.fetchMasterList();
        } catch (err) {
            alert("Error: " + err.message);
        }
    },

    async updateSystemConfig(newConfig, auditMeta = null) {
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ data: newConfig, auditMeta })
            });

            if (res.ok) {
                systemConfig = { ...systemConfig, ...newConfig };
                return true;
            }
        } catch (err) {
            console.error("Config sync failed:", err);
        }
        return false;
    },

    async fetchStratum(key) {
        try {
            const res = await fetch(`/api/admin/${key}`, {
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error(`Could not read ${key}.`);
            return await res.json();
        } catch (err) {
            console.error(`Failed to fetch ${key}:`, err);
            return null;
        }
    },

    async fetchAuditChain() {
        try {
            const res = await fetch('/api/admin/audit-chain', {
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error("Could not read audit chain.");
            return await res.json();
        } catch (err) {
            console.error("Failed to fetch audit chain:", err);
            return null;
        }
    },

    async verifyAuditChain() {
        try {
            const res = await fetch('/api/admin/audit-chain/verify', {
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error("Verification failed.");
            return await res.json();
        } catch (err) {
            console.error("Chain verification failed:", err);
            return { valid: false, error: err.message };
        }
    },

    async repairAuditChain() {
        try {
            const res = await fetch('/api/admin/audit-chain/repair', {
                method: 'POST',
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error("Repair failed.");
            return await res.json();
        } catch (err) {
            console.error("Chain repair failed:", err);
            return { ok: false, error: err.message };
        }
    },

    async exportAuditReport() {
        try {
            const res = await fetch('/api/admin/audit-chain/export', {
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error("Export failed.");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            return { ok: true };
        } catch (err) {
            console.error("Export failed:", err);
            return { ok: false, error: err.message };
        }
    },

    async saveStratum(key, data, auditMeta = null) {
        try {
            const res = await fetch(`/api/admin/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ data, auditMeta })
            });

            if (res.ok) {
                return true;
            }
            throw new Error("Save rejected.");
        } catch (err) {
            alert("Save failed: " + err.message);
            return false;
        }
    },

    handleSessionTermination() {
        isAuthenticated = false;
        adminToken = null;
        alert("Session terminated.");
        location.reload();
    }
};
