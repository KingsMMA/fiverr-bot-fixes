import { ChannelType, EmbedBuilder, GuildMember, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { SlashCommand } from "../types";
import { startVoiceTracking, stopVoiceTracking } from "../utils/voiceTracker";
import log from "../utils/log";
import checkStaff from "../functions/checkStaff";
import { generateEventCode } from "../utils/eventCode";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("event")
        .setDescription("Manage lecture/office hour events")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("start")
                .setDescription("Start tracking a new event")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("Type of event")
                        .setRequired(true)
                        .addChoices(
                            { name: "Lecture", value: "LECTURE" },
                            { name: "Office Hours", value: "OFFICE_HOURS" }
                        )
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Voice channel for the event")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("end")
                .setDescription("End tracking current event")
                .addStringOption((option) =>
                    option
                        .setName("code")
                        .setDescription("Event code")
                        .setRequired(true)
                        .setMinLength(4)
                        .setMaxLength(6)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("View event statistics")
                .addStringOption((option) =>
                    option
                        .setName("code")
                        .setDescription("Specific event code")
                        .setRequired(false)
                        .setMinLength(4)
                        .setMaxLength(6)
                )
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("Type of event")
                        .setRequired(false)
                        .addChoices(
                            { name: "Lecture", value: "LECTURE" },
                            { name: "Office Hours", value: "OFFICE_HOURS" }
                        )
                )
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

            switch (subcommand) {
                case "start": {
                    const type = interaction.options.getString("type", true);
                    const channel = interaction.options.getChannel("channel", true) as VoiceChannel;

                    const existingEvent = await prisma.event.findFirst({
                        where: {
                            channelId: channel.id,
                            endTime: null
                        }
                    });

                    if (existingEvent) {
                        throw Error(
                            `There's already an active ${existingEvent.type.toLowerCase()} (${existingEvent.code}) in ${
                                channel.name
                            }!`
                        );
                    }

                    const code = await generateEventCode(prisma);
                    const event = await prisma.event.create({
                        data: {
                            code,
                            type: type as "LECTURE" | "OFFICE_HOURS",
                            channelId: channel.id,
                            channelName: channel.name,
                            startTime: new Date(),
                            hostId: interaction.user.id,
                            hostTag: interaction.user.tag
                        }
                    });

                    startVoiceTracking(event.id, channel.id, interaction.client);

                    const content = `Started tracking ${type.toLowerCase()} in ${
                        channel.name
                    }\nEvent Code: \`${code}\``;
                    await interaction.editReply({ content });
                    await log({
                        title: "Event Started",
                        content,
                        color: "Green"
                    });
                    break;
                }

                case "end": {
                    const code = interaction.options.getString("code", true).toUpperCase();

                    const activeEvent = await prisma.event.findFirst({
                        where: {
                            code,
                            endTime: null
                        },
                        include: {
                            attendees: {
                                orderBy: {
                                    joinTime: "asc"
                                }
                            }
                        }
                    });

                    if (!activeEvent) {
                        throw Error(`No active event found with code ${code}!`);
                    }

                    const endTime = new Date();
                    const duration = Math.round((endTime.getTime() - activeEvent.startTime.getTime()) / 60000);

                    await prisma.event.update({
                        where: { id: activeEvent.id },
                        data: {
                            endTime,
                            duration
                        }
                    });

                    stopVoiceTracking(activeEvent.id);

                    const attendeesList = activeEvent.attendees
                        .map((attendee, index) => `${index + 1}. ${attendee.userTag}`)
                        .join("\n");

                    const embed = new EmbedBuilder()
                        .setTitle(`${activeEvent.type} Event Summary (${code})`)
                        .setDescription(`Duration: ${duration} minutes\nTotal Attendees: ${activeEvent.attendeeCount}`)
                        .addFields({
                            name: "Attendees List",
                            value: attendeesList || "No attendees"
                        })
                        .setTimestamp(activeEvent.startTime)
                        .setColor("Green");

                    const content = `Ended ${activeEvent.type.toLowerCase()} in ${activeEvent.channelName}`;
                    await interaction.editReply({ content, embeds: [embed] });
                    await log({
                        title: "Event Ended",
                        content: `${content}\nCode: ${code}\n${attendeesList}`,
                        color: "Red"
                    });
                    break;
                }

                case "stats": {
                    const code = interaction.options.getString("code");
                    const type = interaction.options.getString("type");

                    if (code) {
                        const event = await prisma.event.findUnique({
                            where: { code },
                            include: {
                                attendees: {
                                    orderBy: {
                                        joinTime: "asc"
                                    }
                                }
                            }
                        });

                        if (!event) {
                            throw Error(`No event found with code ${code}!`);
                        }

                        const attendeesList = event.attendees
                            .map((attendee, index) => `${index + 1}. ${attendee.userTag}`)
                            .join("\n");

                        const embed = new EmbedBuilder()
                            .setTitle(`Event Details: ${code}`)
                            .setDescription(
                                `**Type:** ${event.type}\n` +
                                    `**Channel:** ${event.channelName}\n` +
                                    `**Host:** ${event.hostTag}\n` +
                                    `**Started:** ${event.startTime.toLocaleString()}\n` +
                                    `**Duration:** ${event.duration || "Ongoing"} minutes\n` +
                                    `**Total Attendees:** ${event.attendeeCount}`
                            )
                            .addFields({
                                name: "Attendees List",
                                value: attendeesList || "No attendees"
                            })
                            .setColor("Blue")
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });
                    } else {
                        const where = type ? { type: type as "LECTURE" | "OFFICE_HOURS" } : {};
                        const events = await prisma.event.findMany({
                            where: {
                                ...where,
                                endTime: { not: null }
                            },
                            orderBy: { startTime: "desc" },
                            take: 10
                        });

                        if (events.length === 0) {
                            throw Error("No completed events found!");
                        }

                        const embed = new EmbedBuilder()
                            .setTitle("Recent Events")
                            .setDescription(
                                events
                                    .map(
                                        (event) =>
                                            `**${event.code}** - ${event.type}\n` +
                                            `Channel: ${event.channelName}\n` +
                                            `Host: ${event.hostTag}\n` +
                                            `Date: ${event.startTime.toLocaleDateString()}\n` +
                                            `Duration: ${event.duration} mins\n` +
                                            `Attendees: ${event.attendeeCount}\n`
                                    )
                                    .join("\n")
                            )
                            .setColor("Blue")
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });
                    }
                    break;
                }
            }
        } catch (err: unknown) {
            const error = err as Error;
            await interaction
                .editReply({
                    content: error.message
                })
                .catch(console.error);
        }
    }
};

export default command;
