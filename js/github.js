// GitHub API integration
const github = {
    // Base URL for the GitHub repository
    repoUrl: 'https://api.github.com/repos/abdallah-7amza/MED-Portal-NUB/contents/',

    // Get list of specialties for a year
    async getSpecialties(year) {
        try {
            const response = await fetch(`${this.repoUrl}lessons/${year}`);
            if (!response.ok) throw new Error('Failed to fetch specialties');
            const data = await response.json();
            return data.map(item => item.name);
        } catch (error) {
            console.error('Error fetching specialties:', error);
            throw error;
        }
    },

    // Get list of lessons for a specialty in a year
    async getLessons(year, specialty) {
        try {
            const response = await fetch(`${this.repoUrl}lessons/${year}/${specialty}`);
            if (!response.ok) throw new Error('Failed to fetch lessons');
            const data = await response.json();
            // Filter only .md files and remove extension
            return data
                .filter(item => item.name.endsWith('.md'))
                .map(item => item.name.replace('.md', ''));
        } catch (error) {
            console.error('Error fetching lessons:', error);
            throw error;
        }
    },

    // Get lesson content
    async getLessonContent(year, specialty, lesson) {
        try {
            const response = await fetch(`${this.repoUrl}lessons/${year}/${specialty}/${lesson}.md`);
            if (!response.ok) throw new Error('Failed to fetch lesson content');
            const data = await response.json();
            // Decode base64 content
            return atob(data.content);
        } catch (error) {
            console.error('Error fetching lesson content:', error);
            throw error;
        }
    },

    // Get quiz data
    async getQuiz(year, specialty, lesson) {
        try {
            const response = await fetch(`${this.repoUrl}questions/${year}/${specialty}/${lesson}.json`);
            if (!response.ok) throw new Error('Failed to fetch quiz');
            const data = await response.json();
            // Decode base64 content and parse JSON
            return JSON.parse(atob(data.content));
        } catch (error) {
            console.error('Error fetching quiz:', error);
            throw error;
        }
    }
};

// Expose to global scope
window.github = github;
