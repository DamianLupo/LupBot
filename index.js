const discord= require('discord.js'); ///llamamos la libreria de discord
const { Client, Collection } = require('discord.js'); ///los eventos de discord
const client = new Client({ intents: 53608447 }); ///Datos y eventos que mi bot de discord necesita 
require('dotenv').config();
const musicClient = require ("./Music/musicClient")
musicClient(client);
const {loadSlash} = require("./handlers/slashHandler")
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");

client.slashCommands = new Collection()
client.on("interactionCreate", async (interaction) => {
    if(!interaction.isCommand())return;               ///Si el usuario no utiliza / no se ejecuta el codigo
    const cmd = client.slashCommands.get(interaction.commandName);     ///Obtengo el comando
    if(!cmd)return;
    const args = [];
    for(let option of interaction.options.data){
        if(option.type === 1)      
        {
            if(option.name) args.push(option.name);
            option.option?.forEach((x)=>{
                if(x.value) args.push(x.value);           ///Escuchamos un evento cuando el usuario utiliza / y ejecuta un comando
            })
            
        }
        else if(option.value) args.push(option.value);
    }
    cmd.execute(client,interaction, args);  ///Ejecuto el comando
});



client.once("ready", async ()=>{
    await loadSlash(client)
    .then(()=>{
        console.log("Comandos cargados correctamente");
    })
    .catch((err)=>{
        console.error("ERROR AL CARGAR LOS SLASH ${err}");
    })
    console.log(`Me encendi como:  ${client.user.tag}`); ///Mensaje que dara el bot cada que se prenda
});
(async () => {
    try {
        await client.login(process.env.DISCORD_TOKEN);
    } catch (err) {
        console.error(`ERROR AL INICIAR EL BOT: ${err}`);
    }
})(); ///Inicia sesion en discord

