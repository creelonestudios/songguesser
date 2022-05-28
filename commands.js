import { readdirSync } from "fs";

export async function load(bot) {
  bot.commands = await loadCommands();
}

export async function loadCommands() {
  let commands = {};
  const files = readdirSync("./commands/")
  for(const file of files) {
    console.log("[Commands] Loading command: " + file);
    const command = (await import(`./commands/${file}`)).default;
    commands[command.name] = command;
  }
  return commands;
}

export function register(bot) {
  bot.on("interactionCreate", async interaction => {
    if(!interaction.isCommand()) return;
    if(bot.commands[interaction.commandName]) {
      if(bot.commands[interaction.commandName].guildOnly && !interaction.guildId) return interaction.reply(":x: This command can only be used in a guild.");
      if(bot.commands[interaction.commandName].perms) {
        if(typeof bot.commands[interaction.commandName].perms === "string" && !interaction.member.permissions.has(bot.commands[interaction.commandName].perms)) return interaction.reply({ content: `:x: You need the following permission to execute this command: ${bot.commands[interaction.commandName].perms}`, ephemeral: true });
        for(const perm of bot.commands[interaction.commandName].perms) {
          if(!interaction.member.permissions.has(perm)) return interaction.reply({ content: `:x: You need the following permission to execute this command: ${perm}`, ephemeral: true });
        }
      }
      try {
        console.log(`[${interaction.user.username}] /${interaction.commandName}`);
        await bot.commands[interaction.commandName].run(bot, interaction);
      } catch (error) {
        console.error(error);
        interaction.reply({ content: ":woozy_face: There was an error executing that command.", ephemeral: true });
      }
    } else {
      console.error("[Commands] Unknown command received: " + interaction.commandName);
      interaction.reply({ content: ":woozy_face: I don't know of that command.", ephemeral: true });
    }
  });
}