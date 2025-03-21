import chalk from "chalk";

export type StackEvent = {
  EventId: string;
  LogicalResourceId: string;
  ResourceStatus: string;
  Timestamp: Date;
  ResourceStatusReason: string | undefined | null;
};
export type StackEventsType = { StackEvents: StackEvent[] };
export type DescribeStackEventsResult = { promise: () => Promise<StackEventsType> };
export type Stack = { StackStatus: string };
export type DescribeStacksType = { Stacks: Stack[] };
export type DescribeStacksResult = { promise: () => Promise<DescribeStacksType> };
export type CloudFormation = {
  describeStacks: (args: { StackName: string }) => DescribeStacksResult;
  describeStackEvents: (args: { StackName: string }) => DescribeStackEventsResult;
};

function isDone(ResourceStatus: string) {
  return (
    ResourceStatus.endsWith("_FAILED") ||
    ResourceStatus.endsWith("_ROLLBACK_COMPLETE") ||
    ResourceStatus.endsWith("_COMPLETE")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Wait for the given stack to be ready for the next deployment. Progress is output via console.log.
 *
 * @param cloudFormation The a service interface object.
 * @param params specify StackName
 * @returns {Promise<void>}
 */
async function doWait(cloudFormation: CloudFormation, params: { StackName: string }): Promise<void> {
  const { StackName } = params;

  const isStackEvent = ({ LogicalResourceId }: { LogicalResourceId: string }) => LogicalResourceId === StackName;

  // Poll events, yielding events from oldest to newest
  const describeStackEventsSince = async (LatestEventId: string) => {
    const { StackEvents } = await cloudFormation.describeStackEvents({ StackName }).promise();

    const index = StackEvents.findIndex(({ EventId }) => LatestEventId === EventId);

    const events = index === -1 ? StackEvents : StackEvents.slice(0, index);

    return events.reverse();
  };

  try {
    const {
      Stacks: [{ StackStatus }],
    } = await cloudFormation.describeStacks({ StackName }).promise();
    if (isDone(StackStatus)) {
      console.log(chalk`{green Ready}`);
      return;
    }

    let LatestEventId = "";
    let LatestStatus = "";

    do {
      const events = await describeStackEventsSince(LatestEventId);

      for (const event of events) {
        const { ResourceStatusReason } = event;

        if (isStackEvent(event)) {
          console.log(chalk`{bold {yellow ${event.Timestamp.toISOString()}} ${event.ResourceStatus}}`);
          LatestStatus = event.ResourceStatus;
        } else {
          console.log(chalk`{yellow ${event.Timestamp.toISOString()}} ${event.ResourceStatus}`);
        }
        if (ResourceStatusReason != null) console.log(chalk`${ResourceStatusReason}\n`);

        LatestEventId = event.EventId;
      }

      if (!isDone(LatestStatus)) {
        await sleep(10000);
      }
    } while (!isDone(LatestStatus));
  } catch (error: unknown) {
    if ((error as { code: unknown }).code === "ValidationError") {
      // Stack with id MyStackName does not exist
      console.log(chalk`{green Does Not Exist}`);
    } else {
      throw error;
    }
  }
  console.log(chalk`{green Ready}`);
}

export default doWait;
