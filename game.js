import * as voice from "@discordjs/voice"
import Logger from "./logger.js"
import { bot } from "./main.js"
import Round from "./round.js"
import config from "./config.json" assert {type: "json"};

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
		this.participantCount = 1
		this.voicecon = null
		this.startmsg = null

		this.participants[initiator.id] = initiator
	}

	start(interaction) {
		this.state = Game.STARTING
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

		let msgopt = {
			embeds: [{
				title: `**Game is about to start...**`,
				description: "Game starts in 10 seconds.\nJoin game by clicking the button below.\n\nDon't worry, you can still join later by guessing",
				footer: {text: "SongGuesser vTODO: insert version here"} // TODO
			}], components: [{
				components: [{
					customId: `join_game`,
					disabled: false,
					emoji: { name: `🎶` },
					label: "Tune in",
					style: "PRIMARY",
					type: "BUTTON"
				}, {
					customId: `quickstart_game`,
					disabled: false,
					emoji: { name: `⏩` },
					label: "Quickstart",
					style: "SUCCESS",
					type: "BUTTON"
				}, {
					customId: `cancel_game`,
					disabled: false,
					label: "Cancel",
					style: "DANGER",
					type: "BUTTON"
				}],
				type: "ACTION_ROW"
			}],
			fetchReply: true
		}

		if(interaction) interaction.reply(msgopt).then(msg => game.startmsg = msg)
		else this.channel.send(msgopt).then(msg => game.startmsg = msg)

		setTimeout(() => game.quickstart(), 10000) // wait 10 secs
	}

	stop(reason, interaction, errInfo) {
		this.state = Game.ENDED
		if(reason == "stopped") this.round.stop(reason)

		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason, interaction, errInfo)
	}

	quickstart(interaction) {
		if([Game.RUNNING, Game.ENDED].includes(this.state)) return
		if(this.participantCount < (config.minParticipants || 2)) {
			this.stop("toofew")
			return
		}

		this.state = Game.RUNNING
		this.sendStatus(interaction, "Game started!")
		setRound(this)

		if(this.startmsg) {
			let msg = this.startmsg
			let row = msg.components[0]
			for(let c of row.components) c.setDisabled(true)

			msg.edit({ components: [row] })
		}
	}

	skipRound(interaction) {
		this.round.stop("skipped", interaction)
	}

	sendLyrics() {
		if(this.round.state == Game.RUNNING)
			this.round.sendLyrics()
	}

	guess(msg) {
		addParticipant(msg.author)

		if(this.round.state == Game.RUNNING)
			this.round.guess(msg)
	}

	addParticipant(user) {
		if(!this.participants[user.id]) {
			this.participants[user.id] = user
			this.participantCount++
		}
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
			stopped:   ":octagonal_sign: Game stopped!",
			cancelled: ":x: Game cancelled.",
			toofew:    `:x: Too few participants. (min: ${(config.minParticipants || 2)})`,
			error:     ":warning: An error occurred!"
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
		s += `\n\nParticipants (${this.participantCount}):\n${this.participantlist.join(", ")}`
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

function setRound(game) {
	game.round = new Round(game)
	game.round.on("end", () => {
		if(game.state != Game.RUNNING) return
		if(game.i + 1 < game.rounds) {
			game.i++
			setTimeout(setRound, 3000, game)
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
