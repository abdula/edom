function SimpleDb(storage) {
    if (!storage.read) {
        throw new Error('Storage should has read method');
    }

    if (!storage.write) {
        throw new Error('Storage should has write method');
    }

    var db, hasInit = false;

    function read(cb) {
        storage.read(function(err, data) {
            if (err) return cb(err);
            try {
                db = (!data)? {} : JSON.parse(data);
            } catch (e) {
                return cb(e);
            }
            return cb(null);
        });
    }

    function write(cb) {
        storage.write(JSON.stringify(db), cb);
    }

    this.init = function(cb) {
        if (hasInit) {
            return cb();
        }
        return read(cb);
    };

    this.clear = function(cb) {
        db = {};
        write(cb);
    };

    this.find = function(data) {
        throw new Error('not implemented');
    };

    this.has = function(key, cb) {
        cb(null, db.hasOwnProperty(key));
    };

    this.get = function(key, cb) {
        cb(null, db[key]);
    };

    this.setMulti = function(keys, values, cb) {
        keys.forEach(function(key, idx) {
            db[key] = values[idx];
        }, this);
        write(cb);
    };

    this.set = function(key, value, cb) {
        db[key] = value;
        write(cb);
    };

    this.del = function(key, cb) {
        delete db[key];
        write(cb);
    };

    this.delMulti = function(keys, cb) {
        for(var i = 0; i < keys.length; i++) {
            delete db[keys[i]];
        }
        write(cb);
    };

    ['has', 'get', 'setMulti', 'set', 'find', 'del', 'delMulti'].forEach(function(key) {
        var origin = this[key];

        this[key] = function() {
            var cb = arguments[arguments.length - 1],
                self = this;

            self.init(function(err) {
                if (err) return cb(err);

                return origin.apply(self, arguments);
            });
        };
    }, this);
}

module.exports = SimpleDb;