import ytdl from "ytdl-core"
import * as voice from "@discordjs/voice"
import Logger from "./logger.js"
import { bot } from "./main.js"

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
		this.voicecon = null
		this.voiceresource = null
		this.voiceplayer = null
	}

	start() {
		this.running = true
		let game = this
		logger.log(`Started a game in #${this.channel.name}`)
		logger.debug(`Song: ${this.lyrics.author} - ${this.lyrics.title}`)
		this.t = Date.now()

		if(this.voice && this.lyrics.url) {
			logger.debug("Trying to join voice channel...")
			let vc = this.voice
			this.voicecon = voice.joinVoiceChannel({
				channelId: vc.id,
				guildId: vc.guild.id,
				adapterCreator: vc.guild.voiceAdapterCreator,
				selfMute: false,
				selfDeaf: false
			})
			let stream = ytdl(this.lyrics.url, { filter : 'audioonly' })
			this.voiceresource = voice.createAudioResource(stream, { inlineVolume: true })
			this.voiceplayer = voice.createAudioPlayer()
			this.voiceplayer.play(this.voiceresource)
			this.voicecon.subscribe(this.voiceplayer)
		}
	}

	sendLyrics() {
		if(this.voice && this.lyrics.length && this.lyrics.length > 0) {
			// console.log(this.lyrics.length, this.t + this.lyrics.length * 1000 - Date.now(), Date.now() - this.t > this.lyrics.length * 1000)
			if(Date.now() - this.t > this.lyrics.length * 1000) {
				this.stop("timeup")
				return
			}
		}
		if(this.lyrics.lines.length == 0) return
		let line = this.lyrics.lines[this.i]
		if(Date.now() - this.t < line.t) return
		this.channel.send(line.s)
		this.i++
		if(this.i >= this.lyrics.lines.length) this.stop("timeup")
	}

	stop(reason, interaction) {
		this.running = false
		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason, interaction)

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
			footer: "SongGuesser vTODO: insert version here" // TODO
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
		let s = ""
		if(this.guesser.author) s += `\n<@${this.guesser.author}>`
		if(this.guesser.title && this.guesser.title != this.guesser.author) s += `\n<@${this.guesser.title}>`

		let msgopt = {embeds: [{
			title: reasonTexts[reason] || "Song ended",
			description: `${this.lyrics.author} - ${this.lyrics.title}\n\nWinners:` + (s || " no one"),
			footer: "SongGuesser vTODO: insert version here" // TODO
		}]}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

}
