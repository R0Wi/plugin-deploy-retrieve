/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { bold } from 'chalk';
import { EnvironmentVariable, Messages, OrgConfigProperties, SfError } from '@salesforce/core';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { SourceConflictError } from '@salesforce/source-tracking';
import { getVersionMessage } from '../../../utils/output';
import { AsyncDeployResultFormatter } from '../../../formatters/asyncDeployResultFormatter';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeployProgress } from '../../../utils/progressBar';
import { DeployResultJson, TestLevel, reportsFormatters } from '../../../utils/types';
import { executeDeploy, resolveApi, validateTests, determineExitCode } from '../../../utils/deploy';
import { DeployCache } from '../../../utils/deployCache';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';
import { ConfigVars } from '../../../configMeta';
import { fileOrDirFlag, testLevelFlag } from '../../../utils/flags';
import { writeConflictTable } from '../../../utils/conflicts';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

const exclusiveFlags = ['manifest', 'source-dir', 'metadata', 'metadata-dir'];

export default class DeployMetadata extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['deploy:metadata'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'api-version': Flags.orgApiVersion({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    async: Flags.boolean({
      summary: messages.getMessage('flags.async.summary'),
      description: messages.getMessage('flags.async.description'),
      exclusive: ['wait'],
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      exclusive: ['verbose'],
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      default: false,
    }),
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.ignore-conflicts.summary'),
      description: messages.getMessage('flags.ignore-conflicts.description'),
      default: false,
    }),
    'ignore-errors': Flags.boolean({
      char: 'r',
      summary: messages.getMessage('flags.ignore-errors.summary'),
      description: messages.getMessage('flags.ignore-errors.description'),
      default: false,
    }),
    'ignore-warnings': Flags.boolean({
      char: 'g',
      summary: messages.getMessage('flags.ignore-warnings.summary'),
      description: messages.getMessage('flags.ignore-warnings.description'),
      default: false,
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exclusive: exclusiveFlags.filter((f) => f !== 'manifest'),
      exists: true,
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exclusive: exclusiveFlags.filter((f) => f !== 'metadata'),
    }),
    'metadata-dir': fileOrDirFlag({
      summary: messages.getMessage('flags.metadata-dir.summary'),
      exclusive: exclusiveFlags.filter((f) => f !== 'metadata-dir'),
      exists: true,
    }),
    'single-package': Flags.boolean({
      summary: messages.getMessage('flags.single-package.summary'),
      dependsOn: ['metadata-dir'],
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
      exclusive: exclusiveFlags.filter((f) => f !== 'source-dir'),
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    tests: Flags.string({
      char: 't',
      multiple: true,
      summary: messages.getMessage('flags.tests.summary'),
      description: messages.getMessage('flags.tests.description'),
    }),
    'test-level': testLevelFlag({
      default: TestLevel.NoTestRun,
      description: messages.getMessage('flags.test-level.description'),
      summary: messages.getMessage('flags.test-level.summary'),
      options: [TestLevel.NoTestRun, TestLevel.RunSpecifiedTests, TestLevel.RunLocalTests, TestLevel.RunAllTestsInOrg],
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
      exclusive: ['concise'],
    }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      defaultValue: 33,
      helpValue: '<minutes>',
      min: 1,
      exclusive: ['async'],
    }),
    'purge-on-delete': Flags.boolean({
      summary: messages.getMessage('flags.purge-on-delete.summary'),
      dependsOn: ['manifest'],
      relationships: [{ type: 'some', flags: ['pre-destructive-changes', 'post-destructive-changes'] }],
    }),
    'pre-destructive-changes': Flags.file({
      summary: messages.getMessage('flags.pre-destructive-changes.summary'),
      dependsOn: ['manifest'],
    }),
    'post-destructive-changes': Flags.file({
      summary: messages.getMessage('flags.post-destructive-changes.summary'),
      dependsOn: ['manifest'],
    }),
    'coverage-formatters': Flags.string({
      multiple: true,
      summary: messages.getMessage('flags.coverage-formatters.summary'),
      options: reportsFormatters,
    }),
    junit: Flags.boolean({ summary: messages.getMessage('flags.junit.summary'), dependsOn: ['coverage-formatters'] }),
    'results-dir': Flags.directory({
      dependsOn: ['coverage-formatters'],
      summary: messages.getMessage('flags.results-dir.summary'),
    }),
  };

  public static configurationVariablesSection = toHelpSection(
    'CONFIGURATION VARIABLES',
    OrgConfigProperties.TARGET_ORG,
    OrgConfigProperties.ORG_API_VERSION,
    ConfigVars.ORG_METADATA_REST_DEPLOY
  );

  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SF_USE_PROGRESS_BAR
  );

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const { flags } = await this.parse(DeployMetadata);
    if (
      this.project.getSfProjectJson().getContents()['pushPackageDirectoriesSequentially'] &&
      // flag exclusivity is handled correctly above - but to avoid short-circuiting the check, we need to check all of them
      !flags.manifest &&
      !flags.metadata &&
      !flags['source-dir']
    ) {
      // if pushPackageDirectoriesSequentially = true, and they're not using any of the flags that would modify their deploy
      // e.g. they're recreating a `source:push` command, which is the only one that respects this config value, warn them about it not working like it used to
      this.warn(messages.getMessage('pushPackageDirsWarning'));
    }
    if (!validateTests(flags['test-level'], flags.tests)) {
      throw messages.createError('error.NoTestsSpecified');
    }

    const api = await resolveApi(this.configAggregator);
    const { deploy, componentSet } = await executeDeploy(
      {
        ...flags,
        'target-org': flags['target-org'].getUsername(),
        api,
      },
      this.config.bin,
      this.project
    );

    const action = flags['dry-run'] ? 'Deploying (dry-run)' : 'Deploying';
    this.log(getVersionMessage(action, componentSet, api));
    if (!deploy.id) {
      throw new SfError('The deploy id is not available.');
    }
    this.log(`Deploy ID: ${bold(deploy.id)}`);

    if (flags.async) {
      if (flags['coverage-formatters']) {
        this.warn(messages.getMessage('asyncCoverageJunitWarning'));
      }
      const asyncFormatter = new AsyncDeployResultFormatter(deploy.id, this.config.bin);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus({ timeout: flags.wait });
    process.exitCode = determineExitCode(result);
    const formatter = new DeployResultFormatter(result, flags);

    if (!this.jsonEnabled()) {
      formatter.display();
      if (flags['dry-run']) this.logSuccess('Dry-run complete.');
    }

    await DeployCache.update(deploy.id, { status: result.response.status });

    return formatter.getJson();
  }

  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (error instanceof SourceConflictError) {
      if (!this.jsonEnabled()) {
        writeConflictTable(error.data);
        // set the message and add plugin-specific actions
        return super.catch({
          ...error,
          message: messages.getMessage('error.Conflicts'),
          actions: messages.getMessages('error.Conflicts.Actions', [this.config.bin]),
        });
      }
    }
    if (error.message.includes('client has timed out')) {
      const err = messages.createError('error.ClientTimeout', [this.config.bin]);
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }
}
