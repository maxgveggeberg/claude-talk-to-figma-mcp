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

  // =============================================
  // P1 TOOLS
  // =============================================

  // Create Page Tool
  server.tool(
    "create_page",
    "Create a new page in the current Figma document",
    {
      name: z.string().describe("Name for the new page"),
    },
    async ({ name }) => {
      try {
        const result = await sendCommandToFigma("create_page", { name });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created page "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating page: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Text Auto Resize Tool
  server.tool(
    "set_text_auto_resize",
    "Set the auto-resize behavior of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      autoResize: z
        .enum(["NONE", "HEIGHT", "WIDTH_AND_HEIGHT", "TRUNCATE"])
        .describe("Auto-resize mode for the text node"),
    },
    async ({ nodeId, autoResize }) => {
      try {
        const result = await sendCommandToFigma("set_text_auto_resize", {
          nodeId,
          autoResize,
        });
        const typedResult = result as {
          name: string;
          id: string;
          textAutoResize: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set text auto-resize of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.textAutoResize}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text auto-resize: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Text Vertical Alignment Tool
  server.tool(
    "set_text_vertical_alignment",
    "Set the vertical text alignment of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      alignment: z
        .enum(["TOP", "CENTER", "BOTTOM"])
        .describe("Vertical alignment for the text"),
    },
    async ({ nodeId, alignment }) => {
      try {
        const result = await sendCommandToFigma("set_text_vertical_alignment", {
          nodeId,
          alignment,
        });
        const typedResult = result as {
          name: string;
          id: string;
          alignment: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set vertical alignment of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.alignment}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text vertical alignment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Sizing Tool
  server.tool(
    "set_sizing",
    "Set the sizing behavior of a node within an auto layout frame (FIXED, HUG, or FILL)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      horizontal: z
        .enum(["FIXED", "HUG", "FILL"])
        .optional()
        .describe("Horizontal sizing behavior"),
      vertical: z
        .enum(["FIXED", "HUG", "FILL"])
        .optional()
        .describe("Vertical sizing behavior"),
    },
    async ({ nodeId, horizontal, vertical }) => {
      try {
        const result = await sendCommandToFigma("set_sizing", {
          nodeId,
          horizontal,
          vertical,
        });
        const typedResult = result as {
          name: string;
          id: string;
          layoutSizingHorizontal: string;
          layoutSizingVertical: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set sizing of "${typedResult.name}" (ID: ${typedResult.id}) to horizontal: ${typedResult.layoutSizingHorizontal}, vertical: ${typedResult.layoutSizingVertical}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting sizing: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Min Max Size Tool
  server.tool(
    "set_min_max_size",
    "Set minimum and maximum width/height constraints on a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      minWidth: z.number().optional().describe("Minimum width"),
      maxWidth: z.number().optional().describe("Maximum width"),
      minHeight: z.number().optional().describe("Minimum height"),
      maxHeight: z.number().optional().describe("Maximum height"),
    },
    async ({ nodeId, minWidth, maxWidth, minHeight, maxHeight }) => {
      try {
        const result = await sendCommandToFigma("set_min_max_size", {
          nodeId,
          minWidth,
          maxWidth,
          minHeight,
          maxHeight,
        });
        const typedResult = result as {
          name: string;
          id: string;
          minWidth: number;
          maxWidth: number;
          minHeight: number;
          maxHeight: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set min/max size of "${typedResult.name}" (ID: ${typedResult.id}) — minW: ${typedResult.minWidth}, maxW: ${typedResult.maxWidth}, minH: ${typedResult.minHeight}, maxH: ${typedResult.maxHeight}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting min/max size: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Padding Tool
  server.tool(
    "set_padding",
    "Set padding on a frame node in Figma. Use 'all' to set all four sides at once, or set individual sides.",
    {
      nodeId: z.string().describe("The ID of the frame node to modify"),
      top: z.number().optional().describe("Top padding"),
      right: z.number().optional().describe("Right padding"),
      bottom: z.number().optional().describe("Bottom padding"),
      left: z.number().optional().describe("Left padding"),
      all: z
        .number()
        .optional()
        .describe("Set all four padding values at once"),
    },
    async ({ nodeId, top, right, bottom, left, all }) => {
      try {
        const result = await sendCommandToFigma("set_padding", {
          nodeId,
          top,
          right,
          bottom,
          left,
          all,
        });
        const typedResult = result as {
          name: string;
          id: string;
          paddingTop: number;
          paddingRight: number;
          paddingBottom: number;
          paddingLeft: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set padding of "${typedResult.name}" (ID: ${typedResult.id}) — top: ${typedResult.paddingTop}, right: ${typedResult.paddingRight}, bottom: ${typedResult.paddingBottom}, left: ${typedResult.paddingLeft}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting padding: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Component Tool
  server.tool(
    "create_component",
    "Create a component from an existing node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to convert to a component"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("create_component", { nodeId });
        const typedResult = result as {
          id: string;
          name: string;
          type: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Created component "${typedResult.name}" (ID: ${typedResult.id}, type: ${typedResult.type})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating component: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Stroke Align Tool
  server.tool(
    "set_stroke_align",
    "Set the stroke alignment of a node in Figma (inside, outside, or center)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      strokeAlign: z
        .enum(["INSIDE", "OUTSIDE", "CENTER"])
        .describe("Stroke alignment position"),
    },
    async ({ nodeId, strokeAlign }) => {
      try {
        const result = await sendCommandToFigma("set_stroke_align", {
          nodeId,
          strokeAlign,
        });
        const typedResult = result as {
          name: string;
          id: string;
          strokeAlign: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set stroke alignment of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.strokeAlign}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke alignment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Individual Corner Radius Tool
  server.tool(
    "set_individual_corner_radius",
    "Set individual corner radii on a node in Figma (each corner can have a different radius)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      topLeft: z.number().describe("Top-left corner radius"),
      topRight: z.number().describe("Top-right corner radius"),
      bottomRight: z.number().describe("Bottom-right corner radius"),
      bottomLeft: z.number().describe("Bottom-left corner radius"),
    },
    async ({ nodeId, topLeft, topRight, bottomRight, bottomLeft }) => {
      try {
        const result = await sendCommandToFigma("set_individual_corner_radius", {
          nodeId,
          topLeft,
          topRight,
          bottomRight,
          bottomLeft,
        });
        const typedResult = result as {
          name: string;
          id: string;
          topLeftRadius: number;
          topRightRadius: number;
          bottomRightRadius: number;
          bottomLeftRadius: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set corner radii of "${typedResult.name}" (ID: ${typedResult.id}) — TL: ${typedResult.topLeftRadius}, TR: ${typedResult.topRightRadius}, BR: ${typedResult.bottomRightRadius}, BL: ${typedResult.bottomLeftRadius}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting individual corner radius: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Layout Align Tool
  server.tool(
    "set_layout_align",
    "Set the alignment of a child node within an auto layout frame",
    {
      nodeId: z.string().describe("The ID of the child node to modify"),
      layoutAlign: z
        .enum(["INHERIT", "STRETCH", "MIN", "CENTER", "MAX"])
        .describe("Alignment of the child within the auto layout parent"),
    },
    async ({ nodeId, layoutAlign }) => {
      try {
        const result = await sendCommandToFigma("set_layout_align", {
          nodeId,
          layoutAlign,
        });
        const typedResult = result as {
          name: string;
          id: string;
          layoutAlign: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set layout alignment of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.layoutAlign}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting layout align: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Layout Positioning Tool
  server.tool(
    "set_layout_positioning",
    "Set absolute or auto positioning for a node within an auto layout frame",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      positioning: z
        .enum(["AUTO", "ABSOLUTE"])
        .describe("Positioning mode within auto layout"),
    },
    async ({ nodeId, positioning }) => {
      try {
        const result = await sendCommandToFigma("set_layout_positioning", {
          nodeId,
          positioning,
        });
        const typedResult = result as {
          name: string;
          id: string;
          layoutPositioning: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set layout positioning of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.layoutPositioning}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting layout positioning: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Clip Content Tool
  server.tool(
    "set_clip_content",
    "Set whether a frame clips its content in Figma",
    {
      nodeId: z.string().describe("The ID of the frame node to modify"),
      clipsContent: z.boolean().describe("Whether the frame should clip its content"),
    },
    async ({ nodeId, clipsContent }) => {
      try {
        const result = await sendCommandToFigma("set_clip_content", {
          nodeId,
          clipsContent,
        });
        const typedResult = result as {
          name: string;
          id: string;
          clipsContent: boolean;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set clip content of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.clipsContent}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting clip content: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Node Children Tool
  server.tool(
    "get_node_children",
    "Get the children of a node in Figma, optionally recursively",
    {
      nodeId: z.string().describe("The ID of the parent node"),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to get children recursively (default: false)"),
    },
    async ({ nodeId, recursive }) => {
      try {
        const result = await sendCommandToFigma("get_node_children", {
          nodeId,
          recursive,
        });
        const typedResult = result as {
          name: string;
          id: string;
          childCount: number;
          children: unknown[];
        };
        return {
          content: [
            {
              type: "text",
              text: `Node "${typedResult.name}" (ID: ${typedResult.id}) has ${typedResult.childCount} children: ${JSON.stringify(typedResult.children, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting node children: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Section Tool
  server.tool(
    "create_section",
    "Create a section node in Figma for organizing content on the canvas",
    {
      x: z.number().describe("X position of the section"),
      y: z.number().describe("Y position of the section"),
      width: z.number().describe("Width of the section"),
      height: z.number().describe("Height of the section"),
      name: z.string().optional().describe("Optional name for the section"),
      fillColor: z
        .object({
          r: z.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        })
        .optional()
        .describe("Optional fill color for the section"),
    },
    async ({ x, y, width, height, name, fillColor }) => {
      try {
        const result = await sendCommandToFigma("create_section", {
          x,
          y,
          width,
          height,
          name,
          fillColor,
        });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created section "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating section: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Multiple Fills Tool
  server.tool(
    "set_multiple_fills",
    "Set multiple fills on a node in Figma (solid colors, gradients, etc.)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      fills: z
        .array(
          z.object({
            type: z
              .enum(["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND", "IMAGE"])
              .describe("Type of fill"),
            color: z
              .object({
                r: z.number().min(0).max(1).describe("Red component (0-1)"),
                g: z.number().min(0).max(1).describe("Green component (0-1)"),
                b: z.number().min(0).max(1).describe("Blue component (0-1)"),
              })
              .optional()
              .describe("Fill color (for SOLID type)"),
            opacity: z.number().min(0).max(1).optional().describe("Fill opacity (0-1)"),
            gradientStops: z
              .array(
                z.object({
                  position: z.number().min(0).max(1).describe("Position along gradient (0-1)"),
                  color: z.object({
                    r: z.number().min(0).max(1).describe("Red (0-1)"),
                    g: z.number().min(0).max(1).describe("Green (0-1)"),
                    b: z.number().min(0).max(1).describe("Blue (0-1)"),
                    a: z.number().min(0).max(1).optional().describe("Alpha (0-1)"),
                  }).describe("Color at this stop"),
                })
              )
              .optional()
              .describe("Gradient stops (for gradient types)"),
          })
        )
        .describe("Array of fill paint objects"),
    },
    async ({ nodeId, fills }) => {
      try {
        const result = await sendCommandToFigma("set_multiple_fills", {
          nodeId,
          fills,
        });
        const typedResult = result as {
          name: string;
          id: string;
          fillCount: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set ${typedResult.fillCount} fills on "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting multiple fills: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Text Color Range Tool
  server.tool(
    "set_text_color_range",
    "Set the fill color for a character range within a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      start: z.number().describe("Start character index"),
      end: z.number().describe("End character index"),
      color: z
        .object({
          r: z.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        })
        .describe("Color to apply to the character range"),
    },
    async ({ nodeId, start, end, color }) => {
      try {
        const result = await sendCommandToFigma("set_text_color_range", {
          nodeId,
          start,
          end,
          color,
        });
        const typedResult = result as {
          name: string;
          id: string;
          start: number;
          end: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set text color on "${typedResult.name}" (ID: ${typedResult.id}) for characters ${typedResult.start}-${typedResult.end}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text color range: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Font Size Range Tool
  server.tool(
    "set_font_size_range",
    "Set the font size for a character range within a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      start: z.number().describe("Start character index"),
      end: z.number().describe("End character index"),
      fontSize: z.number().describe("Font size to apply"),
    },
    async ({ nodeId, start, end, fontSize }) => {
      try {
        const result = await sendCommandToFigma("set_font_size_range", {
          nodeId,
          start,
          end,
          fontSize,
        });
        const typedResult = result as {
          name: string;
          id: string;
          start: number;
          end: number;
          fontSize: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set font size ${typedResult.fontSize} on "${typedResult.name}" (ID: ${typedResult.id}) for characters ${typedResult.start}-${typedResult.end}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting font size range: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Font Weight Range Tool
  server.tool(
    "set_font_weight_range",
    "Set the font weight for a character range within a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      start: z.number().describe("Start character index"),
      end: z.number().describe("End character index"),
      weight: z.number().describe("Font weight to apply (e.g., 400 for regular, 700 for bold)"),
    },
    async ({ nodeId, start, end, weight }) => {
      try {
        const result = await sendCommandToFigma("set_font_weight_range", {
          nodeId,
          start,
          end,
          weight,
        });
        const typedResult = result as {
          name: string;
          id: string;
          start: number;
          end: number;
          weight: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set font weight ${typedResult.weight} on "${typedResult.name}" (ID: ${typedResult.id}) for characters ${typedResult.start}-${typedResult.end}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting font weight range: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // =============================================
  // P2 TOOLS
  // =============================================

  // Create Component Set Tool
  server.tool(
    "create_component_set",
    "Create a variant group (component set) from multiple component nodes in Figma",
    {
      componentIds: z
        .array(z.string())
        .min(2)
        .describe("Array of component node IDs to group into a variant set"),
    },
    async ({ componentIds }) => {
      try {
        const result = await sendCommandToFigma("create_component_set", {
          componentIds,
        });
        const typedResult = result as {
          id: string;
          name: string;
          variantCount: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Created component set "${typedResult.name}" (ID: ${typedResult.id}) with ${typedResult.variantCount} variants`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating component set: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Plugin Data Tool
  server.tool(
    "set_plugin_data",
    "Store custom key-value data on a node in Figma using plugin data",
    {
      nodeId: z.string().describe("The ID of the node to store data on"),
      key: z.string().describe("The key for the data"),
      value: z.string().describe("The value to store"),
    },
    async ({ nodeId, key, value }) => {
      try {
        const result = await sendCommandToFigma("set_plugin_data", {
          nodeId,
          key,
          value,
        });
        const typedResult = result as {
          name: string;
          id: string;
          key: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set plugin data key "${typedResult.key}" on "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting plugin data: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Plugin Data Tool
  server.tool(
    "get_plugin_data",
    "Read custom key-value data from a node in Figma using plugin data",
    {
      nodeId: z.string().describe("The ID of the node to read data from"),
      key: z.string().describe("The key to read"),
    },
    async ({ nodeId, key }) => {
      try {
        const result = await sendCommandToFigma("get_plugin_data", {
          nodeId,
          key,
        });
        const typedResult = result as {
          name: string;
          id: string;
          key: string;
          value: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Plugin data on "${typedResult.name}" (ID: ${typedResult.id}) — key "${typedResult.key}": "${typedResult.value}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting plugin data: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Guide Tool
  server.tool(
    "set_guide",
    "Add a guide line to the canvas or a specific frame in Figma",
    {
      axis: z.enum(["X", "Y"]).describe("Axis for the guide (X for vertical, Y for horizontal)"),
      offset: z.number().describe("Offset position of the guide in pixels"),
      parentId: z
        .string()
        .optional()
        .describe("Optional parent frame ID to add the guide to (defaults to page)"),
    },
    async ({ axis, offset, parentId }) => {
      try {
        const result = await sendCommandToFigma("set_guide", {
          axis,
          offset,
          parentId,
        });
        const typedResult = result as {
          parentId: string;
          axis: string;
          offset: number;
          totalGuides: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Added ${typedResult.axis} guide at offset ${typedResult.offset} on parent ${typedResult.parentId} (total guides: ${typedResult.totalGuides})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting guide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Export Settings Tool
  server.tool(
    "set_export_settings",
    "Set export settings on a node in Figma (format, scale, suffix)",
    {
      nodeId: z.string().describe("The ID of the node to set export settings on"),
      settings: z
        .array(
          z.object({
            format: z
              .enum(["PNG", "JPG", "SVG", "PDF"])
              .describe("Export format"),
            scale: z.number().optional().describe("Export scale (e.g., 2 for 2x)"),
            suffix: z.string().optional().describe("Suffix to append to filename"),
          })
        )
        .describe("Array of export settings"),
    },
    async ({ nodeId, settings }) => {
      try {
        const result = await sendCommandToFigma("set_export_settings", {
          nodeId,
          settings,
        });
        const typedResult = result as {
          name: string;
          id: string;
          settingsCount: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set ${typedResult.settingsCount} export settings on "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting export settings: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Text List Style Tool
  server.tool(
    "set_text_list_style",
    "Set the list style (ordered, unordered, or none) on a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      listType: z
        .enum(["NONE", "ORDERED", "UNORDERED"])
        .describe("List style type"),
    },
    async ({ nodeId, listType }) => {
      try {
        const result = await sendCommandToFigma("set_text_list_style", {
          nodeId,
          listType,
        });
        const typedResult = result as {
          name: string;
          id: string;
          listType: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set list style of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.listType}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text list style: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Connector Tool
  server.tool(
    "create_connector",
    "Create a connector line between two nodes in Figma (for diagrams and flowcharts)",
    {
      startNodeId: z.string().describe("The ID of the start node"),
      endNodeId: z.string().describe("The ID of the end node"),
      strokeColor: z
        .object({
          r: z.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        })
        .optional()
        .describe("Optional stroke color for the connector"),
      strokeWeight: z.number().optional().describe("Optional stroke weight"),
      connectorType: z
        .enum(["STRAIGHT", "ELBOWED"])
        .optional()
        .describe("Connector type (straight or elbowed)"),
    },
    async ({ startNodeId, endNodeId, strokeColor, strokeWeight, connectorType }) => {
      try {
        const result = await sendCommandToFigma("create_connector", {
          startNodeId,
          endNodeId,
          strokeColor,
          strokeWeight,
          connectorType,
        });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created connector "${typedResult.name}" (ID: ${typedResult.id}) between nodes`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating connector: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Scroll Into View Tool
  server.tool(
    "scroll_into_view",
    "Scroll the Figma viewport to center on a specific node",
    {
      nodeId: z.string().describe("The ID of the node to scroll into view"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("scroll_into_view", { nodeId });
        const typedResult = result as { name: string; id: string };
        return {
          content: [
            {
              type: "text",
              text: `Scrolled viewport to node "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error scrolling into view: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Reactions Tool
  server.tool(
    "set_reactions",
    "Set prototype interactions (reactions) on a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to set reactions on"),
      reactions: z
        .array(z.record(z.unknown()))
        .describe("Array of reaction objects defining prototype interactions"),
    },
    async ({ nodeId, reactions }) => {
      try {
        const result = await sendCommandToFigma("set_reactions", {
          nodeId,
          reactions,
        });
        const typedResult = result as {
          name: string;
          id: string;
          reactionCount: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set ${typedResult.reactionCount} reactions on "${typedResult.name}" (ID: ${typedResult.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting reactions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Batch Create Nodes Tool
  server.tool(
    "batch_create_nodes",
    "Create multiple nodes at once in Figma for better performance",
    {
      nodes: z
        .array(
          z.object({
            type: z
              .enum(["RECTANGLE", "ELLIPSE", "FRAME", "TEXT"])
              .describe("Type of node to create"),
            x: z.number().describe("X position"),
            y: z.number().describe("Y position"),
            width: z.number().describe("Width"),
            height: z.number().describe("Height"),
            name: z.string().optional().describe("Optional name for the node"),
            parentId: z.string().optional().describe("Optional parent node ID"),
            fillColor: z
              .object({
                r: z.number().min(0).max(1).describe("Red component (0-1)"),
                g: z.number().min(0).max(1).describe("Green component (0-1)"),
                b: z.number().min(0).max(1).describe("Blue component (0-1)"),
                a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
              })
              .optional()
              .describe("Optional fill color"),
            text: z.string().optional().describe("Text content (for TEXT type)"),
            fontSize: z.number().optional().describe("Font size (for TEXT type)"),
          })
        )
        .describe("Array of node definitions to create"),
    },
    async ({ nodes }) => {
      try {
        const result = await sendCommandToFigma("batch_create_nodes", { nodes });
        const typedResult = result as {
          createdCount: number;
          nodes: unknown[];
        };
        return {
          content: [
            {
              type: "text",
              text: `Batch created ${typedResult.createdCount} nodes: ${JSON.stringify(typedResult.nodes, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error batch creating nodes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Text Truncation Tool
  server.tool(
    "set_text_truncation",
    "Set text truncation behavior on a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      truncation: z
        .enum(["DISABLED", "ENDING"])
        .describe("Truncation mode for the text node"),
    },
    async ({ nodeId, truncation }) => {
      try {
        const result = await sendCommandToFigma("set_text_truncation", {
          nodeId,
          truncation,
        });
        const typedResult = result as {
          name: string;
          id: string;
          textTruncation: string;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set text truncation of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.textTruncation}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text truncation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Max Lines Tool
  server.tool(
    "set_max_lines",
    "Set the maximum number of lines for a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      maxLines: z.number().describe("Maximum number of lines to display"),
    },
    async ({ nodeId, maxLines }) => {
      try {
        const result = await sendCommandToFigma("set_max_lines", {
          nodeId,
          maxLines,
        });
        const typedResult = result as {
          name: string;
          id: string;
          maxLines: number;
        };
        return {
          content: [
            {
              type: "text",
              text: `Set max lines of "${typedResult.name}" (ID: ${typedResult.id}) to ${typedResult.maxLines}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting max lines: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
