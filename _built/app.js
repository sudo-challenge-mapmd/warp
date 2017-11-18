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
var app = new PIXI.Application(w, h, { transparent: false, backgroundColor: 0x00FF00 });
document.body.appendChild(app.renderer.view);
var stage = new PIXI.Container();
// let texture = PIXI.Texture.fromImage('assets/test-map.jpg');
var texture = PIXI.Texture.fromVideo('assets/planet-earth.mp4');
var videoSprite = new PIXI.Sprite(texture);
videoSprite.width = w;
videoSprite.height = h;
app.stage.addChild(videoSprite);
var testMap = PIXI.Texture.fromImage('assets/test-map.png');
var VisionMapFilter = /** @class */ (function (_super) {
    __extends(VisionMapFilter, _super);
    function VisionMapFilter(contrastMap, displacementMap) {
        var _this = _super.call(this, VisionMapFilter.vertexShader, VisionMapFilter.fragmentShader) || this;
        _this.uniforms.dimensions = { x: 0, y: 0 };
        _this.uniforms.filterArea = { x: 0, y: 0, z: 0, w: 0 };
        return _this;
        // this.uniforms.contrastMap = contrastMap;
        // this.uniforms.displacementMap = displacementMap;
    }
    VisionMapFilter.prototype.apply = function (filterManager, input, output) {
        this.uniforms.dimensions.x = input.sourceFrame.width;
        this.uniforms.dimensions.y = input.sourceFrame.height;
        this.uniforms.filterArea.x = output.size.width;
        this.uniforms.filterArea.y = output.size.height;
        this.uniforms.filterArea.z = input.sourceFrame.x;
        this.uniforms.filterArea.w = input.sourceFrame.y;
        filterManager.applyFilter(this, input, output);
    };
    VisionMapFilter.vertexShader = "\n\t\tattribute vec2 aVertexPosition;\n\t\tattribute vec2 aTextureCoord;\n\t\tuniform mat3 projectionMatrix;\n\t\tuniform mat3 filterMatrix;\n\t\tvarying vec2 vTextureCoord;\n\t\tvarying vec2 vFilterCoord;\n\t\tvoid main(void){\n\t\t   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\t\t   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n\t\t   vTextureCoord = vFilterCoord;\n\t\t}\n\t";
    VisionMapFilter.fragmentShader = "\n\t\tprecision highp float;\n\n\t\tvarying vec2 vTextureCoord;\n\t\tuniform sampler2D uSampler;\n\t\tuniform vec2 dimensions;\n\t\tuniform vec4 filterArea;\n\n\t\t// uniform sampler2D displacementMap;\n\t\t// uniform sampler2D contrastMap;\n\n\t\tvec2 mapCoord( vec2 coord ){\n\t\t    coord *= filterArea.xy;\n\t\t    coord += filterArea.zw;\n\t\t    return coord;\n\t\t}\n\n\t\tvec2 unmapCoord( vec2 coord ){\n\t\t    coord -= filterArea.zw;\n\t\t    coord /= filterArea.xy;\n\t\t    return coord;\n\t\t}\n\n\t\tvec3 brightnessContrast(vec3 value, float brightness, float contrast){\n\t\t    return (value - 0.5) * contrast + 0.5 + brightness;\n\t\t}\n\n\t\tvoid main(){\n\t\t\tvec2 uv = mapCoord(vTextureCoord) / dimensions;\n\n\t\t\tvec2 c = vec2(0.5);\n\t\t\tvec2 d = c - uv;\n\t\t\tfloat l = length(d);\n\t\t\tvec2 n = normalize(d);\n\n\t\t\tconst float r = 0.1;\n\t\t\tconst float R = 0.8;\n\n\t\t\t//as x approaches r from R, f(x) approaches r\n\t\t\t//at x = R, f(x) = 0\n\t\t\tfloat dx = 1.0 - (l - r)/(R - r);\n\t\t\tdx = step(0.0, dx) * dx; //mask out < 0\n\t\t\tfloat boundsMask = step(dx, 1.0); // mask out > 1\n\t\t\tfloat m = dx * boundsMask * r;\n\n// gl_FragColor = vec4(m, 0., 0., 1.); return;\n\n\t\t\tvec2 delta = n * m;\n\n// gl_FragColor = vec4(delta, 0., 1.); return;\n\n\t\t\tuv += delta;\n\n// gl_FragColor = vec4(uv, 0., 1.); return;\n\n\t\t\tvec3 col = texture2D(uSampler, unmapCoord(uv*dimensions)).rgb;\n\n\t\t\t// prevent image wrapping\n\t\t\t// vec2 s = step(uv, vec2(1.0)) * step(vec2(0.0), uv);\n\t\t\t// col *= s.x * s.y;\n\n\t\t\t// brightness / contrast\n\t\t\t// float cm = texture2D(contrastMap, uv).r;\n\t\t\t// col = brightnessContrast(col, cm * 2.0, cm * 8.0 + 1.0);\n\n\t\t\tgl_FragColor = vec4(col, 1.0);\n\t\t}\n\t";
    return VisionMapFilter;
}(PIXI.Filter));
var visionMapFilter = new VisionMapFilter(testMap, testMap);
videoSprite.filters = [visionMapFilter];
// app.renderer.render(stage); 
