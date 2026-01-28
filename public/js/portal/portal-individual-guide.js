/**
 * Individual Guide
 * Clipboard utilities for credential command examples.
 */
const PortalIndividualGuide = {
    copyToClipboard(id) {
        const textElement = document.getElementById(id);
        if (!textElement) return;

        const text = textElement.innerText;

        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        
        try {
            document.execCommand('copy');
            this.handleButtonFeedback(event.currentTarget);
        } catch (err) {
            console.error("Clipboard error:", err);
        } finally {
            document.body.removeChild(temp);
        }
    },

    handleButtonFeedback(btn) {
        if (!btn) return;
        
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.classList.add('bg-emerald-500', 'text-white');
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('bg-emerald-500', 'text-white');
        }, 2000);
    }
};

window.copyToClipboard = (id) => PortalIndividualGuide.copyToClipboard(id);