import type { ActionHandler } from "../types";
import { emailAction } from "./email";
import { telegramAction } from "./telegram";

/**
 * Action Registry: Central registry mapping action type IDs to their handlers.
 * To support a new integration (e.g. Slack, Discord), add its handler to this dictionary.
 */
export const actionRegistry: Record<string, ActionHandler> = {
  [emailAction.type]: emailAction,
  [telegramAction.type]: telegramAction,
};

/**
 * Retrieves the action handler for a specific action type.
 * Returns undefined if the action type is not supported.
 */
export function getActionHandler(type: string): ActionHandler | undefined {
  return actionRegistry[type];
}
