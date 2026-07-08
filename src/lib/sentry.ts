import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://4d74ec2784737d7e2dd910a0ad3c59f1@o4511691839963136.ingest.us.sentry.io/4511691856674816",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
});
