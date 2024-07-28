export const startingKeyboard = {
    reply_markup: {
        keyboard: [[{ text: "Start" }, { text: "Cancel" }]],
        one_time_keyboard: true, // Hide the keyboard after a button is pressed
    },
};

export const endingKeyboard = {
    reply_markup: {
        keyboard: [[{ text: "End" }, { text: "Cancel" }]],
        one_time_keyboard: true, // Hide the keyboard after a button is pressed
    },
};

export const cancelKeyboard = {
    reply_markup: {
        keyboard: [[{ text: "Cancel" }]],
        one_time_keyboard: true, // Hide the keyboard after a button is pressed
    },
};

export const menuKeyboard = {
    reply_markup: {
        keyboard: [[{ text: "Language selection" }, { text: "Buy an advertisement" }, { text: "Whatever" }, { text: "Donate" }]],
        one_time_keyboard: true, // Hide the keyboard after a button is pressed
    },
};

export const inlineCropKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "Full", callback_data: "full" }],
            [{ text: "Crop", callback_data: "crop" }],
            [{ text: "Cancel", callback_data: "cancel" }],
        ],
    },
};
