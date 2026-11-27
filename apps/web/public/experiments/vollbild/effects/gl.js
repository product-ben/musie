/* WebGL-2-Helfer für die Effekte, die auf der GPU laufen (Wasser, Morphen, Sand, Verrühren,
   Marmorieren, Kaleidoskop, Wachsen, Atmen). Nach shell.js laden. */

/* Ein Rechteck über die ganze Fläche. vUv: (0, 0) oben links, (1, 1) unten rechts. */
const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/* Der sichtbare Ausschnitt der Karte: uSrc = x, y, Breite, Höhe in Bildkoordinaten 0…1. */
const PICTURE_GLSL = `
uniform sampler2D uImg;
uniform vec4 uSrc;
vec3 picture(vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  return texture(uImg, uSrc.xy + uv * uSrc.zw).rgb;
}`;

function glContext(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) notice('Dieser Browser kann den Effekt nicht zeigen: WebGL 2 fehlt.');
  return gl;
}

function glProgram(gl, fs, vs = QUAD_VS) {
  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const cache = new Map();
  p.u = (name) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
    return cache.get(name);
  };
  return p;
}

/* Das Rechteck als eigenes Vertex-Array, damit andere Zeichnungen (Punkte) daneben bestehen. */
function glQuad(gl) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return {
    draw() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    },
  };
}

function glTexture(gl, filter = gl.LINEAR) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/* Bindet eine Textur an eine Einheit und setzt die Sampler-Uniform. */
function glBind(gl, prog, name, unit, tex) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(prog.u(name), unit);
}

function glImage(gl, tex, im) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
}

/* Ein Feld aus der CPU: zwei Kanäle (RG16F) aus einem Float32Array mit zwei Werten je Zelle. */
function glFieldRG(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, h, 0, gl.RG, gl.FLOAT, data);
}
function glUpdateRG(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RG, gl.FLOAT, data);
}
/* Ein Feld aus der CPU: ein Kanal als Gleitkommazahl (R16F) aus einem Float32Array – ohne die
   8-Bit-Stufen, die bei langsamen Übergängen als Flimmern sichtbar werden. */
function glFieldR(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.FLOAT, data);
}
function glUpdateR(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RED, gl.FLOAT, data);
}
/* Ein Feld aus der CPU: ein Kanal (R8) aus einem Uint8Array. */
function glFieldR8(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, data);
}
function glUpdateR8(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RED, gl.UNSIGNED_BYTE, data);
}

/* Ein Ziel zum Hineinzeichnen. RGBA8 kann jeder Browser; mit float = true RGBA16F – nur, wo
   glCanFloat(gl) es erlaubt. */
function glCanFloat(gl) { return !!gl.getExtension('EXT_color_buffer_float'); }
function glTarget(gl, w, h, float = false) {
  const tex = glTexture(gl);
  if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

/* Größe und Ausschnitt für ein Canvas setzen, das die Karte zeigt. */
function glFit(gl, canvas, im, g, prog) {
  place(canvas, g);
  canvas.width = Math.round(g.cssW * DPR);
  canvas.height = Math.round(g.cssH * DPR);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(prog);
  gl.uniform4f(prog.u('uSrc'), g.sx / im.naturalWidth, g.sy / im.naturalHeight, g.sw / im.naturalWidth, g.sh / im.naturalHeight);
}
