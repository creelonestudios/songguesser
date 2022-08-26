import { MessageActionRow } from "discord.js"

export default class ButtonRow {

	constructor(options, ...buttons) {
		this.options = options
		this.row = new MessageActionRow()
			.addComponents(buttons)
		this.msg = null
		this.disabled = false
	}

	send(channel) {
		let dis = this
		let msgopt = new Object(this.options)
		msgopt.components = [this.row]
		return channel.send(msgopt).then(msg => dis.msg = msg)
	}

	reply(interaction) {
		let dis = this
		let msgopt = new Object(this.options)
		msgopt.components = [this.row]
		msgopt.fetchReply = true
		return interaction.reply(msgopt).then(msg => dis.msg = msg)
	}

	editOptions(cb) {
		if(!cb || this.disabled) return
		if(this.msg) {
			let msg = this.msg
			let options = cb(msg)

			try {
				msg.edit(options)
			} catch(e) {} // ignore
		}
	}

	editRow(cb) {
		if(!cb || this.disabled) return
		this.editOptions(msg => {
			let row = msg.components[0]
			cb(row)
			return { components: [row] }
		})
	}

	disableAll() {
		if(this.disabled) return
		this.editRow(row => {
			for(let c of row.components) c.setDisabled(true)
		})
		this.disabled = true
	}

}
