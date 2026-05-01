import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDateMcpServer } from "./server.js";

const server = createDateMcpServer("Asia/Tokyo");
const transport = new StdioServerTransport();

// ★ connect() が自動で start() を呼ぶので、これだけで OK
server.connect(transport);
