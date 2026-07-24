#!/usr/bin/env node
import { McpProxy } from "./index";

const gatewayUrl = process.env.CORTEXSHIELD_GATEWAY_URL;
const apiKey = process.env.CORTEXSHIELD_API_KEY;

if (!gatewayUrl || !apiKey) {
  console.error("Missing required environment variables: CORTEXSHIELD_GATEWAY_URL, CORTEXSHIELD_API_KEY");
  process.exit(1);
}

const proxy = new McpProxy(gatewayUrl, apiKey);
proxy.startStdio();
