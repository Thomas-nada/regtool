/**
 * Portal Main
 * Initialization, routing, and workflow control.
 */
async function initPortal() {
    try {
        
        const res = await fetch('/api/registration-status');
        if (!res.ok) throw new Error("Server unreachable.");

        const configData = await res.json();
        formConfig = configData.questions || {};

        const isEditOpen = configData.isEditOpen;

        const regRecovery = document.getElementById('token-input-container');
        if (regRecovery) {
            regRecovery.classList.toggle('hidden', !isEditOpen);
        }

        const homeRecovery = document.getElementById('home-recovery-container');
        if (homeRecovery) {
            homeRecovery.classList.toggle('hidden', !isEditOpen);
        }

        const regForm = document.getElementById('regForm');
        if (regForm) {
            buildTrackSelector();

            const urlHash = window.location.hash;
            if (urlHash && urlHash.startsWith('#edit-')) {
                if (!isEditOpen) {
                    showToastNotification("The editing window is currently closed.");
                    window.location.hash = "";
                } else {
                    const sessionToken = urlHash.replace('#edit-', '');
                    PortalVault.loadByToken(sessionToken);
                }
            } else if (Object.keys(formConfig).length > 0) {
                const defaultTrack = Object.keys(formConfig)[0];
                setType(defaultTrack);
            }
        }

        if (document.getElementById('candidates-grid')) {
            buildDirectoryFilters();
            PortalDirectory.fetchCandidates();
        }

        if (document.getElementById('status-banner')) {
            updateHomeStatus(configData);
        }

    } catch (err) {
        console.error("Portal initialization failed:", err);
        handlePortalOfflineState();
    }
}

function handlePortalOfflineState() {
    const grid = document.getElementById('candidates-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-span-full py-40 text-center animate-fadeIn">
                <div class="h-32 w-32 bg-red-50 text-red-500 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                    <i class="fas fa-satellite-dish text-5xl"></i>
                </div>
                <h3 class="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Server Offline</h3>
                <p class="text-slate-400 font-medium max-w-xs mx-auto">
                    The server is currently unreachable. Please check your connection and try again.
                </p>
            </div>`;
    }
    showToastNotification("Server is unreachable.");
}

window.setType = function(trackName) {
    if (isEditMode) return;

    currentType = trackName;
    currentStep = 0;
    rosters = {};

    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        const btnId = btn.id.replace('btn-', '');
        const isActive = btnId === trackName;
        
        if (isActive) {
            btn.className = "flex-1 py-6 px-10 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-blue-600 shadow-2xl border border-slate-100";
        } else {
            btn.className = "flex-1 py-6 px-10 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-50/[0.3]";
        }
    });

    if (typeof renderCurrentFormArchitecture === 'function') {
        renderCurrentFormArchitecture();
    }

    transitionStep(0);
};

window.nextPrev = function(direction) {
    const modules = document.getElementsByClassName("step-content");
    if (!modules[currentStep]) return;

    if (direction === 1 && !performIntegrityCheck()) {
        showToastNotification("Please complete all mandatory fields.");
        return;
    }

    modules[currentStep].style.display = "none";
    currentStep += direction;

    if (currentStep >= modules.length) {
        PortalVault.initiateDataVaulting();
        currentStep = modules.length - 1;
        return;
    }

    transitionStep(currentStep);

    const formElement = document.getElementById('regForm');
    if (formElement) {
        const offset = formElement.offsetTop - 150;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    }
};

function transitionStep(index) {
    const modules = document.getElementsByClassName("step-content");
    if (!modules[index]) return;

    for (let i = 0; i < modules.length; i++) {
        modules[i].style.display = "none";
    }
    modules[index].style.display = "block";

    const pBtn = document.getElementById("prevBtn");
    const nBtn = document.getElementById("nextBtn");

    if (pBtn) {
        pBtn.style.display = index === 0 ? "none" : "inline-block";
    }

    if (nBtn) {
        if (index === (modules.length - 1)) {
            const label = isEditMode ? 'Save Changes <i class="fas fa-check-double ml-4"></i>' : 'Submit <i class="fas fa-paper-plane ml-4"></i>';
            nBtn.innerHTML = label;
            nBtn.className = "px-24 py-8 bg-emerald-600 text-white font-black uppercase tracking-[0.4em] text-[11px] rounded-[4rem] shadow-3xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-6 group";
        } else {
            nBtn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-4 group-hover:translate-x-3 transition-transform"></i>';
            nBtn.className = "px-24 py-8 bg-blue-600 text-white font-black uppercase tracking-[0.4em] text-[11px] rounded-[4rem] shadow-3xl hover:bg-blue-700 transition-all flex items-center justify-center gap-6 group";
        }
    }

    document.querySelectorAll('[id^="dot-"]').forEach((dot, i) => {
        if (i <= index) {
            dot.className = "h-3 w-20 rounded-full bg-blue-600 transition-all duration-1000";
        } else {
            dot.className = "h-3 w-14 rounded-full bg-slate-200 transition-all duration-700";
        }
    });

    const stepLabel = document.getElementById('step-counter');
    if (stepLabel) {
        stepLabel.textContent = `STEP ${index + 1} OF ${modules.length}`;
    }

    if (typeof renderRosterItems === 'function') {
        renderRosterItems(index);
    }
}

function performIntegrityCheck() {
    const module = document.getElementById(`step-${currentStep}`);
    if (!module) return false;

    const inputs = module.querySelectorAll('[data-required]');
    let isStepValid = true;

    inputs.forEach(input => {
        if (input.closest('.hidden')) return;

        const val = input.type === 'checkbox' ? input.checked : input.value.trim();
        const required = input.dataset.required === 'true';

        if (required && !val) {
            isStepValid = false;
            input.classList.add('border-red-500', 'bg-red-50/10', 'animate-shake');
            setTimeout(() => input.classList.remove('animate-shake'), 400);
        } else {
            input.classList.remove('border-red-500', 'bg-red-50/10');
        }
    });

    return isStepValid;
}

function buildTrackSelector() {
    const container = document.getElementById('type-selector');
    if (!container) return;
    
    const tracks = Object.keys(formConfig);
    container.innerHTML = tracks.map(t => `
        <button id="btn-${t}" onclick="setType('${t}')" 
            class="flex-1 py-7 px-12 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.4em] transition-all text-slate-500 hover:text-slate-900 border border-transparent hover:bg-slate-50 shadow-inner">
            ${t}
        </button>`).join('');
}

function buildDirectoryFilters() {
    const container = document.getElementById('filter-container');
    if (!container) return;
    
    let html = `<button onclick="setFilter('All')" class="filter-btn px-14 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all bg-blue-600 text-white shadow-3xl border border-blue-600">All Tracks</button>`;
    
    html += Object.keys(formConfig).map(t => `
        <button onclick="setFilter('${t}')" 
            class="filter-btn px-14 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all bg-white text-slate-500 border border-slate-100 hover:bg-slate-50">
            ${t}s
        </button>`).join('');
        
    container.innerHTML = html;
}

function updateHomeStatus(d) {
    const banner = document.getElementById('status-banner');
    const text = document.getElementById('status-text');
    const icon = document.getElementById('status-icon');
    if (!banner) return;
    
    banner.classList.remove('hidden');
    
    if (d.isOpen) {
        banner.className = "bg-blue-600 text-white py-6 px-10 text-center text-[11px] font-black uppercase tracking-[0.6em] shadow-2xl relative z-40 animate-fadeIn";
        if (text) text.textContent = "Registration: OPEN";
        if (icon) icon.className = "fas fa-bolt mr-6 animate-pulse";
    } else {
        banner.className = "bg-slate-950 text-slate-500 py-6 px-10 text-center text-[11px] font-black uppercase tracking-[0.6em] relative z-40";
        if (text) text.textContent = "Registration window is currently closed";
        if (icon) icon.className = "fas fa-lock mr-6";
    }
}

window.accessVault = function() {
    const token = document.getElementById('vault-token')?.value?.trim();
    if (!token) return;
    window.location.href = `register.html#edit-${token}`;
};

window.copyTokenToClipboard = function() {
    const token = document.getElementById('display-token')?.textContent;
    if (!token) return;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(token)
            .then(() => showToastNotification("Token copied to clipboard."))
            .catch(() => fallbackClipboard(token));
    } else {
        fallbackClipboard(token);
    }
};

function fallbackClipboard(text) {
    const el = document.createElement('textarea'); 
    el.value = text; 
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToastNotification("Token copied.");
}

function showToastNotification(msg) {
    const toast = document.getElementById('toast');
    const label = document.getElementById('toast-msg');
    if (toast && label) {
        label.textContent = msg;
        toast.classList.remove('opacity-0', 'translate-y-8');
        toast.classList.add('opacity-100', 'translate-y-0');

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-8');
            toast.classList.remove('opacity-100', 'translate-y-0');
        }, 6000);
    }
}

function deploySuccessModal(id, token) {
    const modal = document.getElementById('success-modal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    document.getElementById('display-entry-id').textContent = '#' + id;
    document.getElementById('display-token').textContent = token;

    setTimeout(() => {
        const container = document.getElementById('modal-container');
        if (container) container.classList.replace('opacity-0', 'opacity-100');
    }, 50);
}

document.addEventListener('DOMContentLoaded', initPortal);