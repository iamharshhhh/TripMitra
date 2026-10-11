import { WhatsAppActionId } from "./whatsapp-ui.types.js";

export interface WizardUILabels {
    travelDate: {
        header: (dest: string) => string;
        buttonText: string;
        sectionTitle: string;
        rows: {
            today: {
                title: string;
                desc: string;
            };
            tomorrow: {
                title: string;
                desc: string;
            };
            thisWeekend: {
                title: string;
                desc: string;
            };
            nextWeekend: {
                title: string;
                desc: string;
            };
            customDate: {
                title: string;
                desc: string;
            };
            back: {
                title: string;
                desc: string;
            };
        };
    };
    duration: {
        header: (dest: string, dateLine?: string) => string;
        buttonText: string;
        sectionTitle: string;
        daySingular: string;
        dayPlural: string;
        rows: {
            day1: {
                title: string;
                desc: string;
            };
            day2: {
                title: string;
                desc: string;
            };
            day3: {
                title: string;
                desc: string;
            };
            day4: {
                title: string;
                desc: string;
            };
            day5: {
                title: string;
                desc: string;
            };
            day7: {
                title: string;
                desc: string;
            };
            custom: {
                title: string;
                desc: string;
            };
            back: {
                title: string;
                desc: string;
            };
        };
    };
    travelers: {
        header: (dest: string, dateLine: string, durationStr: string) => string;
        buttonText: string;
        sectionTitle: string;
        travelerSingular: string;
        travelerPlural: string;
        rows: {
            solo: {
                title: string;
                desc: string;
            };
            couple: {
                title: string;
                desc: string;
            };
            family: {
                title: string;
                desc: string;
            };
            group: {
                title: string;
                desc: string;
            };
            custom: {
                title: string;
                desc: string;
            };
            back: {
                title: string;
                desc: string;
            };
        };
    };
    groupSize: {
        header: (dest: string, durationStr: string) => string;
        buttonText: string;
        sectionTitle: string;
        peopleLabel: (n: number) => {
            title: string;
            desc: string;
        };
        back: {
            title: string;
            desc: string;
        };
    };
    budget: {
        header: (dest: string, dateLine: string, durationStr: string, travelerStr: string) => string;
        buttonText: string;
        sectionTitle: string;
        categories: {
            budget: string;
            moderate: string;
            luxury: string;
            custom: string;
        };
        rows: {
            budget: {
                title: string;
                desc: string;
            };
            moderate: {
                title: string;
                desc: string;
            };
            luxury: {
                title: string;
                desc: string;
            };
            enterAmount: {
                title: string;
                desc: string;
            };
            back: {
                title: string;
                desc: string;
            };
        };
    };
    interests: {
        header: (dest: string, dateLine: string, durationStr: string, budgetStr: string) => string;
        buttonText: string;
        sectionTitle: string;
        selectedLabel: (count: number) => string;
        doneTitle: string;
        doneDesc: (count: number) => string;
        back: {
            title: string;
            desc: string;
        };
    };
    pacing: {
        header: (dest: string, dateLine: string, durationStr: string) => string;
        choosePacePrompt: string;
        buttons: {
            relaxed: string;
            balanced: string;
            fastPaced: string;
        };
    };
    editMenu: {
        header: string;
        buttonText: string;
        sectionTitle: string;
        rows: {
            destination: {
                title: string;
                desc: string;
            };
            travelDate: {
                title: string;
                desc: string;
            };
            duration: {
                title: string;
                desc: string;
            };
            travelers: {
                title: string;
                desc: string;
            };
            budget: {
                title: string;
                desc: string;
            };
            interests: {
                title: string;
                desc: string;
            };
            backToSummary: {
                title: string;
                desc: string;
            };
        };
    };
    generationError: {
        retryButton: string;
        editButton: string;
        homeButton: string;
    };
    summary: {
        confirmationHeader: string;
        upcomingTripHeader: string;
        activeTripHeader: string;
        completedTripHeader: string;
        cancelledTripHeader: string;
        planningTripHeader: string;
        startsInDays: (days: number) => string;
        activeDayProgress: (current: number, total: number) => string;
        destinationLabel: string;
        travelDatesLabel: string;
        durationLabel: string;
        travelersLabel: string;
        budgetLabel: string;
        interestsLabel: string;
        statusLabel: string;
        statusReady: string;
        statusCollecting: string;
        statusUpcoming: string;
        statusActive: string;
        statusCompleted: string;
        statusCancelled: string;
        readyPrompt: string;
        notSet: string;
        famousPlacesDefault: string;
    };
    mainMenuSections: {
        travelAndTrips: string;
        toolsAndSettings: string;
    };
    itineraryPagination: {
        nextDay: (day: number) => string;
        prevDay: (day: number) => string;
        dayOfTotal: (day: number, total: number) => string;
        navHeader: (day: number, total: number) => string;
    };
    itineraryActivityPlaceholders: {
        arrivalCheckIn: string;
        relaxedMorning: string;
        departureTransit: string;
        leisureRestBreak: string;
        departureFarewell: string;
        freeTimeRelaxation: string;
        dayNumberHeader: (day: number) => string;
    };
}

export interface UILabels {
    buttonLabels: Record<WhatsAppActionId, string>;
    listTitles: Record<string, string>;
    menuHeaders: {
        welcome: string;
        welcomeSubtitle: string;
        tripSummary: string;
        dayPlan: (day: number) => string;
        modifyTitle: string;
        modifyPrompt: string;
        languagePrompt: string;
        optionsButton: string;
        chooseDayButton: string;
        fallbackIntro: string;
        staleVersionNotice: (currentVersion: number) => string;
        staleTripNotice: (currentDest: string) => string;
        unauthorizedNotice: string;
        unknownActionNotice: string;
        planTripPrompt: string;
        helpText: string;
        locationPromptNoPin: string;
        locationReceived: string;
        durationPrompt: string;
        travelerPrompt: string;
        budgetPrompt: string;
        interestPrompt: string;
        pacingPrompt: string;
        confirmationTitle: string;
        confirmationPrompt: string;
        editPrompt: string;
        weatherPromptNoDest: string;
        locationCategoryPrompt: string;
        dayNavFooter: (day: number, total: number) => string;
        step1Title: string;
        step1Progress: string;
        step1Prompt: string;
        step2Title: string;
        step2Progress: string;
        step2Prompt: (dest: string) => string;
        customDaysPrompt: string;
        customDaysInvalid: string;
        step3Title: string;
        step3Progress: string;
        step3Prompt: (dest: string, days: number) => string;
        customTravelersPrompt: string;
        customTravelersInvalid: string;
        step4Title: string;
        step4Progress: string;
        step4Prompt: (dest: string, days: number, travelers: number | string) => string;
        customBudgetPrompt: string;
        customBudgetInvalid: string;
        generateErrorRetry: string;
        step5Title: string;
        step5Progress: string;
        step5Prompt: (dest: string, days: number, budget: string, selectedLabels?: string[]) => string;
        step6Title: string;
        step6Progress: string;
        step6Prompt: (dest: string, days: number, paceOrContext?: any) => string;
        confirmationCardHeader: string;
        confirmationCardProgress: string;
        confirmationCardFooter: string;
        editMenuHeader: string;
        editMenuPrompt: string;
        generatingNotice: string;
        weatherCardHeader: (dest: string) => string;
        locationDiscoveryPrompt: string;
        locationCompletedTodayPrompt: string;
        tripCancelPromptTitle: string;
        tripCancelPromptBody: string;
        tripCancelPromptUpcomingTitle: string;
        tripCancelPromptUpcomingBody: (dest: string) => string;
        tripCancelSuccess: string;
        tripCancelUpcomingSuccess: string;
        locationRequiredForDiscovery: string;
        outOfScopeRedirect: string;
        ambiguousDatePrompt: string;
        resumePlanningButton: string;
        resumePlanningNotice: string;
        weatherErrorFallback: string;
    };
    wizardUI: WizardUILabels;
}

export function formatLocalizedDuration(days: number, lang = "en") {
    if (lang === "mr")
        return `${days} दिवस`;
    if (lang === "hi")
        return `${days} दिन`;
    return `${days} ${days === 1 ? "Day" : "Days"}`;
}
export function formatLocalizedTravelers(count: number, lang = "en") {
    if (lang === "mr")
        return `${count} प्रवासी`;
    if (lang === "hi")
        return `${count} यात्री`;
    return `${count} ${count === 1 ? "Traveler" : "Travelers"}`;
}
export const MULTILINGUAL_UI_STRINGS = {
    en: {
        buttonLabels: {
            [WhatsAppActionId.HOME]: "Main Menu",
            [WhatsAppActionId.HELP]: "Help",
            [WhatsAppActionId.BACK]: "Back",
            [WhatsAppActionId.NAV_MAIN_MENU]: "Main Menu",
            [WhatsAppActionId.NAV_BACK]: "Back",
            [WhatsAppActionId.NAV_CANCEL]: "Cancel",
            [WhatsAppActionId.RESUME_WIZARD]: "Resume Planning",
            [WhatsAppActionId.MENU_PLAN_TRIP]: "Plan a Trip",
            [WhatsAppActionId.MENU_MY_TRIP]: "My Trip",
            [WhatsAppActionId.MENU_WEATHER]: "Weather",
            [WhatsAppActionId.MENU_LANGUAGE]: "Language",
            [WhatsAppActionId.MENU_LOCATION]: "Location",
            [WhatsAppActionId.MENU_HELP]: "Help",
            [WhatsAppActionId.PLAN_TRIP]: "Plan Trip",
            [WhatsAppActionId.VIEW_TRIP]: "My Trip",
            [WhatsAppActionId.VIEW_DAY]: "View Day",
            [WhatsAppActionId.FULL_ITINERARY]: "Full Plan",
            [WhatsAppActionId.TRIP_CONTINUE]: "Continue Planning",
            [WhatsAppActionId.TRIP_NEW]: "Start New Trip",
            [WhatsAppActionId.TRIP_CHANGE_DESTINATION]: "Change City",
            [WhatsAppActionId.TRIP_VIEW_ITINERARY]: "View Itinerary",
            [WhatsAppActionId.SET_DESTINATION]: "Select City",
            [WhatsAppActionId.TRAVEL_DATE]: "Travel Date",
            [WhatsAppActionId.SET_TRAVEL_DATE]: "Set Travel Date",
            [WhatsAppActionId.CUSTOM_DATE]: "Custom Date",
            [WhatsAppActionId.SET_DURATION]: "Set Duration",
            [WhatsAppActionId.CUSTOM_DAYS]: "Custom Days",
            [WhatsAppActionId.SET_TRAVELERS]: "Set Travelers",
            [WhatsAppActionId.GROUP_SIZE_PICKER]: "Group Size",
            [WhatsAppActionId.CUSTOM_TRAVELERS]: "Custom Group Size",
            [WhatsAppActionId.SET_BUDGET]: "Set Budget",
            [WhatsAppActionId.CUSTOM_BUDGET]: "Custom Budget",
            [WhatsAppActionId.SET_INTERESTS]: "Set Interests",
            [WhatsAppActionId.TOGGLE_INTEREST]: "Select Interest",
            [WhatsAppActionId.INTERESTS_DONE]: "Done (Continue)",
            [WhatsAppActionId.INTERESTS_BACK]: "Back",
            [WhatsAppActionId.SET_PACING]: "Set Pacing",
            [WhatsAppActionId.TRIP_CONFIRM]: "Generate Trip",
            [WhatsAppActionId.TRIP_RETRY_GENERATE]: "Try Again",
            [WhatsAppActionId.TRIP_EDIT_MENU]: "Edit",
            [WhatsAppActionId.EDIT_STEP]: "Edit Field",
            [WhatsAppActionId.TRIP_CANCEL]: "Cancel",
            [WhatsAppActionId.TRIP_CANCEL_PROMPT]: "Cancel Trip",
            [WhatsAppActionId.TRIP_CANCEL_CONFIRM]: "Yes, Cancel Trip",
            [WhatsAppActionId.TRIP_CANCEL_ABORT]: "Keep My Trip",
            [WhatsAppActionId.DAY_NEXT]: "Next Day",
            [WhatsAppActionId.DAY_PREV]: "Previous Day",
            [WhatsAppActionId.NEARBY_PLACES]: "Explore Nearby",
            [WhatsAppActionId.WEATHER]: "Weather",
            [WhatsAppActionId.WEATHER_REFRESH]: "Refresh Weather",
            [WhatsAppActionId.DIRECTIONS]: "Directions",
            [WhatsAppActionId.LOCATION_NEARBY]: "Nearby Places",
            [WhatsAppActionId.LOCATION_NEXT_STOP]: "Next Stop",
            [WhatsAppActionId.LOCATION_NAVIGATION]: "Navigation",
            [WhatsAppActionId.LOC_CAT_FOOD]: "Food & Dining",
            [WhatsAppActionId.LOC_CAT_ATTRACTIONS]: "Attractions",
            [WhatsAppActionId.LOC_CAT_HOTELS]: "Hotels",
            [WhatsAppActionId.LOC_CAT_CAFES]: "Cafes",
            [WhatsAppActionId.LOC_CAT_SHOPPING]: "Shopping",
            [WhatsAppActionId.LOC_CAT_PHOTOS]: "Photo Spots",
            [WhatsAppActionId.MODIFY_MENU]: "Modify Trip",
            [WhatsAppActionId.MAKE_CHEAPER]: "Make Cheaper",
            [WhatsAppActionId.LESS_WALKING]: "Less Walking",
            [WhatsAppActionId.MORE_HISTORY]: "More History",
            [WhatsAppActionId.MORE_FOOD]: "More Food",
            [WhatsAppActionId.REDUCE_PACE]: "Relaxed Pace",
            [WhatsAppActionId.LANGUAGE_MENU]: "Language",
            [WhatsAppActionId.SET_LANGUAGE]: "Select Language",
            [WhatsAppActionId.LANG_EN]: "English",
            [WhatsAppActionId.LANG_HI]: "हिन्दी",
            [WhatsAppActionId.LANG_MR]: "मराठी"
        },
        listTitles: {
            modCheaperTitle: "💰 Make Cheaper",
            modCheaperDesc: "Optimize attractions for lower cost",
            modLessWalkTitle: "🚶 Less Walking",
            modLessWalkDesc: "Prioritize easily accessible places",
            modHistoryTitle: "🏛️ More History",
            modHistoryDesc: "Add historical monuments and forts",
            modFoodTitle: "🍛 More Food",
            modFoodDesc: "Discover local street food and dining",
            modPaceTitle: "🧘 Relaxed Pace",
            modPaceDesc: "Allow more buffer and leisure time",
            modBackTitle: "🔙 Keep Current Plan",
            modBackDesc: "Return without modifying itinerary",
            langEnTitle: "English",
            langEnDesc: "Set conversation language to English",
            langMrTitle: "मराठी (Marathi)",
            langMrDesc: "मराठीमध्ये संभाषण करा",
            langHiTitle: "हिन्दी (Hindi)",
            langHiDesc: "हिन्दी में बातचीत करें",
            // Main menu list rows
            menuPlanTitle: "🗓️ Plan a Trip",
            menuPlanDesc: "Start planning a new journey",
            menuTripTitle: "🧭 My Trip",
            menuTripDesc: "View your trip details",
            menuWeatherTitle: "🌤️ Weather",
            menuWeatherDesc: "Check live forecast for your trip",
            menuLangTitle: "🌐 Language",
            menuLangDesc: "Switch English, Marathi or Hindi",
            menuLocTitle: "📍 Share Location",
            menuLocDesc: "Find nearby attractions, restaurants, cafés & local food with GPS",
            menuHelpTitle: "🆘 Help",
            menuHelpDesc: "How to use TripMitra",
            discoveryAttractionsTitle: "🏛️ Attractions",
            discoveryAttractionsDesc: "Explore nearby tourist attractions & landmarks",
            discoveryFoodTitle: "🍽️ Restaurants",
            discoveryFoodDesc: "Discover nearby dining & restaurants",
            discoveryHotelsTitle: "🏨 Hotels",
            discoveryHotelsDesc: "Find nearby hotels & accommodation",
            discoveryWeatherTitle: "🌤️ Weather",
            discoveryWeatherDesc: "Check live weather forecast",
            discoveryHomeTitle: "🏠 Main Menu",
            discoveryHomeDesc: "Return to main menu",
            cancelTripTitle: "❌ Cancel Trip",
            cancelTripDesc: "Cancel your active trip"
        },
        menuHeaders: {
            welcome: "🌍 Welcome to TripMitra! ✈️\n\nYour personal WhatsApp travel assistant.\n\nWhat would you like to do?\n\n👇 Choose a menu option below or simply type your question!",
            welcomeSubtitle: "Select an option below to get started:",
            chatbotWelcome: "🤖 *TripMitra AI Chatbot*\n\nWelcome! I am your AI Travel Assistant. ✈️\n\nI can help you with:\n• 📍 *Destination Info*: Attractions & sightseeing in Pune or anywhere\n• 💡 *Travel Tips*: Budget advice & family travel suggestions\n• 🍴 *Food & Hotels*: How to find nearby dining & stays\n• 🌤️ *Weather & Directions*: Weather forecasts & transit guidance\n• 🗓️ *Trip Planning*: How to use our 6-step planning wizard\n\n*Simply ask me any travel question below!*",
            chatbotRefusal: "🤖 *TripMitra AI Chatbot*\n\nI am TripMitra, your dedicated travel assistant! ✈️\nI can only answer questions related to travel, destinations, tourism, and TripMitra features. For other topics, please use a general search engine.",
            tripSummary: "📋 *Your Active Trip*",
            dayPlan: (day: any) => `🗓️ *Day ${day} Itinerary*`,
            modifyTitle: "✏️ Modify Itinerary",
            modifyPrompt: "Choose how you'd like to adjust your trip:",
            languagePrompt: "🌐 *Choose Language* / भाषा निवडा / भाषा चुनें:",
            optionsButton: "Menu Options",
            chooseDayButton: "Select Day",
            fallbackIntro: "Choose an option by replying with the number:",
            staleVersionNotice: (currentVersion: any) => `ℹ️ Your itinerary was already updated to Version ${currentVersion}. Here is your current plan:`,
            staleTripNotice: (currentDest: any) => `⚠️ That option was for your previous trip. Your current active trip is in *${currentDest}*.`,
            unauthorizedNotice: "⚠️ You do not have permission to view or modify this trip.",
            unknownActionNotice: "⚠️ That option is no longer available. Here is the main menu:",
            planTripPrompt: "📍 Where are you going?\n\nType your destination below.",
            helpText: "🤖 *TripMitra Help*\n" +
                "*How to use Menu Options*\n\n" +
                "📅 *Plan a Trip*\n" +
                "Select this option to create a trip itinerary. Follow the steps to enter your destination, dates, duration, travelers, budget, and interests.\n\n" +
                "🧭 *My Trip*\n" +
                "View your saved itinerary, check daily plans, and modify or manage your trip.\n\n" +
                "🌤️ *Weather*\n" +
                "Check weather forecasts for your destination or travel dates.\n\n" +
                "🌐 *Language*\n" +
                "Choose your preferred language: English, Hindi, or Marathi.\n\n" +
                "📍 *Share Location*\n" +
                "Share your WhatsApp location to discover nearby attractions, restaurants, cafés, and local food.\n\n" +
                "🆘 *Help*\n" +
                "Open this guide whenever you need instructions for using TripMitra.\n\n" +
                "💡 Use Menu Options to select a feature and follow the instructions shown by TripMitra.",
            locationPromptNoPin: "📍 *Share your WhatsApp location* and I can help you find attractions, food, and navigation nearby!\n\nTap *Attach* (📎) ➔ *Location* ➔ *Send your current location*.",
            locationReceived: "📍 *Location received!*\n\nWhat would you like to do?",
            durationPrompt: "🗓️ How many days will you stay?",
            travelerPrompt: "👥 Who's traveling?",
            budgetPrompt: "💰 What's your budget?",
            interestPrompt: "🎯 What are you interested in?",
            pacingPrompt: "🚶 How do you like to travel?",
            confirmationTitle: "✨ Your Trip",
            confirmationPrompt: "Ready to create your itinerary?",
            editPrompt: "✏️ What would you like to change?",
            weatherPromptNoDest: "🌤️ *Weather Forecast*\n\nWhich city's weather forecast would you like to check?",
            locationCategoryPrompt: "📍 *Explore Nearby Places*\n\nChoose a category to discover around your location:",
            dayNavFooter: (day: any, total: any) => `📍 Showing Day ${day} of ${total}`,
            // Wizard steps (clean, concise, modern)
            step1Title: "✈️ Destination",
            step1Progress: "",
            step1Prompt: "📍 Where are you going?\n\nType your destination below.",
            step2Title: "🗓️ Trip Duration",
            step2Progress: "",
            step2Prompt: (dest: any) => `🗓️ How many days will you stay?\n\n📍 ${dest}`,
            customDaysPrompt: "🗓️ How many days?\n\nEnter a number between 1 and 14.",
            customDaysInvalid: "⚠️ Please enter a number between 1 and 14.",
            step3Title: "👥 Travelers",
            step3Progress: "",
            step3Prompt: (dest: any, days: any) => `👥 Who's traveling?\n\n📍 ${dest}\n🗓️ ${days} Days`,
            customTravelersPrompt: "👥 How many travelers?\n\nEnter a number between 1 and 20.",
            customTravelersInvalid: "⚠️ Please enter a number between 1 and 20.",
            step4Title: "💰 Budget",
            step4Progress: "",
            step4Prompt: (dest: any, days: any, travelers: any) => `💰 What's your budget?\n\n📍 ${dest}\n🗓️ ${days} Days\n👥 ${travelers} ${typeof travelers === "number" && travelers === 1 ? "Traveler" : "Travelers"}`,
            customBudgetPrompt: "💵 What's your total trip budget?\n\nEnter an amount.\n\nExamples:\n₹50,000\n50000\n₹1,00,000",
            customBudgetInvalid: "⚠️ Please enter a valid positive budget amount in INR (e.g. ₹50,000).",
            generateErrorRetry: "⚠️ We couldn't create your itinerary yet.\n\nYour trip details are saved.",
            step5Title: "🎯 Interests",
            step5Progress: "",
            step5Prompt: (dest: any, days: any, budget: any, selectedLabels: any) => {
                const base = `🎯 What are you interested in?\n\n📍 ${dest}\n🗓️ ${days} Days\n💰 ${budget}`;
                if (selectedLabels && selectedLabels.length > 0) {
                    return `${base}\n\nSelected: ${selectedLabels.join(", ")}`;
                }
                return base;
            },
            step6Title: "🚶 Travel Style",
            step6Progress: "",
            step6Prompt: (dest: any, days: any, paceOrContext: any) => {
                const lines = [`🚶 How do you like to travel?\n\n📍 ${dest}\n🗓️ ${days} ${days === 1 ? "Day" : "Days"}`];
                if (paceOrContext && typeof paceOrContext === "object") {
                    if (paceOrContext.travelers) {
                        const count = typeof paceOrContext.travelers === "number" ? paceOrContext.travelers : parseInt(String(paceOrContext.travelers), 10) || 1;
                        lines.push(`👥 ${count} ${count === 1 ? "Traveler" : "Travelers"}`);
                    }
                    if (paceOrContext.budgetStr) {
                        lines.push(`💰 ${paceOrContext.budgetStr}`);
                    }
                    if (paceOrContext.interestsStr) {
                        lines.push(`🎯 ${paceOrContext.interestsStr}`);
                    }
                }
                return `${lines.join("\n")}\n\nChoose your pace:`;
            },
            confirmationCardHeader: "✨ Your Trip",
            confirmationCardProgress: "",
            confirmationCardFooter: "Ready to create your itinerary?",
            editMenuHeader: "✏️ What would you like to change?",
            editMenuPrompt: "Select what you would like to edit:",
            generatingNotice: "⏳ Generating your personalized itinerary...",
            weatherCardHeader: (dest: any) => `🌤️ *Live Weather Forecast — ${dest}*`,
            locationDiscoveryPrompt: "📍 *Location received!*\nWhat would you like to discover?",
            locationCompletedTodayPrompt: "📍 *Location received!*\n\n✅ You've completed today's scheduled itinerary.\n\nWhat would you like to discover?",
            tripCancelPromptTitle: "⚠️ *Cancel Active Trip*",
            tripCancelPromptBody: "Are you sure you want to cancel your active trip?\n\nYour itinerary will no longer be treated as an active trip, and location sharing will no longer use this trip for next-stop guidance.",
            tripCancelPromptUpcomingTitle: "⚠️ *Cancel Upcoming Trip*",
            tripCancelPromptUpcomingBody: (dest: any) => `Are you sure you want to cancel your upcoming trip to *${dest}*?`,
            tripCancelSuccess: "✅ *Trip Cancelled*\n\nYour trip is no longer active.\n\nYou can still use:\n🏛️ Attractions\n🍽️ Restaurants\n🏨 Hotels\n🌤️ Weather",
            tripCancelUpcomingSuccess: "✅ *Trip Cancelled*\n\nYour upcoming trip has been cancelled.\n\nYou can plan a new trip anytime or discover:\n🏛️ Attractions\n🍽️ Restaurants\n🏨 Hotels\n🌤️ Weather",
            locationRequiredForDiscovery: "📍 Please share your live location first to discover nearby places.",
            outOfScopeRedirect: "🧭 I am your AI Travel Assistant, specialized in travel, places, routes, food, stays, and sightseeing.\n\nPlease feel free to ask me anything related to your travel plans or destinations!",
            ambiguousDatePrompt: "💬 *What would you like to know about tomorrow?*\n\n1. 🌤️ Weather\n2. 🏛️ Places & Attractions\n3. 📅 Plan a Trip",
            resumePlanningButton: "▶️ Resume Planning",
            resumePlanningNotice: "\n\n💡 _Reply 'Continue planning' to resume setting up your trip anytime._",
            weatherErrorFallback: "Sorry, I couldn't get the weather right now. Please try again in a moment."
        },
        wizardUI: {
            travelDate: {
                header: (dest: any) => `📅 *WHEN ARE YOU PLANNING TO GO?*\n\n📍 *${dest}*`,
                buttonText: "Choose Date",
                sectionTitle: "Travel Date",
                rows: {
                    today: { title: "📅 Today", desc: "Start trip today" },
                    tomorrow: { title: "🌅 Tomorrow", desc: "Start trip tomorrow" },
                    thisWeekend: { title: "🏖️ This Weekend", desc: "Upcoming weekend getaway" },
                    nextWeekend: { title: "🗓️ Next Weekend", desc: "Next week weekend" },
                    customDate: { title: "✏️ Choose Date", desc: "Type specific date (e.g. 15 Oct 2026)" },
                    back: { title: "↩ Back", desc: "Change destination" }
                }
            },
            duration: {
                header: (dest, dateLine = "") => `🗓️ *HOW MANY DAYS?*\n\n📍 ${dest}${dateLine}`,
                buttonText: "Choose Days",
                sectionTitle: "Trip Duration",
                daySingular: "Day",
                dayPlural: "Days",
                rows: {
                    day1: { title: "1 Day", desc: "Quick getaway / day tour" },
                    day2: { title: "2 Days", desc: "Weekend trip" },
                    day3: { title: "3 Days", desc: "Popular recommendation" },
                    day4: { title: "4 Days", desc: "Extended exploration" },
                    day5: { title: "5 Days", desc: "Comprehensive itinerary" },
                    day7: { title: "7 Days", desc: "Full holiday experience" },
                    custom: { title: "✏️ Custom Days", desc: "Enter 1–30 days" },
                    back: { title: "↩ Back", desc: "Change travel date" }
                }
            },
            travelers: {
                header: (dest: any, dateLine: any, durationStr: any) => `👥 *WHO'S TRAVELING?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}`,
                buttonText: "Choose Travelers",
                sectionTitle: "Who's Traveling",
                travelerSingular: "Traveler",
                travelerPlural: "Travelers",
                rows: {
                    solo: { title: "👤 Solo · 1", desc: "1 traveler" },
                    couple: { title: "👫 Couple · 2", desc: "2 travelers" },
                    family: { title: "👨‍👩‍👧 Family · 4", desc: "Family / small group" },
                    group: { title: "👥 Group · 5–8", desc: "Friends / medium group (5–8)" },
                    custom: { title: "✏️ Custom", desc: "Enter 1–50 travelers" },
                    back: { title: "↩ Back", desc: "Change duration" }
                }
            },
            groupSize: {
                header: (dest: any, durationStr: any) => `👥 *GROUP SIZE (5–8 PEOPLE)*\n\n📍 ${dest}\n🗓️ ${durationStr}\n\nSelect exact group size:`,
                buttonText: "Select Group Size",
                sectionTitle: "Group Members",
                peopleLabel: (n: any) => ({ title: `👥 ${n} People`, desc: `Group of ${n}` }),
                back: { title: "↩ Back", desc: "Back to traveler options" }
            },
            budget: {
                header: (dest: any, dateLine: any, durationStr: any, travelerStr: any) => `💰 *WHAT'S YOUR BUDGET?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}\n👥 ${travelerStr}`,
                buttonText: "Choose Budget",
                sectionTitle: "Trip Budget",
                categories: {
                    budget: "💸 Budget",
                    moderate: "⚖️ Moderate",
                    luxury: "✨ Luxury",
                    custom: "💰 Custom"
                },
                rows: {
                    budget: { title: "💸 Budget", desc: "Affordable stays & local food" },
                    moderate: { title: "⚖️ Moderate", desc: "Comfortable mid-range stays" },
                    luxury: { title: "✨ Luxury", desc: "Premium stays & fine dining" },
                    enterAmount: { title: "💵 Enter Amount", desc: "Enter total trip budget (e.g. ₹25,000)" },
                    back: { title: "↩ Back", desc: "Change traveler count" }
                }
            },
            interests: {
                header: (dest: any, dateLine: any, durationStr: any, budgetStr: any) => `🎯 *WHAT ARE YOUR INTERESTS?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}\n💰 ${budgetStr}`,
                buttonText: "Select Interests",
                sectionTitle: "What to Explore",
                selectedLabel: (count: any) => `*Selected (${count}):*`,
                doneTitle: "✅ Done (Continue)",
                doneDesc: (count: any) => (count > 0 ? `${count} selected · Summary` : "Proceed to summary"),
                back: { title: "↩ Back", desc: "Change budget" }
            },
            pacing: {
                header: (dest: any, dateLine: any, durationStr: any) => `🚶 *HOW DO YOU LIKE TO TRAVEL?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}`,
                choosePacePrompt: "Choose your travel style:",
                buttons: {
                    relaxed: "🧘 Relaxed",
                    balanced: "⚖️ Balanced",
                    fastPaced: "⚡ Fast-Paced"
                }
            },
            editMenu: {
                header: "✏️ What would you like to change?",
                buttonText: "Select Field",
                sectionTitle: "Edit Field",
                rows: {
                    destination: { title: "1. 📍 Destination", desc: "Change destination city" },
                    travelDate: { title: "2. 📅 Travel Date", desc: "Change travel date" },
                    duration: { title: "3. 🗓️ Duration", desc: "Change number of days" },
                    travelers: { title: "4. 👥 Travelers", desc: "Update travelers & group size" },
                    budget: { title: "5. 💰 Budget", desc: "Update budget & amount" },
                    interests: { title: "6. 🎯 Interests", desc: "Update sightseeing preferences" },
                    backToSummary: { title: "↩️ Back to Summary", desc: "Return to trip summary" }
                }
            },
            generationError: {
                retryButton: "🔄 Try Again",
                editButton: "✏️ Edit Trip",
                homeButton: "🏠 Main Menu"
            },
            summary: {
                confirmationHeader: "✨ *YOUR TRIP SUMMARY*",
                upcomingTripHeader: "📅 *UPCOMING TRIP*",
                activeTripHeader: "📋 *ACTIVE TRIP*",
                completedTripHeader: "🏁 *COMPLETED TRIP*",
                cancelledTripHeader: "❌ *CANCELLED TRIP*",
                planningTripHeader: "📝 *TRIP IN PROGRESS*",
                startsInDays: (d: any) => d === 1 ? "⏳ *Starts tomorrow*" : `⏳ *Starts in ${d} days*`,
                activeDayProgress: (c: any, t: any) => `📍 *Day ${c} of ${t}*`,
                destinationLabel: "📍 *Destination:*",
                travelDatesLabel: "📅 *Travel Dates:*",
                durationLabel: "🗓️ *Duration:*",
                travelersLabel: "👥 *Travelers:*",
                budgetLabel: "💰 *Budget:*",
                interestsLabel: "🎯 *Interests:*",
                statusLabel: "Status:",
                statusReady: "Itinerary Ready",
                statusCollecting: "Collecting Details",
                statusUpcoming: "Upcoming",
                statusActive: "In Progress",
                statusCompleted: "Completed",
                statusCancelled: "Cancelled",
                readyPrompt: "Ready to generate your daily itinerary?",
                notSet: "Not set",
                famousPlacesDefault: "• 🌟 Famous Places"
            },
            mainMenuSections: {
                travelAndTrips: "Travel & Trips",
                toolsAndSettings: "Tools & Settings"
            },
            itineraryPagination: {
                nextDay: (day: any) => `Next: Day ${day} ➡️`,
                prevDay: (day: any) => `◀️ Day ${day}`,
                dayOfTotal: (day: any, total: any) => `Day ${day} of ${total}`,
                navHeader: (day: any, total: any) => `🗺️ *Day ${day} of ${total} · Navigation*`
            },
            itineraryActivityPlaceholders: {
                arrivalCheckIn: "✈️ _Arrival & Check-in_",
                relaxedMorning: "🌿 _Relaxed Morning & Exploration_",
                departureTransit: "🧳 _Departure & Transit_",
                leisureRestBreak: "☕ _Leisure & Rest Break_",
                departureFarewell: "🧳 _Departure & Farewell_",
                freeTimeRelaxation: "🌙 _Free Time & Relaxation_",
                dayNumberHeader: (day: any) => `🗓️ *DAY ${day}*`
            }
        },
        visionUI: {
            downloadError: "⚠️ Could not download the image. Please try sending it again.",
            oversizedError: "⚠️ Photo exceeds the 5MB limit. Please upload a compressed JPEG or PNG photo under 5MB.",
            unsupportedFormatError: "⚠️ Unsupported image format. Please send a JPEG or PNG photo.",
            imageOnlyLandmark: (name: string) => `📸 *Landmark Detected:* *${name}*\n\nWould you like to know about its history, best visiting hours, entry tickets, or directions?`,
            imageOnlyDocument: (docType: string, summary: string) => `🎫 *Travel Document Detected:* *${docType}*\n${summary ? `${summary}\n` : ""}\nWould you like departure/arrival timings, platform info, or route guidance?`,
            imageOnlyMenu: "🍽️ *Menu Detected!*\n\nI can help you find vegetarian options, check prices, or suggest dishes. What are you looking for?",
            imageOnlySignboard: (text: string) => `🪧 *Signboard Detected:*\n"${text}"\n\nWould you like a translation, directions, or explanation of this sign?`,
            imageOnlyGeneric: "📸 *Image received!*\n\nWhat would you like to know about this photo? Ask me about places, directions, food, or travel tips.",
            menuAllergenNotice: "⚠️ *Note:* Menu visual analysis is advisory. Please verify ingredients and allergens directly with the restaurant staff.",
            ticketObservationalNotice: "ℹ️ *Note:* Extracted ticket details are observational. Please check official IRCTC, airline, or transit apps for live schedules.",
            landmarkUnverifiedNotice: "ℹ️ *Note:* Visual landmark detection is based on photographic features. Verify timings and entry details locally.",
            degradedServiceError: "⚠️ Visual analysis is temporarily unavailable. Please try again in a moment or type the name of the place!"
        }
    },
    mr: {
        buttonLabels: {
            [WhatsAppActionId.HOME]: "मुख्य मेनू",
            [WhatsAppActionId.HELP]: "मदत",
            [WhatsAppActionId.BACK]: "मागे",
            [WhatsAppActionId.NAV_MAIN_MENU]: "मुख्य मेनू",
            [WhatsAppActionId.NAV_BACK]: "मागे",
            [WhatsAppActionId.NAV_CANCEL]: "रद्द करा",
            [WhatsAppActionId.RESUME_WIZARD]: "सहल सुरू ठेवा",
            [WhatsAppActionId.MENU_PLAN_TRIP]: "सहलीचे नियोजन",
            [WhatsAppActionId.MENU_MY_TRIP]: "माझी सहल",
            [WhatsAppActionId.MENU_WEATHER]: "हवामान",
            [WhatsAppActionId.MENU_LANGUAGE]: "भाषा",
            [WhatsAppActionId.MENU_LOCATION]: "स्थान शेअर",
            [WhatsAppActionId.MENU_HELP]: "मदत",
            [WhatsAppActionId.PLAN_TRIP]: "सहलीचे नियोजन",
            [WhatsAppActionId.VIEW_TRIP]: "माझी सहल",
            [WhatsAppActionId.VIEW_DAY]: "दिवस पहा",
            [WhatsAppActionId.FULL_ITINERARY]: "पूर्ण सहल",
            [WhatsAppActionId.TRIP_CONTINUE]: "नियोजन सुरू ठेवा",
            [WhatsAppActionId.TRIP_NEW]: "नवीन सहल सुरू करा",
            [WhatsAppActionId.TRIP_CHANGE_DESTINATION]: "शहर बदला",
            [WhatsAppActionId.TRIP_VIEW_ITINERARY]: "सहल पहा",
            [WhatsAppActionId.SET_DESTINATION]: "शहर निवडा",
            [WhatsAppActionId.TRAVEL_DATE]: "प्रवासाची तारीख",
            [WhatsAppActionId.SET_TRAVEL_DATE]: "तारीख निवडा",
            [WhatsAppActionId.CUSTOM_DATE]: "इतर तारीख",
            [WhatsAppActionId.SET_DURATION]: "कालावधी निवडा",
            [WhatsAppActionId.CUSTOM_DAYS]: "इतर दिवस",
            [WhatsAppActionId.SET_TRAVELERS]: "प्रवासी निवडा",
            [WhatsAppActionId.GROUP_SIZE_PICKER]: "गट आकार",
            [WhatsAppActionId.CUSTOM_TRAVELERS]: "इतर प्रवासी संख्या",
            [WhatsAppActionId.SET_BUDGET]: "बजेट निवडा",
            [WhatsAppActionId.CUSTOM_BUDGET]: "बजेट रक्कम",
            [WhatsAppActionId.SET_INTERESTS]: "आवडी निवडा",
            [WhatsAppActionId.TOGGLE_INTEREST]: "आवड निवडा",
            [WhatsAppActionId.INTERESTS_DONE]: "पूर्ण झाले (पुढे जा)",
            [WhatsAppActionId.INTERESTS_BACK]: "मागे",
            [WhatsAppActionId.SET_PACING]: "गती निवडा",
            [WhatsAppActionId.TRIP_CONFIRM]: "वेळापत्रक बनवा",
            [WhatsAppActionId.TRIP_RETRY_GENERATE]: "पुन्हा प्रयत्न करा",
            [WhatsAppActionId.TRIP_EDIT_MENU]: "बदल करा",
            [WhatsAppActionId.EDIT_STEP]: "पायरी बदला",
            [WhatsAppActionId.TRIP_CANCEL]: "रद्द करा",
            [WhatsAppActionId.TRIP_CANCEL_PROMPT]: "सहल रद्द करा",
            [WhatsAppActionId.TRIP_CANCEL_CONFIRM]: "होय, सहल रद्द करा",
            [WhatsAppActionId.TRIP_CANCEL_ABORT]: "माझी सहल ठेवा",
            [WhatsAppActionId.DAY_NEXT]: "पुढील दिवस",
            [WhatsAppActionId.DAY_PREV]: "मागील दिवस",
            [WhatsAppActionId.NEARBY_PLACES]: "जवळपास एक्सप्लोर",
            [WhatsAppActionId.WEATHER]: "हवामान अंदाज",
            [WhatsAppActionId.WEATHER_REFRESH]: "हवामान रीफ्रेश करा",
            [WhatsAppActionId.DIRECTIONS]: "दिशानिर्देश",
            [WhatsAppActionId.LOCATION_NEARBY]: "जवळपासची ठिकाणे",
            [WhatsAppActionId.LOCATION_NEXT_STOP]: "पुढील ठिकाण",
            [WhatsAppActionId.LOCATION_NAVIGATION]: "मार्गदर्शन",
            [WhatsAppActionId.LOC_CAT_FOOD]: "खाद्यपदार्थ",
            [WhatsAppActionId.LOC_CAT_ATTRACTIONS]: "प्रसिद्ध ठिकाणे",
            [WhatsAppActionId.LOC_CAT_HOTELS]: "हॉटेल्स",
            [WhatsAppActionId.LOC_CAT_CAFES]: "कॅफे",
            [WhatsAppActionId.LOC_CAT_SHOPPING]: "खरेदी",
            [WhatsAppActionId.LOC_CAT_PHOTOS]: "फोटो स्पॉट्स",
            [WhatsAppActionId.MODIFY_MENU]: "बदल करा",
            [WhatsAppActionId.MAKE_CHEAPER]: "खर्च कमी करा",
            [WhatsAppActionId.LESS_WALKING]: "कमी चालणे",
            [WhatsAppActionId.MORE_HISTORY]: "ऐतिहासिक ठिकाणे",
            [WhatsAppActionId.MORE_FOOD]: "स्थानिक खाद्य",
            [WhatsAppActionId.REDUCE_PACE]: "शांत गती",
            [WhatsAppActionId.LANGUAGE_MENU]: "भाषा बदला",
            [WhatsAppActionId.SET_LANGUAGE]: "भाषा निवडा",
            [WhatsAppActionId.LANG_EN]: "English",
            [WhatsAppActionId.LANG_HI]: "हिन्दी",
            [WhatsAppActionId.LANG_MR]: "मराठी"
        },
        listTitles: {
            modCheaperTitle: "💰 खर्च कमी करा",
            modCheaperDesc: "कमी खर्चाची ठिकाणे निवडा",
            modLessWalkTitle: "🚶 कमी चालणे",
            modLessWalkDesc: "सहज पोहोचता येणारी ठिकाणे",
            modHistoryTitle: "🏛️ ऐतिहासिक ठिकाणे",
            modHistoryDesc: "किल्ले व स्मारके जोडा",
            modFoodTitle: "🍛 स्थानिक खाद्य",
            modFoodDesc: "पुणेरी मिसळ व खाद्यसंस्कृती",
            modPaceTitle: "🧘 शांत गती",
            modPaceDesc: "प्रत्येक ठिकाणी जास्त वेळ",
            modBackTitle: "🔙 सहल कायम ठेवा",
            modBackDesc: "बदल न करता परत या",
            langEnTitle: "English",
            langEnDesc: "Set conversation language to English",
            langMrTitle: "मराठी (Marathi)",
            langMrDesc: "मराठीमध्ये संभाषण करा",
            langHiTitle: "हिन्दी (Hindi)",
            langHiDesc: "हिन्दी में बातचीत करें",
            menuPlanTitle: "🗓️ सहलीचे नियोजन",
            menuPlanDesc: "नवीन प्रवास सुरू करा",
            menuTripTitle: "🧭 माझी सहल",
            menuTripDesc: "तुमच्या सहलीची माहिती पहा",
            menuWeatherTitle: "🌤️ हवामान",
            menuWeatherDesc: "आपल्या सहलीचे हवामान पहा",
            menuLangTitle: "🌐 भाषा",
            menuLangDesc: "English, मराठी किंवा हिन्दी निवडा",
            menuLocTitle: "📍 स्थान शेअर",
            menuLocDesc: "GPS द्वारे पर्यटनस्थळे, रेस्टॉरंट्स, कॅफे व स्थानिक खाद्यपदार्थ शोधा",
            menuHelpTitle: "🆘 मदत",
            menuHelpDesc: "या ट्रॅव्हल बॉटचा वापर कसा करावा",
            discoveryAttractionsTitle: "🏛️ प्रसिद्ध ठिकाणे",
            discoveryAttractionsDesc: "जवळपासची पर्यटन स्थळे आणि स्मारके शोधा",
            discoveryFoodTitle: "🍽️ रेस्टॉरंट्स",
            discoveryFoodDesc: "जवळपासचे रेस्टॉरंट्स आणि खाद्यसंस्कृती",
            discoveryHotelsTitle: "🏨 हॉटेल्स",
            discoveryHotelsDesc: "जवळपासची हॉटेल्स व निवास व्यवस्था",
            discoveryWeatherTitle: "🌤️ हवामान",
            discoveryWeatherDesc: "थेट हवामान अंदाज तपासा",
            discoveryHomeTitle: "🏠 मुख्य मेनू",
            discoveryHomeDesc: "मुख्य मेनूवर परत जा",
            cancelTripTitle: "❌ सहल रद्द करा",
            cancelTripDesc: "आपली सक्रिय सहल रद्द करा"
        },
        menuHeaders: {
            welcome: "🌍 TripMitra मध्ये आपले स्वागत आहे! ✈️\n\nआपला वैयक्तिक WhatsApp प्रवास सहाय्यक.\n\nआपण काय करू इच्छिता?\n\n👇 खालीलपैकी एक पर्याय निवडा किंवा आपला प्रश्न टाइप करा!",
            welcomeSubtitle: "सुरू करण्यासाठी खालीलपैकी एक पर्याय निवडा:",
            chatbotWelcome: "🤖 *TripMitra AI चॅटबॉट*\n\nनमस्कार! मी आपला AI प्रवास सहाय्यक आहे. ✈️\n\nमी आपल्याला यामध्ये मदत करू शकतो:\n• 📍 *ठिकाणांची माहिती*: पुणे किंवा इतर शहरातील प्रसिद्ध ठिकाणे व पर्यटन\n• 💡 *प्रवास टिप्स*: बजेट प्रवास आणि कौटुंबिक प्रवासाचे नियोजन\n• 🍴 *खाद्यसंस्कृती व हॉटेल्स*: जवळपासची हॉटेल्स व उपाहारगृहे\n• 🌤️ *हवामान व मार्गदर्शन*: थेट हवामान अंदाज व प्रवासाच्या दिशा\n• 🗓️ *सहल नियोजन*: सहल नियोजित करण्याची पद्धत\n\n*खाली आपला कोणताही प्रवासाचा प्रश्न विचारा!*",
            chatbotRefusal: "🤖 *TripMitra AI चॅटबॉट*\n\nमी TripMitra, आपला प्रवास सहाय्यक आहे! ✈️\nमी केवळ प्रवास, पर्यटन आणि TripMitra वैशिष्ट्यांशी संबंधित प्रश्नांची उत्तरे देऊ शकतो.",
            tripSummary: "📋 *आपली सक्रिय सहल*",
            dayPlan: (day: any) => `🗓️ *दिवस ${day} चे वेळापत्रक*`,
            modifyTitle: "✏️ सहल बदला",
            modifyPrompt: "आपल्या सहलीमध्ये कसा बदल करू इच्छिता:",
            languagePrompt: "🌐 *भाषा निवडा* / Choose Language / भाषा चुनें:",
            optionsButton: "मेनू पर्याय",
            chooseDayButton: "दिवस निवडा",
            fallbackIntro: "नंबरचे उत्तर देऊन पर्याय निवडा:",
            staleVersionNotice: (currentVersion: any) => `ℹ️ आपले वेळापत्रक आधीच आवृत्ती ${currentVersion} वर अपडेट केले आहे. ही आपली सध्याची योजना आहे:`,
            staleTripNotice: (currentDest: any) => `⚠️ तो पर्याय आपल्या मागील सहलीसाठी होता. आपली सध्याची सक्रिय सहल *${currentDest}* येथे आहे.`,
            unauthorizedNotice: "⚠️ आपल्याला ही सहल पाहण्याची किंवा बदलण्याची परवानगी नाही.",
            unknownActionNotice: "⚠️ तो पर्याय आता उपलब्ध नाही. हा मुख्य मेनू आहे:",
            planTripPrompt: "📍 आपण कुठे जात आहात?\n\nखाली आपले गंतव्य शहर टाईप करा.",
            helpText: "🤖 *TripMitra मदत*\n" +
                "*मेनू पर्याय कसे वापरावे*\n\n" +
                "📅 *सहलीचे नियोजन*\n" +
                "सहलीचे वेळापत्रक तयार करण्यासाठी हा पर्याय निवडा. आपले गंतव्य स्थान, तारखा, कालावधी, प्रवासी, बजेट आणि आवडी निवडण्यासाठी दिलेल्या सूचनांचे अनुसरण करा.\n\n" +
                "🧭 *माझी सहल*\n" +
                "आपले जतन केलेले वेळापत्रक पहा, दैनंदिन योजना तपासा आणि आपल्या सहलीमध्ये बदल किंवा व्यवस्थापन करा.\n\n" +
                "🌤️ *हवामान*\n" +
                "आपल्या गंतव्य स्थानाचे किंवा प्रवासाच्या तारखांचे हवामान अंदाज तपासा.\n\n" +
                "🌐 *भाषा*\n" +
                "आपली पसंतीची भाषा निवडा: English, मराठी, किंवा हिन्दी.\n\n" +
                "📍 *स्थान शेअर*\n" +
                "जवळपासची आकर्षणे, रेस्टॉरंट्स, कॅफे आणि स्थानिक खाद्यपदार्थ शोधण्यासाठी आपले WhatsApp लोकेशन शेअर करा.\n\n" +
                "🆘 *मदत*\n" +
                "TripMitra वापरण्यासाठी सूचनांची आवश्यकता असेल तेव्हा हे मार्गदर्शक उघडा.\n\n" +
                "💡 एखादे वैशिष्ट्य निवडण्यासाठी मेनू पर्यायांचा वापर करा आणि TripMitra ने दाखवलेल्या सूचनांचे पालन करा.",
            locationPromptNoPin: "📍 *आपला WhatsApp लोकेशन पिन शेअर करा* आणि मी जवळपासची ठिकाणे व मार्गदर्शन दाखवीन!\n\n*Attach* (📎) ➔ *Location* ➔ *Send your current location* वर टॅप करा.",
            locationReceived: "📍 *स्थान प्राप्त झाले!*\n\nआपण काय करू इच्छिता?",
            durationPrompt: "🗓️ आपण किती दिवस राहणार आहात?",
            travelerPrompt: "👥 आपल्यासोबत कोण प्रवास करत आहे?",
            budgetPrompt: "💰 आपले बजेट काय आहे?",
            interestPrompt: "🎯 आपल्या आवडी काय आहेत?",
            pacingPrompt: "🚶 आपण कशी सहल करू इच्छिता?",
            confirmationTitle: "✨ आपली सहल",
            confirmationPrompt: "आपले वेळापत्रक बनवण्यासाठी तयार आहात का?",
            editPrompt: "✏️ आपण काय बदलू इच्छिता?",
            weatherPromptNoDest: "🌤️ *हवामान अंदाज*\n\nकोणत्या शहराचा हवामान अंदाज पहायचा आहे?",
            locationCategoryPrompt: "📍 *जवळपासची ठिकाणे शोधा*\n\nआपल्या परिसरातील प्रकार निवडा:",
            dayNavFooter: (day: any, total: any) => `📍 दिवस ${day} / ${total} दाखवत आहे`,
            // Wizard steps
            step1Title: "✈️ गंतव्य शहर",
            step1Progress: "",
            step1Prompt: "📍 आपण कुठे जात आहात?\n\nखाली आपले गंतव्य शहर टाईप करा.",
            step2Title: "🗓️ प्रवास कालावधी",
            step2Progress: "",
            step2Prompt: (dest: any) => `🗓️ आपण किती दिवस राहणार आहात?\n\n📍 ${dest}`,
            customDaysPrompt: "🗓️ किती दिवस?\n\n1 ते 14 दरम्यान संख्या टाका.",
            customDaysInvalid: "⚠️ कृपया 1 ते 14 दरम्यानची संख्या टाका.",
            step3Title: "👥 प्रवासी",
            step3Progress: "",
            step3Prompt: (dest: any, days: any) => `👥 आपल्यासोबत कोण प्रवास करत आहे?\n\n📍 ${dest}\n🗓️ ${days} दिवस`,
            customTravelersPrompt: "👥 किती प्रवासी आहेत?\n\n1 ते 20 दरम्यान संख्या टाका.",
            customTravelersInvalid: "⚠️ कृपया 1 ते 20 दरम्यान संख्या टाका.",
            step4Title: "💰 बजेट",
            step4Progress: "",
            step4Prompt: (dest: any, days: any, travelers: any) => `💰 आपले बजेट काय आहे?\n\n📍 ${dest}\n🗓️ ${days} दिवस\n👥 ${travelers} प्रवासी`,
            customBudgetPrompt: "💵 आपले एकूण सहल बजेट किती आहे?\n\nरक्कम टाका.\n\nउदा:\n₹50,000\n50000\n₹1,00,000",
            customBudgetInvalid: "⚠️ कृपया INR मध्ये वैध बजेट रक्कम टाका (उदा. ₹50,000).",
            generateErrorRetry: "⚠️ आम्ही आपले वेळापत्रक तयार करू शकलो नाही.\n\nआपले सहल तपशील जतन केले आहेत.",
            step5Title: "🎯 आवडी",
            step5Progress: "",
            step5Prompt: (dest: any, days: any, budget: any, selectedLabels: any) => {
                const base = `🎯 आपल्या आवडी निवडा:\n\n📍 ${dest}\n🗓️ ${days} दिवस\n💰 ${budget}`;
                if (selectedLabels && selectedLabels.length > 0) {
                    return `${base}\n\nनिवडलेले: ${selectedLabels.join(", ")}`;
                }
                return base;
            },
            step6Title: "🚶 प्रवास गती",
            step6Progress: "",
            step6Prompt: (dest: any, days: any, paceOrContext: any) => {
                const lines = [`🚶 आपण कशी सहल करू इच्छिता?\n\n📍 ${dest}\n🗓️ ${days} दिवस`];
                if (paceOrContext && typeof paceOrContext === "object") {
                    if (paceOrContext.travelers) {
                        const count = typeof paceOrContext.travelers === "number" ? paceOrContext.travelers : parseInt(String(paceOrContext.travelers), 10) || 1;
                        lines.push(`👥 ${count} प्रवासी`);
                    }
                    if (paceOrContext.budgetStr) {
                        lines.push(`💰 ${paceOrContext.budgetStr}`);
                    }
                    if (paceOrContext.interestsStr) {
                        lines.push(`🎯 ${paceOrContext.interestsStr}`);
                    }
                }
                return `${lines.join("\n")}\n\nआपली गती निवडा:`;
            },
            confirmationCardHeader: "✨ आपली सहल",
            confirmationCardProgress: "",
            confirmationCardFooter: "आपले वेळापत्रक बनवण्यासाठी तयार आहात का?",
            editMenuHeader: "✏️ आपण काय बदलू इच्छिता?",
            editMenuPrompt: "आपण कोणता तपशील बदलू इच्छिता?",
            generatingNotice: "⏳ आपले वैयक्तिक वेळापत्रक तयार होत आहे...",
            weatherCardHeader: (dest: any) => `🌤️ *थेट हवामान अंदाज — ${dest}*`,
            locationDiscoveryPrompt: "📍 *स्थान प्राप्त झाले!*\nआपण काय शोधू इच्छिता?",
            locationCompletedTodayPrompt: "📍 *स्थान प्राप्त झाले!*\n\n✅ आपण आजचे नियोजित वेळापत्रक पूर्ण केले आहे.\n\nआपण काय शोधू इच्छिता?",
            tripCancelPromptTitle: "⚠️ *सक्रिय सहल रद्द करा*",
            tripCancelPromptBody: "आपण नक्की आपली सक्रिय सहल रद्द करू इच्छिता?\n\nआपले वेळापत्रक यापुढे सक्रिय सहल म्हणून गणले जाणार नाही आणि लोकेशन शेअरिंग पुढील थांब्याच्या मार्गदर्शनासाठी ही सहल वापरणार नाही.",
            tripCancelPromptUpcomingTitle: "⚠️ *आगामी सहल रद्द करा*",
            tripCancelPromptUpcomingBody: (dest: any) => `आपण नक्की *${dest}* ची आगामी सहल रद्द करू इच्छिता?`,
            tripCancelSuccess: "✅ *सहल रद्द केली*\n\nआपली सहल आता सक्रिय नाही.\n\nआपण अजूनही वापरू शकता:\n🏛️ प्रसिद्ध ठिकाणे\n🍽️ रेस्टॉरंट्स\n🏨 हॉटेल्स\n🌤️ हवामान",
            tripCancelUpcomingSuccess: "✅ *सहल रद्द केली*\n\nआपली आगामी सहल रद्द करण्यात आली आहे.\n\nआपण केव्हाही नवीन सहल नियोजित करू शकता किंवा शोधू शकता:\n🏛️ प्रसिद्ध ठिकाणे\n🍽️ रेस्टॉरंट्स\n🏨 हॉटेल्स\n🌤️ हवामान",
            locationRequiredForDiscovery: "📍 जवळची ठिकाणे शोधण्यासाठी कृपया प्रथम तुमचे थेट स्थान शेअर करा.",
            outOfScopeRedirect: "🧭 मी तुमचा प्रवास सहाय्यक आहे, जो पर्यटनस्थळे, प्रवासाचे मार्ग, हॉटेल्स, खाद्यसंस्कृती आणि सहलींच्या मार्गदर्शनासाठी तयार केला आहे.\n\nकृपया सहल किंवा ठिकाणांशी संबंधित प्रश्न विचारा!",
            ambiguousDatePrompt: "💬 *तुम्हाला उद्याबद्दल काय जाणून घ्यायचे आहे?*\n\n1. 🌤️ हवामान\n2. 🏛️ प्रेक्षणीय स्थळे\n3. 📅 सहलीचे नियोजन",
            resumePlanningButton: "▶️ सहल सुरू ठेवा",
            resumePlanningNotice: "\n\n💡 _आपल्या सहलीचे नियोजन सुरू ठेवण्यासाठी कोणत्याही वेळी 'सहल सुरू ठेवा' उत्तर द्या._",
            weatherErrorFallback: "माफ करा, सध्या हवामानाची माहिती मिळवू शकलो नाही. कृपया थोड्या वेळाने प्रयत्न करा."
        },
        wizardUI: {
            travelDate: {
                header: (dest: any) => `📅 *आपण कधी प्रवास करणार आहात?*\n\n📍 *${dest}*`,
                buttonText: "तारीख निवडा",
                sectionTitle: "प्रवासाची तारीख",
                rows: {
                    today: { title: "📅 आज", desc: "आज सहल सुरू करा" },
                    tomorrow: { title: "🌅 उद्या", desc: "उद्या सहल सुरू करा" },
                    thisWeekend: { title: "🏖️ हा वीकेंड", desc: "आगामी वीकेंड सहल" },
                    nextWeekend: { title: "🗓️ पुढील वीकेंड", desc: "पुढील आठवड्याचा वीकेंड" },
                    customDate: { title: "✏️ तारीख निवडा", desc: "तारीख टाका (उदा. 15 Oct 2026)" },
                    back: { title: "↩ मागे", desc: "गंतव्य शहर बदला" }
                }
            },
            duration: {
                header: (dest, dateLine = "") => `🗓️ *किती दिवस?*\n\n📍 ${dest}${dateLine}`,
                buttonText: "दिवस निवडा",
                sectionTitle: "सहल कालावधी",
                daySingular: "दिवस",
                dayPlural: "दिवस",
                rows: {
                    day1: { title: "1 दिवस", desc: "एक दिवसाची सहल" },
                    day2: { title: "2 दिवस", desc: "वीकेंड सहल" },
                    day3: { title: "3 दिवस", desc: "लोकप्रिय शिफारस" },
                    day4: { title: "4 दिवस", desc: "सविस्तर भटकंती" },
                    day5: { title: "5 दिवस", desc: "संपूर्ण सहल योजना" },
                    day7: { title: "7 दिवस", desc: "पूर्ण सुट्टीचा आनंद" },
                    custom: { title: "✏️ इतर दिवस", desc: "1–30 दिवस टाका" },
                    back: { title: "↩ मागे", desc: "तारीख बदला" }
                }
            },
            travelers: {
                header: (dest: any, dateLine: any, durationStr: any) => `👥 *कोण प्रवास करत आहे?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}`,
                buttonText: "प्रवासी निवडा",
                sectionTitle: "प्रवासी माहिती",
                travelerSingular: "प्रवासी",
                travelerPlural: "प्रवासी",
                rows: {
                    solo: { title: "👤 सोलो · 1", desc: "1 प्रवासी" },
                    couple: { title: "👫 जोडीदार · 2", desc: "2 प्रवासी" },
                    family: { title: "👨‍👩‍👧 कुटुंब · 4", desc: "कुटुंब / लहान गट" },
                    group: { title: "👥 मित्र गट · 5–8", desc: "मित्र / मध्यम गट (5–8)" },
                    custom: { title: "✏️ इतर संख्या", desc: "1–50 प्रवासी टाका" },
                    back: { title: "↩ मागे", desc: "कालावधी बदला" }
                }
            },
            groupSize: {
                header: (dest: any, durationStr: any) => `👥 *गट आकार (5–8 व्यक्ती)*\n\n📍 ${dest}\n🗓️ ${durationStr}\n\nनक्की संख्या निवडा:`,
                buttonText: "गट आकार निवडा",
                sectionTitle: "गट सदस्य",
                peopleLabel: (n: any) => ({ title: `👥 ${n} व्यक्ती`, desc: `${n} जणांचा गट` }),
                back: { title: "↩ मागे", desc: "प्रवासी पर्यायांवर परत" }
            },
            budget: {
                header: (dest: any, dateLine: any, durationStr: any, travelerStr: any) => `💰 *आपले बजेट काय आहे?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}\n👥 ${travelerStr}`,
                buttonText: "बजेट निवडा",
                sectionTitle: "सहल बजेट",
                categories: {
                    budget: "💸 बजेट",
                    moderate: "⚖️ मध्यम",
                    luxury: "✨ लक्झरी",
                    custom: "💰 बजेट"
                },
                rows: {
                    budget: { title: "💸 बजेट", desc: "किफायतशीर निवास आणि स्थानिक खाद्य" },
                    moderate: { title: "⚖️ मध्यम", desc: "आरामदायी मध्यम श्रेणी निवास" },
                    luxury: { title: "✨ लक्झरी", desc: "प्रीमियम निवास आणि उत्तम भोजन" },
                    enterAmount: { title: "💵 रक्कम टाका", desc: "एकूण सहल बजेट टाका (उदा. ₹25,000)" },
                    back: { title: "↩ मागे", desc: "प्रवासी संख्या बदला" }
                }
            },
            interests: {
                header: (dest: any, dateLine: any, durationStr: any, budgetStr: any) => `🎯 *आपल्या आवडी काय आहेत?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}\n💰 ${budgetStr}`,
                buttonText: "आवडी निवडा",
                sectionTitle: "काय पाहावे",
                selectedLabel: (count: any) => `*निवडलेले (${count}):*`,
                doneTitle: "✅ पूर्ण झाले (पुढे जा)",
                doneDesc: (count: any) => (count > 0 ? `${count} निवडले · सारांश` : "सारांशाकडे जा"),
                back: { title: "↩ मागे", desc: "बजेट बदला" }
            },
            pacing: {
                header: (dest: any, dateLine: any, durationStr: any) => `🚶 *आपण कशी सहल करू इच्छिता?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}`,
                choosePacePrompt: "आपली गती निवडा:",
                buttons: {
                    relaxed: "🧘 शांत",
                    balanced: "🚶 संतुलित",
                    fastPaced: "⚡ जलद"
                }
            },
            editMenu: {
                header: "✏️ आपण काय बदलू इच्छिता?",
                buttonText: "पायरी निवडा",
                sectionTitle: "बदल पर्याय",
                rows: {
                    destination: { title: "1. 📍 गंतव्य शहर", desc: "गंतव्य शहर बदला" },
                    travelDate: { title: "2. 📅 प्रवास तारीख", desc: "प्रवासाची तारीख बदला" },
                    duration: { title: "3. 🗓️ कालावधी", desc: "दिवसांची संख्या बदला" },
                    travelers: { title: "4. 👥 प्रवासी", desc: "प्रवासी संख्या अपडेट करा" },
                    budget: { title: "5. 💰 बजेट", desc: "बजेट व रक्कम अपडेट करा" },
                    interests: { title: "6. 🎯 आवडी", desc: "पर्यटन पसंती अपडेट करा" },
                    backToSummary: { title: "↩️ सारांशावर परत", desc: "सहल सारांशावर परत जा" }
                }
            },
            generationError: {
                retryButton: "🔄 पुन्हा प्रयत्न करा",
                editButton: "✏️ सहल बदला",
                homeButton: "🏠 मुख्य मेनू"
            },
            summary: {
                confirmationHeader: "✨ *आपल्या सहलीचा सारांश*",
                upcomingTripHeader: "📅 *आगामी सहल*",
                activeTripHeader: "📋 *सक्रिय सहल*",
                completedTripHeader: "🏁 *पूर्ण झालेली सहल*",
                cancelledTripHeader: "❌ *रद्द केलेली सहल*",
                planningTripHeader: "📝 *सहल नियोजन सुरू आहे*",
                startsInDays: (d: any) => d === 1 ? "⏳ *उद्या सुरू होईल*" : `⏳ *${d} दिवसांत सुरू होईल*`,
                activeDayProgress: (c: any, t: any) => `📍 *दिवस ${c} / ${t}*`,
                destinationLabel: "📍 *गंतव्य शहर:*",
                travelDatesLabel: "📅 *प्रवास तारीख:*",
                durationLabel: "🗓️ *कालावधी:*",
                travelersLabel: "👥 *प्रवासी:*",
                budgetLabel: "💰 *बजेट:*",
                interestsLabel: "🎯 *आवडी:*",
                statusLabel: "स्थिती:",
                statusReady: "वेळापत्रक तयार आहे",
                statusCollecting: "तपशील गोळा करत आहे",
                statusUpcoming: "आगामी",
                statusActive: "सुरू आहे",
                statusCompleted: "पूर्ण",
                statusCancelled: "रद्द",
                readyPrompt: "आपले दैनंदिन सहल वेळापत्रक बनवण्यासाठी तयार आहात का?",
                notSet: "निश्चित नाही",
                famousPlacesDefault: "• 🌟 प्रसिद्ध ठिकाणे"
            },
            mainMenuSections: {
                travelAndTrips: "प्रवास व सहल",
                toolsAndSettings: "साधने व सेटिंग्ज"
            },
            itineraryPagination: {
                nextDay: (day: any) => `पुढील: दिवस ${day} ➡️`,
                prevDay: (day: any) => `◀️ दिवस ${day}`,
                dayOfTotal: (day: any, total: any) => `दिवस ${day} / ${total}`,
                navHeader: (day: any, total: any) => `🗺️ *दिवस ${day} / ${total} · मार्गदर्शन*`
            },
            itineraryActivityPlaceholders: {
                arrivalCheckIn: "✈️ _आगमन आणि चेक-इन_",
                relaxedMorning: "🌿 _आरामदायी सकाळ आणि फेरफटका_",
                departureTransit: "🧳 _प्रस्थान आणि परतीचा प्रवास_",
                leisureRestBreak: "☕ _विश्रांती आणि चहा-नाश्ता_",
                departureFarewell: "🧳 _सहल सांगता आणि प्रस्थान_",
                freeTimeRelaxation: "🌙 _मोकळा वेळ आणि विश्रांती_",
                dayNumberHeader: (day: any) => `🗓️ *दिवस ${day}*`
            }
        },
        visionUI: {
            downloadError: "⚠️ फोटो डाउनलोड करता आला नाही. कृपया पुन्हा पाठवण्याचा प्रयत्न करा.",
            oversizedError: "⚠️ फोटो 5MB पेक्षा मोठा आहे. कृपया 5MB पेक्षा कमी आकाराचा JPEG किंवा PNG फोटो पाठवा.",
            unsupportedFormatError: "⚠️ असमर्थित फोटो स्वरूप. कृपया JPEG किंवा PNG फोटो पाठवा.",
            imageOnlyLandmark: (name: string) => `📸 *पर्यटन स्थळ आढळले:* *${name}*\n\nआपल्याला याचा इतिहास, भेट देण्याची सर्वोत्तम वेळ, प्रवेश शुल्क किंवा मार्ग जाणून घ्यायचा आहे का?`,
            imageOnlyDocument: (docType: string, summary: string) => `🎫 *प्रवास दस्तऐवज आढळला:* *${docType}*\n${summary ? `${summary}\n` : ""}\nआपल्याला प्रस्थान/आगमन वेळ, प्लॅटफॉर्म किंवा प्रवासाचा मार्ग जाणून घ्यायचा आहे का?`,
            imageOnlyMenu: "🍽️ *मेनू कार्ड आढळले!*\n\nमी आपल्याला शाकाहारी पदार्थ शोधण्यात, किमती तपासण्यात किंवा विशेष पदार्थांची माहिती देण्यास मदत करू शकतो. आपल्याला काय हवे आहे?",
            imageOnlySignboard: (text: string) => `🪧 *पाटी / फलक आढळला:*\n"${text}"\n\nआपल्याला याचे भाषांतर, दिशा किंवा माहिती हवी आहे का?`,
            imageOnlyGeneric: "📸 *फोटो मिळाला!*\n\nया फोटोबद्दल आपल्याला काय माहिती हवी आहे? मला पर्यटन स्थळे, मार्ग, जेवण किंवा प्रवासाच्या टिप्स विचारा.",
            menuAllergenNotice: "⚠️ *टीप:* मेनूचे दृश्य विश्लेषण केवळ मार्गदर्शनासाठी आहे. कृपया घटकांसाठी आणि ॲलर्जीसाठी रेस्टॉरंट कर्मचाऱ्यांशी थेट संपर्क साधा.",
            ticketObservationalNotice: "ℹ️ *टीप:* तिकीटाचा तपशील दृश्य निरीक्षणावर आधारित आहे. थेट स्थितीसाठी IRCTC किंवा अधिकृत वाहतूक ॲप तपासा.",
            landmarkUnverifiedNotice: "ℹ️ *टीप:* स्थळाची ओळख छायाचित्रावर आधारित आहे. भेट देण्यापूर्वी स्थानिक पातळीवर वेळ आणि माहिती तपासा.",
            degradedServiceError: "⚠️ फोटो विश्लेषण सेवा सध्या तात्पुरती अनुपलब्ध आहे. कृपया थोड्या वेळाने प्रयत्न करा किंवा स्थळाचे नाव टाईप करा!"
        }
    },
    hi: {
        buttonLabels: {
            [WhatsAppActionId.HOME]: "मुख्य मेनू",
            [WhatsAppActionId.HELP]: "सहायता",
            [WhatsAppActionId.BACK]: "पीछे",
            [WhatsAppActionId.NAV_MAIN_MENU]: "मुख्य मेनू",
            [WhatsAppActionId.NAV_BACK]: "पीछे",
            [WhatsAppActionId.NAV_CANCEL]: "रद्द करें",
            [WhatsAppActionId.RESUME_WIZARD]: "ट्रिप जारी रखें",
            [WhatsAppActionId.MENU_PLAN_TRIP]: "ट्रिप प्लान करें",
            [WhatsAppActionId.MENU_MY_TRIP]: "मेरी ट्रिप",
            [WhatsAppActionId.MENU_WEATHER]: "मौसम",
            [WhatsAppActionId.MENU_LANGUAGE]: "भाषा",
            [WhatsAppActionId.MENU_LOCATION]: "लोकेशन शेयर",
            [WhatsAppActionId.MENU_HELP]: "सहायता",
            [WhatsAppActionId.PLAN_TRIP]: "ट्रिप प्लान करें",
            [WhatsAppActionId.VIEW_TRIP]: "मेरी ट्रिप",
            [WhatsAppActionId.VIEW_DAY]: "दिन देखें",
            [WhatsAppActionId.FULL_ITINERARY]: "पूरी योजना",
            [WhatsAppActionId.TRIP_CONTINUE]: "योजना जारी रखें",
            [WhatsAppActionId.TRIP_NEW]: "नई ट्रिप शुरू करें",
            [WhatsAppActionId.TRIP_CHANGE_DESTINATION]: "शहर बदलें",
            [WhatsAppActionId.TRIP_VIEW_ITINERARY]: "योजना देखें",
            [WhatsAppActionId.SET_DESTINATION]: "शहर चुनें",
            [WhatsAppActionId.TRAVEL_DATE]: "यात्रा की तारीख",
            [WhatsAppActionId.SET_TRAVEL_DATE]: "तारीख चुनें",
            [WhatsAppActionId.CUSTOM_DATE]: "अन्य तारीख",
            [WhatsAppActionId.SET_DURATION]: "अवधि चुनें",
            [WhatsAppActionId.CUSTOM_DAYS]: "अन्य दिन",
            [WhatsAppActionId.SET_TRAVELERS]: "यात्री चुनें",
            [WhatsAppActionId.GROUP_SIZE_PICKER]: "समूह आकार",
            [WhatsAppActionId.CUSTOM_TRAVELERS]: "अन्य यात्री संख्या",
            [WhatsAppActionId.SET_BUDGET]: "बजट चुनें",
            [WhatsAppActionId.CUSTOM_BUDGET]: "बजट राशि",
            [WhatsAppActionId.SET_INTERESTS]: "रुचियां चुनें",
            [WhatsAppActionId.TOGGLE_INTEREST]: "रुचि चुनें",
            [WhatsAppActionId.INTERESTS_DONE]: "पूर्ण (आगे बढ़ें)",
            [WhatsAppActionId.INTERESTS_BACK]: "पीछे",
            [WhatsAppActionId.SET_PACING]: "गति चुनें",
            [WhatsAppActionId.TRIP_CONFIRM]: "योजना बनाएं",
            [WhatsAppActionId.TRIP_RETRY_GENERATE]: "पुनः प्रयास करें",
            [WhatsAppActionId.TRIP_EDIT_MENU]: "संशोधित करें",
            [WhatsAppActionId.EDIT_STEP]: "विवरण बदलें",
            [WhatsAppActionId.TRIP_CANCEL]: "रद्द करें",
            [WhatsAppActionId.TRIP_CANCEL_PROMPT]: "ट्रिप रद्द करें",
            [WhatsAppActionId.TRIP_CANCEL_CONFIRM]: "हाँ, ट्रिप रद्द करें",
            [WhatsAppActionId.TRIP_CANCEL_ABORT]: "मेरी ट्रिप रखें",
            [WhatsAppActionId.DAY_NEXT]: "अगला दिन",
            [WhatsAppActionId.DAY_PREV]: "पिछला दिन",
            [WhatsAppActionId.NEARBY_PLACES]: "आस-पास खोजें",
            [WhatsAppActionId.WEATHER]: "मौसम",
            [WhatsAppActionId.WEATHER_REFRESH]: "मौसम रीफ्रेश करें",
            [WhatsAppActionId.DIRECTIONS]: "दिशानिर्देश",
            [WhatsAppActionId.LOCATION_NEARBY]: "आस-पास के स्थल",
            [WhatsAppActionId.LOCATION_NEXT_STOP]: "अगला पड़ाव",
            [WhatsAppActionId.LOCATION_NAVIGATION]: "नेविगेशन",
            [WhatsAppActionId.LOC_CAT_FOOD]: "खानपान",
            [WhatsAppActionId.LOC_CAT_ATTRACTIONS]: "प्रमुख आकर्षण",
            [WhatsAppActionId.LOC_CAT_HOTELS]: "होटल",
            [WhatsAppActionId.LOC_CAT_CAFES]: "कैफे",
            [WhatsAppActionId.LOC_CAT_SHOPPING]: "खरीदारी",
            [WhatsAppActionId.LOC_CAT_PHOTOS]: "फोटो स्पॉट",
            [WhatsAppActionId.MODIFY_MENU]: "ट्रिप संशोधित करें",
            [WhatsAppActionId.MAKE_CHEAPER]: "खर्च कम करें",
            [WhatsAppActionId.LESS_WALKING]: "कम चलना",
            [WhatsAppActionId.MORE_HISTORY]: "ऐतिहासिक स्थल",
            [WhatsAppActionId.MORE_FOOD]: "स्थानीय खानपान",
            [WhatsAppActionId.REDUCE_PACE]: "आरामदेह गति",
            [WhatsAppActionId.LANGUAGE_MENU]: "भाषा बदलें",
            [WhatsAppActionId.SET_LANGUAGE]: "भाषा चुनें",
            [WhatsAppActionId.LANG_EN]: "English",
            [WhatsAppActionId.LANG_HI]: "हिन्दी",
            [WhatsAppActionId.LANG_MR]: "मराठी"
        },
        listTitles: {
            modCheaperTitle: "💰 खर्च कम करें",
            modCheaperDesc: "कम खर्च वाले स्थलों को प्राथमिकता दें",
            modLessWalkTitle: "🚶 कम चलना",
            modLessWalkDesc: "आसानी से पहुँचने योग्य स्थल",
            modHistoryTitle: "🏛️ ऐतिहासिक स्थल",
            modHistoryDesc: "किले और स्मारक अधिक शामिल करें",
            modFoodTitle: "🍲 स्थानीय खानपान",
            modFoodDesc: "स्थानीय व्यंजन और प्रसिद्ध रेस्टोरेंट",
            modPaceTitle: "🧘 आरामदेह गति",
            modPaceDesc: "अधिक खाली समय और आराम शामिल करें",
            modBackTitle: "🔙 वर्तमान योजना रखें",
            modBackDesc: "बिना बदलाव किए वापस जाएं",
            langEnTitle: "English",
            langEnDesc: "Set conversation language to English",
            langMrTitle: "मराठी (Marathi)",
            langMrDesc: "मराठीमध्ये संभाषण करा",
            langHiTitle: "हिन्दी (Hindi)",
            langHiDesc: "हिन्दी में बातचीत करें",
            menuPlanTitle: "🗓️ ट्रिप प्लान करें",
            menuPlanDesc: "नई यात्रा का नियोजन शुरू करें",
            menuTripTitle: "🧭 मेरी ट्रिप",
            menuTripDesc: "अपनी ट्रिप की जानकारी देखें",
            menuWeatherTitle: "🌤️ मौसम",
            menuWeatherDesc: "अपनी यात्रा के लिए मौसम देखें",
            menuLangTitle: "🌐 भाषा",
            menuLangDesc: "English, मराठी या हिन्दी चुनें",
            menuLocTitle: "📍 लोकेशन शेयर",
            menuLocDesc: "GPS से पर्यटन स्थल, रेस्टोरेंट, कैफे व स्थानीय भोजन खोजें",
            menuHelpTitle: "🆘 सहायता",
            menuHelpDesc: "इस बॉट का उपयोग कैसे करें",
            discoveryAttractionsTitle: "🏛️ प्रमुख आकर्षण",
            discoveryAttractionsDesc: "आस-पास के पर्यटन स्थल और स्मारक खोजें",
            discoveryFoodTitle: "🍽️ रेस्टोरेंट",
            discoveryFoodDesc: "आस-पास के भोजन स्थल और रेस्टोरेंट खोजें",
            discoveryHotelsTitle: "🏨 होटल",
            discoveryHotelsDesc: "आस-पास के होटल और ठहरने की जगहें",
            discoveryWeatherTitle: "🌤️ मौसम",
            discoveryWeatherDesc: "लाइव मौसम पूर्वानुमान देखें",
            discoveryHomeTitle: "🏠 मुख्य मेनू",
            discoveryHomeDesc: "मुख्य मेनू पर वापस जाएं",
            cancelTripTitle: "❌ ट्रिप रद्द करें",
            cancelTripDesc: "अपनी सक्रिय ट्रिप रद्द करें"
        },
        menuHeaders: {
            welcome: "🌍 TripMitra में आपका स्वागत है! ✈️\n\nआपका व्यक्तिगत WhatsApp यात्रा सहायक।\n\nआप क्या करना चाहेंगे?\n\n👇 नीचे दिए गए मेनू विकल्पों में से चुनें या अपना प्रश्न टाइप करें!",
            welcomeSubtitle: "शुरू करने के लिए नीचे दिए गए विकल्पों में से एक चुनें:",
            chatbotWelcome: "🤖 *TripMitra AI चैटबॉट*\n\nनमस्ते! मैं आपका AI यात्रा सहायक हूँ। ✈️\n\nमैं आपकी इसमें सहायता कर सकता हूँ:\n• 📍 *स्थल विवरण*: पुणे या अन्य शहरों के दर्शनीय स्थल व पर्यटन\n• 💡 *यात्रा सुझाव*: बजट यात्रा और पारिवारिक यात्रा सलाह\n• 🍴 *खानपान व होटल*: आस-पास के रेस्टोरेंट व होटल खोजना\n• 🌤️ *मौसम व दिशानिर्देश*: मौसम पूर्वानुमान व मार्ग दर्शन\n• 🗓️ *ट्रिप प्लानिंग*: ट्रिप प्लान करने का तरीका\n\n*नीचे अपना कोई भी यात्रा संबंधी प्रश्न पूछें!*",
            chatbotRefusal: "🤖 *TripMitra AI चैटबॉट*\n\nमैं TripMitra, आपका यात्रा सहायक हूँ! ✈️\nमैं केवल यात्रा, पर्यटन और TripMitra सुविधाओं से संबंधित प्रश्नों के उत्तर दे सकता हूँ।",
            tripSummary: "📋 *आपकी सक्रिय ट्रिप*",
            dayPlan: (day: any) => `🗓️ *दिन ${day} यात्रा कार्यक्रम*`,
            modifyTitle: "✏️ ट्रिप संशोधित करें",
            modifyPrompt: "आप अपनी ट्रिप में क्या बदलाव करना चाहते हैं:",
            languagePrompt: "🌐 *भाषा चुनें* / Choose Language / भाषा निवडा:",
            optionsButton: "मेनू विकल्प",
            chooseDayButton: "दिन चुनें",
            fallbackIntro: "नंबर का उत्तर देकर एक विकल्प चुनें:",
            staleVersionNotice: (currentVersion: any) => `ℹ️ आपका यात्रा कार्यक्रम पहले ही संस्करण ${currentVersion} में अपडेट हो चुका है। यह आपकी वर्तमान योजना है:`,
            staleTripNotice: (currentDest: any) => `⚠️ वह विकल्प आपकी पिछली यात्रा के लिए था। आपकी वर्तमान सक्रिय यात्रा *${currentDest}* में है।`,
            unauthorizedNotice: "⚠️ आपके पास इस यात्रा को देखने या बदलने की अनुमति नहीं है।",
            unknownActionNotice: "⚠️ वह विकल्प अब उपलब्ध नहीं है। यह मुख्य मेनू है:",
            planTripPrompt: "📍 आप कहाँ जा रहे हैं?\n\nनीचे अपना गंतव्य शहर टाइप करें।",
            helpText: "🤖 *TripMitra सहायता*\n" +
                "*मेनू विकल्पों का उपयोग कैसे करें*\n\n" +
                "📅 *ट्रिप प्लान करें*\n" +
                "यात्रा कार्यक्रम बनाने के लिए यह विकल्प चुनें। अपने गंतव्य, तिथियां, अवधि, यात्रियों, बजट और रुचियों को दर्ज करने के चरणों का पालन करें।\n\n" +
                "🧭 *मेरी ट्रिप*\n" +
                "अपना सहेजा गया यात्रा कार्यक्रम देखें, दैनिक योजनाएं जांचें, और अपनी यात्रा में बदलाव या प्रबंधन करें।\n\n" +
                "🌤️ *मौसम*\n" +
                "अपने गंतव्य या यात्रा की तारीखों के लिए मौसम का पूर्वानुमान देखें।\n\n" +
                "🌐 *भाषा*\n" +
                "अपनी पसंदीदा भाषा चुनें: English, हिन्दी, या मराठी।\n\n" +
                "📍 *लोकेशन शेयर*\n" +
                "आस-पास के आकर्षण, रेस्टोरेंट, कैफे और स्थानीय भोजन खोजने के लिए अपना WhatsApp लोकेशन शेयर करें।\n\n" +
                "🆘 *सहायता*\n" +
                "जब भी आपको TripMitra का उपयोग करने के निर्देश चाहिए हों, यह गाइड खोलें।\n\n" +
                "💡 किसी सुविधा को चुनने के लिए मेनू विकल्प का उपयोग करें और TripMitra द्वारा दिखाए गए निर्देशों का पालन करें।",
            locationPromptNoPin: "📍 *अपना WhatsApp लोकेशन शेयर करें* और मैं आस-पास के स्थल व नेविगेशन दिखाऊँगा!\n\n*Attach* (📎) ➔ *Location* ➔ *Send your current location* पर टैप करें।",
            locationReceived: "📍 *लोकेशन प्राप्त हुआ!*\n\nआप क्या करना चाहेंगे?",
            durationPrompt: "🗓️ आप कितने दिन रुकेंगे?",
            travelerPrompt: "👥 आपके साथ कौन यात्रा करेगा?",
            budgetPrompt: "💰 आपका बजट क्या है?",
            interestPrompt: "🎯 आपकी क्या रुचियां हैं?",
            pacingPrompt: "🚶 आप कैसे यात्रा करना पसंद करते हैं?",
            confirmationTitle: "✨ आपकी ट्रिप",
            confirmationPrompt: "क्या आप अपना यात्रा कार्यक्रम बनाने के लिए तैयार हैं?",
            editPrompt: "✏️ आप क्या बदलना चाहते हैं?",
            weatherPromptNoDest: "🌤️ *मौसम का हाल*\n\nआप किस शहर का मौसम देखना चाहते हैं?",
            locationCategoryPrompt: "📍 *आस-पास के स्थल खोजें*\n\nअपने आस-पास श्रेणी चुनें:",
            dayNavFooter: (day: any, total: any) => `📍 दिन ${day} / ${total} दिखाया जा रहा है`,
            // Wizard steps
            step1Title: "✈️ गंतव्य",
            step1Progress: "",
            step1Prompt: "📍 आप कहाँ जा रहे हैं?\n\nनीचे अपना गंतव्य शहर टाइप करें।",
            step2Title: "🗓️ यात्रा अवधि",
            step2Progress: "",
            step2Prompt: (dest: any) => `🗓️ आप कितने दिन रुकेंगे?\n\n📍 ${dest}`,
            customDaysPrompt: "🗓️ कितने दिन?\n\n1 से 14 के बीच की संख्या दर्ज करें।",
            customDaysInvalid: "⚠️ कृपया 1 से 14 के बीच की संख्या दर्ज करें।",
            step3Title: "👥 यात्री",
            step3Progress: "",
            step3Prompt: (dest: any, days: any) => `👥 कौन यात्रा कर रहा है?\n\n📍 ${dest}\n🗓️ ${days} दिन`,
            customTravelersPrompt: "👥 कितने यात्री हैं?\n\n1 से 20 के बीच की संख्या दर्ज करें।",
            customTravelersInvalid: "⚠️ कृपया 1 से 20 के बीच की संख्या दर्ज करें।",
            step4Title: "💰 बजट",
            step4Progress: "",
            step4Prompt: (dest: any, days: any, travelers: any) => `💰 आपका बजट क्या है?\n\n📍 ${dest}\n🗓️ ${days} दिन\n👥 ${travelers} यात्री`,
            customBudgetPrompt: "💵 आपका कुल ट्रिप बजट कितना है?\n\nराशि दर्ज करें。\n\nउदा:\n₹50,000\n50000\n₹1,00,000",
            customBudgetInvalid: "⚠️ कृपया एक वैध बजट राशि दर्ज करें (उदा. ₹50,000)।",
            generateErrorRetry: "⚠️ हम आपका यात्रा प्लान तैयार नहीं कर सके।\n\nआपके विवरण सुरक्षित हैं।",
            step5Title: "🎯 रुचियां",
            step5Progress: "",
            step5Prompt: (dest: any, days: any, budget: any, selectedLabels: any) => {
                const base = `🎯 आपकी क्या रुचियां हैं?\n\n📍 ${dest}\n🗓️ ${days} दिन\n💰 ${budget}`;
                if (selectedLabels && selectedLabels.length > 0) {
                    return `${base}\n\nचयनित: ${selectedLabels.join(", ")}`;
                }
                return base;
            },
            step6Title: "🚶 यात्रा गति",
            step6Progress: "",
            step6Prompt: (dest: any, days: any, paceOrContext: any) => {
                const lines = [`🚶 आप कैसे यात्रा करना पसंद करते हैं?\n\n📍 ${dest}\n🗓️ ${days} दिन`];
                if (paceOrContext && typeof paceOrContext === "object") {
                    if (paceOrContext.travelers) {
                        const count = typeof paceOrContext.travelers === "number" ? paceOrContext.travelers : parseInt(String(paceOrContext.travelers), 10) || 1;
                        lines.push(`👥 ${count} यात्री`);
                    }
                    if (paceOrContext.budgetStr) {
                        lines.push(`💰 ${paceOrContext.budgetStr}`);
                    }
                    if (paceOrContext.interestsStr) {
                        lines.push(`🎯 ${paceOrContext.interestsStr}`);
                    }
                }
                return `${lines.join("\n")}\n\nअपनी गति चुनें:`;
            },
            confirmationCardHeader: "✨ आपकी ट्रिप",
            confirmationCardProgress: "",
            confirmationCardFooter: "क्या आप अपना यात्रा कार्यक्रम बनाने के लिए तैयार हैं?",
            editMenuHeader: "✏️ आप क्या बदलना चाहते हैं?",
            editMenuPrompt: "आप कौन सा विवरण बदलना चाहते हैं?",
            generatingNotice: "⏳ आपका यात्रा प्लान बनाया जा रहा है...",
            weatherCardHeader: (dest: any) => `🌤️ *लाइव मौसम का हाल — ${dest}*`,
            locationDiscoveryPrompt: "📍 *लोकेशन प्राप्त हुआ!*\nआप क्या खोजना चाहेंगे?",
            locationCompletedTodayPrompt: "📍 *लोकेशन प्राप्त हुआ!*\n\n🎉 आपने आज का निर्धारित यात्रा कार्यक्रम पूरा कर लिया है।\n\nआप क्या खोजना चाहेंगे?",
            tripCancelPromptTitle: "⚠️ *सक्रिय ट्रिप रद्द करें*",
            tripCancelPromptBody: "क्या आप वाकई अपनी सक्रिय ट्रिप रद्द करना चाहते हैं?\n\nआपका यात्रा कार्यक्रम अब सक्रिय नहीं रहेगा, और लोकेशन शेयरिंग अगले पड़ाव के मार्गदर्शन के लिए इस ट्रिप का उपयोग नहीं करेगी।",
            tripCancelPromptUpcomingTitle: "⚠️ *आगामी ट्रिप रद्द करें*",
            tripCancelPromptUpcomingBody: (dest: any) => `क्या आप वाकई *${dest}* की अपनी आगामी ट्रिप रद्द करना चाहते हैं?`,
            tripCancelSuccess: "✅ *ट्रिप रद्द कर दी गई*\n\nआपकी ट्रिप अब सक्रिय नहीं है।\n\nआप अभी भी उपयोग कर सकते हैं:\n🏛️ प्रमुख आकर्षण\n🍽️ रेस्टोरेंट\n🏨 होटल\n🌤️ मौसम",
            tripCancelUpcomingSuccess: "✅ *ट्रिप रद्द कर दी गई*\n\nआपकी आगामी ट्रिप रद्द कर दी गई है।\n\nआप कभी भी नई ट्रिप प्लान कर सकते हैं या खोज सकते हैं:\n🏛️ प्रमुख आकर्षण\n🍽️ रेस्टोरेंट\n🏨 होटल\n🌤️ मौसम",
            locationRequiredForDiscovery: "📍 आस-पास के स्थान खोजने के लिए कृपया पहले अपना लाइव स्थान साझा करें।",
            outOfScopeRedirect: "🧭 मैं आपका AI यात्रा सहायक हूँ, जो पर्यटन स्थलों, यात्रा मार्गों, होटल, खानपान और पर्यटन संबंधी जानकारी में सहायता करता हूँ।\n\nकृपया यात्रा या स्थानों से जुड़े सवाल पूछें!",
            ambiguousDatePrompt: "💬 *आप कल के बारे में क्या जानना चाहते हैं?*\n\n1. 🌤️ मौसम\n2. 🏛️ पर्यटन स्थल\n3. 📅 ट्रिप प्लान करें",
            resumePlanningButton: "▶️ ट्रिप जारी रखें",
            resumePlanningNotice: "\n\n💡 _अपनी ट्रिप सेटअप जारी रखने के लिए किसी भी समय 'ट्रिप जारी रखें' का जवाब दें।_",
            weatherErrorFallback: "क्षमा करें, अभी मौसम की जानकारी प्राप्त नहीं हो सकी। कृपया कुछ समय बाद पुनः प्रयास करें।"
        },
        wizardUI: {
            travelDate: {
                header: (dest: any) => `📅 *आप कब यात्रा करने की योजना बना रहे हैं?*\n\n📍 *${dest}*`,
                buttonText: "तारीख चुनें",
                sectionTitle: "यात्रा की तारीख",
                rows: {
                    today: { title: "📅 आज", desc: "आज यात्रा शुरू करें" },
                    tomorrow: { title: "🌅 कल", desc: "कल यात्रा शुरू करें" },
                    thisWeekend: { title: "🏖️ इस वीकेंड", desc: "आगामी वीकेंड ट्रिप" },
                    nextWeekend: { title: "🗓️ अगला वीकेंड", desc: "अगले सप्ताह का वीकेंड" },
                    customDate: { title: "✏️ तारीख चुनें", desc: "तारीख दर्ज करें (उदा. 15 Oct 2026)" },
                    back: { title: "↩ पीछे", desc: "गंतव्य शहर बदलें" }
                }
            },
            duration: {
                header: (dest, dateLine = "") => `🗓️ *कितने दिन?*\n\n📍 ${dest}${dateLine}`,
                buttonText: "दिन चुनें",
                sectionTitle: "यात्रा अवधि",
                daySingular: "दिन",
                dayPlural: "दिन",
                rows: {
                    day1: { title: "1 दिन", desc: "एक दिवसीय ट्रिप" },
                    day2: { title: "2 दिन", desc: "वीकेंड ट्रिप" },
                    day3: { title: "3 दिन", desc: "लोकप्रिय सुझाव" },
                    day4: { title: "4 दिन", desc: "विस्तृत यात्रा" },
                    day5: { title: "5 दिन", desc: "संपूर्ण ट्रिप योजना" },
                    day7: { title: "7 दिन", desc: "पूर्ण छुट्टियों का अनुभव" },
                    custom: { title: "✏️ अन्य दिन", desc: "1–30 दिन दर्ज करें" },
                    back: { title: "↩ पीछे", desc: "तारीख बदलें" }
                }
            },
            travelers: {
                header: (dest: any, dateLine: any, durationStr: any) => `👥 *कौन यात्रा कर रहा है?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}`,
                buttonText: "यात्री चुनें",
                sectionTitle: "यात्री विवरण",
                travelerSingular: "यात्री",
                travelerPlural: "यात्री",
                rows: {
                    solo: { title: "👤 सोलो · 1", desc: "1 यात्री" },
                    couple: { title: "👫 कपल · 2", desc: "2 यात्री" },
                    family: { title: "👨‍👩‍👧 परिवार · 4", desc: "परिवार / छोटा समूह" },
                    group: { title: "👥 समूह · 5–8", desc: "दोस्त / मध्यम समूह (5–8)" },
                    custom: { title: "✏️ अन्य", desc: "1–50 यात्री दर्ज करें" },
                    back: { title: "↩ पीछे", desc: "अवधि बदलें" }
                }
            },
            groupSize: {
                header: (dest: any, durationStr: any) => `👥 *समूह आकार (5–8 लोग)*\n\n📍 ${dest}\n🗓️ ${durationStr}\n\nसटीक समूह आकार चुनें:`,
                buttonText: "समूह आकार चुनें",
                sectionTitle: "समूह सदस्य",
                peopleLabel: (n: any) => ({ title: `👥 ${n} लोग`, desc: `${n} लोगों का समूह` }),
                back: { title: "↩ पीछे", desc: "यात्री विकल्पों पर वापस" }
            },
            budget: {
                header: (dest: any, dateLine: any, durationStr: any, travelerStr: any) => `💰 *आपका बजट क्या है?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}\n👥 ${travelerStr}`,
                buttonText: "बजट चुनें",
                sectionTitle: "ट्रिप बजट",
                categories: {
                    budget: "💸 बजट",
                    moderate: "⚖️ मध्यम",
                    luxury: "✨ लक्जरी",
                    custom: "💰 बजट"
                },
                rows: {
                    budget: { title: "💸 बजट", desc: "किफायती आवास और स्थानीय भोजन" },
                    moderate: { title: "⚖️ मध्यम", desc: "आरामदायक मध्यम श्रेणी आवास" },
                    luxury: { title: "✨ लक्जरी", desc: "प्रीमियम आवास और उत्तम भोजन" },
                    enterAmount: { title: "💵 राशि दर्ज करें", desc: "कुल ट्रिप बजट दर्ज करें (उदा. ₹25,000)" },
                    back: { title: "↩ पीछे", desc: "यात्री संख्या बदलें" }
                }
            },
            interests: {
                header: (dest: any, dateLine: any, durationStr: any, budgetStr: any) => `🎯 *आपकी क्या रुचियां हैं?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}\n💰 ${budgetStr}`,
                buttonText: "रुचियां चुनें",
                sectionTitle: "क्या देखना है",
                selectedLabel: (count: any) => `*चुने गए (${count}):*`,
                doneTitle: "✅ पूर्ण (आगे बढ़ें)",
                doneDesc: (count: any) => (count > 0 ? `${count} चुने गए · सारांश` : "सारांश पर जाएं"),
                back: { title: "↩ पीछे", desc: "बजट बदलें" }
            },
            pacing: {
                header: (dest: any, dateLine: any, durationStr: any) => `🚶 *आप कैसे यात्रा करना पसंद करते हैं?*\n\n📍 ${dest}${dateLine}\n🗓️ ${durationStr}`,
                choosePacePrompt: "अपनी गति चुनें:",
                buttons: {
                    relaxed: "🧘 शांत",
                    balanced: "🚶 संतुलित",
                    fastPaced: "⚡ तेज"
                }
            },
            editMenu: {
                header: "✏️ आप क्या बदलना चाहते हैं?",
                buttonText: "विवरण चुनें",
                sectionTitle: "संशोधन विवरण",
                rows: {
                    destination: { title: "1. 📍 गंतव्य शहर", desc: "गंतव्य शहर बदलें" },
                    travelDate: { title: "2. 📅 यात्रा तारीख", desc: "यात्रा की तारीख बदलें" },
                    duration: { title: "3. 🗓️ अवधि", desc: "दिनों की संख्या बदलें" },
                    travelers: { title: "4. 👥 यात्री", desc: "यात्रियों की संख्या अपडेट करें" },
                    budget: { title: "5. 💰 बजट", desc: "बजट व राशि अपडेट करें" },
                    interests: { title: "6. 🎯 रुचियां", desc: "पर्यटन प्राथमिकताएं अपडेट करें" },
                    backToSummary: { title: "↩️ सारांश पर वापस", desc: "ट्रिप सारांश पर लौटें" }
                }
            },
            generationError: {
                retryButton: "🔄 पुनः प्रयास करें",
                editButton: "✏️ संशोधित करें",
                homeButton: "🏠 मुख्य मेनू"
            },
            summary: {
                confirmationHeader: "✨ *आपकी ट्रिप का सारांश*",
                upcomingTripHeader: "📅 *आगामी ट्रिप*",
                activeTripHeader: "📋 *सक्रिय ट्रिप*",
                completedTripHeader: "🏁 *पूर्ण ट्रिप*",
                cancelledTripHeader: "❌ *रद्द ट्रिप*",
                planningTripHeader: "📝 *ट्रिप प्लानिंग जारी है*",
                startsInDays: (d: any) => d === 1 ? "⏳ *कल शुरू होगी*" : `⏳ *${d} दिनों में शुरू होगी*`,
                activeDayProgress: (c: any, t: any) => `📍 *दिन ${c} / ${t}*`,
                destinationLabel: "📍 *गंतव्य:*",
                travelDatesLabel: "📅 *यात्रा तारीख:*",
                durationLabel: "🗓️ *अवधि:*",
                travelersLabel: "👥 *यात्री:*",
                budgetLabel: "💰 *बजेट:*",
                interestsLabel: "🎯 *रुचियां:*",
                statusLabel: "स्थिति:",
                statusReady: "योजना तैयार है",
                statusCollecting: "विवरण एकत्र किया जा रहा है",
                statusUpcoming: "आगामी",
                statusActive: "जारी है",
                statusCompleted: "पूर्ण",
                statusCancelled: "रद्द",
                readyPrompt: "क्या आप अपना दैनिक यात्रा कार्यक्रम बनाने के लिए तैयार हैं?",
                notSet: "निर्धारित नहीं",
                famousPlacesDefault: "• 🌟 प्रसिद्ध स्थान"
            },
            mainMenuSections: {
                travelAndTrips: "यात्रा व ट्रिप्स",
                toolsAndSettings: "टूल्स व सेटिंग्स"
            },
            itineraryPagination: {
                nextDay: (day: any) => `अगला: दिन ${day} ➡️`,
                prevDay: (day: any) => `◀️ दिन ${day}`,
                dayOfTotal: (day: any, total: any) => `दिन ${day} / ${total}`,
                navHeader: (day: any, total: any) => `🗺️ *दिन ${day} / ${total} · नेविगेशन*`
            },
            itineraryActivityPlaceholders: {
                arrivalCheckIn: "✈️ _आगमन और चेक-इन_",
                relaxedMorning: "🌿 _आरामदायक सुबह और भ्रमण_",
                departureTransit: "🧳 _प्रस्थान और वापसी_",
                leisureRestBreak: "☕ _विश्राम और चाय-नाश्ता_",
                departureFarewell: "🧳 _ट्रिप समापन और प्रस्थान_",
                freeTimeRelaxation: "🌙 _मुक्त समय और विश्राम_",
                dayNumberHeader: (day: any) => `🗓️ *दिन ${day}*`
            }
        },
        visionUI: {
            downloadError: "⚠️ फ़ोटो डाउनलोड नहीं हो सकी। कृपया दोबारा भेजने का प्रयास करें।",
            oversizedError: "⚠️ फ़ोटो 5MB से बड़ी है। कृपया 5MB से कम आकार की JPEG या PNG फ़ोटो भेजें।",
            unsupportedFormatError: "⚠️ असमर्थित फ़ोटो प्रारूप। कृपया JPEG या PNG फ़ोटो भेजें।",
            imageOnlyLandmark: (name: string) => `📸 *पर्यटन स्थल पहचाना गया:* *${name}*\n\nक्या आप इसके इतिहास, घूमने का सही समय, टिकट या रास्ते की जानकारी चाहते हैं?`,
            imageOnlyDocument: (docType: string, summary: string) => `🎫 *यात्रा दस्तावेज़ पहचाना गया:* *${docType}*\n${summary ? `${summary}\n` : ""}\nक्या आप प्रस्थान/आगमन समय, प्लेटफ़ॉर्म या मार्ग की जानकारी चाहते हैं?`,
            imageOnlyMenu: "🍽️ *मेनू कार्ड पहचाना गया!*\n\nमैं आपको शाकाहारी विकल्प खोजने, कीमतें देखने या व्यंजनों की सलाह देने में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?",
            imageOnlySignboard: (text: string) => `🪧 *साइनबोर्ड पहचाना गया:*\n"${text}"\n\nक्या आप इसका अनुवाद, दिशा-निर्देश या विवरण जानना चाहते हैं?`,
            imageOnlyGeneric: "📸 *फ़ोटो प्राप्त हुई!*\n\nइस फ़ोटो के बारे में आप क्या जानना चाहते हैं? मुझसे पर्यटन स्थल, मार्ग, भोजन या यात्रा टिप्स पूछें।",
            menuAllergenNotice: "⚠️ *नोट:* मेनू का दृश्य विश्लेषण केवल मार्गदर्शन हेतु है। कृपया सामग्री व एलर्जी के लिए रेस्टोरेंट स्टाफ से पुष्टि करें।",
            ticketObservationalNotice: "ℹ️ *नोट:* टिकट का विवरण केवल दृश्य अवलोकन पर आधारित है। लाइव स्थिति के लिए IRCTC या आधिकारिक ऐप देखें।",
            landmarkUnverifiedNotice: "ℹ️ *नोट:* स्थल की पहचान फ़ोटो पर आधारित है। समय और टिकट की पुष्टि स्थानीय स्तर पर करें।",
            degradedServiceError: "⚠️ फ़ोटो विश्लेषण सेवा अस्थायी रूप से अनुपलब्ध है। कृपया थोड़ी देर बाद पुनः प्रयास करें या स्थल का नाम लिखकर पूछें!"
        }
    }
};
export const INTEREST_CATEGORY_DEFINITIONS = [
    {
        id: "beaches_water",
        labels: {
            en: { title: "🏖️ Beaches", desc: "Beaches, promenades & sea views" },
            mr: { title: "🏖️ समुद्रकिनारे", desc: "बीच, खाडी व सागरी दृश्य" },
            hi: { title: "🏖️ समुद्र तट", desc: "बीच, वाटरफ्रंट और तटीय स्थल" }
        }
    },
    {
        id: "history_culture",
        labels: {
            en: { title: "🏛️ Heritage", desc: "Monuments, heritage & forts" },
            mr: { title: "🏛️ इतिहास", desc: "किल्ले, स्मारके व वारसा" },
            hi: { title: "🏛️ इतिहास", desc: "स्मारक, किले और विरासत" }
        }
    },
    {
        id: "food_culinary",
        labels: {
            en: { title: "🍲 Food & Dining", desc: "Street food, local dining & cafes" },
            mr: { title: "🍲 खाद्यसंस्कृती", desc: "स्थानिक खाद्यपदार्थ व रेस्टॉरंट्स" },
            hi: { title: "🍲 खानपान व भोजन", desc: "स्थानीय स्ट्रीट फूड और प्रसिद्ध भोजनालय" }
        }
    },
    {
        id: "nature_outdoors",
        labels: {
            en: { title: "🌿 Nature & Parks", desc: "Parks, scenic views & gardens" },
            mr: { title: "🌿 निसर्ग", desc: "निसर्गरम्य ठिकाणे, उद्याने" },
            hi: { title: "🌿 प्रकृति", desc: "पार्क, हरियाली और प्राकृतिक स्थल" }
        }
    },
    {
        id: "adventure_sports",
        labels: {
            en: { title: "🧗 Adventure", desc: "Trekking, water sports & outdoor" },
            mr: { title: "🧗 साहसी खेळ", desc: "ट्रेकिंग, वॉटर स्पोर्ट्स व साहस" },
            hi: { title: "🧗 रोमांच व खेल", desc: "ट्रेकिंग, वाटर स्पोर्ट्स व साहसिक गतिविधियां" }
        }
    },
    {
        id: "shopping_markets",
        labels: {
            en: { title: "🛍️ Shopping", desc: "Bazaars, handicrafts & souvenirs" },
            mr: { title: "🛍️ खरेदी", desc: "बाजारपेठ, हस्तकला व खरेदी" },
            hi: { title: "🛍️ खरीदारी", desc: "बाजार, हस्तशिल्प और खरीदारी" }
        }
    },
    {
        id: "religious_spiritual",
        labels: {
            en: { title: "🛕 Spiritual", desc: "Famous temples, ashrams & shrines" },
            mr: { title: "🛕 अध्यात्म", desc: "प्रसिद्ध मंदिरे, आश्रम व तीर्थक्षेत्र" },
            hi: { title: "🛕 धार्मिक स्थल", desc: "प्रसिद्ध मंदिर, आश्रम और धार्मिक स्थल" }
        }
    },
    {
        id: "nightlife_entertainment",
        labels: {
            en: { title: "✨ Nightlife", desc: "Evening spots, live music & lounges" },
            mr: { title: "✨ नाईटलाईफ", desc: "संध्याकाळची ठिकाणे, संगीत व कॅफे" },
            hi: { title: "✨ नाइटलाइफ़", desc: "शाम के स्थल, संगीत और कैफे" }
        }
    },
    {
        id: "photography",
        labels: {
            en: { title: "📸 Photography", desc: "Photo spots, viewpoints & architecture" },
            mr: { title: "📸 छायाचित्रण", desc: "फोटो स्पॉट्स, सुंदर दृश्ये" },
            hi: { title: "📸 फोटोग्राफी", desc: "फोटो स्पॉट्स और सुंदर दृश्य" }
        }
    }
];
export const HUMAN_FRIENDLY_INTEREST_LABELS = {
    beaches_coastal: "🏖️ Beaches & Coastal",
    beaches_water: "🏖️ Beaches & Coastal",
    history_culture: "🏛️ History & Culture",
    food_culinary: "🍲 Food & Culinary",
    nature_outdoors: "🌿 Nature & Outdoors",
    adventure_sports: "🧗 Adventure & Sports",
    shopping_markets: "🛍️ Shopping & Markets",
    religious_spiritual: "🛕 Temples & Spiritual",
    nightlife_entertainment: "✨ Nightlife & Cafes",
    photography: "📸 Photography",
    art_museums: "🎨 Art & Museums",
    relaxation_wellness: "💆 Relaxation & Wellness",
    historic: "🏛️ History & Culture",
    nature: "🌿 Nature & Outdoors",
    food: "🍲 Food & Culinary",
    beach: "🏖️ Beaches & Coastal",
    beaches: "🏖️ Beaches & Coastal",
    shopping: "🛍️ Shopping & Markets",
    adventure: "🧗 Adventure & Sports",
    religious: "🛕 Temples & Spiritual",
    spiritual: "🛕 Temples & Spiritual",
    culture: "🏛️ History & Culture",
    photo: "📸 Photography",
    photos: "📸 Photography"
};
