import { Client } from "discord.js";
import config from "./config.json" assert {type: "json"};
import { load, register } from "./commands.js"
import statusmgr from "./statusmgr.js"
import LyricsMan from "./lyrics.js"
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import points from "./points.js";
import { db, createTables } from "./sql.js";
import fs from "fs/promises"
import { execSync } from "child_process"

const logger = new Logger("Discord Bot", "38;2;255;0;255;3")
export const bot = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });

export const VERSION = await getVersion()
export const BRANCH = getBranch()

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

async function getVersion() {
	let data = await fs.readFile("./package.json", { encoding: "utf-8" })
	try {
		data = JSON.parse(data)
	} catch (e) {
		logger.error("Couldn't get version: " + e)
		return "?"
	}
	return data.version || "?"
}

function getBranch() {
	// get branch name from git
	let branch = "main"
	try {
		branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
	} catch(e) {
		logger.error("Couldn't get branch: " + e);
	}
	return branch
}

export function getFooter() {
	let s = `SongGuesser v${VERSION}`
	if (BRANCH != "main") s += ` (${BRANCH})`
	return { text: s }
}

function handleMessage(msg) {
	if(!msg.guild) {
		msg.channel.send(`I can't help you with that. I'm just a bot. Maybe ask a human.

I can only recommend <@318394797822050315> and <@418109742183874560>.
Also try talking to people in discord.gg/Uf8nbhh`)
	return
	}
}

bot.login(config.token);
