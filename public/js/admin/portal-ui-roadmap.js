/**
 * Roadmap Manager
 * Milestone management and timeline editing.
 */
const PortalRoadmap = {
    undoStack: [],

    async render(container) {
        const [input, teams] = await Promise.all([
            PortalAdminAPI.fetchStratum('timeline'),
            PortalAdminAPI.fetchStratum('teams')
        ]);

        let items = Array.isArray(input) ? input : (input && typeof input === 'object' ? Object.values(input).filter(i => i && i.item) : []);

        items.sort((a, b) => (a.startDate || '9999-12-31').localeCompare(b.startDate || '9999-12-31'));

        container.innerHTML = `
            <div class="animate-fadeIn relative">
                <div class="flex flex-col lg:flex-row justify-between items-end gap-6 mb-12">
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Roadmap Manager</h2>
                        <p class="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4">Manage Public Milestones</p>
                    </div>

                    <div class="flex flex-wrap gap-4">
                        <button onclick="PortalAdminUI.saveTimelineData()" class="bg-slate-900 text-white px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95 flex items-center gap-3">
                            <i class="fas fa-cloud-upload-alt"></i> Save Roadmap
                        </button>
                        <button onclick="PortalAdminUI.addTimelineItem()" class="bg-blue-600 text-white px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 hover:bg-blue-700 transition-all flex items-center gap-3">
                            <i class="fas fa-calendar-plus"></i> Add Milestone
                        </button>
                    </div>
                </div>

                <div id="timeline-editor-list" class="space-y-10">
                    ${items.length > 0 ? items.map((item, idx) => this.buildTimelineItemUI(item, idx, teams)).join('') : `
                        <div class="py-40 text-center glass-card rounded-[4rem] opacity-30">
                            <p class="text-[10px] font-black uppercase tracking-[0.5em]">No milestones found.</p>
                        </div>
                    `}
                </div>

                <div id="roadmap-undo-container" class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[250] pointer-events-none"></div>

                <div class="mt-20 pt-16 border-t border-slate-100 flex flex-col items-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">Changes require saving to persist</p>
                </div>
            </div>`;
    },

    formatForInput(dateStr) {
        if (!dateStr) return '';
        try {
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) return dateStr;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    },

    buildTimelineItemUI(item, idx, teams = []) {
        const startVal = this.formatForInput(item.startDate);
        const endVal = this.formatForInput(item.endDate);

        return `
            <div class="glass-card rounded-[4rem] p-12 md:p-16 border border-slate-100 shadow-2xl timeline-node relative group transition-all duration-700 hover:border-blue-200 animate-fadeIn" data-index="${idx}">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div class="lg:col-span-4 space-y-8">
                        <div>
                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3 tracking-widest">Title</label>
                            <input type="text" value="${item.item || ''}" class="item-title w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-base font-black text-slate-900 focus:bg-white outline-none shadow-inner" placeholder="Milestone Title">
                        </div>
                        <div>
                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3 tracking-widest">Assigned Team</label>
                            <div class="relative">
                                <select class="item-team w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest cursor-pointer appearance-none outline-none focus:bg-white">
                                    <option value="">None</option>
                                    ${teams.map(t => `<option value="${t}" ${item.who === t ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                                <i class="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-6">
                            <div>
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3">Start Date (UTC)</label>
                                <input type="datetime-local" value="${startVal}" class="item-start-date w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black focus:bg-white transition-all outline-none">
                            </div>
                            <div>
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3">End Date (UTC)</label>
                                <input type="datetime-local" value="${endVal}" class="item-end-date w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black focus:bg-white transition-all outline-none">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3 tracking-widest">Status</label>
                            <div class="relative">
                                <select class="item-status w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest cursor-pointer appearance-none outline-none focus:bg-white">
                                    <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Removed" ${item.status === 'Removed' ? 'selected' : ''}>Removed (Hidden)</option>
                                </select>
                                <i class="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-7 space-y-8">
                        <div>
                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3 tracking-widest">Description</label>
                            <textarea class="item-desc w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 text-base font-medium text-slate-600 focus:bg-white outline-none resize-none shadow-inner" rows="6" placeholder="Describe this milestone...">${item.description || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-4 ml-3 tracking-widest italic">Resource Links</label>
                            <div class="item-links-container space-y-4">
                                ${(item.urls || []).map(link => this.buildLinkRow(link)).join('')}
                            </div>
                            <button type="button" onclick="PortalRoadmap.addLink(this)" class="mt-6 px-6 py-3 border border-blue-100 rounded-2xl text-[9px] font-black text-blue-600 uppercase flex items-center gap-3 hover:bg-blue-50 transition-all shadow-sm">
                                <i class="fas fa-plus-circle text-xs"></i> Add Link
                            </button>
                        </div>
                    </div>

                    <div class="lg:col-span-1 flex items-center justify-center">
                        <button onclick="PortalRoadmap.requestDelete(this)" class="h-16 w-16 bg-red-50 text-red-400 rounded-3xl hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-900/5">
                            <i class="fas fa-trash-can text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    },

    requestDelete(btn) {
        const node = btn.closest('.timeline-node');
        const parent = node.parentElement;
        const index = Array.from(parent.children).indexOf(node);
        const title = node.querySelector('.item-title').value || "Unnamed Milestone";

        this.undoStack.push({
            element: node,
            parent: parent,
            index: index
        });

        node.classList.add('opacity-0', '-translate-x-12');
        setTimeout(() => {
            node.remove();
            this.showUndoToast(`"${title}" removed.`);
        }, 400);
    },

    showUndoToast(message) {
        const container = document.getElementById('roadmap-undo-container');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-3xl flex items-center gap-8 border border-white/10 pointer-events-auto animate-fadeIn">
                <p class="text-[10px] font-black uppercase tracking-widest">${message}</p>
                <div class="h-6 w-px bg-white/20"></div>
                <button onclick="PortalRoadmap.undoDeletion()" class="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
                    <i class="fas fa-rotate-left"></i> Undo
                </button>
                <button onclick="this.parentElement.remove()" class="text-white/40 hover:text-white transition-colors">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `;

        setTimeout(() => {
            if (container.firstChild) container.firstChild.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => { container.innerHTML = ''; }, 500);
        }, 6000);
    },

    undoDeletion() {
        const lastAction = this.undoStack.pop();
        if (!lastAction) return;

        const { element, parent, index } = lastAction;

        if (index >= parent.children.length) {
            parent.appendChild(element);
        } else {
            parent.insertBefore(element, parent.children[index]);
        }

        element.classList.remove('opacity-0', '-translate-x-12');

        document.getElementById('roadmap-undo-container').innerHTML = '';
    },

    buildLinkRow(link = { label: '', url: '' }) {
        return `
            <div class="link-row flex gap-4 items-center animate-fadeIn group/link">
                <div class="w-1/3">
                    <input type="text" value="${link.label || ''}" placeholder="Display Name" class="link-label w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest outline-none focus:border-blue-400 shadow-sm transition-all">
                </div>
                <div class="flex-grow">
                    <input type="text" value="${link.url || ''}" placeholder="https://..." class="link-url w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-[11px] font-mono text-blue-600 outline-none focus:border-blue-400 shadow-sm transition-all">
                </div>
                <button type="button" onclick="this.closest('.link-row').remove()" class="text-slate-200 hover:text-red-500 transition-colors px-2 group-hover/link:text-slate-400">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>`;
    },

    addLink(btn) {
        const container = btn.parentElement.querySelector('.item-links-container');
        const temp = document.createElement('div');
        temp.innerHTML = this.buildLinkRow();
        container.appendChild(temp.firstElementChild);
    },

    async addItem() {
        const teams = await PortalAdminAPI.fetchStratum('teams') || [];
        const list = document.getElementById('timeline-editor-list');
        if (!list) return;

        const temp = document.createElement('div');
        temp.innerHTML = this.buildTimelineItemUI({
            item: 'New Milestone',
            startDate: '',
            endDate: '',
            status: 'In Progress',
            description: '',
            urls: []
        }, Date.now(), teams);

        if (list.querySelector('.py-40')) list.innerHTML = '';

        list.prepend(temp.firstElementChild);
        temp.firstElementChild.scrollIntoView({ behavior: 'smooth' });
    },

    async save() {
        const items = [];
        const nodes = document.querySelectorAll('.timeline-node');

        nodes.forEach(node => {
            const startDate = node.querySelector('.item-start-date').value;
            const endDate = node.querySelector('.item-end-date').value;

            const linkRows = node.querySelectorAll('.link-row');
            const urls = Array.from(linkRows).map(row => ({
                label: row.querySelector('.link-label').value.trim(),
                url: row.querySelector('.link-url').value.trim()
            })).filter(l => l.url.startsWith('http'));

            items.push({
                item: node.querySelector('.item-title').value.trim(),
                who: node.querySelector('.item-team').value,
                startDate: startDate,
                endDate: endDate,
                dates: startDate === endDate ? startDate : `${startDate} — ${endDate}`,
                status: node.querySelector('.item-status').value,
                description: node.querySelector('.item-desc').value.trim(),
                urls: urls
            });
        });

        items.sort((a, b) => (a.startDate || '9999-12-31').localeCompare(b.startDate || '9999-12-31'));

        const auditMeta = await PortalAdminUI.requestAuditDetails();
        if (await PortalAdminAPI.saveStratum('timeline', items, auditMeta)) {
            alert("Roadmap saved.");
            this.render(document.getElementById('admin-content-target'));
        }
    }
};
