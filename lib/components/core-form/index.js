var Component= require('../../component');

var template =
        '{{#errors.length}}' +
            '<ul class="errors">{{#errors}}<li>{{.}}</li>{{/errors}}</ul>' +
        '{{/errors.length}}' +
        '<form {{{sAttrs}}}>' +
        '{{{sShadow}}}' +
        '{{{sChildren}}}' +
        '<input type="hidden" name="eventTarget" value="{{cid}}">' +
        '<input type="hidden" name="event" value="submit">' +
        '</form>';

var Form = Component.extend({
    isLeaf: function() {
        return false;
    },
    addElement: function(el) {
        return this.addChild(el);
    },
    removeElement: function(uid) {
        this.removeChild(uid);
    },
    getElements: function() {
        var elements = [];
        var fn = function(child) {
            if (child.isFormElement) {
                elements.push(child);
            }
        };
        if (this.hasShadowNodes()) {
            this.shadow().forEachDeep(fn);
        }
        this.forEachDeep(fn);
        return elements;
    },
    reset: function() {
        this.visitElements(function(elem) {
            elem.setValue(null);
        });
    },
    visitElements: function(func) {
        var result = {},
            self = this;

        this.getElements(true).forEach(function(elem) {
            func.call(this, elem);
        }, this);
    },
    getFilterData: function() {
        return this.getFormData(true);
    },
    getAction: function() {
        return this.attrs('action');
    },
    setAction: function(action) {
        return this.attrs('action', action);
    },
    getFormData: function(filter) {
        var result = {};
        this.visitElements(function(item) {
            result[item.getElemName()] = (filter? item.getFilterValue() : item.getValue());
        });
        return result;
    },
    populate: function(data) {
        var name;
        this.visitElements(function(item) {
            name = item.getElemName();
            if (data.hasOwnProperty(name)) {
                item.setValue(data[name]);
            }
        });
    },
    isValid: function() {
        var errors = {};
        this.visitElements(function(elem) {
            if (!elem.isValid()) {
                errors[elem.getElemName()] =  elem.getErrors();
            }
        });
        this.errors = errors;
        return !this.hasErrors();
    },
    hasErrors: function() {
        return  (this.errors && Object.keys(this.errors).length > 0)? true:false;
    },
    clearErrors: function() {
        this.errors = {};
    },
    getElementByName: function(name) {
        var result = this.getElements(true).filter(function(elem) {
            return elem.getElemName() === name;
        });
        if (result.length) {
            return result[0];
        }
        return false;
    },
    getErrors: function() {
        return this.errors;
    },
    setErrors: function(name, message) {
        var errors = {};
        if (typeof message == 'undefined' && typeof name == 'object') {
            errors = name;
        } else {
            errors[name] = message;
        }
        if (this.errors) {
            for (var key in errors) {
                if (errors.hasOwnProperty(key)) {
                    this.errors[key] = errors[key];
                }
            }
        } else {
            this.errors = errors;
        }
        return this.errors;
    },
    serializeDataSync: function() {
        if (!this.hasErrors()) {
            return  {errors: []};
        }
        var errors = this.getErrors(),
            result = [];
        for (var key in errors) {
            result = result.concat(errors[key]);
        }
        return {
            errors: result
        }
    },
    getMethod: function() {
        return this.attrs('method') || 'POST';
    },
    handledEvents: ['submit'],
    template: template,
    getDefaults: function() {
        return {
            attributes: {
                method: 'POST'
            }
        }
    }
}, {
    tagName: 'core-form'
});

exports.getComponent = function(edom) {
    return Form;
};

