/* ============================================
   JanMitra AI — Eligibility Engine (Enhanced)
   ============================================ */

// ---- Conversation State (Agent Mode) ----
let collectedProfile = {
    age: null,
    occupation: null,
    gender: null,
    state: null,
    schemeName: null
};
let conversationStep = 'idle'; // idle, ask_age, ask_occupation, ask_state, processing, done

/**
 * Reset the conversation state
 */
function resetConversationState() {
    collectedProfile = {
        age: null,
        occupation: null,
        gender: null,
        state: null,
        schemeName: null
    };
    conversationStep = 'idle';
}

/**
 * Parse user input to extract profile information
 */
function parseUserInput(text, lang) {
    const profile = {
        age: null,
        occupation: null,
        gender: null,
        state: null,
        schemeName: null,
        rawText: text
    };

    const lower = text.toLowerCase();

    // --- Age Extraction ---
    const agePatterns = [
        /(?:i am|i'm|my age is|age|aged|am)\s*(\d{1,3})/i,
        /(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|வயது|साल|वर्ष)/i,
        /(?:வயது|age|उम्र|आयु)\s*[\s:]*(\d{1,3})/i,
        /(?:என் வயது|எனது வயது)\s*(\d{1,3})/i,
        /(?:मेरी उम्र|मेरा उम्र|मैं)\s*(\d{1,3})/i,
        /(\d{1,3})\s*(?:year|sal|vayas)/i,
        /\b(\d{1,3})\b/
    ];

    for (const pattern of agePatterns) {
        const match = lower.match(pattern);
        if (match) {
            const parsedAge = parseInt(match[1]);
            if (parsedAge > 0 && parsedAge < 150) {
                profile.age = parsedAge;
                break;
            }
        }
    }

    // --- Occupation Extraction ---
    const occupationMap = {
        farmer: [
            "farmer", "farming", "agriculture", "kisan", "kisaan",
            "விவசாயி", "விவசாயம்", "किसान", "खेती", "कृषक", "कृषि"
        ],
        student: [
            "student", "studying", "college", "school", "university",
            "மாணவர்", "மாணவி", "படிக்கிறேன்", "छात्र", "छात्रा", "विद्यार्थी", "पढ़", "स्कूल", "कॉलेज"
        ],
        worker: [
            "worker", "labour", "labor", "daily wage", "construction",
            "தொழிலாளி", "கூலி", "मजदूर", "श्रमिक", "कामगार", "दिहाड़ी"
        ],
        business: [
            "business", "shop", "store", "trader", "merchant",
            "வியாபாரி", "கடை", "व्यापारी", "दुकान", "कारोबार"
        ],
        entrepreneur: [
            "entrepreneur", "startup", "self-employed", "freelance",
            "தொழில்முனைவோர்", "उद्यमी", "स्वरोजगार"
        ],
        self_employed: [
            "self employed", "self-employed", "own business",
            "சுய தொழில்", "स्वरोजगार"
        ],
        unemployed: [
            "unemployed", "jobless", "no job", "no work",
            "வேலையில்லா", "बेरोजगार"
        ],
        homemaker: [
            "homemaker", "housewife", "home maker",
            "இல்லத்தரசி", "गृहिणी"
        ],
        senior_citizen: [
            "senior citizen", "senior", "retired", "pensioner", "old age",
            "மூத்த குடிமகன்", "ஓய்வு", "वरिष्ठ नागरिक", "सीनियर", "रिटायर", "पेंशनर"
        ]
    };

    for (const [occ, keywords] of Object.entries(occupationMap)) {
        if (keywords.some(k => lower.includes(k))) {
            profile.occupation = occ;
            break;
        }
    }

    // Auto-detect senior citizen from age if occupation not specified
    if (!profile.occupation && profile.age && profile.age >= 60) {
        profile.occupation = 'senior_citizen';
    }

    // --- Gender Extraction ---
    // IMPORTANT: Check female FIRST because "female" contains "male" as substring
    const femaleKeywords = [
        "female", "woman", "girl", "she ", "her ", "daughter", "wife", "mother",
        "மாணவி", "பெண்", "महिला", "लड़की", "औरत", "बेटी", "पत्नी", "छात्रा"
    ];
    const maleKeywords = [
        " male", "\\bmale\\b", " man ", "man ", " boy", "son ",
        "ஆண்", "மாணவன்", "पुरुष", "लड़का", "आदमी", "छात्र"
    ];

    if (femaleKeywords.some(k => lower.includes(k))) {
        profile.gender = 'female';
    } else if (maleKeywords.some(k => lower.includes(k)) || /\bmale\b/.test(lower)) {
        profile.gender = 'male';
    }

    // --- State Extraction ---
    const indianStates = [
        "tamil nadu", "tamilnadu", "kerala", "karnataka", "andhra pradesh",
        "telangana", "maharashtra", "gujarat", "rajasthan", "madhya pradesh",
        "uttar pradesh", "bihar", "west bengal", "odisha", "punjab",
        "haryana", "uttarakhand", "jharkhand", "chhattisgarh", "assam",
        "himachal pradesh", "goa", "tripura", "meghalaya", "manipur",
        "nagaland", "mizoram", "arunachal pradesh", "sikkim", "delhi",
        "jammu", "kashmir", "ladakh",
        "தமிழ்நாடு", "கேரளா", "कर्नाटक", "उत्तर प्रदेश", "बिहार",
        "महाराष्ट्र", "राजस्थान", "दिल्ली", "गुजरात"
    ];

    for (const state of indianStates) {
        if (lower.includes(state)) {
            profile.state = state;
            break;
        }
    }

    // --- Scheme Name Extraction ---
    const scheme = findSchemeByName(lower);
    if (scheme) {
        profile.schemeName = scheme.id;
    }

    return profile;
}


/**
 * Check if user is asking identity question
 */
function isIdentityQuestion(text) {
    const lower = text.toLowerCase();
    const patterns = [
        "who are you", "what are you", "tell me about yourself",
        "your name", "what is your name", "who is janmitra",
        "நீ யார்", "உன் பெயர் என்ன", "ஜன்மித்ரா யார்",
        "तुम कौन हो", "आप कौन हैं", "तुम्हारा नाम", "आपका नाम"
    ];
    return patterns.some(p => lower.includes(p));
}

/**
 * Get identity response
 */
function getIdentityResponse(lang) {
    if (lang === "hi") {
        return "मैं जनमित्र AI हूँ। मैं भारत के नागरिकों को सरकारी योजनाओं को आसानी से समझने में मदद करता हूँ, उनकी अपनी भाषा में।";
    } else if (lang === "ta") {
        return "நான் ஜன்மித்ரா AI. இந்தியக் குடிமக்களுக்கு அரசுத் திட்டங்களை அவர்களின் சொந்த மொழியில் எளிதாகப் புரிந்துகொள்ள உதவுகிறேன்.";
    }
    return "I am JanMitra AI. I help citizens understand government schemes easily, in their own language.";
}


/**
 * Check eligibility for a specific scheme
 */
function checkEligibility(profile, scheme, lang) {
    const criteria = scheme.criteria;
    const reasons = [];
    let eligible = true;
    let confidence = 0.5;
    let checks = 0;
    let passed = 0;

    // --- Age Check ---
    if (profile.age !== null) {
        checks++;
        if (criteria.minAge !== undefined && profile.age < criteria.minAge) {
            eligible = false;
            reasons.push(getAgeFailMessage(lang, profile.age, criteria.minAge, 'min'));
        } else if (criteria.maxAge !== undefined && profile.age > criteria.maxAge) {
            eligible = false;
            reasons.push(getAgeFailMessage(lang, profile.age, criteria.maxAge, 'max'));
        } else {
            passed++;
            reasons.push(getAgePassMessage(lang, profile.age));
        }
    } else {
        reasons.push(getAgeMissingMessage(lang));
    }

    // --- Occupation Check ---
    if (profile.occupation) {
        checks++;
        if (criteria.occupation && !criteria.occupation.includes("any")) {
            if (criteria.occupation.includes(profile.occupation)) {
                passed++;
                reasons.push(getOccupationPassMessage(lang, profile.occupation));
            } else {
                eligible = false;
                reasons.push(getOccupationFailMessage(lang, profile.occupation, criteria.occupation, scheme.name[lang]));
            }
        } else {
            passed++;
            reasons.push(getOccupationOpenMessage(lang));
        }
    } else {
        reasons.push(getOccupationMissingMessage(lang));
    }

    // --- Gender Check ---
    if (criteria.gender && criteria.gender !== "any") {
        checks++;
        if (profile.gender) {
            if (profile.gender === criteria.gender) {
                passed++;
                reasons.push(getGenderPassMessage(lang, criteria.gender));
            } else {
                eligible = false;
                reasons.push(getGenderFailMessage(lang, criteria.gender));
            }
        } else {
            reasons.push(getGenderMissingMessage(lang, criteria.gender));
        }
    }

    // Calculate confidence
    if (checks > 0) {
        confidence = passed / checks;
        if (passed === checks && checks >= 2) confidence = Math.min(0.95, confidence + 0.1);
        if (profile.age === null) confidence = Math.max(0.3, confidence - 0.2);
        if (profile.occupation === null) confidence = Math.max(0.3, confidence - 0.15);
    }

    if (!eligible) {
        confidence = Math.min(confidence, 0.9);
    }

    confidence = Math.round(confidence * 100) / 100;

    const explanation = buildExplanation(eligible, reasons, scheme, lang, profile);
    const missingDocuments = getMissingDocuments(profile, scheme, lang);
    const nextSteps = getNextSteps(eligible, scheme, lang);

    return {
        eligible,
        explanation,
        confidence,
        scheme_name: scheme.name[lang],
        application_summary: {
            age: profile.age ? String(profile.age) : (lang === 'hi' ? 'प्रदान नहीं किया गया' : lang === 'ta' ? 'வழங்கப்படவில்லை' : 'Not provided'),
            occupation: profile.occupation ? getOccupationLabel(profile.occupation, lang) : (lang === 'hi' ? 'प्रदान नहीं किया गया' : lang === 'ta' ? 'வழங்கப்படவில்லை' : 'Not provided'),
            state: profile.state || (lang === 'hi' ? 'प्रदान नहीं किया गया' : lang === 'ta' ? 'வழங்கப்படவில்லை' : 'Not provided'),
            gender: profile.gender ? (lang === 'hi' ? (profile.gender === 'female' ? 'महिला' : 'पुरुष') : lang === 'ta' ? (profile.gender === 'female' ? 'பெண்' : 'ஆண்') : profile.gender) : (lang === 'hi' ? 'प्रदान नहीं किया गया' : lang === 'ta' ? 'வழங்கப்படவில்லை' : 'Not provided')
        },
        missing_documents: missingDocuments,
        next_steps: nextSteps
    };
}


/**
 * Get occupation label in the selected language
 */
function getOccupationLabel(occupation, lang) {
    const labels = {
        en: { farmer: "Farmer", student: "Student", worker: "Worker", business: "Business Owner", entrepreneur: "Entrepreneur", self_employed: "Self-Employed", unemployed: "Unemployed", homemaker: "Homemaker", senior_citizen: "Senior Citizen" },
        hi: { farmer: "किसान", student: "छात्र", worker: "श्रमिक", business: "व्यापारी", entrepreneur: "उद्यमी", self_employed: "स्वरोजगारी", unemployed: "बेरोजगार", homemaker: "गृहिणी", senior_citizen: "वरिष्ठ नागरिक" },
        ta: { farmer: "விவசாயி", student: "மாணவர்", worker: "தொழிலாளி", business: "வியாபாரி", entrepreneur: "தொழில்முனைவோர்", self_employed: "சுய தொழில்", unemployed: "வேலையில்லாதவர்", homemaker: "இல்லத்தரசி", senior_citizen: "மூத்த குடிமகன்" }
    };
    return (labels[lang] && labels[lang][occupation]) || occupation;
}

/**
 * Get missing documents for the scheme
 */
function getMissingDocuments(profile, scheme, lang) {
    // If scheme has predefined documents, use those
    if (scheme.requiredDocuments && scheme.requiredDocuments[lang]) {
        return scheme.requiredDocuments[lang];
    }
    
    // Fallback to generic document generation
    const docs = [];
    const docLabels = {
        en: {
            aadhaar: "Aadhaar Card",
            bank: "Bank Account / Passbook",
            income: "Income Certificate",
            caste: "Caste Certificate (if applicable)",
            land: "Land Ownership Records",
            photo: "Passport-size Photographs",
            ration: "Ration Card / BPL Certificate",
            domicile: "Domicile / Residence Proof",
            age_proof: "Age Proof (Birth Certificate / School Certificate)",
            enrollment: "School / College Enrollment Certificate",
            bpl: "BPL Certificate",
            gender_proof: "Gender Proof (for gender-specific schemes)"
        },
        hi: {
            aadhaar: "आधार कार्ड",
            bank: "बैंक खाता / पासबुक",
            income: "आय प्रमाण पत्र",
            caste: "जाति प्रमाण पत्र (यदि लागू हो)",
            land: "भूमि स्वामित्व रिकॉर्ड",
            photo: "पासपोर्ट साइज फोटो",
            ration: "राशन कार्ड / बीपीएल प्रमाण पत्र",
            domicile: "निवास प्रमाण पत्र",
            age_proof: "आयु प्रमाण (जन्म प्रमाण पत्र / स्कूल प्रमाण पत्र)",
            enrollment: "स्कूल / कॉलेज नामांकन प्रमाण पत्र",
            bpl: "बीपीएल प्रमाण पत्र",
            gender_proof: "लिंग प्रमाण (लिंग-विशिष्ट योजनाओं के लिए)"
        },
        ta: {
            aadhaar: "ஆதார் அட்டை",
            bank: "வங்கிக் கணக்கு / பாஸ்புக்",
            income: "வருமானச் சான்றிதழ்",
            caste: "சாதிச் சான்றிதழ் (பொருந்தினால்)",
            land: "நில உரிமை ஆவணங்கள்",
            photo: "பாஸ்போர்ட் அளவு புகைப்படங்கள்",
            ration: "ரேஷன் கார்டு / BPL சான்றிதழ்",
            domicile: "குடியிருப்பு சான்று",
            age_proof: "வயது சான்று (பிறப்புச் சான்றிதழ் / பள்ளி சான்றிதழ்)",
            enrollment: "பள்ளி / கல்லூரி சேர்க்கை சான்றிதழ்",
            bpl: "BPL சான்றிதழ்",
            gender_proof: "பாலின சான்று (பாலின-குறிப்பிட்ட திட்டங்களுக்கு)"
        }
    };

    const dl = docLabels[lang] || docLabels.en;

    // Common documents
    docs.push(dl.aadhaar);
    docs.push(dl.bank);
    docs.push(dl.photo);

    // Scheme-specific documents
    const criteria = scheme.criteria;

    if (criteria.occupation && criteria.occupation.includes("farmer")) {
        docs.push(dl.land);
    }
    if (criteria.occupation && criteria.occupation.includes("student")) {
        docs.push(dl.enrollment);
    }
    if (criteria.bpl) {
        docs.push(dl.bpl);
    }
    if (criteria.incomeLimit) {
        docs.push(dl.income);
    }
    if (criteria.gender && criteria.gender !== "any") {
        // No extra document needed usually, just ID
    }

    // Age proof if age-specific
    if (criteria.minAge || criteria.maxAge) {
        docs.push(dl.age_proof);
    }

    return docs;
}

/**
 * Get next steps based on eligibility result
 */
function getNextSteps(eligible, scheme, lang) {
    const steps = [];

    if (lang === "hi") {
        if (eligible) {
            steps.push(`आधिकारिक वेबसाइट पर जाएं: ${scheme.officialUrl}`);
            steps.push("अपने नजदीकी जन सेवा केंद्र (CSC) पर जाएं");
            steps.push("सभी आवश्यक दस्तावेज़ साथ ले जाएं");
            steps.push("myscheme.gov.in पर भी जानकारी जांचें");
        } else {
            steps.push("पात्रता मापदंड बदल सकते हैं — समय-समय पर जांचते रहें");
            steps.push("myscheme.gov.in पर अन्य योजनाएं देखें");
            steps.push("अपने नजदीकी CSC से मार्गदर्शन लें");
        }
    } else if (lang === "ta") {
        if (eligible) {
            steps.push(`அதிகாரப்பூர்வ இணையதளத்தை பார்வையிடவும்: ${scheme.officialUrl}`);
            steps.push("உங்கள் அருகிலுள்ள பொது சேவை மையம் (CSC) செல்லவும்");
            steps.push("தேவையான அனைத்து ஆவணங்களையும் எடுத்துச் செல்லவும்");
            steps.push("myscheme.gov.in-ல் கூடுதல் தகவல்களை சரிபார்க்கவும்");
        } else {
            steps.push("தகுதி நிபந்தனைகள் மாறலாம் — அவ்வப்போது சரிபார்க்கவும்");
            steps.push("myscheme.gov.in-ல் பிற திட்டங்களைப் பாருங்கள்");
            steps.push("உங்கள் அருகிலுள்ள CSC-யில் வழிகாட்டுதல் பெறுங்கள்");
        }
    } else {
        if (eligible) {
            steps.push(`Visit the official website: ${scheme.officialUrl}`);
            steps.push("Visit your nearest Common Service Centre (CSC)");
            steps.push("Carry all required documents with you");
            steps.push("Also check myscheme.gov.in for more details");
        } else {
            steps.push("Eligibility criteria may change — keep checking periodically");
            steps.push("Explore other schemes at myscheme.gov.in");
            steps.push("Visit your nearest CSC for guidance");
        }
    }

    return steps;
}


/**
 * Build the final explanation text
 */
function buildExplanation(eligible, reasons, scheme, lang, profile) {
    let text = "";
    const schemeName = scheme.name[lang];

    if (lang === "en") {
        if (eligible) {
            text = `Great news! You appear to be eligible for ${schemeName}.\n\n`;
            text += `${scheme.description[lang]}\n\n`;
            text += "Here's why:\n";
            reasons.forEach(r => { text += `• ${r}\n`; });
        } else {
            text = `Based on the information provided, you may not be eligible for ${schemeName} at this time.\n\n`;
            text += "Here's why:\n";
            reasons.forEach(r => { text += `• ${r}\n`; });
            text += "\nDon't worry — eligibility criteria can change, and there may be other schemes that suit you better.";
        }
    } else if (lang === "hi") {
        if (eligible) {
            text = `अच्छी खबर! आप ${schemeName} के लिए पात्र प्रतीत होते हैं।\n\n`;
            text += `${scheme.description[lang]}\n\n`;
            text += "कारण:\n";
            reasons.forEach(r => { text += `• ${r}\n`; });
        } else {
            text = `दी गई जानकारी के आधार पर, आप इस समय ${schemeName} के लिए पात्र नहीं हो सकते।\n\n`;
            text += "कारण:\n";
            reasons.forEach(r => { text += `• ${r}\n`; });
            text += "\nचिंता न करें — पात्रता मापदंड बदल सकते हैं, और अन्य योजनाएं भी हो सकती हैं जो आपके लिए उपयुक्त हों।";
        }
    } else if (lang === "ta") {
        if (eligible) {
            text = `நல்ல செய்தி! ${schemeName} திட்டத்திற்கு நீங்கள் தகுதியுடையவராகத் தெரிகிறது.\n\n`;
            text += `${scheme.description[lang]}\n\n`;
            text += "காரணங்கள்:\n";
            reasons.forEach(r => { text += `• ${r}\n`; });
        } else {
            text = `வழங்கப்பட்ட தகவலின் அடிப்படையில், நீங்கள் இப்போது ${schemeName} திட்டத்திற்கு தகுதியற்றவராக இருக்கலாம்.\n\n`;
            text += "காரணங்கள்:\n";
            reasons.forEach(r => { text += `• ${r}\n`; });
            text += "\nகவலைப்பட வேண்டாம் — தகுதி நிபந்தனைகள் மாறலாம், உங்களுக்கு பொருத்தமான பிற திட்டங்கள் இருக்கலாம்.";
        }
    }

    return text;
}


// ---- Localized reason messages ----

function getAgeFailMessage(lang, age, limit, type) {
    if (lang === "hi") {
        return type === 'min'
            ? `आपकी उम्र ${age} है, लेकिन इस योजना के लिए न्यूनतम ${limit} वर्ष होनी चाहिए।`
            : `आपकी उम्र ${age} है, लेकिन इस योजना के लिए अधिकतम ${limit} वर्ष होनी चाहिए।`;
    } else if (lang === "ta") {
        return type === 'min'
            ? `உங்கள் வயது ${age}, ஆனால் இந்த திட்டத்திற்கு குறைந்தபட்ச வயது ${limit} ஆண்டுகள் தேவை.`
            : `உங்கள் வயது ${age}, ஆனால் இந்த திட்டத்திற்கு அதிகபட்ச வயது ${limit} ஆண்டுகள்.`;
    }
    return type === 'min'
        ? `Your age is ${age}, but this scheme requires a minimum age of ${limit}.`
        : `Your age is ${age}, but this scheme has a maximum age limit of ${limit}.`;
}

function getAgePassMessage(lang, age) {
    if (lang === "hi") return `आपकी उम्र ${age} है — आयु सीमा के अंतर्गत है।`;
    if (lang === "ta") return `உங்கள் வயது ${age} — வயது வரம்பிற்குள் உள்ளது.`;
    return `Your age is ${age} — within the eligible age range.`;
}

function getAgeMissingMessage(lang) {
    if (lang === "hi") return "उम्र की जानकारी नहीं मिली — कृपया बेहतर मूल्यांकन के लिए अपनी उम्र बताएं।";
    if (lang === "ta") return "வயது தகவல் கிடைக்கவில்லை — சிறந்த மதிப்பீட்டிற்கு உங்கள் வயதைத் தெரிவிக்கவும்.";
    return "Age not provided — please share your age for a more accurate assessment.";
}

function getOccupationPassMessage(lang, occupation) {
    const label = getOccupationLabel(occupation, lang);
    if (lang === "hi") return `आपका व्यवसाय (${label}) इस योजना के लिए उपयुक्त है।`;
    if (lang === "ta") return `உங்கள் தொழில் (${label}) இந்த திட்டத்திற்கு பொருத்தமானது.`;
    return `Your occupation (${label}) matches the scheme requirements.`;
}

function getOccupationFailMessage(lang, occupation, required, schemeName) {
    const reqStr = required.join(", ");
    if (lang === "hi") return `यह योजना ${reqStr} के लिए है। आपका व्यवसाय (${occupation}) इसमें शामिल नहीं है।`;
    if (lang === "ta") return `இந்த திட்டம் ${reqStr} பிரிவினருக்கானது. உங்கள் தொழில் (${occupation}) இதில் சேர்க்கப்படவில்லை.`;
    return `This scheme is for ${reqStr}. Your occupation (${occupation}) does not match.`;
}

function getOccupationOpenMessage(lang) {
    if (lang === "hi") return "यह योजना सभी व्यवसायों के लिए खुली है।";
    if (lang === "ta") return "இந்த திட்டம் அனைத்து தொழில்களுக்கும் திறந்தது.";
    return "This scheme is open to all occupations.";
}

function getOccupationMissingMessage(lang) {
    if (lang === "hi") return "व्यवसाय की जानकारी नहीं मिली — कृपया अपना व्यवसाय बताएं।";
    if (lang === "ta") return "தொழில் தகவல் கிடைக்கவில்லை — உங்கள் தொழிலைத் தெரிவிக்கவும்.";
    return "Occupation not provided — please share your occupation for better results.";
}

function getGenderPassMessage(lang, gender) {
    if (lang === "hi") return `यह योजना आपके लिंग (${gender === 'female' ? 'महिला' : 'पुरुष'}) के लिए उपलब्ध है।`;
    if (lang === "ta") return `இந்த திட்டம் உங்கள் பாலினத்திற்கு (${gender === 'female' ? 'பெண்' : 'ஆண்'}) கிடைக்கும்.`;
    return `This scheme is available for your gender (${gender}).`;
}

function getGenderFailMessage(lang, requiredGender) {
    if (lang === "hi") return `यह योजना केवल ${requiredGender === 'female' ? 'महिलाओं' : 'पुरुषों'} के लिए है।`;
    if (lang === "ta") return `இந்த திட்டம் ${requiredGender === 'female' ? 'பெண்களுக்கு' : 'ஆண்களுக்கு'} மட்டுமே.`;
    return `This scheme is only for ${requiredGender === 'female' ? 'women' : 'men'}.`;
}

function getGenderMissingMessage(lang, requiredGender) {
    if (lang === "hi") return `यह योजना ${requiredGender === 'female' ? 'महिलाओं' : 'पुरुषों'} के लिए है — कृपया अपना लिंग बताएं।`;
    if (lang === "ta") return `இந்த திட்டம் ${requiredGender === 'female' ? 'பெண்களுக்கு' : 'ஆண்களுக்கு'} — உங்கள் பாலினத்தைத் தெரிவிக்கவும்.`;
    return `This scheme is for ${requiredGender === 'female' ? 'women' : 'men'} — please confirm your gender.`;
}


/**
 * Generate scam alert response
 */
function generateScamAlert(input, lang) {
    let explanation;

    if (lang === "hi") {
        explanation = `"${input}" — यह योजना सरकारी रिकॉर्ड में उपलब्ध नहीं है। कृपया सावधानी बरतें।\n\nकई नकली योजनाएं सोशल मीडिया पर प्रचारित की जाती हैं। कृपया किसी भी योजना को myscheme.gov.in या अपने जिला कलेक्टर कार्यालय से सत्यापित करें।\n\nकभी भी किसी अज्ञात व्यक्ति को पैसे या अपना आधार/बैंक विवरण न दें।`;
    } else if (lang === "ta") {
        explanation = `"${input}" — இந்த திட்டம் அரசாங்க பதிவுகளில் கிடைக்கவில்லை. தயவுசெய்து எச்சரிக்கையாக இருங்கள்.\n\nபல போலித் திட்டங்கள் சமூக ஊடகங்களில் பரப்பப்படுகின்றன. எந்த ஒரு திட்டத்தையும் myscheme.gov.in அல்லது உங்கள் மாவட்ட ஆட்சியர் அலுவலகத்தில் சரிபார்க்கவும்.\n\nயாரிடமும் பணம் அல்லது ஆதார்/வங்கி விவரங்களை கொடுக்காதீர்கள்.`;
    } else {
        explanation = `"${input}" — This scheme does not appear in official government records. Please be cautious.\n\nMany fake schemes are promoted on social media. Please verify any scheme at myscheme.gov.in or your local district collector's office.\n\nNever share money, Aadhaar, or bank details with unknown persons.`;
    }

    return {
        eligible: false,
        scheme_name: "None",
        explanation,
        confidence: 0.0,
        application_summary: {
            age: "N/A",
            occupation: "N/A",
            state: "N/A"
        },
        missing_documents: [],
        next_steps: lang === 'hi'
            ? ["myscheme.gov.in पर सत्यापित करें", "नजदीकी CSC से संपर्क करें", "अज्ञात व्यक्तियों को कोई जानकारी न दें"]
            : lang === 'ta'
                ? ["myscheme.gov.in-ல் சரிபார்க்கவும்", "அருகிலுள்ள CSC-ஐ தொடர்பு கொள்ளவும்", "அறிமுகமில்லாதவர்களிடம் எந்த தகவலும் தர வேண்டாம்"]
                : ["Verify at myscheme.gov.in", "Contact your nearest CSC", "Do not share any information with unknown persons"]
    };
}


// ---- Agent-Mode Step Messages ----

function getAskAgeMessage(lang) {
    if (lang === "hi") return "आपकी उम्र क्या है? मैं यह इसलिए पूछ रहा हूँ ताकि पात्रता नियमों की जांच कर सकूं।";
    if (lang === "ta") return "உங்கள் வயது என்ன? தகுதி விதிகளை சரிபார்க்க நான் இதைக் கேட்கிறேன்.";
    return "What is your age? I am asking this to check eligibility rules.";
}

function getAskOccupationMessage(lang) {
    if (lang === "hi") {
        return "आपका व्यवसाय क्या है? उदाहरण: छात्र, किसान, बेरोजगार, श्रमिक, वरिष्ठ नागरिक। मैं यह इसलिए पूछ रहा हूँ ताकि सही योजनाएं खोज सकूं।";
    }
    if (lang === "ta") {
        return "உங்கள் தொழில் என்ன? எடுத்துக்காட்டு: மாணவர், விவசாயி, வேலையில்லாதவர், தொழிலாளி, மூத்த குடிமகன். சரியான திட்டங்களைக் கண்டறிய இதைக் கேட்கிறேன்.";
    }
    return "What is your occupation? Example: Student, Farmer, Unemployed, Worker, Senior Citizen. I am asking this to find the right schemes for you.";
}

function getAskStateMessage(lang) {
    if (lang === "hi") return "आप किस राज्य में रहते हैं? यह वैकल्पिक है, लेकिन कुछ योजनाएं राज्य-विशिष्ट होती हैं।";
    if (lang === "ta") return "நீங்கள் எந்த மாநிலத்தில் வசிக்கிறீர்கள்? இது விருப்பமானது, ஆனால் சில திட்டங்கள் மாநிலம் சார்ந்தவை.";
    return "Which state do you live in? This is optional, but some schemes are state-specific.";
}

function getProfileSummaryMessage(profile, lang) {
    const occLabel = profile.occupation ? getOccupationLabel(profile.occupation, lang) : '—';
    const stateLabel = profile.state || '—';

    if (lang === "hi") {
        return `धन्यवाद! आपकी जानकारी:\n• उम्र: ${profile.age || '—'}\n• व्यवसाय: ${occLabel}\n• राज्य: ${stateLabel}\n\nमैं अब आपके लिए उपयुक्त योजनाएं खोज रहा हूँ...`;
    }
    if (lang === "ta") {
        return `நன்றி! உங்கள் தகவல்:\n• வயது: ${profile.age || '—'}\n• தொழில்: ${occLabel}\n• மாநிலம்: ${stateLabel}\n\nநான் இப்போது உங்களுக்கு ஏற்ற திட்டங்களைத் தேடுகிறேன்...`;
    }
    return `Thank you! Your details:\n• Age: ${profile.age || '—'}\n• Occupation: ${occLabel}\n• State: ${stateLabel}\n\nI am now searching for suitable schemes for you...`;
}


/**
 * Handle agent-mode step-by-step conversation
 */
function handleAgentStep(text, lang) {
    const parsed = parseUserInput(text, lang);

    // Merge parsed data into collected profile
    if (parsed.age) collectedProfile.age = parsed.age;
    if (parsed.occupation) collectedProfile.occupation = parsed.occupation;
    if (parsed.gender) collectedProfile.gender = parsed.gender;
    if (parsed.state) collectedProfile.state = parsed.state;
    if (parsed.schemeName) collectedProfile.schemeName = parsed.schemeName;

    // If a scheme is directly mentioned at any step, skip to processing
    if (collectedProfile.schemeName) {
        conversationStep = 'processing';
        return null; // Signal to process immediately
    }

    // Determine what we still need
    switch (conversationStep) {
        case 'ask_age':
            if (collectedProfile.age) {
                conversationStep = 'ask_occupation';
                return { type: 'ask', message: getAskOccupationMessage(lang), occupationOptions: true };
            } else {
                return { type: 'ask', message: getAskAgeMessage(lang) };
            }

        case 'ask_occupation':
            if (collectedProfile.occupation) {
                conversationStep = 'ask_state';
                return { type: 'ask', message: getAskStateMessage(lang) };
            } else {
                return { type: 'ask', message: getAskOccupationMessage(lang), occupationOptions: true };
            }

        case 'ask_state':
            // State is optional, so we proceed even without it
            if (parsed.state || text.toLowerCase().includes('skip') || text.toLowerCase().includes('no') ||
                text.toLowerCase().includes('छोड़') || text.toLowerCase().includes('தேவையில்லை') ||
                text.toLowerCase().includes('நோ')) {
                conversationStep = 'processing';
                return null; // Signal to process
            }
            // Try to match state name
            if (text.trim().length > 1) {
                collectedProfile.state = text.trim();
                conversationStep = 'processing';
                return null;
            }
            return { type: 'ask', message: getAskStateMessage(lang) };

        default:
            conversationStep = 'ask_age';
            return { type: 'ask', message: getAskAgeMessage(lang) };
    }
}


/**
 * Main processing function
 */
function processUserQuery(text, lang) {
    // Check for identity questions first
    if (isIdentityQuestion(text)) {
        return {
            type: "identity",
            result: {
                eligible: false,
                scheme_name: "None",
                explanation: getIdentityResponse(lang),
                confidence: 1.0,
                application_summary: { age: "N/A", occupation: "N/A", state: "N/A" },
                missing_documents: [],
                next_steps: []
            },
            profile: collectedProfile
        };
    }

    // Parse user input
    const profile = parseUserInput(text, lang);

    // Merge with collected profile from agent mode
    if (profile.age) collectedProfile.age = profile.age;
    if (profile.occupation) collectedProfile.occupation = profile.occupation;
    if (profile.gender) collectedProfile.gender = profile.gender;
    if (profile.state) collectedProfile.state = profile.state;
    if (profile.schemeName) collectedProfile.schemeName = profile.schemeName;

    // Use collectedProfile for processing
    const workingProfile = { ...collectedProfile };

    // Check for scam alert first
    if (isPotentialScam(text) && !workingProfile.schemeName) {
        return {
            type: "scam",
            result: generateScamAlert(text, lang),
            profile: workingProfile
        };
    }

    // If a specific scheme is mentioned, check eligibility for that scheme
    if (workingProfile.schemeName) {
        const scheme = VERIFIED_SCHEMES[workingProfile.schemeName];
        const result = checkEligibility(workingProfile, scheme, lang);
        return {
            type: result.eligible ? "eligible" : "not_eligible",
            result,
            profile: workingProfile,
            scheme
        };
    }

    // If no scheme is mentioned, try to find relevant schemes
    const relevantSchemes = getRelevantSchemes(workingProfile);

    if (relevantSchemes.length > 0) {
        const topScheme = relevantSchemes[0];
        const result = checkEligibility(workingProfile, topScheme, lang);
        return {
            type: result.eligible ? "eligible" : "not_eligible",
            result,
            profile: workingProfile,
            scheme: topScheme,
            otherSchemes: relevantSchemes.slice(1)
        };
    }

    // Couldn't determine anything
    let explanation;
    if (lang === "hi") {
        explanation = "मुझे आपकी जानकारी से कोई विशेष योजना पहचानने में कठिनाई हो रही है। कृपया अपनी उम्र, व्यवसाय, या कोई विशिष्ट योजना का नाम बताएं।";
    } else if (lang === "ta") {
        explanation = "உங்கள் தகவலிலிருந்து குறிப்பிட்ட திட்டத்தை அடையாளம் காண சிரமப்படுகிறேன். உங்கள் வயது, தொழில் அல்லது குறிப்பிட்ட திட்டத்தின் பெயரை தெரிவிக்கவும்.";
    } else {
        explanation = "I'm having difficulty identifying a specific scheme from your information. Please share your age, occupation, or mention a specific scheme name.";
    }

    return {
        type: "need_more_info",
        result: {
            eligible: false,
            scheme_name: "None",
            explanation,
            confidence: 0.0,
            application_summary: {
                age: workingProfile.age ? String(workingProfile.age) : "Not provided",
                occupation: workingProfile.occupation || "Not provided",
                state: workingProfile.state || "Not provided"
            },
            missing_documents: [],
            next_steps: []
        },
        profile: workingProfile
    };
}
