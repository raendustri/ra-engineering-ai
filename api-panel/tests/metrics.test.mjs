import test from 'node:test';
import assert from 'node:assert/strict';
import {monthStartUTC, sumCosts, sumUsage, dailyUsage} from '../metrics.mjs';
test('month start calculation is UTC',()=>assert.equal(monthStartUTC(new Date('2026-11-15T12:03:00Z')), 1793491200));
test('cost sums only USD and ignores null',()=>assert.equal(sumCosts([{results:[{amount:{value:0.1,currency:'usd'}},{amount:{value:0.2,currency:'usd'}},{amount:{value:5,currency:'eur'}},{amount:null}]}]),.30000000000000004));
test('usage aggregation',()=>assert.deepEqual(sumUsage([{results:[{input_tokens:120,output_tokens:70,input_cached_tokens:20,num_model_requests:2},{input_tokens:30,output_tokens:10,num_model_requests:1}]}]),{input:150,output:80,cached:20,requests:3}));
test('daily aggregation',()=>assert.deepEqual(dailyUsage([{start_time:1793491200,results:[{input_tokens:5,output_tokens:2}]},{start_time:1793491200,results:[{input_tokens:10,output_tokens:3}]}]),[{date:'2026-11-01',input:15,output:5}]));