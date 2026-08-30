import { Lang, t } from "../i18n";

export const inlineLanguageKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: "🇬🇧 English", callback_data: "lang_en" },
                { text: "🇺🇦 Українська", callback_data: "lang_uk" },
            ],
        ],
    },
};

export const startingKeyboard = (lang: Lang) => ({
    reply_markup: {
        keyboard: [[{ text: t(lang, "btn.start") }, { text: t(lang, "btn.cancel") }]],
        one_time_keyboard: true,
    },
});

export const endingKeyboard = (lang: Lang) => ({
    reply_markup: {
        keyboard: [[{ text: t(lang, "btn.end") }, { text: t(lang, "btn.cancel") }]],
        one_time_keyboard: true,
    },
});

export const cancelKeyboard = (lang: Lang) => ({
    reply_markup: {
        keyboard: [[{ text: t(lang, "btn.cancel") }]],
        one_time_keyboard: true,
    },
});

export const menuKeyboard = (lang: Lang) => ({
    reply_markup: {
        keyboard: [[
            { text: t(lang, "menu.language") },
            { text: t(lang, "menu.advertisement") },
            { text: t(lang, "menu.whatever") },
            { text: t(lang, "menu.donate") },
        ]],
        one_time_keyboard: true,
    },
});

export const volumeAdjustmentKeyboard = (lang: Lang) => ({
    reply_markup: {
        keyboard: [[{ text: t(lang, "btn.done") }, { text: t(lang, "btn.cancel") }]],
        one_time_keyboard: true,
    },
});

export const inlineCropKeyboard = (lang: Lang) => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: t(lang, "btn.full"), callback_data: "full" }],
            [{ text: t(lang, "btn.crop"), callback_data: "crop" }],
            [{ text: t(lang, "btn.silence"), callback_data: "silence" }],
            [{ text: t(lang, "btn.cancel"), callback_data: "cancel" }],
        ],
    },
});

export const inlineDonateKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: "1 ⭐", callback_data: "donate_1" },
                { text: "5 ⭐", callback_data: "donate_5" },
            ],
            [
                { text: "10 ⭐", callback_data: "donate_10" },
                { text: "100 ⭐", callback_data: "donate_100" },
            ],
        ],
    },
};
