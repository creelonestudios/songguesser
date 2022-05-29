import ytdl from "ytdl-core"
import Logger from "./logger.js"
import { bot } from "./main.js"
import points from "./points.js"

const logger = new Logger("Game")

export default class Game {

	constructor(lyrics, channel, voice) {
		this.lyrics  = lyrics
		this.channel = channel
		this.voice   = voice
		this.running = false
		this.i       = 0
		this.t       = -1
		this.guesser = {
			author: null,
			title:  null
		}
	}

	start() {
		this.running = true
		let game = this
		logger.log(`Started a game in #${this.channel.name}`)
		logger.debug(`Song: ${this.lyrics.author} - ${this.lyrics.title}`)
		this.t = Date.now()
	}

	sendLyrics() {
		if(this.lyrics.lines.length < 1) {
			if(Date.now() - this.t > (this.lyrics.options.length || 0)) this.stop("timeup")
			return
		}
		let line = this.lyrics.lines[this.i]
		if(Date.now() - this.t < line.t) return
		this.channel.send(line.s)
		this.i++
		if(this.i >= this.lyrics.lines.length) this.stop("timeup")
	}

	stop(reason) {
		this.running = false
		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason)

		if(reason != "stopped") {
			let s = []
			if(this.guesser.title != this.guesser.author) {
				if(this.guesser.title) {
					points.addPoints(this.guesser.title, this.channel.guild.id, 1)
					let u = bot.users.cache.get(this.guesser.title)
					s.push(u.username + " gained 1 point.")
				}
				if(this.guesser.author) {
					points.addPoints(this.guesser.author, this.channel.guild.id, 1)
					let u = bot.users.cache.get(this.guesser.author)
					s.push(u.username + " gained 1 point.")
				}
			} else if(this.guesser.title) {
				points.addPoints(this.guesser.title, this.channel.guild.id, 3)
				let u = bot.users.cache.get(this.guesser.title)
				s.push(u.username + " gained 3 points.")
			}

			if(s.length > 0) {
				this.channel.send({embeds: [{
					title: "Points",
					description: s.join("\n"),
					footer: {text: "SongGuesser vTODO: insert version here"}, // TODO
					color: "#00ff00"
				}]})
			}
		}
	}

	guess(msg) {
		let s = msg.content.toLowerCase()
		let guess = false

		let a = s.split(/[^\w\s]/)
		for(let e of a) {
			e = e.trim()
			if(e == this.lyrics.author.toLowerCase() && !this.guesser.author) {
				this.guesser.author = msg.author.id
				guess = true
			}
			if(e == this.lyrics.title.toLowerCase() && !this.guesser.title) {
				this.guesser.title = msg.author.id
				guess = true
			}
		}

		if(this.guesser.title && this.guesser.author) {
			this.stop("guessed")
		} else if(guess) this.sendStatus()
	}

	sendStatus() {
		let s = `${this.guesser.author ? this.lyrics.author : "???"} - ${this.guesser.title ? this.lyrics.title : "???"}`
		if(this.guesser.author) s += `\nAuthor guessed by <@${this.guesser.author}>`
		if(this.guesser.title) s += `\nTitle guessed by <@${this.guesser.title}>`
		this.channel.send({embeds: [{
			title: "GUESS SONG",
			description: s,
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]})
	}

	sendEndStatus(reason) {
		const reasonTexts = {
			guessed: "Song was guessed!",
			timeup:  "Time is up!",
			stopped: ":octagonal_sign: Game stopped!"
		}
		let s = ""
		if(this.guesser.author) s += `\n<@${this.guesser.author}>`
		if(this.guesser.title && this.guesser.title != this.guesser.author) s += `\n<@${this.guesser.title}>`
		this.channel.send({embeds: [{
			title: reasonTexts[reason] || "Song ended",
			description: `Winners:` + (s || "no one"),
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]})
	}

}
