let w = window.innerWidth;
let h = window.innerHeight;

let app = new PIXI.Application(w, h, { transparent: false, backgroundColor: 0x00FF00 });
document.body.appendChild(app.renderer.view);

let stage = new PIXI.Container();

// let texture = PIXI.Texture.fromImage('assets/image.jpg');
let videoEl = document.createElement('video');
videoEl.src = 'assets/demo.mp4';
videoEl.autoplay = true;
videoEl.muted = true;
videoEl.defaultMuted = true;
videoEl.volume = 0;
videoEl.loop = true;
let texture = PIXI.Texture.fromVideo(videoEl);
let videoSprite = new PIXI.Sprite(texture);
videoSprite.width = w;
videoSprite.height = h;
app.stage.addChild(videoSprite);

class VisionMapFilter extends PIXI.Filter<{
	displacementMap: PIXI.Texture,
	contrastMap: PIXI.Texture,
	dimensions: {x:number, y:number},
	filterArea: {x:number, y:number, z:number, w:number}
}> {

	private static vertexShader = `
		attribute vec2 aVertexPosition;
		attribute vec2 aTextureCoord;
		uniform mat3 projectionMatrix;
		uniform mat3 filterMatrix;
		varying vec2 vTextureCoord;
		varying vec2 vFilterCoord;
		void main(void){
		   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
		   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;
		   vTextureCoord = vFilterCoord;
		}
	`;

	private static fragmentShader = `
		precision highp float;

		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform vec2 dimensions;
		uniform vec4 filterArea;

		vec2 mapCoord( vec2 coord ){
		    coord *= filterArea.xy;
		    coord += filterArea.zw;
		    return coord;
		}

		vec2 unmapCoord( vec2 coord ){
		    coord -= filterArea.zw;
		    coord /= filterArea.xy;
		    return coord;
		}

		vec2 warpAround(vec2 uv, vec2 p, float rInner, float rOuter) {
			vec2 d = p - uv;
			float l = length(d);
			vec2 n = normalize(d);
			float r = rOuter - rInner;
			float R = rOuter;

			float x = max(R - l, 0.0);
			// float m = pow(x/R, 0.5);
			// float m = smoothstep(0.0, R, x);
			float m = pow(min(x/(r), 1.0), 2.0);

			return n * m * l;
		}

		vec3 brightnessContrast(vec3 value, float brightness, float contrast){
		    return (value - 0.5) * contrast + 0.5 + brightness;
		}

		vec3 enhance(vec3 col, vec2 uv, vec2 p, float rInner, float rOuter){
			vec2 d = p - uv;
			float l = length(d);
			float r = rOuter - rInner;
			float R = rOuter;

			float x = max(R - l, 0.0);
			float cm = x;
			return brightnessContrast(col, cm * 2.0, cm * 8.0 + 1.0);
		}

		void main(){
			vec2 uv = mapCoord(vTextureCoord) / dimensions;

			uv += warpAround(uv, vec2(0.5), 0.1, 0.3);
			uv += warpAround(uv, vec2(0.6), 0.1, 0.3);
			uv += warpAround(uv, vec2(0.7, 0.5), 0.13, 0.5);

			vec3 col = texture2D(uSampler, unmapCoord(uv*dimensions)).rgb;

			// brightness / contrast
			col = enhance(col, uv, vec2(0.5), 0.1, 0.3);
			col = enhance(col, uv, vec2(0.6), 0.1, 0.3);
			col = enhance(col, uv, vec2(0.7, 0.5), 0.13, 0.5);

			gl_FragColor = vec4(col, 1.0);
		}
	`;

	constructor(){
		super(VisionMapFilter.vertexShader, VisionMapFilter.fragmentShader);

		this.uniforms.dimensions = {x: 0, y: 0};
		this.uniforms.filterArea = {x: 0, y: 0, z: 0, w: 0};
	}

	apply(filterManager: PIXI.FilterManager, input: PIXI.RenderTarget, output: PIXI.RenderTarget){
		this.uniforms.dimensions.x = input.sourceFrame.width
		this.uniforms.dimensions.y = input.sourceFrame.height
		this.uniforms.filterArea.x = output.size.width;
		this.uniforms.filterArea.y = output.size.height;
		this.uniforms.filterArea.z = input.sourceFrame.x;
		this.uniforms.filterArea.w = input.sourceFrame.y;

		filterManager.applyFilter(this, input, output);
	}

}

let visionMapFilter = new VisionMapFilter();

class BarrelFilter extends PIXI.Filter <{
	dimensions: {x:number, y:number},
	filterArea: {x:number, y:number, z:number, w:number},
	power: number,
	offset: {x:number, y:number}
}> {

	protected static fragment = `
		precision highp float;

		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform vec2 dimensions;
		uniform vec4 filterArea;

		uniform float power;
		uniform vec2 offset;

		vec2 mapCoord( vec2 coord ){
		    coord *= filterArea.xy;
		    coord += filterArea.zw;
		    return coord;
		}

		vec2 unmapCoord( vec2 coord ){
		    coord -= filterArea.zw;
		    coord /= filterArea.xy;
		    return coord;
		}

		// Given a vec2 in [-1,+1], generate a texture coord in [0,+1]
		vec2 barrelDistortion(vec2 p)
		{
		    float theta  = atan(p.y, p.x);
		    float radius = length(p);
		    radius = pow(radius, power);
		    p.x = radius * cos(theta);
		    p.y = radius * sin(theta);
		    return 0.5 * (p + 1.0);
		}

		void main(){
			vec2 uv = mapCoord(vTextureCoord) / dimensions;
			uv = barrelDistortion(uv*2.0 - 1.0 + offset);
			gl_FragColor = vec4(texture2D(uSampler, unmapCoord(uv*dimensions)).rgb, 1.0);
		}
	`;

	constructor(power = 1.2, offset = {x: 0, y: 0}){
		super(undefined, BarrelFilter.fragment);

		this.uniforms.dimensions = {x: 0, y: 0};
		this.uniforms.filterArea = {x: 0, y: 0, z: 0, w: 0};
		this.uniforms.power = power;
		this.uniforms.offset = offset;
	}

	apply(filterManager: PIXI.FilterManager, input: PIXI.RenderTarget, output: PIXI.RenderTarget){
		this.uniforms.dimensions.x = input.sourceFrame.width
		this.uniforms.dimensions.y = input.sourceFrame.height
		this.uniforms.filterArea.x = output.size.width;
		this.uniforms.filterArea.y = output.size.height;
		this.uniforms.filterArea.z = input.sourceFrame.x;
		this.uniforms.filterArea.w = input.sourceFrame.y;

		filterManager.applyFilter(this, input, output);
	}
}

videoSprite.filters = [visionMapFilter, new BarrelFilter()];

// app.renderer.render(stage);