// js/lesson.js
import { getLessonContent, getQuizData } from './github.js';

let quizItems = [];
let userAnswers = {};
let lessonId = '';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const currentLessonId = params.get('lesson'); 
    const year = params.get('year');
    const specialty = params.get('specialty');
    const contentEl = document.getElementById('lesson-content');

    if (!currentLessonId) {
        contentEl.innerHTML = '<p style="color: red;">Error: Lesson ID is missing.</p>';
        return;
    }

    const backLink = document.getElementById('back-link-lesson');
    if (backLink && year && specialty) {
        backLink.href = `lessons-list.html?year=${year}&specialty=${specialty}`;
    }

    loadLessonAndQuiz(currentLessonId);
});

async function loadLessonAndQuiz(currentLessonId) {
    lessonId = currentLessonId; // Set global lessonId for the quiz system
    const titleEl = document.getElementById('page-title');
    const contentEl = document.getElementById('lesson-content');
    const quizContainer = document.getElementById('quiz-container');

    const [markdownContent, quizData] = await Promise.all([
        getLessonContent(lessonId),
        getQuizData(lessonId)
    ]);

    // 1. عرض محتوى الدرس
    if (markdownContent) {
        const cleanMarkdown = markdownContent.replace(/^---\s*[\s\S]*?---\s*/, '').trim();
        contentEl.innerHTML = marked.parse(cleanMarkdown);
        
        const firstHeader = contentEl.querySelector('h1');
        if (firstHeader) {
            titleEl.textContent = firstHeader.textContent;
            firstHeader.remove(); // إزالة العنوان من المحتوى لأنه يظهر في الهيدر
        } else {
            titleEl.textContent = lessonId.replace(/-/g, ' ');
        }
    } else {
        titleEl.textContent = 'Error';
        contentEl.innerHTML = '<p style="color: red;">Could not load lesson content.</p>';
    }

    // 2. تجهيز وعرض الكويز التفاعلي إن وجد
    if (quizData && quizData.items && quizData.items.length > 0) {
        if(quizContainer) quizContainer.style.display = 'block';
        initQuiz(quizData.items);
    }
}

// --- نظام الكويز التفاعلي ---
function initQuiz(items) {
    quizItems = items;
    const resetButton = document.getElementById('quiz-reset-btn');
    loadProgress();
    renderQuiz();
    if(resetButton) resetButton.addEventListener('click', resetQuiz);
}

function renderQuiz() {
    const quizContentEl = document.getElementById('quiz-content');
    if(!quizContentEl) return;
    quizContentEl.innerHTML = '';

    quizItems.forEach((question, index) => {
        const isAnswered = userAnswers.hasOwnProperty(index);
        const userAnswerId = userAnswers[index];
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';
        if (isAnswered) questionDiv.classList.add('answered');

        const optionsHtml = question.options.map(option => {
            let labelClass = '';
            if (isAnswered) {
                if (option.id === question.correct) labelClass = 'correct';
                else if (option.id === userAnswerId) labelClass = 'incorrect';
            }
            return `<label class="${labelClass}">
                        <input type="radio" name="question-${index}" value="${option.id}" ${isAnswered ? 'disabled' : ''}>
                        <span>${option.text}</span>
                    </label>`;
        }).join('');

        questionDiv.innerHTML = `<p><strong>${index + 1}. ${question.stem}</strong></p><div class="quiz-options">${optionsHtml}</div>`;
        quizContentEl.appendChild(questionDiv);
    });

    document.querySelectorAll('.quiz-options input[type="radio"]:not(:disabled)').forEach(input => {
        input.addEventListener('change', handleOptionSelect);
    });
    updateUI();
}

function handleOptionSelect(event) {
    const input = event.target;
    const questionIndex = parseInt(input.name.split('-')[1]);
    userAnswers[questionIndex] = input.value;
    saveProgress();
    renderQuiz();
}

function updateUI() {
    const scoreEl = document.getElementById('quiz-score');
    const progressValueEl = document.getElementById('quiz-progress-value');
    const resetButton = document.getElementById('quiz-reset-btn');
    if(!scoreEl || !progressValueEl || !resetButton) return;

    let score = 0;
    Object.keys(userAnswers).forEach(index => {
        if (quizItems[index].correct === userAnswers[index]) score++;
    });
    
    const answeredCount = Object.keys(userAnswers).length;
    const totalQuestions = quizItems.length;
    scoreEl.textContent = `Score: ${score} / ${totalQuestions}`;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    progressValueEl.style.width = `${progressPercent}%`;
    resetButton.style.display = answeredCount > 0 ? 'inline-block' : 'none';
}

function getStorageKey() { return `quiz_progress_${lessonId}`; }
function saveProgress() { localStorage.setItem(getStorageKey(), JSON.stringify(userAnswers)); }
function loadProgress() {
    const savedData = localStorage.getItem(getStorageKey());
    userAnswers = savedData ? JSON.parse(savedData) : {};
}
function resetQuiz() {
    if (confirm('Are you sure you want to reset your quiz progress?')) {
        localStorage.removeItem(getStorageKey());
        userAnswers = {};
        renderQuiz();
    }
}
