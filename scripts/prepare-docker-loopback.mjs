import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, delimiter } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export function buildWindowsDockerAdapter(root, env) {
  const output = resolve(root, ".tools/docker-loopback");
  const source = resolve(root, "scripts/docker-loopback");
  const hash = createHash("sha256").update(["Program.cs", "DockerLoopback.csproj", "NuGet.Config"].map((file) => readFileSync(resolve(source, file), "utf8").replaceAll("\r\n", "\n")).join("\n")).digest("hex");
  mkdirSync(output, { recursive: true });
  const fingerprint = resolve(output, "source.sha256");
  if (!existsSync(resolve(output, "docker.exe")) || !existsSync(fingerprint) || readFileSync(fingerprint, "utf8") !== hash) {
    const buildEnv = { ...env, DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1", DOTNET_GENERATE_ASPNET_CERTIFICATE: "false", DOTNET_NOLOGO: "1", DOTNET_CLI_HOME: resolve(root, ".tools/dotnet"), NUGET_PACKAGES: resolve(root, ".tools/nuget") };
    const args = ["build", resolve(source, "DockerLoopback.csproj"), "--configuration", "Release", "--output", output, "--configfile", resolve(source, "NuGet.Config"), "-p:BaseIntermediateOutputPath=" + resolve(output, "obj") + "/"];
    execFileSync("dotnet", args, { cwd: root, env: buildEnv, stdio: ["ignore", "pipe", "pipe"] });
    writeFileSync(fingerprint, hash);
  }
  return resolve(output, "docker.exe");
}

export function prepareWindowsDockerAdapter(root, env) {
  const executable = buildWindowsDockerAdapter(root, env), output = resolve(root, ".tools/docker-loopback");
  const realDocker = execFileSync("where.exe", ["docker.exe"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\r?\n/)[0];
  assert.ok(existsSync(realDocker) && !realDocker.toLowerCase().startsWith(output.toLowerCase()), "Real Docker executable required");
  const path = env.PATH ?? env.Path;
  for (const key of Object.keys(env)) if (key.toLowerCase() === "path") delete env[key];
  env.Path = output + delimiter + path;
  env.TRAVEL_PLANNER_REAL_DOCKER = realDocker;
  return executable;
}
