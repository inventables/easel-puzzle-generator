var properties = [
  {id: "Rows", type: 'range', value: 5, min: 1, max: 10, step: 1},
  {id: "Columns", type: 'range', value: 5, min: 1, max: 10, step: 1},
  {id: "Separate Pieces", type: "boolean", value: false}
];

var executor = function(args, success, failure) {
  var params = args.params;
  var rowCount = params.Rows;
  var columnCount = params.Columns;
  var usingFills = params.Shapes === 'fill';
  var separatePieces = params['Separate Pieces'];

  var bitWidth, bitUnit;

  var getSelectedVolumes = function(volumes, selectedVolumeIds) {
    var selectedVolumes = [];
    var volume;
    for (var i = 0; i < volumes.length; i++) {
      volume = volumes[i];
      if (selectedVolumeIds.indexOf(volume.id) !== -1) {
        selectedVolumes.push(volume);
      }
    }
    return selectedVolumes;
  };

  var toInches = function(width, unit) {
    return unit === "in" ? width : 0.0393701;
  };

  if (args.bitParams.useDetailBit) {
    // Detail bit always cuts outlines if in use (for now)
    bitWidth = args.bitParams.detailBit.width;
    bitUnit = args.bitParams.detailBit.unit;
  } else {
    bitWidth = args.bitParams.bit.width;
    bitUnit = args.bitParams.bit.unit;
  }

  var selectedVolumes = getSelectedVolumes(args.volumes, args.selectedVolumeIds);

  if (selectedVolumes.length === 0) {
    success([]);
  }

  var firstShapeDepth = selectedVolumes[0].cut.depth;

  var right = EASEL.volumeHelper.boundingBoxRight(selectedVolumes);
  var left = EASEL.volumeHelper.boundingBoxLeft(selectedVolumes);
  var top = EASEL.volumeHelper.boundingBoxTop(selectedVolumes);
  var bottom = EASEL.volumeHelper.boundingBoxBottom(selectedVolumes);

  var width = right - left;
  var height = top - bottom;

  // Returns 6 points representing the shape of one edge of a puzzle piece.
  // Point coordinates are expressed as percentage distances across the width
  // and height of the piece.
  var edgeDistributions = (function() {
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

    return function() {
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
  })();

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
      var columnOffset = columnWidth * columnIndex + left;
      return percent * columnWidth + columnOffset;
    };

    var offsetRowPosition = function(percent, rowHeight, rowIndex) {
      var rowOffset = rowHeight * rowIndex + bottom;
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

  var d3StraightLine = d3_shape.line();

  var buildPaths = function(pointArrays, index) {
    var path;

    var data = pointArrays.map(function(pointArray) {
      return d3StraightLine(pointArray);
    }).join(" ");

    if (pointArrays.length > 0) {
      path = svg.path(usingFills, data, "#999");
      return spacePath(path, index);
    } else {
      return "";
    }
  };

  var clippedPieces = function(pieceLines) {
    var closeVolume = function(pathVolume) {
      var firstPoint, lastPoint, points;

      if (pathVolume === null) {
        return null;
      }

      points = pathVolume.shape.points;

      if (points.length < 2) {
        return pathVolume;
      }

      firstPoint = points[0];
      lastPoint = points[points.length - 1];

      if (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y || firstPoint.lh !== lastPoint.lh || firstPoint.rh !== lastPoint.rh) {
        points.push(firstPoint);
      }

      return pathVolume;
    }

    var intersect = function(pieceVolumes, selectedVolumes) {
      var solutions = [];
      var clipVolume;

      var clippedVolumes = pieceVolumes.map(function(pieceVolume) {
        clipVolume = EASEL.volumeHelper.intersect(selectedVolumes, [pieceVolume]);
        if (clipVolume !== null) {
          clipVolume.cut = {
            type: "fill",
            depth: firstShapeDepth
          };
        }
        return clipVolume;
      });

      return clippedVolumes.map(closeVolume);
    }

    return intersect(pieceLines, selectedVolumes);
  };

  var buildPieceVolumes = function(pieces) {
    var piecePathDataStrings = pieces.map(piecePathData);

    return piecePathDataStrings.map(function(dataString) {
      var volume = EASEL.pathUtils.fromSvgPathDataString(dataString);

      volume.cut = {
        type: "outline",
        outlineStyle: "outside",
        tabPreference: false,
        depth: args.material.dimensions.z
      };

      var points = [], subpoints;
      for (var i = 0; i < volume.shape.points.length; i++) {
        subpoints = volume.shape.points[i];

        if (i > 0) {
          subpoints.shift(); // path begins where previous one ended
        }
        points = points.concat(subpoints);
      }

      volume.shape.points = [points];

      return volume;
    });
  };

  var spaceOut = function(volumes) {
    if (!separatePieces) return;

    var horizontalPieceGap = toInches(bitWidth, bitUnit) + (width / columnCount) * 0.5;
    var verticalPieceGap = toInches(bitWidth, bitUnit) + (width / columnCount) * 0.5;

    var volume, rowIndex, columnIndex;

    for (var i = 0; i < volumes.length; i++) {
      volume = volumes[i];

      if (volume === null) continue;

      rowIndex = Math.floor(i / columnCount);
      columnIndex = i % columnCount;

      volume.shape.center.x += horizontalPieceGap * columnIndex;
      volume.shape.center.y += verticalPieceGap * rowIndex;
    }
  };

  var removeSelectedVolumes = function() {
    var volume, volumesToRemove = [];

    for (var i = 0; i < selectedVolumes.length; i++) {
      volume = selectedVolumes[i];

      volumesToRemove.push({
        id: volume.id
      });
    }

    return volumesToRemove;
  }

  var generate = function() {
    var pieces = buildPieces();
    var pieceVolumes = buildPieceVolumes(pieces);
    var clippedPieceVolumes = clippedPieces(pieceVolumes);

    spaceOut(pieceVolumes);
    spaceOut(clippedPieceVolumes);

    var nonEmptyClippedPieceVolumes = clippedPieceVolumes.filter(function(volume) {
      return volume !== null;
    });


    var removedVolumes = removeSelectedVolumes();

    success(nonEmptyClippedPieceVolumes.concat(pieceVolumes).concat(removedVolumes));
  };

  generate();
};

