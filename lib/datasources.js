function DataSources() {
    this.data = {};
}

(function() {
    this.names = function() {
        return Object.keys(this.data);
    };

    this.delAll = function() {
        this.data = {};
    };

    this.del = function(name) {
        delete this.data[name];
        return this;
    };

    this.add = function(ds) {
        if (typeof ds !== 'object') {
            throw new Error('Invalid data source');
        }

        if (!ds.id) {
            throw new Error('The data source an id is not specified');
        }

        if (!ds.fetch || typeof ds.fetch !== 'function') {
            throw new Error('The data source should has method fetch');
        }

        this.data[ds.id] = ds;
        return this;
    };

    this.has = function(key) {
        return this.data.hasOwnProperty(key);
    };

    this.get = function(key, def) {
        if (this.has(key)) {
            return this.data[key];
        }
        return def;
    };

    function proxyFn(fn) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            var ds = args[0],
                cb = args[args.length - 1];

            try {
                ds = this.get(ds);
                ds[fn].apply(ds, arguments.slice(1));
            } catch(e) {
                cb(e);
            }
        };
    }

    this.count = proxyFn('count');

    this.fetch = proxyFn('fetch');

}.call(DataSources.prototype));

module.exports = DataSources;