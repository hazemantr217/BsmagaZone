// Admin Dashboard Core Logic for BsmagaZone
let currentTab = 'overview';
let activeSubjects = [];
let activeExams = [];
let activeReviewMaterials = [];
let allQuestions = [];
let activeUniversities = [];
let activeFaculties = [];
let activeYears = [];
let activeSemesters = [];
let isDashboardInitialized = false;
let currentIntegratedExamId = null;
let currentIntegratedSubjectId = null;
let confirmActionCallback = null;
let examQuestionCounts = {};
let globalDataLoaded = false;

// Chart instances
let visitsChart = null;
let subjectsChart = null;
let subjectScoresChart = null;
let usageHoursChart = null;

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.setProperty('--toast-duration', `${duration}ms`);
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto-remove after animation completes
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, duration + 500);
}

// ============================================
// CUSTOM CONFIRMATION DIALOG
// ============================================
function showConfirmDialog(options) {
    const {
        title = 'تأكيد الإجراء',
        message = 'هل أنت متأكد من هذا الإجراء؟',
        icon = 'fa-exclamation-triangle',
        iconType = 'danger',
        confirmText = 'حذف',
        confirmStyle = 'danger',
        requireInput = false,
        inputLabel = 'اكتب للتأكيد:',
        inputPlaceholder = '',
        expectedInput = '',
        showCheckbox = false,
        checkboxLabel = 'عدم إظهار هذا التأكيد مرة أخرى في هذه الجلسة',
        checkboxSessionKey = '',
        onConfirm = null
    } = options;

    const overlay = document.getElementById('confirm-modal-overlay');
    const iconEl = document.getElementById('confirm-modal-icon');
    const iconI = document.getElementById('confirm-modal-icon-i');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const inputWrap = document.getElementById('confirm-modal-input-wrap');
    const inputEl = document.getElementById('confirm-modal-input');
    const inputLabelEl = document.getElementById('confirm-modal-input-label');
    const checkboxWrap = document.getElementById('confirm-modal-checkbox-wrap');
    const checkboxEl = document.getElementById('confirm-modal-checkbox');
    const checkboxLabelEl = document.getElementById('confirm-modal-checkbox-label');
    const actionBtn = document.getElementById('confirm-modal-action');

    titleEl.textContent = title;
    messageEl.innerHTML = message;
    iconEl.className = `confirm-modal-icon ${iconType}`;
    iconI.className = `fas ${icon}`;
    actionBtn.textContent = confirmText;
    actionBtn.className = `btn-confirm-action ${confirmStyle}`;

    if (requireInput) {
        inputWrap.style.display = 'block';
        inputLabelEl.textContent = inputLabel;
        inputEl.placeholder = inputPlaceholder;
        inputEl.value = '';
        inputEl.classList.remove('error');
        actionBtn.disabled = true;

        // Store expected input for validation
        inputEl._expectedInput = expectedInput;
        inputEl.oninput = function() {
            const matches = this.value.trim() === this._expectedInput;
            actionBtn.disabled = !matches;
            if (this.value.trim().length > 0 && !matches) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
        };
    } else {
        inputWrap.style.display = 'none';
        actionBtn.disabled = false;
    }

    if (showCheckbox && checkboxSessionKey) {
        checkboxWrap.style.display = 'block';
        checkboxLabelEl.textContent = checkboxLabel;
        checkboxEl.checked = false;
        checkboxEl._sessionKey = checkboxSessionKey;
    } else {
        checkboxWrap.style.display = 'none';
        if (checkboxEl) checkboxEl._sessionKey = '';
    }

    confirmActionCallback = onConfirm;
    overlay.classList.add('active');

    // Focus input if present
    if (requireInput) {
        setTimeout(() => inputEl.focus(), 100);
    }
}

function closeConfirmDialog() {
    const overlay = document.getElementById('confirm-modal-overlay');
    overlay.classList.remove('active');
    confirmActionCallback = null;
}

async function executeConfirmAction() {
    if (confirmActionCallback) {
        const actionBtn = document.getElementById('confirm-modal-action');
        const originalText = actionBtn.textContent;
        actionBtn.disabled = true;
        actionBtn.textContent = 'جاري التنفيذ...';

        // Handle checkbox session saving
        const checkboxEl = document.getElementById('confirm-modal-checkbox');
        const checkboxWrap = document.getElementById('confirm-modal-checkbox-wrap');
        if (checkboxWrap && checkboxWrap.style.display !== 'none' && checkboxEl && checkboxEl.checked && checkboxEl._sessionKey) {
            sessionStorage.setItem(checkboxEl._sessionKey, 'true');
        }

        try {
            await confirmActionCallback();
        } catch (e) {
            showToast('حدث خطأ: ' + e.message, 'error');
        } finally {
            actionBtn.textContent = originalText;
            actionBtn.disabled = false;
        }
    }
    closeConfirmDialog();
}

// Initialize Admin Dashboard
document.addEventListener("DOMContentLoaded", () => {
    // Wait for Supabase to be ready
    const checkSupabase = setInterval(() => {
        if (window.supabase) {
            clearInterval(checkSupabase);
            initAuthListener();
        }
    }, 100);
});

// Authentication and admin authorization
let authCheckVersion = 0;
let passwordRecoveryMode = false;

function showAuthScreen() {
    isDashboardInitialized = false;
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';

    if (!passwordRecoveryMode) {
        const loginForm = document.getElementById('auth-form');
        const resetButton = document.getElementById('auth-reset-request');
        const recoveryForm = document.getElementById('auth-recovery-form');
        if (loginForm) loginForm.hidden = false;
        if (resetButton) resetButton.hidden = false;
        if (recoveryForm) recoveryForm.hidden = true;
    }
}

function setAuthFeedback(message, type = 'error') {
    const feedback = document.getElementById('auth-feedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `auth-feedback visible ${type}`;
}

function showPasswordRecoveryForm() {
    passwordRecoveryMode = true;
    isDashboardInitialized = false;
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';

    const loginForm = document.getElementById('auth-form');
    const resetButton = document.getElementById('auth-reset-request');
    const recoveryForm = document.getElementById('auth-recovery-form');
    if (loginForm) loginForm.hidden = true;
    if (resetButton) resetButton.hidden = true;
    if (recoveryForm) recoveryForm.hidden = false;
    document.getElementById('auth-new-password')?.focus();
}

async function requestAdminPasswordReset() {
    const email = document.getElementById('auth-email')?.value.trim();
    const client = getSupabaseClient();

    if (!email) {
        setAuthFeedback('اكتب بريد الإدارة أولًا ثم اضغط «نسيت كلمة المرور؟».');
        document.getElementById('auth-email')?.focus();
        return;
    }

    if (!client) {
        setAuthFeedback('تعذر الاتصال بالخدمة الآن.');
        return;
    }

    const button = document.getElementById('auth-reset-request');
    if (button) {
        button.disabled = true;
        button.textContent = 'جاري إرسال الرابط...';
    }

    try {
        const redirectTo = window.location.origin + window.location.pathname;
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setAuthFeedback('إذا كان البريد معتمدًا فسيصلك رابط آمن لتغيير كلمة المرور.', 'success');
    } catch (error) {
        console.error('Password reset request failed', error);
        setAuthFeedback('تعذر إرسال رابط الاستعادة الآن. حاول لاحقًا.');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'نسيت كلمة المرور؟';
        }
    }
}

async function handleAdminPasswordUpdate(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    const password = document.getElementById('auth-new-password')?.value || '';
    const confirmation = document.getElementById('auth-confirm-password')?.value || '';
    const isStrong = password.length >= 12
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /\d/.test(password);

    if (!client) {
        setAuthFeedback('تعذر الاتصال بالخدمة الآن.');
        return;
    }

    if (!isStrong) {
        setAuthFeedback('استخدم 12 حرفًا على الأقل مع حرف كبير وحرف صغير ورقم.');
        return;
    }

    if (password !== confirmation) {
        setAuthFeedback('كلمتا المرور غير متطابقتين.');
        return;
    }

    const button = document.querySelector('#auth-recovery-form button[type="submit"]');
    if (button) button.disabled = true;

    try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        await client.auth.signOut();
        passwordRecoveryMode = false;
        history.replaceState(null, '', window.location.pathname);
        document.getElementById('auth-new-password').value = '';
        document.getElementById('auth-confirm-password').value = '';
        showAuthScreen();
        setAuthFeedback('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.', 'success');
    } catch (error) {
        console.error('Password update failed', error);
        setAuthFeedback('تعذر تحديث كلمة المرور. استخدم أحدث رابط استعادة وحاول مرة أخرى.');
    } finally {
        if (button) button.disabled = false;
    }
}

async function applyAuthSession(session) {
    const checkVersion = ++authCheckVersion;
    const client = getSupabaseClient();

    if (passwordRecoveryMode) {
        showPasswordRecoveryForm();
        return;
    }

    if (!client || !session) {
        showAuthScreen();
        return;
    }

    const { data: administrator, error } = await client
        .from('admins')
        .select('id, role, is_active')
        .eq('id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (checkVersion !== authCheckVersion) return;

    if (error || !administrator) {
        console.error('Unauthorized dashboard session', error);
        await client.auth.signOut();
        showAuthScreen();
        showToast('هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.', 'error', 6000);
        return;
    }

    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'flex';
    document.getElementById('admin-email').textContent = session.user.email;

    if (!isDashboardInitialized) {
        isDashboardInitialized = true;
        loadDashboardData();
    }
}

function initAuthListener() {
    const client = getSupabaseClient();
    if (!client) return;

    const recoveryLink = window.location.hash.includes('type=recovery')
        || new URLSearchParams(window.location.search).get('type') === 'recovery';

    client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showPasswordRecoveryForm();
            return;
        }

        if (!passwordRecoveryMode) {
            window.setTimeout(() => applyAuthSession(session), 0);
        }
    });

    if (recoveryLink) {
        showPasswordRecoveryForm();
    } else {
        client.auth.getSession().then(({ data }) => applyAuthSession(data.session));
    }
}

// Handle admin login
async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const client = getSupabaseClient();
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!client) {
        showToast('فشل الاتصال بالخدمة. حاول مرة أخرى.', 'error');
        return;
    }

    submitBtn.disabled = true;

    try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (error) {
        console.error('Admin login failed', error);
        showToast('تعذر تسجيل الدخول. راجع البيانات وحاول مرة أخرى.', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Handle Logout
async function handleLogout() {
    const client = getSupabaseClient();
    if (client) {
        await client.auth.signOut();
    }
}

// Switch between Navigation Tabs
function switchTab(tabName) {
    currentTab = tabName;
    sessionStorage.setItem('bsmagazone_active_tab', tabName);
    
    // Manage active state of menu items
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const activeItem = document.getElementById(`menu-${tabName}`);
    if (activeItem) activeItem.classList.add('active');

    // Manage active state of sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(sec => sec.classList.remove('active'));
    
    const activeSection = document.getElementById(`tab-${tabName}`);
    if (activeSection) activeSection.classList.add('active');

    // Update Top bar titles
    const titleEl = document.getElementById('current-tab-title');
    const subtitleEl = document.getElementById('current-tab-subtitle');
    
    switch (tabName) {
        case 'overview':
            titleEl.textContent = 'نظرة عامة';
            subtitleEl.textContent = 'إحصائيات فورية لأداء منصة الامتحانات';
            break;
        case 'analytics':
            titleEl.textContent = 'التحليلات والأرقام';
            subtitleEl.textContent = 'تحليلات تفصيلية عن سلوك الطلاب وأدائهم';
            break;
        case 'results':
            titleEl.textContent = 'نتائج الطلاب';
            subtitleEl.textContent = 'سجل درجات الطلاب والامتحانات المكتملة';
            break;
        case 'questions':
            titleEl.textContent = 'إدارة الأسئلة';
            subtitleEl.textContent = 'إضافة، تعديل، وحذف أسئلة الامتحانات';
            break;
        case 'subjects':
            titleEl.textContent = 'المواد والامتحانات';
            subtitleEl.textContent = 'تفعيل/تعطيل المواد الدراسية وامتحاناتها';
            break;
    }
    
    // Trigger specific tab loads
    loadTabData(tabName);
}

// Toggle Sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    sidebar.classList.toggle('active');
}

// ============================================
// DATA LOADING DISPATCHER
// ============================================
async function loadDashboardData() {
    // Load subjects globally first
    await loadGlobalSubjects();
    
    // Load default tab data
    const savedTab = sessionStorage.getItem('bsmagazone_active_tab') || 'overview';
    switchTab(savedTab);

    // If active tab is subjects and we had a saved exam/subject sub-view, restore it
    if (savedTab === 'subjects') {
        const savedExamId = sessionStorage.getItem('bsmagazone_integrated_exam_id');
        const savedSubjectId = sessionStorage.getItem('bsmagazone_integrated_subject_id');
        if (savedExamId && savedSubjectId) {
            await showExamQuestionsIntegrated(parseInt(savedSubjectId), parseInt(savedExamId));
        }
    }
}

async function loadTabData(tabName) {
    switch (tabName) {
        case 'overview':
            await loadOverviewData();
            break;
        case 'analytics':
            await loadAnalyticsData();
            break;
        case 'results':
            await loadResultsData();
            break;
        case 'questions':
            await loadQuestionsData();
            break;
        case 'subjects':
            await loadSubjectsManagerData();
            break;
    }
}

// Fetch subjects and exams globally to use in dropdowns
async function loadGlobalSubjects() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const [universitiesRes, facultiesRes, yearsRes, semestersRes, subjectsRes, examsRes, materialsRes, questionsRes] = await Promise.all([
            client.from('universities').select('*').order('sort_order', { ascending: true }).order('name'),
            client.from('faculties').select('*').order('sort_order', { ascending: true }).order('name'),
            client.from('academic_years').select('*').order('sort_order', { ascending: true }),
            client.from('semesters').select('*').order('sort_order', { ascending: true }),
            client.from('subjects').select('*').order('id', { ascending: true }),
            client.from('exams').select('*').order('id', { ascending: true }),
            client.from('review_materials').select('*').order('sort_order', { ascending: true }),
            client.from('questions').select('exam_id')
        ]);

        const firstError = [universitiesRes, facultiesRes, yearsRes, semestersRes, subjectsRes, examsRes, materialsRes]
            .find(result => result.error)?.error;
        if (firstError) throw firstError;

        activeUniversities = universitiesRes.data || [];
        activeFaculties = facultiesRes.data || [];
        activeYears = yearsRes.data || [];
        activeSemesters = semestersRes.data || [];
        activeSubjects = subjectsRes.data || [];
        activeExams = examsRes.data || [];
        activeReviewMaterials = materialsRes.data || [];

        examQuestionCounts = {};
        if (!questionsRes.error && questionsRes.data) {
            questionsRes.data.forEach(q => {
                if (q.exam_id) {
                    examQuestionCounts[q.exam_id] = (examQuestionCounts[q.exam_id] || 0) + 1;
                }
            });
        }

        globalDataLoaded = true;

        // Populate filter dropdowns
        populateDropdowns();
    } catch (e) {
        console.error("Error loading global config:", e);
    }
}

function populateDropdowns() {
    const resultSubSelect = document.getElementById('filter-result-subject');
    const questionSubSelect = document.getElementById('filter-question-subject');

    const managerUniversitySelect = document.getElementById('filter-subject-university');
    if (managerUniversitySelect) {
        const cachedValue = managerUniversitySelect.value;
        managerUniversitySelect.innerHTML = '<option value="">كل الجامعات</option>';
        activeUniversities.forEach(university => {
            managerUniversitySelect.innerHTML += `<option value="${university.id}">${university.name}</option>`;
        });
        if (activeUniversities.some(university => university.id == cachedValue)) {
            managerUniversitySelect.value = cachedValue;
        }
    }

    populateManagerFacultyFilter();

    const modalFacultyUniversity = document.getElementById('modal-faculty-university');
    if (modalFacultyUniversity) {
        modalFacultyUniversity.innerHTML = '<option value="">اختر الجامعة...</option>';
        activeUniversities.forEach(university => {
            modalFacultyUniversity.innerHTML += `<option value="${university.id}">${university.name}</option>`;
        });
    }

    const modalYearFaculty = document.getElementById('modal-year-faculty');
    if (modalYearFaculty) {
        modalYearFaculty.innerHTML = '<option value="">اختر الكلية...</option>';
        activeFaculties.forEach(faculty => {
            const university = activeUniversities.find(item => item.id === faculty.university_id);
            const label = university ? `${university.name} — ${faculty.name}` : faculty.name;
            modalYearFaculty.innerHTML += `<option value="${faculty.id}">${label}</option>`;
        });
    }
    
    // Clear and add default
    if (resultSubSelect) {
        resultSubSelect.innerHTML = '<option value="">كل المواد</option>';
        activeSubjects.forEach(s => {
            resultSubSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    }

    if (questionSubSelect) {
        questionSubSelect.innerHTML = '<option value="">اختر المادة...</option>';
        activeSubjects.forEach(s => {
            questionSubSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    }

    const questionYearSelect = document.getElementById('filter-question-year');
    if (questionYearSelect) {
        questionYearSelect.innerHTML = '<option value="">اختر الفرقة...</option>';
        activeYears.forEach(y => {
            questionYearSelect.innerHTML += `<option value="${y.id}">${getAcademicYearLabel(y)}</option>`;
        });
    }

    // New filters in Subjects tab
    const subYearSelect = document.getElementById('filter-subject-year');
    if (subYearSelect) {
        const cachedVal = subYearSelect.value;
        subYearSelect.innerHTML = '<option value="">كل الفرق</option>';
        getManagerFilteredYears().forEach(y => {
            subYearSelect.innerHTML += `<option value="${y.id}">${y.name}</option>`;
        });
        if (Array.from(subYearSelect.options).some(option => option.value === cachedVal)) {
            subYearSelect.value = cachedVal;
        }
    }

    const subSemSelect = document.getElementById('filter-subject-semester');
    if (subSemSelect) {
        const cachedVal = subSemSelect.value;
        subSemSelect.innerHTML = '<option value="">كل الترمات</option>';
        activeSemesters.forEach(sem => {
            subSemSelect.innerHTML += `<option value="${sem.id}">${sem.name}</option>`;
        });
        subSemSelect.value = cachedVal;
    }

    // Modals dropdowns
    const modalSubYear = document.getElementById('modal-subject-year');
    if (modalSubYear) {
        modalSubYear.innerHTML = '<option value="">اختر الفرقة...</option>';
        activeYears.forEach(y => {
            modalSubYear.innerHTML += `<option value="${y.id}">${getAcademicYearLabel(y)}</option>`;
        });
    }

    const modalSubSem = document.getElementById('modal-subject-semester');
    if (modalSubSem) {
        modalSubSem.innerHTML = '<option value="">اختر الترم...</option>';
        activeSemesters.forEach(sem => {
            modalSubSem.innerHTML += `<option value="${sem.id}">${sem.name}</option>`;
        });
    }

    const modalExamSub = document.getElementById('modal-exam-subject');
    if (modalExamSub) {
        modalExamSub.innerHTML = '<option value="">اختر المادة...</option>';
        activeSubjects.forEach(s => {
            modalExamSub.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    }
}

function getFacultyContext(facultyId) {
    const faculty = activeFaculties.find(item => item.id === facultyId);
    const university = faculty
        ? activeUniversities.find(item => item.id === faculty.university_id)
        : null;
    return { faculty, university };
}

function getAcademicYearLabel(year) {
    const { faculty, university } = getFacultyContext(year.faculty_id);
    const context = [university?.name, faculty?.name].filter(Boolean).join(' — ');
    return context ? `${context} — ${year.name}` : year.name;
}

function populateManagerFacultyFilter() {
    const universitySelect = document.getElementById('filter-subject-university');
    const facultySelect = document.getElementById('filter-subject-faculty');
    if (!facultySelect) return;

    const cachedValue = facultySelect.value;
    const universityId = universitySelect?.value;
    const faculties = universityId
        ? activeFaculties.filter(faculty => faculty.university_id == universityId)
        : activeFaculties;

    facultySelect.innerHTML = '<option value="">كل الكليات</option>';
    faculties.forEach(faculty => {
        facultySelect.innerHTML += `<option value="${faculty.id}">${faculty.name}</option>`;
    });

    if (faculties.some(faculty => faculty.id == cachedValue)) {
        facultySelect.value = cachedValue;
    }
}

function getManagerFilteredYears() {
    const universityId = document.getElementById('filter-subject-university')?.value;
    const facultyId = document.getElementById('filter-subject-faculty')?.value;

    return activeYears.filter(year => {
        const faculty = activeFaculties.find(item => item.id === year.faculty_id);
        if (facultyId && year.faculty_id != facultyId) return false;
        if (universityId && faculty?.university_id != universityId) return false;
        return true;
    });
}

function refreshManagerYearFilter() {
    const yearSelect = document.getElementById('filter-subject-year');
    if (!yearSelect) return;

    const cachedValue = yearSelect.value;
    const years = getManagerFilteredYears();
    yearSelect.innerHTML = '<option value="">كل الفرق</option>';
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year.id}">${year.name}</option>`;
    });

    if (years.some(year => year.id == cachedValue)) {
        yearSelect.value = cachedValue;
    }
}

function onManagerUniversityChange() {
    populateManagerFacultyFilter();
    refreshManagerYearFilter();
    loadSubjectsManagerData();
}

function onManagerFacultyChange() {
    refreshManagerYearFilter();
    loadSubjectsManagerData();
}

// ============================================
// 1️⃣ OVERVIEW DATA LOADING
// ============================================
async function loadOverviewData() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        // Stats 1: Active students (distinct session count)
        const { data: activeStudentsData, error: e1 } = await client
            .from('exam_results')
            .select('session_id');
        if (e1) throw e1;
        const activeStudents = new Set((activeStudentsData || []).map(r => r.session_id)).size;
        document.getElementById('stat-active-students').textContent = activeStudents;

        // Stats 2: Completed exams count
        const { count: completedExams, error: e2 } = await client
            .from('exam_results')
            .select('*', { count: 'exact', head: true });
        if (e2) throw e2;
        document.getElementById('stat-completed-exams').textContent = completedExams || 0;

        // Stats 3: Average score
        const { data: avgScoreData, error: e3 } = await client
            .from('exam_results')
            .select('percentage');
        if (e3) throw e3;
        
        let avgScore = 0;
        if (avgScoreData && avgScoreData.length > 0) {
            const sum = avgScoreData.reduce((acc, curr) => acc + parseFloat(curr.percentage), 0);
            avgScore = Math.round(sum / avgScoreData.length);
        }
        document.getElementById('stat-average-score').textContent = `${avgScore}%`;

        // Stats 4: Page visits today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count: pageVisits, error: e4 } = await client
            .from('page_visits')
            .select('*', { count: 'exact', head: true })
            .gte('visited_at', startOfDay.toISOString());
        if (e4) throw e4;
        document.getElementById('stat-page-visits').textContent = pageVisits || 0;

        // Load charts
        loadOverviewCharts();

        // Load top performers
        loadTopPerformers();

        // Load hardest questions
        loadHardestQuestions(avgScoreData);
    } catch (e) {
        console.error("Error loading overview stats:", e);
    }
}

async function loadOverviewCharts() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        // Chart 1: Daily Visits (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: visitsData, error: vErr } = await client
            .from('page_visits')
            .select('visited_at')
            .gte('visited_at', thirtyDaysAgo.toISOString());
            
        if (vErr) throw vErr;

        // Group by local date
        const visitsByDate = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            visitsByDate[dateStr] = 0;
        }

        (visitsData || []).forEach(v => {
            const dateStr = new Date(v.visited_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            if (visitsByDate[dateStr] !== undefined) {
                visitsByDate[dateStr]++;
            }
        });

        const visitsLabels = Object.keys(visitsByDate);
        const visitsValues = Object.values(visitsByDate);

        if (visitsChart) visitsChart.destroy();
        const ctx1 = document.getElementById('overviewVisitsChart').getContext('2d');
        visitsChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: visitsLabels,
                datasets: [{
                    label: 'الزيارات اليومية',
                    data: visitsValues,
                    borderColor: '#e67e22',
                    backgroundColor: 'rgba(230, 126, 34, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } },
                    x: { grid: { display: false }, ticks: { color: '#a0aec0' } }
                }
            }
        });

        // Chart 2: Student distribution across subjects (Pie chart of exam results count)
        const { data: resultsData, error: rErr } = await client
            .from('exam_results')
            .select('subject_id');
            
        if (rErr) throw rErr;

        const subjectCounts = {};
        activeSubjects.forEach(s => {
            subjectCounts[s.name] = 0;
        });

        (resultsData || []).forEach(r => {
            const subject = activeSubjects.find(s => s.id === r.subject_id);
            if (subject) {
                subjectCounts[subject.name] = (subjectCounts[subject.name] || 0) + 1;
            }
        });

        if (subjectsChart) subjectsChart.destroy();
        const ctx2 = document.getElementById('overviewSubjectsChart').getContext('2d');
        subjectsChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: Object.keys(subjectCounts),
                datasets: [{
                    data: Object.values(subjectCounts),
                    backgroundColor: [
                        '#e67e22', '#9b59b6', '#2ecc71', '#3498db', '#e74c3c', '#1abc9c', '#f1c40f'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#a0aec0', font: { family: 'Cairo' } }
                    }
                }
            }
        });

    } catch (e) {
        console.error("Error loading charts:", e);
    }
}

async function loadTopPerformers() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { data: results, error } = await client
            .from('exam_results')
            .select(`
                score, 
                total_questions, 
                percentage, 
                session_id,
                student_sessions (student_name)
            `);
            
        if (error) throw error;

        // Group by session
        const students = {};
        (results || []).forEach(r => {
            const session = r.student_sessions;
            const name = (session && session.student_name) ? session.student_name : 'طالب مجهول';
            const sessionId = r.session_id;

            if (!students[sessionId]) {
                students[sessionId] = { name: name, count: 0, sumPercent: 0 };
            }
            students[sessionId].count++;
            students[sessionId].sumPercent += parseFloat(r.percentage);
        });

        // Convert to array and sort
        const sortedStudents = Object.values(students)
            .map(s => ({
                name: s.name,
                count: s.count,
                avgPercent: Math.round(s.sumPercent / s.count)
            }))
            .sort((a, b) => b.avgPercent - a.avgPercent)
            .slice(0, 5);

        const tbody = document.querySelector('#top-performers-table tbody');
        tbody.innerHTML = '';

        if (sortedStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary)">لا توجد نتائج مسجلة حتى الآن</td></tr>';
            return;
        }

        sortedStudents.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td><i class="fas fa-user" style="color:var(--primary-color); margin-left: 8px;"></i>${s.name}</td>
                    <td>${s.count} امتحان</td>
                    <td><span class="badge success">${s.avgPercent}%</span></td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error loading top performers:", e);
    }
}

async function loadHardestQuestions() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { data: results, error } = await client
            .from('exam_results')
            .select('answers, subject_id');
            
        if (error) throw error;

        // Parse answers to compute error rates per question
        const questionStats = {}; // key: qId, val: { wrong: 0, total: 0 }
        
        (results || []).forEach(r => {
            const answers = r.answers;
            if (answers && typeof answers === 'object') {
                Object.keys(answers).forEach(qId => {
                    const ans = answers[qId];
                    if (!questionStats[qId]) {
                        questionStats[qId] = { wrong: 0, total: 0 };
                    }
                    questionStats[qId].total++;
                    if (ans && ans.isCorrect === false) {
                        questionStats[qId].wrong++;
                    }
                });
            }
        });

        // Filter questions with at least 3 attempts
        const hardest = Object.keys(questionStats)
            .map(qId => ({
                id: parseInt(qId),
                wrong: questionStats[qId].wrong,
                total: questionStats[qId].total,
                rate: questionStats[qId].wrong / questionStats[qId].total
            }))
            .filter(q => q.total >= 3)
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5);

        const tbody = document.querySelector('#hardest-questions-table tbody');
        
        if (hardest.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary)">لا توجد بيانات كافية حالياً (تتطلب 3 محاولات على الأقل للسؤال)</td></tr>';
            return;
        }

        // Fetch question details for these hardest IDs
        const ids = hardest.map(h => h.id);
        const { data: qDetails, error: qErr } = await client
            .from('questions')
            .select('id, text, exam_id, exams(subject_id, subjects(name))')
            .in('id', ids);

        if (qErr) throw qErr;

        tbody.innerHTML = '';
        hardest.forEach(h => {
            const q = qDetails.find(qd => qd.id === h.id);
            if (q) {
                const subjectName = q.exams && q.exams.subjects ? q.exams.subjects.name : 'مادة مجهولة';
                tbody.innerHTML += `
                    <tr>
                        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${q.text}">${q.text}</td>
                        <td>${subjectName}</td>
                        <td><span class="badge danger">${Math.round(h.rate * 100)}% خطأ</span></td>
                    </tr>
                `;
            }
        });

    } catch (e) {
        console.error("Error loading hardest questions:", e);
    }
}

// ============================================
// 2️⃣ ANALYTICS DATA LOADING
// ============================================
async function loadAnalyticsData() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        // Device stats from sessions
        const { data: sessions, error: sErr } = await client
            .from('student_sessions')
            .select('device_type');
            
        if (sErr) throw sErr;

        let mobile = 0;
        let desktop = 0;
        (sessions || []).forEach(s => {
            if (s.device_type === 'mobile') mobile++;
            else desktop++;
        });

        const total = mobile + desktop || 1;
        document.getElementById('stat-mobile-pct').textContent = `${Math.round(mobile/total*100)}%`;
        document.getElementById('stat-desktop-pct').textContent = `${Math.round(desktop/total*100)}%`;

        // Average time spent
        const { data: timeSpentData, error: tErr } = await client
            .from('exam_results')
            .select('time_spent_seconds');
            
        if (tErr) throw tErr;

        let avgMinutes = 0;
        if (timeSpentData && timeSpentData.length > 0) {
            const totalSecs = timeSpentData.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0);
            avgMinutes = Math.round((totalSecs / timeSpentData.length) / 60);
        }
        document.getElementById('stat-avg-exam-time').textContent = `${avgMinutes} دقيقة`;

        // Load charts
        loadAnalyticsCharts();
    } catch (e) {
        console.error("Error loading analytics data:", e);
    }
}

async function loadAnalyticsCharts() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        // Chart 1: Average scores per subject
        const { data: scoresData, error: scErr } = await client
            .from('exam_results')
            .select('subject_id, percentage');
            
        if (scErr) throw scErr;

        const subjectScores = {};
        activeSubjects.forEach(s => {
            subjectScores[s.name] = { sum: 0, count: 0 };
        });

        (scoresData || []).forEach(r => {
            const subject = activeSubjects.find(s => s.id === r.subject_id);
            if (subject) {
                subjectScores[subject.name].sum += parseFloat(r.percentage);
                subjectScores[subject.name].count++;
            }
        });

        const subjectScoresLabels = [];
        const subjectScoresValues = [];
        Object.keys(subjectScores).forEach(name => {
            const s = subjectScores[name];
            subjectScoresLabels.push(name);
            subjectScoresValues.push(s.count > 0 ? Math.round(s.sum / s.count) : 0);
        });

        if (subjectScoresChart) subjectScoresChart.destroy();
        const ctx1 = document.getElementById('analyticsSubjectScoresChart').getContext('2d');
        subjectScoresChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: subjectScoresLabels,
                datasets: [{
                    label: 'متوسط الدرجات %',
                    data: subjectScoresValues,
                    backgroundColor: 'rgba(230, 126, 34, 0.75)',
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } },
                    x: { grid: { display: false }, ticks: { color: '#a0aec0', font: { size: 10 } } }
                }
            }
        });

        // Chart 2: Hourly usage peak times (visits grouped by hour)
        const { data: visitsData, error: vErr } = await client
            .from('page_visits')
            .select('visited_at');
            
        if (vErr) throw vErr;

        const hoursMap = Array(24).fill(0);
        (visitsData || []).forEach(v => {
            const hour = new Date(v.visited_at).getHours();
            hoursMap[hour]++;
        });

        const hourLabels = Array(24).fill(0).map((_, i) => `${i}:00`);

        if (usageHoursChart) usageHoursChart.destroy();
        const ctx2 = document.getElementById('analyticsUsageHoursChart').getContext('2d');
        usageHoursChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: hourLabels,
                datasets: [{
                    label: 'عدد الزيارات',
                    data: hoursMap,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } },
                    x: { grid: { display: false }, ticks: { color: '#a0aec0' } }
                }
            }
        });

    } catch (e) {
        console.error("Error loading analytics charts:", e);
    }
}

// ============================================
// 3️⃣ RESULTS TAB LOGIC
// ============================================
async function loadResultsData() {
    // Dropdowns are already loaded globally, just load table
    await loadResultsTable();
}

async function loadResultsTable() {
    const client = getSupabaseClient();
    if (!client) return;

    const subjectFilter = document.getElementById('filter-result-subject').value;
    const tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">جاري جلب النتائج...</td></tr>';

    try {
        let query = client
            .from('exam_results')
            .select(`
                id,
                score,
                total_questions,
                percentage,
                time_spent_seconds,
                completed_at,
                student_sessions (student_name),
                subjects (name),
                exams (title)
            `)
            .order('completed_at', { ascending: false });

        if (subjectFilter) {
            query = query.eq('subject_id', subjectFilter);
        }

        const { data: results, error } = await query;
        if (error) throw error;

        tbody.innerHTML = '';
        
        if (!results || results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">لا توجد نتائج مسجلة للمرشحات الحالية</td></tr>';
            return;
        }

        results.forEach(r => {
            const studentName = r.student_sessions && r.student_sessions.student_name ? r.student_sessions.student_name : 'طالب مجهول';
            const subjectName = r.subjects ? r.subjects.name : 'مادة مجهولة';
            const examTitle = r.exams ? r.exams.title : 'امتحان مجهول';
            const timeMin = r.time_spent_seconds ? `${Math.floor(r.time_spent_seconds / 60)}د ${r.time_spent_seconds % 60}ث` : 'مجهول';
            const dateStr = new Date(r.completed_at).toLocaleString('ar-EG');
            
            const badgeClass = r.percentage >= 85 ? 'success' : (r.percentage >= 50 ? 'warning' : 'danger');

            tbody.innerHTML += `
                <tr>
                    <td><strong>${studentName}</strong></td>
                    <td>${subjectName}</td>
                    <td>${examTitle}</td>
                    <td>${r.score} من ${r.total_questions}</td>
                    <td><span class="badge ${badgeClass}">${r.percentage}%</span></td>
                    <td>${timeMin}</td>
                    <td style="font-size:0.85rem;color:var(--text-secondary)">${dateStr}</td>
                </tr>
            `;
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--error-color)">حدث خطأ أثناء تحميل البيانات: ${e.message}</td></tr>`;
    }
}

// Export results to CSV
async function exportResultsToCSV() {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { data: results, error } = await client
            .from('exam_results')
            .select(`
                completed_at,
                percentage,
                score,
                total_questions,
                time_spent_seconds,
                student_sessions (student_name),
                subjects (name),
                exams (title)
            `)
            .order('completed_at', { ascending: false });

        if (error) throw error;
        if (!results || results.length === 0) {
            showToast('لا توجد بيانات لتصديرها', 'warning');
            return;
        }

        // CSV Header
        let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic support
        csvContent += "اسم الطالب,المادة,الامتحان,النتيجة,النسبة المئوية,الوقت المستغرق,تاريخ الاتمام\n";

        results.forEach(r => {
            const student = r.student_sessions && r.student_sessions.student_name ? r.student_sessions.student_name : 'طالب مجهول';
            const subject = r.subjects ? r.subjects.name : 'مادة مجهولة';
            const exam = r.exams ? r.exams.title : 'امتحان مجهول';
            const scoreStr = `${r.score}/${r.total_questions}`;
            const time = r.time_spent_seconds ? `${Math.floor(r.time_spent_seconds / 60)}m ${r.time_spent_seconds % 60}s` : 'Unknown';
            const date = new Date(r.completed_at).toLocaleString('ar-EG');
            
            // Escape values containing commas
            csvContent += `"${student}","${subject}","${exam}","${scoreStr}","${r.percentage}%","${time}","${date}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `نتائج_الطلاب_BsmagaZone_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        showToast('خطأ في تصدير الملف: ' + e.message, 'error');
    }
}

// ============================================
// 4️⃣ QUESTIONS TAB LOGIC
// ============================================
async function loadQuestionsData() {
    // Dropdowns populated globally, wait for selection
}

function onQuestionYearFilterChange() {
    const yearId = document.getElementById('filter-question-year').value;
    const subjectSelect = document.getElementById('filter-question-subject');
    const examSelect = document.getElementById('filter-question-exam');
    const addBtn = document.getElementById('btn-add-question');
    const bulkBtn = document.getElementById('btn-bulk-import-question');

    // Reset subject select
    subjectSelect.innerHTML = '<option value="">اختر المادة...</option>';
    
    // Filter subjects by selected year if chosen
    let filteredSubjects = activeSubjects;
    if (yearId) {
        filteredSubjects = activeSubjects.filter(s => s.academic_year_id == yearId);
    }
    
    filteredSubjects.forEach(s => {
        subjectSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    // Reset exams select
    examSelect.innerHTML = '<option value="">اختر الامتحان...</option>';
    examSelect.disabled = true;
    addBtn.disabled = true;
    if (bulkBtn) bulkBtn.disabled = true;

    // Reset questions list
    document.getElementById('questions-list').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary)">
            <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px; color: var(--glass-border)"></i>
            <p>يرجى اختيار المادة والامتحان لعرض الأسئلة وإدارتها</p>
        </div>
    `;
}

async function onQuestionSubjectFilterChange() {
    const subjectId = document.getElementById('filter-question-subject').value;
    const examSelect = document.getElementById('filter-question-exam');
    const addBtn = document.getElementById('btn-add-question');
    const bulkBtn = document.getElementById('btn-bulk-import-question');
    
    // Clear list
    document.getElementById('questions-list').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary)">
            <p>يرجى اختيار الامتحان لعرض الأسئلة</p>
        </div>
    `;

    if (!subjectId) {
        examSelect.innerHTML = '<option value="">اختر الامتحان...</option>';
        examSelect.disabled = true;
        addBtn.disabled = true;
        if (bulkBtn) bulkBtn.disabled = true;
        return;
    }

    // Filter exams by selected subject
    const exams = activeExams.filter(e => e.subject_id == subjectId);
    
    examSelect.innerHTML = '<option value="">اختر الامتحان...</option>';
    exams.forEach(e => {
        examSelect.innerHTML += `<option value="${e.id}">${e.title}</option>`;
    });
    
    examSelect.disabled = false;
    addBtn.disabled = true;
    if (bulkBtn) bulkBtn.disabled = true;
}

async function loadQuestionsList() {
    const examId = document.getElementById('filter-question-exam').value;
    const addBtn = document.getElementById('btn-add-question');
    const bulkBtn = document.getElementById('btn-bulk-import-question');
    const container = document.getElementById('questions-list');

    if (!examId) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary)">
                <p>يرجى اختيار الامتحان لعرض الأسئلة</p>
            </div>
        `;
        addBtn.disabled = true;
        if (bulkBtn) bulkBtn.disabled = true;
        return;
    }

    addBtn.disabled = false;
    if (bulkBtn) bulkBtn.disabled = false;
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px;">جاري تحميل الأسئلة...</div>';

    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { data: questions, error } = await client
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        allQuestions = questions || [];
        
        renderQuestionsManager();
    } catch (e) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--error-color)">خطأ أثناء تحميل الأسئلة: ${e.message}</div>`;
    }
}

function renderQuestionsManager() {
    const container = document.getElementById('questions-list');
    container.innerHTML = '';

    if (allQuestions.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary)">
                <p>لا توجد أسئلة مسجلة في هذا الامتحان. يمكنك إضافة سؤالك الأول بالضغط على زر "إضافة سؤال جديد"</p>
            </div>
        `;
        return;
    }

    allQuestions.forEach((q, idx) => {
        const typeBadge = q.type === 'tf' ? 'الصواب والخطأ' : (q.type === 'mcq' ? 'اختيار من متعدد' : 'سؤال مقالي');
        const badgeColor = q.type === 'tf' ? 'info' : (q.type === 'mcq' ? 'success' : 'warning');
        
        let answersPreview = '';
        if (q.type === 'tf') {
            answersPreview = `الإجابة الصحيحة: <strong>${q.correct_answer === 'true' ? 'صح' : 'خطأ'}</strong>`;
        } else if (q.type === 'mcq') {
            const opts = q.options || [];
            answersPreview = `الخيارات: [${opts.join(' | ')}]<br>الخيار الصحيح: <strong>${opts[parseInt(q.correct_answer)] || q.correct_answer}</strong>`;
        } else {
            answersPreview = `الإجابة النموذجية: <strong>${q.explanation ? q.explanation.substring(0, 50) + '...' : 'غير مدخلة'}</strong>`;
        }

        container.innerHTML += `
            <div class="manager-card" data-text="${q.text.toLowerCase()}">
                <div class="card-top">
                    <span class="badge ${badgeColor}">${typeBadge}</span>
                    <div class="card-actions">
                        <button class="btn-circle edit" onclick="openEditQuestionModal(${q.id})" title="تعديل"><i class="fas fa-edit"></i></button>
                        <button class="btn-circle delete" onclick="deleteQuestion(${q.id})" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <h4 style="margin-bottom: 12px; font-weight: 700; line-height: 1.6;">سؤال ${idx + 1}: ${q.text}</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px;">
                    ${answersPreview}
                </p>
                ${q.explanation && q.type !== 'essay' ? `<p style="font-size: 0.8rem; color: var(--warning-color)">التعليل: ${q.explanation}</p>` : ''}
            </div>
        `;
    });
}

function filterQuestions() {
    const q = document.getElementById('search-questions-input').value.toLowerCase();
    const cards = document.querySelectorAll('#questions-list .manager-card');
    
    cards.forEach(card => {
        const text = card.dataset.text || '';
        if (text.includes(q)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Open modals
function openAddQuestionModal() {
    document.getElementById('question-modal-title').textContent = 'إضافة سؤال جديد';
    document.getElementById('modal-question-id').value = '';
    document.getElementById('question-form').reset();
    onQuestionTypeChange();
    
    document.getElementById('question-modal').classList.add('active');
}

function openEditQuestionModal(qId) {
    const q = allQuestions.find(x => x.id === qId);
    if (!q) return;

    document.getElementById('question-modal-title').textContent = 'تعديل السؤال';
    document.getElementById('modal-question-id').value = q.id;
    document.getElementById('modal-question-type').value = q.type;
    document.getElementById('modal-question-text').value = q.text;
    document.getElementById('modal-question-explanation').value = q.explanation || '';
    
    onQuestionTypeChange();

    if (q.type === 'tf') {
        document.getElementById('modal-correct-tf').value = q.correct_answer;
    } else if (q.type === 'mcq') {
        const optInputs = document.querySelectorAll('.mcq-option-input');
        const opts = q.options || [];
        optInputs.forEach((inp, idx) => {
            inp.value = opts[idx] || '';
        });
        document.getElementById('modal-correct-mcq').value = q.correct_answer;
    }

    document.getElementById('question-modal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function onQuestionTypeChange() {
    const type = document.getElementById('modal-question-type').value;
    const mcqOpts = document.getElementById('mcq-options-container');
    const tfCorrect = document.getElementById('correct-tf-container');
    const mcqCorrect = document.getElementById('correct-mcq-container');
    
    const optionInputs = document.querySelectorAll('.mcq-option-input');

    if (type === 'tf') {
        mcqOpts.style.display = 'none';
        tfCorrect.style.display = 'block';
        mcqCorrect.style.display = 'none';
        optionInputs.forEach(i => i.removeAttribute('required'));
    } else if (type === 'mcq') {
        mcqOpts.style.display = 'block';
        tfCorrect.style.display = 'none';
        mcqCorrect.style.display = 'block';
        optionInputs.forEach(i => i.setAttribute('required', 'true'));
    } else {
        // Essay
        mcqOpts.style.display = 'none';
        tfCorrect.style.display = 'none';
        mcqCorrect.style.display = 'none';
        optionInputs.forEach(i => i.removeAttribute('required'));
    }
}

// Save (Insert / Update) question
async function saveQuestion(event) {
    event.preventDefault();
    const qId = document.getElementById('modal-question-id').value;
    const type = document.getElementById('modal-question-type').value;
    const text = document.getElementById('modal-question-text').value;
    const explanation = document.getElementById('modal-question-explanation').value;
    const examId = currentIntegratedExamId || document.getElementById('filter-question-exam').value;
    const client = getSupabaseClient();

    if (!client || !examId) return;

    let correct_answer = '';
    let options = null;

    if (type === 'tf') {
        correct_answer = document.getElementById('modal-correct-tf').value;
    } else if (type === 'mcq') {
        const optInputs = document.querySelectorAll('.mcq-option-input');
        options = Array.from(optInputs).map(inp => inp.value.trim());
        correct_answer = document.getElementById('modal-correct-mcq').value;
    } else {
        // Essay
        correct_answer = 'essay';
    }

    const payload = {
        exam_id: parseInt(examId),
        type,
        text,
        options,
        correct_answer,
        explanation
    };

    try {
        if (qId) {
            // Update
            const { error } = await client
                .from('questions')
                .update(payload)
                .eq('id', qId);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await client
                .from('questions')
                .insert(payload);
            if (error) throw error;
        }
        
        closeModal('question-modal');
        refreshQuestionsList();
    } catch (e) {
        showToast("خطأ أثناء حفظ السؤال: " + e.message, "error");
    }
}

// Delete question
async function deleteQuestion(qId) {
    const performDelete = async () => {
        const client = getSupabaseClient();
        if (!client) return;

        try {
            const { error } = await client
                .from('questions')
                .delete()
                .eq('id', qId);
            if (error) throw error;
            
            showToast("تم حذف السؤال بنجاح.", "success");
            globalDataLoaded = false; // Force re-fetch of question counts
            refreshQuestionsList();
        } catch (e) {
            showToast("خطأ أثناء حذف السؤال: " + e.message, "error");
        }
    };

    if (sessionStorage.getItem('bsmagazone_skip_delete_confirm') === 'true') {
        await performDelete();
    } else {
        showConfirmDialog({
            title: "حذف السؤال",
            message: "هل أنت متأكد من حذف هذا السؤال نهائياً؟",
            icon: "fa-trash-alt",
            iconType: "danger",
            confirmText: "حذف",
            confirmStyle: "danger",
            showCheckbox: true,
            checkboxLabel: "عدم إظهار هذا التأكيد مرة أخرى في هذه الجلسة",
            checkboxSessionKey: "bsmagazone_skip_delete_confirm",
            onConfirm: performDelete
        });
    }
}

// ============================================
// 5️⃣ SUBJECTS & EXAMS MANAGER TAB LOGIC
// ============================================
async function loadSubjectsManagerData() {
    const client = getSupabaseClient();
    if (!client) return;

    const container = document.getElementById('subjects-list');
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center;">جاري تحميل المواد والامتحانات...</div>';

    try {
        const universityFilterVal = document.getElementById('filter-subject-university')?.value || '';
        const facultyFilterVal = document.getElementById('filter-subject-faculty')?.value || '';
        const yearFilterVal = document.getElementById('filter-subject-year').value;
        const semFilterVal = document.getElementById('filter-subject-semester').value;

        // Fetch fresh data if not loaded
        if (!globalDataLoaded) {
            await loadGlobalSubjects();
        }

        const selectedYearId = yearFilterVal ? parseInt(yearFilterVal) : null;
        const selectedSemId = semFilterVal ? parseInt(semFilterVal) : null;

        const fragment = document.createDocumentFragment();

        if (activeYears.length === 0 && activeSubjects.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">لا توجد فرق أو مواد دراسية مضافة بعد</div>';
            return;
        }

        // Group subjects by University > Faculty > Academic Year
        getManagerFilteredYears().forEach(year => {
            if (selectedYearId && year.id !== selectedYearId) return;

            const { faculty, university } = getFacultyContext(year.faculty_id);
            if (facultyFilterVal && year.faculty_id != facultyFilterVal) return;
            if (universityFilterVal && faculty?.university_id != universityFilterVal) return;

            // Get subjects for this year
            let yearSubjects = activeSubjects.filter(s => s.academic_year_id === year.id);
            if (selectedSemId) {
                yearSubjects = yearSubjects.filter(s => s.semester_id === selectedSemId);
            }

            // Create year section container
            const yearSection = document.createElement('div');
            yearSection.className = 'year-section';
            yearSection.style.cssText = 'grid-column: 1 / -1; margin-bottom: 30px; display: flex; flex-direction: column; gap: 15px;';

            // Year header layout
            let yearHeaderHtml = `
                <div class="year-header" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 12px 20px; border-radius: 10px; border: 1px solid var(--glass-border); backdrop-filter: blur(5px);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <h3 style="font-weight: 800; font-size: 1.2rem; color: #a855f7; margin: 0;">
                            <i class="fas fa-graduation-cap" style="margin-left: 10px;"></i>${year.name}
                        </h3>
                        ${university || faculty ? `<span style="font-size:0.78rem;color:var(--text-secondary);">${[university?.name, faculty?.name].filter(Boolean).join(' / ')}</span>` : ''}
                        <span style="font-size: 0.8rem; background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 2px 8px; border-radius: 20px;">الرمز: ${year.slug}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <label class="switch" title="تفعيل / تعطيل الفرقة">
                            <input type="checkbox" ${year.is_active ? 'checked' : ''} onchange="toggleYearActive(${year.id}, this.checked)">
                            <span class="slider"></span>
                        </label>
                        <button onclick="openEditYearModal(${year.id})" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem;" title="تعديل الفرقة">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteAcademicYear(${year.id})" style="background: none; border: none; color: var(--error-color, #ef4444); cursor: pointer; font-size: 1rem;" title="حذف الفرقة">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;

            yearSection.innerHTML = yearHeaderHtml;

            // Subjects grid under this year
            const subjectsGrid = document.createElement('div');
            subjectsGrid.className = 'grid-cards';
            subjectsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;';

            if (yearSubjects.length === 0) {
                subjectsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding: 20px; color:var(--text-secondary); font-size:0.9rem;">لا توجد مواد في هذه الفرقة تطابق الفلتر</div>';
            } else {
                yearSubjects.forEach(s => {
                    const exams = activeExams.filter(e => e.subject_id === s.id);
                    const semesterObj = activeSemesters.find(sem => sem.id === s.semester_id);
                    const semesterName = semesterObj ? semesterObj.name : 'بدون ترم';

                    let examsListHtml = '';
                    exams.forEach(e => {
                        const qCount = examQuestionCounts[e.id] || 0;
                        examsListHtml += `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                                <span style="font-size:0.9rem; color:var(--text-secondary); display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                                    <i class="fas fa-file-alt" style="margin-left:8px; color: #10b981;"></i>${e.title}
                                    <span class="exam-question-count" title="عدد الأسئلة">
                                        <i class="fas fa-question-circle"></i> ${qCount} سؤال
                                    </span>
                                </span>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <label class="switch" title="تفعيل / تعطيل الامتحان">
                                        <input type="checkbox" ${e.is_active ? 'checked' : ''} onchange="toggleExamActive(${e.id}, this.checked)">
                                        <span class="slider"></span>
                                    </label>
                                    <button onclick="showExamQuestionsIntegrated(${s.id}, ${e.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.85rem;" title="إدارة أسئلة الامتحان">
                                        <i class="fas fa-question-circle"></i>
                                    </button>
                                    <button onclick="openEditExamModal(${e.id})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.85rem;" title="تعديل الامتحان">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteExam(${e.id})" style="background:none; border:none; color:var(--error-color); cursor:pointer; font-size:0.85rem;" title="حذف الامتحان">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    });

                    const cardHtml = `
                        <div class="manager-card theme-${s.color_theme || 'orange'}" style="display:flex; flex-direction:column; gap:15px; border-top: 4px solid var(--theme-color, var(--primary-color));">
                            <div style="display:flex; justify-content:space-between; align-items:start;">
                                <div>
                                    <h4 style="font-weight:800; font-size:1.1rem; color:var(--primary-color); margin:0;">
                                        <i class="fas fa-${s.icon || 'book'}" style="margin-left:10px;"></i>${s.name}
                                    </h4>
                                    <div style="margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;">
                                        <span style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); padding:2px 8px; border-radius:10px;">
                                            ${semesterName}
                                        </span>
                                        <span style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); padding:2px 8px; border-radius:10px;">
                                            الرمز: ${s.slug}
                                        </span>
                                    </div>
                                    ${s.description ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 8px 0 0 0; line-height: 1.4;">${s.description}</p>` : ''}
                                </div>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <label class="switch" title="تفعيل / تعطيل المادة">
                                        <input type="checkbox" ${s.is_active ? 'checked' : ''} onchange="toggleSubjectActive(${s.id}, this.checked)">
                                        <span class="slider"></span>
                                    </label>
                                    <button onclick="openReviewMaterialsModal(${s.id})" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:0.95rem;" title="إدارة المراجعات">
                                        <i class="fas fa-note-sticky"></i>
                                    </button>
                                    <button onclick="openEditSubjectModal(${s.id})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.95rem;" title="تعديل المادة">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteSubject(${s.id})" style="background:none; border:none; color:var(--error-color); cursor:pointer; font-size:0.95rem;" title="حذف المادة">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <div style="margin-top:10px; flex: 1;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--glass-border); padding-bottom:5px;">
                                    <h5 style="color:var(--text-secondary); margin:0;">قائمة الامتحانات (${exams.length})</h5>
                                    <button onclick="openAddExamModal(${s.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.8rem; display:flex; align-items:center; gap:4px;" title="إضافة امتحان للمادة">
                                        <i class="fas fa-plus-circle"></i>
                                        <span>إضافة امتحان</span>
                                    </button>
                                </div>
                                ${examsListHtml || '<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center; margin: 20px 0;">لا توجد امتحانات مضافة بعد</p>'}
                            </div>
                        </div>
                    `;
                    subjectsGrid.innerHTML += cardHtml;
                });
            }

            yearSection.appendChild(subjectsGrid);
            fragment.appendChild(yearSection);
        });

        // Also display subjects with no year associated
        let orphanSubjects = activeSubjects.filter(s => !s.academic_year_id);
        if (yearFilterVal || facultyFilterVal || universityFilterVal) orphanSubjects = [];
        if (selectedSemId) {
            orphanSubjects = orphanSubjects.filter(s => s.semester_id === selectedSemId);
        }

        if (orphanSubjects.length > 0) {
            const orphanSection = document.createElement('div');
            orphanSection.className = 'year-section';
            orphanSection.style.cssText = 'grid-column: 1 / -1; margin-bottom: 30px; display: flex; flex-direction: column; gap: 15px;';

            orphanSection.innerHTML = `
                <div class="year-header" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.02); padding: 12px 20px; border-radius: 10px; border: 1px solid var(--glass-border); backdrop-filter: blur(5px);">
                    <h3 style="font-weight: 800; font-size: 1.2rem; color: #94a3b8; margin: 0;">
                        <i class="fas fa-question-circle" style="margin-left: 10px;"></i>مواد غير مصنفة تحت فرقة
                    </h3>
                </div>
            `;

            const subjectsGrid = document.createElement('div');
            subjectsGrid.className = 'grid-cards';
            subjectsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;';

            orphanSubjects.forEach(s => {
                const exams = activeExams.filter(e => e.subject_id === s.id);
                const semesterObj = activeSemesters.find(sem => sem.id === s.semester_id);
                const semesterName = semesterObj ? semesterObj.name : 'بدون ترم';

                let examsListHtml = '';
                exams.forEach(e => {
                    const qCount = examQuestionCounts[e.id] || 0;
                    examsListHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                            <span style="font-size:0.9rem; color:var(--text-secondary); display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                                <i class="fas fa-file-alt" style="margin-left:8px; color: #10b981;"></i>${e.title}
                                <span class="exam-question-count" title="عدد الأسئلة">
                                    <i class="fas fa-question-circle"></i> ${qCount} سؤال
                                </span>
                            </span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <label class="switch">
                                    <input type="checkbox" ${e.is_active ? 'checked' : ''} onchange="toggleExamActive(${e.id}, this.checked)">
                                    <span class="slider"></span>
                                </label>
                                <button onclick="showExamQuestionsIntegrated(${s.id}, ${e.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.85rem;" title="إدارة أسئلة الامتحان">
                                    <i class="fas fa-question-circle"></i>
                                </button>
                                <button onclick="openEditExamModal(${e.id})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.85rem;" title="تعديل الامتحان">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteExam(${e.id})" style="background:none; border:none; color:var(--error-color); cursor:pointer; font-size:0.85rem;" title="حذف الامتحان">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });

                const cardHtml = `
                    <div class="manager-card theme-${s.color_theme || 'orange'}" style="display:flex; flex-direction:column; gap:15px; border-top: 4px solid var(--theme-color, var(--primary-color));">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div>
                                <h4 style="font-weight:800; font-size:1.1rem; color:var(--primary-color); margin:0;">
                                    <i class="fas fa-${s.icon || 'book'}" style="margin-left:10px;"></i>${s.name}
                                </h4>
                                <div style="margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;">
                                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); padding:2px 8px; border-radius:10px;">
                                        ${semesterName}
                                    </span>
                                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); padding:2px 8px; border-radius:10px;">
                                        الرمز: ${s.slug}
                                    </span>
                                </div>
                                ${s.description ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 8px 0 0 0; line-height: 1.4;">${s.description}</p>` : ''}
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <label class="switch">
                                    <input type="checkbox" ${s.is_active ? 'checked' : ''} onchange="toggleSubjectActive(${s.id}, this.checked)">
                                    <span class="slider"></span>
                                </label>
                                <button onclick="openReviewMaterialsModal(${s.id})" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:0.95rem;" title="إدارة المراجعات">
                                    <i class="fas fa-note-sticky"></i>
                                </button>
                                <button onclick="openEditSubjectModal(${s.id})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.95rem;" title="تعديل المادة">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteSubject(${s.id})" style="background:none; border:none; color:var(--error-color); cursor:pointer; font-size:0.95rem;" title="حذف المادة">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div style="margin-top:10px; flex: 1;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--glass-border); padding-bottom:5px;">
                                <h5 style="color:var(--text-secondary); margin:0;">قائمة الامتحانات (${exams.length})</h5>
                                <button onclick="openAddExamModal(${s.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.8rem; display:flex; align-items:center; gap:4px;" title="إضافة امتحان للمادة">
                                    <i class="fas fa-plus-circle"></i>
                                    <span>إضافة امتحان</span>
                                </button>
                            </div>
                            ${examsListHtml || '<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center; margin: 20px 0;">لا توجد امتحانات مضافة بعد</p>'}
                        </div>
                    </div>
                `;
                subjectsGrid.innerHTML += cardHtml;
            });

            orphanSection.appendChild(subjectsGrid);
            fragment.appendChild(orphanSection);
        }

        container.innerHTML = '';
        container.appendChild(fragment);

    } catch (e) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--error-color)">خطأ أثناء تحميل البيانات: ${e.message}</div>`;
    }
}

// Toggle subject status
async function toggleSubjectActive(subjectId, isActive) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { error } = await client
            .from('subjects')
            .update({ is_active: isActive })
            .eq('id', subjectId);

        if (error) throw error;
        console.log(`Subject ${subjectId} active status set to: ${isActive}`);
        await loadGlobalSubjects();
    } catch (e) {
        showToast("فشل تحديث حالة المادة: " + e.message, "error");
        loadSubjectsManagerData();
    }
}

// Toggle exam status
async function toggleExamActive(examId, isActive) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { error } = await client
            .from('exams')
            .update({ is_active: isActive })
            .eq('id', examId);

        if (error) throw error;
        console.log(`Exam ${examId} active status set to: ${isActive}`);
        await loadGlobalSubjects();
    } catch (e) {
        showToast("فشل تحديث حالة الامتحان: " + e.message, "error");
        loadSubjectsManagerData();
    }
}

// ============================================
// UNIVERSITIES & FACULTIES CRUD LOGIC
// ============================================
function openAddUniversityModal() {
    document.getElementById('university-form').reset();
    document.getElementById('modal-university-country').value = 'مصر';
    document.getElementById('university-modal').classList.add('active');
}

async function saveUniversity(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const payload = {
        name: document.getElementById('modal-university-name').value.trim(),
        slug: document.getElementById('modal-university-slug').value.trim().toLowerCase(),
        country: document.getElementById('modal-university-country').value.trim(),
        city: document.getElementById('modal-university-city').value.trim() || null
    };

    try {
        const { error } = await client.from('universities').insert(payload);
        if (error) throw error;
        closeModal('university-modal');
        showToast('تمت إضافة الجامعة بنجاح.', 'success');
        globalDataLoaded = false;
        await loadGlobalSubjects();
        await loadSubjectsManagerData();
    } catch (error) {
        showToast('تعذر حفظ الجامعة: ' + error.message, 'error');
    }
}

function openAddFacultyModal() {
    if (activeUniversities.length === 0) {
        showToast('أضف جامعة أولاً قبل إنشاء كلية.', 'warning');
        return;
    }

    document.getElementById('faculty-form').reset();
    const selectedUniversity = document.getElementById('filter-subject-university')?.value;
    if (selectedUniversity) {
        document.getElementById('modal-faculty-university').value = selectedUniversity;
    }
    document.getElementById('faculty-modal').classList.add('active');
}

async function saveFaculty(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const payload = {
        university_id: parseInt(document.getElementById('modal-faculty-university').value),
        name: document.getElementById('modal-faculty-name').value.trim(),
        slug: document.getElementById('modal-faculty-slug').value.trim().toLowerCase(),
        description: document.getElementById('modal-faculty-description').value.trim() || null
    };

    try {
        const { error } = await client.from('faculties').insert(payload);
        if (error) throw error;
        closeModal('faculty-modal');
        showToast('تمت إضافة الكلية بنجاح.', 'success');
        globalDataLoaded = false;
        await loadGlobalSubjects();
        await loadSubjectsManagerData();
    } catch (error) {
        showToast('تعذر حفظ الكلية: ' + error.message, 'error');
    }
}

// ============================================
// ACADEMIC YEARS CRUD LOGIC
// ============================================
function openAddYearModal() {
    if (activeFaculties.length === 0) {
        showToast('أضف كلية أولاً قبل إنشاء فرقة دراسية.', 'warning');
        return;
    }
    document.getElementById('year-modal-title').textContent = 'إضافة فرقة جديدة';
    document.getElementById('modal-year-id').value = '';
    document.getElementById('year-form').reset();
    const selectedFaculty = document.getElementById('filter-subject-faculty')?.value;
    if (selectedFaculty) {
        document.getElementById('modal-year-faculty').value = selectedFaculty;
    }
    document.getElementById('year-modal').classList.add('active');
}

async function openEditYearModal(yearId) {
    const year = activeYears.find(y => y.id === yearId);
    if (!year) return;

    document.getElementById('year-modal-title').textContent = 'تعديل الفرقة';
    document.getElementById('modal-year-id').value = year.id;
    document.getElementById('modal-year-faculty').value = year.faculty_id || '';
    document.getElementById('modal-year-name').value = year.name;
    document.getElementById('modal-year-slug').value = year.slug;
    document.getElementById('modal-year-sort').value = year.sort_order;

    document.getElementById('year-modal').classList.add('active');
}

async function saveAcademicYear(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const id = document.getElementById('modal-year-id').value;
    const faculty_id = parseInt(document.getElementById('modal-year-faculty').value);
    const name = document.getElementById('modal-year-name').value.trim();
    const slug = document.getElementById('modal-year-slug').value.trim();
    const sort_order = parseInt(document.getElementById('modal-year-sort').value);

    const payload = { faculty_id, name, slug, sort_order };

    try {
        if (id) {
            const { error } = await client
                .from('academic_years')
                .update(payload)
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await client
                .from('academic_years')
                .insert(payload);
            if (error) throw error;
        }

        closeModal('year-modal');
        await loadGlobalSubjects();
        await loadSubjectsManagerData();
    } catch (e) {
        showToast("خطأ أثناء حفظ الفرقة: " + e.message, "error");
    }
}

async function deleteAcademicYear(yearId) {
    const hasSubjects = activeSubjects.some(s => s.academic_year_id === yearId);
    if (hasSubjects) {
        showToast("لا يمكن حذف هذه الفرقة لأنها تحتوي على مواد مرتبطة بها. يرجى حذف المواد أولاً.", "warning");
        return;
    }

    showConfirmDialog({
        title: "حذف الفرقة الدراسية",
        message: "هل أنت متأكد من حذف هذه الفرقة نهائياً؟",
        icon: "fa-trash-alt",
        iconType: "danger",
        confirmText: "حذف",
        confirmStyle: "danger",
        onConfirm: async () => {
            const client = getSupabaseClient();
            if (!client) return;

            try {
                const { error } = await client
                    .from('academic_years')
                    .delete()
                    .eq('id', yearId);
                if (error) throw error;

                showToast("تم حذف الفرقة بنجاح.", "success");
                globalDataLoaded = false;
                await loadGlobalSubjects();
                await loadSubjectsManagerData();
            } catch (e) {
                showToast("خطأ أثناء حذف الفرقة: " + e.message, "error");
            }
        }
    });
}

async function toggleYearActive(yearId, isActive) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { error } = await client
            .from('academic_years')
            .update({ is_active: isActive })
            .eq('id', yearId);

        if (error) throw error;
        console.log(`Year ${yearId} active status set to: ${isActive}`);
        await loadGlobalSubjects();
    } catch (e) {
        showToast("فشل تحديث حالة الفرقة: " + e.message, "error");
        loadSubjectsManagerData();
    }
}

// ============================================
// SUBJECTS CRUD LOGIC
// ============================================
function openAddSubjectModal() {
    document.getElementById('subject-modal-title').textContent = 'إضافة مادة جديدة';
    document.getElementById('modal-subject-id').value = '';
    document.getElementById('subject-form').reset();
    document.getElementById('subject-modal').classList.add('active');
}

async function openEditSubjectModal(subjectId) {
    const subject = activeSubjects.find(s => s.id === subjectId);
    if (!subject) return;

    document.getElementById('subject-modal-title').textContent = 'تعديل المادة';
    document.getElementById('modal-subject-id').value = subject.id;
    document.getElementById('modal-subject-name').value = subject.name;
    document.getElementById('modal-subject-slug').value = subject.slug;
    document.getElementById('modal-subject-year').value = subject.academic_year_id || '';
    document.getElementById('modal-subject-semester').value = subject.semester_id || '';
    document.getElementById('modal-subject-icon').value = subject.icon || 'book';
    document.getElementById('modal-subject-color').value = subject.color_theme || 'orange';
    document.getElementById('modal-subject-desc').value = subject.description || '';

    document.getElementById('subject-modal').classList.add('active');
}

async function saveSubject(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const id = document.getElementById('modal-subject-id').value;
    const name = document.getElementById('modal-subject-name').value.trim();
    const slug = document.getElementById('modal-subject-slug').value.trim();
    const academic_year_id = parseInt(document.getElementById('modal-subject-year').value);
    const semester_id = parseInt(document.getElementById('modal-subject-semester').value);
    const icon = document.getElementById('modal-subject-icon').value.trim();
    const color_theme = document.getElementById('modal-subject-color').value;
    const description = document.getElementById('modal-subject-desc').value.trim();

    const payload = {
        name,
        slug,
        academic_year_id,
        semester_id,
        icon,
        color_theme,
        description
    };

    try {
        if (id) {
            const { error } = await client
                .from('subjects')
                .update(payload)
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await client
                .from('subjects')
                .insert(payload);
            if (error) throw error;
        }

        closeModal('subject-modal');
        await loadGlobalSubjects();
        await loadSubjectsManagerData();
    } catch (e) {
        showToast("خطأ أثناء حفظ المادة: " + e.message, "error");
    }
}

async function deleteSubject(subjectId) {
    const subject = activeSubjects.find(s => s.id === subjectId);
    if (!subject) return;

    const hasExams = activeExams.some(e => e.subject_id === subjectId);

    if (hasExams) {
        showConfirmDialog({
            title: "حذف المادة بالكامل",
            message: `تحذير: هذه المادة تحتوي على امتحانات وأسئلة مرتبطة بها. سيؤدي هذا الإجراء إلى حذف المادة <strong>"${subject.name}"</strong> وجميع امتحاناتها والأسئلة الخاصة بها نهائياً! يرجى كتابة اسم المادة للتأكيد:`,
            icon: "fa-exclamation-triangle",
            iconType: "danger",
            confirmText: "حذف كل شيء",
            confirmStyle: "danger",
            requireInput: true,
            inputLabel: "اسم المادة للتأكيد:",
            inputPlaceholder: subject.name,
            expectedInput: subject.name,
            onConfirm: async () => {
                await deleteSubjectCompletely(subjectId, subject.name);
            }
        });
    } else {
        showConfirmDialog({
            title: "حذف المادة",
            message: `هل أنت متأكد من حذف مادة <strong>"${subject.name}"</strong> نهائياً؟`,
            icon: "fa-trash-alt",
            iconType: "danger",
            confirmText: "حذف",
            confirmStyle: "danger",
            onConfirm: async () => {
                const client = getSupabaseClient();
                if (!client) return;

                try {
                    const { error } = await client
                        .from('subjects')
                        .delete()
                        .eq('id', subjectId);
                    if (error) throw error;

                    showToast(`تم حذف مادة "${subject.name}" بنجاح.`, "success");
                    globalDataLoaded = false;
                    await loadGlobalSubjects();
                    await loadSubjectsManagerData();
                } catch (e) {
                    showToast("خطأ أثناء حذف المادة: " + e.message, "error");
                }
            }
        });
    }
}

async function deleteSubjectCompletely(subjectId, subjectName) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        // 1. Get all exams for this subject
        const { data: exams, error: examsError } = await client
            .from('exams')
            .select('id')
            .eq('subject_id', subjectId);
        
        if (examsError) throw examsError;

        const examIds = (exams || []).map(e => e.id);

        if (examIds.length > 0) {
            // 2. Delete all questions for these exams
            const { error: questionsError } = await client
                .from('questions')
                .delete()
                .in('exam_id', examIds);
            
            if (questionsError) throw questionsError;

            // 3. Delete all exams
            const { error: deleteExamsError } = await client
                .from('exams')
                .delete()
                .eq('subject_id', subjectId);
            
            if (deleteExamsError) throw deleteExamsError;
        }

        // 4. Delete the subject itself
        const { error: deleteSubjectError } = await client
            .from('subjects')
            .delete()
            .eq('id', subjectId);
        
        if (deleteSubjectError) throw deleteSubjectError;

        showToast(`تم حذف مادة "${subjectName}" وجميع متعلقاتها بنجاح.`, 'success');
        globalDataLoaded = false;
        await loadGlobalSubjects();
        await loadSubjectsManagerData();
    } catch (e) {
        showToast("خطأ أثناء حذف المادة: " + e.message, 'error');
    }
}

// ============================================
// REVIEW MATERIALS CRUD LOGIC
// ============================================
function openReviewMaterialsModal(subjectId) {
    const subject = activeSubjects.find(item => item.id === subjectId);
    if (!subject) return;

    document.getElementById('review-material-modal-title').textContent = `مراجعات: ${subject.name}`;
    document.getElementById('modal-review-subject-id').value = subjectId;
    resetReviewMaterialForm();
    renderReviewMaterialsList(subjectId);
    document.getElementById('review-material-modal').classList.add('active');
}

function renderReviewMaterialsList(subjectId) {
    const container = document.getElementById('review-materials-list');
    const materials = activeReviewMaterials.filter(material => material.subject_id === subjectId);

    if (materials.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:12px;">لا توجد مراجعات لهذه المادة حتى الآن.</p>';
        return;
    }

    const typeLabels = {
        summary: 'ملخص',
        mindmap: 'خريطة ذهنية',
        notes: 'ملاحظات',
        file: 'ملف',
        link: 'رابط',
        video: 'فيديو'
    };

    container.innerHTML = materials.map(material => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid var(--glass-border);border-radius:10px;background:rgba(255,255,255,.03);">
            <div>
                <strong>${material.title}</strong>
                <small style="display:block;color:var(--text-secondary);margin-top:4px;">${typeLabels[material.material_type] || material.material_type}${material.url ? ' — رابط' : ' — محتوى نصي'}</small>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="button" class="btn-circle edit" onclick="editReviewMaterial(${material.id})" title="تعديل"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn-circle delete" onclick="deleteReviewMaterial(${material.id})" title="حذف"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function resetReviewMaterialForm() {
    const subjectId = document.getElementById('modal-review-subject-id').value;
    document.getElementById('review-material-form').reset();
    document.getElementById('modal-review-id').value = '';
    document.getElementById('modal-review-subject-id').value = subjectId;
    document.getElementById('modal-review-sort').value = '0';
}

function editReviewMaterial(materialId) {
    const material = activeReviewMaterials.find(item => item.id === materialId);
    if (!material) return;

    document.getElementById('modal-review-id').value = material.id;
    document.getElementById('modal-review-subject-id').value = material.subject_id;
    document.getElementById('modal-review-title').value = material.title;
    document.getElementById('modal-review-type').value = material.material_type;
    document.getElementById('modal-review-description').value = material.description || '';
    document.getElementById('modal-review-url').value = material.url || '';
    document.getElementById('modal-review-content').value = material.content || '';
    document.getElementById('modal-review-sort').value = material.sort_order || 0;
}

async function saveReviewMaterial(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const id = document.getElementById('modal-review-id').value;
    const subjectId = parseInt(document.getElementById('modal-review-subject-id').value);
    const url = document.getElementById('modal-review-url').value.trim();
    const content = document.getElementById('modal-review-content').value.trim();

    if (!url && !content) {
        showToast('أضف رابطًا أو محتوى نصيًا للمراجعة.', 'warning');
        return;
    }

    const payload = {
        subject_id: subjectId,
        title: document.getElementById('modal-review-title').value.trim(),
        material_type: document.getElementById('modal-review-type').value,
        description: document.getElementById('modal-review-description').value.trim() || null,
        url: url || null,
        content: content || null,
        sort_order: parseInt(document.getElementById('modal-review-sort').value) || 0,
        is_active: true,
        updated_at: new Date().toISOString()
    };

    try {
        const query = id
            ? client.from('review_materials').update(payload).eq('id', id)
            : client.from('review_materials').insert(payload);
        const { error } = await query;
        if (error) throw error;

        showToast(id ? 'تم تحديث المراجعة.' : 'تمت إضافة المراجعة.', 'success');
        await loadGlobalSubjects();
        document.getElementById('modal-review-subject-id').value = subjectId;
        resetReviewMaterialForm();
        renderReviewMaterialsList(subjectId);
    } catch (error) {
        showToast('تعذر حفظ المراجعة: ' + error.message, 'error');
    }
}

function deleteReviewMaterial(materialId) {
    const material = activeReviewMaterials.find(item => item.id === materialId);
    if (!material) return;

    showConfirmDialog({
        title: 'حذف مادة المراجعة',
        message: `هل تريد حذف <strong>"${material.title}"</strong>؟`,
        icon: 'fa-trash-alt',
        iconType: 'danger',
        confirmText: 'حذف',
        confirmStyle: 'danger',
        onConfirm: async () => {
            const client = getSupabaseClient();
            const { error } = await client.from('review_materials').delete().eq('id', materialId);
            if (error) {
                showToast('تعذر حذف المراجعة: ' + error.message, 'error');
                return;
            }
            await loadGlobalSubjects();
            renderReviewMaterialsList(material.subject_id);
            showToast('تم حذف المراجعة.', 'success');
        }
    });
}

// ============================================
// EXAMS CRUD LOGIC
// ============================================
function openAddExamModal(subjectId = null) {
    document.getElementById('exam-modal-title').textContent = 'إضافة امتحان جديد';
    document.getElementById('modal-exam-id').value = '';
    document.getElementById('exam-form').reset();
    if (subjectId && typeof subjectId === 'number') {
        document.getElementById('modal-exam-subject').value = subjectId;
    }
    document.getElementById('exam-modal').classList.add('active');
}

async function openEditExamModal(examId) {
    const exam = activeExams.find(e => e.id === examId);
    if (!exam) return;

    document.getElementById('exam-modal-title').textContent = 'تعديل الامتحان';
    document.getElementById('modal-exam-id').value = exam.id;
    document.getElementById('modal-exam-title').value = exam.title;
    document.getElementById('modal-exam-slug').value = exam.slug;
    document.getElementById('modal-exam-subject').value = exam.subject_id || '';
    document.getElementById('modal-exam-time').value = Math.round((exam.time_limit_seconds || 7200) / 60);

    document.getElementById('exam-modal').classList.add('active');
}

async function saveExam(event) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const id = document.getElementById('modal-exam-id').value;
    const title = document.getElementById('modal-exam-title').value.trim();
    const slug = document.getElementById('modal-exam-slug').value.trim();
    const subject_id = parseInt(document.getElementById('modal-exam-subject').value);
    const minutes = parseInt(document.getElementById('modal-exam-time').value);
    const time_limit_seconds = minutes * 60;

    const payload = {
        title,
        slug,
        subject_id,
        time_limit_seconds
    };

    try {
        if (id) {
            const { error } = await client
                .from('exams')
                .update(payload)
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await client
                .from('exams')
                .insert(payload);
            if (error) throw error;
        }

        closeModal('exam-modal');
        globalDataLoaded = false;
        await loadGlobalSubjects();
        await loadSubjectsManagerData();
    } catch (e) {
        showToast("خطأ أثناء حفظ الامتحان: " + e.message, "error");
    }
}

async function deleteExam(examId) {
    const exam = activeExams.find(e => e.id === examId);
    if (!exam) return;

    const client = getSupabaseClient();
    if (!client) return;

    try {
        const { count, error: countError } = await client
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', examId);
        
        if (countError) throw countError;

        const performExamDelete = async () => {
            try {
                if (count && count > 0) {
                    const { error: qError } = await client
                        .from('questions')
                        .delete()
                        .eq('exam_id', examId);
                    if (qError) throw qError;
                }

                const { error: eError } = await client
                    .from('exams')
                    .delete()
                    .eq('id', examId);
                if (eError) throw eError;

                showToast(`تم حذف الامتحان "${exam.title}" بنجاح.`, "success");
                globalDataLoaded = false;
                await loadGlobalSubjects();
                await loadSubjectsManagerData();
            } catch (err) {
                showToast("خطأ أثناء حذف الامتحان: " + err.message, "error");
            }
        };

        if (count && count > 0) {
            showConfirmDialog({
                title: "حذف الامتحان والأسئلة",
                message: `تحذير: هذا الامتحان يحتوي على <strong>${count} من الأسئلة</strong>. سيؤدي حذف الامتحان إلى حذف جميع الأسئلة المرتبطة به نهائياً! هل تريد الاستمرار وحذف الامتحان مع أسئلته؟`,
                icon: "fa-exclamation-triangle",
                iconType: "danger",
                confirmText: "حذف الامتحان والأسئلة",
                confirmStyle: "danger",
                onConfirm: performExamDelete
            });
        } else {
            showConfirmDialog({
                title: "حذف الامتحان",
                message: `هل أنت متأكد من حذف امتحان <strong>"${exam.title}"</strong> نهائياً؟`,
                icon: "fa-trash-alt",
                iconType: "danger",
                confirmText: "حذف",
                confirmStyle: "danger",
                onConfirm: performExamDelete
            });
        }
    } catch (e) {
        showToast("خطأ أثناء جلب تفاصيل الامتحان: " + e.message, "error");
    }
}

async function deleteAllExamQuestions() {
    if (!currentIntegratedExamId || !currentIntegratedSubjectId) {
        showToast("لم يتم تحديد امتحان صحيح للعملية.", "warning");
        return;
    }

    const subjectObj = activeSubjects.find(s => s.id === currentIntegratedSubjectId);
    const subjectName = subjectObj ? subjectObj.name : '';
    const examObj = activeExams.find(e => e.id === currentIntegratedExamId);
    const examName = examObj ? examObj.title : '';

    showConfirmDialog({
        title: "حذف جميع أسئلة الامتحان",
        message: `تحذير: سيتم حذف جميع الأسئلة الخاصة بالامتحان <strong>"${examName}"</strong> نهائياً! لتأكيد هذا الإجراء، يرجى كتابة اسم المادة الدراسية: <strong>"${subjectName}"</strong>`,
        icon: "fa-exclamation-triangle",
        iconType: "danger",
        confirmText: "حذف جميع الأسئلة",
        confirmStyle: "danger",
        requireInput: true,
        inputLabel: "اسم المادة للتأكيد:",
        inputPlaceholder: subjectName,
        expectedInput: subjectName,
        onConfirm: async () => {
            const client = getSupabaseClient();
            if (!client) return;

            try {
                const { error } = await client
                    .from('questions')
                    .delete()
                    .eq('exam_id', currentIntegratedExamId);
                
                if (error) throw error;

                showToast(`تم حذف جميع أسئلة الامتحان بنجاح.`, "success");
                globalDataLoaded = false;
                await loadGlobalSubjects();
                refreshQuestionsList();
            } catch (e) {
                showToast("خطأ أثناء حذف الأسئلة: " + e.message, "error");
            }
        }
    });
}

// ============================================
// BULK QUESTIONS IMPORT LOGIC
// ============================================
let parsedBulkQuestions = [];
let bulkImportErrors = [];
let bulkImportSource = { type: 'manual', name: null };

function openBulkImportModal() {
    document.getElementById('bulk-import-textarea').value = '';
    document.getElementById('bulk-import-file').value = '';
    document.getElementById('bulk-google-sheet-url').value = '';
    document.getElementById('bulk-import-preview-container').style.display = 'none';
    document.getElementById('btn-parse-bulk').style.display = 'inline-block';
    document.getElementById('btn-submit-bulk').style.display = 'none';
    document.getElementById('btn-submit-bulk').disabled = false;
    parsedBulkQuestions = [];
    bulkImportErrors = [];
    setBulkImportSource('manual', null);
    document.getElementById('bulk-import-modal').classList.add('active');
    loadQuestionImportHistory();
}

async function handleBulkImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'txt';
        let content;

        if (extension === 'xlsx' || extension === 'xls') {
            if (!window.XLSX) {
                throw new Error('مكتبة قراءة Excel لم تكتمل. حدّث الصفحة ثم حاول مرة أخرى.');
            }
            const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) throw new Error('ملف Excel لا يحتوي على أوراق.');
            const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
                defval: '',
                raw: false
            }).map((row, index) => ({ ...row, __source_row: index + 2 }));
            if (rows.length === 0) throw new Error('ورقة Excel لا تحتوي على صفوف أسئلة.');
            content = JSON.stringify(rows, null, 2);
            setBulkImportSource('xlsx', file.name);
        } else {
            content = await file.text();
            const sourceType = ['csv', 'json', 'txt'].includes(extension) ? extension : 'txt';
            setBulkImportSource(sourceType, file.name);
        }

        document.getElementById('bulk-import-textarea').value = content;
        parseBulkQuestions();
    } catch (error) {
        showToast('تعذر قراءة الملف: ' + error.message, 'error');
    }
}

function setBulkImportSource(type, name) {
    bulkImportSource = { type, name: name || null };
    const sourceElement = document.getElementById('bulk-import-source');
    if (!sourceElement) return;
    const labels = {
        manual: 'إدخال يدوي',
        txt: 'ملف TXT',
        csv: 'ملف CSV',
        json: 'ملف JSON',
        xlsx: 'ملف Excel',
        google_sheets: 'Google Sheets'
    };
    sourceElement.textContent = `المصدر: ${labels[type] || 'إدخال يدوي'}${name ? ` — ${name}` : ''}`;
}

function parseGoogleSheetUrl(value) {
    const input = String(value || '').trim();
    const idMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) throw new Error('رابط Google Sheets غير صالح.');
    const gidMatch = input.match(/[?#&]gid=(\d+)/);
    return { spreadsheetId: idMatch[1], gid: gidMatch?.[1] || '0' };
}

async function loadGoogleSheetForImport() {
    const input = document.getElementById('bulk-google-sheet-url');
    const button = document.getElementById('btn-load-google-sheet');
    const originalText = button.innerHTML;

    try {
        const { spreadsheetId, gid } = parseGoogleSheetUrl(input.value);
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل';

        const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`;
        const response = await fetch(exportUrl, { method: 'GET', credentials: 'omit' });
        if (!response.ok) throw new Error(`تعذر الوصول إلى الجدول (${response.status}).`);

        const csv = await response.text();
        if (!csv.trim() || /^\s*</.test(csv)) {
            throw new Error('لم يرجع Google جدول CSV قابلًا للقراءة.');
        }

        document.getElementById('bulk-import-textarea').value = csv;
        setBulkImportSource('google_sheets', `Sheet ${spreadsheetId.slice(0, 10)}… / gid ${gid}`);
        parseBulkQuestions();
    } catch (error) {
        showToast(`تعذر تحميل Google Sheets: ${error.message} تأكد أن المشاركة متاحة لأي شخص لديه الرابط.`, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function downloadBulkImportTemplate() {
    const csv = [
        ['type', 'text', 'options', 'correct_answer', 'explanation', 'sort_order'],
        ['tf', 'مثال لسؤال صح أو خطأ', '', 'true', 'تعليل الإجابة', '1'],
        ['mcq', 'مثال لسؤال اختيار من متعدد', 'الخيار الأول|الخيار الثاني|الخيار الثالث|الخيار الرابع', 'ب', 'تعليل الإجابة', '2'],
        ['essay', 'مثال لسؤال مقالي', '', 'essay', 'الإجابة النموذجية', '3']
    ];
    const content = '\uFEFF' + csv.map(row => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bsmagazone-questions-template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

function csvEscape(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function parseBulkQuestions() {
    const text = document.getElementById('bulk-import-textarea').value.trim();
    if (!text) {
        showToast("يرجى لصق نص الأسئلة أولاً.", "warning");
        return;
    }

    try {
        const rawQuestions = parseBulkInput(text);
        const validated = validateBulkQuestions(rawQuestions);
        parsedBulkQuestions = validated.valid;
        bulkImportErrors = validated.errors;
    } catch (error) {
        parsedBulkQuestions = [];
        bulkImportErrors = [error.message];
    }

    const tfCount = parsedBulkQuestions.filter(q => q.type === 'tf').length;
    const mcqCount = parsedBulkQuestions.filter(q => q.type === 'mcq').length;
    const essayCount = parsedBulkQuestions.filter(q => q.type === 'essay').length;

    document.getElementById('bulk-import-count').textContent = parsedBulkQuestions.length;
    document.getElementById('bulk-tf-count').textContent = tfCount;
    document.getElementById('bulk-mcq-count').textContent = mcqCount;
    document.getElementById('bulk-essay-count').textContent = essayCount;

    const summary = document.getElementById('bulk-import-summary');
    summary.querySelectorAll('.bulk-error-count').forEach(element => element.remove());
    if (bulkImportErrors.length > 0) {
        summary.insertAdjacentHTML('beforeend', `<span class="bulk-error-count" style="color:#f87171;">مرفوضة: <strong>${bulkImportErrors.length}</strong></span>`);
    }

    const previewList = document.getElementById('bulk-import-preview-list');
    const questionCards = parsedBulkQuestions.map(q => {
        const typeLabel = q.type === 'tf' ? 'صح/خطأ' : (q.type === 'mcq' ? 'اختيار من متعدد' : 'مقالي');
        const color = q.type === 'tf' ? '#60a5fa' : (q.type === 'mcq' ? '#34d399' : '#fbbf24');
        let ansDesc = '';

        if (q.type === 'tf') {
            ansDesc = `الإجابة: ${q.correct_answer === 'true' ? 'صح' : 'خطأ'}`;
        } else if (q.type === 'mcq') {
            ansDesc = `الخيارات: [${q.options.join(' | ')}] — الإجابة الصحيحة: الخيار ${Number(q.correct_answer) + 1}`;
        } else {
            ansDesc = `الإجابة النموذجية: ${q.explanation ? q.explanation.substring(0, 100) : 'لا يوجد'}`;
        }

        return `
            <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong>صف ${escapeAdminHtml(q.source_row)} — سؤال ${escapeAdminHtml(q.sort_order)}: ${escapeAdminHtml(q.text.substring(0, 100))}</strong>
                    <span style="color: ${color}; font-weight: bold; font-size: 0.8rem;">[${typeLabel}]</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.8rem;">
                    ${escapeAdminHtml(ansDesc)}
                </div>
                ${q.type !== 'essay' && q.explanation ? `<div style="color: var(--warning-color); font-size: 0.75rem; margin-top: 2px;">التعليل: ${escapeAdminHtml(q.explanation)}</div>` : ''}
            </div>
        `;
    }).join('');

    let errorsCard = '';
    if (bulkImportErrors.length > 0) {
        errorsCard = `
            <div style="border:1px solid rgba(248,113,113,.35);background:rgba(248,113,113,.08);padding:10px;border-radius:8px;color:#fecaca;">
                <strong>صفوف تحتاج تصحيحًا قبل الاستيراد:</strong>
                <ul style="margin:8px 18px 0;line-height:1.8;">${bulkImportErrors.slice(0, 30).map(error => `<li>${escapeAdminHtml(error)}</li>`).join('')}</ul>
            </div>
        `;
    }

    previewList.innerHTML = questionCards || errorsCard
        ? questionCards + errorsCard
        : '<p class="bulk-history-empty">لم يتم العثور على أسئلة قابلة للتحليل.</p>';

    document.getElementById('bulk-import-preview-container').style.display = 'block';
    document.getElementById('btn-parse-bulk').style.display = 'none';
    const submitButton = document.getElementById('btn-submit-bulk');
    submitButton.style.display = 'inline-block';
    submitButton.disabled = parsedBulkQuestions.length === 0 || bulkImportErrors.length > 0;
    submitButton.textContent = bulkImportErrors.length > 0
        ? `صحّح ${bulkImportErrors.length} صف قبل الحفظ`
        : `تأكيد وإضافة ${parsedBulkQuestions.length} سؤال`;

    if (parsedBulkQuestions.length === 0) {
        showToast(bulkImportErrors[0] || "فشل تحليل النص. راجع التنسيق وحاول مرة أخرى.", "error");
    } else if (bulkImportErrors.length > 0) {
        showToast('لن يُحفظ أي سؤال قبل تصحيح كل الصفوف المرفوضة.', 'warning');
    }
}

function escapeAdminHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[character]));
}

function parseBulkInput(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const decoded = JSON.parse(trimmed);
        const rows = Array.isArray(decoded) ? decoded : decoded.questions;
        if (!Array.isArray(rows)) throw new Error('ملف JSON يجب أن يحتوي على مصفوفة أسئلة.');
        return normalizeImportedQuestions(rows);
    }

    const firstLine = trimmed.split(/\r?\n/, 1)[0].toLowerCase();
    const looksLikeCsv = firstLine.includes(',') && /(type|question_type|text|question|نوع|السؤال|نص السؤال)/i.test(firstLine);
    if (looksLikeCsv) {
        return normalizeImportedQuestions(parseQuestionsCsv(trimmed));
    }

    return normalizeImportedQuestions(parseQuestionsText(trimmed));
}

function parseQuestionsCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        const next = text[index + 1];

        if (char === '"' && quoted && next === '"') {
            field += '"';
            index++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            row.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') index++;
            row.push(field);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    row.push(field);
    if (row.some(value => value.trim())) rows.push(row);
    if (quoted) throw new Error('ملف CSV يحتوي على علامة اقتباس غير مغلقة.');
    if (rows.length < 2) return [];

    const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').trim().toLowerCase());
    return rows.slice(1).map((values, rowIndex) => ({
        ...Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
        __source_row: rowIndex + 2
    }));
}

function normalizeImportedQuestions(rows) {
    return rows.map((row, index) => {
        const normalizedRow = Object.fromEntries(
            Object.entries(row || {}).map(([key, value]) => [normalizeImportHeader(key), value])
        );
        const pick = (...aliases) => {
            for (const alias of aliases) {
                const key = normalizeImportHeader(alias);
                if (normalizedRow[key] !== undefined && normalizedRow[key] !== null && normalizedRow[key] !== '') {
                    return normalizedRow[key];
                }
            }
            return '';
        };

        let type = String(pick('type', 'question_type', 'question type', 'النوع', 'نوع', 'نوع السؤال')).trim().toLowerCase();
        if (['صح', 'خطأ', 'صح/خطأ', 'صواب وخطأ', 'true_false', 'true-false', 'true/false'].includes(type)) type = 'tf';
        if (['اختيار', 'اختيار من متعدد', 'multiple_choice', 'multiple choice'].includes(type)) type = 'mcq';
        if (['مقالي', 'essay_question', 'essay question'].includes(type)) type = 'essay';

        let options = pick('options', 'choices', 'الاختيارات', 'الخيارات');
        if (!options) {
            options = [];
            for (let optionNumber = 1; optionNumber <= 10; optionNumber++) {
                const option = pick(
                    `option${optionNumber}`,
                    `option_${optionNumber}`,
                    `choice${optionNumber}`,
                    `choice_${optionNumber}`,
                    `اختيار ${optionNumber}`,
                    `اختيار${optionNumber}`,
                    `الخيار ${optionNumber}`,
                    `الخيار${optionNumber}`
                );
                if (option !== '') options.push(option);
            }
        }
        if (typeof options === 'string') {
            const optionText = options.trim();
            if (optionText.startsWith('[')) {
                try { options = JSON.parse(optionText); } catch { options = optionText.split('|'); }
            } else {
                options = optionText ? optionText.split('|') : [];
            }
        }
        options = Array.isArray(options) ? options.map(option => String(option).trim()).filter(Boolean) : [];

        let correctAnswer = String(pick(
            'correct_answer',
            'correct answer',
            'answer',
            'الإجابة الصحيحة',
            'الاجابة الصحيحة',
            'الإجابة',
            'الاجابة'
        )).trim();
        if (type === 'tf') {
            correctAnswer = /^(true|صح|صواب|1)$/i.test(correctAnswer) ? 'true' :
                (/^(false|خطأ|خطا|0)$/i.test(correctAnswer) ? 'false' : correctAnswer);
        } else if (type === 'mcq') {
            const letterIndex = { 'أ': 0, 'ا': 0, 'a': 0, 'ب': 1, 'b': 1, 'ج': 2, 'c': 2, 'د': 3, 'd': 3 }[correctAnswer.toLowerCase()];
            if (letterIndex !== undefined) correctAnswer = String(letterIndex);
            if (!/^\d+$/.test(correctAnswer)) {
                const matchingOption = options.findIndex(option => option === correctAnswer);
                if (matchingOption >= 0) correctAnswer = String(matchingOption);
            }
        } else if (type === 'essay') {
            correctAnswer = 'essay';
        }

        const rawSortOrder = Number.parseInt(
            pick('sort_order', 'sort order', 'order', 'الترتيب', 'ترتيب', 'رقم السؤال'),
            10
        );

        return {
            type,
            text: String(pick('text', 'question', 'question_text', 'question text', 'السؤال', 'نص السؤال')).trim(),
            options,
            correct_answer: correctAnswer,
            explanation: String(pick(
                'explanation',
                'model_answer',
                'model answer',
                'التعليل',
                'الإجابة النموذجية',
                'الاجابة النموذجية'
            )).trim(),
            sort_order: Number.isInteger(rawSortOrder) ? rawSortOrder : index + 1,
            source_row: Number.parseInt(row?.__source_row, 10) || index + 1
        };
    });
}

function normalizeImportHeader(value) {
    return String(value ?? '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

function validateBulkQuestions(questions) {
    const valid = [];
    const errors = [];
    const seenQuestions = new Map();

    if (questions.length > 1000) {
        errors.push(`الملف يحتوي على ${questions.length} سؤالًا؛ الحد الأقصى للعملية الواحدة 1000 سؤال.`);
    }

    questions.forEach((question, index) => {
        const sourceRow = question.source_row || index + 1;
        const fingerprint = question.text.toLocaleLowerCase('ar').trim().replace(/\s+/g, ' ');
        let error = '';

        if (!['tf', 'mcq', 'essay'].includes(question.type)) {
            error = `الصف ${sourceRow}: نوع السؤال غير معروف.`;
        } else if (!question.text) {
            error = `الصف ${sourceRow}: نص السؤال فارغ.`;
        } else if (question.text.length > 20000) {
            error = `الصف ${sourceRow}: نص السؤال أطول من الحد المسموح.`;
        } else if (seenQuestions.has(fingerprint)) {
            error = `الصف ${sourceRow}: السؤال مكرر مع الصف ${seenQuestions.get(fingerprint)}.`;
        } else if (question.type === 'tf' && !['true', 'false'].includes(question.correct_answer)) {
            error = `الصف ${sourceRow}: إجابة الصح والخطأ يجب أن تكون صح أو خطأ.`;
        } else if (question.type === 'mcq' && question.options.length < 2) {
            error = `الصف ${sourceRow}: سؤال الاختيار يحتاج خيارين على الأقل.`;
        } else if (question.type === 'mcq' && question.options.length > 10) {
            error = `الصف ${sourceRow}: الحد الأقصى 10 اختيارات.`;
        } else if (question.type === 'mcq' && question.options.some(option => option.length > 1000)) {
            error = `الصف ${sourceRow}: أحد الاختيارات أطول من الحد المسموح.`;
        } else if (question.type === 'mcq' && (!/^\d+$/.test(question.correct_answer) || Number(question.correct_answer) >= question.options.length)) {
            error = `الصف ${sourceRow}: الإجابة الصحيحة لا تطابق أحد الخيارات.`;
        } else if (question.type === 'essay' && !question.explanation) {
            error = `الصف ${sourceRow}: أضف الإجابة النموذجية للسؤال المقالي.`;
        } else if (question.correct_answer.length > 10000) {
            error = `الصف ${sourceRow}: الإجابة أطول من الحد المسموح.`;
        } else if (question.explanation.length > 30000) {
            error = `الصف ${sourceRow}: التعليل أطول من الحد المسموح.`;
        }

        if (error) errors.push(error);
        else {
            seenQuestions.set(fingerprint, sourceRow);
            valid.push(question);
        }
    });

    return { valid: valid.slice(0, 1000), errors };
}

function parseQuestionsText(text) {
    const lines = text.split('\n').map(l => l.trim());
    const parsedQuestions = [];
    let currentQuestion = null;
    let mode = null; // 'tf', 'mcq', 'essay'

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Detect section headers
        if (line.includes('أسئلة الصواب والخطأ') || line.includes('صح وخطأ')) {
            mode = 'tf';
            continue;
        } else if (line.includes('أسئلة الاختيار من متعدد') || line.includes('الاختيار من متعدد')) {
            mode = 'mcq';
            continue;
        } else if (line.includes('السؤال المقالي') || line.includes('القسم الثالث')) {
            mode = 'essay';
            continue;
        }

        // Check if line starts with a number followed by dot or parenthesis
        const numMatch = line.match(/^(\d+)\s*[\.\)]\s*(.*)/);
        if (numMatch) {
            if (currentQuestion) {
                currentQuestion.text = currentQuestion.text.trim();
                if (currentQuestion.explanation === null) {
                    currentQuestion.explanation = '';
                } else {
                    currentQuestion.explanation = currentQuestion.explanation.trim();
                }
                parsedQuestions.push(currentQuestion);
            }

            const qNum = parseInt(numMatch[1]);
            let qText = numMatch[2].trim();

            let isEssay = false;
            if (qText.startsWith('السؤال:') || qText.startsWith('السؤال')) {
                isEssay = true;
                qText = qText.replace(/^السؤال:?\s*/, '').trim();
            }

            let qType = mode;
            if (!qType) {
                if (isEssay) qType = 'essay';
                else qType = 'tf';
            }

            currentQuestion = {
                text: qText,
                type: qType,
                options: [],
                correct_answer: '',
                explanation: null,
                sort_order: qNum
            };
            continue;
        }

        if (!currentQuestion) continue;

        // Options for MCQ
        const optMatch = line.match(/^([أبجد])\s*[\-\)\.]\s*(.*)/);
        if (optMatch && currentQuestion.type === 'mcq') {
            const optText = optMatch[2].trim();
            currentQuestion.options.push(optText);
            continue;
        }

        // Correct answer
        if (line.startsWith('الإجابة:') || line.startsWith('الإجابة الصحيحة:')) {
            let ansVal = line.replace(/^(الإجابة الصحيحة|الإجابة):?\s*/, '').trim();
            if (currentQuestion.type === 'tf') {
                if (ansVal.includes('صح') || ansVal.includes('صواب') || ansVal.includes('true') || ansVal === 'صح') {
                    currentQuestion.correct_answer = 'true';
                } else {
                    currentQuestion.correct_answer = 'false';
                }
            } else if (currentQuestion.type === 'mcq') {
                const letterMatch = ansVal.match(/[\(\s-]?([أبجد])[\)\s-]?/);
                if (letterMatch) {
                    const letter = letterMatch[1];
                    const letterIndex = { 'أ': 0, 'ب': 1, 'ج': 2, 'د': 3 }[letter];
                    currentQuestion.correct_answer = letterIndex.toString();
                } else {
                    const optIdx = currentQuestion.options.findIndex(opt => ansVal.includes(opt));
                    if (optIdx !== -1) {
                        currentQuestion.correct_answer = optIdx.toString();
                    } else {
                        currentQuestion.correct_answer = optIdx === -1 ? '0' : optIdx.toString();
                    }
                }
            }
            continue;
        }

        // Explanation / Model answer
        if (line.startsWith('التعليل:') || line.startsWith('الإجابة النموذجية والتعليل:')) {
            let expVal = line.replace(/^(التعليل|الإجابة النموذجية والتعليل):?\s*/, '').trim();
            currentQuestion.explanation = expVal;
            continue;
        }

        // Accumulate remaining text
        if (currentQuestion.type === 'essay') {
            if (currentQuestion.explanation !== null) {
                currentQuestion.explanation += '\n' + line;
            } else {
                currentQuestion.text += '\n' + line;
            }
        } else {
            if (currentQuestion.explanation !== null) {
                currentQuestion.explanation += ' ' + line;
            } else {
                if (currentQuestion.options.length === 0 && !currentQuestion.correct_answer) {
                    currentQuestion.text += '\n' + line;
                }
            }
        }
    }

    if (currentQuestion) {
        currentQuestion.text = currentQuestion.text.trim();
        if (currentQuestion.explanation === null) {
            currentQuestion.explanation = '';
        } else {
            currentQuestion.explanation = currentQuestion.explanation.trim();
        }
        parsedQuestions.push(currentQuestion);
    }

    return parsedQuestions;
}

async function submitBulkQuestions() {
    const client = getSupabaseClient();
    const examId = currentIntegratedExamId || document.getElementById('filter-question-exam').value;
    const submitButton = document.getElementById('btn-submit-bulk');

    if (!client || !examId) {
        showToast("يرجى اختيار مادة وامتحان أولاً!", "warning");
        return;
    }

    if (parsedBulkQuestions.length === 0 || bulkImportErrors.length > 0) {
        showToast("صحّح كل الصفوف المرفوضة قبل الحفظ.", "warning");
        return;
    }

    try {
        const payload = parsedBulkQuestions.map(q => ({
            type: q.type,
            text: q.text,
            options: q.type === 'mcq' ? q.options : null,
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
            sort_order: q.sort_order
        }));

        submitButton.disabled = true;
        submitButton.textContent = `جاري حفظ ${payload.length} سؤال كعملية واحدة...`;
        const { data, error } = await client.rpc('import_questions_atomic', {
            p_exam_id: Number(examId),
            p_questions: payload,
            p_source_type: bulkImportSource.type,
            p_source_name: bulkImportSource.name
        });
        if (error) throw error;

        const result = Array.isArray(data) ? data[0] : data;
        const inserted = Number(result?.inserted_count || 0);
        const skipped = Number(result?.skipped_duplicates || 0);
        const message = skipped > 0
            ? `تمت إضافة ${inserted} سؤال وتخطي ${skipped} سؤال مكرر.`
            : `تم استيراد ${inserted} سؤال بنجاح كعملية واحدة.`;
        showToast(message, inserted > 0 ? "success" : "warning");
        closeModal('bulk-import-modal');
        globalDataLoaded = false; // Force refresh question counts
        refreshQuestionsList();
    } catch (e) {
        showToast("لم يُحفظ أي سؤال: " + e.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'تأكيد وإضافة الأسئلة';
    }
}

async function loadQuestionImportHistory() {
    const container = document.getElementById('bulk-import-history-list');
    if (!container) return;

    const client = getSupabaseClient();
    const examId = currentIntegratedExamId || document.getElementById('filter-question-exam')?.value;
    if (!client || !examId) {
        container.innerHTML = '<p class="bulk-history-empty">اختر امتحانًا لعرض سجل الاستيراد.</p>';
        return;
    }

    container.innerHTML = '<p class="bulk-history-empty"><i class="fas fa-spinner fa-spin"></i> جاري تحميل السجل...</p>';
    try {
        const { data, error } = await client
            .from('question_imports')
            .select('id,source_type,source_name,submitted_count,inserted_count,skipped_duplicates,created_at,rolled_back_at')
            .eq('exam_id', Number(examId))
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) throw error;

        if (!data?.length) {
            container.innerHTML = '<p class="bulk-history-empty">لا توجد عمليات استيراد مسجلة لهذا الامتحان بعد.</p>';
            return;
        }

        container.innerHTML = data.map(importRow => renderQuestionImportHistoryItem(importRow)).join('');
    } catch (error) {
        container.innerHTML = `<p class="bulk-history-empty">تعذر تحميل السجل: ${escapeAdminHtml(error.message)}</p>`;
    }
}

function renderQuestionImportHistoryItem(importRow) {
    const sourceLabels = {
        manual: 'إدخال يدوي',
        txt: 'TXT',
        csv: 'CSV',
        json: 'JSON',
        xlsx: 'Excel',
        google_sheets: 'Google Sheets'
    };
    const source = sourceLabels[importRow.source_type] || importRow.source_type;
    const date = new Date(importRow.created_at).toLocaleString('ar-EG');
    const rolledBack = Boolean(importRow.rolled_back_at);
    const canRollback = !rolledBack && Number(importRow.inserted_count) > 0;
    const sourceName = importRow.source_name ? ` — ${escapeAdminHtml(importRow.source_name)}` : '';
    const status = rolledBack
        ? '<span class="bulk-history-status">تم التراجع</span>'
        : `أضيف ${Number(importRow.inserted_count)} · مكرر ${Number(importRow.skipped_duplicates)}`;

    return `
        <article class="bulk-history-item${rolledBack ? ' is-rolled-back' : ''}">
            <div>
                <div class="bulk-history-title">${escapeAdminHtml(source)}${sourceName}</div>
                <div class="bulk-history-meta">${escapeAdminHtml(date)} · ${status} · الإجمالي ${Number(importRow.submitted_count)}</div>
            </div>
            ${canRollback ? `
                <button type="button" class="bulk-history-rollback" onclick="requestQuestionImportRollback(${Number(importRow.id)}, ${Number(importRow.inserted_count)})">
                    <i class="fas fa-rotate-left"></i> تراجع
                </button>
            ` : ''}
        </article>
    `;
}

function requestQuestionImportRollback(importId, insertedCount) {
    showConfirmDialog({
        title: 'التراجع عن عملية الاستيراد',
        message: `سيتم حذف الأسئلة التي أضافتها هذه العملية فقط وعددها حتى <strong>${Number(insertedCount)}</strong> سؤال.`,
        icon: 'fa-rotate-left',
        iconType: 'danger',
        confirmText: 'تراجع عن الاستيراد',
        confirmStyle: 'danger',
        onConfirm: () => rollbackQuestionImport(importId)
    });
}

async function rollbackQuestionImport(importId) {
    const client = getSupabaseClient();
    if (!client) return;

    const { data, error } = await client.rpc('rollback_question_import', {
        p_import_id: Number(importId)
    });
    if (error) {
        showToast('تعذر التراجع عن الاستيراد: ' + error.message, 'error');
        return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    showToast(`تم حذف ${Number(result?.deleted_count || 0)} سؤال من هذه العملية.`, 'success');
    globalDataLoaded = false;
    refreshQuestionsList();
    loadQuestionImportHistory();
}

function refreshQuestionsList() {
    if (currentIntegratedExamId) {
        loadIntegratedQuestionsList();
    } else {
        loadQuestionsList();
    }
}

function openAddQuestionModalIntegrated() {
    if (!currentIntegratedExamId) return;
    openAddQuestionModal();
}

function openBulkImportModalIntegrated() {
    if (!currentIntegratedExamId) return;
    openBulkImportModal();
}

function renderWarningBanner() {
    const container = document.getElementById('warning-banner-container');
    if (!container) return;

    if (sessionStorage.getItem('bsmagazone_hide_warning') === 'true') {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="warning-banner" id="warning-banner">
            <i class="fas fa-exclamation-triangle warning-banner-icon"></i>
            <div class="warning-banner-text">
                تنبيه: التغييرات التي تقوم بها هنا يتم حفظها تلقائياً وتنعكس فوراً على الطلاب. يرجى توخي الحذر عند تعديل أو حذف الأسئلة.
            </div>
            <div class="warning-banner-actions">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; color: var(--text-secondary); user-select: none;">
                    <input type="checkbox" id="hide-warning-checkbox" style="accent-color: #f59e0b;">
                    عدم الإظهار مرة أخرى
                </label>
                <button class="warning-banner-close" onclick="closeWarningBanner()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
}

function closeWarningBanner() {
    const checkbox = document.getElementById('hide-warning-checkbox');
    if (checkbox && checkbox.checked) {
        sessionStorage.setItem('bsmagazone_hide_warning', 'true');
    }
    const banner = document.getElementById('warning-banner');
    if (banner) {
        banner.remove();
    }
}

async function showExamQuestionsIntegrated(subjectId, examId) {
    currentIntegratedExamId = examId;
    currentIntegratedSubjectId = subjectId;

    // Save sub-view state in sessionStorage
    sessionStorage.setItem('bsmagazone_integrated_exam_id', examId);
    sessionStorage.setItem('bsmagazone_integrated_subject_id', subjectId);
    
    // Reset deletion confirm checkbox for the new view session
    sessionStorage.removeItem('bsmagazone_skip_delete_confirm');

    const mainView = document.getElementById('subjects-manager-main-view');
    const questionsView = document.getElementById('subjects-manager-questions-view');
    const titleEl = document.getElementById('integrated-questions-title');

    // Find exam details
    const subjectObj = activeSubjects.find(s => s.id === subjectId);
    const examObj = activeExams.find(e => e.id === examId);
    const subjectName = subjectObj ? subjectObj.name : '';
    const examName = examObj ? examObj.title : '';

    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-question-circle" style="margin-left: 8px;"></i>إدارة أسئلة: ${examName} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary); opacity: 0.8; margin-right: 10px;">(${subjectName})</span>`;
    }

    if (mainView && questionsView) {
        mainView.style.display = 'none';
        questionsView.style.display = 'block';
    }

    // Render warning banner
    renderWarningBanner();

    // Load questions for this exam
    await loadIntegratedQuestionsList();
}

function backToSubjectsMainView() {
    currentIntegratedExamId = null;
    currentIntegratedSubjectId = null;

    // Clear sub-view state in sessionStorage
    sessionStorage.removeItem('bsmagazone_integrated_exam_id');
    sessionStorage.removeItem('bsmagazone_integrated_subject_id');
    sessionStorage.removeItem('bsmagazone_skip_delete_confirm');

    const mainView = document.getElementById('subjects-manager-main-view');
    const questionsView = document.getElementById('subjects-manager-questions-view');

    if (mainView && questionsView) {
        questionsView.style.display = 'none';
        mainView.style.display = 'block';
    }

    // Refresh subjects manager
    loadSubjectsManagerData();
}

async function loadIntegratedQuestionsList() {
    const container = document.getElementById('integrated-questions-list');
    if (!container) return;
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center;">جاري تحميل الأسئلة...</div>';

    const client = getSupabaseClient();
    if (!client || !currentIntegratedExamId) return;

    try {
        const { data: dbQuestions, error } = await client
            .from('questions')
            .select('*')
            .eq('exam_id', currentIntegratedExamId)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        allQuestions = dbQuestions || []; // Store globally for client filtering

        renderIntegratedQuestions(allQuestions);
    } catch (e) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--error-color)">خطأ أثناء تحميل الأسئلة: ${e.message}</div>`;
    }
}

function renderIntegratedQuestions(questions) {
    const container = document.getElementById('integrated-questions-list');
    if (!container) return;
    container.innerHTML = '';

    if (questions.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary)">
                <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px; color: var(--glass-border)"></i>
                <p>لا توجد أسئلة مضافة لهذا الامتحان بعد</p>
            </div>
        `;
        return;
    }

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'manager-card';
        card.style.position = 'relative';

        let typeBadge = '';
        if (q.type === 'tf') typeBadge = '<span class="badge" style="background:rgba(96,165,250,0.15); color:#60a5fa;">صح/خطأ</span>';
        else if (q.type === 'mcq') typeBadge = '<span class="badge" style="background:rgba(52,211,153,0.15); color:#34d399;">اختيار من متعدد</span>';
        else if (q.type === 'essay') typeBadge = '<span class="badge" style="background:rgba(251,191,36,0.15); color:#fbbf24;">مقالي</span>';

        let optionsHtml = '';
        if (q.type === 'mcq' && q.options) {
            optionsHtml = '<div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary); display:flex; flex-direction:column; gap:4px;">';
            q.options.forEach((opt, idx) => {
                const isCorrect = idx.toString() === q.correct_answer;
                optionsHtml += `
                    <div style="${isCorrect ? 'color: #34d399; font-weight: bold;' : ''}">
                        ${isCorrect ? '✓' : '•'} ${opt}
                    </div>
                `;
            });
            optionsHtml += '</div>';
        } else if (q.type === 'tf') {
            optionsHtml = `
                <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                    الإجابة الصحيحة: <strong style="color: #34d399">${q.correct_answer === 'true' ? 'صح' : 'خطأ'}</strong>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; gap:10px;">
                <div style="flex:1;">
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:700; color:var(--primary-color);">#${q.sort_order || index + 1}</span>
                        ${typeBadge}
                    </div>
                    <div style="font-size:0.95rem; font-weight:600; line-height:1.5;">${q.text}</div>
                    ${optionsHtml}
                    ${q.explanation ? `<div style="color: var(--warning-color); font-size: 0.75rem; margin-top: 8px; border-top:1px solid rgba(255,255,255,0.03); padding-top:6px;">التعليل: ${q.explanation}</div>` : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button onclick="openEditQuestionModal(${q.id})" class="action-btn" style="padding:6px; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); color:var(--text-color); cursor:pointer; border-radius:6px; font-size:0.85rem;" title="تعديل السؤال">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteQuestion(${q.id})" class="action-btn" style="padding:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:var(--error-color); cursor:pointer; border-radius:6px; font-size:0.85rem;" title="حذف السؤال">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterIntegratedQuestions() {
    const query = document.getElementById('integrated-search-questions-input').value.toLowerCase().trim();
    if (!query) {
        renderIntegratedQuestions(allQuestions);
        return;
    }

    const filtered = allQuestions.filter(q => 
        q.text.toLowerCase().includes(query) || 
        (q.explanation && q.explanation.toLowerCase().includes(query)) ||
        (q.options && q.options.some(o => o.toLowerCase().includes(query)))
    );
    renderIntegratedQuestions(filtered);
}
