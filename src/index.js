// @flow

import chalk from "chalk";

export type StackEvent = {
  EventId: string,
  LogicalResourceId: string,
  ResourceStatus: string,
  Timestamp: Date,
  ResourceStatusReason: ?string
};
export type StackEventsType = { StackEvents: StackEvent[] };
export type DescribeStackEventsResult = { promise: () => Promise<StackEventsType> };
export type Stack = { StackStatus: string };
export type DescribeStacksType = { Stacks: Stack[] };
export type DescribeStacksResult = { promise: () => Promise<DescribeStacksType> };
export type CloudFormation = {
  describeStacks: ({ StackName: string }) => DescribeStacksResult,
  describeStackEvents: ({ StackName: string }) => DescribeStackEventsResult
};

function isDone(ResourceStatus) {
  return (
    ResourceStatus.endsWith("_FAILED") ||
    ResourceStatus.endsWith("_ROLLBACK_COMPLETE") ||
    ResourceStatus.endsWith("_COMPLETE")
  );
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Wait for the given stack to be ready for the next deployment. Progress is output via console.log.
 *
 * @param cloudFormation: The a service interface object.
 * @param params: specify StackName
 * @returns {Promise<void>}
 */
export default async function(cloudFormation: CloudFormation, params: { StackName: string }) {
  const { StackName } = params;

  const isStackEvent = ({ LogicalResourceId }) => LogicalResourceId === StackName;

  // Poll events, yielding events from oldest to newest
  const describeStackEventsSince = async LatestEventId => {
    const { StackEvents } = await cloudFormation.describeStackEvents({ StackName }).promise();

    const index = StackEvents.findIndex(({ EventId }) => LatestEventId === EventId);

    const events = index === -1 ? StackEvents : StackEvents.slice(0, index);

    return events.reverse();
  };

  const {
    Stacks: [{ StackStatus }]
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

    if (!isDone(LatestStatus)) await sleep(10000);
  } while (!isDone(LatestStatus));
  console.log(chalk`{green Ready}`);
}
