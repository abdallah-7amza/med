// tools/generateIndex.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const lunr = require('lunr');

const lessonsBaseDir = path.join(__dirname, '../lessons');
const indexPath = path.join(__dirname, '../lessons-index.json');
const searchIndexPath = path.join(__dirname, '../search-index.json');

console.log('Starting index generation...');

try {
    const lessonsIndex = [];
    // اقرأ كل مجلدات السنوات (مثل year1, year5)
    const yearDirs = fs.readdirSync(lessonsBaseDir).filter(dir => fs.statSync(path.join(lessonsBaseDir, dir)).isDirectory());

    for (const yearDir of yearDirs) {
        const yearNumber = parseInt(yearDir.replace('year', ''));
        const yearPath = path.join(lessonsBaseDir, yearDir);
        // اقرأ كل مجلدات التخصصات داخل السنة
        const specialtyDirs = fs.readdirSync(yearPath).filter(dir => fs.statSync(path.join(yearPath, dir)).isDirectory());

        for (const specialtyDir of specialtyDirs) {
            const specialtyPath = path.join(yearPath, specialtyDir);
            const lessonFiles = fs.readdirSync(specialtyPath).filter(file => file.endsWith('.md'));

            for (const lessonFile of lessonFiles) {
                const filePath = path.join(specialtyPath, lessonFile);
                const content = fs.readFileSync(filePath, 'utf8');
                const { data } = matter(content); // استخراج بطاقة التعريف

                // تحقق من وجود البيانات الأساسية
                if (!data.title || !data.slug || !data.summary) {
                    console.warn(`تحذير: بيانات أساسية مفقودة في الملف: ${filePath}`);
                    continue;
                }

                // أضف الدرس إلى الفهرس
                lessonsIndex.push({
                    title: data.title,
                    slug: data.slug,
                    path: `lessons/${yearDir}/${specialtyDir}/${lessonFile}`,
                    quizPath: `questions/${yearDir}/${specialtyDir}/${lessonFile.replace('.md', '.json')}`,
                    year: yearNumber,
                    specialty: data.specialty,
                    summary: data.summary,
                    tags: data.tags || []
                });
            }
        }
    }

    // كتابة فهرس الدروس
    fs.writeFileSync(indexPath, JSON.stringify(lessonsIndex, null, 2));
    console.log(`تم إنشاء lessons-index.json بنجاح ويحتوي على ${lessonsIndex.length} درس.`);

    // إنشاء فهرس البحث باستخدام Lunr.js
    const searchIndex = lunr(function () {
        this.ref('slug');
        this.field('title', { boost: 10 });
        this.field('summary');
        this.field('tags', { boost: 5 });
        this.field('specialty');
        
        lessonsIndex.forEach(doc => this.add(doc));
    });

    fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex));
    console.log('تم إنشاء search-index.json بنجاح.');

} catch (error) {
    console.error('حدث خطأ أثناء إنشاء الفهرس:', error);
    process.exit(1);
}
