document.addEventListener('DOMContentLoaded', () => {
    
    // --- Auth State ---
    const authOverlay = document.getElementById('auth-overlay');
    const authForm = document.getElementById('auth-form');
    const authPasswordInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    
    // Check if already unlocked in this session
    if (sessionStorage.getItem('tally_payroll_unlocked') === 'true') {
        authOverlay.classList.add('hidden');
    }

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = authPasswordInput.value;
        
        if (pwd === 'ADMIN123') {
            sessionStorage.setItem('tally_payroll_unlocked', 'true');
            authOverlay.style.opacity = '0';
            setTimeout(() => {
                authOverlay.classList.add('hidden');
                authOverlay.style.opacity = '1'; // reset for future
            }, 500);
        } else {
            authError.classList.add('visible');
            authPasswordInput.value = '';
            authPasswordInput.focus();
            
            // Shake effect for error
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

    // --- State Management ---
    // Example format: { id: "123", name: "Rahul", baseSalary: 20000, expenses: [{ type: "Petrol", amount: 500, note: "..." }] }
    let employees = JSON.parse(localStorage.getItem('tally_employees')) || [];

    // --- DOM Elements ---
    const empForm = document.getElementById('employeeForm');
    const expForm = document.getElementById('expenseForm');
    const expEmpSelect = document.getElementById('expenseEmp');
    
    const payrollList = document.getElementById('payrollList');
    const emptyRow = document.getElementById('emptyPayrollRow');
    const payrollFooter = document.getElementById('payrollFooter');
    
    const totalEmployeesBadge = document.getElementById('totalEmployees');
    const totalPayoutBadge = document.getElementById('totalPayout');
    const clearDataBtn = document.getElementById('clearDataBtn');

    // Modal Elements
    const modal = document.getElementById('expenseModal');
    const modalEmpName = document.getElementById('modalEmpName');
    const modalExpenseList = document.getElementById('modalExpenseList');
    const modalTotal = document.getElementById('modalTotal');

    // --- Utilities ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const saveState = () => {
        localStorage.setItem('tally_employees', JSON.stringify(employees));
    };

    // --- Core Features ---

    const renderDropdown = () => {
        expEmpSelect.innerHTML = '<option value="" disabled selected>Choose an employee...</option>';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.name;
            expEmpSelect.appendChild(opt);
        });
    };

    const renderTable = () => {
        if (employees.length === 0) {
            payrollList.innerHTML = '';
            payrollList.appendChild(emptyRow);
            payrollFooter.style.display = 'none';
            totalEmployeesBadge.textContent = '0 Employees';
            return;
        }

        payrollList.innerHTML = '';
        let grandTotalPayout = 0;

        employees.forEach(emp => {
            const totalExpenses = emp.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const netSalary = emp.baseSalary + totalExpenses; // Adds expenses to the base
            
            grandTotalPayout += netSalary;

            const tr = document.createElement('tr');
            tr.className = 'fade-in';
            
            tr.innerHTML = `
                <td>
                    <strong>${emp.name}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
                        <span>+91 ${emp.phone || 'N/A'}</span>
                        ${emp.phone ? `<a href="tel:+91${emp.phone}" class="btn-call" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" title="Call Employee">
                            <i class="fa-solid fa-phone-volume"></i>
                        </a>` : ''}
                    </div>
                </td>
                <td>${formatCurrency(emp.baseSalary)}</td>
                <td><span class="${totalExpenses > 0 ? 'expenses-badge' : ''}">${formatCurrency(totalExpenses)}</span></td>
                <td><span class="salary-badge">${formatCurrency(netSalary)}</span></td>
                <td>
                    <button class="details-btn" onclick="openExpenseModal('${emp.id}')" title="View Items">
                        <i class="fa-solid fa-list"></i> Details
                    </button>
                    <button class="btn-delete" onclick="deleteEmployee('${emp.id}')" title="Remove" style="margin-left: 0.5rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            payrollList.appendChild(tr);
        });

        totalEmployeesBadge.textContent = `${employees.length} Employee${employees.length > 1 ? 's' : ''}`;
        totalPayoutBadge.innerHTML = `<strong>${formatCurrency(grandTotalPayout)}</strong>`;
        payrollFooter.style.display = 'table-row-group';
    };

    const refreshApp = () => {
        saveState();
        renderDropdown();
        renderTable();
    };

    // --- Event Handlers ---

    // Add Employee
    empForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('empName');
        const salaryInput = document.getElementById('baseSalary');

        const newEmp = {
            id: 'emp_' + Date.now().toString(),
            name: nameInput.value.trim(),
            phone: document.getElementById('empPhone').value.trim(),
            baseSalary: parseFloat(salaryInput.value),
            expenses: []
        };

        employees.push(newEmp);
        empForm.reset();
        nameInput.focus();
        refreshApp();
    });

    // Add Expense
    expForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const empId = expEmpSelect.value;
        if (!empId) {
            alert("Please select an employee.");
            return;
        }

        const typeInput = document.getElementById('expenseType');
        const amountInput = document.getElementById('expenseAmount');
        const noteInput = document.getElementById('expenseNote');

        const empIndex = employees.findIndex(emp => emp.id === empId);
        
        if (empIndex !== -1) {
            employees[empIndex].expenses.push({
                id: 'exp_' + Date.now().toString(),
                type: typeInput.value,
                amount: parseFloat(amountInput.value),
                note: noteInput.value.trim() || '-',
                date: new Date().toLocaleDateString()
            });

            // Reset form except employee dropdown
            amountInput.value = '';
            noteInput.value = '';
            typeInput.value = 'Petrol'; // reset default
            refreshApp();
        }
    });

    // Delete Employee
    window.deleteEmployee = (id) => {
        if (confirm("Are you sure you want to remove this employee and all their expense data?")) {
            employees = employees.filter(emp => emp.id !== id);
            refreshApp();
        }
    };

    // Clear All
    clearDataBtn.addEventListener('click', () => {
       if (confirm("WARNING: This will permanently delete all employee and expense data. Are you absolutely sure?")) {
           employees = [];
           refreshApp();
       }
    });


    // --- Modal Logic ---

    window.openExpenseModal = (empId) => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;

        modalEmpName.innerHTML = `<i class="fa-solid fa-receipt text-cyan"></i> ${emp.name}'s Expenses`;
        modalExpenseList.innerHTML = '';
        
        if (emp.expenses.length === 0) {
            modalExpenseList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted)">
                    <i class="fa-solid fa-mug-hot" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <br>No expenses logged for this employee yet.
                </div>
            `;
            modalTotal.textContent = '₹0.00';
            modal.classList.add('active');
            return;
        }

        let total = 0;
        // Map icon by type
        const icons = {
            'Petrol': 'fa-gas-pump',
            'Meals': 'fa-utensils',
            'Bonus': 'fa-star',
            'Other': 'fa-money-bill'
        };

        emp.expenses.forEach(exp => {
            total += exp.amount;
            const item = document.createElement('div');
            item.className = 'expense-item';
            
            const iconRef = icons[exp.type] || 'fa-tag';

            item.innerHTML = `
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div style="background: rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 8px;">
                        <i class="fa-solid ${iconRef}" style="color: var(--accent); font-size: 1.2rem;"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 1.05rem;">${exp.type}</div>
                        <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">${exp.date} • ${exp.note}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <strong class="expenses-badge">${formatCurrency(exp.amount)}</strong>
                    <div style="margin-top: 0.5rem;">
                        <button class="btn-delete" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="deleteExpense('${emp.id}', '${exp.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            modalExpenseList.appendChild(item);
        });

        modalTotal.textContent = formatCurrency(total);
        modal.classList.add('active');
    };

    window.closeModal = () => {
        modal.classList.remove('active');
    };

    window.deleteExpense = (empId, expId) => {
        const empIndex = employees.findIndex(emp => emp.id === empId);
        if (empIndex !== -1) {
            employees[empIndex].expenses = employees[empIndex].expenses.filter(exp => exp.id !== expId);
            refreshApp();
            // Re-render modal current view
            openExpenseModal(empId);
        }
    };

    // Close modal on outside click
    window.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };


    // --- Initial Load ---
    refreshApp();
});
