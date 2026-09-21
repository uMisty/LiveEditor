# Privacy policy

Effective date: 2026-09-21

Thus.Live Editor is a local-first desktop editor maintained by uMisty. This
policy describes the behavior of the application distributed from the
[`uMisty/LiveEditor`](https://github.com/uMisty/LiveEditor) repository.

## Data processed by the application

The application reads and writes only the local Thus.Live project that the user
chooses, including Markdown articles, images, styles, and project configuration.
Blog profile values entered in the application are stored in that local project.

## Network activity

Thus.Live Editor does not include telemetry, analytics, advertising, crash
reporting, account services, or cloud synchronization. It does not
automatically upload project files or their contents.

At startup, and when the user selects **Check for updates**, the application
requests the public latest-release endpoint for the
[`uMisty/LiveEditor`](https://github.com/uMisty/LiveEditor) repository. This
request is used only to compare the latest stable GitHub Release with the
installed application version. It does not contain article contents, images,
blog configuration, or local project paths. As with any HTTPS request, GitHub
may receive ordinary connection metadata such as the IP address and user agent
under GitHub's own privacy policy.

If the user chooses not to be reminded about a release, that release version is
stored only in the application's local preferences. A later stable release can
still produce a new notification. The application does not download or install
updates automatically.

Remote images are not loaded by the built-in preview. When a user explicitly
opens an HTTP or HTTPS link, the application asks the operating system to open
that link in the user's default browser. The destination website and browser
then operate under their own privacy policies.

During local development, the application connects to a development server on
the same computer. This development-only connection is not present in packaged
release builds.

## Data retention and deletion

The project maintainer does not receive or retain application data because the
application does not transmit it. Users control retention by editing or deleting
files in their selected local project. Uninstalling the application does not
delete user-created project files.

## Changes and contact

Material changes to this policy will be committed to the public repository. For
privacy questions, contact [contact@thus.live](mailto:contact@thus.live).
