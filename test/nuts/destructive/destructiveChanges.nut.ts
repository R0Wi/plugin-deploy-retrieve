/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { AuthInfo, Connection } from '@salesforce/core';

const isNameObsolete = async (username: string, memberType: string, memberName: string): Promise<boolean> => {
  const connection = await Connection.create({
    authInfo: await AuthInfo.create({ username }),
  });

  const res = await connection.singleRecordQuery<{ IsNameObsolete: boolean }>(
    `SELECT IsNameObsolete FROM SourceMember WHERE MemberType='${memberType}' AND MemberName='${memberName}'`,
    { tooling: true }
  );

  return res.IsNameObsolete;
};

describe('project deploy start --destructive NUTs', () => {
  let testkit: SourceTestkit;

  const createApexClass = (apexName = 'myApexClass') => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output}`, { ensureExitCode: 0 });
    execCmd(`project:deploy:start -m ApexClass:${apexName}`, { ensureExitCode: 0 });
    return { apexName, output, pathToClass };
  };

  const createManifest = (metadata: string, manifesttype: string) => {
    execCmd(`force:source:manifest:create --metadata ${metadata} --manifesttype ${manifesttype}`, {
      ensureExitCode: 0,
    });
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: __filename,
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('project:deploy:start --source-dir force-app', { ensureExitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('destructive changes POST', () => {
    it('should deploy and then delete an ApexClass ', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'post');

      execCmd(
        'project:deploy:start --json --manifest package.xml --post-destructive-changes destructiveChangesPost.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });
  });

  describe('destructive changes PRE', () => {
    it('should delete an ApexClass and then deploy a class', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });

    it('should delete an ApexClass and then deploy a class with --purge-on-delete', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --purge-on-delete --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });
  });

  describe('destructive changes POST and PRE', () => {
    it('should delete a class, then deploy and then delete an ApexClass', async () => {
      const pre = createApexClass('pre').apexName;
      const post = createApexClass('post').apexName;
      let preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      let postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);

      expect(preDeleted).to.be.false;
      expect(postDeleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${post}`, 'post');
      createManifest(`ApexClass:${pre}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);
      expect(preDeleted).to.be.true;
      expect(postDeleted).to.be.true;
    });

    it('should delete a class, then deploy and then delete an ApexClass with --purge-on-delete', async () => {
      const pre = createApexClass('pre').apexName;
      const post = createApexClass('post').apexName;
      let preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      let postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);

      expect(preDeleted).to.be.false;
      expect(postDeleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${post}`, 'post');
      createManifest(`ApexClass:${pre}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --purge-on-delete --post-destructive-changes destructiveChangesPost.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);
      expect(preDeleted).to.be.true;
      expect(postDeleted).to.be.true;
    });
  });

  describe('errors', () => {
    it('should throw an error when a pre destructive flag is passed without the manifest flag', async () => {
      const { apexName } = createApexClass();

      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd(
          'project:deploy:start --json --source-dir force-app --pre-destructive-changes destructiveChangesPre.xml'
        );
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include(
          'Error: --manifest= must also be provided when using --pre-destructive-changes='
        );
      }
    });

    it('should throw an error when a post destructive flag is passed without the manifest flag', async () => {
      const { apexName } = createApexClass();

      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd(
          'project:deploy:start --json --source-dir force-app --post-destructive-changes destructiveChangesPre.xml'
        );
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include(
          'Error: --manifest= must also be provided when using --post-destructive-changes='
        );
      }
    });

    it("should throw an error when a destructive manifest is passed that doesn't exist", () => {
      createManifest('ApexClass:GeocodingService', 'package');

      try {
        execCmd('project:deploy:start --json --manifest package.xml --pre-destructive-changes doesntexist.xml');
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include("ENOENT: no such file or directory, open 'doesntexist.xml'");
      }
    });
  });
});
