import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    TextChannel,
    userMention
} from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { buildCheckinLeaderboardEmbed, buildPointsLeaderboardEmbed } from "../functions/buildLeaderboardEmbed";
import log from "../utils/log";
import buildCheckinEmbed from "../functions/buildCheckinEmbed";
import buildShopEmbed from "../functions/buildShopEmbed";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("send")
        .setDescription("send message boards | mods-only")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`leaderboard`)
                .setDescription(`send leaderboard message | mods-only`)
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(`check_in`).setDescription(`send check_in message | mods-only`)
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(`shop`).setDescription(`send shop message | mods-only`)
        ),
    execute: async (interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { teamRoleID } = settings!;

            const guild = interaction.guild!;
            const member = interaction.member as GuildMember;

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === `leaderboard`) {
                const channel = interaction.channel as TextChannel;
                const pointsEmbed = await buildPointsLeaderboardEmbed(prisma);
                const checkinEmbed = await buildCheckinLeaderboardEmbed(prisma);
                const message = await channel.send({ embeds: [pointsEmbed, checkinEmbed] });
                await prisma.setting.update({
                    where: { id: 1 },
                    data: { leaderboardMessageID: message.id, leaderboardChannelID: channel.id }
                });
                const content = `${userMention(interaction.user.id)} updated the leaderboard message at ${message.url}`;
                await interaction.editReply({ content });
                await log({ title: "Leaderboard Message Updated", content, color: "Green" });
            } else if (subcommand === `check_in`) {
                const embed = await buildCheckinEmbed(prisma);
                await interaction.editReply({ embeds: [embed] });
            } else if (subcommand === `shop`) {
                const channel = interaction.channel as TextChannel;
                const { embed } = await buildShopEmbed(guild, prisma);
                const component = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop`)
                        .setLabel(`Shop`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(`⬅`)
                );
                const message = await channel.send({ embeds: [embed], components: [component] });

                const content = `${userMention(interaction.user.id)} updated the shop message at ${message.url}`;
                await interaction.editReply({ content });
                await log({ title: "Shop Message Updated", content, color: "Green" });
            }
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
