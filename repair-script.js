document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let repairJobs = JSON.parse(localStorage.getItem('tally_repair_jobs')) || [];
    let filterQuery = '';

    // --- DOM Elements ---
    const repairForm = document.getElementById('repairForm');
    const jobList = document.getElementById('jobList');
    const emptyRow = document.getElementById('emptyJobRow');
    const totalJobsBadge = document.getElementById('totalJobs');
    const jobSearch = document.getElementById('jobSearch');

    // --- Utilities ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const saveState = () => {
        localStorage.setItem('tally_repair_jobs', JSON.stringify(repairJobs));
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
            if (repairJobs.length === 0) {
                jobList.appendChild(emptyRow);
            } else {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted)">No matching records found.</td>`;
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
                    <div style="font-weight: bold;">${formatCurrency(totalFinal)}</div>
                    ${job.extraCharges > 0 ? `<div style="font-size: 0.7rem; color: var(--danger);">+ ${formatCurrency(job.extraCharges)} extra</div>` : ''}
                </td>
                <td>
                    <span class="status-badge ${job.status === 'Completed' ? 'completed' : ''}">${job.status}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <button class="btn-wa" onclick="sendWhatsApp('${job.id}')" title="Send WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        <button class="details-btn" style="padding: 0.4rem 0.6rem;" onclick="toggleStatus('${job.id}')" title="Change Status">
                            <i class="fa-solid ${job.status === 'Pending' ? 'fa-check' : 'fa-clock'}"></i>
                        </button>
                        <button class="btn-delete" style="padding: 0.4rem 0.6rem;" onclick="deleteJob('${job.id}')" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            jobList.appendChild(tr);
        });

        totalJobsBadge.textContent = `${repairJobs.length} Job${repairJobs.length > 1 ? 's' : ''}`;
    };

    // --- Core Features ---

    repairForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('custName');
        const phoneInput = document.getElementById('custPhone');
        const typeInput = document.getElementById('deviceType');
        const modelInput = document.getElementById('deviceModel');
        const issueInput = document.getElementById('deviceIssue');
        const priceInput = document.getElementById('estPrice');
        const extraInput = document.getElementById('extraCharges');
        const commentInput = document.getElementById('jobComment');

        const newJob = {
            id: 'job_' + Date.now().toString(),
            srNo: generateSRNo(),
            customerName: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            deviceType: typeInput.value,
            model: modelInput.value.trim(),
            deviceIssue: issueInput.value.trim(),
            price: parseFloat(priceInput.value) || 0,
            extraCharges: parseFloat(extraInput.value) || 0,
            comment: commentInput.value.trim(),
            status: 'Pending',
            createdAt: new Date().toLocaleString()
        };

        repairJobs.push(newJob);
        saveState();
        repairForm.reset();
        nameInput.focus();
        renderTable();
    });

    jobSearch.addEventListener('input', (e) => {
        filterQuery = e.target.value;
        renderTable();
    });

    window.deleteJob = (id) => {
        if (confirm('Are you sure you want to delete this repair ticket?')) {
            repairJobs = repairJobs.filter(job => job.id !== id);
            saveState();
            renderTable();
        }
    };

    window.toggleStatus = (id) => {
        const jobIndex = repairJobs.findIndex(j => j.id === id);
        if (jobIndex !== -1) {
            repairJobs[jobIndex].status = repairJobs[jobIndex].status === 'Pending' ? 'Completed' : 'Pending';
            saveState();
            renderTable();
        }
    };

    window.sendWhatsApp = (id) => {
        const job = repairJobs.find(j => j.id === id);
        if (!job) return;

        const total = job.price + (job.extraCharges || 0);
        const message = `Hi ${job.customerName}, your ${job.deviceType} (${job.model}) at Hardware Sync is ready for collection. Total: ${formatCurrency(total)}.`;
        const encodedMsg = encodeURIComponent(message);
        const waUrl = `https://wa.me/91${job.phone}?text=${encodedMsg}`;
        
        window.open(waUrl, '_blank');
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
