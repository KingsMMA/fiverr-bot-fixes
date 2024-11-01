import { PrismaClient } from "@prisma/client";

export async function generateEventCode(prisma: PrismaClient): Promise<string> {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar looking characters
    const length = 5;
    let code: string;
    let exists: boolean;

    do {
        code = "";
        for (let i = 0; i < length; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Check if code already exists
        exists = (await prisma.event.findUnique({ where: { code } })) !== null;
    } while (exists);

    return code;
}
