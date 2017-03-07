'use strict';

const uuid = require('uuid');
const request = require('superagent');

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.reducer = reducer;

const packageName = '@@latency-tracker/';

var CHANGE_CONNECTION_MODE = exports.CHANGE_CONNECTION_MODE = packageName + 'CHANGE_CONNECTION_MODE';
var STORE_IMAGE_LOAD_TIME = exports.STORE_IMAGE_LOAD_TIME = packageName + 'STORE_IMAGE_LOAD_TIME';
var SET_LATENCY = exports.SET_LATENCY = packageName + 'SET_LATENCY';
var SET_THROTTLE_LOCATIONS = exports.SET_THROTTLE_LOCATIONS = packageName + 'SET_THROTTLE_LOCATIONS';
var POSITION_UPDATE = exports.POSITION_UPDATE = packageName + 'POSITION_UPDATE';
var TOGGLE_CONNECTION_MODE  = exports.TOGGLE_CONNECTION_MODE = packageName + 'TOGGLE_CONNECTION_MODE';
var NORMAL_LOADING = exports.NORMAL_LOADING = packageName + 'NORMAL_LOADING';
var LOW_CONNECTION = exports.LOW_CONNECTION = packageName + 'LOW_CONNECTION';

function reducer(state = {
  position: undefined,
  throttleLocations: undefined,
  latency: undefined,
  imageLoads: [],
  connectionMode: NORMAL_LOADING,
  manualConnectionMode: undefined
}, action) {
	switch (action.type) {
    case CHANGE_CONNECTION_MODE:
      var connectionMode = state.manualConnectionMode ? state.manualConnectionMode : action.connectionMode;
      return Object.assign({}, state, { connectionMode: connectionMode });
    case STORE_IMAGE_LOAD_TIME:
      var connectionMode = action.time ? {} : {connectionMode: LOW_CONNECTION};
      return Object.assign({}, state, { imageLoads: state.imageLoads.concat(action) }, connectionMode);
    case SET_LATENCY:
      var connectionMode = action.time > 5000 ? {} : {connectionMode: LOW_CONNECTION};
      return Object.assign({}, state, {
        latency: action.latency
      }, connectionMode)
    case SET_THROTTLE_LOCATIONS:
      var connectionMode = {connectionMode: checkThrottleLocations(state.position, action.throttleLocations, state.connectionMode) };
      return Object.assign({}, state, {
        throttleLocations: action.throttleLocations
      }, connectionMode)
    case POSITION_UPDATE:
      var connectionMode = {connectionMode: checkThrottleLocations(action.position, state.throttleLocations, state.connectionMode) };
      return Object.assign({}, state, {
        position: action.position
      }, connectionMode)
    case TOGGLE_CONNECTION_MODE:
      return Object.assign({}, state, {
        manualConnectionMode: action.mode,
        connectionMode: action.mode
      })
		default:
			return state;
	}
}

function distance(lat1, lng1, lat2, lng2) {
  var radlat1 = Math.PI * lat1 / 180;
  var radlat2 = Math.PI * lat2 / 180;
  var radlon1 = Math.PI * lng1 / 180;
  var radlon2 = Math.PI * lng2 / 180;
  var theta = lng1 - lng2;
  var radtheta = Math.PI * theta / 180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515;
  dist = dist * 1.609344;
  return dist;
}

function checkThrottleLocations(position, locations, connectionMode) {
  locations.forEach(function(location) {
    if (position && connectionMode != NORMAL_LOADING && locations && distance(position.latitude, position.longitude, location.latitude, location.longitude) < location.radius) {
      connectionMode = LOW_CONNECTION;
    }
  })
  return connectionMode;
}


exports.positionUpdate = (position) => {
  return {
    type: POSITION_UPDATE,
    position: position
  }
}

exports.fetchThrottleLocations = function(userId, cookie) {
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

exports.setThrottleLocations = (locations) => {
  return {
    type: SET_THROTTLE_LOCATIONS,
    throttleLocations: locations
  }
}

exports.fetchLatency = function(userId) {
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

exports.setLatency = (latency) => {
  return {
    type: SET_LATENCY,
    latency: latency
  }
}

exports.storeImageLoadTime = (image) => {
  return {
    type: STORE_IMAGE_LOAD_TIME,
    time: image.time,
    src: image.src,
    size: image.size
  }
}

exports.changeConnectionMode = (connectionMode) => {
  return {
    type: CHANGE_CONNECTION_MODE,
    connectionMode: connectionMode
  }
}

exports.toggleConnectionMode = (mode) => {
  return {
    type: TOGGLE_CONNECTION_MODE,
    mode: mode
  }
}
