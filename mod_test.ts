import { assertEquals } from "https://deno.land/std@v0.60.0/testing/asserts.ts";
import {
  commandComponents,
  CommandLine,
  consoleErrorHandler,
  consoleUnhandledCommandReporter,
} from "./mod.ts";

const version = "0.0.0";
const cmd = "testCLI";

const docoptSpec = `
testCLI, the IGS docopt Command Line Handler.

Usage:
  ${cmd} eags transform rdbms erd <spec-file.ts>
  ${cmd} eags transform rdbms sql <dialect-name> <spec-file.ts>
  ${cmd} eags transform middleware server nestjs-typeorm <spec-file.ts>
  ${cmd} eags transform test-optional-args <spec-file.ts> [--path=PATH] [--verbose] 
  ${cmd} -h | --help
  ${cmd} -V | --version

Options:
  -h --help       Show this screen.
  -V --version    Show ${cmd} version.
  <dialect-name>  SQL database dialect:naming (e.g. Common_PK_Col_ID_Lowercase)
  --dest=<path>   Destination path for generated artifacts
`;

function transformERD(
  cl: CommandLine,
  customPrepend: string,
  specFileName: string,
): string {
  assertEquals("customPrepend", customPrepend);
  assertEquals("./test.file", specFileName);
  return "handled eags ERD";
}

function transformSQL(
  cl: CommandLine,
  dialectName: string,
  specFileName: string,
): string {
  assertEquals("SQLite:naming", dialectName);
  assertEquals("./test.ts", specFileName);
  return "handled eags SQL";
}

function transformTestOptionalArgs(
  cl: CommandLine,
  specFile: string,
  path?: string,
  verbose?: boolean,
): string {
  assertEquals("spec-file.ts", specFile);
  assertEquals("PATH", path);
  assertEquals(true, verbose);
  return "handled eags optional args";
}

function registerCommands(cli: CommandLine): void {
  cli.register({
    components: commandComponents("eags transform rdbms erd"),
    handler: transformERD,
    handlerArgs: ["<spec-file.ts>"],
  });
  cli.register({
    components: ["eags", "transform", "rdbms", "sql"],
    handler: transformSQL,
    handlerArgs: ["<dialect-name>", "<spec-file.ts>"],
  });
  cli.register({
    components: ["eags", "transform", "test-optional-args"],
    handler: transformTestOptionalArgs,
    handlerArgs: ["<spec-file.ts>", "--path", "--verbose"],
  });
}

Deno.test("CommandLine ERD", () => {
  const cli = new CommandLine(
    docoptSpec,
    { argv: "eags transform rdbms erd ./test.file" },
    version,
    consoleErrorHandler,
    consoleUnhandledCommandReporter,
    registerCommands,
  );
  assertEquals(true, cli.isValid, "CommandLine is not Valid");
  assertEquals("./test.file", cli.textOption("<spec-file.ts>"));
  const result = cli.handle(cli, "customPrepend");
  assertEquals(result, "handled eags ERD");
});

Deno.test("CommandLine SQL", () => {
  const cli = new CommandLine(
    docoptSpec,
    {
      argv: "eags transform rdbms sql SQLite:naming ./test.ts",
    },
    version,
    consoleErrorHandler,
    consoleUnhandledCommandReporter,
    registerCommands,
  );
  assertEquals(true, cli.isValid);
  assertEquals("./test.ts", cli.textOption("<spec-file.ts>"));
  const result = cli.handle(cli);
  assertEquals(result, "handled eags SQL");
});

Deno.test("CommandLine Optional Arguments", () => {
  const cli = new CommandLine(
    docoptSpec,
    {
      argv:
        "eags transform test-optional-args spec-file.ts --path=PATH --verbose",
    },
    version,
    consoleErrorHandler,
    consoleUnhandledCommandReporter,
    registerCommands,
  );
  assertEquals(true, cli.isValid);
  const result = cli.handle(cli);
  assertEquals(result, "handled eags optional args");
});

Deno.test("CommandLine Unhandled", () => {
  const unhandled = "unhandled";
  const cli = new CommandLine(
    docoptSpec,
    {
      argv: "eags transform middleware server nestjs-typeorm ./spec.ts",
    },
    version,
    consoleErrorHandler,
    (): any => {
      return unhandled;
    },
    registerCommands,
  );
  assertEquals(true, cli.isValid);
  const result = cli.handle(cli);
  assertEquals(result, unhandled);
});
