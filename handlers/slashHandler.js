const { readdirSync } = require("fs");

module.exports = {
  async loadSlash(client) {
    for (const category of readdirSync("./slashcommands")) {
      for (const otherCategory of readdirSync(`./slashcommands/${category}`)) {
        for (const fileName of readdirSync(`./slashcommands/${category}/`)
          .filter((file) => file.endsWith(".js"))) { 

          const command = require(`../slashcommands/${category}/${fileName}`);
          client.slashCommands.set(command.name, command);
        }                                                         ///Cargo los comandos de subcarpetas, si no tienen .js los ignoro y los registro en ds
      }
    }

    await client.application?.commands.set(
      client.slashCommands.map((x) => x)
    );
  }
};
