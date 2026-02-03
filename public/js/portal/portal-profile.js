/**
 * Profile View
 * Candidate profile rendering and data display.
 */
const PortalProfile = {
    currentCandidateName: "",
    isPreviewMode: false,
    renderedKeys: new Set(),

    async init() {
        this.renderedKeys = new Set();
        
        const params = new URLSearchParams(window.location.search);
        const entryId = params.get('id');
        const previewToken = params.get('token'); 
        
        if (!entryId) return this.showError();

        try {
            this.isPreviewMode = !!previewToken;

            const appApiUrl = this.isPreviewMode
                ? `/api/applications/${entryId}?token=${previewToken}`
                : `/api/applications/${entryId}`;

            const [appRes, configRes] = await Promise.all([
                fetch(appApiUrl),
                fetch('/api/registration-status')
            ]);
            
            if (!appRes.ok) throw new Error("Profile not found.");
            
            const appData = await appRes.json();
            const configData = await configRes.json();
            
            formConfig = configData.questions || {};

            this.currentCandidateName = this.resolveIdentityLabel(appData);

            this.renderHero(appData);
            this.renderBody(formConfig[appData.applicationType], appData.data);

            document.getElementById('loading-state')?.classList.add('hidden');
            document.getElementById('profile-content')?.classList.remove('hidden');

        } catch (err) {
            console.error("Profile load error:", err);
            this.showError();
        }
    },

    resolveIdentityLabel(app) {
        const d = app.data || {};
        const prio = [
            d['individual-name'], d['org-name'], d['consortium-name'],
            d.name, d.orgName, d.fullName, d.displayName, d.candidateName
        ];
        
        for (const val of prio) {
            if (val && typeof val === 'string' && val.trim()) return val.trim();
        }

        for (const [key, val] of Object.entries(d)) {
            if (typeof val === 'string' && val.length > 1 && val.length < 100 && !val.startsWith('data:image')) {
                const k = key.toLowerCase();
                if (!k.includes('token') && !k.includes('id') && !k.startsWith('_') && !k.includes('hash')) {
                    return val.trim();
                }
            }
        }

        return `Candidate #${app.entryId}`;
    },

    renderHero(record) {
        const container = document.getElementById('hero-section');
        if (!container) return;

        const data = record.data;
        let profilePic = null;

        for(let key in data) {
            if (typeof data[key] === 'string' && data[key].startsWith('data:image')) {
                profilePic = data[key];
                this.renderedKeys.add(key);
                break;
            }
        }

        const avatarFallback = {
            'Individual': `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#EFF6FF" width="120" height="120"/><circle cx="60" cy="40" r="18" fill="#BFDBFE"/><path d="M60 62 C38 62 24 78 24 96 L24 120 L96 120 L96 96 C96 78 82 62 60 62Z" fill="#BFDBFE"/></svg>`,
            'Organisation': `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#ECFDF5" width="120" height="120"/><path d="M60 16 L92 34 L92 68 C92 90 60 106 60 106 C60 106 28 90 28 68 L28 34 Z" fill="#86EFAC"/><path d="M60 28 L82 40 L82 66 C82 82 60 94 60 94 C60 94 38 82 38 66 L38 40 Z" fill="#ECFDF5"/><path d="M54 60 L58 64 L68 52" stroke="#86EFAC" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
            'Consortium': `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#EEF2FF" width="120" height="120"/><circle cx="32" cy="48" r="13" fill="#C7D2FE"/><path d="M32 65 C18 65 8 76 8 88 L8 120 L56 120 L56 88 C56 76 46 65 32 65Z" fill="#C7D2FE"/><circle cx="88" cy="48" r="13" fill="#C7D2FE"/><path d="M88 65 C74 65 64 76 64 88 L64 120 L112 120 L112 88 C112 76 102 65 88 65Z" fill="#C7D2FE"/><circle cx="60" cy="38" r="16" fill="#A5B4FC"/><path d="M60 58 C42 58 30 72 30 88 L30 120 L90 120 L90 88 C90 72 78 58 60 58Z" fill="#A5B4FC"/></svg>`
        };
        const fallbackSvg = avatarFallback[record.applicationType] || avatarFallback['Individual'];

        const previewBanner = this.isPreviewMode 
            ? `<div class="absolute top-0 right-0 px-6 py-1.5 bg-blue-600 text-white font-black text-[7px] uppercase tracking-[0.4em] rotate-45 translate-x-[25px] translate-y-[10px] shadow-xl z-20">Preview Mode</div>`
            : '';

        container.innerHTML = `
            ${previewBanner}
            <div class="flex flex-col items-start relative z-10 text-left">
                <div class="relative mb-8 group cursor-zoom-in" onclick="PortalProfile.openImageModal('${profilePic}')">
                    <div class="h-28 w-28 md:h-40 md:w-40 rounded-[2.5rem] bg-white border-4 border-white shadow-xl overflow-hidden relative transition-all duration-500 group-hover:scale-105">
                        ${profilePic ?
                            `<img src="${profilePic}" class="h-full w-full object-cover animate-fadeIn">` :
                            `<img src="data:image/svg+xml,${encodeURIComponent(fallbackSvg)}" class="h-full w-full object-cover animate-fadeIn">`
                        }
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <i class="fas fa-magnifying-glass-plus text-white text-2xl"></i>
                        </div>
                    </div>
                    <div class="absolute -bottom-1 -right-1 h-10 w-10 ${record.verified ? 'bg-emerald-500' : 'bg-amber-500'} text-white rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
                        <i class="fas ${record.verified ? 'fa-check' : 'fa-hourglass-half'} text-sm"></i>
                    </div>
                </div>
                
                <div class="w-full">
                    <div class="flex flex-wrap gap-2 mb-4">
                        <span class="px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-md">${record.applicationType}</span>
                        ${record.verified ? '' : `<span class="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase tracking-widest rounded-lg">Audit Pending</span>`}
                    </div>
                    <h1 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight mb-2 uppercase break-words">${this.currentCandidateName}</h1>
                    <p class="mono text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-6">ID: #${record.entryId}</p>

                    ${this.renderSocialLinks(data)}
                </div>
            </div>`;
    },

    generateSocialHTML(socialData, isMini = false) {
        if (!socialData) return '';
        let data = socialData;

        try { if (typeof socialData === 'string') data = JSON.parse(socialData); }
        catch(e) { return ''; }

        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return '';

        const platforms = {
            x: { icon: 'fa-x-twitter', url: 'https://x.com/' },
            github: { icon: 'fa-github', url: 'https://github.com/' },
            linkedin: { icon: 'fa-linkedin', url: 'https://linkedin.com/in/' },
            telegram: { icon: 'fa-telegram', url: 'https://t.me/' },
            website: { icon: 'fa-globe', url: '' },
            discord: { icon: 'fa-discord', url: '' }
        };

        const icons = Object.entries(data).map(([p, val]) => {
            if (!val) return '';
            const platform = p.toLowerCase();
            const cfg = platforms[platform] || { icon: 'fa-link', url: '' };

            const fullUrl = (val.toString().startsWith('http') || !cfg.url) ? val : (cfg.url + val.toString().replace(/^@/, ''));
            
            const size = isMini ? 'h-7 w-7' : 'h-10 w-10';
            const iconSize = isMini ? 'text-[10px]' : 'text-sm';
            
            return `
                <a href="${fullUrl}" target="_blank" class="${size} rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100">
                    <i class="fab ${cfg.icon} ${iconSize}"></i>
                </a>`;
        }).join('');

        if (!icons) return '';
        return `<div class="flex flex-wrap gap-2 ${isMini ? 'mt-4' : 'mt-0 justify-start'}">${icons}</div>`;
    },

    isSocialObject(val) {
        if (!val || typeof val !== 'object') return false;
        const keys = Object.keys(val).map(k => k.toLowerCase());
        const markers = ['x', 'twitter', 'github', 'linkedin', 'telegram', 'discord', 'website'];
        return keys.some(k => markers.includes(k));
    },

    renderSocialLinks(data) {
        for (const [key, val] of Object.entries(data)) {
            try {
                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                if (this.isSocialObject(parsed)) {
                    this.renderedKeys.add(key);
                    return this.generateSocialHTML(parsed, false);
                }
            } catch (e) {}
        }
        return '';
    },

    renderBody(architecture, respondentData) {
        const bodyContainer = document.getElementById('body-section');
        const metaContainer = document.getElementById('metadata-section');
        if (!bodyContainer || !metaContainer) return;

        bodyContainer.innerHTML = '';
        metaContainer.innerHTML = '';

        const schema = architecture || [];

        schema.forEach((module) => {
            const moduleKey = module.name || module.title.replace(/\s+/g, '_').toLowerCase();
            this.renderedKeys.add(moduleKey);

            if (module.isRoster) {
                const items = respondentData[moduleKey] || [];
                if (items.length === 0) return;

                const section = document.createElement('section');
                section.className = "mb-16 animate-fadeIn";
                section.innerHTML = `
                    <div class="flex items-center gap-4 mb-10">
                        <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">${module.title}</h3>
                        <div class="h-px bg-slate-100 flex-grow"></div>
                    </div>`;
                
                const grid = document.createElement('div');
                grid.className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4";
                
                grid.innerHTML = items.map((item, idx) => {
                    const name = item.name || item.fullName || item['q1768840076917'] || `Member #${idx + 1}`;

                    let memberSocialsHtml = '';
                    for(const [k, v] of Object.entries(item)) {
                        try {
                            const p = typeof v === 'string' ? JSON.parse(v) : v;
                            if (this.isSocialObject(p)) {
                                memberSocialsHtml = this.generateSocialHTML(p, true);
                                break;
                            }
                        } catch(e) {}
                    }

                    const subFields = module.fields.map(f => {
                        const val = item[f.name];
                        if (!val || f.type === 'social' || val.toString().startsWith('data:image')) return '';
                        if (f.name === 'cc_terms_agreement') return '';

                        return `
                            <div class="mt-4 first:mt-0">
                                <label class="block text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1 opacity-60">${f.label}</label>
                                <p class="text-slate-700 text-[11px] font-bold leading-relaxed">${val}</p>
                            </div>`;
                    }).join('');

                    return `
                        <div class="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full hover:border-blue-200 transition-all group">
                            <div class="flex items-center gap-3 mb-4 border-b border-slate-50 pb-4">
                                <div class="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-[9px] text-blue-600 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">#${idx + 1}</div>
                                <h5 class="text-xs font-black text-slate-900 tracking-tight leading-none uppercase truncate">${name}</h5>
                            </div>
                            <div class="flex-grow">${subFields}</div>
                            ${memberSocialsHtml ? `<div class="pt-2">${memberSocialsHtml}</div>` : ''}
                        </div>`;
                }).join('');

                section.appendChild(grid);
                bodyContainer.appendChild(section);
            } else {
                module.fields.forEach(f => {
                    const val = respondentData[f.name];
                    this.renderedKeys.add(f.name);

                    if (!val || f.type === 'social' || val.toString().startsWith('data:image') || f.name === 'cc_terms_agreement') return;

                    if (f.type === 'textarea') {
                        const div = document.createElement('div');
                        div.className = "mb-14 last:mb-0 animate-fadeIn";
                        div.innerHTML = `
                            <label class="block text-[8px] font-black text-blue-600 uppercase tracking-widest mb-4 opacity-40">${f.label}</label>
                            <div class="text-lg text-slate-800 font-medium leading-relaxed platform-text">${val}</div>
                        `;
                        bodyContainer.appendChild(div);
                    } else {
                        const div = document.createElement('div');
                        div.className = "p-5 bg-white rounded-2xl border border-slate-100 shadow-sm animate-fadeIn hover:border-blue-100 transition-all group";
                        div.innerHTML = `
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">${f.label}</label>
                            <div class="text-[11px] text-slate-900 font-bold mono break-all leading-relaxed">${val}</div>
                        `;
                        metaContainer.appendChild(div);
                    }
                });
            }
        });

        const unmapped = Object.entries(respondentData).filter(([key, val]) => {
            return !this.renderedKeys.has(key) && 
                   !key.includes('token') && 
                   !key.startsWith('_') && 
                   key !== 'editToken' &&
                   key !== 'cc_terms_agreement' && 
                   val && !val.toString().startsWith('data:image');
        });

        if (unmapped.length > 0) {
            const extraBox = document.createElement('div');
            extraBox.className = "pt-6 mt-6 border-t border-slate-100 space-y-3";
            extraBox.innerHTML = `<p class="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-2">Additional Data</p>`;
            
            unmapped.forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = "p-5 bg-slate-50/50 rounded-2xl border border-slate-100 animate-fadeIn";
                div.innerHTML = `
                    <label class="block text-[7px] font-black text-slate-400 uppercase mb-1">${key.replace(/_/g, ' ').replace(/q\d+/, 'Field')}</label>
                    <div class="text-[10px] text-slate-600 font-bold mono break-all leading-relaxed">${typeof val === 'object' ? JSON.stringify(val) : val}</div>
                `;
                extraBox.appendChild(div);
            });
            metaContainer.appendChild(extraBox);
        }

        if (!bodyContainer.innerHTML && !metaContainer.innerHTML) {
            bodyContainer.innerHTML = '<div class="py-40 text-center"><p class="text-slate-300 italic text-xs">No details available.</p></div>';
        }
    },

    openImageModal(src) {
        if (!src || src === 'null' || src === 'undefined') return;
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('expanded-image');
        if (modal && img) {
            img.src = src;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden'; 
        }
    },

    closeImageModal() {
        const modal = document.getElementById('image-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    },

    copyProfileLink() {
        const input = document.getElementById('share-link-input');
        if (!input) return;
        
        input.value = window.location.href;
        input.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copy-link-btn');
        const originalText = btn.innerText;
        btn.innerText = "COPIED";
        btn.classList.replace('bg-blue-600', 'bg-emerald-600');
        
        setTimeout(() => { 
            btn.innerText = originalText; 
            btn.classList.replace('bg-emerald-600', 'bg-blue-600'); 
        }, 2000);
    },

    openShareModal() { 
        const input = document.getElementById('share-link-input');
        if (input) input.value = window.location.href;
        document.getElementById('share-modal')?.classList.remove('hidden'); 
    },
    
    closeShareModal() { document.getElementById('share-modal')?.classList.add('hidden'); },

    shareOnX() { window.open(`https://x.com/intent/tweet?text=View this CC Candidate profile: ${window.location.href}`, '_blank'); },
    shareOnLinkedIn() { window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank'); },
    shareOnWhatsApp() { window.open(`https://wa.me/?text=CC Candidate Profile: ${window.location.href}`, '_blank'); },
    shareOnTelegram() { window.open(`https://t.me/share/url?url=${window.location.href}&text=CC Candidate Profile`, '_blank'); },

    showError() {
        document.getElementById('loading-state')?.classList.add('hidden');
        document.getElementById('error-state')?.classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => PortalProfile.init());