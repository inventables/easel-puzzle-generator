var properties = [
  {type: 'range', id: "Rows", value: 8, min: 1, max: 10, step: 1},
  {type: 'range', id: "Columns", value: 10, min: 1, max: 10, step: 1}
];

var executor = function(args, success, failure) {
  var width = 480, height = 480;

  var params = args[0];
  var rowCount = params.Rows;
  var columnCount = params.Columns;

  var randomBetween = function(min, max) {
    return Math.random() * (max - min) + min;
  };

  var edgeDistributions = function() {
    var baselineOffsets = {
      xMin: 51,
      xMax: 62,
      yMin: -15,
      yMax: 5
    };

    var upperOffsets = {
      xMin: 20,
      xMax: 30,
      yMin: 20,
      yMax: 44
    };

    var point1 = [0, 0];
    var point2 = [
      randomBetween(baselineOffsets.xMin, baselineOffsets.xMax),
      randomBetween(baselineOffsets.yMin, baselineOffsets.yMax)
    ];
    var point3 = [
      randomBetween(upperOffsets.xMin, upperOffsets.xMax),
      randomBetween(upperOffsets.yMin, upperOffsets.yMax)
    ];
    var point4 = [
      randomBetween(100-upperOffsets.xMax, 100-upperOffsets.xMin),
      randomBetween(upperOffsets.yMin, upperOffsets.yMax)
    ];
    var point5 = [
      randomBetween(100-baselineOffsets.xMax, 100-baselineOffsets.xMin),
      randomBetween(baselineOffsets.yMin, baselineOffsets.yMax)
    ];
    var point6 = [100, 0];

    var sign = Math.random() < 0.5 ? -1 : 1;

    return [point1, point2, point3, point4, point5, point6].map(function(p) {
      return [p[0] / 100, p[1] * sign / 100];
    });
  };

  var buildHorizontalLines = function() {
    var lines = [];
    var rowHeight = height / rowCount;
    var columnWidth = width / columnCount;

    for (var rowIndex=1; rowIndex < rowCount; rowIndex++) {
      for (var columnIndex=0; columnIndex < columnCount; columnIndex++) {
        var points = edgeDistributions();

        points = points.map(function(p) {
          var columnOffset = columnWidth * columnIndex;
          var x = p[0] * columnWidth + columnOffset;
          var rowOffset = rowHeight * rowIndex;
          var y = height - (p[1] * rowHeight + rowOffset);

          return [x, y];
        });

        lines.push(points);
      }
    }

    return lines;
  };

  var buildVerticalLines = function() {
    var lines = [];
    var rowHeight = height / rowCount;
    var columnWidth = width / columnCount;

    for (var columnIndex=1; columnIndex < columnCount; columnIndex++) {
      for (var rowIndex=0; rowIndex < rowCount; rowIndex++) {
        var points = edgeDistributions();

        points = points.map(function(p) {
          var columnOffset = columnWidth * columnIndex;
          var x = p[1] * columnWidth + columnOffset;
          var rowOffset = rowHeight * rowIndex;
          var y = height - (p[0] * rowHeight + rowOffset);

          return [x, y];
        });

        lines.push(points);
      }
    }

    return lines;
  };

  // SVG helper functions
  var xmlHeader = '<?xml version="1.0" standalone="no"?>';
  var svgOpenTag = '<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="500" height="500">';
  var svgCloseTag = '</svg>';
  var rect = '<rect stroke-width="1" stroke="#999" fill="none" x="0" y="0" width="' + width + '" height="' + height + '" />';
  var pathElement = function(pathData) {
    return '<path stroke-width="1" stroke="#999" vector-effect="non-scaling-stroke" fill="none" d="' + pathData + '"/>';
  };

  var d3Line = d3_shape.line().curve(d3_shape.curveBasis);

  var lines = buildHorizontalLines().concat(buildVerticalLines());

  var paths = lines.map(function(points) {
    return pathElement(d3Line(points));
  });

  var svg = [
    xmlHeader,
    svgOpenTag,
    rect,
    paths.join(""),
    svgCloseTag
  ].join("");

  success(svg);
};

