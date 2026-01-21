import { CloudFormation } from "@aws-sdk/client-cloudformation";
import cfnWaitReady from "../../src";

const completeEvent = {
  EventId: "2",
  LogicalResourceId: "stack-name",
  ResourceStatus: "UPDATE_COMPLETE",
  Timestamp: new Date(),
  ResourceStatusReason: "Event 2: Complete",
};

describe("Stack is ready", () => {
  const describeStacks = jest.fn().mockResolvedValue({
    Stacks: [{ StackStatus: "UPDATE_COMPLETE" }],
  });

  const describeStackEvents = jest.fn().mockResolvedValue({
    StackEvents: [completeEvent],
  });

  it("returns without describing events", async () => {
    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    const params = { StackName: "stack-name" };
    await cfnWaitReady(cloudFormation, params);
    expect(describeStackEvents).not.toHaveBeenCalled();
  });
});

describe("Stack is updating", () => {
  const describeStacks = jest.fn().mockResolvedValue({
    Stacks: [{ StackStatus: "UPDATE_IN_PROGRESS" }],
  });

  describe("completing in first polling cycle", () => {
    const describeStackEvents = jest.fn().mockResolvedValue({
      StackEvents: [completeEvent],
    });

    it("returns", () => {
      const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
      const params = { StackName: "stack-name" };
      return expect(cfnWaitReady(cloudFormation, params)).resolves.toBeUndefined();
    });
  });

  describe("completing in second polling cycle", () => {
    const incompleteEvent = {
      EventId: "1",
      LogicalResourceId: "other-resource",
      ResourceStatus: "OK",
      Timestamp: new Date(),
      ResourceStatusReason: null,
    };
    const stackEvents1 = {
      StackEvents: [incompleteEvent],
    };
    const stackEvents2 = {
      StackEvents: [completeEvent, incompleteEvent],
    };
    const describeStackEvents = jest.fn().mockResolvedValueOnce(stackEvents1).mockResolvedValueOnce(stackEvents2);

    const flushPromises = () => new Promise(setImmediate);

    it("sleeps once", async () => {
      jest.useFakeTimers({ advanceTimers: true });
      jest.spyOn(global, "setTimeout");
      const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
      const params = { StackName: "stack-name" };
      const result = cfnWaitReady(cloudFormation, params);
      await flushPromises();
      await flushPromises();
      jest.runAllTimers();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      await result;
    });
  });
});

describe("Stack is missing", () => {
  it("returns without describing events", async () => {
    const error: Error & { code: unknown } = { ...new Error("Stack with id MyStackName does not exist"), code: null };
    error.code = "ValidationError";
    const describeStacks = jest.fn().mockRejectedValue(error);
    const describeStackEvents = jest.fn().mockResolvedValueOnce(error);

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    const params = { StackName: "stack-name" };
    await cfnWaitReady(cloudFormation, params);
    expect(describeStackEvents).not.toHaveBeenCalled();
  });
});

describe("API has unexpected error", () => {
  const error: Error & { code: unknown } = { ...new Error("Internal server error"), code: null };
  error.code = "InternalServerError";

  const describeStacks = jest.fn().mockRejectedValue(error);

  const describeStackEvents = jest.fn().mockRejectedValueOnce(error);

  it("rejects", () => {
    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    const params = { StackName: "stack-name" };
    return expect(cfnWaitReady(cloudFormation, params)).rejects.toBe(error);
  });
});

describe("Stack describeStacks returns no stacks", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("handles Stacks: [] (empty array) and returns without describing events", async () => {
    const describeStacks = jest.fn().mockResolvedValue({ Stacks: [] });
    const describeStackEvents = jest.fn();

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    const params = { StackName: "stack-name" };

    await cfnWaitReady(cloudFormation, params);

    expect(describeStackEvents).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled(); // keeps the test resilient to chalk formatting
  });

  it("handles Stacks: undefined (missing field) and returns without describing events", async () => {
    // Simulate AWS returning no Stacks field at all
    const describeStacks = jest.fn().mockResolvedValue({});
    const describeStackEvents = jest.fn();

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    const params = { StackName: "stack-name" };

    await cfnWaitReady(cloudFormation, params);

    expect(describeStackEvents).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it("handles Stacks: null and returns without describing events", async () => {
    const describeStacks = jest.fn().mockResolvedValue({ Stacks: null });
    const describeStackEvents = jest.fn();

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    const params = { StackName: "stack-name" };

    await cfnWaitReady(cloudFormation, params);

    expect(describeStackEvents).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });
});

describe("Coverage for nullish/optional branches", () => {
  const flushPromises = () =>
    new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("covers stackStatus ?? null when StackStatus is undefined", async () => {
    const describeStacks = jest.fn().mockResolvedValue({
      Stacks: [{}],
    });

    const completeEvent1 = {
      EventId: "1",
      LogicalResourceId: "stack-name",
      ResourceStatus: "UPDATE_COMPLETE",
      Timestamp: new Date(),
      ResourceStatusReason: null,
    };

    const describeStackEvents = jest.fn().mockResolvedValue({
      StackEvents: [completeEvent1],
    });

    jest.spyOn(console, "log").mockImplementation(() => undefined);

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;
    await expect(cfnWaitReady(cloudFormation, { StackName: "stack-name" })).resolves.toBeUndefined();

    // Since StackStatus was undefined, it should not early-return and should poll events.
    expect(describeStackEvents).toHaveBeenCalled();
  });

  it("covers StackEvents undefined => events?.reverse() ?? []", async () => {
    const describeStacks = jest.fn().mockResolvedValue({
      Stacks: [{ StackStatus: "UPDATE_IN_PROGRESS" }],
    });

    const completeStackEvent = {
      EventId: "2",
      LogicalResourceId: "stack-name",
      ResourceStatus: "UPDATE_COMPLETE",
      Timestamp: new Date(),
      ResourceStatusReason: null,
    };

    const describeStackEvents = jest
      .fn()
      .mockResolvedValueOnce({ StackEvents: undefined })
      .mockResolvedValueOnce({ StackEvents: [completeStackEvent] });

    jest.spyOn(console, "log").mockImplementation(() => undefined);

    jest.useFakeTimers({ advanceTimers: true });

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;

    const p = cfnWaitReady(cloudFormation, { StackName: "stack-name" });

    // allow describeStacks + first describeStackEvents to resolve
    await flushPromises();
    await flushPromises();

    // release the internal sleep(10000)
    jest.advanceTimersByTime(10_000);

    // allow second poll to run and resolve
    await flushPromises();
    await flushPromises();

    await expect(p).resolves.toBeUndefined();
    expect(describeStackEvents).toHaveBeenCalledTimes(2);
  });

  it("covers ResourceStatus ?? null and EventId ?? null", async () => {
    const describeStacks = jest.fn().mockResolvedValue({
      Stacks: [{ StackStatus: "UPDATE_IN_PROGRESS" }],
    });

    // First poll: stack event missing EventId + ResourceStatus -> triggers both ?? null assignments
    const missingFieldsStackEvent = {
      LogicalResourceId: "stack-name",
      Timestamp: new Date(),
      ResourceStatusReason: null,
      // EventId: undefined,
      // ResourceStatus: undefined,
    };

    // Second poll: completing stack event to exit
    const completeStackEvent = {
      EventId: "99",
      LogicalResourceId: "stack-name",
      ResourceStatus: "UPDATE_COMPLETE",
      Timestamp: new Date(),
      ResourceStatusReason: null,
    };

    const describeStackEvents = jest
      .fn()
      .mockResolvedValueOnce({ StackEvents: [missingFieldsStackEvent] })
      .mockResolvedValueOnce({ StackEvents: [completeStackEvent, missingFieldsStackEvent] });

    jest.spyOn(console, "log").mockImplementation(() => undefined);

    jest.useFakeTimers({ advanceTimers: true });

    const cloudFormation = { describeStacks, describeStackEvents } as unknown as CloudFormation;

    const p = cfnWaitReady(cloudFormation, { StackName: "stack-name" });

    // let first poll resolve
    await flushPromises();
    await flushPromises();

    // release internal sleep(10000)
    jest.advanceTimersByTime(10_000);

    // let second poll resolve and finish
    await flushPromises();
    await flushPromises();

    await expect(p).resolves.toBeUndefined();
    expect(describeStackEvents).toHaveBeenCalledTimes(2);
  });
});
