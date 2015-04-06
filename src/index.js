
// todomvc assets
require('todomvc-app-css/index.css');

const Cursor = require('lib/cursor');

// lightweight immstruct

const structure = {
    map: Immutable.Map()
};

const options = {
    root :{
        unbox: (m) => m.map,
        box: (newroot, m) => {
            m.map = newroot;
            return m;
        }
    }
};

const cursorA = Cursor.from(structure, options);
const cursorB = cursorA.cursor('foo');

cursorB.set('bar', 42);

console.log(cursorA.root.data.map.toJS());


/**

// usecase

Cursor.from(options);
Cursor.from(map);

Cursor.from(map, keyPath);
Cursor.from(map, options);

Cursor.from(map, keyPath, options);
Cursor.from(map, key, options);

// advanced
Cursor.from(box, options);
Cursor.from(box, key, options);


**/
