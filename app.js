/* ==========================================================================
   WAHAT AL-SHEIKH - INTERACTIVE MENU & SUPABASE DATABASE LOGIC (wahaelsheikh GitHub edition)
   Fully dynamic, real-time database-driven with offline fallback
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

// --- 0. Supabase Connection Credentials ---
const SUPABASE_CONFIG = {
    url: sanitizeSupabaseUrl(localStorage.getItem('supabase_url') || ''),
    anonKey: (localStorage.getItem('supabase_anon_key') || '').trim()
};

let supabaseClient = null;
let isDbConnected = false;

if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        isDbConnected = true;
        console.log("Supabase Client connected successfully in Main Menu!");
    } catch (e) {
        console.error("Failed to initialize Supabase Client: ", e);
    }
}

/// --- 1. The Fallback Menu Dataset (Offline/Demo Mode) ---
const fallbackCategories = [
    { id: 'bedouin', name: 'القسم البدوي', icon: 'fa-campground', desc: 'الوجبات تقدم مع: (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش' },
    { id: 'tagines', name: 'قسم الطواجن', icon: 'fa-mortar-pestle', desc: 'طواجن فخار غنية مطبوخة على نار هادئة بطعم ونكهة ريفية وبدوية أصيلة (بدون سعر حالياً)' },
    { id: 'mahshi', name: 'قسم المحاشي', icon: 'fa-pepper-hot', desc: 'محاشي بلدي طازجة وممبار غني محضر يومياً بأجود أنواع الأرز والخلطات السرية (بدون سعر حالياً)' },
    { id: 'grills', name: 'قسم المشويات', icon: 'fa-fire-burner', desc: 'الوجبات تقدم مع: أرز + خضار + سلطة + عيش' },
    { id: 'meals', name: 'قسم الوجبات', icon: 'fa-bowl-rice', desc: 'وجبات فردية متكاملة مغذية ومشبعة تلبي جميع الأذواق (بدون سعر حالياً)' },
    { id: 'mandi', name: 'قسم المندي', icon: 'fa-wheat-awn', desc: 'وجبات المندي الفاخرة المطهية ببطء تحت الحفر البدوية التقليدية (بدون سعر حالياً)' },
    { id: 'breakfast', name: 'قسم الفطور', icon: 'fa-egg', desc: 'أطباق فطور بدوي وشعبي تقليدي يبدأ به يومك بنشاط وطاقة (بدون سعر حالياً)' },
    { id: 'platters', name: 'قسم الصواني', icon: 'fa-plate-wheat', desc: 'صواني واحة الشيخ الملوكية الفاخرة المناسبة للعزائم واللمة البدوية' },
    { id: 'drinks', name: 'قسم المشروبات', icon: 'fa-mug-hot', desc: 'مشروبات منعشة وشاي زردة مطبوخ على الفحم بالطريقة البدوية (بدون سعر حالياً)' }
];

const fallbackMenuItems = [
    // === Category: Bedouin (القسم البدوي) ===
    { id: 'bedouin-1', category_id: 'bedouin', name: 'ربع ضاني (أرز)', ingredients: 'ربع ضاني + أرز + خضار + شوربة + سلطة + عيش', price: 275, price_type: 'fixed' },
    { id: 'bedouin-2', category_id: 'bedouin', name: 'ربع ضاني (مكرونة)', ingredients: 'ربع ضاني + مكرونة + خضار + شوربة + سلطة + عيش', price: 275, price_type: 'fixed' },
    { id: 'bedouin-3', category_id: 'bedouin', name: 'ثلث ضاني', ingredients: 'ثلث ضاني + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 450, price_type: 'fixed' },
    { id: 'bedouin-3-5', category_id: 'bedouin', name: 'نصف ضاني', ingredients: 'نصف ضاني + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 550, price_type: 'fixed' },
    { id: 'bedouin-4', category_id: 'bedouin', name: 'كيلو ضاني', ingredients: 'كيلو ضاني بلدي فاخر + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 1100, price_type: 'fixed' },
    { id: 'bedouin-5', category_id: 'bedouin', name: 'ربع شمبري (أرز)', ingredients: 'ربع شمبري + أرز + خضار + شوربة + سلطة + عيش', price: 250, price_type: 'fixed' },
    { id: 'bedouin-6', category_id: 'bedouin', name: 'ربع شمبري (مكرونة)', ingredients: 'ربع شمبري + مكرونة + خضار + شوربة + سلطة + عيش', price: 250, price_type: 'fixed' },
    { id: 'bedouin-7', category_id: 'bedouin', name: 'نصف شمبري', ingredients: 'نصف شمبري + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 500, price_type: 'fixed' },
    { id: 'bedouin-8', category_id: 'bedouin', name: 'كيلو شمبري', ingredients: 'كيلو شمبري بلدي ممتاز + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 1100, price_type: 'fixed' },
    { id: 'bedouin-9', category_id: 'bedouin', name: 'موزة ضاني', ingredients: 'موزة ضاني بلدي + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 0, price_type: 'undetermined' },
    { id: 'bedouin-10', category_id: 'bedouin', name: 'نصف رأس ضاني', ingredients: 'نصف رأس ضاني بلدي مطبوخ ببطء + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 200, price_type: 'fixed' },
    { id: 'bedouin-11', category_id: 'bedouin', name: 'نصف ديك بلدي', ingredients: 'نصف ديك بلدي محمر + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'bedouin-12', category_id: 'bedouin', name: 'جوز حمام', ingredients: 'جوز حمام محشي أرز + شوربة حمام غنية + خضار + سلطة + عيش', price: 0, price_type: 'undetermined' },
    { id: 'bedouin-13', category_id: 'bedouin', name: 'ربع فراخ', ingredients: 'ربع فراخ بلدي + أرز + خضار + شوربة + سلطة + عيش', price: 150, price_type: 'fixed' },
    { id: 'bedouin-14', category_id: 'bedouin', name: 'نصف فراخ', ingredients: 'نصف فراخ بلدي + أرز + خضار + شوربة + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'bedouin-15', category_id: 'bedouin', name: 'فرخة كاملة', ingredients: 'فرخة بلدي كاملة + أرز + خضار + شوربة + سلطة + عيش', price: 600, price_type: 'fixed' },

    // === Category: Tagines (قسم الطواجن) ===
    { id: 'tagines-1', category_id: 'tagines', name: 'طاجن كوارع', ingredients: 'كوارع بلدية مخلية ومطبوخة ببطء بداخل طاجن الفخار بالفرن بخلطة الثوم والخل الغنية', price: 0, price_type: 'undetermined' },
    { id: 'tagines-2', category_id: 'tagines', name: 'طاجن خضار مشكل باللحم', ingredients: 'خضروات موسمية طازجة مطبوخة مع قطع لحم بلدي ذائب في طاجن فخار بدوي عتيق بالفرن', price: 0, price_type: 'undetermined' },
    { id: 'tagines-3', category_id: 'tagines', name: 'طاجن بامية باللحم', ingredients: 'بامية بلدية صغيرة مطهوة بلحم الضاني الذائب وعصير الطماطم الفريش بالفرن', price: 0, price_type: 'undetermined' },
    { id: 'tagines-4', category_id: 'tagines', name: 'طاجن ملوخية خضراء', ingredients: 'ملوخية خضراء طازجة بطشة الثوم والكزبرة الذهبية بالفرن بمرقة اللحم الغنية', price: 0, price_type: 'undetermined' },

    // === Category: Mahshi (قسم المحاشي) ===
    { id: 'mahshi-1', category_id: 'mahshi', name: 'كيلو محشي مشكل', ingredients: 'تشكيلة رائعة من محشي الكرنب، الكوسا، الباذنجان، والفلفل بخلطة واحة الشيخ السرية بالسمن البلدي', price: 0, price_type: 'undetermined' },
    { id: 'mahshi-2', category_id: 'mahshi', name: 'كيلو ممبار', ingredients: 'ممبار بلدي محشي بالأرز المتبل المقرمش المحمر بالسمن البلدي الساخن', price: 0, price_type: 'undetermined' },
    { id: 'mahshi-3', category_id: 'mahshi', name: 'نصف كيلو محشي مشكل', ingredients: 'نصف كيلو من تشكيلة المحاشي المشكلة اللذيذة والساخنة', price: 0, price_type: 'undetermined' },
    { id: 'mahshi-4', category_id: 'mahshi', name: 'نصف كيلو ممبار', ingredients: 'نصف كيلو ممبار بلدي محمر مقرمش ولذيذ', price: 0, price_type: 'undetermined' },

    // === Category: Grills (قسم المشويات) ===
    { id: 'grills-1', category_id: 'grills', name: 'ربع ريش', ingredients: 'ربع كيلو ريش ضاني مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'grills-2', category_id: 'grills', name: 'نصف ريش', ingredients: 'نصف كيلو ريش ضاني مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 600, price_type: 'fixed' },
    { id: 'grills-3', category_id: 'grills', name: 'كيلو ريش', ingredients: 'كيلو ريش ضاني بلدي مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 1200, price_type: 'fixed' },
    { id: 'grills-4', category_id: 'grills', name: 'ربع كفتة', ingredients: 'ربع كيلو كفتة مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'grills-5', category_id: 'grills', name: 'نصف كفتة', ingredients: 'نصف كيلو كفتة مشوية على الفحم + أرز + خضار + سلطة + عيش', price: 600, price_type: 'fixed' },
    { id: 'grills-6', category_id: 'grills', name: 'ربع فليتو', ingredients: 'ربع كيلو لحم فليتو مشوي فاخر + أرز + خضار + سلطة + عيش', price: 0, price_type: 'undetermined' },
    { id: 'grills-7', category_id: 'grills', name: 'ربع طرب', ingredients: 'ربع كيلو طرب مشوي بدوي على الفحم + أرز + خضار + سلطة + عيش', price: 300, price_type: 'fixed' },
    { id: 'grills-8', category_id: 'grills', name: 'نصف طرب', ingredients: 'نصف كيلو طرب مشوي على الفحم + أرز + خضار + سلطة + عيش', price: 600, price_type: 'fixed' },
    { id: 'grills-9', category_id: 'grills', name: 'كيلو طرب', ingredients: 'كيلو طرب بلدي مشوي على الفحم + أرز + خضار + سلطة + عيش', price: 1200, price_type: 'fixed' },

    // === Category: Meals (قسم الوجبات) ===
    { id: 'meals-1', category_id: 'meals', name: 'وجبة ربع فرخة مشوي', ingredients: 'مع أرز أو مكرونة + خضار + شوربة + سلطة', price: 0, price_type: 'undetermined' },
    { id: 'meals-2', category_id: 'meals', name: 'وجبة نصف فرخة مشوي', ingredients: 'مع أرز أو مكرونة + خضار + شوربة + سلطة', price: 0, price_type: 'undetermined' },
    { id: 'meals-3', category_id: 'meals', name: 'وجبة شيش طاووق', ingredients: 'مع أرز + خضار + سلطة + عيش', price: 0, price_type: 'undetermined' },
    { id: 'meals-4', category_id: 'meals', name: 'وجبة ميكس', ingredients: 'تشكيلة متكاملة من كفتة اللحم المشوي، شيش طاووق الدجاج، والريش مع الأرز والسلطات', price: 0, price_type: 'undetermined' },
    { id: 'meals-5', category_id: 'meals', name: 'وجبة مشكل مشوي', ingredients: 'مشكل مشويات كفتة وطرب وريش فاخرة تقدم مع الأرز البدوي المميز والخضار والعيش الساخن', price: 0, price_type: 'undetermined' },

    // === Category: Mandi (قسم المندي) ===
    { id: 'mandi-1', category_id: 'mandi', name: 'وجبة ربع ضاني مندي', ingredients: 'ربع ضاني مندي بلدي ذائب مطهو ببطء بالحفرة تقدم مع أرز مندي فاخر، خضار سوتيه، شوربة، وسلطات', price: 0, price_type: 'undetermined' },
    { id: 'mandi-2', category_id: 'mandi', name: 'وجبة ربع شمبري مندي', ingredients: 'ربع شمبري بلدي مندي مطبوخ تحت الأرض يقدم مع أرز مندي بدوي فاخر، خضار، شوربة وسلطات', price: 0, price_type: 'undetermined' },
    { id: 'mandi-3', category_id: 'mandi', name: 'وجبة ربع فراخ مندي', ingredients: 'ربع دجاجة مندي بلدي متبلة بالبهارات البدوية ومطهية ببطء تقدم مع الأرز المندي اللذيذ وخضار وسلطة', price: 0, price_type: 'undetermined' },

    // === Category: Breakfast (قسم الفطور) ===
    { id: 'breakfast-1', category_id: 'breakfast', name: 'عدس + فول + مخلل + عيش', ingredients: 'عدس مطبوخ بالسمن البلدي + فول مدمس غني + مخلل بلدي مشكل + عيش ساخن من الفرن', price: 0, price_type: 'undetermined' },
    { id: 'breakfast-2', category_id: 'breakfast', name: 'كمونية', ingredients: 'قطع لحم وكبدة بلدية مطهوة بالثوم والكمون والصلصة البدوية الغنية تقدم ساخنة مع العيش البلدي', price: 0, price_type: 'undetermined' },
    { id: 'breakfast-3', category_id: 'breakfast', name: 'قلاية', ingredients: 'شرايح لحم بلدي طازج مقلية مع الطماطم، الفلفل الحار، والبصل بالسمن البدوي الساخن والعيش الساخن', price: 0, price_type: 'undetermined' },
    { id: 'breakfast-4', category_id: 'breakfast', name: 'تحميرة لحمة', ingredients: 'قطع وشرايح لحم بلدي طازجة محمرة بالدهن والخميرة الطبيعية المتبلة على الطريقة البدوية الأصيلة', price: 0, price_type: 'undetermined' },

    // === Category: Platters (قسم الصواني) ===
    { id: 'platters-1', category_id: 'platters', name: 'صينية الشيخ', ingredients: 'تشكيلة ملوكية فاخرة من اللحوم والمشويات والأرز البدوي الخاص بطابع واحة الشيخ المميز (السعر والمكونات غير محددة)', price: 0, price_type: 'undetermined' },
    { id: 'platters-2', category_id: 'platters', name: 'صينية لم الشمل', ingredients: 'صينية غنية باللحوم المتنوعة والأرز تكفي العائلة الكريمة وتجسد كرم الضيافة البدوية (السعر والمكونات غير محددة)', price: 0, price_type: 'undetermined' },
    { id: 'platters-3', category_id: 'platters', name: 'صينية الدب الروسي', ingredients: 'وجبة عملاقة ومشبعة جداً من اللحوم البلدية والخلطات المميزة للباحثين عن القوة والامتلاء (السعر والمكونات غير محددة)', price: 0, price_type: 'undetermined' },
    { id: 'platters-4', category_id: 'platters', name: 'صينية خروف مندي', ingredients: 'خروف بلدي مندي كامل مطبوخ بالحفرة البدوية يفرش فوق أرز المندي الفاخر والمكسرات والزبيب وجوانب الخضار والسلطات', price: 0, price_type: 'weight' },
    { id: 'platters-5', category_id: 'platters', name: 'صينية نصف خروف مندي', ingredients: 'نصف خروف بلدي مندي مطهو ببطء فوق أرز مندي بدوي فاخر بمكسرات وخضار وسلطات وشوربة متكاملة', price: 0, price_type: 'weight' },

    // === Category: Drinks (قسم المشروبات) ===
    { id: 'drinks-1', category_id: 'drinks', name: 'بيبسي', ingredients: 'عبوة بيبسي مثلجة ومنعشة', price: 0, price_type: 'undetermined' },
    { id: 'drinks-2', category_id: 'drinks', name: 'سفن أب', ingredients: 'عبوة سفن أب غازية مثلجة ومنعشة ومقاومة للحر', price: 0, price_type: 'undetermined' },
    { id: 'drinks-3', category_id: 'drinks', name: 'براد شاي زردة أحمر', ingredients: 'شاي زردة أحمر بدوي أصيل مغلي على الفحم مع النعناع أو الحبق ببراد ألومنيوم تقليدي', price: 0, price_type: 'undetermined' },
    { id: 'drinks-4', category_id: 'drinks', name: 'براد شاي زردة أخضر', ingredients: 'شاي زردة أخضر خفيف وصحي مغلي على جمر الفحم مع النعناع الطازج في براد بدوي تقليدي', price: 0, price_type: 'undetermined' }
];

// Active loaded datasets
let categories = [...fallbackCategories];
let menuItems = [...fallbackMenuItems];

// --- 2. Application State Management ---
let activeCategory = 'bedouin';
let searchQuery = '';
let cart = {}; // Format: { itemId: quantity }

// --- 3. DOM Elements Cache ---
const elements = {
    categoriesTabs: document.getElementById('categories-tabs-container'),
    foodGrid: document.getElementById('food-grid-container'),
    searchInput: document.getElementById('menu-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    noResultsView: document.getElementById('no-results-view'),
    currentCategoryName: document.getElementById('current-category-name'),
    currentCategoryDesc: document.getElementById('current-category-desc'),
    resetSearchBtn: document.getElementById('reset-search-btn'),
    dbLoaderSpinner: document.getElementById('db-loader-spinner'),
    
    // Slide Scroll controls
    slideLeft: document.getElementById('slide-left'),
    slideRight: document.getElementById('slide-right'),
    
    // Floating cart button
    floatingCartBtn: document.getElementById('floating-cart-btn'),
    cartCountBadge: document.getElementById('cart-count'),
    cartTotalPreview: document.getElementById('cart-total-preview'),
    
    // Order drawer elements
    orderDrawer: document.getElementById('order-drawer'),
    drawerOverlay: document.getElementById('order-drawer-overlay'),
    closeDrawerBtn: document.getElementById('close-drawer-btn'),
    orderedItemsList: document.getElementById('ordered-items-list'),
    
    // Client Info Fields
    clientNameInput: document.getElementById('client-name'),
    clientAddressInput: document.getElementById('client-address'),
    orderNotesInput: document.getElementById('order-notes'),
    
    // Summary
    summaryItemsCount: document.getElementById('summary-items-count'),
    summaryItemsTotal: document.getElementById('summary-items-total'),
    
    // Submit
    submitOrderBtn: document.getElementById('btn-whatsapp-submit')
};

// --- 4. Initialization & Database Fetching ---
document.addEventListener('DOMContentLoaded', async () => {
    initCategories();
    renderMenu();
    setupEventListeners();
    setupTabsScrolling();

    if (isDbConnected) {
        await fetchLiveDataFromSupabase();
    }
});

async function fetchLiveDataFromSupabase() {
    if (!supabaseClient) return;
    
    if (elements.dbLoaderSpinner) {
        elements.dbLoaderSpinner.style.display = 'flex';
    }
    
    try {
        console.log("Fetching live data from Supabase Cloud...");
        
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
        }
        if (dbMenuItems && dbMenuItems.length > 0) {
            menuItems = dbMenuItems;
        }
        
        console.log(`Successfully loaded ${categories.length} categories and ${menuItems.length} menu items from database!`);
        
        initCategories();
        selectCategory(activeCategory);
        
    } catch (err) {
        console.error("Supabase Database fetch error, continuing in Offline/Fallback Mode: ", err);
    } finally {
        if (elements.dbLoaderSpinner) {
            elements.dbLoaderSpinner.style.display = 'none';
        }
    }
}

// --- 5. Render Categories Navigation ---
function initCategories() {
    elements.categoriesTabs.innerHTML = '';
    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = `tab-btn ${cat.id === activeCategory ? 'active' : ''}`;
        button.dataset.catId = cat.id;
        button.innerHTML = `<i class="fa-solid ${cat.icon}"></i> ${cat.name}`;
        button.addEventListener('click', () => selectCategory(cat.id));
        elements.categoriesTabs.appendChild(button);
    });
}

function selectCategory(catId) {
    activeCategory = catId;
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.catId === catId) {
            btn.classList.add('active');
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else {
            btn.classList.remove('active');
        }
    });

    const currentCatObj = categories.find(c => c.id === catId);
    if (currentCatObj) {
        elements.currentCategoryName.innerHTML = `<i class="fa-solid ${currentCatObj.icon} text-red"></i> ${currentCatObj.name}`;
        elements.currentCategoryDesc.textContent = currentCatObj.desc;
    }
    
    renderMenu();
}

// --- 6. Render Food Grid ---
function renderMenu() {
    elements.foodGrid.innerHTML = '';
    
    let filteredItems = [];
    const isSearching = searchQuery.trim().length > 0;
    
    if (isSearching) {
        const query = searchQuery.toLowerCase().trim();
        filteredItems = menuItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.ingredients.toLowerCase().includes(query)
        );
        
        elements.currentCategoryName.innerHTML = `<i class="fa-solid fa-magnifying-glass text-gold"></i> نتائج البحث عن: "${searchQuery}"`;
        elements.currentCategoryDesc.textContent = `وجدنا ${filteredItems.length} وجبة تطابق بحثك`;
    } else {
        filteredItems = menuItems.filter(item => item.category_id === activeCategory);
    }
    
    if (filteredItems.length === 0) {
        elements.foodGrid.style.display = 'none';
        elements.noResultsView.style.display = 'block';
        return;
    }
    
    elements.foodGrid.style.display = 'grid';
    elements.noResultsView.style.display = 'none';
    
    filteredItems.forEach(item => {
        const qtyInCart = cart[item.id] || 0;
        const card = document.createElement('div');
        card.className = 'food-card';
        card.dataset.itemId = item.id;
        
        let priceHtml = '';
        if (item.price_type === 'fixed') {
            priceHtml = `
                <div class="price-tag">
                    ${item.price} <span class="price-currency">ج.م</span>
                </div>`;
        } else if (item.price_type === 'weight') {
            priceHtml = `
                <div class="price-by-weight">
                    <i class="fa-solid fa-weight-hanging"></i> حسب الوزن
                </div>`;
        } else {
            priceHtml = `
                <div class="price-undetermined">
                    <i class="fa-solid fa-phone"></i> اتصل للاستفسار
                </div>`;
        }

        let actionBtnHtml = '';
        if (qtyInCart > 0) {
            actionBtnHtml = `
                <div class="card-qty-controller">
                    <button class="qty-card-btn minus-qty" data-item-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
                    <span class="qty-card-val">${qtyInCart}</span>
                    <button class="qty-card-btn plus-qty" data-item-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
                </div>`;
        } else {
            actionBtnHtml = `
                <button class="btn-add-item add-to-order-btn" data-item-id="${item.id}" title="إضافة للطلب">
                    <i class="fa-solid fa-plus"></i>
                </button>`;
        }

        const badgeHtml = item.badge ? `<span class="dish-badge">${item.badge}</span>` : '';
        
        card.innerHTML = `
            ${badgeHtml}
            <div class="card-top">
                <div class="card-title-group">
                    <h3 class="food-title">${item.name}</h3>
                </div>
            </div>
            <div class="card-body">
                <p class="food-desc">${item.ingredients}</p>
                <div class="card-footer">
                    <div class="price-container">
                        ${priceHtml}
                    </div>
                    <div class="action-container">
                        ${actionBtnHtml}
                    </div>
                </div>
            </div>
        `;
        
        elements.foodGrid.appendChild(card);
    });

    bindGridActionButtons();
}

// --- 7. Cart Core Mechanics ---
function addToCart(itemId) {
    cart[itemId] = 1;
    updateCartUI();
    renderMenu();
}

function updateCartQuantity(itemId, increment) {
    if (!cart[itemId]) return;
    
    if (increment) {
        cart[itemId] += 1;
    } else {
        cart[itemId] -= 1;
        if (cart[itemId] <= 0) {
            delete cart[itemId];
        }
    }
    
    updateCartUI();
    renderMenu();
}

function deleteFromCart(itemId) {
    delete cart[itemId];
    updateCartUI();
    renderMenu();
}

function updateCartUI() {
    let totalItems = 0;
    let totalPrice = 0;
    let hasUndetermined = false;
    
    Object.keys(cart).forEach(id => {
        const item = menuItems.find(i => String(i.id) === String(id));
        if (item) {
            const qty = cart[id];
            totalItems += qty;
            if (item.price_type === 'fixed') {
                totalPrice += item.price * qty;
            } else {
                hasUndetermined = true;
            }
        }
    });

    if (totalItems > 0) {
        elements.floatingCartBtn.style.display = 'flex';
        elements.cartCountBadge.textContent = totalItems;
        elements.cartTotalPreview.textContent = totalPrice + (hasUndetermined ? '+' : '');
    } else {
        elements.floatingCartBtn.style.display = 'none';
        closeDrawer();
    }

    renderDrawerItems(totalItems, totalPrice, hasUndetermined);
}

function renderDrawerItems(totalItems, totalPrice, hasUndetermined) {
    elements.orderedItemsList.innerHTML = '';
    
    if (totalItems === 0) {
        elements.orderedItemsList.innerHTML = `<p class="gold-text text-center py-4">سلتك فارغة حالياً! تصفح المنيو وأضف وجباتك.</p>`;
        elements.summaryItemsCount.textContent = '0 وجبة';
        elements.summaryItemsTotal.textContent = '0 ج.م';
        return;
    }

    Object.keys(cart).forEach(id => {
        const item = menuItems.find(i => String(i.id) === String(id));
        if (!item) return;
        
        const qty = cart[id];
        const itemCard = document.createElement('div');
        itemCard.className = 'drawer-item-card';
        
        let priceText = '';
        if (item.price_type === 'fixed') {
            priceText = `${item.price * qty} ج.م`;
        } else if (item.price_type === 'weight') {
            priceText = `حسب الوزن`;
        } else {
            priceText = `حسب الطلب`;
        }

        itemCard.innerHTML = `
            <div class="drawer-item-info">
                <span class="drawer-item-name">${item.name}</span>
                <span class="drawer-item-meta">${priceText}</span>
            </div>
            
            <div class="drawer-qty-controller">
                <button class="qty-btn minus-drawer-qty" data-item-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn plus-drawer-qty" data-item-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
            </div>
            
            <button class="btn-delete-drawer-item delete-drawer-item" data-item-id="${item.id}" title="حذف">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        
        elements.orderedItemsList.appendChild(itemCard);
    });

    document.querySelectorAll('.minus-drawer-qty').forEach(btn => {
        btn.addEventListener('click', () => updateCartQuantity(btn.dataset.itemId, false));
    });
    document.querySelectorAll('.plus-drawer-qty').forEach(btn => {
        btn.addEventListener('click', () => updateCartQuantity(btn.dataset.itemId, true));
    });
    document.querySelectorAll('.delete-drawer-item').forEach(btn => {
        btn.addEventListener('click', () => deleteFromCart(btn.dataset.itemId));
    });

    elements.summaryItemsCount.textContent = `${totalItems} وجبة`;
    elements.summaryItemsTotal.textContent = `${totalPrice} ج.م ${hasUndetermined ? '(وجبات استفسار/وزن قد تعدل السعر)' : ''}`;
}

// --- 8. Event Listeners Setup ---
function setupEventListeners() {
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.trim().length > 0) {
            elements.clearSearchBtn.style.display = 'block';
        } else {
            elements.clearSearchBtn.style.display = 'none';
        }
        renderMenu();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        elements.searchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
        selectCategory(activeCategory);
    });

    elements.resetSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        elements.searchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
        selectCategory(activeCategory);
    });

    elements.floatingCartBtn.addEventListener('click', openDrawer);
    elements.closeDrawerBtn.addEventListener('click', closeDrawer);
    elements.drawerOverlay.addEventListener('click', closeDrawer);

    elements.submitOrderBtn.addEventListener('click', sendOrderToWhatsApp);

    // Stealth Admin Access: Clicking the copyright text 5 times within 3 seconds redirects to admin.html
    const adminTrigger = document.getElementById('secret-admin-trigger');
    if (adminTrigger) {
        let clickCount = 0;
        let clickTimer = null;
        
        adminTrigger.addEventListener('click', () => {
            clickCount++;
            
            if (clickCount === 1) {
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 3000); // Reset count after 3 seconds
            }
            
            if (clickCount >= 5) {
                clearTimeout(clickTimer);
                clickCount = 0;
                window.location.href = 'admin.html';
            }
        });
    }
}

function bindGridActionButtons() {
    document.querySelectorAll('.add-to-order-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(btn.dataset.itemId);
        });
    });

    document.querySelectorAll('.minus-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCartQuantity(btn.dataset.itemId, false);
        });
    });

    document.querySelectorAll('.plus-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCartQuantity(btn.dataset.itemId, true);
        });
    });
}

function openDrawer() {
    elements.orderDrawer.classList.add('active');
    elements.drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    elements.orderDrawer.classList.remove('active');
    elements.drawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// --- 9. WhatsApp Order Generation Formatter ---
function sendOrderToWhatsApp() {
    const nameInput = document.getElementById('client-name');
    const addressInput = document.getElementById('client-address');
    const notesInput = document.getElementById('order-notes');

    const clientName = nameInput ? nameInput.value.trim() : '';
    const clientAddress = addressInput ? addressInput.value.trim() : '';
    const orderNotes = notesInput ? notesInput.value.trim() : '';

    if (!clientName) {
        alert('يرجى كتابة الاسم الكريم لتأكيد طلبك وتسهيل التوصيل/الحجز.');
        if (nameInput) nameInput.focus();
        return;
    }

    let message = `السلام عليكم يا واحة الشيخ 🌴\n`;
    message += `حابب أطلب الوجبات التالية للتحضير:\n\n`;
    message += `=========================\n`;

    let totalPrice = 0;
    let hasUndetermined = false;
    let itemIndex = 1;

    Object.keys(cart).forEach(id => {
        const item = menuItems.find(i => String(i.id) === String(id));
        if (item) {
            const qty = cart[id];
            let priceDesc = '';
            if (item.price_type === 'fixed') {
                const subtotal = item.price * qty;
                priceDesc = `${subtotal} ج.م`;
                totalPrice += subtotal;
            } else if (item.price_type === 'weight') {
                priceDesc = `حسب الوزن`;
                hasUndetermined = true;
            } else {
                priceDesc = `استفسار السعر`;
                hasUndetermined = true;
            }
            
            message += `${itemIndex}. *${item.name}* (العدد: ${qty}) 👈 [${priceDesc}]\n`;
            if (item.ingredients && typeof item.ingredients === 'string') {
                message += `   _مكونات: ${item.ingredients.substring(0, 50)}..._\n`;
            }
            itemIndex++;
        }
    });

    message += `=========================\n\n`;
    
    if (totalPrice > 0) {
        message += `💰 *إجمالي الحساب التقديري:* ${totalPrice} ج.م\n`;
    }
    if (hasUndetermined) {
        message += `⚠️ _ملاحظة: يحتوي الطلب على وجبات (حسب الوزن / الطلب) سيتم تأكيد سعرها معكم عبر الهاتف._\n`;
    }

    message += `\n*بيانات العميل لتأكيد الحجز/التوصيل:*\n`;
    message += `👤 *الاسم:* ${clientName}\n`;
    
    if (clientAddress) {
        message += `📍 *العنوان:* ${clientAddress}\n`;
    } else {
        message += `📍 *العنوان:* لم يحدد (سيتم التنسيق معكم)\n`;
    }

    if (orderNotes) {
        message += `📝 *ملاحظات إضافية:* ${orderNotes}\n`;
    }

    message += `\nشكراً لكم وبانتظار ردكم بالتحضير! 🙏✨`;

    // Correct phone number from 201277088867 to 201277088876
    const primaryPhone = '201277088876';
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${primaryPhone}&text=${encodeURIComponent(message)}`;
    
    // Using window.location.href to reliably redirect on mobile devices and bypass popup blockers
    window.location.href = whatsappUrl;
}

// --- 10. Horizontal Category Nav Touch & Arrow Scrolling ---
function setupTabsScrolling() {
    const scrollContainer = elements.categoriesTabs;
    const arrowLeft = elements.slideLeft;
    const arrowRight = elements.slideRight;

    if (!scrollContainer || !arrowLeft || !arrowRight) return;

    const scrollAmount = 200;

    arrowLeft.addEventListener('click', () => {
        scrollContainer.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });

    arrowRight.addEventListener('click', () => {
        scrollContainer.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    const toggleArrows = () => {
        const isScrollable = scrollContainer.scrollWidth > scrollContainer.clientWidth;
        if (!isScrollable) {
            arrowLeft.style.display = 'none';
            arrowRight.style.display = 'none';
            return;
        }

        arrowLeft.style.display = 'flex';
        arrowRight.style.display = 'flex';
        
        const scrollLeft = scrollContainer.scrollLeft;
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        
        if (Math.abs(scrollLeft) <= 5) {
            arrowLeft.style.display = 'none';
        } else {
            arrowLeft.style.display = 'flex';
        }

        if (Math.abs(scrollLeft) >= maxScroll - 5) {
            arrowRight.style.display = 'none';
        } else {
            arrowRight.style.display = 'flex';
        }
    };

    scrollContainer.addEventListener('scroll', toggleArrows);
    window.addEventListener('resize', toggleArrows);
    
    setTimeout(toggleArrows, 300);
}
