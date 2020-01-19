# AWS CloudFormation Wait Ready

This utility waits until an AWS CloudFormation Stack is ready to update. It is similar to `aws cloudformation wait stack-update-complete` but waits for any stack status where an update should be allowed. A feature request for a similar feature from the [aws cli](https://github.com/aws/aws-cli/issues/2887) has been filed, but not implemented. The feature is useful for CI scripts that test deployment.

This package is meant to be used as a command-line tool.

To install it in your project:

```
yarn add --dev @cumulusds/aws-cloudformation-wait-ready
```

To use it:

```
yarn aws-cloudformation-wait-ready --region=us-east-1 --stack-name=MyStackName
```

# Development

- [Package Structure](doc/development.md#package-structure)
- [Development Environment](doc/development.md#development-environment)
- [Quality](doc/development.md#quality)
- [Release](doc/development.md#release)

## License

This package is [MIT licensed](LICENSE).
