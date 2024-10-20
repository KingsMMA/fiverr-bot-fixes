import { Button } from "../types";
const button: Button = {
    name: `adddiscordid`,
    async execute(buttonInteraction) {
        await buttonInteraction.reply({ content: "Hello World!" });
        // const roleManager = buttonInteraction.member!.roles as GuildMemberRoleManager;
        // const roles = roleManager.cache;
        // if (!roles.has(staffRoleID)) {
        //     await buttonInteraction.reply({ content: `Unfortunately, you may not access this command!` });
        //     setTimeout(async () => {
        //         await buttonInteraction.deleteReply();
        //     }, 3 * 1000);
        //     return;
        // }
    }
};

export default button;
