// App State
const app = {
    // Current state
    state: {
        year: null,
        specialty: null,
        lesson: null,
        currentView: null
    },

    // DOM Elements
    elements: {},

    // Initialize the app
    init() {
        this.getElements();
        this.bindEvents();
        this.handleRouting();
    },

    // Get DOM elements
    getElements() {
        // For index.html
        if (document.querySelector('.year-cards')) {
            this.elements.yearCards = document.querySelectorAll('.year-card');
        }

        // For lessons-list.html
        if (document.getElementById('specialties-container')) {
            this.elements.specialtiesContainer = document.getElementById('specialties-container');
            this.elements.lessonsContainer = document.getElementById('lessons-container');
            this.elements.pageTitle = document.getElementById('page-title');
            this.elements.breadcrumb = document.getElementById('breadcrumb');
        }

        // For lesson.html
        if (document.getElementById('lesson-title')) {
            this.elements.lessonTitle = document.getElementById('lesson-title');
            this.elements.lessonContent = document.getElementById('lesson-content');
            this.elements.backToLessons = document.getElementById('back-to-lessons');
            this.elements.breadcrumb = document.getElementById('breadcrumb');
        }
    },

    // Bind events
    bindEvents() {
        // Year selection
        if (this.elements.yearCards) {
            this.elements.yearCards.forEach(card => {
                card.addEventListener('click', () => {
                    const year = card.dataset.year;
                    this.navigateToLessonsList(year);
                });
            });
        }

        // Back to lessons link in lesson.html
        if (this.elements.backToLessons) {
            this.elements.backToLessons.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToLessonsList(this.state.year, this.state.specialty);
            });
        }
    },

    // Handle routing based on URL
    handleRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const year = urlParams.get('year');
        const specialty = urlParams.get('specialty');
        const lesson = urlParams.get('lesson');

        // Update state
        this.state.year = year;
        this.state.specialty = specialty;
        this.state.lesson = lesson;

        // Determine current view
        if (document.querySelector('.year-cards')) {
            this.state.currentView = 'index';
        } else if (document.getElementById('specialties-container')) {
            this.state.currentView = 'lessons-list';
            this.renderLessonsList();
        } else if (document.getElementById('lesson-title')) {
            this.state.currentView = 'lesson';
            // Lesson rendering is handled by lesson.js
        }
    },

    // Navigate to lessons list page
    navigateToLessonsList(year, specialty) {
        let url = `lessons-list.html?year=${year}`;
        if (specialty) {
            url += `&specialty=${specialty}`;
        }
        window.location.href = url;
    },

    // Render the lessons list page
    async renderLessonsList() {
        if (!this.state.year) return;

        // Update breadcrumb
        this.updateBreadcrumb();

        if (this.state.specialty) {
            // Show lessons for the specialty
            this.elements.pageTitle.textContent = `Lessons - ${this.formatSpecialty(this.state.specialty)}`;
            this.elements.specialtiesContainer.style.display = 'none';
            this.elements.lessonsContainer.style.display = 'grid';

            // Fetch lessons from GitHub
            try {
                const lessons = await window.github.getLessons(this.state.year, this.state.specialty);
                this.renderLessons(lessons);
            } catch (error) {
                console.error('Error fetching lessons:', error);
                this.elements.lessonsContainer.innerHTML = '<p>Error loading lessons. Please try again later.</p>';
            }
        } else {
            // Show specialties for the year
            this.elements.pageTitle.textContent = `Select Specialty - Year ${this.state.year}`;
            this.elements.specialtiesContainer.style.display = 'grid';
            this.elements.lessonsContainer.style.display = 'none';

            // Fetch specialties from GitHub
            try {
                const specialties = await window.github.getSpecialties(this.state.year);
                this.renderSpecialties(specialties);
            } catch (error) {
                console.error('Error fetching specialties:', error);
                this.elements.specialtiesContainer.innerHTML = '<p>Error loading specialties. Please try again later.</p>';
            }
        }
    },

    // Render specialties
    renderSpecialties(specialties) {
        this.elements.specialtiesContainer.innerHTML = '';
        specialties.forEach(specialty => {
            const card = document.createElement('div');
            card.className = 'specialty-card';
            card.innerHTML = `<h3>${this.formatSpecialty(specialty)}</h3>`;
            card.addEventListener('click', () => {
                this.navigateToLessonsList(this.state.year, specialty);
            });
            this.elements.specialtiesContainer.appendChild(card);
        });
    },

    // Render lessons
    renderLessons(lessons) {
        this.elements.lessonsContainer.innerHTML = '';
        lessons.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'lesson-card';
            card.innerHTML = `<h3>${this.formatLessonName(lesson)}</h3>`;
            card.addEventListener('click', () => {
                window.location.href = `lesson.html?year=${this.state.year}&specialty=${this.state.specialty}&lesson=${lesson}`;
            });
            this.elements.lessonsContainer.appendChild(card);
        });
    },

    // Update breadcrumb
    updateBreadcrumb() {
        if (!this.elements.breadcrumb) return;

        let breadcrumb = '<a href="index.html">Home</a>';
        if (this.state.year) {
            breadcrumb += ` > <a href="lessons-list.html?year=${this.state.year}">Year ${this.state.year}</a>`;
        }
        if (this.state.specialty) {
            breadcrumb += ` > <a href="lessons-list.html?year=${this.state.year}&specialty=${this.state.specialty}">${this.formatSpecialty(this.state.specialty)}</a>`;
        }
        if (this.state.lesson) {
            breadcrumb += ` > ${this.formatLessonName(this.state.lesson)}`;
        }

        this.elements.breadcrumb.innerHTML = breadcrumb;
    },

    // Format specialty name for display
    formatSpecialty(specialty) {
        return specialty.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    },

    // Format lesson name for display
    formatLessonName(lesson) {
        return lesson.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
