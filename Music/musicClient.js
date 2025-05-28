const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");

function setupMusic(client)
{
    client.distube = new DisTube(client, {
        emitNewSongOnly: true,
        plugins: [new YtDlpPlugin()],
    });
}

module.exports=setupMusic;