let w = window.innerWidth;
let h = window.innerHeight;

let app = new PIXI.Application(w, h, { transparent: false, backgroundColor: 0xFF0000 });
document.body.appendChild(app.renderer.view);

let stdDev = (<PIXI.WebGLRenderer>app.renderer).gl.getExtension('OES_standard_derivatives');
console.log(stdDev);

let stage = new PIXI.Container();

// let texture = PIXI.Texture.fromImage('assets/test-image.jpg');
let texture = PIXI.Texture.fromVideo('assets/planet-earth.mp4');
let videoSprite = new PIXI.Sprite(texture);
videoSprite.width = app.renderer.width;
videoSprite.height = app.renderer.height;
app.stage.addChild(videoSprite);

let testMap = PIXI.Texture.fromImage('assets/uv.png');

class VisionMapFilter extends PIXI.Filter<{
	displacementMap: PIXI.Texture,
	contrastMap: PIXI.Texture,
}> {

	private static fragmentShader = `
		#extension GL_OES_standard_derivatives : enable
		precision highp float;

		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform sampler2D displacementMap;
		uniform sampler2D contrastMap;

		uniform vec2 mapSize;

		vec3 brightnessContrast(vec3 value, float brightness, float contrast){
		    return (value - 0.5) * contrast + 0.5 + brightness;
		}

		void main(){
			vec2 uv = vTextureCoord;

			vec2 c = vec2(0.5);
			vec2 d = c - uv;
			float l = length(d);
			vec2 n = normalize(d);

			float m = 0.8 - l;
			uv += n * m * m * m * 0.8;

			vec3 col = texture2D(uSampler, uv).rgb;

			// brightness / contrast
			// float cm = texture2D(contrastMap, uv).r;
			// col = brightnessContrast(col, cm * 2.0, cm * 8.0 + 1.0);

			gl_FragColor = vec4(col, 1.0);
		}
	`;

	constructor(contrastMap: PIXI.Texture, displacementMap: PIXI.Texture){
		super(VisionMapFilter.defaultVertexSrc, VisionMapFilter.fragmentShader);

		this.uniforms.contrastMap = contrastMap;
		this.uniforms.displacementMap = displacementMap;
	}

	apply(filterManager: PIXI.FilterManager, input: PIXI.RenderTarget, output: PIXI.RenderTarget){
		filterManager.applyFilter(this, input, output);
	}

}

let visionMapFilter = new VisionMapFilter(testMap, testMap);

videoSprite.filters = [visionMapFilter];

// app.renderer.render(stage);