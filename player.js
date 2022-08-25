import ytdl from "ytdl-core"
import * as voice from "@discordjs/voice"

import Logger from "./logger.js"

const logger = new Logger("Player")

export default class Player {

	constructor(round, voicecon, url) {

		this.stream = ytdl(url, { filter : 'audioonly', requestOptions: { maxReconnects: 10, backoff: { inc: 0, max: 0 } } })
		this.stream.on("retry", (n, e) => {
			logger.debug("Retry:", n, e)
			if(e == undefined) this.player.stop()
			else round.stop("error", null, `miniget Error: (#${n}) ${typeof e == "number" ? `HTTP status ${e}` : e.message}`)
		})
		this.stream.on("reconnect", (n, e) => {
			logger.debug("Reconnect:", n, e)
			if(n >= 10) {
				if(e == undefined) this.player.stop()
				else round.stop("error", null, `miniget Error: (#${n}) ${e.message}`)
			}
		})
		this.stream.on("close", () => {
			logger.error("closed prematurely")
			round.stop("error", null, `miniget Error: closed prematurely`)
		})
		this.stream.on("finish", () => {
			logger.debug("finished")
		})
		this.stream.on("timeout", (n, e) => {
			logger.debug("timed out")
			round.stop("error", null, `miniget Error: timed out`)
		})

		this.resource = voice.createAudioResource(this.stream, { inlineVolume: true })
		this.player = voice.createAudioPlayer()
		this.player.on("error", e => {
			console.error(e)
			//round.stop("error", null, `AudioPlayerError: ${e.message}`)
			round.game.channel.send({ embeds: [{
				title: ":warning: Error",
				color: "#ff0000",
				description: "The AudioPlayer errored. The audio might stop playing.\nI express my sincere apologies for the inconvenience. :(",
				fields: (e && e.message) ? [{name: "AudioPlayerError", value: e.message}] : []
			}]})
		})
		this.player.play(this.resource)
		voicecon.subscribe(this.player)

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
