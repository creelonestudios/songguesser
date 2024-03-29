import { EventEmitter } from "events"
import Logger from "./logger.js"
import { bot, getFooter } from "./main.js"
import { lyrics } from "./lyrics.js";
import points from "./points.js"
import Player from "./player.js"
import Game from "./game.js"

const logger = new Logger("Round")

export default class Round extends EventEmitter {

	get voicecon() {
		return this.game.voicecon
	}

	constructor(game) {
		super()
		this.game    = game
		this.lyrics  = game.songid ? lyrics[game.songid] : lyrics[Math.floor(Math.random() * lyrics.length)]
		this.state   = Game.IDLING
		this.i       = 0
		this.t       = -1
		this.guesser = {
			author: null,
			title:  null,
			features: []
		}
		this.player  = null

		this.start()
	}

	start() {
		this.state = Game.STARTING
		logger.debug(`Song: ${this.lyrics.author} - ${this.lyrics.title}`)

		if(this.voicecon && this.lyrics.url) {
			this.player = new Player(this, this.voicecon, this.lyrics.url)
			this.player.stream.on("response", res => { // delayed start
				this.t = Date.now() + bot.ws.ping
				this.state = Game.RUNNING
			})
		} else { // immediate start
			this.t = Date.now()
			this.state = Game.RUNNING
		}
	}

	sendLyrics() {
		if(this.lyrics.lines.length == 0) return
		let line = this.lyrics.lines[this.i]
		if(line) {
			if(Date.now() - this.t < line.t) return
			//logger.debug(Math.floor((Date.now() - this.t) * 10) / 10, this.lyrics.length, this.lyrics.lines[this.i])
			this.game.channel.send(line.s)
		}
		this.i++

		if(this.voicecon && this.lyrics.length && this.lyrics.length > 0) {
			// console.log(this.lyrics.length, this.t + this.lyrics.length * 1000 - Date.now(), Date.now() - this.t > this.lyrics.length * 1000)
			if(Date.now() - this.t > this.lyrics.length * 1000) {
				this.stop("timeup")
				return
			}
		} else if(this.i >= this.lyrics.lines.length) this.stop("timeup")
	}

	stop(reason, interaction, errInfo) {
		this.state = Game.ENDED
		this.sendEndStatus(reason, interaction, errInfo)

		if (["stopped","skipped"].includes(reason)) {
			let s = []
			let guesserpoints = {}

			if(this.guesser.title != this.guesser.author) {
				if(this.guesser.title)  guesserpoints[this.guesser.title] = 1
				if(this.guesser.author) guesserpoints[this.guesser.title] = 1
			} else if(this.guesser.title) {
				guesserpoints[this.guesser.title] = 3
			}

			for(let id of this.guesser.features) {
				if(!guesserpoints[id]) guesserpoints[id] = 0.5
				else guesserpoints[id] += 0.5
			}

			for(let id of Object.keys(guesserpoints)) {
				let p = guesserpoints[id]
				points.addPoints(id, this.game.channel.guild.id, p)
				let u = bot.users.cache.get(id)
				if(p == 1) s.push(u.username + " gained 1 point.")
				else s.push(u.username + ` gained ${p} points.`)
			}

			if(s.length > 0) {
				this.game.channel.send({embeds: [{
					title: "Points",
					description: s.join("\n"),
					footer: getFooter(),
					color: "#00ff00"
				}]})
			}
    }

		if(this.player) {
			this.player.fadeOut()
		}

		this.emit("end")
	}

	guess(msg) {
		let s = msg.content.toLowerCase()
		let guess = false
		let author = this.lyrics.author.toLowerCase().replaceAll(/[^\w]/g, "")
		let title = this.lyrics.title.toLowerCase().replaceAll(/[^\w]/g, "")
		let feats = []
		for(let i in this.lyrics.features) {
			feats.push(this.lyrics.features[i].toLowerCase().replaceAll(/[^\w]/g, ""))
		}

		let a = s.split(/[^\w\s]/)
		for(let e of a) {
			e = e.replaceAll(/\s/g, "")

			if((e == author || this.lyrics.alias.author.includes(e)) && !this.guesser.author) {
				this.guesser.author = msg.author.id
				guess = true
			}

			if((e == title || this.lyrics.alias.title.includes(e)) && !this.guesser.title) {
				this.guesser.title = msg.author.id
				guess = true
			}

			if(feats.includes(e)) {
				let i = feats.indexOf(e)
				if(!this.guesser.features[i]) {
					this.guesser.features[i] = msg.author.id
					guess = true
					console.log(this.guesser.features)
				}
			}
		}

		if(this.guesser.title && this.guesser.author) {
			this.stop("guessed")
		} else if(guess) this.sendStatus()
	}

	sendStatus(interaction, title) {
		let msgopt = {embeds: [{
			title: `**Round ${this.game.i +1}/${this.game.rounds}**`, // +1 for one-based index
			description: this.roundInfo,
			footer: getFooter()
		}]}

		if(interaction) interaction.reply(msgopt)
		else this.game.channel.send(msgopt)
	}

	sendEndStatus(reason, interaction, errInfo) {
		const reasonTexts = {
			guessed: "Song was guessed!",
			timeup:  "Time is up!",
			skipped: ":fast_forward: Round skipped!",
			error:   ":warning: An error occurred!"
		}

		let guessers = this.guessers.join("\n")
		let feat = this.lyrics.features.length > 0 ? ` feat. ${this.lyrics.features.join(", ")}` : ""

		let msgopt = {embeds: [{
			title: `**${reasonTexts[reason] || "Song ended"}**`,
			description: `${this.lyrics.author} - ${this.lyrics.title}${feat}\n\nWinners:` + (guessers ? ("\n" + guessers) : " no one"),
			footer: getFooter()
		}]}

		if(reason == "error") {
			if(errInfo) msgopt.fields = [{name: "error", value: errInfo}]
			msgopt.color = "#ff0000"
		}

		if(interaction) interaction.reply(msgopt)
		else this.game.channel.send(msgopt)
	}

	get roundInfo() {
		let feats = []
		for(let i in this.lyrics.features) {
			if(this.guesser.features[i]) feats.push(this.lyrics.features[i])
			else feats.push("???")
		}

		let s = `${this.guesser.author ? this.lyrics.author : "???"} - ${this.guesser.title ? this.lyrics.title : "???"}`
		if(feats.length > 0) s += ` feat. ${feats.join(", ")}`

		if(this.guesser.author) s += `\nAuthor guessed by <@${this.guesser.author}>`
		if(this.guesser.title) s += `\nTitle guessed by <@${this.guesser.title}>`
		if(this.guesser.features.length > 0) s += `\nFeature(s) guessed by ${this.featguessers.join(", ")}`

		return s
	}

	get featguessers() {
		let a = []
		let ids = []
		for(let id of this.guesser.features) {
			if(!ids.includes(id) && id) {
				a.push(`<@${id}>`)
				ids.push(id)
			}
		}
		return a
	}

	get guessers() {
		let a = []
		let ids = []

		if(this.guesser.title && !ids.includes(this.guesser.title)) {
			a.push(`<@${this.guesser.title}>`)
			ids.push(this.guesser.title)
		}
		if(this.guesser.author && !ids.includes(this.guesser.author)) {
			a.push(`<@${this.guesser.author}>`)
			ids.push(this.guesser.author)
		}

		for(let id of this.guesser.features) {
			if(!ids.includes(id) && id) {
				a.push(`<@${id}>`)
				ids.push(id)
			}
		}
		return a
	}

}
