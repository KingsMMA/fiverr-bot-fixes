import { channelMention, GuildMember, SlashCommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import log from "../utils/log";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("streak")
        .setDescription("set daily check-in streak of designated user | mods-only")
        .addIntegerOption((option) =>
            option.setName("streak").setDescription("the daily check-in streak").setRequired(true).setMinValue(1)
        )
        .addUserOption((option) => option.setName("user").setDescription("the designated user").setRequired(true)),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { commandsChannelID, teamRoleID } = settings!;
            const checkinStreak = interaction.options.getInteger("streak", true);
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
                    checkinStreak,
                    isCheckedIn: false
                },
                update: {
                    discordTag,
                    checkinStreak,
                    isCheckedIn: false
                }
            });

            const content = `${userMention(interaction.user.id)} changed ${userMention(
                discordID
            )}'s streak to ${checkinStreak}!`;
            await interaction.editReply({ content });
            await log({
                title: "Streak Changed",
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
