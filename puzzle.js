var properties = [
  {type: 'range', id: "Rows", value: 8, min: 1, max: 10, step: 1},
  {type: 'range', id: "Columns", value: 10, min: 1, max: 10, step: 1},
  {id: "Shapes", type: "list", value: "fill", options: [["fill", "Fill"], ["stroke", "Outline"]]},
];

var executor = function(args, success, failure) {
  var params = args[0];
  var rowCount = params.Rows;
  var columnCount = params.Columns;
  var shapeType = params.Shapes;

  var shape = args[1];
  var width = shape.right - shape.left;
  var height = shape.top - shape.bottom;

  // Returns 6 points representing the shape of one edge of a puzzle piece.
  // Point coordinates are expressed as percentage distances across the width
  // and height of the piece.
  var edgeDistributions = function() {
    var randomBetween = function(min, max) {
      return Math.random() * (max - min) + min;
    };

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

  // Builds an m + 1 x n matrix of edge shapes. The first and last rows
  // are straight edges.
  var buildDistributions = function(m, n) {
    var lineGroups = [];
    var lines = [];
    var points, i, j;

    for (j = 0; j < n; j++) {
      lines.push([[0, 0], [1,0]]);
    }
    lineGroups.push(lines);

    for (i = 1; i < m; i++) {
      lines = [];
      for (j = 0; j < n; j++) {
        lines.push(edgeDistributions());
      }
      lineGroups.push(lines);
    }

    lines = [];
    for (j = 0; j < n; j++) {
      lines.push([[0, 0], [1,0]]);
    }
    lineGroups.push(lines);

    return lineGroups;
  };

  var transposePoint = function(point) {
    return [point[1], point[0]];
  };

  var offsetPoint = function(point, columnIndex, rowIndex, columnWidth, rowHeight) {
    var offsetColumnPosition = function(percent, columnWidth, columnIndex) {
      var columnOffset = columnWidth * columnIndex + shape.left;
      return percent * columnWidth + columnOffset;
    };

    var offsetRowPosition = function(percent, rowHeight, rowIndex) {
      var rowOffset = rowHeight * rowIndex + shape.bottom;
      return percent * rowHeight + rowOffset;
    };

    var x = offsetColumnPosition(point[0], columnWidth, columnIndex);
    var y = offsetRowPosition(point[1], rowHeight, rowIndex);

    return [x, y];
  };

  var offsetPoints = function(lineGroups, offsetter) {
    for (var i=0; i<lineGroups.length; i++) {
      var lines = lineGroups[i];
      for (var j=0; j<lines.length; j++) {
        lines[j] = lines[j].map(function(point) {
          return offsetter(point, j, i);
        });
      }
    }
  };

  var buildPieces = function() {
    var rowHeight = height / rowCount;
    var columnWidth = width / columnCount;
    var pieces = [];

    var rows = buildDistributions(rowCount, columnCount);
    offsetPoints(rows, function(point, j, i) {
      return offsetPoint(point, j, i, columnWidth, rowHeight);
    });

    var columns = buildDistributions(columnCount, rowCount);
    offsetPoints(columns, function(point, j, i) {
      return offsetPoint(transposePoint(point), i, j, columnWidth, rowHeight);
    });

    for (var rowIndex = 1; rowIndex <= rowCount; rowIndex++) {
      for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        var edges = [];
        edges.push(rows[rowIndex - 1][columnIndex]);
        edges.push(columns[columnIndex + 1][rowIndex - 1]);
        edges.push(rows[rowIndex][columnIndex].slice().reverse());
        edges.push(columns[columnIndex][rowIndex - 1].slice().reverse());

        pieces.push(edges);
      }
    }

    return pieces;
  };

  var d3CurvedLine = d3_shape.line().curve(d3_shape.curveBasis);

  var piecePathData = function(piece) {
    return piece.map(function(edge) {
      return d3CurvedLine(edge);
    }).join(" ");
  };

  var buildPiecePaths = function(pieces) {
    return pieces.map(function(piece) {
      return svg.path("stroke", piecePathData(piece), "#000");
    });
  };

  var buildPaths = function(pointArrays) {
    var d3Line = d3_shape.line();

    return pointArrays.map(function(pointArray) {
      return svg.path(shapeType, d3Line(pointArray.map(function(point) {
        // Invert shape vertically
        return [point[0], shape.top - point[1] + shape.bottom];
      })), "#999");
    })
  };

  var clippedPieces = function(pieces) {
    var scale = 32768; // Clipper can only deal with ints

    var scaleUpLine = function(line) {
      return line.map(function(point) {
        if (point.x)
          return {X: point.x * scale, Y: point.y * scale};
        else
          return {X: point[0] * scale, Y: point[1] * scale};
      });
    };

    var scaleDownLine = function(line) {
      return line.map(function(point) {
        return [point.X / scale, point.Y / scale];
      });
    };

    var closePoints = function(points) {
      var firstPoint, lastPoint;

      if (points.length === 0) {
        return points;
      }

      firstPoint = points[0];
      lastPoint = points[points.length - 1];

      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        points.push(firstPoint);
      }

      return points;
    }

    var intersect = function(pieceLines, shapeLines) {
      var scaledUpPieceLines = pieceLines.map(scaleUpLine);
      var scaledUpShapeLines = shapeLines.map(scaleUpLine);

      var solutions = [];

      for (var i = 0; i < scaledUpPieceLines.length; i++) {
        var cpr = new ClipperLib.Clipper();
        var scaledUpPieceLine = scaledUpPieceLines[i];
        var solution = new ClipperLib.Paths();

        cpr.AddPath(scaledUpPieceLine, ClipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(scaledUpShapeLines, ClipperLib.PolyType.ptClip, true);

        cpr.Execute(ClipperLib.ClipType.ctIntersection, solution);

        var closedSolution = solution.map(scaleDownLine).map(closePoints); // Design + piece

        solutions = solutions.concat(closedSolution);
      }
      return solutions;
    };

    var polylineGenerator = EASEL.pathPolylineGenerator(0.001, EASEL.matrix());
    var piecePathDataStrings = pieces.map(piecePathData);

    var pieceLines = piecePathDataStrings.map(function(dataString) {
      var controlPoints = EASEL.pathToControlPoints(EASEL.pathStringParser.parse(dataString));
      var polylines = polylineGenerator.toPolylines(controlPoints);

      var points = [];
      for (var i = 0; i < polylines.length; i++) {
        points = points.concat(polylines[i]);
      }
      return points;
    });

    return intersect(pieceLines, shape.pointArrays);
  };

  // SVG helpers
  var svg = {
    header: '<?xml version="1.0" standalone="no"?>',
    openTag: '<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="' + width + 'in" height="' + height + 'in"' +
               ' viewBox="' + shape.left + ' ' + shape.bottom + ' ' + width + ' ' + height + '">',
    closeTag: '</svg>',
    path: function(type, pathData, color) {
      var strokeFill = [color, 'none'];
      if (type === 'fill') {
        strokeFill.reverse();
      }
      return '<path stroke-width="1" stroke="' + strokeFill[0] + '" fill="' + strokeFill[1] + '" vector-effect="non-scaling-stroke" d="' + pathData + '"/>';
    }
  };

  var pieces = buildPieces();
  var piecePaths = buildPiecePaths(pieces).join("");
  var clippedPieceLines = clippedPieces(pieces);

  success([
    svg.header,
    svg.openTag,
    //buildPaths(shape.pointArrays),
    buildPaths(clippedPieceLines),
    piecePaths,
    svg.closeTag
  ].join(""));
};

