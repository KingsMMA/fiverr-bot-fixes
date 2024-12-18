import { PrismaClient } from "@prisma/client";
import { Collection, Guild, Message, Snowflake, TextChannel } from "discord.js";
import buildCheckinEmbed from "./buildCheckinEmbed";
import log from "../utils/log";

export default async function resetCheckins(prisma: PrismaClient, guild: Guild) {
    return new Promise<void>(async (resolve) => {
        const settings = await prisma.setting.findFirst();

        if (!settings) {
            return resolve();
        }

        const channel = (await guild.channels.fetch(settings.checkinchannelid)) as TextChannel;
        let fetched: Collection<Snowflake, Message>;

        do {
            const messages = await channel.messages.fetch({ limit: 100 });
            fetched = messages;
            await Promise.allSettled(messages.map((m) => m.delete()));
        } while (fetched.size >= 2);

        const embed = await buildCheckinEmbed(prisma);
        await channel.send({ embeds: [embed] });

        const totalPlayerCount = await prisma.player.count();

        const idlePlayerCount = await prisma.player.count({
            where: {
                isCheckedIn: false,
                checkinStreak: 0
            }
        });

        const playersToReset = await prisma.player.findMany({
            where: { ischeckedin: false, checkinstreak: { gt: 0 } },
            select: {
                discordid: true,
                checkinstreak: true
            }
        });

        const notCheckedinPlayers = await prisma.player.updateMany({
            where: { ischeckedin: false, checkinstreak: { gt: 0 } },
            data: {
                checkinstreak: 0,
                previousstreak: playersToReset[0]?.checkinstreak ?? 0
            }
        });

        const checkedinPlayers = await prisma.player.updateMany({
            where: { ischeckedin: true },
            data: { ischeckedin: false }
        });

        const content = `
**${checkedinPlayers.count}/${totalPlayerCount}** players checked in yesterday and have increased their progress +1
**${notCheckedinPlayers.count}/${totalPlayerCount}** failed to check in yesterday and reset their progress back to 0
**${idlePlayerCount}/${totalPlayerCount}** players are idle and also did not check in yesterday`;

        await log({ title: "Check-in Reset", content, color: "Purple" });
        return resolve();
    });
}
