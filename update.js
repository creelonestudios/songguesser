import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import config from "./config.json" assert {type: "json"};
import { loadCommands } from "./commands.js";
import { writeFileSync } from "fs";
const commands = [];

function removeDevs(opts) {
	const remove = [];
	for(const option of opts) {
		console.log(option);
		if(option.options) removeDevs(option.options)
		if(option.dev) {
			remove.push({arr: opts, opt: option});
		}
	}
	for(const rm of remove) {
		rm.arr.splice(rm.opt, 1);
	}
}

(async () => {
	const cmds = await loadCommands();

	for(const command of Object.values(cmds)) {
		const opts = {
			name: command.name,
			description: command.description,
			options: command.options || []
		};
		if(opts.disabled) continue;
		
		if(!process.argv.includes("dev")) removeDevs(opts.options);

		commands.push(opts);
	}
	// writeFileSync("a", JSON.stringify(commands, null, 2));

	const rest = new REST({ version: "9" }).setToken(config.token);

	const CLIENT_ID = config.client_id;
	const GUILD_ID = config.guild_id;

	try {
		console.log("Started refreshing application (/) commands.");

		if(GUILD_ID) {
			console.log("Guild ID found, only refreshing commands for that guild. Dont set GUILD_ID in secrets.json if you want to refresh commands for all guilds.");
			await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
		} else {
			await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
		}

		console.log("Successfully reloaded application (/) commands.");
	} catch (error) {
		console.error(error);
	}
})();
