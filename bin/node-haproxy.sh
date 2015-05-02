#!/usr/bin/env node

var api = require('../src/api');
var args = require('./parseArgs');

api(args);
