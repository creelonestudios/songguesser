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
			title:  null
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
			this.voiceplayer.on("error", e => {
				console.error(e)
				this.stop("error", null, `AudioPlayerError: ${e.message}`)
			})
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

	stop(reason, interaction, errInfo) {
		this.state = Game.ENDED
		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason, interaction, errInfo)

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
		let author = this.lyrics.author.toLowerCase().replaceAll(/[^\w\s]/g, "")
		let title = this.lyrics.title.toLowerCase().replaceAll(/[^\w\s]/g, "")
		//console.log(author, title)

		let a = s.split(/[^\w\s]/)
		for(let e of a) {
			e = e.trim()
			if(e == author && !this.guesser.author) {
				this.guesser.author = msg.author.id
				guess = true
			}
			if(e == title && !this.guesser.title) {
				this.guesser.title = msg.author.id
				guess = true
			}
		}

		if(this.guesser.title && this.guesser.author) {
			this.stop("guessed")
		} else if(guess) this.sendStatus()
	}

	sendStatus(interaction) {
		let s = `${this.guesser.author ? this.lyrics.author : "???"} - ${this.guesser.title ? this.lyrics.title : "???"}`
		if(this.guesser.author) s += `\nAuthor guessed by <@${this.guesser.author}>`
		if(this.guesser.title) s += `\nTitle guessed by <@${this.guesser.title}>`

		let msgopt = {embeds: [{
			title: "GUESS SONG",
			description: s,
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

	sendEndStatus(reason, interaction, errInfo) {
		const reasonTexts = {
			guessed: "Song was guessed!",
			timeup:  "Time is up!",
			stopped: ":octagonal_sign: Game stopped!",
			error:   ":warning: An error occurred!"
		}
		let s = ""
		if(this.guesser.author) s += `\n<@${this.guesser.author}>`
		if(this.guesser.title && this.guesser.title != this.guesser.author) s += `\n<@${this.guesser.title}>`

		let msgopt = {embeds: [{
			title: reasonTexts[reason] || "Song ended",
			description: `${this.lyrics.author} - ${this.lyrics.title}\n\nWinners:` + (s || " no one"),
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]}

		if(reason == "error") {
			if(errInfo) msgopt.fields = [{name: "error", value: errInfo}]
			msgopt.color = "#ff0000"
		}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

}
