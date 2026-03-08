/* ============================================
   JanMitra AI — Government Schemes Database
   
   IMAGE MAPPING SYSTEM:
   Each scheme has an 'image' property that maps to its official logo/banner.
   Images are looked up by scheme ID (not by array index) to ensure correct matching.
   
   When adding a new scheme:
   1. Assign a unique 'id' (e.g., "pm-kisan")
   2. Add an 'image' property with the URL to the scheme's official image
   3. The system will automatically display the correct image for that scheme
   
   Example:
   "scheme-id": {
       id: "scheme-id",
       name: { en: "Scheme Name", hi: "योजना नाम", ta: "திட்ட பெயர்" },
       image: "https://example.com/scheme-image.jpg",
       ...
   }
   ============================================ */

const VERIFIED_SCHEMES = {
    "pm-kisan": {
        id: "pm-kisan",
        name: {
            en: "PM-Kisan Samman Nidhi",
            hi: "पीएम-किसान सम्मान निधि",
            ta: "பிஎம்-கிசான் சம்மான் நிதி"
        },
        description: {
            en: "Financial assistance of ₹6,000 per year to farmer families in three equal installments.",
            hi: "किसान परिवारों को तीन समान किस्तों में प्रति वर्ष ₹6,000 की वित्तीय सहायता।",
            ta: "விவசாய குடும்பங்களுக்கு ஆண்டுதோறும் ₹6,000 மூன்று சம தவணைகளில் நிதி உதவி."
        },
        criteria: {
            minAge: 18,
            occupation: ["farmer"],
            gender: "any",
            exclusions: ["government_employee", "income_tax_payer", "professional"]
        },
        requiredDocuments: {
            en: ["Aadhaar Card", "Land Ownership Proof", "Bank Account Passbook", "Passport-size Photographs"],
            hi: ["आधार कार्ड", "भूमि स्वामित्व प्रमाण", "बैंक खाता पासबुक", "पासपोर्ट साइज फोटो"],
            ta: ["ஆதார் அட்டை", "நில உரிமை ஆவணம்", "வங்கிக் கணக்கு பாஸ்புக்", "பாஸ்போர்ட் அளவு புகைப்படங்கள்"]
        },
        officialUrl: "https://pmkisan.gov.in",
        image: "https://tse2.mm.bing.net/th/id/OIP.bTdGkZa2d9hxM7Xo0QI3EQHaEK?rs=1&pid=ImgDetMain&o=7&rm=3"
    },

    "pm-kisan-maandhan": {
        id: "pm-kisan-maandhan",
        name: {
            en: "PM-Kisan Maandhan Yojana",
            hi: "पीएम-किसान मानधन योजना",
            ta: "பிஎம்-கிசான் மான்தன் யோஜனா"
        },
        description: {
            en: "Pension scheme for small and marginal farmers. Monthly pension of ₹3,000 after age 60.",
            hi: "छोटे और सीमांत किसानों के लिए पेंशन योजना। 60 वर्ष की आयु के बाद ₹3,000 मासिक पेंशन।",
            ta: "சிறு மற்றும் குறு விவசாயிகளுக்கான ஓய்வூதியத் திட்டம். 60 வயதுக்குப் பிறகு மாதம் ₹3,000 ஓய்வூதியம்."
        },
        criteria: {
            minAge: 18,
            maxAge: 40,
            occupation: ["farmer"],
            gender: "any"
        },
        officialUrl: "https://maandhan.in",
        image: "https://media.assettype.com/freepressjournal/2025-06-09/lyfq04o1/pm-kisan.jpg"
    },

    "pmay": {
        id: "pmay",
        name: {
            en: "Pradhan Mantri Awas Yojana (PMAY)",
            hi: "प्रधानमंत्री आवास योजना (PMAY)",
            ta: "பிரதான மந்திரி ஆவாஸ் யோஜனா (PMAY)"
        },
        description: {
            en: "Affordable housing for economically weaker sections and lower-income groups.",
            hi: "आर्थिक रूप से कमजोर वर्गों और निम्न-आय समूहों के लिए किफायती आवास।",
            ta: "பொருளாதாரத்தில் பின்தங்கிய மற்றும் குறைந்த வருமானம் கொண்ட பிரிவினருக்கு மலிவுக் குடியிருப்பு."
        },
        criteria: {
            minAge: 35,
            occupation: ["any"],
            gender: "any",
            incomeLimit: true
        },
        officialUrl: "https://pmaymis.gov.in",
        image: "https://tse3.mm.bing.net/th/id/OIP.H52nbdEk0AFXYV-9MhIp4QAAAA?pid=ImgDet&w=177&h=175&c=7&o=7&rm=3"
    },

    "pmjdy": {
        id: "pmjdy",
        name: {
            en: "Pradhan Mantri Jan Dhan Yojana",
            hi: "प्रधानमंत्री जन धन योजना",
            ta: "பிரதான மந்திரி ஜன் தன் யோஜனா"
        },
        description: {
            en: "Financial inclusion scheme providing bank accounts, insurance, and pension access to all citizens.",
            hi: "सभी नागरिकों को बैंक खाता, बीमा और पेंशन की सुविधा प्रदान करने वाली वित्तीय समावेशन योजना।",
            ta: "அனைத்து குடிமக்களுக்கும் வங்கிக் கணக்கு, காப்பீடு மற்றும் ஓய்வூதிய வசதி அளிக்கும் நிதி ஒருங்கிணைப்புத் திட்டம்."
        },
        criteria: {
            minAge: 10,
            occupation: ["any"],
            gender: "any"
        },
        officialUrl: "https://pmjdy.gov.in",
        image: "https://tse4.mm.bing.net/th/id/OIP.N0-KcIjFNtgv07sQSFemxwHaDt?rs=1&pid=ImgDetMain&o=7&rm=3"
    },

    "pmjjby": {
        id: "pmjjby",
        name: {
            en: "Pradhan Mantri Jeevan Jyoti Bima Yojana",
            hi: "प्रधानमंत्री जीवन ज्योति बीमा योजना",
            ta: "பிரதான மந்திரி ஜீவன் ஜோதி பீமா யோஜனா"
        },
        description: {
            en: "Life insurance scheme with ₹2 lakh coverage at ₹436 annual premium.",
            hi: "₹436 वार्षिक प्रीमियम पर ₹2 लाख कवरेज वाली जीवन बीमा योजना।",
            ta: "₹436 ஆண்டு பிரீமியத்தில் ₹2 லட்சம் காப்பீடு வழங்கும் ஆயுள் காப்பீட்டுத் திட்டம்."
        },
        criteria: {
            minAge: 18,
            maxAge: 50,
            occupation: ["any"],
            gender: "any"
        },
        officialUrl: "https://jansuraksha.gov.in",
        image: "https://www.mapsofindia.com/ci-moi-images/my-india/2016/05/Jeevan-Jyoti-Bima-Yojana.jpg"
    },

    "pmsby": {
        id: "pmsby",
        name: {
            en: "Pradhan Mantri Suraksha Bima Yojana",
            hi: "प्रधानमंत्री सुरक्षा बीमा योजना",
            ta: "பிரதான மந்திரி சுரக்ஷா பீமா யோஜனா"
        },
        description: {
            en: "Accidental death and disability insurance at just ₹20 per year.",
            hi: "केवल ₹20 प्रति वर्ष में दुर्घटना मृत्यु और विकलांगता बीमा।",
            ta: "ஆண்டுக்கு வெறும் ₹20-ல் விபத்து மரணம் மற்றும் ஊனமுற்ற நிலைக்கு காப்பீடு."
        },
        criteria: {
            minAge: 18,
            maxAge: 70,
            occupation: ["any"],
            gender: "any"
        },
        officialUrl: "https://jansuraksha.gov.in",
        image: "https://sarkariyojnagyan.com/wp-content/uploads/2022/07/pradhan-mantri-shuraksha-bima-yojana-pmsby-cover.jpg"
    },

    "mudra": {
        id: "mudra",
        name: {
            en: "Pradhan Mantri MUDRA Yojana",
            hi: "प्रधानमंत्री मुद्रा योजना",
            ta: "பிரதான மந்திரி முத்ரா யோஜனா"
        },
        description: {
            en: "Loans up to ₹10 lakh for small business and entrepreneurship without collateral.",
            hi: "बिना गारंटी के छोटे व्यवसाय और उद्यमशीलता के लिए ₹10 लाख तक का ऋण।",
            ta: "சிறு தொழில் மற்றும் தொழில்முனைவோருக்கு பிணையம் இல்லாமல் ₹10 லட்சம் வரை கடன்."
        },
        criteria: {
            minAge: 18,
            occupation: ["business", "entrepreneur", "self_employed", "worker"],
            gender: "any"
        },
        officialUrl: "https://mudra.org.in",
        image: "https://shardaassociates.in/wp-content/uploads/2021/12/2-3.jpg"
    },

    "ujjwala": {
        id: "ujjwala",
        name: {
            en: "Pradhan Mantri Ujjwala Yojana",
            hi: "प्रधानमंत्री उज्ज्वला योजना",
            ta: "பிரதான மந்திரி உஜ்வலா யோஜனா"
        },
        description: {
            en: "Free LPG connection to women from below poverty line households.",
            hi: "गरीबी रेखा से नीचे के परिवारों की महिलाओं को मुफ्त एलपीजी कनेक्शन।",
            ta: "வறுமைக் கோட்டுக்கு கீழ் உள்ள குடும்பங்களின் பெண்களுக்கு இலவச எல்பிஜி இணைப்பு."
        },
        criteria: {
            minAge: 18,
            occupation: ["any"],
            gender: "female",
            bpl: true
        },
        requiredDocuments: {
            en: ["Aadhaar Card", "BPL Certificate", "Bank Account Passbook", "Address Proof", "Passport-size Photographs"],
            hi: ["आधार कार्ड", "बीपीएल प्रमाण पत्र", "बैंक खाता पासबुक", "पता प्रमाण", "पासपोर्ट साइज फोटो"],
            ta: ["ஆதார் அட்டை", "BPL சான்றிதழ்", "வங்கிக் கணக்கு பாஸ்புக்", "முகவரி சான்று", "பாஸ்போர்ட் அளவு புகைப்படங்கள்"]
        },
        officialUrl: "https://pmuy.gov.in",
        image: "https://tse2.mm.bing.net/th/id/OIP.KDKCEpmli485JQq70jQPHAHaEK?rs=1&pid=ImgDetMain&o=7&rm=3"
    },

    "scholarship-nsp": {
        id: "scholarship-nsp",
        name: {
            en: "National Scholarship Portal Schemes",
            hi: "राष्ट्रीय छात्रवृत्ति पोर्टल योजनाएं",
            ta: "தேசிய உதவித்தொகை போர்டல் திட்டங்கள்"
        },
        description: {
            en: "Various scholarships for students from pre-matric to post-doctoral levels based on merit and economic background.",
            hi: "प्री-मैट्रिक से पोस्ट-डॉक्टोरल स्तर तक के छात्रों के लिए योग्यता और आर्थिक पृष्ठभूमि के आधार पर विभिन्न छात्रवृत्तियां।",
            ta: "தகுதி மற்றும் பொருளாதார பின்னணியின் அடிப்படையில் முன்-மெட்ரிக் முதல் முனைவர் பட்ட நிலை வரை மாணவர்களுக்கான பல்வேறு உதவித்தொகைகள்."
        },
        criteria: {
            minAge: 5,
            maxAge: 35,
            occupation: ["student"],
            gender: "any"
        },
        requiredDocuments: {
            en: ["Aadhaar Card", "School/College Enrollment Certificate", "Income Certificate", "Bank Account Passbook", "Caste Certificate (if applicable)", "Passport-size Photographs"],
            hi: ["आधार कार्ड", "स्कूल/कॉलेज नामांकन प्रमाण पत्र", "आय प्रमाण पत्र", "बैंक खाता पासबुक", "जाति प्रमाण पत्र (यदि लागू हो)", "पासपोर्ट साइज फोटो"],
            ta: ["ஆதார் அட்டை", "பள்ளி/கல்லூரி சேர்க்கை சான்றிதழ்", "வருமானச் சான்றிதழ்", "வங்கிக் கணக்கு பாஸ்புக்", "சாதிச் சான்றிதழ் (பொருந்தினால்)", "பாஸ்போர்ட் அளவு புகைப்படங்கள்"]
        },
        officialUrl: "https://scholarships.gov.in",
        image: "https://img.jagranjosh.com/images/2025/06/26/article/image/NSP-Scholarship-2025-1750926015369.webp"
    },

    "ayushman-bharat": {
        id: "ayushman-bharat",
        name: {
            en: "Ayushman Bharat (PM-JAY)",
            hi: "आयुष्मान भारत (PM-JAY)",
            ta: "ஆயுஷ்மான் பாரத் (PM-JAY)"
        },
        description: {
            en: "Health insurance coverage up to ₹5 lakh per family per year for secondary and tertiary hospitalization.",
            hi: "माध्यमिक और तृतीयक अस्पताल में भर्ती के लिए प्रति परिवार प्रति वर्ष ₹5 लाख तक का स्वास्थ्य बीमा कवरेज।",
            ta: "இரண்டாம் நிலை மற்றும் மூன்றாம் நிலை மருத்துவமனை சிகிச்சைக்கு ஒவ்வொரு குடும்பத்திற்கும் ஆண்டுக்கு ₹5 லட்சம் வரை மருத்துவக் காப்பீடு."
        },
        criteria: {
            minAge: 0,
            occupation: ["any"],
            gender: "any",
            bpl: true
        },
        officialUrl: "https://pmjay.gov.in",
        image: "https://www.probusinsurance.com/wp-content/uploads/2023/04/Ayushman-Bharat-Yojana-PMJAY.jpg"
    },

    "pmkvy": {
        id: "pmkvy",
        name: {
            en: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)",
            hi: "प्रधानमंत्री कौशल विकास योजना (PMKVY)",
            ta: "பிரதான மந்திரி கௌஷல் விகாஸ் யோஜனா (PMKVY)"
        },
        description: {
            en: "Free skill training and certification for Indian youth to improve employability.",
            hi: "भारतीय युवाओं की रोजगार क्षमता बढ़ाने के लिए मुफ्त कौशल प्रशिक्षण और प्रमाणन।",
            ta: "இந்திய இளைஞர்களின் வேலைவாய்ப்பை மேம்படுத்த இலவச திறன் பயிற்சி மற்றும் சான்றிதழ்."
        },
        criteria: {
            minAge: 15,
            maxAge: 45,
            occupation: ["student", "unemployed", "worker", "any"],
            gender: "any"
        },
        officialUrl: "https://pmkvyofficial.org",
        image: "https://thestoryindia.com/wp-content/uploads/2021/12/PMKVY.jpg"
    },

    "sukanya-samriddhi": {
        id: "sukanya-samriddhi",
        name: {
            en: "Sukanya Samriddhi Yojana",
            hi: "सुकन्या समृद्धि योजना",
            ta: "சுகன்யா சம்ருத்தி யோஜனா"
        },
        description: {
            en: "Savings scheme for the girl child with attractive interest rates and tax benefits. Account can be opened for girls under 10.",
            hi: "आकर्षक ब्याज दर और कर लाभ के साथ बालिकाओं के लिए बचत योजना। 10 वर्ष से कम उम्र की बालिकाओं के लिए खाता खोला जा सकता है।",
            ta: "கவர்ச்சிகரமான வட்டி விகிதங்கள் மற்றும் வரிச் சலுகைகளுடன் பெண் குழந்தைக்கான சேமிப்புத் திட்டம். 10 வயதுக்குட்பட்ட பெண்களுக்கு கணக்கு தொடங்கலாம்."
        },
        criteria: {
            minAge: 0,
            maxAge: 10,
            occupation: ["any"],
            gender: "female"
        },
        officialUrl: "https://www.india.gov.in/sukanya-samriddhi-yojna",
        image: "https://www.timesbull.com/wp-content/uploads/2024/09/Sukanya-Samriddhi-Yojana-2025-1-1-jpeg.webp"
    },

    "atal-pension": {
        id: "atal-pension",
        name: {
            en: "Atal Pension Yojana (APY)",
            hi: "अटल पेंशन योजना (APY)",
            ta: "அடல் ஓய்வூதியத் திட்டம் (APY)"
        },
        description: {
            en: "Guaranteed pension of ₹1,000 to ₹5,000 per month after age 60 for unorganized sector workers.",
            hi: "असंगठित क्षेत्र के श्रमिकों के लिए 60 वर्ष की आयु के बाद ₹1,000 से ₹5,000 प्रति माह की गारंटीकृत पेंशन।",
            ta: "அமைப்புசாரா தொழிலாளர்களுக்கு 60 வயதுக்குப் பிறகு மாதம் ₹1,000 முதல் ₹5,000 வரை உத்தரவாதமான ஓய்வூதியம்."
        },
        criteria: {
            minAge: 18,
            maxAge: 40,
            occupation: ["worker", "self_employed", "any"],
            gender: "any"
        },
        officialUrl: "https://npscra.nsdl.co.in/scheme-details.php",
        image: "https://www.digitalindiagov.in/wp-content/uploads/2023/12/image-2023-12-21T103755.287-768x432.jpg"
    },

    "stand-up-india": {
        id: "stand-up-india",
        name: {
            en: "Stand-Up India Scheme",
            hi: "स्टैंड-अप इंडिया योजना",
            ta: "ஸ்டான்ட்-அப் இந்தியா திட்டம்"
        },
        description: {
            en: "Bank loans from ₹10 lakh to ₹1 crore for SC/ST and women entrepreneurs.",
            hi: "अनुसूचित जाति/जनजाति और महिला उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक का बैंक ऋण।",
            ta: "SC/ST மற்றும் பெண் தொழில்முனைவோருக்கு ₹10 லட்சம் முதல் ₹1 கோடி வரை வங்கிக் கடன்."
        },
        criteria: {
            minAge: 18,
            occupation: ["entrepreneur", "business", "self_employed"],
            gender: "any"
        },
        officialUrl: "https://standupmitra.in",
        image: "https://st.adda247.com/https://wpassets.adda247.com/wp-content/uploads/multisite/sites/5/2022/04/06075725/Stand-Up-India-Scheme-2.jpg"
    },

    "tn-free-laptop": {
        id: "tn-free-laptop",
        name: {
            en: "Tamil Nadu Free Laptop Scheme",
            hi: "तमिलनाडु मुफ्त लैपटॉप योजना",
            ta: "தமிழ்நாடு இலவச லேப்டாப் திட்டம்"
        },
        description: {
            en: "Tamil Nadu government scheme providing free laptops to students studying in government and government-aided schools to improve digital learning.",
            hi: "तमिलनाडु सरकार की योजना जिसमें सरकारी और सहायता प्राप्त स्कूलों के छात्रों को डिजिटल शिक्षा के लिए मुफ्त लैपटॉप दिए जाते हैं।",
            ta: "அரசு மற்றும் அரசு உதவி பெறும் பள்ளிகளில் படிக்கும் மாணவர்களுக்கு டிஜிட்டல் கல்விக்காக இலவச லேப்டாப் வழங்கும் தமிழ்நாடு அரசு திட்டம்."
        },
        criteria: {
            minAge: 14,
            maxAge: 22,
            occupation: ["student"],
            gender: "any",
            state: "tamil_nadu"
        },
        requiredDocuments: {
            en: ["School ID Card", "Aadhaar Card", "Student Enrollment Certificate", "Passport Size Photographs"],
            hi: ["स्कूल आईडी कार्ड", "आधार कार्ड", "छात्र नामांकन प्रमाण पत्र", "पासपोर्ट साइज फोटो"],
            ta: ["பள்ளி அடையாள அட்டை", "ஆதார் அட்டை", "மாணவர் சேர்க்கை சான்றிதழ்", "பாஸ்போர்ட் அளவு புகைப்படங்கள்"]
        },
        officialUrl: "https://www.tn.gov.in/scheme/data_view/6934",
        image: "https://elcotlaptop.tn.gov.in/public/dist/img/CM_banner_new.png"
    }
};

// Scheme name aliases for fuzzy matching
const SCHEME_ALIASES = {
    "pm kisan": "pm-kisan",
    "pmkisan": "pm-kisan",
    "pm-kisan": "pm-kisan",
    "kisan samman": "pm-kisan",
    "kisan nidhi": "pm-kisan",
    "farmer scheme": "pm-kisan",
    "kisan maandhan": "pm-kisan-maandhan",
    "kisan pension": "pm-kisan-maandhan",
    "farmer pension": "pm-kisan-maandhan",
    "awas yojana": "pmay",
    "pmay": "pmay",
    "housing scheme": "pmay",
    "jan dhan": "pmjdy",
    "jandhan": "pmjdy",
    "pmjdy": "pmjdy",
    "bank account": "pmjdy",
    "jeevan jyoti": "pmjjby",
    "life insurance": "pmjjby",
    "pmjjby": "pmjjby",
    "suraksha bima": "pmsby",
    "accident insurance": "pmsby",
    "pmsby": "pmsby",
    "mudra": "mudra",
    "mudra loan": "mudra",
    "business loan": "mudra",
    "ujjwala": "ujjwala",
    "lpg scheme": "ujjwala",
    "gas connection": "ujjwala",
    "scholarship": "scholarship-nsp",
    "student scholarship": "scholarship-nsp",
    "nsp": "scholarship-nsp",
    "ayushman": "ayushman-bharat",
    "ayushman bharat": "ayushman-bharat",
    "pmjay": "ayushman-bharat",
    "health insurance": "ayushman-bharat",
    "kaushal vikas": "pmkvy",
    "skill development": "pmkvy",
    "pmkvy": "pmkvy",
    "skill training": "pmkvy",
    "sukanya": "sukanya-samriddhi",
    "sukanya samriddhi": "sukanya-samriddhi",
    "girl child scheme": "sukanya-samriddhi",
    "atal pension": "atal-pension",
    "apy": "atal-pension",
    "pension scheme": "atal-pension",
    "stand up india": "stand-up-india",
    "standup india": "stand-up-india",
    "sc st loan": "stand-up-india",
    "women entrepreneur": "stand-up-india",
    "tamil nadu laptop": "tn-free-laptop",
    "tn laptop": "tn-free-laptop",
    "free laptop": "tn-free-laptop",
    "laptop scheme": "tn-free-laptop"
};

/**
 * Find a scheme by fuzzy name matching
 */
function findSchemeByName(input) {
    if (!input) return null;
    const normalizedInput = input.toLowerCase().trim();

    // Direct match
    if (VERIFIED_SCHEMES[normalizedInput]) {
        return VERIFIED_SCHEMES[normalizedInput];
    }

    // Alias match
    for (const [alias, schemeId] of Object.entries(SCHEME_ALIASES)) {
        if (normalizedInput.includes(alias)) {
            return VERIFIED_SCHEMES[schemeId];
        }
    }

    return null;
}

/**
 * Check if a scheme name looks like it could be a government scheme but isn't verified
 */
function isPotentialScam(input) {
    if (!input) return false;
    const lower = input.toLowerCase();
    
    const schemePatterns = [
        /yojana/i, /scheme/i, /mission/i, /abhiyan/i,
        /pradhan mantri/i, /pm[\s-]/i, /sarkar/i, /government/i,
        /sarkari/i, /free money/i, /subsidy/i, /grant/i,
        /திட்டம்/i, /योजना/i, /அரசு/i, /सरकारी/i
    ];

    const looksLikeScheme = schemePatterns.some(p => p.test(lower));

    if (looksLikeScheme && !findSchemeByName(lower)) {
        return true;
    }

    return false;
}

/**
 * Get relevant schemes based on user profile
 */
function getRelevantSchemes(userProfile) {
    const relevant = [];
    
    for (const [id, scheme] of Object.entries(VERIFIED_SCHEMES)) {
        const criteria = scheme.criteria;
        let score = 0;
        let isMatch = true;

        // Age check
        if (userProfile.age !== null) {
            if (criteria.minAge !== undefined && userProfile.age < criteria.minAge) isMatch = false;
            if (criteria.maxAge !== undefined && userProfile.age > criteria.maxAge) isMatch = false;
            if (isMatch) score += 2;
        }

        // Occupation check
        if (userProfile.occupation && criteria.occupation) {
            if (!criteria.occupation.includes("any") && !criteria.occupation.includes(userProfile.occupation)) {
                isMatch = false;
            } else {
                score += 3;
            }
        }

        // Gender check
        if (criteria.gender !== "any" && userProfile.gender) {
            if (criteria.gender !== userProfile.gender) {
                isMatch = false;
            } else {
                score += 2;
            }
        }

        if (isMatch) {
            relevant.push({ ...scheme, score });
        }
    }

    relevant.sort((a, b) => b.score - a.score);
    return relevant.slice(0, 5);
}
