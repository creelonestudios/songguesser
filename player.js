import * as voice from "@discordjs/voice"

import Logger from "./logger.js"
import { ytDlp } from "./main.js"

const logger = new Logger("Player")

export default class Player {

	constructor(round, voicecon, url) {
		this.round = round
		this.voicecon = voicecon
		this.url = url
	}

	async play() {
		// download
		const videoUrls = await ytDlp.downloadAudio({
			url: this.url,
			format: "ba", // best audio
		})

		this.resource = voice.createAudioResource(videoUrls[0], { inlineVolume: true })
		this.player = voice.createAudioPlayer()
		this.player.on("error", e => {
			console.error(e)
			//round.stop("error", null, `AudioPlayerError: ${e.message}`)
			this.round.game.channel.send({ embeds: [{
				title: ":warning: Error",
				color: 0xff0000,
				description: "The AudioPlayer errored. The audio might stop playing.\nI express my sincere apologies for the inconvenience. :(",
				fields: (e && e.message) ? [{name: "AudioPlayerError", value: e.message}] : []
			}]})
		})
		this.player.play(this.resource)
		this.voicecon.subscribe(this.player)
	}

	fadeOut() {

		let vol = this.resource.volume.volume * 0.85
		this.resource.volume.setVolume(vol)
		let dis = this // this looses context due to setTimeout
		if(vol > 0.0001) setTimeout(() => dis.fadeOut(), 15)
		else {
			this.player.stop()
			// con.unsubscribe(player)
		}

	}

}
