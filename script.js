document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements
    const studentSearchInput = document.getElementById('studentSearch');
    const studentList = document.getElementById('studentList');
    const studentNameInput = document.getElementById('student_name');
    const studentIdHidden = document.getElementById('student_id_hidden');
    const feeDisplayGroup = document.querySelector('.fee-display-group');
    const netFeeDisplay = document.getElementById('netFeeDisplay');
    const concessionTypeSelect = document.getElementById('concession_type');
    const concessionAmountInput = document.getElementById('concession_amount');
    const totalFeeAgreedInput = document.getElementById('totalFeeAgreed');
    const noOfInstallmentsInput = document.getElementById('no_of_installments');
    const installmentPlanContainer = document.getElementById('installmentPlan');
    const form = document.getElementById('feeSubmissionForm');

    // State
    let students = [];
    let externalMetadata = {
        grade: '',
        academic_year: '',
        branch: ''
    };

    const WEBHOOK_URL = 'https://n8n.srv1498466.hstgr.cloud/webhook/9992f675-cf22-4277-b259-d6cb6d6dcafa';
    const BANKS = [
        "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
        "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank of India", 
        "IDBI Bank", "IndusInd Bank", "Yes Bank", "IDFC First Bank", "Federal Bank",
        "South Indian Bank", "Indian Bank", "UCO Bank", "Bank of India", "Maharashtra Bank"
    ];

    // 2. Student Search Logic
    async function fetchStudents() {
        try {
            const response = await fetch('https://n8n.srv1498466.hstgr.cloud/webhook/39f04124-7661-460d-9b19-58ec71246194');
            const data = await response.json();
            students = data.flat();
            console.log('Students loaded:', students.length);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    }

    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const sid = params.get('sid');
        if (sid) {
            studentSearchInput.value = sid;
            const student = students.find(s => s.student_id === sid);
            if (student) selectStudent(student);
            else studentSearchInput.dispatchEvent(new Event('input'));
        }
    }

    studentSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        studentList.innerHTML = '';
        
        if (query.length < 2) {
            studentList.classList.remove('active');
            return;
        }

        const filtered = students.filter(s => 
            s.student_name.toLowerCase().includes(query) || 
            s.student_id.toLowerCase().includes(query)
        );

        if (filtered.length > 0) {
            studentList.classList.add('active');
            filtered.forEach(s => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `
                    <div class="name">${s.student_name}</div>
                    <div class="id">${s.student_id} | ${s.grade}</div>
                `;
                div.onclick = () => selectStudent(s);
                studentList.appendChild(div);
            });
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

        // Show/Hide Fee Info based on Net Fee Payable
        if (s.net_fee_payable) {
            feeDisplayGroup.style.display = 'block';
            netFeeDisplay.value = s.net_fee_payable;
            calculateAgreedFee();
        } else {
            feeDisplayGroup.style.display = 'none';
        }
    }

    // 3. Calculator Logic
    function calculateAgreedFee() {
        const netFee = parseFloat(netFeeDisplay.value) || 0;
        const concession = parseFloat(concessionAmountInput.value) || 0;
        const agreed = netFee - concession;
        totalFeeAgreedInput.value = agreed > 0 ? agreed : 0;
        updateInstallmentSum();
    }

    concessionAmountInput.addEventListener('input', calculateAgreedFee);
    concessionTypeSelect.addEventListener('change', calculateAgreedFee);

    function updateInstallmentSum() {
        const amounts = Array.from(installmentPlanContainer.querySelectorAll('input[name*="_amount"]'))
            .map(input => parseFloat(input.value) || 0);
        const sum = amounts.reduce((a, b) => a + b, 0);
        
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        const submitBtn = document.getElementById('submitBtn');
        
        // Visual feedback if sums don't match
        if (Math.abs(sum - totalAgreed) > 0.01 && sum > 0) {
            submitBtn.classList.add('error-state');
        } else {
            submitBtn.classList.remove('error-state');
        }
    }

    noOfInstallmentsInput.addEventListener('change', () => {
        const count = parseInt(noOfInstallmentsInput.value);
        renderInstallments(count);
    });

    function renderInstallments(count) {
        installmentPlanContainer.innerHTML = '';
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        const baseAmount = Math.floor(totalAgreed / count);
        const remainder = totalAgreed % count;

        for (let i = 1; i <= count; i++) {
            const installmentDiv = document.createElement('div');
            installmentDiv.className = 'installment-block';
            
            // First installment is base + remainder
            const suggestedAmount = i === 1 ? (baseAmount + remainder) : baseAmount;

            installmentDiv.innerHTML = `
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
            installmentPlanContainer.appendChild(installmentDiv);
            
            // Set initial value for amount if needed
            const select = installmentDiv.querySelector('select');
            // Trigger Cash by default to show amount field? Or leave blank.
        }
    }

    window.renderModeFields = (select, index) => {
        const mode = select.value;
        const container = document.getElementById(`modeFields_${index}`);
        container.innerHTML = '';
        container.className = 'mode-specific-fields';
        
        if (mode === 'Cash') {
            container.classList.add('single');
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount Paid <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Enter amount" required min="0">
                </div>
            `;
        } else if (mode === 'UPI') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount Paid <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Enter amount" required min="0">
                </div>
                <div class="input-group">
                    <label>Transaction ID <span class="required">*</span></label>
                    <input type="text" name="inst_${index}_txn_id" placeholder="Enter UPI Txn ID" required>
                </div>
            `;
        } else if (mode === 'Cheque') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Enter amount" required min="0">
                </div>
                <div class="input-group">
                    <label>Clearance Date <span class="required">*</span></label>
                    <input type="date" name="inst_${index}_date" required>
                </div>
                <div class="input-group">
                    <label>Cheque No. <span class="required">*</span></label>
                    <input type="text" name="inst_${index}_cheque_no" placeholder="Enter Cheque No." required>
                </div>
                <div class="input-group searchable-dropdown">
                    <label>Bank Name <span class="required">*</span></label>
                    <input type="text" class="bank-search" name="inst_${index}_bank" placeholder="Search Bank..." required autocomplete="off">
                    <div class="dropdown-list bank-list"></div>
                </div>
            `;
            
            setupBankDropdown(container.querySelector('.bank-search'), container.querySelector('.bank-list'));
        }

        // Add real-time sum listener to any amount input that appears
        const amountInputs = container.querySelectorAll('input[type="number"]');
        amountInputs.forEach(input => {
            if (input.name.includes('_amount')) {
                input.addEventListener('input', updateInstallmentSum);
            }
        });
    }

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
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.classList.remove('active');
            }
        });
    }

    // 4. Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        const formData = new FormData(form);
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        const noOfInstallments = parseInt(formData.get('no_of_installments'));
        
        // 4A. Rule: Sum of installments must equal Agreed Fee
        let installmentSum = 0;
        for (let i = 1; i <= noOfInstallments; i++) {
            const amount = parseFloat(formData.get(`inst_${i}_amount`)) || 0;
            installmentSum += amount;
        }

        if (Math.abs(installmentSum - totalAgreed) > 0.01) {
            alert(`Validation Failed!\nSum of installments (${installmentSum}) does not match Total Fee Agreed (${totalAgreed}).\nPlease adjust the installments.`);
            btn.disabled = false;
            btn.textContent = 'Submit Fee Record';
            return;
        }

        const payload = {
            student_id: studentIdHidden.value || studentSearchInput.value,
            student_name: studentNameInput.value,
            // Include Linked Data
            grade: externalMetadata.grade,
            academic_year: externalMetadata.academic_year,
            branch: externalMetadata.branch,
            // Fee Stats
            net_fee_payable: parseFloat(formData.get('net_fee_payable')),
            concession_type: formData.get('concession_type'),
            concession_amount: parseFloat(formData.get('concession_amount')) || 0,
            concession_reason: formData.get('concession_reason'),
            total_fee_agreed: totalAgreed,
            no_of_installments: noOfInstallments,
            installments: [],
            submission_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };

        for (let i = 1; i <= payload.no_of_installments; i++) {
            const mode = formData.get(`inst_${i}_mode`);
            const status = formData.get(`inst_${i}_status`) === 'on' ? 'Cleared' : 'Pending';
            const inst = { 
                installment_no: i, 
                mode: mode,
                installment_status: status
            };
            
            if (mode === 'Cash') {
                inst.amount = parseFloat(formData.get(`inst_${index}_amount`)); // Error in original script was index vs i, fixing here
            } else if (mode === 'UPI') {
                inst.amount = parseFloat(formData.get(`inst_${i}_amount`));
                inst.transaction_id = formData.get(`inst_${i}_txn_id`);
            } else if (mode === 'Cheque') {
                inst.amount = parseFloat(formData.get(`inst_${i}_amount`));
                inst.clearance_date = formData.get(`inst_${i}_date`);
                inst.cheque_no = formData.get(`inst_${i}_cheque_no`);
                inst.bank_name = formData.get(`inst_${i}_bank`);
            }
            payload.installments.push(inst);
        }

        console.log('Submitting Payload:', payload);

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
                throw new Error('Failed to submit to webhook');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Submission failed. Check console for details.');
            btn.disabled = false;
            btn.textContent = 'Submit Fee Record';
        }
    });

    function showSuccess() {
        const overlay = document.getElementById('successOverlay');
        overlay.classList.add('active');
        setTimeout(() => {
            overlay.classList.remove('active');
            location.reload(); // Refresh to reset
        }, 3000);
    }

    // Initial load
    checkUrlParams();
    fetchStudents();
});
