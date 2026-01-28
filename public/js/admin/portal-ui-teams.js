/**
 * Teams Registry
 * Team management for assignment to milestones and tasks.
 */
const PortalTeams = {
    async render(container) {
        const teams = await PortalAdminAPI.fetchStratum('teams');
        
        container.innerHTML = `
            <div class="animate-fadeIn max-w-4xl">
                <div class="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Teams Registry</h2>
                        <p class="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4">Manage Team Assignments</p>
                    </div>
                    
                    <div class="flex flex-wrap gap-4">
                        <button onclick="PortalAdminUI.saveTeamsData()" class="bg-slate-900 text-white px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95 flex items-center gap-3">
                            <i class="fas fa-cloud-upload-alt"></i> Save Teams
                        </button>
                        <button onclick="PortalAdminUI.addTeamItem()" class="bg-blue-600 text-white px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 hover:bg-blue-700 transition-all flex items-center gap-3">
                            <i class="fas fa-building-circle-check"></i> Add team
                        </button>
                    </div>
                </div>
                
                <div class="glass-card p-12 rounded-[4rem] border border-slate-100 shadow-3xl space-y-6 min-h-[200px]" id="team-list-ui">
                    ${teams.length > 0 ? teams.map(t => this.buildTeamItem(t)).join('') : `
                        <div class="py-20 text-center opacity-30">
                            <p class="text-[10px] font-black uppercase tracking-[0.5em]">No teams defined.</p>
                        </div>
                    `}
                </div>
                
                <div class="mt-16 flex flex-col items-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">Changes require saving to persist</p>
                </div>
            </div>`;
    },

    buildTeamItem(name) {
        return `
            <div class="team-item flex gap-6 items-center bg-slate-50/50 p-6 rounded-[1.8rem] border border-slate-100 animate-fadeIn group/team hover:bg-white hover:border-blue-100 transition-all duration-500">
                <div class="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 group-hover/team:bg-blue-600 group-hover/team:text-white transition-all duration-500">
                    <i class="fas fa-building-shield"></i>
                </div>
                <input type="text" value="${name}" class="team-name-input flex-grow bg-transparent font-black text-slate-900 uppercase tracking-widest outline-none px-4 text-base focus:text-blue-600 transition-colors" placeholder="Team Name...">
                <button onclick="this.closest('.team-item').remove()" class="text-slate-200 hover:text-red-500 transition-colors px-4 text-xl" title="Remove Team">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>`;
    },

    addItem() {
        const container = document.getElementById('team-list-ui');
        if (!container) return;
        
        const temp = document.createElement('div');
        temp.innerHTML = this.buildTeamItem('New Team');
        
        // Remove empty state message if it exists
        const emptyState = container.querySelector('.py-20');
        if (emptyState) emptyState.remove();
        
        container.prepend(temp.firstElementChild);
        
        // Focus the newly added input
        const input = container.querySelector('.team-name-input');
        if (input) {
            input.focus();
            input.select();
        }
    },

    async save() {
        const teams = Array.from(document.querySelectorAll('.team-name-input'))
            .map(i => i.value.trim())
            .filter(v => v !== "");
            
        const auditMeta = await PortalAdminUI.requestAuditDetails();
        if (await PortalAdminAPI.saveStratum('teams', teams, auditMeta)) {
            alert("Teams saved.");
            this.render(document.getElementById('admin-content-target'));
        }
    }
};