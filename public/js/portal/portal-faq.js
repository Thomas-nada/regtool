/**
 * FAQ Engine
 * Knowledge base display and search filtering.
 */
const PortalFAQ = {
    activeTopic: 'All',

    faqs: [
        {
            topic: 'General',
            question: 'What is the Constitutional Committee (CC)?',
            answer: 'The Constitutional Committee is a core governance body established under CIP-1694. Its primary responsibility is to ensure that all governance actions submitted on the Cardano blockchain are constitutional, acting as a vital check and balance within the ecosystem.'
        },
        {
            topic: 'General',
            question: 'How long is the term for a CC member?',
            answer: 'The term length is defined within the Cardano Constitution. Typically, members serve for one to two years, ensuring regular community oversight and rotation of expertise.'
        },
        {
            topic: 'Candidacy',
            question: 'Who is eligible to stand for election?',
            answer: 'Eligibility is open to any member of the Cardano community. Candidates can register as Individuals, Organisations, or Consortiums. All candidates must undergo a verification process by providing a valid Cold Credential Hash.'
        },
        {
            topic: 'Candidacy',
            question: 'Can I stand as an Individual and as part of a Consortium?',
            answer: 'No. To ensure fair representation and clear accountability, candidates must choose a single track. If you are part of a group, we recommend the Consortium track; otherwise, the Individual track is most appropriate.'
        },
        {
            topic: 'Technical',
            question: 'What is a Cold Credential Hash?',
            answer: 'The Cold Credential Hash is a unique cryptographic identifier generated via the Cardano CLI. It links your candidacy to a set of secure offline keys, allowing the network to verify your identity without exposing your private keys.'
        },
        {
            topic: 'Technical',
            question: 'Do I need to be a developer to register?',
            answer: 'While technical proficiency with the Cardano CLI is required to generate hashes, many candidates use supportive tools. The most important requirement is a deep understanding of Cardano governance.'
        },
        {
            topic: 'Voting',
            question: 'How does the on-chain voting process work?',
            answer: 'Voting is conducted on-chain via governance actions. Decentralized Representatives (DReps) cast ballots on behalf of their delegated stake. The candidates receiving the most stake-weighted support are elected.'
        },
        {
            topic: 'Voting',
            question: 'Is there a minimum stake requirement to vote?',
            answer: 'Individual ADA holders vote by delegating their stake to DReps. Your influence in the election is proportional to the amount of stake delegated to the DRep you choose.'
        }
    ],

    init() {
        this.render();
    },

    render() {
        const list = document.getElementById('faqList');
        const empty = document.getElementById('emptyState');
        const searchInput = document.getElementById('faqSearch');
        if (!list) return;

        const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
        
        const filtered = this.faqs.filter(f => {
            const matchesTopic = this.activeTopic === 'All' || f.topic === this.activeTopic;
            const matchesSearch = f.question.toLowerCase().includes(searchQuery) || 
                                  f.answer.toLowerCase().includes(searchQuery);
            return matchesTopic && matchesSearch;
        });

        if (filtered.length === 0) {
            list.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }

        if (empty) empty.classList.add('hidden');
        
        list.innerHTML = filtered.map((f, i) => {
            const colorConfig = {
                General: 'bg-blue-50 text-blue-600 border-blue-100',
                Candidacy: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                Technical: 'bg-amber-50 text-amber-600 border-amber-100',
                Voting: 'bg-indigo-50 text-indigo-600 border-indigo-100'
            };
            const tagClass = colorConfig[f.topic] || 'bg-slate-50 text-slate-600 border-slate-100';

            return `
                <div class="glass-card rounded-[2rem] p-8 faq-card animate-fadeIn" style="animation-delay: ${i * 0.05}s">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="px-2.5 py-1 ${tagClass} rounded text-[7px] font-black uppercase tracking-widest border">
                            ${f.topic}
                        </span>
                    </div>
                    <h3 class="text-xl font-black text-slate-900 mb-4 tracking-tight">${f.question}</h3>
                    <p class="text-slate-600 leading-relaxed font-medium text-sm">${f.answer}</p>
                </div>`;
        }).join('');
    },

    setTopic(topic) {
        this.activeTopic = topic;

        document.querySelectorAll('.filter-pill').forEach(pill => {
            const pillTopic = pill.getAttribute('data-topic');
            if (pillTopic === topic) {
                pill.classList.replace('inactive', 'active');
            } else {
                pill.classList.replace('active', 'inactive');
            }
        });
        
        this.render();
    }
};

window.setTopic = (t) => PortalFAQ.setTopic(t);
window.filterFAQs = () => PortalFAQ.render();

document.addEventListener('DOMContentLoaded', () => PortalFAQ.init());