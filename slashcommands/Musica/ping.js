const {EmbedBuilder} = require("discord.js")

module.exports = {
    name: "ping",
    description: "Comando para averiguar el ping",
    async execute(Client,interaction,args) {
        let ping = Date.now() - interaction.createdTimestamp
        const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(`Pong, tu Ping es de: ${ping}`)
        interaction.reply({embeds: [embed]})
    }
}