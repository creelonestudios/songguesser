import fs from "fs/promises"
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import Game from "./game.js"

const logger = new Logger("Lyrics", COLOR.LIGHT_BLUE)
const lyrics = []
const games  = []

let bot

export default class LyricsMan {

	constructor(_bot) {
		bot = _bot

		bot.on("messageCreate", msg => {
			if(msg.author.bot) return
			let c = msg.channel
			for(let g of games) {
				if(g.running && g.channel.id == c.id) {
					g.guess(msg)
					break // there can only be one game be in each channel anyways
				}
			}
		})

		setInterval(() => {
			for(let g of games) {
				if(g.running) {
					g.sendLyrics()
				}
			}
		}, 100)

	}

	async debug() {
		let g = await bot.guilds.fetch("859422707229917204")
		let c = await g.channels.fetch("980116350737457172")
		let i = Math.floor(Math.random() * lyrics.length)
		logger.debug(c)
		let game = new Game(lyrics[i], await bot.channels.fetch("980116350737457172"), undefined)
		game.start()
		games.push(game)
	}

}

class Lyrics {

	constructor(data) {

		this.author = undefined
		this.title = undefined
		this.release = undefined
		this.url = ""
		this.credit = []
		this.options = {}
		this.lines = []

		let lines = data.split(/\r\n|\r|\n/)

		for(let i in lines) {

			let line = lines[i]
			if(line.startsWith("#") || line.length == 0) continue

			if(line.startsWith("@")) {

				line = line.substr(1)
				let words = line.split(" ")

				if(words.length < 2) throw new LyricsSyntaxError(i, `incomplete meta tag`) + ""

				let k = words[0]
				words.shift()
				let v = words.join(" ")

				if(k == "author") this.author = v
				else if(k == "title") this.title = v
				else if(k == "release") this.release = v
				else if(k == "url") this.url = v
				else if(k == "credit") this.credit = this.credit.concat(words)
				else if(k == "option") {
					let k = words[0]
					words.shift()
					let v = words.join(" ")
					this.options[k] = v
				} else {
					throw new LyricsSyntaxError(i, `unknown meta tag '${k}'`) + ""
				}
				continue

			}

			let words = line.split(" ")
			let timestamp = this.options.timestamps == "auto" ? i * (parseFloat(this.options.delay) || 4000) : parseInt(words[0]) * 1000
			if(this.options.timestamps != "auto") words.shift()
			line = words.join(" ")

			if(!isNaN(timestamp) && timestamp >= 0) {
				this.lines.push({t: timestamp, s: line})
			} else {
				//console.log(this)
				throw new LyricsSyntaxError(i, `timestamp must be a non-negative integer`) + ""
			}

		}

		if(!this.author || !this.title || !this.release) {
			throw new LyricsFormatError(`missing meta tags: author, title and release are required`) + ""
		}

	}

	opt(k) {
		return this.options[k] || 0
	}

}

class LyricsSyntaxError {
	constructor(line, reason, cause) {
		this.line   = line
		this.reason = reason
		this.cause  = cause
	}

	toString() {
		let s = `LyricsSyntaxError in line ${this.line}: ${this.reason}`
		if(this.cause) {
			s += "\nCaused by " + this.cause
		}
		return s
	}
}

class LyricsFormatError {
	constructor(reason, cause) {
		this.reason = reason
		this.cause  = cause
	}

	toString() {
		let s = `LyricsFormatError: ${this.reason}`
		if(this.cause) {
			s += "\nCaused by " + this.cause
		}
		return s
	}
}

// load .lyrics files
let files = await fs.readdir("./lyrics/")
let a = []
for(let f of files) {
	if(!f.endsWith(".lyrics")) {
		logger.error(`load ${f}:`, "Lyrics files have to end with .lyrics")
		continue
	}
	let data = ""
	try {
		data = await fs.readFile("./lyrics/" + f, { encoding: "utf-8" })
	} catch(e) {
		logger.error(`load ${f}:`, e)
		continue
	}
	if(data) {
		try {
			lyrics.push(new Lyrics(data))
			a.push(f.substr(0, f.length - 7))
		} catch(e) {
			logger.error(`load ${f}:`, e)
		}
	}
}

logger.log(`Loaded lyrics: ${a.join(", ")}`)
//console.log(lyrics)