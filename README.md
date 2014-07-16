hypertimer
==========

Hypertimer offers time control for simulations. With simulations, it's important to be able to manipulate the time. Typically, simulations are run in discrete time, jumping from event to event in a deterministic manner. And afterwards, a simulation can be played back in continuous time at a faster or slower pace than real-time (depending on the time scale of the simulation). In short, one needs to be able to run a simulation in [hypertime](http://en.wikipedia.org/wiki/Hypertime). 

Hypertimer offers basic functionality to control time:

- Get and set the time using functions `getTime()`, `setTime()`, and `now()`. 
- Schedule events using functions `setTimeout()`, `setInterval()`, and `setTrigger()`.

These functions are compatible with JavaScript's built-in functions `Date.now()`, `setTimeout()`, and `setInterval()`, but there is an important difference: they can run with a different current time and at a different rate.

Hypertimer runs on node.js and on any modern browser (Chrome, FireFox, Opera, Safari, IE9+).


## Install

Install via npm:

    npm install hypertimer

Install via bower:

    bower install hypertimer

## Load

### node.js

```js
var hypertimer = require('hypertimer');

var timer = hypertimer({rate: 1});
timer.setTime(new Date(2014, 0, 1));
```

### browser

```html
<!doctype html>
<html>
<head>
  <script src="./dist/hypertimer.min.js"></script>
</head>
<body>
  <script>
    var timer = hypertimer({rate: 1});
    timer.setTime(new Date(2014, 0, 1));
  </script>
</body>
</html>
```

## Use

The following example shows how to create a hypertimer and set a timeout.

```js
// create a hypertimer running ten times faster than real-time
var timer = hypertimer({rate: 10});

// start the timer at 1st of January 2020
timer.setTime(new Date(2020, 0, 1, 12, 0, 0));

// set a timeout after a delay
var delay = 10000; // milliseconds (hyper-time)
timer.setTimeout(function () {
  console.log('Timeout!');
  console.log('It is now ' + delay + ' ms later in hyper-time, ' +
      'the time is: ' + timer.getTime());
}, delay);

console.log('The time is: ' + timer.getTime());
```

## API

### Construction

A hypertimer is constructed as:

```js
hypertimer([options])
```

By default, a new hypertimer runs with real-time speed and time.

Available options:

Name | Type                 | Default | Description
---- | -------------------- | ------- | -----------
rate | Number or 'discrete' | 1       | The rate (in milliseconds per millisecond) at which the timer runs, with respect to real-time speed. Can be 'discrete' to run in discrete time.

Example:

```js
var timer = hypertimer({rate: 10});
```

### Properties

- `running`
  True when the timer is running, false when paused. See also functions `pause()` and `continue()`.

### Methods

- **`clear()`**  
  Clear all running timeouts.

- **`clearTimeout(timeoutId: number)`**  
  Cancel a timeout.

- **`clearInterval(intervalId: number)`**  
  Cancel an interval.

- **`clearTrigger(triggerId: number)`**  
  Cancel a trigger.

- **`config([options: Object]): Object`**  
  Change the configuration options of the hypertimer, and/or retrieve the current configuration. Available options:

  - `rate: Number | 'discrete'`  
    The rate (in milliseconds per millisecond) at which the timer runs, with respect to real-time speed. Can be 'discrete' to run in discrete time. By default, rate is 1. 

- **`continue()`**  
  Continue the timer when paused. The state of the timer can be retrieved via the property `running`. See also `pause()`.

- **`getTime(): Date`**  
  Returns the current time of the timer as Date. See also `now()`.
  The time can be set using `setTime(time)`.

- **`list()`**  
  Returns a list with the id's of all running timeouts.
  
- **`now() : number`**  
  Returns the current time of the timer as a number. See also `getTime()`.

- **`pause()`**  
  Pause the timer. The state of the timer can be retrieved via the property `running`. See also `continue()`.

- **`setInterval(callback: Function, interval: number [, firstTime: Date | number])`**  
  Trigger a callback every interval. Optionally, a start date can be provided
  to specify the first time the callback must be triggered. The function returns an intervalId which can be used to cancel the trigger using `clearInterval()`. See also `setTimeout` and `setTrigger`. Parameters:
  
  - `callback: Function`  
    Function executed when delay is exceeded.
    
  - `interval: number`  
    Interval in milliseconds. When interval is smaller than zero or is infinity, the interval will be set to zero and triggered with a maximum rate.
    
  - `[firstTime: Date | number]`  
    An optional absolute moment in time (Date) when the callback will be triggered the first time. By default, `firstTime = now() + interval`.

- **`setTime(time: number | Date)`**  
  Set the current time of the timer. Can be a Date or a timestamp. To get the current time, use `getTime()` or `now()`.

- **`setTimeout(callback: Function, delay: number) : number`**  
  Set a timeout, which is triggered when the timeout occurs in hyper-time. See also `setTrigger` and `setInterval`. The function returns a timeoutId, which can be used to cancel the timeout using `clearTimeout(timeoutId)`. The parameters are:
  
  - `callback: Function`  
    Function executed when the delay is exceeded
    
  - `delay: number`  
    The delay in milliseconds. When the rate is zero, or the delay is smaller or equal to zero, the callback is triggered immediately.

- **`setTrigger(callback: Function, time: Date | number) : number`**  
  Set a trigger, which is triggered when the timeout occurs in hyper-time. See also `getTimeout`. The function returns a triggerId which can be used to cancel the trigger using `clearTrigger()`. The parameters are:

  - `callback: Function`  
    Function executed when delay is exceeded.
    
  - `time: Date | number`  
    An absolute moment in time (Date) when the callback will be triggered. When the rate is zero, or the date is a Date in the past, the callback is triggered immediately.
    
- **`toString() : String`**  
  Return a string representation of the current hyper-time, equal to `timer.getTime().toString()`.
  
- **`valueOf() : Date`**  
  Get the value of the hypertimer, returns the current time of the timer as Date.


## Examples

Examples can be found here:

https://github.com/enmasseio/hypertimer/tree/master/examples


## Roadmap

- Implement a scalable solution to synchronize hypertimers running in different processes.
- Use high precision timers and time functions.


## Build

To build the library from source, clone the project from github

    git clone git://github.com/enmasseio/hypertimer.git

To install all dependencies and build the library, run `npm install` in the 
root of the project.

    cd hypertimer
    npm install

Then, the project can be build running:

    npm run build

This generates the files `./dist/hypertimer.js` and `./dist/hypertimer.min.js`,
which can be used in the browser.

To automatically rebuild on changes in the source files, once can use

    npm run watch


## Test

To execute tests for the library, install the project dependencies once:

    npm install

Then, the tests can be executed:

    npm test

To test code coverage of the tests:

    npm run coverage

To see the coverage results, open the generated report in your browser:

    ./coverage/lcov-report/index.html


## License

Copyright (C) 2014 Almende B.V., http://almende.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.


