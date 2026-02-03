/**
 * Directory Engine
 * Candidate grid rendering and search filtering.
 */
const PortalDirectory = {
    async fetchCandidates() {
        try {
            const response = await fetch('/api/applications');
            if (!response.ok) throw new Error("Server error");
            allCandidates = await response.json();
            this.renderGrid();
        } catch (err) {
            console.error("Directory error:", err);
            const gridNode = document.getElementById('candidates-grid');
            if (gridNode) {
                gridNode.innerHTML = `
                    <div class="col-span-full py-48 text-center glass-card rounded-[3rem] border-rose-100">
                        <div class="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
                            <i class="fas fa-satellite-dish"></i>
                        </div>
                        <h3 class="text-xl font-black text-slate-900 tracking-tighter uppercase mb-1">Server Offline</h3>
                        <p class="text-slate-400 font-medium text-xs">Could not load candidates.</p>
                    </div>`;
            }
        }
    },

    resolveName(candidate) {
        if (!candidate || !candidate.data) return "Identity Unknown";
        const d = candidate.data;
        
        const prio = [
            d['individual-name'], d['org-name'], d['consortium-name'],
            d.name, d.orgName, d.fullName, d.displayName,
            d.q_1769085576918, d.q_1769085297138, d.q1768839882885
        ];
        
        for (const val of prio) {
            if (val && typeof val === 'string' && val.trim()) return val.trim();
        }
        return `Record #${candidate.entryId}`;
    },

    renderMiniSocials(data) {
        let socialObj = null;
        for (const val of Object.values(data)) {
            try {
                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                if (parsed && typeof parsed === 'object' && (parsed.x || parsed.github || parsed.linkedin || parsed.website)) { 
                    socialObj = parsed; break; 
                }
            } catch(e) {}
        }
        if (!socialObj) return '';

        const platforms = { x: 'fa-x-twitter', github: 'fa-github', linkedin: 'fa-linkedin', website: 'fa-globe' };
        const iconsHtml = Object.entries(socialObj).map(([p, val]) => {
            if (!val || !platforms[p]) return '';
            return `<i class="fab ${platforms[p]} text-[11px] text-slate-300"></i>`;
        }).join('');

        return `<div class="flex gap-3">${iconsHtml}</div>`;
    },

    renderGrid() {
        const gridRef = document.getElementById('candidates-grid');
        const emptyRef = document.getElementById('empty-state');
        if (!gridRef) return;

        const filtered = allCandidates.filter(c => {
            const isTypeMatch = currentTypeFilter === 'All' || c.applicationType === currentTypeFilter;
            const isNameMatch = this.resolveName(c).toLowerCase().includes(currentSearchTerm.toLowerCase().trim());
            return isTypeMatch && isNameMatch;
        });

        if (filtered.length === 0) {
            gridRef.classList.add('hidden');
            if (emptyRef) emptyRef.classList.remove('hidden');
            return;
        }

        gridRef.classList.remove('hidden');
        if (emptyRef) emptyRef.classList.add('hidden');

        gridRef.innerHTML = filtered.map((c, idx) => {
            const isVerified = c.verified === true;
            const displayName = this.resolveName(c);
            const socials = isVerified ? this.renderMiniSocials(c.data) : '';
            
            let avatarData = null;
            for (const val of Object.values(c.data)) {
                if (typeof val === 'string' && val.startsWith('data:image')) { avatarData = val; break; }
            }
            
            const trackConfig = {
                'Individual': { icon: 'fa-user', color: 'text-blue-600', bg: 'bg-blue-50', avatarSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#EFF6FF" width="120" height="120"/><circle cx="60" cy="40" r="18" fill="#BFDBFE"/><path d="M60 62 C38 62 24 78 24 96 L24 120 L96 120 L96 96 C96 78 82 62 60 62Z" fill="#BFDBFE"/></svg>` },
                'Organisation': { icon: 'fa-landmark', color: 'text-emerald-600', bg: 'bg-emerald-50', avatarSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#ECFDF5" width="120" height="120"/><path d="M60 16 L92 34 L92 68 C92 90 60 106 60 106 C60 106 28 90 28 68 L28 34 Z" fill="#86EFAC"/><path d="M60 28 L82 40 L82 66 C82 82 60 94 60 94 C60 94 38 82 38 66 L38 40 Z" fill="#ECFDF5"/><path d="M54 60 L58 64 L68 52" stroke="#86EFAC" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>` },
                'Consortium': { icon: 'fa-users', color: 'text-indigo-600', bg: 'bg-indigo-50', avatarSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#EEF2FF" width="120" height="120"/><circle cx="32" cy="48" r="13" fill="#C7D2FE"/><path d="M32 65 C18 65 8 76 8 88 L8 120 L56 120 L56 88 C56 76 46 65 32 65Z" fill="#C7D2FE"/><circle cx="88" cy="48" r="13" fill="#C7D2FE"/><path d="M88 65 C74 65 64 76 64 88 L64 120 L112 120 L112 88 C112 76 102 65 88 65Z" fill="#C7D2FE"/><circle cx="60" cy="38" r="16" fill="#A5B4FC"/><path d="M60 58 C42 58 30 72 30 88 L30 120 L90 120 L90 88 C90 72 78 58 60 58Z" fill="#A5B4FC"/></svg>` }
            };
            const cfg = trackConfig[c.applicationType] || trackConfig['Individual'];
            
            const clickAction = isVerified ? `onclick="window.location.href='candidate.html?id=${c.entryId}'"` : '';
            const cardClasses = isVerified 
                ? "cursor-pointer hover:shadow-xl hover:border-blue-200 hover:-translate-y-1" 
                : "cursor-default opacity-80 grayscale-[0.5]";
            const blurClass = isVerified ? "" : "blur-xl opacity-30";

            return `
                <div class="animate-fadeIn" style="animation-delay: ${idx * 0.03}s">
                    <div class="relative bg-white rounded-[2.5rem] p-6 pb-5 border border-slate-100 shadow-sm transition-all duration-500 flex flex-col h-full overflow-hidden ${cardClasses}"
                         ${clickAction}>
                        
                        <div class="flex justify-between items-center mb-5">
                            <div class="flex items-center gap-2 px-3 py-1 ${cfg.bg} rounded-xl border border-white/50">
                                <i class="fas ${cfg.icon} ${cfg.color} text-[8px]"></i>
                                <span class="text-[8px] font-black uppercase tracking-wider ${cfg.color}">${c.applicationType}</span>
                            </div>
                            <span class="text-[8px] font-bold text-slate-300 mono tracking-tighter">#${c.entryId}</span>
                        </div>

                        <div class="flex items-center gap-5 mb-5">
                            <div class="h-16 w-16 rounded-2xl bg-slate-50 border-4 border-slate-50 shadow-md overflow-hidden flex-shrink-0">
                                ${avatarData
                                    ? `<img src="${avatarData}" class="h-full w-full object-cover ${blurClass}">`
                                    : `<img src="data:image/svg+xml,${encodeURIComponent(cfg.avatarSvg)}" class="h-full w-full object-cover ${blurClass}">`}
                            </div>
                            <div class="min-w-0">
                                <h3 class="text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                                    ${displayName}
                                </h3>
                                ${socials ? `<div class="mt-2">${socials}</div>` : (!isVerified ? `<p class="text-[8px] font-bold text-amber-500 uppercase mt-1 tracking-widest">Audit Pending</p>` : '')}
                            </div>
                        </div>

                        <div class="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="h-1.5 w-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}"></div>
                                <span class="text-[8px] font-black uppercase tracking-widest ${isVerified ? 'text-slate-300' : 'text-amber-600'}">
                                    ${isVerified ? 'Verified' : 'In Audit'}
                                </span>
                            </div>
                            ${isVerified ? `<i class="fas fa-arrow-right text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all"></i>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
};

window.setFilter = function(filterVal) {
    currentTypeFilter = filterVal;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const text = btn.textContent.trim();
        const isActive = text.includes(filterVal) || (filterVal === 'All' && text.includes('All'));
        if (isActive) {
            btn.className = "filter-btn px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all bg-slate-900 text-white shadow-lg";
        } else {
            btn.className = "filter-btn px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all bg-white text-slate-400 border border-slate-100 hover:bg-slate-50";
        }
    });
    PortalDirectory.renderGrid();
};

window.applySearch = function() {
    currentSearchTerm = document.getElementById('searchInput')?.value || "";
    PortalDirectory.renderGrid();
};