// fix-dimensions
// this script is used to correctly format (for OsmAnd) the height, maxheigh, width and maxwidth tags on nodes and ways.
// do not upload any changes made by this script to OSM

// match_metric
// takes a value and returns an object or null if matches metric format
// match groups
// 1 - whole units or null (meters/kilometers)
// 2 - fractional units or null (fractional meters/kilometers)
// 3 - unit type or null (m/km)
function match_metric(value) {
    var re_decimal = /^([0-9]+)?[\.]?([0-9]+)?(m|km)?$/g;
    return re_decimal.exec(sanitize_value(value));
}

// match_imperial
// takes a value and returns an object or null if matches imperial format
// match groups
// 1 - feet or null
// 2 - inches or null
function match_imperial(value) {
    var re_imperial =  /^(?!$|.*\'[^\x22]+$)(?:([0-9]+)\')?(?:([0-9]+)\x22?)?$/g;
    return re_imperial.exec(sanitize_value(value));
}

// sanitize_value
// takes a string and removes white spaces, converts comma to period, converts back-tick to apostrophe, converts double apostrophe to double qoute
function sanitize_value(value) {
    return String(value).replace(/\s/g,'').replace(/,/g,'.').replace(/\`/g, '\'').replace(/\'\'/g,'"').toLowerCase();
}


// format_value
// takes a string and (re)formats any height or width values correctly or returns the input if invalid
function format_value(value) {
    var match;
    match = match_metric(value);
    if (match) {
        return (match[1] || "0") + (match[2]? "." + match[2]:"") + (match[3]?(match[3]=="km"?" km":""):"");
    }
    match = match_imperial(value);
    if (match) {
        return (match[1] || "0") + "'" + (match[2] || "0") + "\"";
    }
    return value;
}

// to_meters
// takes a value and converts it to METERS if possible and returns input for invalid input
function to_meters(value, precision) {
    var match;
    precision = precision || 2;
    match = match_metric(value);
    if (match) {
        if (match[3] && match[3] == "km") {
            return String(parseFloat((parseFloat((match[1] || 0) + (match[2]? "." + match[2]:"")) * 1000).toFixed(precision)));
        } else {
            return (match[1] || "0") + (match[2]? "." + match[2]:"") + (match[3]?(match[3]=="km"?" km":""):"");
        }
    }
    match = match_imperial(value);
    if (match) {
        return String(parseFloat(parseFloat(((parseInt((match[1]||0), 10) * 12 ) + parseInt((match[2]||0),10)) * 0.0254).toFixed(precision)));
    }
    return value; 
}




var util = require("josm/util");
var command = require("josm/command");
var console = require("josm/scriptingconsole");

function current_layer() {
    var layers = require("josm/layers");
    return layers.activeLayer;
}

// find all nodes with "key" and modify value
function update_node(key) {
    var layer = current_layer();
    if (layer == null) return;
    
    var dataset = layer.data;
    var result = dataset.query("type:node "+key);
    console.println(" > [" + result.length + " nodes with [" + key + "]");
    for (i = 0; i < result.length; i++) {
        var node = result[i];
        var value = node.get(key);
        var newValue = to_meters(value);
        if (value != newValue) {
            console.println(" - Updating Value [" + value + " --> " + newValue + "]");
            var edit = { tags: {} };
            edit.tags[key] = newValue;
            layer.apply( command.change(dataset.node(node.id), edit));
        } else {
            console.println(" - Value OK, Skipping");
        }
    }
    console.println(" > Complete.")
}

// find all ways with "key" and modify value
function update_way(key) {
    var layer = current_layer();
    if (layer == null) return;
    
    var dataset = layer.data;
    var result = dataset.query("type:way "+key);
    console.println(" > [" + result.length + " ways with [" + key + "]");
    for (i = 0; i < result.length; i++) {
        var way = result[i];
        var value = way.get(key);
        var newValue = to_meters(value);
        if (value != newValue) {
            console.println(" - Updating Value [" + value + " --> " + newValue + "]");
            var edit = { tags: {} };
            edit.tags[key] = newValue;
            layer.apply( command.change(dataset.way(way.id), edit));
        } else {
            console.println(" - Value OK, Skipping");
        }
    }
    console.println(" > Complete.")
}

// update nodes
update_node("maxwidth");
update_node("width");
update_node("maxheight");
update_node("height");
// update ways
update_way("maxwidth");
update_way("width");
update_way("maxheight");
update_way("height");
