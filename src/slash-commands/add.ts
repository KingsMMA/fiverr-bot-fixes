import { channelMention, GuildMember, SlashCommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("add")
        .setDescription("add dobby points to a designated user | mods-only")
        .addIntegerOption((option) =>
            option.setName("amount").setDescription("the amount of dobby points").setRequired(true).setMinValue(1)
        )
        .addUserOption((option) => option.setName("user").setDescription("the designated user").setRequired(true)),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { commandsChannelID, teamRoleID } = settings!;
            const amount = interaction.options.getInteger("amount", true);
            const user = interaction.options.getUser("user", true);
            const channel = interaction.channel as TextChannel;
            const member = interaction.member as GuildMember;

            if (channel.id !== commandsChannelID) {
                throw Error(`You can only use this command in ${channelMention(commandsChannelID)}!`);
            }

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            const discordID = user.id;
            const discordTag = user.tag;

            await prisma.player.upsert({
                where: {
                    discordID
                },
                create: {
                    discordID,
                    discordTag,
                    dobbyPoints: amount
                },
                update: {
                    discordTag,
                    dobbyPoints: { increment: amount }
                }
            });

            const content = `${userMention(interaction.user.id)} added ${amount} ${POINTS_EMOJI} to ${userMention(
                discordID
            )}!`;
            await interaction.editReply({ content });
            await log({
                title: "Dobby Points Added",
                content,
                color: "Green"
            });
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
