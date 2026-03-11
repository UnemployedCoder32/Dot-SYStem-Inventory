document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let amcContracts = JSON.parse(localStorage.getItem('hardware_sync_amc')) || [];

    // --- DOM ---
    const amcForm = document.getElementById('amcForm');
    const amcGrid = document.getElementById('amcGrid');
    const emptyAmc = document.getElementById('emptyAmc');
    const totalAmcsBadge = document.getElementById('totalAmcs');

    // --- Utilities ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const saveState = () => {
        localStorage.setItem('hardware_sync_amc', JSON.stringify(amcContracts));
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
                    <span class="amc-label" style="display:block; margin-bottom: 0.3rem;">Assets Covered</span>
                    ${escapeXml(amc.assets || 'No assets listed.')}
                </div>

                <div class="amc-footer">
                    <div class="amc-price">${formatCurrency(amc.amount)}</div>
                    <div class="amc-next-service">
                        <i class="fa-solid fa-screwdriver-wrench"></i> Next: ${nextService.toLocaleDateString()}
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="btn btn-accent w-full" onclick="exportAmcInvoice('${amc.id}')" style="font-size: 0.8rem; padding: 0.5rem;">
                        <i class="fa-solid fa-file-invoice-dollar"></i> Tally XML
                    </button>
                    <button class="btn btn-delete" onclick="deleteAmc('${amc.id}')" style="padding: 0.5rem; width: 45px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            amcGrid.appendChild(card);
        });

        totalAmcsBadge.textContent = `${amcContracts.length} Active`;
    };

    // --- Actions ---
    amcForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newAmc = {
            id: 'amc_' + Date.now().toString(),
            orgName: document.getElementById('orgName').value.trim(),
            contact: document.getElementById('contactPerson').value.trim(),
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            payCycle: document.getElementById('payCycle').value,
            type: document.getElementById('amcType').value,
            amount: parseFloat(document.getElementById('amcAmount').value),
            assets: document.getElementById('assetList').value.trim(),
            createdAt: new Date().toISOString()
        };

        amcContracts.push(newAmc);
        saveState();
        amcForm.reset();
        renderAmcs();
    });

    window.deleteAmc = (id) => {
        if (confirm('Permanently remove this AMC contract?')) {
            amcContracts = amcContracts.filter(a => a.id !== id);
            saveState();
            renderAmcs();
        }
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
});
