import { MessageEmbed } from "discord.js";
import points from "../points.js";

export default {
	name: "points",
	description: "Points",
	category: "basic",
	hide: false,
	guildOnly: false,
	options: [
		{
      type: 1,
      name: "get",
      description: "View a users points",
      options: [
        {
          type: 6,
          name: "user",
          description: "The user to get the points from"
        }
      ]
    },
    {
      type: 1,
      name: "top",
      description: "View the top list",
      options: [
        {
          type: 5,
          name: "global",
          description: "If all points from all guilds should be counted. Defaults to no"
        }
      ]
    }
	],
	run: async (bot, interaction) => {
		const sub = interaction.options.getSubcommand();
		if(sub === "get") {
			const user = interaction.options.getOption("user") || interaction.author;
			const points = points.getPoints(user.id, interaction.guild.id);
			const embed = new MessageEmbed();
			embed.setTitle(`${user.username}'s points`);
			embed.setFooter("SongGuesser");
			embed.setColor([0, 230, 0]);
			embed.addField("Global", points.global, true);
			embed.addField("Guild", points.guildpoints, true);
			interaction.reply({ embeds: [embed] });
		} else if(sub === "top") {
			const global = interaction.options.getBoolean("global") || false;
			const top = global ? points.getTopList() : points.getTopList(interaction.guild.id);
			const embed = new MessageEmbed();
			embed.setTitle("Top list for " + (global ? "all guilds" : interaction.guild.name));
			embed.setFooter("SongGuesser");
			embed.setColor([0, 230, 0]);
			embed.addFields(top.map(u => {
				const id = u[0];
				const points = u[1];
				const user = bot.users.cache.get(id);
				return {
					name: `${user ? user.username : "Unknown"}`,
					value: `${points} points`,
				};
			}));
			interaction.reply({ embeds: [embed] });
		}
	}
}