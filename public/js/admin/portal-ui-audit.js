/**
 * Audit Logs UI
 * Handles blockchain chain verification and audit log display.
 */
const PortalAudit = {
    chainVerification: null,
    viewMode: 'chain',

    formatUTC(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return "Invalid Date";

        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    },

    truncateHash(hash, startChars = 8, endChars = 8) {
        if (!hash || hash.length <= startChars + endChars) return hash;
        return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
    },

    async render(container) {
        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="flex flex-col lg:flex-row justify-between items-end gap-6 mb-12">
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Audit Track</h2>
                        <div class="flex gap-6 mt-6">
                            <button onclick="PortalAudit.exportAuditReport()" class="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                                <i class="fas fa-file-export text-sm"></i> Export Audit Report
                            </button>
                            <button onclick="PortalAudit.downloadRawChain()" class="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                                <i class="fas fa-download text-sm"></i> Download Raw JSON
                            </button>
                            <button onclick="PortalAudit.verifyChain()" class="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                                <i class="fas fa-link text-sm"></i> Verify Chain Integrity
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <div class="flex bg-slate-100 p-2 rounded-[1.8rem] gap-1 shadow-inner">
                            <button onclick="PortalAudit.setViewMode('chain')"
                                class="px-6 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${this.viewMode === 'chain' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}">
                                <i class="fas fa-link mr-2"></i>Chain
                            </button>
                            <button onclick="PortalAudit.setViewMode('legacy')"
                                class="px-6 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${this.viewMode === 'legacy' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}">
                                <i class="fas fa-scroll mr-2"></i>Legacy
                            </button>
                        </div>
                        <div class="flex bg-slate-100 p-2 rounded-[1.8rem] gap-1 shadow-inner">
                            ${['All', 'Identity', 'Audit', 'System'].map(cat => `
                                <button onclick="PortalAdminUI.setLogFilter('${cat}')"
                                    class="px-8 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${PortalAdminUI.activeLogFilters.includes(cat) ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}">
                                    ${cat}
                                </button>`).join('')}
                        </div>
                        <button onclick="PortalAdminUI.renderAuditLog(document.getElementById('admin-content-target'))" class="h-14 w-14 bg-white border border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:rotate-180 transition-all duration-700 shadow-xl">
                            <i class="fas fa-rotate text-lg"></i>
                        </button>
                    </div>
                </div>

                <div id="chain-status-banner" class="hidden mb-8"></div>

                <div class="glass-card rounded-[4rem] p-10 md:p-16 border border-slate-100 shadow-3xl relative overflow-hidden">
                    <div id="log-feed" class="space-y-6 max-h-[850px] overflow-y-auto pr-8 custom-scrollbar">
                        <div class="py-40 text-center animate-pulse">
                            <i class="fas fa-satellite-dish fa-spin text-slate-200 text-6xl mb-8"></i>
                            <p class="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em]">Loading...</p>
                        </div>
                    </div>
                    <i class="fas fa-shield-halved absolute -right-20 -bottom-20 text-slate-100/40 text-[25rem] pointer-events-none select-none"></i>
                </div>
            </div>`;

        const logFeed = document.getElementById('log-feed');
        if (!logFeed) return;

        if (this.viewMode === 'chain') {
            await this.renderChainView(logFeed);
        } else {
            await this.renderLegacyView(logFeed);
        }
    },

    async setViewMode(mode) {
        this.viewMode = mode;
        await this.render(document.getElementById('admin-content-target'));
    },

    async verifyChain() {
        const banner = document.getElementById('chain-status-banner');
        if (!banner) return;

        banner.innerHTML = `
            <div class="bg-slate-100 rounded-[2rem] p-6 flex items-center gap-4 animate-pulse">
                <i class="fas fa-spinner fa-spin text-slate-400 text-2xl"></i>
                <span class="text-slate-600 font-black uppercase tracking-widest text-xs">Verifying chain integrity...</span>
            </div>`;
        banner.classList.remove('hidden');

        const verification = await PortalAdminAPI.verifyAuditChain();
        this.chainVerification = verification;

        if (verification.valid) {
            banner.innerHTML = `
                <div class="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex items-center gap-4">
                    <div class="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-shield-check text-white text-xl"></i>
                    </div>
                    <div>
                        <p class="text-emerald-800 font-black uppercase tracking-widest text-sm">Chain Verified</p>
                        <p class="text-emerald-600 text-xs mt-1">${verification.totalBlocks} blocks validated. All hashes match.</p>
                    </div>
                </div>`;
        } else {
            banner.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-triangle-exclamation text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="text-red-800 font-black uppercase tracking-widest text-sm">Chain Integrity Issue</p>
                            <p class="text-red-600 text-xs mt-1">${verification.invalidBlocks?.length || 0} blocks need repair at indices: ${verification.invalidBlocks?.join(', ') || 'unknown'}</p>
                        </div>
                    </div>
                    <button onclick="PortalAudit.repairChain()" class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
                        <i class="fas fa-wrench mr-2"></i>Repair Chain
                    </button>
                </div>`;
        }

        if (this.viewMode === 'chain') {
            await this.renderChainView(document.getElementById('log-feed'));
        }
    },

    async repairChain() {
        if (!confirm('This will recalculate all block hashes to repair the chain. Continue?')) {
            return;
        }

        const banner = document.getElementById('chain-status-banner');
        if (banner) {
            banner.innerHTML = `
                <div class="bg-amber-100 rounded-[2rem] p-6 flex items-center gap-4 animate-pulse">
                    <i class="fas fa-wrench fa-spin text-amber-500 text-2xl"></i>
                    <span class="text-amber-700 font-black uppercase tracking-widest text-xs">Repairing chain...</span>
                </div>`;
        }

        const result = await PortalAdminAPI.repairAuditChain();

        if (result.ok) {
            if (banner) {
                banner.innerHTML = `
                    <div class="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex items-center gap-4">
                        <div class="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="text-emerald-800 font-black uppercase tracking-widest text-sm">Chain Repaired</p>
                            <p class="text-emerald-600 text-xs mt-1">${result.blocksRepaired} blocks recalculated.</p>
                        </div>
                    </div>`;
            }
            this.chainVerification = null;
            await this.renderChainView(document.getElementById('log-feed'));
        } else {
            alert('Repair failed: ' + (result.error || 'Unknown error'));
        }
    },

    async exportAuditReport() {
        const result = await PortalAdminAPI.exportAuditReport();
        if (!result.ok) {
            alert('Export failed: ' + (result.error || 'Unknown error'));
        }
    },

    async downloadRawChain() {
        const chain = await PortalAdminAPI.fetchAuditChain();
        if (!chain) {
            alert('Failed to fetch audit chain.');
            return;
        }

        const chronologicalChain = chain.slice().reverse();

        const blob = new Blob([JSON.stringify(chronologicalChain, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-chain-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    },

    async renderChainView(logFeed) {
        const chain = await PortalAdminAPI.fetchAuditChain();
        if (!chain || chain.length === 0) {
            logFeed.innerHTML = `<div class="py-40 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No chain blocks found.</div>`;
            return;
        }

        const entries = chain.map((block, idx) => {
            const entryData = this.parseBlockForDisplay(block);

            let verificationStatus = null;
            if (this.chainVerification && this.chainVerification.blocks) {
                const blockVerif = this.chainVerification.blocks.find(b => b.index === block.index);
                if (blockVerif) {
                    verificationStatus = blockVerif.hashValid && blockVerif.previousHashValid;
                }
            }

            return { ...entryData, block, verificationStatus, isFirst: idx === 0 };
        }).filter(e => PortalAdminUI.activeLogFilters.includes('All') || PortalAdminUI.activeLogFilters.includes(e.category));

        logFeed.innerHTML = entries.map((e, idx) => `
            <div class="relative">
                ${!e.isFirst ? `
                    <div class="absolute -top-6 left-[72px] w-px h-6 bg-gradient-to-b from-slate-200 to-slate-300"></div>
                    <div class="absolute -top-3 left-[68px] w-3 h-3 rounded-full border-2 border-slate-300 bg-white"></div>
                ` : ''}

                <div class="flex items-start gap-8 p-8 bg-white border ${e.verificationStatus === true ? 'border-emerald-200' : e.verificationStatus === false ? 'border-red-300' : 'border-slate-50'} rounded-[2.5rem] hover:border-blue-100 transition-all duration-500 group animate-fadeIn shadow-sm hover:shadow-xl">
                    <div class="flex flex-col items-center gap-2">
                        <div class="h-12 w-12 ${e.verificationStatus === true ? 'bg-emerald-500' : e.verificationStatus === false ? 'bg-red-500' : 'bg-slate-800'} rounded-2xl flex items-center justify-center text-white font-black text-sm">
                            #${e.block.index}
                        </div>
                        ${e.verificationStatus === true ? '<i class="fas fa-check-circle text-emerald-500 text-xs"></i>' : ''}
                        ${e.verificationStatus === false ? '<i class="fas fa-times-circle text-red-500 text-xs"></i>' : ''}
                    </div>

                    <div class="flex-grow">
                        <div class="text-[10px] font-black text-slate-300 mono mb-2">${e.dateStr}</div>

                        <p class="text-lg font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
                            <i class="fas ${e.icon} ${e.colorClass} text-xs"></i>
                            ${e.headline}
                        </p>

                        <div class="mt-1 flex flex-col gap-1">
                            ${e.identityMetaLine ? `<p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">${e.identityMetaLine}</p>` : ''}
                            <p class="text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-1">${e.actionLineText}</p>
                        </div>

                        ${(e.block.changes || e.block.reason) ? `
                            <div class="mt-4 p-4 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 space-y-2">
                                ${e.block.changes ? `<div class="flex gap-4"><span class="text-[9px] font-black text-blue-600 uppercase tracking-widest shrink-0 pt-0.5">Changes:</span> <span class="text-sm font-medium text-slate-600 leading-relaxed">${e.block.changes}</span></div>` : ''}
                                ${e.block.reason ? `<div class="flex gap-4"><span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest shrink-0 pt-0.5">Reason:</span> <span class="text-sm font-medium text-slate-600 leading-relaxed">${e.block.reason}</span></div>` : ''}
                            </div>` : ''}

                        ${this.renderSnapshotDiff(e.block.snapshot)}

                        <div class="mt-4 p-4 bg-slate-900 rounded-[1.5rem] space-y-2">
                            <div class="flex items-center gap-3">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0">Hash:</span>
                                <code class="text-[10px] font-mono text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors" title="${e.block.hash}" onclick="navigator.clipboard.writeText('${e.block.hash}').then(() => alert('Hash copied!'))">${this.truncateHash(e.block.hash, 12, 12)}</code>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0">Prev:</span>
                                <code class="text-[10px] font-mono text-amber-400 bg-slate-800 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors" title="${e.block.previousHash}" onclick="navigator.clipboard.writeText('${e.block.previousHash}').then(() => alert('Hash copied!'))">${this.truncateHash(e.block.previousHash, 12, 12)}</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`).join('') || `<div class="py-40 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No records found.</div>`;

        PortalAdminUI.currentVisibleLogs = entries;
    },

    // Converts a chain block into display-ready format using immutable snapshot data
    parseBlockForDisplay(block) {
        const context = block.context || "";
        const event = block.event || "System Event";
        const snapshot = block.snapshot || null;

        const idMatch = context.match(/#(\d{8})/) || context.match(/ID:\s*(\d{8})/i) || context.match(/(\d{8})/);
        let entryId = idMatch ? idMatch[1] : "";

        let candidateName = "";
        let appType = "";

        if (snapshot) {
            const snapshotData = snapshot.after || snapshot.record || snapshot.before;
            if (snapshotData) {
                entryId = snapshotData.entryId || entryId;
                appType = snapshotData.applicationType || "";
                candidateName = snapshotData.displayName || "";
            }
        }

        if (!appType) {
            const typeMatch = context.match(/\((Individual|Consortium|Organisation)\)/i);
            appType = typeMatch ? typeMatch[1].trim() : "";
        }

        let displayEventName = event.toLowerCase().replace(/_/g, ' ');
        let category = 'System';
        let colorClass = "text-slate-400";
        let icon = "fa-circle-dot";

        if (displayEventName.includes('vaulted') || displayEventName.includes('candidacy') && displayEventName.includes('new')) {
            category = 'Identity'; displayEventName = "New candidacy registered"; colorClass = "text-blue-600"; icon = "fa-plus-circle";
        } else if (displayEventName.includes('updated') || displayEventName.includes('record updated')) {
            category = 'Identity'; displayEventName = "Profile Change"; colorClass = "text-indigo-600"; icon = "fa-pen-to-square";
        } else if (displayEventName.includes('verification') || displayEventName.includes('verify')) {
            category = 'Audit';
            if (displayEventName.includes('revoked')) {
                displayEventName = "Verification Revoked"; colorClass = "text-amber-600"; icon = "fa-rotate-left";
            } else {
                displayEventName = "Candidate Approved"; colorClass = "text-emerald-600"; icon = "fa-check-circle";
            }
        } else if (displayEventName.includes('archived')) {
            category = 'Audit'; displayEventName = "Record Archived"; colorClass = "text-slate-600"; icon = "fa-box-archive";
        } else if (displayEventName.includes('restored')) {
            category = 'Audit'; displayEventName = "Record Restored"; colorClass = "text-cyan-600"; icon = "fa-box-open";
        } else if (displayEventName.includes('purge') || displayEventName.includes('delete')) {
            category = 'Audit'; displayEventName = "Record Purged"; colorClass = "text-red-600"; icon = "fa-trash-can";
        } else if (displayEventName.includes('genesis')) {
            category = 'System'; displayEventName = "Genesis Block"; colorClass = "text-purple-600"; icon = "fa-cube";
        } else if (displayEventName.includes('config') || displayEventName.includes('timeline') || displayEventName.includes('teams')) {
            category = 'System'; displayEventName = displayEventName.charAt(0).toUpperCase() + displayEventName.slice(1); colorClass = "text-slate-500"; icon = "fa-gear";
        }

        const headline = candidateName || (entryId ? `Record #${entryId}` : displayEventName.charAt(0).toUpperCase() + displayEventName.slice(1));
        const metaParts = [];
        if (appType) metaParts.push(`<span class="text-blue-600 font-bold">${appType}</span>`);
        if (entryId) metaParts.push(`<span class="text-slate-500 font-black">#${entryId}</span>`);
        const identityMetaLine = metaParts.join(' <span class="text-slate-300">•</span> ');
        const actionLineText = displayEventName.charAt(0).toUpperCase() + displayEventName.slice(1);

        return {
            timestamp: block.timestamp,
            dateStr: this.formatUTC(block.timestamp),
            headline,
            identityMetaLine,
            actionLineText,
            category,
            colorClass,
            icon
        };
    },

    renderSnapshotDiff(snapshot) {
        if (!snapshot) return '';

        if (snapshot.record) {
            const rec = snapshot.record;
            return `
                <div class="mt-4 p-4 bg-blue-50/80 rounded-[1.5rem] border border-blue-100">
                    <div class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">
                        <i class="fas fa-cube mr-2"></i>Record Snapshot
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div><span class="text-slate-400">ID:</span> <span class="font-bold text-slate-700">#${rec.entryId || 'N/A'}</span></div>
                        <div><span class="text-slate-400">Type:</span> <span class="font-bold text-slate-700">${rec.applicationType || 'N/A'}</span></div>
                        <div><span class="text-slate-400">Name:</span> <span class="font-bold text-slate-700">${rec.displayName || 'N/A'}</span></div>
                        <div><span class="text-slate-400">Verified:</span> <span class="font-bold ${rec.verified ? 'text-emerald-600' : 'text-amber-600'}">${rec.verified ? 'Yes' : 'No'}</span></div>
                    </div>
                    ${rec.fields ? this.renderFieldsPreview(rec.fields) : ''}
                </div>`;
        }

        if (!snapshot.before && !snapshot.after) return '';

        const before = snapshot.before;
        const after = snapshot.after;
        const diffs = this.computeDiffs(before, after);

        if (diffs.length === 0 && before && after) {
            return `
                <div class="mt-4 p-4 bg-slate-50/80 rounded-[1.5rem] border border-slate-100">
                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <i class="fas fa-equals mr-2"></i>No field changes detected (status change only)
                    </div>
                </div>`;
        }

        return `
            <div class="mt-4 p-4 bg-gradient-to-r from-red-50/50 to-emerald-50/50 rounded-[1.5rem] border border-slate-200">
                <div class="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">
                    <i class="fas fa-code-compare mr-2"></i>Change Comparison
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="p-3 bg-red-50 rounded-xl border border-red-100">
                        <div class="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">
                            <i class="fas fa-arrow-left mr-1"></i> Before
                        </div>
                        ${before ? `
                            <div class="space-y-1 text-xs">
                                <div><span class="text-slate-400">Name:</span> <span class="font-medium text-slate-700">${before.displayName || 'N/A'}</span></div>
                                <div><span class="text-slate-400">Verified:</span> <span class="font-medium ${before.verified ? 'text-emerald-600' : 'text-slate-500'}">${before.verified ? 'Yes' : 'No'}</span></div>
                                <div><span class="text-slate-400">Archived:</span> <span class="font-medium text-slate-600">${before.archived ? 'Yes' : 'No'}</span></div>
                                <div><span class="text-slate-400">Withdrawn:</span> <span class="font-medium text-slate-600">${before.withdrawn ? 'Yes' : 'No'}</span></div>
                            </div>
                        ` : '<div class="text-xs text-slate-400 italic">No prior state (new record)</div>'}
                    </div>

                    <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div class="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">
                            <i class="fas fa-arrow-right mr-1"></i> After
                        </div>
                        ${after ? `
                            <div class="space-y-1 text-xs">
                                <div><span class="text-slate-400">Name:</span> <span class="font-medium text-slate-700">${after.displayName || 'N/A'}</span></div>
                                <div><span class="text-slate-400">Verified:</span> <span class="font-medium ${after.verified ? 'text-emerald-600' : 'text-slate-500'}">${after.verified ? 'Yes' : 'No'}</span></div>
                                <div><span class="text-slate-400">Archived:</span> <span class="font-medium text-slate-600">${after.archived ? 'Yes' : 'No'}</span></div>
                                <div><span class="text-slate-400">Withdrawn:</span> <span class="font-medium text-slate-600">${after.withdrawn ? 'Yes' : 'No'}</span></div>
                            </div>
                        ` : '<div class="text-xs text-red-400 italic">Record deleted</div>'}
                    </div>
                </div>

                ${diffs.length > 0 ? `
                    <div class="mt-4 p-3 bg-white rounded-xl border border-slate-100">
                        <div class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                            <i class="fas fa-list-check mr-1"></i> Field Changes
                        </div>
                        <div class="space-y-2">
                            ${diffs.map(d => `
                                <div class="flex items-start gap-2 text-xs">
                                    <span class="font-bold text-slate-500 shrink-0">${d.field}:</span>
                                    <span class="text-red-500 line-through">${this.escapeHtml(this.truncateValue(d.before))}</span>
                                    <i class="fas fa-arrow-right text-slate-300 text-[8px] shrink-0 mt-1"></i>
                                    <span class="text-emerald-600 font-medium">${this.escapeHtml(this.truncateValue(d.after))}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>`;
    },

    computeDiffs(before, after) {
        const diffs = [];
        if (!before || !after) return diffs;

        const beforeFields = before.fields || {};
        const afterFields = after.fields || {};
        const allKeys = new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)]);

        for (const key of allKeys) {
            const bVal = beforeFields[key];
            const aVal = afterFields[key];
            if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
                diffs.push({
                    field: key,
                    before: bVal !== undefined ? String(bVal) : '(empty)',
                    after: aVal !== undefined ? String(aVal) : '(empty)'
                });
            }
        }

        if (before.verified !== after.verified) {
            diffs.push({ field: 'verified', before: String(before.verified), after: String(after.verified) });
        }
        if (before.archived !== after.archived) {
            diffs.push({ field: 'archived', before: String(before.archived), after: String(after.archived) });
        }
        if (before.withdrawn !== after.withdrawn) {
            diffs.push({ field: 'withdrawn', before: String(before.withdrawn), after: String(after.withdrawn) });
        }

        return diffs;
    },

    renderFieldsPreview(fields) {
        if (!fields || Object.keys(fields).length === 0) return '';

        const keyFields = Object.entries(fields).slice(0, 5);
        return `
            <div class="mt-3 pt-3 border-t border-blue-100">
                <div class="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">Form Fields</div>
                <div class="space-y-1 text-xs">
                    ${keyFields.map(([k, v]) => `
                        <div class="flex gap-2">
                            <span class="text-slate-400 shrink-0">${k}:</span>
                            <span class="text-slate-600 truncate">${this.escapeHtml(this.truncateValue(v))}</span>
                        </div>
                    `).join('')}
                    ${Object.keys(fields).length > 5 ? `<div class="text-slate-400 text-[10px]">... and ${Object.keys(fields).length - 5} more fields</div>` : ''}
                </div>
            </div>`;
    },

    truncateValue(val) {
        if (val === null || val === undefined) return '(null)';
        const str = String(val);
        return str.length > 100 ? str.substring(0, 100) + '...' : str;
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    // Renders a simplified view of audit events from the blockchain chain
    async renderLegacyView(logFeed) {
        const chain = await PortalAdminAPI.fetchAuditChain();
        if (!chain || chain.length === 0) {
            logFeed.innerHTML = `<div class="py-40 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No records found.</div>`;
            return;
        }

        const logEntries = chain.map(block => {
            const timestamp = block.timestamp;
            const eventType = block.event || "System Event";
            const context = block.context || "";
            const meta = block.meta || {};

            const idMatch = context.match(/ID:\s*(\d+)/) || context.match(/#(\d{8})/);
            const entryId = idMatch ? idMatch[1] : "";

            let candidateName = "";
            let appType = "";

            if (meta.record) {
                const d = meta.record.data || {};
                candidateName = d['individual-name'] || d['consortium-name'] || d['org-name'] ||
                               d['q_1769085576918'] || d['q1768839882885'] || d['name'] || "";
                appType = meta.record.applicationType || "";
            }

            if (!candidateName && typeof allApplicants !== 'undefined' && entryId) {
                const appRecord = allApplicants.find(a => String(a.entryId) === String(entryId));
                if (appRecord) {
                    appType = appRecord.applicationType || "";
                    const d = appRecord.data || {};
                    candidateName = d['individual-name'] || d['consortium-name'] || d['org-name'] ||
                                   d['q_1769085576918'] || d['q1768839882885'] || d['name'] || "";
                }
            }

            if (!candidateName) {
                const nameMatch = context.match(/Name:\s*([^|]+)/);
                if (nameMatch) candidateName = nameMatch[1].trim();
            }

            let displayEventName = eventType.toLowerCase().replace(/_/g, ' ');
            let category = 'System';
            let colorClass = "text-slate-400";
            let icon = "fa-circle-dot";

            if (displayEventName.includes('candidacy') || displayEventName.includes('vaulted') || displayEventName.includes('submission')) {
                category = 'Identity'; displayEventName = "New candidacy registered"; colorClass = "text-blue-600"; icon = "fa-plus-circle";
            } else if (displayEventName.includes('updated') || displayEventName.includes('edited') || displayEventName.includes('change') || displayEventName.includes('modified')) {
                category = 'Identity'; displayEventName = "Profile Change"; colorClass = "text-indigo-600"; icon = "fa-pen-to-square";
            } else if (displayEventName.includes('identity verification') || displayEventName.includes('verify')) {
                category = 'Audit';
                displayEventName = "Candidate Approved"; colorClass = "text-emerald-600"; icon = "fa-check-circle";
            } else if (displayEventName.includes('archived')) {
                category = 'Audit'; displayEventName = "Record Archived"; colorClass = "text-amber-600"; icon = "fa-box-archive";
            } else if (displayEventName.includes('restored')) {
                category = 'Audit'; displayEventName = "Record Restored"; colorClass = "text-teal-600"; icon = "fa-rotate-left";
            } else if (displayEventName.includes('purge') || displayEventName.includes('delete')) {
                category = 'Audit'; displayEventName = "Record Purged"; colorClass = "text-red-600"; icon = "fa-trash-can";
            } else if (displayEventName.includes('config') || displayEventName.includes('timeline') || displayEventName.includes('teams')) {
                category = 'System'; displayEventName = displayEventName.charAt(0).toUpperCase() + displayEventName.slice(1); colorClass = "text-slate-500"; icon = "fa-gear";
            }

            const headline = candidateName || (entryId ? `Record #${entryId}` : displayEventName.charAt(0).toUpperCase() + displayEventName.slice(1));
            const metaParts = [];
            if (appType) metaParts.push(`<span class="text-blue-600 font-bold">${appType}</span>`);
            if (entryId) metaParts.push(`<span class="text-slate-500 font-black">#${entryId}</span>`);
            const identityMetaLine = metaParts.join(' <span class="text-slate-300">•</span> ');
            const actionLineText = displayEventName.charAt(0).toUpperCase() + displayEventName.slice(1);

            const details = meta.details || "";
            const reason = meta.reason || "";

            return { timestamp, dateStr: this.formatUTC(timestamp), headline, identityMetaLine, actionLineText, category, details, reason, colorClass, icon };
        }).filter(e => e && (PortalAdminUI.activeLogFilters.includes('All') || PortalAdminUI.activeLogFilters.includes(e.category)));

        logFeed.innerHTML = logEntries.map(e => `
            <div class="flex items-start gap-8 p-8 bg-white border border-slate-50 rounded-[2.5rem] hover:border-blue-100 transition-all duration-500 group animate-fadeIn shadow-sm hover:shadow-xl">
                <div class="text-[11px] font-black text-slate-300 mono whitespace-nowrap pt-1.5">${e.dateStr}</div>
                <div class="h-px w-8 bg-slate-100 mt-4 flex-shrink-0"></div>
                <div class="flex-grow">
                    <p class="text-lg font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
                        <i class="fas ${e.icon} ${e.colorClass} text-xs"></i>
                        ${e.headline}
                    </p>
                    <div class="mt-1 flex flex-col gap-1">
                        ${e.identityMetaLine ? `<p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">${e.identityMetaLine}</p>` : ''}
                        <p class="text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-1">${e.actionLineText}</p>
                    </div>
                    ${(e.details || e.reason) ? `
                        <div class="mt-6 p-6 bg-slate-50/80 rounded-[2rem] border border-slate-100 space-y-3 shadow-inner">
                            ${e.details ? `<div class="flex gap-6"><span class="text-[9px] font-black text-blue-600 uppercase tracking-widest shrink-0 pt-1">Details:</span> <span class="text-sm font-medium text-slate-600 leading-relaxed">${e.details}</span></div>` : ''}
                            ${e.reason ? `<div class="flex gap-6"><span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest shrink-0 pt-1">Reason:</span> <span class="text-sm font-medium text-slate-600 leading-relaxed">${e.reason}</span></div>` : ''}
                        </div>` : ''}
                </div>
            </div>`).join('') || `<div class="py-40 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No records found.</div>`;

        PortalAdminUI.currentVisibleLogs = logEntries;
    },

    setLogFilter(category) {
        if (category === 'All') { PortalAdminUI.activeLogFilters = ['All']; }
        else {
            PortalAdminUI.activeLogFilters = PortalAdminUI.activeLogFilters.filter(f => f !== 'All');
            if (PortalAdminUI.activeLogFilters.includes(category)) {
                PortalAdminUI.activeLogFilters = PortalAdminUI.activeLogFilters.filter(f => f !== category);
            } else {
                PortalAdminUI.activeLogFilters.push(category);
            }
            if (PortalAdminUI.activeLogFilters.length === 0) PortalAdminUI.activeLogFilters = ['All'];
        }
        this.render(document.getElementById('admin-content-target'));
    }
};
