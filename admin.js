/* ==========================================================================
   WAHAT AL-SHEIKH - ADMINISTRATIVE DASHBOARD CONTROL LOGIC (wahaelsheikh edition)
   Handles Supabase Auth, Secure Session checking, and CRUD operations
   ========================================================================== */

// Helper to automatically sanitize and correct the Supabase URL
function sanitizeSupabaseUrl(url) {
    if (!url) return '';
    let cleaned = url.trim();
    
    // If they pasted a Supabase dashboard URL, e.g. https://supabase.com/dashboard/project/coxtrdjzbeijrjcxcllu
    if (cleaned.includes('supabase.com/dashboard/project/')) {
        const parts = cleaned.split('/project/');
        if (parts.length > 1) {
            const projectRef = parts[1].split('/')[0].split('?')[0];
            return `https://${projectRef}.supabase.co`;
        }
    }
    
    // If they pasted just the project reference code, e.g. coxtrdjzbeijrjcxcllu
    if (/^[a-z0-9]{20}$/.test(cleaned)) {
        return `https://${cleaned}.supabase.co`;
    }
    
    // Ensure it starts with https://
    if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = 'https://' + cleaned;
    }
    
    // Remove trailing slash if present
    if (cleaned.endsWith('/')) {
        cleaned = cleaned.slice(0, -1);
    }
    
    return cleaned;
}

// --- 0. Credentials & Connection Configuration ---
const DEMO_EMAIL = 'admin@wahat-al-sheikh.com';
const DEMO_PASSWORD = 'sheikhadmin2026';

const CONFIG = {
    url: sanitizeSupabaseUrl(localStorage.getItem('supabase_url') || ''),
    anonKey: (localStorage.getItem('supabase_anon_key') || '').trim()
};

let supabaseClient = null;
let isDbConnected = false;
let editorMode = 'create'; // 'create' or 'edit'

// --- 1. The Fallback Initial Datasets ---
const defaultCategories = [
    { id: 'bedouin', name: 'القسم البدوي', icon: 'fa-campground', desc: 'جميع الوجبات تقدم مع: (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش' },
    { id: 'grills', name: 'قسم المشويات', icon: 'fa-fire-burner', desc: 'جميع الوجبات تقدم مع: أرز + خضار + سلطة + عيش' },
    { id: 'platters', name: 'قسم الصواني', icon: 'fa-plate-wheat', desc: 'صواني واحة الشيخ الملوكية الفاخرة المناسبة للعزائم واللمة البدوية' },
    { id: 'tagines', name: 'قسم الطواجن', icon: 'fa-mortar-pestle', desc: 'طواجن فخار غنية مطبوخة على نار هادئة بطعم ونكهة ريفية وبدوية أصيلة' },
    { id: 'mahshi', name: 'قسم المحاشي', icon: 'fa-pepper-hot', desc: 'محاشي بلدي طازجة وممبار غني محضر يومياً بأجود أنواع الأرز والخلطات السرية' },
    { id: 'meals', name: 'قسم الوجبات', icon: 'fa-bowl-rice', desc: 'وجبات فردية متكاملة مغذية ومشبعة تلبي جميع الأذواق' },
    { id: 'mandi', name: 'قسم المندي', icon: 'fa-wheat-awn', desc: 'وجبات المندي الفاخرة المطهية ببطء تحت الحفر البدوية التقليدية' },
    { id: 'breakfast', name: 'قسم الفطور', icon: 'fa-egg', desc: 'أطباق فطور بدوي وشعبي تقليدي يبدأ به يومك بنشاط وطاقة' },
    { id: 'drinks', name: 'قسم المشروبات', icon: 'fa-mug-hot', desc: 'مشروبات غازية منعشة وشاي زردة مطبوخ على الفحم بالطريقة البدوية' }
];

const defaultMenuItems = [
    { id: 'bedouin-1', category_id: 'bedouin', name: 'ربع ضاني (أرز)', ingredients: 'ربع ضاني + أرز + خضار + شوربة + سلطة + عيش', price: 275, price_type: 'fixed' },
    { id: 'bedouin-2', category_id: 'bedouin', name: 'ربع ضاني (مكرونة)', ingredients: 'ربع ضاني + مكرونة + خضار + شوربة + سلطة + عيش', price: 275, price_type: 'fixed' },
    { id: 'bedouin-3', category_id: 'bedouin', name: 'ثلث ضاني', ingredients: 'ثلث ضاني + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 450, price_type: 'fixed' },
    { id: 'bedouin-3-5', category_id: 'bedouin', name: 'نصف ضاني', ingredients: 'نصف ضاني + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 550, price_type: 'fixed' },
    { id: 'bedouin-4', category_id: 'bedouin', name: 'كيلو ضاني', ingredients: 'كيلو ضاني بلدي فاخر + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 1100, price_type: 'fixed' },
    { id: 'bedouin-5', category_id: 'bedouin', name: 'ربع شمبري (أرز)', ingredients: 'ربع شمبري + أرز + خضار + شوربة + سلطة + عيش', price: 250, price_type: 'fixed' },
    { id: 'bedouin-13', category_id: 'bedouin', name: 'ربع فراخ', ingredients: 'ربع فراخ بلدي + أرز + خضار + شوربة + سلطة + عيش', price: 150, price_type: 'fixed' },
    { id: 'grills-1', category_id: 'grills', name: 'ربع ريش', ingredients: 'ربع كيلو ريش ضاني مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'grills-4', category_id: 'grills', name: 'ربع كفتة', ingredients: 'ربع كيلو كفتة مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'platters-1', category_id: 'platters', name: 'صينية الشيخ', ingredients: 'تشكيلة ملوكية فاخرة من اللحوم والمشويات والأرز الخاص بواحة الشيخ', price: 0, price_type: 'undetermined' },
    { id: 'platters-4', category_id: 'platters', name: 'صينية خروف مندي كامل', ingredients: 'خروف بلدي مندي كامل مطبوخ بالحفرة البدوية يفرش فوق أرز المندي الفاخر', price: 0, price_type: 'weight' },
    { id: 'tagines-1', category_id: 'tagines', name: 'طاجن كوارع', ingredients: 'كوارع بلدية مخلية ومطبوخة ببطء بداخل طاجن الفخار بالفرن بخلطة الثوم', price: 0, price_type: 'undetermined' }
];

// Active state
let categories = [...defaultCategories];
let menuItems = [...defaultMenuItems];
let selectedItemId = null;
let adminSearchQuery = '';

// --- 2. DOM Elements Caches ---
const elements = {
    // Auth screens
    loginScreenView: document.getElementById('login-screen-view'),
    dashboardMainView: document.getElementById('dashboard-main-view'),
    adminEmailInput: document.getElementById('admin-email'),
    adminPasswordInput: document.getElementById('admin-password'),
    loginSubmitBtn: document.getElementById('btn-login-submit'),
    adminLogoutBtn: document.getElementById('btn-admin-logout'),
    loggedAdminEmail: document.getElementById('logged-admin-email'),
    
    // Login Screen Config Panel (New)
    btnToggleLoginConfig: document.getElementById('btn-toggle-login-config'),
    loginConfigPanel: document.getElementById('login-config-panel'),
    loginCfgUrl: document.getElementById('login-cfg-url'),
    loginCfgKey: document.getElementById('login-cfg-key'),
    btnSaveLoginConfig: document.getElementById('btn-login-cfg-save'),
    btnResetLoginConfig: document.getElementById('btn-login-cfg-reset'),
    
    // Config Panel
    cfgSupabaseUrl: document.getElementById('cfg-supabase-url'),
    cfgSupabaseKey: document.getElementById('cfg-supabase-key'),
    btnSaveDbConfig: document.getElementById('btn-save-db-config'),
    btnResetDbConfig: document.getElementById('btn-reset-db-config'),
    supabaseStatusBadge: document.getElementById('supabase-status-badge'),
    
    // Admin Password Change (New)
    cfgNewPassword: document.getElementById('cfg-new-password'),
    cfgConfirmPassword: document.getElementById('cfg-confirm-password'),
    btnChangePassword: document.getElementById('btn-change-password'),
    
    // Management items list
    adminSearchInput: document.getElementById('admin-search-input'),
    adminItemsListContainer: document.getElementById('admin-items-list-container'),
    totalItemsBadge: document.getElementById('total-items-badge'),
    btnCreateNewItem: document.getElementById('btn-create-new-item'),
    
    // CRUD Form fields
    editorPanelBox: document.getElementById('editor-panel-box'),
    editorTitle: document.getElementById('editor-title'),
    editorModeBadge: document.getElementById('editor-mode-badge'),
    formDishEditor: document.getElementById('dish-editor-form'),
    formItemId: document.getElementById('editor-item-id'),
    formDishName: document.getElementById('form-dish-name'),
    formDishCategory: document.getElementById('form-dish-category'),
    formDishIngredients: document.getElementById('form-dish-ingredients'),
    formDishPriceType: document.getElementById('form-dish-price-type'),
    formDishPrice: document.getElementById('form-dish-price'),
    priceNumericInputGroup: document.getElementById('price-numeric-input-group'),
    formDishBadge: document.getElementById('form-dish-badge'),
    btnFormCancel: document.getElementById('btn-form-cancel'),
    btnFormSubmit: document.getElementById('btn-form-submit')
};

// --- 3. Page Load & Connection Hook ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Supabase Connection
    initSupabaseConnection();
    
    // 2. Perform Session Check
    await checkActiveAuthSession();
    
    // 3. Bind credentials input triggers
    setupAuthEventListeners();
});

function initSupabaseConnection() {
    elements.cfgSupabaseUrl.value = CONFIG.url;
    elements.cfgSupabaseKey.value = CONFIG.anonKey;

    if (elements.loginCfgUrl && elements.loginCfgKey) {
        elements.loginCfgUrl.value = CONFIG.url;
        elements.loginCfgKey.value = CONFIG.anonKey;
    }

    if (CONFIG.url && CONFIG.anonKey) {
        try {
            supabaseClient = supabase.createClient(CONFIG.url, CONFIG.anonKey);
            isDbConnected = true;
            
            elements.supabaseStatusBadge.className = 'config-status-badge connected';
            elements.supabaseStatusBadge.innerHTML = `<i class="fa-solid fa-cloud-check"></i> متصل بـ Supabase 🟢`;
            console.log("Supabase Admin Client configured!");
        } catch (e) {
            console.error("Supabase config error in Admin: ", e);
            elements.supabaseStatusBadge.className = 'config-status-badge';
            elements.supabaseStatusBadge.innerHTML = `<i class="fa-solid fa-cloud-exclamation text-red"></i> خطأ بالاتصال 🔴`;
        }
    } else {
        elements.supabaseStatusBadge.className = 'config-status-badge';
        elements.supabaseStatusBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation text-red"></i> وضع محلي (أوفلاين) 🟡`;
    }
}

// --- 4. Secure Authentication Mechanics (Supabase Auth) ---
async function checkActiveAuthSession() {
    if (isDbConnected && supabaseClient) {
        try {
            // Check active session via Supabase SDK
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;

            if (session && session.user) {
                // Admin is authenticated via Supabase Auth
                showDashboard(session.user.email);
                return;
            }
        } catch (e) {
            console.warn("Could not check active Supabase Auth session, falling back to local: ", e);
        }
    }

    // LocalStorage Fallback Check (for offline/demo mode session persistence)
    const localUser = sessionStorage.getItem('admin_logged_user');
    if (localUser) {
        showDashboard(localUser);
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    elements.loginScreenView.style.display = 'flex';
    elements.dashboardMainView.style.display = 'none';
}

function showDashboard(adminEmail) {
    elements.loginScreenView.style.display = 'none';
    elements.dashboardMainView.style.display = 'block';
    
    // Set admin email text
    elements.loggedAdminEmail.textContent = adminEmail;
    
    // Initialize Dashboard CRUD UI
    initFormCategoriesSelect();
    setupDashboardEventListeners();
    loadDashboardData();
}

function setupAuthEventListeners() {
    elements.loginSubmitBtn.addEventListener('click', attemptAdminLogin);
    
    // Enter key submit triggers
    const triggerSubmit = (e) => { if (e.key === 'Enter') attemptAdminLogin(); };
    elements.adminEmailInput.addEventListener('keypress', triggerSubmit);
    elements.adminPasswordInput.addEventListener('keypress', triggerSubmit);
    
    // Logout trigger
    elements.adminLogoutBtn.addEventListener('click', handleAdminLogout);

    // Login Screen Config Panel Triggers (New)
    if (elements.btnToggleLoginConfig && elements.loginConfigPanel) {
        elements.btnToggleLoginConfig.addEventListener('click', () => {
            const isHidden = elements.loginConfigPanel.style.display === 'none';
            elements.loginConfigPanel.style.display = isHidden ? 'block' : 'none';
        });
    }

    if (elements.btnSaveLoginConfig) {
        elements.btnSaveLoginConfig.addEventListener('click', () => {
            const urlVal = elements.loginCfgUrl.value.trim();
            const keyVal = elements.loginCfgKey.value.trim();

            if (!urlVal || !keyVal) {
                alert('يرجى ملء كلا الحقلين للربط مع قاعدة البيانات.');
                return;
            }

            const sanitizedUrl = sanitizeSupabaseUrl(urlVal);
            localStorage.setItem('supabase_url', sanitizedUrl);
            localStorage.setItem('supabase_anon_key', keyVal);
            alert('تم حفظ إعدادات الاتصال بنجاح! سيتم إعادة تحميل الصفحة للتحقق من الربط والتشغيل السحابي.');
            window.location.reload();
        });
    }

    if (elements.btnResetLoginConfig) {
        elements.btnResetLoginConfig.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من مسح إعدادات الربط والعودة للوضع المحلي؟')) {
                localStorage.removeItem('supabase_url');
                localStorage.removeItem('supabase_anon_key');
                alert('تم مسح الإعدادات. سيتم إعادة تحميل الصفحة للتحول للوضع المحلي.');
                window.location.reload();
            }
        });
    }
}

// Perform Email/Password authentication
async function attemptAdminLogin() {
    const email = elements.adminEmailInput.value.trim();
    const password = elements.adminPasswordInput.value.trim();

    if (!email || !password) {
        alert('يرجى كتابة البريد الإلكتروني وكلمة المرور لتسجيل الدخول.');
        return;
    }

    elements.loginSubmitBtn.disabled = true;
    elements.loginSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري تسجيل الدخول الآمن...`;

    try {
        if (isDbConnected && supabaseClient) {
            // Secure Sumpabase Auth Sign-In (Cloud verified!)
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data && data.user) {
                alert('تم تسجيل الدخول الآمن بنجاح عبر خوادم Supabase! 🟢');
                showDashboard(data.user.email);
                return;
            }
        } else {
            // Local Offline Demo Mode Credentials Check
            if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
                alert('تم تسجيل الدخول بنجاح بالوضع التجريبي المحلي (المنيو غير متصل بقاعدة بيانات)! 🟡');
                sessionStorage.setItem('admin_logged_user', DEMO_EMAIL);
                showDashboard(DEMO_EMAIL);
                return;
            } else {
                throw new Error('البريد الإلكتروني أو كلمة المرور للمدير غير صحيحة بالوضع المحلي (استخدم الحساب الافتراضي للتجربة).');
            }
        }
    } catch (err) {
        console.error("Login attempt failed: ", err);
        
        let errMsg = err.message || String(err);
        if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch')) {
            alert(`❌ فشل الاتصال بقاعدة بيانات Supabase! (Failed to fetch)\n\nقد يعود ذلك لأحد الأسباب التالية:\n1. رابط السيرفر (Supabase URL) الذي أدخلته غير صحيح أو ناقص (تأكد أنه يبدأ بـ https:// وينتهي بـ .supabase.co بدون شرطة مائلة أو مسارات إضافية).\n2. مفتاح Anon Key غير صحيح أو يحتوي على مسافات إضافية.\n3. وجود إضافة مانع إعلانات (AdBlocker) قوية في متصفحك تقوم بحجب خوادم Supabase.\n\n💡 للحل: اضغط على زر "إعدادات الربط مع قاعدة البيانات (Supabase)" بالأسفل لمراجعة وتعديل الرابط والمفتاح أو لمسحهما للعودة للوضع المحلي مؤقتاً لتتمكن من تسجيل الدخول بالحساب التجريبي.`);
        } else {
            alert(`فشل تسجيل الدخول! التفاصيل: ${errMsg}`);
        }
    } finally {
        elements.loginSubmitBtn.disabled = false;
        elements.loginSubmitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> تسجيل دخول آمن`;
    }
}

async function handleAdminLogout() {
    if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج الآمن؟')) {
        if (isDbConnected && supabaseClient) {
            try {
                await supabaseClient.auth.signOut();
            } catch (e) {
                console.warn("Supabase SignOut error, forcing local session clear: ", e);
            }
        }
        
        sessionStorage.removeItem('admin_logged_user');
        alert('تم تسجيل الخروج بنجاح.');
        window.location.reload();
    }
}

// --- 5. Configuration & Form Interactions ---
function setupDashboardEventListeners() {
    elements.btnSaveDbConfig.addEventListener('click', () => {
        const urlVal = elements.cfgSupabaseUrl.value.trim();
        const keyVal = elements.cfgSupabaseKey.value.trim();

        if (!urlVal || !keyVal) {
            alert('يرجى ملء كلا الحقلين للربط مع قاعدة البيانات.');
            return;
        }

        const sanitizedUrl = sanitizeSupabaseUrl(urlVal);
        localStorage.setItem('supabase_url', sanitizedUrl);
        localStorage.setItem('supabase_anon_key', keyVal);
        alert('تم حفظ إعدادات الاتصال بنجاح! سيتم إعادة تحميل الصفحة للتحول للنظام السحابي.');
        window.location.reload();
    });

    elements.btnResetDbConfig.addEventListener('click', () => {
        if (confirm('هل أنت متأكد من مسح إعدادات الربط والعودة للوضع المحلي؟')) {
            localStorage.removeItem('supabase_url');
            localStorage.removeItem('supabase_anon_key');
            alert('تم مسح الإعدادات. سيتم إعادة تحميل الصفحة للتحول للوضع المحلي.');
            window.location.reload();
        }
    });

    // Admin Password Change Trigger
    if (elements.btnChangePassword) {
        elements.btnChangePassword.addEventListener('click', handlePasswordChange);
    }

    elements.formDishPriceType.addEventListener('change', togglePriceInputVisibility);
    elements.btnFormCancel.addEventListener('click', resetEditorForm);
    elements.formDishEditor.addEventListener('submit', handleFormSubmit);
    elements.btnCreateNewItem.addEventListener('click', () => {
        resetEditorForm();
        elements.formDishName.focus();
    });

    elements.adminSearchInput.addEventListener('input', (e) => {
        adminSearchQuery = e.target.value;
        renderAdminItemsList();
    });
}

async function handlePasswordChange() {
    if (!isDbConnected || !supabaseClient) {
        alert('تغيير كلمة المرور متاح فقط عند تفعيل الربط السحابي المباشر مع Supabase! 🔴\n(بالوضع التجريبي المحلي، كلمة المرور ثابتة ومحفوظة).');
        return;
    }

    const newPass = elements.cfgNewPassword.value;
    const confirmPass = elements.cfgConfirmPassword.value;

    if (!newPass || !confirmPass) {
        alert('يرجى ملء كلا الحقلين لتغيير كلمة المرور.');
        return;
    }

    if (newPass.length < 6) {
        alert('يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل لسلامة حسابك.');
        return;
    }

    if (newPass !== confirmPass) {
        alert('كلمتا المرور غير متطابقتين! يرجى التأكد وإعادة المحاولة.');
        return;
    }

    elements.btnChangePassword.disabled = true;
    elements.btnChangePassword.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث كلمة المرور...`;

    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPass
        });

        if (error) throw error;

        alert('تهانينا! 🎉 تم تحديث كلمة المرور الخاصة بحساب الإدارة بنجاح عبر خوادم Supabase! 🟢\nيرجى استخدام كلمة المرور الجديدة من الآن فصاعداً.');
        elements.cfgNewPassword.value = '';
        elements.cfgConfirmPassword.value = '';
    } catch (err) {
        console.error("Password update failure: ", err);
        alert(`عذراً، فشل تحديث كلمة المرور في قاعدة البيانات السحابية!\nالتفاصيل: ${err.message || err}`);
    } finally {
        elements.btnChangePassword.disabled = false;
        elements.btnChangePassword.innerHTML = `<i class="fa-solid fa-lock-open"></i> تحديث كلمة المرور`;
    }
}

function togglePriceInputVisibility() {
    const selectedType = elements.formDishPriceType.value;
    if (selectedType === 'fixed') {
        elements.priceNumericInputGroup.style.display = 'flex';
        elements.formDishPrice.setAttribute('required', 'true');
    } else {
        elements.priceNumericInputGroup.style.display = 'none';
        elements.formDishPrice.removeAttribute('required');
        elements.formDishPrice.value = 0;
    }
}

function initFormCategoriesSelect() {
    elements.formDishCategory.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        elements.formDishCategory.appendChild(opt);
    });
}

// --- 6. Data Retrieval ---
async function loadDashboardData() {
    if (!isDbConnected || !supabaseClient) {
        renderAdminItemsList();
        return;
    }

    try {
        console.log("Admin Dashboard - Loading DB records...");
        
        const { data: dbCategories, error: catError } = await supabaseClient
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });
            
        if (catError) throw catError;
        
        const { data: dbMenuItems, error: itemError } = await supabaseClient
            .from('menu_items')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (itemError) throw itemError;

        if (dbCategories && dbCategories.length > 0) {
            categories = dbCategories;
            initFormCategoriesSelect();
        }
        if (dbMenuItems && dbMenuItems.length > 0) {
            menuItems = dbMenuItems;
        }

        renderAdminItemsList();
        
    } catch (err) {
        console.error("Admin database fetch failure: ", err);
        alert("فشل جلب البيانات الحية من قاعدة البيانات السحابية. تم تحميل البيانات الاحتياطية محلياً.");
        renderAdminItemsList();
    }
}

// --- 7. Sidebar Management List Rendering ---
function renderAdminItemsList() {
    elements.adminItemsListContainer.innerHTML = '';
    
    let filtered = menuItems;
    if (adminSearchQuery.trim().length > 0) {
        const query = adminSearchQuery.toLowerCase().trim();
        filtered = menuItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.ingredients.toLowerCase().includes(query)
        );
    }

    elements.totalItemsBadge.textContent = filtered.length;

    if (filtered.length === 0) {
        elements.adminItemsListContainer.innerHTML = `<p class="gold-text text-center py-4" style="font-size: 13px;">لا توجد وجبات تطابق البحث.</p>`;
        return;
    }

    filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = `admin-item-row ${selectedItemId === item.id ? 'selected' : ''}`;
        row.dataset.itemId = item.id;
        
        const catObj = categories.find(c => c.id === item.category_id);
        const catName = catObj ? catObj.name : 'بدون قسم';
        
        let priceDesc = '';
        if (item.price_type === 'fixed') {
            priceDesc = `${item.price} ج.م`;
        } else if (item.price_type === 'weight') {
            priceDesc = `حسب الوزن`;
        } else {
            priceDesc = `حسب الطلب`;
        }

        row.innerHTML = `
            <div class="admin-row-info">
                <span class="admin-row-name">${item.name}</span>
                <div class="admin-row-meta">
                    <span><i class="fa-solid fa-tags text-gold"></i> ${catName}</span>
                    <span>•</span>
                    <span><i class="fa-solid fa-coins text-red"></i> ${priceDesc}</span>
                </div>
            </div>
            <div class="admin-row-actions">
                <button class="btn-icon-edit edit-row-item-btn" data-item-id="${item.id}" title="تعديل الوجبة"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-icon-delete delete-row-item-btn" data-item-id="${item.id}" title="حذف الوجبة"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        
        row.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            selectItemForEditing(item.id);
        });

        elements.adminItemsListContainer.appendChild(row);
    });

    document.querySelectorAll('.edit-row-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectItemForEditing(btn.dataset.itemId);
        });
    });

    document.querySelectorAll('.delete-row-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleItemDelete(btn.dataset.itemId);
        });
    });
}

function selectItemForEditing(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    selectedItemId = itemId;
    
    document.querySelectorAll('.admin-item-row').forEach(row => {
        if (row.dataset.itemId === itemId) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });

    elements.formItemId.value = item.id;
    elements.formDishName.value = item.name;
    elements.formDishCategory.value = item.category_id;
    elements.formDishIngredients.value = item.ingredients;
    elements.formDishPriceType.value = item.price_type;
    elements.formDishPrice.value = item.price;
    elements.formDishBadge.value = item.badge || '';
    
    togglePriceInputVisibility();
    
    editorMode = 'edit';
    elements.editorTitle.innerHTML = `<i class="fa-solid fa-pencil-square text-red"></i> تعديل وجبة: "${item.name}"`;
    elements.editorModeBadge.textContent = 'وضع التعديل';
    elements.editorModeBadge.className = 'badge-status-mode red-text';
    
    if (window.innerWidth <= 992) {
        elements.editorPanelBox.scrollIntoView({ behavior: 'smooth' });
    }
}

function resetEditorForm() {
    selectedItemId = null;
    elements.formItemId.value = '';
    elements.formDishEditor.reset();
    
    elements.priceNumericInputGroup.style.display = 'flex';
    elements.formDishPrice.value = 0;
    
    document.querySelectorAll('.admin-item-row').forEach(r => r.classList.remove('selected'));
    
    editorMode = 'create';
    elements.editorTitle.innerHTML = `<i class="fa-solid fa-circle-plus text-red"></i> إضافة وجبة جديدة للمنيو`;
    elements.editorModeBadge.textContent = 'وضع الإضافة';
    elements.editorModeBadge.className = 'badge-status-mode gold-text';
}

// --- 8. Database Mutations CRUD (Supabase Synchronized) ---
async function handleFormSubmit(e) {
    e.preventDefault();

    const itemId = elements.formItemId.value;
    const name = elements.formDishName.value.trim();
    const category_id = elements.formDishCategory.value;
    const ingredients = elements.formDishIngredients.value.trim();
    const price_type = elements.formDishPriceType.value;
    const price = price_type === 'fixed' ? parseFloat(elements.formDishPrice.value) || 0 : 0;
    const badge = elements.formDishBadge.value.trim() || null;

    if (!name || !ingredients) {
        alert('يرجى ملء جميع الحقول المطلوبة.');
        return;
    }

    const payload = {
        category_id,
        name,
        ingredients,
        price,
        price_type,
        badge
    };

    elements.btnFormSubmit.disabled = true;
    elements.btnFormSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ الآن...`;

    try {
        if (editorMode === 'create') {
            if (isDbConnected && supabaseClient) {
                // Supabase authenticated insert (Safe!)
                const { data, error } = await supabaseClient
                    .from('menu_items')
                    .insert([payload])
                    .select();
                
                if (error) throw error;
                console.log("Supabase insert succeeded: ", data);
            }
            
            // Local state update
            const mockId = 'local-' + Date.now();
            menuItems.push({ id: mockId, ...payload });
            alert('تمت إضافة الوجبة الجديدة بنجاح للمنيو سحابياً! 🟢');
        } else {
            if (isDbConnected && supabaseClient) {
                // Supabase authenticated update (Safe!)
                const { data, error } = await supabaseClient
                    .from('menu_items')
                    .update(payload)
                    .eq('id', itemId)
                    .select();
                
                if (error) throw error;
                console.log("Supabase update succeeded: ", data);
            }
            
            const index = menuItems.findIndex(i => i.id == itemId);
            if (index !== -1) {
                menuItems[index] = { id: itemId, ...payload };
            }
            alert('تم تعديل بيانات الوجبة بنجاح سحابياً! 🟢');
        }
        
        if (isDbConnected) {
            await loadDashboardData();
        } else {
            renderAdminItemsList();
        }
        resetEditorForm();
        
    } catch (err) {
        console.error("Database CRUD transaction failure: ", err);
        alert(`عذراً، فشل تنفيذ العملية في قاعدة البيانات لعدم الصلاحية! 🔴\n(تأكد من تسجيل الدخول بحساب مدير مصدق عبر خوادم Supabase)\nالتفاصيل: ${err.message || err}`);
    } finally {
        elements.btnFormSubmit.disabled = false;
        elements.btnFormSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> حفظ الصنف ونشره للمنيو`;
    }
}

async function handleItemDelete(itemId) {
    const item = menuItems.find(i => i.id == itemId);
    if (!item) return;

    if (!confirm(`تحذير هام! ⚠️\nهل أنت متأكد تماماً من حذف الوجبة "${item.name}" بالكامل من المنيو؟`)) {
        return;
    }

    try {
        if (isDbConnected && supabaseClient) {
            // Supabase authenticated delete (Safe!)
            const { error } = await supabaseClient
                .from('menu_items')
                .delete()
                .eq('id', itemId);
                
            if (error) throw error;
            console.log(`Supabase delete succeeded for item ID: ${itemId}`);
        }

        menuItems = menuItems.filter(i => i.id != itemId);
        alert('تم حذف الصنف بالكامل بنجاح من المنيو سحابياً! 🟢');
        
        if (selectedItemId === itemId) {
            resetEditorForm();
        }
        
        renderAdminItemsList();
        
    } catch (err) {
        console.error("Database deletion failure: ", err);
        alert(`فشل الحذف من قاعدة البيانات لعدم الصلاحية! 🔴\nالتفاصيل: ${err.message || err}`);
    }
}
