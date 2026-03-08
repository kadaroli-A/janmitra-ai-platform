/* ============================================
   JanMitra AI — Configuration File
   
   VIDEO TUTORIAL CONFIGURATION:
   Replace the placeholder VIDEO_ID values with your actual YouTube video IDs
   
   How to get YouTube video ID:
   1. Go to your YouTube video
   2. Look at the URL: https://www.youtube.com/watch?v=ABC123XYZ
   3. The video ID is the part after "v=": ABC123XYZ
   4. Copy that ID and paste it below
   
   Example:
   If your English tutorial video URL is:
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   
   Then set:
   ENGLISH_VIDEO_ID: "dQw4w9WgXcQ"
   ============================================ */

const VIDEO_CONFIG = {
    // English tutorial video ID
    ENGLISH_VIDEO_ID: "VIDEO_ID_ENGLISH",
    
    // Hindi tutorial video ID
    HINDI_VIDEO_ID: "VIDEO_ID_HINDI",
    
    // Tamil tutorial video ID
    TAMIL_VIDEO_ID: "VIDEO_ID_TAMIL"
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VIDEO_CONFIG;
}
