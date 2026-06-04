# iOS Simulator — Start & Stop

## Start

Starts Metro bundler and opens the iOS simulator. Kills any stale Metro process on port 8081 first. Warns if local Supabase is not running (auth and sync features require it).

```bash
pnpm ios
# or
bash scripts/ios-sim-start.sh
```

## Stop

Kills the Metro process on port 8081 and shuts down all booted simulators.

```bash
pnpm ios:stop
# or
bash scripts/ios-sim-stop.sh
```

## Prerequisites

Local Supabase must be running for auth and sync to work:

```bash
supabase start   # start
supabase stop    # stop
supabase status  # verify
```

See [local-environment.md](local-environment.md) for full setup instructions.
