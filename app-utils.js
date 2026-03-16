/**
 * app-utils.js
 * Global utility functions for the DOT System.
 * Provides: Real-time Indian Currency Formatting, Custom Confirm Modal.
 */

// =====================================================================
// 1. REAL-TIME INDIAN CURRENCY FORMATTER
// =====================================================================

/**
 * Formats a number string into the Indian Numbering System (Lakhs/Crores).
 * e.g. 100000 -> 1,00,000 | 10000000 -> 1,00,00,000
 * @param {string|number} value - The raw numeric value.
 * @returns {string} The formatted string.
 */
function formatIndianNumber(value) {
    const num = String(value).replace(/[^0-9.]/g, ''); // Remove non-numeric chars
    if (!num) return '';
    const parts = num.split('.');
    let intPart = parts[0];
    const decPart = parts[1] !== undefined ? '.' + parts[1] : '';

    // Indian numbering: first comma at 3 digits from right, then every 2
    if (intPart.length <= 3) return intPart + decPart;
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    return formatted + decPart;
}

/**
 * Attaches a real-time Indian currency formatter to a single input element.
 * Stores raw value in input.dataset.rawValue for form submission.
 * @param {HTMLInputElement} input
 */
function attachCurrencyFormatter(input) {
    if (!input || input.dataset.currencyFormatted) return; // Prevent double-attaching
    input.dataset.currencyFormatted = 'true';

    // Store the original type for reference
    const originalType = input.type;

    // We need text type to allow formatted display
    input.type = 'text';
    input.autocomplete = 'off';

    input.addEventListener('input', (e) => {
        // Preserve cursor position as we reformat
        const cursorPos = e.target.selectionStart;
        const oldLength = e.target.value.length;

        const rawValue = e.target.value.replace(/[^0-9.]/g, '');
        input.dataset.rawValue = rawValue;

        const formatted = formatIndianNumber(rawValue);
        e.target.value = formatted;

        // Adjust cursor: offset by change in commas
        const newLength = formatted.length;
        const cursorOffset = newLength - oldLength;
        const newCursorPos = Math.max(0, cursorPos + cursorOffset);
        try { e.target.setSelectionRange(newCursorPos, newCursorPos); } catch (_) {}
    });

    input.addEventListener('focus', () => {
        // Show raw number when focused for easy editing
        const raw = input.dataset.rawValue || input.value.replace(/[^0-9.]/g, '');
        input.value = raw;
        input.dataset.rawValue = raw;
    });

    input.addEventListener('blur', () => {
        // Re-format on blur
        const raw = input.dataset.rawValue || input.value.replace(/[^0-9.]/g, '');
        input.dataset.rawValue = raw;
        input.value = formatIndianNumber(raw);
    });

    // Check if there's already a value, format it
    if (input.value) {
        const raw = String(input.value).replace(/[^0-9.]/g, '');
        input.dataset.rawValue = raw;
        input.value = formatIndianNumber(raw);
    }
}

/**
 * Scans the document for inputs with [data-currency] or [data-format="indian"]
 * and attaches the formatter. Can be called anytime (on load, after dynamic content).
 */
function initCurrencyFormatters() {
    const selectors = [
        'input[data-currency]',
        'input[data-format="indian"]',
    ];
    document.querySelectorAll(selectors.join(', ')).forEach(attachCurrencyFormatter);
}


// =====================================================================
// 2. CUSTOM DARK-MODE CONFIRM MODAL
// =====================================================================

/**
 * Creates and injects the confirm modal HTML into the body (only once).
 */
function _injectConfirmModal() {
    if (document.getElementById('customConfirmModal')) return;

    const modal = document.createElement('div');
    modal.id = 'customConfirmModal';
    modal.className = 'custom-confirm-overlay';
    modal.innerHTML = `
        <div class="custom-confirm-box glass-card">
            <div class="custom-confirm-icon-wrap" id="confirmIconWrap">
                <i class="fa-solid fa-triangle-exclamation" id="confirmIcon"></i>
            </div>
            <h3 class="custom-confirm-title" id="confirmTitle">Are you sure?</h3>
            <p class="custom-confirm-message" id="confirmMessage">This action cannot be undone.</p>
            <div class="custom-confirm-actions">
                <button class="btn btn-outline" id="confirmCancelBtn">
                    <i class="fa-solid fa-xmark"></i> Cancel
                </button>
                <button class="btn btn-danger" id="confirmOkBtn">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Shows a custom, styled confirmation modal that matches the UI theme.
 * Replaces the native window.confirm() with a Promise-based API.
 *
 * @param {object} options - Configuration options.
 * @param {string} [options.title="Are you sure?"] - The modal title.
 * @param {string} [options.message="This action cannot be undone."] - The modal body message.
 * @param {string} [options.confirmText="Delete"] - Text for the confirm button.
 * @param {string} [options.confirmIcon="fa-trash"] - FontAwesome icon class for the confirm button.
 * @param {'danger'|'warning'|'info'} [options.type='danger'] - Theme for the modal.
 * @returns {Promise<boolean>} Resolves to `true` if confirmed, `false` if cancelled.
 */
function showConfirm(options = {}) {
    _injectConfirmModal();

    const {
        title = 'Are you sure?',
        message = 'This action cannot be undone.',
        confirmText = 'Delete',
        confirmIcon = 'fa-trash',
        type = 'danger'
    } = options;

    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const iconWrap = document.getElementById('confirmIconWrap');
        const icon = document.getElementById('confirmIcon');

        // Configure modal content
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.innerHTML = `<i class="fa-solid ${confirmIcon}"></i> ${confirmText}`;
        
        // Apply type-specific styles
        iconWrap.className = `custom-confirm-icon-wrap type-${type}`;
        okBtn.className = `btn btn-${type}`;

        const iconMap = {
            danger: 'fa-triangle-exclamation',
            warning: 'fa-circle-exclamation',
            info: 'fa-circle-info'
        };
        icon.className = `fa-solid ${iconMap[type] || 'fa-triangle-exclamation'}`;

        // Show modal
        modal.classList.add('active');
        // Trigger animation after display
        requestAnimationFrame(() => {
            modal.querySelector('.custom-confirm-box').classList.add('visible');
        });

        const cleanup = (result) => {
            modal.querySelector('.custom-confirm-box').classList.remove('visible');
            setTimeout(() => modal.classList.remove('active'), 300);
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOverlayClick);
            resolve(result);
        };

        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);
        const onOverlayClick = (e) => { if (e.target === modal) cleanup(false); };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onOverlayClick);
    });
}


// =====================================================================
// 3. SUCCESS TOAST NOTIFICATION SYSTEM
// =====================================================================

function _injectToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
}

/**
 * Shows a brief, elegant toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} [type='success'] - The toast type.
 */
function showToast(message, type = 'success') {
    _injectToastContainer();
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}


// =====================================================================
// 4. AUTOMATED PDF GENERATION (Estimates & Invoices)
// =====================================================================

/**
 * Generates and downloads a professional PDF.
 * @param {'Estimate'|'Invoice'} type - Document type.
 * @param {object} data - Data for the document.
 */
async function generatePDF(type, data) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('PDF library not loaded. Please ensure you are connected to the internet.');
        return;
    }

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    
    // --- Branding Header ---
    doc.setFillColor(15, 23, 42); // bg-dark
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DOT SYSTEM', margin, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Business Solutions & Hardware Services', margin, 32);
    
    doc.setFontSize(18);
    doc.text(type.toUpperCase(), pageWidth - margin - 40, 25);
    
    // --- Document Info ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let y = 60;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, y);
    doc.text('Document Details:', pageWidth / 2 + 10, y);
    
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text(data.customer || data.orgName || 'Valued Customer', margin, y);
    doc.text(`ID: ${data.id || 'N/A'}`, pageWidth / 2 + 10, y);
    
    y += 5;
    if (data.phone) doc.text(`Phone: ${data.phone}`, margin, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2 + 10, y);
    
    if (type === 'Invoice') {
        y += 5;
        doc.text(`Invoice No: INV-${Date.now().toString().slice(-6)}`, pageWidth / 2 + 10, y);
    }
    
    // --- Table Data ---
    y += 20;
    const body = [];
    let subtotal = 0;

    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
            body.push([item.name || item.product, item.qty || 1, `IN ₹${(item.price || item.rate || 0).toLocaleString()}`, `₹${((item.qty || 1) * (item.price || item.rate || 0)).toLocaleString()}`]);
            subtotal += (item.qty || 1) * (item.price || item.rate || 0);
        });
    } else {
        // Fallback for single item (like a repair or service visit)
        const desc = data.problem || data.category || data.type || 'Service';
        const amt = data.price || data.amount || data.fee || 0;
        body.push([desc, 1, `₹${amt.toLocaleString()}`, `₹${amt.toLocaleString()}`]);
        subtotal = amt;
    }

    doc.autoTable({
        startY: y,
        head: [['Description', 'Qty', 'Unit Price', 'Total']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { font: 'helvetica', fontSize: 9 }
    });

    // --- Footer Totals ---
    let finalY = doc.lastAutoTable.finalY + 10;
    const gstRate = 0.18;
    const gstAmt = subtotal * gstRate;
    const total = subtotal + (type === 'Invoice' ? gstAmt : 0);

    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: ₹${subtotal.toLocaleString()}`, pageWidth - margin - 50, finalY);
    
    if (type === 'Invoice') {
        finalY += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`GST (18%): ₹${gstAmt.toLocaleString()}`, pageWidth - margin - 50, finalY);
        finalY += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Payable: ₹${total.toLocaleString()}`, pageWidth - margin - 55, finalY);
    } else {
        finalY += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Estimated Total: ₹${subtotal.toLocaleString()}`, pageWidth - margin - 55, finalY);
    }

    // Terms
    finalY += 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    if (type === 'Estimate') {
        doc.text('* This is an estimated quote. Final prices may vary based on actual work.', margin, finalY);
    } else {
        doc.text('* This is a computer generated invoice. No signature required.', margin, finalY);
        doc.text('* Goods once sold will not be taken back.', margin, finalY + 5);
    }

    doc.save(`${type}_${data.id || 'doc'}.pdf`);
    showToast(`${type} generated successfully!`);
}


// =====================================================================
// 5. MICRO-SPARKLINE GENERATOR
// =====================================================================

/**
 * Renders a simple sparkline in a container using Canvas.
 * @param {HTMLElement} container - The container DIV.
 * @param {number[]} data - Array of numbers to plot.
 * @param {string} [color='#3b82f6'] - Line color.
 */
function renderSparkline(container, data, color = '#3b82f6') {
    if (!container || !data || data.length < 2) return;
    
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    
    data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    container.innerHTML = '';
    container.appendChild(canvas);
}


// =====================================================================
// INIT ON DOM READY
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    _injectConfirmModal();
    _injectToastContainer();
    initCurrencyFormatters();
});
