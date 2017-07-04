# npm-quickconnectid
Node package to get a Synology URL based on a QuickConnect ID.

Example:

```javascript
var quickconnect = require('quickconnectid');

quickconnect.determineServerURL('[QUICK CONNECT ID]', function(url) {
  console.log('Working server found at: ' + url);
}, function(error) {
  console.log('Error finding server: ' + error);
});
```
