var properties = [
  {type: 'range', id: "Rows", value: 8, min: 1, max: 10, step: 1},
  {type: 'range', id: "Columns", value: 10, min: 1, max: 10, step: 1}
];

var executor = function(args, success, failure) {
  var width = 450, height = 450;

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

  var offsetColumnPosition = function(percent, columnWidth, columnIndex) {
    var columnOffset = columnWidth * columnIndex;
    return percent * columnWidth + columnOffset;
  };

  var offsetRowPosition = function(percent, rowHeight, rowIndex) {
    var rowOffset = rowHeight * rowIndex;
    return percent * rowHeight + rowOffset;
  };

  var buildHorizontalLines = function() {
    var lines = [];
    var rowHeight = height / rowCount;
    var columnWidth = width / columnCount;

    var mapPoint = function(point, columnIndex, rowIndex) {
      var x = offsetColumnPosition(point[0], columnWidth, columnIndex);
      var y = height - offsetRowPosition(point[1], rowHeight, rowIndex);

      return [x, y];
    };

    for (var columnIndex=0; columnIndex < columnCount; columnIndex++) {
      var points = [[0, 0], [1,0]];
      points = points.map(function(point) {
        return mapPoint(point, columnIndex, 0);
      });
      lines.push(points);
    }

    for (var rowIndex=1; rowIndex < rowCount; rowIndex++) {
      for (columnIndex=0; columnIndex < columnCount; columnIndex++) {
        points = edgeDistributions();
        points = points.map(function(point) {
          return mapPoint(point, columnIndex, rowIndex);
        });
        lines.push(points);
      }
    }

    for (columnIndex=0; columnIndex < columnCount; columnIndex++) {
      points = [[0, 0], [1,0]];
      points = points.map(function(point) {
        return mapPoint(point, columnIndex, rowCount);
      });
      lines.push(points);
    }

    return lines;
  };

  var buildVerticalLines = function() {
    var lines = [];
    var rowHeight = height / rowCount;
    var columnWidth = width / columnCount;

    var mapPoint = function(point, columnIndex, rowIndex) {
      var x = offsetColumnPosition(point[1], columnWidth, columnIndex);
      var y = height - offsetRowPosition(point[0], rowHeight, rowIndex);

      return [x, y];
    };

    for (var rowIndex=0; rowIndex < rowCount; rowIndex++) {
      var points = [[0, 0], [1,0]];
      points = points.map(function(point) {
        return mapPoint(point, 0, rowIndex);
      });
      lines.push(points);
    }

    for (var columnIndex=1; columnIndex < columnCount; columnIndex++) {
      for (rowIndex=0; rowIndex < rowCount; rowIndex++) {
        points = edgeDistributions();

        points = points.map(function(point) {
          return mapPoint(point, columnIndex, rowIndex);
        });

        lines.push(points);
      }
    }

    for (rowIndex=0; rowIndex < rowCount; rowIndex++) {
      var points = [[0, 0], [1,0]];
      points = points.map(function(point) {
        return mapPoint(point, columnCount, rowIndex);
      });
      lines.push(points);
    }

    return lines;
  };

  // SVG helper functions
  var xmlHeader = '<?xml version="1.0" standalone="no"?>';
  var svgOpenTag = '<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="500" height="500">';
  var svgCloseTag = '</svg>';
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
    paths.join(""),
    svgCloseTag
  ].join("");

  success(svg);
};

