var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
function params(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
    if(result === null)
        result = [];
    return result
}

var cache = {
    equals: ['comparison'],
    contains: ['elem'],
    matches: ['pattern', 'modifiers'],
    isEmail: [],
    isURL: ['options'],
    isIP: ['version'],
    isAlpha: [],
    isAlphanumeric: [],
    isNumeric: [],
    isHexadecimal: [],
    isHexColor: [],
    isLowercase: [],
    isUppercase: [],
    isInt: [],
    isFloat: [],
    isDivisibleBy: ['num'],
    isNull: [],
    isLength: ['min', 'max'],
    isUUID: [],
    isDate: [],
    isAfter: ['date'],
    isBefore: ['date'],
    isIn: ['options'],
    isCreditCard: [],
    isISBN: ['version'],
    isJSON: [],
    ltrim: ['chars'],
    rtrim: ['chars'],
    trim:  ['chars'],
    escape: [],
    whitelist: ['chars'],
    blacklist: ['chars'],
    toString: [],
    toDate: [],
    toFloat: [],
    toInt: ['radix'],
    toBoolean: ['strict']
};

module.exports = function(validator) {
    if (!validator) {
        validator = require('validator');
    }

    if (validator.sanitizer) {
        return validator;
    }

    var extend = validator.extend;

    function convert(schema) {
        var calls = [];
        for (var i = 0, l = schema.length; i < l; i++) {
            var item = schema[i],
                name = item['name'],
                func = validator[name];

            if (!cache.hasOwnProperty(name)) {
                throw 'Invalid function name specified';
            }
            var keys = cache[name],
                args = [],
                options = item.options || {};
            for (var j = 0; j < keys.length; j++) {
                args.push(options[keys[j]]);
            }
            calls.push({
                func: func,
                funcName: name,
                funcArgs: args,
                schema: item
            });
        }
        return calls;
    }

    validator.extend = function (name, fn) {
        var args = params(fn);
        args.shift();
        cache[name] = args;

        return extend.call(validator, name, fn);
    };

    validator.messages = {};

    validator.formatMessage = function(func, value, message) {
        if (!message) {
            message = validator.messages[func] || '';
        }
        return message.replace(/\{\{value\}\}/g, value);
    };

    validator.validator = function(schema) {
        if (!Array.isArray(schema)) {
            throw 'Invalid schema';
        }
        var calls = convert(schema);
        return {
            validate: function(value) {
                var errors = [];
                for (var i = 0; i < calls.length; i++) {
                    var item = calls[i],
                        funcArgs = item['funcArgs'].slice();
                    funcArgs.unshift(value);
                    if (!item['func'].apply(validator, funcArgs)) {
                        errors.push(validator.formatMessage(item['funcName'], value, item['schema'].message));
                    }
                }
                if (errors.length == 0) {
                    return true;
                }
                return errors;
            }
        };
    };

    validator.sanitizer = function(schema) {
        if (!Array.isArray(schema)) {
            throw 'Invalid schema';
        }

        var calls = convert(schema);
        return {
            sanitize: function(value) {
                for (var i = 0; i < calls.length; i++) {
                    var item = calls[i],
                        funcArgs = item['funcArgs'].slice();
                    funcArgs.unshift(value);
                    value = item['func'].apply(validator, funcArgs);
                }
                return value;
            }
        };
    };
    return validator;
};