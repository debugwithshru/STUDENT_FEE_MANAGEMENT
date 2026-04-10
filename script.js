document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements
    const form = document.getElementById('feeForm');
    const studentSearchInput = document.getElementById('student_id_search');
    const studentList = document.getElementById('studentList');
    const studentNameInput = document.getElementById('student_name');
    const studentIdHidden = document.getElementById('student_id');
    const netFeeInput = document.getElementById('net_fee_payable');
    const concessionTypeSelect = document.getElementById('concession_type');
    const concessionAmountInput = document.getElementById('concession_amount');
    const totalFeeAgreedInput = document.getElementById('total_fee_agreed');
    const noOfInstallmentsInput = document.getElementById('no_of_installments');
    const installmentsSection = document.getElementById('installmentsSection');
    const installmentsContainer = document.getElementById('installmentsContainer');
    const currentSumDisplay = document.getElementById('currentInstallmentSum');
    const targetFeeDisplay = document.getElementById('targetAgreedFee');
    const sumValidationBar = document.getElementById('installmentSumContainer');
    const submitBtn = document.getElementById('submitBtn');

    // State
    let students = [];
    let externalMetadata = {
        grade: '',
        academic_year: '',
        branch: ''
    };

    const WEBHOOK_URL = 'https://n8n.srv1498466.hstgr.cloud/webhook/9992f675-cf22-4277-b259-d6cb6d6dcafa';
    const STUDENT_DATA_URL = 'https://n8n.srv1498466.hstgr.cloud/webhook/39f04124-7661-460d-9b19-58ec71246194';
    
    const BANKS = [
        "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
        "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank of India", 
        "IDBI Bank", "IndusInd Bank", "Yes Bank", "IDFC First Bank", "Federal Bank",
        "South Indian Bank", "Indian Bank", "UCO Bank", "Bank of India", "Maharashtra Bank"
    ];

    // 2. Fetch Students
    async function fetchStudents() {
        try {
            const response = await fetch(STUDENT_DATA_URL);
            const data = await response.json();
            students = data.flat();
            console.log('Students loaded:', students.length);
        } catch (error) {
            console.error('Error fetching students:', error);
            studentList.innerHTML = '<div class="dropdown-item">Error loading students</div>';
        }
    }

    // 3. Student Search logic
    studentSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        studentList.innerHTML = '';
        
        if (query.length < 1) {
            studentList.classList.remove('active');
            return;
        }

        const filtered = students.filter(s => 
            (s.student_name && s.student_name.toLowerCase().includes(query)) || 
            (s.student_id && s.student_id.toLowerCase().includes(query))
        );

        if (filtered.length > 0) {
            studentList.classList.add('active');
            filtered.forEach(s => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `
                    <div class="name">${s.student_name}</div>
                    <div class="id">${s.student_id} | ${s.grade || 'No Grade'}</div>
                `;
                div.onclick = () => selectStudent(s);
                studentList.appendChild(div);
            });
        } else {
            studentList.classList.remove('active');
        }
    });

    function selectStudent(s) {
        studentSearchInput.value = s.student_id;
        studentNameInput.value = s.student_name;
        studentIdHidden.value = s.student_id;
        studentList.classList.remove('active');
        
        // Handle metadata
        externalMetadata.grade = s.grade || '';
        externalMetadata.academic_year = s.academic_year || '';
        externalMetadata.branch = s.branch || '';

        // Auto-fill Net Fee if available
        if (s.net_fee_payable) {
            netFeeInput.value = s.net_fee_payable;
            calculateTotalAgreed();
        }
    }

    // 4. Calculations
    function calculateTotalAgreed() {
        const netFee = parseFloat(netFeeInput.value) || 0;
        const concession = parseFloat(concessionAmountInput.value) || 0;
        const total = Math.max(0, netFee - concession);
        totalFeeAgreedInput.value = total;
        targetFeeDisplay.textContent = total;
        updateSum();
    }

    [netFeeInput, concessionAmountInput, concessionTypeSelect].forEach(el => {
        el.addEventListener('input', calculateTotalAgreed);
    });

    function updateSum() {
        const amountInputs = installmentsContainer.querySelectorAll('input[type="number"]');
        let currentTotal = 0;
        amountInputs.forEach(input => {
            currentTotal += parseFloat(input.value) || 0;
        });

        currentSumDisplay.textContent = currentTotal;
        const target = parseFloat(totalFeeAgreedInput.value) || 0;

        if (Math.abs(currentTotal - target) < 0.01 && target > 0) {
            sumValidationBar.style.background = '#e1f5fe';
            sumValidationBar.style.color = '#0288d1';
            submitBtn.disabled = false;
        } else {
            sumValidationBar.style.background = '#ffebee';
            sumValidationBar.style.color = '#d32f2f';
            // We don't necessarily disable here, but we warn on submit
        }
    }

    // 5. Dynamic Installments
    noOfInstallmentsInput.addEventListener('input', () => {
        const count = parseInt(noOfInstallmentsInput.value);
        if (count > 0) {
            installmentsSection.style.display = 'block';
            sumValidationBar.style.display = 'block';
            renderInstallmentBlocks(count);
        } else {
            installmentsSection.style.display = 'none';
            sumValidationBar.style.display = 'none';
        }
    });

    function renderInstallmentBlocks(count) {
        installmentsContainer.innerHTML = '';
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        const baseAmount = Math.floor(totalAgreed / count);
        const remainder = totalAgreed % count;

        for (let i = 1; i <= count; i++) {
            const block = document.createElement('div');
            block.className = 'installment-block';
            
            const suggestedAmount = i === 1 ? (baseAmount + remainder) : baseAmount;

            block.innerHTML = `
                <div class="installment-header">
                    <h4>Installment #${i}</h4>
                    <label class="status-toggle">
                        <input type="checkbox" name="inst_${i}_status" ${i === 1 ? 'checked' : ''}>
                        <span class="status-slider"></span>
                        <span class="status-text">Cleared</span>
                    </label>
                </div>
                <div class="installment-grid">
                    <div class="input-group">
                        <label>Payment Mode <span class="required">*</span></label>
                        <select name="inst_${i}_mode" required onchange="renderModeFields(this, ${i})">
                            <option value="">Select Mode</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div id="modeFields_${i}" class="mode-fields-container"></div>
                </div>
            `;
            installmentsContainer.appendChild(block);
        }
        updateSum();
    }

    window.renderModeFields = (select, index) => {
        const mode = select.value;
        const container = document.getElementById(`modeFields_${index}`);
        container.innerHTML = '';
        
        if (mode === 'Cash') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount Paid <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Amount" required min="0">
                </div>
            `;
        } else if (mode === 'UPI') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount Paid <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Amount" required min="0">
                </div>
                <div class="input-group">
                    <label>Transaction ID <span class="required">*</span></label>
                    <input type="text" name="inst_${index}_txn_id" placeholder="UPI Txn ID" required>
                </div>
            `;
        } else if (mode === 'Cheque') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Amount" required min="0">
                </div>
                <div class="input-group">
                    <label>Clearance Date <span class="required">*</span></label>
                    <input type="date" name="inst_${index}_date" required>
                </div>
                <div class="input-group">
                    <label>Cheque No. <span class="required">*</span></label>
                    <input type="text" name="inst_${index}_cheque_no" placeholder="Cheque No." required>
                </div>
                <div class="input-group searchable-dropdown">
                    <label>Bank Name <span class="required">*</span></label>
                    <input type="text" class="bank-search" name="inst_${index}_bank" placeholder="Search Bank..." required autocomplete="off">
                    <div class="dropdown-list bank-list"></div>
                </div>
            `;
            const bankInput = container.querySelector('.bank-search');
            const bankList = container.querySelector('.bank-list');
            setupBankDropdown(bankInput, bankList);
        }

        // Re-attach sum calculation
        container.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', updateSum);
        });
    };

    function setupBankDropdown(input, list) {
        const renderBanks = (query = '') => {
            list.innerHTML = '';
            const filtered = BANKS.filter(b => b.toLowerCase().includes(query.toLowerCase()));
            if (filtered.length > 0) {
                list.classList.add('active');
                filtered.forEach(bank => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-item';
                    div.textContent = bank;
                    div.onclick = () => {
                        input.value = bank;
                        list.classList.remove('active');
                    };
                    list.appendChild(div);
                });
            } else {
                list.classList.remove('active');
            }
        };
        input.addEventListener('focus', () => renderBanks(input.value));
        input.addEventListener('input', () => renderBanks(input.value));
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) list.classList.remove('active');
        });
    }

    // 6. Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Sum Validation
        const target = parseFloat(totalFeeAgreedInput.value) || 0;
        const currentTotal = parseFloat(currentSumDisplay.textContent) || 0;
        if (Math.abs(currentTotal - target) > 0.01) {
            alert(`Incomplete Sum!\nTotal Installments must equal Total Fee Agreed (${target}).`);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const formData = new FormData(form);
        const payload = {
            student_id: studentIdHidden.value || studentSearchInput.value,
            student_name: studentNameInput.value,
            grade: externalMetadata.grade,
            academic_year: externalMetadata.academic_year,
            branch: externalMetadata.branch,
            net_fee_payable: parseFloat(netFeeInput.value),
            concession_type: concessionTypeSelect.value,
            concession_amount: parseFloat(concessionAmountInput.value) || 0,
            concession_reason: document.getElementById('concession_reason').value,
            total_fee_agreed: target,
            no_of_installments: parseInt(noOfInstallmentsInput.value),
            installments: [],
            submission_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };

        for (let i = 1; i <= payload.no_of_installments; i++) {
            const mode = formData.get(`inst_${i}_mode`);
            const status = formData.get(`inst_${i}_status`) === 'on' ? 'Cleared' : 'Pending';
            const inst = { 
                installment_no: i, 
                mode: mode,
                installment_status: status,
                amount: parseFloat(formData.get(`inst_${i}_amount`))
            };
            
            if (mode === 'UPI') {
                inst.transaction_id = formData.get(`inst_${i}_txn_id`);
            } else if (mode === 'Cheque') {
                inst.clearance_date = formData.get(`inst_${i}_date`);
                inst.cheque_no = formData.get(`inst_${i}_cheque_no`);
                inst.bank_name = formData.get(`inst_${i}_bank`);
            }
            payload.installments.push(inst);
        }

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                redirect: 'manual'
            });

            if (response.ok || response.status === 0 || response.type === 'opaqueredirect') {
                showSuccess();
            } else {
                throw new Error('Server Error: ' + response.status);
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Submission failed. Check internet connection or console.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Fee Record';
        }
    });

    function showSuccess() {
        const overlay = document.getElementById('successOverlay');
        overlay.classList.add('active');
        setTimeout(() => {
            location.reload();
        }, 3000);
    }

    // Initial Load
    fetchStudents();
});
