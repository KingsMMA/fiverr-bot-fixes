import {
    cleanContent,
    GuildMember,
    roleMention,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    TextChannel,
    userMention
} from "discord.js";
import { SlashCommand } from "../types";
import checkStaff from "../functions/checkStaff";
import log from "../utils/log";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("item")
        .setDescription("manage shop items | mods-only")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`create`)
                .setDescription(`create a shop item | mods-only`)
                .addIntegerOption((option) =>
                    option.setName("id").setDescription("the item id").setRequired(true).setMinValue(1).setMaxValue(25)
                )
                .addStringOption((option) => option.setName("name").setDescription("the item name").setRequired(true))

                .addIntegerOption((option) =>
                    option.setName("price").setDescription("the item price").setRequired(true).setMinValue(1)
                )
                .addStringOption((option) =>
                    option.setName("user_message").setDescription("the item user_message").setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName("staff_ping").setDescription("the item user_message").setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName("staff_message").setDescription("the item staff_message").setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName("description").setDescription("the item description").setRequired(false)
                )
                .addRoleOption((option) =>
                    option.setName("role").setDescription("the item role reward").setRequired(false)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`delete`)
                .setDescription(`delete a shop item | mods-only`)
                .addIntegerOption((option) =>
                    option.setName("id").setDescription("the item id").setRequired(true).setMinValue(1).setMaxValue(25)
                )
        ),
    execute: async (interaction) => {
        await interaction.deferReply();
        const prisma = interaction.client.prisma;
        const settings = await prisma.setting.findFirst();
        const channel = interaction.channel as TextChannel;
        const { teamRoleID } = settings!;
        const member = interaction.member as GuildMember;

        const isStaff = checkStaff(member, teamRoleID);
        if (!isStaff) {
            throw Error(`You are not allowed to use this command!`);
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === `create`) {
            const id = interaction.options.getInteger("id", true);
            const name = interaction.options.getString("name", true);
            const title = cleanContent(name, channel);
            const price = interaction.options.getInteger("price", true);
            const userMessage = interaction.options.getString("user_message", true);
            const staffPing = interaction.options.getString("staff_ping", true);
            const staffMessage = interaction.options.getString("staff_message", true);
            const description = interaction.options.getString("description", false);
            const roleReward = interaction.options.getRole("role", false);
            const role = roleReward?.id ?? null;

            await prisma.item.upsert({
                where: { id },
                create: {
                    id,
                    name,
                    title,
                    description,
                    role,
                    price,
                    userMessage,
                    staffPing,
                    staffMessage
                },
                update: {
                    name,
                    title,
                    description,
                    role,
                    price,
                    userMessage,
                    staffPing,
                    staffMessage
                }
            });

            const content = `
${userMention(interaction.user.id)} created/updated a shop item:
**ID:** ${id}
**Name:** ${name}
**Price:** ${price}
**User Message:** ${userMessage}
**Staff Ping:** ${staffPing}
**Staff Message:** ${staffMessage}
**Description:** ${description ?? "None"}
**Role Reward:** ${roleReward ? `${roleMention(roleReward.id)}` : "None"}`;
            await interaction.editReply({ content });
            await log({ title: "Shop Item Created/Updated", content, color: "Green" });
        } else if (subcommand === `delete`) {
            const id = interaction.options.getInteger("id", true);
            await prisma.item.deleteMany({ where: { id } });
            const content = `${userMention(interaction.user.id)} deleted a shop item ID: ${id}`;
            await interaction.editReply({ content });
            await log({ title: "Shop Item Deleted", content, color: "Green" });
        }
    }
};

export default command;
