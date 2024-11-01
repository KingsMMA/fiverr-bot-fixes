import { ComponentType, GuildMember, StringSelectMenuInteraction, TextChannel, userMention } from "discord.js";
import buildShopMenu from "../functions/buildShopMenu";
import { Button } from "../types";
import insufficientText from "../functions/insufficientText";
import log from "../utils/log";

const button: Button = {
    name: `shop`,
    async execute(interaction) {
        const msg = await interaction.deferReply({ ephemeral: true, fetchReply: true });
        const prisma = interaction.client.prisma;
        const component = await buildShopMenu(prisma);
        await interaction.editReply({ components: [component] });

        const settings = await prisma.setting.findFirst();
        const { lectureChannelID, staffCHannelID, checkinChannelID } = settings!;

        const discordID = interaction.user.id;
        const discordTag = interaction.user.tag;

        const guild = interaction.guild!;
        const member = interaction.member as GuildMember;

        const player = await prisma.player.upsert({
            where: { discordID },
            create: { discordID, discordTag },
            update: { discordTag }
        });

        const filter = (i: StringSelectMenuInteraction) => i.user.id == interaction.user.id;
        const collector = msg.createMessageComponentCollector({
            filter,
            time: 60 * 1000,
            componentType: ComponentType.StringSelect
        });

        collector.on("collect", async (i: StringSelectMenuInteraction) => {
            await i.deferUpdate();
            collector.stop("bought");

            const value = parseInt(i.values[0]);

            const item = await prisma.item.findUnique({ where: { id: value } });

            if (!item) {
                await i.editReply({ content: "Item not found!" }).catch(console.error);
                return;
            }

            if (player.dobbyPoints < item.price) {
                interaction
                    .editReply({
                        content: insufficientText(discordID, checkinChannelID, lectureChannelID),
                        components: []
                    })
                    .catch(console.error);
                return;
            }

            await prisma.player.update({
                where: { discordID },
                data: { dobbyPoints: { decrement: item.price } }
            });

            if (item.role) {
                await member.roles.add(item.role).catch(async () => {
                    await log({
                        title: "Role Reward Failed",
                        content: `Failed to give role reward to ${userMention(discordID)}`,
                        color: "Red"
                    });
                });
            }

            const userContent = `${userMention(discordID)},\n${item.userMessage}`;
            await interaction.editReply({ content: userContent, components: [] }).catch(console.error);

            const staffContent = `${item.staffPing}\n${item.staffMessage}\n${userMention(
                discordID
            )} | \`${discordID}\` | \`@${discordTag}\`\n${userContent}`;
            const staffChannel = (await guild.channels.fetch(staffCHannelID)) as TextChannel;
            await staffChannel.send({ content: staffContent }).catch(console.error);

            await log({ title: `${item.title} Bought`, content: staffContent, color: "Green" });
        });

        collector.on("end", (collected, reason) => {
            if (reason == "time") {
                interaction
                    .editReply({
                        content: `You failed to select an item in time.`,
                        components: []
                    })
                    .catch(console.error);
            }
        });
    }
};

export default button;
