document.addEventListener('DOMContentLoaded', () => {
    const inventoryForm = document.getElementById('inventoryForm');
    const inventoryList = document.getElementById('inventoryList');
    const emptyState = document.getElementById('emptyState');
    const inventoryFooter = document.getElementById('inventoryFooter');
    const totalItemsBadge = document.getElementById('totalItems');
    const totalValueEl = document.getElementById('totalValue');
    const exportVoucherBtn = document.getElementById('exportVoucherBtn');
    const importTallyBtn = document.getElementById('importTallyBtn');
    const importTallyInput = document.getElementById('importTallyInput');
    const submitBtn = inventoryForm.querySelector('button[type="submit"]');
    const addItemSection = document.querySelector('.add-item-section');

    let editingId = null;

    // --- Data Persistence ---
    const saveState = () => {
        localStorage.setItem('hardware_sync_inventory', JSON.stringify(inventory));
    };

    const loadState = () => {
        const saved = localStorage.getItem('hardware_sync_inventory');
        if (saved) {
            inventory = JSON.parse(saved);
            renderInventory();
        }
    };

    // --- Auth State ---
    const authOverlay = document.getElementById('auth-overlay');
    const authForm = document.getElementById('auth-form');
    const authPasswordInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    
    // Check if already unlocked in this session
    if (sessionStorage.getItem('tally_main_unlocked') === 'true') {
        authOverlay.classList.add('hidden');
    }

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = authPasswordInput.value;
        
        if (pwd === 'DOTSYSTEM2026') {
            sessionStorage.setItem('tally_main_unlocked', 'true');
            authOverlay.style.opacity = '0';
            setTimeout(() => {
                authOverlay.classList.add('hidden');
                authOverlay.style.opacity = '1';
            }, 500);
        } else {
            authError.classList.add('visible');
            authPasswordInput.value = '';
            authPasswordInput.focus();
            
            // Shake effect
            const authBox = document.querySelector('.auth-box');
            authBox.style.transform = 'translateX(-10px)';
            setTimeout(() => authBox.style.transform = 'translateX(10px)', 50);
            setTimeout(() => authBox.style.transform = 'translateX(-10px)', 100);
            setTimeout(() => authBox.style.transform = 'translateX(10px)', 150);
            setTimeout(() => authBox.style.transform = 'translateX(0)', 200);
            
            setTimeout(() => {
                authError.classList.remove('visible');
            }, 3000);
        }
    });

    let inventory = [];

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    // Escape XML special characters
    const escapeXml = (unsafe) => {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    };

    // Add Item
    inventoryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('partName');
        const qtyInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');
        const minStockInput = document.getElementById('minStock');

        const itemData = {
            name: nameInput.value.trim(),
            qty: parseFloat(qtyInput.value),
            minStock: parseFloat(minStockInput.value) || 0,
            price: parseFloat(priceInput.value)
        };

        if (editingId) {
            // Update mode
            const index = inventory.findIndex(item => item.id === editingId);
            if (index !== -1) {
                inventory[index] = { ...inventory[index], ...itemData };
            }
            editingId = null;
            submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Inventory';
            addItemSection.classList.remove('editing-mode');
        } else {
            // Add mode
            const item = {
                id: Date.now().toString(),
                ...itemData
            };
            inventory.push(item);
        }
        
        saveState();
        
        // Reset form
        inventoryForm.reset();
        nameInput.focus();

        renderInventory();
    });

    // Edit Item
    window.editItem = (id) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;

        editingId = id;
        document.getElementById('partName').value = item.name;
        document.getElementById('quantity').value = item.qty;
        document.getElementById('minStock').value = item.minStock;
        document.getElementById('price').value = item.price;

        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Part Info';
        addItemSection.classList.add('editing-mode');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Delete Item
    window.deleteItem = (id) => {
        if (confirm('Remove this item from inventory?')) {
            if (editingId === id) {
                editingId = null;
                inventoryForm.reset();
                submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Inventory';
                addItemSection.classList.remove('editing-mode');
            }
            inventory = inventory.filter(item => item.id !== id);
            saveState();
            renderInventory();
        }
    };

    // Render Table
    const renderInventory = () => {
        if (inventory.length === 0) {
            inventoryList.innerHTML = '';
            inventoryList.appendChild(emptyState);
            inventoryFooter.style.display = 'none';
            exportBtn.disabled = true;
            exportVoucherBtn.disabled = true;
            totalItemsBadge.textContent = '0 Items';
            return;
        }

        inventoryList.innerHTML = '';
        let totalVal = 0;

        inventory.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = 'fade-in';
            tr.style.animationDelay = `${index * 0.05}s`;
            
            const itemValue = item.qty * item.price;
            totalVal += itemValue;

            const isLowStock = item.qty < item.minStock;
            if (isLowStock) {
                tr.classList.add('low-stock-row');
            }

            tr.innerHTML = `
                <td><strong>${escapeXml(item.name)}</strong></td>
                <td>${item.qty} Nos</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(itemValue)}</td>
                <td>${isLowStock ? '<span class="badge-restock">Restock</span>' : '<span style="color: grey; opacity: 0.5; font-size: 0.8rem;">Stock OK</span>'}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteItem('${item.id}')" title="Remove Item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;

            inventoryList.appendChild(tr);
        });

        totalValueEl.innerHTML = `<strong>${formatCurrency(totalVal)}</strong>`;
        totalItemsBadge.textContent = `${inventory.length} Item${inventory.length > 1 ? 's' : ''}`;
        
        // Update Insights Bar
        updateBusinessInsights(inventory, totalVal);

        inventoryFooter.style.display = 'table-row-group';
        exportBtn.disabled = false;
        exportVoucherBtn.disabled = false;
    };

    const updateBusinessInsights = (data, totalValue) => {
        const statTotalItems = document.getElementById('statTotalItems');
        const statTotalValue = document.getElementById('statTotalValue');
        const statStockHealth = document.getElementById('statStockHealth');
        const healthIconBox = document.getElementById('healthIconBox');

        statTotalItems.textContent = data.length;
        statTotalValue.textContent = formatCurrency(totalValue);

        if (data.length === 0) {
            statStockHealth.textContent = '100%';
            healthIconBox.style.color = '#10b981';
            healthIconBox.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            return;
        }

        const itemsInHealth = data.filter(item => item.qty >= item.minStock).length;
        const healthPercentage = Math.round((itemsInHealth / data.length) * 100);
        
        statStockHealth.textContent = `${healthPercentage}%`;

        // Update color based on health
        if (healthPercentage < 50) {
            healthIconBox.style.color = 'var(--danger)';
            healthIconBox.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            statStockHealth.style.color = 'var(--danger)';
        } else if (healthPercentage < 90) {
            healthIconBox.style.color = '#f59e0b';
            healthIconBox.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            statStockHealth.style.color = '#f59e0b';
        } else {
            healthIconBox.style.color = '#10b981';
            healthIconBox.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            statStockHealth.style.color = '#10b981';
        }
    };

    // Generate Tally XML
    const generateTallyXML = () => {
        let xmlStr = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
`;

        inventory.forEach(item => {
            // Tally considers Debit balances as negative in Opening Value XML
            const openingValue = -(item.qty * item.price);
            
            xmlStr += `          <STOCKITEM NAME="${escapeXml(item.name)}" ACTION="Create">
            <NAME>${escapeXml(item.name)}</NAME>
            <BASEUNITS>Nos</BASEUNITS>
            <OPENINGBALANCE>${item.qty} Nos</OPENINGBALANCE>
            <OPENINGVALUE>${openingValue}</OPENINGVALUE>
            <OPENINGRATE>${item.price}/Nos</OPENINGRATE>
          </STOCKITEM>\n`;
        });

        xmlStr += `        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

        return xmlStr;
    };

    // Generate Tally Sales Voucher XML
    const generateTallyVoucherXML = (totalVal) => {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        let xmlStr = `<?xml version="1.0" encoding="utf-8"?>
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
            <PARTYLEDGERNAME>Cash</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice View</PERSISTEDVIEW>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Cash</LEDGERNAME>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-${totalVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Accounts</LEDGERNAME>
              <AMOUNT>${totalVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>\n`;

        inventory.forEach(item => {
            const itemValue = item.qty * item.price;
            xmlStr += `            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${escapeXml(item.name)}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ACTUALQTY>${item.qty} Nos</ACTUALQTY>
              <BILLEDQTY>${item.qty} Nos</BILLEDQTY>
              <RATE>${item.price}/Nos</RATE>
              <AMOUNT>${itemValue}</AMOUNT>
            </ALLINVENTORYENTRIES.LIST>\n`;
        });

        xmlStr += `          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

        return xmlStr;
    };

    // Download XML Function
    const downloadFile = (content, filename) => {
        const blob = new Blob([content], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    // Download Masters
    exportBtn.addEventListener('click', () => {
        const xmlContent = generateTallyXML();
        downloadFile(xmlContent, 'Tally_Masters_Import.xml');
    });

    // Download Voucher
    exportVoucherBtn.addEventListener('click', () => {
        let totalVal = 0;
        inventory.forEach(item => totalVal += (item.qty * item.price));
        const xmlContent = generateTallyVoucherXML(totalVal);
        downloadFile(xmlContent, 'Tally_Sales_Voucher_Import.xml');
    });

    // Tally Import Logic
    importTallyBtn.addEventListener('click', () => importTallyInput.click());

    importTallyInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(event.target.result, "text/xml");
                const stockItems = xmlDoc.getElementsByTagName('STOCKITEM');
                
                if (stockItems.length === 0) {
                    alert("No stock items found in the XML file. Please ensure it is a valid Tally export.");
                    return;
                }

                let importedCount = 0;
                Array.from(stockItems).forEach(itemNode => {
                    const name = itemNode.getElementsByTagName('NAME')[0]?.textContent || 
                                 itemNode.getAttribute('NAME');
                    
                    if (!name) return;

                    // Clean quantity (remove "Nos" etc)
                    let qtyStr = itemNode.getElementsByTagName('OPENINGBALANCE')[0]?.textContent || "0";
                    let qty = parseFloat(qtyStr.replace(/[^-0-9.]/g, '')) || 0;
                    if (qty < 0) qty = Math.abs(qty); // Tally balances can be negative

                    // Clean rate
                    let rateStr = itemNode.getElementsByTagName('OPENINGRATE')[0]?.textContent || "0";
                    let price = parseFloat(rateStr.replace(/[^-0-9.]/g, '')) || 0;

                    // Merge or Append
                    const existingIndex = inventory.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
                    if (existingIndex !== -1) {
                        inventory[existingIndex].qty += qty;
                        // Keep highest price? Or update? Let's update.
                        if (price > 0) inventory[existingIndex].price = price;
                    } else {
                        inventory.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            name: name,
                            qty: qty,
                            minStock: 0,
                            price: price
                        });
                    }
                    importedCount++;
                });

                saveState();
                renderInventory();
                alert(`Successfully imported ${importedCount} items from Tally XML.`);
                importTallyInput.value = ''; // Reset
            } catch (err) {
                console.error(err);
                alert("Error parsing XML file. Please check the file format.");
            }
        };
        reader.readAsText(file);
    });

    // Initial Load
    loadState();
});
