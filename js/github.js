// js/github.js
let allLessonsData = null;

// هذه الدالة تقرأ الفهرس من السيرفر وتحتفظ به لتجنب تحميله كل مرة
async function getIndexData() {
    if (allLessonsData) {
        return allLessonsData;
    }
    try {
        // المسار يجب أن يكون نسبيًا هكذا ليعمل بشكل صحيح
        const response = await fetch('./lessons-index.json');
        if (!response.ok) {
            throw new Error(`Failed to load lesson index. Status: ${response.status}`);
        }
        allLessonsData = await response.json();
        return allLessonsData;
    } catch (error) {
        console.error("CRITICAL ERROR: Could not load lessons-index.json.", error);
        return [];
    }
}

// دالة لجلب كل التخصصات لسنة معينة
export async function getSpecialties(year) {
    const allLessons = await getIndexData();
    const yearNumber = parseInt(String(year).replace('year', ''));
    const specialtyNames = [...new Set(allLessons.filter(l => l.year === yearNumber).map(l => l.specialty))];
    return specialtyNames.map(name => ({ name: name.charAt(0).toUpperCase() + name.slice(1) }));
}

// دالة لجلب كل الدروس لتخصص معين
export async function getLessons(year, specialty) {
    const allLessons = await getIndexData();
    const yearNumber = parseInt(String(year).replace('year', ''));
    return allLessons
        .filter(l => l.year === yearNumber && l.specialty.toLowerCase() === specialty.toLowerCase())
        .map(l => ({ name: l.title, id: l.slug }));
}

// دالة لجلب محتوى درس معين
export async function getLessonContent(lessonId) {
    const allLessons = await getIndexData();
    const lesson = allLessons.find(l => l.slug === lessonId);
    if (!lesson) return null;
    try {
        const response = await fetch(lesson.path);
        if (!response.ok) throw new Error('File not found');
        return await response.text();
    } catch (error) {
        console.error(`Failed to fetch content for ${lesson.path}`, error);
        return null;
    }
}

// دالة لجلب بيانات الكويز لدرس معين
export async function getQuizData(lessonId) {
    const allLessons = await getIndexData();
    const lesson = allLessons.find(l => l.slug === lessonId);
    if (!lesson || !lesson.quizPath) return null;
    try {
        const response = await fetch(lesson.quizPath);
        if (!response.ok) throw new Error('File not found');
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch quiz for ${lesson.quizPath}`, error);
        return null;
    }
}
