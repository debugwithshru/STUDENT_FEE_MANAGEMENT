document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('feeForm');
    const studentSearchInput = document.getElementById('student_id_search');
    const studentList = document.getElementById('studentList');
    const studentIdHidden = document.getElementById('student_id');
    const studentNameInput = document.getElementById('student_name');

    const netFeeInput = document.getElementById('net_fee_payable');
    const concessionAmountInput = document.getElementById('concession_amount');
    const totalFeeAgreedInput = document.getElementById('total_fee_agreed');
    const noOfInstallmentsInput = document.getElementById('no_of_installments');
    const installmentsSection = document.getElementById('installmentsSection');
    const installmentsContainer = document.getElementById('installmentsContainer');

    const WEBHOOK_URL = 'https://n8n.srv1761768.hstgr.cloud/webhook/9992f675-cf22-4277-b259-d6cb6d6dcafa';
    const SHEET_ID = '16JAViFIXgf0oDqC5Nl0V6UpGqKrUVGAHkoEeYw1LdGs';
    const GID = '91172728';

    const BANKS = [
        // "Other" pinned first so it's always visible without scrolling
        "Other",
        // Co-operative & Local (Mumbai / Navi Mumbai)
        "Abhyudaya Co-operative Bank", "GP Parsik Sahakari Bank",
        "Navi Mumbai Co-operative Bank", "The Mahanagar Co-operative Bank",
        "Saraswat Co-operative Bank", "SVC Co-operative Bank",
        "Cosmos Co-operative Bank", "Bassein Catholic Co-operative Bank",
        "Dombivli Nagari Sahakari Bank",
        // Public Sector
        "Bank of Baroda", "Bank of India", "Bank of Maharashtra", "Canara Bank", "Central Bank of India",
        "Indian Bank", "Indian Overseas Bank", "Punjab & Sind Bank", "Punjab National Bank", "State Bank of India (SBI)",
        "UCO Bank", "Union Bank of India",
        // Private Sector
        "Axis Bank", "Bandhan Bank", "CSB Bank", "City Union Bank",
        "DCB Bank", "Dhanlaxmi Bank", "Federal Bank", "HDFC Bank", "HSBC Bank", "ICICI Bank", "IDBI Bank", "IDFC FIRST Bank",
        "IndusInd Bank", "Jammu & Kashmir Bank", "Karnataka Bank", "Karur Vysya Bank", "Kotak Mahindra Bank",
        "Nainital Bank", "RBL Bank", "South Indian Bank", "Tamilnad Mercantile Bank", "Yes Bank",
        // Small Finance Banks
        "AU Small Finance Bank", "Capital Small Finance Bank", "Equitas Small Finance Bank", "ESAF Small Finance Bank",
        "Jana Small Finance Bank", "North East Small Finance Bank", "Shivalik Small Finance Bank", "Suryoday Small Finance Bank",
        "Ujjivan Small Finance Bank", "Unity Small Finance Bank", "Utkarsh Small Finance Bank"
    ];

    let allStudents = [];
    let externalMetadata = {};

    // 0. URL Parameters
    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('STUDENT_ID');
        const studentName = params.get('STUDENT_NAME');

        if (studentId) {
            studentSearchInput.value = studentId;
            studentIdHidden.value = studentId;
            studentNameInput.value = studentName || '';
            studentSearchInput.readOnly = true;
            studentSearchInput.style.background = '#f1f2f6';
            studentSearchInput.style.cursor = 'not-allowed';
            studentList.style.display = 'none';

            const header = document.querySelector('header');
            const badge = document.createElement('div');
            badge.className = 'linked-badge';
            badge.style.cssText = 'display:inline-block;background:#00a19a;color:white;padding:4px 12px;border-radius:20px;font-size:0.75rem;margin-top:10px;font-weight:600;';
            badge.textContent = 'LINKED FROM ENROLLMENT';
            header.appendChild(badge);
        }

        externalMetadata = {
            grade: params.get('GRADE') || '',
            academic_year: params.get('ACADEMIC_YEAR') || '',
            branch: params.get('BRANCH') || ''
        };
    }

    // 1. Fetch Students
    async function fetchStudents() {
        try {
            const data = await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const cbName = 'gvizCallback_' + Math.floor(Math.random() * 100000);
                window[cbName] = (jsonData) => { delete window[cbName]; script.remove(); resolve(jsonData); };
                script.onerror = () => { delete window[cbName]; script.remove(); reject(new Error("Failed to load")); };
                script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${cbName}&gid=${GID}`;
                document.body.appendChild(script);
            });

            const cols = data.table.cols;
            let idIdx = 0, firstIdx = 1, lastIdx = 2;
            let primaryContactIdx = -1, secondaryContactIdx = -1;

            if (cols) {
                const idCol = cols.findIndex(c => (c.label||'').toLowerCase().includes('student_id'));
                if (idCol !== -1) idIdx = idCol;
                const fCol = cols.findIndex(c => (c.label||'').toLowerCase().includes('first'));
                if (fCol !== -1) firstIdx = fCol;
                const lCol = cols.findIndex(c => (c.label||'').toLowerCase().includes('last'));
                if (lCol !== -1) lastIdx = lCol;
                primaryContactIdx = cols.findIndex(c => (c.label||'').toLowerCase().includes('primary_contact_name'));
                secondaryContactIdx = cols.findIndex(c => (c.label||'').toLowerCase().includes('secondary_contact_name'));
            }

            allStudents = data.table.rows.map(row => {
                const c = row.c;
                if (!c || !c[idIdx] || !c[idIdx].v) return null;
                const sid = String(c[idIdx].v).trim();
                if (sid.toLowerCase().includes('student_id')) return null;
                const fname = (c[firstIdx] && c[firstIdx].v) ? String(c[firstIdx].v).trim() : '';
                const lname = (c[lastIdx] && c[lastIdx].v) ? String(c[lastIdx].v).trim() : '';
                const primaryContact = (primaryContactIdx !== -1 && c[primaryContactIdx] && c[primaryContactIdx].v) ? String(c[primaryContactIdx].v).trim() : '';
                const secondaryContact = (secondaryContactIdx !== -1 && c[secondaryContactIdx] && c[secondaryContactIdx].v) ? String(c[secondaryContactIdx].v).trim() : '';
                return { id: sid, name: `${fname} ${lname}`.trim() || 'No Name', primaryContact, secondaryContact };
            }).filter(s => s !== null);

            renderStudentDropdown(allStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
            studentList.innerHTML = `<div class="dropdown-item no-results">Error loading students.</div>`;
        }
    }

    function renderStudentDropdown(list) {
        studentList.innerHTML = '';
        list.forEach(student => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = `${student.id} - ${student.name}`;
            div.onclick = () => {
                studentSearchInput.value = student.id;
                studentIdHidden.value = student.id;
                studentNameInput.value = student.name;
                studentList.classList.remove('active');
            };
            studentList.appendChild(div);
        });
    }

    studentSearchInput.addEventListener('focus', () => {
        if (studentSearchInput.readOnly) return;
        studentList.classList.add('active');
        renderStudentDropdown(allStudents);
    });
    studentSearchInput.addEventListener('input', (e) => {
        if (studentSearchInput.readOnly) return;
        const q = e.target.value.toLowerCase().trim();
        renderStudentDropdown(allStudents.filter(s => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)));
    });
    document.addEventListener('click', (e) => {
        if (!document.getElementById('studentDropdown').contains(e.target)) studentList.classList.remove('active');
    });

    // 2. Fee Calculation (Total Fee - Concession = Net Fee Payable)
    function updateNetFromConcession() {
        const gross = parseFloat(netFeeInput.value) || 0;
        const concession = parseFloat(concessionAmountInput.value) || 0;
        totalFeeAgreedInput.value = Math.max(0, gross - concession);
    }
    function updateConcessionFromNet() {
        const gross = parseFloat(netFeeInput.value) || 0;
        const net = parseFloat(totalFeeAgreedInput.value) || 0;
        concessionAmountInput.value = Math.max(0, gross - net);
    }
    netFeeInput.addEventListener('input', () => { updateNetFromConcession(); updateInstallmentSum(); });
    totalFeeAgreedInput.addEventListener('input', () => { updateConcessionFromNet(); updateInstallmentSum(); });
    concessionAmountInput.addEventListener('input', () => { updateNetFromConcession(); updateInstallmentSum(); });

    // 3. Installment sum tracker
    function updateInstallmentSum() {
        const count = parseInt(noOfInstallmentsInput.value) || 0;
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        let sum = 0;
        for (let i = 1; i <= count; i++) {
            const inp = document.querySelector(`[name="inst_${i}_amount"]`);
            if (inp) sum += parseFloat(inp.value) || 0;
        }
        const container = document.getElementById('installmentSumContainer');
        if (count > 0) {
            container.style.display = 'block';
            document.getElementById('currentInstallmentSum').textContent = sum;
            document.getElementById('targetAgreedFee').textContent = totalAgreed;
            const match = Math.abs(sum - totalAgreed) < 0.01;
            container.style.background = match ? '#e7f9f7' : '#fff5f5';
            container.style.color = match ? '#00a19a' : '#e74c3c';
            container.style.border = match ? '1px solid #00a19a' : '1px solid #e74c3c';
        } else {
            container.style.display = 'none';
        }
    }

    noOfInstallmentsInput.addEventListener('input', () => {
        const count = parseInt(noOfInstallmentsInput.value) || 0;
        if (count > 0) {
            installmentsSection.style.display = 'block';
            generateInstallmentBlocks(count);
            updateInstallmentSum();
        } else {
            installmentsSection.style.display = 'none';
        }
    });

    // 4. Generate installment blocks
    function generateInstallmentBlocks(count) {
        installmentsContainer.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const block = document.createElement('div');
            block.className = 'installment-block';
            block.innerHTML = `
                <div class="installment-title">Installment #${i}</div>
                <div class="grid-row">
                    <div class="input-group">
                        <label>Mode of Payment <span class="required">*</span></label>
                        <select class="payment-mode" name="inst_${i}_mode" required>
                            <option value="" disabled selected>Select Mode</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                        </select>
                    </div>
                </div>
                <div class="mode-specific-fields" id="inst_${i}_fields"></div>
                <div class="status-radio-wrapper">
                    <span class="status-radio-label">Payment Status <span class="required">*</span></span>
                    <div class="status-radio-group">
                        <label class="status-radio-option cleared-option">
                            <input type="radio" name="inst_${i}_status" value="Cleared">
                            <span>Cleared</span>
                        </label>
                        <label class="status-radio-option pdc-option" style="display:none;">
                            <input type="radio" name="inst_${i}_status" value="PDC">
                            <span>PDC</span>
                        </label>
                        <label class="status-radio-option pending-option">
                            <input type="radio" name="inst_${i}_status" value="Pending" checked>
                            <span>Pending</span>
                        </label>
                    </div>
                </div>
                <div class="input-group promised-date-group" id="inst_${i}_promised_date_group" style="display:flex;margin-top:12px;">
                    <label>Promised Date to Pay / Submit Cheque</label>
                    <input type="date" name="inst_${i}_promised_date">
                </div>
            `;

            const modeSelect = block.querySelector('.payment-mode');
            const fieldsContainer = block.querySelector('.mode-specific-fields');
            const statusRadios = block.querySelectorAll(`[name="inst_${i}_status"]`);
            const pdcOption = block.querySelector('.pdc-option');

            const updateConditionalFields = () => {
                const mode = modeSelect.value;

                // PDC only valid for Cheque
                if (mode === 'Cheque') {
                    pdcOption.style.display = '';
                } else {
                    pdcOption.style.display = 'none';
                    const pdcRadio = block.querySelector(`[name="inst_${i}_status"][value="PDC"]`);
                    if (pdcRadio && pdcRadio.checked) {
                        block.querySelector(`[name="inst_${i}_status"][value="Pending"]`).checked = true;
                    }
                }

                const status = (block.querySelector(`[name="inst_${i}_status"]:checked`) || {}).value || 'Pending';

                // Promised date: only when Pending
                const promisedGroup = block.querySelector(`#inst_${i}_promised_date_group`);
                const promisedInput = block.querySelector(`[name="inst_${i}_promised_date"]`);
                if (promisedGroup) {
                    const show = status === 'Pending';
                    promisedGroup.style.display = show ? 'flex' : 'none';
                    if (promisedInput && !show) promisedInput.value = '';
                }

                // Deposit cleared date: only when Cleared and a mode is selected
                const depositGroup = block.querySelector(`#inst_${i}_deposit_date_group`);
                const depositInput = block.querySelector(`[name="inst_${i}_deposit_cleared_date"]`);
                if (depositGroup) {
                    const show = status === 'Cleared' && !!mode;
                    depositGroup.style.display = show ? 'flex' : 'none';
                    if (depositInput) { depositInput.required = show; if (!show) depositInput.value = ''; }
                }

                // Cash: hide Received By when Pending (no one has received anything yet)
                if (mode === 'Cash') {
                    const receivedByGroup = block.querySelector(`#inst_${i}_received_by_group`);
                    if (receivedByGroup) {
                        const showRcvd = status !== 'Pending';
                        const inp = receivedByGroup.querySelector('input');
                        receivedByGroup.style.display = showRcvd ? 'flex' : 'none';
                        if (inp) { inp.required = showRcvd; if (!showRcvd) inp.value = ''; }
                    }
                }

                // Cheque-specific: cheque details hidden when Pending, submission date shown when PDC
                if (mode === 'Cheque') {
                    const chequeDetails = block.querySelector(`#inst_${i}_cheque_details`);
                    const submissionGroup = block.querySelector(`#inst_${i}_submission_date_group`);
                    const submissionInput = block.querySelector(`[name="inst_${i}_submission_date"]`);

                    if (chequeDetails) {
                        const showDetails = status !== 'Pending';
                        chequeDetails.style.display = showDetails ? 'grid' : 'none';
                        // Toggle required on fields that only matter when cheque details are visible
                        chequeDetails.querySelectorAll('[data-chq-required]').forEach(el => {
                            el.required = showDetails;
                        });
                    }

                    if (submissionGroup) {
                        const showSub = status === 'PDC';
                        submissionGroup.style.display = showSub ? 'flex' : 'none';
                        if (submissionInput) { submissionInput.required = showSub; if (!showSub) submissionInput.value = ''; }
                    }
                }
            };

            statusRadios.forEach(r => r.addEventListener('change', updateConditionalFields));
            modeSelect.addEventListener('change', () => {
                renderModeFields(modeSelect.value, fieldsContainer, i);
                updateConditionalFields();
            });

            updateConditionalFields();
            installmentsContainer.appendChild(block);
        }
    }

    // 5. Mode-specific field rendering
    function renderModeFields(mode, container, index) {
        container.innerHTML = '';
        container.className = 'mode-specific-fields';

        if (mode === 'Cash') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount Paid <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Enter amount" required min="0">
                </div>
                <div class="input-group" id="inst_${index}_received_by_group" style="display:none;">
                    <label>Received By <span class="required">*</span></label>
                    <input type="text" name="inst_${index}_received_by" placeholder="Staff name">
                </div>
                <div class="input-group full-width" id="inst_${index}_deposit_date_group" style="display:none;">
                    <label>Deposit Cleared / Paid Date <span class="required">*</span></label>
                    <input type="date" name="inst_${index}_deposit_cleared_date">
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
                <div class="input-group full-width" id="inst_${index}_deposit_date_group" style="display:none;">
                    <label>Deposit Cleared / Paid Date <span class="required">*</span></label>
                    <input type="date" name="inst_${index}_deposit_cleared_date">
                </div>
            `;
        } else if (mode === 'Cheque') {
            container.innerHTML = `
                <div class="input-group">
                    <label>Amount <span class="required">*</span></label>
                    <input type="number" name="inst_${index}_amount" placeholder="Enter amount" required min="0">
                </div>
                <div class="cheque-details" id="inst_${index}_cheque_details" style="display:none;">
                    <div class="input-group">
                        <label>Cheque Date <span class="required">*</span></label>
                        <input type="date" name="inst_${index}_date" data-chq-required>
                    </div>
                    <div class="input-group">
                        <label>Cheque No. <span class="required">*</span></label>
                        <input type="text" name="inst_${index}_cheque_no" placeholder="Enter Cheque No." data-chq-required>
                    </div>
                    <div class="input-group searchable-dropdown">
                        <label>Bank Name <span class="required">*</span></label>
                        <input type="text" class="bank-search" name="inst_${index}_bank" placeholder="Search Bank..." data-chq-required autocomplete="off">
                        <div class="dropdown-list bank-list"></div>
                    </div>
                    <div class="input-group full-width" id="inst_${index}_bank_other_group" style="display:none;">
                        <label>Bank Name (Manual Entry) <span class="required">*</span></label>
                        <input type="text" name="inst_${index}_bank_other" placeholder="Enter bank name">
                    </div>
                    <div class="input-group searchable-dropdown" id="inst_${index}_accholder_dropdown">
                        <label>Account Holder <span class="required">*</span></label>
                        <input type="text" class="account-holder-search" name="inst_${index}_account_holder" placeholder="Select or type name..." data-chq-required autocomplete="off">
                        <div class="dropdown-list account-holder-list"></div>
                    </div>
                    <div class="input-group full-width" id="inst_${index}_accholder_manual_group" style="display:none;">
                        <label>Account Holder Name <span class="required">*</span></label>
                        <input type="text" name="inst_${index}_account_holder_manual" placeholder="Enter name as on cheque">
                    </div>
                    <div class="input-group">
                        <label>Received By <span class="required">*</span></label>
                        <input type="text" name="inst_${index}_received_by" placeholder="Staff name" data-chq-required>
                    </div>
                </div>
                <div class="input-group full-width" id="inst_${index}_submission_date_group" style="display:none;">
                    <label>Cheque Submission Date <span class="required">*</span></label>
                    <input type="date" name="inst_${index}_submission_date">
                </div>
                <div class="input-group full-width" id="inst_${index}_deposit_date_group" style="display:none;">
                    <label>Deposit Cleared / Paid Date <span class="required">*</span></label>
                    <input type="date" name="inst_${index}_deposit_cleared_date">
                </div>
            `;

            setupBankDropdown(container.querySelector('.bank-search'), container.querySelector('.bank-list'), index);
            setupAccountHolderDropdown(container.querySelector('.account-holder-search'), container.querySelector('.account-holder-list'), index);
        }

        container.querySelectorAll('input[type="number"]').forEach(inp => {
            if (inp.name.includes('_amount')) inp.addEventListener('input', updateInstallmentSum);
        });
    }

    // 6. Bank dropdown
    function setupBankDropdown(input, list, index) {
        const render = (query = '') => {
            list.innerHTML = '';
            const filtered = BANKS.filter(b => b.toLowerCase().includes(query.toLowerCase()));
            if (filtered.length > 0) {
                list.classList.add('active');
                filtered.forEach(bank => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-item' + (bank === 'Other' ? ' other-option' : '');
                    div.textContent = bank;
                    div.onclick = () => {
                        input.value = bank;
                        list.classList.remove('active');
                        toggleOtherBankFields(index, bank === 'Other');
                    };
                    list.appendChild(div);
                });
            } else {
                list.classList.remove('active');
            }
        };

        input.addEventListener('focus', () => render(input.value));
        input.addEventListener('input', () => {
            render(input.value);
            if (input.value !== 'Other') toggleOtherBankFields(index, false);
        });
        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !list.contains(e.target)) list.classList.remove('active');
        });
    }

    function toggleOtherBankFields(index, show) {
        const bankOtherGroup = document.getElementById(`inst_${index}_bank_other_group`);
        const accDropdown = document.getElementById(`inst_${index}_accholder_dropdown`);
        const accManualGroup = document.getElementById(`inst_${index}_accholder_manual_group`);

        if (bankOtherGroup) {
            const inp = bankOtherGroup.querySelector('input');
            bankOtherGroup.style.display = show ? 'flex' : 'none';
            if (inp) { inp.required = show; if (!show) inp.value = ''; }
        }
        if (accDropdown) {
            const inp = accDropdown.querySelector('input');
            accDropdown.style.display = show ? 'none' : 'flex';
            if (inp) inp.required = !show;
        }
        if (accManualGroup) {
            const inp = accManualGroup.querySelector('input');
            accManualGroup.style.display = show ? 'flex' : 'none';
            if (inp) { inp.required = show; if (!show) inp.value = ''; }
        }
    }

    // 7. Account holder dropdown (contacts + Other)
    function setupAccountHolderDropdown(input, list, index) {
        const sid = studentIdHidden.value || studentSearchInput.value;
        const student = allStudents.find(s => s.id === sid);

        const options = [];
        if (student) {
            if (student.primaryContact) options.push(student.primaryContact);
            if (student.secondaryContact) options.push(student.secondaryContact);
        }
        options.push('Other');

        const render = (query = '') => {
            list.innerHTML = '';
            const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
            if (filtered.length > 0) {
                list.classList.add('active');
                filtered.forEach(opt => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-item' + (opt === 'Other' ? ' other-option' : '');
                    div.textContent = opt;
                    div.onclick = () => {
                        input.value = opt;
                        list.classList.remove('active');
                        toggleAccHolderManual(index, opt === 'Other');
                    };
                    list.appendChild(div);
                });
            } else {
                list.classList.remove('active');
            }
        };

        input.addEventListener('focus', () => render(input.value));
        input.addEventListener('input', () => {
            render(input.value);
            if (input.value !== 'Other') toggleAccHolderManual(index, false);
        });
        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !list.contains(e.target)) list.classList.remove('active');
        });
    }

    function toggleAccHolderManual(index, show) {
        const manualGroup = document.getElementById(`inst_${index}_accholder_manual_group`);
        if (manualGroup) {
            const inp = manualGroup.querySelector('input');
            manualGroup.style.display = show ? 'flex' : 'none';
            if (inp) { inp.required = show; if (!show) inp.value = ''; }
        }
    }

    // 8. Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        const formData = new FormData(form);
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        const noOfInstallments = parseInt(formData.get('no_of_installments'));

        let installmentSum = 0;
        for (let i = 1; i <= noOfInstallments; i++) {
            installmentSum += parseFloat(formData.get(`inst_${i}_amount`)) || 0;
        }
        if (Math.abs(installmentSum - totalAgreed) > 0.01) {
            alert(`Validation Failed!\nSum of installments (${installmentSum}) does not match Net Fee Payable (${totalAgreed}).\nPlease adjust the installments.`);
            btn.disabled = false;
            btn.textContent = 'Submit Fee Record';
            return;
        }

        const payload = {
            student_id: studentIdHidden.value || studentSearchInput.value,
            student_name: studentNameInput.value,
            grade: externalMetadata.grade,
            academic_year: externalMetadata.academic_year,
            branch: externalMetadata.branch,
            net_fee_payable: parseFloat(formData.get('net_fee_payable')),
            concession_type: formData.get('concession_type'),
            concession_amount: parseFloat(formData.get('concession_amount')) || 0,
            concession_reason: formData.get('concession_reason'),
            total_fee_agreed: totalAgreed,
            no_of_installments: noOfInstallments,
            installments: [],
            submission_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };

        for (let i = 1; i <= noOfInstallments; i++) {
            const mode = formData.get(`inst_${i}_mode`);
            const status = formData.get(`inst_${i}_status`) || 'Pending';
            const inst = { installment_no: i, mode, installment_status: status };

            if (mode === 'Cash') {
                inst.amount = parseFloat(formData.get(`inst_${i}_amount`));
                inst.received_by = formData.get(`inst_${i}_received_by`);
            } else if (mode === 'UPI') {
                inst.amount = parseFloat(formData.get(`inst_${i}_amount`));
                inst.transaction_id = formData.get(`inst_${i}_txn_id`);
            } else if (mode === 'Cheque') {
                inst.amount = parseFloat(formData.get(`inst_${i}_amount`));
                if (status !== 'Pending') {
                    inst.cheque_date = formData.get(`inst_${i}_date`);
                    inst.cheque_no = formData.get(`inst_${i}_cheque_no`);
                    const rawBank = formData.get(`inst_${i}_bank`);
                    inst.bank_name = rawBank === 'Other'
                        ? (formData.get(`inst_${i}_bank_other`) || 'Other')
                        : rawBank;
                    const rawHolder = formData.get(`inst_${i}_account_holder`);
                    inst.account_holder = (rawBank === 'Other' || rawHolder === 'Other')
                        ? formData.get(`inst_${i}_account_holder_manual`)
                        : rawHolder;
                    inst.received_by = formData.get(`inst_${i}_received_by`);
                }
                if (status === 'PDC') {
                    inst.submission_date = formData.get(`inst_${i}_submission_date`);
                }
            }

            if (status === 'Cleared') {
                inst.deposit_cleared_date = formData.get(`inst_${i}_deposit_cleared_date`);
            }
            if (status === 'Pending') {
                inst.promised_date = formData.get(`inst_${i}_promised_date`);
            }

            payload.installments.push(inst);
        }

        let Total_Collected = 0;
        payload.installments.forEach(inst => {
            if (inst.installment_status === 'Cleared') Total_Collected += (inst.amount || 0);
        });
        payload.Total_Collected = Total_Collected;
        payload.Amount_Outstanding = totalAgreed - Total_Collected;
        payload.Collection_Pct = totalAgreed > 0
            ? parseFloat(((Total_Collected / totalAgreed) * 100).toFixed(2))
            : 0;

        console.log('Submitting Payload:', payload);

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok || response.status === 0) {
                showSuccess();
            } else {
                throw new Error('Webhook returned error');
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
        setTimeout(() => { overlay.classList.remove('active'); location.reload(); }, 3000);
    }

    checkUrlParams();
    fetchStudents();
});
