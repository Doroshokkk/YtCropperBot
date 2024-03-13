export function timeStringToSeconds(timeString: string): number {
    if (timeString.includes(":")) {
        const parts = timeString.split(":");
        if (parts.length !== 2) {
            throw new Error("Invalid time format. Please provide time in MM:SS or M:SS format.");
        }

        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);

        if (isNaN(minutes) || isNaN(seconds)) {
            throw new Error("Invalid time format. Please provide time in MM:SS or M:SS format.");
        }

        return minutes * 60 + seconds;
    } else {
        const secondsInput = parseInt(timeString, 10);
        if (isNaN(secondsInput)) {
            throw new Error("Invalid input. Please provide time in MM:SS or M:SS format, or just a number of seconds.");
        }
        return secondsInput;
    }
}
