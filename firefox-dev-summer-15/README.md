INSTALL
-------

* Copy this project using svn checkout:
  $ svn checkout <branchurl>

  branchurl:
  https://mortar.ece.cmu.edu/svn/lbauer/projects/privatebrowse/firefox
    -or-
  <copy new branch!>

* Requires Mozilla addon sdk from:
  https://developer.mozilla.org/en-US/Add-ons/SDK
    -or-
  https://github.com/mozilla/addon-sdk
    revision a697345 is used in testing

  put these files in a directory called: addon-sdk-latest in the parent
  directory of this project

* OSX or Linux:
  - requires bash

* Windows
  - note: The main development environment was OSX and it has been sanity tested
    on Linux. It is possible to develop on Windows but has not been tested. Running
    on Windows would require modifying the ./run.sh script in this directory
    for Windows, following directions here:
    https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation
    However, running the addon in production is as thoroughly tested on Windows
    as on other OSes. 

* Last tested on Firefox 34.0.5. New version should work, but if you encounter a
  bug, it is worth while to attempt to reproduce the bug in verion 34.0.5. See
  usage directions for how to specify a version. 


USAGE
-----

* Simple usage:
  $ cd <this directory>
  $ ./run.sh

* Advanced usage, many of these are special topics that may not be necessary:
  $ cfx run "{<addon arguments in json>}" "<cfx arguments>" &> a_log_file.txt

  <cfx arguments>:
    cfx tool reference:
    https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx
    
    $ cfx --help

    Useful arguments: --profiledir --binary

    Also used to build a production version

  <addon arguments in json>:
    -the following are key-values that are supported in passing json arguments
     to the addon.

    -key "performance" : any argument to run performance testing, "0" to not. Default
      is "0".

    -key "webhistory" : "webhistory" for a logging backend that grabs history from
      the browsers history. "logging" for a logging backend that stores visited
      websites in an sqlite database.

    -key "enable_clear_log" : true to enable log clearing via the GUI interface.
       Only relevant for "webhistory: logging". Recommended to set to true for
       developers.

    -key "initrules": json list of rules to preconfigure into addon for
       bootstrapping. 

* Building for production:
  -note: must have ssh aliases for grey = grey-dev.ece.cmu.edu

  ./build.sh - builds a production version. Here:
    http://grey-dev.ece.cmu.edu/privbrowse/

  ./build_dev.sh - builds a development version. Here:
    http://grey-dev.ece.cmu.edu/privbrowse/dev/


DEVELOPMENT
-----------

* Directory Structure

  /lib
    This directory contains all code for the back end addon script. It manages
    the background process and Browser UI.

    /lib/main.js - entry point for addon

  /data
    This directory contains code for content scripts and html that are either
    injected into pages or configuration pages that are part of the addon.

    /data/css
      Holds common css formatting for all data pages in

    /data/font-awesome-4.0.3, /data/jquery-*, moment, spectrum
      External libraries

    /data/icons
      Custom icons for addon project

    /data/grouping-interface
      Holds source for drag-n-drop config page to assign domains to personas

  /packages
    External projects used by the addon by the background process. 
