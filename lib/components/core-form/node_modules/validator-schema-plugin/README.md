validator-schema-plugin
---
A node.js module which extend base functionality of [validator](https://github.com/chriso/validator.js)

Usage
---
```javascript
var validator = require('validator');

require('validator-schema-plugin')(validator);

var validate = validator.validator([
    {name: 'isEmail', message: '{{value}} Invalid email'}
]);

var sanitizer = validator.sanitizer([
    {name: 'ltrim', options: {chars: '_'}}
]);

```
