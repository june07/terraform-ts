"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// See: https://www.terraform.io/docs/commands/
var child_process_1 = require("child_process");
/**
 * Construct a config object for calls to `exec`
 */
exports.Config = function (props) {
    if (props === void 0) { props = {}; }
    return ({
        cwd: props.cwd || process.cwd(),
        path: props.path || "terraform",
        retry: props.retry
    });
};
function mapExec(commands, cfg) {
    if (cfg === undefined) {
        return function (cfg) { return mapExec(commands, cfg); };
    }
    var reduceFn = function (promise, cmd) {
        return promise.then(function (results) { return exec(cmd, cfg).then(function (result) { return results.concat(result); }); });
    };
    return commands.reduce(reduceFn, Promise.resolve([]));
}
exports.mapExec = mapExec;
function exec(cmd, cfg) {
    if (cfg === undefined) {
        return function (cfg) { return exec(cmd, cfg); };
    }
    var _a = exports.Config(cfg), path = _a.path, cwd = _a.cwd, retry = _a.retry;
    if (retry)
        return execRetry(cmd, cfg);
    var args = toArray(cmd);
    var cp = child_process_1.spawn(path, args, { cwd: cwd });
    var stdout = "";
    var stderr = "";
    var stdoutListener = function (chunk) { return stdout = stdout.concat(chunk.toString()); };
    var stderrListener = function (chunk) { return stderr = stderr.concat(chunk.toString()); };
    var removeListeners = function (errorListener, closeListener) {
        cp.stdout.removeListener("data", stdoutListener);
        cp.stderr.removeListener("data", stderrListener);
        if (errorListener) {
            cp.removeListener("error", errorListener);
        }
        if (closeListener) {
            cp.removeListener("close", closeListener);
        }
    };
    cp.stdout.on("data", stdoutListener);
    cp.stderr.on("data", stderrListener);
    return new Promise(function (resolve, reject) {
        var errorListener = function (error) {
            removeListeners(null, closeListener);
            reject(error);
        };
        var closeListener = function (code) {
            removeListeners(errorListener);
            code === 0 ? resolve(stdout) : reject(stderr);
        };
        cp.once("error", errorListener);
        cp.once("close", closeListener);
    });
}
exports.exec = exec;
/**
 * Retries execution a number of times before returning a result
 * @returns a Promise to the `stdout` string result
 */
function execRetry(cmd, cfg, attempt) {
    var _this = this;
    if (attempt === void 0) { attempt = 1; }
    var _a = exports.Config(cfg), path = _a.path, cwd = _a.cwd, _b = _a.retry, retry = _b === void 0 ? 0 : _b;
    var regex = new RegExp(/Error\slocking\sstate|state\slock/, 'gi');
    if (attempt <= retry) {
        return new Promise(function (resolve, reject) {
            if (attempt > 1 && process.env.NODE_ENV !== 'production')
                console.log("attempt " + attempt + ", waiting " + attempt * 1.5 + " seconds...");
            setTimeout(function () {
                exec(cmd, { path: cfg.path, cwd: cfg.cwd })
                    .then(function (stdout) {
                    resolve(stdout);
                })
                    .catch(function (error) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        if (attempt >= retry || typeof error !== 'string' || !error.match(regex)) {
                            reject(error);
                        }
                        else {
                            attempt++;
                            resolve(execRetry(cmd, cfg, attempt));
                        }
                        return [2 /*return*/];
                    });
                }); });
            }, 1000 * attempt * 1.5);
        });
    }
}
exports.execRetry = execRetry;
/**
 * A Terraform class bound to a configuration, providing methods for all commands.
 */
var Terraform = /** @class */ (function () {
    function Terraform(config) {
        if (config === void 0) { config = {}; }
        this.config = exports.Config(config);
    }
    Terraform.prototype.exec = function (cmd) {
        return exec(cmd, this.config);
    };
    Terraform.prototype.apply = function (dirOrPlan, opts) {
        return this.exec(exports.Apply(dirOrPlan, opts));
    };
    Terraform.prototype.destroy = function (dir, opts) {
        return this.exec(exports.Destroy(dir, opts));
    };
    Terraform.prototype.fmt = function (dir, opts) {
        return this.exec(exports.Fmt(dir, opts));
    };
    Terraform.prototype.forceUnlock = function (lockId, dir, opts) {
        return this.exec(exports.ForceUnlock(lockId, dir, opts));
    };
    Terraform.prototype.get = function (dir, opts) {
        return this.exec(exports.Get(dir, opts));
    };
    Terraform.prototype.graph = function (dir, opts) {
        return this.exec(exports.Graph(dir, opts));
    };
    Terraform.prototype.import = function (src, dest, opts) {
        return this.exec(exports.Import(src, dest, opts));
    };
    Terraform.prototype.init = function (dir, opts) {
        return this.exec(exports.Init(dir, opts));
    };
    Terraform.prototype.output = function (name, opts) {
        return this.exec(exports.Output(name, opts));
    };
    Terraform.prototype.plan = function (dirOrPlan, opts) {
        return this.exec(exports.Plan(dirOrPlan, opts));
    };
    Terraform.prototype.providers = function (configPath) {
        return this.exec(exports.Providers(configPath));
    };
    Terraform.prototype.push = function (path, opts) {
        return this.exec(exports.Push(path, opts));
    };
    Terraform.prototype.refresh = function (dir, opts) {
        return this.exec(exports.Refresh(dir, opts));
    };
    Terraform.prototype.show = function (path, opts) {
        return this.exec(exports.Show(path, opts));
    };
    Terraform.prototype.stateList = function (addresses, opts) {
        return this.exec(exports.StateList(addresses, opts));
    };
    Terraform.prototype.stateMv = function (src, dest, opts) {
        return this.exec(exports.StateMv(src, dest, opts));
    };
    Terraform.prototype.statePull = function () {
        return this.exec(exports.StatePull());
    };
    Terraform.prototype.statePush = function (path, opts) {
        return this.exec(exports.StatePush(path, opts));
    };
    Terraform.prototype.stateRm = function (addresses, opts) {
        return this.exec(exports.StateRm(addresses, opts));
    };
    Terraform.prototype.stateShow = function (address, opts) {
        return this.exec(exports.StateShow(address, opts));
    };
    Terraform.prototype.taint = function (name, opts) {
        return this.exec(exports.Taint(name, opts));
    };
    Terraform.prototype.validate = function (dir, opts) {
        return this.exec(exports.Validate(dir, opts));
    };
    Terraform.prototype.untaint = function (name, opts) {
        return this.exec(exports.Untaint(name, opts));
    };
    Terraform.prototype.workspaceList = function () {
        return this.exec(exports.WorkspaceList());
    };
    Terraform.prototype.workspaceSelect = function (name) {
        return this.exec(exports.WorkspaceSelect(name));
    };
    Terraform.prototype.workspaceNew = function (name, opts) {
        return this.exec(exports.WorkspaceNew(name, opts));
    };
    Terraform.prototype.workspaceDelete = function (name, opts) {
        return this.exec(exports.WorkspaceDelete(name, opts));
    };
    Terraform.prototype.workspaceShow = function () {
        return this.exec(exports.WorkspaceShow());
    };
    return Terraform;
}());
exports.Terraform = Terraform;
exports.Apply = function (dirOrPlan, opts) { return ({
    command: "apply", opts: opts, args: maybe1(dirOrPlan),
}); };
exports.Destroy = function (dir, opts) { return ({
    command: "destroy", opts: opts, args: maybe1(dir),
}); };
exports.Fmt = function (dir, opts) { return ({
    command: "fmt", opts: opts, args: maybe1(dir),
}); };
exports.ForceUnlock = function (lockId, dir, opts) { return ({
    command: "force-unlock", opts: opts, args: maybe1or2(lockId, dir),
}); };
exports.Get = function (dir, opts) { return ({
    command: "get", opts: opts, args: maybe1(dir),
}); };
exports.Graph = function (dir, opts) { return ({
    command: "graph", opts: opts, args: maybe1(dir),
}); };
exports.Import = function (src, dest, opts) { return ({
    command: "import", opts: opts, args: [src, dest],
}); };
exports.Init = function (dir, opts) { return ({
    command: "init", opts: opts, args: maybe1(dir),
}); };
exports.Output = function (name, opts) { return ({
    command: "output", opts: opts, args: maybe1(name),
}); };
exports.Plan = function (dirOrPlan, opts) { return ({
    command: "plan", opts: opts, args: maybe1(dirOrPlan),
}); };
exports.Providers = function (configPath) { return ({
    command: "providers", args: maybe1(configPath),
}); };
exports.Push = function (path, opts) { return ({
    command: "push", opts: opts, args: maybe1(path),
}); };
exports.Refresh = function (dir, opts) { return ({
    command: "refresh", opts: opts, args: maybe1(dir),
}); };
exports.Show = function (path, opts) { return ({
    command: "show", opts: opts, args: maybe1(path),
}); };
exports.StateList = function (addresses, opts) { return ({
    command: "state list", opts: opts, args: addresses,
}); };
exports.StateMv = function (src, dest, opts) { return ({
    command: "state mv", opts: opts, args: [src, dest],
}); };
exports.StatePull = function () { return ({
    command: "state pull",
}); };
exports.StatePush = function (path, opts) { return ({
    command: "state push", opts: opts, args: [path],
}); };
exports.StateRm = function (addresses, opts) { return ({
    command: "state rm", opts: opts, args: addresses,
}); };
exports.StateShow = function (address, opts) { return ({
    command: "state show", opts: opts, args: [address],
}); };
exports.Taint = function (name, opts) { return ({
    command: "taint", opts: opts, args: [name],
}); };
exports.Validate = function (dir, opts) { return ({
    command: "validate", opts: opts, args: maybe1(dir),
}); };
exports.Untaint = function (name, opts) { return ({
    command: "untaint", opts: opts, args: [name],
}); };
exports.WorkspaceList = function () { return ({
    command: "workspace list",
}); };
exports.WorkspaceSelect = function (name) { return ({
    command: "workspace select", args: [name],
}); };
exports.WorkspaceNew = function (name, opts) { return ({
    command: "workspace new", opts: opts, args: [name],
}); };
exports.WorkspaceDelete = function (name, opts) { return ({
    command: "workspace delete", opts: opts, args: [name],
}); };
exports.WorkspaceShow = function () { return ({
    command: "workspace show",
}); };
var toArray = function (_a) {
    var command = _a.command, args = _a.args, opts = _a.opts;
    var commandArr = command.split(" ");
    var argsArr = args ? args : [];
    var optsArr = ['-no-color'].concat(optsToArray(opts));
    return commandArr.concat(optsArr, argsArr);
};
var optsToArray = function (opts) {
    if (typeof opts !== "object") {
        return [];
    }
    var keys = Object.keys(opts);
    return keys.reduce(function (memo, key) {
        var val = opts[key];
        var flg = flag(key);
        var next = Array.isArray(val) ? val.map(flg) : flg(val);
        return memo.concat(next);
    }, []);
};
var flag = function (key) { return function (val) {
    var k = flagKey(key);
    return val === null ? k : k + "=" + val;
}; };
var dasherize = function (str) { return str.replace(/[A-Z]/, "-$&").toLowerCase(); };
var flagKey = function (str) { return "-" + dasherize(str); };
var maybe1or2 = function (a, b) { return b ? [a, b] : [a]; };
var maybe1 = function (a) { return a ? [a] : undefined; };
