import { PrismaClient } from "@prisma/client";
import { Collection, Guild, Message, Snowflake, TextChannel } from "discord.js";
import buildCheckinEmbed from "./buildCheckinEmbed";
import log from "../utils/log";

export default async function resetCheckins(prisma: PrismaClient, guild: Guild) {
    return new Promise<void>(async (resolve) => {
        const settings = await prisma.setting.findFirst();
        const { checkinChannelID } = settings!;
        // delete all messages in checkin channel
        const channel = (await guild.channels.fetch(checkinChannelID)) as TextChannel;
        let fetched: Collection<Snowflake, Message>;
        do {
            const messages = await channel.messages.fetch({ limit: 100 });
            fetched = messages;
            await Promise.allSettled(messages.map((m) => m.delete()));
        } while (fetched.size >= 2);

        // send check-in message
        const embed = await buildCheckinEmbed(prisma);
        await channel.send({ embeds: [embed] });

        const totalPlayerCount = await prisma.player.count();

        // find players that are idle
        const idlePlayerCount = await prisma.player.count({
            where: {
                isCheckedIn: false,
                checkinStreak: 0
            }
        });

        // reset players that did not check in today, and reset their streak
        const notCheckedinPlayers = await prisma.player.updateMany({
            where: { isCheckedIn: false, checkinStreak: { gt: 0 } },
            data: { checkinStreak: 0 }
        });

        // reset players that have checked in today
        const checkedinPlayers = await prisma.player.updateMany({
            where: { isCheckedIn: true },
            data: { isCheckedIn: false }
        });

        const content = `
**${checkedinPlayers.count}/${totalPlayerCount}** players checked in yesterday and have increased their progress +1
**${notCheckedinPlayers.count}/${totalPlayerCount}** failed to check in yesterday and reset their progress back to 0
**${idlePlayerCount}/${totalPlayerCount}** players are idle and also did not check in yesterday`;
        await log({ title: "Check-in Reset", content, color: "Purple" });
        return resolve();
    });
}
