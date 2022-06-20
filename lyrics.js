import fs from "fs/promises"
import ytdl from "ytdl-core"
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import Game from "./game.js"
import config from "./config.json" assert {type: "json"};

const logger = new Logger("Lyrics", COLOR.LIGHT_BLUE)

export const lyrics = []
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
					i.reply({ content: "You alr joined. The Game will start soon.", ephemeral: true })
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

class Lyrics {

	#length
	constructor(data) {

		this.author = undefined
		this.title = undefined
		this.features = []
		this.release = undefined
		this.url = ""
		this.credit = []
		this.alias = { author: [], title: [] }
		this.options = {}
		this.lines = []
		this.#length = undefined

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
				else if(k == "feat") this.features.push(v)
				else if(k == "url") this.url = v
				else if(k == "credit") this.credit = this.credit.concat(words)
				else if(k == "alias") {
					let k = words[0]
					words.shift()
					let v = words.join(" ")
					if(k == "author") this.alias.author.push(v)
					else if(k == "title") this.alias.title.push(v)
					else {
						throw new LyricsSyntaxError(i, `invalid alias '${k}'`) + ""
					}
				}
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

			if(line.length == 0) {
				throw new LyricsSyntaxError(i, `line must not be empty`) + ""
			}

		}

		if(!this.author || !this.title || !this.release || !this.url) {
			throw new LyricsFormatError(`missing meta tags: author, title and release are required`) + ""
		}

	}

	async fetchLength() {
		ytdl.getBasicInfo(this.url).then(info => {
			this.#length = parseInt(info.videoDetails.lengthSeconds)
		}).catch(e => {
			throw new LyricsFormatError(`could not load song length from url`, e)
		})
	}

	opt(k) {
		return this.options[k] || 0
	}

	get length() {
		return this.options.length || this.#length
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
			let l = new Lyrics(data)
			if(!l.length) await l.fetchLength()
			lyrics.push(l)
			a.push(f.substr(0, f.length - 7))
		} catch(e) {
			logger.error(`load ${f}:`, e)
		}
	}
}

logger.log(`Loaded lyrics: ${a.join(", ")}`)
//console.log(lyrics)
