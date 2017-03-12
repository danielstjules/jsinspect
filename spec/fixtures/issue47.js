/**
 * Code referenced in issue #47, taken from
 * https://github.com/pixijs/pixi.js
 * MIT license, Copyright (c) 2013-2016 Mathew Groves, Chad Engler
 */
export default class BaseTexture extends EventEmitter
{
  update()
  {
    // Svg size is handled during load
    if (this.imageType !== 'svg')
    {
      this.realWidth = this.source.naturalWidth || this.source.videoWidth || this.source.width;
      this.realHeight = this.source.naturalHeight || this.source.videoHeight || this.source.height;

      this.width = this.realWidth / this.resolution;
      this.height = this.realHeight / this.resolution;

      this.isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);
    }

    this.emit('update', this);
  }

  _loadSvgSourceUsingString(svgString)
  {
    const svgSize = getSvgSize(svgString);

    const svgWidth = svgSize.width;
    const svgHeight = svgSize.height;

    if (!svgWidth || !svgHeight)
    {
      throw new Error('The SVG image must have width and height defined (in pixels), canvas API needs them.');
    }

    // Scale realWidth and realHeight
    this.realWidth = Math.round(svgWidth * this.sourceScale);
    this.realHeight = Math.round(svgHeight * this.sourceScale);

    this.width = this.realWidth / this.resolution;
    this.height = this.realHeight / this.resolution;

    // Check pow2 after scale
    this.isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);

    // Create a canvas element
    const canvas = document.createElement('canvas');

    canvas.width = this.realWidth;
    canvas.height = this.realHeight;
    canvas._pixiId = `canvas_${uid()}`;

    // Draw the Svg to the canvas
    canvas
      .getContext('2d')
      .drawImage(this.source, 0, 0, svgWidth, svgHeight, 0, 0, this.realWidth, this.realHeight);

    // Replace the original source image with the canvas
    this.origSource = this.source;
    this.source = canvas;

    // Add also the canvas in cache (destroy clears by `imageUrl` and `source._pixiId`)
    BaseTextureCache[canvas._pixiId] = this;

    this.isLoading = false;
    this._sourceLoaded();
    this.emit('loaded', this);
  }
}
