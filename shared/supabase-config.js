// Supabase configuration and secure visitor tracking for BsmagaZone
const SUPABASE_URL = "https://vdxkzgccwuojjkxmebdx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeGt6Z2Njd3VvampreG1lYmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE0OTUsImV4cCI6MjA5NzA4NzQ5NX0.MZ_P82DBjPoDyVa55V5-V4hwA5VeLkcBTU6CvG1bThY";

const SESSION_ID_KEY = "bsmaga_session_id";
const SESSION_TOKEN_KEY = "bsmaga_session_token";
const STUDENT_NAME_KEY = "bsmaga_student_name";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

function getSessionSupabaseClient(credentials) {
    if (!window.supabase || !credentials) return null;

    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                "x-bsmaga-session-id": credentials.id,
                "x-bsmaga-session-token": credentials.token
            }
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

function generateClientUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
    return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10, 16).join("")
    ].join("-");
}

function getStoredSessionCredentials() {
    const id = localStorage.getItem(SESSION_ID_KEY);
    const token = localStorage.getItem(SESSION_TOKEN_KEY);

    if (!id || !token || !UUID_PATTERN.test(id) || !UUID_PATTERN.test(token)) {
        localStorage.removeItem(SESSION_ID_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        return null;
    }

    return { id, token };
}

function clearStoredSessionCredentials() {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
}

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

function generateFingerprint() {
    const devInfo = getDeviceInfo();
    const input = `${devInfo.userAgent}|${devInfo.screenResolution}|${devInfo.language}|${new Date().getTimezoneOffset()}`;
    let hash = 0;
    for (let index = 0; index < input.length; index++) {
        hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(16);
}

async function getOrCreateSessionCredentials() {
    const baseClient = getSupabaseClient();
    if (!baseClient) return null;

    const studentName = (localStorage.getItem(STUDENT_NAME_KEY) || "").trim().slice(0, 150) || null;
    const existing = getStoredSessionCredentials();

    if (existing) {
        const sessionClient = getSessionSupabaseClient(existing);
        const { data, error } = await sessionClient
            .from("student_sessions")
            .update({
                last_visit: new Date().toISOString(),
                student_name: studentName
            })
            .eq("id", existing.id)
            .select("id")
            .maybeSingle();

        if (!error && data?.id === existing.id) return existing;
        clearStoredSessionCredentials();
    }

    const created = {
        id: generateClientUuid(),
        token: generateClientUuid()
    };
    const sessionClient = getSessionSupabaseClient(created);
    const deviceInfo = getDeviceInfo();
    const { error } = await sessionClient
        .from("student_sessions")
        .insert({
            id: created.id,
            client_token: created.token,
            student_name: studentName,
            fingerprint: generateFingerprint(),
            device_type: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            ip_country: "unknown"
        });

    if (error) {
        console.error("Error creating student session:", error);
        return null;
    }

    localStorage.setItem(SESSION_ID_KEY, created.id);
    localStorage.setItem(SESSION_TOKEN_KEY, created.token);
    return created;
}

async function getOrCreateSession() {
    const credentials = await getOrCreateSessionCredentials();
    return credentials?.id || null;
}

async function trackPageVisit(pageName, pageType) {
    try {
        const credentials = await getOrCreateSessionCredentials();
        const client = getSessionSupabaseClient(credentials);
        if (!client || !credentials) return;

        const { data, error } = await client
            .from("page_visits")
            .insert({
                session_id: credentials.id,
                page_name: String(pageName || "unknown").slice(0, 160),
                page_type: String(pageType || "page").slice(0, 40)
            })
            .select("id")
            .single();

        if (error) throw error;
        if (!data?.id) return;

        const startTime = Date.now();
        window.addEventListener("pagehide", () => {
            const timeSpent = Math.min(86400, Math.max(0, Math.round((Date.now() - startTime) / 1000)));
            fetch(`${SUPABASE_URL}/rest/v1/page_visits?id=eq.${encodeURIComponent(data.id)}`, {
                method: "PATCH",
                keepalive: true,
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal",
                    "x-bsmaga-session-id": credentials.id,
                    "x-bsmaga-session-token": credentials.token
                },
                body: JSON.stringify({ time_on_page_seconds: timeSpent })
            }).catch(error => console.error("Error finalizing page visit:", error));
        }, { once: true });
    } catch (error) {
        console.error("Error tracking page visit:", error);
    }
}

async function trackExamResult(examSlug, subjectSlug, score, totalQuestions, timeSpentSeconds, answers) {
    const publicClient = getSupabaseClient();
    if (!publicClient) return;

    try {
        const credentials = await getOrCreateSessionCredentials();
        const sessionClient = getSessionSupabaseClient(credentials);
        if (!sessionClient || !credentials) return;

        const { data: examData, error: examError } = await publicClient
            .from("exams")
            .select("id, subject_id")
            .eq("slug", examSlug)
            .single();

        if (examError || !examData) throw examError || new Error("Exam not found");

        const safeTotal = Number(totalQuestions);
        const safeScore = Number(score);
        const safeSeconds = Math.min(86400, Math.max(0, Number(timeSpentSeconds) || 0));
        const percentage = safeTotal > 0 ? (safeScore / safeTotal) * 100 : 0;
        const { error } = await sessionClient
            .from("exam_results")
            .insert({
                session_id: credentials.id,
                exam_id: examData.id,
                subject_id: examData.subject_id,
                score: safeScore,
                total_questions: safeTotal,
                percentage: Number(percentage.toFixed(2)),
                time_spent_seconds: safeSeconds,
                answers,
                started_at: new Date(Date.now() - safeSeconds * 1000).toISOString(),
                completed_at: new Date().toISOString()
            });

        if (error) throw error;
    } catch (error) {
        console.error("Error tracking exam result:", error);
    }
}

async function setStudentName(name) {
    const safeName = String(name || "").trim().slice(0, 150);
    if (safeName) localStorage.setItem(STUDENT_NAME_KEY, safeName);
    else localStorage.removeItem(STUDENT_NAME_KEY);

    try {
        const credentials = await getOrCreateSessionCredentials();
        const client = getSessionSupabaseClient(credentials);
        if (!client || !credentials) return;

        const { error } = await client
            .from("student_sessions")
            .update({ student_name: safeName || null })
            .eq("id", credentials.id);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating student name in session:", error);
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
