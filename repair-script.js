document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let repairJobs = DataController.getRepairs();
    let crmHistory = DataController.getCrmHistory();
    let filterQuery = '';

    // --- DOM Elements ---
    const repairForm = document.getElementById('repairForm');
    const jobList = document.getElementById('jobList');
    const emptyRow = document.getElementById('emptyJobRow');
    const totalJobsBadge = document.getElementById('totalJobs');
    const jobSearch = document.getElementById('jobSearch');
    const crmIndicator = document.getElementById('crmIndicator');

    // --- Utilities ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    const validatePhone = (phone) => {
        return /^\d{10}$/.test(phone);
    };

    const saveState = () => {
        DataController.saveRepairs(repairJobs);
        DataController.saveCrmHistory(crmHistory);
    };

    const generateSRNo = () => {
        // Find highest existing SR number index to avoid collisions
        let maxIndex = 0;
        repairJobs.forEach(job => {
            const num = parseInt(job.srNo?.split('-').pop());
            if (!isNaN(num) && num > maxIndex) maxIndex = num;
        });
        
        // If no jobs or parsing failed, start at 1000
        if (maxIndex < 1000) maxIndex = 1000;
        
        return `HS-J-${maxIndex + 1}`;
    };

    const renderTable = () => {
        const filteredJobs = repairJobs.filter(job => {
            const query = filterQuery.toLowerCase();
            return (
                job.customerName.toLowerCase().includes(query) ||
                job.phone.includes(query) ||
                (job.srNo && job.srNo.toLowerCase().includes(query)) ||
                (job.deviceType && job.deviceType.toLowerCase().includes(query)) ||
                (job.model && job.model.toLowerCase().includes(query))
            );
        });

        if (filteredJobs.length === 0) {
            jobList.innerHTML = '';
            if (filterQuery.trim() === '') {
                jobList.appendChild(emptyRow);
            } else {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="6" style="text-align: center; padding: 4rem; color: var(--text-muted)">
                    <i class="fa-solid fa-magnifying-glass-minus" style="font-size: 2rem; display: block; margin-bottom: 1rem; opacity: 0.5;"></i>
                    No matching records found for "<strong>${escapeXml(filterQuery)}</strong>"
                </td>`;
                jobList.appendChild(tr);
            }
            totalJobsBadge.textContent = `${repairJobs.length} Jobs`;
            return;
        }

        jobList.innerHTML = '';
        filteredJobs.forEach((job, index) => {
            const tr = document.createElement('tr');
            tr.className = 'fade-in';
            tr.style.animationDelay = `${index * 0.05}s`;

            const totalFinal = job.price + (job.extraCharges || 0);

            tr.innerHTML = `
                <td>
                    <span style="color: var(--primary); font-family: monospace; font-weight: bold; font-size: 0.85rem;">${job.srNo || 'N/A'}</span>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeXml(job.customerName)}</div>
                    <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem;">
                        <i class="fa-solid fa-phone" style="font-size: 0.7rem;"></i> +91 ${job.phone}
                        <a href="tel:+91${job.phone}" class="btn-call" style="padding: 0.1rem 0.35rem; font-size: 0.7rem;" title="Call Customer">
                            <i class="fa-solid fa-phone-volume"></i>
                        </a>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500;">${job.deviceType || 'Device'} - ${escapeXml(job.model || 'N/A')}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">${escapeXml(job.deviceIssue)}</div>
                    ${job.comment ? `<div style="font-size: 0.72rem; color: var(--accent); margin-top: 0.2rem;"><i class="fa-solid fa-comment-dots"></i> ${escapeXml(job.comment)}</div>` : ''}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="font-weight: bold;">${formatCurrency(totalFinal)}</div>
                        ${(job.partCost / totalFinal > 0.7) ? '<i class="fa-solid fa-triangle-exclamation" style="color: var(--danger); font-size: 0.8rem;" title="Low Margin: High Part Cost!"></i>' : ''}
                    </div>
                    ${job.extraCharges > 0 ? `<div style="font-size: 0.7rem; color: var(--danger);">+ ${formatCurrency(job.extraCharges)} extra</div>` : ''}
                    <div class="badge-profit" style="margin-top: 0.3rem; font-size: 0.65rem; padding: 0.1rem 0.4rem; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 4px; display: inline-block; font-weight: bold;">
                        Net: ${formatCurrency(totalFinal - (job.partCost || 0))}
                    </div>
                </td>
                <td>
                    <select class="status-select val-${job.status.toLowerCase().replace(/ /g, '-')}" onchange="updateJobStatus('${job.id}', this.value)">
                        <option value="Pending" ${job.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${job.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Awaiting Parts" ${job.status === 'Awaiting Parts' ? 'selected' : ''}>Awaiting Parts</option>
                        <option value="Completed" ${job.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <button class="btn-wa" onclick="sendWhatsApp('${job.id}')" title="Send WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        <button class="details-btn" style="padding: 0.4rem 0.6rem; background: rgba(0, 180, 219, 0.1); color: #00B4DB; border: 1px solid rgba(0, 180, 219, 0.2);" onclick="generateInvoice('${job.id}')" title="Download Invoice">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button class="btn-delete-animated" onclick="deleteJob('${job.id}')" title="Delete">
                             <svg viewBox="0 0 448 512" class="svgIcon"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            jobList.appendChild(tr);
        });

        totalJobsBadge.textContent = `${repairJobs.length} Job${repairJobs.length > 1 ? 's' : ''}`;
    };

    // --- CRM Intelligence ---
    const phoneInput = document.getElementById('custPhone');
    const nameInput = document.getElementById('custName');

    phoneInput.addEventListener('input', () => {
        const phone = phoneInput.value.trim();
        if (phone.length === 10 && crmHistory[phone]) {
            const history = crmHistory[phone];
            nameInput.value = history.name;
            crmIndicator.style.display = 'block';
            crmIndicator.title = `Last visit: ${history.lastVisit} for ${history.device}`;
            
            // Subtle feedback
            nameInput.style.borderColor = 'var(--accent)';
            setTimeout(() => nameInput.style.borderColor = '', 1500);
        } else {
            crmIndicator.style.display = 'none';
        }
    });

    // --- Core Features ---

    repairForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('custName');
        const phoneInput = document.getElementById('custPhone');
        const typeInput = document.getElementById('deviceType');
        const modelInput = document.getElementById('deviceModel');
        const issueInput = document.getElementById('deviceIssue');
        const priceInput = document.getElementById('estPrice');
        const costInput = document.getElementById('partCost');
        const extraInput = document.getElementById('extraCharges');
        const commentInput = document.getElementById('jobComment');

        const phone = phoneInput.value.trim();
        const price = Math.max(0, parseFloat(priceInput.dataset.rawValue || priceInput.value) || 0);
        const partCost = Math.max(0, parseFloat(costInput.dataset.rawValue || costInput.value) || 0);
        const extraCharges = Math.max(0, parseFloat(extraInput.value) || 0);

        if (!validatePhone(phone)) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        // CRM Update
        const name = nameInput.value.trim();
        crmHistory[phone] = {
            name: name,
            lastVisit: new Date().toLocaleDateString(),
            device: typeInput.value
        };

        const newJob = {
            id: 'job_' + Date.now().toString(),
            srNo: generateSRNo(),
            customerName: name,
            phone: phone,
            deviceType: typeInput.value,
            model: modelInput.value.trim(),
            deviceIssue: issueInput.value.trim(),
            price: price,
            partCost: partCost,
            extraCharges: extraCharges,
            comment: commentInput.value.trim(),
            status: 'Pending',
            createdAt: new Date().toLocaleString()
        };

        repairJobs.unshift(newJob);
        saveState();
        repairForm.reset();
        nameInput.focus();
        renderTable();
    });

    jobSearch.addEventListener('input', (e) => {
        filterQuery = e.target.value;
        renderTable();
    });

    window.deleteJob = async (id) => {
        const confirmed = await showConfirm({
            title: 'Delete Repair Ticket?',
            message: 'This will permanently remove this job from the repair queue. This cannot be undone.',
            confirmText: 'Delete Ticket',
            confirmIcon: 'fa-ticket',
            type: 'danger'
        });
        if (confirmed) {
            repairJobs = repairJobs.filter(job => job.id !== id);
            saveState();
            renderTable();
        }
    };

    window.updateJobStatus = (id, newStatus) => {
        const jobIndex = repairJobs.findIndex(j => j.id === id);
        if (jobIndex !== -1) {
            repairJobs[jobIndex].status = newStatus;
            saveState();
            renderTable(); // Changed from renderJobs() to renderTable() to match existing function name
            showToast('Repair job status updated!'); // Added showToast, simplified message as editingId is not defined here
        }
    };

    // PDF Generation for Quotation
    window.generateQuotation = (id) => {
        const job = repairJobs.find(j => j.id === id);
        if (!job) return;
        generatePDF('Estimate', job);
    };

    window.editJob = (id) => {
        const job = repairJobs.find(j => j.id === id);
        if (!job) return;

        // Populate form fields for editing
        document.getElementById('custName').value = job.customerName;
        document.getElementById('custPhone').value = job.phone;
        document.getElementById('deviceType').value = job.deviceType;
        document.getElementById('deviceModel').value = job.model;
        document.getElementById('deviceIssue').value = job.deviceIssue;
        document.getElementById('estPrice').value = job.price;
        document.getElementById('partCost').value = job.partCost;
        document.getElementById('extraCharges').value = job.extraCharges;
        document.getElementById('jobComment').value = job.comment;

        // Set editing state
        editingId = id;
        document.getElementById('submitJobBtn').textContent = 'Update Job';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        document.getElementById('newJobTitle').textContent = 'Edit Repair Job';

        // Scroll to top or form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.sendWhatsApp = (id) => {
        const job = repairJobs.find(j => j.id === id);
        if (!job) return;

        const total = job.price + (job.extraCharges || 0);
        const message = `Hi ${job.customerName}, your ${job.deviceType} (${job.model}) at DOT System is ready for collection. Total: ${formatCurrency(total)}.`;
        const encodedMsg = encodeURIComponent(message);
        const waUrl = `https://wa.me/91${job.phone}?text=${encodedMsg}`;
        
        window.open(waUrl, '_blank');
    };

    window.generateInvoice = (id) => {
        const job = repairJobs.find(j => j.id === id);
        if (!job) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const total = job.price + (job.extraCharges || 0);

        // Header Branding
        doc.setFillColor(15, 23, 42); // --bg-dark
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("DOT SYSTEM", 15, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Premium Device Solutions & Services", 15, 32);
        
        doc.setFontSize(18);
        doc.text("INVOICE", 150, 25);

        // Job & Customer Details
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Invoice To:", 15, 55);
        
        doc.setFont("helvetica", "normal");
        doc.text(`${job.customerName}`, 15, 62);
        doc.text(`+91 ${job.phone}`, 15, 68);
        
        doc.setFont("helvetica", "bold");
        doc.text("Invoice Details:", 130, 55);
        doc.setFont("helvetica", "normal");
        doc.text(`SR No: ${job.srNo}`, 130, 62);
        doc.text(`Date: ${job.createdAt?.split(',')[0]}`, 130, 68);
        doc.text(`Status: ${job.status}`, 130, 74);

        // Table Data
        const tableBody = [
            ["Service Description", `${job.deviceType} Repair (${job.model})`, formatCurrency(job.price)],
            ["Additional Charges", job.comment || "Misc. Parts & Labor", formatCurrency(job.extraCharges)]
        ];

        doc.autoTable({
            startY: 85,
            head: [['Description', 'Details', 'Amount']],
            body: tableBody,
            headStyles: { fillColor: [0, 180, 219], textColor: 255 }, // Cyan matching theme
            theme: 'striped',
            foot: [['', 'Grand Total', formatCurrency(total)]],
            footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' }
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Thank you for choosing DOT System!", 105, finalY, { align: 'center' });
        doc.text("This is a computer-generated invoice.", 105, finalY + 5, { align: 'center' });

        doc.save(`${job.srNo}_Invoice.pdf`);
    };

    function escapeXml(unsafe) {
        if (!unsafe) return '';
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    // --- Initial Load ---
    renderTable();
});
