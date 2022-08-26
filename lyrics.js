import fs from "fs/promises"
import ytdl from "ytdl-core"
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import Game from "./game.js"
import config from "./config.json" assert {type: "json"}

const lyricslib = await import(config.lyrics + "main.mjs")

const logger = new Logger("Lyrics", COLOR.LIGHT_BLUE)

let _lyrics
try {
	_lyrics = await lyricslib.load({path: config.lyrics + "/lyrics"})
} catch(e) {
	logger.error(`load songs:`, e)
	_lyrics = []
}
export const lyrics = _lyrics

export const games  = {}

let bot

export default class LyricsMan {

	constructor(_bot) {
		bot = _bot

		bot.on("messageCreate", msg => {
			if(msg.author.bot) return
			let c = msg.channel
			for(let id in games) {
				let g = games[id]
				if(g.state == Game.RUNNING && g.channel.id == c.id) {
					g.guess(msg)
					break // there can only be one game be in each channel anyways
				}
			}
		})

		bot.on("interactionCreate", i => {
			if(i.type != "MESSAGE_COMPONENT") return
			if(!i.isButton()) return
			if(!["join_game","quickstart_game","cancel_game"].includes(i.customId)) return

			let game = games[i.channel.id]
			if(!game || game.state != Game.STARTING) {
				i.reply({ embeds: [{
					title: "**No game running!**",
					description: "There is no game running in this channel",
					color: [230, 0, 0],
					ephemeral: true
				}]})
				return
			}

			if(i.customId == "join_game") {
				if(game.participants[i.user.id]) {
					i.reply({ content: "You have already joined. The game will start soon.", ephemeral: true })
				} else {
					game.addParticipant(i.user)
					i.reply({ content: ":white_check_mark: You joined the game!", ephemeral: true })
				}
			} else if(i.customId == "quickstart_game") {
				if(game.participantCount < (config.minParticipants || 2)) {
					i.reply({ content: `Can't start the game.\nThere must be at least ${config.minParticipants || 2} participants.`, ephemeral: true })
				}
				else game.quickstart(i)
			} else if(i.customId == "cancel_game") {
				game.stop("cancelled", i)
			}
		})

		setInterval(() => {
			for(let id in games) {
				let g = games[id]
				if(g.state == Game.RUNNING) {
					g.sendLyrics()
				}
			}
		}, 100)

	}

}

// fetch song lengths
let a = []
for (let l of lyrics) {
	let id = l.id
	a.push(id)
	if(l.options.length) continue
	ytdl.getBasicInfo(l.url).then(info => {
		l.length = parseInt(info.videoDetails.lengthSeconds)
	}).catch(e => {
		logger.error(`fetch length error ${id}:`, e)
	})
}

logger.log(`Loaded lyrics: ${a.join(", ")}`)
//console.log(lyrics)
