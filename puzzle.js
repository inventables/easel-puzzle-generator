var properties = [
  {type: 'range', id: "Rows", value: 8, min: 1, max: 10, step: 1},
  {type: 'range', id: "Columns", value: 10, min: 1, max: 10, step: 1}
];

var executor = function(args, success, failure) {
  var params = args[0];

  var points = [[0, 0], [10, 10]];
  var line = d3_shape.line();
  var pathData = line.curve(d3_shape.curveBasis)(points);

  // SVG helper functions
  var xmlHeader = '<?xml version="1.0" standalone="no"?>';
  var svgOpenTag = '<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="500" height="500">';
  var svgCloseTag = '</svg>';
  var pathElement = function(pathData) {
    return '<path stroke-width="1" stroke="#999" vector-effect="non-scaling-stroke" fill="none" d="' + pathData + '"/>';
  };

  var svg = [
    xmlHeader,
    svgOpenTag,
    pathElement(pathData),
    svgCloseTag
  ].join("");

  success(svg);
};

