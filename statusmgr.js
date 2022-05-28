import { bot } from "./main.js"
import activities from "./status.json" assert {type: "json"}

export default function run() {
	setInterval(updatePresence, 11000)
	updatePresence()
	console.log("[StatusMgr] running!")
}

function updatePresence() {
	let random = Math.floor(Math.random() * (activities.length))
	let act = activities[random]
	act.name = act.name.replaceAll("%u", bot.users.cache.size)
	act.name = act.name.replaceAll("%g", bot.guilds.cache.size)
	act.name = act.name.replaceAll("%s", "loads of") // TODO: replace with actual song count

	bot.user.setPresence({
		status: "online",
		activities: [act]
	})
}
