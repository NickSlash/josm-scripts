// uninterpolate
// do not upload any changes made by this script to OSM

// this script is used to add all nodes between two ends of an interpolated way.
// it copys the tags from the first (lowest) node and applys it to the new nodes.
// it only works for ways with exactly two nodes.

// why? interpolated addresses dont show in OsmAnd 'view street/postcode' only the beginning and end nodes.
// also why? to learn how JOSM scripting works.

// only interpolation methods all, odd, even and alphabetic are handled.
// all - both nodes must have housenumber (without any alpha)
// odd - both nodes must have housenumber and must be odd (again without alpha)
// even - ass odd, just with even numbers
// alphabetic - both house numbers must be the same. one or both nodes need an alpha
//    one alpha N ->Nx = NA, NB, NC, .., Nx
//    two alpha Na->Nd = Na, N(a+1), N(a+2), .., Nd (range is lowest alpha to highest, does not need to start at A)
//

var alphabet = 'abcdefghijklmnopqrstuvwxyz'; 
var useLowerCase = false; // all alpha values will be changed to match this case
var loopLimit = 100; // an interpolation range with this many items is probably a mistake OR script issue. Abort if greater than this value

var Command = require("josm/command");
var Console = require("josm/scriptingconsole");
var NodeBuilder = require("josm/builder").NodeBuilder;
Console.show();

function clone(obj) {
    var copy;
 
    if (null == obj || "object" != typeof obj) return obj;
 
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) { copy[i] = clone(obj[i]); }
        return copy;
    }
 
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) { if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]); }
        return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

toBase26 = function (num) {
    var base = 26;
    var digits = []; 
    do {
        digits.push(num % base);
        num = Math.floor(num / base);
    } while (num > 0);
    var chars = [];
    while (digits.length) { chars.push(alphabet[digits.pop()]) }
    if (useLowerCase) { return chars.join('') } else { return chars.join('').toUpperCase() }
};

fromBase26 = function (str) {
    str = String(str).toLowerCase();
    var base = 26;
    var pos = 0;
    var num = 0;
    var c;
    var ptr = str.length;
    while (0 < ptr--) { num += Math.pow(base, pos++) * alphabet.indexOf(str[ptr]) }
    return num;
};


// calculate a fractional position between two points
// pA - First Point
// pB - Second Point
// n  - Numerator
// d  - Denominator
function position(pA, pB, n, d) { return pA + ((n/d)*(pB-pA)); }


function parse_housenumber(address) {
    var reg = /^([\d]+)([a-z]+)?$/gi;
    // full match, digit(s), alpha
    if (useLowerCase) { address = address.toLowerCase() } else { address = address.toUpperCase() }
    var result = reg.exec(address);
    return [parseInt(result[1], 10), (result[2]?result[2]:null)];
}

function main() {
    var Layer = require("josm/layers").activeLayer;
    if (Layer == null) { Console.println("error: failed to get active layer") }

    var Dataset = Layer.data;

    var NB = new NodeBuilder(Dataset);

    var Results = Dataset.query("type:way \"addr:interpolation\"");

    Results.forEach(function( result, index ) {

        if (result.nodes.length == 2) {
            var interpolation = String(result.get("addr:interpolation")).replace(/\s/g,'');
            var node_first = 0;
            var node_last = 1;
            var count;
            var offset;
            var nodes = [];
            var mode;
            // mode:
            // 0 - numeric/all
            // 1 - numeric/odd and numeric/even
            // 2 - alphabetic Nx->Ny
            // 3 - alphabetic N ->Nx
            var tags;
            switch(interpolation) {
                case "all":
                    pointA_housenumber = parse_housenumber(result.nodes[node_first].get("addr:housenumber"));
                    if (pointA_housenumber[1]) {
                        Console.println("error: point [" + result.nodes[node_first].id + "] has a letter in addr:housenumber on all interpolation (not supported) ");
                        return;
                    }
                    pointB_housenumber = parse_housenumber(result.nodes[node_last].get("addr:housenumber"));
                    if (pointB_housenumber[1]) {
                        Console.println("error: point [" + result.nodes[node_last].id + "] has a letter in addr:housenumber on all interpolation (not supported) ");
                        return;
                    }
                    if (pointA_housenumber[0] > pointB_housenumber[1] ) {
                        node_first = 1;
                        node_last = 0;
                    }
                    mode = 0;
                    break;
                case "even":
                    pointA_housenumber = parse_housenumber(result.nodes[node_first].get("addr:housenumber"));
                    if (pointA_housenumber[0] % 2 == 1) {
                        Console.println("error: point [" + result.nodes[node_first].id + "] has an odd addr:housenumber on even interpolation");
                        return;
                    }
                    if (pointA_housenumber[1]) {
                        Console.println("error: point [" + result.nodes[node_first].id + "] has a letter in addr:housenumber on even interpolation (not supported) ");
                        return;
                    }
                    pointB_housenumber = parse_housenumber(result.nodes[node_last].get("addr:housenumber"));
                    if (pointB_housenumber[0] % 2 == 1) {
                        Console.println("error: point [" + result.nodes[node_last].id + "] has an odd number on even interpolation");
                        return;
                    }
                    if (pointB_housenumber[1]) {
                        Console.println("error: point [" + result.nodes[node_last].id + "] has a letter in addr:housenumber on even interpolation (not supported) ");
                        return;
                    }
                    if (pointA_housenumber[0] > pointB_housenumber[1] ) {
                        node_first = 1;
                        node_last = 0;
                    }
                    mode = 1;
                    break;
                case "odd":
                    pointA_housenumber = parse_housenumber(result.nodes[node_first].get("addr:housenumber"));
                    if (pointA_housenumber[0] % 2 == 0) {
                        Console.println("error: point [" + result.nodes[node_first].id + "] has an even addr:housenumber on odd interpolation");
                        return;
                    }
                    if (pointA_housenumber[1]) {
                        Console.println("error: point [" + result.nodes[node_first].id + "] has a letter in addr:housenumber on odd interpolation (not supported) ");
                        return;
                    }
                    pointB_housenumber = parse_housenumber(result.nodes[node_last].get("addr:housenumber"));
                    if (pointB_housenumber[0] % 2 == 0) {
                        Console.println("error: point [" + result.nodes[node_last].id + "] has an even number on odd interpolation");
                        return;
                    }
                    if (pointB_housenumber[1]) {
                        Console.println("error: point [" + result.nodes[node_last].id + "] has a letter in addr:housenumber on odd interpolation (not supported) ");
                        return;
                    }
                    if (pointA_housenumber[0] > pointB_housenumber[1] ) {
                        node_first = 1;
                        node_last = 0;
                    }
                    mode = 1;
                    break;
                case "alphabetic":
                    pointA_housenumber = parse_housenumber(result.nodes[node_first].get("addr:housenumber"));
                    result.nodes[node_first].set("addr:housenumber", String(pointA_housenumber[0] + pointA_housenumber[1])); // unify letter case
                    pointB_housenumber = parse_housenumber(result.nodes[node_last].get("addr:housenumber"));
                    result.nodes[node_last].set("addr:housenumber", String(pointB_housenumber[0] + pointB_housenumber[1])); // unify letter case
                    if (pointA_housenumber[0] != pointB_housenumber[0]) {
                        Console.println("error: way [" + result.id + "] has alphabetic interpolation and housenumbers do not match (not supported)");
                        return;
                    } else {
                        if (!pointA_housenumber[1] && !pointB_housenumber[1]) {
                            Console.println("error: way [" + result.id + "] has alphabetic interpolation but no letters are specified.");
                            return;
                        }
                        if (pointA_housenumber[1] && pointB_housenumber[1]) {
                            if (fromBase26(pointA_housenumber[1]) > fromBase26(pointB_housenumber[1])) {
                                node_first = 1;
                                node_last = 0;
                            }
                            mode = 2;
                            break;
                        } else {
                            if (pointA_housenumber[1]) {
                                node_first = 1;
                                node_last = 0;
                            }
                            mode = 3;
                            break;
                        }
                    }
                default:
                    Console.println("error: way [" + result.id + "] has an unhandled interpolation type <" + interpolation + ">");
                    return;
            }
            pointA = { lon: result.nodes[node_first].lon, lat: result.nodes[node_first].lat };
            pointA_housenumber = parse_housenumber(result.nodes[node_first].get("addr:housenumber"));
            pointB = { lon: result.nodes[node_last].lon, lat: result.nodes[node_last].lat };
            pointB_housenumber = parse_housenumber(result.nodes[node_last].get("addr:housenumber"));
            tags = clone(result.nodes[node_first].tags);
            delete tags["addr:housenumber"];
            switch(mode) {
                case 0:
                    count = pointB_housenumber[0] - pointA_housenumber[0];
                    break;
                case 1:
                    count = (pointB_housenumber[0] - pointA_housenumber[0]) / 2;
                    break;
                case 2:
                    offset = fromBase26(pointA_housenumber[1]); 
                    count = fromBase26(pointB_housenumber[1]) - fromBase26(pointA_housenumber[1]);
                    break;
                case 3:
                    offset = -1
                    count = fromBase26(pointB_housenumber[1]) + 1;
                    break;
                default:
            }
            if (count > loopLimit) {
                Console.println("error: trying to add over <" + loopLimit + "> items. Aborting");
                return;
            }
            nodes.push(result.nodes[node_first]);
            for (var index = 1; index < count; index++) {
                var node = NB.withPosition(position(pointA.lat, pointB.lat, index, count),position(pointA.lon, pointB.lon, index, count)).withTags(tags).create();
                switch(mode) {
                    case 0:
                        node.tags["addr:housenumber"] = String(pointA_housenumber[0] + index);
                        break;
                    case 1:
                        node.tags["addr:housenumber"] = String(pointA_housenumber[0] + (index * 2));
                        break;
                    case 2:
                        node.tags["addr:housenumber"] = String(pointA_housenumber[0]) + toBase26(offset + index);
                        break;
                    case 3:
                        node.tags["addr:housenumber"] = String(pointA_housenumber[0]) + toBase26(offset + index);
                        break;
                    default:
                }
                nodes.push(node);
            }
            nodes.push(result.nodes[node_last]);
            Dataset.get(result.id, "way").nodes = nodes;
        } else {
            Console.println("error: way [" + result.id + "] has too many nodes to be processed.");
            return;
        }

    });
}

main();
