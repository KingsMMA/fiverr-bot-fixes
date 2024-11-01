import { ActivityType, Client } from "discord.js";

export default async function setActivity(client: Client) {
    return new Promise<void>(async (resolve, reject) => {
        try {
            const setting = await client.prisma.setting.upsert({
                where: {
                    id: 1
                },
                create: {
                    id: 1
                },
                update: {}
            });

            let activity;
            switch (setting.activityType) {
                case "Playing":
                    activity = ActivityType.Playing;
                    break;
                case "Streaming":
                    activity = ActivityType.Streaming;
                    break;
                case "Listening":
                    activity = ActivityType.Listening;
                    break;
                case "Watching":
                    activity = ActivityType.Watching;
                    break;
                case "Competing":
                    activity = ActivityType.Competing;
                    break;
            }
            await client.user!.setActivity({
                name: setting.activityName,
                type: activity
            });
            return resolve();
        } catch (err) {
            return reject(err);
        }
    });
}
