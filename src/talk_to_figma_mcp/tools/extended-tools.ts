import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

/**
 * Register extended tools to the MCP server
 * This module contains tools for advanced creation and modification capabilities
 * including vectors, lines, gradients, opacity, images, text alignment,
 * blend modes, rotation, visibility, and boolean operations.
 * @param server - The MCP server instance
 */
export function registerExtendedTools(server: McpServer): void {
  // =============================================
  // CREATION TOOLS
  // =============================================

  // Create Vector Tool (SVG path support)
  server.tool(
    "create_vector",
    "Create a custom vector/SVG path in Figma. Use vectorPaths to define complex shapes using SVG path data syntax (M, L, C, Q, Z commands). Essential for icons and custom shapes.",
    {
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().describe("Width of the vector bounding box"),
      height: z.number().describe("Height of the vector bounding box"),
      vectorPaths: z
        .array(
          z.object({
            windingRule: z
              .enum(["EVENODD", "NONZERO"])
              .optional()
              .describe("Winding rule for the path (default: EVENODD)"),
            data: z
              .string()
              .describe(
                "SVG path data string (e.g., 'M 0 0 L 100 0 L 100 100 L 0 100 Z')"
              ),
          })
        )
        .describe("Array of vector paths with SVG path data"),
      name: z.string().optional().describe("Optional name for the vector"),
      parentId: z
        .string()
        .optional()
        .describe("Optional parent node ID to append the vector to"),
      fillColor: z
        .object({
          r: z.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("Alpha component (0-1)"),
        })
        .optional()
        .describe("Fill color in RGBA format"),
      strokeColor: z
        .object({
          r: z.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("Alpha component (0-1)"),
        })
        .optional()
        .describe("Stroke color in RGBA format"),
      strokeWeight: z
        .number()
        .positive()
        .optional()
        .describe("Stroke weight"),
    },
    async ({
      x,
      y,
      width,
      height,
      vectorPaths,
      name,
      parentId,
      fillColor,
      strokeColor,
      strokeWeight,
    }) => {
      try {
        const result = await sendCommandToFigma("create_vector", {
          x,
          y,
          width,
          height,
          vectorPaths,
          name: name || "Vector",
          parentId,
          fillColor,
          strokeColor,
          strokeWeight,
        });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created vector "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating vector: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Line Tool
  server.tool(
    "create_line",
    "Create a line between two points in Figma. Useful for dividers, separators, and connectors.",
    {
      x1: z.number().describe("Starting X position"),
      y1: z.number().describe("Starting Y position"),
      x2: z.number().describe("Ending X position"),
      y2: z.number().describe("Ending Y position"),
      name: z.string().optional().describe("Optional name for the line"),
      parentId: z
        .string()
        .optional()
        .describe("Optional parent node ID to append the line to"),
      strokeColor: z
        .object({
          r: z.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("Alpha component (0-1)"),
        })
        .optional()
        .describe("Stroke color in RGBA format (defaults to black)"),
      strokeWeight: z
        .number()
        .positive()
        .optional()
        .describe("Stroke weight (default: 1)"),
      strokeCap: z
        .enum(["NONE", "ROUND", "SQUARE", "ARROW_LINES", "ARROW_EQUILATERAL"])
        .optional()
        .describe("Stroke cap style (default: NONE)"),
    },
    async ({ x1, y1, x2, y2, name, parentId, strokeColor, strokeWeight, strokeCap }) => {
      try {
        const result = await sendCommandToFigma("create_line", {
          x1,
          y1,
          x2,
          y2,
          name: name || "Line",
          parentId,
          strokeColor: strokeColor || { r: 0, g: 0, b: 0, a: 1 },
          strokeWeight: strokeWeight || 1,
          strokeCap: strokeCap || "NONE",
        });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created line "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating line: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Boolean Operation Tool
  server.tool(
    "create_boolean_operation",
    "Perform a boolean operation (union, subtract, intersect, exclude) on two or more nodes in Figma",
    {
      nodeIds: z
        .array(z.string())
        .min(2)
        .describe("Array of node IDs to combine (minimum 2)"),
      operation: z
        .enum(["UNION", "SUBTRACT", "INTERSECT", "EXCLUDE"])
        .describe("Boolean operation type"),
      name: z.string().optional().describe("Optional name for the result"),
    },
    async ({ nodeIds, operation, name }) => {
      try {
        const result = await sendCommandToFigma("create_boolean_operation", {
          nodeIds,
          operation,
          name: name || `Boolean ${operation}`,
        });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created boolean ${operation} "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating boolean operation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // =============================================
  // MODIFICATION TOOLS
  // =============================================

  // Set Gradient Fill Tool
  server.tool(
    "set_gradient_fill",
    "Apply a gradient fill to a node in Figma. Supports linear, radial, angular, and diamond gradients.",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      type: z
        .enum([
          "GRADIENT_LINEAR",
          "GRADIENT_RADIAL",
          "GRADIENT_ANGULAR",
          "GRADIENT_DIAMOND",
        ])
        .describe("Gradient type"),
      gradientStops: z
        .array(
          z.object({
            position: z
              .number()
              .min(0)
              .max(1)
              .describe("Position along the gradient (0-1)"),
            color: z.object({
              r: z.number().min(0).max(1).describe("Red component (0-1)"),
              g: z.number().min(0).max(1).describe("Green component (0-1)"),
              b: z.number().min(0).max(1).describe("Blue component (0-1)"),
              a: z
                .number()
                .min(0)
                .max(1)
                .optional()
                .describe("Alpha component (0-1, default: 1)"),
            }),
          })
        )
        .min(2)
        .describe("Array of gradient color stops (minimum 2)"),
      gradientTransform: z
        .array(z.array(z.number()))
        .optional()
        .describe(
          "Optional 2x3 affine transform matrix [[a, b, tx], [c, d, ty]] for gradient direction"
        ),
    },
    async ({ nodeId, type, gradientStops, gradientTransform }) => {
      try {
        const result = await sendCommandToFigma("set_gradient_fill", {
          nodeId,
          type,
          gradientStops,
          gradientTransform,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Applied ${type} gradient to node "${typedResult.name}" with ${gradientStops.length} color stops`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting gradient fill: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Opacity Tool
  server.tool(
    "set_opacity",
    "Set the opacity of a node in Figma (0 = fully transparent, 1 = fully opaque). This controls the node-level opacity, not the fill alpha.",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .describe("Opacity value (0 = transparent, 1 = opaque)"),
    },
    async ({ nodeId, opacity }) => {
      try {
        const result = await sendCommandToFigma("set_opacity", {
          nodeId,
          opacity,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set opacity of node "${typedResult.name}" to ${opacity}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting opacity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Blend Mode Tool
  server.tool(
    "set_blend_mode",
    "Set the blend mode of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      blendMode: z
        .enum([
          "PASS_THROUGH",
          "NORMAL",
          "DARKEN",
          "MULTIPLY",
          "COLOR_BURN",
          "LINEAR_BURN",
          "LIGHTEN",
          "SCREEN",
          "COLOR_DODGE",
          "LINEAR_DODGE",
          "OVERLAY",
          "SOFT_LIGHT",
          "HARD_LIGHT",
          "DIFFERENCE",
          "EXCLUSION",
          "HUE",
          "SATURATION",
          "COLOR",
          "LUMINOSITY",
        ])
        .describe("Blend mode to apply"),
    },
    async ({ nodeId, blendMode }) => {
      try {
        const result = await sendCommandToFigma("set_blend_mode", {
          nodeId,
          blendMode,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set blend mode of node "${typedResult.name}" to ${blendMode}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting blend mode: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Rotation Tool
  server.tool(
    "set_rotation",
    "Set the rotation angle of a node in Figma (in degrees, counterclockwise)",
    {
      nodeId: z.string().describe("The ID of the node to rotate"),
      rotation: z.number().describe("Rotation angle in degrees (counterclockwise)"),
    },
    async ({ nodeId, rotation }) => {
      try {
        const result = await sendCommandToFigma("set_rotation", {
          nodeId,
          rotation,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Rotated node "${typedResult.name}" to ${rotation} degrees`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting rotation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Visibility Tool
  server.tool(
    "set_visibility",
    "Show or hide a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to show/hide"),
      visible: z.boolean().describe("Whether the node should be visible"),
    },
    async ({ nodeId, visible }) => {
      try {
        const result = await sendCommandToFigma("set_visibility", {
          nodeId,
          visible,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set visibility of node "${typedResult.name}" to ${visible ? "visible" : "hidden"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting visibility: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Lock Tool
  server.tool(
    "set_locked",
    "Lock or unlock a node in Figma to prevent accidental edits",
    {
      nodeId: z.string().describe("The ID of the node to lock/unlock"),
      locked: z.boolean().describe("Whether the node should be locked"),
    },
    async ({ nodeId, locked }) => {
      try {
        const result = await sendCommandToFigma("set_locked", {
          nodeId,
          locked,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `${locked ? "Locked" : "Unlocked"} node "${typedResult.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting lock state: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Text Alignment Tool
  server.tool(
    "set_text_alignment",
    "Set the horizontal text alignment of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      alignment: z
        .enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"])
        .describe("Text alignment"),
    },
    async ({ nodeId, alignment }) => {
      try {
        const result = await sendCommandToFigma("set_text_alignment", {
          nodeId,
          alignment,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set text alignment of node "${typedResult.name}" to ${alignment}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text alignment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Constraints Tool
  server.tool(
    "set_constraints",
    "Set the horizontal and vertical constraints of a node in Figma for responsive behavior",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      horizontal: z
        .enum(["MIN", "CENTER", "MAX", "STRETCH", "SCALE"])
        .optional()
        .describe("Horizontal constraint"),
      vertical: z
        .enum(["MIN", "CENTER", "MAX", "STRETCH", "SCALE"])
        .optional()
        .describe("Vertical constraint"),
    },
    async ({ nodeId, horizontal, vertical }) => {
      try {
        const result = await sendCommandToFigma("set_constraints", {
          nodeId,
          horizontal,
          vertical,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set constraints of node "${typedResult.name}" to horizontal: ${horizontal || "unchanged"}, vertical: ${vertical || "unchanged"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting constraints: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Image Fill Tool
  server.tool(
    "set_image_fill",
    "Set an image fill on a node in Figma using a base64-encoded image. Create a rectangle or frame first, then apply this to fill it with an image.",
    {
      nodeId: z.string().describe("The ID of the node to apply the image fill to"),
      imageData: z
        .string()
        .describe(
          "Base64-encoded image data (PNG or JPEG, without the data:image/... prefix)"
        ),
      scaleMode: z
        .enum(["FILL", "FIT", "CROP", "TILE"])
        .optional()
        .describe("How the image fills the node (default: FILL)"),
    },
    async ({ nodeId, imageData, scaleMode }) => {
      try {
        const result = await sendCommandToFigma("set_image_fill", {
          nodeId,
          imageData,
          scaleMode: scaleMode || "FILL",
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Applied image fill to node "${typedResult.name}" with scale mode: ${scaleMode || "FILL"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting image fill: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Stroke Dash Pattern Tool
  server.tool(
    "set_stroke_dash_pattern",
    "Set the stroke dash pattern of a node in Figma (for dashed or dotted lines)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      dashPattern: z
        .array(z.number())
        .describe(
          "Array of dash and gap lengths (e.g., [10, 5] for dashed, [2, 2] for dotted)"
        ),
    },
    async ({ nodeId, dashPattern }) => {
      try {
        const result = await sendCommandToFigma("set_stroke_dash_pattern", {
          nodeId,
          dashPattern,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set stroke dash pattern of node "${typedResult.name}" to [${dashPattern.join(", ")}]`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke dash pattern: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Align Nodes Tool
  server.tool(
    "align_nodes",
    "Align multiple nodes relative to each other in Figma",
    {
      nodeIds: z
        .array(z.string())
        .min(2)
        .describe("Array of node IDs to align"),
      direction: z
        .enum([
          "LEFT",
          "CENTER_HORIZONTAL",
          "RIGHT",
          "TOP",
          "CENTER_VERTICAL",
          "BOTTOM",
          "DISTRIBUTE_HORIZONTAL",
          "DISTRIBUTE_VERTICAL",
        ])
        .describe("Alignment direction"),
    },
    async ({ nodeIds, direction }) => {
      try {
        const result = await sendCommandToFigma("align_nodes", {
          nodeIds,
          direction,
        });
        const typedResult = result as { alignedCount: number };
        return {
          content: [
            {
              type: "text",
              text: `Aligned ${typedResult.alignedCount} nodes using ${direction}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error aligning nodes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
