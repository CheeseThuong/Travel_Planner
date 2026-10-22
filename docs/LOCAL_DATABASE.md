# Disposable local database

P02 uses project `travel-planner-disposable-local` only. Install Node24/npm11 and Docker Desktop with Linux containers, then install the committed dependencies using `npm.cmd ci --strict-peer-deps` on Windows. CLI is a dev dependency; no Supabase cloud login, link or real credentials are needed.

```powershell
npm.cmd run db:seed:check
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run test:db
npm.cmd run db:stop
```

`db:reset` destroys and recreates this disposable local database. Never store personal trips in it. The command wrapper requires the exact local project identity, rejects linked/branch metadata and extra arguments, strips inherited remote credential variables, and always supplies `--local` to reset. Do not use `supabase link` in this directory. Cloud schema operations need a separate reviewed release procedure.

Docker must use a local Unix socket or Windows named pipe. The wrapper checks both inherited `DOCKER_HOST` and the active Docker context, and rejects TCP/SSH endpoints before creating a network or running database commands.

Config reserves API55321, Postgres55322 and shadow55320. Only database, auth, REST and gateway services are needed; Studio, storage, realtime, email, analytics and edge runtime are disabled. Start health checks remain required. Local startup output may contain generated credentials, so it is kept in ignored `.tools/supabase-start.log`, not committed reports. This is disposable test infrastructure, not a production-ready hosted stack.

The wrapper creates a repository-labelled Docker bridge `travel-planner-disposable-loopback` with `com.docker.network.bridge.host_binding_ipv4=127.0.0.1` and validates it before every command. It refuses a foreign or non-loopback network. This follows the [Supabase local networking guidance](https://supabase.com/docs/guides/local-development); do not replace it with a network bound to all interfaces.

`node scripts/build-catalog-db-seed.mjs` rebuilds SQL offline from the two original JSON files; `--check` detects drift. Both cities have 30 original records, fixed original place UUIDs and full JSON metadata. Destinations and places remain draft. Public roles can read only published places under published destinations and cannot edit editorial data. Test publication changes occur inside rolled-back pgTAP transactions. Seeding never promotes records or overwrites existing editorial rows.

The source catalog remains ODbL-1.0 with its original rights/attribution files. Destination center coordinates are representative map centers, not verified entrances or route endpoints. Unknown place hours remain unknown. Catalog DB tests do not prove trip ownership, auth recovery, routing accuracy, offline saves or share security; those require later tasks and gates.
