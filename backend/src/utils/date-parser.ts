

export interface DateParseResult {
    success: boolean;
    isoDate?: string;
    formattedDisplay?: string;
    errorReason?: "past_date" | "invalid_format" | "empty_input";
    errorMessage?: string;
}
/**
 * Deterministic travel date parser and formatter for the WhatsApp Travel Wizard.
 * Supports ISO, Indian/UK DD/MM/YYYY, natural English text, and relative keywords.
 */
const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const FULL_MONTHS: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
};
function padZero(n: any) {
    return n < 10 ? `0${n}` : `${n}`;
}
export function toIsoDateString(d: Date) {
    return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}
export function formatDisplayDate(isoDate: string) {
    const parts = isoDate.split("-");
    if (parts.length !== 3)
        return isoDate;
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthStr = MONTH_NAMES[monthIdx] || parts[1];
    return `${day} ${monthStr} ${year}`;
}
export function formatDisplayDateRange(startDateIso: string, durationDays: number) {
    if (!startDateIso || durationDays <= 0)
        return "";
    const endDateIso = deriveEndDate(startDateIso, durationDays);
    const startParts = startDateIso.split("-");
    const endParts = endDateIso.split("-");
    if (startParts.length !== 3 || endParts.length !== 3)
        return `${startDateIso} – ${endDateIso}`;
    const startYear = parseInt(startParts[0], 10);
    const startMonthIdx = parseInt(startParts[1], 10) - 1;
    const startDay = parseInt(startParts[2], 10);
    const endYear = parseInt(endParts[0], 10);
    const endMonthIdx = parseInt(endParts[1], 10) - 1;
    const endDay = parseInt(endParts[2], 10);
    if (startYear === endYear && startMonthIdx === endMonthIdx) {
        if (durationDays === 1) {
            return `${startDay} ${MONTH_NAMES[startMonthIdx]} ${startYear}`;
        }
        return `${startDay}–${endDay} ${MONTH_NAMES[startMonthIdx]} ${startYear}`;
    }
    if (startYear === endYear) {
        return `${startDay} ${MONTH_NAMES[startMonthIdx]} – ${endDay} ${MONTH_NAMES[endMonthIdx]} ${startYear}`;
    }
    return `${startDay} ${MONTH_NAMES[startMonthIdx]} ${startYear} – ${endDay} ${MONTH_NAMES[endMonthIdx]} ${endYear}`;
}
export function addDays(isoDate: string, days: number) {
    const parts = isoDate.split("-").map(p => parseInt(p, 10));
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return `${d.getUTCFullYear()}-${padZero(d.getUTCMonth() + 1)}-${padZero(d.getUTCDate())}`;
}
export function deriveEndDate(startDateIso: string, durationDays: number) {
    if (durationDays <= 1)
        return startDateIso;
    return addDays(startDateIso, durationDays - 1);
}
/**
 * Parses user input or relative keywords into a validated future ISO date string.
 */
export function parseTravelDate(input: string, referenceDate: Date = (process.env.TEST_REFERENCE_DATE ? new Date(process.env.TEST_REFERENCE_DATE) : new Date())) {
    if (!input || !input.trim()) {
        return {
            success: false,
            errorReason: "empty_input",
            errorMessage: "Please enter a travel date (e.g. 15 Oct 2026, Tomorrow, This Weekend)."
        };
    }
    const raw = input.trim().toLowerCase().replace(/^(set_travel_date:|travel_date:)/i, "");
    const now = referenceDate ? new Date(referenceDate) : new Date();
    const todayIso = toIsoDateString(now);
    // 1. Relative keywords
    if (raw === "today") {
        return {
            success: true,
            isoDate: todayIso,
            formattedDisplay: formatDisplayDate(todayIso)
        };
    }
    if (raw === "tomorrow") {
        const tmrwIso = addDays(todayIso, 1);
        return {
            success: true,
            isoDate: tmrwIso,
            formattedDisplay: formatDisplayDate(tmrwIso)
        };
    }
    if (raw === "this_weekend" || raw === "this weekend") {
        // Upcoming Saturday (or today if today is Sat/Sun)
        const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat
        let daysToAdd = 0;
        if (dayOfWeek === 6)
            daysToAdd = 0;
        else if (dayOfWeek === 0)
            daysToAdd = 0;
        else
            daysToAdd = 6 - dayOfWeek;
        const weekendIso = addDays(todayIso, daysToAdd);
        return {
            success: true,
            isoDate: weekendIso,
            formattedDisplay: formatDisplayDate(weekendIso)
        };
    }
    if (raw === "next_weekend" || raw === "next weekend") {
        const dayOfWeek = now.getDay();
        let daysToNextSat = 0;
        if (dayOfWeek === 6)
            daysToNextSat = 7;
        else if (dayOfWeek === 0)
            daysToNextSat = 6;
        else
            daysToNextSat = 6 - dayOfWeek + 7;
        const nextWeekendIso = addDays(todayIso, daysToNextSat);
        return {
            success: true,
            isoDate: nextWeekendIso,
            formattedDisplay: formatDisplayDate(nextWeekendIso)
        };
    }
    // 2. ISO format YYYY-MM-DD
    const isoMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (isoMatch) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10);
        const d = parseInt(isoMatch[3], 10);
        return validateAndBuildDate(y, m, d, todayIso);
    }
    // 3. Indian / UK format DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        return validateAndBuildDate(y, m, d, todayIso);
    }
    // 4. Short DD/MM (inferred year)
    const dmMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})$/);
    if (dmMatch) {
        const d = parseInt(dmMatch[1], 10);
        const m = parseInt(dmMatch[2], 10);
        const curYear = now.getFullYear();
        const result = validateAndBuildDate(curYear, m, d, todayIso);
        if (result.success)
            return result;
        // Rollover to next year if in the past
        if (result.errorReason === "past_date") {
            return validateAndBuildDate(curYear + 1, m, d, todayIso);
        }
        return result;
    }
    // 5. English textual dates: "15 Oct 2026", "15th October 2026", "October 15 2026", "15 Oct"
    const cleanEnglish = raw
        .replace(/(st|nd|rd|th)/g, "")
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    // Pattern A: "15 Oct 2026" or "15 Oct"
    const textMatchA = cleanEnglish.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
    if (textMatchA) {
        const d = parseInt(textMatchA[1], 10);
        const monthStr = textMatchA[2];
        const yStr = textMatchA[3];
        if (FULL_MONTHS[monthStr] !== undefined) {
            const m = FULL_MONTHS[monthStr] + 1;
            const y = yStr ? parseInt(yStr, 10) : now.getFullYear();
            const result = validateAndBuildDate(y, m, d, todayIso);
            if (!yStr && result.errorReason === "past_date") {
                return validateAndBuildDate(y + 1, m, d, todayIso);
            }
            return result;
        }
    }
    // Pattern B: "Oct 15 2026" or "Oct 15"
    const textMatchB = cleanEnglish.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/);
    if (textMatchB) {
        const monthStr = textMatchB[1];
        const d = parseInt(textMatchB[2], 10);
        const yStr = textMatchB[3];
        if (FULL_MONTHS[monthStr] !== undefined) {
            const m = FULL_MONTHS[monthStr] + 1;
            const y = yStr ? parseInt(yStr, 10) : now.getFullYear();
            const result = validateAndBuildDate(y, m, d, todayIso);
            if (!yStr && result.errorReason === "past_date") {
                return validateAndBuildDate(y + 1, m, d, todayIso);
            }
            return result;
        }
    }
    return {
        success: false,
        errorReason: "invalid_format",
        errorMessage: "Could not understand that date. Please try a format like: 15 Oct 2026, Tomorrow, or DD/MM/YYYY."
    };
}
function validateAndBuildDate(y: any, m: any, d: any, todayIso: any) {
    if (m < 1 || m > 12 || d < 1 || d > 31) {
        return {
            success: false,
            errorReason: "invalid_format",
            errorMessage: "Invalid day or month. Please check the date."
        };
    }
    // Check valid day for month
    const testDate = new Date(Date.UTC(y, m - 1, d));
    if (testDate.getUTCFullYear() !== y || testDate.getUTCMonth() !== m - 1 || testDate.getUTCDate() !== d) {
        return {
            success: false,
            errorReason: "invalid_format",
            errorMessage: "Invalid calendar date. Please check the day and month."
        };
    }
    const iso = `${y}-${padZero(m)}-${padZero(d)}`;
    if (iso < todayIso) {
        return {
            success: false,
            errorReason: "past_date",
            errorMessage: `Date (${formatDisplayDate(iso)}) is in the past. Please enter a future travel date.`
        };
    }
    return {
        success: true,
        isoDate: iso,
        formattedDisplay: formatDisplayDate(iso)
    };
}
