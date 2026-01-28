/**
 * Form Builder UI
 * Manages form sections and questions for registration tracks.
 */
const PortalArchitect = {
    async render(container) {
        const schema = await PortalAdminAPI.fetchStratum('questions');
        if (!schema) return;

        const tracks = Object.keys(schema);

        if (PortalAdminUI.activeArchitectTrack === null && tracks.length > 0) {
            PortalAdminUI.activeArchitectTrack = tracks[0];
        }

        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-12">
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Form Builder</h2>
                        <p class="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4">Manage Registration Questions</p>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="PortalArchitect.addNewTrack()" class="bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all flex items-center gap-3">
                            <i class="fas fa-folder-plus text-blue-600"></i> Create New Track
                        </button>
                        <button onclick="PortalArchitect.save()" class="bg-blue-600 text-white px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 hover:bg-blue-700 transition-all flex items-center gap-3">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>

                <div class="flex bg-slate-100 p-2.5 rounded-[1.8rem] gap-2 mb-20 shadow-inner border border-slate-200/50">
                    ${tracks.map(t => `
                        <button onclick="PortalArchitect.setTrack('${t}')"
                            class="flex-1 px-10 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 ${PortalAdminUI.activeArchitectTrack === t ? 'bg-white text-blue-600 shadow-2xl scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}">
                            ${t}
                        </button>
                    `).join('')}
                </div>

                <div id="architect-workspace" class="space-y-12">
                    ${PortalAdminUI.activeArchitectTrack ? this.buildTrackUI(PortalAdminUI.activeArchitectTrack, schema[PortalAdminUI.activeArchitectTrack]) : ''}
                </div>
            </div>`;
    },

    setTrack(trackName) {
        PortalAdminUI.activeArchitectTrack = trackName;
        PortalAdminUI.render();
    },

    async addNewTrack() {
        const name = prompt("Enter the name for the new Registration Track:");
        if (!name || name.trim() === "") return;

        const schema = await PortalAdminAPI.fetchStratum('questions') || {};
        if (schema[name]) return alert("Track already exists.");

        schema[name] = [];
        if (await PortalAdminAPI.saveStratum('questions', schema)) {
            PortalAdminUI.activeArchitectTrack = name;
            PortalAdminUI.render();
        }
    },

    buildTrackUI(trackName, stages) {
        return `
            <div class="track-block animate-fadeIn" data-track="${trackName}">
                <div class="flex items-center gap-8 mb-12">
                    <div class="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl">Track: ${trackName}</div>
                    <div class="h-px bg-slate-200 flex-grow opacity-40"></div>
                    <button onclick="PortalArchitect.deleteTrack('${trackName}')" class="text-slate-300 hover:text-red-500 transition-all px-6 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-trash-can"></i> Delete Track
                    </button>
                </div>

                <div class="space-y-16 stage-list">
                    ${stages.length > 0 ? stages.map((stage, sIdx) => this.buildStageUI(stage, sIdx)).join('') : `
                        <div class="py-20 text-center opacity-30 font-black uppercase tracking-widest text-[10px]">No sections added to this track.</div>
                    `}
                </div>

                <button onclick="PortalArchitect.addStage(this)" class="w-full mt-12 py-12 border-4 border-dashed border-slate-100 rounded-[4rem] text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all duration-700 bg-white/40">
                    <i class="fas fa-plus-circle mr-4 text-lg"></i> Add Section
                </button>
            </div>`;
    },

    buildStageUI(stage, sIdx) {
        const rosterClass = stage.isRoster ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-100';
        return `
            <div class="glass-card rounded-[4rem] p-12 md:p-16 border-2 ${rosterClass} shadow-3xl stage-node relative group transition-all duration-500" data-stage-index="${sIdx}">
                <div class="flex flex-col lg:flex-row gap-10 mb-12 pb-12 border-b border-slate-100">
                    <div class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-3 tracking-widest">Section Title</label>
                            <input type="text" value="${stage.title}" class="stage-title w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 text-lg font-black text-slate-900 focus:bg-white outline-none transition-all shadow-inner">
                        </div>
                        <div class="flex items-center gap-10 pt-8 md:pt-6 px-4">
                            <label class="relative inline-flex items-center cursor-pointer group">
                                <input type="checkbox" onchange="PortalArchitect.handleRosterToggle(this)" class="stage-isRoster sr-only peer" ${stage.isRoster ? 'checked' : ''}>
                                <div class="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                <span class="ml-6 text-[11px] font-black text-slate-900 uppercase tracking-widest">Roster Mode</span>
                            </label>
                        </div>
                    </div>
                    <button onclick="this.closest('.stage-node').remove()" class="h-16 w-16 flex items-center justify-center bg-red-50 text-red-400 rounded-3xl hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-900/5"><i class="fas fa-times text-lg"></i></button>
                </div>

                <div class="field-list">
                    <div class="questions-container space-y-10">
                        ${stage.fields.map(field => this.buildFieldRow(field)).join('')}
                    </div>
                    <div class="pt-12 flex justify-center">
                        <button onclick="PortalArchitect.addField(this)" class="px-12 py-5 bg-slate-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95">
                            <i class="fas fa-plus-circle mr-3"></i> Add Field
                        </button>
                    </div>
                </div>
            </div>`;
    },

    handleRosterToggle(checkbox) {
        const node = checkbox.closest('.stage-node');
        if (checkbox.checked) node.classList.add('border-blue-400', 'ring-4', 'ring-blue-50');
        else node.classList.remove('border-blue-400', 'ring-4', 'ring-blue-50');
    },

    buildFieldRow(field) {
        const types = ['text', 'textarea', 'email', 'select', 'checkbox', 'terms', 'image', 'number', 'social'];
        const optionsStr = (field.options || []).join(', ');

        const isTerms = (field.name === 'cc_terms_agreement' || field.type === 'terms');
        const currentType = isTerms ? 'terms' : field.type;

        const showSelectExtras = currentType === 'select' ? '' : 'hidden';
        const showCheckExtras = currentType === 'checkbox' ? '' : 'hidden';

        return `
            <div class="field-row p-8 bg-slate-50/50 rounded-[3rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all duration-500 group relative animate-fadeIn">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    <div class="md:col-span-3">
                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-3">Label</label>
                        <div class="label-container relative">
                            <input type="text" value="${field.label}" class="field-label w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 focus:border-blue-400 outline-none shadow-sm transition-all ${isTerms ? 'hidden' : ''}">
                            <div class="terms-preview flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-[11px] font-black text-slate-700 ${isTerms ? '' : 'hidden'}">
                                <i class="fas fa-check-square text-blue-600"></i>
                                <span>I agree to the <a href="terms.html" target="_blank" class="underline text-blue-600 font-bold">Terms and Conditions</a></span>
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-3">Type</label>
                        <div class="relative">
                            <select onchange="PortalArchitect.toggleFieldExtras(this)" class="field-type w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase appearance-none cursor-pointer focus:border-blue-400 outline-none">
                                ${types.map(t => `<option value="${t}" ${currentType === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                            <i class="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-3">Field Name</label>
                        <input type="text" value="${isTerms ? 'cc_terms_agreement' : field.name}" ${isTerms ? 'readonly' : ''} class="field-name w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[10px] font-mono text-blue-600 focus:border-blue-400 outline-none ${isTerms ? 'opacity-70 bg-slate-50' : ''}">
                    </div>
                    <div class="md:col-span-4 flex items-end gap-6 pb-2">
                        <label class="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" ${isTerms ? 'disabled' : ''} class="field-required h-6 w-6 rounded-lg accent-blue-600 cursor-pointer" ${field.required || isTerms ? 'checked' : ''}>
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Required</span>
                        </label>
                        <div class="flex-grow ${isTerms ? 'invisible' : ''}">
                            <label class="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2 ml-3 italic">Show When</label>
                            <input type="text" value="${field.logicField || ''}" class="field-logic-field w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-mono" placeholder="Field Name">
                        </div>
                    </div>
                    <div class="md:col-span-1 flex justify-end items-center">
                        <button onclick="this.closest('.field-row').remove()" class="text-slate-300 hover:text-red-500 transition-colors text-lg"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>

                <div class="field-options-container ${showSelectExtras} border-t border-slate-100 pt-6 mb-6">
                    <label class="block text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-3 ml-3">Options (Comma Separated)</label>
                    <input type="text" value="${optionsStr}" class="field-options-input w-full bg-white border border-emerald-100 rounded-2xl px-6 py-4 text-xs font-bold text-emerald-700 focus:border-emerald-400 outline-none shadow-sm">
                </div>

                <div class="field-checkbox-extras ${showCheckExtras} border-t border-slate-100 pt-6 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input type="text" value="${field.linkLabel || ''}" placeholder="Link Text" class="field-link-label w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold text-blue-700 outline-none">
                        <input type="text" value="${field.linkUrl || ''}" placeholder="Link URL" class="field-link-url w-full bg-white border border-blue-50 rounded-2xl px-6 py-4 text-xs font-mono text-blue-800 outline-none">
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-6 flex flex-col md:flex-row gap-8 ${isTerms ? 'hidden' : ''}">
                    <div class="flex-grow">
                        <label class="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-3 ml-3">Helper Text</label>
                        <textarea class="field-helper w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-xs font-medium text-slate-600 focus:bg-slate-50 outline-none transition-all" rows="2" placeholder="Help text for this field...">${field.helper || ''}</textarea>
                    </div>
                    <div class="w-full md:w-40">
                        <label class="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-3 ml-3 italic">Logic Value</label>
                        <input type="text" value="${field.logicValue || 'true'}" class="field-logic-value w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-blue-600 text-center shadow-inner">
                    </div>
                </div>
            </div>`;
    },

    toggleFieldExtras(select) {
        const row = select.closest('.field-row');
        const type = select.value;
        const labelInput = row.querySelector('.field-label');
        const termsPreview = row.querySelector('.terms-preview');
        const nameInput = row.querySelector('.field-name');
        const requiredCheck = row.querySelector('.field-required');
        const optContainer = row.querySelector('.field-options-container');
        const checkContainer = row.querySelector('.field-checkbox-extras');
        const bottomSection = row.querySelector('.border-t:last-child');

        row.querySelectorAll('input, select, textarea').forEach(el => {
            el.classList.remove('opacity-80', 'cursor-not-allowed', 'bg-blue-50/20');
            el.removeAttribute('readonly');
            el.removeAttribute('disabled');
        });

        if (type === 'terms') {
            if (labelInput) labelInput.classList.add('hidden');
            if (termsPreview) termsPreview.classList.remove('hidden');
            if (labelInput) labelInput.value = 'I agree to the <a href="terms.html" target="_blank" class="underline text-blue-600 font-bold">Terms and Conditions</a>';
            if (nameInput) {
                nameInput.value = 'cc_terms_agreement';
                nameInput.setAttribute('readonly', true);
                nameInput.classList.add('opacity-80', 'bg-blue-50/20');
            }
            if (requiredCheck) {
                requiredCheck.checked = true;
                requiredCheck.setAttribute('disabled', true);
            }
            if (optContainer) optContainer.classList.add('hidden');
            if (checkContainer) checkContainer.classList.add('hidden');
            if (bottomSection) bottomSection.classList.add('hidden');
        } else {
            if (labelInput) labelInput.classList.remove('hidden');
            if (termsPreview) termsPreview.classList.add('hidden');
            if (optContainer) optContainer.classList.toggle('hidden', type !== 'select');
            if (checkContainer) checkContainer.classList.toggle('hidden', type !== 'checkbox');
            if (bottomSection) bottomSection.classList.remove('hidden');
        }
    },

    addStage(btn) {
        const list = btn.previousElementSibling;
        const temp = document.createElement('div');
        temp.innerHTML = this.buildStageUI({ title: 'New Section', isRoster: false, fields: [] }, 99);
        list.appendChild(temp.firstElementChild);
    },

    addField(btn) {
        const stageNode = btn.closest('.stage-node');
        const container = stageNode.querySelector('.questions-container');
        const temp = document.createElement('div');
        temp.innerHTML = this.buildFieldRow({ label: 'New Question', type: 'text', name: 'q' + Date.now(), required: false });
        container.appendChild(temp.firstElementChild);
        temp.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    async deleteTrack(name) {
        if (!confirm(`Delete the '${name}' track? This cannot be undone.`)) return;
        const schema = await PortalAdminAPI.fetchStratum('questions');
        delete schema[name];
        if (await PortalAdminAPI.saveStratum('questions', schema)) {
            PortalAdminUI.activeArchitectTrack = null;
            PortalAdminUI.render();
        }
    },

    async save() {
        const currentSchema = await PortalAdminAPI.fetchStratum('questions');
        const schema = { ...currentSchema };
        const activeTrackEl = document.querySelector('.track-block');

        if (activeTrackEl) {
            const trackName = activeTrackEl.dataset.track;
            const stages = [];

            activeTrackEl.querySelectorAll('.stage-node').forEach(stageEl => {
                const fields = [];
                stageEl.querySelectorAll('.field-row').forEach(row => {
                    const typeEl = row.querySelector('.field-type');
                    if (!typeEl) return;

                    const typeSelectValue = typeEl.value;
                    const finalType = typeSelectValue === 'terms' ? 'checkbox' : typeSelectValue;

                    const fieldLabel = row.querySelector('.field-label')?.value || '';
                    const fieldName = row.querySelector('.field-name')?.value || 'q' + Date.now();
                    const isRequired = typeSelectValue === 'terms' ? true : (row.querySelector('.field-required')?.checked || false);
                    const helperText = typeSelectValue === 'terms' ? null : (row.querySelector('.field-helper')?.value || null);

                    let linkLabel = undefined;
                    let linkUrl = undefined;

                    if (typeSelectValue === 'checkbox') {
                        linkLabel = row.querySelector('.field-link-label')?.value || '';
                        linkUrl = row.querySelector('.field-link-url')?.value || '';
                    } else if (typeSelectValue === 'terms') {
                        linkLabel = "Terms and Conditions";
                        linkUrl = "terms.html";
                    }

                    const fieldObj = {
                        label: fieldLabel,
                        type: finalType,
                        name: fieldName,
                        required: isRequired,
                        helper: helperText,
                        logicField: row.querySelector('.field-logic-field')?.value || null,
                        logicValue: row.querySelector('.field-logic-value')?.value || "true"
                    };

                    if (finalType === 'select') {
                        const optEl = row.querySelector('.field-options-input');
                        fieldObj.options = optEl ? optEl.value.split(',').map(o => o.trim()).filter(o => o) : [];
                    }

                    if (linkLabel) fieldObj.linkLabel = linkLabel;
                    if (linkUrl) fieldObj.linkUrl = linkUrl;

                    fields.push(fieldObj);
                });
                stages.push({ title: stageEl.querySelector('.stage-title').value, isRoster: stageEl.querySelector('.stage-isRoster').checked, fields });
            });
            schema[trackName] = stages;
        }

        const auditMeta = await PortalAdminUI.requestAuditDetails();
        if (await PortalAdminAPI.saveStratum('questions', schema, auditMeta)) {
            alert("Form configuration saved.");
        }
        PortalAdminUI.render();
    }
};

// Backwards compatibility
PortalArchitect.saveArchitectData = PortalArchitect.save;
