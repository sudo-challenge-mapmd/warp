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
var VisionMapFilter = /** @class */ (function (_super) {
    __extends(VisionMapFilter, _super);
    function VisionMapFilter() {
        var _this = _super.call(this, VisionMapFilter.vertexShader, VisionMapFilter.fragmentShader) || this;
        _this.uniforms.dimensions = { x: 0, y: 0 };
        _this.uniforms.filterArea = { x: 0, y: 0, z: 0, w: 0 };
        return _this;
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
    VisionMapFilter.fragmentShader = "\n\t\tprecision highp float;\n\n\t\tvarying vec2 vTextureCoord;\n\t\tuniform sampler2D uSampler;\n\t\tuniform vec2 dimensions;\n\t\tuniform vec4 filterArea;\n\n\t\tvec2 mapCoord( vec2 coord ){\n\t\t    coord *= filterArea.xy;\n\t\t    coord += filterArea.zw;\n\t\t    return coord;\n\t\t}\n\n\t\tvec2 unmapCoord( vec2 coord ){\n\t\t    coord -= filterArea.zw;\n\t\t    coord /= filterArea.xy;\n\t\t    return coord;\n\t\t}\n\n\t\tvec2 warpAround(vec2 uv, vec2 p, float rInner, float rOuter) {\n\t\t\tvec2 d = p - uv;\n\t\t\tfloat l = length(d);\n\t\t\tvec2 n = normalize(d);\n\t\t\tfloat r = rOuter - rInner;\n\t\t\tfloat R = rOuter;\n\n\t\t\tfloat x = max(R - l, 0.0);\n\t\t\t// float m = pow(x/R, 0.5);\n\t\t\t// float m = smoothstep(0.0, R, x);\n\t\t\tfloat m = pow(min(x/(r), 1.0), 2.0);\n\n\t\t\treturn n * m * l;\n\t\t}\n\n\t\tvec3 brightnessContrast(vec3 value, float brightness, float contrast){\n\t\t    return (value - 0.5) * contrast + 0.5 + brightness;\n\t\t}\n\n\t\tvec3 enhance(vec3 col, vec2 uv, vec2 p, float rInner, float rOuter){\n\t\t\tvec2 d = p - uv;\n\t\t\tfloat l = length(d);\n\t\t\tfloat r = rOuter - rInner;\n\t\t\tfloat R = rOuter;\n\n\t\t\tfloat x = max(R - l, 0.0);\n\t\t\tfloat cm = x;\n\t\t\treturn brightnessContrast(col, cm * 2.0, cm * 8.0 + 1.0);\n\t\t}\n\n\t\tvoid main(){\n\t\t\tvec2 uv = mapCoord(vTextureCoord) / dimensions;\n\n\t\t\tuv += warpAround(uv, vec2(0.5), 0.1, 0.3);\n\t\t\tuv += warpAround(uv, vec2(0.6), 0.1, 0.3);\n\t\t\tuv += warpAround(uv, vec2(0.7, 0.5), 0.13, 0.5);\n\n\t\t\tvec3 col = texture2D(uSampler, unmapCoord(uv*dimensions)).rgb;\n\n\t\t\t// brightness / contrast\n\t\t\tcol = enhance(col, uv, vec2(0.5), 0.1, 0.3);\n\t\t\tcol = enhance(col, uv, vec2(0.6), 0.1, 0.3);\n\t\t\tcol = enhance(col, uv, vec2(0.7, 0.5), 0.13, 0.5);\n\n\t\t\tgl_FragColor = vec4(col, 1.0);\n\t\t}\n\t";
    return VisionMapFilter;
}(PIXI.Filter));
var visionMapFilter = new VisionMapFilter();
var BarrelFilter = /** @class */ (function (_super) {
    __extends(BarrelFilter, _super);
    function BarrelFilter(power, offset) {
        if (power === void 0) { power = 1.2; }
        if (offset === void 0) { offset = { x: 0, y: 0 }; }
        var _this = _super.call(this, undefined, BarrelFilter.fragment) || this;
        _this.uniforms.dimensions = { x: 0, y: 0 };
        _this.uniforms.filterArea = { x: 0, y: 0, z: 0, w: 0 };
        _this.uniforms.power = power;
        _this.uniforms.offset = offset;
        return _this;
    }
    BarrelFilter.prototype.apply = function (filterManager, input, output) {
        this.uniforms.dimensions.x = input.sourceFrame.width;
        this.uniforms.dimensions.y = input.sourceFrame.height;
        this.uniforms.filterArea.x = output.size.width;
        this.uniforms.filterArea.y = output.size.height;
        this.uniforms.filterArea.z = input.sourceFrame.x;
        this.uniforms.filterArea.w = input.sourceFrame.y;
        filterManager.applyFilter(this, input, output);
    };
    BarrelFilter.fragment = "\n\t\tprecision highp float;\n\n\t\tvarying vec2 vTextureCoord;\n\t\tuniform sampler2D uSampler;\n\t\tuniform vec2 dimensions;\n\t\tuniform vec4 filterArea;\n\n\t\tuniform float power;\n\t\tuniform vec2 offset;\n\n\t\tvec2 mapCoord( vec2 coord ){\n\t\t    coord *= filterArea.xy;\n\t\t    coord += filterArea.zw;\n\t\t    return coord;\n\t\t}\n\n\t\tvec2 unmapCoord( vec2 coord ){\n\t\t    coord -= filterArea.zw;\n\t\t    coord /= filterArea.xy;\n\t\t    return coord;\n\t\t}\n\n\t\t// Given a vec2 in [-1,+1], generate a texture coord in [0,+1]\n\t\tvec2 barrelDistortion(vec2 p)\n\t\t{\n\t\t    float theta  = atan(p.y, p.x);\n\t\t    float radius = length(p);\n\t\t    radius = pow(radius, power);\n\t\t    p.x = radius * cos(theta);\n\t\t    p.y = radius * sin(theta);\n\t\t    return 0.5 * (p + 1.0);\n\t\t}\n\n\t\tvoid main(){\n\t\t\tvec2 uv = mapCoord(vTextureCoord) / dimensions;\n\t\t\tuv = barrelDistortion(uv*2.0 - 1.0 + offset);\n\t\t\tgl_FragColor = vec4(texture2D(uSampler, unmapCoord(uv*dimensions)).rgb, 1.0);\n\t\t}\n\t";
    return BarrelFilter;
}(PIXI.Filter));
videoSprite.filters = [visionMapFilter, new BarrelFilter()];
// app.renderer.render(stage); 
