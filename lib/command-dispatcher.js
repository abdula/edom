var _      = require('underscore'),
    hooks  = require('hooks'),
    async  = require('async'),
    util   = require('util'),
    events = require('events');

function throughHook(fn) {
    return function() {
        var args = Array.prototype.slice.call(arguments),
            next = args[0];

        args[0] = function(err) {
            if (err) return next(err);
            args[0] = null;
            return next.apply(this, args);
        };
        return fn.apply(this, args);
    };
}


function CommandNotFound(message) {//use errs from acro-kit
    this.message = message || 'Command not found';
    this.errno = 404;

    Error.call(this);
    Error.captureStackTrace(this, CommandNotFound);
}

CommandNotFound.prototype.errno = 404;
CommandNotFound.prototype = new Error();
CommandNotFound.prototype.constructor = CommandNotFound;
CommandNotFound.prototype.name = 'CommandNotFound';

function CommandSandbox(dispatcher, cmds) {
    this.dispatcher = dispatcher;
    this.cmds = cmds;
    this.out = {};
    this.data = {};
    events.EventEmitter.call(this);
}

util.inherits(CommandSandbox, events.EventEmitter);

(function() {
    this.set = function(key, value) {
        this.data[key] = value;
        this.emit('set', value, this);
        this.emit('set:' + key, value, this);
    };

    this.get = function(key) {
        return this.data[key];
    };

    this.link = function(imports, inFn) {
        var out = this.out,
            self = this,
            l = imports.length;

        if (!l) {
            return false;
        }

        var fn = function() {
            var i;
            for (i = 0; i < l; i++) {
                if (!out.hasOwnProperty(imports[i])) {
                    return;
                }
            }
            var obj = {};
            for (i = 0; i < l; i++) {
                obj[imports[i]] = out[imports[i]];
            }
            inFn(obj);
            self.removeListener('out', fn);
        };
        return this.on('out', fn);
    };

    this.sendOut = function(key, data) {
        this.out[key] = data;
        this.emit('out', {key: data}, this);
        this.emit('out:' + key, data, this);
    };

}.call(CommandSandbox.prototype));

function CommandDispatcher() {
    this.commands = {};
    this.sandbox = CommandSandbox;
}

(function() {

    this.hasCmd = function(cmd) {
        return this.commands.hasOwnProperty(cmd);
    };
    
    this._executeCmd = function(cmd, data, context, cb) {
        return cmd.cmd.execute(data.args || {}, context, cb);
    };
    
    this.executeCmd = function(cmd, data, context, cb) {
        if (typeof cmd !== 'string') {
            throw new Error('Invalid argument. "cmd" must be a string');
        }
        try {
            this._executeCmd(this.getCmd(cmd, true), data, context, cb);
        } catch (e) {
            return cb(e);
        }
    };

    this.preExecuteCmd = function(cmd, fn) {
        if (cmd) {
            return this.getCmd(cmd, true).preExecute(fn);
        }
        return this.pre('executeCmd', throughHook(fn));
    };

    this.postExecuteCmd = function(cmd, fn) {
        if (cmd) {
            return this.getCmd(cmd, true).postExecute(fn);
        }
        return this.post('executeCmd', throughHook(fn));
    };

    this.preDispatch = function(fn) {
        return this.pre('dispatch', throughHook(fn));
    };

    this.postDispatch = function(fn) {
        return this.post('dispatch', throughHook(fn));
    };

    /**
     * example:
     *  {
     *     name: 'users.register', //command name
     *     description: 'Register user', //command description
     *     group: 'Users',
     *     cmd: {Command} cmd, //handler
     *  }
     *
     * @param {Object} cmd
     * @param opts
     * @returns {*}
     */
    this.addCmd = function(cmd) {
        if (typeof cmd !== 'object') {
            throw new Error('Invalid argument. "cmd" should be an object');
        }

        if (!(cmd.cmd instanceof Command)) {
            if (typeof cmd.cmd === 'object') {
                cmd.cmd = new ProxyCommand({cmd: cmd.cmd}, this);
            } else {
                throw new Error('Argument "cmd.cmd" should be an instance of Command or object');
            }
        }
        cmd.cmd.setDispatcher(this);

        if (!cmd.name) {
            throw new Error('Command name not specified');
        }

        if (!cmd.group) {
            cmd.group = 'Common';
        }

        if (!cmd.description) {
            cmd.description = cmd.name;
        }

        this.commands[cmd.name] = cmd;
        return this;
    };

    this.removeCmd = function(name) {
        if (!name) {
            this.commands = {};
        } else {
            delete this.commands[name];
        }
    };

    this.getCmdHandler = function(cmd) {
        return this.getCmd(cmd).cmd;
    };

    this.getCmd = function(cmd, required) {
        var result = this.commands[cmd];
        if (required && !result) {
            throw new CommandNotFound('Command "' + cmd + '" not found');
        }
        return result;
    };

    this.removeAllCmds = function() {
        this.commands = {};
    };

    this.createCmdSandbox = function(cmds) {//can be use pool of sandboxes
        var Sandbox = this.getCmdSandbox();
        return new Sandbox(this, cmds);
    };

    this.setCmdSandbox = function(Sandbox) {
        this.sandbox = Sandbox;
        return this;
    };

    this.getCmdSandbox = function() {
        return this.sandbox;
    };

    this.addController = function(ctrl) {
        if (typeof ctrl === 'string') {
            ctrl = require(ctrl);
        }
        if (typeof ctrl !== 'object') {
            throw new Error('Controller must be an object');
        }

        var group = ctrl.group;

        ctrl.commands.forEach(function(data) {
            this.addCmd(_.extend({group: group}, data));
        }, this);

        return this;
    };

    /**
     * [{name: 'sendEmail', options: {email: 'john@gmail.com'}}]
     *
     * @param cmds
     * @returns {*}
     */
    this.dispatch = function(cmds, context, cb) {
        var self = this;

        if (typeof context === 'function' && !cb) {
            cb = context;
            context = {};
        }

        var sandbox = this.createCmdSandbox(cmds);

        context.sandbox = sandbox;
        context.dispatcher = this;

        async.map(cmds, function(cmd, next) {
            self.executeCmd(cmd.name, cmd, context, function(err, res) {
                if (err) return next(err);

                var result = _.extend({}, cmd, {result: res});

                sandbox.emit('cmd:success',result, cmd);
                sandbox.emit(cmd.name + ':cmd:success', result, cmd);

                return next(null, _.extend({name: cmd.name}, cmd, {result: res}));
            });
        }, function(err, results) {
            if (!err) {
                sandbox.emit('done', results);
            } else {
                sandbox.emit('fail', err);
            }
            sandbox.removeAllListeners();
            cb(err, results);
        });
    };

    this.setCmdOptions = function(cmd, options) {
        this.getCmd(cmd, true).setOptions(options);
    };

    this.getAllCmds = function() {
        return Object.keys(this.commands).map(function(key) {
            return this.commands[key];
        }, this);
    };
}.call(CommandDispatcher.prototype));

for (var k in hooks) {
    CommandDispatcher.prototype[k] = hooks[k];
    Command.prototype[k] = hooks[k];
}

function Command(options, dispatcher) {
    this.options = {};
    this.setOptions(options || {});
    this.initialize();
    this.imports = [];
    this.exports = [];

    if (dispatcher) {
        this.setDispatcher(dispatcher);
    }
}

Command.extend = require('./util').extend;

(function() {
    this.defaults = {};

    this.configurable = false;

    this.initialize = function() {};

    this.setOptions = function(options) {
        this.options = _.extend({}, this.defaults, options || {});
    };

    this.preExecute = function(fn) {
        return this.pre('execute', throughHook(fn));
    };

    this.postExecute = function(fn) {
        return this.post('execute', throughHook(fn));
    };

    this.setDispatcher = function(dispatcher) {
        this.dispatcher = dispatcher;
        return this;
    };

    this.getDispatcher = function() {
        return this.dispatcher;
    };

    this.getCmd = function(name) {
        return this.getDispatcher().getCmd(name);
    };

    this.executeCmd = function() {
        var dispatcher = this.getDispatcher();
        return dispatcher.executeCmd.apply(dispatcher, arguments);
    };

    this.execute = function(data, context, cb) {
        throw new Error('Must be implemented');
    };
}.call(Command.prototype));

var ProxyCommand = Command.extend({
    initialize: function() {
        this.cmd = this.options.cmd;
        if (!this.cmd) {
            throw new Error('Command not specified');
        }
        var cmd = this.cmd;
        for (var key in cmd) {
            this[key] = cmd[key];
        }
    },
    execute: function() {
        this.cmd.execute.apply(this.cmd, arguments);
    }
});

var MultiCommand = Command.extend({
    execute: function(data, context, cb) {
        var cmdContext = _.extend({}, context),
            dispatcher = context.dispatcher || this.getDispatcher();

        delete cmdContext.sandbox;

        dispatcher.dispatch(data.cmds, context, cb);
    }
});

CommandDispatcher.Command = Command;
CommandDispatcher.MultiCommand = MultiCommand;
CommandDispatcher.CommandSandbox = CommandSandbox;

module.exports = CommandDispatcher;
