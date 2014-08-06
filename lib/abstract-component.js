//Backbone.Mutators
//https://github.com/berzniz/backbone.getters.setters

var _      = require('underscore'),
    util   = require('util'),
    events = require('events'),
    uuid   = require('uuid'),
    async  = require('async'),
    utils  = require('./util'),
    stringifyAttrs = utils.stringifyAttrs,
    camelize  = utils.camelize,
    extend    = utils.extend,
    renderTag = utils.renderTag,
    merge     = require('node.extend'),
    hooks     = require('hooks'),
    deepEqual = require('deep-equal'),
    ShadowRoot;

function AbstractComponent(properties, options) {
    options || (options = {});
    properties || (properties = {});


    if (options.edom) {
        this.edom = options.edom;
    }

    this.options = {};
    this.properties = {};
    this.tagName = this.constructor.tagName;

    properties = merge({}, (this.getInitialState() || {}), properties);

    if (!properties.cid) {
        properties.cid = uuid.v1();
    }

    var children = properties.children? properties.children : [];
    delete properties.children;

    if (properties.parent) {
        this.setParent(properties.parent);
    }
    delete properties.parent;
    var shadow = properties.shadow;
    delete properties.shadow;

    this.setOptions(options);
    this.set(properties, {parse: true});

    this._shadow = null;
    this._initShadowEdom();
    this._fillShadowEdom(shadow);

    this.children = [];
    this.addChildren(children);

    this.set(properties);
    this.initialize(properties, options);

    events.EventEmitter.call(this);
}

util.inherits(AbstractComponent, events.EventEmitter);

(function() {
    this.setTemplate = function(template) {
        return this.set('template', template);
    };

    this.getTemplate = function() {
        return this.get('template');
    };

    this._fillShadowEdom = function(shadow) {
        if (!shadow || shadow.tagName !== 'shadow-root') {
            return;
        }

        function fill(nodes, data) {
            for (var i = 0; i < nodes.length; i++) {
                var nodeData = data[i],
                    childrenData = nodeData.children,
                    node = nodes[i];
                delete data[i].children;
                node.setProperties(nodeData);
                fill(node.getChildNodes(), childrenData);
            }
        }

        fill([this.shadow()], [shadow]);
    };

    this._objectToComponent = function(obj){
        if (!(obj instanceof AbstractComponent)) {
            if (typeof obj === 'object') {
                obj = this.createComponent(obj);
            } else {
                throw new Error('child should be an object or an instance of AbstractComponent');
            }
        }
        return obj;
    };

    this._initShadowEdom = function() {};

    this.getInitialState =function() {
        return merge(true, {
            template: this.template,
            css: '',
            js: '',
            commands: [],
            scripts: [],
            links: [],
            attributes: {}
        }, this.getDefaults());
    };

    this.getDefaults = function() {
        return {};
    };

    this.initialize = function(properties, options) {};

    this.createComponent = function() {
        return this.edom.createComponent.apply(this.edom, arguments);
    };

    /**
     * fixed component can't change position and can not be deleted
     *
     * @param bool
     */
    this.setFixed = function(bool) {
        this.set('fixed', bool? true : false);
    };

    this.isFixed = function() {
        return this.get('fixed')? true:false;
    };

    this.cloneNode = function(deep) {
        if (arguments.length === 0) {
            deep = true;
        }
        return this.createComponent(this.tagName, this.getDiff({deep: deep}), this.getOptions());
    };

    /**
     * @deprecated use cloneNode instead
     *
     * @returns {*}
     */
    this.clone = function(deep) {
        return this.cloneNode(true);
    };

    this.setReadOnly = function(readOnly) {
        this.readOnly = readOnly? true: false;
    };

    this.isReadOnly = function() {
        return this.readOnly;
    };

    this.setId = function(id) {
        return this.set('_id', id);
    };

    this.getId = function() {
        return this.get('_id');
    };

    this.isLeaf = function() {
        return true;
    };

    this.remove = function() {
        this.removeChildren();
        if (!this.isRoot()) {
            this.parent().removeChild(this);
            this.emit('remove', this);
        } else {
            this.emit('remove', this);
        }
        this.removeAllListeners();
    };

    this.getOpt = function(key, def) {
        if (this.options.hasOwnProperty(key)) {
            return this.options[key];
        }
        return def;
    };

    this.setOptions = function(options) {
        this.options = options;
    };

    this.get = function(key) {
        return this.properties[key];
    };

    this.has = function(key) {
        return this.get(key) != null;
    };

    this.getProperties = function() {
        return _.clone(this.properties);
    };

    /**
     * alias for the "set" method
     */
    this.setProperties = function(properties, options) {
        return this.set(properties, options);
    };

    this.validateProperties = function() {
        return true;
    };

    this.parse = function(properties) {
        return properties;
    };

    this.set = function(key, val, options) {
        var attrs;
        if (key == null) return this;

        if (typeof key === 'object') {
            attrs = key;
            options = val;
        } else {
            (attrs = {})[key] = val;
        }

        options || (options = {});

        if (options.parse) {
            attrs = this.parse(attrs);
        }

        if (!this.validateProperties(attrs, options)) return false;

        var k;
        for (k in attrs) {
            if (attrs.hasOwnProperty(k)) {
                if (k == 'cid') {
                    this.cid = attrs[k];
                }
                this.properties[k] = attrs[k];
            }
        }
        return this;
    };

    this.unset = function(attr) {
        delete this.properties[attr];
    };

    this.setOpt = function(key, value) {
        this.options[key] = value;
        return this;
    };

    this.attrs = function() {
        var current = this.get('attributes');
        if (!current) {
            current = {};
            this.set('attributes', current);
        }
        var args = Array.prototype.slice.call(arguments);
        if (args.length == 2) {
            current[args[0]] = args[1];
            return this;
        }
        if (args.length === 1) {
            if (typeof args[0] == 'object') {
                var attrs = args[0];
                for (var key in attrs) {
                    if (attrs.hasOwnProperty(key)) {
                        current[key] = attrs[key];
                    }
                }
                return this;
            }
            return current[args[0]];
        }
        return current;
    };

    this.compileJS = function(options) {
        var js = this.getJS();
        if (!js) {
            return '';
        }

        var id = this.attrs('id') || '';

        js =  js.replace(/_id_/g, id);

        if (options && options.wrap) {
            return '<script type="text/javascript">' + js + '</script>';
        }
        return js;
    };

    this.setJS = function(js){
        this.set('js', js);
        return this;
    };

    this.getJS = function() {
        return this.get('js');
    };

    this.getCSS = function() {
        return this.get('css');
    };

    this.setCSS = function(css) {
        this.set('css', css);
        return this;
    };

    this.selfAndDescendants = function() {
        var result = [];
        this.accept(function(node) {
            result.push(node);
        });
        return result;
    };

    this.isRoot = function() {
        return this.parent()? false: true;
    };

    this.siblings = function(withMe) {
        if (this.isRoot()) {
            return false;
        }
        var children = this.parent().getChildren();
        if (!withMe) {
            children.splice(children.indexOf(this), 1);
        }
        return children;
    };

    this.root = function() {
        var node = this, parent = null;
        while(true) {
            parent = node.parent();
            if (!parent) {
                break;
            }
            node = parent;
        }
        return node;
    };

    this.getDescendant = function(cid) {
        var children = this.getChildren(),
            l = children.length,
            child, i, descendant;

        for (i = 0; i < l; i++) {
            child = children[i];
            if (child.cid == cid) {
                return child;
            } else {
                descendant = child.getDescendant(cid);
                if (descendant) {
                    return descendant;
                }
            }
        }
        return false;
    };

    this.descendants = function() {
        var result = this.selfAndDescendants();
        result.pop();
        return result;
    };

    this.accept = function(visitor) {
        this.children.forEach(function(child) {
            child.accept(visitor);
        });
        visitor(this);
    };

    /**
     * @returns {AbstractComponent}
     */
    this.parent = function() {
        return this._parent;
    };

    this.processNode = function(context, cb) {
        cb(null, context);
    };

    this.process = function(context, cb) {
        this.edom.processComponent(this, context, function(err, node, context) {
            if (err) return cb(err);
            return cb(null, context);
        });
    };

    this.addChildren = function(children) {
        children.forEach(this.addChild, this);
        return this;
    };

    this.getCid = function() {
        return this.get('cid');
    };

    this.getChild = function(cid) {
        if (cid.indexOf('/') != -1) {
            cid = cid.split('/');
            var cur = this;
            for (var j = 0; j < cid.length; j++) {
                cur = cur.getChild(cid[j]);
                if (!cur) return cur;
            }
            return cur;
        }
        var l = this.children.length,
            child, i;
        for (i = 0; i < l; i++) {
            child = this.children[i];
            if (child.get('cid') == cid) {
                return child;
            }
        }
        return false;
    };

    this.insertAfter = function(newChild, refChild) {
        var index = this.children.indexOf(refChild);
        if (index !== -1) {
            return this._addChild(newChild, index++);
        }
        return false;
    };

    this.insertBefore = function(newChild, refChild) {
        var index = this.children.indexOf(refChild);
        if (index !== -1) {
            return this._addChild(newChild, index);
        }
        return false;
    };

    this.replaceChild = function(newChild,refChild) {
        var res = this.insertBefore(newChild, refChild);
        this.removeChild(refChild);
        return res;
    };

    this.prependChild = function(newChild) {
        return this._addChild(newChild, 0);
    };

    this.addChildAt = function(newChild, position) {
        return this._addChild(newChild, position);
    };

    this.appendChild = function(newChild) {
        this.addChild(newChild);
        return newChild;
    };

    this._addChild = function(child, index){
        if (this.isLeaf()) {
            throw new Error('Component ' + this.tagName + ' can\'t have child nodes');
        }

        if (typeof child !== 'object') {
            throw new Error('child should be an object or an instance of AbstractComponent');
        }

        child = this._objectToComponent(child);
        child.setParent(this);

        if (index === null) {
            this.children.push(child);
        } else {
            this.children.splice(index, 0, child);
        }
        return child;
    };

    this.addChild = function(child) {
        return this._addChild(child, null);
    };

    this.removeChild = function(child) {
        if (typeof child == 'string') {
            child = this.getChild(child);
        } else {
            if (false == (child instanceof AbstractComponent)) {
                throw new Error('Invalid argument. Child should be a instance of AbstractComponent');
            }
        }
        if (!child) {
            return false;
        }
        var pos = this.children.indexOf(child);
        this.children.splice(pos, 1);
        child.setParent(null);
        child.remove(true);
        return child;
    };

    /**
     * @returns {AbstractComponent[]}
     */
    this.getChildren = function() {
        return this.children.slice(0);
    };

    function objDiff(obj, defs, opts) {
        var result = {}, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'object' || Array.isArray(obj[key])) {
                    if (!deepEqual(obj[key], defs[key], opts)) {
                        result[key] = obj[key];
                    }
                } else {
                    if (obj[key] !== defs[key]) {
                        result[key] = obj[key];
                    }
                }
            }
        }
        return result;
    }

    this.getDiff = function(options) {
        var diffOpts = {strict: true, deep: true};
        options || (options = {});
        _.defaults(options, diffOpts);

        var result = objDiff(this.toObject(false), this.getInitialState(), {strict: options.strict});
        result.tagName = this.tagName;

        if (this.hasShadowNodes()) {
            result.shadow = this.shadow().getDiff(diffOpts);
        }

        if (options.deep) {
            result.children = this.children.map(function(item) {
                return item.getDiff(options);
            });
        }
        return result;
    };

    this.hasShadowNodes = function() {
        return (this._shadow && this._shadow.hasChildren());
    };

    this.shadow = function() {
        if (!this._shadow) {
            this._shadow = new ShadowRoot({}, this.getOptions());
        }
        return this._shadow;
    };

    function nestedNodeToObject(node) {
        return node.toObject(true);
    }

    this.toObject = function(deep) {
        var result = {
            tagName: this.tagName
        };

        merge(true, result, this.properties);

        if (this.hasShadowNodes()) {
            result.shadow = this.shadow().toObject(true);
        }

        if (deep) {
            result.children = this.children.map(nestedNodeToObject);
        }
        return result;
    };

    this.toJSON = function(deep) {
        return this.toObject(deep);
    };

    this.setParent = function(parent) {
        if (parent && false == (parent instanceof AbstractComponent)) {
            throw new Error('Parent should be an instance of AbstractComponent');
        }
        this._parent = parent;
    };

    this.isRoot = function( ){
        return this._parent? false:true;
    };

    this.getOptions = function() {
        return this.options;
    };

    this.serializeDataSync = function(context) {
        return {};
    };

    this.serializeData = function(context, cb) {
        cb(null, {});
    };

    this.renderChildren = function(children) {
        return '<div class="sub">' + children + '</div>';
    };

    this.formCacheOpts = function(context) {
        return {
            lifetime: 0,
            id: this.getCid()
        };
    };

    this.stringifyAttrs = function() {
        return stringifyAttrs.apply(null, arguments);
    };

    this.serializeAttrs = function(opts) {
        var attrs = _.extend({}, this.attrs());

        if (!attrs.class) {
            attrs.class = '';
        }
        attrs.class = (attrs.class || '') + ' wgel ' + this.tagName;

        if (opts.editMode) {
            attrs['data-cid'] = this.getCid();

            if (this.isFixed()) {
                attrs.class += ' fixed';
                attrs['data-fixed'] = 'fixed';
            }

            if (this.isLeaf()) {
                attrs['data-leaf'] = 'leaf';
            }

            if (this.isReadOnly()) {
                attrs.class += ' readonly';
                attrs['data-readonly'] = 'readonly';
            }
        }
        return attrs;
    };

    var renderScript   = function(item) { return renderTag('script', item); };
    var renderLink     = function(item) { return renderTag('link', item); };
    var renderNodeStub = function(item) { return '__' + item.getCid() + '__'; };

    this.renderShadow = function(context, cb) {
        if (!this.hasShadowNodes()) {
            return cb(null, '');
        }
        this._shadow.render(_.extend({}, context, {ignoreChildren: false}), function(err, html) {
            cb(err, html);
        });
    };

    this.serializeAllData = function(context, cb) {
        var data = this.getProperties(),
            compileOpts = {wrap: true};

        data.cid   = this.cid;
        data.css   = this.compileStyle(compileOpts);
        data.js    = this.compileJS(compileOpts);

        data.aChildren = this.children.map(renderNodeStub);
        data.aScripts  = this.getIncludeScripts();
        data.sScripts  = data.aScripts.map(renderScript).join('\n');
        data.aLinks    = this.getIncludeLinks();
        data.sLinks    = data.aLinks.map(renderLink).join('\n');
        data.attrs     = this.serializeAttrs(context);
        data.sAttrs    = this.stringifyAttrs(data.attrs);
        data.__editMode__ = context.editMode? true:false;
        data.__noWrapStatic__ = data.sLinks + data.css + data.sScripts + data.js;
        data.__static__   = data.__noWrapStatic__;

        if (data.__noWrapStatic__ && context.editMode) {
            data.__static__ = '<span class="el-static">' + data.__noWrapStatic__ + '</span>';
        }

        var childNodesHtml = '';
        if (!context.ignoreChildren) {
            childNodesHtml = data.aChildren.join('\n');
        }
        data.sChildren = this.renderChildren(childNodesHtml);

        _.extend(data, this.serializeDataSync(context) || {});

        var self = this;
        async.parallel([
            function(next) {
                self.serializeData(context, next);
            },
            function(next) {
                self.renderShadow(context, next);
            }
        ], function(err, result) {
            if (err) {
                return cb(err);
            }
            return cb(null, merge(data, result[0], {sShadow: result[1]}));
        });
    };

    this.removeChildren = function() {
        this.children.forEach(function(child) {
            child.remove(true);
        });
        this.children = [];
        return this;
    };


    this.hasChildNodes = function() {
        return this.children.length > 0;
    };

    /**
     * alias for hasChildNodes
     *
     * @returns {boolean}
     */
    this.hasChildren = function() {
        return this.children.length > 0;
    };

    this.removeChildAt = function(index) {
        var child = this.children[index];
        if (!child) {
            return false;
        }
        return this.removeChild(child);
    };

    this.getChildNodes = function() {
        return this.children;
    };

    this.getLastChild = function() {
        return this.children[this.children.length - 1];
    };

    this.getFirstChild = function() {
        return this.children[0];
    };

    this.getChildAt = function(index) {
        return this.children[index];
    };

    this.getIncludeScripts = function( ){
        return [];
    };

    this.getIncludeLinks = function( ) {
        return [];
    };

    this.finalTemplate = function(opts, tpl) {
        return '{{{__static__}}}' + tpl;
    };

    this.renderNode = function(context, cb) {
        var tpl  = this.finalTemplate(context, this.getTemplate()),
            self = this,
            viewEngine = context.viewEngine;

        if (!viewEngine) {
            return cb(new Error('View engine not specified'));
        }

        this.serializeAllData(context, function(err, data) {
            if (err) return cb(err);

            self.emit('preRender', data, context, this);

            try {
                return cb(null, viewEngine.render(tpl, data));
            } catch (e) {
                return cb(e);
            }
        });
    };

    this.render = function(context, cb) {
        this.edom.renderComponent(this, context, function(err, html, node, context) {
            if (err) return cb(err);

            return cb(null, html, context);
        });
    };

    /**
     * alias for render method
     *
     * @param context
     * @param cb
     */
    this.toHTML = function(context, cb) {
        this.render(context, cb);
    };

    this.forEachChildren = function(func, context) {
        this.children.forEach(func, context);
    };

    this.forEachDeep = function() {
        this.children.forEach(function(child) {
            if (!context) {
                context = child;
            }
            func.call(context, child);
            child.forEach(func, context);
        });
    };

    /**
     * @deprecated use forEachDeep instead
     *
     * @param func
     * @param context
     */
    this.forEach = function(func, context) {
        this.children.forEach(function(child) {
            if (!context) {
                context = child;
            }
            func.call(context, child);
            child.forEach(func, context);
        });
    };

    this.getCommands = function() {
        return this.get('commands');
    };

    this.setCommands = function(commands) {
        return this.set('commands', commands);
    };

    this.find = function(cid) {
        return this.getDescendant(cid);
    };

    this.findOne = function(property, value) {
        var result = this.findWhere(property, value, {limit: 1});
        if (result.length) {
            return result[0];
        }
        return false;
    };

    this.findWhere = function(property, value, options) {
        options || (options = {});

        var hasLimit = options.hasOwnProperty('limit'),
            limit = options.limit,
            getter = camelize('get-' + property),
            result = [];


        (function visit(item) {
            if (hasLimit && limit == result.length) {
                return;
            }
            var children = item.getChildren(),
                l = children.length,
                child, i, descendant;

            for (i = 0; i < l; i++) {
                child = children[i];
                if (child[getter].call(child) == value) {
                    result.push(child);
                }
                visit(child);
            }
        }(this));

        return result;
    };

    this.setStyle = function(style) {
        this.set('css', style);
        return this;
    };

    this.getStyle = function() {
        return this.get('css');
    };

    this.compileStyle = function(options) {
        var css = this.getStyle();
        if (!css) {
            return '';
        }
        var id = this.attrs('id') || '';

        css = css.replace(/_id_/g, id);

        if (options && options.wrap) {
            return '<style type="text/css">' + css + '</style>';
        }
        return css;
    };

    /**
     * Indicates whether a node is a descendant of a given node.
     */
    this.contains = function(node) {
        return this.descendants.indexOf(node) == -1;
    };

}.call(AbstractComponent.prototype));

AbstractComponent.tagName = 'AbstractComponent';
AbstractComponent.extend = extend;
AbstractComponent.fromObject = function(props, opts){
    return new this(props, opts);
};

for (var k in hooks) {
    AbstractComponent[k] = hooks[k];
    AbstractComponent.prototype[k] = AbstractComponent[k];
}

AbstractComponent.hook('render',  AbstractComponent.prototype.render);
AbstractComponent.hook('renderNode',  AbstractComponent.prototype.renderNode);
AbstractComponent.hook('process', AbstractComponent.prototype.process);


ShadowRoot = AbstractComponent.extend({
    template: '<div class="shadow-root">{{{sChildren}}}</div>',
    renderChildren: function(children) {
        return children;
    },
    isLeaf: function() {
        return false;
    }
}, {
    tagName: 'shadow-root'
});

module.exports = AbstractComponent;