const uuid = require('uuid');
const request = require('superagent');
const React = require('react');

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reducer = reducer;

const packageName = '@@connection-modes/';

var CHANGE_CONNECTION_MODE = exports.CHANGE_CONNECTION_MODE = packageName + 'CHANGE_CONNECTION_MODE';
var STORE_IMAGE_LOAD_TIME = exports.STORE_IMAGE_LOAD_TIME = packageName + 'STORE_IMAGE_LOAD_TIME';
var SET_LATENCY = exports.SET_LATENCY = packageName + 'SET_LATENCY';
var SET_THROTTLE_LOCATIONS = exports.SET_THROTTLE_LOCATIONS = packageName + 'SET_THROTTLE_LOCATIONS';
var POSITION_UPDATE = exports.POSITION_UPDATE = packageName + 'POSITION_UPDATE';
var CACHE_ID_UPDATE = exports.CACHE_ID_UPDATE = packageName + 'CACHE_ID_UPDATE';
var TOGGLE_CONNECTION_MODE  = exports.TOGGLE_CONNECTION_MODE = packageName + 'TOGGLE_CONNECTION_MODE';
var NORMAL_LOADING = exports.NORMAL_LOADING = packageName + 'NORMAL_LOADING';
var LOW_CONNECTION = exports.LOW_CONNECTION = packageName + 'LOW_CONNECTION';
var SETTINGS_UPDATE = exports.SETTINGS_UPDATE = packageName + 'SETTINGS_UPDATE';

const defaultSettings = {
  latencyThreshold: 3000,
  imageLoadThreshold: 10 // kb/s
}

function reducer(state = {
  position: undefined,
  throttleLocations: undefined,
  latency: undefined,
  imageLoads: [],
  connectionMode: NORMAL_LOADING,
  manualConnectionMode: undefined,
  cacheId: uuid.v4(),
  settings: defaultSettings
}, action) {
  switch (action.type) {
    case CHANGE_CONNECTION_MODE:
      var connectionMode = state.manualConnectionMode ? state.manualConnectionMode : action.connectionMode;
      return Object.assign({}, state, { connectionMode: connectionMode });
    case STORE_IMAGE_LOAD_TIME:
      var connectionMode = checkImageSpeed(action, state.settings.imageLoadThreshold);
      return Object.assign({}, state, {
        imageLoads: state.imageLoads.concat(action),
        connectionMode: state.manualConnectionMode || connectionMode
      });
    case SET_LATENCY:
      var connectionMode = action.latency < state.settings.latencyThreshold ? NORMAL_LOADING : LOW_CONNECTION;
      return Object.assign({}, state, {
        latency: action.latency,
        connectionMode: state.manualConnectionMode || connectionMode
      })
    case SET_THROTTLE_LOCATIONS:
      var connectionMode = {connectionMode: checkThrottleLocations(state.position, action.throttleLocations || [], state.manualConnectionMode, state.connectionMode) };
      return Object.assign({}, state, {
        throttleLocations: action.throttleLocations
      }, connectionMode)
    case POSITION_UPDATE:
      var connectionMode = {connectionMode: checkThrottleLocations(action.position, state.throttleLocations || [], state.manualConnectionMode, state.connectionMode) };
      return Object.assign({}, state, {
        position: action.position
      }, connectionMode)
    case TOGGLE_CONNECTION_MODE:
      return Object.assign({}, state, {
        manualConnectionMode: action.mode,
        connectionMode: action.mode
      })
    case SETTINGS_UPDATE:
      return Object.assign({}, state, {settings: action.settings})
    default:
      return state;
  }
}

function checkImageSpeed(action, threshold) {
  return (action.time && ((action.size / (action.time / 1000)) > threshold)) ? NORMAL_LOADING : LOW_CONNECTION;
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

exports.TrackedImage = React.createClass({
  propTypes: {
    src: React.PropTypes.string.isRequired,
    imageSize: React.PropTypes.number.isRequired,
    store: React.PropTypes.object.isRequired,
    style: React.PropTypes.object,
    connection: React.PropTypes.object.isRequired,
    timeout: React.PropTypes.number
  },
  componentDidMount() {
    this.setState({initialTime: Date.now()});
    setTimeout(this.checkImageLoad, this.props.timeout || 100000);
  },
  imageLoaded(event) {
    this.setState({loadTime: Date.now()});
    this.props.store.dispatch(
      exports.storeImageLoadTime({
        src: this.props.src,
        size: this.props.imageSize,
        time: Date.now() - this.state.initialTime
      })
    );
  },
  checkImageLoad() {
    if (!this.state.loadTime) {
      this.props.store.dispatch(
        exports.storeImageLoadTime({
          src: this.props.src,
          size: this.props.imageSize,
          time: undefined
        }
      ));
    }
  },
  render() {
    const sessionImageSrc = this.props.src + '?cache_id=' + this.props.connection.cacheId;
    return (
      React.createElement('img', {
        src: sessionImageSrc,
        style: this.props.style || {},
        onLoad: this.imageLoaded
      })
    )
  }
});

exports.ThrottledComponent = React.createClass({
  propTypes: {
    connection: React.PropTypes.object.isRequired,
    normalConnectionNode: React.PropTypes.node.isRequired,
    lowConnectionNode: React.PropTypes.node.isRequired
  },
  render() {
    return this.props.connection.connectionMode === NORMAL_LOADING ? this.props.normalConnectionNode : this.props.lowConnectionNode;
  }
});

function checkThrottleLocations(position, locations, manualConnectionMode, connectionMode) {
  locations.forEach(function(location) {
    if (position && manualConnectionMode != NORMAL_LOADING && locations && distance(position.latitude, position.longitude, location.latitude, location.longitude) < location.radius) {
      connectionMode = LOW_CONNECTION;
    }
  })
  return connectionMode;
}

exports.settingsUpdate = (settings) => {
  return {
    type: SETTINGS_UPDATE,
    settings: settings
  }
}

exports.positionUpdate = (position) => {
  return {
    type: POSITION_UPDATE,
    position: position
  }
}

exports.updateCacheId = (cacheId) => {
  return {
    type: CACHE_ID_UPDATE,
    cacheId: cacheId
  }
}

exports.getThrottleLocations = function(userId, throttleLocations, apiEndpoint, saveFunc, store) {
  if (!throttleLocations) {
      store.dispatch(exports.fetchThrottleLocations(userId, apiEndpoint, saveFunc));
  } else {
    console.log('locations are ' + JSON.stringify(throttleLocations));
    store.dispatch(exports.setThrottleLocations(throttleLocations));
  }
}

exports.getLocation = function(navigator, store) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      store.dispatch(exports.positionUpdate(position));
    });
  } else {
    console.log('no position');
  }
}

exports.fetchThrottleLocations = function(userId, apiEndpoint, saveFunc) {
  return function (dispatch) {
    return request
      .get(apiEndpoint)
      .send({user_id: userId})
      .set('Accept', 'application/json')
      .end(function(err, res){
        saveFunc(res.body.locations);
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

exports.fetchLatency = function(userId, apiEndpoint) {
  return function (dispatch) {
    const startTime = Date.now();
    return request
      .get(apiEndpoint)
      .send({user_id: userId})
      .set('Accept', 'application/json')
      .end(function(err, res){
        const latency = Date.now() - startTime;
        dispatch(exports.setLatency(latency));
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
