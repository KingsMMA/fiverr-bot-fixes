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
        const { lecturechannelid, staffchannelid, checkinchannelid } = settings!;

        const discordid = interaction.user.id;
        const discordtag = interaction.user.tag;

        const guild = interaction.guild!;
        const member = interaction.member as GuildMember;

        const player = await prisma.player.upsert({
            where: { discordid },
            create: { discordid, discordtag },
            update: { discordtag }
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
                        content: insufficientText(discordid, checkinchannelid, lecturechannelid),
                        components: []
                    })
                    .catch(console.error);
                return;
            }

            await prisma.player.update({
                where: { discordtag },
                data: { dobbypoints: { decrement: item.price } }
            });

            if (item.role) {
                await member.roles.add(item.role).catch(async () => {
                    await log({
                        title: "Role Reward Failed",
                        content: `Failed to give role reward to ${userMention(discordid)}`,
                        color: "Red"
                    });
                });
            }

            const userContent = `${userMention(discordid)},\n${item.userMessage}`;
            await interaction.editReply({ content: userContent, components: [] }).catch(console.error);

            const staffContent = `${item.staffPing}\n${item.staffMessage}\n${userMention(
                discordid
            )} | \`${discordid}\` | \`@${discordtag}\`\n${userContent}`;
            const staffChannel = (await guild.channels.fetch(staffchannelid)) as TextChannel;
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
