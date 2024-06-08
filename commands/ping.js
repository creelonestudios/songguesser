export default {
	name: "ping",
	description: "Replies with Pong!",
	category: "basic",
	hide: false,
	guildOnly: false,
	run: async (bot, interaction) => {
		interaction.reply({ embeds: [{
			title: "**I am responsive!**",
			description: `:ping_pong: Pong! (${bot.ws.ping}ms)`,
			color: 0x00E600
		}], ping: bot.ws.ping });
	}
}