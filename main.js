import { Client } from "discord.js";
import config from "./config.json" assert {type: "json"};
import { load, register } from "./commands.js"

export const bot = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"]});

bot.on("ready", async () => {
  console.log(`Logged in as ${bot.user.tag}!`);

  bot.user.setPresence({
    status: "online",
    activity: {
      name: "Songs",
      type: "PLAYING"
    }
  });

  await load(bot);
  register(bot);
})

bot.on("messageCreate", (msg) => {
  // TODO: handle guesses
})

bot.login(config.token);