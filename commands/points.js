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
      type: 2,
      name: "top",
    	description: "View the top list",
      options: [
        {
          type: 1,
          name: "global",
          description: "View the global top list"
        },
        {
          type: 1,
          name: "guild",
          description: "View the top list of this guild"
        }
      ]
    }
	],
	run: async (bot, interaction) => {
		const sub = interaction.options.getSubcommand();
		if(sub === "get") {
			const user = interaction.options.getUser("user") || interaction.user;
			const point = points.getPoints(user.id, interaction.guild.id);
			console.log(point);
			const embed = new MessageEmbed();
			embed.setTitle(`${user.username}'s points`);
			embed.setFooter("SongGuesser");
			embed.setColor("YELLOW");
			embed.addField("Global", point.global + " points", true);
			embed.addField("Guild", point.guildpoints + " points", true);
			interaction.reply({ embeds: [embed] });
		} else if(sub === "guild" || sub === "global") {
			const global = sub === "global";
			if(!interaction.guild && !global) {
				interaction.reply("You can only view the guild top list in a guild");
				return;
			}
			const top = global ? points.getTopList() : points.getTopList(interaction.guild.id);
			const embed = new MessageEmbed();
			embed.setTitle("Top list for " + (global ? "all guilds" : interaction.guild.name));
			embed.setFooter("SongGuesser");
			embed.setColor("#3cbd9b");
			embed.addFields(top.map(u => {
				const id = u[0];
				const point = u[1];
				const user = bot.users.cache.get(id);
				return {
					name: `${user ? user.username : "Unknown"}`,
					value: `${point} points`,
				};
			}));
			interaction.reply({ embeds: [embed] });
		}
	}
}