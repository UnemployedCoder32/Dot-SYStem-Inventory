document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let nonAmcCalls = DataController.getNonAmcCalls();
    let employees = DataController.getEmployees();

    // --- DOM ---
    const visitForm = document.getElementById('visitForm');
    const visitHistoryList = document.getElementById('visitHistoryList');
    const emptyVisitRow = document.getElementById('emptyVisitRow');
    const totalVisitsBadge = document.getElementById('totalVisits');
    const techSelect = document.getElementById('technician');

    // --- Initialization ---
    const init = () => {
        // Set default date
        document.getElementById('visitDate').valueAsDate = new Date();
        
        // Populate Technicians
        techSelect.innerHTML = '<option value="" disabled selected>Assign Technician...</option>';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.name;
            opt.textContent = emp.name;
            techSelect.appendChild(opt);
        });

        renderVisits();
    };

    const saveState = () => {
        DataController.saveNonAmcCalls(nonAmcCalls);
    };

    const renderVisits = () => {
        if (nonAmcCalls.length === 0) {
            visitHistoryList.innerHTML = '';
            visitHistoryList.appendChild(emptyVisitRow);
            totalVisitsBadge.textContent = '0 Visits';
            return;
        }

        visitHistoryList.innerHTML = '';
        nonAmcCalls.forEach((visit, index) => {
            const tr = document.createElement('tr');
            tr.className = 'fade-in';
            tr.style.animationDelay = `${index * 0.05}s`;

            const statusClass = getStatusClass(visit.status);
            const fee = parseFloat(visit.fee) || 0;

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${escapeXml(visit.customerName)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(visit.date).toLocaleDateString()}</div>
                </td>
                <td>
                    <span class="type-badge">${visit.type}</span>
                    <div style="font-size: 0.85rem; margin-top: 0.2rem;">${visit.category}</div>
                </td>
                <td><i class="fa-solid fa-user-gear" style="font-size: 0.8rem; opacity: 0.7;"></i> ${escapeXml(visit.tech)}</td>
                <td style="font-weight: 500;">₹${fee.toLocaleString('en-IN')}</td>
                <td>
                    <span class="visit-badge ${statusClass}" onclick="advanceStatus('${visit.id}')">
                        ${visit.status}
                    </span>
                </td>
                <td>
                     <button class="btn-edit" onclick="downloadVisitInvoice('${visit.id}')" title="Download Tax Invoice" style="margin-right: 0.5rem;">
                        <i class="fa-solid fa-file-invoice" style="color: #ec4899;"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteVisit('${visit.id}')" style="color: var(--danger);">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            visitHistoryList.appendChild(tr);
        });

        totalVisitsBadge.textContent = `${nonAmcCalls.length} Visits`;
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Visit Scheduled': return 'status-scheduled';
            case 'Technician On-Site': return 'status-onsite';
            case 'Job Resolved': return 'status-resolved';
            case 'Payment Received': return 'status-paid';
            default: return '';
        }
    };

    window.advanceStatus = (id) => {
        const visit = nonAmcCalls.find(v => v.id === id);
        if (!visit) return;

        const flow = ['Visit Scheduled', 'Technician On-Site', 'Job Resolved', 'Payment Received'];
        const currentIndex = flow.indexOf(visit.status);
        
        if (currentIndex < flow.length - 1) {
            visit.status = flow[currentIndex + 1];
            saveState();
            renderVisits();
        }
    };

    window.deleteVisit = async (id) => {
        const confirmed = await showConfirm({
            title: 'Delete Visit?',
            message: 'Are you sure you want to remove this service visit log?',
            confirmText: 'Delete',
            confirmIcon: 'fa-trash-can',
            type: 'danger'
        });
        if (confirmed) {
            nonAmcCalls = nonAmcCalls.filter(v => v.id !== id);
            saveState();
            renderVisits();
        }
    };

    // --- Actions ---
    visitForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const feeRaw = document.getElementById('serviceCharge').value;
        const fee = parseFloat(feeRaw.replace(/,/g, '')) || 0;
        const techName = techSelect.value;
        const trackInPayroll = document.getElementById('trackInPayroll').checked;

        const newVisit = {
            id: 'visit_' + Date.now().toString(),
            customerName: document.getElementById('customerName').value.trim(),
            type: document.getElementById('visitType').value,
            category: document.getElementById('category').value,
            tech: techName,
            fee: fee,
            problem: document.getElementById('visitProblem').value.trim(),
            date: document.getElementById('visitDate').value,
            status: 'Visit Scheduled',
            createdAt: new Date().toISOString()
        };

        nonAmcCalls.unshift(newVisit);
        saveState();

        // Integration with Payroll: Add as a "Performance Bonus" or "Service Revenue" expense entry
        if (trackInPayroll && fee > 0) {
            updateStaffRevenue(techName, fee, newVisit.customerName);
        }

        visitForm.reset();
        init(); // Reset date and dropdowns
        showToast('Service visit scheduled successfully!');
    });

    window.downloadVisitInvoice = (id) => {
        const visit = nonAmcCalls.find(v => v.id === id);
        if (!visit) return;
        generatePDF('Invoice', {
            id: visit.id,
            customer: visit.customerName,
            category: visit.category,
            fee: visit.fee,
            type: visit.type
        });
    };

    const updateStaffRevenue = (techName, amount, customer) => {
        let employees = DataController.getEmployees();
        const empIndex = employees.findIndex(e => e.name === techName);
        if (empIndex === -1) return;

        const now = new Date();
        const monthLabel = now.toLocaleString('default', { month: 'short' }) + ' ' + now.getFullYear();

        if (!employees[empIndex].expenses) employees[empIndex].expenses = [];
        
        employees[empIndex].expenses.push({
            id: 'rev_' + Date.now(),
            date: now.toISOString(),
            monthYear: monthLabel,
            category: 'Bonus', // Categorizing as Bonus for simplicity in payslip
            amount: amount * 0.1, // Example: Tech gets 10% commission/bonus for ad-hoc visits
            note: `Revenue from: ${customer} (Visit Fee: ₹${amount})`
        });

        DataController.saveEmployees(employees);
    };

    const escapeXml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe.replace(/[<>&"']/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return c;
            }
        });
    };

    init();
});
