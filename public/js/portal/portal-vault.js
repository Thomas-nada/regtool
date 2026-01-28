/**
 * Portal Vault
 * Backend communication and form data submission/restoration.
 */
const PortalVault = {
    async initiateDataVaulting(isSilent = false) {
        const regForm = document.getElementById('regForm');
        if (!regForm) return;

        const rawFormData = new FormData(regForm);
        const finalizedPayload = {};

        rawFormData.forEach((val, key) => {
            const base64Buffer = document.getElementById(`data-store-${key}`);
            finalizedPayload[key] = (base64Buffer && base64Buffer.value) ? base64Buffer.value : val;
        });

        Object.keys(rosters).forEach(ptr => {
            const architecture = formConfig[currentType][ptr];
            if (architecture) {
                const techKey = architecture.name || architecture.title.replace(/\s+/g, '_').toLowerCase();
                finalizedPayload[techKey] = rosters[ptr];
            }
        });

        const candidacyRecord = {
            applicationType: currentType,
            data: finalizedPayload,
            entryId: activeEntryId,
            editToken: activeEditToken
        };

        const actionNode = document.getElementById("nextBtn");
        const labelBackup = actionNode?.innerHTML;
        
        if (!isSilent && actionNode) {
            actionNode.disabled = true;
            actionNode.innerHTML = '<i class="fas fa-spinner fa-spin mr-6"></i> Saving...';
        }

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(candidacyRecord)
            });

            const serverRes = await response.json();

            if (response.ok) {
                if (isEditMode) {
                    document.getElementById('sync-indicator')?.classList.add('hidden');
                    if (!isSilent) {
                        showToastNotification("Changes saved.");
                        setTimeout(() => window.location.href = 'index.html', 1500);
                    }
                } else {
                    deploySuccessModal(serverRes.entryId, serverRes.editToken);
                }
            } else {
                throw new Error(serverRes.error || "Save failed.");
            }
        } catch (err) {
            console.error("Save error:", err);
            if (!isSilent) {
                alert("Error: " + err.message);
                if (actionNode) {
                    actionNode.disabled = false;
                    actionNode.innerHTML = labelBackup;
                }
            }
        }
    },

    async loadByToken(overrideToken = null) {
        const tokenVal = overrideToken || document.getElementById('vault-token')?.value?.trim();
        if (!tokenVal) return;

        try {
            const res = await fetch('/api/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenVal })
            });

            if (res.ok) {
                const identityRecord = await res.json();

                activeEntryId = identityRecord.entryId;
                activeEditToken = identityRecord.editToken;
                currentType = identityRecord.applicationType;

                document.getElementById('type-selector-container')?.classList.add('hidden');
                document.getElementById('token-input-container')?.classList.add('hidden');
                
                const banner = document.getElementById('edit-banner');
                if (banner) {
                    banner.classList.remove('hidden');
                    const idNode = document.getElementById('active-edit-id');
                    if (idNode) idNode.textContent = '#' + activeEntryId;
                }

                if (typeof window.setType === 'function') {
                    window.setType(currentType); 
                }
                isEditMode = true;

                setTimeout(() => {
                    this.performDeepHydration(identityRecord.data);

                    if (typeof window.transitionStep === 'function') {
                        window.transitionStep(0);
                    } else {
                        const content = document.getElementsByClassName("step-content")[0];
                        if (content) content.style.display = "block";
                    }

                    if (typeof showToastNotification === 'function') {
                        showToastNotification("Profile loaded.");
                    }
                }, 150);

            } else {
                alert("Invalid token.");
            }
        } catch (err) {
            console.error("Load error:", err);
            alert("Error: Could not load profile.");
        }
    },

    performDeepHydration(vaultData) {
        const trackArch = formConfig[currentType] || [];
        const form = document.getElementById('regForm');
        if (!form) return;

        trackArch.forEach((module, mIdx) => {
            const stepKey = module.name || module.title.replace(/\s+/g, '_').toLowerCase();

            if (module.isRoster && Array.isArray(vaultData[stepKey])) {
                rosters[mIdx] = vaultData[stepKey];

                if (typeof renderRosterItems === 'function') {
                    renderRosterItems(mIdx);
                }
            } else if (module.fields) {
                module.fields.forEach(field => {
                    const value = vaultData[field.name];
                    if (value === undefined || value === null) return;

                    if (field.type === 'social') {
                        if (typeof window.hydrateSocialHub === 'function') {
                            window.hydrateSocialHub(field.name, value);
                        }
                    } else if (field.type === 'image') {
                        const preview = document.getElementById(`preview-${field.name}`);
                        if (preview && value) {
                            preview.classList.remove('hidden');
                            const img = preview.querySelector('img');
                            if (img) img.src = value;

                            let hiddenStore = document.getElementById(`data-store-${field.name}`);
                            if (!hiddenStore) {
                                hiddenStore = document.createElement('input');
                                hiddenStore.type = 'hidden';
                                hiddenStore.id = `data-store-${field.name}`;
                                hiddenStore.name = field.name;
                                form.appendChild(hiddenStore);
                            }
                            hiddenStore.value = value;
                        }
                    } else {
                        const node = form.querySelector(`[name="${field.name}"]`);
                        if (node) {
                            if (node.type === 'checkbox') {
                                node.checked = !!value;
                            } else {
                                node.value = value;
                                const counter = document.getElementById(`counter-${field.name}`);
                                if (counter) counter.textContent = `${value.length} / ${node.dataset.max || 'MAX'}`;
                            }
                        }
                    }
                });
            }
        });

        if (typeof evaluateConditionalLogic === 'function') evaluateConditionalLogic();
    },

    async executeWithdrawal() {
        if (!confirm("Permanently delete this candidacy? This cannot be undone.")) return;
        
        try {
            const res = await fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryId: activeEntryId, editToken: activeEditToken })
            });

            if (res.ok) {
                if (typeof showToastNotification === 'function') showToastNotification("Candidacy deleted.");
                window.location.href = 'index.html';
            } else {
                throw new Error("Withdrawal failed.");
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
};

function triggerCandidateAutoSave() {
    if (!isEditMode) return;
    
    const indicator = document.getElementById('sync-indicator');
    if (indicator) indicator.classList.remove('hidden');
    
    clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(() => {
        PortalVault.initiateDataVaulting(true);
    }, 4000); 
}