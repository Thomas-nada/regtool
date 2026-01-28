/**
 * Multisig Generator
 * Command generation for multisig credential setup.
 */
const PortalMultisig = {
    inputs: {
        coldNames: null,
        coldThreshold: null,
        hotNames: null,
        hotThreshold: null
    },
    summaries: {
        cold: null,
        hot: null
    },
    container: null,

    init() {
        this.inputs.coldNames = document.getElementById('coldMemberNames');
        this.inputs.coldThreshold = document.getElementById('coldThreshold');
        this.inputs.hotNames = document.getElementById('hotMemberNames');
        this.inputs.hotThreshold = document.getElementById('hotThreshold');
        
        this.summaries.cold = document.getElementById('coldSummary');
        this.summaries.hot = document.getElementById('hotSummary');
        this.container = document.getElementById('workflow-container');

        const allInputs = [
            this.inputs.coldNames, 
            this.inputs.coldThreshold, 
            this.inputs.hotNames, 
            this.inputs.hotThreshold
        ];

        allInputs.forEach(el => {
            if (el) el.addEventListener('input', () => this.render());
        });

        this.render();
    },

    generateHash(name, type) {
        const str = `${name}-${type}-hash-v1`;
        let hash = '';
        for (let i = 0; i < 56; i++) {
            hash += "0123456789abcdef"[(str.charCodeAt(i % str.length) + i) % 16];
        }
        return hash;
    },

    createSection(title, number, description, env, codeBlocks) {
        const section = document.createElement('section');
        const isCold = env === 'cold';
        
        const sectionClass = isCold ? 'section-cold' : 'section-hot';
        const badgeClass = isCold ? 'env-cold' : 'env-hot';
        const badgeText = isCold ? '❄️ Cold Environment (Offline)' : '🔥 Hot Environment (Online)';
        
        section.className = `glass-card p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 animate-fadeIn ${sectionClass}`;
        
        let html = `
            <div class="env-badge ${badgeClass}">${badgeText}</div>
            <h2 class="text-2xl font-black text-slate-900 mb-4 tracking-tight flex items-center">
                <span class="bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center mr-4 text-sm shadow-lg shadow-slate-900/20">${number}</span>
                ${title}
            </h2>
            <p class="text-slate-500 mb-10 text-base font-medium leading-relaxed">${description}</p>
            <div class="space-y-10">
        `;

        codeBlocks.forEach((block, idx) => {
            const blockId = `code-${number}-${idx}`;
            html += `
                <div>
                    ${block.label ? `<label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">${block.label}</label>` : ''}
                    <div class="code-block">
                        <button class="copy-btn" onclick="PortalMultisig.copyToClipboard('${blockId}')">Copy</button>
                        <pre id="${blockId}">${block.content}</pre>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        section.innerHTML = html;
        return section;
    },

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const coldNames = this.inputs.coldNames.value.split(',').map(n => n.trim()).filter(n => n);
        const coldThreshold = parseInt(this.inputs.coldThreshold.value) || 1;
        const hotNames = this.inputs.hotNames.value.split(',').map(n => n.trim()).filter(n => n);
        const hotThreshold = parseInt(this.inputs.hotThreshold.value) || 1;

        if (this.summaries.cold) this.summaries.cold.innerText = `${coldThreshold} of ${coldNames.length}`;
        if (this.summaries.hot) this.summaries.hot.innerText = `${hotThreshold} of ${hotNames.length}`;

        if (coldNames.length === 0 || hotNames.length === 0) return;

        const coldGenBlocks = coldNames.map(name => {
            const lowName = name.toLowerCase().replace(/\s/g, '_');
            return {
                label: `${name}'s Cold Commands`,
                content: `# Run on ${name}'s Cold Machine\ncardano-cli latest governance committee key-gen-cold \\\n  --cold-verification-key-file ${lowName}-cold.vkey \\\n  --cold-signing-key-file ${lowName}-cold.skey`
            };
        });
        this.container.appendChild(this.createSection("Generate Cold Credentials", "2", "The 'Guardians' generate these on air-gapped hardware. These keys represent the ultimate authority of the committee member.", "cold", coldGenBlocks));

        const coldHashes = coldNames.map(name => ({ name, hash: this.generateHash(name, 'cold') }));
        const coldScript = { type: "atLeast", required: coldThreshold, scripts: coldHashes.map(h => ({ type: "sig", keyHash: h.hash })) };
        const coldScriptHash = "ad31d247bb2549db98020c5a6331732ebe559ad85b5768abbda3eb0d";
        this.container.appendChild(this.createSection("Establish Cold Multisig Identity", "3", `This script defines the Cold Identity. It requires <b>${coldThreshold} of ${coldNames.length}</b> signatures to authorize any hot credentials.`, "cold", [
            { label: "cold.script", content: JSON.stringify(coldScript, null, 2) },
            { label: "Generate Script Hash", content: `cardano-cli hash script --script-file cold.script\n# Output: ${coldScriptHash}` }
        ]));

        const hotGenBlocks = hotNames.map(name => {
            const lowName = name.toLowerCase().replace(/\s/g, '_');
            return {
                label: `${name}'s Hot Commands`,
                content: `# Run on ${name}'s Hot (Online) Machine\ncardano-cli latest governance committee key-gen-hot \\\n  --verification-key-file ${lowName}-hot.vkey \\\n  --signing-key-file ${lowName}-hot.skey`
            };
        });
        this.container.appendChild(this.createSection("Generate Hot Credentials", "4", "The 'Operators' generate these for day-to-day voting. These keys are linked to the cold script via an authorization certificate.", "hot", hotGenBlocks));

        const hotHashes = hotNames.map(name => ({ name, hash: this.generateHash(name, 'hot') }));
        const hotScript = { type: "atLeast", required: hotThreshold, scripts: hotHashes.map(h => ({ type: "sig", keyHash: h.hash })) };
        const hotScriptHash = "f5d42214cb2625cfc34e5c0cfb1daceee44a4a3c2e6807ab67cd6adb";
        this.container.appendChild(this.createSection("Create Hot Multisig Script", "5", `This script defines the Voting Rule. To cast a CC vote, <b>${hotThreshold} of ${hotNames.length}</b> operators must provide a signature.`, "hot", [
            { label: "hot.script", content: JSON.stringify(hotScript, null, 2) },
            { label: "Generate Script Hash", content: `cardano-cli hash script --script-file hot.script\n# Output: ${hotScriptHash}` }
        ]));

        this.container.appendChild(this.createSection("Authorize Hot Credentials", "6", "Create the bridge. This certificate tells the ledger that the Cold Guardians have delegated voting power to the Hot Operators.", "hot", [
            { label: "Create Certificate (Online)", content: `cardano-cli latest governance committee create-hot-key-authorization-certificate \\\n  --cold-script-hash ${coldScriptHash} \\\n  --hot-script-hash ${hotScriptHash} \\\n  --out-file cc-authorization.cert` }
        ]));

        const individualWitnessBlocks = coldNames.map(name => {
            const lowName = name.toLowerCase().replace(/\s/g, '_');
            return { label: `${name}'s Guardian Signature`, content: `# RUN ON ${name.toUpperCase()}'S COLD MACHINE\ncardano-cli latest transaction witness \\\n  --tx-body-file tx.body \\\n  --signing-key-file ${lowName}-cold.skey \\\n  --out-file ${lowName}.witness` };
        });
        const witnessFiles = coldNames.map(name => `--witness-file ${name.toLowerCase().replace(/\s/g, '_')}.witness`).join(' \\\n  ');
        this.container.appendChild(this.createSection("Cold Sign-off & Submission", "7", `The Guardians must sign off. Even if you have 100 operators, the authorization only happens if <b>${coldThreshold}</b> Guardians sign this transaction.`, "cold", [
            { label: "1. Build Transaction Body (Hot Machine)", content: `cardano-cli latest transaction build \\\n  --tx-in \"TX_ID#INDEX\" \\\n  --change-address \"$(cat payment.addr)\" \\\n  --certificate-file cc-authorization.cert \\\n  --certificate-script-file cold.script \\\n  --witness-override ${coldNames.length + 1} \\\n  --out-file tx.body` },
            ...individualWitnessBlocks,
            { label: "3. Final Assembly & Submission (Hot Machine)", content: `cardano-cli latest transaction assemble \\\n  --tx-body-file tx.body \\\n  --witness-file payment.witness \\\n  ${witnessFiles} \\\n  --out-file tx.signed\n\n# Broadcast transaction to the network\ncardano-cli latest transaction submit --tx-file tx.signed` }
        ]));
    },

    copyToClipboard(id) {
        const text = document.getElementById(id).innerText;
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);

        const btn = event.currentTarget;
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = originalText, 2000);
    }
};

document.addEventListener('DOMContentLoaded', () => PortalMultisig.init());