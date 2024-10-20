import { GuildMember, SlashCommandBuilder, SlashCommandSubcommandBuilder, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("edit")
        .setDescription("edit bot system settings | mods-only")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`check_in`)
                .setDescription(`edit check-in settings | mods-only`)
                .addIntegerOption((option) =>
                    option.setName("amount").setDescription("the reward per check-in").setRequired(true).setMinValue(1)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("length")
                        .setDescription("the minimum character length of the check-in message")
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("days")
                        .setDescription("the number of days to get special role")
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addRoleOption((option) => option.setName("role").setDescription("the special role").setRequired(true))
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`lecture`)
                .setDescription(`edit lecture settings | mods-only`)
                .addIntegerOption((option) =>
                    option.setName("amount").setDescription("the reward per claim").setRequired(true).setMinValue(1)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`daily`)
                .setDescription(`toggle daily check-in reset | mods-only`)
        ),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { teamRoleID } = settings!;

            const member = interaction.member as GuildMember;

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            const subcommand = interaction.options.getSubcommand();
            if (subcommand === "check_in") {
                const checkinRewards = interaction.options.getInteger("amount", true);
                const checkinMinimumMsgLength = interaction.options.getInteger("length", true);
                const checkinTargetCount = interaction.options.getInteger("days", true);
                const checkinTargetRole = interaction.options.getRole("role", true);
                const checkinTargetRoleID = checkinTargetRole.id;

                await prisma.setting.update({
                    where: {
                        id: 1
                    },
                    data: {
                        checkinRewards,
                        checkinMinimumMsgLength,
                        checkinTargetCount,
                        checkinTargetRoleID
                    }
                });

                const content = `${userMention(
                    interaction.user.id
                )} updated the following settings:\n\n \`${checkinRewards}\` ${POINTS_EMOJI} per check-in, \`${checkinMinimumMsgLength}\` minimum message length, \`${checkinTargetCount}\` days to get special role, \`${checkinTargetRoleID}\` special role`;
                await interaction.editReply({
                    content
                });
                await log({ title: "Check-in Edited", content, color: "Orange" });
            } else if (subcommand === "daily") {
                let settings = await prisma.setting.findFirst();
                settings = await prisma.setting.update({
                    where: {
                        id: settings!.id
                    },
                    data: {
                        resetCheckins: !settings!.resetCheckins
                    }
                });

                const content = `${userMention(interaction.user.id)} ${
                    settings.resetCheckins ? "enabled" : "disabled"
                } daily check-in reset!`;
                await interaction.editReply({
                    content
                });
                await log({ title: "Daily Check-in Reset Updated", content, color: "Orange" });
            } else if (subcommand === "lecture") {
                const lectureRewards = interaction.options.getInteger("amount", true);
                await prisma.setting.update({
                    where: {
                        id: 1
                    },
                    data: {
                        lectureRewards
                    }
                });

                const content = `${userMention(
                    interaction.user.id
                )} updated the following settings:\n\n \`${lectureRewards}\` ${POINTS_EMOJI} per lecture`;
                await interaction.editReply({
                    content
                });
                await log({ title: "Lecture Edited", content, color: "Orange" });
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
