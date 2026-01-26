import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { LogService } from "../logService";

type FakeLogChannel = vscode.LogOutputChannel & {
  calls: {
    debug: string[];
    info: string[];
    warn: string[];
    error: string[];
    disposed: boolean;
  };
};

function createFakeLogChannel(): FakeLogChannel {
  const emitter = new vscode.EventEmitter<vscode.LogLevel>();
  const calls = {
    debug: [] as string[],
    info: [] as string[],
    warn: [] as string[],
    error: [] as string[],
    disposed: false,
  };

  const channel: FakeLogChannel = {
    name: "test-channel",
    logLevel: vscode.LogLevel.Info,
    onDidChangeLogLevel: emitter.event,
    calls,
    append: () => {},
    appendLine: () => {},
    replace: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {
      calls.disposed = true;
      emitter.dispose();
    },
    trace: (value: string) => {
      calls.debug.push(value);
    },
    debug: (value: string) => {
      calls.debug.push(value);
    },
    info: (value: string) => {
      calls.info.push(value);
    },
    warn: (value: string) => {
      calls.warn.push(value);
    },
    error: (value: string) => {
      calls.error.push(value);
    },
  };

  return channel;
}

suite("LogService", () => {
  let createChannelStub: sinon.SinonStub;
  let fakeChannel: FakeLogChannel;

  setup(() => {
    fakeChannel = createFakeLogChannel();
    createChannelStub = sinon
      .stub(vscode.window, "createOutputChannel")
      .returns(fakeChannel);
  });

  teardown(() => {
    createChannelStub.restore();
  });

  test("creates log output channel with provided name", () => {
    const service = new LogService("Editor Switcher");
    assert.ok(service.outputChannel);
    assert.ok(
      createChannelStub.calledOnceWith("Editor Switcher", { log: true }),
    );
  });

  test("delegates debug/info/warn to output channel", () => {
    const service = new LogService("Test");
    service.debug("d1");
    service.info("i1");
    service.warn("w1");

    assert.deepStrictEqual(fakeChannel.calls.debug, ["d1"]);
    assert.deepStrictEqual(fakeChannel.calls.info, ["i1"]);
    assert.deepStrictEqual(fakeChannel.calls.warn, ["w1"]);
  });

  test("logs error with message only when no error object provided", () => {
    const service = new LogService("Test");
    service.error("simple failure");

    assert.deepStrictEqual(fakeChannel.calls.error, ["simple failure"]);
  });

  test("logs formatted error details when error object is provided", () => {
    const service = new LogService("Test");
    const err = new Error("boom");
    err.stack = "stack-trace";

    service.error("failed", err);

    assert.strictEqual(fakeChannel.calls.error.length, 1);
    assert.strictEqual(fakeChannel.calls.error[0], "failed: boom\nstack-trace");
  });

  test("dispose forwards to output channel", () => {
    const service = new LogService("Test");
    service.dispose();

    assert.strictEqual(fakeChannel.calls.disposed, true);
  });
});
