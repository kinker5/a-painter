/* global AFRAME THREE */
function Lines() {
  this.lines = [];
  document.addEventListener('keyup', function(event){
    if (event.keyCode === 83) {
      var dataviews = this.getBinary();
      var blob = new Blob(dataviews, {type: 'application/octet-binary'});

      // FileSaver.js defines `saveAs` for saving files out of the browser
      var filename = "apainter.bin";
      saveAs(blob, filename);
    }
  }.bind(this));
}

Lines.prototype = {
    addNewLine: function(color, lineWidth) {
      var line = new Line(color, lineWidth);
      this.lines.push(line);
      return line;
    },
    getBinary: function() {
      var dataViews = [];

      var binaryWriter = new BinaryWriter(4);
      var isLittleEndian = true;
      binaryWriter.writeUint32(0, this.lines.length, isLittleEndian);
      dataViews.push(binaryWriter.getDataView());

      for (var i=0;i<this.lines.length; i++) {
        dataViews.push(this.lines[i].getBinary());
      }
      return dataViews;
    }
};

var lines = new Lines();

function Line (color, lineWidth) {
  this.points = [];
  this.lineWidth = lineWidth;
  this.lineWidthModifier = 0.0;
  this.color = color.clone();

  var material = new THREE.MeshStandardMaterial({
    color: this.color,
    roughness: 0.5,
    metalness: 0.5,
    side: THREE.DoubleSide,
    shading: THREE.FlatShading
  });

  this.geometry = new THREE.BufferGeometry();
  this.vertices = new Float32Array(1000 * 3 * 2);
  this.uvs = new Float32Array(1000 * 2 * 2);

  this.geometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3).setDynamic(true));
  this.geometry.addAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));

  this.mesh = new THREE.Mesh(this.geometry, material);
  this.mesh.drawMode = THREE.TriangleStripDrawMode;

  this.mesh.frustumCulled = false;
  this.mesh.vertices = this.vertices;
}

var BinaryWriter = function(bufferSize) {
  this.dataview = new DataView(new ArrayBuffer(bufferSize));
}

BinaryWriter.prototype = {
  writeVector: function(offset, vector, isLittleEndian) {
    offset = this.writeFloat(this.dataview, offset, vector.x, isLittleEndian);
    offset = this.writeFloat(this.dataview, offset, vector.y, isLittleEndian);
    return this.writeFloat(this.dataview, offset, vector.z, isLittleEndian);
  },
  writeColor: function(offset, vector, isLittleEndian) {
    offset = this.writeFloat(this.dataview, offset, vector.r, isLittleEndian);
    offset = this.writeFloat(this.dataview, offset, vector.g, isLittleEndian);
    return this.writeFloat(this.dataview, offset, vector.b, isLittleEndian);
  },
  writeUint32: function(offset, int, isLittleEndian) {
    this.dataview.setUint32(offset, int, isLittleEndian);
    return offset + 4;
  },
  writeFloat: function(offset, float, isLittleEndian) {
    this.dataview.setFloat32(offset, float, isLittleEndian);
    return offset + 4;
  },
  writeArray: function(offset, array, isLittleEndian) {
    for (var i=0;i<array.length;i++) {
      offset = this.writeFloat(this.dataview, offset, array[i], isLittleEndian);
    }
    return offset;
  },
  getDataView: function() {
    return this.dataview;
  }
};

/*
var BinaryWriter = (function() {
  return;

  var geometryToDataView = function(line) {
    var color = line.stroke.color;
    var points = line.points;
    var bufferSize = 84 + ((1+3+4) * 4 * points.length);
    var binaryWriter = new BinaryWriter(bufferSize);
    dv = binaryWriter.getDataView();
    var offset = 0;

    var isLittleEndian = true;
    var offset = 0;

    offset = writeColor(dv, offset, color, isLittleEndian);

    dv.setUint32(offset, points.length, isLittleEndian);
    offset+=4;

    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      offset = writeArray(dv, offset, point.position, isLittleEndian);
      offset = writeArray(dv, offset, point.rotation, isLittleEndian);
      offset = writeFloat(dv, offset, point.intensity, isLittleEndian);
    }
    return dv;
  };

  var save = function(geometry, filename) {
    var dv = geometryToDataView(geometry);
    var blob = new Blob([dv], {type: 'application/octet-binary'});

    // FileSaver.js defines `saveAs` for saving files out of the browser
    //saveAs(blob, filename);
  };
/*
  var loader = new THREE.XHRLoader(this.manager);
  loader.setResponseType('arraybuffer');

  var url = 'stroke.bin';
  loader.load(url, function (buffer) {

    var offset = 0;
    var data = new DataView(buffer);

    function readQuaternion() {
      var output = new THREE.Quaternion(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true),
        data.getFloat32(offset + 12, true)
      );
      offset+=16;
      return output;
    }

    function readVector3() {
      var output = new THREE.Vector3(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      );
      offset+=12;
      return output;
    }

    function readColor() {
      var output = new THREE.Color(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      );
      offset+=12;
      return output;
    }

    function readFloat() {
      var output = data.getFloat32(offset, true);
      offset+=4;
      return output;
    }

    function readInt() {
      var output = data.getUint32(offset, true);
      offset+=4;
      return output;
    }

    var color = readColor();
    var numPoints = readInt();

    var lineWidth = 0.01;
    var line = new Line(color, lineWidth);

    var entity = document.createElement('a-entity');
    document.querySelector('a-scene').appendChild(entity);
    entity.object3D.add(line.mesh);

    var i = 0;
    var interval = setInterval(function(){
      var point = readVector3();
      var quat = readQuaternion();
      var intensity = readFloat();

      if (i==0) {
        line.setInitialPosition(point, quat);
      } else {
        line.addPoint(point, quat, intensity);
      }

      if (++i === numPoints) {
        clearInterval(interval);
      }
    }, 10);

/*
    for (var i=0;i<numPoints;i++) {
      var point = readVector3();
      var quat = readQuaternion();
      var intensity = readFloat();

      if (i==0) {
        line.setInitialPosition(point, quat);
      } else {
        line.addPoint(point, quat, intensity);
      }
    }
*/
/*
  });

  //save(line,'test.bin');
  that.save = save;
  return that;
}());
*/

Line.prototype = {
  getBinary: function () {
    var color = this.color;
    var points = this.points;
    var bufferSize = 84 + ((1+3+4) * 4 * points.length);
    var binaryWriter = new BinaryWriter(bufferSize);
    var offset = 0;

    var isLittleEndian = true;
    var offset = 0;

    offset = binaryWriter.writeColor(offset, color, isLittleEndian);
    offset = binaryWriter.writeUint32(offset, points.length, isLittleEndian);

    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      offset = binaryWriter.writeArray(offset, point.position, isLittleEndian);
      offset = binaryWriter.writeArray(offset, point.rotation, isLittleEndian);
      offset = binaryWriter.writeFloat(offset, point.intensity, isLittleEndian);
    }
    return binaryWriter.getDataView();
  },
  setInitialPosition: function (position, rotation) {
    var direction = new THREE.Vector3();
    direction.set(0, 1.7, 1);
    direction.applyQuaternion(rotation);
    direction.normalize();
    var posBase = position.clone().add(direction.clone().multiplyScalar(-0.08));

    direction.set(1, 0, 0);
    direction.applyQuaternion(rotation);
    direction.normalize();

    var posA = posBase.clone();
    var posB = posBase.clone();
    var lineWidth = this.lineWidth * this.lineWidthModifier;
    posA.add(direction.clone().multiplyScalar(lineWidth));
    posB.add(direction.clone().multiplyScalar(-lineWidth));

    var i = 0;
    for (var j = 0; j < this.vertices.length / 2; j += 3) {
      this.vertices[ i++ ] = posA.x;
      this.vertices[ i++ ] = posA.y;
      this.vertices[ i++ ] = posA.z;

      this.vertices[ i++ ] = posB.x;
      this.vertices[ i++ ] = posB.y;
      this.vertices[ i++ ] = posB.z;
    }

    i = 0;
    for (j = 0; j < this.uvs.length / 2; j += 2) {
      var v = (j / 2) / (this.uvs.length / 2);
      this.uvs[ i++ ] = v;
      this.uvs[ i++ ] = 0;

      this.uvs[ i++ ] = v;
      this.uvs[ i++ ] = 1;
    }
  },
  getJSON: function () {
    return {
      stroke: {color: this.color},
      points: this.points
    };
  },
  addPoint: function (position, rotation, intensity) {
    // Rotate vertices
    for (var j = 0; j < this.vertices.length - 3; j += 3) {
      this.vertices[ j ] = this.vertices[ j + 6 ];
      this.vertices[ j + 1 ] = this.vertices[ j + 7 ];
      this.vertices[ j + 2 ] = this.vertices[ j + 8 ];

      this.vertices[ j + 3 ] = this.vertices[ j + 9 ];
      this.vertices[ j + 4 ] = this.vertices[ j + 10 ];
      this.vertices[ j + 5 ] = this.vertices[ j + 11 ];
    }

    var direction = new THREE.Vector3();
    direction.set(0, 1.7, 1);
    direction.applyQuaternion(rotation);
    direction.normalize();
    var posBase = position.clone().add(direction.clone().multiplyScalar(-0.08));

    direction = new THREE.Vector3();
    direction.set(1, 0, 0);
    direction.applyQuaternion(rotation);
    direction.normalize();

    var posA = posBase.clone();
    var posB = posBase.clone();
    var lineWidth = this.lineWidth * intensity;
    posA.add(direction.clone().multiplyScalar(lineWidth));
    posB.add(direction.clone().multiplyScalar(-lineWidth));

    this.idx = this.vertices.length - 6;

    this.vertices[ this.idx++ ] = posA.x;
    this.vertices[ this.idx++ ] = posA.y;
    this.vertices[ this.idx++ ] = posA.z;

    this.vertices[ this.idx++ ] = posB.x;
    this.vertices[ this.idx++ ] = posB.y;
    this.vertices[ this.idx++ ] = posB.z;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.normalsNeedUpdate = true;

    this.points.push({
      'position': position,
      'rotation': rotation,
      'intensity': intensity
    });
  }
};

AFRAME.registerComponent('brush', {
  init: function () {
    this.idx = 0;

    this.active = false;
    this.obj = this.el.object3D;
    this.currentLine = null;
    this.color = new THREE.Color(0xd03760);
    this.lineWidth = 0.01;
    this.lineWidthModifier = 0.0;
    this.textures = {};
    this.currentMap = 0;

    this.model = this.el.getObject3D('mesh');
    this.drawing = false;

    function updateColor (color, x, y) {
      function HSVtoRGB (h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
          s = h.s; v = h.v; h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
          case 0: r = v; g = t; b = p; break;
          case 1: r = q; g = v; b = p; break;
          case 2: r = p; g = v; b = t; break;
          case 3: r = p; g = q; b = v; break;
          case 4: r = t; g = p; b = v; break;
          case 5: r = v; g = p; b = q; break;
        }
        return {r: r, g: g, b: b};
      }

      // Use polar coordinates instead of cartesian
      var angle = Math.atan2(x, y);
      var radius = Math.sqrt(x * x + y * y);

      // Map the angle (-PI to PI) to the Hue (from 0 to 1)
      // and the Saturation to the radius
      angle = angle / (Math.PI * 2) + 0.5;
      var color2 = HSVtoRGB(angle, radius, 1.0);
      color.setRGB(color2.r, color2.g, color2.b);
    }

    this.el.addEventListener('stroke-changed', function (evt) {
      this.currentMap = evt.detail.strokeId;
      this.lineWidth = evt.detail.lineWidth * 0.05;
    }.bind(this));

    this.el.addEventListener('axismove', function (evt) {
      if (evt.detail.axis[0] === 0 && evt.detail.axis[1] === 0) {
        return;
      }
      updateColor(this.color, evt.detail.axis[0], evt.detail.axis[1]);
      this.el.emit('color-changed', {color: this.color, x: evt.detail.axis[0], y: evt.detail.axis[1]});
    }.bind(this));

    this.el.addEventListener('buttondown', function (evt) {
      if (evt.detail.id === 2) {
        this.color.set(0, 0, 0);
      }
    }.bind(this));
    this.el.addEventListener('buttonchanged', function (evt) {
      // Trigger
      if (evt.detail.id === 1) {
        var value = evt.detail.state.value;
        this.lineWidthModifier = value * 2;
        if (value > 0.1) {
          if (!this.active) {
            this.startNewLine();
            this.active = true;
          }
        } else {
          this.active = false;
          if (this.currentLine) {
            console.log(this.currentLine.getJSON());
          }
          this.currentLine = null;
        }
      }
    }.bind(this));
  },

  tick: function (time, delta) {
    if (this.currentLine && this.active) {
      var rotation = new THREE.Quaternion();
      var translation = new THREE.Vector3();
      var scale = new THREE.Vector3();
      this.obj.matrixWorld.decompose(translation, rotation, scale);

      this.currentLine.addPoint(translation, rotation, this.lineWidthModifier);
    }
  },

  remove: function () {
  },

  startNewLine: function () {
    this.currentLine = lines.addNewLine(this.color, this.lineWidth);

    var rotation = new THREE.Quaternion();
    var translation = new THREE.Vector3();
    var scale = new THREE.Vector3();
    this.obj.matrixWorld.decompose(translation, rotation, scale);
    this.currentLine.setInitialPosition(translation, rotation);

    var entity = document.createElement('a-entity');
    this.el.sceneEl.appendChild(entity);
    entity.object3D.add(this.currentLine.mesh);
  }
});
