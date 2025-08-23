// js/app.js
[cite_start]import { getSpecialties, getLessons } from './github.js'; [cite: 158]

document.addEventListener('DOMContentLoaded', () => {
    [cite_start]const params = new URLSearchParams(window.location.search); [cite: 158]
    [cite_start]const year = params.get('year'); [cite: 158]
    [cite_start]const specialty = params.get('specialty'); [cite: 158]

    [cite_start]const titleEl = document.getElementById('page-title'); [cite: 158]
    [cite_start]const containerEl = document.getElementById('content-container'); [cite: 158]
    [cite_start]const backLink = document.querySelector('.btn-secondary'); [cite: 158]

    if (!year) {
        [cite_start]containerEl.innerHTML = '<p>No academic year selected.</p>'; [cite: 158]
        [cite_start]return; [cite: 158]
    }

    // هذا المنطق يحدد هل نعرض تخصصات أم دروس
    if (specialty) {
        // إذا كان هناك تخصص في الرابط، نعرض الدروس
        [cite_start]titleEl.textContent = `Lessons for ${capitalize(specialty)}`; [cite: 159]
        if (backLink) {
           [cite_start]backLink.href = `lessons-list.html?year=${year}`; [cite: 159]
        }
        [cite_start]loadLessons(year, specialty); [cite: 160]
    } else {
        // إذا لم يكن هناك تخصص، نعرض التخصصات
        [cite_start]titleEl.textContent = `Specialties for Year ${year.replace('year', '')}`; [cite: 161]
        if (backLink) {
            [cite_start]backLink.href = `index.html`; [cite: 162]
        }
        [cite_start]loadSpecialties(year); [cite: 163]
    }
});

function capitalize(str) {
    [cite_start]if (!str) return ''; [cite: 164]
    [cite_start]return str.charAt(0).toUpperCase() + str.slice(1); [cite: 164]
}

async function loadSpecialties(year) {
    [cite_start]const containerEl = document.getElementById('content-container'); [cite: 165]
    [cite_start]containerEl.innerHTML = ''; [cite: 165]
    [cite_start]const specialties = await getSpecialties(year); [cite: 165]

    [cite_start]if (specialties && specialties.length > 0) { [cite: 166]
        specialties.forEach(spec => {
            [cite_start]const card = document.createElement('a'); [cite: 166]
            [cite_start]card.className = 'card'; [cite: 166]
            [cite_start]card.href = `lessons-list.html?year=${year}&specialty=${spec.name.toLowerCase()}`; [cite: 166]
            [cite_start]card.innerHTML = `<h3>${spec.name}</h3>`; [cite: 166]
            [cite_start]containerEl.appendChild(card); [cite: 167]
        });
    } else {
        [cite_start]containerEl.innerHTML = '<p>No specialties found for this year.</p>'; [cite: 168]
    }
}

async function loadLessons(year, specialty) {
    [cite_start]const containerEl = document.getElementById('content-container'); [cite: 170]
    [cite_start]containerEl.innerHTML = ''; [cite: 170]
    [cite_start]const lessons = await getLessons(year, specialty); [cite: 170]

    [cite_start]if (lessons && lessons.length > 0) { [cite: 171]
        lessons.forEach(lesson => {
            [cite_start]const card = document.createElement('a'); [cite: 171]
            [cite_start]card.className = 'card'; [cite: 171]
            [cite_start]card.href = `lesson.html?year=${year}&specialty=${specialty}&lesson=${lesson.id}`; [cite: 171]
            [cite_start]card.innerHTML = `<h3>${lesson.name}</h3>`; [cite: 172]
            [cite_start]containerEl.appendChild(card); [cite: 172]
        });
    } else {
        [cite_start]containerEl.innerHTML = '<p>No lessons found for this specialty.</p>'; [cite: 173]
    }
}
