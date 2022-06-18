import ytdl from "ytdl-core"
import * as voice from "@discordjs/voice"
import Logger from "./logger.js"
import { bot } from "./main.js"
import points from "./points.js"

const logger = new Logger("Game")

export default class Game {

	static IDLING   = -1
	static STARTING =  0
	static RUNNING  =  1
	static ENDED    =  2

	constructor(lyrics, channel, voice) {
		this.lyrics  = lyrics
		this.channel = channel
		this.voice   = voice
		this.state   = Game.IDLING
		this.i       = 0
		this.t       = -1
		this.guesser = {
			author: null,
			title:  null,
			features: []
		}
		this.voicecon = null
		this.voiceresource = null
		this.voiceplayer = null
	}

	start() {
		this.state = Game.STARTING
		let game = this
		logger.log(`Started a game in #${this.channel.name}`)
		logger.debug(`Song: ${this.lyrics.author} - ${this.lyrics.title}`)

		if(this.voice && this.lyrics.url) {
			logger.debug("Trying to join voice channel...")
			let vc = this.voice
			this.voicecon = voice.joinVoiceChannel({
				channelId: vc.id,
				guildId: vc.guild.id,
				adapterCreator: vc.guild.voiceAdapterCreator,
				selfMute: false,
				selfDeaf: true
			})

			let stream = ytdl(this.lyrics.url, { filter : 'audioonly' })
			stream.on("response", res => { // delayed start
				this.t = Date.now() + bot.ws.ping
				this.state = Game.RUNNING
			})

			this.voiceresource = voice.createAudioResource(stream, { inlineVolume: true })
			this.voiceplayer = voice.createAudioPlayer()
			this.voiceplayer.play(this.voiceresource)
			this.voicecon.subscribe(this.voiceplayer)
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
			this.channel.send(line.s)
		}
		this.i++

		if(this.voice && this.lyrics.length && this.lyrics.length > 0) {
			// console.log(this.lyrics.length, this.t + this.lyrics.length * 1000 - Date.now(), Date.now() - this.t > this.lyrics.length * 1000)
			if(Date.now() - this.t > this.lyrics.length * 1000) {
				this.stop("timeup")
				return
			}
		} else if(this.i >= this.lyrics.lines.length) this.stop("timeup")
	}

	stop(reason, interaction) {
		this.state = Game.ENDED
		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason, interaction)

		if(reason != "stopped") {
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
				points.addPoints(id, this.channel.guild.id, p)
				let u = bot.users.cache.get(id)
				if(p == 1) s.push(u.username + " gained 1 point.")
				else s.push(u.username + ` gained ${p} points.`)
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

		if(this.voicecon) {
			function fadeOut(res, con, player) {
				let vol = res.volume.volume * 0.85
				res.volume.setVolume(vol)
				if(vol > 0.0001) setTimeout(fadeOut, 15, res, con, player)
				else {
					player.stop()
					// con.unsubscribe(player)
				}
			}

			fadeOut(this.voiceresource, this.voicecon, this.voiceplayer)
		}
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
			title: title || "GUESS SONG",
			description: this.gameInfo,
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

	sendEndStatus(reason, interaction) {
		const reasonTexts = {
			guessed: "Song was guessed!",
			timeup:  "Time is up!",
			stopped: ":octagonal_sign: Game stopped!"
		}

		let guessers = this.guessers.join("\n")
		let feat = this.lyrics.features.length > 0 ? ` feat. ${this.lyrics.features.join(", ")}` : ""

		let msgopt = {embeds: [{
			title: reasonTexts[reason] || "Song ended",
			description: `${this.lyrics.author} - ${this.lyrics.title}${feat}\n\nWinners:` + (guessers ? ("\n" + guessers) : " no one"),
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

	get gameInfo() {
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
