import * as core from '@actions/core';
import { promises as fs } from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';
import { env } from 'process';

const asyncExec = util.promisify(exec);
const certificateFileName = env['TEMP'] + '\\certificate.pfx';

const timestampUrl = 'http://timestamp.digicert.com';
const signtool = 'C:/Program Files (x86)/Windows Kits/10/bin/10.0.17763.0/x86/signtool.exe';

const signtoolFileExtensions = [
    '.exe'
];

function sleep(seconds: number) {
    if (seconds > 0)
        console.log(`Waiting for ${seconds} seconds.`);
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// the cert should be a plain, unbroken line of base64
// use  `certutil [options] -encode infile outfile` to convert from a binary PFX, then remove the
// header, footer and the line breaks
// see https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil
async function createCertificatePfx() {
    const base64Certificate = core.getInput('certificate');
    const certificate = Buffer.from(base64Certificate, 'base64');
    if (certificate.length == 0) {
        console.log('The value for "certificate" is not set.');
        return false;
    }
    console.log(`Writing ${certificate.length} bytes to ${certificateFileName}.`);
    await fs.writeFile(certificateFileName, certificate);
    return true;
}

async function signWithSigntool(fileName: string) {
    try {
        const password = core.getInput('password')
        const { stdout, stderr } = await asyncExec(`"${signtool}" sign /f ${certificateFileName}${password ? ` /p ${password}` : ''} /tr ${timestampUrl} /td sha256 /fd sha256 ${fileName}`);
        console.log(stdout);
        console.log(stderr);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function trySignFile(fileName: string) {
    console.log(`Signing ${fileName}.`);
    const extension = path.extname(fileName);
    // retrieving the timestamp from a remote server may fail and is worth retrying
    for (let i = 0; i < 10; i++) {
        await sleep(i);
        if (signtoolFileExtensions.includes(extension)) {
            if (await signWithSigntool(fileName))
                return;
        }
        throw `Failed to sign '${fileName}'.`;
    }
}

async function* getFiles(folder: string): any {
    const files = await fs.readdir(folder);
    for (const file of files) {
        const fullPath = `${folder}/${file}`;
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
            const extension = path.extname(file);
            if (signtoolFileExtensions.includes(extension))
                yield fullPath;
        }
    }
}

async function signFiles() {
    const folder = core.getInput('folder', { required: true });
    for await (const file of getFiles(folder)) {
        await trySignFile(file);
    }
}

async function run() {
    try {
        if (await createCertificatePfx())
            await signFiles();
    }
    catch (err) {
        core.setFailed(`Action failed with error: ${err}`);
    }
}

run();
