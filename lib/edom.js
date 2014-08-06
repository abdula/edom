var util = require('util'),
    path = require('path'),
    os = require('os'),
    _ = require('underscore'),
    extend = require('node.extend'),
    StaticAssets = require('./static-assets'),
    EventEmitter = require('events').EventEmitter,
    ComponentLoader = require('./component-loader'),
    Component = require('./component'),
    AbstractComponent = require('./abstract-component'),
    ComponentRegistry = require('./component-registry'),
    Document = require('./document'),
    Processor = require('./processor'),
    CommandDispatcher = require('./command-dispatcher'),
    DataSources = require('./datasources');

EDom.StaticAssets          = StaticAssets;
EDom.ComponentLoader       = ComponentLoader;
EDom.Component             = Component;
EDom.AbstractComponent     = AbstractComponent;
EDom.Processor             = Processor;
EDom.Document              = Document;
EDom.ComponentRegistry     = ComponentRegistry;
EDom.CommandDispatcher     = CommandDispatcher;
EDom.Command               = function() {};
EDom.Cache                 = function() {};

function EDom(options) {
    if (false === (this instanceof EDom)) {
        return new EDom(options);
    }

    EventEmitter.call(this);

    this.defaultComponentSettings = {};
    this.componentSettings = {};

    var self = this;
    var defaults = {
        "static": {
            adapter: 'fs',
            root: path.join(os.tmpdir(), 'edom', '.static'),
            baseUrl: '/assets/edom'
        },
        "cache": {
            adapter: 'file',
            folder: path.join(os.tmpdir(), 'edom', '.cache')
        }
    };

    options = extend(true, {}, defaults, options || {});

    this.staticMngr    = new EDom.StaticAssets(options.static, this);
    this.registry      = new EDom.ComponentRegistry(this);
    this.loader        = new EDom.ComponentLoader(this);
    this.cache         = new EDom.Cache(options.cache);
    this.cmdDispatcher = new EDom.CommandDispatcher();
    this.processor     = EDom.Processor;
    this.dataSources   = new DataSources();
    this.data = {};


    var staticUrl = self.staticMngr.url();

    this.hook('postRender', function(next, html, node, context) {
        html = html.replace(/__static__/g, staticUrl);

//        var regExp = /<link([^>]*)\/>/ig;
//        var links = html.match(regExp);
//        links = _.uniq(links);
//        html.replace(/<link([^>]*)\/>/ig, '')

        next(null, html, node, context);
    });
    this.setComponentSettings({});

    process.nextTick(function() {
        self.loadComponentPackage(__dirname + '/components', function(err) {
           if (err) {
               self.emit('error', err);
           } else {
               self.emit('ready');
           }
        });
    });
}

util.inherits(EDom, EventEmitter);

(function() {
    this.set = function(key, value) {
        this.data[key] = value;
        return this;
    };

    this.hook = function(hook, fn) {
        switch(hook) {
            case 'preRenderComponent':
                return this.processor.pre('renderNode', fn);
            case 'postRenderComponent':
                return this.processor.post('renderNode', fn);
            case 'postRender':
                return this.processor.post('render', fn);
            case 'preRender':
                return this.processor.pre('render', fn);
        }
    };

    this.get = function(key) {
        return this.data[key];
    };

    this.__defineGetter__('components', function() {
        return this.registry;
    });

    this.getCache = function() {
        return this.cache;
    };

    this.loadComponentPackage = function(pgPath, cb) {
        return this.loader.loadPackage(pgPath, cb || function() {});
    };

    this.getCommandDispatcher = function() {
        return this.cmdDispatcher;
    };

    this.setComponentSettings = function(settings) {
        this.componentSettings = extend(true, {
            edom: this,
            componentFactory: this
        }, this.defaultComponentSettings, settings);
    };

    this.getComponent = function(name) {
        return this.registry.get(name);
    };

    this.loadComponent = function(cpPath, cb) {
        return this.loader.loadComponent(cpPath, cb);
    };

    this.processComponent = function() {
        var processor = this.processor;
        return processor.process.apply(processor, arguments);
    };

    this.renderComponent = function(component, context, cb) {
        var processor = this.processor;
        return processor.render.apply(processor, arguments);
    };

    this.getProcessor = function() {
        return this.processor;
    };

    this.clearCache = function(cb) {
        this.cache.clear(cb);
    };

    this.createComponent = function(tagName, data, options) {
        if (typeof tagName === 'object') {
            options = data;
            data = tagName;
            tagName = data.tagName;
        }

        if (!tagName) {
            throw new Error('Tag name not specified');
        }

        if (!data) {
            data = {};
        }

        var Component = this.getComponent(tagName);
        if (!Component) {
            throw new Error('Component with tag name "' + tagName + '" is not registered');
        }

        options = extend(true, {}, this.componentSettings, options || {});

        this.emit('create', tagName, data, options);
        this.emit('create:' + tagName, data, options);

        if (Array.isArray(data.children)) {
            data.children = data.children.map(function(child) {
                return this.createComponent(child.tagName, child, options);
            }, this);
        }

        var component = new Component(data, options);
        component.edom = this;

        this.emit('created', tagName, component);
        this.emit('created:' + tagName, component);

        return component;
    };

    this.extendComponent = function() {
        var tagName = arguments[0],
            component = this.getComponent(tagName);

        return component.extend.apply(component, Array.prototype.slice(arguments, 1));
    };

    this.staticIsMounted = function(url, cb) {
        this.staticMngr.isMounted(url, cb);
    };

    this.mountStatic = function(url, dir, cb) {
        dir = path.resolve(dir);
        this.staticMngr.mount(url, dir, cb || function() {});
    };

    this.staticUrl = function(urlPath) {
        return this.staticMngr.url(urlPath);
    };

    this.unmountStatic = function(url, cb) {
        this.staticMngr.unmount(url, cb || function() {});
    };

    this.blank = function(opts) {
        return this.document({
            children: [{
                tagName: 'core-blank'
            }]
        }, opts);
    };

    this.document = function(data, options) {
        options = extend(true, {edom: this}, this.componentSettings, options || {});
        return new Document(data, options);
    };

    /**
     * alias for method document
     * @param data
     * @param options
     * @returns {Document}
     */
    this.createDocument = function(data, options) {
        return this.document(data, options);
    };

    this.destroyComponent = function(tagName, cb) {
        this.loader.destroyComponent(tagName, cb || function() {});
        this.registry.unregister(tagName);
    };

    this.registerComponent = function() {
        this.registry.register.apply(this.registry, arguments);
    };

    this.__defineGetter__('commands', function() {
        return this.cmdDispatcher;
    });

    this.designToDocument = function(design) {
        var tplDesigner = this.createComponent('tpl-designer', {});
        return tplDesigner.convertToDocument(design.sections);
    };

}.call(EDom.prototype));

module.exports = EDom;