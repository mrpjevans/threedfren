const threedfren = require('./threedfren.js');

(async ()=> {
    await threedfren.loadMpo('samples/DSCF8166.MPO');
    threedfren.toAnaglyph('output.jpg');
})();
