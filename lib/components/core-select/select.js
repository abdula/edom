var FormElement = require('../core-form/element');

var tpl =
    '<select {{{sAttrs}}}>' +
    '{{#options}}' +
        '<option value="{{value}}" {{#selected}} selected="selected"{{/selected}}>{{title}}</option>' +
    '{{/options}}' +
    '</select>';


var SelectInput = FormElement.extend({
    initialize: function(options) {
        SelectInput.__super__.initialize.call(this, options);
    },
    parse: function(data) {
        if (!data.datasource) {
            data.datasource = [];
        }
        return data;
    },
    getDataSource: function() {
        return this.get('datasource');
    },
    setDataSource: function(datasource) {
        this.set('datasource', datasource || []);
    },
    fetchData: function(req, cb) {
        var ds = this.getDataSource();
        if (Array.isArray(ds)) {
            return cb(null, ds);
        }
        return ds.fetch(req, cb);
    },
    serializeData: function (context, cb) {
        var value = this.getValue(),
            emptyItem = this.get('emptyItem');

        this.fetchData(context.req, function(err, data) {
            if (err) return cb(err);

            if (value) {
                for (var i = 0, l = data.length; i < l; i++) {
                    if (data[i].value == value) {
                        data[i].selected = true;
                    }
                }
            }

            if (emptyItem) {
                data.unshift(emptyItem);
            }
            return cb(null, {options: data});
        });
    },
    toObject: function () {
        var json = SelectInput.__super__.toObject.apply(this, arguments),
            ds = this.getDataSource();
        if (Array.isArray(ds)) {
            json.datasource = ds;
        } else {
            json.datasource = ds.getId();
        }
        return json;
    },
    template: tpl,
    getDefaults: function() {
        return {
            source: []
        }
    }
}, {
    isFormElement: true,
    tagName: 'core-select'
});

exports.getComponent = function() {
    return SelectInput;
};
