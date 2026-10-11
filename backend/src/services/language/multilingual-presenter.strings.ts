

export interface PresenterStrings {
    itineraryFor: string;
    durationDays: string;
    totalPlaces: string;
    version: string;
    dayHeader: (dayNum: number, dateLabel: string, startTime: string, endTime: string) => string;
    weather: string;
    rain: string;
    weatherUnavailableAhead: string;
    weatherUnavailable: string;
    noScheduledActivities: string;
    travelFromPrevious: (mins: number, distMeters: number, sourceLabel: string) => string;
    transitGeographic: string;
    transitBuffer: string;
    weatherNotice: (reason: string) => string;
    costLabel: (amount: number, currency: string, confidence: string) => string;
    budgetSummary: string;
    knownActivitiesCost: string;
    targetBudget: string;
    targetBudgetNotSpecified: string;
    remainingBudget: string;
    unknownFeesNotice: (count: number) => string;
    currencyMismatchNotice: string;
    footerReplyHint: string;
    updatedHeader: (version: number) => string;
    clarificationHeader: string;
    noChangeHeader: string;
    failedHeader: string;
}
export const MULTILINGUAL_PRESENTER_STRINGS = {
    en: {
        itineraryFor: "Your Itinerary for",
        durationDays: "Days",
        totalPlaces: "Total Places",
        version: "Version",
        dayHeader: (dayNum, dateLabel, start, end) => `🗓️ *Day ${dayNum}${dateLabel}* [${start} - ${end}]`,
        weather: "Weather",
        rain: "rain",
        weatherUnavailableAhead: "Forecast unavailable (> 16 days ahead)",
        weatherUnavailable: "Forecast unavailable",
        noScheduledActivities: "No scheduled activities planned for this day.",
        travelFromPrevious: (mins, dist, src) => `  _↳ Travel from previous: ~${mins} mins (${dist}m, ${src})_`,
        transitGeographic: "geographic estimate",
        transitBuffer: "buffer",
        weatherNotice: (reason) => `  ⚠️ _Weather Notice: ${reason}_`,
        costLabel: (amt, curr, conf) => `  💰 _Cost: ${amt} ${curr} (${conf})_`,
        budgetSummary: "💰 *Budget Summary:*",
        knownActivitiesCost: "• Known Activities Cost:",
        targetBudget: "• Target Budget:",
        targetBudgetNotSpecified: "• Target Budget: _Not specified_",
        remainingBudget: "• Remaining Known Budget:",
        unknownFeesNotice: (count) => `• ⚠️ _Note: ${count} place(s) have unknown entry fees (never assumed ₹0)._`,
        currencyMismatchNotice: "• ⚠️ _Currency mismatch detected; conversion rate not available._",
        footerReplyHint: "\n_Reply anytime to modify! For example: \"make Day 2 more relaxed\", \"less walking\", or \"add food places\"!_",
        updatedHeader: (ver) => `✅ *Itinerary Updated!* (Version ${ver})`,
        clarificationHeader: "🤔 *Just to make sure I get this right:*",
        noChangeHeader: "ℹ️ *No changes were made to your itinerary:*",
        failedHeader: "❌ *Unable to update itinerary:*"
    },
    hi: {
        itineraryFor: "आपकी यात्रा योजना -",
        durationDays: "दिन",
        totalPlaces: "कुल स्थल",
        version: "संस्करण",
        dayHeader: (dayNum, dateLabel, start, end) => `🗓️ *दिन ${dayNum}${dateLabel}* [${start} - ${end}]`,
        weather: "मौसम",
        rain: "बारिश की संभावना",
        weatherUnavailableAhead: "मौसम पूर्वानुमान अनुपलब्ध (> 16 दिन आगे)",
        weatherUnavailable: "मौसम पूर्वानुमान अनुपलब्ध",
        noScheduledActivities: "इस दिन के लिए कोई गतिविधि निर्धारित नहीं है।",
        travelFromPrevious: (mins, dist, src) => `  _↳ पिछली जगह से यात्रा: ~${mins} मिनट (${dist}m, ${src})_`,
        transitGeographic: "भौगोलिक अनुमान",
        transitBuffer: "बफर",
        weatherNotice: (reason) => `  ⚠️ _मौसम सूचना: ${reason}_`,
        costLabel: (amt, curr, conf) => `  💰 _खर्च: ${amt} ${curr} (${conf})_`,
        budgetSummary: "💰 *बजट विवरण:*",
        knownActivitiesCost: "• ज्ञात गतिविधियों का खर्च:",
        targetBudget: "• निर्धारित बजट:",
        targetBudgetNotSpecified: "• निर्धारित बजट: _निर्दिष्ट नहीं_",
        remainingBudget: "• शेष ज्ञात बजट:",
        unknownFeesNotice: (count) => `• ⚠️ _ध्यान दें: ${count} स्थानों के प्रवेश शुल्क अज्ञात हैं (कभी भी ₹0 नहीं माना गया)।_`,
        currencyMismatchNotice: "• ⚠️ _मुद्रा बेमेल पाया गया; रूपांतरण दर उपलब्ध नहीं है।_",
        footerReplyHint: "\n_बदलाव के लिए कभी भी संदेश भेजें! जैसे: \"दिन 2 को थोड़ा आरामदायक बनाएं\", \"कम चलना हो\", या \"खाने की जगहें जोड़ें\"!_",
        updatedHeader: (ver) => `✅ *यात्रा योजना अपडेट की गई!* (संस्करण ${ver})`,
        clarificationHeader: "🤔 *सही समझने के लिए पुष्टि करें:*",
        noChangeHeader: "ℹ️ *आपकी योजना में कोई बदलाव नहीं हुआ:*",
        failedHeader: "❌ *योजना अपडेट करने में असमर्थ:*"
    },
    mr: {
        itineraryFor: "तुमची सहल योजना -",
        durationDays: "दिवस",
        totalPlaces: "एकूण ठिकाणे",
        version: "आवृत्ती",
        dayHeader: (dayNum, dateLabel, start, end) => `🗓️ *दिवस ${dayNum}${dateLabel}* [${start} - ${end}]`,
        weather: "हवामान",
        rain: "पावसाची शक्यता",
        weatherUnavailableAhead: "हवामान अंदाज उपलब्ध नाही (> 16 दिवस पुढे)",
        weatherUnavailable: "हवामान अंदाज उपलब्ध नाही",
        noScheduledActivities: "या दिवसासाठी कोणतीही नियोजित ठिकाणे नाहीत.",
        travelFromPrevious: (mins, dist, src) => `  _↳ मागील ठिकाणाहून प्रवास: ~${mins} मिनिटे (${dist}m, ${src})_`,
        transitGeographic: "भौगोलिक अंदाज",
        transitBuffer: "बफर",
        weatherNotice: (reason) => `  ⚠️ _हवामान सूचना: ${reason}_`,
        costLabel: (amt, curr, conf) => `  💰 _खर्च: ${amt} ${curr} (${conf})_`,
        budgetSummary: "💰 *बजेट सारांश:*",
        knownActivitiesCost: "• ज्ञात ठिकाणांचा खर्च:",
        targetBudget: "• ठरवलेले बजेट:",
        targetBudgetNotSpecified: "• ठरवलेले बजेट: _नोंदवलेले नाही_",
        remainingBudget: "• उर्वरित ज्ञात बजेट:",
        unknownFeesNotice: (count) => `• ⚠️ _नोंद: ${count} ठिकाणांचे प्रवेश शुल्क अज्ञात आहे (कधीही ₹0 मानले जात नाही)._`,
        currencyMismatchNotice: "• ⚠️ _चलन जुळत नाही; रूपांतरण दर उपलब्ध नाही._",
        footerReplyHint: "\n_बदलासाठी कधीही संदेश पाठवा! उदा: \"दिवस २ जरा निवांत करा\", \"कमी चालायचे आहे\", किंवा \"खाण्याची ठिकाणे जोडा\"!_",
        updatedHeader: (ver) => `✅ *सहल योजना अपडेट झाली!* (आवृत्ती ${ver})`,
        clarificationHeader: "🤔 *नक्की समजून घेण्यासाठी खात्री करा:*",
        noChangeHeader: "ℹ️ *सहल योजनेत कोणताही बदल झालेला नाही:*",
        failedHeader: "❌ *सहल योजना अपडेट करण्यात अयशस्वी:*"
    }
};
