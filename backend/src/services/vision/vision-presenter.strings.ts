

export interface VisionPresenterStrings {
    verifiedHeader: (name: string, category: string) => string;
    unverifiedHeader: (name: string) => string;
    ambiguousNotice: (summary: string) => string;
    unknownNotice: string;
    visualCluesHeader: string;
    aboutHeader: string;
    nearbyCorroboration: (distLabel: string) => string;
    unverifiedDisclaimer: string;
    oversizedError: string;
    unsupportedFormatError: string;
    degradedServiceError: string;
    geographicEstimateNote: string;
    directionsBtn: string;
}
export const MULTILINGUAL_VISION_STRINGS = {
    en: {
        verifiedHeader: (name, category) => `📍 *Landmark Identified:* *${name}* (${category})`,
        unverifiedHeader: (name) => `📍 *Possible Landmark:* *${name}* _(Unverified Candidate)_`,
        ambiguousNotice: (summary) => `🔍 *Visual Analysis:* ${summary}\n_The landmark could not be uniquely identified from this angle. Please share another photo or angle!_`,
        unknownNotice: "🔍 I couldn't identify a verified tourist landmark or attraction in this photo. Please share a clearer picture of a monument, temple, or scenic spot.",
        visualCluesHeader: "👁️ *Recognized Features:*",
        aboutHeader: "🏛️ *About:*",
        nearbyCorroboration: (dist) => `🧭 *Location Check:* You appear to be near this place (~${dist} away)!`,
        unverifiedDisclaimer: "_* Note: This landmark is not authoritatively verified in our catalog; information is for general reference._",
        oversizedError: "⚠️ Photo exceeds the 5MB limit. Please upload a compressed JPEG or PNG photo under 5MB.",
        unsupportedFormatError: "⚠️ Unsupported image format. Please send a JPEG or PNG photo.",
        degradedServiceError: "⚠️ Visual landmark analysis is temporarily unavailable. Please type the name of the place to get details!",
        geographicEstimateNote: "_* Straight-line geographic estimate; road distance may vary._",
        directionsBtn: "Get Directions"
    },
    hi: {
        verifiedHeader: (name, category) => `📍 *पहचाना गया ऐतिहासिक स्थल:* *${name}* (${category})`,
        unverifiedHeader: (name) => `📍 *संभावित स्थल:* *${name}* _(अपुष्ट उम्मीदवार)_`,
        ambiguousNotice: (summary) => `🔍 *दृश्य विश्लेषण:* ${summary}\n_इस कोण से स्थल की स्पष्ट पहचान नहीं हो सकी। कृपया दूसरा कोण या स्पष्ट फ़ोटो साझा करें!_`,
        unknownNotice: "🔍 इस फ़ोटो में किसी सत्यापित पर्यटन स्थल की पहचान नहीं हो सकी। कृपया किसी स्मारक, मंदिर या दर्शनीय स्थल की स्पष्ट फ़ोटो भेजें।",
        visualCluesHeader: "👁️ *पहचाने गए लक्षण:*",
        aboutHeader: "🏛️ *विवरण:*",
        nearbyCorroboration: (dist) => `🧭 *स्थान मिलान:* आप इस स्थल के पास प्रतीत होते हैं (~${dist} दूर)!`,
        unverifiedDisclaimer: "_* नोट: यह स्थल हमारी सूची में पूर्णतः सत्यापित नहीं है; यह जानकारी सामान्य संदर्भ हेतु है।_",
        oversizedError: "⚠️ फ़ोटो 5MB सीमा से बड़ी है। कृपया 5MB से कम आकार की JPEG या PNG फ़ोटो भेजें।",
        unsupportedFormatError: "⚠️ असमर्थित फ़ोटो प्रारूप। कृपया JPEG या PNG फ़ोटो भेजें।",
        degradedServiceError: "⚠️ फ़ोटो विश्लेषण सेवा वर्तमान में अनुपलब्ध है। कृपया स्थल का नाम लिखकर पूछें!",
        geographicEstimateNote: "_* यह सीधी दूरी का भौगोलिक अनुमान है; सड़क की वास्तविक दूरी भिन्न हो सकती है।_",
        directionsBtn: "दिशा-निर्देश प्राप्त करें"
    },
    mr: {
        verifiedHeader: (name, category) => `📍 *ओळखलेले प्रेक्षणीय स्थळ:* *${name}* (${category})`,
        unverifiedHeader: (name) => `📍 *संभाव्य स्थळ:* *${name}* _(नोंदणी नसलेले संभाव्य स्थळ)_`,
        ambiguousNotice: (summary) => `🔍 *दृश्य विश्लेषण:* ${summary}\n_या कोनातून स्थळाची अचूक ओळख पटू शकली नाही. कृपया दुसरा फोटो पाठवा!_`,
        unknownNotice: "🔍 या फोटोमध्ये कोणत्याही नोंदणीकृत पर्यटन स्थळाची ओळख पटली नाही. कृपया स्मारक, मंदिर किंवा प्रेक्षणीय स्थळाचा स्पष्ट फोटो पाठवा.",
        visualCluesHeader: "👁️ *ओळखलेली वैशिष्ट्ये:*",
        aboutHeader: "🏛️ *माहिती:*",
        nearbyCorroboration: (dist) => `🧭 *स्थान जुळणी:* आपण या ठिकाणाजवळ दिसत आहात (~${dist} अंतरावर)!`,
        unverifiedDisclaimer: "_* टीप: हे ठिकाण आमच्या अधिकृत यादीत अद्याप पूर्णतः नोंदणीकृत नाही; ही सामान्य संदर्भासाठी माहिती आहे._",
        oversizedError: "⚠️ फोटो 5MB पेक्षा मोठा आहे. कृपया 5MB पेक्षा कमी आकाराचा JPEG किंवा PNG फोटो पाठवा.",
        unsupportedFormatError: "⚠️ असमर्थित फोटो स्वरूप. कृपया JPEG किंवा PNG फोटो पाठवा.",
        degradedServiceError: "⚠️ फोटो विश्लेषण सेवा सध्या अनुपलब्ध आहे. कृपया स्थळाचे नाव टाईप करून विचारा!",
        geographicEstimateNote: "_* हा सरळ रेषेतील भौगोलिक अंदाज आहे; रस्त्यावरील प्रत्यक्ष अंतर वेगळे असू शकते._",
        directionsBtn: "मार्गदर्शन मिळवा"
    }
};
