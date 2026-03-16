document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let amcContracts = DataController.getAmc();
    let crmHistory = DataController.getCrmHistory();
    let employees = DataController.getEmployees();
    let serviceCalls = DataController.getServiceCalls();
    let currentFilter = null; // To track service history filter

    // --- DOM ---
    const amcForm = document.getElementById('amcForm');
    const amcGrid = document.getElementById('amcGrid');
    const emptyAmc = document.getElementById('emptyAmc');
    const totalAmcsBadge = document.getElementById('totalAmcs');
    const crmIndicator = document.getElementById('crmIndicator');
    const orgInput = document.getElementById('orgName');
    const contactInput = document.getElementById('contactPerson');

    const serviceCallForm = document.getElementById('serviceCallForm');
    const callOrgSelect = document.getElementById('callOrg');
    const callTechSelect = document.getElementById('callTech');
    const serviceHistoryList = document.getElementById('serviceHistoryList');
    const emptyHistoryRow = document.getElementById('emptyHistoryRow');
    const totalCallsBadge = document.getElementById('totalCalls');
    const historyFilterTag = document.getElementById('historyFilterTag');
    const clearHistoryFilterBtn = document.getElementById('clearHistoryFilter');

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
        DataController.saveAmc(amcContracts);
        DataController.saveCrmHistory(crmHistory);
        DataController.saveServiceCalls(serviceCalls);
    };

    const calculateNextService = (startDate) => {
        const start = new Date(startDate);
        const today = new Date();
        
        // Default 90 day frequency
        let nextService = new Date(start);
        while (nextService <= today) {
            nextService.setDate(nextService.getDate() + 90);
        }
        return nextService;
    };

    const getStatusColor = (endDate) => {
        const end = new Date(endDate);
        const today = new Date();
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'danger';
        if (diffDays <= 30) return 'warning';
        return '';
    };


    // --- Asset Row Management ---
    const assetListContainer = document.getElementById('assetListContainer');
    const addAssetBtn = document.getElementById('addAssetBtn');

    const addAssetRow = (data = { name: '', qty: 1, notes: '' }) => {
        const rowId = 'row_' + Date.now() + Math.random().toString(36).substr(2, 5);
        const row = document.createElement('div');
        row.className = 'asset-row fade-in';
        row.id = rowId;
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 80px 1fr 40px';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';

        row.innerHTML = `
            <input type="text" placeholder="Product Name" value="${data.name}" class="asset-name" required>
            <input type="number" placeholder="Qty" value="${data.qty}" class="asset-qty" min="1" required>
            <input type="text" placeholder="Notes (S/N, etc)" value="${data.notes}" class="asset-notes">
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="btn-delete" style="padding: 0.5rem; color: var(--danger);">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        assetListContainer.appendChild(row);
    };

    if (addAssetBtn) {
        addAssetBtn.addEventListener('click', () => addAssetRow());
    }

    // Add initial row
    if (assetListContainer && assetListContainer.children.length === 0) {
        addAssetRow();
    }

    const renderAmcs = () => {
        if (amcContracts.length === 0) {
            amcGrid.innerHTML = '';
            amcGrid.appendChild(emptyAmc);
            totalAmcsBadge.textContent = '0 Active';
            return;
        }

        amcGrid.innerHTML = '';
        amcContracts.forEach((amc, index) => {
            const statusClass = getStatusColor(amc.endDate);
            const nextService = calculateNextService(amc.startDate);
            
            const card = document.createElement('div');
            card.className = `amc-card ${statusClass} fade-in`;
            card.style.animationDelay = `${index * 0.1}s`;

            // Prepare Assets HTML
            let assetsHtml = 'No assets listed.';
            if (amc.assets && Array.isArray(amc.assets) && amc.assets.length > 0) {
                assetsHtml = amc.assets.map(asset => `
                    <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dotted var(--border); font-size: 0.8rem;">
                        <span style="flex: 1; font-weight: 600;">${escapeXml(asset.name)}</span>
                        <span style="width: 40px; text-align: center; color: var(--accent);">${asset.qty}</span>
                        <span style="flex: 1; text-align: right; opacity: 0.7;">${escapeXml(asset.notes || '')}</span>
                    </div>
                `).join('');
            } else if (typeof amc.assets === 'string' && amc.assets.trim()) {
                assetsHtml = escapeXml(amc.assets);
            }

            card.innerHTML = `
                <div class="amc-status-stripe"></div>
                <div class="amc-header">
                    <div class="amc-info">
                        <div class="amc-org">${escapeXml(amc.orgName)}</div>
                        <div class="amc-contact"><i class="fa-solid fa-user-tie"></i> ${escapeXml(amc.contact)}</div>
                    </div>
                </div>

                <div class="amc-details">
                    <div class="amc-detail-item">
                        <span class="amc-label">Type</span>
                        <span class="amc-value">${amc.type}</span>
                    </div>
                    <div class="amc-detail-item">
                        <span class="amc-label">Billing</span>
                        <span class="amc-value">${amc.payCycle}</span>
                    </div>
                    <div class="amc-detail-item">
                        <span class="amc-label">Started</span>
                        <span class="amc-value">${new Date(amc.startDate).toLocaleDateString()}</span>
                    </div>
                    <div class="amc-detail-item">
                        <span class="amc-label">Ends</span>
                        <span class="amc-value">${new Date(amc.endDate).toLocaleDateString()}</span>
                    </div>
                </div>

                <div class="amc-assets">
                    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--border); padding-bottom: 0.2rem; margin-bottom: 0.4rem;">
                        <span class="amc-label" style="flex: 1;">Product</span>
                        <span class="amc-label" style="width: 40px; text-align: center;">Qty</span>
                        <span class="amc-label" style="flex: 1; text-align: right;">Notes</span>
                    </div>
                    <div style="max-height: 120px; overflow-y: auto;">
                        ${assetsHtml}
                    </div>
                </div>

                <div class="amc-footer">
                    <div class="amc-price">${formatCurrency(amc.amount)}</div>
                    <div class="amc-next-service">
                        <i class="fa-solid fa-screwdriver-wrench"></i> Next: ${new Date(amc.nextServiceDate || nextService).toLocaleDateString()}
                    </div>
                </div>

                <div class="maintenance-log">
                    <div class="log-header">
                        <span>Maintenance Log</span>
                        <span style="font-size: 0.7rem;">Every 90 Days</span>
                    </div>
                    <ul class="log-list">
                        <li class="log-item">
                            <input type="checkbox" class="service-checkbox" onchange="markServiceComplete('${amc.id}')">
                            <span>Quarterly Visit (Mark Complete)</span>
                        </li>
                        ${(amc.maintenanceLog || []).map(log => `
                            <li class="log-item" style="opacity: 0.7;">
                                <i class="fa-solid fa-circle-check text-green"></i> 
                                <span>Completed: ${new Date(log).toLocaleDateString()}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                    <button class="btn btn-accent w-full" onclick="exportAmcInvoice('${amc.id}')" title="Tally XML">
                        <i class="fa-solid fa-file-code"></i> Tally
                    </button>
                    <button class="btn btn-primary w-full" onclick="downloadAmcInvoice('${amc.id}')" title="Download Invoice">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                    </button>
                    <button class="btn btn-outline w-full" onclick="filterHistoryByAmc('${amc.id}')" title="View History">
                        <i class="fa-solid fa-clock-rotate-left"></i> Calls
                    </button>
                    <button class="btn-delete-animated" onclick="deleteAmc('${amc.id}')" title="Delete">
                         <svg viewBox="0 0 448 512" class="svgIcon"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path></svg>
                    </button>
                </div>
            `;
            amcGrid.appendChild(card);
        });

        totalAmcsBadge.textContent = `${amcContracts.length} Active`;
        populateCallDropdowns();
    };

    const populateCallDropdowns = () => {
        if (!callOrgSelect || !callTechSelect) return;

        // Populate Organizations
        const currentOrg = callOrgSelect.value;
        callOrgSelect.innerHTML = '<option value="" disabled selected>Choose an active AMC...</option>';
        amcContracts.forEach(amc => {
            const opt = document.createElement('option');
            opt.value = amc.id;
            opt.textContent = amc.orgName;
            callOrgSelect.appendChild(opt);
        });
        if (currentOrg) callOrgSelect.value = currentOrg;

        // Populate Technicians
        const currentTech = callTechSelect.value;
        callTechSelect.innerHTML = '<option value="" disabled selected>Assign Technician...</option>';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.name;
            opt.textContent = emp.name;
            callTechSelect.appendChild(opt);
        });
        if (currentTech) callTechSelect.value = currentTech;
    };

    const renderServiceHistory = () => {
        if (!serviceHistoryList) return;

        let filteredCalls = serviceCalls;
        if (currentFilter) {
            filteredCalls = serviceCalls.filter(call => call.amcId === currentFilter);
            historyFilterTag.style.display = 'block';
            clearHistoryFilterBtn.style.display = 'block';
            const amc = amcContracts.find(a => a.id === currentFilter);
            historyFilterTag.textContent = `Filtered: ${amc ? amc.orgName : 'Unknown'}`;
        } else {
            historyFilterTag.style.display = 'none';
            clearHistoryFilterBtn.style.display = 'none';
        }

        if (filteredCalls.length === 0) {
            serviceHistoryList.innerHTML = '';
            serviceHistoryList.appendChild(emptyHistoryRow);
            totalCallsBadge.textContent = '0 Calls';
            return;
        }

        serviceHistoryList.innerHTML = '';
        filteredCalls.forEach(call => {
            const tr = document.createElement('tr');
            const amc = amcContracts.find(a => a.id === call.amcId);
            const statusClass = call.status === 'Resolved' ? 'salary-badge' : 'expenses-badge';

            tr.innerHTML = `
                <td style="font-weight: 500;">${escapeXml(amc ? amc.orgName : 'N/A')}</td>
                <td style="font-size: 0.85rem;">${new Date(call.date).toLocaleDateString()}</td>
                <td><i class="fa-solid fa-user-gear" style="font-size: 0.8rem; margin-right: 0.3rem;"></i> ${escapeXml(call.tech)}</td>
                <td style="max-width: 200px; font-size: 0.85rem;" title="${escapeXml(call.problem)}">
                    <span class="text-truncate">${escapeXml(call.problem)}</span>
                </td>
                <td><span class="${statusClass}" onclick="toggleCallStatus('${call.id}')" style="cursor: pointer;">${call.status}</span></td>
                <td>
                    <button class="btn-delete" onclick="deleteCall('${call.id}')" style="color: var(--danger); padding: 0.3rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            serviceHistoryList.appendChild(tr);
        });

        totalCallsBadge.textContent = `${filteredCalls.length} Calls`;
    };

    window.toggleCallStatus = (id) => {
        const call = serviceCalls.find(c => c.id === id);
        if (call) {
            call.status = call.status === 'Open' ? 'Resolved' : 'Open';
            saveState();
            renderServiceHistory();
        }
    };

    window.deleteCall = async (id) => {
        const confirmed = await showConfirm({
            title: 'Delete Service Log?',
            message: 'This will permanently remove this service call entry.',
            confirmText: 'Delete',
            confirmIcon: 'fa-trash-can',
            type: 'danger'
        });
        if (confirmed) {
            serviceCalls = serviceCalls.filter(c => c.id !== id);
            saveState();
            renderServiceHistory();
        }
    };

    window.filterHistoryByAmc = (amcId) => {
        currentFilter = amcId;
        renderServiceHistory();
        // Scroll to history
        document.getElementById('serviceHistoryList').closest('.glass-card').scrollIntoView({ behavior: 'smooth' });
    };

    if (clearHistoryFilterBtn) {
        clearHistoryFilterBtn.addEventListener('click', () => {
            currentFilter = null;
            renderServiceHistory();
        });
    }

    // --- Actions ---
    amcForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const orgName = orgInput.value.trim();
        const contact = contactInput.value.trim();
        const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : ''; // Fix reference
        const amcAmountInput = document.getElementById('amcAmount');
        const amount = Math.max(0, parseFloat(amcAmountInput.dataset.rawValue || amcAmountInput.value) || 0);

        // Collect Assets
        const assetRows = assetListContainer.querySelectorAll('.asset-row');
        const assets = Array.from(assetRows).map(row => ({
            name: row.querySelector('.asset-name').value.trim(),
            qty: parseInt(row.querySelector('.asset-qty').value) || 1,
            notes: row.querySelector('.asset-notes').value.trim()
        })).filter(a => a.name !== '');

        const newAmc = {
            id: 'amc_' + Date.now().toString(),
            orgName: orgName,
            contact: contact,
            phone: phone,
            type: document.getElementById('amcType').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            payCycle: document.getElementById('payCycle').value,
            amount: amount,
            assets: assets,
            status: 'Active',
            createdAt: new Date().toISOString()
        };

        crmHistory[phone || orgName] = {
            name: newAmc.orgName,
            contact: newAmc.contact,
            lastVisit: new Date().toLocaleDateString(),
            type: 'AMC'
        };

        amcContracts.push(newAmc);
        saveState();
        amcForm.reset();
        assetListContainer.innerHTML = '';
        addAssetRow();

        refreshApp();
        showToast('New AMC contract registered successfully!');
    });

    window.deleteAmc = async (id) => {
        const confirmed = await showConfirm({
            title: 'Remove AMC Contract?',
            message: 'This will permanently delete this AMC contract and all associated maintenance logs.',
            confirmText: 'Remove Contract',
            confirmIcon: 'fa-file-circle-xmark',
            type: 'danger'
        });
        if (confirmed) {
            amcContracts = amcContracts.filter(a => a.id !== id);
            saveState();
            renderAmcs();
        }
    };

    window.markServiceComplete = (id) => {
        const amc = amcContracts.find(a => a.id === id);
        if (!amc) return;

        // 1. Calculate next date (90 days from today)
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 90);
        
        // 2. Initialize log if not exists
        if (!amc.maintenanceLog) amc.maintenanceLog = [];
        
        // 3. Add current completion to log
        amc.maintenanceLog.unshift(new Date().toISOString());
        
        // 4. Update next service date
        amc.nextServiceDate = nextDate.toISOString();

        saveState();
        renderAmcs();
        
        showToast(`Service complete for ${amc.orgName}. Next: ${nextDate.toLocaleDateString()}`);
    };

    window.downloadAmcInvoice = (id) => {
        const amc = amcContracts.find(a => a.id === id);
        if (!amc) return;
        generatePDF('Invoice', {
            id: amc.id,
            orgName: amc.orgName,
            customer: amc.contact,
            phone: amc.phone,
            items: amc.assets.map(a => ({ product: a.name, qty: a.qty, price: amc.amount / (amc.assets.length || 1) })),
            amount: amc.amount
        });
    };

    window.exportAmcInvoice = (id) => {
        const amc = amcContracts.find(a => a.id === id);
        if (!amc) return;

        const gstRate = 0.18;
        const baseAmount = amc.amount / (1 + gstRate);
        const gstAmount = amc.amount - baseAmount;
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

        let xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>${escapeXml(amc.orgName)}</PARTYLEDGERNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(amc.orgName)}</LEDGERNAME>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-${amc.amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>AMC Service Revenue</LEDGERNAME>
              <AMOUNT>${baseAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output IGST @ 18%</LEDGERNAME>
              <AMOUNT>${gstAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AMC_Invoice_${amc.orgName.replace(/\s+/g, '_')}.xml`;
        a.click();
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

    renderAmcs();
    renderServiceHistory();
});
