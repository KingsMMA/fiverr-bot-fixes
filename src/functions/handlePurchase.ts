import { PrismaClient } from "@prisma/client";
import { User } from "discord.js";

export default function handlePurchase(user: User, prisma: PrismaClient, price: number, item: string) {
    return new Promise<void>(async (resolve) => {});
}
