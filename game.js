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
			let player = voice.createAudioPlayer()
			player.play(this.voiceresource)
			this.voicecon.subscribe(player)
		}
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

		if(this.voicecon) {
			function fadeOut(res, con) {
				let vol = res.volume.volume * 0.85
				res.volume.setVolume(vol)
				if(vol > 0.0001) setTimeout(fadeOut, 15, res, con)
				else con.destroy()
			}

			fadeOut(this.voiceresource, this.voicecon, 1)
		}
	}

	guess(msg) {
		let s = msg.content.toLowerCase()
		let guess = false
		let author = this.lyrics.author.toLowerCase().replaceAll(/[^\w\s]/g, "")
		let title = this.lyrics.title.toLowerCase().replaceAll(/[^\w\s]/g, "")
		console.log(author, title)

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
			footer: "SongGuesser vTODO: insert version here" // TODO
		}]})
	}

}
