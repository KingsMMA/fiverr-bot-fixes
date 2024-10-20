export default function trimString(message: string, length: number) {
    return message.length > length ? message.substring(0, length - 3) + `...` : message;
}
