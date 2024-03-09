import * as express from "express";
import * as bodyParser from "body-parser";
import { Context, Telegraf } from "telegraf";
import axios from "axios";

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;
const { TOKEN, SERVER_URL } = process.env;
console.log("token, server", TOKEN, SERVER_URL);
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/webhook/${TOKEN}`;
const WEBHOOK_URL = SERVER_URL + URI;

const bot = new Telegraf(TOKEN);

app.use(bodyParser.json());

const init = async () => {
  const webhook = await axios.get(
    `${TELEGRAM_API}/setwebhook?url=${WEBHOOK_URL}`
  );
  console.log(webhook.data);
};

// bot.hears(/.*youtube\.com.*|.*youtu\.be.*/, (ctx) => {
//   const chatId = ctx.message.chat.id;
//   ctx.reply("Please provide the start timecode (in seconds):");

//   // Save user-specific data in the userSessions map
//   userSessions.set(chatId, {
//     videoUrl: ctx.message.text,
//     startSecond: 0,
//     endSecond: 0,
//   });

//   // Set the state to expect the start timecode
//   userSessions.get(chatId).state = "start";
// });

type UserSession = {
  videoUrl: string;
  startSecond: number | string;
  endSecond: number | string;
  state: "start" | "end" | undefined;
};

const userSessions = new Map<number, UserSession>();

bot.hears(/.*youtube\.com.*|.*youtu\.be.*/, (ctx) => {
  const chatId = ctx.message.chat.id;
  // Create an inline keyboard with two buttons: Full and Crop
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Full", callback_data: "full" }],
        [{ text: "Crop", callback_data: "crop" }],
      ],
    },
  };

  userSessions.set(chatId, {
    videoUrl: ctx.message.text,
    startSecond: 0,
    endSecond: 0,
    state: undefined,
  });

  // Set the state to expect the start timecode
  userSessions.get(chatId).state = "start";

  ctx.reply("Choose an option:", keyboard);
});

bot.action("full", async (ctx) => {
  // Implement the logic to download the full audio
  const chatId = ctx.update.callback_query.message.chat.id;
  const videoUrl = userSessions.get(chatId)?.videoUrl;

  // Call your API or method to download the full audio here
  // ...

  // For demonstration, let's assume you have a method to get full audio and send it back
  const apiUrl = `http://localhost:3003/audio/crop-audio?videoUrl=${encodeURIComponent(
    videoUrl
  )}`;

  ctx.reply("Loading..." + apiUrl);
  try {
    const response = await axios.get(apiUrl, {
      responseType: "arraybuffer",
    });

    console.log("data after success", response.headers);
    ctx.replyWithAudio(
      {
        source: Buffer.from(response.data),
        filename: response.headers["x-song-name"],
      },
      {
        title: response.headers["x-song-name"],
        duration: response.headers["x-audio-duration"],
        caption: "@ytAudioCropBot",
      }
    );
  } catch (error) {
    console.error("Error calling API:", error.message);
    ctx.reply("Error calling the API. Please try again later.");
  }

  // ctx.replyWithAudio({
  //   source: Buffer.from(fullAudioBuffer),
  //   filename: "full_audio.mp3",
  // });
});

bot.action("crop", (ctx) => {
  const chatId = ctx.update.callback_query.message.chat.id;
  const videoUrl = userSessions.get(chatId)?.videoUrl;

  const keyboard = {
    reply_markup: {
      keyboard: [[{ text: "Start" }]],
      one_time_keyboard: false, // Hide the keyboard after a button is pressed
    },
  };

  ctx.reply("Enter start time: ", keyboard);
});

bot.hears("Start", (ctx) => {
  const chatId = ctx.message.chat.id;
  const userSession = userSessions.get(chatId);

  if (!userSession || userSession.state !== "start") {
    ctx.reply("Invalid session. Please start again.");
    return;
  }
  userSession.startSecond = "start";

  userSession.state = "end";

  const keyboard = {
    reply_markup: {
      keyboard: [[{ text: "End" }]],
      one_time_keyboard: true, // Hide the keyboard after a button is pressed
    },
  };

  ctx.reply("Enter end time: ", keyboard);
});

bot.hears("End", async (ctx) => {
  const chatId = ctx.message.chat.id;
  const userSession = userSessions.get(chatId);

  if (!userSession || userSession.state !== "end") {
    ctx.reply("Invalid session. Please start again.");
    return;
  }

  userSession.endSecond = "end";

  const { videoUrl, startSecond, endSecond } = userSession;
  const apiUrl = `http://localhost:3003/audio/crop-audio?videoUrl=${encodeURIComponent(
    videoUrl
  )}&startSecond=${startSecond}&endSecond=${endSecond}`;

  ctx.reply("Loading...");
  try {
    const response = await axios.get(apiUrl, {
      responseType: "arraybuffer",
    });

    console.log("data", response.headers);
    ctx.replyWithAudio(
      {
        source: Buffer.from(response.data),
        filename: response.headers["x-song-name"],
      },
      {
        title: response.headers["x-song-name"],
        duration: response.headers["x-audio-duration"],
        caption: "@ytAudioCropBot",
      }
    );
  } catch (error) {
    console.error("Error calling API:", error.message);
    ctx.reply("Error calling the API. Please try again later.");
  }

  // Clear user data
  userSessions.delete(chatId);
});

bot.hears(/\d+/, async (ctx) => {
  const chatId = ctx.message.chat.id;
  const userSession = userSessions.get(chatId);

  if (!userSession) {
    ctx.reply("Invalid session. Please start again.");
    return;
  }

  if (userSession.state === "start") {
    try {
      userSession.startSecond = parseFloat(ctx.message.text);
    } catch (e) {
      ctx.reply("enter a number maaaan");
    }
    const keyboard = {
      reply_markup: {
        keyboard: [[{ text: "End" }]],
        one_time_keyboard: true, // Hide the keyboard after a button is pressed
      },
    };
    ctx.reply("Please provide the end timecode (in seconds):", keyboard);
    userSession.state = "end";
  } else if (userSession.state === "end") {
    try {
      userSession.endSecond = parseFloat(ctx.message.text);
    } catch (error) {
      ctx.reply("Enter a number pls man");
    }

    // Call your API to crop audio here
    const { videoUrl, startSecond, endSecond } = userSession;
    const apiUrl = `http://localhost:3003/audio/crop-audio?videoUrl=${encodeURIComponent(
      videoUrl
    )}&startSecond=${startSecond}&endSecond=${endSecond}`;

    ctx.reply("Loading...");
    try {
      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
      });

      console.log("data", response.headers);
      console.log("data", response.headers["x-song-name"]);

      ctx.replyWithAudio(
        {
          source: Buffer.from(response.data),
          filename: response.headers["x-song-name"],
        },
        {
          title: response.headers["x-song-name"],
          duration: response.headers["x-audio-duration"],
          caption: "@ytAudioCropBot",
        }
      );
    } catch (error) {
      console.error("Error calling API:", error.message);
      ctx.reply("Error calling the API. Please try again later.");
    }

    // Clear user data
    userSessions.delete(chatId);
  }
});

bot.hears(/.*/, (ctx) => {
  const chatId = ctx.message.chat.id;
  const userSession = userSessions.get(chatId);
  if (userSession && userSession.state) {
    if (userSession.state === "start") {
      ctx.reply("Enter a starting seconds number pls man");
      return;
    }

    if (userSession.state === "end") {
      ctx.reply("Enter ending seconds number pls man");
      return;
    }
    //cancel behaviour
  }

  console.log(ctx.message?.chat);
  ctx.reply("Hello");
});

bot.launch();

app.listen(port, async () => {
  console.log(`running on port ${port}`);
  await init();
});
