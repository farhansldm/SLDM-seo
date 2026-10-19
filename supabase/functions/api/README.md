# Phase 1 Edge API

This function provides the authentication, client, team, website, and competitor
endpoints used by the existing React application. It validates each bearer token
with Supabase Auth and applies application-level agency and client scoping before
using the service-role database client.

Required hosted secrets:

- `SUPABASE_URL` (provided automatically by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (provided automatically by Supabase)

Deploy from an account with access to the project:

```sh
npx supabase login
npx supabase functions deploy api --project-ref wwokqaqmmrotmunradgg --no-verify-jwt
```

The function URL is:

```text
https://wwokqaqmmrotmunradgg.supabase.co/functions/v1/api
```

`verify_jwt` is disabled at the gateway because the function validates the token
using `auth.getUser()` and then resolves the active application profile and tenant.
