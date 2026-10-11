/**
 * WhatsAppTextFormatter
 *
 * Centralized, deterministic formatter for converting standard Markdown, LLM outputs,
 * and presenter strings into 100% compliant, native WhatsApp Cloud API text formatting.
 *
 * Invariants:
 * 1. Bold text: Converts markdown `**text**` and headings `### text` into single-asterisk `*text*`
 *    which WhatsApp Cloud API renders natively as bold text without displaying asterisks.
 * 2. Headings: Strips nested markdown bold inside headings (e.g. `### 🏛️ **Title**` -> `*🏛️ Title*`).
 * 3. Bullet points: Converts line-starting `* `, `- `, `+ ` into `• ` to prevent asterisk collisions.
 * 4. Boundaries: Ensures proper whitespace before opening `*` and after closing `*` so WhatsApp clients bold them.
 * 5. Whitespace inside asterisks: Safely normalizes `* text *` to `*text*` without matching across distinct bold spans.
 * 6. Mathematical asterisks: Converts math `5 * 10` to `5 × 10` so multiplication does not hijack bold formatting.
 * 7. Horizontal rules: Removes markdown `---`, `***`, `___` to eliminate stray asterisks.
 * 8. Unmatched asterisks: Resolves odd/unmatched asterisks per line (e.g. unclosed headings, stray asterisks, footnote bullets).
 * 9. Links: Converts markdown links `[label](https://...)` into clean WhatsApp URLs `label: https://...`.
 * 10. Preserves intentional WhatsApp formatting: italics `_text_`, bold `*text*`, inline code, emojis, and multilingual text.
 */
export class WhatsAppTextFormatter {
    static format(rawText: string | null | undefined): string {
        if (!rawText) return "";

        let text = String(rawText);

        // 1. Remove Markdown horizontal rules (`---`, `***`, `___`, `- - -`, `* * *`)
        text = text.replace(/^[ \t]*[-*_](?:[ \t]*[-*_]){2,}[ \t]*$/gm, "");

        // 2. Convert Markdown links `[Label](URL)` into native WhatsApp clickable URLs
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
            const cleanLabel = label.trim();
            const cleanUrl = url.trim();
            if (cleanLabel.toLowerCase() === cleanUrl.toLowerCase() || cleanLabel.startsWith("http")) {
                return cleanUrl;
            }
            return `${cleanLabel}: ${cleanUrl}`;
        });

        // 3. Convert Markdown Headings (`# Heading`, `## Heading`, `### Heading`)
        // Strip any existing Markdown bold asterisks inside the heading, then wrap cleanly in *...*
        text = text.replace(/^(#{1,6})[ \t]+(.*)$/gm, (_match, _hashes, content) => {
            let clean = content.trim();
            // Remove markdown bold/italic asterisks from heading text to prevent nesting like *### **Title***
            clean = clean.replace(/\*{1,3}([^\n*]+?)\*{1,3}/g, "$1").trim();
            clean = clean.replace(/^[*_]+|[*_]+$/g, "").trim();
            if (!clean) return "";
            return `*${clean}*`;
        });

        // 4. Convert bullet points: line-starting `* `, `- `, `+ ` into `• `
        // This is done BEFORE asterisk formatting so bullet asterisks don't collide with bold asterisks!
        text = text.replace(/^([ \t]*)[*\-+]\s+/gm, "$1• ");

        // 5. Convert Markdown bold-italic `***text***` or `**_text_**` or `_**text**_` into `*_text_*`
        text = text.replace(/\*\*\*([^\n*]+?)\*\*\*/g, (_match, content) => {
            const trimmed = content.trim();
            return trimmed ? `*_${trimmed}_*` : "";
        });
        text = text.replace(/\*\*\_([^\n*_]+?)\_\*\*/g, (_match, content) => {
            const trimmed = content.trim();
            return trimmed ? `*_${trimmed}_*` : "";
        });
        text = text.replace(/_\*\*([^\n*_]+?)\*\*_/g, (_match, content) => {
            const trimmed = content.trim();
            return trimmed ? `*_${trimmed}_*` : "";
        });

        // 6. Convert Markdown double asterisks `**text**` into single asterisks `*text*`
        text = text.replace(/\*\*([^\n*]+?)\*\*/g, (_match, content) => {
            const trimmed = content.trim();
            return trimmed ? `*${trimmed}*` : "";
        });

        // 7. Ensure proper boundaries for bold spans in WhatsApp:
        // WhatsApp requires whitespace/boundary before opening `*` and after closing `*`.
        // e.g. "of*Auroville*" -> "of *Auroville*"
        text = text.replace(/([a-zA-Z0-9\u0900-\u097F])\*([^\s*][^\n*]*?[^\s*]|\S)\*/g, "$1 *$2*");

        // e.g. "*Architecture:*The" -> "*Architecture:* The"
        text = text.replace(/\*([^\s*][^\n*]*?[^\s*]|\S)\*([a-zA-Z0-9\u0900-\u097F])/g, "*$1* $2");

        // 8. Trim internal whitespace inside single asterisks `* bold *` -> `*bold*`
        // Scoped to single valid bold spans with standard lookbehind/lookahead boundaries
        text = text.replace(/(?<=^|[\s([{"'‘“])\*[ \t]+([^\s\n*](?:[^\n*]*?[^\s\n*])?)[ \t]+\*(?=[\s.,!?:;)\]}"'’”-]|$)/g, "*$1*");
        text = text.replace(/(?<=^|[\s([{"'‘“])\*[ \t]+([^\s\n*](?:[^\n*]*?[^\s\n*])?)\*(?=[\s.,!?:;)\]}"'’”-]|$)/g, "*$1*");
        text = text.replace(/(?<=^|[\s([{"'‘“])\*([^\s\n*](?:[^\n*]*?[^\s\n*])?)[ \t]+\*(?=[\s.,!?:;)\]}"'’”-]|$)/g, "*$1*");

        // 9. Protect mathematical/multiplication asterisks between numbers: "5 * 10" -> "5 × 10"
        text = text.replace(/(\d+)[ \t]*\*[ \t]*(\d+)/g, "$1 × $2");

        // 10. Clean up any remaining multiple asterisks (like ****)
        text = text.replace(/\*{3,}/g, "*");

        // 11. Fix unpaired/unmatched asterisks line by line
        text = text
            .split("\n")
            .map((line) => {
                const asteriskCount = (line.match(/\*/g) || []).length;
                if (asteriskCount % 2 === 0) {
                    return line;
                }

                // If odd number of asterisks, there's an unmatched asterisk on this line
                // Case A1: Line starts with a bullet asterisk followed by space: `* Note: ...`
                if (/^\s*\*[ \t]+([^\*]+)$/.test(line)) {
                    return line.replace(/^\s*\*[ \t]+/, "• ");
                }

                // Case A2: Line starts with unclosed bold heading: `*Getting There`
                if (/^\s*\*[^\s\*][^*]*$/.test(line)) {
                    return `${line.trim()}*`;
                }

                // Case B: Line has a lone asterisk with spaces on both sides: ` * `
                if (/\s+\*\s+/.test(line)) {
                    return line.replace(/\s+\*\s+/, " • ");
                }

                // Case C: Unclosed bold like `*Heading without closing asterisk`
                if (/^\s*\*[a-zA-Z0-9\u0900-\u097F].*[^*]$/.test(line)) {
                    return `${line}*`;
                }

                // Case D: A stray asterisk at the very end of the line
                if (/\*$/.test(line) && asteriskCount === 1) {
                    return line.replace(/\*$/, "");
                }

                // Case E: Remove the first unmatched asterisk if all else fails
                return line.replace(/\*/, "");
            })
            .join("\n");

        // 12. Collapse excessive consecutive blank lines (max 2 consecutive newlines)
        text = text.replace(/\n{3,}/g, "\n\n");

        return text.trim();
    }
}
