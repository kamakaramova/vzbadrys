<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Production deployment

- The live store is hosted on the REG.Cloud VPS, not on Vercel. A successful
  Vercel build does not publish changes to the main domain.
- Follow `DEPLOYMENT_RUNBOOK.md` for every production release. The normal path
  is: commit only the intended files, push `main`, then run the protected VPS
  deploy script over the configured project SSH connection and verify both the
  storefront and Ozon gateway.
- Do not open the REG.Cloud panel or ask the user to sign in when the configured
  project SSH key works.
- Whenever a deployment or maintenance problem reveals a corrected command,
  port, path, or recovery step, update `DEPLOYMENT_RUNBOOK.md` in the same task.
