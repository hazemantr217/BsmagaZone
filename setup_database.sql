-- ==========================================================================
-- WAHAT AL-SHEIKH RESTAURANT - DATABASE SETUP SCRIPT FOR SUPABASE
-- This script initializes the categories and menu items tables with default data
-- and configures the security (RLS) policies for Supabase Auth integrations.
-- Paste this script into the Supabase SQL Editor and run it.
-- ==========================================================================

-- ==========================================================================
-- 📝 HOW TO CREATE AN ADMIN USER IN SUPABASE AUTH:
-- 1. Go to your Supabase Dashboard: https://supabase.com
-- 2. Select your project.
-- 3. Navigate in the left sidebar to: Authentication > Users
-- 4. Click: "Add User" > "Create User"
-- 5. Fill out the credentials:
--    - Email: admin@wahat-al-sheikh.com (or your personal email)
--    - Password: [choose your strong secure password]
--    - Toggle off "Auto-confirm user" OR ensure the user is confirmed manually.
--    - Click: "Create User"
-- 6. Done! You can now log into your Admin Dashboard (admin.html) securely!
-- ==========================================================================

-- 1. DROP EXISTING TABLES IF THEY EXIST (To start fresh if needed)
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. CREATE CATEGORIES TABLE
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Enable Row Level Security (RLS) for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy A: Allow anyone (Public) to read categories
CREATE POLICY "Allow public read access to categories" 
ON categories FOR SELECT 
TO public 
USING (true);

-- Policy B: Allow only Authenticated Users (Admins) to modify categories
CREATE POLICY "Allow admin write access to categories" 
ON categories FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- 3. CREATE MENU ITEMS TABLE
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'undetermined', 'weight')),
    badge TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster querying by category
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

-- Enable Row Level Security (RLS) for menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Policy A: Allow anyone (Public) to read menu items
CREATE POLICY "Allow public read access to menu_items" 
ON menu_items FOR SELECT 
TO public 
USING (true);

-- Policy B: Allow only Authenticated Users (Admins) to perform full CRUD on menu items
CREATE POLICY "Allow admin write access to menu_items" 
ON menu_items FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- 4. INSERT DEFAULT CATEGORIES
INSERT INTO categories (id, name, icon, "desc", sort_order) VALUES
('bedouin', 'القسم البدوي', 'fa-campground', 'جميع الوجبات تقدم مع: (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 1),
('grills', 'قسم المشويات', 'fa-fire-burner', 'جميع الوجبات تقدم مع: أرز + خضار + سلطة + عيش', 2),
('platters', 'قسم الصواني', 'fa-plate-wheat', 'صواني واحة الشيخ الملوكية الفاخرة المناسبة للعزائم واللمة البدوية', 3),
('tagines', 'قسم الطواجن', 'fa-mortar-pestle', 'طواجن فخار غنية مطبوخة على نار هادئة بطعم ونكهة ريفية وبدوية أصيلة', 4),
('mahshi', 'قسم المحاشي', 'fa-pepper-hot', 'محاشي بلدي طازجة وممبار غني محضر يومياً بأجود أنواع الأرز والخلطات السرية', 5),
('meals', 'قسم الوجبات', 'fa-bowl-rice', 'وجبات فردية متكاملة مغذية ومشبعة تلبي جميع الأذواق', 6),
('mandi', 'قسم المندي', 'fa-wheat-awn', 'وجبات المندي الفاخرة المطهية ببطء تحت الحفر البدوية التقليدية', 7),
('breakfast', 'قسم الفطور', 'fa-egg', 'أطباق فطور بدوي وشعبي تقليدي يبدأ به يومك بنشاط وطاقة', 8),
('drinks', 'قسم المشروبات', 'fa-mug-hot', 'مشروبات غازية منعشة وشاي زردة مطبوخ على الفحم بالطريقة البدوية', 9);


-- 5. INSERT DEFAULT MENU ITEMS
INSERT INTO menu_items (category_id, name, ingredients, price, price_type, badge) VALUES
-- === Bedouin (القسم البدوي) ===
('bedouin', 'ربع ضاني (أرز)', 'ربع ضاني + أرز + خضار + شوربة + سلطة + عيش', 275, 'fixed', NULL),
('bedouin', 'ربع ضاني (مكرونة)', 'ربع ضاني + مكرونة + خضار + شوربة + سلطة + عيش', 275, 'fixed', NULL),
('bedouin', 'ثلث ضاني', 'ثلث ضاني + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 450, 'fixed', NULL),
('bedouin', 'نصف ضاني', 'نصف ضاني + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 550, 'fixed', NULL),
('bedouin', 'كيلو ضاني', 'كيلو ضاني بلدي فاخر + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 1100, 'fixed', NULL),
('bedouin', 'ربع شمبري (أرز)', 'ربع شمبري + أرز + خضار + شوربة + سلطة + عيش', 250, 'fixed', NULL),
('bedouin', 'ربع شمبري (مكرونة)', 'ربع شمبري + مكرونة + خضار + شوربة + سلطة + عيش', 250, 'fixed', NULL),
('bedouin', 'نصف شمبري', 'نصف شمبري + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 500, 'fixed', NULL),
('bedouin', 'كيلو شمبري', 'كيلو شمبري بلدي ممتاز + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 1100, 'fixed', NULL),
('bedouin', 'موزة ضاني', 'موزة ضاني بلدي + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 0, 'undetermined', NULL),
('bedouin', 'نصف رأس ضاني', 'نصف رأس ضاني بلدي مطبوخ ببطء + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 200, 'fixed', NULL),
('bedouin', 'نصف ديك بلدي', 'نصف ديك بلدي محمر + (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 300, 'fixed', NULL),
('bedouin', 'جوز حمام', 'جوز حمام محشي أرز + شوربة حمام غنية + خضار + سلطة + عيش', 0, 'undetermined', NULL),
('bedouin', 'ربع فراخ', 'ربع فراخ بلدي + أرز + خضار + شوربة + سلطة + عيش', 150, 'fixed', NULL),
('bedouin', 'نصف فراخ', 'نصف فراخ بلدي + أرز + خضار + شوربة + سلطة + عيش', 300, 'fixed', NULL),
('bedouin', 'فرخة كاملة', 'فرخة بلدي كاملة + أرز + خضار + شوربة + سلطة + عيش', 600, 'fixed', NULL),

-- === Grills (قسم المشويات) ===
('grills', 'ربع ريش', 'ربع كيلو ريش ضاني مشوية على الفحم + أرز + خضار + سلطة + عيش', 300, 'fixed', NULL),
('grills', 'نصف ريش', 'نصف كيلو ريش ضاني مشوية على الفحم + أرز + خضار + سلطة + عيش', 600, 'fixed', NULL),
('grills', 'كيلو ريش', 'كيلو ريش ضاني بلدي مشوية على الفحم + أرز + خضار + سلطة + عيش', 1200, 'fixed', NULL),
('grills', 'ربع كفتة', 'ربع كيلو كفتة مشوية على الفحم + أرز + خضار + سلطة + عيش', 300, 'fixed', NULL),
('grills', 'نصف كفتة', 'نصف كيلو كفتة مشوية على الفحم + أرز + خضار + سلطة + عيش', 600, 'fixed', NULL),
('grills', 'ربع فليتو', 'ربع كيلو لحم فليتو مشوي فاخر + أرز + خضار + سلطة + عيش', 0, 'undetermined', NULL),
('grills', 'ربع طرب', 'ربع كيلو طرب مشوي بدوي على الفحم + أرز + خضار + سلطة + عيش', 300, 'fixed', NULL),
('grills', 'نصف طرب', 'نصف كيلو طرب مشوي على الفحم + أرز + خضار + سلطة + عيش', 600, 'fixed', NULL),
('grills', 'كيلو طرب', 'كيلو طرب بلدي مشوي على الفحم + أرز + خضار + سلطة + عيش', 1200, 'fixed', NULL),

-- === Platters (قسم الصواني) ===
('platters', 'صينية الشيخ', 'تشكيلة ملوكية فاخرة من اللحوم والمشويات والأرز البدوي الخاص بطابع واحة الشيخ المميز', 0, 'undetermined', NULL),
('platters', 'صينية لم الشمل', 'صينية غنية باللحوم المتنوعة والأرز تكفي العائلة الكريمة وتجسد كرم الضيافة البدوية', 0, 'undetermined', NULL),
('platters', 'صينية الدب الروسي', 'وجبة عملاقة ومشبعة جداً من اللحوم البلدية والخلطات المميزة للباحثين عن القوة والامتلاء', 0, 'undetermined', NULL),
('platters', 'صينية خروف مندي', 'خروف بلدي مندي كامل مطبوخ بالحفرة البدوية يفرش فوق أرز المندي الفاخر والمكسرات والزبيب وجوانب الخضار والسلطات', 0, 'weight', NULL),
('platters', 'صينية نصف خروف مندي', 'نصف خروف بلدي مندي مطهو ببطء فوق أرز مندي بدوي فاخر بمكسرات وخضار وسلطات وشوربة متكاملة', 0, 'weight', NULL),

-- === Tagines (قسم الطواجن) ===
('tagines', 'طاجن كوارع', 'كوارع بلدية مخلية ومطبوخة ببطء بداخل طاجن الفخار بالفرن بخلطة الثوم والخل الغنية', 0, 'undetermined', NULL),
('tagines', 'طاجن خضار مشكل باللحم', 'خضروات موسمية طازجة مطبوخة مع قطع لحم بلدي ذائب في طاجن فخار بدوي عتيق بالفرن', 0, 'undetermined', NULL),
('tagines', 'طاجن بامية باللحم', 'بامية بلدية صغيرة مطهوة بلحم الضاني الذائب والتمر الهندي وعصير الطماطم الفريش بالفرن', 0, 'undetermined', NULL),
('tagines', 'طاجن ملوخية خضراء', 'ملوخية خضراء طازجة بطشة الثوم والكزبرة الذهبية بالفرن بمرقة اللحم الغنية', 0, 'undetermined', NULL),

-- === Mahshi (قسم المحاشي) ===
('mahshi', 'كيلو محشي مشكل', 'تشكيلة رائعة من محشي الكرنب، الكوسا، الباذنجان، والفلفل بخلطة واحة الشيخ السرية والسمن البلدي', 0, 'undetermined', NULL),
('mahshi', 'كيلو ممبار', 'ممبار بلدي محشي بالأرز المتبل المقرمش المحمر بالسمن البلدي الساخن', 0, 'undetermined', NULL),
('mahshi', 'نصف كيلو محشي مشكل', 'نصف كيلو من تشكيلة المحاشي المشكلة اللذيذة والساخنة', 0, 'undetermined', NULL),
('mahshi', 'نصف كيلو ممبار', 'نصف كيلو ممبار بلدي محمر مقرمش ولذيذ', 0, 'undetermined', NULL),

-- === Meals (قسم الوجبات) ===
('meals', 'وجبة ربع فرخة مشوي', 'ربع فرخة متبلة ومسحبة مشوية على الفحم تقدم مع: (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 0, 'undetermined', NULL),
('meals', 'وجبة نصف فرخة مشوي', 'نصف فرخة متبلة مشوية على الفحم ببطء تقدم مع: (أرز أو مكرونة) + خضار + شوربة + سلطة + عيش', 0, 'undetermined', NULL),
('meals', 'وجبة شيش طاووق', 'شيش طاووق دجاج بلدي متبل ومحمر على الفحم يقدم مع: أرز + خضار + سلطة + عيش', 0, 'undetermined', NULL),
('meals', 'وجبة ميكس', 'تشكيلة متكاملة من كفتة اللحم المشوي، شيش طاووق الدجاج، والريش تقدم مع أرز بدوي غني وسلطات متكاملة', 0, 'undetermined', NULL),
('meals', 'وجبة مشكل مشوي', 'مشكل مشويات كفتة وطرب وريش فاخرة تقدم مع الأرز البدوي المميز والخضار والعيش الساخن', 0, 'undetermined', NULL);

-- === Mandi (قسم المندي) ===
INSERT INTO menu_items (category_id, name, ingredients, price, price_type, badge) VALUES
('mandi', 'وجبة ربع ضاني مندي', 'ربع ضاني مندي بلدي ذائب مطهو ببطء بالحفرة تقدم مع أرز مندي فاخر، خضار سوتيه، شوربة، وسلطات', 0, 'undetermined', NULL),
('mandi', 'وجبة ربع شمبري مندي', 'ربع شمبري بلدي مندي مطبوخ تحت الأرض يقدم مع أرز مندي بدوي فاخر، خضار، شوربة وسلطات', 0, 'undetermined', NULL),
('mandi', 'وجبة ربع فراخ مندي', 'ربع دجاجة مندي بلدي متبلة بالبهارات البدوية ومطهية ببطء تقدم مع الأرز المندي اللذيذ وخضار وسلطة', 0, 'undetermined', NULL);

-- === Breakfast (قسم الفطور) ===
INSERT INTO menu_items (category_id, name, ingredients, price, price_type, badge) VALUES
('breakfast', 'عدس + فول + مخلل + عيش', 'عدس مطبوخ بالسمن البلدي + فول مدمس غني + مخلل بلدي مشكل + عيش ساخن من الفرن', 0, 'undetermined', NULL),
('breakfast', 'كمونية', 'قطع لحم وكبدة بلدية مطهوة بالثوم والكمون والصلصة البدوية الغنية تقدم ساخنة مع العيش البلدي', 0, 'undetermined', NULL),
('breakfast', 'قلاية', 'شرايح لحم بلدي طازج مقلية مع الطماطم، الفلفل الحار، والبصل بالسمن البدوي الساخن والعيش', 0, 'undetermined', NULL),
('breakfast', 'تحميرة لحمة', 'قطع وشرايح لحم بلدي طازجة محمرة بالدهن والخميرة الطبيعية المتبلة على الطريقة البدوية الأصيلة', 0, 'undetermined', NULL);

-- === Drinks (قسم المشروبات) ===
INSERT INTO menu_items (category_id, name, ingredients, price, price_type, badge) VALUES
('drinks', 'بيبسي', 'عبوة بيبسي مثلجة ومنعشة', 0, 'undetermined', NULL),
('drinks', 'سفن أب', 'عبوة سفن أب غازية مثلجة ومنعشة ومقاومة للحر', 0, 'undetermined', NULL),
('drinks', 'براد شاي زردة أحمر', 'شاي زردة أحمر بدوي أصيل مغلي على الفحم مع النعناع أو الحبق ببراد ألومنيوم تقليدي', 0, 'undetermined', NULL),
('drinks', 'براد شاي زردة أخضر', 'شاي زردة أخضر خفيف وصحي مغلي على جمر الفحم مع النعناع الطازج في براد بدوي تقليدي', 0, 'undetermined', NULL);
