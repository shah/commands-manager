import * as ap from "https://cdn.jsdelivr.net/gh/shah/artifacts-persistence@v1.0.1/mod.ts";
import docopt from "https://cdn.jsdelivr.net/gh/Eyal-Shalev/docopt.js/src/docopt.ts";

export interface CommandHandler {
  (...args: any): any;
}

export interface ErrorHandler {
  (cl: CommandLine, message: string, fatal: boolean, ...args: any): void;
}

export interface CommandHandlerNotFoundReporter {
  (cl: CommandLine): any;
}

export function consoleErrorHandler(
  cli: CommandLine,
  message: string,
  ...args: any
): void {
  console.error(message, args);
}

export function consoleUnhandledCommandReporter(cl: CommandLine): void {
  console.error(
    "[E0995] Unable to find a command handler for a valid docopt CommandLine.",
  );
}

export function typicalRequiredArgSupplier(
  optionKey: string,
  humanName: string = optionKey,
  transform?: (value: any) => any,
  message?: (value: any, optionKey: string, humanName: string) => string,
) {
  return (options: any): any => {
    const value: string = options[optionKey] as string;
    if (!value) {
      throw new Error(`${humanName} is required.`);
    }
    if (transform) {
      const transformed = transform(value);
      if (!transformed) {
        console.error(
          message
            ? message(value, optionKey, humanName)
            : `${humanName} '${value}' is not valid.`,
        );
        Deno.exit(1);
      }
      return transformed;
    } else {
      return value;
    }
  };
}

export interface CommandHandlerArgSupplier {
  (options: any, ...contextArgs: any): any;
}

export type CommandHandlerArg = string | CommandHandlerArgSupplier;

export interface Command {
  readonly components: string[];
  readonly handler: CommandHandler;
  readonly handlerArgs?: CommandHandlerArg[];
}

export function commandComponents(command: string): string[] {
  const results: string[] = [];
  for (const c of command.split(" ")) {
    results.push(c.trim());
  }
  return results;
}

export class CommandLine {
  readonly registeredCmds: Command[] = [];
  readonly options: any;
  readonly isValid: boolean;

  constructor(
    readonly docoptSpec: string,
    readonly docoptInit: any = {},
    readonly version: string,
    readonly errorHandler: ErrorHandler,
    readonly unhandledCmdReporter: CommandHandlerNotFoundReporter,
    registerCommands: (cli: CommandLine) => void,
  ) {
    registerCommands(this);
    try {
      this.options = docopt(this.docoptSpec, {
        version: this.version,
        ...this.docoptInit,
      });
      this.isValid = true;
    } catch (e) {
      if (this.errorHandler) {
        this.errorHandler(this, e.message, true);
      }
      this.isValid = false;
    }
  }

  public register(cmd: Command): void {
    this.registeredCmds.push(cmd);
  }

  public textOption(key: string): string {
    return this.options[key] as string;
  }

  public numericOption(key: string): number {
    return this.options[key] as number;
  }

  public fileSystemPathPeristence(
    options: ap.FileSystemPersistenceOptions,
  ): ap.FileSystemPersistenceHandler {
    return new ap.FileSystemPersistenceHandler(options);
  }

  public projectPath(): string {
    return Deno.cwd();
  }

  public handle(...prependExtrArgs: any): any {
    // register all commands inverse sort the commands by the number of parts (cmd.length)
    // we want to handle the most-specific commands (longest) before the least-specific
    const commands = this.registeredCmds.sort(
      (b: Command, a: Command): number => {
        return a.components.length - b.components.length;
      },
    );
    let options;
    try {
      options = docopt(this.docoptSpec, {
        version: this.version,
        ...this.docoptInit,
      });
    } catch (e) {
      if (this.errorHandler) {
        this.errorHandler(this, e.message, true);
      }
      return;
    }
    for (const cmd of commands) {
      let found = 0;
      for (const comp of cmd.components) {
        if (options[comp]) found++;
      }
      if (found != cmd.components.length) continue;

      const args: any[] = prependExtrArgs ? prependExtrArgs : [];
      if (cmd.handlerArgs) {
        for (const argName of cmd.handlerArgs) {
          if (typeof argName === "string") {
            args.push(options[argName]);
          } else if (typeof argName === "function") {
            args.push(argName(options, ...prependExtrArgs));
          } else {
            console.error("Don't know what to do with argument: ", argName);
          }
        }
      }
      return cmd.handler(...args);
    }
    return this.unhandledCmdReporter(this);
  }
}

export const cliFactory = new (class {
  public typical(
    docoptSpec: string,
    version: string,
    registerCommands: (cli: CommandLine) => void,
  ): CommandLine {
    return new CommandLine(
      docoptSpec,
      {},
      version,
      consoleErrorHandler,
      consoleUnhandledCommandReporter,
      registerCommands,
    );
  }
})();
