# Disposable local database

P02 uses project `travel-planner-disposable-local` only. Install Node24/npm11 and Docker Desktop with Linux containers, then install the committed dependencies using `npm.cmd ci --strict-peer-deps` on Windows. Windows local DB commands also require .NET10 SDK for the offline project-scoped Docker argument adapter (no NuGet packages); this host already has10.0.401. CLI is a dev dependency; no Supabase cloud login, link or real credentials are needed.

```powershell
npm.cmd run db:seed:check
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run test:db
npm.cmd run db:stop
```

`db:reset` destroys and recreates this disposable local database. Never store personal trips in it. The command wrapper requires the exact local project identity, rejects cloud project-ref metadata, named branches other than the CLI-generated local `main` marker and extra arguments, strips inherited remote credential variables, and always supplies `--local` to reset. Do not use `supabase link` in this directory. Cloud schema operations need a separate reviewed release procedure.

Docker must use a local Unix socket or Windows named pipe. The wrapper checks both inherited `DOCKER_HOST` and the active Docker context, and rejects TCP/SSH endpoints before creating a network or running database commands.

Config reserves API35321, Postgres35322 and shadow35320. Only database, auth, REST and gateway services are needed; Studio, storage, realtime, email, analytics and edge runtime are disabled. Start health checks remain required. Local startup output may contain generated credentials, so it is kept in ignored `.tools/supabase-start.log`, not committed reports. This is disposable test infrastructure, not a production-ready hosted stack.

The wrapper creates a repository-labelled Docker bridge `travel-planner-disposable-loopback` with `com.docker.network.bridge.host_binding_ipv4=127.0.0.1` and validates it before every command. It refuses a foreign or non-loopback network. This follows the [Supabase local networking guidance](https://supabase.com/docs/guides/local-development); do not replace it with a network bound to all interfaces.

Configuration alone is insufficient: Docker29.8.2 on this Windows host ignored the network's default binding. Windows commands therefore prepend an adapter only to the Supabase child environment; for project container/network names and353xx ports it passes an explicit127.0.0.1 address. Global PATH/daemon/firewall stay unchanged. The wrapper inspects actual DB/gateway bindings after start/reset and before tests, and stops/fails if non-loopback mapping appears. Adapter build/cache/private startup logs stay in ignored .tools. Argument forwarding uses ProcessStartInfo.ArgumentList and explicit byte-stream relay; credentials/args are not logged by the adapter.

`node scripts/build-catalog-db-seed.mjs` rebuilds SQL offline from the two original JSON files; `--check` detects drift. Both cities have 30 original records, fixed original place UUIDs and full JSON metadata. Destinations and places remain draft. Public roles can read only published places under published destinations and cannot edit editorial data. Test publication changes occur inside rolled-back pgTAP transactions. Seeding never promotes records or overwrites existing editorial rows.

The source catalog remains ODbL-1.0 with its original rights/attribution files. Destination center coordinates are representative map centers, not verified entrances or route endpoints. Unknown place hours remain unknown. Catalog DB tests do not prove trip ownership, auth recovery, routing accuracy, offline saves or share security; those require later tasks and gates.
