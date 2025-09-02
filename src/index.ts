import chalk from "chalk";
import { CloudFormation, ResourceStatus, StackEvent, StackStatus } from "@aws-sdk/client-cloudformation";

function isDone(resourceStatus: ResourceStatus | StackStatus | null): boolean {
  if (!resourceStatus) {
    return false;
  }
  return (
    resourceStatus.endsWith("_FAILED") ||
    resourceStatus.endsWith("_ROLLBACK_COMPLETE") ||
    resourceStatus.endsWith("_COMPLETE")
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

  const isStackEvent = ({ LogicalResourceId }: StackEvent) => LogicalResourceId === StackName;

  // Poll events, yielding events from oldest to newest
  const describeStackEventsSince = async (LatestEventId: string | null): Promise<StackEvent[]> => {
    const { StackEvents } = await cloudFormation.describeStackEvents({ StackName });

    const index = StackEvents?.findIndex(({ EventId }) => LatestEventId === EventId);

    const events = index === -1 ? StackEvents : StackEvents?.slice(0, index);

    return events?.reverse() ?? [];
  };

  try {
    const response = await cloudFormation.describeStacks({ StackName });
    const stacks = response.Stacks;
    if (stacks == null || stacks.length === 0) {
      console.log(chalk`{green Does Not Exist}`);
      return;
    }
    const { StackStatus: stackStatus } = stacks[0];

    // Check the current status
    if (isDone(stackStatus ?? null)) {
      console.log(chalk`{green Ready}`);
      return;
    }

    let LatestEventId: string | null = null;
    let LatestStatus: ResourceStatus | null = null;

    do {
      const events = await describeStackEventsSince(LatestEventId);

      for (const event of events) {
        const { ResourceStatusReason } = event;

        if (isStackEvent(event)) {
          console.log(chalk`{bold {yellow ${event.Timestamp?.toISOString()}} ${event.ResourceStatus}}`);
          LatestStatus = event.ResourceStatus ?? null;
        } else {
          console.log(chalk`{yellow ${event.Timestamp?.toISOString()}} ${event.ResourceStatus}`);
        }
        if (ResourceStatusReason != null) console.log(chalk`${ResourceStatusReason}\n`);

        LatestEventId = event.EventId ?? null;
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
