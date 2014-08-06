Roadmap
---
core-blank logic should migrate to the document component

Each component can have a shadow edom.
Components of the shadow edom has fixed position and can't be removed.
The Shadow edom contains inner components for a component.
```javascript
AbstractComponent.prototype._initShadowEdom = function( ){
    this.shadow().appendChild({tagName: 'core-label', text: 'Hello', cid: 'lbl'});
    this.shadow().getChild('lbl');
}
```
