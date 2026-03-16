document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let inventory = DataController.getInventory();
    let transactions = DataController.getTransactions();

    // --- DOM Elements ---
    const ledgerList = document.getElementById('ledgerList');
    const transactionModal = document.getElementById('transactionModal');
    const transactionForm = document.getElementById('transactionForm');
    const trItemSelect = document.getElementById('trItem');
    const trQtyInput = document.getElementById('trQty');
    const typeSale = document.getElementById('typeSale');
    const stockError = document.getElementById('stockError');
    const confirmTrBtn = document.getElementById('confirmTrBtn');
    const statSalesProfit = document.getElementById('statSalesProfit');

    // --- Utilities ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const escapeXml = (unsafe) => {
        if (!unsafe) return "";
        return unsafe.toString().replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    };

    // --- Core logic ---

    const renderLedger = () => {
        if (!ledgerList) return;
        transactions = DataController.getTransactions();
        ledgerList.innerHTML = '';
        
        if (transactions.length === 0) {
            ledgerList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No transactions logged yet.</td></tr>`;
            return;
        }

        transactions.forEach(tr => {
            const row = document.createElement('tr');
            row.className = tr.type === 'Sale' ? 'ledger-sale' : 'ledger-purchase';
            row.innerHTML = `
                <td>${tr.date}</td>
                <td><strong>${escapeXml(tr.itemName)}</strong></td>
                <td><span class="type-badge ${tr.type.toLowerCase()}">${tr.type}</span></td>
                <td>${tr.qty} Nos</td>
                <td>${formatCurrency(tr.rate)}</td>
                <td style="font-weight: 600;">${formatCurrency(tr.totalValue)}</td>
                <td>
                    <button class="btn-edit" onclick="downloadInvoice('${tr.id}')" title="Download Tax Invoice">
                        <i class="fa-solid fa-file-invoice" style="color: #ec4899;"></i>
                    </button>
                </td>
            `;
            ledgerList.appendChild(row);
        });

        // Update top profit stat
        const saleProfit = DataController.getTransactionProfit();
        if (statSalesProfit) {
            statSalesProfit.textContent = formatCurrency(saleProfit);
            statSalesProfit.style.color = saleProfit >= 0 ? '#10b981' : '#ef4444';
        }
    };

    window.openTransactionModal = () => {
        inventory = DataController.getInventory(); // Refresh for latest qty
        trItemSelect.innerHTML = '<option value="" disabled selected>Select an item...</option>';
        inventory.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.name} (Avl: ${item.qty})`;
            trItemSelect.appendChild(opt);
        });
        transactionModal.classList.add('active');
    };

    window.closeTransactionModal = () => {
        transactionModal.classList.remove('active');
        transactionForm.reset();
        stockError.style.display = 'none';
        trQtyInput.classList.remove('vibrate-error');
        confirmTrBtn.disabled = false;
    };

    const validateTrStock = () => {
        const item = inventory.find(i => i.id === trItemSelect.value);
        const qty = parseFloat(trQtyInput.value) || 0;
        const isSale = typeSale.checked;

        if (isSale && item && qty > item.qty) {
            stockError.style.display = 'block';
            trQtyInput.classList.add('vibrate-error');
            confirmTrBtn.disabled = true;
        } else {
            stockError.style.display = 'none';
            trQtyInput.classList.remove('vibrate-error');
            confirmTrBtn.disabled = false;
        }
    };

    if (trQtyInput) trQtyInput.addEventListener('input', validateTrStock);
    if (trItemSelect) trItemSelect.addEventListener('change', validateTrStock);
    document.getElementById('typeSale')?.addEventListener('change', validateTrStock);
    document.getElementById('typePurchase')?.addEventListener('change', validateTrStock);

    if (transactionForm) {
        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const typeValue = document.querySelector('input[name="trType"]:checked').value;
            const itemId = trItemSelect.value;
            const qty = parseFloat(trQtyInput.value);

            const result = DataController.updateStock(itemId, typeValue, qty);
            if (result.success) {
                closeTransactionModal();
                renderLedger();
                showToast(`Stock updated! ${typeValue} logged successfully.`);
            } else {
                alert(result.reason);
            }
        });
    }

    window.downloadInvoice = (id) => {
        const tr = transactions.find(t => t.id === id);
        if (!tr) return;
        generatePDF('Invoice', {
            id: tr.id,
            orgName: 'Customer',
            items: [{product: tr.itemName, qty: tr.qty, price: tr.rate}],
            amount: tr.totalValue
        });
    };

    // --- Initial Load ---
    renderLedger();
});
