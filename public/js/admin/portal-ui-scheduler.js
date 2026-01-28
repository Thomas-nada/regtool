/**
 * System Scheduler
 * Registration and editing window configuration with UTC enforcement.
 */
const PortalScheduler = {
    render(container) {
        const formatForInput = (iso) => {
            if (!iso) return '';
            try {
                const date = new Date(iso);
                // Convert UTC time to a local ISO-like string that datetime-local understands
                return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
            } catch (e) {
                console.error("Invalid ISO string:", iso);
                return '';
            }
        };

        container.innerHTML = `
            <div class="animate-fadeIn max-w-6xl mx-auto">
                <div class="mb-16 text-center">
                    <h2 class="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">System Scheduler</h2>
                    <p class="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] mt-6">Configure Time Windows (UTC)</p>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <!-- Registration Window -->
                    <div class="glass-card p-12 md:p-16 rounded-[4.5rem] border border-slate-100 shadow-3xl space-y-12 group hover:border-blue-200 transition-all duration-700">
                        <div class="flex items-center justify-between pb-10 border-b border-slate-100">
                            <div>
                                <p class="font-black text-slate-900 uppercase text-lg tracking-tighter">Registration Window</p>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Enable/Disable Registration</p>
                            </div>
                            <input type="checkbox" id="config-isOpen" ${systemConfig.isRegistrationOpen ? 'checked' : ''} class="h-12 w-12 rounded-2xl accent-blue-600 cursor-pointer shadow-lg transition-transform hover:scale-110">
                        </div>
                        <div class="space-y-10">
                            <div class="relative">
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-4 ml-4 tracking-[0.2em]">Start Date (UTC)</label>
                                <input type="datetime-local" id="config-regStart" value="${formatForInput(systemConfig.regStart)}" class="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 font-black text-slate-900 focus:bg-white outline-none shadow-inner text-sm transition-all focus:border-blue-400">
                                <i class="fas fa-clock absolute right-8 bottom-6 text-slate-200 pointer-events-none"></i>
                            </div>
                            <div class="relative">
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-4 ml-4 tracking-[0.2em]">End Date (UTC)</label>
                                <input type="datetime-local" id="config-regEnd" value="${formatForInput(systemConfig.regEnd)}" class="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 font-black text-slate-900 focus:bg-white outline-none shadow-inner text-sm transition-all focus:border-blue-400">
                                <i class="fas fa-hourglass-end absolute right-8 bottom-6 text-slate-200 pointer-events-none"></i>
                            </div>
                        </div>
                        <p class="text-[9px] font-medium text-slate-300 italic px-4 uppercase tracking-tighter">Note: All times are enforced server-side in UTC.</p>
                    </div>

                    <!-- Editing Window -->
                    <div class="glass-card p-12 md:p-16 rounded-[4.5rem] border border-slate-100 shadow-3xl space-y-12 group hover:border-indigo-200 transition-all duration-700">
                        <div class="flex items-center justify-between pb-10 border-b border-slate-100">
                            <div>
                                <p class="font-black text-slate-900 uppercase text-lg tracking-tighter">Profile Management</p>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Enable/Disable Editing</p>
                            </div>
                            <input type="checkbox" id="checkbox-isEditOpen" ${systemConfig.isEditingOpen ? 'checked' : ''} class="h-12 w-12 rounded-2xl accent-indigo-600 cursor-pointer shadow-lg transition-transform hover:scale-110">
                        </div>
                        <div class="space-y-10">
                            <div class="relative">
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-4 ml-4 tracking-[0.2em]">Edit Start (UTC)</label>
                                <input type="datetime-local" id="config-editStart" value="${formatForInput(systemConfig.editStart)}" class="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 font-black text-slate-900 focus:bg-white outline-none shadow-inner text-sm transition-all focus:border-indigo-400">
                                <i class="fas fa-clock absolute right-8 bottom-6 text-slate-200 pointer-events-none"></i>
                            </div>
                            <div class="relative">
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-4 ml-4 tracking-[0.2em]">Edit End (UTC)</label>
                                <input type="datetime-local" id="config-editEnd" value="${formatForInput(systemConfig.editEnd)}" class="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 font-black text-slate-900 focus:bg-white outline-none shadow-inner text-sm transition-all focus:border-indigo-400">
                                <i class="fas fa-hourglass-end absolute right-8 bottom-6 text-slate-200 pointer-events-none"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-20 flex flex-col items-center gap-10">
                    <button onclick="PortalAdminUI.saveConfig()" class="w-full max-w-xl py-9 bg-slate-900 text-white font-black uppercase text-[12px] tracking-[0.4em] rounded-[3.5rem] shadow-3xl hover:bg-black transition-all transform active:scale-95">
                        Save Configuration
                    </button>
                    <p class="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">Changes require saving to persist</p>
                </div>
            </div>`;
    },

    async save() {
        const getISO = (id) => { 
            const val = document.getElementById(id)?.value; 
            if (!val) return null;
            // Create a date assuming the input is UTC, then convert to ISO
            const d = new Date(val);
            return new Date(d.getTime()).toISOString(); 
        };
        
        const config = { 
            isRegistrationOpen: document.getElementById('config-isOpen').checked, 
            isEditingOpen: document.getElementById('checkbox-isEditOpen').checked,
            regStart: getISO('config-regStart'),
            regEnd: getISO('config-regEnd'),
            editStart: getISO('config-editStart'),
            editEnd: getISO('config-editEnd')
        };
        
        const auditMeta = await PortalAdminUI.requestAuditDetails();
        if (!auditMeta) return;

        const success = await PortalAdminAPI.updateSystemConfig(config, auditMeta);
        if (success) {
            systemConfig = config;
            alert("Configuration saved.");
            PortalAdminUI.render();
        }
    }
};