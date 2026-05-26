// ============================================
// UTILITY FUNCTIONS
// ============================================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c'];
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            if (Math.random() > 0.5) confetti.style.borderRadius = '50%';
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }, i * 15);
    }
}

// ============================================
// THEME MANAGEMENT
// ============================================
const THEME_KEY = 'exam_theme';
function setTheme(name) {
    document.body.classList.remove('light-mode', 'pro-mode', 'contrast-mode');
    if (name) document.body.classList.add(name);
    localStorage.setItem(THEME_KEY, name);
    // Close theme dropdown after selection
    const dropdown = document.querySelector('.theme-dropdown');
    if (dropdown) dropdown.classList.remove('active');
}
function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) setTheme(saved);
}

function toggleThemeDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.querySelector('.theme-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeThemeDropdown() {
    const dropdown = document.querySelector('.theme-dropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Close theme dropdown when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.querySelector('.theme-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ============================================
// MIND MAP
// ============================================
function openMindMap() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('mindmap-page').style.display = 'block';
}

function closeMindMap() {
    document.getElementById('mindmap-page').style.display = 'none';
    document.getElementById('landing-page').style.display = 'flex';
}

function toggleNode(node) {
    node.classList.toggle('collapsed');
}

// ============================================
// GLOBAL STATE
// ============================================
let shuffledQuestions = [];
let currentPage = 1;
const questionsPerPage = 70;
let totalPages = 1;
let timerInterval = null;
let userAnswers = {};
let score = 0;
let currentMode = 'practice';

// ============================================
// LOCAL STORAGE
// ============================================
const STORAGE_KEY = 'exam_v5';
const TIME_KEY = 'exam_time_v5';

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userAnswers, score, currentMode }));
}
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        userAnswers = data.userAnswers || {};
        score = data.score || 0;
        currentMode = data.currentMode || 'practice';
        return true;
    }
    return false;
}
function saveTime(t) { localStorage.setItem(TIME_KEY, t); }
function loadTime() { const t = localStorage.getItem(TIME_KEY); return t ? parseInt(t) : null; }
function clearState() { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(TIME_KEY); }

// ============================================
// MODE SWITCHING
// ============================================
function startExam() {
    currentMode = 'practice';
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('exam-interface').style.display = 'block';

    const liveScore = document.getElementById('score-live-container');
    liveScore.style.display = 'block';

    initExam();
}

function backToMenu() {
    if (Object.keys(userAnswers).length > 0 && !confirm('سيتم فقدان إجاباتك. متأكد؟')) return;
    stopTimer();
    clearState();
    userAnswers = {};
    score = 0;
    shuffledQuestions = [];

    // Go back to index.html
    window.location.href = 'index.html';
}

// ============================================
// PROGRESS & SCORE
// ============================================
function updateProgress() {
    const answered = Object.keys(userAnswers).length;
    const total = shuffledQuestions.length;
    document.getElementById('progress-bar').style.width = (answered / total * 100) + '%';
    document.getElementById('progress-text').textContent = `${answered} / ${total}`;
    // Update header score box
    const headerScore = document.getElementById('header-score');
    const headerTotal = document.getElementById('header-total');
    if (headerScore) headerScore.textContent = answered;
    if (headerTotal) headerTotal.textContent = total;
}

function updateLiveScore() {
    const total = shuffledQuestions.length;
    document.getElementById('live-score').textContent = score;
    document.getElementById('live-total').textContent = total;
    document.getElementById('live-percentage').textContent = total > 0 ? Math.round(score / total * 100) : 0;
    // Update header score box with correct answers
    const headerScore = document.getElementById('header-score');
    if (headerScore) headerScore.textContent = score;
}

// ============================================
// NAVIGATOR
// ============================================
function updateNavigator() {
    const container = document.getElementById('nav-buttons');
    if (!container) return;
    container.innerHTML = '';

    let answeredCount = 0;

    shuffledQuestions.forEach((q, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('nav-btn');
        btn.textContent = idx + 1;

        if (userAnswers[q.id]) {
            answeredCount++;
            btn.classList.add(currentMode === 'practice'
                ? (userAnswers[q.id].isCorrect ? 'correct' : 'wrong')
                : 'answered');
        }

        btn.onclick = () => {
            const card = document.querySelector(`.question-card[data-id="${q.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        container.appendChild(btn);
    });
}

// ============================================
// MOBILE NAVIGATOR
// ============================================
function toggleMobileNavigator() {
    const navigator = document.getElementById('question-navigator');

    if (navigator) {
        navigator.classList.toggle('active');
    }
}

function closeMobileNavigator() {
    const navigator = document.getElementById('question-navigator');

    if (navigator) navigator.classList.remove('active');
}


// ============================================
// ANSWER HANDLING
// ============================================
function checkAnswer(qId, ans) {
    const q = questions.find(x => x.id === qId);
    if (!q) return false;
    return q.type === 'tf' ? ans === q.correctAnswer : parseInt(ans) === q.correctAnswer;
}

function showFeedback(qId, correct) {
    const q = questions.find(x => x.id === qId);
    const card = document.querySelector(`.question-card[data-id="${qId}"]`);
    const exp = document.getElementById(`exp-${qId}`);
    const status = card.querySelector('.question-status');

    card.querySelectorAll('input').forEach(i => { i.disabled = true; i.parentElement.classList.add('disabled'); });

    const correctText = q.type === 'tf'
        ? (q.correctAnswer === 'true' ? 'صح' : 'خطأ')
        : q.options[q.correctAnswer];
    exp.querySelector('.correct-text-answer').textContent = correctText;

    if (correct) {
        card.classList.add('correct');
        status.textContent = '✓';
        status.style.color = 'var(--success-color)';
        exp.classList.add('correct-exp');
    } else {
        card.classList.add('wrong');
        status.textContent = '✗';
        status.style.color = 'var(--error-color)';
        exp.classList.add('wrong-exp');
        card.querySelectorAll('.option-label').forEach(lbl => {
            const inp = lbl.querySelector('input');
            const isCorrect = q.type === 'tf'
                ? inp.value === q.correctAnswer
                : parseInt(inp.value) === q.correctAnswer;
            if (isCorrect) lbl.classList.add('correct-answer');
        });
    }
    exp.style.display = 'block';
}

// ============================================
// RENDER QUESTIONS
// ============================================
function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    let currentType = null;

    shuffledQuestions.forEach((q, idx) => {
        if (q.type !== currentType) {
            currentType = q.type;
            const header = document.createElement('div');
            header.className = 'section-header';
            if (currentType === 'tf') {
                header.innerHTML = '<h3><i class="fas fa-check-circle"></i> أسئلة الصواب والخطأ</h3>';
            } else if (currentType === 'mcq') {
                header.innerHTML = '<h3><i class="fas fa-list-ul"></i> أسئلة الاختيار من متعدد</h3>';
            } else if (currentType === 'essay') {
                header.innerHTML = '<h3><i class="fas fa-pen-nib"></i> الأسئلة المقالية</h3>';
            }
            container.appendChild(header);
        }

        const card = document.createElement('div');
        card.classList.add('question-card', 'visible');
        card.dataset.id = q.id;

        let opts = '<div class="options-group">';
        if (q.type === 'tf') {
            opts += `<label class="option-label"><input type="radio" name="q${q.id}" value="true"><span>صح</span></label>`;
            opts += `<label class="option-label"><input type="radio" name="q${q.id}" value="false"><span>خطأ</span></label>`;
        } else if (q.type === 'mcq') {
            q.options.forEach((o, i) => {
                opts += `<label class="option-label"><input type="radio" name="q${q.id}" value="${i}"><span>${o}</span></label>`;
            });
        } else if (q.type === 'essay') {
            opts += `<textarea class="essay-textarea" name="q${q.id}" rows="4" placeholder="اكتب إجابتك هنا..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); color: var(--text-color); font-family: inherit; margin-bottom: 15px; resize: vertical;"></textarea>`;
            opts += `<button type="button" class="card-btn btn-exam btn-show-answer" onclick="window.showEssayAnswer(${q.id})" style="width: 100%; justify-content: center;"><i class="fas fa-eye"></i> إظهار الإجابة النموذجية</button>`;
        }
        opts += '</div>';

        let explanationHtml = '';
        if (q.type === 'essay') {
            explanationHtml = `
            <div class="explanation" id="exp-${q.id}" style="display:none; margin-top: 15px;">
                <strong>✅ الإجابة النموذجية:</strong><br><br>
                ${q.explanation}
            </div>`;
        } else {
            explanationHtml = `
            <div class="explanation" id="exp-${q.id}">
                <strong>✅ الإجابة: <span class="correct-text-answer"></span></strong><br><br>
                <strong>📖 التعليل:</strong> ${q.explanation}
            </div>`;
        }

        card.innerHTML = `
            <div class="question-header">
                <span>📝 سؤال ${idx + 1}</span>
                <span class="question-status"></span>
            </div>
            <div class="question-text">${q.text}</div>
            ${opts}
            ${explanationHtml}
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', e => {
            const qId = parseInt(e.target.name.replace('q', ''));
            if (userAnswers[qId]) return;

            const ans = e.target.value;
            const correct = checkAnswer(qId, ans);

            e.target.parentElement.classList.add(currentMode === 'practice'
                ? (correct ? 'correct-answer' : 'wrong-answer')
                : 'selected');

            userAnswers[qId] = { answer: ans, isCorrect: correct };
            if (correct) score++;

            if (currentMode === 'practice') {
                showFeedback(qId, correct);
            } else {
                const card = e.target.closest('.question-card');
                card.querySelectorAll('input').forEach(i => { i.disabled = true; i.parentElement.classList.add('disabled'); });
            }

            saveState();
            updateProgress();
            updateLiveScore();
            updateNavigator();
        });
    });
}

// ============================================
// TIMER
// ============================================
function startTimer(initial) {
    let timeLeft = initial;
    const el = document.getElementById('timer');

    timerInterval = setInterval(() => {
        const h = Math.floor(timeLeft / 3600);
        const m = Math.floor((timeLeft % 3600) / 60);
        const s = timeLeft % 60;
        el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        el.classList.toggle('warning', timeLeft <= 600 && timeLeft > 60);
        el.classList.toggle('danger', timeLeft <= 60);

        if (timeLeft <= 0) { clearInterval(timerInterval); finishExam(); }
        if (timeLeft % 10 === 0) saveTime(timeLeft);
        timeLeft--;
    }, 1000);
}
function stopTimer() { if (timerInterval) clearInterval(timerInterval); }

// ============================================
// CONFIRM & FINISH
// ============================================
function confirmSubmit() {
    const total = shuffledQuestions.length;
    const pct = Math.round(score / total * 100);
    document.getElementById('answered-count').textContent = score;
    document.getElementById('final-score-preview').textContent = pct + '%';
    document.getElementById('final-score-preview').classList.toggle('failed', pct < 50);
    document.getElementById('confirm-modal').style.display = 'flex';
}
function closeConfirmModal() { document.getElementById('confirm-modal').style.display = 'none'; }

function finishExam() {
    stopTimer();
    closeConfirmModal();

    const total = shuffledQuestions.length;
    const pct = Math.round(score / total * 100);

    if (currentMode === 'exam') {
        shuffledQuestions.forEach(q => {
            const data = userAnswers[q.id];
            if (data) {
                const card = document.querySelector(`.question-card[data-id="${q.id}"]`);
                const sel = card.querySelector(`input[value="${data.answer}"]`);
                if (sel) {
                    sel.parentElement.classList.remove('selected');
                    sel.parentElement.classList.add(data.isCorrect ? 'correct-answer' : 'wrong-answer');
                }
                showFeedback(q.id, data.isCorrect);
            } else {
                const question = questions.find(x => x.id === q.id);
                const card = document.querySelector(`.question-card[data-id="${q.id}"]`);
                const exp = document.getElementById(`exp-${q.id}`);
                const correctText = question.type === 'tf'
                    ? (question.correctAnswer === 'true' ? 'صح' : 'خطأ')
                    : question.options[question.correctAnswer];
                exp.querySelector('.correct-text-answer').textContent = correctText;
                card.querySelectorAll('.option-label').forEach(lbl => {
                    const inp = lbl.querySelector('input');
                    const isCorrect = question.type === 'tf'
                        ? inp.value === question.correctAnswer
                        : parseInt(inp.value) === question.correctAnswer;
                    if (isCorrect) lbl.classList.add('correct-answer');
                });
                exp.style.display = 'block';
                card.classList.add('wrong');
            }
        });
    }

    document.getElementById('submit-btn').style.display = 'none';

    if (pct >= 85) createConfetti();
    clearState();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
        alert(pct >= 50
            ? `🎉 مبروك! ${pct}% (${score}/${total})`
            : `😔 ${pct}% (${score}/${total})\nحاول مرة أخرى!`);
    }, 400);
}

// ============================================
// INIT EXAM
// ============================================
function initExam() {
    const tfQuestions = questions.filter(q => q.type === 'tf');
    const mcqQuestions = questions.filter(q => q.type === 'mcq');
    const essayQuestions = questions.filter(q => q.type === 'essay');

    const shuffledTf = window.disableShuffle ? tfQuestions : shuffleArray(tfQuestions);
    const shuffledMcq = window.disableShuffle ? mcqQuestions : shuffleArray(mcqQuestions);
    const shuffledEssay = window.disableShuffle ? essayQuestions : shuffleArray(essayQuestions);

    shuffledQuestions = [...shuffledTf, ...shuffledMcq, ...shuffledEssay];

    renderQuestions();
    updateNavigator();
    updateProgress();
    updateLiveScore();
    startTimer(loadTime() || 7200);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();

    // Auto-start exam if questions array exists (exam pages)
    if (typeof questions !== 'undefined' && questions.length > 0) {
        // Hide landing page and start exam directly
        const landingPage = document.getElementById('landing-page');
        if (landingPage) landingPage.style.display = 'none';

        const examInterface = document.getElementById('exam-interface');
        if (examInterface) {
            examInterface.style.display = 'block';
            const liveScore = document.getElementById('score-live-container');
            if (liveScore) liveScore.style.display = 'block';
            initExam();
        }
    }

    setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 600);
});

// Global API
window.showEssayAnswer = function(qId) {
    if (userAnswers[qId]) return;
    const exp = document.getElementById(`exp-${qId}`);
    if (exp) {
        exp.style.display = 'block';
        exp.classList.add('correct-exp');
    }

    const card = document.querySelector(`.question-card[data-id="${qId}"]`);
    if (card) {
        const status = card.querySelector('.question-status');
        if (status) {
            status.textContent = '✓';
            status.style.color = 'var(--success-color)';
        }
        card.classList.add('correct');

        const textarea = card.querySelector('textarea');
        if (textarea) textarea.disabled = true;

        const btn = card.querySelector('.btn-show-answer');
        if (btn) btn.disabled = true;
    }

    userAnswers[qId] = { answer: 'essay_viewed', isCorrect: true };
    score++;
    
    saveState();
    updateProgress();
    updateLiveScore();
    updateNavigator();
};

window.setTheme = setTheme;
window.startExam = startExam;
window.backToMenu = backToMenu;
window.openMindMap = openMindMap;
window.closeMindMap = closeMindMap;
window.toggleNode = toggleNode;
window.confirmSubmit = confirmSubmit;
window.closeConfirmModal = closeConfirmModal;
window.finishExam = finishExam;
window.toggleMobileNavigator = toggleMobileNavigator;
window.closeMobileNavigator = closeMobileNavigator;

