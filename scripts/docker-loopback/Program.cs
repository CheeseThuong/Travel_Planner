using System.Diagnostics;

static class Program
{
    const string Network = "travel-planner-disposable-loopback";
    const string Project = "travel-planner-disposable-local";
    static string? Option(string[] args, string key)
    {
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i] == key && i + 1 < args.Length) return args[i + 1];
            if (args[i].StartsWith(key + "=", StringComparison.Ordinal)) return args[i][(key.Length + 1)..];
        }
        return null;
    }
    static string Bind(string value)
    {
        var protocol = value.Split('/');
        if (protocol.Length > 2 || (protocol.Length == 2 && protocol[1] != "tcp")) throw new InvalidOperationException();
        var parts = protocol[0].Split(':');
        if (parts.Length == 3 && parts[0] != "127.0.0.1") throw new InvalidOperationException();
        if (parts.Length != 2 && parts.Length != 3) throw new InvalidOperationException();
        var offset = parts.Length - 2;
        if (!int.TryParse(parts[offset], out int host) || host < 35320 || host > 35329 ||
            !int.TryParse(parts[offset + 1], out int container) || container < 1 || container > 65535) throw new InvalidOperationException();
        return "127.0.0.1:" + parts[offset] + ":" + parts[offset + 1] + (protocol.Length == 2 ? "/tcp" : "");
    }
    static string[] Rewrite(string[] args)
    {
        var output = (string[])args.Clone();
        for (int i = 1; i < args.Length; i++)
        {
            bool separate = args[i] is "-p" or "--publish";
            bool equal = args[i].StartsWith("--publish=", StringComparison.Ordinal);
            bool compact = args[i].StartsWith("-p", StringComparison.Ordinal) && args[i].Length > 2;
            if (!separate && !equal && !compact) continue;
            if (args[0] is not ("create" or "run") || Option(args, "--network") != Network ||
                Option(args, "--name")?.EndsWith("_" + Project, StringComparison.Ordinal) != true) throw new InvalidOperationException();
            if (separate)
            {
                if (i + 1 >= args.Length) throw new InvalidOperationException();
                output[++i] = Bind(args[i]);
            }
            else if (equal) output[i] = "--publish=" + Bind(args[i][10..]);
            else output[i] = "-p" + Bind(args[i][2..]);
        }
        return output;
    }
    static int SelfTest()
    {
        string[] scoped = ["create", "--name", "supabase_db_" + Project, "--network", Network, "-p", "35322:5432", "image"];
        if (Rewrite(scoped)[6] != "127.0.0.1:35322:5432") return 1;
        foreach (var value in new[] { "0.0.0.0:35322:5432", "35399:5432", "[::]:35322:5432", "35322:99999" })
        {
            var changed = (string[])scoped.Clone(); changed[6] = value;
            try { Rewrite(changed); return 1; } catch (InvalidOperationException) { }
        }
        foreach (var key in new[] { "--name", "--network" })
        {
            var changed = (string[])scoped.Clone(); changed[Array.IndexOf(changed, key) + 1] = "foreign";
            try { Rewrite(changed); return 1; } catch (InvalidOperationException) { }
        }
        string[] opaque = ["inspect", "literal quote\" backslash\\ space & $(not-a-shell) `literal`"];
        if (!Rewrite(opaque).SequenceEqual(opaque)) return 1;
        var equal = (string[])scoped.Clone(); equal[5] = "--publish=35322:5432"; equal[6] = "--rm";
        if (Rewrite(equal)[5] != "--publish=127.0.0.1:35322:5432") return 1;
        Console.WriteLine("PASS: scoped loopback adapter argument tests"); return 0;
    }
    static async Task<int> Main(string[] args)
    {
        if (args.SequenceEqual(new[] { "--self-test" })) return SelfTest();
        try
        {
            var executable = Environment.GetEnvironmentVariable("TRAVEL_PLANNER_REAL_DOCKER");
            if (executable is null || !Path.IsPathFullyQualified(executable) || !File.Exists(executable) ||
                Path.GetFullPath(executable).Equals(Environment.ProcessPath, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException();
            var start = new ProcessStartInfo(executable) { UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true };
            foreach (var arg in Rewrite(args)) start.ArgumentList.Add(arg);
            using var child = Process.Start(start) ?? throw new InvalidOperationException();
            using var cancellation = new CancellationTokenSource();
            int inputFailed = 0;
            var stdout = child.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput());
            var stderr = child.StandardError.BaseStream.CopyToAsync(Console.OpenStandardError());
            _ = Task.Run(async () => {
                try { await Console.OpenStandardInput().CopyToAsync(child.StandardInput.BaseStream, cancellation.Token); }
                catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { }
                catch (IOException) { if (!child.HasExited) Interlocked.Exchange(ref inputFailed, 1); }
                finally { child.StandardInput.Close(); }
            });
            await child.WaitForExitAsync(); cancellation.Cancel();
            await Task.WhenAll(stdout, stderr);
            return child.ExitCode == 0 && inputFailed != 0 ? 1 : child.ExitCode;
        }
        catch
        {
            // Do not print args, environment, secrets or raw exception messages.
            Console.Error.WriteLine("Project Docker adapter rejected an invalid operation or could not start Docker.");
            return 1;
        }
    }
}
