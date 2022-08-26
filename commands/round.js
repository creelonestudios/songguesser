import { MessageEmbed } from "discord.js";
import { games } from "../lyrics.js";
import Game from "../game.js"

export default {
	name: "round",
	description: "Round",
	category: "basic",
	hide: false,
	guildOnly: false,
	options: [
		{
			type: 1,
			name: "info",
			description: "Show info about the currently running round"
		},
		{
			type: 1,
			name: "skip",
			description: "Skip this round (points will not be given)"
		}
	],
	run: async (bot, interaction) => {
		const sub = interaction.options.getSubcommand();
		if(sub === "info") {
			const game = games[interaction.channel.id]
			if(!game) {
				interaction.reply({ embeds: [{
					title: "**No game running!**",
					description: "There is no game running in this channel",
					color: [230, 0, 0]
				}]})
				return;
			}
			game.round.sendStatus(interaction)
		} else if(sub === "skip") {
			const game = games[interaction.channel.id]
			if(!game) {
				interaction.reply({ embeds: [{
					title: "**No game running!**",
					description: "There is no game running in this channel",
					color: [230, 0, 0]
				}]})
				return;
			}
			game.skipRound(interaction);
		}
	}
}
