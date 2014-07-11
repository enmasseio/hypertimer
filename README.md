hypertimer
==========

A timer running in [hypertime](http://en.wikipedia.org/wiki/Hypertime): 
faster or slower than [real-time](http://en.wikipedia.org/wiki/Real-time_clock), 
and either in continuous or discrete time.


## Install

Install via npm:

    npm install hypertimer

Install via bower:

    bower install hypertimer


## Use

coming soon...



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


