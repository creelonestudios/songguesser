import * as voice from "@discordjs/voice"
import Logger from "./logger.js"
import { bot } from "./main.js"
import Round from "./round.js"
import ButtonRow from "./buttonrow.js"
import config from "./config.json" assert {type: "json"};

const logger = new Logger("Game")

const minParticipants = config.minParticipants || 2

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
		this.buttonrow = null
		this.songid  = null;

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
				description: "Game starts in 10 seconds.\nJoin game by clicking on \"Tune in\" below.\n\nDon't worry, you can still join later by guessing",
				footer: {text: "SongGuesser vTODO: insert version here"}, // TODO
				fields: [{name: `Participants (${this.participantCount}/${minParticipants}):`, value: this.participantlist.join(", ")}]
			}]
		}

		this.buttonrow = new ButtonRow(msgopt, {
			customId: `join_game`,
			disabled: false,
			emoji: { name: `🎶` },
			label: "Tune in",
			style: "PRIMARY",
			type: "BUTTON"
		}, {
			customId: `quickstart_game`,
			disabled: true,
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
		})

		if(interaction) this.buttonrow.reply(interaction)
		else this.buttonrow.send(this.channel)

		setTimeout(() => game.quickstart(), 100000) // wait 10 secs
	}

	stop(reason, interaction, errInfo) {
		this.state = Game.ENDED
		if(reason == "stopped") this.round.stop(reason)

		logger.log(`Game in #${this.channel.name} ended`)
		this.sendEndStatus(reason, interaction, errInfo)
		if(this.buttonrow) this.buttonrow.disableAll() // if not alr
	}

	quickstart(interaction, force) {
		if([Game.RUNNING, Game.ENDED].includes(this.state)) return
		if(this.participantCount < minParticipants && !force) {
			this.stop("toofew")
			return
		}

		this.state = Game.RUNNING
		this.sendStatus(interaction, "Game started!")
		setRound(this)

		if(this.buttonrow) {
			this.buttonrow.disableAll()
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
		this.addParticipant(msg.author)

		if(this.round.state == Game.RUNNING)
			this.round.guess(msg)
	}

	addParticipant(user) {
		if(this.participants[user.id]) return
		this.participants[user.id] = user
		this.participantCount++

		if(this.buttonrow && this.state == Game.STARTING) {
			this.buttonrow.editOptions(msg => {
				let embed = msg.embeds[0]
				embed.fields = [{name: `Participants (${this.participantCount}/${minParticipants}):`, value: this.participantlist.join(", ")}]
				return {embeds: [embed]}
			})
			if(this.participantCount == minParticipants) { // only execute once
				this.buttonrow.editRow(row => {
					row.components[1].setDisabled(false)
				})
			}
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
			toofew:    `:x: Too few participants. (min: ${minParticipants})`,
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
