var Component = require('../../component'),
    validator = require('validator-schema-plugin')();

var FormElement = Component.extend({
    isFormElement:true,
    initialize: function(options) {
        this._validator = null;
        this._sanitizer = null;
        this.errors = [];

        if (options['validators']) {
            this.validators(options['validators']);
        }
        if (options['sanitizers']) {
            this.sanitizers(options['sanitizers']);
        }
    },
    setValue: function(val) {
        this.attrs('value', val);
        return this;
    },
    getValue: function() {
        return this.attrs('value');
    },
    getElemName: function() {
        return this.attrs('name');
    },
    setElemName: function(name) {
        this.attrs('name', name);
        return this;
    },
    toObject: function() {
        var json = FormElement.__super__.toObject.apply(this, arguments);
        json.validators = this.validators();
        json.sanitizers = this.sanitizers();
        return json;
    },
    getFilterValue: function() {
        if (!this._sanitizer) {
            this._sanitizer = validator.sanitizer(this.get('sanitizers') || []);
        }
        return this._sanitizer.sanitize(this.getValue());
    },
    isValid: function() {
        if (!this._validator) {
            this._validator = validator.validator(this.get('validators') || []);
        }
        this.errors = this._validator.validate(this.getValue());
        return !this.hasErrors();
    },
    sanitizers: function() {
        if (arguments.length) {
            this._sanitizer = null;
            this.set('sanitizers', arguments[0] || []);
            return this;
        }
        return this.get('sanitizers') || [];
    },
    validators: function() {
        if (arguments.length) {
            this._validator = null;
            this.set('validators', arguments[0] || []);
            return this;
        }
        return this.get('validators');
    },
    value: function() {
        if (arguments.length) {
            this.set('value', arguments[0]);
            return this;
        }
        return this.get('value');
    },
    hasErrors: function() {
        return this.errors.length > 0;
    },
    clearErrors: function() {
        this.errors = [];
    },
    serializeDataSync: function() {
        return {value: this.getValue()}
    },
    getDefaults: function() {
        return {value: ''};
    },
    getErrors: function() {
        return this.errors;
    }
}, {
    className: 'FormElement'
});

module.exports = FormElement;
module.exports.create = function(options) {
    return new FormElement(options);
};