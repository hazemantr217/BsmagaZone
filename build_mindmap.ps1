$sourcePath = "C:\Users\HAZEM-\Desktop\Hazem\New folder\الموقع الشامل لكل الامتحانات\الخريطة_الذهنية_مجتمعات.html"
$destPath = "C:\Users\HAZEM-\Desktop\Hazem\New folder\الموقع الشامل لكل الامتحانات\الخريطة_الذهنية_ذوي.html"

# Read file contents with correct encoding
$html = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)

# 1. Update Title
$html = $html.Replace('<title>نماذج ونظريات للعمل مع المجتمعات - الخريطة الذهنية</title>', '<title>الخدمة الاجتماعية في مجال ذوي الاحتياجات - الخريطة الذهنية</title>')

# 2. Update Header Title
$html = $html.Replace('<span class="desktop-text">الخريطة الذهنية - نماذج ونظريات للعمل مع المجتمعات</span>', '<span class="desktop-text">الخريطة الذهنية - الخدمة الاجتماعية في مجال ذوي الاحتياجات</span>')

# 3. Replace Navigation Pills (Using Regex)
$navPillsRegex = [regex]'(?s)<div class="nav-grid-container">.*?</div>\s*<!-- Controls Row -->'
$newNavPills = @"
<div class="nav-grid-container">
    <button class="nav-pill" data-color="1" onclick="scrollToCard(1); collapseHeaderMobile()">
        <i class="fas fa-book"></i> مفاهيم أساسية
    </button>
    <button class="nav-pill" data-color="2" onclick="scrollToCard(2); collapseHeaderMobile()">
        <i class="fas fa-hourglass-half"></i> التطور التاريخي
    </button>
    <button class="nav-pill" data-color="3" onclick="scrollToCard(3); collapseHeaderMobile()">
        <i class="fas fa-dna"></i> مسببات وأنواع
    </button>
    <button class="nav-pill" data-color="4" onclick="scrollToCard(4); collapseHeaderMobile()">
        <i class="fas fa-tools"></i> استراتيجيات التأهيل
    </button>
</div>
<!-- Controls Row -->
"@
$html = $navPillsRegex.Replace($html, $newNavPills)

# 4. Replace Network Grid Content
$mainContentRegex = [regex]'(?s)<div class="network-grid">.*?</div>\s*</div>\s*</main>'

$newContent = @"
<div class="network-grid">
<!-- Central Card -->
<div class="network-center">
    <h2><i class="fas fa-wheelchair"></i> الخدمة الاجتماعية في مجال ذوي الاحتياجات الخاصة</h2>
    <p>الخريطة الذهنية الشاملة (المفاهيم - التطور التاريخي - المسببات - استراتيجيات التأهيل)</p>
</div>

<!-- Card 1 -->
<div class="network-card" data-branch="1">
    <div class="network-card-header" onclick="toggleNetworkCard(this.parentElement)">
        <h3>📘 1️⃣ مفاهيم ومصطلحات أساسية</h3>
        <i class="fas fa-chevron-down toggle-icon"></i>
    </div>
    <div class="network-card-body">
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>المفهوم</th>
                    <th>التفاصيل والشرح</th>
                    <th>ملاحظات هامة</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="cell-blue"><b>الإعاقة (Disability)</b></td>
                    <td>قصور أو عيب (بدني، عقلي، أو نفسي) يمنع الفرد من أداء أدواره الاجتماعية بشكل طبيعي مقارنة بأقرانه في نفس العمر والبيئة.</td>
                    <td>تركز على الأثر الاجتماعي والوظيفي للقصور.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>القصور / الإصابة (Impairment)</b></td>
                    <td>فقدان أو شذوذ في الهيكل التشريحي أو الوظيفة الفسيولوجية أو النفسية للفرد (مثل فقدان طرف أو تلف في شبكية العين).</td>
                    <td>منظمة الصحة العالمية (WHO): تعتبره الجانب الطبي أو العضوي للمشكلة.</td>
                </tr>
                <tr>
                    <td class="cell-green"><b>العائق / العاهة (Handicap)</b></td>
                    <td>النتيجة الاجتماعية أو البيئية المترتبة على الإصابة والإعاقة، والتي تحد من قدرة الفرد على التفاعل مع بيئته.</td>
                    <td>يمثل التفاعل السلبي بين الفرد ذو الإعاقة والبيئة المحيطة به.</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Card 2 -->
<div class="network-card" data-branch="2">
    <div class="network-card-header" onclick="toggleNetworkCard(this.parentElement)">
        <h3>⏳ 2️⃣ التطور التاريخي ونظرة المجتمعات</h3>
        <i class="fas fa-chevron-down toggle-icon"></i>
    </div>
    <div class="network-card-body">
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>الحقبة / الشخصية</th>
                    <th>الموقف التاريخي من ذوي الاحتياجات الخاصة</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="cell-purple"><b>العصور البدائية ومجتمع إسبرطة</b></td>
                    <td>كانت النظرة سلبية جداً؛ ساد الاعتقاد بأن الإعاقة لعنة أو غضب من الأرواح الشريرة. في إسبرطة سادت نظرة قاسية تعتمد على التخلص من المعوقين بالقتل أو النبذ أو تركهم للموت، إيماناً بضرورة بقاء الأصلح للحرب. كانوا يتخلصون من الأطفال الضعفاء لعدم صلاحيتهم للجيش.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>نظرية داروين</b></td>
                    <td>استُغلت نظريته عن "البقاء للأصلح" كمبرر لرفض رعاية الفئات الضعيفة، بحجة أن الطبيعة تتخلص منهم تدريجياً.</td>
                </tr>
                <tr>
                    <td class="cell-green"><b>الديانات السماوية (العصور الوسطى)</b></td>
                    <td>تغيرت النظرة لتصبح أكثر إنسانية ورحمة. حثت على العناية بالضعفاء والمرضى، وأعطى الإسلام حقوقاً للمكفوفين وحث على رعايتهم كدعوة للتكافل والصدقة.</td>
                </tr>
                <tr>
                    <td class="cell-blue"><b>الخليفة عمر بن عبد العزيز</b></td>
                    <td>حث على إحصاء المعوقين، وخصص مرافقاً لكل كفيف وخادماً لكل مقعد.</td>
                </tr>
                <tr>
                    <td class="cell-purple"><b>البيمارستانات (الحضارة الإسلامية)</b></td>
                    <td>ظهور نظام الأوقاف والمستشفيات كمؤسسات رائدة لتقديم العلاج الطبي والنفسي ورعاية المرضى والعاجزين وذوي العاهات.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>العصر الحديث والقرن العشرين</b></td>
                    <td>البداية الحقيقية المنظمة للرعاية بسبب الأعداد الهائلة من الإصابات والعاهات التي خلفتها الحروب العالمية. تحولت الرعاية من مجرد "إحسان وشفقة" إلى "حقوق إنسانية، تأهيل، ودمج".</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Card 3 -->
<div class="network-card" data-branch="3">
    <div class="network-card-header" onclick="toggleNetworkCard(this.parentElement)">
        <h3>🧬 3️⃣ مسببات وأنواع الإعاقة</h3>
        <i class="fas fa-chevron-down toggle-icon"></i>
    </div>
    <div class="network-card-body">
        <div class="network-subsection-title"><i class="fas fa-exclamation-triangle"></i> مسببات الإعاقة</div>
        <table class="comparison-table" style="margin-bottom: 1.5rem;">
            <thead>
                <tr>
                    <th>السبب</th>
                    <th>التفاصيل الهامة</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="cell-blue"><b>أسباب بيئية (مكتسبة)</b></td>
                    <td>مثل حوادث المرور وإصابات العمل، وهي تقع للإنسان بعد ولادته السليمة.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>التقدم التكنولوجي والصناعي</b></td>
                    <td>أدى التقدم التكنولوجي وتعقيدات الآلات وحوادث الطرق إلى زيادة ملحوظة في نسبة الإصابات.</td>
                </tr>
                <tr>
                    <td class="cell-green"><b>تزايد نسبة كبار السن</b></td>
                    <td>ازدياد متوسط العمر يؤدي لظهور أمراض الشيخوخة والإعاقات المصاحبة مثل ضعف السمع والبصر.</td>
                </tr>
                <tr>
                    <td class="cell-purple"><b>أسباب وراثية</b></td>
                    <td>اضطرابات الكروموسومات تعتبر من أهم مسببات الإعاقات العقلية (كمتلازمة داون) والبصرية.</td>
                </tr>
            </tbody>
        </table>

        <div class="network-subsection-title"><i class="fas fa-wheelchair"></i> أنواع الإعاقات والآثار المترتبة</div>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>النوع / الأثر</th>
                    <th>التفاصيل الهامة</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="cell-blue"><b>الإعاقات الحسية</b></td>
                    <td>هي التي تصيب حواس الاستقبال، مثل كف البصر (المكفوفين) والصمم.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>الإعاقة البصرية</b></td>
                    <td>ليست حالة واحدة، بل طيف يبدأ من ضعف البصر وينتهي بالكف الكلي.<br><b>(طريقة برايل: نظام قراءة يعتمد على حاسة اللمس - النقاط البارزة - مخصص للمكفوفين كلياً).</b></td>
                </tr>
                <tr>
                    <td class="cell-green"><b>الإعاقة العقلية</b></td>
                    <td>هي توقف أو قصور في النمو العقلي يظهر قبل سن 18 ويستمر مدى الحياة، وليست مرضاً نفسياً قابلاً للشفاء.</td>
                </tr>
                <tr>
                    <td class="cell-purple"><b>تصنيف التخلف العقلي (حسب الذكاء IQ)</b></td>
                    <td>
                        يُقاس بناءً على اختبارات الذكاء (IQ) وينقسم لعدة فئات تحدد مدى قدرة الحالة على التعلم أو التدريب أو الاعتماد على الغير:
                        <ul style="margin-top: 5px; padding-right: 20px;">
                            <li><b>أقل من 25 درجة:</b> تخلف عقلي شديد وعميق (فئة الاعتماديون لعجزهم عن حماية أنفسهم).</li>
                            <li><b>التخلف البسيط:</b> القابلون للتعلم.</li>
                            <li><b>التخلف المعتدل:</b> القابلون للتدريب.</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td class="cell-blue"><b>أثر الإعاقة المفاجئة</b></td>
                    <td>تسبب صدمة نفسية، شعوراً بالنقص والإحباط، وميلاً للانطواء.</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Card 4 -->
<div class="network-card" data-branch="4">
    <div class="network-card-header" onclick="toggleNetworkCard(this.parentElement)">
        <h3>🛠️ 4️⃣ استراتيجيات التأهيل والتدخل المهني</h3>
        <i class="fas fa-chevron-down toggle-icon"></i>
    </div>
    <div class="network-card-body">
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>المفهوم / الخطوة</th>
                    <th>الأهمية والتطبيق في الخدمة الاجتماعية</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="cell-blue"><b>النظرة الكلية للإنسان</b></td>
                    <td>الإنسان وحدة لا تتجزأ؛ فالمرض الجسمي يؤثر على النفس، والعكس صحيح.</td>
                </tr>
                <tr>
                    <td class="cell-green"><b>فلسفة التأهيل</b></td>
                    <td>تعتمد أساساً على استثمار <b>"القدرات المتبقية"</b> وتنميتها، بدلاً من التركيز على ما فُقد.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>أول خطوة عملية (الحصر والتشخيص)</b></td>
                    <td>لا يمكن تقديم أي خدمات تأهيلية صحيحة دون حصر أعداد المعوقين وتشخيص نوع ودرجة الإعاقة بدقة، وهي <b>حجر الأساس</b> لبناء أي خطة تدخل مهني وتأهيل.</td>
                </tr>
                <tr>
                    <td class="cell-purple"><b>التأهيل الطبي</b></td>
                    <td>هو الخطوة الأولى لاسترداد أقصى قدرة بدنية ممكنة <b>قبل</b> بدء التأهيل المهني والاجتماعي.</td>
                </tr>
                <tr>
                    <td class="cell-blue"><b>مبدأ التقبل المهني</b></td>
                    <td>موقف إيجابي يقبل فيه الأخصائي الاجتماعي المعوق كما هو عليه باحترام وتقدير، دون استهزاء أو شفقة مبالغ فيها، وهو <b>الأساس لنجاح العلاقة المهنية</b> وإشعار المعوق بأهميته وتقبله لظروفه. نظرة المجتمع السلبية (الشفقة أو النفور) تؤثر بشدة على تكيف المعوق.</td>
                </tr>
                <tr>
                    <td class="cell-green"><b>الدمج (Mainstreaming / Inclusion)</b></td>
                    <td>إشراك ذوي الاحتياجات الخاصة وإلحاق الأطفال المعوقين في البيئات الطبيعية (مثل المدارس العادية، العمل، المجتمع) بدلاً من عزلهم في مؤسسات خاصة. يهدف لتعديل اتجاهات المجتمع السلبية، زيادة التفاعل الاستقلالية وتقليل العزلة. المدارس الداخلية تعتبر بيئة أكثر تقييداً وتعزل الطفل.</td>
                </tr>
                <tr>
                    <td class="cell-orange"><b>الإرشاد الأسري</b></td>
                    <td>يركز على الأسرة ككل كنسق متكامل، فتوجيه الأسرة هو أساس نجاح تأهيل الطفل لأن مشكلاتها تتفاعل مع المجالات الأخرى وتعتبر النظام الاجتماعي الرئيسي.</td>
                </tr>
                <tr>
                    <td class="cell-purple"><b>فريق العمل التأهيلي</b></td>
                    <td>مجموعة من المتخصصين (طبيب، أخصائي اجتماعي، نفسي، علاج طبيعي، مهني) يعملون معاً لتقييم وعلاج الحالة. <b>دور الأخصائي الاجتماعي:</b> ربط التخصصات ببعضها، دراسة البيئة الأسرية، وتذليل العقبات الاجتماعية.</td>
                </tr>
                <tr>
                    <td class="cell-blue"><b>تقسيم العمل (الصناعة)</b></td>
                    <td>ساعد تخصص الأداء في فتح مجالات لتوظيف المعوقين بما يتناسب مع قدراتهم المتبقية.</td>
                </tr>
                <tr>
                    <td class="cell-green"><b>الرعاية اللاحقة (المتابعة)</b></td>
                    <td>لا تنتهي بتشغيل المعوق، بل تستمر للتأكد من استقراره وتذليل العقبات لمنع انتكاسه. إهمال التأهيل بشكل عام يحول المعوقين لطاقات معطلة وقد يؤدي للانحراف.</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
</div>
</div>
</main>
"@

$html = $mainContentRegex.Replace($html, $newContent)

# 5. Clean up JS specific to the other page (card names for search)
$jsRegex = [regex]"(?s)const cardNames = \{.*?\};"
$newJs = @"
const cardNames = {
        '1': '📘 مفاهيم أساسية',
        '2': '⏳ التطور التاريخي',
        '3': '🧬 مسببات وأنواع',
        '4': '🛠️ استراتيجيات التأهيل'
    };
"@
$html = $jsRegex.Replace($html, $newJs)

# Write to destination file
[System.IO.File]::WriteAllText($destPath, $html, [System.Text.Encoding]::UTF8)
Write-Output "Successfully created $destPath"
