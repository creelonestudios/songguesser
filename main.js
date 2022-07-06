import { Client, WebhookClient } from "discord.js";
import config from "./config.json" assert {type: "json"};
import { load, register } from "./commands.js"
import statusmgr from "./statusmgr.js"
import LyricsMan from "./lyrics.js"
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import points from "./points.js";
import { db, createTables } from "./sql.js";

export let webhook = null;
if(config.webhook) {
	webhook = new WebhookClient({ url: config.webhook });
	
	process.on("uncaughtException", (err, origin) => {
		logger.error(`Uncaught exception: ${err}`)
		webhook.send({
			username: "SongGuesser Error",
			embeds: [{
				title: "Uncaught exception",
				description: "```" + err + "```",
				color: [255, 0, 0],
				timestamp: new Date()
			}]
		});
	})
	
	process.on("unhandledRejection", (reason, listener) => {
		logger.error(`Unhandled rejection: ${reason}`)
		webhook.send({
			username: "SongGuesser Error",
			embeds: [{
				title: "Unhandled rejection",
				description: "```" + reason + "```",
				color: [255, 0, 0],
				timestamp: new Date()
			}]
		});
	})
}

const logger = new Logger("Discord Bot", "38;2;255;0;255;3")
export const bot = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });

bot.on("ready", async () => {
	logger.log(`Logged in as ${bot.user.tag}!`);

	statusmgr()
	new LyricsMan(bot)

	await load(bot);
	register(bot);


	logger.log("Ready!")

	/*bot.users.fetch("418109742183874560").then(u => {
		console.log(u)
		u.send("hi")
	})*/
})

bot.on("messageCreate", (msg) => {
	// TODO: handle guesses
	logger.log(msg.author.tag, msg.content)
	if(msg.author.id == bot.user.id) return
	if(msg.partial) return msg.fetch().then(handleMessage)
	else handleMessage(msg)
})

function handleMessage(msg) {
	if(!msg.guild) {
		msg.channel.send(`I can't help you with that. I'm just a bot. Maybe ask a human.

I can only recommend <@318394797822050315> and <@418109742183874560>.
Also try talking to people in discord.gg/Uf8nbhh`)
	return
	}
}

bot.login(config.token);
