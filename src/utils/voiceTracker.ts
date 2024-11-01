import { Client, VoiceState } from "discord.js";
import log from "./log";

const activeTrackers = new Map<number, Set<string>>();

export function startVoiceTracking(eventId: number, channelId: string, client: Client) {
    activeTrackers.set(eventId, new Set());

    const handleVoiceUpdate = async (oldState: VoiceState, newState: VoiceState) => {
        const tracker = activeTrackers.get(eventId);
        if (!tracker) return;

        const userId = newState.member!.id;
        const userTag = newState.member!.user.tag;

        if (newState.channelId === channelId && oldState.channelId !== channelId) {
            if (!tracker.has(userId)) {
                tracker.add(userId);
                await client.prisma.eventAttendee.create({
                    data: {
                        eventId,
                        userId,
                        userTag,
                        joinTime: new Date()
                    }
                });

                await client.prisma.event.update({
                    where: { id: eventId },
                    data: { attendeeCount: tracker.size }
                });

                await log({
                    title: "Event Attendance",
                    content: `${userTag} joined the event (ID: ${eventId})`,
                    color: "Green"
                });
            }
        }

        if (oldState.channelId === channelId && newState.channelId !== channelId) {
            await client.prisma.eventAttendee.updateMany({
                where: {
                    eventId,
                    userId,
                    leaveTime: null
                },
                data: { leaveTime: new Date() }
            });

            await log({
                title: "Event Attendance",
                content: `${userTag} left the event (ID: ${eventId})`,
                color: "Yellow"
            });
        }
    };

    client.on("voiceStateUpdate", handleVoiceUpdate);
}

export function stopVoiceTracking(eventId: number) {
    activeTrackers.delete(eventId);
}
