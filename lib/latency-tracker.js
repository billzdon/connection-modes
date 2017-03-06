'use strict';

const uuid = require('uuid');
import fetch from 'isomorphic-fetch'
import request from 'superagent';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.reducer = reducer;

//const packageName = '@@latency-tracker/';
const packageName = '';

var CHANGE_CONNECTION_MODE = exports.CHANGE_CONNECTION_MODE = packageName + 'CHANGE_CONNECTION_MODE';
var STORE_IMAGE_LOAD_TIME = exports.STORE_IMAGE_LOAD_TIME = packageName + 'STORE_IMAGE_LOAD_TIME';
var SET_LATENCY = exports.SET_LATENCY = packageName + 'SET_LATENCY';
var SET_THROTTLE_LOCATIONS = exports.SET_THROTTLE_LOCATIONS = packageName + 'SET_THROTTLE_LOCATIONS';
var POSITION_UPDATE = exports.POSITION_UPDATE = packageName + 'POSITION_UPDATE';
var TOGGLE_CONNECTION_MODE  = exports.TOGGLE_CONNECTION_MODE = packageName + 'TOGGLE_CONNECTION_MODE';

function reducer(state = {
  position: undefined,
  throttleLocations: undefined,
  latency: undefined,
  imageLoads: [],
  connectionMode: c.NORMAL_LOADING,
  manualConnectionMode: undefined
}, action) {
	switch (action.type) {
    case c.CHANGE_CONNECTION_MODE:
      var connectionMode = state.manualConnectionMode ? state.manualConnectionMode : action.connectionMode;
      return Object.assign({}, state, { connectionMode: connectionMode });
    case c.STORE_IMAGE_LOAD_TIME:
      var connectionMode = action.time ? {} : {connectionMode: c.LOW_CONNECTION};
      return Object.assign({}, state, { imageLoads: state.imageLoads.concat(action) }, connectionMode);
    case c.SET_LATENCY:
      var connectionMode = action.time > 5000 ? {} : {connectionMode: c.LOW_CONNECTION};
      return Object.assign({}, state, {
        latency: action.latency
      }, connectionMode)
    case c.SET_THROTTLE_LOCATIONS:
      var connectionMode = {connectionMode: checkThrottleLocations(state.position, action.throttleLocations, state.connectionMode) };
      return Object.assign({}, state, {
        throttleLocations: action.throttleLocations
      }, connectionMode)
    case c.POSITION_UPDATE:
      var connectionMode = {connectionMode: checkThrottleLocations(action.position, state.throttleLocations, state.connectionMode) };
      return Object.assign({}, state, {
        position: action.position
      }, connectionMode)
    case c.TOGGLE_CONNECTION_MODE:
      return Object.assign({}, state, {
        manualConnectionMode: action.mode,
        connectionMode: action.mode
      })
		default:
			return state;
	}
}

export const positionUpdate = (position) => {
  return {
    type: c.POSITION_UPDATE,
    position: position
  }
}

export function fetchThrottleLocations(userId, cookie) {
  return function (dispatch) {
    return request
      .get('/api/throttle_locations')
      .send({user_id: userId})
      .set('Accept', 'application/json')
      .end(function(err, res){
        cookie.save('throttleLocations', res.body.locations, { path: '/' });
        dispatch(setThrottleLocations(res.body.locations));
      });
  }
}

export const setThrottleLocations = (locations) => {
  return {
    type: c.SET_THROTTLE_LOCATIONS,
    throttleLocations: locations
  }
}

export function fetchLatency(userId) {
  return function (dispatch) {
    const startTime = Date.now();
    return request
      .get('/api/latency')
      .send({user_id: userId})
      .set('Accept', 'application/json')
      .end(function(err, res){
        const latency = Date.now() - startTime;
        dispatch(setLatency(latency));
      });
  }
}

export const setLatency = (latency) => {
  return {
    type: c.SET_LATENCY,
    latency: latency
  }
}

export const storeImageLoadTime = (image) => {
  return {
    type: c.STORE_IMAGE_LOAD_TIME,
    time: image.time,
    src: image.src,
    size: image.size
  }
}

export const changeConnectionMode = (connectionMode) => {
  return {
    type: c.CHANGE_CONNECTION_MODE,
    connectionMode: connectionMode
  }
}

export const toggleConnectionMode = (mode) => {
  return {
    type: c.TOGGLE_CONNECTION_MODE,
    mode: mode
  }
}
