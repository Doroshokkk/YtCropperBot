export function unifyYouTubeUrl(url: string): string {
    try {
        // Create URL object to parse the input
        const urlObj = new URL(url);

        // Handle youtu.be links
        if (urlObj.hostname === 'youtu.be') {
            const videoId = urlObj.pathname.slice(1);
            return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // Handle youtube.com and music.youtube.com links
        if (urlObj.hostname === 'youtube.com' ||
            urlObj.hostname === 'www.youtube.com' ||
            urlObj.hostname === 'music.youtube.com') {

            // Get video ID from search params
            const videoId = urlObj.searchParams.get('v');

            if (!videoId) {
                throw new Error('Invalid YouTube URL: No video ID found');
            }

            // Return standardized format
            return `https://www.youtube.com/watch?v=${videoId}`;
        }

        throw new Error('Invalid YouTube URL: Unrecognized format');
    } catch (error) {
        throw new Error(`Invalid YouTube URL: ${error.message}`);
    }
}