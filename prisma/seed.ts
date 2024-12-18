import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const setting = await prisma.setting.upsert({
        where: { id: 1 },
        update: {},
        create: {
            activityName: "Discord",
            activityType: "Playing"
        }
    });
    console.log({ setting });
}
main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
