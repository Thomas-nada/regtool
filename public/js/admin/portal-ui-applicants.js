/**
 * Applicants UI
 * Registry management, verification, and archival controls.
 */
const PortalApplicants = {
    async handleToggleVerification(entryId, status) {
        const auditMeta = await PortalAdminUI.requestAuditDetails() || {};
        await PortalAdminAPI.toggleVerification(entryId, status, auditMeta);
        await PortalAdminAPI.fetchMasterList();
    },

    async handleArchiveApplication(entryId) {
        const registry = (typeof allApplicants !== 'undefined') ? allApplicants : await PortalAdminAPI.fetchMasterList();
        if (!registry) return alert("Error: Registry unreachable.");

        const app = registry.find(a => String(a.entryId) === String(entryId));
        if (!app) return alert(`Error: Entry #${entryId} not found.`);

        const name = PortalAdminUI.resolveCandidateName(app);
        const confirmation = `Archive record #${entryId} (${name})?\n\n` +
                             `This record will be moved to the /archived folder and removed from the public registry.`;

        if (!confirm(confirmation)) return;

        const skipBtn = document.querySelector('#audit-detail-modal button[onclick*="closeAuditModal(true)"]');
        const originalText = skipBtn ? skipBtn.innerText : "Skip Details";

        if (skipBtn) skipBtn.innerText = "Cancel Archival";

        const auditMeta = await PortalAdminUI.requestAuditDetails();

        if (skipBtn) skipBtn.innerText = originalText;

        if (!auditMeta || !auditMeta.reason || auditMeta.reason.trim() === "") {
            alert("Archive operation cancelled: A justification is required.");
            return;
        }

        const success = await PortalAdminAPI.archiveApplication(entryId, auditMeta);

        if (success) {
            filterStatus = 'Archived';
            alert(`${name} has been archived.`);
            PortalAdminUI.render();
        }
    },

    async handleRestoreApplication(entryId) {
        const registry = (typeof allApplicants !== 'undefined') ? allApplicants : await PortalAdminAPI.fetchMasterList();
        const app = registry?.find(a => String(a.entryId) === String(entryId));
        if (!app) return alert("Error: Archived record not found.");

        const name = PortalAdminUI.resolveCandidateName(app);
        const confirmation = `Restore record #${entryId} (${name}) to active registry?\n\n` +
                             `The record will be moved back and require re-verification for public visibility.`;

        if (!confirm(confirmation)) return;

        const auditMeta = await PortalAdminUI.requestAuditDetails() || {};

        const success = await PortalAdminAPI.restoreApplication(entryId, auditMeta);

        if (success) {
            filterStatus = 'All';
            alert(`${name} has been restored.`);
            PortalAdminUI.render();
        }
    },

    render(container) {
        if (!container) return;

        const sourceList = (typeof allApplicants !== 'undefined') ? allApplicants : [];

        const filtered = sourceList.filter(app => {
            if (filterStatus === 'Archived') {
                return app.archived === true;
            }

            if (app.archived === true) return false;

            if (filterStatus === 'Verified') return app.verified === true;
            if (filterStatus === 'Pending') return app.verified === false;

            return true;
        }).filter(app => {
            const name = PortalAdminUI.resolveCandidateName(app).toLowerCase();
            const searchTerm = (searchAdminTerm || "").toLowerCase().trim();
            return name.includes(searchTerm) || String(app.entryId).includes(searchTerm);
        });

        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="flex flex-col md:flex-row justify-between items-end gap-10 mb-12">
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Registry Audit</h2>
                        <div class="flex items-center gap-6 mt-8">
                            <button onclick="PortalAdminAPI.fetchMasterList()" class="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:border-blue-400 hover:shadow-xl transition-all group shadow-sm">
                                <i class="fas fa-rotate group-hover:rotate-180 transition-transform duration-700"></i> Refresh Registry
                            </button>

                            <div class="h-6 w-px bg-slate-100"></div>

                            <div class="flex gap-6">
                                <button onclick="PortalAdminUI.exportApplicantsJSON()" class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                                    <i class="fas fa-file-code"></i> JSON
                                </button>
                                <button onclick="PortalAdminUI.exportCSV()" class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                                    <i class="fas fa-file-csv"></i> CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex bg-slate-100 p-2 rounded-[2rem] gap-1 shadow-inner border border-slate-200/50">
                        ${['All', 'Pending', 'Verified', 'Archived'].map(s => `
                            <button onclick="filterStatus='${s}'; PortalAdminUI.render()"
                                class="px-10 py-4 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${filterStatus === s ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}">
                                ${s}
                            </button>`).join('')}
                    </div>
                </div>

                <div class="glass-card rounded-[4rem] overflow-hidden border border-slate-100 shadow-3xl">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 border-b border-slate-100">
                                <th class="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                                <th class="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th class="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filtered.length > 0 ? filtered.map(app => this.renderCandidateRow(app)).join('') : `
                                <tr>
                                    <td colspan="3" class="py-60 text-center">
                                        <div class="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 text-3xl">
                                            <i class="fas fa-satellite-dish"></i>
                                        </div>
                                        <p class="text-slate-300 font-black uppercase tracking-[0.5em] text-xs">
                                            No candidates found in ${filterStatus} view.
                                        </p>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    renderCandidateRow(app) {
        const name = PortalAdminUI.resolveCandidateName(app);
        const isVerified = app.verified === true;
        const isArchived = app.archived === true;

        const statusClass = isVerified
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : 'bg-amber-50 text-amber-600 border-amber-100';

        return `
            <tr class="transition-all group hover:bg-slate-50/50 ${isArchived ? 'opacity-70 grayscale-[0.3]' : ''}">
                <td class="px-12 py-10">
                    <div class="flex items-center gap-8">
                        <div class="h-20 w-20 bg-slate-100 rounded-[1.8rem] flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-700 shadow-inner relative">
                            <i class="fas ${isArchived ? 'fa-box-archive' : 'fa-user-tie'} text-2xl"></i>
                            ${isVerified && !isArchived ? '<div class="absolute -top-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>' : ''}
                        </div>
                        <div>
                            <div class="font-black text-slate-900 text-2xl tracking-tighter uppercase leading-none mb-3">
                                ${name}
                            </div>
                            <div class="text-[11px] text-slate-400 font-black uppercase tracking-[0.1em] flex items-center gap-3">
                                <span class="text-blue-600 font-bold">${app.applicationType || 'Candidate'}</span>
                                <span class="text-slate-200 font-light">/</span>
                                <span class="text-slate-400 mono font-medium">#${app.entryId}</span>
                                ${isArchived ? '<span class="ml-4 px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">Archived</span>' : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-12 py-10 text-center">
                    ${isArchived ? `
                        <div class="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl border border-slate-200 bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                            <i class="fas fa-lock text-xs"></i> Sealed
                        </div>
                    ` : `
                        <button onclick="PortalAdminUI.handleToggleVerification('${app.entryId}', ${!isVerified})"
                            class="px-8 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl ${statusClass}">
                            <i class="fas ${isVerified ? 'fa-check-circle' : 'fa-hourglass-half'} mr-3"></i>
                            ${isVerified ? 'Verified' : 'Pending'}
                        </button>
                    `}
                </td>
                <td class="px-12 py-10 text-right">
                    <div class="flex justify-end gap-4 opacity-40 group-hover:opacity-100 transition-all duration-500">
                        <a href="candidate.html?id=${app.entryId}&token=${app.editToken}" target="_blank"
                            class="h-14 w-14 flex items-center justify-center bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-blue-600 hover:border-blue-200 transition-all shadow-xl shadow-blue-900/5"
                            title="View Profile">
                            <i class="fas fa-fingerprint text-lg"></i>
                        </a>

                        ${isArchived ? `
                            <button onclick="PortalAdminUI.handleRestoreApplication('${app.entryId}')"
                                class="h-14 w-14 flex items-center justify-center bg-white border border-slate-100 text-emerald-500 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-xl shadow-emerald-900/5"
                                title="Restore">
                                <i class="fas fa-rotate-left text-lg"></i>
                            </button>
                        ` : `
                            <button onclick="PortalAdminUI.handleArchiveApplication('${app.entryId}')"
                                class="h-14 w-14 flex items-center justify-center bg-white border border-slate-100 text-slate-300 rounded-2xl hover:text-amber-600 hover:border-amber-200 transition-all shadow-xl shadow-amber-900/5"
                                title="Archive">
                                <i class="fas fa-box-archive text-lg"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>`;
    }
};
