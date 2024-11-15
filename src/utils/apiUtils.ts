import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();
const { API_URL } = process.env;

export const downloadCroppedSong = async (videoUrl, startSecond, endSecond) => {
    const apiUrl = `${API_URL}/audio/crop-audio?videoUrl=${encodeURIComponent(videoUrl)}&startSecond=${startSecond}&endSecond=${endSecond}`;
    const response = await axios.get(apiUrl);
    return response;
};

export const downloadFullSong = async (videoUrl) => {
    const apiUrl = `${API_URL}/audio/crop-audio?videoUrl=${encodeURIComponent(videoUrl)}`;
    console.log("apiUrl", apiUrl);
    const response = await axios.get(apiUrl);
    return response;
};
