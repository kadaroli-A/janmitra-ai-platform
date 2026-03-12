/* ============================================
   JanMitra AI — Configuration File
   
   VIDEO TUTORIAL CONFIGURATION (ISSUE 5 FIX):
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
   
   ISSUE 5 FIX: Add your actual YouTube video IDs below
   ============================================ */

const VIDEO_CONFIG = {
    // English tutorial video ID - Replace with your actual video ID
    ENGLISH_VIDEO_ID: "dQw4w9WgXcQ",  // Example ID - replace with actual
    
    // Hindi tutorial video ID - Replace with your actual video ID
    HINDI_VIDEO_ID: "dQw4w9WgXcQ",  // Example ID - replace with actual
    
    // Tamil tutorial video ID - Replace with your actual video ID
    TAMIL_VIDEO_ID: "dQw4w9WgXcQ"  // Example ID - replace with actual
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VIDEO_CONFIG;
}
