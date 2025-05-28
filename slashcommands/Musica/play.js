const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  name: "play",
  description: "Comando para ejecutar música en el chat de voz en el que estés",
  options: [
    {
      name: "query",
      description: "Nombre o link de la canción",
      type: 3, // STRING
      required: true,
    },
  ],

  async execute(client, interaction) {
    // ─── 0) Intentamos hacer deferReply lo antes posible ───
    let didDefer = false;
    try {
      // No usamos { ephemeral: true } porque queremos mostrar la lista visible en canal
      await interaction.deferReply();
      didDefer = true;
    } catch (deferError) {
      // Si falla el defer (por ejemplo, interacción expirada), intentamos enviar un reply directo
      console.error("⚠️ No pudimos deferir la interacción:", deferError);
      try {
        return await interaction.reply({
          content: "❌ No pude procesar tu comando a tiempo. Intenta de nuevo.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        console.error("⚠️ Tampoco pudimos enviar un reply tras el fallo de defer:", replyError);
        // No podemos hacer nada más si ni defer ni reply funcionan
        return;
      }
    }

    try {
      // ─── 1) Obtenemos y validamos la query ───
      const queryRaw = interaction.options.getString("query");
      const query = queryRaw ? queryRaw.trim() : "";
      if (!query) {
        // Al haber deferido, usamos editReply
        return await interaction.editReply("Necesito sí o sí el nombre o el link del tema.");
      }

      // ─── 2) Verificamos que el usuario esté en un canal de voz ───
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return await interaction.editReply("Primero conéctate a un canal de voz, mi rey!");
      }

      // ─── 3) Distinguir URL directa vs texto de búsqueda ───
      const isUrl = /^(https?:\/\/)/.test(query);
      if (isUrl) {
        // ─── 3.A) Si es URL, reproducimos directamente ───
        try {
          await client.distube.play(voiceChannel, query, {
            member: interaction.member,
            textChannel: interaction.channel,
          });
          return await interaction.editReply(`🎶 Reproduciendo enlace directo: \`${query}\``);
        } catch (playError) {
          console.error("❌ Error al reproducir URL directa:", playError);
          return await interaction.editReply("❌ Ocurrió un error al intentar reproducir la canción.");
        }
      }

      // ─── 3.B) Si no es URL, hacemos búsqueda en YouTube (5 resultados) ───
      let results;
      try {
        // En v5.0.7, `search()` está disponible si tienes el plugin YtDlpPlugin
        results = await client.distube.search(query, {
          limit: 5,
          type: "video",
          safeSearch: false,
        });
      } catch (searchError) {
        console.error("❌ Error al buscar en YouTube:", searchError);
        // Si Distube arroja NO_RESULT o cualquier otro error al buscar, informamos y salimos
        const isNoResult = searchError?.errorCode === "NO_RESULT";
        if (isNoResult) {
          return await interaction.editReply(`❌ No encontré ninguna canción para “${query}”.`);
        } else {
          return await interaction.editReply("❌ Ocurrió un error al buscar la canción.");
        }
      }

      // Si no hubo resultados o el arreglo está vacío
      if (!results || results.length === 0) {
        return await interaction.editReply(`❌ No encontré ninguna canción para “${query}”.`);
      }

      // ─── 4) Construimos el embed con las 5 opciones ───
      const embed = new EmbedBuilder()
        .setTitle(`Resultados de búsqueda para: "${query}"`)
        .setDescription(
          results
            .map(
              (song, i) =>
                `**${i + 1}.** [${song.name}](${song.url}) – \`${song.formattedDuration}\``
            )
            .join("\n")
        )
        .setFooter({ text: "Escribe un número del 1 al 5 en el chat (30s) para elegir" });

      // Mostramos la lista en el canal
      await interaction.editReply({ embeds: [embed] });

      // ─── 5) Creamos un collector para que el usuario elija del 1 al 5 ───
      const filter = (m) =>
        m.author.id === interaction.user.id && /^[1-5]$/.test(m.content.trim());
      const collector = interaction.channel.createMessageCollector({
        filter,
        max: 1,
        time: 30000, // 30 segundos para elegir
      });

      let collectedOne = false;
      collector.on("collect", async (m) => {
        collectedOne = true;
        collector.stop(); // Cancelamos la escucha

        const choice = parseInt(m.content.trim(), 10);
        const selectedSong = results[choice - 1];
        if (!selectedSong) {
          return interaction.followUp("❌ Opción inválida. Se canceló la búsqueda.");
        }

        // Intentamos reproducir la canción elegida
        try {
          await client.distube.play(voiceChannel, selectedSong.url, {
            member: interaction.member,
            textChannel: interaction.channel,
          });
          return interaction.followUp(
            `🎶 Reproduciendo: **${selectedSong.name}** – \`${selectedSong.formattedDuration}\``
          );
        } catch (playError) {
          console.error("❌ Error al reproducir la opción elegida:", playError);
          return interaction.followUp(
            "❌ Ocurrió un error al intentar reproducir la canción seleccionada."
          );
        }
      });

      collector.on("end", (_, reason) => {
        if (!collectedOne) {
          // Se agotaron los 30s sin respuesta del usuario
          interaction.followUp("⚠️ Se agotó el tiempo (30s). Búsqueda cancelada.");
        }
      });
    } catch (unexpectedError) {
      console.error("❌ Error inesperado en el comando /play:", unexpectedError);
      // Si ya deferimos, usamos editReply; si no, usamos reply
      if (didDefer) {
        try {
          return await interaction.editReply(
            "❌ Ocurrió un error al intentar reproducir la canción."
          );
        } catch {
          // Ignoramos si también falla editReply
          return;
        }
      } else {
        try {
          return await interaction.reply({
            content: "❌ Ocurrió un error al intentar reproducir la canción.",
            flags: MessageFlags.Ephemeral,
          });
        } catch {
          return;
        }
      }
    }
  },
};