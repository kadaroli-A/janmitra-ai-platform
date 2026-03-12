/* ============================================
   JanMitra AI — Main Application Logic v3.0
   Voice-First Government Scheme Intelligence
   
   VIDEO CONFIGURATION:
   To add YouTube tutorial videos for each language:
   1. Upload your tutorial videos to YouTube
   2. Get the video ID from the URL
      Example: https://www.youtube.com/watch?v=ABC123XYZ
      Video ID is: ABC123XYZ
   3. Find the videoMap object in the renderGuideContent() function (around line 1200)
   4. Replace the placeholder VIDEO_ID values:
      const videoMap = {
          en: "YOUR_ENGLISH_VIDEO_ID",
          hi: "YOUR_HINDI_VIDEO_ID",
          ta: "YOUR_TAMIL_VIDEO_ID"
      };
   5. The system will automatically load the correct video based on user's language
   ============================================ */

// ---- State ----
let currentLang = 'en';
let currentPage = 1;
let isListening = false;
let recognition = null;
let synthesis = window.speechSynthesis;

let currentAudio = null;
function prepareSpeechText(text) {

    let speakText = text;

    // Fix common pronunciation problems
    speakText = speakText.replace(/\bAI\b/g, "A I");
    speakText = speakText.replace(/\bPMAY\b/g, "P M A Y");
    speakText = speakText.replace(/\bUPI\b/g, "U P I");
    speakText = speakText.replace(/JanMitra/g, "Jan Mitra");
    speakText = speakText.replace(/\bCSC\b/g, "C S C");

    return speakText;
}
let availableVoices = [];

function loadVoices() {
    availableVoices = synthesis.getVoices();
}

loadVoices();

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}
let collectedRawText = '';
let analysisResults = null;
let activeGuideSchemeIndex = 0;
let chatbotOpen = false;
let currentInputMode = 'voice'; // 'voice' or 'manual'
let fullVoiceRecognition = null;
let detectedData = {};

// ============================================
//  AI ASSISTANT STATE MANAGEMENT
// ============================================

/**
 * Set the AI assistant robot state (for floating chatbot icon)
 * @param {string} state - 'idle', 'robotListening', 'robotThinking', 'robotSpeaking'
 */
function setFloatingAssistantState(state) {
    const chatbotFab = document.getElementById('chatbot-fab');
    
    if (!chatbotFab) return;
    
    // Remove all state classes
    const states = ['robotListening', 'robotThinking', 'robotSpeaking'];
    states.forEach(s => chatbotFab.classList.remove(s));
    
    // Add new state class (idle is default, no class needed)
    if (state !== 'idle') {
        chatbotFab.classList.add(state);
    }
    
    console.log(`[Floating Assistant] State changed to: ${state}`);
}

/**
 * Set the AI assistant robot state (for in-page assistant)
 * @param {string} state - 'idle', 'listening', 'thinking', 'speaking'
 * Note: In-page assistant avatars have been removed. This function is kept for compatibility.
 */
function setAssistantState(state) {
    // In-page assistant avatars removed - only floating assistant remains
    console.log(`[Assistant] State changed to: ${state} (in-page avatars removed)`);
}

/**
 * Reset assistant to idle state
 */
function resetAssistantState() {
    setAssistantState('idle');
    setFloatingAssistantState('idle');
}

// ---- Initialize ----
// ISSUE 1 FIX: Proper initialization function
function initApp() {
    console.log('[Init] Starting JanMitra AI initialization...');
    
    initSpeechRecognition();
    initKeyboardHandlers();
    loadVoices();
    if (synthesis) { synthesis.onvoiceschanged = loadVoices; }
    
    // Initialize voice guidance for input fields
    initVoiceGuidanceForInputFields();
    
    // Apply default language translations on page load
    applyLanguage(currentLang);
    
    // Ensure we're on page 1
    navigateToPage(1);
    
    // Reset assistant state
    resetAssistantState();
    
    console.log('[Init] JanMitra AI initialized successfully');
    
    // Play welcome voice after first user interaction (browsers block auto-play)
    const playWelcomeOnce = () => {
        console.log('[Init] Playing welcome message');
        speakText(t('voiceWelcome', currentLang), currentLang);
        document.removeEventListener('click', playWelcomeOnce);
        document.removeEventListener('touchstart', playWelcomeOnce);
    };
    document.addEventListener('click', playWelcomeOnce, { once: true });
    document.addEventListener('touchstart', playWelcomeOnce, { once: true });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// ---- Voice Loading ----
function loadVoices() {
    if (!synthesis) return;
    availableVoices = synthesis.getVoices();
}

function findVoiceForLang(lang) {
    if (!availableVoices.length) availableVoices = synthesis ? synthesis.getVoices() : [];
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    const targetLang = langMap[lang] || 'en-IN';
    const prefix = lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'ta';
    
    // Try exact match first
    let voice = availableVoices.find(v => v.lang === targetLang);
    if (voice) return voice;
    
    // Try language prefix match
    voice = availableVoices.find(v => v.lang.startsWith(prefix));
    if (voice) return voice;
    
    // For Tamil, try multiple patterns
    if (lang === 'ta') {
        voice = availableVoices.find(v => 
            v.name.toLowerCase().includes('tamil') || 
            v.lang.includes('ta') ||
            v.name.toLowerCase().includes('ta-in')
        );
        if (voice) return voice;
    }
    
    // Try name-based search
    voice = availableVoices.find(v => v.name.toLowerCase().includes(prefix === 'ta' ? 'tamil' : prefix === 'hi' ? 'hindi' : 'india'));
    if (voice) return voice;
    
    // Fallback to en-IN
    voice = availableVoices.find(v => v.lang === 'en-IN');
    if (voice) return voice;
    
    // Last resort: any English voice
    return availableVoices.find(v => v.lang.startsWith('en')) || null;
}

// ============================================
//  VOICE QUEUE SYSTEM (ISSUE 1 FIX)
// ============================================
let voiceQueue = [];
let isCurrentlySpeaking = false;

function speakText(text, lang) {
    // Add to queue
    voiceQueue.push({ text, lang });
    
    // Process queue if not already speaking
    if (!isCurrentlySpeaking) {
        processVoiceQueue();
    }
}

function processVoiceQueue() {
    if (voiceQueue.length === 0) {
        isCurrentlySpeaking = false;
        return;
    }
    
    isCurrentlySpeaking = true;
    const { text, lang } = voiceQueue.shift();
    
    speakTextImmediate(text, lang);
}

// ---- Speech Synthesis ----
function speakTextImmediate(text, lang) {
    try {
        if (!synthesis || typeof synthesis.speak !== 'function') {
            processVoiceQueue(); // Continue to next in queue
            return;
        }
        
        // Cancel any currently playing speech
        synthesis.cancel();

        // stop backend audio if playing
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        
        let speechText = prepareSpeechText(text);
        
        // Fix pronunciation for speech-only text (UI text remains unchanged)
        speechText = speechText.replace(/\bAI\b/g, "A I");
        speechText = speechText.replace(/\bPMAY\b/g, "P M A Y");
        speechText = speechText.replace(/\bUPI\b/g, "U P I");
        speechText = speechText.replace(/\bCSC\b/g, "C S C");
        speechText = speechText.replace(/\bAPI\b/g, "A P I");
        speechText = speechText.replace(/\bGST\b/g, "G S T");
        speechText = speechText.replace(/\bKYC\b/g, "K Y C");
        speechText = speechText.replace(/\bOTP\b/g, "O T P");
        
       const utterance = new SpeechSynthesisUtterance(speechText);
       const voices = synthesis.getVoices();

if (currentLang === "hi") {
    const hindiVoice = voices.find(v => v.lang.includes("hi"));
    if (hindiVoice) {
        utterance.voice = hindiVoice;
        utterance.lang = "hi-IN";
    }
}

if (currentLang === "en") {
    const englishVoice = voices.find(v => v.lang.includes("en"));
    if (englishVoice) {
        utterance.voice = englishVoice;
        utterance.lang = "en-IN";
    }
}
       if (currentLang === "en") {
    utterance.lang = "en-IN";
}

if (currentLang === "hi") {
    utterance.lang = "hi-IN";
}

if (currentLang === "ta") {
    utterance.lang = "ta-IN";
}
        const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
        utterance.lang = langMap[lang] || 'en-IN';
        
        // Adjust rate and pitch for better Tamil pronunciation
        if (lang === 'ta') {
            utterance.rate = 0.8; // Slower for Tamil
            utterance.pitch = 1.1; // Slightly higher pitch
        } else if (lang === 'hi') {
            utterance.rate = 0.85;
            utterance.pitch = 1;
        } else {
            utterance.rate = 0.9;
            utterance.pitch = 1;
        }
        
        utterance.volume = 1;
        const selectedVoice = findVoiceForLang(lang);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${lang}`);
        } else {
            console.warn(`No suitable voice found for language: ${lang}`);
        }
        utterance.onend = () => {
            // When speech ends, process next item in queue
            processVoiceQueue();
        };
        
        utterance.onerror = (e) => {
            if (e.error !== "interrupted") {
                console.warn("TTS error:", e.error);
            }
            // Continue to next in queue even on error
            processVoiceQueue();
        };
        
        window.speechSynthesis.cancel();
        synthesis.speak(utterance);
    } catch (err) { 
        console.warn('TTS failed:', err);
        processVoiceQueue(); // Continue to next in queue
    }
}

function stopSpeech() { 
    try { 
        if (synthesis) synthesis.cancel();
        // Clear voice queue
        voiceQueue = [];
        isCurrentlySpeaking = false;
    } catch (e) { } 
}

// ---- Speech Recognition ----
function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { isListening = true; updateMicUI(true); };
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
        const input = document.getElementById('collect-input');
        if (input) input.value = transcript;
        if (event.results[event.results.length - 1].isFinal) setTimeout(() => submitCollectedData(), 400);
    };
    recognition.onerror = (event) => {
        stopListening();
        if (event.error === 'not-allowed') showToast('🎤', t('voiceNotSupported', currentLang));
    };
    recognition.onend = () => { stopListening(); };
}

function toggleBigMic() {
    if (!recognition) { showToast('⚠️', t('voiceNotSupported', currentLang)); return; }
    if (isListening) recognition.stop(); else startListening();
}

function startListening() {
    if (!recognition) return;
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    recognition.lang = langMap[currentLang] || 'en-IN';
    try { recognition.start(); } catch (e) { console.error('Recognition start failed:', e); }
}

function stopListening() { isListening = false; updateMicUI(false); }

function updateMicUI(listening) {
    const bigMicBtn = document.getElementById('big-mic-btn');
    const micStatus = document.getElementById('mic-status');
    const voiceWave = document.getElementById('voice-wave-big');
    if (bigMicBtn) bigMicBtn.classList.toggle('listening', listening);
    if (voiceWave) voiceWave.classList.toggle('hidden', !listening);
    if (micStatus) {
        micStatus.textContent = listening
            ? (currentLang === 'hi' ? 'सुन रहा हूँ...' : currentLang === 'ta' ? 'கேட்கிறேன்...' : 'Listening...')
            : (currentLang === 'hi' ? 'बोलने के लिए टैप करें' : currentLang === 'ta' ? 'பேச தட்டவும்' : 'Tap to speak');
    }
}

function initKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (document.activeElement === document.getElementById('collect-input')) { e.preventDefault(); submitCollectedData(); }
            else if (document.activeElement === document.getElementById('scam-input')) { e.preventDefault(); verifyScheme(); }
            else if (document.activeElement === document.getElementById('chatbot-input')) { e.preventDefault(); sendChatbotMessage(); }
        }
    });
}

// ============================================
//  LANGUAGE SELECTION
// ============================================
function selectLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.language-card').forEach(card => {
        card.classList.toggle('active', card.dataset.lang === lang);
    });
    applyLanguage(lang);
    
    // Update example text on Page 2 if it's visible
    updateExampleText(lang);
    
    // Step 1: Voice explanation in selected language
    const welcomeMessage = t('voiceWelcome', lang);
    speakText(welcomeMessage, lang);
    
    // Step 2: Voice instruction after explanation completes
    setTimeout(() => {
        const instructionMessage = t('voiceLangSelected', lang);
        speakText(instructionMessage, lang);
    }, getEstimatedSpeechDuration(welcomeMessage) + 500);
    
    showToast('🌐', getLanguageName(lang));
}

// Update example text dynamically
function updateExampleText(lang) {
    setText('voice-example-label', t('voiceExampleLabel', lang));
    setText('voice-example-text', t('voiceExampleText', lang));
}

function getLanguageName(lang) {
    return { en: 'English', hi: 'हिन्दी', ta: 'தமிழ்' }[lang] || 'English';
}

// Estimate speech duration for timing (rough estimate: 150 words per minute)
function getEstimatedSpeechDuration(text) {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    return (words / wordsPerMinute) * 60 * 1000; // Convert to milliseconds
}

// ============================================
//  PAGE NAVIGATION
// ============================================
function navigateToPage(pageNum) {
    for (let i = 1; i <= 5; i++) {
        const page = document.getElementById(`page-${i}`);
        if (page) { page.classList.add('hidden'); page.classList.remove('active'); }
    }
    const targetPage = document.getElementById(`page-${pageNum}`);
    if (targetPage) { targetPage.classList.remove('hidden'); targetPage.classList.add('active'); }
    currentPage = pageNum;
    updateProgress(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress(pageNum) {
    // Progress indicator removed as per requirements
    // No visual progress dots needed
}

// ============================================
//  PAGE 1: Welcome & Trust
// ============================================
function playIntroVoice() {
    const introText = document.getElementById('ai-intro-text').textContent;
    speakText(introText, currentLang);
    const btn = document.getElementById('intro-voice-btn');
    btn.querySelector('span').textContent = currentLang === 'hi' ? 'सुन रहे हैं...' : currentLang === 'ta' ? 'கேட்கிறீர்கள்...' : 'Playing...';
    setTimeout(() => { btn.querySelector('span').textContent = t('introVoiceBtn', currentLang); }, 5000);
}

function startAnalysis() {
    // Voice feedback when button is clicked
    speakText(t('voiceButtonContinue', currentLang), currentLang);
    
    setTimeout(() => {
        navigateToPage(2);
        // Initialize input mode on Page 2
        initializeInputMode();
        // Update example text with current language
        updateExampleText(currentLang);
        setTimeout(() => { 
            if (currentInputMode === 'voice') {
                speakVoiceInstructions();
            } else {
                speakText(t('voicePage2', currentLang), currentLang); 
            }
        }, 500);
    }, 800);
}

// ============================================
//  INPUT MODE SELECTION (PAGE 2)
// ============================================
function selectInputMode(mode) {
    currentInputMode = mode;
    
    // Update button states
    document.getElementById('voice-mode-btn').classList.toggle('active', mode === 'voice');
    document.getElementById('manual-mode-btn').classList.toggle('active', mode === 'manual');
    
    // Show/hide containers
    const voiceContainer = document.getElementById('voice-mode-container');
    const manualContainer = document.getElementById('manual-mode-container');
    
    if (mode === 'voice') {
        voiceContainer.classList.remove('hidden');
        manualContainer.classList.add('hidden');
        speakVoiceInstructions();
    } else {
        voiceContainer.classList.add('hidden');
        manualContainer.classList.remove('hidden');
        speakText(t('voicePage2Manual', currentLang), currentLang);
    }
}

function initializeInputMode() {
    // Default to voice mode
    selectInputMode('voice');
}

function speakVoiceInstructions() {
    const lang = currentLang;
    let instruction = '';
    
    // Get the voice example text from translations
    const voiceExample = t('voiceExampleText', lang);
    
    if (lang === 'en') {
        instruction = `Please tell me about yourself. For example say: ${voiceExample}`;
    } else if (lang === 'hi') {
        instruction = `कृपया अपने बारे में बताइए। उदाहरण: ${voiceExample}`;
    } else if (lang === 'ta') {
        instruction = `தயவு செய்து உங்கள் விவரங்களை சொல்லுங்கள். உதாரணமாக: ${voiceExample}`;
    }
    
    speakText(instruction, lang);
}

// ============================================
//  FULL VOICE INPUT MODE
// ============================================
function startFullVoiceInput() {
    if (!recognition) {
        showToast('⚠️', t('voiceNotSupported', currentLang));
        return;
    }
    
    // Safety check: ensure we're on the correct page
    const voiceMicBig = document.getElementById('voice-mic-big');
    const listeningIndicator = document.getElementById('voice-listening-indicator');
    
    if (!voiceMicBig || !listeningIndicator) {
        console.warn('Voice UI elements not found. User may not be on the input page.');
        return;
    }
    
    // Set assistant to listening state
    setAssistantState('listening');
    setFloatingAssistantState('robotListening');
    
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        showToast('⚠️', t('voiceNotSupported', currentLang));
        return;
    }
    
    fullVoiceRecognition = new SR();
    fullVoiceRecognition.continuous = false;
    fullVoiceRecognition.interimResults = false;
    
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    fullVoiceRecognition.lang = langMap[currentLang] || 'en-IN';
    
    // Show listening indicator with updated text
    voiceMicBig.classList.add('listening');
    listeningIndicator.classList.remove('hidden');
    
    // Update listening text to "Listening... Speak your details"
    const listeningText = currentLang === 'hi' 
        ? 'सुन रहा हूँ... अपनी जानकारी बताएं' 
        : currentLang === 'ta' 
        ? 'கேட்கிறேன்... உங்கள் விவரங்களை சொல்லுங்கள்' 
        : 'Listening... Speak your details';
    const listeningTextEl = document.getElementById('listening-text');
    if (listeningTextEl) {
        listeningTextEl.textContent = listeningText;
    }
    
    fullVoiceRecognition.onstart = () => {
        console.log('Full voice input started');
    };
    
    fullVoiceRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice transcript:', transcript);
        
        // Show processing state
        showProcessingState();
        
        // Parse the transcript after a brief delay to show processing
        setTimeout(() => {
            processVoiceTranscript(transcript);
        }, 1000);
    };
    
    fullVoiceRecognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        stopFullVoiceInput();
        showToast('⚠️', t('voiceNotSupported', currentLang));
    };
    
    fullVoiceRecognition.onend = () => {
        // Don't stop immediately - let processing state show
        const micBtn = document.getElementById('voice-mic-big');
        if (micBtn) micBtn.classList.remove('listening');
    };
    
    try {
        fullVoiceRecognition.start();
    } catch (e) {
        console.error('Failed to start voice recognition:', e);
        stopFullVoiceInput();
        showToast('⚠️', 'Voice input failed. Please try again.');
    }
}

function showProcessingState() {
    const listeningIndicator = document.getElementById('voice-listening-indicator');
    const listeningTextEl = document.getElementById('listening-text');
    const micBtn = document.getElementById('voice-mic-big');
    
    if (listeningIndicator && listeningTextEl) {
        // Update text to show processing
        const processingText = currentLang === 'hi' 
            ? 'AI के साथ आपकी आवाज़ को प्रोसेस कर रहे हैं...' 
            : currentLang === 'ta' 
            ? 'AI உடன் உங்கள் குரலை செயலாக்குகிறது...' 
            : 'Processing your voice with AI...';
        
        listeningTextEl.textContent = processingText;
        
        // Change button to processing state
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.classList.add('processing');
        }
        
        // Set assistant to thinking state
        setAssistantState('thinking');
        setFloatingAssistantState('robotThinking');
    }
}

function stopFullVoiceInput() {
    const micBtn = document.getElementById('voice-mic-big');
    const listeningIndicator = document.getElementById('voice-listening-indicator');
    
    // Safety checks to prevent errors if elements don't exist
    if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.classList.remove('processing');
    }
    if (listeningIndicator) listeningIndicator.classList.add('hidden');
    
    // Reset assistant to idle state
    resetAssistantState();
}

function processVoiceTranscript(transcript) {
    const lang = currentLang;
    
    // Use existing parseUserInput function from eligibility.js
    const parsed = parseUserInput(transcript, lang);
    
    // Store detected data
    detectedData = {
        name: extractName(transcript, lang),
        age: parsed.age,
        gender: parsed.gender,
        occupation: parsed.occupation,
        state: parsed.state,
        mobile: extractMobile(transcript)
    };
    
    // Display detected details
    displayDetectedDetails(detectedData);
    
    // Auto-fill form
    autoFillForm(detectedData);
    
    // Voice confirmation
    const confirmMsg = lang === 'hi' 
        ? 'मैंने आपकी जानकारी समझ ली है। कृपया जांचें और आगे बढ़ें।'
        : lang === 'ta'
        ? 'உங்கள் தகவல்களை புரிந்துகொண்டேன். தயவுசெய்து சரிபார்த்து தொடரவும்.'
        : 'I have understood your details. Please review and proceed.';
    
    speakText(confirmMsg, lang);
}

function extractName(text, lang) {
    // Enhanced name extraction - look for various patterns
    const patterns = {
        en: [
            /(?:my name is|i am|i'm|name is)\s+([a-z]+(?:\s+[a-z]+)?)/i,
            /^([a-z]+(?:\s+[a-z]+)?),/i  // Name at start followed by comma
        ],
        hi: [
            /(?:मेरा नाम|मैं)\s+([^\s,]+(?:\s+[^\s,]+)?)/i,
            /^([^\s,]+(?:\s+[^\s,]+)?),/i
        ],
        ta: [
            /(?:என் பெயர்|நான்)\s+([^\s,]+(?:\s+[^\s,]+)?)/i,
            /^([^\s,]+(?:\s+[^\s,]+)?),/i
        ]
    };
    
    const langPatterns = patterns[lang] || patterns.en;
    
    for (const pattern of langPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return '';
}

function extractMobile(text) {
    // Extract 10-digit mobile number
    const match = text.match(/\b\d{10}\b/);
    return match ? match[0] : '';
}

function displayDetectedDetails(data) {
    const card = document.getElementById('ai-detected-card');
    const grid = document.getElementById('detected-grid');
    const lang = currentLang;
    
    // Hide listening indicator
    const listeningIndicator = document.getElementById('voice-listening-indicator');
    if (listeningIndicator) {
        listeningIndicator.classList.add('hidden');
    }
    
    // Reset assistant state
    resetAssistantState();
    
    grid.innerHTML = '';
    
    const fields = [
        { key: 'name', label: lang === 'hi' ? 'नाम' : lang === 'ta' ? 'பெயர்' : 'Name', value: data.name || '—' },
        { key: 'age', label: lang === 'hi' ? 'उम्र' : lang === 'ta' ? 'வயது' : 'Age', value: data.age || '—' },
        { key: 'gender', label: lang === 'hi' ? 'लिंग' : lang === 'ta' ? 'பாலினம்' : 'Gender', value: data.gender ? (lang === 'hi' ? (data.gender === 'female' ? 'महिला' : 'पुरुष') : lang === 'ta' ? (data.gender === 'female' ? 'பெண்' : 'ஆண்') : data.gender) : '—' },
        { key: 'occupation', label: lang === 'hi' ? 'व्यवसाय' : lang === 'ta' ? 'தொழில்' : 'Occupation', value: data.occupation ? getOccupationLabel(data.occupation, lang) : '—' },
        { key: 'state', label: lang === 'hi' ? 'राज्य' : lang === 'ta' ? 'மாநிலம்' : 'State', value: data.state || '—' },
        { key: 'mobile', label: lang === 'hi' ? 'मोबाइल' : lang === 'ta' ? 'மொபைல்' : 'Mobile', value: data.mobile || '—' }
    ];
    
    fields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'detected-field';
        div.innerHTML = `
            <span class="detected-label">${field.label}</span>
            <span class="detected-value">${field.value}</span>
        `;
        grid.appendChild(div);
    });
    
    // Update the card title
    const detectedTitle = document.getElementById('detected-title');
    if (detectedTitle) {
        detectedTitle.textContent = lang === 'hi' 
            ? 'AI द्वारा पहचाने गए विवरण' 
            : lang === 'ta' 
            ? 'AI கண்டறிந்த விவரங்கள்' 
            : 'AI Detected Details';
    }
    
    // Update button text for "Edit Details"
    const editBtn = document.getElementById('edit-detected-btn');
    const editText = document.getElementById('edit-detected-text');
    if (editText) {
        editText.textContent = lang === 'hi' 
            ? 'विवरण संपादित करें' 
            : lang === 'ta' 
            ? 'விவரங்களை திருத்து' 
            : 'Edit Details';
    }
    
    // Add Confirm Details button if it doesn't exist
    let confirmBtn = document.getElementById('confirm-detected-btn');
    if (!confirmBtn) {
        confirmBtn = document.createElement('button');
        confirmBtn.id = 'confirm-detected-btn';
        confirmBtn.className = 'confirm-detected-btn';
        confirmBtn.onclick = confirmDetectedDetails;
        
        const confirmText = document.createElement('span');
        confirmText.id = 'confirm-detected-text';
        confirmText.textContent = lang === 'hi' 
            ? 'विवरण की पुष्टि करें' 
            : lang === 'ta' 
            ? 'விவரங்களை உறுதிப்படுத்து' 
            : 'Confirm Details';
        
        confirmBtn.appendChild(confirmText);
        
        // Insert confirm button before edit button
        if (editBtn) {
            editBtn.parentNode.insertBefore(confirmBtn, editBtn);
        }
    } else {
        // Update existing button text
        const confirmText = document.getElementById('confirm-detected-text');
        if (confirmText) {
            confirmText.textContent = lang === 'hi' 
                ? 'विवरण की पुष्टि करें' 
                : lang === 'ta' 
                ? 'விவரங்களை உறுதிப்படுத்து' 
                : 'Confirm Details';
        }
    }
    
    card.classList.remove('hidden');
    
    // Scroll to card
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

function confirmDetectedDetails() {
    const lang = currentLang;
    
    // Auto-fill form with detected data
    autoFillForm(detectedData);
    
    // Voice confirmation
    const confirmMsg = lang === 'hi' 
        ? 'विवरण की पुष्टि हो गई। अब योजनाओं का विश्लेषण कर रहे हैं।'
        : lang === 'ta'
        ? 'விவரங்கள் உறுதிப்படுத்தப்பட்டன. இப்போது திட்டங்களை பகுப்பாய்வு செய்கிறது.'
        : 'Details confirmed. Analyzing schemes now.';
    
    speakText(confirmMsg, lang);
    
    // Update collectedProfile with detected data
    collectedProfile.age = detectedData.age;
    collectedProfile.gender = detectedData.gender;
    collectedProfile.occupation = detectedData.occupation;
    collectedProfile.state = detectedData.state;
    
    // Proceed to analysis page
    setTimeout(() => {
        runAgentAnalysis();
    }, 1000);
}

function autoFillForm(data) {
    // Show manual form container
    const manualContainer = document.getElementById('manual-mode-container');
    manualContainer.classList.remove('hidden');
    
    // Fill form fields
    if (data.name) document.getElementById('input-name').value = data.name;
    if (data.age) document.getElementById('input-age').value = data.age;
    if (data.gender) document.getElementById('input-gender').value = data.gender;
    if (data.occupation) document.getElementById('input-occupation').value = data.occupation;
    if (data.state) document.getElementById('input-state').value = data.state;
    
    // Update collectedProfile
    collectedProfile.age = data.age;
    collectedProfile.gender = data.gender;
    collectedProfile.occupation = data.occupation;
    collectedProfile.state = data.state;
}

function editDetectedDetails() {
    // Switch to manual mode to allow editing
    selectInputMode('manual');
    
    // Scroll to form
    setTimeout(() => {
        document.getElementById('manual-mode-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

// ============================================
//  PAGE 2: Data Collection
// ============================================
function useExample(btn) {
    document.getElementById('collect-input').value = btn.dataset.text;
    submitCollectedData();
}

function submitCollectedData() {
    const input = document.getElementById('collect-input');
    const text = input.value.trim();
    if (!text) return;
    collectedRawText = text;
    const parsed = parseUserInput(text, currentLang);
    if (parsed.age) collectedProfile.age = parsed.age;
    if (parsed.occupation) collectedProfile.occupation = parsed.occupation;
    if (parsed.gender) collectedProfile.gender = parsed.gender;
    if (parsed.state) collectedProfile.state = parsed.state;
    showProfilePreview(collectedProfile);
}

function showProfilePreview(profile) {
    const preview = document.getElementById('profile-preview');
    preview.classList.remove('hidden');
    const lang = currentLang;
    const ageEl = document.getElementById('pv-age-val'); const ageItem = document.getElementById('pv-age');
    if (profile.age) { ageEl.textContent = profile.age; ageItem.classList.add('detected'); } else { ageEl.textContent = '—'; ageItem.classList.remove('detected'); }
    const occEl = document.getElementById('pv-occ-val'); const occItem = document.getElementById('pv-occ');
    if (profile.occupation) { occEl.textContent = getOccupationLabel(profile.occupation, lang); occItem.classList.add('detected'); } else { occEl.textContent = '—'; occItem.classList.remove('detected'); }
    const genEl = document.getElementById('pv-gen-val'); const genItem = document.getElementById('pv-gen');
    if (profile.gender) { genEl.textContent = lang === 'hi' ? (profile.gender === 'female' ? 'महिला' : 'पुरुष') : lang === 'ta' ? (profile.gender === 'female' ? 'பெண்' : 'ஆண்') : profile.gender === 'female' ? 'Female' : 'Male'; genItem.classList.add('detected'); } else { genEl.textContent = '—'; genItem.classList.remove('detected'); }
    const stateEl = document.getElementById('pv-state-val'); const stateItem = document.getElementById('pv-state');
    if (profile.state) { stateEl.textContent = profile.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); stateItem.classList.add('detected'); } else { stateEl.textContent = '—'; stateItem.classList.remove('detected'); }
    document.querySelector('#pv-age .pv-label').textContent = lang === 'hi' ? 'उम्र' : lang === 'ta' ? 'வயது' : 'Age';
    document.querySelector('#pv-occ .pv-label').textContent = lang === 'hi' ? 'व्यवसाय' : lang === 'ta' ? 'தொழில்' : 'Occupation';
    document.querySelector('#pv-gen .pv-label').textContent = lang === 'hi' ? 'लिंग' : lang === 'ta' ? 'பாலினம்' : 'Gender';
    document.querySelector('#pv-state .pv-label').textContent = lang === 'hi' ? 'राज्य' : lang === 'ta' ? 'மாநிலம்' : 'State';
    const confirmMsg = lang === 'hi' ? `समझ गया। उम्र ${profile.age || 'अज्ञात'}, व्यवसाय ${profile.occupation ? getOccupationLabel(profile.occupation, lang) : 'अज्ञात'}। अब योजनाएं खोजते हैं।`
        : lang === 'ta' ? `புரிந்தது. வயது ${profile.age || 'தெரியவில்லை'}, தொழில் ${profile.occupation ? getOccupationLabel(profile.occupation, lang) : 'தெரியவில்லை'}. இப்போது திட்டங்களைத் தேடுவோம்.`
            : `Got it. Age ${profile.age || 'unknown'}, occupation ${profile.occupation ? getOccupationLabel(profile.occupation, lang) : 'unknown'}. Let me find schemes for you.`;
    speakText(confirmMsg, lang);
    setTimeout(() => { preview.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
}

// ============================================
//  PAGE 3: AI Agent Reasoning
// ============================================
function runAgentAnalysis() {
    navigateToPage(3);
    const profile = { ...collectedProfile };
    const lang = currentLang;
    
    // Show loading state with proper titles
    document.getElementById('page3-title').textContent = t('analyzingTitle', lang);
    document.getElementById('page3-desc').textContent = t('analyzingDesc', lang);
    document.getElementById('analyzing-message').textContent = t('analyzingMessage', lang);
    
    // Show analyzing container, hide reasoning steps
    const analyzingContainer = document.getElementById('analyzing-container');
    const reasoningContainer = document.getElementById('reasoning-container');
    if (analyzingContainer) analyzingContainer.classList.remove('hidden');
    if (reasoningContainer) reasoningContainer.classList.add('hidden');
    document.getElementById('results-summary').classList.add('hidden');
    
    // Set assistant to thinking state
    setAssistantState('thinking');
    setFloatingAssistantState('robotThinking');
    
    // Voice announcement
    speakText(t('analyzingDesc', lang), lang);
    
    // Animate progress steps sequentially
    const steps = [
        { id: 'step-1', delay: 0 },
        { id: 'step-2', delay: 800 },
        { id: 'step-3', delay: 1600 },
        { id: 'step-4', delay: 2400 }
    ];
    
    steps.forEach(({ id, delay }) => {
        setTimeout(() => {
            const stepEl = document.getElementById(id);
            if (stepEl) {
                // Mark previous steps as completed
                steps.forEach(s => {
                    if (s.delay < delay) {
                        const prevStep = document.getElementById(s.id);
                        if (prevStep) {
                            prevStep.classList.remove('active');
                            prevStep.classList.add('completed');
                            prevStep.innerHTML = '✓ ' + prevStep.textContent.replace('⏳ ', '').replace('✓ ', '');
                        }
                    }
                });
                // Mark current step as active
                stepEl.classList.add('active');
                stepEl.innerHTML = '⏳ ' + stepEl.textContent.replace('⏳ ', '').replace('✓ ', '');
            }
        }, delay);
    });
    
    // Simulate analysis (3 seconds)
    setTimeout(() => {
        // Mark last step as completed
        const lastStep = document.getElementById('step-4');
        if (lastStep) {
            lastStep.classList.remove('active');
            lastStep.classList.add('completed');
            lastStep.innerHTML = '✓ ' + lastStep.textContent.replace('⏳ ', '').replace('✓ ', '');
        }
        
        // Run actual analysis
        const eligible = [], notEligible = [];
        console.log('[Eligibility Analysis] Starting analysis for all schemes...');
        console.log('[Eligibility Analysis] Total schemes in database:', Object.keys(VERIFIED_SCHEMES).length);
        
        for (const [id, scheme] of Object.entries(VERIFIED_SCHEMES)) {
            const result = checkEligibility(profile, scheme, lang);
            // Only include schemes that are eligible AND have confidence >= 70%
            if (result.eligible && result.confidence >= 0.70) {
                eligible.push({ scheme, result, id });
                console.log(`[Eligibility Analysis] ✓ ELIGIBLE: ${scheme.name.en} (${id}) - Confidence: ${Math.round(result.confidence * 100)}%`);
            } else {
                notEligible.push({ scheme, result, id });
                if (result.eligible && result.confidence < 0.70) {
                    console.log(`[Eligibility Analysis] ⚠ Eligible but low confidence: ${scheme.name.en} (${id}) - ${Math.round(result.confidence * 100)}%`);
                } else {
                    console.log(`[Eligibility Analysis] ✗ Not eligible: ${scheme.name.en} (${id})`);
                }
            }
        }
        eligible.sort((a, b) => b.result.confidence - a.result.confidence);
        
        console.log('[Eligibility Analysis] Analysis complete!');
        console.log('[Eligibility Analysis] Eligible schemes:', eligible.length);
        console.log('[Eligibility Analysis] Not eligible schemes:', notEligible.length);
        console.log('[Eligibility Analysis] Eligible scheme IDs:', eligible.map(e => e.id));
        
        analysisResults = { eligible, notEligible, profile };
        
        // Hide analyzing container
        if (analyzingContainer) analyzingContainer.classList.add('hidden');
        
        // Navigate to results page (Page 4)
        setTimeout(() => {
            goToExplanations();
        }, 500);
    }, 3200);
}

function getReasoningSteps(profile, lang) {
    const steps = [];
    steps.push({ icon: '📥', text: lang === 'hi' ? '<strong>प्रोफ़ाइल लोड हो रहा है...</strong> आपकी जानकारी प्राप्त हुई।' : lang === 'ta' ? '<strong>சுயவிவரம் ஏற்றப்படுகிறது...</strong> உங்கள் தகவல் பெறப்பட்டது.' : '<strong>Loading profile...</strong> Your information has been received.', status: 'success' });
    if (profile.age) steps.push({ icon: '🎂', text: lang === 'hi' ? `<strong>उम्र विश्लेषण:</strong> ${profile.age} वर्ष — उम्र-आधारित फ़िल्टर लागू किए जा रहे हैं।` : lang === 'ta' ? `<strong>வயது பகுப்பாய்வு:</strong> ${profile.age} வயது — வயது சார்ந்த வடிகட்டிகள் பயன்படுத்தப்படுகின்றன.` : `<strong>Age analysis:</strong> ${profile.age} years — applying age-based eligibility filters.`, status: 'success' });
    if (profile.occupation) { const occLabel = getOccupationLabel(profile.occupation, lang); steps.push({ icon: '💼', text: lang === 'hi' ? `<strong>व्यवसाय विश्लेषण:</strong> ${occLabel} — व्यवसाय-विशिष्ट योजनाओं की जांच हो रही है।` : lang === 'ta' ? `<strong>தொழில் பகுப்பாய்வு:</strong> ${occLabel} — தொழில் சார்ந்த திட்டங்கள் சரிபார்க்கப்படுகின்றன.` : `<strong>Occupation analysis:</strong> ${occLabel} — checking occupation-specific schemes.`, status: 'success' }); }
    if (profile.gender) steps.push({ icon: '👤', text: lang === 'hi' ? `<strong>लिंग जांच:</strong> ${profile.gender === 'female' ? 'महिला' : 'पुरुष'} — लिंग-विशिष्ट योजनाएं शामिल की जा रही हैं।` : lang === 'ta' ? `<strong>பாலின சரிபார்ப்பு:</strong> ${profile.gender === 'female' ? 'பெண்' : 'ஆண்'} — பாலின-குறிப்பிட்ட திட்டங்கள் சேர்க்கப்படுகின்றன.` : `<strong>Gender check:</strong> ${profile.gender === 'female' ? 'Female' : 'Male'} — including gender-specific schemes.`, status: 'success' });
    steps.push({ icon: '🔍', text: lang === 'hi' ? `<strong>डेटाबेस मिलान:</strong> ${Object.keys(VERIFIED_SCHEMES).length} सत्यापित सरकारी योजनाओं के खिलाफ मिलान किया जा रहा है...` : lang === 'ta' ? `<strong>தரவுத்தள ஒப்பீடு:</strong> ${Object.keys(VERIFIED_SCHEMES).length} சரிபார்க்கப்பட்ட அரசுத் திட்டங்களுடன் ஒப்பிடப்படுகிறது...` : `<strong>Database matching:</strong> Matching against ${Object.keys(VERIFIED_SCHEMES).length} verified government schemes...`, status: 'processing' });
    steps.push({ icon: '⚙️', text: lang === 'hi' ? '<strong>पात्रता गणना:</strong> नियम-आधारित तर्क इंजन चल रहा है — AI एजेंट निर्णय ले रहा है।' : lang === 'ta' ? '<strong>தகுதி கணக்கீடு:</strong> விதி அடிப்படையிலான தர்க்க இயந்திரம் இயங்குகிறது — AI முகவர் முடிவெடுக்கிறது.' : '<strong>Eligibility computation:</strong> Rule-based reasoning engine running — AI agent is making decisions.', status: 'processing' });
    steps.push({ icon: '✅', text: lang === 'hi' ? '<strong>विश्लेषण पूरा!</strong> परिणाम तैयार हैं।' : lang === 'ta' ? '<strong>பகுப்பாய்வு முடிந்தது!</strong> முடிவுகள் தயார்.' : '<strong>Analysis complete!</strong> Results are ready.', status: 'success' });
    return steps;
}

function addReasoningStep(step) {
    const stepsContainer = document.getElementById('reasoning-steps');
    const div = document.createElement('div');
    div.className = `reasoning-step ${step.status}`;
    div.innerHTML = `<span class="step-icon">${step.status === 'processing' ? '⏳' : step.icon}</span><span class="step-text">${step.text}</span>`;
    stepsContainer.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (step.status === 'processing') {
        setTimeout(() => { div.classList.remove('processing'); div.classList.add('success'); div.querySelector('.step-icon').textContent = step.icon; }, 500);
    }
}

function computeAndShowResults(profile, lang) {
    const eligible = [], notEligible = [];
    for (const [id, scheme] of Object.entries(VERIFIED_SCHEMES)) {
        const result = checkEligibility(profile, scheme, lang);
        // Only include schemes that are eligible AND have confidence >= 70%
        if (result.eligible && result.confidence >= 0.70) {
            eligible.push({ scheme, result, id });
        } else {
            notEligible.push({ scheme, result, id });
        }
    }
    eligible.sort((a, b) => b.result.confidence - a.result.confidence);
    analysisResults = { eligible, notEligible, profile };
    renderResults(eligible, notEligible, lang);
}

// Scheme icon mapping
function getSchemeIcon(schemeId) {
    const icons = { 'pm-kisan': '🌾', 'pm-kisan-maandhan': '👴', 'pmay': '🏠', 'pmjdy': '🏦', 'pmjjby': '🛡️', 'pmsby': '🔒', 'mudra': '💰', 'ujjwala': '🔥', 'scholarship-nsp': '🎓', 'ayushman-bharat': '🏥', 'pmkvy': '📚', 'sukanya-samriddhi': '👧', 'atal-pension': '💼', 'stand-up-india': '🚀' };
    return icons[schemeId] || '📋';
}

function renderResults(eligible, notEligible, lang) {
    const summary = document.getElementById('results-summary');
    document.getElementById('results-title').textContent = lang === 'hi' ? 'आपके लिए पात्र योजनाएं' : lang === 'ta' ? 'உங்களுக்கான தகுதியான திட்டங்கள்' : 'Eligible Schemes for You';
    document.getElementById('results-subtitle').textContent = lang === 'hi' ? `${eligible.length} योजनाएं मिलीं` : lang === 'ta' ? `${eligible.length} திட்டங்கள் கிடைத்தன` : `${eligible.length} schemes found for you`;
    document.getElementById('eligible-title').textContent = lang === 'hi' ? `✅ पात्र योजनाएं (${eligible.length})` : lang === 'ta' ? `✅ தகுதியான திட்டங்கள் (${eligible.length})` : `✅ Eligible Schemes (${eligible.length})`;

    // Render improved scheme cards with numbering
    renderImprovedSchemeCards(eligible, lang);

    summary.classList.remove('hidden');
    // Speak results + chatbot hint
    const speakMsg = lang === 'hi' 
        ? `विश्लेषण पूरा। आप ${eligible.length} सरकारी योजनाओं के लिए पात्र हैं।`
        : lang === 'ta'
        ? `பகுப்பாய்வு முடிந்தது. நீங்கள் ${eligible.length} அரசுத் திட்டங்களுக்கு தகுதியானவர்.`
        : `Analysis complete. You are eligible for ${eligible.length} government schemes.`;
    speakText(speakMsg, lang);
    document.getElementById('explain-btn-text').textContent = t('explainBtn', lang);
}

function speakSchemeDetails(schemeId) {
    if (!analysisResults) return;
    const found = analysisResults.eligible.find(e => e.id === schemeId);
    if (found) {
        // Set assistant to speaking state
        setAssistantState('speaking');
        setFloatingAssistantState('robotSpeaking');
        
        speakText(t('voiceSchemeSelected', currentLang) + ' ' + found.result.explanation, currentLang);
        
        // Reset to idle after speech duration (estimate)
        const speechDuration = getEstimatedSpeechDuration(found.result.explanation);
        setTimeout(() => {
            resetAssistantState();
        }, speechDuration + 500);
    }
}

function navigateToSchemeDetails(schemeId) {
    if (!analysisResults) return;
    const schemeIndex = analysisResults.eligible.findIndex(e => e.id === schemeId);
    if (schemeIndex === -1) return;
    
    // Set active scheme and navigate to Page 5 (guide page)
    activeGuideSchemeIndex = schemeIndex;
    goToGuide();
}

function getShortIneligibleReason(result, lang) {
    const explanation = result.explanation;
    const lines = explanation.split('\n').filter(l => l.trim().startsWith('•'));
    if (lines.length > 0) {
        const reason = lines.find(l => l.includes('not') || l.includes('नहीं') || l.includes('இல்லை') || l.includes('but') || l.includes('लेकिन') || l.includes('ஆனால்'));
        if (reason) return reason.replace('•', '').trim().substring(0, 80);
    }
    return lang === 'hi' ? 'पात्र नहीं' : lang === 'ta' ? 'தகுதி இல்லை' : 'Not eligible';
}

// ============================================
//  PAGE 4: Human AI Explanation
// ============================================
function goToExplanations() {
    navigateToPage(4);
    if (!analysisResults) return;
    const lang = currentLang;
    
    // Render scheme cards at the top of Page 4
    const container = document.getElementById('explanation-cards');
    container.innerHTML = '';
    
    // Add scheme cards section before explanations
    const schemeCardsSection = document.createElement('div');
    schemeCardsSection.className = 'schemes-section';
    schemeCardsSection.innerHTML = `
        <h3 class="schemes-section-title eligible-title" id="eligible-title-page4">✅ ${lang === 'hi' ? `पात्र योजनाएं (${analysisResults.eligible.length})` : lang === 'ta' ? `தகுதியான திட்டங்கள் (${analysisResults.eligible.length})` : `Eligible Schemes (${analysisResults.eligible.length})`}</h3>
        <div class="scheme-cards-grid" id="eligible-cards-page4"></div>
    `;
    container.appendChild(schemeCardsSection);
    
    // Render improved scheme cards
    renderImprovedSchemeCardsPage4(analysisResults.eligible, lang);
    
    // Only eligible schemes explanations
    analysisResults.eligible.forEach(({ scheme, result }, index) => {
        const card = createExplanationCard(scheme, result, '✅', index, lang);
        container.appendChild(card);
    });
    
    document.getElementById('scam-title').textContent = lang === 'hi' ? 'धोखाधड़ी जांच' : lang === 'ta' ? 'மோசடி சரிபார்ப்பு' : 'Scam Alert Check';
    document.getElementById('scam-desc').textContent = lang === 'hi' ? 'WhatsApp पर किसी योजना के बारे में सुना? मैं इसे सत्यापित करूंगा।' : lang === 'ta' ? 'WhatsApp-ல் ஒரு திட்டத்தைப் பற்றி கேள்விப்பட்டீர்களா? நான் சரிபார்க்கிறேன்.' : 'Heard about a scheme on WhatsApp? Let me verify it for you.';
    document.getElementById('scam-input').placeholder = t('scamPlaceholder', lang);
    document.getElementById('scam-verify-btn').textContent = t('scamVerifyBtn', lang);
    document.getElementById('guide-btn-text').textContent = t('guideBtn', lang);
    setTimeout(() => { speakText(t('voicePage4', lang), lang); }, 600);
}

// Render scheme cards on Page 4
function renderImprovedSchemeCardsPage4(eligible, lang) {
    const eligibleContainer = document.getElementById('eligible-cards-page4');
    if (!eligibleContainer) return;
    
    eligibleContainer.innerHTML = '';
    
    // Limit to maximum 4 schemes
    const schemesToShow = eligible.slice(0, 4);
    
    schemesToShow.forEach(({ scheme, result, id }, idx) => {
        const card = document.createElement('div');
        card.className = 'scheme-card-realistic';
        card.style.animationDelay = `${idx * 0.1}s`;
        
        const docs = result.missing_documents || [];
        const docsPreview = docs.slice(0, 3).join(', ');
        const eligibilityPercent = Math.round(result.confidence * 100);
        
        // Get realistic image for the scheme
        const schemeImage = getRealisticSchemeImage(id);
        console.log(`[Page4] Rendering card ${idx + 1}: id="${id}", scheme="${scheme.name[lang]}", image="${schemeImage.url}"`);
        
        card.innerHTML = `
            <div class="scheme-number-badge">${idx + 1}</div>
            <div class="scheme-image-container">
                <img src="${schemeImage.url}" alt="${schemeImage.alt}" class="scheme-realistic-image" loading="lazy">
                <div class="scheme-eligibility-overlay">
                    <span class="eligibility-percentage">${eligibilityPercent}%</span>
                </div>
            </div>
            <div class="scheme-card-content">
                <h3 class="scheme-card-name">${scheme.name[lang]}</h3>
                <p class="scheme-card-description">${scheme.description[lang]}</p>
                <div class="scheme-required-docs">
                    <strong>${t('requiredDocs', lang)}:</strong> ${docsPreview}${docs.length > 3 ? '...' : ''}
                </div>
                <div class="scheme-card-actions">
                    <button class="scheme-listen-btn" onclick="speakSchemeDetails('${id}'); event.stopPropagation();">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        ${t('listenBtn', lang)}
                    </button>
                </div>
            </div>
        `;
        
        card.onclick = (e) => {
            if (!e.target.closest('.scheme-listen-btn')) {
                navigateToSchemeDetails(id);
            }
        };
        
        eligibleContainer.appendChild(card);
    });
}

function createExplanationCard(scheme, result, statusIcon, index, lang) {
    const card = document.createElement('div');
    card.className = 'explanation-card';
    card.style.animationDelay = `${index * 0.1}s`;
    const confPercent = Math.round(result.confidence * 100);
    card.innerHTML = `
        <div class="exp-header"><span class="exp-status">${statusIcon}</span><span class="exp-name">${scheme.name[lang]}</span></div>
        <div class="exp-body">
            <p class="exp-text">${escapeHtml(result.explanation)}</p>
            <button class="exp-voice-btn" onclick="speakText(\`${escapeForAttr(result.explanation)}\`, '${lang}')">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ${t('listenBtn', lang)}
            </button>
            <div class="exp-confidence">
                <span class="exp-conf-label">${lang === 'hi' ? 'विश्वास' : lang === 'ta' ? 'நம்பகம்' : 'Confidence'}</span>
                <div class="exp-conf-bar"><div class="exp-conf-fill" style="width: ${confPercent}%"></div></div>
                <span class="exp-conf-value">${confPercent}%</span>
            </div>
        </div>
    `;
    return card;
}

// ============================================
//  SCAM ALERT CHECK
// ============================================
function verifyScheme() {
    const input = document.getElementById('scam-input');
    const text = input.value.trim();
    if (!text) return;
    const resultDiv = document.getElementById('scam-result');
    const lang = currentLang;
    const scheme = findSchemeByName(text);
    if (scheme) {
        resultDiv.className = 'scam-result verified';
        resultDiv.innerHTML = `✅ <strong>${scheme.name[lang]}</strong> ${lang === 'hi' ? 'एक सत्यापित सरकारी योजना है।' : lang === 'ta' ? 'ஒரு சரிபார்க்கப்பட்ட அரசுத் திட்டம்.' : 'is a verified government scheme.'}<br>Official: <a href="${scheme.officialUrl}" target="_blank" style="color: var(--success-light)">${scheme.officialUrl}</a>`;
        speakText(scheme.name[lang] + (lang === 'hi' ? ' एक सत्यापित सरकारी योजना है।' : lang === 'ta' ? ' ஒரு சரிபார்க்கப்பட்ட அரசுத் திட்டம்.' : ' is a verified government scheme.'), lang);
    } else {
        resultDiv.className = 'scam-result unverified';
        resultDiv.innerHTML = `🚨 <strong>"${escapeHtml(text)}"</strong> ${lang === 'hi' ? 'सरकारी रिकॉर्ड में नहीं मिला।' : lang === 'ta' ? 'அரசாங்க பதிவுகளில் கிடைக்கவில்லை.' : 'was not found in official government records.'}<br><br>⚠️ ${lang === 'hi' ? 'सावधानी: कभी भी अज्ञात व्यक्तियों को पैसे न दें।' : lang === 'ta' ? 'எச்சரிக்கை: யாரிடமும் பணம் கொடுக்காதீர்கள்.' : 'Caution: Never share money with unknown persons.'}`;
        speakText(lang === 'hi' ? `${text} सरकारी रिकॉर्ड में नहीं मिला। कृपया सावधानी बरतें।` : lang === 'ta' ? `${text} அரசாங்க பதிவுகளில் கிடைக்கவில்லை. எச்சரிக்கையாக இருங்கள்.` : `${text} was not found in official government records. Please be cautious.`, lang);
    }
    resultDiv.classList.remove('hidden');
}

// ============================================
//  PAGE 5: Guided Application + How to Apply
// ============================================
function goToGuide() {
    navigateToPage(5);
    if (!analysisResults || analysisResults.eligible.length === 0) {
        document.getElementById('guide-container').innerHTML = `<div class="human-loop-card"><div class="hloop-icon">ℹ️</div><h4>${currentLang === 'hi' ? 'कोई पात्र योजना नहीं मिली' : currentLang === 'ta' ? 'தகுதியான திட்டம் இல்லை' : 'No Eligible Schemes Found'}</h4><p>${currentLang === 'hi' ? 'कृपया अन्य जानकारी के साथ पुनः प्रयास करें।' : currentLang === 'ta' ? 'வேறு தகவல்களுடன் மீண்டும் முயற்சிக்கவும்.' : 'Please try again with different details.'}</p></div>`;
        return;
    }
    const lang = currentLang;
    const tabContainer = document.getElementById('guide-scheme-selector');
    tabContainer.innerHTML = '';
    analysisResults.eligible.forEach(({ scheme }, index) => {
        const tab = document.createElement('button');
        tab.className = `guide-scheme-tab${index === 0 ? ' active' : ''}`;
        tab.textContent = scheme.name[lang];
        tab.onclick = () => switchGuideScheme(index);
        tabContainer.appendChild(tab);
    });
    switchGuideScheme(0);
    buildJsonOutput();
    document.getElementById('restart-btn-text').textContent = t('restartBtn', lang);
    const firstScheme = analysisResults.eligible[0].scheme.name[lang];
    speakText(t('voicePage5', lang), lang);
    setTimeout(() => { speakText(t('voiceChatbotReminder', lang), lang); }, 10000);
}

function switchGuideScheme(index) {
    activeGuideSchemeIndex = index;
    document.querySelectorAll('.guide-scheme-tab').forEach((tab, i) => tab.classList.toggle('active', i === index));
    const { scheme, result } = analysisResults.eligible[index];
    renderGuideContent(scheme, result, analysisResults.profile, currentLang);
}

function getHowToApplySteps(scheme, lang) {
    const steps = {
        en: { online: [], offline: [] }, hi: { online: [], offline: [] }, ta: { online: [], offline: [] }
    };
    const url = scheme.officialUrl;
    
    // Extract domain name from URL for display
    const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const clickableLink = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="scheme-link">${displayUrl}</a>`;
    
    // English steps with improved formatting
    steps.en.online = [
        `<strong>Visit the official website:</strong><br>${clickableLink}`,
        '<strong>Register</strong> using Aadhaar and mobile number',
        '<strong>Fill the application form</strong> with your details',
        '<strong>Upload required documents</strong> (PDF/JPG)',
        '<strong>Submit the application</strong>',
        '<strong>Save your reference number</strong> to track status'
    ];
    steps.en.offline = [
        '<strong>Visit the nearest Common Service Centre (CSC)</strong>',
        '<strong>Carry original documents</strong> and photocopies',
        '<strong>Ask the CSC operator</strong> to fill the application form',
        '<strong>Pay processing fee</strong> if required',
        '<strong>Collect acknowledgement receipt</strong>',
        '<strong>Check status</strong> after 15–30 days'
    ];
    
    // Hindi steps with improved formatting
    steps.hi.online = [
        `<strong>आधिकारिक वेबसाइट पर जाएं:</strong><br>${clickableLink}`,
        '<strong>पंजीकरण करें</strong> आधार और मोबाइल नंबर से',
        '<strong>आवेदन पत्र भरें</strong> अपनी जानकारी के साथ',
        '<strong>दस्तावेज़ अपलोड करें</strong> (PDF/JPG)',
        '<strong>आवेदन जमा करें</strong>',
        '<strong>संदर्भ संख्या सहेजें</strong> स्थिति ट्रैक करने के लिए'
    ];
    steps.hi.offline = [
        '<strong>नजदीकी जन सेवा केंद्र (CSC) पर जाएं</strong>',
        '<strong>मूल दस्तावेज़ ले जाएं</strong> और फोटोकॉपी',
        '<strong>CSC ऑपरेटर से कहें</strong> आवेदन पत्र भरने के लिए',
        '<strong>प्रोसेसिंग शुल्क दें</strong> यदि आवश्यक हो',
        '<strong>पावती रसीद लें</strong>',
        '<strong>स्थिति जांचें</strong> 15-30 दिनों के बाद'
    ];
    
    // Tamil steps with improved formatting
    steps.ta.online = [
        `<strong>அதிகாரப்பூர்வ இணையதளத்தைப் பார்வையிடவும்:</strong><br>${clickableLink}`,
        '<strong>பதிவு செய்யவும்</strong> ஆதார் மற்றும் மொபைல் எண் மூலம்',
        '<strong>விண்ணப்பப் படிவத்தை நிரப்பவும்</strong> உங்கள் விவரங்களுடன்',
        '<strong>ஆவணங்களை பதிவேற்றவும்</strong> (PDF/JPG)',
        '<strong>விண்ணப்பத்தைச் சமர்ப்பிக்கவும்</strong>',
        '<strong>குறிப்பு எண்ணை சேமிக்கவும்</strong> நிலையைக் கண்காணிக்க'
    ];
    steps.ta.offline = [
        '<strong>அருகிலுள்ள பொது சேவை மையத்திற்கு (CSC) செல்லவும்</strong>',
        '<strong>அசல் ஆவணங்களை எடுத்துச் செல்லவும்</strong> மற்றும் நகல்கள்',
        '<strong>CSC ஆபரேட்டரிடம் கேளுங்கள்</strong> விண்ணப்பப் படிவத்தை நிரப்ப',
        '<strong>செயலாக்கக் கட்டணத்தைச் செலுத்தவும்</strong> தேவைப்பட்டால்',
        '<strong>ஒப்புகை ரசீதை பெறவும்</strong>',
        '<strong>நிலையை சரிபார்க்கவும்</strong> 15-30 நாட்களுக்குப் பிறகு'
    ];
    
    return steps[lang] || steps.en;
}

function renderGuideContent(scheme, result, profile, lang) {
    const guideContainer = document.getElementById('guide-container');
    const profileSection = document.getElementById('guide-profile');
    
    if (!guideContainer || !profileSection) return;
    
    // Remove ALL existing video and eligibility sections to prevent duplicates
    // Use querySelectorAll to catch all instances
    guideContainer.querySelectorAll('.video-section').forEach(el => el.remove());
    guideContainer.querySelectorAll('.eligibility-display').forEach(el => el.remove());
    
    // Video Section - Add at the top
    const videoSection = document.createElement('div');
    videoSection.className = 'guide-section video-section';
    
    // Fixed video mapping - Replace these VIDEO_ID placeholders with actual YouTube video IDs
    // To get the video ID: If your YouTube URL is https://www.youtube.com/watch?v=ABC123XYZ
    // Then the video ID is: ABC123XYZ
    // Or edit config.js file to set video IDs
    const videoMap = {
        en: typeof VIDEO_CONFIG !== 'undefined' ? VIDEO_CONFIG.ENGLISH_VIDEO_ID : "VIDEO_ID_ENGLISH",
        hi: typeof VIDEO_CONFIG !== 'undefined' ? VIDEO_CONFIG.HINDI_VIDEO_ID : "VIDEO_ID_HINDI",
        ta: typeof VIDEO_CONFIG !== 'undefined' ? VIDEO_CONFIG.TAMIL_VIDEO_ID : "VIDEO_ID_TAMIL"
    };
    
    // Get the video ID for the selected language
    const videoId = videoMap[lang] || videoMap.en;
    const videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    // Check if video ID is still a placeholder
    const isPlaceholder = videoId.startsWith('VIDEO_ID_');
    
    videoSection.innerHTML = `
        <div class="guide-section-header">
            <span class="guide-section-icon">🎥</span>
            <h4>${lang === 'hi' ? 'आवेदन वीडियो गाइड' : lang === 'ta' ? 'விண்ணப்ப வீடியோ வழிகாட்டி' : 'Application Video Guide'}</h4>
        </div>
        ${isPlaceholder ? `
            <div class="video-container">
                <div class="video-placeholder">
                    <div class="video-icon">🎥</div>
                    <p class="video-text">${lang === 'hi' ? 'वीडियो गाइड उपलब्ध नहीं है। कृपया आधिकारिक सरकारी पोर्टल देखें।' : lang === 'ta' ? 'வீடியோ வழிகாட்டி கிடைக்கவில்லை. தயவுசெய்து அதிகாரப்பூர்வ அரசு போர்டலைப் பார்க்கவும்.' : 'Video guide unavailable. Please check the official government portal.'}</p>
                </div>
            </div>
        ` : `
            <div class="video-container">
                <iframe 
                    class="video-player" 
                    width="100%"
                    height="400"
                    src="${videoEmbedUrl}" 
                    title="${lang === 'hi' ? 'आवेदन वीडियो गाइड' : lang === 'ta' ? 'விண்ணப்ப வீடியோ வழிகாட்டி' : 'Application Video Guide'}"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                </iframe>
            </div>
        `}
        <div class="video-info">
            <p class="video-description">${lang === 'hi' ? 'सरकारी योजनाओं के लिए आवेदन कैसे करें - चरण-दर-चरण गाइड' : lang === 'ta' ? 'அரசு திட்டங்களுக்கு எவ்வாறு விண்ணப்பிப்பது - படிப்படியான வழிகாட்டி' : 'How to Apply for Government Schemes – Step-by-Step Guide'}</p>
            <p class="video-note">${lang === 'hi' ? 'वीडियो आपकी चयनित भाषा में उपलब्ध है' : lang === 'ta' ? 'வீடியோ உங்கள் தேர்ந்தெடுக்கப்பட்ட மொழியில் கிடைக்கும்' : 'Video available in your selected language'}</p>
            <button class="listen-guide-btn" onclick="speakText('${lang === 'hi' ? 'सरकारी योजनाओं के लिए आवेदन प्रक्रिया सुनें' : lang === 'ta' ? 'அரசு திட்டங்களுக்கான விண்ணப்ப செயல்முறையைக் கேளுங்கள்' : 'Listen to the application process guide'}', '${lang}')">
                🔊 ${lang === 'hi' ? 'गाइड सुनें' : lang === 'ta' ? 'வழிகாட்டியைக் கேளுங்கள்' : 'Listen Guide'}
            </button>
        </div>
    `;
    
    // Insert video section before profile section
    guideContainer.insertBefore(videoSection, profileSection);
    
    // Eligibility percentage display
    const eligibilityPercent = Math.round(result.confidence * 100);
    const eligibilitySection = document.createElement('div');
    eligibilitySection.className = 'eligibility-display';
    eligibilitySection.innerHTML = `
        <div class="eligibility-badge">
            <span class="eligibility-percent">${eligibilityPercent}%</span>
            <span class="eligibility-label">${lang === 'hi' ? 'पात्रता मिलान' : lang === 'ta' ? 'தகுதி பொருத்தம்' : 'Eligibility Match'}</span>
        </div>
    `;
    guideContainer.insertBefore(eligibilitySection, profileSection);
    
    // Voice explanation when page opens
    const voiceExplanation = lang === 'hi' 
        ? `आप इस योजना के लिए ${eligibilityPercent} प्रतिशत पात्र हैं। यहां आवश्यक दस्तावेज़ और आवेदन प्रक्रिया है।`
        : lang === 'ta'
        ? `நீங்கள் இந்த திட்டத்திற்கு ${eligibilityPercent} சதவீதம் தகுதியானவர். இங்கே தேவையான ஆவணங்கள் மற்றும் விண்ணப்ப செயல்முறை உள்ளது.`
        : `You are ${eligibilityPercent} percent eligible for this scheme. Here are the required documents and application process.`;
    
    speakText(voiceExplanation, lang);
    
    // Profile Section
    const profileGrid = document.getElementById('guide-profile-grid');
    profileGrid.innerHTML = '';
    [{ label: lang === 'hi' ? 'उम्र' : lang === 'ta' ? 'வயது' : 'Age', value: profile.age || '—' },
    { label: lang === 'hi' ? 'व्यवसाय' : lang === 'ta' ? 'தொழில்' : 'Occupation', value: profile.occupation ? getOccupationLabel(profile.occupation, lang) : '—' },
    { label: lang === 'hi' ? 'लिंग' : lang === 'ta' ? 'பாலினம்' : 'Gender', value: profile.gender ? (lang === 'hi' ? (profile.gender === 'female' ? 'महिला' : 'पुरुष') : lang === 'ta' ? (profile.gender === 'female' ? 'பெண்' : 'ஆண்') : profile.gender) : '—' },
    { label: lang === 'hi' ? 'राज्य' : lang === 'ta' ? 'மாநிலம்' : 'State', value: profile.state || '—' }
    ].forEach(item => {
        const div = document.createElement('div');
        div.className = 'guide-profile-item';
        div.innerHTML = `<span class="gp-label">${item.label}</span><span class="gp-value">${item.value}</span>`;
        profileGrid.appendChild(div);
    });

    // Documents Section with voice guidance
    const docList = document.getElementById('guide-doc-list');
    docList.innerHTML = '';
    (result.missing_documents || []).forEach(doc => {
        const item = document.createElement('div');
        item.className = 'doc-check-item';
        item.onclick = () => item.classList.toggle('checked');
        item.innerHTML = `<div class="doc-checkbox-btn">✓</div><span class="doc-check-label">${doc}</span>`;
        docList.appendChild(item);
    });
    
    // Voice guidance for documents section
    setTimeout(() => {
        const docsVoice = lang === 'hi'
            ? 'ये दस्तावेज़ इस योजना के लिए आवेदन करने के लिए आवश्यक हैं।'
            : lang === 'ta'
            ? 'இந்த ஆவணங்கள் இந்த திட்டத்திற்கு விண்ணப்பிக்க தேவை.'
            : 'These are the documents required to apply for this scheme.';
        speakText(docsVoice, lang);
    }, 5000);

    // How to Apply Section
    const howToApplyContent = document.getElementById('guide-how-to-apply-content');
    const howToApplySteps = getHowToApplySteps(scheme, lang);
    howToApplyContent.innerHTML = `
        <div class="hta-method">
            <h5 class="hta-method-title">🌐 ${t('howToApplyOnline', lang)}</h5>
            <ol class="hta-steps-list">${howToApplySteps.online.map(s => `<li>${s}</li>`).join('')}</ol>
        </div>
        <div class="hta-method">
            <h5 class="hta-method-title">🏢 ${t('howToApplyOffline', lang)}</h5>
            <ol class="hta-steps-list">${howToApplySteps.offline.map(s => `<li>${s}</li>`).join('')}</ol>
        </div>
    `;
    document.getElementById('guide-how-to-apply-title').textContent = t('howToApplyTitle', lang);

    // Steps Section
    const stepsList = document.getElementById('guide-steps-list');
    stepsList.innerHTML = '';
    (result.next_steps || []).forEach((step, i) => {
        const div = document.createElement('div');
        div.className = 'timeline-step';
        div.innerHTML = `<div class="timeline-number">${i + 1}</div><div class="timeline-content"><div class="ts-title">${step}</div></div>`;
        stepsList.appendChild(div);
    });

    // Section titles
    document.getElementById('guide-profile-title').textContent = lang === 'hi' ? 'आपकी जानकारी' : lang === 'ta' ? 'உங்கள் தகவல்' : 'Your Profile';
    document.getElementById('guide-docs-title').textContent = t('requiredDocs', lang);
    document.getElementById('guide-steps-title').textContent = lang === 'hi' ? 'आवेदन प्रक्रिया' : lang === 'ta' ? 'விண்ணப்ப செயல்முறை' : 'Application Steps';
    document.getElementById('hloop-title').textContent = lang === 'hi' ? 'मानव-इन-द-लूप' : lang === 'ta' ? 'மனித-இன்-தி-லூப்' : 'Human-in-the-Loop';
    document.getElementById('hloop-text').textContent = lang === 'hi' ? 'अंतिम आवेदन आपको आधिकारिक पोर्टल या जन सेवा केंद्र (CSC) पर स्वयं जमा करना होगा।' : lang === 'ta' ? 'இறுதி விண்ணப்பத்தை நீங்கள் அதிகாரப்பூர்வ போர்டலில் அல்லது பொது சேவை மையத்தில் (CSC) சமர்ப்பிக்க வேண்டும்.' : 'Final submission must be done by you at the official portal or Common Service Centre (CSC).';
}

function buildJsonOutput() {
    if (!analysisResults) return;
    const lang = currentLang;
    const output = {
        agent: "JanMitra AI", language: lang,
        profile: { age: analysisResults.profile.age, occupation: analysisResults.profile.occupation, gender: analysisResults.profile.gender, state: analysisResults.profile.state },
        eligible_schemes: analysisResults.eligible.map(({ scheme, result }) => ({ scheme_name: scheme.name[lang], eligible: true, confidence: result.confidence, explanation: result.explanation.substring(0, 200) + '...', documents_required: result.missing_documents, next_steps: result.next_steps, official_url: scheme.officialUrl })),
        disclaimer: "This is AI-assisted guidance only.", timestamp: new Date().toISOString()
    };
    document.getElementById('json-panel').textContent = JSON.stringify(output, null, 2);
}

function toggleJsonPanel() {
    const panel = document.getElementById('json-panel');
    const icon = document.getElementById('json-toggle-icon');
    if (panel.classList.contains('json-collapsed')) { panel.classList.remove('json-collapsed'); icon.textContent = '▲'; }
    else { panel.classList.add('json-collapsed'); icon.textContent = '▼'; }
}

// ============================================
//  CHATBOT
// ============================================
function toggleChatbot() {
    chatbotOpen = !chatbotOpen;
    const panel = document.getElementById('chatbot-panel');
    const fab = document.getElementById('chatbot-fab');
    if (chatbotOpen) {
        panel.classList.remove('hidden');
        fab.classList.add('active');
        // Add welcome message if empty
        const msgs = document.getElementById('chatbot-messages');
        if (msgs.children.length === 0) {
            addChatbotMessage(t('chatbotWelcome', currentLang), 'bot');
        }
    } else {
        panel.classList.add('hidden');
        fab.classList.remove('active');
    }
}

function addChatbotMessage(text, sender) {
    const msgs = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = `chatbot-msg chatbot-msg-${sender}`;
    div.innerHTML = `<div class="chatbot-msg-bubble">${text}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    if (sender === 'bot') speakText(text, currentLang);
}

function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addChatbotMessage(text, 'user');
    
    // ISSUE 3 FIX: Correct request format to match backend schema
    setTimeout(async () => {
        try {
            // Set assistant to thinking state
            setFloatingAssistantState('robotThinking');
            
            console.log('[Chatbot] Sending request with text:', text);
            
            const response = await fetch("https://janmitra-backend.onrender.com/ask-ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    transcript: text,
                    language: currentLang,
                    input: {
                        question: text
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            console.log('[Chatbot] Backend response:', data);

            if (data.response) {
                addChatbotMessage(data.response, 'bot');
                
                // ISSUE 8 FIX: Play Polly-generated audio
                if (data.audio) {
                    // Stop browser TTS
                    window.speechSynthesis.cancel();
                    
                    // Stop previous audio if playing
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                    }
                    
                    // Set assistant to speaking state
                    setFloatingAssistantState('robotSpeaking');
                    
                    currentAudio = new Audio("https://janmitra-backend.onrender.com/audio/" + data.audio);
                    currentAudio.play();
                    
                    // Reset to idle when audio ends
                    currentAudio.onended = () => {
                        setFloatingAssistantState('idle');
                    };
                } else {
                    // Fallback to browser TTS if Polly audio not available
                    setFloatingAssistantState('robotSpeaking');
                    speakText(data.response, currentLang);
                }
            } else {
                throw new Error('No response from backend');
            }
            
        } catch (error) {
            console.error('[Chatbot] Error:', error);
            
            const errorMsg = currentLang === 'hi' 
                ? 'क्षमा करें, मुझे जवाब देने में समस्या हो रही है। कृपया पुनः प्रयास करें।'
                : currentLang === 'ta'
                ? 'மன்னிக்கவும், பதிலளிப்பதில் சிக்கல் உள்ளது. மீண்டும் முயற்சிக்கவும்.'
                : 'Sorry, I\'m having trouble responding. Please try again.';
            
            addChatbotMessage(errorMsg, 'bot');
            setFloatingAssistantState('idle');
        }
    }, 500);
}

function processChatbotQuery(query, lang) {
    const lower = query.toLowerCase();
    // Check if it's about a specific scheme
    const scheme = findSchemeByName(lower);
    if (scheme) {
        return `<strong>${scheme.name[lang]}</strong><br>${scheme.description[lang]}<br><br>🔗 ${lang === 'hi' ? 'आधिकारिक साइट' : lang === 'ta' ? 'அதிகாரப்பூர்வ தளம்' : 'Official site'}: ${scheme.officialUrl}`;
    }
    // Check if asking about eligibility
    if (analysisResults && (lower.includes('eligib') || lower.includes('पात्र') || lower.includes('தகுதி') || lower.includes('scheme') || lower.includes('योजना') || lower.includes('திட்ட'))) {
        const eligibleNames = analysisResults.eligible.map(e => e.scheme.name[lang]).join(', ');
        return lang === 'hi' ? `आप इन योजनाओं के लिए पात्र हैं: ${eligibleNames}` : lang === 'ta' ? `நீங்கள் இந்த திட்டங்களுக்கு தகுதியானவர்: ${eligibleNames}` : `You are eligible for: ${eligibleNames}`;
    }
    return t('chatbotOnlySchemes', lang);
}

function toggleChatbotMic() {
    if (!recognition) { showToast('⚠️', t('voiceNotSupported', currentLang)); return; }
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    const chatRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    chatRecognition.lang = langMap[currentLang] || 'en-IN';
    chatRecognition.continuous = false;
    chatRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chatbot-input').value = transcript;
        sendChatbotMessage();
    };
    chatRecognition.onerror = () => showToast('⚠️', t('voiceNotSupported', currentLang));
    try { chatRecognition.start(); } catch (e) { }
}

// ============================================
//  RESTART FLOW
// ============================================
function restartFlow() {
    stopSpeech();
    resetConversationState();
    collectedRawText = '';
    analysisResults = null;
    activeGuideSchemeIndex = 0;
    const collectInput = document.getElementById('collect-input');
    if (collectInput) collectInput.value = '';
    const preview = document.getElementById('profile-preview');
    if (preview) preview.classList.add('hidden');
    navigateToPage(1);
    // No progress indicator to hide
    setTimeout(() => { speakText(t('voiceWelcome', currentLang), currentLang); }, 500);
}

// ============================================
//  TOAST
// ============================================
function showToast(icon, message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.classList.add('hidden'), 300); }, 2500);
}

// ============================================
//  UTILITIES
// ============================================
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function escapeForAttr(text) { return text.replace(/`/g, '\\`').replace(/\\/g, '\\\\').replace(/\n/g, ' '); }


// ============================================
//  FORM SUBMISSION (Page 2) - ISSUE 3 FIX
// ============================================
function submitApplicantForm() {
    const name = document.getElementById('input-name')?.value.trim();
    const age = parseInt(document.getElementById('input-age')?.value);
    const gender = document.getElementById('input-gender')?.value;
    const occupation = document.getElementById('input-occupation')?.value;
    const state = document.getElementById('input-state')?.value;
    
    // Validation
    if (!name || !age || !gender || !occupation || !state) {
        showToast('⚠️', currentLang === 'hi' ? 'कृपया सभी आवश्यक फ़ील्ड भरें' : currentLang === 'ta' ? 'தயவுசெய்து அனைத்து தேவையான புலங்களையும் நிரப்பவும்' : 'Please fill all required fields');
        return;
    }
    
    if (age < 1 || age > 120) {
        showToast('⚠️', currentLang === 'hi' ? 'कृपया मान्य उम्र दर्ज करें' : currentLang === 'ta' ? 'சரியான வயதை உள்ளிடவும்' : 'Please enter a valid age');
        return;
    }
    
    // Update collected profile
    collectedProfile.age = age;
    collectedProfile.gender = gender;
    collectedProfile.occupation = occupation;
    collectedProfile.state = state;
    
    // ISSUE 3 FIX: Greet user by name before analysis
    const greetingMsg = currentLang === 'hi' 
        ? `नमस्ते ${name}। मैं अब आपकी सरकारी कल्याण योजनाओं के लिए पात्रता का विश्लेषण कर रहा हूं।`
        : currentLang === 'ta'
        ? `வணக்கம் ${name}. நான் இப்போது அரசு நல திட்டங்களுக்கான உங்கள் தகுதியை பகுப்பாய்வு செய்கிறேன்.`
        : `Hello ${name}. I am now analyzing your eligibility for government welfare schemes.`;
    
    speakText(greetingMsg, currentLang);
    
    // Navigate to analysis page after greeting completes
    setTimeout(() => {
        runAgentAnalysis();
    }, 2000); // Increased delay to allow greeting to complete
}

// Update form labels when language changes
function updateFormLabels(lang) {
    const labelName = document.getElementById('label-name');
    const labelAge = document.getElementById('label-age');
    const labelGender = document.getElementById('label-gender');
    const labelOccupation = document.getElementById('label-occupation');
    const labelState = document.getElementById('label-state');
    const optMale = document.getElementById('opt-male');
    const optFemale = document.getElementById('opt-female');
    const optOther = document.getElementById('opt-other');
    const submitText = document.getElementById('form-submit-text');
    
    if (labelName) labelName.textContent = getFormLabel('formName', lang);
    if (labelAge) labelAge.textContent = getFormLabel('formAge', lang);
    if (labelGender) labelGender.textContent = getFormLabel('formGender', lang);
    if (labelOccupation) labelOccupation.textContent = getFormLabel('formOccupation', lang);
    if (labelState) labelState.textContent = getFormLabel('formState', lang);
    
    if (optMale) optMale.textContent = getFormLabel('genderMale', lang);
    if (optFemale) optFemale.textContent = getFormLabel('genderFemale', lang);
    if (optOther) optOther.textContent = getFormLabel('genderOther', lang);
    
    if (submitText) submitText.textContent = getFormLabel('submitForm', lang);
}

// Get realistic scheme icons
function getRealisticSchemeIcon(schemeId) {
    const icons = {
        'pm-kisan': '🚜',
        'pm-kisan-maandhan': '👴',
        'pmay': '🏠',
        'pmjdy': '🏦',
        'pmjjby': '🛡️',
        'pmsby': '🔒',
        'mudra': '💰',
        'ujjwala': '🔥',
        'scholarship-nsp': '🎓',
        'ayushman-bharat': '🏥',
        'pmkvy': '📚',
        'sukanya-samriddhi': '👧',
        'atal-pension': '💼',
        'stand-up-india': '🚀'
    };
    return icons[schemeId] || '📋';
}

// Render improved scheme cards with realistic images and numbering
function renderImprovedSchemeCards(eligible, lang) {
    const eligibleContainer = document.getElementById('eligible-cards');
    if (!eligibleContainer) return;
    
    console.log('[Render Cards] Starting to render scheme cards...');
    console.log('[Render Cards] Number of eligible schemes to render:', eligible.length);
    console.log('[Render Cards] Scheme IDs to render:', eligible.map(e => e.id));
    
    eligibleContainer.innerHTML = '';
    
    // Limit to maximum 4 schemes as specified
    const schemesToShow = eligible.slice(0, 4);
    console.log('[Render Cards] Showing first', schemesToShow.length, 'schemes');
    
    schemesToShow.forEach(({ scheme, result, id }, idx) => {
        const card = document.createElement('div');
        card.className = 'scheme-card-realistic';
        card.style.animationDelay = `${idx * 0.1}s`;
        
        const docs = result.missing_documents || [];
        const docsPreview = docs.slice(0, 3).join(', ');
        const eligibilityPercent = Math.round(result.confidence * 100);
        
        // Get realistic image for the scheme
        const schemeImage = getRealisticSchemeImage(id);
        console.log(`[Cards] Rendering card ${idx + 1}: id="${id}", scheme="${scheme.name[lang]}", image="${schemeImage.url}"`);
        
        card.innerHTML = `
            <div class="scheme-number-badge">${idx + 1}</div>
            <div class="scheme-image-container">
                <img src="${schemeImage.url}" alt="${schemeImage.alt}" class="scheme-realistic-image" loading="lazy">
                <div class="scheme-eligibility-overlay">
                    <span class="eligibility-percentage">${eligibilityPercent}%</span>
                </div>
            </div>
            <div class="scheme-card-content">
                <h3 class="scheme-card-name">${scheme.name[lang]}</h3>
                <p class="scheme-card-description">${scheme.description[lang]}</p>
                <div class="scheme-required-docs">
                    <strong>${t('requiredDocs', lang)}:</strong> ${docsPreview}${docs.length > 3 ? '...' : ''}
                </div>
                <div class="scheme-card-actions">
                    <button class="scheme-listen-btn" onclick="speakSchemeDetails('${id}'); event.stopPropagation();">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        ${t('listenBtn', lang)}
                    </button>
                </div>
            </div>
        `;
        
        card.onclick = (e) => {
            if (!e.target.closest('.scheme-listen-btn')) {
                navigateToSchemeDetails(id);
            }
        };
        
        eligibleContainer.appendChild(card);
    });
}

// Get realistic images for schemes (using official government logos)
// This function maps scheme IDs to their corresponding images
function getRealisticSchemeImage(schemeId) {
    // Fallback image - Emblem of India (used when scheme image is not available)
    const fallbackImage = 'https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg';
    
    // Debug logging
    console.log('getRealisticSchemeImage called with schemeId:', schemeId);
    
    // Look up scheme from database using scheme ID (not index)
    const scheme = VERIFIED_SCHEMES[schemeId];
    
    if (!scheme) {
        console.warn('Scheme not found in VERIFIED_SCHEMES:', schemeId);
        return {
            url: fallbackImage,
            alt: 'Government of India Scheme'
        };
    }
    
    console.log('Scheme found:', scheme.name?.en, 'Image:', scheme.image);
    
    // If scheme has an image property, use it
    // This ensures each scheme always gets its correct image based on scheme ID
    if (scheme.image) {
        return {
            url: scheme.image,
            alt: scheme.name[currentLang] || scheme.name.en || 'Government Scheme'
        };
    }
    
    console.warn('Scheme has no image property:', schemeId);
    
    // Fallback to Emblem of India if no image is defined
    return {
        url: fallbackImage,
        alt: 'Government of India Scheme'
    };
}

// ============================================
//  ENHANCED VOICE INPUT FOR COMPREHENSIVE PARSING
// ============================================
let currentVoiceField = null;
let fieldVoiceRecognition = null;

function startVoiceInput(fieldType) {
    if (!recognition) {
        showToast('⚠️', t('voiceNotSupported', currentLang));
        return;
    }
    
    // Safety check: ensure voice status element exists
    const voiceStatus = document.getElementById('voice-status');
    if (!voiceStatus) {
        console.warn('Voice status element not found. User may not be on the input page.');
        return;
    }
    
    currentVoiceField = fieldType;
    
    // Create new recognition instance for comprehensive voice input
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        showToast('⚠️', t('voiceNotSupported', currentLang));
        return;
    }
    
    fieldVoiceRecognition = new SR();
    fieldVoiceRecognition.continuous = false;
    fieldVoiceRecognition.interimResults = false;
    
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    fieldVoiceRecognition.lang = langMap[currentLang] || 'en-IN';
    
    // Show voice status
    const voiceBtn = document.querySelector(`[onclick="startVoiceInput('${fieldType}')"]`);
    
    voiceStatus.classList.remove('hidden');
    const voiceStatusText = document.getElementById('voice-status-text');
    if (voiceStatusText) {
        voiceStatusText.textContent = currentLang === 'hi' ? 'सुन रहा हूँ...' : currentLang === 'ta' ? 'கேட்கிறேன்...' : 'Listening...';
    }
    
    if (voiceBtn) {
        voiceBtn.classList.add('listening');
    }
    
    fieldVoiceRecognition.onstart = () => {
        console.log('Voice input started for field:', fieldType);
    };
    
    fieldVoiceRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log('Voice input result:', transcript);
        
        // Process comprehensive voice input - extract ALL information
        processComprehensiveVoiceInput(transcript);
        
        // Hide voice status
        if (voiceStatus) voiceStatus.classList.add('hidden');
        if (voiceBtn) voiceBtn.classList.remove('listening');
    };
    
    fieldVoiceRecognition.onerror = (event) => {
        console.error('Voice input error:', event.error);
        if (voiceStatus) voiceStatus.classList.add('hidden');
        if (voiceBtn) voiceBtn.classList.remove('listening');
        
        if (event.error === 'not-allowed') {
            showToast('🎤', t('voiceNotSupported', currentLang));
        } else {
            showToast('⚠️', currentLang === 'hi' ? 'आवाज़ स्पष्ट नहीं सुनाई दी' : currentLang === 'ta' ? 'குரல் தெளிவாக கேட்கவில்லை' : 'Voice not clear, please try again');
        }
    };
    
    fieldVoiceRecognition.onend = () => {
        if (voiceStatus) voiceStatus.classList.add('hidden');
        if (voiceBtn) voiceBtn.classList.remove('listening');
    };
    
    try {
        fieldVoiceRecognition.start();
    } catch (e) {
        console.error('Failed to start voice recognition:', e);
        showToast('⚠️', t('voiceNotSupported', currentLang));
    }
}

function processComprehensiveVoiceInput(transcript) {
    console.log('Processing comprehensive voice input:', transcript);
    
    // Extract ALL possible information from the voice input
    const extractedData = extractAllInformationFromSpeech(transcript);
    
    // Fill all available fields
    if (extractedData.name) {
        const nameInput = document.getElementById('input-name');
        if (nameInput) nameInput.value = extractedData.name;
    }
    
    if (extractedData.age) {
        const ageInput = document.getElementById('input-age');
        if (ageInput) ageInput.value = extractedData.age;
    }
    
    if (extractedData.gender) {
        const genderSelect = document.getElementById('input-gender');
        if (genderSelect) genderSelect.value = extractedData.gender;
    }
    
    if (extractedData.state) {
        const stateSelect = document.getElementById('input-state');
        if (stateSelect) stateSelect.value = extractedData.state;
    }
    
    if (extractedData.occupation) {
        const occupationSelect = document.getElementById('input-occupation');
        if (occupationSelect) occupationSelect.value = extractedData.occupation;
    }
    
    // Check for missing information and ask follow-up questions
    checkForMissingInformation(extractedData, transcript);
}

function extractAllInformationFromSpeech(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    const extractedData = {};
    
    // Extract Name
    extractedData.name = extractNameFromSpeech(transcript);
    
    // Extract Age
    extractedData.age = extractAgeFromSpeech(transcript);
    
    // Extract Gender
    extractedData.gender = extractGenderFromSpeech(transcript);
    
    // Extract State
    extractedData.state = extractStateFromSpeech(transcript);
    
    // Extract Occupation
    extractedData.occupation = extractOccupationFromSpeech(transcript);
    
    // Extract Mobile (if mentioned)
    extractedData.mobile = extractMobileFromSpeech(transcript);
    
    return extractedData;
}

function extractGenderFromSpeech(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    
    // Gender detection patterns
    const femalePatterns = [
        'female', 'woman', 'lady', 'girl', 'she', 'her',
        'महिला', 'औरत', 'लड़की', 'स्त्री',
        'பெண்', 'பெண்மணி', 'பெண்ணே'
    ];
    
    const malePatterns = [
        'male', 'man', 'boy', 'gentleman', 'he', 'his', 'him',
        'पुरुष', 'आदमी', 'लड़का', 'मर्द',
        'ஆண்', 'ஆண்மகன்', 'பையன்'
    ];
    
    // Check for female indicators
    for (const pattern of femalePatterns) {
        if (lowerTranscript.includes(pattern)) {
            return 'female';
        }
    }
    
    // Check for male indicators
    for (const pattern of malePatterns) {
        if (lowerTranscript.includes(pattern)) {
            return 'male';
        }
    }
    
    // Try to infer from name patterns (common Indian names)
    const name = extractNameFromSpeech(transcript);
    if (name) {
        const femaleNames = ['priya', 'sharmila', 'sunita', 'kavita', 'meera', 'sita', 'gita', 'rita', 'anita', 'nita'];
        const maleNames = ['ravi', 'raj', 'ram', 'krishna', 'arjun', 'vikash', 'suresh', 'mahesh', 'dinesh'];
        
        const lowerName = name.toLowerCase();
        if (femaleNames.some(fn => lowerName.includes(fn))) return 'female';
        if (maleNames.some(mn => lowerName.includes(mn))) return 'male';
    }
    
    return null;
}

function checkForMissingInformation(extractedData, originalTranscript) {
    const missingFields = [];
    
    if (!extractedData.name) missingFields.push('name');
    if (!extractedData.age) missingFields.push('age');
    if (!extractedData.gender) missingFields.push('gender');
    if (!extractedData.state) missingFields.push('state');
    if (!extractedData.occupation) missingFields.push('occupation');
    
    if (missingFields.length > 0) {
        // Ask follow-up question for missing information
        setTimeout(() => {
            askFollowUpQuestion(missingFields);
        }, 1000);
    } else {
        // All information extracted successfully
        showToast('✅', currentLang === 'hi' ? 'सभी जानकारी सफलतापूर्वक भरी गई' : currentLang === 'ta' ? 'அனைத்து தகவல்களும் வெற்றிகரமாக நிரப்பப்பட்டன' : 'All information filled successfully');
    }
}

function askFollowUpQuestion(missingFields) {
    const fieldNames = {
        en: { name: 'name', age: 'age', gender: 'gender', state: 'state', occupation: 'occupation' },
        hi: { name: 'नाम', age: 'उम्र', gender: 'लिंग', state: 'राज्य', occupation: 'व्यवसाय' },
        ta: { name: 'பெயர்', age: 'வயது', gender: 'பாலினம்', state: 'மாநிலம்', occupation: 'தொழில்' }
    };
    
    const lang = currentLang;
    const missingFieldNames = missingFields.map(field => fieldNames[lang][field]).join(', ');
    
    let question;
    if (lang === 'hi') {
        question = `कृपया अपना ${missingFieldNames} बताएं।`;
    } else if (lang === 'ta') {
        question = `தயவுசெய்து உங்கள் ${missingFieldNames} சொல்லுங்கள்.`;
    } else {
        question = `Please provide your ${missingFieldNames}.`;
    }
    
    speakText(question, lang);
    showToast('🎤', question);
}

// Helper functions to extract information from speech
function extractNameFromSpeech(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    
    // Common patterns for name extraction
    const namePatterns = [
        /(?:my name is|i am|i'm|मेरा नाम|मैं हूं|என் பெயர்|நான்)\s+([a-zA-Z\s]+)/i,
        /^([a-zA-Z\s]+)$/i // If it's just a name
    ];
    
    for (const pattern of namePatterns) {
        const match = transcript.match(pattern);
        if (match && match[1]) {
            return match[1].trim().replace(/\b\w/g, l => l.toUpperCase()); // Title case
        }
    }
    
    return transcript.trim();
}

function extractAgeFromSpeech(transcript) {
    // Extract numbers from speech
    const numberWords = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
        'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
        'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
        'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90
    };
    
    // First try to find direct numbers
    const numberMatch = transcript.match(/\d+/);
    if (numberMatch) {
        const age = parseInt(numberMatch[0]);
        if (age >= 1 && age <= 120) {
            return age;
        }
    }
    
    // Try to find word numbers
    const lowerTranscript = transcript.toLowerCase();
    for (const [word, number] of Object.entries(numberWords)) {
        if (lowerTranscript.includes(word)) {
            return number;
        }
    }
    
    return null;
}

function extractOccupationFromSpeech(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    
    // Occupation mapping with enhanced patterns
    const occupationMap = {
        'farmer': ['farmer', 'farming', 'agriculture', 'cultivator', 'किसान', 'खेती', 'कृषि', 'விவசாயி', 'விவசாயம்', 'கृषि'],
        'student': ['student', 'studying', 'study', 'scholar', 'छात्र', 'छात्रा', 'पढ़ाई', 'अध्ययन', 'மாணவர்', 'மாணவி', 'படிப்பு', 'கல்வி'],
        'unemployed': ['unemployed', 'jobless', 'no job', 'without work', 'बेरोजगार', 'काम नहीं', 'नौकरी नहीं', 'வேலையில்லாத', 'வேலை இல்லை', 'தொழில் இல்லை'],
        'self-employed': ['self employed', 'business', 'own business', 'entrepreneur', 'व्यापार', 'धंधा', 'स्वरोजगार', 'சுயதொழில்', 'வியாபாரம்', 'சொந்த தொழில்'],
        'private-employee': ['private job', 'company', 'office', 'corporate', 'प्राइवेट', 'कंपनी', 'ऑफिस', 'तनखाह', 'தனியார்', 'கம்பெனி', 'அலுவலகம்'],
        'government-employee': ['government', 'sarkari', 'govt', 'civil service', 'सरकारी', 'राज्य सेवा', 'केंद्र सरकार', 'அரசு', 'அரசாங்கம்', 'அரசு வேலை'],
        'daily-wage-worker': ['daily wage', 'labor', 'worker', 'labourer', 'construction worker', 'मजदूर', 'दिहाड़ी', 'श्रमिक', 'काम करने वाला', 'கூலி', 'தொழிலாளர்', 'கட்டுமான தொழிலாளி', 'நாள் கூலி'],
        'housewife': ['housewife', 'homemaker', 'house work', 'गृहिणी', 'घर', 'घरेलू काम', 'इल्लत्तरसि', 'வீட்டு வேலை', 'இல்லத்தரசி'],
        'retired': ['retired', 'pension', 'pensioner', 'रिटायर', 'पेंशन', 'सेवानिवृत्त', 'ஓய்வு', 'பென்ஷன்', 'ஓய்வு பெற்ற']
    };
    
    for (const [occupation, keywords] of Object.entries(occupationMap)) {
        for (const keyword of keywords) {
            if (lowerTranscript.includes(keyword)) {
                return occupation;
            }
        }
    }
    
    return null;
}

function extractStateFromSpeech(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    
    // State mapping with common variations
    const stateMap = {
        'Andhra Pradesh': ['andhra pradesh', 'andhra', 'आंध्र प्रदेश', 'ஆந்திர பிரதேசம்'],
        'Bihar': ['bihar', 'बिहार', 'பிஹார்'],
        'Gujarat': ['gujarat', 'गुजरात', 'குஜராத்'],
        'Haryana': ['haryana', 'हरियाणा', 'ஹரியானா'],
        'Karnataka': ['karnataka', 'कर्नाटक', 'கர்நாடகா'],
        'Kerala': ['kerala', 'केरल', 'கேரளா'],
        'Madhya Pradesh': ['madhya pradesh', 'mp', 'मध्य प्रदेश', 'மத்திய பிரதேசம்'],
        'Maharashtra': ['maharashtra', 'महाराष्ट्र', 'மஹாராஷ்டிரா'],
        'Odisha': ['odisha', 'orissa', 'ओडिशा', 'ஒடிசா'],
        'Punjab': ['punjab', 'पंजाब', 'பஞ்சாப்'],
        'Rajasthan': ['rajasthan', 'राजस्थान', 'ராஜஸ்தான்'],
        'Tamil Nadu': ['tamil nadu', 'tamilnadu', 'तमिलनाडु', 'தமிழ்நாடு'],
        'Telangana': ['telangana', 'तेलंगाना', 'தெலங்கானா'],
        'Uttar Pradesh': ['uttar pradesh', 'up', 'उत्तर प्रदेश', 'உத்தர பிரதேசம்'],
        'West Bengal': ['west bengal', 'bengal', 'पश्चिम बंगाल', 'மேற்கு வங்காளம்'],
        'Delhi': ['delhi', 'दिल्ली', 'டெல்லி'],
        'Assam': ['assam', 'असम', 'அசாம்'],
        'Jharkhand': ['jharkhand', 'झारखंड', 'ஜார்கண்ட்'],
        'Chhattisgarh': ['chhattisgarh', 'छत्तीसगढ़', 'சத்தீஸ்கர்']
    };
    
    for (const [state, variations] of Object.entries(stateMap)) {
        for (const variation of variations) {
            if (lowerTranscript.includes(variation)) {
                return state;
            }
        }
    }
    
    return null;
}

function extractMobileFromSpeech(transcript) {
    // Extract 10-digit mobile numbers
    const mobileMatch = transcript.match(/\d{10}/);
    if (mobileMatch) {
        return mobileMatch[0];
    }
    
    // Try to extract numbers with spaces
    const numbersOnly = transcript.replace(/\D/g, '');
    if (numbersOnly.length === 10) {
        return numbersOnly;
    }
    
    return null;
}

// Add CSS for voice status indicator
const voiceStatusCSS = `
.voice-status {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    z-index: 1000;
    backdrop-filter: blur(10px);
}

.voice-wave {
    display: flex;
    gap: 3px;
    align-items: center;
    height: 30px;
}

.voice-wave span {
    width: 3px;
    background: #ff6b35;
    border-radius: 2px;
    animation: voiceWave 1s ease-in-out infinite;
}

.voice-wave span:nth-child(1) { height: 10px; animation-delay: 0s; }
.voice-wave span:nth-child(2) { height: 20px; animation-delay: 0.1s; }
.voice-wave span:nth-child(3) { height: 30px; animation-delay: 0.2s; }
.voice-wave span:nth-child(4) { height: 20px; animation-delay: 0.3s; }
.voice-wave span:nth-child(5) { height: 10px; animation-delay: 0.4s; }

@keyframes voiceWave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(2); }
}
`;

// Add the CSS to the document
if (!document.getElementById('voice-status-css')) {
    const style = document.createElement('style');
    style.id = 'voice-status-css';
    style.textContent = voiceStatusCSS;
    document.head.appendChild(style);
}

// ============================================
//  VOICE GUIDANCE FOR INPUT FIELDS (ISSUE 2 FIX)
// ============================================

function initVoiceGuidanceForInputFields() {
    // Add click event listeners to all form input fields
    // ISSUE 2 FIX: Every click triggers voice guidance (not just first focus)
    const inputFields = [
        { id: 'input-name', key: 'voiceGuidanceName' },
        { id: 'input-age', key: 'voiceGuidanceAge' },
        { id: 'input-gender', key: 'voiceGuidanceGender' },
        { id: 'input-occupation', key: 'voiceGuidanceOccupation' },
        { id: 'input-state', key: 'voiceGuidanceState' }
    ];
    
    inputFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            // Use click event to trigger voice guidance every time
            element.addEventListener('click', () => {
                triggerVoiceInstruction(field.key, currentLang);
            });
            
            // Also add focus event for keyboard navigation
            element.addEventListener('focus', () => {
                triggerVoiceInstruction(field.key, currentLang);
            });
        }
    });
}

function triggerVoiceInstruction(fieldKey, selectedLanguage) {
    // ISSUE 2 FIX: Play voice guidance every time (removed the focusedFields check)
    // Get the voice guidance text from i18n
    const voiceText = t(fieldKey, selectedLanguage);
    
    if (voiceText && voiceText !== fieldKey) {
        // Small delay to ensure field is focused
        setTimeout(() => {
            speakText(voiceText, selectedLanguage);
        }, 200);
    }
}

// Reset function kept for compatibility
function resetVoiceGuidanceState() {
    // No longer needed but kept for compatibility
}

// Update the restart function to reset voice guidance state
const originalRestartFlow = restartFlow;
restartFlow = function() {
    resetVoiceGuidanceState();
    return originalRestartFlow.apply(this, arguments);
};

// Update the navigateToPage function to reset voice guidance when leaving Page 2
const originalNavigateToPage = navigateToPage;
navigateToPage = function(pageNum) {
    if (currentPage === 2 && pageNum !== 2) {
        resetVoiceGuidanceState();
    }
    return originalNavigateToPage.apply(this, arguments);
};
// ============================================
// BACKEND AI CONNECTION
// ============================================

let aiRequestRunning = false;
async function askBackendAI(question, lang) {
    // ISSUE 3 FIX: Use correct variable names and request format
    if (aiRequestRunning) return;
    aiRequestRunning = true;

    try {
        console.log('[Backend AI] Sending request:', question);
        
        const response = await fetch("https://janmitra-backend.onrender.com/ask-ai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                transcript: question,
                language: lang,
                input: {
                    question: question
                }
            })
        });

        const data = await response.json();

        console.log("[Backend AI] Response:", data);

        if (data.audio) {
            // stop browser speech
            window.speechSynthesis.cancel();

            // stop previous audio if playing
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            currentAudio = new Audio("https://janmitra-backend.onrender.com" + data.audio);
            currentAudio.play();
        }

    } catch (error) {
        console.error("[Backend AI] Error:", error);
    } finally {
        aiRequestRunning = false;
    }
}
