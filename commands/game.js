import { MessageEmbed } from "discord.js";
import { lyrics, games } from "../lyrics.js";
import Game from "../game.js"

export default {
	name: "game",
	description: "SongGuesser game",
	category: "basic",
	hide: false,
	guildOnly: false,
	options: [
		{
			type: 1,
			name: "start",
			description: "Start a game",
			options: [
				{
					type: 4,
					name: "songid",
					description: "Id of the song"
				},
        {
          type: 5,
          name: "discover",
          description: "Discover unknown songs"
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
			embed.addFields(lyrics.filter(l => !l.options.discover).map(l => {
				return {
					name: `${l.title}`,
					value: `${l.author} (${l.release})`,
					inline: true
				};
			}));
			interaction.reply({ embeds: [embed] });
		} else if(sub === "start") {
      const discover = interaction.options.getBoolean("discover");
      let useLyrics = discover ? lyrics.filter(l => l.options.discover) : lyrics.filter(l => !l.options.discover);
			let i = Math.floor(Math.random() * useLyrics.length)
			const game = new Game(useLyrics[i], interaction.channel, interaction.member.voice.channel)
      game.discover = true;
			game.start();
			games[interaction.channel.id] = game
			interaction.reply({ embeds: [{
				title: "**Game started!**",
				description: `??? - ???${discover ? " (discover mode)" : ""}`,
			}]})
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
