#!/usr/bin/env node
import parseArgs from "minimist";
import { CloudFormation } from "aws-sdk";
// eslint-disable-next-line import/extensions
import cfnWaitReady from "../lib/index.js";

const args = parseArgs(process.argv.slice(2), {
  alias: {
    region: ["r"],
    "stack-name": ["s"],
    help: ["h"],
  },
  boolean: ["help"],
});

function printHelp() {
  console.log(
    "Wait for a stack to finish updating.\n" +
      "Options:\n" +
      "\t-r REGION, --region STRING    - Specify the AWS region to address\n" +
      "\t-s STACK, --stack-name STRING - Name of the stack to wait on\n" +
      "\t-h, --help                    - Print this message.\n",
  );
}

const { region, "stack-name": StackName } = args;

if (args.help || !region || !StackName) {
  printHelp();
  process.exit(1);
}

const cloudFormation = new CloudFormation({ region });

cfnWaitReady(cloudFormation, { StackName });
