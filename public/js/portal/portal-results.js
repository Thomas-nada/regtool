/**
 * Results Engine
 * Historical election results display.
 */
const PortalResults = {
    currentElectionId: null,
    showAll: false,

    elections: {
        main2025: {
            title: "2025 CC Election",
            description: "All 7 seats were up for grabs. To ensure committee stability, terms were assigned based on ranking and committee balance: Tingvard, Eastern Cardano Council, and Ace Alliance secured 2 year terms. Cardano Atlantic Council, Ktorz, Cardano Japan Council, and phil_uplc secured 1 year terms.",
            totalStake: 2748973113,
            totalVotes: 109,
            results: [
                { rank: "01", name: "Cardano Atlantic Council", ada: 2437091844, votes: 85, type: "Consortium", status: "Elected", term: "1yr" },
                { rank: "02", name: "Tingvard", ada: 2038104314, votes: 53, type: "Consortium", status: "Elected", term: "2yr" },
                { rank: "03", name: "Eastern Cardano Council", ada: 1790636843, votes: 68, type: "Consortium", status: "Elected", term: "2yr" },
                { rank: "04", name: "KtorZ", ada: 1706293942, votes: 56, type: "Individual", status: "Elected", term: "1yr" },
                { rank: "05", name: "Ace Alliance", ada: 1633525358, votes: 75, type: "Consortium", status: "Elected", term: "2yr" },
                { rank: "06", name: "Cardano Japan Council", ada: 1625533719, votes: 61, type: "Consortium", status: "Elected", term: "1yr" },
                { rank: "07", name: "phil_uplc", ada: 1616883528, votes: 65, type: "Individual", status: "Elected", term: "1yr" },
                { rank: "08", name: "Adara Consortium", ada: 1474973215, votes: 38, type: "Consortium", status: "Not Elected", term: null },
                { rank: "09", name: "Cardano Constitutional Consortium", ada: 969126576, votes: 45, type: "Consortium", status: "Not Elected", term: null },
                { rank: "10", name: "Wanchain", ada: 836685545, votes: 20, type: "Company", status: "Not Elected", term: null },
                { rank: "11", name: "SIDAN Lab", ada: 303866949, votes: 24, type: "Company", status: "Not Elected", term: null },
                { rank: "12", name: "STORM Partners", ada: 237044646, votes: 17, type: "Company", status: "Not Elected", term: null },
                { rank: "13", name: "Cardano Ethical Oversight (CEO)", ada: 70337853, votes: 5, type: "Consortium", status: "Not Elected", term: null },
                { rank: "14", name: "Cardano Lover", ada: 63659593, votes: 2, type: "Individual", status: "Not Elected", term: null },
                { rank: "15", name: "Quality of Life World Foundation", ada: 42920173, votes: 3, type: "Organisation", status: "Not Elected", term: null },
                { rank: "16", name: "Kevin G Mohr", ada: 1359715, votes: 3, type: "Individual", status: "Not Elected", term: null },
                { rank: "17", name: "Emurgone", ada: 239224, votes: 1, type: "Individual", status: "Not Elected", term: null },
                { rank: "18", name: "Waldo", ada: 131118, votes: 1, type: "Individual", status: "Not Elected", term: null },
                { rank: "19", name: "FutureProduct LLC dba Futurism Products", ada: 0, votes: 0, type: "Organisation", status: "Not Elected", term: null }
            ]
        },
        snap2025: {
            title: "2025 CC Snap Election",
            description: "This was a Snap Election held to replace the Cardano Atlantic Council following their formal retirement from the Constitutional Committee.",
            totalStake: 3506708504,
            totalVotes: 93,
            results: [
                { rank: "01", name: "Cardano Curia", ada: 1788063460, votes: 37, type: "Consortium", status: "Elected", term: null },
                { rank: "02", name: "Christina Gianelloni (musikc)", ada: 1639529772, votes: 44, type: "Individual", status: "Not Elected", term: null },
                { rank: "03", name: "Phoenix Alliance", ada: 72678283, votes: 10, type: "Consortium", status: "Not Elected", term: null },
                { rank: "04", name: "Ahmed Oladele", ada: 6436989, votes: 2, type: "Individual", status: "Not Elected", term: null },
                { rank: "05", name: "Kevin Mohr", ada: 0, votes: 0, type: "Individual", status: "Not Elected", term: null }
            ]
        }
    },

    loadElection(id) {
        this.currentElectionId = id;
        this.showAll = false;

        const data = this.elections[id];
        if (!data) return;

        document.getElementById('initial-state')?.classList.add('hidden');
        document.getElementById('results-container')?.classList.remove('hidden');

        document.querySelectorAll('.election-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('btn-' + id)?.classList.add('active');

        document.getElementById('stat-total-stake').textContent = "₳ " + data.totalStake.toLocaleString();
        document.getElementById('stat-total-votes').textContent = data.totalVotes;
        document.getElementById('election-description').textContent = data.description;
        document.getElementById('table-title').textContent = data.title;

        this.renderTable();
    },

    renderTable() {
        if (!this.currentElectionId) return;
        const data = this.elections[this.currentElectionId];
        const body = document.getElementById('results-table-body');
        const expandBtn = document.getElementById('expand-btn');
        if (!body) return;

        const rowsToDisplay = this.showAll ? data.results : data.results.filter(r => r.status === 'Elected');

        body.innerHTML = rowsToDisplay.map(r => {
            let statusTag = '';
            if (r.status === 'Elected') {
                const colorClass = r.term === '2yr' 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100';
                const termLabel = r.term ? `Elected (${r.term})` : 'Elected';
                
                statusTag = `
                    <div class="inline-flex items-center gap-2 px-3 py-1 ${colorClass} rounded-full border">
                        <i class="fas fa-check-circle text-[10px]"></i>
                        <span class="text-[9px] font-black uppercase tracking-widest">${termLabel}</span>
                    </div>`;
            } else {
                statusTag = `<span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Not Elected</span>`;
            }

            return `
                <tr class="result-row group transition-all ${r.status === 'Not Elected' ? 'opacity-70' : ''} animate-fadeIn">
                    <td class="px-6 py-8 font-black text-slate-400 mono text-lg">${r.rank}</td>
                    <td class="px-6 py-8">
                        <p class="font-bold text-slate-900 text-base">${r.name}</p>
                        <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">${r.type}</p>
                    </td>
                    <td class="px-6 py-8">
                        <p class="font-black text-slate-900 tracking-tighter">₳ ${Number(r.ada).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1})}</p>
                    </td>
                    <td class="px-6 py-8">
                        <p class="font-bold text-slate-900">${r.votes}</p>
                    </td>
                    <td class="px-6 py-8 text-right">
                        ${statusTag}
                    </td>
                </tr>`;
        }).join('');

        if (expandBtn) {
            expandBtn.innerHTML = this.showAll 
                ? `Collapse Results <i class="fas fa-chevron-up ml-3"></i>` 
                : `Expand Full Results <i class="fas fa-chevron-down ml-3"></i>`;
        }

        const hasMore = data.results.length > data.results.filter(r => r.status === 'Elected').length;
        document.getElementById('expand-container')?.classList.toggle('hidden', !hasMore);
    },

    toggleAllRows() {
        this.showAll = !this.showAll;
        this.renderTable();
    }
};

window.loadElection = (id) => PortalResults.loadElection(id);
window.toggleAllRows = () => PortalResults.toggleAllRows();