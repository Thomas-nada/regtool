/**
 * Form Engine
 * Dynamic UI generation, consortium roster management, and social/image field handling.
 */

function renderCurrentFormArchitecture() {
    const container = document.getElementById('form-steps-container');
    if (!container) return;

    container.innerHTML = '';
    const stages = formConfig[currentType] || [];

    if (stages.length === 0) {
        container.innerHTML = `
            <div class="py-32 text-center animate-fadeIn">
                <i class="fas fa-layer-group text-slate-100 text-5xl mb-6"></i>
                <p class="text-slate-300 font-black uppercase tracking-widest text-[10px]">No Configuration Found</p>
            </div>`;
        return;
    }

    stages.forEach((stage, sIdx) => {
        const stageWrapper = document.createElement('div');
        stageWrapper.className = "step-content space-y-6 animate-fadeIn";
        stageWrapper.style.display = "none";
        stageWrapper.id = `step-${sIdx}`;

        const header = document.createElement('div');
        header.className = "mb-6 border-l-4 border-blue-600 pl-5 py-1";
        header.innerHTML = `
            <p class="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1">Module ${sIdx + 1}/${stages.length}</p>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight leading-none">${stage.title || 'Section'}</h3>
        `;
        stageWrapper.appendChild(header);

        if (stage.isRoster) {
            const rosterLayout = document.createElement('div');
            rosterLayout.className = "space-y-6";
            rosterLayout.innerHTML = `
                <button type="button" onclick="addRosterItem(${sIdx})"
                    class="w-full py-8 border-2 border-dashed border-slate-100 rounded-2xl font-black text-slate-300 uppercase tracking-[0.3em] text-[9px] hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/20 transition-all active:scale-[0.99]">
                    <i class="fas fa-plus-circle mr-3 text-base"></i> Add Roster Entry
                </button>
                <div id="roster-list-${sIdx}" class="space-y-4"></div>`;
            stageWrapper.appendChild(rosterLayout);

            if (!rosters[sIdx]) rosters[sIdx] = [];
            renderRosterItems(sIdx);
        } else {
            const gridContainer = document.createElement('div');
            gridContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1";

            if (stage.fields && Array.isArray(stage.fields)) {
                stage.fields.forEach(field => {
                    const component = createFieldComponent(field);
                    if (field.type === 'textarea' || field.type === 'social' || field.type === 'checkbox') {
                        component.classList.add('md:col-span-2');
                    }
                    gridContainer.appendChild(component);
                });
            }
            stageWrapper.appendChild(gridContainer);
        }
        container.appendChild(stageWrapper);
    });

    evaluateConditionalLogic();
}

function createFieldComponent(field) {
    const group = document.createElement('div');
    group.id = `wrapper-${field.name}`;
    group.className = "form-group mb-5 transition-all duration-700";

    const baseCSS = "w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-600/5 focus:border-blue-500 outline-none transition-all text-sm bg-white font-bold shadow-sm placeholder:text-slate-200";
    const valAttr = `data-required="${field.required}" data-regex="${field.regex || ''}" data-min="${field.minLength || ''}" data-max="${field.maxLength || ''}"`;

    let labelMarkup = `
        <label class="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            <span>${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</span>
            ${field.maxLength ? `<span id="counter-${field.name}" class="text-[8px] text-slate-300 font-mono tracking-tight">0/${field.maxLength}</span>` : ''}
        </label>`;

    let inputMarkup = '';

    switch(field.type) {
        case 'checkbox':
            const linkLabel = field.linkLabel || '';
            const linkUrl = field.linkUrl || '';
            let finalLabelContent = field.label;

            if (linkLabel && linkUrl) {
                const linkHTML = `<a href="${linkUrl}" target="_blank" class="text-blue-600 underline hover:text-blue-800 transition-colors cursor-pointer font-bold mx-1" onclick="event.stopPropagation();">${linkLabel}</a>`;
                if (field.label.includes(linkLabel)) {
                    finalLabelContent = field.label.replace(linkLabel, linkHTML);
                } else {
                    finalLabelContent = `${field.label} ${linkHTML}`;
                }
            }

            labelMarkup = '';
            inputMarkup = `
                <div class="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-blue-200 transition-all cursor-pointer" onclick="this.querySelector('input').click()">
                    <input type="checkbox" name="${field.name}" ${valAttr}
                        class="h-4 w-4 mt-0.5 accent-blue-600 cursor-pointer rounded border-slate-200"
                        onchange="evaluateConditionalLogic(); triggerCandidateAutoSave();">
                    <span class="text-xs font-bold text-slate-600 select-none leading-relaxed">
                        ${finalLabelContent}
                    </span>
                </div>`;
            break;

        case 'social':
            inputMarkup = `
                <div class="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${['x', 'github', 'linkedin', 'telegram', 'discord', 'website'].map(p => `
                            <button type="button" onclick="toggleSocialPlatform('${field.name}', '${p}')" id="social-btn-${field.name}-${p}"
                                class="h-9 w-9 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-base text-slate-300 hover:text-blue-600 transition-all">
                                <i class="${p === 'website' ? 'fas fa-globe' : (p === 'x' ? 'fab fa-x-twitter' : 'fab fa-'+p)}"></i>
                            </button>`).join('')}
                    </div>
                    <div id="social-inputs-${field.name}" class="space-y-2"></div>
                    <input type="hidden" name="${field.name}" id="data-store-${field.name}" value="{}">
                </div>`;
            break;

        case 'textarea':
            inputMarkup = `<textarea name="${field.name}" class="${baseCSS} resize-none leading-relaxed" rows="3" ${valAttr} oninput="updateCharCounter(this, '${field.name}', ${field.maxLength || 999999})"></textarea>`;
            break;

        case 'image':
            inputMarkup = `
                <div class="relative flex items-center gap-4">
                    <input type="file" id="file-${field.name}" accept="image/*" onchange="handleImageUpload(event, '${field.name}')" class="hidden">
                    <label for="file-${field.name}" class="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-sm active:scale-95">
                        <i class="fas fa-cloud-arrow-up text-sm"></i>
                        <span id="label-text-${field.name}">Upload Profile Image</span>
                    </label>
                    <div id="preview-${field.name}" class="hidden inline-flex items-center animate-fadeIn relative group/preview">
                         <div class="h-10 w-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm mr-2">
                            <img src="" class="h-full w-full object-cover">
                         </div>
                         <button type="button" onclick="removeImage('${field.name}')" class="h-6 w-6 bg-red-50 text-red-500 rounded-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                         </button>
                    </div>
                </div>`;
            break;

        case 'select':
            const options = (field.options || []).map(o => `<option value="${o}">${o}</option>`).join('');
            const selectCSS = baseCSS.replace('w-full', 'w-fit min-w-[160px]');
            inputMarkup = `
                <div class="relative w-fit">
                    <select name="${field.name}" class="${selectCSS} appearance-none cursor-pointer pr-10" onchange="evaluateConditionalLogic(); triggerCandidateAutoSave();">
                        ${options}
                    </select>
                    <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xs"></i>
                </div>`;
            break;

        default:
            inputMarkup = `<input type="${field.type}" name="${field.name}" class="${baseCSS}" ${valAttr} oninput="evaluateConditionalLogic(); triggerCandidateAutoSave();">`;
    }

    group.innerHTML = labelMarkup + inputMarkup;
    if (field.helper) {
        group.innerHTML += `
            <div class="flex items-start gap-2 mt-2 ml-1 animate-fadeIn opacity-70">
                <i class="fas fa-info-circle text-blue-400 text-[10px] mt-0.5"></i>
                <p class="text-[11px] text-slate-500 leading-tight font-medium max-w-xl">${field.helper}</p>
            </div>`;
    }
    return group;
}

// Roster functions
window.addRosterItem = function(stageIdx) {
    const uniqueId = `ID_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const model = { _id: uniqueId };
    const arch = formConfig[currentType][stageIdx];
    arch.fields.forEach(f => {
        if (f.type === 'social') model[f.name] = {};
        else model[f.name] = '';
    });
    rosters[stageIdx].unshift(model);
    renderRosterItems(stageIdx);
    if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
};

window.renderRosterItems = function(stageIndex) {
    const list = document.getElementById(`roster-list-${stageIndex}`);
    if (!list) return;
    const config = formConfig[currentType][stageIndex];
    const items = rosters[stageIndex] || [];

    if (items.length === 0) {
        list.innerHTML = `<div class="py-10 border-2 border-dashed border-slate-50 rounded-2xl text-center opacity-40"><p class="text-slate-300 text-[9px] font-black uppercase tracking-widest">No Members Registered</p></div>`;
        return;
    }

    list.innerHTML = items.map((item, idx) => {
        const fieldsHtml = config.fields.map(field => {
            const val = item[field.name] || '';
            let componentHtml = "";

            if (field.type === 'image') {
                const uniqueId = `roster-file-${stageIndex}-${idx}-${field.name}`;
                componentHtml = `
                    <div class="md:col-span-2">
                        <label class="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">${field.label}</label>
                        <div class="flex items-center gap-4">
                            <input type="file" id="${uniqueId}" accept="image/*" onchange="handleRosterImage(event, ${stageIndex}, ${idx}, '${field.name}')" class="hidden">
                            <label for="${uniqueId}" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-sm active:scale-95">
                                <i class="fas fa-upload"></i> ${val ? 'Change' : 'Upload'}
                            </label>
                            ${val ? `
                                <div class="inline-flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-100 shadow-sm animate-fadeIn">
                                    <div class="h-9 w-9 rounded-lg overflow-hidden border border-slate-100">
                                        <img src="${val}" class="h-full w-full object-cover">
                                    </div>
                                    <button type="button" onclick="removeRosterImage(${stageIndex}, ${idx}, '${field.name}')" class="h-6 w-6 bg-red-50 text-red-400 rounded-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                        <i class="fas fa-times text-[10px]"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>`;
            } else if (field.type === 'social') {
                const socialData = typeof val === 'string' ? JSON.parse(val || '{}') : (val || {});
                const platforms = ['x', 'github', 'linkedin', 'telegram', 'discord', 'website'];
                const activeInputsHtml = Object.entries(socialData).map(([p, handle]) => {
                    if (!handle) return '';
                    const icon = p === 'website' ? 'fas fa-globe' : (p === 'x' ? 'fab fa-x-twitter' : 'fab fa-'+p);
                    return `<div class="flex items-center gap-2 p-1.5 bg-white rounded-md border border-slate-100 shadow-sm"><i class="${icon} text-slate-300 text-[10px]"></i><span class="text-[10px] font-bold text-slate-900">${handle}</span></div>`;
                }).join('');

                componentHtml = `
                    <div class="md:col-span-2 bg-slate-50/30 p-4 rounded-xl border border-slate-100 mt-2">
                        <label class="block text-[8px] font-black text-slate-400 uppercase mb-3 ml-1">${field.label}</label>
                        <div class="flex flex-wrap gap-1.5 mb-3">
                            ${platforms.map(p => {
                                const isActive = socialData[p] ? 'text-blue-600 bg-white border-blue-100 shadow-sm' : 'text-slate-300 bg-transparent border-transparent';
                                return `<button type="button" onclick="toggleRosterSocialPlatform(${stageIndex}, ${idx}, '${field.name}', '${p}')" class="h-7 w-7 border rounded flex items-center justify-center text-xs transition-all ${isActive}"><i class="${p === 'website' ? 'fas fa-globe' : (p === 'x' ? 'fab fa-x-twitter' : 'fab fa-'+p)}"></i></button>`;
                            }).join('')}
                        </div>
                        <div id="social-inputs-${stageIndex}-${idx}-${field.name}" class="grid grid-cols-2 gap-2">${activeInputsHtml}</div>
                    </div>`;
            } else if (field.type === 'select') {
                const options = (field.options || []).map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('');
                componentHtml = `
                    <div class="w-fit">
                        <label class="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">${field.label}</label>
                        <div class="relative w-fit">
                            <select onchange="rosters[${stageIndex}][${idx}]['${field.name}'] = this.value; triggerCandidateAutoSave();"
                                class="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-black focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-sm appearance-none pr-8 min-w-[140px]">
                                ${options}
                            </select>
                            <i class="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[8px]"></i>
                        </div>
                    </div>`;
            } else {
                componentHtml = `<div><label class="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">${field.label}</label><input type="${field.type}" value="${val}" oninput="rosters[${stageIndex}][${idx}]['${field.name}'] = this.value; triggerCandidateAutoSave();" class="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-black focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-sm"></div>`;
            }
            return componentHtml;
        }).join('');

        return `
            <div class="p-5 bg-white border border-slate-100 rounded-2xl relative animate-fadeIn shadow-md group">
                <button type="button" onclick="rosters[${stageIndex}].splice(${idx}, 1); renderRosterItems(${stageIndex}); triggerCandidateAutoSave();" class="absolute top-3 right-3 h-7 w-7 bg-slate-50 text-slate-200 hover:bg-red-500 hover:text-white rounded-md transition-all flex items-center justify-center"><i class="fas fa-trash-alt text-[10px]"></i></button>
                <div class="flex items-center gap-3 mb-5"><div class="h-7 w-7 bg-blue-600 text-white rounded-md flex items-center justify-center text-[9px] font-black shadow-sm">#${idx + 1}</div><h4 class="text-sm font-black text-slate-900 tracking-tight uppercase">Member</h4></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">${fieldsHtml}</div>
            </div>`;
    }).join('');
};

// Social platform functions
window.toggleSocialPlatform = function(fieldName, platform, skipUpdate = false) {
    const container = document.getElementById(`social-inputs-${fieldName}`);
    const btn = document.getElementById(`social-btn-${fieldName}-${platform}`);
    const existing = document.getElementById(`social-input-row-${fieldName}-${platform}`);

    if (existing) {
        existing.remove();
        btn.classList.replace('text-blue-600', 'text-slate-300');
    } else {
        const row = document.createElement('div');
        row.id = `social-input-row-${fieldName}-${platform}`;
        row.className = "flex items-center gap-3 animate-fadeIn p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm";
        const icon = platform === 'website' ? 'fas fa-globe' : (platform === 'x' ? 'fab fa-x-twitter' : 'fab fa-'+platform);
        row.innerHTML = `<i class="${icon} text-slate-300 ml-1 text-xs"></i><input type="text" placeholder="${platform.toUpperCase()}" oninput="updateSocialData('${fieldName}')" class="social-val flex-grow bg-transparent font-bold text-slate-900 outline-none text-xs" data-platform="${platform}"><button type="button" onclick="toggleSocialPlatform('${fieldName}', '${platform}')" class="text-slate-200 hover:text-red-500 px-1.5"><i class="fas fa-times"></i></button>`;
        container.appendChild(row);
        btn.classList.replace('text-slate-300', 'text-blue-600');
    }
    if (!skipUpdate) updateSocialData(fieldName);
};

window.updateSocialData = function(fieldName) {
    const data = {};
    document.querySelectorAll(`#social-inputs-${fieldName} .social-val`).forEach(input => data[input.dataset.platform] = input.value.trim());
    const store = document.getElementById(`data-store-${fieldName}`);
    if (store) store.value = JSON.stringify(data);
    if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
};

// Backwards compatibility alias
window.updateSocialStrata = window.updateSocialData;

window.hydrateSocialHub = function(fieldName, socialData) {
    if (!socialData) return;
    const data = typeof socialData === 'string' ? JSON.parse(socialData) : socialData;
    Object.entries(data).forEach(([p, handle]) => {
        if (handle) {
            toggleSocialPlatform(fieldName, p, true);
            const row = document.getElementById(`social-input-row-${fieldName}-${p}`);
            const input = row?.querySelector('.social-val');
            if (input) input.value = handle;
        }
    });
    updateSocialData(fieldName);
};

window.toggleRosterSocialPlatform = function(sIdx, iIdx, fieldName, platform, skipUpdate = false) {
    const container = document.getElementById(`social-inputs-${sIdx}-${iIdx}-${fieldName}`);
    const rowId = `social-row-${sIdx}-${iIdx}-${fieldName}-${platform}`;
    const existing = document.getElementById(rowId);

    if (existing) {
        existing.remove();
    } else {
        const row = document.createElement('div');
        row.id = rowId;
        row.className = "flex items-center gap-2 p-2 bg-white rounded-md border border-slate-100 shadow-sm animate-fadeIn";
        const icon = platform === 'website' ? 'fas fa-globe' : (platform === 'x' ? 'fab fa-x-twitter' : 'fab fa-' + platform);
        row.innerHTML = `<i class="${icon} text-slate-300 text-[10px]"></i><input type="text" placeholder="${platform.toUpperCase()}" oninput="updateRosterSocialData(${sIdx}, ${iIdx}, '${fieldName}')" class="social-val flex-grow bg-transparent font-bold text-slate-900 outline-none text-[10px]" data-platform="${platform}">`;
        container.appendChild(row);
    }
    if (!skipUpdate) updateRosterSocialData(sIdx, iIdx, fieldName);
};

window.updateRosterSocialData = function(sIdx, iIdx, fieldName) {
    const data = {};
    document.querySelectorAll(`#social-inputs-${sIdx}-${iIdx}-${fieldName} .social-val`).forEach(input => data[input.dataset.platform] = input.value.trim());
    rosters[sIdx][iIdx][fieldName] = data;
    if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
};

// Backwards compatibility alias
window.updateRosterSocialStrata = window.updateRosterSocialData;

window.hydrateRosterSocialHub = function(sIdx, iIdx, fieldName, socialData) {
    if (!socialData) return;
    const data = typeof socialData === 'string' ? JSON.parse(socialData) : socialData;
    Object.entries(data).forEach(([platform, handle]) => {
        if (handle) {
            toggleRosterSocialPlatform(sIdx, iIdx, fieldName, platform, true);
            const rowId = `social-row-${sIdx}-${iIdx}-${fieldName}-${platform}`;
            const input = document.querySelector(`#${rowId} .social-val`);
            if (input) input.value = handle;
        }
    });
    updateRosterSocialData(sIdx, iIdx, fieldName);
};

// Image handlers
window.handleImageUpload = function(event, fieldName) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.getElementById(`preview-${fieldName}`);
        if (preview) {
            preview.classList.remove('hidden');
            preview.querySelector('img').src = reader.result;
        }
        const labelText = document.getElementById(`label-text-${fieldName}`);
        if (labelText) labelText.innerText = "Change Image";

        let hiddenStore = document.getElementById(`data-store-${fieldName}`);
        if (!hiddenStore) {
            hiddenStore = document.createElement('input');
            hiddenStore.type = 'hidden';
            hiddenStore.id = `data-store-${fieldName}`;
            hiddenStore.name = fieldName;
            document.getElementById('regForm').appendChild(hiddenStore);
        }
        hiddenStore.value = reader.result;
        if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
    };
    reader.readAsDataURL(file);
};

window.removeImage = function(fieldName) {
    const preview = document.getElementById(`preview-${fieldName}`);
    if (preview) preview.classList.add('hidden');

    const labelText = document.getElementById(`label-text-${fieldName}`);
    if (labelText) labelText.innerText = "Upload Profile Image";

    const hiddenStore = document.getElementById('data-store-' + fieldName);
    if (hiddenStore) hiddenStore.value = "";

    const fileInput = document.getElementById('file-' + fieldName);
    if (fileInput) fileInput.value = "";

    if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
};

window.handleRosterImage = function(event, sIdx, iIdx, key) {
    const reader = new FileReader();
    reader.onload = () => {
        rosters[sIdx][iIdx][key] = reader.result;
        renderRosterItems(sIdx);
        if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
    };
    reader.readAsDataURL(event.target.files[0]);
};

window.removeRosterImage = function(sIdx, iIdx, key) {
    if (rosters[sIdx] && rosters[sIdx][iIdx]) {
        rosters[sIdx][iIdx][key] = "";
        renderRosterItems(sIdx);
        if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
    }
};

function updateCharCounter(input, fieldName, max) {
    const counter = document.getElementById(`counter-${fieldName}`);
    if (counter) counter.textContent = `${input.value.length}/${max}`;
    if (typeof triggerCandidateAutoSave === 'function') triggerCandidateAutoSave();
}

function evaluateConditionalLogic() {
    const form = document.getElementById('regForm');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    (formConfig[currentType] || []).forEach(stage => {
        if (stage.isRoster || !stage.fields) return;
        stage.fields.forEach(field => {
            const wrapper = document.getElementById(`wrapper-${field.name}`);
            if (wrapper && field.logicField) wrapper.classList.toggle('hidden', String(data[field.logicField]) !== String(field.logicValue));
        });
    });
}
