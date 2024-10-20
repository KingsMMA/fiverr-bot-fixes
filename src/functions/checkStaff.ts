import { GuildMember } from "discord.js";

export default function checkStaff(member: GuildMember, teamRoleID: string) {
    const isStaff = member.roles.cache.has(teamRoleID);
    return isStaff;
}
