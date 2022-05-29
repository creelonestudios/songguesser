import ytdl from "ytdl-core"
import Logger from "./logger.js"

const logger = new Logger("Game")
export const games = {};

export default class Game {

	constructor(lyrics, channel, voice) {
		this.lyrics  = lyrics
		this.channel = channel
		this.voice   = voice
		this.running = false
		this.i       = 0
		this.loop    = undefined
		this.t       = -1
		// logger.debug(this)
	}

	start() {
		this.running = true
		let game = this
		this.t = Date.now()
		this.loop = setInterval(() => game.sendLyrics(), 100)
		logger.log(`Started a game in #${this.channel.name}`)
	}

	sendLyrics() {
		let line = this.lyrics.lines[this.i]
		if(Date.now() - this.t < line.t) return
		this.channel.send(line.s)
		this.i++
		if(this.i >= this.lyrics.lines.length) this.stop()
	}

	stop() {
		this.running = false
		clearInterval(this.loop)
		logger.log(`Game in #${this.channel.name} ended`)
	}

}
