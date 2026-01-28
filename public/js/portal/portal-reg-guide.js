/**
 * Registration Guide
 * Track selection and navigation for candidacy roadmap.
 */
const PortalRegGuide = {
    switchTrack(trackId) {
        document.querySelectorAll('.track-btn').forEach(btn => {
            btn.classList.remove('border-blue-600', 'bg-white', 'ring-8', 'ring-blue-500/5', 'shadow-2xl');
            btn.classList.add('bg-white/50', 'border-slate-100');
        });

        const activeBtn = document.getElementById('btn-' + trackId);
        if (activeBtn) {
            activeBtn.classList.remove('bg-white/50', 'border-slate-100');
            activeBtn.classList.add('border-blue-600', 'bg-white', 'ring-8', 'ring-blue-500/5', 'shadow-2xl');
        }

        document.querySelectorAll('.track-section').forEach(sec => {
            sec.classList.remove('active');
        });

        const activeSection = document.getElementById('track-' + trackId);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        const cta = document.getElementById('cta-section');
        if (cta) {
            cta.classList.remove('hidden');
            cta.classList.add('animate-fadeIn');
        }

        const container = document.getElementById('track-content-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};

window.switchTrack = (id) => PortalRegGuide.switchTrack(id);

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get('track');
    if (preselect) {
        PortalRegGuide.switchTrack(preselect);
    }
});