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

    const WEBHOOK_URL = 'https://n8n.srv1498466.hstgr.cloud/webhook/9992f675-cf22-4277-b259-d6cb6d6dcafa';
    const SHEET_ID = '16JAViFIXgf0oDqC5Nl0V6UpGqKrUVGAHkoEeYw1LdGs';
    const GID = '91172728';

    const BANKS = [
        "Bank of Baroda", "Bank of India", "Bank of Maharashtra", "Canara Bank", "Central Bank of India",
        "Indian Bank", "Indian Overseas Bank", "Punjab & Sind Bank", "Punjab National Bank", "State Bank of India (SBI)",
        "UCO Bank", "Union Bank of India", "Axis Bank", "Bandhan Bank", "CSB Bank", "City Union Bank",
        "DCB Bank", "Dhanlaxmi Bank", "Federal Bank", "HDFC Bank", "ICICI Bank", "IDBI Bank", "IDFC FIRST Bank",
        "IndusInd Bank", "Jammu & Kashmir Bank", "Karnataka Bank", "Karur Vysya Bank", "Kotak Mahindra Bank",
        "Nainital Bank", "RBL Bank", "South Indian Bank", "Tamilnad Mercantile Bank", "Yes Bank",
        "AU Small Finance Bank", "Capital Small Finance Bank", "Equitas Small Finance Bank", "ESAF Small Finance Bank",
        "Jana Small Finance Bank", "North East Small Finance Bank", "Shivalik Small Finance Bank", "Suryoday Small Finance Bank",
        "Ujjivan Small Finance Bank", "Unity Small Finance Bank", "Utkarsh Small Finance Bank"
    ];

    let allStudents = [];
    let externalMetadata = {}; 

    // 0. Parse URL Parameters for Interconnection
    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('STUDENT_ID');
        const studentName = params.get('STUDENT_NAME');
        
        if (studentId) {
            studentSearchInput.value = studentId;
            studentIdHidden.value = studentId;
            studentNameInput.value = studentName || '';
            
            // "Lock" the field to show it's pre-filled
            studentSearchInput.readOnly = true;
            studentSearchInput.style.background = '#f1f2f6';
            studentSearchInput.style.cursor = 'not-allowed';
            studentList.style.display = 'none'; 
            
            const header = document.querySelector('header');
            const badge = document.createElement('div');
            badge.className = 'linked-badge';
            badge.style.cssText = 'display:inline-block; background:#00a19a; color:white; padding:4px 12px; border-radius:20px; font-size:0.75rem; margin-top:10px; font-weight:600;';
            badge.textContent = 'LINKED FROM ENROLLMENT';
            header.appendChild(badge);
        }

        externalMetadata = {
            grade: params.get('GRADE') || '',
            academic_year: params.get('ACADEMIC_YEAR') || '',
            branch: params.get('BRANCH') || ''
        };
    }

    // 1. Fetch Student Data
    async function fetchStudents() {
        if (studentIdHidden.value) return; // Skip fetch if pre-filled via URL
        try {
            const data = await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const cbName = 'gvizCallback_' + Math.floor(Math.random() * 100000);
                window[cbName] = (jsonData) => {
                    delete window[cbName];
                    script.remove();
                    resolve(jsonData);
                };
                script.onerror = () => {
                    delete window[cbName];
                    script.remove();
                    reject(new Error("Failed to load Google Sheets"));
                };
                script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${cbName}&gid=${GID}`;
                document.body.appendChild(script);
            });

            const cols = data.table.cols;
            let idIdx = 0, firstIdx = 1, lastIdx = 2;

            if (cols) {
                const idCol = cols.findIndex(c => (c.label||'').toLowerCase().includes('student_id'));
                if (idCol !== -1) idIdx = idCol;
                const fCol = cols.findIndex(c => (c.label||'').toLowerCase().includes('first'));
                if (fCol !== -1) firstIdx = fCol;
                const lCol = cols.findIndex(c => (c.label||'').toLowerCase().includes('last'));
                if (lCol !== -1) lastIdx = lCol;
            }

            allStudents = data.table.rows.map(row => {
                const c = row.c;
                if (!c || !c[idIdx] || !c[idIdx].v) return null;
                const sid = String(c[idIdx].v).trim();
                
                // Skip if this row is actually the header row
                if (sid.toLowerCase().includes('student_id')) return null;

                const fname = (c[firstIdx] && c[firstIdx].v) ? String(c[firstIdx].v).trim() : '';
                const lname = (c[lastIdx] && c[lastIdx].v) ? String(c[lastIdx].v).trim() : '';
                const fullName = `${fname} ${lname}`.trim();
                
                return { id: sid, name: fullName || 'No Name' };
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
        const query = e.target.value.toLowerCase().trim();
        const filtered = allStudents.filter(s => s.id.toLowerCase().includes(query) || s.name.toLowerCase().includes(query));
        renderStudentDropdown(filtered);
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('studentDropdown').contains(e.target)) {
            studentList.classList.remove('active');
        }
    });

    // 2. Fee Calculation Logic (Bidirectional)
    function updateConcessionFromAgreed() {
        const net = parseFloat(netFeeInput.value) || 0;
        const agreed = parseFloat(totalFeeAgreedInput.value) || 0;
        concessionAmountInput.value = Math.max(0, net - agreed);
    }

    function updateAgreedFromConcession() {
        const net = parseFloat(netFeeInput.value) || 0;
        const concession = parseFloat(concessionAmountInput.value) || 0;
        totalFeeAgreedInput.value = Math.max(0, net - concession);
    }

    netFeeInput.addEventListener('input', () => {
        updateAgreedFromConcession();
        updateInstallmentSum();
    });
    totalFeeAgreedInput.addEventListener('input', () => {
        updateConcessionFromAgreed();
        updateInstallmentSum();
    });
    concessionAmountInput.addEventListener('input', () => {
        updateAgreedFromConcession();
        updateInstallmentSum();
    });

    // 3. Dynamic Installments
    function updateInstallmentSum() {
        const noOfInstallments = parseInt(noOfInstallmentsInput.value) || 0;
        const totalAgreed = parseFloat(totalFeeAgreedInput.value) || 0;
        let sum = 0;
        
        for (let i = 1; i <= noOfInstallments; i++) {
            const input = document.querySelector(`[name="inst_${i}_amount"]`);
            if (input) sum += parseFloat(input.value) || 0;
        }

        const container = document.getElementById('installmentSumContainer');
        const sumDisplay = document.getElementById('currentInstallmentSum');
        const targetDisplay = document.getElementById('targetAgreedFee');

        if (noOfInstallments > 0) {
            container.style.display = 'block';
            sumDisplay.textContent = sum;
            targetDisplay.textContent = totalAgreed;

            if (Math.abs(sum - totalAgreed) < 0.01) {
                container.style.background = '#e7f9f7';
                container.style.color = '#00a19a';
                container.style.border = '1px solid #00a19a';
            } else {
                container.style.background = '#fff5f5';
                container.style.color = '#e74c3c';
                container.style.border = '1px solid #e74c3c';
            }
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
                <div class="mode-specific-fields" id="inst_${i}_fields">
                    <!-- Dynamic fields based on mode -->
                </div>
                <div class="status-toggle-wrapper">
                    <label class="status-label pending" id="status_label_${i}">PENDING</label>
                    <label class="status-switch">
                        <input type="checkbox" name="inst_${i}_status" id="status_toggle_${i}">
                        <span class="status-slider"></span>
                    </label>
                </div>
            `;
            
            const statusToggle = block.querySelector(`#status_toggle_${i}`);
            const statusLabel = block.querySelector(`#status_label_${i}`);

            statusToggle.addEventListener('change', () => {
                if (statusToggle.checked) {
                    statusLabel.textContent = 'CLEARED';
                    statusLabel.className = 'status-label cleared';
                } else {
                    statusLabel.textContent = 'PENDING';
                    statusLabel.className = 'status-label pending';
                }
            });
            
            const modeSelect = block.querySelector('.payment-mode');
            const fieldsContainer = block.querySelector('.mode-specific-fields');
            
            modeSelect.addEventListener('change', () => {
                renderModeFields(modeSelect.value, fieldsContainer, i);
            });
            
            installmentsContainer.appendChild(block);
        }
    }

    function renderModeFields(mode, container, index) {
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
        const tempInstallments = [];
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
                inst.amount = parseFloat(formData.get(`inst_${i}_amount`));
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
                body: JSON.stringify(payload)
            });

            if (response.ok || response.status === 0) { // status 0 for no-cors if needed, but here we expect JSON response
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
