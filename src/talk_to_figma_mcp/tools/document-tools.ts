import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma, joinChannel } from "../utils/websocket.js";
import { filterFigmaNode } from "../utils/figma-helpers.js";

// Valid fields for scan_text_nodes field filtering
const VALID_TEXT_NODE_FIELDS = [
  "id", "name", "type", "characters", "fontSize", "fontFamily",
  "fontStyle", "x", "y", "width", "height", "path", "depth"
] as const;

/**
 * Filter text node results to only include requested fields.
 */
function filterTextNodeFields(textNodes: any[], fields?: string[]): any[] {
  if (!fields || fields.length === 0) return textNodes;
  return textNodes.map((node: any) => {
    const filtered: Record<string, any> = {};
    for (const field of fields) {
      if (field in node) {
        filtered[field] = node[field];
      }
    }
    return filtered;
  });
}

/**
 * Register document-related tools to the MCP server
 * @param server - The MCP server instance
 */
export function registerDocumentTools(server: McpServer): void {
  // Document Info Tool
  server.tool(
    "get_document_info",
    "Get detailed information about the current Figma document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_document_info");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting document info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Selection Tool
  server.tool(
    "get_selection",
    "Get information about the current selection in Figma",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_selection");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting selection: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Node Info Tool
  server.tool(
    "get_node_info",
    "Get detailed information about a specific node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to get information about"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_node_info", { nodeId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filterFigmaNode(result))
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting node info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Nodes Info Tool
  server.tool(
    "get_nodes_info",
    "Get detailed information about multiple nodes in Figma",
    {
      nodeIds: z.array(z.string()).describe("Array of node IDs to get information about")
    },
    async ({ nodeIds }) => {
      try {
        const results = await Promise.all(
          nodeIds.map(async (nodeId) => {
            const result = await sendCommandToFigma('get_node_info', { nodeId });
            return { nodeId, info: result };
          })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results.map((result) => filterFigmaNode(result.info)))
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting nodes info: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get Styles Tool
  server.tool(
    "get_styles",
    "Get all styles from the current Figma document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_styles");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting styles: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Local Components Tool
  server.tool(
    "get_local_components",
    "Get all local components from the Figma document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_local_components");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting local components: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Remote Components Tool
  server.tool(
    "get_remote_components",
    "Get available components from team libraries in Figma",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_remote_components");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting remote components: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Text Node Scanning Tool (Fix #2: 120s timeout, Fix #8: fields param)
  server.tool(
    "scan_text_nodes",
    "Scan all text nodes in the selected Figma node. Use 'fields' to reduce response size.",
    {
      nodeId: z.string().describe("ID of the node to scan"),
      fields: z.array(z.string()).optional().describe(
        "Fields to include in response. Default: all. Options: id, name, type, characters, fontSize, fontFamily, fontStyle, x, y, width, height, path, depth"
      ),
      maxDepth: z.number().optional().describe("Max depth to traverse (limits scope for large frames)"),
    },
    async ({ nodeId, fields, maxDepth }) => {
      try {
        const initialStatus = {
          type: "text" as const,
          text: "Starting text node scanning. This may take a moment for large designs...",
        };

        // Fix #2: 120s timeout instead of 30s
        const result = await sendCommandToFigma("scan_text_nodes", {
          nodeId,
          useChunking: true,
          chunkSize: 10,
          ...(maxDepth !== undefined && { maxDepth }),
        }, 120000);

        if (result && typeof result === 'object' && 'chunks' in result) {
          const typedResult = result as {
            success: boolean,
            totalNodes: number,
            processedNodes: number,
            chunks: number,
            textNodes: Array<any>
          };

          // Fix #8: Filter fields if specified
          const filteredNodes = filterTextNodeFields(typedResult.textNodes, fields);

          const summaryText = `Scan completed: Found ${typedResult.totalNodes} text nodes, processed in ${typedResult.chunks} chunks.`;

          return {
            content: [
              { type: "text" as const, text: summaryText },
              { type: "text" as const, text: JSON.stringify(filteredNodes) }
            ],
          };
        }

        // Non-chunked result
        const rawResult = result as any;
        const textNodes = rawResult?.textNodes || rawResult;
        const filteredNodes = Array.isArray(textNodes) ? filterTextNodeFields(textNodes, fields) : textNodes;

        return {
          content: [
            initialStatus,
            { type: "text", text: JSON.stringify(filteredNodes) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error scanning text nodes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Scan Text Summary Tool (Fix #4: lightweight text extraction)
  server.tool(
    "scan_text_summary",
    "Get a lightweight summary of all text in a node — returns only text content and path, no styling/position data. Much smaller response than scan_text_nodes.",
    {
      nodeId: z.string().describe("ID of the node to scan"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("scan_text_nodes", {
          nodeId,
          useChunking: true,
          chunkSize: 10,
        }, 120000) as any;

        const textNodes = result?.textNodes || [];
        const summary = textNodes.map((n: any) => ({
          characters: n.characters,
          path: n.path,
        }));

        return {
          content: [
            {
              type: "text",
              text: `Found ${summary.length} text nodes.`,
            },
            {
              type: "text",
              text: JSON.stringify(summary),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error scanning text summary: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Node Tree Tool (Fix #5: lightweight structure)
  server.tool(
    "get_node_tree",
    "Get a lightweight tree structure of a node showing only names, types, and IDs — no styling or coordinates. Use for understanding frame structure.",
    {
      nodeId: z.string().describe("The ID of the node to get the tree for"),
      depth: z.number().optional().describe("Max depth to traverse (default 5, max 10)"),
    },
    async ({ nodeId, depth }) => {
      try {
        const maxDepth = Math.min(depth || 5, 10);
        const result = await sendCommandToFigma("get_node_tree", {
          nodeId,
          maxDepth,
        }, 60000);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting node tree: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // List Channels Tool (Fix #7: discover active channels)
  server.tool(
    "list_channels",
    "List active channels on the Figma WebSocket server. Helps discover the channel to join without needing the random channel name.",
    {},
    async () => {
      try {
        const response = await fetch("http://localhost:3055/channels");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const channels = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(channels, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing channels: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Join Channel Tool
  server.tool(
    "join_channel",
    "Join a specific channel to communicate with Figma. Use list_channels first to discover available channels.",
    {
      channel: z.string().describe("The name of the channel to join").default(""),
    },
    async ({ channel }) => {
      try {
        if (!channel) {
          return {
            content: [
              {
                type: "text",
                text: "Please provide a channel name to join. Use list_channels to discover available channels.",
              },
            ],
            followUp: {
              tool: "join_channel",
              description: "Join the specified channel",
            },
          };
        }

        await joinChannel(channel);

        return {
          content: [
            {
              type: "text",
              text: `Successfully joined channel: ${channel}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error joining channel: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Export Node as Image Tool
  server.tool(
    "export_node_as_image",
    "Export a node as an image from Figma",
    {
      nodeId: z.string().describe("The ID of the node to export"),
      format: z
        .enum(["PNG", "JPG", "SVG", "PDF"])
        .optional()
        .describe("Export format"),
      scale: z.number().positive().optional().describe("Export scale"),
    },
    async ({ nodeId, format, scale }) => {
      try {
        const result = await sendCommandToFigma("export_node_as_image", {
          nodeId,
          format: format || "PNG",
          scale: scale || 1,
        });
        const typedResult = result as { imageData: string; mimeType: string };

        return {
          content: [
            {
              type: "image",
              data: typedResult.imageData,
              mimeType: typedResult.mimeType || "image/png",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error exporting node as image: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
