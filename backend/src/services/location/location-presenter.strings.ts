import { NearbyCategory } from "./location.types.js";

export interface LocationPresenterStrings {
    locationReceivedHeader: string;
    locationDiscoveryPrompt: string;
    completedTodayHeader: string;
    noActiveTripPrompt: string;
    nextStopHeader: string;
    nextStopTitle: (placeName: string, distanceLabel: string) => string;
    distanceLabel: (dist: string) => string;
    recommendedWalk: string;
    recommendedTransit: string;
    recommendedTaxi: string;
    nearbyPlacesHeader: string;
    categoryHeaders: Record<NearbyCategory, string>;
    categoryNames: Record<NearbyCategory, string>;
    geographicEstimateNote: string;
    outOfBoundsNotice: string;
    directionsBtn: string;
    directionsLabel: string;
    distanceMeter: (meters: number) => string;
    distanceKm: (km: string) => string;
    noPlacesFound: string;
    noPlacesFoundCategory: (categoryName: string) => string;
    shareLocationPrompt: string;
}
export const CATEGORY_ICONS = {
    attractions: "🏛️",
    food: "🍽️",
    cafes: "☕",
    hotels: "🏨",
    shopping: "🛍️",
    photos: "📸"
};
export const MULTILINGUAL_LOCATION_STRINGS = {
    en: {
        locationReceivedHeader: "📍 *Location received!*",
        locationDiscoveryPrompt: "What would you like to discover?",
        completedTodayHeader: "📍 *Location received!*\n\n✅ You've completed today's scheduled itinerary.\n\nWhat would you like to discover?",
        noActiveTripPrompt: "📍 *Location received!*\nWhat would you like to discover?",
        nextStopHeader: "🧭 *Your next itinerary stop:*",
        nextStopTitle: (placeName, distanceLabel) => `🧭 *Your next itinerary stop:* *${placeName}*\n📏 *Distance:* ~${distanceLabel}`,
        distanceLabel: (dist) => `📏 *Distance:* ~${dist}`,
        recommendedWalk: "🚶 *Recommended:* Walk",
        recommendedTransit: "🚇 *Recommended:* Public transit / Metro",
        recommendedTaxi: "🚗 *Recommended:* Taxi / Auto",
        nearbyPlacesHeader: "📍 *Top Nearby Attractions from Your Location:*",
        categoryHeaders: {
            attractions: "📍 *Top Nearby Attractions from Your Location:*",
            food: "📍 *Top Nearby Restaurants from Your Location:*",
            cafes: "📍 *Top Nearby Cafes from Your Location:*",
            hotels: "📍 *Top Nearby Hotels from Your Location:*",
            shopping: "📍 *Top Nearby Shopping & Markets from Your Location:*",
            photos: "📍 *Top Nearby Photo Spots from Your Location:*"
        },
        categoryNames: {
            attractions: "Attractions",
            food: "Restaurants",
            cafes: "Cafes",
            hotels: "Hotels",
            shopping: "Shopping",
            photos: "Photo Spots"
        },
        geographicEstimateNote: "_* Straight-line geographic estimate; road distance may vary._",
        outOfBoundsNotice: "📍 You appear to be outside the immediate vicinity of this destination (>10km). Here are highlights in the central city:",
        directionsBtn: "Get Directions",
        directionsLabel: "Directions",
        distanceMeter: (m) => `${m}m`,
        distanceKm: (km) => `${km} km`,
        noPlacesFound: "No verified attractions found within the 3.5km immediate exploration radius.",
        noPlacesFoundCategory: (categoryName) => `No verified ${categoryName.toLowerCase()} found within the 3.5km immediate exploration radius.`,
        shareLocationPrompt: "📍 *Share Your Location*\n\nTo discover places, restaurants, and attractions near you, please share your current location pin via WhatsApp.\n\n_Tap 📎 (Attach) > Location > Send your current location._"
    },
    hi: {
        locationReceivedHeader: "📍 *स्थान प्राप्त हुआ!*",
        locationDiscoveryPrompt: "आप क्या खोजना चाहते हैं?",
        completedTodayHeader: "📍 *स्थान प्राप्त हुआ!*\n\n✅ आपने आज का निर्धारित यात्रा कार्यक्रम पूरा कर लिया है।\n\nआप क्या खोजना चाहते हैं?",
        noActiveTripPrompt: "📍 *स्थान प्राप्त हुआ!*\nआप क्या खोजना चाहते हैं?",
        nextStopHeader: "🧭 *आपकी यात्रा योजना का अगला पड़ाव:*",
        nextStopTitle: (placeName, distanceLabel) => `🧭 *आपकी यात्रा योजना का अगला पड़ाव:* *${placeName}*\n📏 *दूरी:* ~${distanceLabel}`,
        distanceLabel: (dist) => `📏 *दूरी:* ~${dist}`,
        recommendedWalk: "🚶 *सुझाव:* पैदल चलें",
        recommendedTransit: "🚇 *सुझाव:* सार्वजनिक परिवहन / मेट्रो",
        recommendedTaxi: "🚗 *सुझाव:* टैक्सी / ऑटो",
        nearbyPlacesHeader: "📍 *आपके स्थान के नजदीकी प्रमुख दर्शनीय स्थल:*",
        categoryHeaders: {
            attractions: "📍 *आपके स्थान के नजदीकी प्रमुख दर्शनीय स्थल:*",
            food: "📍 *आपके स्थान के नजदीकी रेस्टोरेंट:*",
            cafes: "📍 *आपके स्थान के नजदीकी कैफे:*",
            hotels: "📍 *आपके स्थान के नजदीकी होटल:*",
            shopping: "📍 *आपके स्थान के नजदीकी खरीदारी और बाज़ार:*",
            photos: "📍 *आपके स्थान के नजदीकी फोटो स्पॉट:*"
        },
        categoryNames: {
            attractions: "दर्शनीय स्थल",
            food: "रेस्टोरेंट",
            cafes: "कैफे",
            hotels: "होटल",
            shopping: "खरीदारी",
            photos: "फोटो स्पॉट"
        },
        geographicEstimateNote: "_* यह सीधी दूरी का भौगोलिक अनुमान है; सड़क की वास्तविक दूरी भिन्न हो सकती है।_",
        outOfBoundsNotice: "📍 आप इस शहर के मुख्य पर्यटन क्षेत्र से बाहर प्रतीत होते हैं (>10km)। मुख्य शहर के प्रमुख आकर्षण:",
        directionsBtn: "दिशा-निर्देश प्राप्त करें",
        directionsLabel: "दिशा-निर्देश",
        distanceMeter: (m) => `${m} मीटर`,
        distanceKm: (km) => `${km} किमी`,
        noPlacesFound: "3.5 किमी के दायरे में कोई सत्यापित पर्यटन स्थल नहीं मिला।",
        noPlacesFoundCategory: (categoryName) => `3.5 किमी के दायरे में कोई सत्यापित ${categoryName} नहीं मिला।`,
        shareLocationPrompt: "📍 *अपनी लोकेशन शेयर करें*\n\nअपने आस-पास के दर्शनीय स्थल, रेस्टोरेंट और होटल देखने के लिए, कृपया WhatsApp पर अपनी लाइव लोकेशन पिन शेयर करें।\n\n_📎 (Attach) > Location > Send your current location पर टैप करें।_"
    },
    mr: {
        locationReceivedHeader: "📍 *स्थान प्राप्त झाले!*",
        locationDiscoveryPrompt: "तुम्हाला काय शोधायचे आहे?",
        completedTodayHeader: "📍 *स्थान प्राप्त झाले!*\n\n✅ तुम्ही आजचे नियोजित वेळापत्रक पूर्ण केले आहे.\n\nतुम्हाला काय शोधायचे आहे?",
        noActiveTripPrompt: "📍 *स्थान प्राप्त झाले!*\nतुम्हाला काय शोधायचे आहे?",
        nextStopHeader: "🧭 *तुमच्या सहल योजनेतील पुढील ठिकाण:*",
        nextStopTitle: (placeName, distanceLabel) => `🧭 *तुमच्या सहल योजनेतील पुढील ठिकाण:* *${placeName}*\n📏 *अंतर:* ~${distanceLabel}`,
        distanceLabel: (dist) => `📏 *अंतर:* ~${dist}`,
        recommendedWalk: "🚶 *शिफारस:* चालत जाणे",
        recommendedTransit: "🚇 *शिफारस:* सार्वजनिक वाहतूक / मेट्रो",
        recommendedTaxi: "🚗 *शिफारस:* टॅक्सी / रिक्षा",
        nearbyPlacesHeader: "📍 *तुमच्या स्थानाजवळील प्रमुख पर्यटनस्थळे:*",
        categoryHeaders: {
            attractions: "📍 *तुमच्या स्थानाजवळील प्रमुख पर्यटनस्थळे:*",
            food: "📍 *तुमच्या स्थानाजवळील रेस्टॉरंट:*",
            cafes: "📍 *तुमच्या स्थानाजवळील कॅफे:*",
            hotels: "📍 *तुमच्या स्थानाजवळील हॉटेल्स:*",
            shopping: "📍 *तुमच्या स्थानाजवळील खरेदी आणि बाजारपेठा:*",
            photos: "📍 *तुमच्या स्थानाजवळील फोटो स्पॉट्स:*"
        },
        categoryNames: {
            attractions: "पर्यटनस्थळे",
            food: "रेस्टॉरंट",
            cafes: "कॅफे",
            hotels: "हॉटेल्स",
            shopping: "खरेदी",
            photos: "फोटो स्पॉट्स"
        },
        geographicEstimateNote: "_* हा सरळ रेषेतील भौगोलिक अंदाज आहे; रस्त्यावरील प्रत्यक्ष अंतर वेगळे असू शकते._",
        outOfBoundsNotice: "📍 आपण शहराच्या मुख्य पर्यटन क्षेत्राबाहेर दिसत आहात (>10km). शहरातील मुख्य आकर्षणे खालीलप्रमाणे:",
        directionsBtn: "मार्गदर्शन मिळवा",
        directionsLabel: "मार्गदर्शन",
        distanceMeter: (m) => `${m} मीटर`,
        distanceKm: (km) => `${km} किमी`,
        noPlacesFound: "3.5 किमीच्या परिसरात कोणतीही नोंदणीकृत ठिकाणे आढळली नाहीत.",
        noPlacesFoundCategory: (categoryName) => `3.5 किमीच्या परिसरात कोणतीही नोंदणीकृत ${categoryName} आढळली नाहीत.`,
        shareLocationPrompt: "📍 *तुमचे लोकेशन शेअर करा*\n\nतुमच्या जवळची प्रेक्षणीय स्थळे, हॉटेल्स आणि रेस्टॉरंट्स पाहण्यासाठी, कृपया WhatsApp द्वारे तुमचे लोकेशन पाठवा.\n\n_📎 (Attach) > Location > Send your current location वर टॅप करा._"
    }
};
