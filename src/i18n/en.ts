export const en = {
    welcome: "Hey, welcome! This bot can crop songs and stuff, later there will be an instruction but I'm lazy for now to write it ¯\\_(ツ)_/¯",
    botDown: "Bot must be down currently =( \n Please stick around and try in some time!",
    chooseLanguage: "Choose your language / Оберіть мову:",
    languageSet: "Language updated!",
    downloadLimit: "Sorry, but you have downloaded 10 songs in the last hour. It's a bit too much for my servers, so you have to chill a bit. Try again in some time =)",
    donatePrompt: "You can donate stars to get more downloads, or wait for the limit to reset. 1 star = 1 download",
    existingSession: "Mate, choose what to do with the last song first please",
    chooseOption: "Choose an option:",
    apiError: "Error calling the API. Please try again later.",
    sessionExpired: "Session expired. Please send the link again.",
    chooseFull: "Choose an option: Full audio",
    queueSent: "Your request was sent to the queue, please wait...",
    chooseCrop: "Choose an option: Crop audio",
    chooseSilence: "Choose an option: Volume adjustment",
    enterStartTime: "Enter start time (in plain seconds or MM:SS format):",
    invalidSession: "Invalid session. Please start again.",
    enterEndTime: "Enter end time:",
    volumeAdjustPrompt:
        "Enter all volume adjustments in one message (up to 10 adjustments).\n" +
        "Format: start-end=percentage%\n" +
        "Example: 36-48=40%, 90-102=40%, 127-156=120%\n\n" +
        "After entering the adjustments, press 'Done' to finish.",
    enterTimeFormat: "Please enter the number or a timecode in MM:SS or M:SS format, or just a number of seconds.",
    enterStartPrompt: "Enter starting time you want to crop from or press cancel",
    enterEndPrompt: "Enter ending time you want to crop to or press cancel",
    clickButtonOrCancel: "Please click a button or press cancel",
    hello: "Hello",
    cancelledCropping: "Sure, cancelled the cropping",
    cancelledCrop: "Sure, cancelled this crop",
    volumeNoAdjustments:
        "You haven't specified any volume adjustments yet.\n\n" +
        "Please enter all adjustments (up to 10) in one message:\n" +
        "Example: 1:28-2:15=40%, 4:30-5:10=120%",
    tooManyAdjustments: "Too many adjustments! Please enter a maximum of 10 adjustments in one message.",
    volumeSaved: "Volume adjustments saved. Press 'Done' to process your request.",
    invalidTimeRange: "Invalid time range: start time must be less than end time for each adjustment.",
    invalidVolumePercent: "Invalid volume percentage! Volume must be between 0% and 5000%.",
    invalidAdjustmentFormat:
        "Please enter adjustments in the correct format:\n" +
        "Example: 1:28-2:15=40%, 4:30-5:10=120%\n" +
        "Each adjustment should be in the format: start-end=percentage%\n" +
        "Time can be in M:SS format (e.g., 1:28) or seconds (e.g., 88)",
    starsUsed: "⭐ Used {consumed} star(s). You have {left} stars left.",
    donateMenu: "You have {stars} stars. Choose how many to buy:",
    paymentSuccess: "🎉 Payment successful! You've received {paid} stars. You now have {left} stars.",
    donationError: "An error occurred while processing your donation. Please try again later.",
    invoiceTitle: "Donate stars",
    invoiceDescription: "You can donate stars to get more downloads, or wait for the limit to reset. 1 star = 1 download",
    notReadingEssay: "Not reading this essay",
    messageLimitExceeded: "You have exceeded the message limit. Please try again in a minute.",
    "btn.start": "Start",
    "btn.end": "End",
    "btn.cancel": "Cancel",
    "btn.done": "Done",
    "btn.full": "Full",
    "btn.crop": "Crop",
    "btn.silence": "Silence",
    "menu.language": "Language selection",
    "menu.advertisement": "Buy an advertisement",
    "menu.whatever": "Whatever",
    "menu.donate": "Donate",
    "lang.en": "English",
    "lang.uk": "Ukrainian",
    "error.invalidTimeFormat": "Invalid time format. Please provide time in MM:SS or M:SS format.",
    "error.invalidSecondsInput": "Invalid input. Please provide time in MM:SS or M:SS format, or just a number of seconds.",
};
