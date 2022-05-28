import { bot } from "./main.js"

const activities = [{
	name: "songs with %u users", type: "LISTENING"
}, {
	name: "songs in %g guilds", type: "LISTENING"
}, {
	name: "songs for %u users", type: "PLAYING"
}, {
	name: "songs in %g guilds", type: "PLAYING"
}, {
	name: "songs for %u users", type: "STREAMING"
}, {
	name: "songs in %g guilds", type: "STREAMING"
}, {
	name: "/-commands", type: "LISTENING"
}, {
	name: "getting coded!", type: "PLAYING"
}, {
	name: "song guessing", type: "PLAYING"
}, {
	name: "%s songs", type: "PLAYING"
}, {
	name: "to %s songs", type: "PLAYING"
}, {
	name: "for guesses", type: "WATCHING"
}]

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
