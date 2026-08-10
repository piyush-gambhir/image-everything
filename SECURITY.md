# Security Policy

## Supported versions

Security fixes are applied to the latest release on the default branch.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting flow for this repository:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Include reproduction steps, affected endpoints, impact, and any suggested
   mitigation.

Do not open a public issue for suspected vulnerabilities and do not include
private image files, EXIF/GPS records, API keys, or deployment credentials.

## Deployment guidance

- Keep the API and libvips dependencies updated.
- Configure `CORS_ORIGIN` explicitly on internet-facing deployments.
- Put public deployments behind TLS, request-size limits, and an authenticating
  reverse proxy when multiple users share an instance.
- Keep the image worker on a private network, configure a unique
  `IMAGE_WORKER_TOKEN`, and never expose its port to the public internet.
- Treat `NEXT_PUBLIC_*` values as public browser configuration.
- Do not log request bodies, image bytes, filenames, or extracted metadata.
