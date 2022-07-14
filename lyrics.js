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
