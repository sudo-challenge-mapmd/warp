"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var w = window.innerWidth;
var h = window.innerHeight;
var app = new PIXI.Application(w, h, { transparent: false, backgroundColor: 0xFF0000 });
document.body.appendChild(app.renderer.view);
var stdDev = app.renderer.gl.getExtension('OES_standard_derivatives');
console.log(stdDev);
var stage = new PIXI.Container();
// let texture = PIXI.Texture.fromImage('assets/test-image.jpg');
var texture = PIXI.Texture.fromVideo('assets/planet-earth.mp4');
var videoSprite = new PIXI.Sprite(texture);
videoSprite.width = app.renderer.width;
videoSprite.height = app.renderer.height;
app.stage.addChild(videoSprite);
var testMap = PIXI.Texture.fromImage('assets/uv.png');
var VisionMapFilter = /** @class */ (function (_super) {
    __extends(VisionMapFilter, _super);
    function VisionMapFilter(contrastMap, displacementMap) {
        var _this = _super.call(this, VisionMapFilter.defaultVertexSrc, VisionMapFilter.fragmentShader) || this;
        _this.uniforms.contrastMap = contrastMap;
        _this.uniforms.displacementMap = displacementMap;
        return _this;
    }
    VisionMapFilter.prototype.apply = function (filterManager, input, output) {
        filterManager.applyFilter(this, input, output);
    };
    VisionMapFilter.fragmentShader = "\n\t\t#extension GL_OES_standard_derivatives : enable\n\t\tprecision highp float;\n\n\t\tvarying vec2 vTextureCoord;\n\t\tuniform sampler2D uSampler;\n\t\tuniform sampler2D displacementMap;\n\t\tuniform sampler2D contrastMap;\n\n\t\tuniform vec2 mapSize;\n\n\t\tvec3 brightnessContrast(vec3 value, float brightness, float contrast){\n\t\t    return (value - 0.5) * contrast + 0.5 + brightness;\n\t\t}\n\n\t\tvoid main(){\n\t\t\tvec2 uv = vTextureCoord;\n\n\t\t\tvec2 c = vec2(0.5);\n\t\t\tvec2 d = c - uv;\n\t\t\tfloat l = length(d);\n\t\t\tvec2 n = normalize(d);\n\n\t\t\tfloat m = 0.8 - l;\n\t\t\tuv += n * m * m * m * 0.8;\n\n\t\t\tvec3 col = texture2D(uSampler, uv).rgb;\n\n\t\t\t// brightness / contrast\n\t\t\t// float cm = texture2D(contrastMap, uv).r;\n\t\t\t// col = brightnessContrast(col, cm * 2.0, cm * 8.0 + 1.0);\n\n\t\t\tgl_FragColor = vec4(col, 1.0);\n\t\t}\n\t";
    return VisionMapFilter;
}(PIXI.Filter));
var visionMapFilter = new VisionMapFilter(testMap, testMap);
videoSprite.filters = [visionMapFilter];
// app.renderer.render(stage); 
