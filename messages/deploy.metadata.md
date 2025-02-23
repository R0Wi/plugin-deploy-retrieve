# summary

Deploy metadata to an org from your local project.

# description

You must run this command from within a project.

Metadata components are deployed in source format by default. Deploy them in metadata format by specifying the --metadata-dir flag, which specifies the root directory or ZIP file that contains the metadata formatted files you want to deploy.

If your org allows source tracking, then this command tracks the changes in your source. Some orgs, such as production org, never allow source tracking. Source tracking is enabled by default on scratch and sandbox orgs; you can disable source tracking when you create the orgs by specifying the --no-track-source flag on the "<%= config.bin %> org create scratch|sandbox" commands.

To deploy multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Deploy local changes not in the org; uses your default org:

      <%= config.bin %> <%= command.id %>

- Deploy the source files in a directory to an org with alias "my-scratch":

      <%= config.bin %> <%= command.id %>  --source-dir path/to/source --target-org my-scratch

- Deploy a specific Apex class and the objects whose source is in a directory (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls path/to/source/objects
      <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls --source-dir path/to/source/objects

- Deploy all Apex classes:

      <%= config.bin %> <%= command.id %> --metadata ApexClass

- Deploy a specific Apex class:

      <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Deploy all custom objects and Apex classes (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --metadata CustomObject ApexClass
      <%= config.bin %> <%= command.id %> --metadata CustomObject --metadata ApexClass

- Deploy all Apex classes and a profile that has a space in its name:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --metadata "Profile:My Profile"

- Deploy all components listed in a manifest:

      <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Run the tests that aren’t in any managed packages as part of a deployment:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --test-level RunLocalTests

# flags.target-org.summary

Login username or alias for the target org.

# flags.pre-destructive-changes.summary

File path for a manifest (destructiveChangesPre.xml) of components to delete before the deploy

# flags.post-destructive-changes.summary

File path for a manifest (destructiveChangesPost.xml) of components to delete after the deploy.

# flags.purge-on-delete.summary

Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion rather than being stored in the Recycle Bin.

# flags.target-org.description

Overrides your default org.

# flags.metadata.summary

Metadata component names to deploy.

# flags.test-level.summary

Deployment Apex testing level.

# flags.test-level.description

Valid values are:

- NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

- RunSpecifiedTests — Runs only the tests that you specify with the --run-tests flag. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

- RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

- RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

  If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more information, see [Running Tests in a Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm) in the "Metadata API Developer Guide".

# flags.source-dir.summary

Path to the local source files to deploy.

# flags.source-dir.description

The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its subdirectories).

If you specify this flag, don’t specify --metadata or --manifest.

# flags.wait.summary

Number of minutes to wait for command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you and returns the job ID. To resume the deployment, run "<%= config.bin %> project deploy resume". To check the status of the deployment, run "<%= config.bin %> project deploy report".

# flags.manifest.summary

Full file path for manifest (package.xml) of components to deploy.

# flags.manifest.description

All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

# flags.dry-run.summary

Validate deploy and run Apex tests but don’t save to the org.

# flags.ignore-conflicts.summary

Ignore conflicts and deploy local files, even if they overwrite changes in the org.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.ignore-errors.summary

Ignore any errors and don’t roll back deployment.

# flags.ignore-errors.description

When deploying to a production org, keep this flag set to false (default value). When set to true, components without errors are deployed and components with errors are skipped, and could result in an inconsistent production org.

# flags.ignore-warnings.summary

Ignore warnings and allow a deployment to complete successfully.

# flags.ignore-warnings.description

If a warning occurs and this flag is set to true, the success status of the deployment is set to true. When this flag is set to false, success is set to false, and the warning is treated like an error.

# flags.tests.summary

Apex tests to run when --test-level is RunSpecifiedTests.

# flags.tests.description

Separate multiple test names with commas, and enclose the entire flag value in double quotes if a test contains a space.

# flags.verbose.summary

Show verbose output of the deploy result.

# flags.concise.summary

Show concise output of the deploy result.

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# flags.async.summary

Run the command asynchronously.

# flags.async.description

The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the CLI. To resume the deployment, run "<%= config.bin %> project deploy resume". To check the status of the deployment, run "<%= config.bin %> project deploy report".

# flags.metadata-dir.summary

Root of directory or zip file of metadata formatted files to deploy.

# flags.single-package.summary

Indicates that the metadata zip file points to a directory structure for a single package.

# save.as.default

Save %s as default target-org?

# errors.NoOrgsToSelect

Can't find any active scratch orgs, Dev Hubs, or other orgs.
Either log into an org or create a scratch org, and then try again.

# error.NoTestsSpecified

You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.

# error.ClientTimeout

The command has timed out, although the deployment is still running. Use "%s project deploy resume" to resume watching the deployment.

# error.Conflicts

There are changes in the org that conflict with the local changes you're trying to deploy.

# error.Conflicts.Actions

- To overwrite the remote changes, rerun this command with the --ignore-conflicts flag.

- To overwrite the local changes, run the "%s project retrieve start" command with the --ignore-conflicts flag.

# error.nothingToDeploy

No local changes to deploy.

# error.nothingToDeploy.Actions

- To see conflicts and ignored files, run "%s project deploy preview" with any of the manifest, directory, or metadata flags.

# flags.junit.summary

Output JUnit test results.

# flags.coverage-formatters.summary

Format of the code coverage results.

# flags.results-dir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# asyncCoverageJunitWarning

You requested an async deploy with code coverage or JUnit results. The reports will be available when the deploy completes.

# pushPackageDirsWarning

The `pushPackageDirectoriesSequentially` property is not respected by this command. Please call the `project deploy start --source-dir` command for each dependency in the correct order.
