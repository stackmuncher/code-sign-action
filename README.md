# Windows Code Signing GitHub Action

This is an updated and stripped down version of https://github.com/dlemstra/code-sign-action via https://github.com/vespakoen/code-sign-action/commit/36116b6c909e1f6decd8584a798e4feec15835fe.

This action signs `.exe` files in the specified directory using `signtool.exe`. This works on Windows only. The cert and password must be provided via _secrets_.

The files being signed are overwritten with their signed copy.

## How to prepare a certificate

Assuming that you have a valid .pfx file, 
1. run `certutil -encode my_cert.pfx my_cert_as_base64.txt`
2. open _my_cert_as_base64.txt_ and remove the header/footer, e.g. "-----BEGIN CERTIFICATE-----"
3. remove all new line chars to make it a single continuous string
4. copy-paste the string into the "secret" on GitHub

This code does not parse the contents of the base64 cert - it decodes it and saves as a binary .pfx file for _signtool_ to use. 

## Inputs

### `certificate`

**Required** The base64 encoded certificate as a single base64, no header, footer or line breaks.

### `password`

**Required** Certificate's password. Optional, but you really should have one.

### `folder`

**Required** The folder that contains the files to sign, e.g. `target\release` or `.`..

## Example usage

```
runs-on: windows-latest
steps:
  uses: stackmuncher/code-sign-action
  with:
    certificate: '${{ secrets.WIN_CERT_B64 }}'
    password: '${{ secrets.WIN_CERT_B64_P }}'
    folder: '.'
```