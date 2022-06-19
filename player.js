import ytdl from "ytdl-core"
import * as voice from "@discordjs/voice"

import Logger from "./logger.js"

const logger = new Logger("Player")

export default class Player {

	constructor(game, voicecon, url) {

		this.stream = ytdl(url, { filter : 'audioonly' })
		this.stream.on("retry", (n, e) => {
			logger.debug("Retry:", n, e)
			if(e == undefined) this.player.stop()
			else game.stop("error", null, `miniget Error: (#${n}) ${typeof e == "number" ? `HTTP status ${e}` : e.message}`)
		})
		this.stream.on("reconnect", (n, e) => {
			logger.debug("Reconnect:", n, e)
			game.stop("error", null, `miniget Error: (#${n}) ${e.message}`)
		})
		this.stream.on("close", () => {
			logger.error("closed prematurely")
			game.stop("error", null, `miniget Error: closed prematurely`)
		})
		this.stream.on("finish", () => {
			logger.debug("finished")
		})
		this.stream.on("timeout", (n, e) => {
			logger.debug("timed out")
			game.stop("error", null, `miniget Error: timed out`)
		})

		this.resource = voice.createAudioResource(this.stream, { inlineVolume: true })
		this.player = voice.createAudioPlayer()
		this.player.on("error", e => {
			console.error(e)
			game.stop("error", null, `AudioPlayerError: ${e.message}`)
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
