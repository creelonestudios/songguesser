import { MessageEmbed } from "discord.js";
import { games } from "../lyrics.js";
import Game from "../game.js"

export default {
	name: "game",
	description: "SongGuesser game",
	category: "basic",
	hide: false,
	guildOnly: false,
	// options: game start <id>|random    game stop     game info     game list
	options: [
		{
			type: 1,
			name: "start",
			description: "Start a game",
			options: [
				{
					type: 4,
					name: "songid",
					description: "Id of the song",
					dev: true
				},
				{
					type: 5,
					name: "force",
					description: "Play song without any players",
					dev: true
				},
				{
					type: 4,
					name: "rounds",
					description: "The amount of rounds to play"
				}
			]
		},
		{
			type: 1,
			name: "stop",
			description: "Stop the currently running game"
		},
		{
			type: 1,
			name: "info",
			description: "Show info about the currently running game"
		},
		{
			type: 1,
			name: "list",
			description: "List all available songs"
		}
	],
	run: async (bot, interaction) => {
		const sub = interaction.options.getSubcommand();
		if(sub === "list") {
			const embed = new MessageEmbed();
			embed.setTitle("Songs (" + lyrics.length + ")");
			embed.setFooter("SongGuesser");
			embed.setColor([0, 230, 0]);
			embed.addFields(lyrics.map(l => {
				return {
					name: `${l.title}`,
					value: `${l.author} (${l.release})`,
					inline: true
				};
			}));
			interaction.reply({ embeds: [embed] });
		} else if(sub === "start") {
			const game = new Game(interaction.user, interaction.channel, interaction.member.voice.channel, interaction.options.getInteger("rounds") || 1)
			if(interaction.options.getInteger("songid")) {
				console.log("Setting songid");
				game.songid = interaction.options.getInteger("songid");
			}
			if(interaction.options.getBoolean("force")) {
				game.start();
				game.quickstart(interaction, true);
			} else {
				game.start(interaction);
			}
			games[interaction.channel.id] = game
		} else if(sub === "stop") {
			const game = games[interaction.channel.id]
			if(!game) {
				interaction.reply({ embeds: [{
					title: "**No game running!**",
					description: "There is no game running in this channel",
					color: [230, 0, 0]
				}]})
				return;
			}
			game.stop("stopped", interaction)
		} else if(sub === "info") {
			const game = games[interaction.channel.id]
			if(!game) {
				interaction.reply({ embeds: [{
					title: "**No game running!**",
					description: "There is no game running in this channel",
					color: [230, 0, 0]
				}]})
				return;
			}
			game.sendStatus(interaction)
		}
	}
}
