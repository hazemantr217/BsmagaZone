// Supabase configuration and tracking library for BsmagaZone
const SUPABASE_URL = "https://vdxkzgccwuojjkxmebdx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeGt6Z2Njd3VvampreG1lYmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE0OTUsImV4cCI6MjA5NzA4NzQ5NX0.MZ_P82DBjPoDyVa55V5-V4hwA5VeLkcBTU6CvG1bThY";

let supabaseClient = null;

// Initialize Supabase Client
function getSupabaseClient() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// Helper to get device info
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Browser";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Trident") > -1) browser = "IE";
    else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";

    let deviceType = "desktop";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        deviceType = /iPad/i.test(ua) ? "tablet" : "mobile";
    }

    return {
        browser,
        deviceType,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || navigator.userLanguage,
        userAgent: ua
    };
}

// Simple browser fingerprint generator
function generateFingerprint() {
    const devInfo = getDeviceInfo();
    const str = `${devInfo.userAgent}|${devInfo.screenResolution}|${devInfo.language}|${new Date().getTimezoneOffset()}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

// Initialize or retrieve student session
async function getOrCreateSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    let sessionId = localStorage.getItem("bsmaga_session_id");
    const storedName = localStorage.getItem("bsmaga_student_name") || null;
    const fingerprint = generateFingerprint();
    const devInfo = getDeviceInfo();

    if (sessionId) {
        try {
            // Update last visit
            await client
                .from("student_sessions")
                .update({ last_visit: new Date().toISOString(), student_name: storedName })
                .eq("id", sessionId);
            return sessionId;
        } catch (e) {
            console.error("Error updating session, creating a new one:", e);
        }
    }

    // Create a new session
    try {
        const { data, error } = await client
            .from("student_sessions")
            .insert({
                student_name: storedName,
                fingerprint: fingerprint,
                device_type: devInfo.deviceType,
                browser: devInfo.browser,
                ip_country: "unknown" // Handled by Supabase DB default or Edge Functions if available, or just leave as is
            })
            .select("id")
            .single();

        if (error) throw error;
        if (data && data.id) {
            localStorage.setItem("bsmaga_session_id", data.id);
            return data.id;
        }
    } catch (e) {
        console.error("Error creating student session:", e);
    }
    return null;
}

// Track page visit
async function trackPageVisit(pageName, pageType) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const sessionId = await getOrCreateSession();
        if (!sessionId) return;

        const { data, error } = await client
            .from("page_visits")
            .insert({
                session_id: sessionId,
                page_name: pageName,
                page_type: pageType
            })
            .select("id")
            .single();

        if (error) throw error;

        // Keep track of visit record to update time_on_page on unload
        if (data && data.id) {
            const startTime = Date.now();
            window.addEventListener("beforeunload", async () => {
                const timeSpent = Math.round((Date.now() - startTime) / 1000);
                // We use standard fetch to update or keep it simple
                // navigator.sendBeacon is more reliable for unload, but a simple updates query is fine
                const anonClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                await anonClient
                    .from("page_visits")
                    .update({ time_on_page_seconds: timeSpent })
                    .eq("id", data.id);
            });
        }
    } catch (e) {
        console.error("Error tracking page visit:", e);
    }
}

// Track exam result
async function trackExamResult(examSlug, subjectSlug, score, totalQuestions, timeSpentSeconds, answers) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        const sessionId = await getOrCreateSession();
        if (!sessionId) return;

        // Find exam and its linked subject ID directly
        const { data: examData } = await client
            .from("exams")
            .select("id, subject_id")
            .eq("slug", examSlug)
            .single();

        if (!examData) {
            console.error("Exam not found in Supabase database");
            return;
        }

        const percentage = (score / totalQuestions) * 100;

        await client
            .from("exam_results")
            .insert({
                session_id: sessionId,
                exam_id: examData.id,
                subject_id: examData.subject_id,
                score: score,
                total_questions: totalQuestions,
                percentage: parseFloat(percentage.toFixed(2)),
                time_spent_seconds: timeSpentSeconds,
                answers: answers,
                started_at: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
                completed_at: new Date().toISOString()
            });
    } catch (e) {
        console.error("Error tracking exam result:", e);
    }
}

// Set student name
async function setStudentName(name) {
    localStorage.setItem("bsmaga_student_name", name);
    const sessionId = localStorage.getItem("bsmaga_session_id");
    const client = getSupabaseClient();
    if (sessionId && client) {
        try {
            await client
                .from("student_sessions")
                .update({ student_name: name })
                .eq("id", sessionId);
        } catch (e) {
            console.error("Error updating student name in session:", e);
        }
    }
}

// Helper to map exam file names to subjects
function getSubjectSlugFromExamFilename(filename) {
    if (filename.includes("امتحان-بحث")) return "subject2";
    if (filename.includes("امتحان-مجتمعات")) return "subject3";
    if (filename.includes("امتحان-جماعات")) return "subject4";
    if (filename.includes("امتحان-ذوي")) return "subject5";
    if (filename.includes("امتحان-تقويم")) return "subject6";
    if (filename.includes("امتحان-تنمية")) return "subject7";
    if (filename.includes("امتحان")) return "subject1";
    return null;
}

// Auto page tracking on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    // Wait for supabase to load if needed
    let retries = 0;
    while (!window.supabase && retries < 15) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }
    
    // Determine page name and page type
    const pathname = window.location.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1) || "index.html";
    const pageName = decodeURIComponent(filename.replace(".html", ""));
    
    // Don't track the admin page
    if (pageName === "admin") return;

    let pageType = "home";
    if (filename.startsWith("subject")) {
        pageType = "subject";
    } else if (filename.startsWith("الخريطة_الذهنية")) {
        pageType = "mindmap";
    } else if (filename.includes("امتحان")) {
        pageType = "exam";
    }
    
    await trackPageVisit(pageName, pageType);

    // Easter egg: Click "Created by Hazem Anter" 10 times consecutively within 1s interval to open admin.html
    let clickCount = 0;
    let lastClickTime = 0;
    document.addEventListener("click", (e) => {
        if (e.target && (
            e.target.classList.contains("hub-footer-text") ||
            (e.target.textContent && e.target.textContent.trim().includes("Created by Hazem Anter"))
        )) {
            const currentTime = Date.now();
            if (currentTime - lastClickTime < 1000) {
                clickCount++;
                if (clickCount >= 10) {
                    window.location.href = "admin.html";
                    clickCount = 0;
                }
            } else {
                clickCount = 1;
            }
            lastClickTime = currentTime;
        }
    });
});
