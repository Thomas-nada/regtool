/**
 * Timeline Engine
 * Roadmap display and progress tracking.
 */
const PortalTimeline = {
    async init() {
        await this.fetchTimeline();
    },

    async fetchTimeline() {
        try {
            const response = await fetch('/api/timeline');
            if (!response.ok) throw new Error('Timeline source unreachable.');
            
            const data = await response.json();
            this.render(data);
        } catch (err) {
            console.error("Timeline error:", err);
            this.handleError();
        }
    },

    render(input) {
        const container = document.getElementById('frontend-container');
        if (!container) return;

        container.innerHTML = '';
        let totalItems = 0;
        let completedItems = 0;

        let itemsArray = [];
        if (Array.isArray(input)) {
            itemsArray = input;
        } else if (input && typeof input === 'object') {
            const source = (input.data && typeof input.data === 'object' && !Array.isArray(input.data)) 
                           ? input.data : input;
            itemsArray = Object.values(source);
        }

        const filteredItems = itemsArray.filter(i => i && typeof i === 'object' && i.item && i.status !== 'Removed');

        if (filteredItems.length === 0) {
            container.innerHTML = `
                <div class="py-32 text-center glass-card rounded-[3rem] opacity-50">
                    <p class="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">No roadmap items found.</p>
                </div>`;
            this.updateProgressCircle(0, 0);
            return;
        }

        filteredItems.forEach((milestone, index) => {
            totalItems++;
            const isDone = milestone.status === "Completed";
            if(isDone) completedItems++;
            
            const statusColor = isDone ? "bg-emerald-600 shadow-emerald-500/30" : "bg-blue-600 shadow-blue-500/30";
            const statusLabel = isDone ? "Completed" : milestone.status;

            const itemEl = document.createElement('div');
            itemEl.className = 'phase-container animate-fadeIn mb-8';
            itemEl.style.animationDelay = `${index * 0.1}s`;

            const linksHtml = (milestone.urls || []).map(link => {
                const label = typeof link === 'object' ? (link.label || 'Supporting Data') : 'Supporting Data';
                const url = typeof link === 'object' ? link.url : link;
                return `
                    <a href="${url}" target="_blank" class="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2">
                        <i class="fas fa-link"></i> ${label}
                    </a>
                `;
            }).join('');

            itemEl.innerHTML = `
                <div class="glass-card rounded-[3rem] p-10 md:p-12 border border-slate-100 shadow-2xl shadow-blue-900/[0.02] hover:border-blue-200 transition-all group relative overflow-hidden">
                    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                        <div class="flex-1">
                            <div class="flex items-center gap-4 mb-6">
                                <div class="px-4 py-1.5 rounded-full ${statusColor} text-white text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                                    ${isDone ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-spinner fa-spin"></i>'}
                                    ${statusLabel}
                                </div>
                                <span class="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">${milestone.dates}</span>
                                ${milestone.who ? `<span class="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-auto border-l border-slate-100 pl-4">Lead: ${milestone.who}</span>` : ''}
                            </div>
                            
                            <h4 class="font-black text-slate-900 tracking-tighter text-3xl mb-4 group-hover:text-blue-600 transition-colors">${milestone.item}</h4>
                            <p class="text-slate-500 text-lg font-medium leading-relaxed max-w-3xl">${milestone.description}</p>
                            
                            ${linksHtml ? `<div class="flex flex-wrap gap-3 mt-8 pt-8 border-t border-slate-50">${linksHtml}</div>` : ''}
                        </div>
                    </div>

                    <div class="absolute -right-20 -bottom-20 h-64 w-64 bg-blue-600/[0.02] blur-[100px] rounded-full pointer-events-none"></div>
                </div>`;
            
            container.appendChild(itemEl);
        });

        this.updateProgressCircle(totalItems, completedItems);
        document.getElementById('loader')?.classList.add('hidden');
    },

    updateProgressCircle(total, done) {
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        const circle = document.getElementById('circle-progress');
        const text = document.getElementById('percent-text');
        
        if (circle) {
            const circumference = 2 * Math.PI * 40;
            circle.style.strokeDashoffset = circumference - (percent / 100 * circumference);
        }
        
        if (text) {
            text.innerText = percent + '%';
        }
    },

    handleError() {
        const loader = document.getElementById('loader');
        const errorBox = document.getElementById('error-box');
        if (loader) loader.classList.add('hidden');
        if (errorBox) errorBox.classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => PortalTimeline.init());