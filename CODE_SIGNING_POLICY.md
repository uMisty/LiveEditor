# Code signing policy

Thus.Live Editor is an open-source desktop application maintained in the
[`uMisty/LiveEditor`](https://github.com/uMisty/LiveEditor) repository.

## Signing provider and current status

The project is applying for the SignPath Foundation open-source code-signing
program. After the application is accepted, Windows release binaries will use:

> Free code signing provided by SignPath.io, certificate by SignPath Foundation.

Until that integration is approved and enabled, release notes will identify
Windows binaries as unsigned. The project will not claim that an unsigned
artifact is signed.

## Build and release process

- Release artifacts are built from the public repository by GitHub Actions.
- Releases are started manually; ordinary pushes and pull requests cannot
  publish a GitHub Release.
- The release tag must match the version in `package.json`.
- Signing requests may only contain artifacts produced by the repository's
  release workflow from the tagged source revision.
- Every signing request and release requires manual approval by an approver.
- Release artifacts must use the product name `Thus.Live Editor` and the version
  declared in `package.json`.

## Team roles

- Committer and reviewer: [uMisty](https://github.com/uMisty)
- Signing approver: [uMisty](https://github.com/uMisty)

Changes from contributors who do not have direct commit access must be reviewed
by the maintainer before they are merged. Changes to the build, release, signing,
or dependency configuration receive the same review as application code.

## Privacy and security

The application does not transmit project contents. Its only routine automatic
network request checks the public GitHub latest-release endpoint for a newer
stable version; opening a release or another HTTP/HTTPS link is user initiated.
See the project [privacy policy](PRIVACY.md) for details.

Security or signing concerns can be reported privately to
[contact@thus.live](mailto:contact@thus.live).
