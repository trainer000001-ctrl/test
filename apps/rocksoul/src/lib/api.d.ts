import type {
  CommandArguments,
  CommandResult,
  NativeCommand,
} from "./contracts";

export function isDesktop(): boolean;

export function call<Command extends NativeCommand>(
  command: Command,
  args?: CommandArguments<Command>,
): Promise<CommandResult<Command>>;
