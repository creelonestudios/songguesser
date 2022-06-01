import { bot } from "./main.js"
import activities from "./status.json" assert {type: "json"}
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import { lyrics } from "./lyrics.js"

const logger = new Logger("StatusMgr", COLOR.LIGHT_YELLOW)

export default function run() {
	setInterval(updatePresence, 11000)
	updatePresence()
	logger.log("running!")
}

function updatePresence() {
	let random = 14 //Math.floor(Math.random() * (activities.length))
	let act = activities[random]
	let r = Math.floor(Math.random() * lyrics.length)

	act.name = act.name.replaceAll("%u", bot.users.cache.size)
	act.name = act.name.replaceAll("%g", bot.guilds.cache.size)
	act.name = act.name.replaceAll("%s", lyrics.length)
	act.name = act.name.replaceAll("%t", lyrics[r].title)
	act.name = act.name.replaceAll("%a", lyrics[r].author)

	bot.user.setPresence({
		status: "online",
		activities: [act]
	})
}
