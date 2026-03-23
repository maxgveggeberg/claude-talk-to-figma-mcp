import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger";
import { serverUrl, defaultPort, WS_URL, reconnectInterval } from "../config/config";
import { FigmaCommand, FigmaResponse, CommandProgressUpdate, PendingRequest, ProgressMessage } from "../types";

// WebSocket connection and request tracking
let ws: WebSocket | null = null;
let currentChannel: string | null = null;

// Persistent channel name — survives reconnects
let savedChannel: string | null = null;

// Map of pending requests for promise tracking
const pendingRequests = new Map<string, PendingRequest>();

// --- Request queue (Fix #3) ---
// Serializes commands to prevent parallel calls from overwhelming the WebSocket
const commandQueue: Array<() => void> = [];
let activeCommands = 0;
const MAX_CONCURRENT = 1;

function dequeueNext() {
  activeCommands--;
  if (commandQueue.length > 0 && activeCommands < MAX_CONCURRENT) {
    const next = commandQueue.shift()!;
    next();
  }
}

/**
 * Connects to the Figma server via WebSocket.
 * @param port - Optional port for the connection (defaults to defaultPort from config)
 */
export function connectToFigma(port: number = defaultPort) {
  // If already connected, do nothing
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.info('Already connected to Figma');
    return;
  }

  // If connection is in progress (CONNECTING state), wait
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    logger.info('Connection to Figma is already in progress');
    return;
  }

  // If there's an existing socket in a closing state, clean it up
  if (ws && (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED)) {
    ws.removeAllListeners();
    ws = null;
  }

  const wsUrl = serverUrl === 'localhost' ? `${WS_URL}:${port}` : WS_URL;
  logger.info(`Connecting to Figma socket server at ${wsUrl}...`);

  try {
    ws = new WebSocket(wsUrl);

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        logger.error('Connection to Figma timed out');
        ws.terminate();
      }
    }, 10000); // 10 second connection timeout

    ws.on('open', async () => {
      clearTimeout(connectionTimeout);
      logger.info('Connected to Figma socket server');
      // Reset current channel — will be restored from savedChannel
      currentChannel = null;

      // Auto-rejoin saved channel (Fix #1)
      if (savedChannel) {
        logger.info(`Auto-rejoining saved channel: ${savedChannel}`);
        try {
          await joinChannel(savedChannel);
          logger.info(`Successfully auto-rejoined channel: ${savedChannel}`);
        } catch (error) {
          logger.error(`Failed to auto-rejoin channel: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });

    ws.on("message", (data: any) => {
      try {
        const json = JSON.parse(data) as ProgressMessage;

        // Handle progress updates
        if (json.type === 'progress_update') {
          const progressData = json.message.data as CommandProgressUpdate;
          const requestId = json.id || '';

          if (requestId && pendingRequests.has(requestId)) {
            const request = pendingRequests.get(requestId)!;

            // Update last activity timestamp
            request.lastActivity = Date.now();

            // Reset the timeout to prevent timeouts during long-running operations
            clearTimeout(request.timeout);

            // Create a new timeout
            request.timeout = setTimeout(() => {
              if (pendingRequests.has(requestId)) {
                logger.error(`Request ${requestId} timed out after extended period of inactivity`);
                pendingRequests.delete(requestId);
                request.reject(new Error('Request to Figma timed out'));
                dequeueNext();
              }
            }, 60000); // 60 second timeout for inactivity

            // Log progress
            logger.info(`Progress update for ${progressData.commandType}: ${progressData.progress}% - ${progressData.message}`);

            // For completed updates, we could resolve the request early if desired
            if (progressData.status === 'completed' && progressData.progress === 100) {
              // Instead, just log the completion, wait for final result from Figma
              logger.info(`Operation ${progressData.commandType} completed, waiting for final result`);
            }
          }
          return;
        }

        // Handle regular responses
        const myResponse = json.message;
        logger.debug(`Received message: ${JSON.stringify(myResponse)}`);
        logger.log('myResponse' + JSON.stringify(myResponse));

        // Handle response to a request
        if (
          myResponse.id &&
          pendingRequests.has(myResponse.id) &&
          myResponse.result
        ) {
          const request = pendingRequests.get(myResponse.id)!;
          clearTimeout(request.timeout);

          if (myResponse.error) {
            logger.error(`Error from Figma: ${myResponse.error}`);
            request.reject(new Error(myResponse.error));
          } else {
            if (myResponse.result) {
              request.resolve(myResponse.result);
            }
          }

          pendingRequests.delete(myResponse.id);
          dequeueNext();
        } else {
          // Handle broadcast messages or events
          logger.info(`Received broadcast message: ${JSON.stringify(myResponse)}`);
        }
      } catch (error) {
        logger.error(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    ws.on('error', (error) => {
      logger.error(`Socket error: ${error}`);
      // Don't attempt to reconnect here, let the close handler do it
    });

    ws.on('close', (code, reason) => {
      clearTimeout(connectionTimeout);
      logger.info(`Disconnected from Figma socket server with code ${code} and reason: ${reason || 'No reason provided'}`);
      ws = null;

      // Reject all pending requests
      for (const [id, request] of pendingRequests.entries()) {
        clearTimeout(request.timeout);
        request.reject(new Error(`Connection closed with code ${code}: ${reason || 'No reason provided'}`));
        pendingRequests.delete(id);
        dequeueNext();
      }

      // Attempt to reconnect with exponential backoff
      const backoff = Math.min(30000, reconnectInterval * Math.pow(1.5, Math.floor(Math.random() * 5))); // Max 30s
      logger.info(`Attempting to reconnect in ${backoff/1000} seconds...`);
      setTimeout(() => connectToFigma(port), backoff);
    });

  } catch (error) {
    logger.error(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : String(error)}`);
    // Attempt to reconnect after a delay
    setTimeout(() => connectToFigma(port), reconnectInterval);
  }
}

/**
 * Join a specific channel in Figma.
 * @param channelName - Name of the channel to join
 * @returns Promise that resolves when successfully joined the channel
 */
export async function joinChannel(channelName: string): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to Figma");
  }

  try {
    // Join commands bypass the queue — they're control-plane, not data-plane
    await sendCommandRaw("join", { channel: channelName });
    currentChannel = channelName;
    savedChannel = channelName; // Persist for auto-rejoin (Fix #1)
    logger.info(`Joined channel: ${channelName}`);
  } catch (error) {
    logger.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get the current channel the connection is joined to.
 * @returns The current channel name or null if not connected to any channel
 */
export function getCurrentChannel(): string | null {
  return currentChannel;
}

/**
 * Send a command directly to Figma (bypasses queue).
 * Used internally for control commands like "join".
 */
function sendCommandRaw(
  command: FigmaCommand,
  params: unknown = {},
  timeoutMs: number = 30000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToFigma();
      reject(new Error("Not connected to Figma. Attempting to connect..."));
      return;
    }

    const id = uuidv4();
    const request = {
      id,
      type: command === "join" ? "join" : "message",
      ...(command === "join"
        ? { channel: (params as any).channel }
        : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as any),
          commandId: id,
        },
      },
    };

    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        logger.error(`Request ${id} to Figma timed out after ${timeoutMs / 1000} seconds`);
        reject(new Error('Request to Figma timed out'));
      }
    }, timeoutMs);

    pendingRequests.set(id, {
      resolve,
      reject,
      timeout,
      lastActivity: Date.now()
    });

    logger.info(`Sending command to Figma: ${command}`);
    logger.debug(`Request details: ${JSON.stringify(request)}`);
    ws.send(JSON.stringify(request));
  });
}

/**
 * Send a command to Figma via WebSocket.
 * Commands are queued to prevent parallel calls from overwhelming the connection (Fix #3).
 * @param command - The command to send
 * @param params - Additional parameters for the command
 * @param timeoutMs - Timeout in milliseconds before failing
 * @returns A promise that resolves with the Figma response
 */
export function sendCommandToFigma(
  command: FigmaCommand,
  params: unknown = {},
  timeoutMs: number = 30000
): Promise<unknown> {
  // Join commands bypass the queue
  if (command === "join") {
    return sendCommandRaw(command, params, timeoutMs);
  }

  return new Promise((resolve, reject) => {
    const execute = () => {
      activeCommands++;

      // If not connected, try to connect first
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectToFigma();
        activeCommands--;
        reject(new Error("Not connected to Figma. Attempting to connect..."));
        dequeueNext();
        return;
      }

      // Check if we need a channel for this command
      if (!currentChannel) {
        activeCommands--;
        reject(new Error("Must join a channel before sending commands"));
        dequeueNext();
        return;
      }

      const id = uuidv4();
      const request = {
        id,
        type: "message",
        channel: currentChannel,
        message: {
          id,
          command,
          params: {
            ...(params as any),
            commandId: id,
          },
        },
      };

      // Set timeout for request
      const timeout = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          logger.error(`Request ${id} to Figma timed out after ${timeoutMs / 1000} seconds`);
          reject(new Error('Request to Figma timed out'));
          dequeueNext();
        }
      }, timeoutMs);

      // Store the promise callbacks to resolve/reject later
      pendingRequests.set(id, {
        resolve: (value: unknown) => {
          resolve(value);
          // dequeueNext is called in the message handler
        },
        reject: (reason: unknown) => {
          reject(reason);
          // dequeueNext is called in the message handler
        },
        timeout,
        lastActivity: Date.now()
      });

      // Send the request
      logger.info(`Sending command to Figma: ${command} (queue: ${commandQueue.length} waiting)`);
      logger.debug(`Request details: ${JSON.stringify(request)}`);
      ws.send(JSON.stringify(request));
    };

    if (activeCommands < MAX_CONCURRENT) {
      execute();
    } else {
      logger.info(`Queuing command: ${command} (${commandQueue.length + 1} in queue)`);
      commandQueue.push(execute);
    }
  });
}
