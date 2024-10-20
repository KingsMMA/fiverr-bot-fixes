import { channelMention, EmbedBuilder, SlashCommandBuilder, TextChannel } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("points")
        .setDescription("view your dobby points!")
        .addUserOption((option) => option.setName("user").setDescription("the designated user")),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { commandsChannelID } = settings!;
            const target = interaction.options.getUser("user");
            const user = target ?? interaction.user;
            const channel = interaction.channel as TextChannel;
            const guild = interaction.guild!;
            const member = await guild.members.fetch(user.id);

            // checks if channel is valid
            if (channel.id !== commandsChannelID) {
                throw Error(`You can only use this command in ${channelMention(commandsChannelID)}!`);
            }

            const discordID = user.id;
            const discordTag = user.tag;

            const player = await prisma.player.upsert({
                where: { discordID },
                create: { discordID, discordTag },
                update: { discordTag }
            });

            const embed = new EmbedBuilder()
                .setColor("Random")
                .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
                .addFields(
                    { name: "Points", value: `\`${player.dobbyPoints}\` ${POINTS_EMOJI} points`, inline: true },
                    { name: "Check-in Streak", value: `\`${player.checkinStreak}\` days`, inline: true }
                );

            await interaction.editReply({ embeds: [embed] });
        } catch (err: unknown) {
            const error = err as string;
            await interaction
                .editReply({
                    content: `${error}`
                })
                .catch(console.error);

            await delay(5000);
            await interaction.deleteReply().catch(console.error);
            return;
        }
    }
};

export default command;
