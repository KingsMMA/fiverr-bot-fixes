import NodeCache from "node-cache";
const cache = new NodeCache();

cache.set("usernames", []);

export default cache;
