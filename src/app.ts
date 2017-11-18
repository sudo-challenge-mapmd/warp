let w = window.innerWidth;
let h = window.innerHeight;

let app = new PIXI.Application(w, h, { transparent: false, backgroundColor: 0x00FF00 });
document.body.appendChild(app.renderer.view);

let stage = new PIXI.Container();

// let texture = PIXI.Texture.fromImage('assets/test-map.jpg');
let texture = PIXI.Texture.fromVideo('assets/planet-earth.mp4');
let videoSprite = new PIXI.Sprite(texture);
videoSprite.width = w;
videoSprite.height = h;
app.stage.addChild(videoSprite);

let testMap = PIXI.Texture.fromImage('assets/test-map.png');

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

		// uniform sampler2D displacementMap;
		// uniform sampler2D contrastMap;

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

		vec3 brightnessContrast(vec3 value, float brightness, float contrast){
		    return (value - 0.5) * contrast + 0.5 + brightness;
		}

		void main(){
			vec2 uv = mapCoord(vTextureCoord) / dimensions;

			vec2 c = vec2(0.5);
			vec2 d = c - uv;
			float l = length(d);
			vec2 n = normalize(d);

			const float r = 0.1;
			const float R = 0.8;

			//as x approaches r from R, f(x) approaches r
			//at x = R, f(x) = 0
			float dx = 1.0 - (l - r)/(R - r);
			dx = step(0.0, dx) * dx; //mask out < 0
			float boundsMask = step(dx, 1.0); // mask out > 1
			float m = dx * boundsMask * r;

// gl_FragColor = vec4(m, 0., 0., 1.); return;

			vec2 delta = n * m;

// gl_FragColor = vec4(delta, 0., 1.); return;

			uv += delta;

// gl_FragColor = vec4(uv, 0., 1.); return;

			vec3 col = texture2D(uSampler, unmapCoord(uv*dimensions)).rgb;

			// prevent image wrapping
			// vec2 s = step(uv, vec2(1.0)) * step(vec2(0.0), uv);
			// col *= s.x * s.y;

			// brightness / contrast
			// float cm = texture2D(contrastMap, uv).r;
			// col = brightnessContrast(col, cm * 2.0, cm * 8.0 + 1.0);

			gl_FragColor = vec4(col, 1.0);
		}
	`;

	constructor(contrastMap: PIXI.Texture, displacementMap: PIXI.Texture){
		super(VisionMapFilter.vertexShader, VisionMapFilter.fragmentShader);

		this.uniforms.dimensions = {x: 0, y: 0};
		this.uniforms.filterArea = {x: 0, y: 0, z: 0, w: 0};
		// this.uniforms.contrastMap = contrastMap;
		// this.uniforms.displacementMap = displacementMap;
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

let visionMapFilter = new VisionMapFilter(testMap, testMap);

videoSprite.filters = [visionMapFilter];

// app.renderer.render(stage);