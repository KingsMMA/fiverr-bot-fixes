import { Client, Guild, TextChannel } from "discord.js";
import { BotEvent } from "../types";
import setActivity from "../functions/setActivity";
import { CronJob } from "cron";
import { buildCheckinLeaderboardEmbed, buildPointsLeaderboardEmbed } from "../functions/buildLeaderboardEmbed";
import { PrismaClient } from "@prisma/client";
import resetCheckins from "../functions/resetCheckins";

declare module "discord.js" {
    interface Client {
        resetCheckinsJob?: CronJob;
    }
}

const event: BotEvent = {
    name: "ready",
    once: true,
    execute: async (client: Client) => {
        console.log(`${client.chalk.green("[events/ready]:")} ready! logged in as ` + client.user!.tag);
        console.log(
            `${client.chalk.green("[events/ready]:")} currently online at ` + client.guilds.cache.size + ` servers`
        );
        await setActivity(client);

        const prisma = client.prisma;
        const guild = await client.guilds.fetch(process.env.GUILD_ID);

        const settings = await prisma.setting.findFirst();
        const { checkinChannelID, shopMessageID } = settings!;
        client.cache.set("checkinChannelID", checkinChannelID);
        client.cache.set("shopMessageID", shopMessageID);

        console.log('Scheduling job:')
        const job = new CronJob(
            "0 8 * * *",
            async () => {
                try {
                    console.log("Job called.");
                    console.log("Job called > A");
                    console.log("Job called > B");
                    console.log("Job called > C");
                    await resetCheckins(prisma, guild);
                    console.log("Job called > D");
                    console.log("Job called > E");
                } catch (e) {
                    console.error("Cron job error")
                    console.error(e)
                    console.error("Cron job error:", e)
                }
            },
            null,
            true,
            "America/New_York"
        );
        client.resetCheckinsJob = job;
        console.log('Job should be started.');
    }
};

export default event;
