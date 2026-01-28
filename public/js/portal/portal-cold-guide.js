/**
 * Cold Guide
 * Clipboard utilities for air-gapped credential command examples.
 */
const PortalColdGuide = {
    copyToClipboard(id) {
        const textNode = document.getElementById(id);
        if (!textNode) return;

        const content = textNode.innerText;

        const buffer = document.createElement('textarea');
        buffer.value = content;
        document.body.appendChild(buffer);
        buffer.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.provideFeedback(event.currentTarget);
            }
        } catch (err) {
            console.error("Clipboard error:", err);
        } finally {
            document.body.removeChild(buffer);
        }
    },

    provideFeedback(btn) {
        if (!btn) return;
        
        const originalLabel = btn.innerText;
        btn.innerText = 'COPIED';
        btn.classList.add('bg-emerald-600', 'text-white', 'scale-105');
        
        setTimeout(() => {
            btn.innerText = originalLabel;
            btn.classList.remove('bg-emerald-600', 'text-white', 'scale-105');
        }, 2000);
    }
};

window.copyToClipboard = (id) => PortalColdGuide.copyToClipboard(id);