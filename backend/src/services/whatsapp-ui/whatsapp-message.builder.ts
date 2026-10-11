import { META_WHATSAPP_CONSTRAINTS } from "./whatsapp-ui.types.js";

export interface BuildButtonOptions {
    to: string;
    bodyText: string;
    buttons: Array<{
        id: string;
        title: string;
    }>;
    headerText?: string;
    footerText?: string;
}

export interface BuildListOptions {
    to: string;
    bodyText: string;
    buttonText: string;
    sections: Array<{
        title?: string;
        rows: Array<{
            id: string;
            title: string;
            description?: string;
        }>;
    }>;
    headerText?: string;
    footerText?: string;
}

export class PayloadConstraintError extends Error {
    constructor(message: string) {
        super(`PayloadConstraintError: ${message}`);
        this.name = "PayloadConstraintError";
    }
}
export class WhatsAppMessageBuilder {
    /**
     * Builds and validates an Interactive Reply Buttons payload.
     */
    static buildButtonMessage(options: BuildButtonOptions) {
        const { to, bodyText, buttons, headerText, footerText } = options;
        if (!to || !to.trim()) {
            throw new PayloadConstraintError("Recipient phone number is required");
        }
        if (!bodyText || !bodyText.trim()) {
            throw new PayloadConstraintError("Interactive message body text cannot be empty");
        }
        if (bodyText.length > META_WHATSAPP_CONSTRAINTS.MAX_INTERACTIVE_BODY_LENGTH) {
            throw new PayloadConstraintError(`Body text exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_INTERACTIVE_BODY_LENGTH} characters (${bodyText.length} chars)`);
        }
        if (!Array.isArray(buttons) || buttons.length === 0) {
            throw new PayloadConstraintError("At least 1 button is required");
        }
        if (buttons.length > META_WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS) {
            throw new PayloadConstraintError(`Cannot specify more than ${META_WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS} buttons (${buttons.length} provided)`);
        }
        const validatedButtons = buttons.map((btn, index) => {
            if (!btn.id || !btn.id.trim()) {
                throw new PayloadConstraintError(`Button at index ${index} is missing an ID`);
            }
            if (btn.id.length > META_WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTON_ID_LENGTH) {
                throw new PayloadConstraintError(`Button ID at index ${index} exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTON_ID_LENGTH} chars`);
            }
            if (!btn.title || !btn.title.trim()) {
                throw new PayloadConstraintError(`Button at index ${index} is missing a title`);
            }
            if (btn.title.trim().length > META_WHATSAPP_CONSTRAINTS.MAX_BUTTON_TITLE_LENGTH) {
                throw new PayloadConstraintError(`Button title at index ${index} exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_BUTTON_TITLE_LENGTH} characters`);
            }
            const trimmedTitle = btn.title.trim();
            return {
                type: "reply",
                reply: {
                    id: btn.id.trim(),
                    title: trimmedTitle
                }
            };
        });
        const payload: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to.replace(/^\+/, "").trim(),
            type: "interactive",
            interactive: {
                type: "button",
                body: { text: bodyText.trim() },
                action: {
                    buttons: validatedButtons
                }
            }
        };
        if (headerText && headerText.trim()) {
            payload.interactive.header = {
                type: "text",
                text: headerText.trim().slice(0, META_WHATSAPP_CONSTRAINTS.MAX_HEADER_TEXT_LENGTH)
            };
        }
        if (footerText && footerText.trim()) {
            payload.interactive.footer = {
                text: footerText.trim().slice(0, META_WHATSAPP_CONSTRAINTS.MAX_FOOTER_TEXT_LENGTH)
            };
        }
        return payload;
    }
    /**
     * Builds and validates an Interactive List Menu payload.
     */
    static buildListMessage(options: BuildListOptions) {
        const { to, bodyText, buttonText, sections, headerText, footerText } = options;
        if (!to || !to.trim()) {
            throw new PayloadConstraintError("Recipient phone number is required");
        }
        if (!bodyText || !bodyText.trim()) {
            throw new PayloadConstraintError("Interactive message body text cannot be empty");
        }
        if (bodyText.length > META_WHATSAPP_CONSTRAINTS.MAX_INTERACTIVE_BODY_LENGTH) {
            throw new PayloadConstraintError(`Body text exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_INTERACTIVE_BODY_LENGTH} characters (${bodyText.length} chars)`);
        }
        if (!buttonText || !buttonText.trim()) {
            throw new PayloadConstraintError("List trigger button text cannot be empty");
        }
        if (buttonText.trim().length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_BUTTON_TITLE_LENGTH) {
            throw new PayloadConstraintError(`List trigger button text exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_LIST_BUTTON_TITLE_LENGTH} characters`);
        }
        const trimmedButtonText = buttonText.trim();
        if (!Array.isArray(sections) || sections.length === 0) {
            throw new PayloadConstraintError("List message must have at least 1 section");
        }
        let totalRows = 0;
        const validatedSections = sections.map((sec, secIdx) => {
            if (!Array.isArray(sec.rows) || sec.rows.length === 0) {
                throw new PayloadConstraintError(`Section at index ${secIdx} must have at least 1 row`);
            }
            totalRows += sec.rows.length;
            const validatedRows = sec.rows.map((row, rowIdx) => {
                if (!row.id || !row.id.trim()) {
                    throw new PayloadConstraintError(`Row at section ${secIdx}, index ${rowIdx} is missing an ID`);
                }
                if (row.id.length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_ID_LENGTH) {
                    throw new PayloadConstraintError(`Row ID at section ${secIdx}, index ${rowIdx} exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_ID_LENGTH} chars`);
                }
                if (!row.title || !row.title.trim()) {
                    throw new PayloadConstraintError(`Row at section ${secIdx}, index ${rowIdx} is missing a title`);
                }
                if (row.title.trim().length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_TITLE_LENGTH) {
                    throw new PayloadConstraintError(`Row title at section ${secIdx}, index ${rowIdx} exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_TITLE_LENGTH} characters`);
                }
                if (row.description &&
                    row.description.trim().length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_DESCRIPTION_LENGTH) {
                    throw new PayloadConstraintError(`Row description at section ${secIdx}, index ${rowIdx} exceeds ${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_DESCRIPTION_LENGTH} characters`);
                }
                const trimmedTitle = row.title.trim();
                const trimmedDesc = row.description ? row.description.trim() : undefined;
                return {
                    id: row.id.trim(),
                    title: trimmedTitle,
                    ...(trimmedDesc ? { description: trimmedDesc } : {})
                };
            });
            return {
                ...(sec.title
                    ? { title: sec.title.trim().slice(0, META_WHATSAPP_CONSTRAINTS.MAX_LIST_SECTION_TITLE_LENGTH) }
                    : {}),
                rows: validatedRows
            };
        });
        if (totalRows > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROWS) {
            throw new PayloadConstraintError(`Total rows across all sections exceeds maximum of ${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROWS} (${totalRows} provided)`);
        }
        const payload: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to.replace(/^\+/, "").trim(),
            type: "interactive",
            interactive: {
                type: "list",
                body: { text: bodyText.trim() },
                action: {
                    button: trimmedButtonText,
                    sections: validatedSections
                }
            }
        };
        if (headerText && headerText.trim()) {
            payload.interactive.header = {
                type: "text",
                text: headerText.trim().slice(0, META_WHATSAPP_CONSTRAINTS.MAX_HEADER_TEXT_LENGTH)
            };
        }
        if (footerText && footerText.trim()) {
            payload.interactive.footer = {
                text: footerText.trim().slice(0, META_WHATSAPP_CONSTRAINTS.MAX_FOOTER_TEXT_LENGTH)
            };
        }
        return payload;
    }
}
