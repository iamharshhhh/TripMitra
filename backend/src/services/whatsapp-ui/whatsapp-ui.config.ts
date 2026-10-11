

export interface BotUIConfig {
    enabled: boolean;
    menuTTLSeconds: number;
    maxButtons: number;
    maxListRows: number;
}
export const botUIConfig = {
    // Can be toggled off via environment or set true by default
    enabled: process.env.WHATSAPP_ENABLE_INTERACTIVE_UI !== "false",
    menuTTLSeconds: 600, // 10 minutes active context window
    maxButtons: 3,
    maxListRows: 10
};
