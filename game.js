import * as voice from "@discordjs/voice"
import Logger from "./logger.js"
import { bot } from "./main.js"
import Round from "./round.js"

const logger = new Logger("Game")

export default class Game {

	static IDLING   = -1
	static STARTING =  0
	static RUNNING  =  1
	static ENDED    =  2

	constructor(initiator, channel, voice, rounds) {
		this.channel = channel
		this.voice   = voice
		this.rounds  = rounds || 1
		this.state   = Game.IDLING
		this.t       = Date.now()
		this.round   = null
		this.i       = 0
		this.participants = {}
		this.voicecon = null

		this.participants[initiator.id] = initiator
	}

	start() {
		this.state = Game.RUNNING
		let game = this
		logger.log(`Started a game in #${this.channel.name}`)

		if(this.voice) {
			logger.debug("Trying to join voice channel...")
			let vc = this.voice
			this.voicecon = voice.joinVoiceChannel({
				channelId: vc.id,
				guildId: vc.guild.id,
				adapterCreator: vc.guild.voiceAdapterCreator,
				selfMute: false,
				selfDeaf: true
			})
		}

		function setRound() {
			game.round = new Round(game)
			game.round.on("end", () => {
				if(game.state != Game.RUNNING) return
				if(game.i + 1 < game.rounds) {
					game.i++
					setTimeout(setRound, 3000)
					game.channel.send({embeds: [{
						title: `**Game Info**`,
						description: "Next round starts in 3 seconds...",
						footer: {text: "SongGuesser vTODO: insert version here"} // TODO
					}]})
					return
				}
				game.stop("ended")
			})
			game.round.sendStatus()
		}

		setRound()
	}

	stop(reason, interaction, errInfo) {
		this.state = Game.ENDED
		if(reason == "stopped") this.round.stop(reason)

		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason, interaction, errInfo)
	}

	skipRound(interaction) {
		this.round.stop("skipped", interaction)
	}

	sendLyrics() {
		if(this.round.state == Game.RUNNING)
			this.round.sendLyrics()
	}

	guess(msg) {
		if(!this.participants[msg.author.id])
			this.participants[msg.author.id] = msg.author

		if(this.round.state == Game.RUNNING)
			this.round.guess(msg)
	}

	sendStatus(interaction, title) {
		let msgopt = {embeds: [{
			title: `**${title || "Game Info"}**`,
			description: this.gameInfo,
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

	sendEndStatus(reason, interaction, errInfo) {
		const reasonTexts = {
			stopped: ":octagonal_sign: Game stopped!",
			error:   ":warning: An error occurred!"
		}

		let msgopt = {embeds: [{
			title: `**${reasonTexts[reason] || "Game ended"}**`,
			description: this.gameInfo,
			footer: {text: "SongGuesser vTODO: insert version here"} // TODO
		}]}

		if(reason == "error") {
			if(errInfo) msgopt.fields = [{name: "error", value: errInfo}]
			msgopt.color = "#ff0000"
		}

		if(interaction) interaction.reply(msgopt)
		else this.channel.send(msgopt)
	}

	get gameInfo() {
		let s = `Round: ${this.i +1}/${this.rounds}` // +1 for one-based index
		s += `\nChannel: <#${this.channel.id}>`
		if(this.voicecon) s += `\nVC: <#${this.voice.id}>`
		s += `\n\nParticipants:\n${this.participantlist.join(", ")}`
		return s
	}

	get participantlist() {
		let a = []

		for(let id of Object.keys(this.participants)) {
			let p = this.participants[id]
			a.push(p.username)
		}

		return a
	}

}
