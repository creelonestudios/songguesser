import { Client } from "discord.js";
import config from "./config.json" assert {type: "json"};
import { load, register } from "./commands.js"

export const bot = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "DIRECT_MESSAGES"], partials: ["MESSAGE","CHANNEL"] });

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

	/*bot.users.fetch("418109742183874560").then(u => {
		console.log(u)
		u.send("hi")
	})*/
})

bot.on("messageCreate", (msg) => {
  // TODO: handle guesses
	console.log(msg.author.tag, msg.content)
	if(msg.author.id == bot.user.id) return
	if(msg.partial) return msg.fetch().then(handleMessage)
	else handleMessage(msg)
})

function handleMessage(msg) {
	if(!msg.guild) {
		msg.channel.send(`I can't help you with that. I'm just a bot. Maybe ask a human.

I can only recommend @Certified Financial Planner and @j0code.
Also try talking to people in discord.gg/Uf8nbhh`)
	return
	}
}

bot.login(config.token);
