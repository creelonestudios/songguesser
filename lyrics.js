import fs from "fs/promises"
import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import { bot } from "./main.js"

const logger = new Logger("Lyrics", COLOR.LIGHT_BLUE)
const lyrics = []

export default class LyricsMan {

	constructor() {

	}

}

class Lyrics {

	constructor(data) {

		this.author = "Unknown"
		this.title = "Unknown"
		this.release = "Unknown"
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
