var assert = require('assert');
var SystemDate = Date;

var root = typeof window !== 'undefined' ? window : global;

var n = new SystemDate('2050-01-01').valueOf();

// simulation time
function now() {
  return n;
}

// Wrapper around SystemDate
//
//function HyperDate(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
//  switch(arguments.length) {
//    case 0:  this.value = new SystemDate(now()); break;
//    case 1:  this.value = new SystemDate(arg0); break;
//    case 2:  this.value = new SystemDate(arg0, arg1); break;
//    case 3:  this.value = new SystemDate(arg0, arg1, arg2); break;
//    case 4:  this.value = new SystemDate(arg0, arg1, arg2, arg3); break;
//    case 5:  this.value = new SystemDate(arg0, arg1, arg2, arg3, arg4); break;
//    case 6:  this.value = new SystemDate(arg0, arg1, arg2, arg3, arg4, arg5); break;
//    default: this.value = new SystemDate(arg0, arg1, arg2, arg3, arg4, arg5, arg6); break;
//  }
//}
//
//// static methods
//HyperDate.parse = SystemDate.parse;
//HyperDate.UTC = SystemDate.UTC;
//HyperDate.now = now;
//
//HyperDate.prototype = {};
//
//// instance methods
//Object.getOwnPropertyNames(SystemDate.prototype).forEach(function (name) {
//  var fn = SystemDate.prototype[name];
//  if (typeof fn === 'function') {
//    HyperDate.prototype[name] = function (arg0, arg1, arg2, arg3) {
//      switch(arguments.length) {
//        case 0: return this.value[name]();
//        case 1: return this.value[name](arg0);
//        case 2: return this.value[name](arg0, arg1);
//        case 3: return this.value[name](arg0, arg1, arg2);
//        case 4: return this.value[name](arg0, arg1, arg2, arg3);
//      }
//    };
//  }
//});
//
//




//function HyperDate(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
//  switch(arguments.length) {
//    case 0:  return new SystemDate(now()); break;
//    case 1:  return new SystemDate(arg0); break;
//    case 2:  return new SystemDate(arg0, arg1); break;
//    case 3:  return new SystemDate(arg0, arg1, arg2); break;
//    case 4:  return new SystemDate(arg0, arg1, arg2, arg3); break;
//    case 5:  return new SystemDate(arg0, arg1, arg2, arg3, arg4); break;
//    case 6:  return new SystemDate(arg0, arg1, arg2, arg3, arg4, arg5); break;
//    default: return new SystemDate(arg0, arg1, arg2, arg3, arg4, arg5, arg6); break;
//  }
//}



function HyperDate(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var date;
  switch(arguments.length) {
    case 0:  date = new SystemDate(now()); break;
    case 1:  date = new SystemDate(arg0); break;
    case 2:  date = new SystemDate(arg0, arg1); break;
    case 3:  date = new SystemDate(arg0, arg1, arg2); break;
    case 4:  date = new SystemDate(arg0, arg1, arg2, arg3); break;
    case 5:  date = new SystemDate(arg0, arg1, arg2, arg3, arg4); break;
    case 6:  date = new SystemDate(arg0, arg1, arg2, arg3, arg4, arg5); break;
    default: date = new SystemDate(arg0, arg1, arg2, arg3, arg4, arg5, arg6); break;
  }

  var d = Object.create(date);

  //Object.setPrototypeOf(d, SystemDate.prototype);
  d.__proto__ = SystemDate.prototype;
  return date;
}

// static methods
HyperDate.parse = SystemDate.parse;
HyperDate.UTC = SystemDate.UTC;
HyperDate.now = now;


HyperDate.prototype = new SystemDate();
//SystemDate.__proto__ = HyperDate;
//SystemDate.constructor = HyperDate.constructor;
//SystemDate.prototype.constructor = HyperDate.prototype.constructor;
//SystemDate.prototype = Object.create(HyperDate.prototype);




//Date = HyperDate;


console.log(new Date('2014-01-01').toISOString());
console.log(new Date(2014, 0, 1).toISOString());
console.log(new Date().toISOString());
console.log(new Date().valueOf());
console.log(now(), Date.now());

var d = new Date();

console.log(d instanceof Date); // FIXME
console.log(d instanceof HyperDate); // FIXME
console.log(d instanceof SystemDate); // FIXME
console.log(d.toString());      // FIXME: something weird with toString
console.log('str', d + '');            // FIXME: something weird with toString
console.log('toString', d);     // FIXME: something weird with toString
console.log('plus', +d);
console.log(d.getHours());
d.setHours(12);
console.log(d.valueOf());
console.log(d.toISOString());



console.log('TEST');

function A() {
  //this.__proto__ = new Date();
}

var a = new A();

var d = new Date();
//d.__proto__ = A;

a.prototype = d;

a.toString = SystemDate.prototype.toString;
a.valueOf = SystemDate.prototype.valueOf;

console.log(a instanceof Date);
console.log(a instanceof A);
console.log(a.valueOf());
console.log(a.toString());
//
//console.log(a);
//console.log(+a);
//console.log(a + '');